import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Bell, Calendar, Tag, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useCalendar } from '../../../context/CalendarContext'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
import Badge from '../../../components/ui/Badge'
// import '../WaliPortal.css' // REMOVED

/**
 * PengumumanPage - Halaman untuk melihat pengumuman pondok
 * Refactored to use Global Layout System (Phase 2)
 */
const PengumumanPage = () => {
    const [loading, setLoading] = useState(true)
    const [pengumumanData, setPengumumanData] = useState([])
    const [filterKategori, setFilterKategori] = useState('semua')
    const [expandedId, setExpandedId] = useState(null)

    // Fetch pengumuman
    const fetchPengumuman = async () => {
        try {
            let query = supabase
                .from('pengumuman')
                .select('*')
                .eq('is_active', true)
                .order('prioritas', { ascending: false })
                .order('tanggal_publish', { ascending: false })

            if (filterKategori !== 'semua') {
                query = query.eq('kategori', filterKategori)
            }

            const { data, error } = await query

            if (error) throw error
            setPengumumanData(data || [])

        } catch (error) {
            console.error('Error fetching pengumuman:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPengumuman()
    }, [filterKategori])

    const { formatDate } = useCalendar()

    const getKategoriColor = (kategori) => {
        const colors = {
            'Umum': 'gray',
            'Akademik': 'blue',
            'Keuangan': 'emerald',
            'Kegiatan': 'purple',
            'Libur': 'amber',
            'Ujian': 'red'
        }
        return colors[kategori] || 'gray'
    }

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    // List categories for filter chips
    const categories = ['semua', 'Umum', 'Akademik', 'Keuangan', 'Kegiatan', 'Libur', 'Ujian']

    return (
        <div className="space-y-6">
            <PageHeader
                title="Informasi & Pengumuman"
                description="Berita terbaru dari pondok pesantren"
                icon={Bell}
                backUrl="/wali/beranda"
            />

            {/* Premium Filter Kategori (Pill Style) */}
            <div className="flex flex-wrap gap-2 pb-4 overflow-x-auto no-scrollbar -mx-4 px-4">
                {categories.map(kat => (
                    <button
                        key={kat}
                        className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border shadow-sm ${filterKategori === kat
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                            : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                            }`}
                        onClick={() => setFilterKategori(kat)}
                    >
                        {kat === 'semua' ? 'Semua' : kat}
                    </button>
                ))}
            </div>

            {/* Pengumuman List with Premium Glass Cards */}
            <div>
                {pengumumanData.length > 0 ? (
                    <div className="space-y-4">
                        {pengumumanData.map(pengumuman => (
                            <div
                                key={pengumuman.id}
                                className={`glass-card rounded-[2.5rem] border transition-all duration-300 overflow-hidden relative group ${pengumuman.prioritas > 5
                                    ? 'border-rose-200 shadow-xl shadow-rose-100/50 bg-rose-50/30'
                                    : 'border-white/40 shadow-xl bg-white/70 backdrop-blur-md'
                                    }`}
                            >
                                <div
                                    className="p-6 cursor-pointer relative z-10"
                                    onClick={() => toggleExpand(pengumuman.id)}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getKategoriColor(pengumuman.kategori) === 'red' ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                            {pengumuman.kategori}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                            <Calendar size={12} className="opacity-60" />
                                            {formatDate(pengumuman.tanggal_publish)}
                                        </div>
                                        {pengumuman.prioritas > 5 && (
                                            <span className="flex items-center gap-1 text-[8px] font-black text-rose-600 bg-rose-100 px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">
                                                <Bell size={10} />
                                                Penting
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center gap-4">
                                        <h3 className="text-xl font-black text-gray-900 leading-[1.2] group-hover:text-indigo-600 transition-colors">
                                            {pengumuman.judul}
                                        </h3>
                                        <div className={`p-2 rounded-full transition-all shrink-0 ${expandedId === pengumuman.id ? 'bg-indigo-600 text-white rotate-180' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                                            <ChevronDown size={20} />
                                        </div>
                                    </div>

                                    {!expandedId && (
                                        <p className="mt-3 text-sm font-bold text-gray-500 line-clamp-2 leading-relaxed opacity-80">
                                            {pengumuman.isi.split('\n')[0]}
                                        </p>
                                    )}
                                </div>

                                <div
                                    className={`transition-all duration-500 ease-in-out overflow-hidden ${expandedId === pengumuman.id
                                        ? 'max-h-[2000px] opacity-100 mb-6'
                                        : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <div className="px-6 pb-2">
                                        <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6 opacity-30"></div>
                                        <div className="text-gray-700 text-sm leading-8 font-medium space-y-4">
                                            {pengumuman.isi.split('\n').map((paragraph, idx) => (
                                                paragraph.trim() && (
                                                    <p key={idx} className="relative pl-4 border-l-2 border-indigo-100">
                                                        {paragraph}
                                                    </p>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-indigo-50/20 rounded-full blur-3xl opacity-50"></div>
                                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-32 h-32 bg-purple-50/20 rounded-full blur-3xl opacity-50"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Bell}
                        title="Belum Ada Pengumuman"
                        description="Tidak ada pengumuman untuk kategori ini."
                    />
                )}
            </div>
        </div>
    )
}

export default PengumumanPage
