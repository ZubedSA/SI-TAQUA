
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, User, Phone, Mail, Tag, HeartHandshake, Users, ArrowUpRight } from 'lucide-react'
import { exportToExcel, exportToCSV } from '../../../utils/exportUtils'
import DeleteConfirmationModal from '../../../components/ui/DeleteConfirmationModal'
import '../../ota/OTA.css'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../context/ToastContext'
import Spinner from '../../../components/ui/Spinner'
import { useOrangTuaAsuh } from '../../../hooks/useOTA'

const OTAList = () => {
    const navigate = useNavigate()
    const showToast = useToast()
    const [searchTerm, setSearchTerm] = useState('')

    const [otas, setOtas] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('orang_tua_asuh')
                .select('*')
                .eq('status', true)
                .order('nama')

            if (error) throw error
            setOtas(data || [])
        } catch (error) {
            console.error('Error fetching OTAs:', error)
            showToast.error('Gagal memuat data OTA')
        } finally {
            setLoading(false)
        }
    }

    // Manual fetch removed

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [otaToDelete, setOtaToDelete] = useState(null)

    const handleDelete = (id, nama) => {
        setOtaToDelete({ id, nama })
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!otaToDelete) return

        try {
            const { error } = await supabase
                .from('orang_tua_asuh')
                .delete()
                .eq('id', otaToDelete.id)

            if (error) throw error
            showToast.success('OTA berhasil dihapus')
            setShowDeleteModal(false)
            setOtaToDelete(null)

            // Manual refresh since we don't have react-query setup here fully
            fetchData()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const filteredOtas = otas.filter(ota =>
        ota.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ota.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const activeCount = otas.filter(o => o.status).length
    const totalSantri = otas.reduce((sum, o) => sum + (o.ota_santri?.[0]?.count || 0), 0)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner label="Memuat Data Orang Tua Asuh..." />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-2 md:p-6 lg:p-8 font-sans text-slate-800">
            {/* HEADER */}
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 p-5 md:p-8 text-white shadow-xl mb-4 md:mb-8">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="p-3 md:p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
                            <HeartHandshake size={28} className="text-white md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white mb-1">
                                Data Orang Tua Asuh
                            </h1>
                            <p className="text-emerald-100/90 text-sm md:text-base font-medium">
                                Kelola profil donatur
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/10 text-xs md:text-sm font-medium">
                            <Users size={16} />
                            <span>{activeCount} Aktif</span>
                        </div>
                        <button
                            onClick={() => navigate('/admin/ota/create')}
                            className="flex-1 md:flex-none group flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-xs md:text-sm shadow-lg hover:shadow-xl hover:translate-y-[-2px] hover:bg-emerald-50 transition-all duration-300"
                        >
                            <Plus size={16} />
                            <span>Tambah</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* STATS GRID - 4 CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
                <div className="bg-white rounded-xl p-4 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                        <Users size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Total OTA</div>
                        <div className="text-xl font-bold text-slate-800">{otas.length}</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <User size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">OTA Aktif</div>
                        <div className="text-xl font-bold text-slate-800">{activeCount}</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
                        <HeartHandshake size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Santri Binaan</div>
                        <div className="text-xl font-bold text-slate-800">{totalSantri}</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                        <Tag size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Non-Aktif</div>
                        <div className="text-xl font-bold text-slate-800">{otas.length - activeCount}</div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* TOOLBAR */}
                <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Daftar OTA</h2>
                            <p className="text-xs text-slate-500 font-medium">{filteredOtas.length} data ditemukan</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari nama..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm group-hover:border-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Profil OTA</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kontak</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Binaan</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOtas.length > 0 ? (
                                filteredOtas.map((ota) => (
                                    <tr
                                        key={ota.id}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-100">
                                                    {ota.nama?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div
                                                        onClick={() => navigate(`/ admin / ota / ${ota.id} `)}
                                                        className="font-bold text-slate-700 hover:text-emerald-600 cursor-pointer transition-colors"
                                                    >
                                                        {ota.nama}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {ota.id.slice(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Mail size={14} className="text-slate-400" />
                                                    {ota.email || '-'}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Phone size={14} className="text-slate-400" />
                                                    {ota.no_hp || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {ota.kategori ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                                                    <Tag size={12} />
                                                    {ota.kategori.nama}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Uncategorized</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline - flex items - center gap - 1.5 px - 3 py - 1 rounded - lg text - xs font - semibold border ${ota.ota_santri?.[0]?.count > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'} `}>
                                                <User size={12} />
                                                {ota.ota_santri?.[0]?.count || 0} Santri
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline - flex items - center gap - 2 px - 3 py - 1.5 rounded - full text - xs font - semibold border ${ota.status ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} `}>
                                                <span className={`w - 2 h - 2 rounded - full ${ota.status ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} `}></span>
                                                {ota.status ? 'Aktif' : 'Non-Aktif'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/ admin / ota / ${ota.id} `)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 hover:scale-105 transition-all"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/ admin / ota / ${ota.id}/edit`)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-105 transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button >
                                                <button
                                                    onClick={() => handleDelete(ota.id, ota.nama)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div >
                                        </td >
                                    </tr >
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <Users size={32} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-800">Tidak ada data ditemukan</h3>
                                        <p className="text-slate-500 text-sm mt-1 mb-6">Coba kata kunci lain atau tambahkan data baru</p>
                                        <button
                                            onClick={() => navigate('/admin/ota/create')}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                                        >
                                            <Plus size={16} /> Tambah OTA Baru
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody >
                    </table >
                </div >

                {/* MOBILE CARD VIEW */}
                < div className="md:hidden p-3 space-y-3 bg-slate-50/50" >
                    {
                        filteredOtas.length > 0 ? (
                            filteredOtas.map((ota) => (
                                <div key={ota.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-100">
                                                {ota.nama?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div
                                                    onClick={() => navigate(`/admin/ota/${ota.id}`)}
                                                    className="font-bold text-slate-800 text-sm hover:text-emerald-600 transition-colors"
                                                >
                                                    {ota.nama}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">ID: {ota.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${ota.status ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                            {ota.status ? 'Aktif' : 'Non-Aktif'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600 p-2 bg-slate-50 rounded-lg">
                                            <Mail size={14} className="text-slate-400" />
                                            <span className="truncate">{ota.email || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600 p-2 bg-slate-50 rounded-lg">
                                            <Phone size={14} className="text-slate-400" />
                                            <span>{ota.no_hp || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                        <div className="flex gap-2">
                                            {ota.kategori && (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-100">
                                                    <Tag size={10} /> {ota.kategori.nama}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                                                <User size={10} /> {ota.ota_santri?.[0]?.count || 0}
                                            </span>
                                        </div>

                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => navigate(`/admin/ota/${ota.id}`)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/admin/ota/${ota.id}/edit`)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ota.id, ota.nama)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center bg-white rounded-xl border border-slate-100 border-dashed">
                                <Users size={32} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-sm text-slate-500">Tidak ada data</p>
                            </div>
                        )
                    }
                </div >

                {/* FOOTER */}
                {
                    filteredOtas.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium">
                            Menampilkan <span className="text-slate-700 font-bold">{filteredOtas.length}</span> dari <span className="text-slate-700 font-bold">{otas.length}</span> data
                        </div>
                    )
                }
            </div >

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                itemName={otaToDelete?.nama}
                message={`Yakin ingin menghapus OTA ${otaToDelete?.nama}? Data akan dihapus permanen.`}
            />
        </div>
    )
}

export default OTAList
