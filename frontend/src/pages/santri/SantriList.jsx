import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, Upload, FileSpreadsheet, X, MoreVertical, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import * as XLSX from 'xlsx'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { useSantriList } from '../../hooks/features/useSantriList'
import PageHeader from '../../components/layout/PageHeader'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const SantriList = () => {
    const { activeRole, userProfile, isAdmin, isAdminAkademik, isGuru, isBendahara, hasRole } = useAuth()
    const showToast = useToast()
    const navigate = useNavigate()
    const fileInputRef = useRef(null)

    // State definitions
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('nama-asc')
    const [activeStatus, setActiveStatus] = useState('Aktif')

    // Import state
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState([])
    const [importing, setImporting] = useState(false)
    const [importSuccess, setImportSuccess] = useState('')
    const [detectedHeaders, setDetectedHeaders] = useState([])

    // Delete state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedSantri, setSelectedSantri] = useState(null)

    // Performance: Use Cached Hook - Fetch all statuses to support tab counts
    const { data: rawSantri = [], isLoading: loading, error, refetch } = useSantriList('semua')

    // Client-side Sorting (Efficient for < 1000 rows)
    const santri = useMemo(() => {
        let sorted = [...rawSantri]
        if (sortBy === 'nama-asc') sorted.sort((a, b) => a.nama.localeCompare(b.nama))
        else if (sortBy === 'nama-desc') sorted.sort((a, b) => b.nama.localeCompare(a.nama))
        else if (sortBy === 'nis-asc') sorted.sort((a, b) => a.nis.localeCompare(b.nis))
        return sorted
    }, [rawSantri, sortBy])

    const adminCheck = isAdmin() || isAdminAkademik() || userProfile?.role === 'admin' || userProfile?.activeRole === 'admin' || hasRole('admin')
    const canEditSantri = adminCheck

    // Manage modal body scroll
    useEffect(() => {
        if (showImportModal) {
            document.body.classList.add('modal-open')
        } else {
            document.body.classList.remove('modal-open')
        }
        return () => document.body.classList.remove('modal-open')
    }, [showImportModal])

    // Error Handling
    useEffect(() => {
        if (error) {
            console.error('Error loading santri:', error)
            showToast.error('Gagal memuat data santri: ' + error.message)
        }
    }, [error])

    const fetchSantri = () => refetch()

    // Helpers for Excel parsing
    const parseNisString = (val) => {
        if (val === undefined || val === null) return ''
        const str = String(val).trim()
        if (str.includes('e+') || str.includes('E+')) {
            const num = Number(val)
            if (!isNaN(num)) {
                return String(Math.round(num))
            }
        }
        return str
    }

    const parseExcelDate = (val) => {
        if (!val) return null
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return null
            const y = val.getFullYear()
            const m = String(val.getMonth() + 1).padStart(2, '0')
            const d = String(val.getDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
        }
        if (typeof val === 'number') {
            try {
                const dateObj = XLSX.SSF.parse_date_code(val)
                if (dateObj) {
                    const y = dateObj.y
                    const m = String(dateObj.m).padStart(2, '0')
                    const d = String(dateObj.d).padStart(2, '0')
                    return `${y}-${m}-${d}`
                }
            } catch (e) {
                // ignore
            }
        }
        const str = String(val).trim()
        if (!str) return null
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

        // Check if string is Date representation (e.g. "Tue Sep 30 2014...")
        const dateParsed = new Date(str)
        if (!isNaN(dateParsed.getTime()) && str.length > 15) {
            const y = dateParsed.getFullYear()
            const m = String(dateParsed.getMonth() + 1).padStart(2, '0')
            const d = String(dateParsed.getDate()).padStart(2, '0')
            return `${y}-${m}-${d}`
        }

        // Match DD/MM/YYYY or DD-MM-YYYY
        const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
        if (dmy) {
            const d = dmy[1].padStart(2, '0')
            const m = dmy[2].padStart(2, '0')
            const y = dmy[3]
            return `${y}-${m}-${d}`
        }
        return str
    }

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Validate file type
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            showToast.error('File harus berformat .xlsx, .xls, atau .csv')
            return
        }

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

                if (data.length > 0) {
                    setDetectedHeaders(Object.keys(data[0]))
                }

                // Parse and validate each row
                const mappedData = data.map((row, index) => {
                    const mapped = {
                        rowNum: index + 2, // rowNum for Excel row (header = 1)
                        errors: [],
                        nis: '',
                        nama: '',
                        jenis_kelamin: 'Laki-laki',
                        tempat_lahir: '',
                        tanggal_lahir: '',
                        alamat: '',
                        nama_wali: '',
                        no_telp_wali: '',
                        nama_angkatan: '',
                        kelas: '',
                        halaqoh: '',
                        status: 'Aktif'
                    }

                    // Map columns (flexible naming with strict priority)
                    Object.keys(row).forEach(key => {
                        const lowerKey = key.toLowerCase().trim()
                        const rawVal = row[key] !== undefined && row[key] !== null ? String(row[key]).trim() : ''

                        if (!rawVal) return

                        // Priority 1: Wali Name (Check exact 'nama_wali' or 'nama wali' first!)
                        if (
                            lowerKey === 'nama_wali' || lowerKey === 'nama wali' ||
                            lowerKey === 'wali' || lowerKey === 'parent_name' ||
                            lowerKey === 'nama_ortu' || lowerKey === 'nama ortu'
                        ) {
                            mapped.nama_wali = rawVal
                        }
                        // Priority 2: Phone numbers (No telp wali / HP)
                        else if (
                            lowerKey === 'no_telp_wali' || lowerKey === 'no telp wali' ||
                            lowerKey === 'telp_wali' || lowerKey === 'hp_wali' ||
                            lowerKey === 'no_hp_wali' || lowerKey === 'no_telp' ||
                            lowerKey === 'no telp' || lowerKey === 'no_hp' ||
                            lowerKey === 'no hp' || lowerKey === 'whatsapp' ||
                            lowerKey === 'wa' || lowerKey.includes('telp') ||
                            lowerKey.includes('handphone') || lowerKey.includes('phone') ||
                            lowerKey.includes('mobile') || lowerKey.includes('hp_wali')
                        ) {
                            mapped.no_telp_wali = rawVal
                        }
                        // Priority 3: Fallback general 'wali'
                        else if (lowerKey.includes('wali') || lowerKey.includes('ortu') || lowerKey.includes('parent')) {
                            mapped.nama_wali = rawVal
                        }
                        // Priority 4: NIS
                        else if (
                            lowerKey === 'nis' || lowerKey === 'nisn' || lowerKey === 'no_induk' ||
                            lowerKey === 'no induk' || lowerKey.includes('nis')
                        ) {
                            mapped.nis = parseNisString(row[key])
                        }
                        // Priority 5: Nama Santri
                        else if (
                            lowerKey === 'nama' || lowerKey === 'nama_santri' ||
                            lowerKey === 'nama lengkap' || lowerKey === 'name' || lowerKey.includes('nama')
                        ) {
                            mapped.nama = rawVal
                        }
                        // Priority 5: Jenis Kelamin
                        else if (
                            lowerKey.includes('jenis') || lowerKey.includes('kelamin') ||
                            lowerKey === 'l/p' || lowerKey === 'jk' || lowerKey === 'gender'
                        ) {
                            const val = rawVal.toLowerCase()
                            mapped.jenis_kelamin = (val.includes('l') || val.includes('laki')) ? 'Laki-laki' : 'Perempuan'
                        }
                        // Priority 6: Tempat Lahir
                        else if (
                            lowerKey.includes('tempat') || lowerKey.includes('birthplace') ||
                            lowerKey === 'tmp_lahir' || lowerKey === 'tpt_lahir'
                        ) {
                            mapped.tempat_lahir = rawVal
                        }
                        // Priority 7: Tanggal Lahir
                        else if (
                            lowerKey.includes('tanggal') || lowerKey.includes('tgl') ||
                            lowerKey.includes('birthdate') || lowerKey === 'dob'
                        ) {
                            mapped.tanggal_lahir = parseExcelDate(row[key])
                        }
                        // Priority 8: Alamat
                        else if (
                            lowerKey.includes('alamat') || lowerKey.includes('address')
                        ) {
                            mapped.alamat = rawVal
                        }
                        // Priority 9: Status
                        else if (lowerKey === 'status') {
                            const normalizedStatus = rawVal.charAt(0).toUpperCase() + rawVal.slice(1).toLowerCase()
                            mapped.status = ['Aktif', 'Boyong', 'Tidak Aktif', 'Lulus', 'Pindah'].includes(normalizedStatus) ? normalizedStatus : 'Aktif'
                        }
                        // Priority 10: Angkatan
                        else if (
                            lowerKey === 'nama_angkatan' || lowerKey.includes('angkatan') || lowerKey === 'year'
                        ) {
                            mapped.nama_angkatan = rawVal
                        }
                        // Priority 11: Kelas
                        else if (lowerKey === 'kelas' || lowerKey.includes('class')) {
                            mapped.kelas = rawVal
                        }
                        // Priority 12: Halaqoh
                        else if (lowerKey === 'halaqoh' || lowerKey.includes('halaqah')) {
                            mapped.halaqoh = rawVal
                        }
                    })

                    // VALIDATION
                    if (!mapped.nis) mapped.errors.push('NIS wajib diisi')
                    if (!mapped.nama) mapped.errors.push('Nama wajib diisi')
                    if (!mapped.nama_angkatan) mapped.errors.push('Angkatan wajib diisi')

                    mapped.isValid = mapped.errors.length === 0

                    return mapped
                }).filter(row => row.nis || row.nama) // Filter completely empty rows

                setImportData(mappedData)
                setShowImportModal(true)
            } catch (err) {
                showToast.error('Gagal membaca file: ' + err.message)
            }
        }
        reader.readAsBinaryString(file)
        e.target.value = ''
    }

    const handleImport = async () => {
        if (importData.length === 0) return

        const validRows = importData.filter(d => d.isValid)
        const skippedCount = importData.length - validRows.length

        if (validRows.length === 0) {
            showToast.error('Tidak ada data valid untuk diimport!')
            return
        }

        setImporting(true)
        try {
            // STEP 1: Collect unique angkatan names
            const uniqueAngkatan = [...new Set(validRows.map(d => d.nama_angkatan).filter(Boolean))]

            // STEP 2: Find or Create each Angkatan
            const angkatanMap = {}

            for (const namaAngkatan of uniqueAngkatan) {
                const { data: existing } = await supabase
                    .from('angkatan')
                    .select('id')
                    .eq('nama', namaAngkatan)
                    .single()

                if (existing) {
                    angkatanMap[namaAngkatan] = existing.id
                } else {
                    const { data: created, error: createErr } = await supabase
                        .from('angkatan')
                        .insert({ nama: namaAngkatan })
                        .select('id')
                        .single()

                    if (createErr) throw createErr
                    angkatanMap[namaAngkatan] = created.id
                }
            }

            // STEP 3: Prepare Santri Data with ALL fields
            const santriData = validRows.map(d => ({
                nis: d.nis,
                nama: d.nama,
                jenis_kelamin: d.jenis_kelamin || 'Laki-laki',
                tempat_lahir: d.tempat_lahir || null,
                tanggal_lahir: d.tanggal_lahir || null,
                alamat: d.alamat || null,
                nama_wali: d.nama_wali || null,
                no_telp: d.no_telp_wali || null,
                no_telp_wali: d.no_telp_wali || null,
                status: d.status || 'Aktif',
                angkatan_id: angkatanMap[d.nama_angkatan] || null
            }))

            // STEP 4: Upsert Santri
            const { error: upsertError } = await supabase
                .from('santri')
                .upsert(santriData, {
                    onConflict: 'nis',
                    ignoreDuplicates: false
                })

            if (upsertError) throw upsertError

            const successMsg = skippedCount > 0
                ? `Berhasil import ${validRows.length} data. ${skippedCount} data error dilewati.`
                : `Berhasil import ${validRows.length} data santri.`

            showToast.success(successMsg)

            setTimeout(() => {
                setShowImportModal(false)
                setImportData([])
                setImportSuccess('')
                fetchSantri()
            }, 1000)

        } catch (err) {
            console.error('Import failed:', err)
            showToast.error('Gagal Import: ' + err.message)
        } finally {
            setImporting(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedSantri) return
        try {
            const { error } = await supabase.from('santri').delete().eq('id', selectedSantri.id)
            if (error) throw error

            await logDelete('santri', selectedSantri.nama, `Hapus data santri: ${selectedSantri.nama} (${selectedSantri.nis})`)

            await refetch()
            setShowDeleteModal(false)
            setSelectedSantri(null)
            showToast.success('Data santri berhasil dihapus')
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const handleDownloadExcel = () => {
        const columns = ['NIS', 'Nama', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'No. HP Santri', 'Nama Wali', 'No. Telp Wali', 'Angkatan', 'Kelas', 'Halaqoh', 'Status']
        const exportData = filteredSantri.map(s => ({
            NIS: s.nis || '',
            Nama: s.nama || '',
            'Jenis Kelamin': s.jenis_kelamin || '',
            'Tempat Lahir': s.tempat_lahir || '',
            'Tanggal Lahir': s.tanggal_lahir || '',
            Alamat: s.alamat || '',
            'No. HP Santri': s.no_telp || '',
            'Nama Wali': s.nama_wali || '',
            'No. Telp Wali': s.no_telp_wali || '',
            Angkatan: s.angkatan || '',
            Kelas: s.kelas || '',
            Halaqoh: s.halaqoh || '',
            Status: s.status || ''
        }))
        exportToExcel(exportData, columns, 'data_santri')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['NIS', 'Nama', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'No. HP Santri', 'Nama Wali', 'No. Telp Wali', 'Angkatan', 'Kelas', 'Halaqoh', 'Status']
        const exportData = filteredSantri.map(s => ({
            NIS: s.nis || '',
            Nama: s.nama || '',
            'Jenis Kelamin': s.jenis_kelamin || '',
            'Tempat Lahir': s.tempat_lahir || '',
            'Tanggal Lahir': s.tanggal_lahir || '',
            Alamat: s.alamat || '',
            'No. HP Santri': s.no_telp || '',
            'Nama Wali': s.nama_wali || '',
            'No. Telp Wali': s.no_telp_wali || '',
            Angkatan: s.angkatan || '',
            Kelas: s.kelas || '',
            Halaqoh: s.halaqoh || '',
            Status: s.status || ''
        }))
        exportToCSV(exportData, columns, 'data_santri')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Data Santri',
            columns: ['NIS', 'Nama', 'L/P', 'Tempat Lahir', 'Tgl Lahir', 'Alamat', 'Nama Wali', 'No. Wali', 'Angkatan', 'Kelas', 'Halaqoh', 'Status'],
            data: filteredSantri.map(s => [
                s.nis || '',
                s.nama || '',
                s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
                s.tempat_lahir || '-',
                s.tanggal_lahir || '-',
                s.alamat || '-',
                s.nama_wali || '-',
                s.no_telp_wali || '-',
                s.angkatan || '-',
                s.kelas || '-',
                s.halaqoh || '-',
                s.status || 'Aktif'
            ]),
            filename: 'data_santri'
        })
        showToast.success('PDF berhasil didownload')
    }

    const filteredSantri = santri
        .filter(s => {
            const matchesSearch = (s.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 s.nis?.toLowerCase().includes(searchTerm.toLowerCase()))
            const matchesStatus = s.status === activeStatus
            return matchesSearch && matchesStatus
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'nama-asc': return (a.nama || '').localeCompare(b.nama || '')
                case 'nama-desc': return (b.nama || '').localeCompare(a.nama || '')
                case 'nis-asc': return (a.nis || '').localeCompare(b.nis || '')
                case 'nis-desc': return (b.nis || '').localeCompare(a.nis || '')
                case 'kelas-asc': return (a.kelas || '').localeCompare(b.kelas || '')
                case 'kelas-desc': return (b.kelas || '').localeCompare(a.kelas || '')
                case 'status-asc': return (a.status || '').localeCompare(b.status || '')
                case 'status-desc': return (b.status || '').localeCompare(a.status || '')
                default: return 0
            }
        })

    return (
        <div className="space-y-6">
            <PageHeader
                title="Data Santri"
                description="Kelola data santri pondok pesantren"
                icon={UserX}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        <DownloadButton
                            onDownloadPDF={handleDownloadPDF}
                            onDownloadExcel={handleDownloadExcel}
                            onDownloadCSV={handleDownloadCSV}
                        />
                        {canEditSantri && (
                            <>
                                <Link to="/santri/create">
                                    <Button>
                                        <Plus size={18} /> Tambah Santri
                                    </Button>
                                </Link>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: 'none' }}
                                />
                                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={18} /> Import Excel/CSV
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                            {[
                                { id: 'Aktif', label: 'Aktif', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { id: 'Boyong', label: 'Boyong', color: 'text-rose-600', bg: 'bg-rose-50' },
                                { id: 'Tidak Aktif', label: 'Non-Aktif', color: 'text-amber-600', bg: 'bg-amber-50' },
                                { id: 'Lulus', label: 'Lulus', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { id: 'Pindah', label: 'Pindah', color: 'text-gray-600', bg: 'bg-gray-50' }
                            ].map((tab) => {
                                const count = santri.filter(s => s.status === tab.id).length
                                const isActive = activeStatus === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveStatus(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                                            ${isActive 
                                                ? `${tab.bg} ${tab.color} shadow-sm border border-white` 
                                                : 'text-gray-400 hover:text-gray-600'}
                                        `}
                                    >
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-lg text-[10px] border ${isActive ? 'bg-white border-transparent shadow-sm' : 'bg-gray-200/50 border-transparent text-gray-400'}`}>
                                            {count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                            <div className="w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Cari santri..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full md:w-auto px-3 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none font-bold text-gray-600"
                                >
                                    <option value="nama-asc">Nama A-Z</option>
                                    <option value="nama-desc">Nama Z-A</option>
                                    <option value="nis-asc">NIS Asc</option>
                                    <option value="nis-desc">NIS Desc</option>
                                </select>
                                <Button variant="secondary" size="icon" onClick={fetchSantri} className="rounded-xl">
                                    <RefreshCw size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <ResponsiveTable
                    columns={[
                        { 
                            header: 'Identitas Santri', 
                            render: (row) => (
                                <div className="flex flex-col">
                                    <div className="font-black text-gray-900 leading-tight">{row.nama}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">NIS: {row.nis}</div>
                                </div>
                            ),
                            className: 'px-8 py-5',
                            hideOnMobile: true
                        },
                        { 
                            header: 'Gender', 
                            render: (row) => (
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${row.jenis_kelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                    {row.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                                </span>
                            ),
                            className: 'px-8 py-5',
                            hideOnMobile: true
                        },
                        { 
                            header: 'Angkatan', 
                            render: (row) => (
                                <div className="flex flex-col">
                                    <div className="text-xs font-bold text-gray-600">{row.angkatan || '-'}</div>
                                    {row.raw_angkatan_id && (
                                        <div className="text-[9px] text-gray-300 font-medium">#{String(row.raw_angkatan_id).substring(0, 6)}</div>
                                    )}
                                </div>
                            ),
                            className: 'px-8 py-5',
                            hideOnMobile: true
                        },
                        { 
                            header: 'Kelas / Halaqoh', 
                            render: (row) => (
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-tight border border-emerald-100">
                                        {row.kelas || 'No Class'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-tight border border-indigo-100">
                                        {row.halaqoh || 'No Group'}
                                    </span>
                                </div>
                            ),
                            className: 'px-8 py-5',
                            hideOnMobile: true
                        },
                        { 
                            header: 'Aksi', 
                            className: 'px-8 py-5 text-right',
                            render: (row) => (
                                <div className="flex items-center justify-end gap-2 transition-all">
                                    <Link to={`/santri/${row.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Detail"><Eye size={18} /></Link>
                                    <Link to={`/santri/${row.id}/edit`} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit"><Edit size={18} /></Link>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedSantri(row); setShowDeleteModal(true) }} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Hapus"><Trash2 size={18} /></button>
                                </div>
                            ) 
                        }
                    ]}
                    data={filteredSantri}
                    loading={loading}
                    emptyState={
                        <EmptyState
                            icon={Search}
                            title="Data tidak ditemukan"
                            message={searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}" di kategori ${activeStatus}` : `Belum ada data santri dengan status ${activeStatus}.`}
                        />
                    }
                    mobileCardHeader={(row) => (
                        <div className="flex flex-col" onClick={() => navigate(`/santri/${row.id}`)}>
                            <div className="font-black text-gray-900 text-base leading-tight">{row.nama}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">NIS: {row.nis}</div>
                        </div>
                    )}
                    mobileCardActions={(row) => (
                        <MobileActionMenu
                            actions={[
                                { icon: <Eye size={16} />, label: 'Detail', path: `/santri/${row.id}` },
                                { icon: <Edit size={16} />, label: 'Edit', path: `/santri/${row.id}/edit` },
                                { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedSantri(row); setShowDeleteModal(true) }, danger: true }
                            ]}
                        />
                    )}
                    mobileCardContent={(row) => (
                        <div className="flex flex-col gap-3 w-full mt-1" onClick={() => navigate(`/santri/${row.id}`)}>
                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${row.jenis_kelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                    {row.jenis_kelamin}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Angkatan:</span>
                                    <span className="text-[10px] font-black text-gray-600 italic">{row.angkatan || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-100">
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Kelas:</span>
                                    <span className="text-[10px] font-black text-emerald-600">{row.kelas || '-'}</span>
                                </div>
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Grup:</span>
                                    <span className="text-[10px] font-black text-indigo-600 truncate max-w-[100px]">{row.halaqoh || '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                />

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Menampilkan {filteredSantri.length} dari {santri.length} santri</p>
                </div>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal-box w-full max-w-5xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <FileSpreadsheet size={20} className="text-primary-600" />
                                Preview Import Data
                            </h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => { setShowImportModal(false); setImportData([]) }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            {importSuccess ? (
                                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 whitespace-pre-line">
                                    {importSuccess}
                                </div>
                            ) : (
                                <>
                                    <div className="text-xs text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <strong>Kolom Terbaca:</strong> {detectedHeaders.join(', ')}
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-3 mb-4">
                                        <Badge variant="success">
                                            ✓ Valid: {importData.filter(d => d.isValid).length}
                                        </Badge>
                                        <Badge variant={importData.some(d => !d.isValid) ? 'danger' : 'neutral'}>
                                            ✗ Error: {importData.filter(d => !d.isValid).length}
                                        </Badge>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="max-h-[360px] overflow-auto border border-gray-200 rounded-lg">
                                        <ResponsiveTable
                                            columns={[
                                                { header: '#', render: (row) => <span className="text-gray-500">{row.rowNum}</span>, className: 'px-3 py-2 w-10 text-center', hideOnMobile: true },
                                                { header: 'NIS', render: (row) => <span className="font-mono font-semibold text-xs">{row.nis || <span className="text-red-500">-</span>}</span>, className: 'px-3 py-2' },
                                                { 
                                                    header: 'Nama Santri', 
                                                    render: (row) => (
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-sm">{row.nama || <span className="text-red-500">-</span>}</div>
                                                            <div className="text-[11px] text-gray-500 font-medium">
                                                                {row.jenis_kelamin} {(row.tempat_lahir || row.tanggal_lahir) ? `• ${row.tempat_lahir || ''}${row.tempat_lahir && row.tanggal_lahir ? ', ' : ''}${row.tanggal_lahir || ''}` : ''}
                                                            </div>
                                                        </div>
                                                    ), 
                                                    className: 'px-3 py-2' 
                                                },
                                                { 
                                                    header: 'Nama Wali', 
                                                    render: (row) => <span className="text-xs text-gray-800 font-medium">{row.nama_wali || <span className="text-gray-400 italic">-</span>}</span>, 
                                                    className: 'px-3 py-2', 
                                                    hideOnMobile: true 
                                                },
                                                { 
                                                    header: 'No HP Wali', 
                                                    render: (row) => (
                                                        <span className={row.no_telp_wali ? 'text-emerald-600 font-mono text-xs font-bold' : 'text-amber-500 italic text-xs'}>
                                                            {row.no_telp_wali || 'kosong'}
                                                        </span>
                                                    ), 
                                                    className: 'px-3 py-2', 
                                                    hideOnMobile: true 
                                                },
                                                { 
                                                    header: 'Alamat', 
                                                    render: (row) => <span className="text-xs text-gray-600 block max-w-[200px] truncate" title={row.alamat}>{row.alamat || '-'}</span>, 
                                                    className: 'px-3 py-2', 
                                                    hideOnMobile: true 
                                                },
                                                { header: 'Angkatan', render: (row) => <span className="text-xs font-semibold">{row.nama_angkatan || <span className="text-red-500">-</span>}</span>, className: 'px-3 py-2', hideOnMobile: true },
                                                { 
                                                    header: 'Status', 
                                                    render: (row) => (
                                                        row.isValid ? (
                                                            <span className="text-emerald-600 font-bold text-xs">✓ OK</span>
                                                        ) : (
                                                            <span className="text-red-600 text-xs font-semibold">{row.errors.join(', ')}</span>
                                                        )
                                                    ), 
                                                    className: 'px-3 py-2' 
                                                }
                                            ]}
                                            data={importData}
                                            rowClassName={(row) => !row.isValid ? 'bg-red-50' : ''}
                                            mobileCardHeader={(row) => (
                                                <div className="flex justify-between items-center w-full">
                                                    <div>
                                                        <div className="font-bold text-gray-900">{row.nama || <span className="text-red-500">-</span>}</div>
                                                        <div className="font-mono text-xs text-gray-500">{row.nis || <span className="text-red-500">-</span>}</div>
                                                    </div>
                                                    <div>
                                                        {row.isValid ? (
                                                            <span className="text-emerald-600 font-medium text-xs">✓ OK</span>
                                                        ) : (
                                                            <span className="text-red-600 text-xs">Error</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            mobileCardContent={(row) => (
                                                <div className="flex flex-col gap-1 text-xs text-gray-600 mt-2">
                                                    {!row.isValid && (
                                                        <div className="text-red-600 mb-2">{row.errors.join(', ')}</div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span>Wali:</span>
                                                        <span className="font-medium">{row.nama_wali || '-'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>No HP Wali:</span>
                                                        <span className={row.no_telp_wali ? 'text-emerald-600 font-bold' : 'text-amber-500 italic'}>{row.no_telp_wali || 'kosong'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>TTL:</span>
                                                        <span>{row.tempat_lahir || ''} {row.tanggal_lahir || ''}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Alamat:</span>
                                                        <span className="truncate max-w-[150px]">{row.alamat || '-'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Angkatan:</span>
                                                        <span>{row.nama_angkatan || '-'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </div>

                                    {importData.some(d => !d.isValid) && (
                                        <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm flex items-start gap-2">
                                            <UserX size={16} className="mt-0.5 shrink-0" />
                                            <div>
                                                Baris dengan error akan <strong>dilewati</strong> saat import.
                                                Hanya data valid yang akan disimpan.
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => { setShowImportModal(false); setImportData([]) }}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={importing || importSuccess || !importData.some(d => d.isValid)}
                                isLoading={importing}
                            >
                                {importing ? 'Importing...' : `Import ${importData.filter(d => d.isValid).length} Data Valid`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                itemName={selectedSantri?.nama}
                message={`Apakah Anda yakin ingin menghapus santri ${selectedSantri?.nama}? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    )
}
export default SantriList
