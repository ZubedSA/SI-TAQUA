import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, Upload, FileSpreadsheet, X, MoreVertical, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import * as XLSX from 'xlsx'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
// useSantri removed
import { useSantriList } from '../../hooks/features/useSantriList'
import PageHeader from '../../components/layout/PageHeader'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'

const SantriList = () => {
    const { activeRole, userProfile, isAdmin, isGuru, isBendahara, hasRole } = useAuth()
    const showToast = useToast()
    const navigate = useNavigate()
    const fileInputRef = useRef(null)

    // State definitions
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('nama-asc')

    // Import state
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState([])
    const [importing, setImporting] = useState(false)
    const [importSuccess, setImportSuccess] = useState('')
    const [detectedHeaders, setDetectedHeaders] = useState([])

    // Delete state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedSantri, setSelectedSantri] = useState(null)

    // Performance: Use Cached Hook
    const { data: rawSantri = [], isLoading: loading, error, refetch } = useSantriList()

    // Client-side Sorting (Efficient for < 1000 rows)
    const santri = useMemo(() => {
        let sorted = [...rawSantri]
        if (sortBy === 'nama-asc') sorted.sort((a, b) => a.nama.localeCompare(b.nama))
        else if (sortBy === 'nama-desc') sorted.sort((a, b) => b.nama.localeCompare(a.nama))
        else if (sortBy === 'nis-asc') sorted.sort((a, b) => a.nis.localeCompare(b.nis))
        return sorted
    }, [rawSantri, sortBy])

    const adminCheck = isAdmin() || userProfile?.role === 'admin' || userProfile?.activeRole === 'admin' || hasRole('admin')
    const canEditSantri = adminCheck

    // Error Handling
    useEffect(() => {
        if (error) {
            console.error('Error loading santri:', error)
            showToast.error('Gagal memuat data santri: ' + error.message)
        }
    }, [error])

    const fetchSantri = () => refetch()

    // Manual fetch removed in favor of useSantri hook

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Validate file type
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            showToast.error('File harus berformat .xlsx atau .xls')
            return
        }

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

                if (data.length > 0) {
                    setDetectedHeaders(Object.keys(data[0]))
                }

                // Parse and validate each row
                const mappedData = data.map((row, index) => {
                    const mapped = { rowNum: index + 2, errors: [] } // rowNum for Excel row (header = 1)

                    // Map columns (flexible naming)
                    Object.keys(row).forEach(key => {
                        const lowerKey = key.toLowerCase().trim()
                        if (lowerKey.includes('nis') || lowerKey.includes('nisn') || lowerKey === 'no_induk') {
                            mapped.nis = String(row[key]).trim()
                        } else if (lowerKey === 'nama' || lowerKey.includes('nama_santri') || lowerKey === 'name') {
                            mapped.nama = String(row[key]).trim()
                        } else if (lowerKey.includes('jenis') || lowerKey.includes('kelamin') || lowerKey === 'l/p' || lowerKey === 'jk') {
                            const val = String(row[key]).toLowerCase()
                            mapped.jenis_kelamin = val.includes('l') || val.includes('laki') ? 'Laki-laki' : 'Perempuan'
                        } else if (lowerKey === 'kelas' || lowerKey.includes('class')) {
                            mapped.kelas = String(row[key]).trim()
                        } else if (lowerKey === 'halaqoh' || lowerKey.includes('halaqah')) {
                            mapped.halaqoh = String(row[key]).trim()
                        } else if (lowerKey === 'tahun_masuk' || lowerKey.includes('tahun masuk') || lowerKey === 'year') {
                            const num = parseInt(String(row[key]))
                            mapped.tahun_masuk = !isNaN(num) ? num : null
                        } else if (lowerKey === 'nama_angkatan' || lowerKey.includes('angkatan')) {
                            mapped.nama_angkatan = String(row[key]).trim()
                        } else if (lowerKey.includes('alamat') || lowerKey === 'address') {
                            mapped.alamat = String(row[key]).trim()
                        } else if (lowerKey.includes('wali') || lowerKey.includes('ortu')) {
                            mapped.nama_wali = String(row[key]).trim()
                        } else if (
                            lowerKey.includes('telp') ||
                            lowerKey.includes('hp') ||
                            lowerKey.includes('phone') ||
                            lowerKey.includes('handphone') ||
                            lowerKey.includes('whatsapp') ||
                            lowerKey.includes('wa') ||
                            lowerKey.includes('kontak') ||
                            lowerKey.includes('mobile') ||
                            lowerKey.includes('nomor') ||
                            lowerKey === 'no_hp' ||
                            lowerKey === 'no hp'
                        ) {
                            mapped.no_telp_wali = String(row[key]).trim()
                        }
                    })

                    // VALIDATION
                    if (!mapped.nis) mapped.errors.push('NIS wajib diisi')
                    if (!mapped.nama) mapped.errors.push('Nama wajib diisi')
                    if (!mapped.nama_angkatan) mapped.errors.push('Angkatan wajib diisi')

                    mapped.isValid = mapped.errors.length === 0
                    mapped.status = 'Aktif'

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

            // STEP 3: Prepare Santri Data
            const santriData = validRows.map(d => ({
                nis: d.nis,
                nama: d.nama,
                jenis_kelamin: d.jenis_kelamin || 'Laki-laki',
                alamat: d.alamat || null,
                nama_wali: d.nama_wali || null,
                no_telp: d.no_telp_wali || null,
                no_telp_wali: d.no_telp_wali || null,
                status: 'Aktif',
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
        const columns = ['NIS', 'Nama', 'L/P', 'Angkatan', 'Kelas', 'Halaqoh', 'Status']
        const exportData = filteredSantri.map(s => ({
            NIS: s.nis,
            Nama: s.nama,
            'L/P': s.jenis_kelamin,
            Angkatan: s.angkatan,
            Kelas: s.kelas,
            Halaqoh: s.halaqoh,
            Status: s.status
        }))
        exportToExcel(exportData, columns, 'data_santri')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['NIS', 'Nama', 'L/P', 'Angkatan', 'Kelas', 'Halaqoh', 'Status']
        const exportData = filteredSantri.map(s => ({
            NIS: s.nis,
            Nama: s.nama,
            'L/P': s.jenis_kelamin,
            Angkatan: s.angkatan,
            Kelas: s.kelas,
            Halaqoh: s.halaqoh,
            Status: s.status
        }))
        exportToCSV(exportData, columns, 'data_santri')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Data Santri',
            columns: ['NIS', 'Nama', 'L/P', 'Angkatan', 'Kelas', 'Halaqoh', 'Status'],
            data: filteredSantri.map(s => [
                s.nis,
                s.nama,
                s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
                s.angkatan,
                s.kelas,
                s.halaqoh,
                s.status
            ]),
            filename: 'data_santri'
        })
        showToast.success('PDF berhasil didownload')
    }

    const filteredSantri = santri
        .filter(s =>
            s.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.nis?.toLowerCase().includes(searchTerm.toLowerCase())
        )
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
                <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Daftar Santri ({filteredSantri.length})</h3>
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari santri..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-sm text-gray-500 whitespace-nowrap">Urutkan:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full md:w-auto px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            >
                                <option value="nama-asc">Nama A-Z</option>
                                <option value="nama-desc">Nama Z-A</option>
                                <option value="nis-asc">NIS Terkecil</option>
                                <option value="nis-desc">NIS Terbesar</option>
                                <option value="kelas-asc">Kelas A-Z</option>
                                <option value="kelas-desc">Kelas Z-A</option>
                                <option value="status-asc">Status A-Z</option>
                                <option value="status-desc">Status Z-A</option>
                            </select>
                            <Button variant="secondary" size="icon" onClick={fetchSantri} title="Refresh Data">
                                <RefreshCw size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">NIS</th>
                                <th className="px-6 py-3">Nama</th>
                                <th className="px-6 py-3">Jenis Kelamin</th>
                                <th className="px-6 py-3">Angkatan</th>
                                <th className="px-6 py-3">Kelas</th>
                                <th className="px-6 py-3">Halaqoh</th>
                                <th className="px-6 py-3">Status</th>
                                {canEditSantri && <th className="px-6 py-3 text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={canEditSantri ? 8 : 7}><Spinner className="py-12" label="Memuat data santri..." /></td></tr>
                            ) : filteredSantri.length === 0 ? (
                                <tr>
                                    <td colSpan={canEditSantri ? 8 : 7} className="p-8">
                                        <EmptyState
                                            icon={UserX}
                                            title="Belum ada data santri"
                                            message={searchTerm ? `Tidak ditemukan data untuk pencarian "${searchTerm}"` : "Belum ada santri yang terdaftar."}
                                            actionLabel={canEditSantri && !searchTerm ? "Tambah Santri" : null}
                                            onAction={canEditSantri && !searchTerm ? () => navigate('/santri/create') : null}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredSantri.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/santri/${item.id}`)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-mono text-gray-600">{item.nis}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{item.nama}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.jenis_kelamin}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {item.angkatan}
                                            {item.raw_angkatan_id && (
                                                <div className="text-[10px] text-gray-400">
                                                    ID: {String(item.raw_angkatan_id).substring(0, 6)}...
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{item.kelas}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.halaqoh}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={item.status === 'Aktif' ? 'success' : 'warning'}>
                                                {item.status}
                                            </Badge>
                                        </td>
                                        {canEditSantri && (
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <Eye size={16} />, label: 'Detail', path: `/santri/${item.id}` },
                                                        { icon: <Edit size={16} />, label: 'Edit', path: `/santri/${item.id}/edit` },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedSantri(item); setShowDeleteModal(true) }, danger: true }
                                                    ]}
                                                >
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            to={`/santri/${item.id}`}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Lihat Detail"
                                                        >
                                                            <Eye size={18} />
                                                        </Link>
                                                        <Link
                                                            to={`/santri/${item.id}/edit`}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </Link>
                                                        <button
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus"
                                                            onClick={() => { setSelectedSantri(item); setShowDeleteModal(true) }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </MobileActionMenu>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Menampilkan {filteredSantri.length} dari {santri.length} santri</p>
                </div>
            </div>

            {/* Import Modal - Using Inline styles largely removed for Tailwind classes where possible, but preserving modal logic structure */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
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
                                    <div className="max-h-[280px] overflow-auto border border-gray-200 rounded-lg">
                                        <table className="w-full text-xs text-left">
                                            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 text-gray-600">
                                                <tr>
                                                    <th className="px-3 py-2 w-12">#</th>
                                                    <th className="px-3 py-2">NIS</th>
                                                    <th className="px-3 py-2">Nama</th>
                                                    <th className="px-3 py-2">No HP</th>
                                                    <th className="px-3 py-2">Angkatan</th>
                                                    <th className="px-3 py-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {importData.map((row, i) => (
                                                    <tr
                                                        key={i}
                                                        className={!row.isValid ? 'bg-red-50' : ''}
                                                    >
                                                        <td className="px-3 py-2 text-gray-500">{row.rowNum}</td>
                                                        <td className="px-3 py-2 font-mono">{row.nis || <span className="text-red-500">-</span>}</td>
                                                        <td className="px-3 py-2">{row.nama || <span className="text-red-500">-</span>}</td>
                                                        <td className={`px-3 py-2 ${row.no_telp_wali ? 'text-emerald-600' : 'text-amber-500 italic'}`}>
                                                            {row.no_telp_wali || 'kosong'}
                                                        </td>
                                                        <td className="px-3 py-2">{row.nama_angkatan || <span className="text-red-500">-</span>}</td>
                                                        <td className="px-3 py-2">
                                                            {row.isValid ? (
                                                                <span className="text-emerald-600 font-medium">✓ OK</span>
                                                            ) : (
                                                                <span className="text-red-600">
                                                                    {row.errors.join(', ')}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
