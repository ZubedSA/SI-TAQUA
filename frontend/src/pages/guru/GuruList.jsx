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
        <div className="space-y-6">
            <PageHeader
                title="Data Guru"
                description="Kelola data pengajar dan wali kelas"
                actions={
                    <div className="flex items-center gap-2">
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
                <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Daftar Guru ({filteredGuru.length})</h3>
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari guru..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-sm text-gray-500 whitespace-nowrap">Urutkan:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full md:w-auto px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            >
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

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">NIP</th>
                                <th className="px-6 py-3">Nama</th>
                                <th className="px-6 py-3">Jenis Kelamin</th>
                                <th className="px-6 py-3">Jabatan</th>
                                <th className="px-6 py-3">No. Telepon</th>
                                <th className="px-6 py-3">Status</th>
                                {canEdit && <th className="px-6 py-3 text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={canEdit ? 7 : 6}><Spinner className="py-12" label="Memuat data guru..." /></td></tr>
                            ) : filteredGuru.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 7 : 6} className="p-8">
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
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono text-gray-600">{item.nip}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.nama}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.jenis_kelamin}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.jabatan === 'Wali Kelas'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                {item.jabatan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{item.no_telp || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.status === 'Aktif'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        {canEdit && (
                                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <Eye size={16} />, label: 'Detail', path: `/guru/${item.id}` },
                                                        { icon: <Edit size={16} />, label: 'Edit', path: `/guru/${item.id}/edit` },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedGuru(item); setShowDeleteModal(true) }, danger: true }
                                                    ]}
                                                >
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            to={`/guru/${item.id}`}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Lihat Detail"
                                                        >
                                                            <Eye size={18} />
                                                        </Link>
                                                        <Link
                                                            to={`/guru/${item.id}/edit`}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </Link>
                                                        <button
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedGuru(item)
                                                                setShowDeleteModal(true)
                                                            }}
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
