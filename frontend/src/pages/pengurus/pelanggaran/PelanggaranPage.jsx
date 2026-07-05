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
    Users,
    X
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/layout/PageHeader'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import DeleteConfirmationModal from '../../../components/ui/DeleteConfirmationModal'

const PelanggaranPage = () => {
    const { activeRole } = useAuth()
    const navigate = useNavigate()

    const [pelanggaran, setPelanggaran] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    })
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const itemsPerPage = 10

    // Modal state
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedId, setSelectedId] = useState(null)

    useEffect(() => {
        fetchPelanggaran()
    }, [currentPage, filterStatus, dateRange])

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

            if (dateRange.start) {
                query = query.gte('tanggal', dateRange.start)
            }
            if (dateRange.end) {
                query = query.lte('tanggal', dateRange.end)
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

    const handleDeleteClick = (id) => {
        if (activeRole !== 'admin' && activeRole !== 'pengurus') {
            alert('Anda tidak memiliki izin untuk menghapus data ini')
            return
        }
        setSelectedId(id)
        setShowDeleteModal(true)
    }

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('pelanggaran')
                .delete()
                .eq('id', selectedId)

            if (error) throw error
            fetchPelanggaran()
            setShowDeleteModal(false)
        } catch (error) {
            console.error('Error deleting:', error.message)
            alert('Gagal menghapus: ' + error.message)
        } finally {
            setIsDeleting(false)
            setSelectedId(null)
        }
    }

    const getTingkatLabel = (tingkat) => {
        const labels = {
            1: { text: 'Ringan', color: 'bg-emerald-50 text-emerald-600' },
            2: { text: 'Sedang', color: 'bg-amber-50 text-amber-600' },
            3: { text: 'Berat', color: 'bg-red-50 text-red-600' },
            4: { text: 'Sangat Berat', color: 'bg-purple-50 text-purple-600' }
        }
        return labels[tingkat] || { text: 'Unknown', color: 'bg-gray-50 text-gray-600' }
    }

    const getStatusBadge = (status) => {
        const badges = {
            'OPEN': { icon: AlertCircle, color: 'bg-red-50 text-red-600', text: 'Open' },
            'PROSES': { icon: Clock, color: 'bg-amber-50 text-amber-600', text: 'Proses' },
            'SELESAI': { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', text: 'Selesai' }
        }
        const badge = badges[status] || badges['OPEN']
        const Icon = badge.icon
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${badge.color}`}>
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
        <div className="space-y-6">
            <PageHeader
                title="Pelanggaran Santri"
                description="Kelola data pelanggaran dan tindak lanjut pembinaan santri"
                icon={AlertTriangle}
                actions={
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button 
                            onClick={() => navigate('/pengurus/pelanggaran/create')}
                            className="w-full md:w-auto rounded-xl shadow-lg shadow-primary-100"
                        >
                            <Plus size={18} />
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest">Catat Pelanggaran</span>
                        </Button>
                    </div>
                }
            />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Tabs for Status */}
                        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                            {[
                                { id: '', label: 'Semua', color: 'text-gray-600', bg: 'bg-white' },
                                { id: 'OPEN', label: 'Open', color: 'text-red-600', bg: 'bg-red-50' },
                                { id: 'PROSES', label: 'Proses', color: 'text-amber-600', bg: 'bg-amber-50' },
                                { id: 'SELESAI', label: 'Selesai', color: 'text-emerald-600', bg: 'bg-emerald-50' }
                            ].map((tab) => {
                                const isActive = filterStatus === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setFilterStatus(tab.id)
                                            setCurrentPage(1)
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                                            ${isActive 
                                                ? `${tab.bg} ${tab.color} shadow-sm border border-white` 
                                                : 'text-gray-400 hover:text-gray-600'}
                                        `}
                                    >
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                            {/* Filter Rentang Tanggal */}
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="px-3 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-xs focus:outline-none font-bold text-gray-500 cursor-pointer"
                                    title="Dari Tanggal"
                                />
                                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">s.d</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="px-3 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-xs focus:outline-none font-bold text-gray-500 cursor-pointer"
                                    title="Sampai Tanggal"
                                />
                                {(dateRange.start || dateRange.end) && (
                                    <button
                                        onClick={() => setDateRange({ start: '', end: '' })}
                                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                                        title="Reset Tanggal"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="relative w-full md:w-64">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari santri atau jenis..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5">Tanggal</th>
                                <th className="px-8 py-5">Santri</th>
                                <th className="px-8 py-5">Pelanggaran</th>
                                <th className="px-8 py-5">Poin</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={6}><Spinner className="py-20" label="Memuat data..." /></td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12">
                                        <EmptyState
                                            icon={AlertTriangle}
                                            title="Data tidak ditemukan"
                                            message={searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}"` : `Belum ada data pelanggaran.`}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/pengurus/pelanggaran/${item.id}`)}
                                        className="hover:bg-gray-50/50 transition-all cursor-pointer group border-b border-gray-50 last:border-0"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-gray-600 font-medium">
                                                <Calendar size={14} className="text-gray-400" />
                                                {formatDate(item.tanggal)}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-black text-gray-900 group-hover:text-primary-600 transition-colors leading-tight">
                                                {item.santri?.nama || '-'}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                NIS: {item.santri?.nis} • {item.santri?.kelas?.nama || '-'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-gray-700 font-medium">{item.jenis}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-black border border-red-100">
                                                {item.poin || 0} PTS
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/pengurus/pelanggaran/${item.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye size={18} /></Link>
                                                <Link to={`/pengurus/pelanggaran/${item.id}/edit`} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><Edit size={18} /></Link>
                                                {(activeRole === 'admin' || activeRole === 'pengurus') && (
                                                    <button onClick={() => handleDeleteClick(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Grid View */}
                <div className="md:hidden">
                    <div className="divide-y divide-gray-50">
                        {loading ? (
                            <div className="py-20 text-center"><Spinner label="Memuat..." /></div>
                        ) : filteredData.length === 0 ? (
                            <div className="p-12">
                                <EmptyState 
                                    icon={AlertTriangle} 
                                    title="Tidak ditemukan" 
                                    message="Belum ada data pelanggaran."
                                />
                            </div>
                        ) : (
                            filteredData.map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => navigate(`/pengurus/pelanggaran/${item.id}`)}
                                    className="p-6 space-y-4 active:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="font-black text-gray-900 text-base leading-tight">{item.santri?.nama || '-'}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                NIS: {item.santri?.nis} • {item.santri?.kelas?.nama || '-'}
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {getStatusBadge(item.status)}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <Calendar size={12} /> {formatDate(item.tanggal)}
                                        </div>
                                        <div className="text-sm font-bold text-gray-700 leading-tight">
                                            {item.jenis}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 border border-red-100">
                                            <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter">Poin:</span>
                                            <span className="text-[10px] font-black text-red-600">{item.poin || 0} PTS</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                        <Link to={`/pengurus/pelanggaran/${item.id}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200">
                                            <Eye size={14} /> Detail
                                        </Link>
                                        <Link to={`/pengurus/pelanggaran/${item.id}/edit`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-100">
                                            <Edit size={14} /> Edit
                                        </Link>
                                        {(activeRole === 'admin' || activeRole === 'pengurus') && (
                                            <button 
                                                onClick={() => handleDeleteClick(item.id)}
                                                className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                <DeleteConfirmationModal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleConfirmDelete}
                    itemName="catatan pelanggaran ini"
                    isDeleting={isDeleting}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Halaman <span className="font-bold text-gray-900">{currentPage}</span> dari <span className="font-bold text-gray-900">{totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={18} /> Prev
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PelanggaranPage
