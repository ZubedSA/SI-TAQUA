import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'
import {
    Database,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Download,
    Settings,
    Shield,
    Trash2,
    FileDown,
    Save,
    School,
    Calendar,
    Users,
    BookOpen,
    GraduationCap,
    Layers,
    FileText,
    RotateCcw,
    X,
    Clock,
    ChevronDown
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useTahunAjaran } from '../../hooks/useAkademik'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import './Pengaturan.css'

const PengaturanPage = () => {
    const { data: tahunAjaranList = [] } = useTahunAjaran()
    const showToast = useToast()
    const [activeTab, setActiveTab] = useState('import')

    // Data import states
    const [selectedDataType, setSelectedDataType] = useState('santri')
    const [importData, setImportData] = useState([])
    const [showPreview, setShowPreview] = useState(false)
    const [importing, setImporting] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [importResult, setImportResult] = useState({ success: 0, failed: 0, message: '' })
    const fileInputRef = useRef(null)

    // System settings states
    const [systemSettings, setSystemSettings] = useState({
        school_name: 'PTQ Al-Usymuni Batuan',
        school_year: '',
        school_address: 'Batuan, Sumenep, Madura',
        school_phone: '',
        school_email: ''
    })
    const [savingSettings, setSavingSettings] = useState(false)

    // Trash states
    const [trashItems, setTrashItems] = useState([])
    const [loadingTrash, setLoadingTrash] = useState(false)
    const [selectedTrashType, setSelectedTrashType] = useState('all')
    const [restoringId, setRestoringId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)

    // Export states
    const [exporting, setExporting] = useState(false)

    // Delete Confirmation State
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: null, // 'single', 'empty'
        item: null
    })

    const openDeleteModal = (item) => {
        setDeleteModal({ isOpen: true, type: 'single', item })
    }

    const openEmptyTrashModal = () => {
        setDeleteModal({ isOpen: true, type: 'empty', item: null })
    }

    const handleConfirmDelete = () => {
        if (deleteModal.type === 'single') handlePermanentDelete(deleteModal.item)
        else if (deleteModal.type === 'empty') handleEmptyTrash()
        setDeleteModal({ isOpen: false, type: null, item: null })
    }

    const dataTypes = [
        { id: 'santri', label: 'Data Santri', icon: Users },
        { id: 'guru', label: 'Data Guru', icon: GraduationCap },
        { id: 'kelas', label: 'Data Kelas', icon: Layers },
        { id: 'halaqoh', label: 'Data Halaqoh', icon: BookOpen },
        { id: 'mapel', label: 'Mata Pelajaran', icon: FileText }
    ]

    const trashTypes = [
        { id: 'all', label: 'Semua' },
        { id: 'santri', label: 'Santri' },
        { id: 'guru', label: 'Guru' },
        { id: 'hafalan', label: 'Hafalan' },
        { id: 'nilai', label: 'Nilai' },
        { id: 'presensi', label: 'Presensi' }
    ]

    useEffect(() => {
        if (activeTab === 'trash') {
            fetchTrashItems()
        } else if (activeTab === 'system') {
            fetchSettings()
        }
    }, [activeTab, selectedTrashType])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .single()

            if (error && error.code !== 'PGRST116') throw error // Ignore no rows error

            if (data) {
                setSystemSettings({
                    school_name: data.school_name || 'PTQ Al-Usymuni Batuan',
                    school_year: data.school_year || '',
                    school_address: data.school_address || 'Batuan, Sumenep, Madura',
                    school_phone: data.school_phone || '',
                    school_email: data.school_email || ''
                })
            }
        } catch (err) {
            console.error('Error fetching settings:', err.message)
        }
    }

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        try {
            // Check if settings exist first
            const { data: existing } = await supabase.from('system_settings').select('id').single()

            let error
            if (existing) {
                const { error: updateError } = await supabase
                    .from('system_settings')
                    .update({
                        school_name: systemSettings.school_name,
                        school_year: systemSettings.school_year,
                        school_address: systemSettings.school_address,
                        school_phone: systemSettings.school_phone,
                        school_email: systemSettings.school_email,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('system_settings')
                    .insert({
                        school_name: systemSettings.school_name,
                        school_year: systemSettings.school_year,
                        school_address: systemSettings.school_address,
                        school_phone: systemSettings.school_phone,
                        school_email: systemSettings.school_email
                    })
                error = insertError
            }

            if (error) throw error
            showToast.success('Pengaturan berhasil disimpan!')
        } catch (err) {
            showToast.error('Gagal menyimpan pengaturan: ' + err.message)
        } finally {
            setSavingSettings(false)
        }
    }

    const fetchTrashItems = async () => {
        setLoadingTrash(true)
        try {
            let query = supabase
                .from('trash')
                .select('*')
                .order('deleted_at', { ascending: false })

            if (selectedTrashType !== 'all') {
                query = query.eq('table_name', selectedTrashType)
            }

            const { data, error } = await query.limit(100)

            if (error) throw error
            setTrashItems(data || [])
        } catch (err) {
            console.error('Error fetching trash:', err.message)
            setTrashItems([])
        } finally {
            setLoadingTrash(false)
        }
    }

    const handleRestoreItem = async (item) => {
        if (!window.confirm(`Pulihkan data ${item.table_name} ini?`)) return

        setRestoringId(item.id)
        try {
            // Parse the stored data
            const originalData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data

            // Remove any trash-related fields
            delete originalData.deleted_at
            delete originalData.is_deleted

            // Insert back to original table
            const { error: insertError } = await supabase
                .from(item.table_name)
                .insert(originalData)

            if (insertError) throw insertError

            // Delete from trash
            const { error: deleteError } = await supabase
                .from('trash')
                .delete()
                .eq('id', item.id)

            if (deleteError) throw deleteError

            showToast.success('Data berhasil dipulihkan!')
            fetchTrashItems()
        } catch (err) {
            showToast.error('Gagal memulihkan: ' + err.message)
        } finally {
            setRestoringId(null)
        }
    }

    const handlePermanentDelete = async (item) => {
        // Validation moved to Modal
        setDeletingId(item.id)
        try {
            const { error } = await supabase
                .from('trash')
                .delete()
                .eq('id', item.id)

            if (error) throw error

            showToast.success('Data berhasil dihapus permanen!')
            fetchTrashItems()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        } finally {
            setDeletingId(null)
        }
    }

    const handleEmptyTrash = async () => {
        // Validation moved to Modal
        setLoadingTrash(true)
        try {
            // Get 30-day old items for auto-delete display
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { error } = await supabase
                .from('trash')
                .delete()
                .lt('deleted_at', thirtyDaysAgo.toISOString())

            if (error) throw error

            showToast.success('Data lama (>30 hari) berhasil dihapus!')
            fetchTrashItems()
        } catch (err) {
            showToast.error('Gagal mengosongkan: ' + err.message)
        } finally {
            setLoadingTrash(false)
        }
    }

    // Column mapping for Excel import
    const getColumnMapping = (type) => {
        switch (type) {
            case 'santri':
                return {
                    'nis': ['nis', 'nisn', 'no_induk', 'no induk', 'nomor induk'],
                    'nama': ['nama', 'name', 'nama_lengkap', 'nama lengkap'],
                    'jenis_kelamin': ['jenis_kelamin', 'jenis kelamin', 'gender', 'jk', 'l/p'],
                    'tempat_lahir': ['tempat_lahir', 'tempat lahir', 'birthplace'],
                    'tanggal_lahir': ['tanggal_lahir', 'tanggal lahir', 'tgl_lahir', 'tgl lahir', 'dob', 'birthdate'],
                    'alamat': ['alamat', 'address'],
                    'nama_wali': ['nama_wali', 'nama wali', 'wali', 'parent_name'],
                    'no_telp_wali': ['no_telp_wali', 'no telp wali', 'telp_wali', 'hp_wali', 'phone'],
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
        const usedDbCols = new Set()

        headers.forEach((header, idx) => {
            if (header === undefined || header === null) return
            const headerLower = String(header).toLowerCase().trim()
            if (!headerLower) return

            let bestMatch = null
            let bestMatchLength = 0

            for (const [dbCol, aliases] of Object.entries(mapping)) {
                if (usedDbCols.has(dbCol)) continue

                for (const alias of aliases) {
                    if (headerLower === alias) {
                        bestMatch = dbCol
                        bestMatchLength = Infinity
                        break
                    }
                    const normalizedHeader = headerLower.replace(/[_\s-]/g, '')
                    const normalizedAlias = alias.replace(/[_\s-]/g, '')
                    if (normalizedHeader === normalizedAlias && alias.length > bestMatchLength) {
                        bestMatch = dbCol
                        bestMatchLength = alias.length
                    }
                }
                if (bestMatchLength === Infinity) break
            }

            if (bestMatch) {
                result[idx] = bestMatch
                usedDbCols.add(bestMatch)
            }
        })

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
                    const sheetName = workbook.SheetNames[0]
                    const sheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

                    const nonEmptyRows = jsonData.filter(row =>
                        row && row.length > 0 && row.some(cell => cell !== '' && cell !== null && cell !== undefined)
                    )

                    if (nonEmptyRows.length < 2) {
                        setUploadError('File kosong atau hanya memiliki header.')
                        setUploadingFile(false)
                        return
                    }

                    const headers = nonEmptyRows[0]
                    const dataRows = nonEmptyRows.slice(1)
                    const columnMap = mapColumns(headers, selectedDataType)

                    if (Object.keys(columnMap).length === 0) {
                        setUploadError(`Header kolom tidak dikenali.`)
                        setUploadingFile(false)
                        return
                    }

                    const mappedData = dataRows.map((row) => {
                        const obj = {}
                        Object.entries(columnMap).forEach(([colIdx, dbCol]) => {
                            let value = row[parseInt(colIdx)]
                            if (value === undefined || value === null || value === '') return

                            if ((dbCol === 'nis' || dbCol === 'nip') && value) {
                                value = String(value).trim()
                            }

                            if (dbCol === 'tanggal_lahir' && value) {
                                if (typeof value === 'number') {
                                    const excelEpoch = new Date(1899, 11, 30)
                                    const date = new Date(excelEpoch.getTime() + value * 86400000)
                                    value = date.toISOString().split('T')[0]
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

                            if (value !== undefined && value !== '' && value !== null) {
                                obj[dbCol] = value
                            }
                        })

                        if (!obj.status && Object.keys(obj).length > 0) {
                            obj.status = 'Aktif'
                        }
                        if (!obj.jenis_kelamin && Object.keys(obj).length > 0 && (selectedDataType === 'santri' || selectedDataType === 'guru')) {
                            obj.jenis_kelamin = 'Laki-laki'
                        }

                        return obj
                    }).filter(obj => {
                        if (selectedDataType === 'santri') return obj.nis && obj.nama
                        if (selectedDataType === 'guru') return obj.nip && obj.nama
                        if (selectedDataType === 'kelas') return obj.nama && obj.tingkat
                        if (selectedDataType === 'mapel') return obj.kode && obj.nama
                        return Object.keys(obj).length > 1
                    })

                    if (mappedData.length === 0) {
                        setUploadError('Tidak ada data valid ditemukan.')
                        setUploadingFile(false)
                        return
                    }

                    setImportData(mappedData)
                    setShowPreview(true)
                    setUploadError('')
                    setUploadingFile(false)

                } catch (parseError) {
                    setUploadError(`Gagal memproses file: ${parseError.message}`)
                    setUploadingFile(false)
                }
            }

            reader.readAsArrayBuffer(file)
        } catch (err) {
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
            const { error } = await supabase.from(selectedDataType).insert(importData)

            if (error) {
                let errorMsg = error.message
                if (error.message.includes('violates not-null constraint')) {
                    errorMsg = 'Ada kolom wajib yang kosong.'
                } else if (error.message.includes('duplicate key')) {
                    errorMsg = 'Ada data duplikat.'
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

    const handleExportData = async (type) => {
        setExporting(true)
        try {
            const { data, error } = await supabase.from(type).select('*')
            if (error) throw error

            const worksheet = XLSX.utils.json_to_sheet(data || [])
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, type)
            XLSX.writeFile(workbook, `export_${type}_${new Date().toISOString().split('T')[0]}.xlsx`)
        } catch (err) {
            showToast.error('Gagal export: ' + err.message)
        } finally {
            setExporting(false)
        }
    }



    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getDaysUntilAutoDelete = (deletedAt) => {
        if (!deletedAt) return 30
        const deleted = new Date(deletedAt)
        const autoDeleteDate = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000)
        const now = new Date()
        const daysLeft = Math.ceil((autoDeleteDate - now) / (24 * 60 * 60 * 1000))
        return Math.max(0, daysLeft)
    }

    const getItemDisplayName = (item) => {
        const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data
        return data.nama || data.nis || data.nip || data.kode || `ID: ${item.original_id}`
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <PageHeader
                title="System Configuration"
                description="Manajemen data masal, ekspor laporan, dan konfigurasi parameter sistem"
                icon={Settings}
            />

            {/* Premium Navigation Tabs */}
            <div className="flex flex-wrap p-2 bg-gray-100 rounded-[2rem] w-fit border border-gray-200/50 shadow-inner">
                {[
                    { id: 'import', label: 'Import Master', icon: Upload },
                    { id: 'export', label: 'Data Export', icon: Download },
                    { id: 'system', label: 'General Config', icon: Shield },
                    { id: 'trash', label: 'Recovery Center', icon: Trash2 },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-300
                            ${activeTab === tab.id 
                                ? 'bg-slate-900 text-white shadow-xl scale-105' 
                                : 'text-gray-400 hover:text-gray-700 hover:bg-white/50'}
                        `}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Import Data Tab */}
                {activeTab === 'import' && (
                    <div className="space-y-8 animate-slide-up">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card variant="premium" className="lg:col-span-1 p-8">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Step 1: Select Type</h4>
                                <div className="space-y-3">
                                    {dataTypes.map(dt => (
                                        <button
                                            key={dt.id}
                                            className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all border-2 text-left
                                                ${selectedDataType === dt.id 
                                                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-md' 
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}
                                            `}
                                            onClick={() => { setSelectedDataType(dt.id); setImportData([]); setShowPreview(false) }}
                                        >
                                            <div className={`p-3 rounded-xl ${selectedDataType === dt.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                                <dt.icon size={20} />
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-wider">{dt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </Card>

                            <Card variant="premium" className="lg:col-span-2 p-8">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Step 2: Upload Source</h4>
                                
                                {uploadError && (
                                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-center gap-3 text-red-700 font-bold text-sm">
                                        <AlertCircle size={20} /> {uploadError}
                                    </div>
                                )}

                                <div
                                    className={`relative border-4 border-dashed rounded-[2.5rem] p-12 transition-all group flex flex-col items-center justify-center gap-6 cursor-pointer
                                        ${uploadingFile ? 'bg-gray-50 border-gray-200' : 'bg-slate-50 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30'}
                                    `}
                                    onClick={() => !uploadingFile && fileInputRef.current?.click()}
                                >
                                    <div className={`p-8 rounded-[2rem] shadow-2xl transition-transform group-hover:scale-110 duration-500 ${uploadingFile ? 'bg-gray-200 text-gray-400' : 'bg-white text-indigo-600'}`}>
                                        {uploadingFile ? <RefreshCw size={48} className="animate-spin" /> : <Upload size={48} />}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-black text-slate-900 mb-2">
                                            {uploadingFile ? 'Processing...' : 'Drop file Excel di sini'}
                                        </p>
                                        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Atau klik untuk browse dari folder</p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile}
                                        className="hidden"
                                    />
                                </div>

                                <div className="mt-8 p-6 bg-slate-900 rounded-3xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Kolom yang dikenali:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(getColumnMapping(selectedDataType)).map(col => (
                                            <span key={col} className="px-3 py-1.5 bg-white/10 text-white/70 rounded-xl text-[11px] font-mono border border-white/5">
                                                {col}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {showPreview && importData.length > 0 && (
                            <Card variant="premium" className="p-8 animate-slide-up">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Step 3: Preview & Commit</h4>
                                        <h3 className="text-2xl font-black text-gray-900 mt-1">Ready to Sync ({importData.length} records)</h3>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all" onClick={() => { setShowPreview(false); setImportData([]) }}>
                                            Batal
                                        </button>
                                        <button className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3" onClick={handleImport} disabled={importing}>
                                            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                            Commit Changes
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto rounded-[1.5rem] border border-gray-100">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-400">
                                            <tr>
                                                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">No</th>
                                                {getPreviewColumns().map(col => <th key={col} className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">{col}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {importData.slice(0, 5).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-400">#{idx + 1}</td>
                                                    {getPreviewColumns().map(col => <td key={col} className="px-6 py-4 font-bold text-gray-700">{row[col] || '-'}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* Export Data Tab */}
                {activeTab === 'export' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-slide-up">
                        {[
                            { id: 'santri', label: 'Data Santri', icon: Users, color: 'blue' },
                            { id: 'guru', label: 'Data Guru', icon: GraduationCap, color: 'emerald' },
                            { id: 'hafalan', label: 'Data Hafalan', icon: BookOpen, color: 'purple' },
                            { id: 'nilai', label: 'Data Nilai', icon: FileText, color: 'orange' },
                        ].map((item) => (
                            <Card key={item.id} variant="premium" className="p-8 text-center group hover:translate-y-[-8px] transition-all duration-500">
                                <div className={`w-20 h-20 rounded-[2rem] mx-auto mb-6 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xl shadow-gray-100 bg-white`}>
                                    <item.icon size={36} className={`
                                        ${item.color === 'blue' ? 'text-blue-600' : ''}
                                        ${item.color === 'emerald' ? 'text-emerald-600' : ''}
                                        ${item.color === 'purple' ? 'text-purple-600' : ''}
                                        ${item.color === 'orange' ? 'text-orange-600' : ''}
                                    `} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">{item.label}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 opacity-60">Master {item.id} dataset</p>
                                <button 
                                    onClick={() => handleExportData(item.id)}
                                    disabled={exporting}
                                    className="w-full py-4 rounded-[1.5rem] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
                                >
                                    {exporting ? <RefreshCw size={16} className="animate-spin" /> : <FileDown size={18} />}
                                    Download .xlsx
                                </button>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Trash Tab */}
                {activeTab === 'trash' && (
                    <div className="space-y-8 animate-slide-up">
                        <Card variant="premium" className="p-8 overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                                        <Trash2 size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900">Recovery Center</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Item yang dihapus akan tersimpan selama 30 hari</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <select 
                                            value={selectedTrashType}
                                            onChange={(e) => setSelectedTrashType(e.target.value)}
                                            className="pl-6 pr-12 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none transition-all appearance-none font-bold text-sm"
                                        >
                                            {trashTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                    <button 
                                        className="px-6 py-3 rounded-2xl bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-3 border border-red-100"
                                        onClick={openEmptyTrashModal}
                                    >
                                        <Trash2 size={16} /> Clean Old Data
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-[2rem] border border-gray-50">
                                {loadingTrash ? (
                                    <div className="py-20 text-center">
                                        <RefreshCw size={48} className="animate-spin mx-auto text-amber-600 mb-4" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Storage...</p>
                                    </div>
                                ) : trashItems.length === 0 ? (
                                    <div className="py-20 text-center bg-gray-50/50">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-100">
                                            <Trash2 className="text-gray-200" size={32} />
                                        </div>
                                        <p className="text-lg font-black text-gray-900">Trash is Empty</p>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Semua data aman tersimpan</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest">
                                            <tr>
                                                <th className="px-8 py-6">Data Source</th>
                                                <th className="px-8 py-6">Waktu Hapus</th>
                                                <th className="px-8 py-6">Sisa Waktu</th>
                                                <th className="px-8 py-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {trashItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center font-black text-amber-600 group-hover:scale-110 transition-transform">
                                                                {item.table_name[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-gray-900 text-sm">{getItemDisplayName(item)}</div>
                                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter opacity-50">{item.table_name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-sm font-bold text-gray-700">{formatDate(item.deleted_at)}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-500" style={{ width: `${(getDaysUntilAutoDelete(item.deleted_at) / 30) * 100}%` }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                                                {getDaysUntilAutoDelete(item.deleted_at)} Hari
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button 
                                                                className="p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => handleRestoreItem(item)}
                                                                disabled={restoringId === item.id}
                                                            >
                                                                {restoringId === item.id ? <RefreshCw size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                                                            </button>
                                                            <button 
                                                                className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                onClick={() => openDeleteModal(item)}
                                                                disabled={deletingId === item.id}
                                                            >
                                                                {deletingId === item.id ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* System Settings Tab */}
                {activeTab === 'system' && (
                    <div className="max-w-5xl mx-auto space-y-8 animate-slide-up">
                        <Card variant="premium" className="p-10">
                            <div className="flex items-center gap-6 mb-12">
                                <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                                    <School size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900">Lembaga Profile</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Update identitas institusi di seluruh sistem</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Institusi</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold text-gray-900"
                                        placeholder="Nama Lembaga..."
                                        value={systemSettings.school_name}
                                        onChange={(e) => setSystemSettings({...systemSettings, school_name: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tahun Ajaran Aktif</label>
                                    <div className="relative group">
                                        <select 
                                            className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all appearance-none font-bold text-gray-900"
                                            value={systemSettings.school_year}
                                            onChange={(e) => setSystemSettings({...systemSettings, school_year: e.target.value})}
                                        >
                                            <option value="">Pilih Tahun Ajaran</option>
                                            {tahunAjaranList.map(ta => <option key={ta.id} value={ta.nama}>{ta.nama}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                                    <textarea 
                                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold text-gray-900 min-h-[100px]"
                                        placeholder="Alamat Lembaga..."
                                        value={systemSettings.school_address}
                                        onChange={(e) => setSystemSettings({...systemSettings, school_address: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telepon</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold text-gray-900"
                                        placeholder="No Telepon..."
                                        value={systemSettings.school_phone}
                                        onChange={(e) => setSystemSettings({...systemSettings, school_phone: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Resmi</label>
                                    <input 
                                        type="email" 
                                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold text-gray-900"
                                        placeholder="email@lembaga.id..."
                                        value={systemSettings.school_email}
                                        onChange={(e) => setSystemSettings({...systemSettings, school_email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-gray-50 flex justify-end">
                                <button 
                                    className="px-12 py-4 rounded-[1.5rem] bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                >
                                    {savingSettings ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </Card>

                        <div className="bg-indigo-900 rounded-[2.5rem] p-10 flex items-center gap-8 relative overflow-hidden group shadow-2xl">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-white/10"></div>
                            <div className="p-5 bg-white/10 backdrop-blur-2xl rounded-[1.5rem]">
                                <Shield className="text-white" size={32} />
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-xl font-black text-white uppercase tracking-wider">Keamanan Konfigurasi</h4>
                                <p className="text-white/60 text-sm mt-1 font-medium max-w-2xl">
                                    Perubahan pada pengaturan umum akan berdampak pada kop surat, laporan, dan meta-data seluruh aplikasi. Pastikan data yang dimasukkan akurat.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, type: null, item: null })}
                onConfirm={handleConfirmDelete}
                title={deleteModal.type === 'empty' ? 'Hapus Data Lama?' : 'Hapus Permanen?'}
                message={deleteModal.type === 'empty' ? 'Semua data di sampah yang berusia lebih dari 30 hari akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.' : 'Data ini akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.'}
            />
        </div>
    )
}

export default PengaturanPage
