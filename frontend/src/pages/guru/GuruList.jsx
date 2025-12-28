import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, MoreVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logDelete } from '../../lib/auditLog'
import { useAuth } from '../../context/AuthContext'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import './Guru.css'

const GuruList = () => {
    const { activeRole, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEdit = adminCheck
    const [guru, setGuru] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('nama-asc')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedGuru, setSelectedGuru] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchGuru()
    }, [])

    const fetchGuru = async () => {
        // ... (existing fetch logic)
        setLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase
                .from('guru')
                .select('*')
                .order('nama')

            if (error) throw error
            setGuru(data || [])
        } catch (err) {
            console.error('Error fetching guru:', err.message)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        // ... (existing delete logic)
        if (!selectedGuru) return

        try {
            const { error } = await supabase
                .from('guru')
                .delete()
                .eq('id', selectedGuru.id)

            if (error) throw error
            await logDelete('guru', selectedGuru.nama, `Hapus data guru: ${selectedGuru.nama} (${selectedGuru.nip})`)

            setGuru(guru.filter(g => g.id !== selectedGuru.id))
            setShowDeleteModal(false)
            setSelectedGuru(null)
        } catch (err) {
            console.error('Error deleting guru:', err.message)
            alert('Gagal menghapus: ' + err.message)
        }
    }

    const filteredGuru = guru
        .filter(g =>
            g.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.nip?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'nama-asc': return (a.nama || '').localeCompare(b.nama || '')
                case 'nama-desc': return (b.nama || '').localeCompare(a.nama || '')
                case 'nip-asc': return (a.nip || '').localeCompare(b.nip || '')
                case 'nip-desc': return (b.nip || '').localeCompare(a.nip || '')
                case 'jabatan-asc': return (a.jabatan || '').localeCompare(b.jabatan || '')
                case 'status-asc': return (a.status || '').localeCompare(b.status || '')
                default: return 0
            }
        })

    return (
        <div className="guru-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Data Guru</h1>
                    <p className="page-subtitle">Kelola data pengajar dan wali kelas</p>
                </div>
                {canEdit && (
                    <Link to="/guru/create" className="btn btn-primary">
                        <Plus size={18} />
                        Tambah Guru
                    </Link>
                )}
            </div>

            {error && (
                <div className="alert alert-error mb-3">
                    Error: {error}
                    <button className="btn btn-sm btn-secondary ml-2" onClick={fetchGuru}>
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            )}

            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Daftar Guru ({filteredGuru.length})</h3>
                    <div className="table-controls">
                        <div className="table-search">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Cari guru..."
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
                                <option value="nip-asc">NIP Terkecil</option>
                                <option value="nip-desc">NIP Terbesar</option>
                                <option value="jabatan-asc">Jabatan A-Z</option>
                                <option value="status-asc">Status A-Z</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>NIP</th>
                                <th>Nama</th>
                                <th>Jenis Kelamin</th>
                                <th>Jabatan</th>
                                <th>No. Telepon</th>
                                <th>Status</th>
                                {canEdit && <th>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canEdit ? 7 : 6} className="text-center">
                                        <RefreshCw size={20} className="spin" /> Loading...
                                    </td>
                                </tr>
                            ) : filteredGuru.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 7 : 6} className="text-center">Tidak ada data guru</td>
                                </tr>
                            ) : (
                                filteredGuru.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.nip}</td>
                                        <td className="name-cell">{item.nama}</td>
                                        <td>{item.jenis_kelamin}</td>
                                        <td>
                                            <span className={`badge ${item.jabatan === 'Wali Kelas' ? 'badge-info' : 'badge-success'}`}>
                                                {item.jabatan}
                                            </span>
                                        </td>
                                        <td>{item.no_telp || '-'}</td>
                                        <td>
                                            <span className={`badge ${item.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td>
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <Eye size={16} />, label: 'Detail', path: `/guru/${item.id}` },
                                                        { icon: <Edit size={16} />, label: 'Edit', path: `/guru/${item.id}/edit` },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedGuru(item); setShowDeleteModal(true) }, danger: true }
                                                    ]}
                                                >
                                                    <Link
                                                        to={`/guru/${item.id}`}
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
                                                        to={`/guru/${item.id}/edit`}
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
                                                        onClick={() => {
                                                            setSelectedGuru(item)
                                                            setShowDeleteModal(true)
                                                        }}
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
                    <p className="table-info">Menampilkan {filteredGuru.length} dari {guru.length} guru</p>
                    <button className="btn btn-sm btn-secondary" onClick={fetchGuru}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Konfirmasi Hapus</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Apakah Anda yakin ingin menghapus guru <strong>{selectedGuru?.nama}</strong>?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                Batal
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GuruList
