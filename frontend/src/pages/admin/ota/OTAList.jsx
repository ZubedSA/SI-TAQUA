import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Link as LinkIcon, Eye, User, Phone, Mail, Tag } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../context/ToastContext'
import Spinner from '../../../components/ui/Spinner'

const OTAList = () => {
    const navigate = useNavigate()
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [otas, setOtas] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchOtas()
    }, [])

    const fetchOtas = async () => {
        try {
            const { data, error } = await supabase
                .from('orang_tua_asuh')
                .select(`
                    *,
                    kategori:kategori_id(id, nama),
                    ota_santri (
                        count
                    )
                `)
                .order('nama', { ascending: true })

            if (error) throw error
            setOtas(data || [])
        } catch (err) {
            showToast.error('Gagal memuat data OTA: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id, nama) => {
        if (!window.confirm(`Yakin ingin menonaktifkan OTA ${nama}?`)) return

        try {
            const { error } = await supabase
                .from('orang_tua_asuh')
                .update({ status: false })
                .eq('id', id)

            if (error) throw error
            showToast.success('OTA berhasil dinonaktifkan')
            fetchOtas()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    // Filter based on search
    const filteredOtas = otas.filter(ota =>
        ota.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ota.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Spinner label="Memuat Data Orang Tua Asuh..." />
        </div>
    )

    return (
        <div className="ota-list-page p-6 fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Orang Tua Asuh</h1>
                    <p className="text-gray-500 mt-1">Kelola profil donatur dan relasi santri binaan</p>
                </div>
                <button
                    onClick={() => navigate('/admin/ota/create')}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-2 font-medium"
                >
                    <Plus size={20} /> Tambah OTA Baru
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Search Bar */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari nama, email, atau no hp..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                            <tr>
                                <th className="py-4 px-6 text-left font-semibold w-[25%]">Profil OTA</th>
                                <th className="py-4 px-6 text-left font-semibold">Kontak</th>
                                <th className="py-4 px-6 text-left font-semibold">Kategori</th>
                                <th className="py-4 px-6 text-left font-semibold">Binaan</th>
                                <th className="py-4 px-6 text-left font-semibold">Status</th>
                                <th className="py-4 px-6 text-right font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredOtas.length > 0 ? (
                                filteredOtas.map((ota) => (
                                    <tr key={ota.id} className="hover:bg-gray-50/80 transition group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-emerald-700 font-bold shadow-sm">
                                                    {ota.nama?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div
                                                        className="font-semibold text-gray-900 cursor-pointer hover:text-green-600 transition"
                                                        onClick={() => navigate(`/admin/ota/${ota.id}`)}
                                                    >
                                                        {ota.nama}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {ota.id.slice(0, 8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Mail size={14} className="text-gray-400" />
                                                    <span>{ota.email || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Phone size={14} className="text-gray-400" />
                                                    <span>{ota.no_hp || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {ota.kategori ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <Tag size={12} />
                                                    {ota.kategori.nama}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${ota.ota_santri[0]?.count > 0
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                    : 'bg-gray-50 text-gray-500 border-gray-100'
                                                    }`}>
                                                    {ota.ota_santri[0]?.count || 0} Santri
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ota.status
                                                ? 'bg-green-50 text-green-700 border border-green-100'
                                                : 'bg-red-50 text-red-700 border border-red-100'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${ota.status ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {ota.status ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                                <button
                                                    title="Hubungkan Santri"
                                                    onClick={() => navigate(`/admin/ota/${ota.id}/link`)}
                                                    className="p-2 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition"
                                                >
                                                    <LinkIcon size={16} />
                                                </button>
                                                <button
                                                    title="Edit Profil"
                                                    onClick={() => navigate(`/admin/ota/${ota.id}/edit`)}
                                                    className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    title={ota.status ? "Nonaktifkan" : "Aktifkan"}
                                                    onClick={() => handleDelete(ota.id, ota.nama)}
                                                    className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                                <User size={32} className="text-gray-300" />
                                            </div>
                                            <p className="text-gray-900 font-medium">Tidak ada data ditemukan</p>
                                            <p className="text-gray-500 text-sm mt-1">Coba kata kunci lain atau tambah OTA baru.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default OTAList
