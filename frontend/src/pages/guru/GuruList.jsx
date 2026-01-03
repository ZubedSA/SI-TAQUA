import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, MoreVertical, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logDelete } from '../../lib/auditLog'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import './Guru.css'

const GuruList = () => {
    const { activeRole, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEdit = adminCheck
    const navigate = useNavigate()
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
            showToast.error('Gagal memuat data guru: ' + err.message)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedGuru) return
        try {
            const { error } = await supabase.from('guru').delete().eq('id', selectedGuru.id)
            if (error) throw error
            await logDelete('guru', selectedGuru.nama, `Hapus data guru: ${selectedGuru.nama} (${selectedGuru.nip})`)

            setGuru(guru.filter(g => g.id !== selectedGuru.id))
            setShowDeleteModal(false)
            setSelectedGuru(null)
            showToast.success('Data guru berhasil dihapus')
        } catch (err) {
            console.error('Error deleting guru:', err.message)
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const handleDownloadExcel = () => {
        const columns = ['NIP', 'Nama', 'L/P', 'Jabatan', 'No Telp', 'Status']
        const exportData = filteredGuru.map(g => ({
            NIP: g.nip,
            Nama: g.nama,
            'L/P': g.jenis_kelamin,
            Jabatan: g.jabatan,
            'No Telp': g.no_telp || '-',
            Status: g.status
        }))
        exportToExcel(exportData, columns, 'data_guru')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['NIP', 'Nama', 'L/P', 'Jabatan', 'No Telp', 'Status']
        const exportData = filteredGuru.map(g => ({
            NIP: g.nip,
            Nama: g.nama,
            'L/P': g.jenis_kelamin,
            Jabatan: g.jabatan,
            'No Telp': g.no_telp || '-',
            Status: g.status
        }))
        exportToCSV(exportData, columns, 'data_guru')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Data Guru',
            columns: ['NIP', 'Nama', 'L/P', 'Jabatan', 'No Telp', 'Status'],
            data: filteredGuru.map(g => [
                g.nip,
                g.nama,
                g.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
                g.jabatan,
                g.no_telp || '-',
                g.status
            ]),
            filename: 'data_guru'
        })
        showToast.success('PDF berhasil didownload')
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
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canEdit && (
                        <Link to="/guru/create" className="btn btn-primary">
                            <Plus size={18} />
                            Tambah Guru
                        </Link>
                    )}
                </div>
            </div>

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
                                <tr><td colSpan={canEdit ? 7 : 6}><Spinner className="py-8" label="Memuat data guru..." /></td></tr>
                            ) : filteredGuru.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 7 : 6}>
                                        <EmptyState
                                            icon={UserX}
                                            title="Belum ada data guru"
                                            message={searchTerm ? `Tidak ditemukan data untuk pencarian "${searchTerm}"` : "Belum ada guru yang terdaftar."}
                                            actionLabel={canEdit && !searchTerm ? "Tambah Guru Baru" : null}
                                            onAction={canEdit && !searchTerm ? () => navigate('/guru/create') : null}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredGuru.map((item, i) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/guru/${item.id}`)}
                                        style={{ cursor: 'pointer' }}
                                        className="hover:bg-gray-50"
                                    >
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
                                                        onClick={(e) => {
                                                            e.stopPropagation()
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
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                itemName={selectedGuru?.nama}
            />
        </div>
    )
}

export default GuruList
