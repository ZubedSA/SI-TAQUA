import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, Upload, FileSpreadsheet, X, MoreVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import * as XLSX from 'xlsx'
import './Santri.css'

const SantriList = () => {
    const [santri, setSantri] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('nama-asc')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [error, setError] = useState(null)
    const [importData, setImportData] = useState([])
    const [importing, setImporting] = useState(false)
    const [importSuccess, setImportSuccess] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchSantri()
    }, [])

    const fetchSantri = async () => {
        setLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select(`*, kelas:kelas_id(nama), halaqoh:halaqoh_id(nama)`)
                .order('nama')

            if (error) throw error

            setSantri(data.map(s => ({
                ...s,
                kelas: s.kelas?.nama || '-',
                halaqoh: s.halaqoh?.nama || '-'
            })))
        } catch (err) {
            console.error('Error fetching santri:', err.message)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

                // Auto-mapping: cari kolom yang mirip
                const mappedData = data.map(row => {
                    const mapped = {}
                    Object.keys(row).forEach(key => {
                        const lowerKey = key.toLowerCase().trim()
                        if (lowerKey.includes('nis') || lowerKey.includes('nisn')) {
                            mapped.nis = String(row[key])
                        } else if (lowerKey.includes('nama') || lowerKey.includes('name')) {
                            mapped.nama = row[key]
                        } else if (lowerKey.includes('jenis') || lowerKey.includes('kelamin') || lowerKey.includes('gender') || lowerKey === 'l/p' || lowerKey === 'jk') {
                            const val = String(row[key]).toLowerCase()
                            mapped.jenis_kelamin = val.includes('l') || val.includes('laki') ? 'Laki-laki' : 'Perempuan'
                        } else if (lowerKey.includes('tempat') && lowerKey.includes('lahir')) {
                            mapped.tempat_lahir = row[key]
                        } else if (lowerKey.includes('tanggal') && lowerKey.includes('lahir') || lowerKey === 'ttl') {
                            mapped.tanggal_lahir = row[key]
                        } else if (lowerKey.includes('alamat') || lowerKey.includes('address')) {
                            mapped.alamat = row[key]
                        } else if (lowerKey.includes('wali') || lowerKey.includes('ortu') || lowerKey.includes('parent')) {
                            mapped.nama_wali = row[key]
                        } else if (lowerKey.includes('telp') || lowerKey.includes('hp') || lowerKey.includes('phone')) {
                            mapped.no_telp_wali = String(row[key])
                        }
                    })
                    // Default values
                    mapped.status = 'Aktif'
                    return mapped
                }).filter(row => row.nama) // Hanya ambil yang punya nama

                setImportData(mappedData)
                setShowImportModal(true)
            } catch (err) {
                alert('Gagal membaca file: ' + err.message)
            }
        }
        reader.readAsBinaryString(file)
        e.target.value = '' // Reset input
    }

    const handleImport = async () => {
        if (importData.length === 0) return
        setImporting(true)
        try {
            const { error } = await supabase.from('santri').insert(importData)
            if (error) throw error

            setImportSuccess(`${importData.length} data santri berhasil diimport!`)
            setImportData([])
            fetchSantri()
            setTimeout(() => {
                setShowImportModal(false)
                setImportSuccess('')
            }, 2000)
        } catch (err) {
            alert('Gagal import: ' + err.message)
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
        } catch (err) {
            alert('Gagal menghapus: ' + err.message)
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
                </div>
            </div>

            {error && (
                <div className="alert alert-error mb-3">
                    Error: {error}
                    <button className="btn btn-sm btn-secondary ml-2" onClick={fetchSantri}>
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            )}

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
                                <th>Kelas</th>
                                <th>Halaqoh</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                            ) : filteredSantri.length === 0 ? (
                                <tr><td colSpan="7" className="text-center">{error ? 'Gagal memuat data' : 'Tidak ada data santri'}</td></tr>
                            ) : (
                                filteredSantri.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.nis}</td>
                                        <td className="name-cell">{item.nama}</td>
                                        <td>{item.jenis_kelamin}</td>
                                        <td>{item.kelas}</td>
                                        <td>{item.halaqoh}</td>
                                        <td><span className={`badge ${item.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span></td>
                                        <td>
                                            <MobileActionMenu
                                                actions={[
                                                    { icon: <Eye size={16} />, label: 'Detail', path: `/santri/${item.id}` },
                                                    { icon: <Edit size={16} />, label: 'Edit', path: `/santri/${item.id}/edit` },
                                                    { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedSantri(item); setShowDeleteModal(true) }, danger: true }
                                                ]}
                                            >
                                                <Link to={`/santri/${item.id}`} className="btn-icon" title="Lihat Detail"><Eye size={16} /></Link>
                                                <Link to={`/santri/${item.id}/edit`} className="btn-icon" title="Edit"><Edit size={16} /></Link>
                                                <button className="btn-icon btn-icon-danger" title="Hapus" onClick={() => { setSelectedSantri(item); setShowDeleteModal(true) }}><Trash2 size={16} /></button>
                                            </MobileActionMenu>
                                        </td>
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
                                <div className="alert alert-success">{importSuccess}</div>
                            ) : (
                                <>
                                    <p className="mb-3">Ditemukan <strong>{importData.length}</strong> data. Preview:</p>
                                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                        <table className="table">
                                            <thead>
                                                <tr><th>NIS</th><th>Nama</th><th>L/P</th><th>Alamat</th></tr>
                                            </thead>
                                            <tbody>
                                                {importData.slice(0, 10).map((row, i) => (
                                                    <tr key={i}>
                                                        <td>{row.nis || '-'}</td>
                                                        <td>{row.nama}</td>
                                                        <td>{row.jenis_kelamin || '-'}</td>
                                                        <td>{row.alamat || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {importData.length > 10 && <p className="text-muted mt-2">...dan {importData.length - 10} data lainnya</p>}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportData([]) }}>Batal</button>
                            <button className="btn btn-primary" onClick={handleImport} disabled={importing || importSuccess}>
                                {importing ? <><RefreshCw size={16} className="spin" /> Importing...</> : 'Import Semua'}
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
