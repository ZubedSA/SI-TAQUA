import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, MoreVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import './Guru.css'

const GuruList = () => {
    const [guru, setGuru] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedGuru, setSelectedGuru] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchGuru()
    }, [])

    const fetchGuru = async () => {
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
        if (!selectedGuru) return

        try {
            const { error } = await supabase
                .from('guru')
                .delete()
                .eq('id', selectedGuru.id)

            if (error) throw error

            setGuru(guru.filter(g => g.id !== selectedGuru.id))
            setShowDeleteModal(false)
            setSelectedGuru(null)
        } catch (err) {
            console.error('Error deleting guru:', err.message)
            alert('Gagal menghapus: ' + err.message)
        }
    }

    const filteredGuru = guru.filter(g =>
        g.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.nip?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="guru-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Data Guru</h1>
                    <p className="page-subtitle">Kelola data pengajar dan wali kelas</p>
                </div>
                <Link to="/guru/create" className="btn btn-primary">
                    <Plus size={18} />
                    Tambah Guru
                </Link>
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
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center">
                                        <RefreshCw size={20} className="spin" /> Loading...
                                    </td>
                                </tr>
                            ) : filteredGuru.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center">Tidak ada data guru</td>
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
                                        <td>
                                            <MobileActionMenu
                                                actions={[
                                                    { icon: <Eye size={16} />, label: 'Detail', path: `/guru/${item.id}` },
                                                    { icon: <Edit size={16} />, label: 'Edit', path: `/guru/${item.id}/edit` },
                                                    { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedGuru(item); setShowDeleteModal(true) }, danger: true }
                                                ]}
                                            >
                                                <Link to={`/guru/${item.id}`} className="btn-icon" title="Lihat Detail">
                                                    <Eye size={16} />
                                                </Link>
                                                <Link to={`/guru/${item.id}/edit`} className="btn-icon" title="Edit">
                                                    <Edit size={16} />
                                                </Link>
                                                <button
                                                    className="btn-icon btn-icon-danger"
                                                    title="Hapus"
                                                    onClick={() => {
                                                        setSelectedGuru(item)
                                                        setShowDeleteModal(true)
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </MobileActionMenu>
                                        </td>
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
