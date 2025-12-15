import { useState, useEffect, useRef } from 'react'
import { Users, Database, UserPlus, Edit, Trash2, RefreshCw, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Save, Shield, GraduationCap, User, Key, Lock, Eye } from 'lucide-react'
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
    const [userForm, setUserForm] = useState({ email: '', password: '', nama: '', role: 'guru' })
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
    const [importResult, setImportResult] = useState({ success: 0, failed: 0, message: '' })
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers()
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

    const handleAddUser = async (e) => {
        e.preventDefault()
        setSavingUser(true)
        setUserError('')
        setUserSuccess('')

        try {
            if (editingUser) {
                // Update existing user profile
                const { error } = await supabase
                    .from('user_profiles')
                    .update({
                        nama: userForm.nama,
                        role: userForm.role,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingUser.id)

                if (error) throw error
                setUserSuccess('User berhasil diupdate!')
            } else {
                // Create new user with Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: userForm.email,
                    password: userForm.password,
                    options: {
                        data: {
                            nama: userForm.nama,
                            role: userForm.role
                        }
                    }
                })

                if (authError) throw authError

                // Create user profile with password reference
                if (authData.user) {
                    const { error: profileError } = await supabase.from('user_profiles').insert([{
                        user_id: authData.user.id,
                        email: userForm.email,
                        nama: userForm.nama,
                        role: userForm.role,
                        password_ref: userForm.password
                    }])

                    if (profileError) throw profileError
                }

                setUserSuccess('User berhasil ditambahkan!')
            }

            fetchUsers()
            setTimeout(() => {
                setShowUserModal(false)
                setUserForm({ email: '', password: '', nama: '', role: 'guru' })
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
        setUserForm({
            email: user.email,
            password: '',
            nama: user.nama || '',
            role: user.role || 'guru'
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
                    'nis': ['nis', 'nisn', 'no_induk', 'no induk', 'student_id'],
                    'nama': ['nama', 'name', 'nama_lengkap', 'nama lengkap', 'fullname'],
                    'jenis_kelamin': ['jenis_kelamin', 'jenis kelamin', 'gender', 'jk', 'l/p'],
                    'tempat_lahir': ['tempat_lahir', 'tempat lahir', 'birthplace'],
                    'tanggal_lahir': ['tanggal_lahir', 'tanggal lahir', 'tgl lahir', 'tgl_lahir', 'birthdate', 'ttl'],
                    'alamat': ['alamat', 'address'],
                    'nama_wali': ['nama_wali', 'nama wali', 'wali', 'ortu', 'parent'],
                    'no_telp_wali': ['no_telp_wali', 'no telp wali', 'telp_wali', 'telp wali', 'hp wali'],
                    'status': ['status']
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

        headers.forEach((header, idx) => {
            const headerLower = header.toLowerCase().trim()
            for (const [dbCol, aliases] of Object.entries(mapping)) {
                if (aliases.some(alias => headerLower.includes(alias))) {
                    result[idx] = dbCol
                    break
                }
            }
        })

        return result
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            const reader = new FileReader()
            reader.onload = (event) => {
                const data = new Uint8Array(event.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })

                if (jsonData.length < 2) {
                    alert('File kosong atau tidak valid')
                    return
                }

                const headers = jsonData[0]
                const columnMap = mapColumns(headers, selectedDataType)

                const mappedData = jsonData.slice(1).filter(row => row.length > 0).map(row => {
                    const obj = {}
                    Object.entries(columnMap).forEach(([colIdx, dbCol]) => {
                        let value = row[parseInt(colIdx)]

                        if (dbCol === 'jenis_kelamin' && value) {
                            value = String(value).toLowerCase()
                            if (value === 'l' || value.includes('laki')) {
                                value = 'Laki-laki'
                            } else if (value === 'p' || value.includes('perempuan')) {
                                value = 'Perempuan'
                            }
                        }

                        if (dbCol === 'status' && !value) {
                            value = 'Aktif'
                        }

                        if (dbCol === 'kategori' && !value) {
                            value = 'Madrosiyah'
                        }

                        if (value !== undefined && value !== '') {
                            obj[dbCol] = value
                        }
                    })
                    return obj
                }).filter(obj => Object.keys(obj).length > 0)

                setImportData(mappedData)
                setShowPreview(true)
            }
            reader.readAsArrayBuffer(file)
        } catch (err) {
            alert('Error membaca file: ' + err.message)
        }

        e.target.value = ''
    }

    const handleImport = async () => {
        if (importData.length === 0) return

        setImporting(true)
        setImportResult({ success: 0, failed: 0, message: '' })

        try {
            const { data, error } = await supabase.from(selectedDataType).insert(importData)

            if (error) throw error

            setImportResult({
                success: importData.length,
                failed: 0,
                message: `Berhasil mengimport ${importData.length} data ${selectedDataType}!`
            })

            setImportData([])
            setShowPreview(false)
        } catch (err) {
            setImportResult({
                success: 0,
                failed: importData.length,
                message: 'Gagal import: ' + err.message
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
                        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', nama: '', role: 'guru' }); setShowUserModal(true) }}>
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
                                    <th>Email</th>
                                    <th>Nama</th>
                                    <th>Role</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingUsers ? (
                                    <tr><td colSpan="5" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center">Belum ada data pengguna</td></tr>
                                ) : (
                                    users.map((user, idx) => {
                                        const roleInfo = getRoleBadge(user.role)
                                        return (
                                            <tr key={user.id}>
                                                <td>{idx + 1}</td>
                                                <td>{user.email}</td>
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
                            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={40} />
                                <p>Klik atau drag file Excel/CSV ke sini</p>
                                <span className="text-muted">Format: .xlsx, .xls, .csv</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
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

                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={userForm.email}
                                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                        required
                                        disabled={editingUser}
                                        placeholder="contoh@email.com"
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
            {showPasswordModal && (
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
            )}

            {/* Detail User Modal */}
            {showDetailModal && detailUser && (
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
            )}
        </div>
    )
}

export default PengaturanPage


