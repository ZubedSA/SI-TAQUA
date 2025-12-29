import { useState, useEffect, useRef } from 'react'
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
import './Santri.css'

const SantriList = () => {
    const { activeRole, userProfile, isAdmin, isGuru, isBendahara, hasRole } = useAuth()
    const { showToast } = useToast()

    // Multiple checks to ensure role is correctly detected
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || userProfile?.activeRole === 'admin' || hasRole('admin')

    // Admin dan Bendahara bisa CRUD santri, Guru hanya read-only
    const canEditSantri = adminCheck
    const navigate = useNavigate()

    const [santri, setSantri] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('nama-asc')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [importData, setImportData] = useState([])
    const [importing, setImporting] = useState(false)
    const [importSuccess, setImportSuccess] = useState('')
    const [detectedHeaders, setDetectedHeaders] = useState([]) // New: Store headers

    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchSantri()
    }, [])

    const fetchSantri = async () => {
        setLoading(true)
        try {
            // Fetch santri without angkatan JOIN (to avoid schema cache issue)
            const { data, error } = await supabase
                .from('santri')
                .select(`
                    *,
                    kelas:kelas_id(nama),
                    halaqoh:halaqoh_id(nama)
                `)
                .order('nama')

            if (error) throw error

            // Fetch angkatan data separately
            const { data: angkatanList } = await supabase
                .from('angkatan')
                .select('id, nama')

            const angkatanMap = {}
            if (angkatanList) {
                angkatanList.forEach(a => { angkatanMap[a.id] = a.nama })
            }

            setSantri(data.map(s => ({
                ...s,
                kelas: s.kelas?.nama || '-',
                halaqoh: s.halaqoh?.nama || '-',
                angkatan: angkatanMap[s.angkatan_id] || '-'
            })))
        } catch (err) {
            console.error('Error fetching santri:', err.message)
            showToast.error('Gagal memuat data santri: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

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

            setSantri(santri.filter(s => s.id !== selectedSantri.id))
            setShowDeleteModal(false)
            setSelectedSantri(null)
            showToast.success('Data santri berhasil dihapus')
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
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
        <div className="santri-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Data Santri</h1>
                    <p className="page-subtitle">Kelola data santri pondok pesantren</p>
                </div>
                <div className="header-actions">
                    {canEditSantri && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx,.xls,.csv"
                                style={{ display: 'none' }}
                            />
                            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={18} /> Import Excel/CSV
                            </button>
                            <Link to="/santri/create" className="btn btn-primary">
                                <Plus size={18} /> Tambah Santri
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Daftar Santri ({filteredSantri.length})</h3>
                    <div className="table-controls">
                        <div className="table-search">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Cari santri..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="sort-select">
                            <label>Urutkan:</label>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="nama-asc">Nama A-Z</option>
                                <option value="nama-desc">Nama Z-A</option>
                                <option value="nis-asc">NIS Terkecil</option>
                                <option value="nis-desc">NIS Terbesar</option>
                                <option value="kelas-asc">Kelas A-Z</option>
                                <option value="kelas-desc">Kelas Z-A</option>
                                <option value="status-asc">Status A-Z</option>
                                <option value="status-desc">Status Z-A</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>NIS</th>
                                <th>Nama</th>
                                <th>Jenis Kelamin</th>
                                <th>Angkatan</th>
                                <th>Kelas</th>
                                <th>Halaqoh</th>
                                <th>Status</th>
                                {canEditSantri && <th>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={canEditSantri ? 8 : 7}><Spinner className="py-8" label="Memuat data santri..." /></td></tr>
                            ) : filteredSantri.length === 0 ? (
                                <tr>
                                    <td colSpan={canEditSantri ? 8 : 7}>
                                        <EmptyState
                                            icon={UserX}
                                            title="Belum ada data santri"
                                            message={searchTerm ? `Tidak ditemukan data untuk pencarian "${searchTerm}"` : "Belum ada santri yang terdaftar."}
                                            actionLabel={canEditSantri && !searchTerm ? "Tambah Santri Data" : null}
                                            onAction={canEditSantri && !searchTerm ? () => navigate('/santri/create') : null}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredSantri.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/santri/${item.id}`)}
                                        style={{ cursor: 'pointer' }}
                                        className="hover:bg-gray-50"
                                    >
                                        <td>{item.nis}</td>
                                        <td className="name-cell">{item.nama}</td>
                                        <td>{item.jenis_kelamin}</td>
                                        <td>
                                            {item.angkatan}
                                            {item.raw_angkatan_id && (
                                                <div style={{ fontSize: '10px', color: '#888' }}>
                                                    ID: {item.raw_angkatan_id.substring(0, 6)}...
                                                </div>
                                            )}
                                        </td>
                                        <td>{item.kelas}</td>
                                        <td>{item.halaqoh}</td>
                                        <td><span className={`badge ${item.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td>
                                        {canEditSantri && (
                                            <td>
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <Eye size={16} />, label: 'Detail', path: `/santri/${item.id}` },
                                                        { icon: <Edit size={16} />, label: 'Edit', path: `/santri/${item.id}/edit` },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedSantri(item); setShowDeleteModal(true) }, danger: true }
                                                    ]}
                                                >
                                                    <Link
                                                        to={`/santri/${item.id}`}
                                                        className="btn-icon"
                                                        title="Lihat Detail"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#dbeafe',
                                                            color: '#2563eb',
                                                            marginRight: '4px',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        <Eye size={16} />
                                                    </Link>
                                                    <Link
                                                        to={`/santri/${item.id}/edit`}
                                                        className="btn-icon"
                                                        title="Edit"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#fef3c7',
                                                            color: '#d97706',
                                                            marginRight: '4px',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        className="btn-icon btn-icon-danger"
                                                        title="Hapus"
                                                        onClick={() => { setSelectedSantri(item); setShowDeleteModal(true) }}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </MobileActionMenu>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer">
                    <p className="table-info">Menampilkan {filteredSantri.length} dari {santri.length} santri</p>
                    <button className="btn btn-sm btn-secondary" onClick={fetchSantri}><RefreshCw size={14} /> Refresh</button>
                </div>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title"><FileSpreadsheet size={20} /> Preview Import Data</h3>
                            <button className="modal-close" onClick={() => { setShowImportModal(false); setImportData([]) }}>×</button>
                        </div>
                        <div className="modal-body">
                            {importSuccess ? (
                                <div className="alert alert-success" style={{ whiteSpace: 'pre-line' }}>{importSuccess}</div>
                            ) : (
                                <>
                                    <div className="text-xs text-muted mb-2 p-2 bg-gray-100 rounded">
                                        <strong>Kolom Terbaca:</strong> {detectedHeaders.join(', ')}
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-3 mb-3">
                                        <span className="badge badge-success">
                                            ✓ Valid: {importData.filter(d => d.isValid).length}
                                        </span>
                                        <span className="badge badge-danger" style={{ backgroundColor: importData.some(d => !d.isValid) ? '#dc3545' : '#6c757d' }}>
                                            ✗ Error: {importData.filter(d => !d.isValid).length}
                                        </span>
                                    </div>

                                    {/* Preview Table */}
                                    <div style={{ maxHeight: '280px', overflow: 'auto', border: '1px solid #ddd' }}>
                                        <table className="table table-sm" style={{ fontSize: '12px' }}>
                                            <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa' }}>
                                                <tr>
                                                    <th style={{ width: '40px' }}>#</th>
                                                    <th>NIS</th>
                                                    <th>Nama</th>
                                                    <th>No HP</th>
                                                    <th>Angkatan</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importData.map((row, i) => (
                                                    <tr
                                                        key={i}
                                                        style={{
                                                            backgroundColor: row.isValid ? 'transparent' : '#ffe6e6',
                                                            color: row.isValid ? 'inherit' : '#721c24'
                                                        }}
                                                    >
                                                        <td>{row.rowNum}</td>
                                                        <td>{row.nis || <span style={{ color: 'red' }}>-</span>}</td>
                                                        <td>{row.nama || <span style={{ color: 'red' }}>-</span>}</td>
                                                        <td style={{ color: row.no_telp_wali ? 'green' : 'orange' }}>
                                                            {row.no_telp_wali || <span style={{ fontStyle: 'italic' }}>kosong</span>}
                                                        </td>
                                                        <td>{row.nama_angkatan || <span style={{ color: 'red' }}>-</span>}</td>
                                                        <td>
                                                            {row.isValid ? (
                                                                <span style={{ color: 'green' }}>✓ OK</span>
                                                            ) : (
                                                                <span style={{ color: 'red', fontSize: '11px' }}>
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
                                        <div className="alert alert-warning mt-3" style={{ fontSize: '13px' }}>
                                            ⚠️ Baris dengan error akan <strong>dilewati</strong> saat import.
                                            Hanya data valid yang akan disimpan.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportData([]) }}>
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleImport}
                                disabled={importing || importSuccess || !importData.some(d => d.isValid)}
                            >
                                {importing ? (
                                    <><RefreshCw size={16} className="spin" /> Importing...</>
                                ) : (
                                    `Import ${importData.filter(d => d.isValid).length} Data Valid`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Konfirmasi Hapus</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Apakah Anda yakin ingin menghapus santri <strong>{selectedSantri?.nama}</strong>?</p>
                            <p className="text-muted mt-2">Tindakan ini tidak dapat dibatalkan.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Batal</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default SantriList
