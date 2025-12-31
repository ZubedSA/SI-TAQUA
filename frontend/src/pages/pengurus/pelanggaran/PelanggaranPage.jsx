import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    AlertTriangle,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Users
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import './PelanggaranPage.css'

const PelanggaranPage = () => {
    const { activeRole } = useAuth()
    const navigate = useNavigate()

    const [pelanggaran, setPelanggaran] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterTingkat, setFilterTingkat] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        fetchPelanggaran()
    }, [currentPage, filterStatus, filterTingkat])

    const fetchPelanggaran = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('pelanggaran')
                .select(`
                    *,
                    santri:santri_id (
                        id,
                        nama,
                        nis,
                        kelas:kelas_id (nama)
                    ),
                    pelapor:pelapor_id (nama)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })

            if (filterStatus) {
                query = query.eq('status', filterStatus)
            }
            if (filterTingkat) {
                query = query.eq('tingkat', parseInt(filterTingkat))
            }

            const start = (currentPage - 1) * itemsPerPage
            query = query.range(start, start + itemsPerPage - 1)

            const { data, error, count } = await query

            if (error) throw error

            setPelanggaran(data || [])
            setTotalPages(Math.ceil((count || 0) / itemsPerPage))
        } catch (error) {
            console.error('Error fetching pelanggaran:', error.message)
            setPelanggaran([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (activeRole !== 'admin') {
            alert('Hanya admin yang dapat menghapus pelanggaran')
            return
        }
        if (!confirm('Yakin ingin menghapus pelanggaran ini?')) return

        try {
            const { error } = await supabase
                .from('pelanggaran')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchPelanggaran()
        } catch (error) {
            console.error('Error deleting:', error.message)
            alert('Gagal menghapus: ' + error.message)
        }
    }

    const getTingkatLabel = (tingkat) => {
        const labels = {
            1: { text: 'Ringan', class: 'tingkat-ringan' },
            2: { text: 'Sedang', class: 'tingkat-sedang' },
            3: { text: 'Berat', class: 'tingkat-berat' },
            4: { text: 'Sangat Berat', class: 'tingkat-sangat-berat' }
        }
        return labels[tingkat] || { text: 'Unknown', class: '' }
    }

    const getStatusBadge = (status) => {
        const badges = {
            'OPEN': { icon: AlertCircle, class: 'status-open', text: 'Open' },
            'PROSES': { icon: Clock, class: 'status-proses', text: 'Proses' },
            'SELESAI': { icon: CheckCircle, class: 'status-selesai', text: 'Selesai' }
        }
        const badge = badges[status] || badges['OPEN']
        const Icon = badge.icon
        return (
            <span className={`status-badge ${badge.class}`}>
                <Icon size={14} />
                {badge.text}
            </span>
        )
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const filteredData = pelanggaran.filter(item => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            item.santri?.nama?.toLowerCase().includes(search) ||
            item.santri?.nis?.toLowerCase().includes(search) ||
            item.jenis?.toLowerCase().includes(search)
        )
    })

    return (
        <div className="pelanggaran-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <h1><AlertTriangle size={28} /> Pelanggaran Santri</h1>
                    <p>Kelola data pelanggaran dan tindak lanjut pembinaan santri</p>
                </div>
                <Link to="/pengurus/pelanggaran/create" className="btn-primary">
                    <Plus size={20} />
                    Catat Pelanggaran
                </Link>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama santri, NIS, atau jenis..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value)
                            setCurrentPage(1)
                        }}
                    >
                        <option value="">Semua Status</option>
                        <option value="OPEN">Open</option>
                        <option value="PROSES">Proses</option>
                        <option value="SELESAI">Selesai</option>
                    </select>
                    <select
                        value={filterTingkat}
                        onChange={(e) => {
                            setFilterTingkat(e.target.value)
                            setCurrentPage(1)
                        }}
                    >
                        <option value="">Semua Tingkat</option>
                        <option value="1">Ringan</option>
                        <option value="2">Sedang</option>
                        <option value="3">Berat</option>
                        <option value="4">Sangat Berat</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="empty-state">
                        <AlertTriangle size={48} />
                        <h3>Tidak ada pelanggaran</h3>
                        <p>Belum ada data pelanggaran yang tercatat</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Santri</th>
                                <th>Jenis Pelanggaran</th>
                                <th>Tingkat</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <span className="date-cell">
                                            <Calendar size={14} />
                                            {formatDate(item.tanggal)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="santri-cell">
                                            <span className="santri-name">{item.santri?.nama || '-'}</span>
                                            <span className="santri-info">
                                                {item.santri?.nis} • {item.santri?.kelas?.nama || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="jenis-cell">{item.jenis}</span>
                                    </td>
                                    <td>
                                        <span className={`tingkat-badge ${getTingkatLabel(item.tingkat).class}`}>
                                            {getTingkatLabel(item.tingkat).text}
                                        </span>
                                    </td>
                                    <td>{getStatusBadge(item.status)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn view"
                                                onClick={() => navigate(`/pengurus/pelanggaran/${item.id}`)}
                                                title="Lihat Detail"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                onClick={() => navigate(`/pengurus/pelanggaran/${item.id}/edit`)}
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            {activeRole === 'admin' && (
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDelete(item.id)}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="page-info">
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    )
}

export default PelanggaranPage
