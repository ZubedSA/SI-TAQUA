import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Database, UserPlus, Edit, Trash2, RefreshCw, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Save, Shield, GraduationCap, User, Key, Lock, Eye, UserCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

import './Pengaturan.css'

const PengaturanPage = () => {
    const [activeTab, setActiveTab] = useState('users')

    // User management states
    const [users, setUsers] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [showUserModal, setShowUserModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [userForm, setUserForm] = useState({ email: '', password: '', nama: '', role: 'guru', no_telp: '', santri_ids: [], username: '' })
    const [santriList, setSantriList] = useState([])
    const [savingUser, setSavingUser] = useState(false)
    const [userError, setUserError] = useState('')
    const [userSuccess, setUserSuccess] = useState('')

    // Password reset states
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordUser, setPasswordUser] = useState(null)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState('')

    // Data import states
    const [selectedDataType, setSelectedDataType] = useState('santri')
    const [importData, setImportData] = useState([])
    const [showPreview, setShowPreview] = useState(false)
    const [importing, setImporting] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [importResult, setImportResult] = useState({ success: 0, failed: 0, message: '' })
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers()
            fetchSantriList()
        }
    }, [activeTab])

    const fetchUsers = async () => {
        setLoadingUsers(true)
        try {
            const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
            if (error) throw error
            setUsers(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoadingUsers(false)
        }
    }

    const fetchSantriList = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, kelas:kelas_id(nama)')
                .eq('status', 'Aktif')
                .order('nama')
            if (error) throw error
            setSantriList(data || [])
        } catch (err) {
            console.error('Fetch santri error:', err)
        }
    }

    const handleAddUser = async (e) => {
        e.preventDefault()
        setSavingUser(true)
        setUserError('')
        setUserSuccess('')

        try {
            let newUserId = null

            if (editingUser) {
                // Update existing user profile
                const { error } = await supabase
                    .from('user_profiles')
                    .update({
                        nama: userForm.nama,
                        role: userForm.role,
                        no_telp: userForm.no_telp,
                        email: userForm.email,
                        username: userForm.username,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingUser.id)

                if (error) throw error
                setUserSuccess('User berhasil diupdate!')
            } else {
                // Validasi: Username wajib
                if (!userForm.username) {
                    throw new Error('Username harus diisi')
                }

                // Generate email placeholder jika kosong
                let authEmail = userForm.email
                if (!authEmail) {
                    // Gunakan username sebagai basis email
                    authEmail = `${userForm.username}@username.local`
                }

                // Create new user with Supabase Auth
                // Gunakan client sementara agar session Admin tidak tertimpa/logout
                const tempSupabase = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY,
                    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
                )

                const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                    email: authEmail,
                    password: userForm.password,
                    options: {
                        data: {
                            nama: userForm.nama,
                            role: userForm.role
                        }
                    }
                })

                if (authError) throw authError

                // Create user profile with password reference and no_telp
                if (authData.user) {
                    const { error: profileError } = await supabase.from('user_profiles').insert([{
                        user_id: authData.user.id,
                        email: userForm.email || null,
                        username: userForm.username,
                        no_telp: userForm.no_telp || null,
                        nama: userForm.nama,
                        role: userForm.role,
                        password_ref: userForm.password
                    }])

                    if (profileError) throw profileError
                    newUserId = authData.user.id
                }

                setUserSuccess('User berhasil ditambahkan!')
            }

            // JOIN SANTRI LOGIC
            const targetUserId = editingUser ? editingUser.user_id : newUserId

            if (targetUserId && userForm.role === 'wali') {
                // 1. Reset: Unlink semua santri dari user ini dulu
                await supabase.from('santri').update({ wali_id: null }).eq('wali_id', targetUserId)

                // 2. Link: Hubungkan santri yang dipilih
                if (userForm.santri_ids && userForm.santri_ids.length > 0) {
                    const { error: linkError } = await supabase
                        .from('santri')
                        .update({ wali_id: targetUserId })
                        .in('id', userForm.santri_ids)

                    if (linkError) {
                        console.error('Link santri error:', linkError)
                        alert('User disimpan, TAPI Gagal menghubungkan santri: ' + linkError.message)
                    }
                }
            }

            fetchUsers()
            setTimeout(() => {
                setShowUserModal(false)
                setUserForm({ email: '', password: '', nama: '', role: 'guru', no_telp: '', santri_ids: [], username: '' })
                setEditingUser(null)
                setUserSuccess('')
            }, 2000)
        } catch (err) {
            setUserError(err.message)
        } finally {
            setSavingUser(false)
        }
    }

    const handleEditUser = (user) => {
        setEditingUser(user)
        // Fetch linked santri if role is wali
        let linkedSantriIds = []
        if (user.role === 'wali') {
            supabase
                .from('santri')
                .select('id')
                .eq('wali_id', user.user_id)
                .then(({ data }) => {
                    if (data) {
                        setUserForm(prev => ({ ...prev, santri_ids: data.map(s => s.id) }))
                    }
                })
        }

        setUserForm({
            username: user.username || user.email.split('@')[0],
            password: '',
            nama: user.nama || '',
            role: user.role || 'guru',
            no_telp: user.no_telp || '',
            santri_ids: [] // Akan diisi async di atas
        })
        setShowUserModal(true)
    }

    const handleResetPassword = (user) => {
        setPasswordUser(user)
        setNewPassword('')
        setConfirmPassword('')
        setPasswordError('')
        setPasswordSuccess('')
        setShowPasswordModal(true)
    }

    const handleSavePassword = async (e) => {
        e.preventDefault()

        if (newPassword.length < 6) {
            setPasswordError('Password minimal 6 karakter')
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Password dan konfirmasi tidak cocok')
            return
        }

        setSavingPassword(true)
        setPasswordError('')
        setPasswordSuccess('')

        try {
            // 1. Update password di Supabase Auth via backend API
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
            const response = await fetch(`${backendUrl}/api/users/update-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: passwordUser.user_id,
                    newPassword: newPassword
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Gagal mengubah password di Auth')
            }

            // 2. Update password_ref di user_profiles (sebagai referensi) - tidak fatal jika gagal
            try {
                await supabase
                    .from('user_profiles')
                    .update({
                        password_ref: newPassword,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', passwordUser.id)
            } catch (refErr) {
                console.warn('password_ref update failed:', refErr)
            }

            setPasswordSuccess('Password berhasil diubah! Silakan login dengan password baru.')
            fetchUsers()

            setTimeout(() => {
                setShowPasswordModal(false)
                setPasswordUser(null)
                setNewPassword('')
                setConfirmPassword('')
            }, 1500)
        } catch (err) {
            console.error('Password update error:', err)
            setPasswordError(err.message)
        } finally {
            setSavingPassword(false)
        }
    }

    // View detail states
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailUser, setDetailUser] = useState(null)

    const handleViewDetail = (user) => {
        setDetailUser(user)
        setShowDetailModal(true)
    }

    const handleDeleteUser = async (user) => {
        if (!confirm(`Yakin ingin menghapus user ${user.email}?`)) return

        try {
            const { error } = await supabase.from('user_profiles').delete().eq('id', user.id)
            if (error) throw error
            fetchUsers()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin': return { class: 'badge-success', icon: Shield, label: 'Admin' }
            case 'guru': return { class: 'badge-info', icon: GraduationCap, label: 'Guru' }
            case 'wali': return { class: 'badge-warning', icon: User, label: 'Wali Santri' }
            default: return { class: 'badge-secondary', icon: User, label: role }
        }
    }

    const dataTypes = [
        { id: 'santri', label: 'Data Santri', icon: Users, table: 'santri' },
        { id: 'guru', label: 'Data Guru', icon: Users, table: 'guru' },
        { id: 'kelas', label: 'Data Kelas', icon: Database, table: 'kelas' },
        { id: 'halaqoh', label: 'Data Halaqoh', icon: Database, table: 'halaqoh' },
        { id: 'mapel', label: 'Data Mapel', icon: Database, table: 'mapel' },
    ]

    const getColumnMapping = (type) => {
        switch (type) {
            case 'santri':
                return {
                    'nis': ['nis', 'nisn', 'no_induk', 'no induk', 'student_id', 'no', 'nomor', 'nomor induk'],
                    'nama': ['nama', 'name', 'nama_lengkap', 'nama lengkap', 'fullname', 'nama santri', 'nama_santri'],
                    'jenis_kelamin': ['jenis_kelamin', 'jenis kelamin', 'gender', 'jk', 'l/p', 'kelamin', 'j.k', 'j.k.'],
                    'tempat_lahir': ['tempat_lahir', 'tempat lahir', 'birthplace', 'tmp lahir', 'tmp_lahir', 'tempat'],
                    'tanggal_lahir': ['tanggal_lahir', 'tanggal lahir', 'tgl lahir', 'tgl_lahir', 'birthdate', 'ttl', 'tgl', 'lahir'],
                    'alamat': ['alamat', 'address', 'domisili', 'tempat tinggal'],
                    'nama_wali': ['nama_wali', 'nama wali', 'namawali', 'wali', 'ortu', 'parent', 'orang tua', 'orangtua', 'ayah', 'ibu', 'wali santri', 'walisantri', 'orang_tua'],
                    'no_telp_wali': ['no_telp_wali', 'no telp wali', 'telp_wali', 'telp wali', 'hp wali', 'no hp', 'hp', 'telp', 'telepon', 'no_hp', 'phone', 'no telp', 'no_telp'],
                    'status': ['status', 'sts', 'aktif'],
                    '_kelas_nama': ['kelas', 'kelas_nama', 'nama kelas', 'class', 'tingkat kelas'],
                    '_halaqoh_nama': ['halaqoh', 'halaqah', 'kelompok', 'halaqoh_nama', 'nama halaqoh', 'group']
                }
            case 'guru':
                return {
                    'nip': ['nip', 'no_pegawai', 'no pegawai', 'employee_id'],
                    'nama': ['nama', 'name', 'nama_lengkap', 'nama lengkap'],
                    'jenis_kelamin': ['jenis_kelamin', 'jenis kelamin', 'gender', 'jk', 'l/p'],
                    'jabatan': ['jabatan', 'position', 'role'],
                    'no_telp': ['no_telp', 'no telp', 'telp', 'hp', 'phone'],
                    'email': ['email', 'e-mail'],
                    'alamat': ['alamat', 'address'],
                    'status': ['status']
                }
            case 'kelas':
                return {
                    'nama': ['nama', 'name', 'nama_kelas', 'nama kelas', 'class'],
                    'tingkat': ['tingkat', 'level', 'grade'],
                    'deskripsi': ['deskripsi', 'description', 'desc']
                }
            case 'halaqoh':
                return {
                    'nama': ['nama', 'name', 'nama_halaqoh', 'nama halaqoh'],
                    'deskripsi': ['deskripsi', 'description', 'desc']
                }
            case 'mapel':
                return {
                    'kode': ['kode', 'code', 'kode_mapel', 'kode mapel'],
                    'nama': ['nama', 'name', 'nama_mapel', 'nama mapel', 'subject'],
                    'kategori': ['kategori', 'category', 'type'],
                    'deskripsi': ['deskripsi', 'description', 'desc']
                }
            default:
                return {}
        }
    }

    const mapColumns = (headers, type) => {
        const mapping = getColumnMapping(type)
        const result = {}
        const usedDbCols = new Set() // Track kolom yang sudah digunakan

        // Untuk setiap header, cari match terbaik
        headers.forEach((header, idx) => {
            if (header === undefined || header === null) return

            const headerLower = String(header).toLowerCase().trim()
            if (!headerLower) return

            let bestMatch = null
            let bestMatchLength = 0

            // Cari exact match atau alias yang paling cocok
            for (const [dbCol, aliases] of Object.entries(mapping)) {
                // Skip jika kolom ini sudah digunakan
                if (usedDbCols.has(dbCol)) continue

                for (const alias of aliases) {
                    // EXACT MATCH - prioritas tertinggi
                    if (headerLower === alias) {
                        bestMatch = dbCol
                        bestMatchLength = Infinity // Exact match selalu menang
                        break
                    }

                    // Cek apakah header SAMA PERSIS dengan alias (setelah normalisasi)
                    const normalizedHeader = headerLower.replace(/[_\s-]/g, '')
                    const normalizedAlias = alias.replace(/[_\s-]/g, '')
                    if (normalizedHeader === normalizedAlias && alias.length > bestMatchLength) {
                        bestMatch = dbCol
                        bestMatchLength = alias.length
                    }
                }

                if (bestMatchLength === Infinity) break // Sudah dapat exact match
            }

            if (bestMatch) {
                result[idx] = bestMatch
                usedDbCols.add(bestMatch)
            }
        })

        console.log('Headers:', headers)
        console.log('Map columns result:', result)
        console.log('Mapped DB columns:', Object.values(result))
        return result
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setUploadingFile(true)
        setUploadError('')
        setImportResult({ success: 0, failed: 0, message: '' })

        try {
            const reader = new FileReader()

            reader.onerror = () => {
                setUploadError('Gagal membaca file. Pastikan file tidak corrupt.')
                setUploadingFile(false)
            }

            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result)
                    const workbook = XLSX.read(data, { type: 'array' })

                    console.log('Sheets found:', workbook.SheetNames)

                    const sheetName = workbook.SheetNames[0]
                    const sheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

                    console.log('Total rows in file:', jsonData.length)
                    console.log('First 5 rows:', jsonData.slice(0, 5))

                    // Filter out empty rows
                    const nonEmptyRows = jsonData.filter(row =>
                        row && row.length > 0 && row.some(cell => cell !== '' && cell !== null && cell !== undefined)
                    )

                    console.log('Non-empty rows:', nonEmptyRows.length)

                    if (nonEmptyRows.length === 0) {
                        setUploadError('File kosong. Tidak ada data yang ditemukan.')
                        setUploadingFile(false)
                        return
                    }

                    if (nonEmptyRows.length < 2) {
                        setUploadError('File hanya memiliki header tanpa data. Minimal harus ada 1 baris data.')
                        setUploadingFile(false)
                        return
                    }

                    // Baris pertama yang tidak kosong adalah header
                    const headers = nonEmptyRows[0]
                    const dataRows = nonEmptyRows.slice(1)

                    console.log('Headers:', headers)

                    const columnMap = mapColumns(headers, selectedDataType)
                    console.log('Column mapping:', columnMap)

                    const mappedColumns = Object.values(columnMap)
                    console.log('Mapped to DB columns:', mappedColumns)

                    if (Object.keys(columnMap).length === 0) {
                        const foundHeaders = headers.filter(h => h).join(', ')
                        setUploadError(`Header kolom tidak dikenali.\n\nHeader di file: ${foundHeaders || '(kosong)'}\n\nHeader yang dikenali: nis, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_wali, no_telp_wali, status`)
                        setUploadingFile(false)
                        return
                    }

                    const mappedData = dataRows.map((row, rowIdx) => {
                        const obj = {}
                        Object.entries(columnMap).forEach(([colIdx, dbCol]) => {
                            let value = row[parseInt(colIdx)]

                            if (value === undefined || value === null || value === '') return

                            // Konversi NIS/NISN ke string
                            if ((dbCol === 'nis' || dbCol === 'nip') && value) {
                                value = String(value).trim()
                            }

                            // Konversi tanggal Excel serial number ke date string
                            if (dbCol === 'tanggal_lahir' && value) {
                                if (typeof value === 'number') {
                                    const excelEpoch = new Date(1899, 11, 30)
                                    const date = new Date(excelEpoch.getTime() + value * 86400000)
                                    value = date.toISOString().split('T')[0]
                                } else if (typeof value === 'string' && value.includes('/')) {
                                    const parts = value.split('/')
                                    if (parts.length === 3) {
                                        const day = parts[0].padStart(2, '0')
                                        const month = parts[1].padStart(2, '0')
                                        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
                                        value = `${year}-${month}-${day}`
                                    }
                                }
                            }

                            if (dbCol === 'jenis_kelamin' && value) {
                                value = String(value).toLowerCase().trim()
                                if (value === 'l' || value.includes('laki')) {
                                    value = 'Laki-laki'
                                } else if (value === 'p' || value.includes('perempuan')) {
                                    value = 'Perempuan'
                                }
                            }

                            if ((dbCol === 'no_telp_wali' || dbCol === 'no_telp') && value) {
                                value = String(value).trim()
                            }

                            if (value !== undefined && value !== '' && value !== null) {
                                obj[dbCol] = value
                            }
                        })

                        // Set default values untuk field wajib
                        if (!obj.status && Object.keys(obj).length > 0) {
                            obj.status = 'Aktif'
                        }

                        // jenis_kelamin adalah field WAJIB - set default jika tidak ada
                        if (!obj.jenis_kelamin && Object.keys(obj).length > 0 && selectedDataType === 'santri') {
                            obj.jenis_kelamin = 'Laki-laki' // Default value
                        }

                        // Untuk guru juga perlu jenis_kelamin
                        if (!obj.jenis_kelamin && Object.keys(obj).length > 0 && selectedDataType === 'guru') {
                            obj.jenis_kelamin = 'Laki-laki' // Default value
                        }

                        return obj
                    }).filter(obj => {
                        // Filter: minimal harus ada nis/nip dan nama
                        if (selectedDataType === 'santri') {
                            return obj.nis && obj.nama
                        } else if (selectedDataType === 'guru') {
                            return obj.nip && obj.nama
                        } else if (selectedDataType === 'kelas') {
                            return obj.nama && obj.tingkat
                        } else if (selectedDataType === 'mapel') {
                            return obj.kode && obj.nama
                        }
                        return Object.keys(obj).length > 1
                    })

                    console.log('Mapped data count:', mappedData.length)
                    console.log('Sample mapped data:', mappedData.slice(0, 3))

                    if (mappedData.length === 0) {
                        let requiredFields = ''
                        if (selectedDataType === 'santri') {
                            requiredFields = 'nis dan nama'
                        } else if (selectedDataType === 'guru') {
                            requiredFields = 'nip dan nama'
                        } else if (selectedDataType === 'kelas') {
                            requiredFields = 'nama dan tingkat'
                        } else if (selectedDataType === 'mapel') {
                            requiredFields = 'kode dan nama'
                        }

                        setUploadError(`Tidak ada data yang valid ditemukan.\n\nKolom yang ter-map: ${mappedColumns.join(', ') || '(tidak ada)'}\n\nField WAJIB untuk ${selectedDataType}: ${requiredFields}\n\nPastikan file Excel memiliki kolom tersebut dan data tidak kosong.`)
                        setUploadingFile(false)
                        return
                    }

                    setImportData(mappedData)
                    setShowPreview(true)
                    setUploadError('')
                    setUploadingFile(false)

                } catch (parseError) {
                    console.error('Parse error:', parseError)
                    setUploadError(`Gagal memproses file: ${parseError.message}`)
                    setUploadingFile(false)
                }
            }

            reader.readAsArrayBuffer(file)
        } catch (err) {
            console.error('File read error:', err)
            setUploadError(`Error membaca file: ${err.message}`)
            setUploadingFile(false)
        }

        e.target.value = ''
    }

    const handleImport = async () => {
        if (importData.length === 0) return

        setImporting(true)
        setImportResult({ success: 0, failed: 0, message: '' })

        try {
            console.log('Importing data:', importData)

            let dataToInsert = [...importData]

            // Jika import santri, cek apakah ada _kelas_nama atau _halaqoh_nama yang perlu di-lookup
            if (selectedDataType === 'santri') {
                // Ambil daftar kelas dan halaqoh untuk lookup
                const { data: kelasList } = await supabase.from('kelas').select('id, nama')
                const { data: halaqohList } = await supabase.from('halaqoh').select('id, nama')

                console.log('Lookup - Kelas:', kelasList?.length || 0, 'Halaqoh:', halaqohList?.length || 0)

                // Proses setiap data untuk lookup ID
                dataToInsert = importData.map(item => {
                    const newItem = { ...item }

                    // Lookup kelas_id dari nama kelas
                    if (item._kelas_nama && kelasList) {
                        const kelasNama = String(item._kelas_nama).toLowerCase().trim()
                        const kelas = kelasList.find(k =>
                            k.nama.toLowerCase().trim() === kelasNama ||
                            k.nama.toLowerCase().includes(kelasNama) ||
                            kelasNama.includes(k.nama.toLowerCase())
                        )
                        if (kelas) {
                            newItem.kelas_id = kelas.id
                            console.log(`Kelas matched: "${item._kelas_nama}" -> ${kelas.nama} (${kelas.id})`)
                        } else {
                            console.log(`Kelas tidak ditemukan: "${item._kelas_nama}"`)
                        }
                        delete newItem._kelas_nama // Hapus field sementara
                    }

                    // Lookup halaqoh_id dari nama halaqoh
                    if (item._halaqoh_nama && halaqohList) {
                        const halaqohNama = String(item._halaqoh_nama).toLowerCase().trim()
                        const halaqoh = halaqohList.find(h =>
                            h.nama.toLowerCase().trim() === halaqohNama ||
                            h.nama.toLowerCase().includes(halaqohNama) ||
                            halaqohNama.includes(h.nama.toLowerCase())
                        )
                        if (halaqoh) {
                            newItem.halaqoh_id = halaqoh.id
                            console.log(`Halaqoh matched: "${item._halaqoh_nama}" -> ${halaqoh.nama} (${halaqoh.id})`)
                        } else {
                            console.log(`Halaqoh tidak ditemukan: "${item._halaqoh_nama}"`)
                        }
                        delete newItem._halaqoh_nama // Hapus field sementara
                    }

                    return newItem
                })

                console.log('Data setelah lookup:', dataToInsert.slice(0, 3))
            }

            // Insert data
            const { data, error } = await supabase.from(selectedDataType).insert(dataToInsert)

            if (error) {
                console.error('Supabase error:', error)
                let errorMsg = error.message
                if (error.message.includes('violates not-null constraint')) {
                    errorMsg = 'Ada kolom wajib yang kosong. Pastikan kolom NIS dan Nama terisi.'
                } else if (error.message.includes('duplicate key')) {
                    errorMsg = 'Ada data duplikat dengan NIS yang sudah ada di database.'
                } else if (error.message.includes('foreign key')) {
                    errorMsg = 'Ada referensi kelas/halaqoh yang tidak ditemukan.'
                }
                throw new Error(errorMsg)
            }

            setImportResult({
                success: importData.length,
                failed: 0,
                message: `✅ Berhasil mengimport ${importData.length} data ${selectedDataType}!`
            })

            setImportData([])
            setShowPreview(false)
        } catch (err) {
            console.error('Import error:', err)
            setImportResult({
                success: 0,
                failed: importData.length,
                message: '❌ Gagal import: ' + err.message
            })
        } finally {
            setImporting(false)
        }
    }

    const getPreviewColumns = () => {
        switch (selectedDataType) {
            case 'santri': return ['nis', 'nama', 'jenis_kelamin', 'status']
            case 'guru': return ['nip', 'nama', 'jabatan', 'status']
            case 'kelas': return ['nama', 'tingkat']
            case 'halaqoh': return ['nama', 'deskripsi']
            case 'mapel': return ['kode', 'nama', 'kategori']
            default: return []
        }
    }

    return (
        <div className="pengaturan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Pengaturan</h1>
                    <p className="page-subtitle">Kelola akun pengguna dan import data</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="pengaturan-tabs">
                <button
                    className={`pengaturan-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={18} /> Kelola Akun Pengguna
                </button>

                <button
                    className={`pengaturan-tab ${activeTab === 'data-input' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data-input')}
                >
                    <FileSpreadsheet size={18} /> Import Data (Excel/CSV)
                </button>
            </div>



            {/* User Management Tab */}
            {activeTab === 'users' && (
                <div className="settings-section">
                    <div className="section-header">
                        <h3>Daftar Pengguna</h3>
                        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', nama: '', role: 'guru', no_telp: '', santri_ids: [], username: '' }); setShowUserModal(true) }}>
                            <UserPlus size={16} /> Tambah Pengguna
                        </button>
                    </div>

                    {/* Role Info */}
                    <div className="role-info-cards">
                        <div className="role-info-card admin">
                            <Shield size={24} />
                            <div>
                                <h4>Admin</h4>
                                <p>Akses penuh ke semua fitur</p>
                            </div>
                        </div>
                        <div className="role-info-card guru">
                            <GraduationCap size={24} />
                            <div>
                                <h4>Guru</h4>
                                <p>Input nilai dan hafalan</p>
                            </div>
                        </div>
                        <div className="role-info-card wali">
                            <User size={24} />
                            <div>
                                <h4>Wali Santri</h4>
                                <p>Lihat nilai dan download</p>
                            </div>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Username</th>
                                    <th>No. Telepon</th>
                                    <th>Nama</th>
                                    <th>Role</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingUsers ? (
                                    <tr><td colSpan="6" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center">Belum ada data pengguna</td></tr>
                                ) : (
                                    users.map((user, idx) => {
                                        const roleInfo = getRoleBadge(user.role)
                                        return (
                                            <tr key={user.id}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    {user.username ? user.username : <span className="badge badge-danger">No Username</span>}
                                                </td>
                                                <td>{user.no_telp || '-'}</td>
                                                <td>{user.nama || '-'}</td>
                                                <td>
                                                    <span className={`badge ${roleInfo.class}`}>
                                                        <roleInfo.icon size={14} /> {roleInfo.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="btn-icon btn-icon-info" onClick={() => handleViewDetail(user)} title="Lihat Detail"><Eye size={16} /></button>
                                                        <button className="btn-icon" onClick={() => handleEditUser(user)} title="Edit"><Edit size={16} /></button>
                                                        <button className="btn-icon btn-icon-warning" onClick={() => handleResetPassword(user)} title="Reset Password"><Key size={16} /></button>
                                                        <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteUser(user)} title="Hapus"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Data Import Tab */}
            {activeTab === 'data-input' && (
                <div className="settings-section">
                    <div className="section-header">
                        <h3>Import Data via Excel/CSV</h3>
                    </div>

                    {importResult.message && (
                        <div className={`alert ${importResult.success > 0 ? 'alert-success' : 'alert-error'} mb-3`}>
                            {importResult.success > 0 ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            {importResult.message}
                        </div>
                    )}

                    {/* Data Type Selector */}
                    <div className="import-step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h4>Pilih Jenis Data</h4>
                            <div className="data-type-selector">
                                {dataTypes.map(dt => (
                                    <button
                                        key={dt.id}
                                        className={`data-type-btn ${selectedDataType === dt.id ? 'active' : ''}`}
                                        onClick={() => { setSelectedDataType(dt.id); setImportData([]); setShowPreview(false) }}
                                    >
                                        <dt.icon size={20} />
                                        <span>{dt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Upload File */}
                    <div className="import-step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h4>Upload File Excel/CSV</h4>

                            {/* Loading Indicator */}
                            {uploadingFile && (
                                <div className="alert alert-info mb-3" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <RefreshCw size={18} className="spin" />
                                    <span>Memproses file... Mohon tunggu</span>
                                </div>
                            )}

                            {/* Error Display */}
                            {uploadError && (
                                <div className="alert alert-error mb-3" style={{ whiteSpace: 'pre-line' }}>
                                    <AlertCircle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            <div className="upload-area" onClick={() => !uploadingFile && fileInputRef.current?.click()} style={{ opacity: uploadingFile ? 0.6 : 1, cursor: uploadingFile ? 'wait' : 'pointer' }}>
                                {uploadingFile ? <RefreshCw size={40} className="spin" /> : <Upload size={40} />}
                                <p>{uploadingFile ? 'Memproses file...' : 'Klik atau drag file Excel/CSV ke sini'}</p>
                                <span className="text-muted">Format: .xlsx, .xls, .csv</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                disabled={uploadingFile}
                                style={{ display: 'none' }}
                            />

                            <div className="column-hints">
                                <p><strong>Kolom yang dikenali untuk {dataTypes.find(d => d.id === selectedDataType)?.label}:</strong></p>
                                <ul>
                                    {Object.entries(getColumnMapping(selectedDataType)).map(([col, aliases]) => (
                                        <li key={col}><code>{col}</code>: {aliases.slice(0, 3).join(', ')}...</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    {showPreview && importData.length > 0 && (
                        <div className="import-step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h4>Preview Data ({importData.length} baris)</h4>
                                <div className="preview-table-wrapper">
                                    <table className="preview-table">
                                        <thead>
                                            <tr>
                                                <th>No</th>
                                                {getPreviewColumns().map(col => <th key={col}>{col}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importData.slice(0, 10).map((row, idx) => (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    {getPreviewColumns().map(col => <td key={col}>{row[col] || '-'}</td>)}
                                                </tr>
                                            ))}
                                            {importData.length > 10 && (
                                                <tr><td colSpan={getPreviewColumns().length + 1} className="text-center text-muted">... dan {importData.length - 10} baris lainnya</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="import-actions">
                                    <button className="btn btn-secondary" onClick={() => { setShowPreview(false); setImportData([]) }}>
                                        Batal
                                    </button>
                                    <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                                        {importing ? <><RefreshCw size={16} className="spin" /> Mengimport...</> : <><Upload size={16} /> Import {importData.length} Data</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit User Modal */}
            {showUserModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
                            <button className="modal-close" onClick={() => { setShowUserModal(false); setUserError(''); setUserSuccess('') }}>×</button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="modal-body">
                                {userError && <div className="alert alert-error mb-3">{userError}</div>}
                                {userSuccess && <div className="alert alert-success mb-3">{userSuccess}</div>}

                                <div className="info-box mb-3" style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#1e40af' }}>
                                    💡 User akan login menggunakan <strong>Username</strong> dan <strong>Password</strong>.
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Username *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={userForm.username}
                                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                        disabled={editingUser}
                                        placeholder="username"
                                        required
                                    />
                                </div>

                                {!editingUser && (
                                    <div className="form-group">
                                        <label className="form-label">Password *</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={userForm.password}
                                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                            required
                                            minLength={6}
                                            placeholder="Minimal 6 karakter"
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={userForm.nama}
                                        onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                                        placeholder="Nama pengguna"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">No. Telepon</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={userForm.no_telp}
                                        onChange={(e) => setUserForm({ ...userForm, no_telp: e.target.value })}
                                        placeholder="Contoh: 081234567890 (opsional jika ada email)"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <select
                                        className="form-control"
                                        value={userForm.role}
                                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                    >
                                        <option value="admin">Admin - Akses penuh ke semua fitur</option>
                                        <option value="guru">Guru - Input nilai dan hafalan</option>
                                        <option value="wali">Wali Santri - Lihat dan download nilai</option>
                                    </select>
                                </div>

                                {userForm.role === 'wali' && (
                                    <div className="form-group">
                                        <label className="form-label">Hubungkan Santri (Anak Asuh)</label>
                                        <div className="santri-selector" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '6px' }}>
                                            {santriList.length === 0 ? (
                                                <p className="text-muted small">Tidak ada data santri aktif.</p>
                                            ) : (
                                                santriList.map(santri => (
                                                    <div key={santri.id} className="checkbox-item" style={{ marginBottom: '8px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={(userForm.santri_ids || []).includes(santri.id)}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked
                                                                    setUserForm(prev => ({
                                                                        ...prev,
                                                                        santri_ids: checked
                                                                            ? [...prev.santri_ids, santri.id]
                                                                            : prev.santri_ids.filter(id => id !== santri.id)
                                                                    }))
                                                                }}
                                                                style={{ width: '16px', height: '16px' }}
                                                            />
                                                            <span style={{ color: (userForm.santri_ids || []).includes(santri.id) ? '#2563eb' : 'inherit', fontWeight: (userForm.santri_ids || []).includes(santri.id) ? '600' : 'normal' }}>
                                                                {santri.nama} <small className="text-muted">({santri.kelas?.nama || '-'})</small>
                                                            </span>
                                                        </label>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                                            {userForm.santri_ids.length} santri dipilih.
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={savingUser}>
                                    {savingUser ? <><RefreshCw size={16} className="spin" /> Menyimpan...</> : <><Save size={16} /> Simpan</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {
                showPasswordModal && (
                    <div className="modal-overlay active">
                        <div className="modal">
                            <div className="modal-header">
                                <h3 className="modal-title"><Lock size={20} /> Ubah Password</h3>
                                <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleSavePassword}>
                                <div className="modal-body">
                                    {passwordError && <div className="alert alert-error mb-3">{passwordError}</div>}
                                    {passwordSuccess && <div className="alert alert-success mb-3">{passwordSuccess}</div>}

                                    <div className="info-box mb-3">
                                        <p><strong>User:</strong> {passwordUser?.email}</p>
                                        <p><strong>Nama:</strong> {passwordUser?.nama || '-'}</p>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Password Baru *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Minimal 6 karakter"
                                            minLength={6}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Konfirmasi Password *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Ulangi password baru"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                                        {savingPassword ? <><RefreshCw size={16} className="spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Password</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Detail User Modal */}
            {
                showDetailModal && detailUser && (
                    <div className="modal-overlay active">
                        <div className="modal">
                            <div className="modal-header">
                                <h3 className="modal-title"><Eye size={20} /> Detail Pengguna</h3>
                                <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="user-detail-card">
                                    <div className="detail-avatar">
                                        <User size={48} />
                                    </div>
                                    <div className="detail-info">
                                        <h3>{detailUser.nama || 'Nama tidak tersedia'}</h3>
                                        <span className={`badge ${getRoleBadge(detailUser.role).class}`}>
                                            {getRoleBadge(detailUser.role).label}
                                        </span>
                                    </div>
                                </div>

                                <div className="detail-table">
                                    <div className="detail-row">
                                        <span className="detail-label">Email</span>
                                        <span className="detail-value">{detailUser.email}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Nama Lengkap</span>
                                        <span className="detail-value">{detailUser.nama || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Role</span>
                                        <span className="detail-value">
                                            <span className={`badge ${getRoleBadge(detailUser.role).class}`}>
                                                {getRoleBadge(detailUser.role).label}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Password</span>
                                        <span className="detail-value">
                                            <code className="password-display">{detailUser.password_ref || '(belum diset)'}</code>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Tutup</button>
                                <button className="btn btn-warning" onClick={() => { setShowDetailModal(false); handleResetPassword(detailUser) }}>
                                    <Key size={16} /> Ubah Password
                                </button>
                                <button className="btn btn-primary" onClick={() => { setShowDetailModal(false); handleEditUser(detailUser) }}>
                                    <Edit size={16} /> Edit
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default PengaturanPage


