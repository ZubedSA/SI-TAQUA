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
import PageHeader from '../../components/layout/PageHeader'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import Button from '../../components/ui/Button'


const GuruList = () => {
    const { activeRole, isAdmin, isAdminAkademik, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || isAdminAkademik() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEdit = adminCheck
    const navigate = useNavigate()
    const [guru, setGuru] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('nama-asc')
    const [activeStatus, setActiveStatus] = useState('Aktif')
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
        .filter(g => {
            const matchesSearch = (g.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 g.nip?.toLowerCase().includes(searchTerm.toLowerCase()))
            const matchesStatus = g.status === activeStatus
            return matchesSearch && matchesStatus
        })
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
        <div className="space-y-6">
            <PageHeader
                title="Data Guru"
                description="Kelola data pengajar dan wali kelas"
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
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
                }
            />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                            {[
                                { id: 'Aktif', label: 'Aktif', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { id: 'Tidak Aktif', label: 'Non-Aktif', color: 'text-amber-600', bg: 'bg-amber-50' },
                                { id: 'Pensiun', label: 'Pensiun', color: 'text-indigo-600', bg: 'bg-indigo-50' }
                            ].map((tab) => {
                                const count = guru.filter(g => g.status === tab.id).length
                                const isActive = activeStatus === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveStatus(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                                            ${isActive 
                                                ? `${tab.bg} ${tab.color} shadow-sm border border-white` 
                                                : 'text-gray-400 hover:text-gray-600'}
                                        `}
                                    >
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-lg text-[10px] border ${isActive ? 'bg-white border-transparent shadow-sm' : 'bg-gray-200/50 border-transparent text-gray-400'}`}>
                                            {count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari guru..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full md:w-auto px-3 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none font-bold text-gray-600"
                                >
                                    <option value="nama-asc">Nama A-Z</option>
                                    <option value="nama-desc">Nama Z-A</option>
                                    <option value="nip-asc">NIP Asc</option>
                                    <option value="nip-desc">NIP Desc</option>
                                    <option value="jabatan-asc">Jabatan</option>
                                </select>
                                <Button variant="secondary" size="icon" onClick={fetchGuru} className="rounded-xl shadow-sm border-gray-100">
                                    <RefreshCw size={18} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5">Identitas Guru</th>
                                <th className="px-8 py-5">Jabatan / Peran</th>
                                <th className="px-8 py-5">Kontak</th>
                                <th className="px-8 py-5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={4}><Spinner className="py-20" label="Menyelaraskan data guru..." /></td></tr>
                            ) : filteredGuru.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12">
                                        <EmptyState
                                            icon={Search}
                                            title="Data tidak ditemukan"
                                            message={searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}" di kategori ${activeStatus}` : `Belum ada data guru dengan status ${activeStatus}.`}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredGuru.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => navigate(`/guru/${item.id}`)}
                                        className="hover:bg-gray-50/50 transition-all cursor-pointer group border-b border-gray-50 last:border-0"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="font-black text-gray-900 group-hover:text-primary-600 transition-colors leading-tight">{item.nama}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                                NIP: {item.nip || 'N/A'} 
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] ${item.jenis_kelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                                                    {item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight border ${item.jabatan === 'Wali Kelas'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : item.jabatan === 'Kepala Sekolah' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                }`}>
                                                {item.jabatan}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-bold text-gray-600">{item.no_telp || '-'}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{item.email || '-'}</div>
                                        </td>
                                        <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 transition-all">
                                                <Link to={`/guru/${item.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Detail"><Eye size={18} /></Link>
                                                {canEdit && (
                                                    <>
                                                        <Link to={`/guru/${item.id}/edit`} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit"><Edit size={18} /></Link>
                                                        <button onClick={() => { setSelectedGuru(item); setShowDeleteModal(true) }} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Hapus"><Trash2 size={18} /></button>
                                                    </>
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
                        ) : filteredGuru.length === 0 ? (
                            <div className="p-12"><EmptyState icon={Search} title="Tidak ditemukan" /></div>
                        ) : (
                            filteredGuru.map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => navigate(`/guru/${item.id}`)}
                                    className="p-6 space-y-4 active:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="font-black text-gray-900 text-base leading-tight">{item.nama}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">NIP: {item.nip || 'N/A'}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${item.jenis_kelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                            {item.jenis_kelamin}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-100">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Jabatan:</span>
                                            <span className="text-[10px] font-black text-indigo-600">{item.jabatan || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-100">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Telp:</span>
                                            <span className="text-[10px] font-black text-gray-600">{item.no_telp || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                        <Link to={`/guru/${item.id}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200">
                                            <Eye size={14} /> Detail
                                        </Link>
                                        {canEdit && (
                                            <>
                                                <Link to={`/guru/${item.id}/edit`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-100">
                                                    <Edit size={14} /> Edit
                                                </Link>
                                                <button 
                                                    onClick={() => { setSelectedGuru(item); setShowDeleteModal(true) }}
                                                    className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Menampilkan {filteredGuru.length} dari {guru.length} guru</p>
                    <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                        onClick={fetchGuru}
                    >
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
