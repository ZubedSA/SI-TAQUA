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
    Clock
} from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import './Pengaturan.css'

const PengaturanPage = () => {
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
        school_year: '2024/2025',
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
                    school_year: data.school_year || '2024/2025',
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
        <div className="pengaturan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Settings size={24} /> Pengaturan Sistem
                    </h1>
                    <p className="page-subtitle">Import data, export, sampah, dan konfigurasi sistem</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="pengaturan-tabs">
                <button
                    className={`pengaturan-tab ${activeTab === 'import' ? 'active' : ''}`}
                    onClick={() => setActiveTab('import')}
                >
                    <Upload size={18} /> Import Data
                </button>

                <button
                    className={`pengaturan-tab ${activeTab === 'export' ? 'active' : ''}`}
                    onClick={() => setActiveTab('export')}
                >
                    <Download size={18} /> Export Data
                </button>

                <button
                    className={`pengaturan-tab ${activeTab === 'trash' ? 'active' : ''}`}
                    onClick={() => setActiveTab('trash')}
                >
                    <Trash2 size={18} /> Sampah
                </button>

                <button
                    className={`pengaturan-tab ${activeTab === 'system' ? 'active' : ''}`}
                    onClick={() => setActiveTab('system')}
                >
                    <Shield size={18} /> Pengaturan Umum
                </button>
            </div>

            {/* Import Data Tab */}
            {activeTab === 'import' && (
                <div className="settings-section">
                    <div className="section-header">
                        <h3><FileSpreadsheet size={20} /> Import Data via Excel/CSV</h3>
                    </div>

                    {importResult.message && (
                        <div className={`alert ${importResult.success > 0 ? 'alert-success' : 'alert-error'} mb-3`}>
                            {importResult.success > 0 ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            {importResult.message}
                        </div>
                    )}

                    {/* Step 1: Select Data Type */}
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

                    {/* Step 2: Upload File */}
                    <div className="import-step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h4>Upload File Excel/CSV</h4>

                            {uploadingFile && (
                                <div className="alert alert-info mb-3">
                                    <RefreshCw size={18} className="spin" />
                                    Memproses file... Mohon tunggu
                                </div>
                            )}

                            {uploadError && (
                                <div className="alert alert-error mb-3">
                                    <AlertCircle size={18} />
                                    {uploadError}
                                </div>
                            )}

                            <div
                                className="upload-area"
                                onClick={() => !uploadingFile && fileInputRef.current?.click()}
                            >
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

                    {/* Step 3: Preview */}
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

            {/* Export Data Tab */}
            {activeTab === 'export' && (
                <div className="settings-section">
                    <div className="section-header">
                        <h3><Download size={20} /> Export Data ke Excel</h3>
                    </div>

                    <div className="export-grid">
                        <div className="export-card" onClick={() => handleExportData('santri')}>
                            <Users size={32} />
                            <h4>Export Data Santri</h4>
                            <p>Download seluruh data santri dalam format Excel</p>
                            <button className="btn btn-primary" disabled={exporting}>
                                <FileDown size={16} /> Download
                            </button>
                        </div>

                        <div className="export-card" onClick={() => handleExportData('guru')}>
                            <GraduationCap size={32} />
                            <h4>Export Data Guru</h4>
                            <p>Download seluruh data guru dalam format Excel</p>
                            <button className="btn btn-primary" disabled={exporting}>
                                <FileDown size={16} /> Download
                            </button>
                        </div>

                        <div className="export-card" onClick={() => handleExportData('hafalan')}>
                            <BookOpen size={32} />
                            <h4>Export Data Hafalan</h4>
                            <p>Download seluruh data hafalan dalam format Excel</p>
                            <button className="btn btn-primary" disabled={exporting}>
                                <FileDown size={16} /> Download
                            </button>
                        </div>

                        <div className="export-card" onClick={() => handleExportData('nilai')}>
                            <FileText size={32} />
                            <h4>Export Data Nilai</h4>
                            <p>Download seluruh data nilai dalam format Excel</p>
                            <button className="btn btn-primary" disabled={exporting}>
                                <FileDown size={16} /> Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trash Tab */}
            {activeTab === 'trash' && (
                <div className="settings-section">
                    <div className="section-header">
                        <h3><Trash2 size={20} /> Sampah - Data yang Dihapus</h3>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={fetchTrashItems} disabled={loadingTrash}>
                                <RefreshCw size={16} className={loadingTrash ? 'spin' : ''} /> Refresh
                            </button>
                            <button className="btn btn-danger" onClick={openEmptyTrashModal} disabled={loadingTrash || trashItems.length === 0}>
                                <X size={16} /> Hapus Data Lama
                            </button>
                        </div>
                    </div>

                    <div className="trash-info-box">
                        <p>
                            <Clock size={16} />
                            Data yang dihapus akan tersimpan di sini selama <strong>30 hari</strong> sebelum dihapus permanen secara otomatis.
                            Anda dapat memulihkan atau menghapus permanen data kapan saja.
                        </p>
                    </div>

                    {/* Filter by type */}
                    <div className="trash-filter">
                        <span>Filter:</span>
                        {trashTypes.map(type => (
                            <button
                                key={type.id}
                                className={`filter-btn ${selectedTrashType === type.id ? 'active' : ''}`}
                                onClick={() => setSelectedTrashType(type.id)}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nama/ID</th>
                                    <th>Tabel</th>
                                    <th>Dihapus</th>
                                    <th>Sisa Waktu</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingTrash ? (
                                    <tr><td colSpan="5" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                ) : trashItems.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center">
                                        <div className="empty-trash">
                                            <Trash2 size={40} />
                                            <p>Sampah kosong</p>
                                        </div>
                                    </td></tr>
                                ) : (
                                    trashItems.map((item) => {
                                        const daysLeft = getDaysUntilAutoDelete(item.deleted_at)
                                        return (
                                            <tr key={item.id}>
                                                <td><strong>{getItemDisplayName(item)}</strong></td>
                                                <td><span className="badge badge-secondary">{item.table_name}</span></td>
                                                <td>{formatDate(item.deleted_at)}</td>
                                                <td>
                                                    <span className={`badge ${daysLeft <= 7 ? 'badge-danger' : 'badge-warning'}`}>
                                                        {daysLeft} hari
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleRestoreItem(item)}
                                                            disabled={restoringId === item.id}
                                                            title="Pulihkan"
                                                        >
                                                            {restoringId === item.id ? <RefreshCw size={14} className="spin" /> : <RotateCcw size={14} />}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => openDeleteModal(item)}
                                                            disabled={deletingId === item.id}
                                                            title="Hapus Permanen"
                                                        >
                                                            {deletingId === item.id ? <RefreshCw size={14} className="spin" /> : <X size={14} />}
                                                        </button>
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

            {/* System Settings Tab */}
            {activeTab === 'system' && (
                <div className="settings-section">
                    <div className="section-header">
                        <h3><Shield size={20} /> Pengaturan Umum Sistem</h3>
                    </div>

                    <div className="settings-form">
                        <div className="settings-card">
                            <h4><School size={18} /> Identitas Sekolah</h4>

                            <div className="form-group">
                                <label className="form-label">Nama Lembaga</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={systemSettings.school_name}
                                    onChange={(e) => setSystemSettings({ ...systemSettings, school_name: e.target.value })}
                                    placeholder="PTQ Al-Usymuni Batuan"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Alamat</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={systemSettings.school_address}
                                    onChange={(e) => setSystemSettings({ ...systemSettings, school_address: e.target.value })}
                                    placeholder="Alamat lengkap"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">No. Telepon</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={systemSettings.school_phone}
                                        onChange={(e) => setSystemSettings({ ...systemSettings, school_phone: e.target.value })}
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={systemSettings.school_email}
                                        onChange={(e) => setSystemSettings({ ...systemSettings, school_email: e.target.value })}
                                        placeholder="email@sekolah.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="settings-card">
                            <h4><Calendar size={18} /> Tahun Ajaran</h4>

                            <div className="form-group">
                                <label className="form-label">Tahun Ajaran Aktif</label>
                                <select
                                    className="form-control"
                                    value={systemSettings.school_year}
                                    onChange={(e) => setSystemSettings({ ...systemSettings, school_year: e.target.value })}
                                >
                                    <option value="2023/2024">2023/2024</option>
                                    <option value="2024/2025">2024/2025</option>
                                    <option value="2025/2026">2025/2026</option>
                                </select>
                            </div>
                        </div>

                        <div className="settings-card info-card">
                            <h4><Shield size={18} /> Keamanan</h4>
                            <p>Untuk keamanan sistem, berikut beberapa rekomendasi:</p>
                            <ul>
                                <li>✅ Gunakan password yang kuat minimal 8 karakter</li>
                                <li>✅ Batasi akses admin hanya untuk user yang diperlukan</li>
                                <li>✅ Backup data secara rutin via Export Data</li>
                                <li>✅ Jangan bagikan kredensial login</li>
                                <li>✅ Data yang dihapus tersimpan 30 hari di Sampah</li>
                            </ul>
                        </div>

                        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={savingSettings}>
                            {savingSettings ? <RefreshCw size={16} className="spin" /> : <Save size={16} />} Simpan Pengaturan
                        </button>
                    </div>
                </div>
            )}

            )
}

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleConfirmDelete}
                itemName={deleteModal.type === 'empty' ? 'semua data lama dari sampah' : (deleteModal.item ? `${deleteModal.item.table_name} - ${getItemDisplayName(deleteModal.item)}` : 'data ini')}
                message={deleteModal.type === 'empty' ? 'Anda yakin ingin menghapus semua data lama? Tindakan ini tidak dapat dibatalkan.' : 'Apakah Anda yakin ingin menghapus permanen data ini? Tindakan ini tidak dapat dibatalkan.'}
                title={deleteModal.type === 'empty' ? 'Hapus Semua Data Lama' : 'Hapus Permanen'}
            />
        </div >
    )
}

export default PengaturanPage
