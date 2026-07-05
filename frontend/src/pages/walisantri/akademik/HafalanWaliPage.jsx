import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    BookOpen, Calendar, User, ChevronLeft, Search,
    CheckCircle, Clock, RotateCcw, Filter, ChevronRight
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useCalendar } from '../../../context/CalendarContext'
import SantriCard from '../components/SantriCard'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
// import '../WaliPortal.css' // REMOVED

/**
 * HafalanWaliPage - Halaman untuk melihat riwayat hafalan santri
 * Read-only - wali hanya bisa melihat, tidak bisa mengedit
 * Refactored to use Global Layout System (Phase 2)
 */
const HafalanWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanData, setHafalanData] = useState([])
    const [filterJenis, setFilterJenis] = useState('semua')
    const [searchSurah, setSearchSurah] = useState('')

    // Fetch santri list
    const fetchSantriList = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select(`
          *,
          kelas:kelas_id (nama),
          halaqoh:halaqoh_id (nama)
        `)
                .eq('wali_id', user.id)
                .order('nama')

            if (error) throw error

            setSantriList(data || [])
            if (data && data.length > 0) {
                setSelectedSantri(data[0])
            }
        } catch (error) {
            console.error('Error fetching santri:', error)
        }
    }

    // Fetch hafalan data
    const fetchHafalanData = async (santriId) => {
        if (!santriId) return

        try {
            let query = supabase
                .from('hafalan')
                .select('*, guru:penguji_id (nama)')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            if (filterJenis !== 'semua') {
                query = query.eq('jenis', filterJenis)
            }

            const { data, error } = await query

            if (error) throw error
            setHafalanData(data || [])
        } catch (error) {
            console.error('Error fetching hafalan:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchHafalanData(selectedSantri.id)
        }
    }, [selectedSantri, filterJenis])

    const { formatDate } = useCalendar()

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Mutqin':
                return <CheckCircle size={16} className="text-emerald-500" />
            case 'Proses':
                return <Clock size={16} className="text-amber-500" />
            default:
                return <RotateCcw size={16} className="text-blue-500" />
        }
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Mutqin':
                return 'bg-emerald-100 text-emerald-700'
            case 'Proses':
                return 'bg-amber-100 text-amber-700'
            default:
                return 'bg-blue-100 text-blue-700'
        }
    }

    // Filter by search
    const filteredHafalan = hafalanData.filter(h =>
        searchSurah === '' ||
        h.surah?.toLowerCase().includes(searchSurah.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Hafalan Al-Qur'an"
                description="Riwayat setoran hafalan santri"
                icon={BookOpen}
                backUrl="/wali/beranda"
            />

            {/* Premium Santri Selector (Horizontal Scroll) */}
            {santriList.length > 1 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pilih Santri</h3>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4 mask-linear-fade">
                        {santriList.map(santri => (
                            <div key={santri.id} className="min-w-[280px] transition-all">
                                <SantriCard
                                    santri={santri}
                                    selected={selectedSantri?.id === santri.id}
                                    onClick={() => setSelectedSantri(santri)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search & Filter - Premium Glass Style */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white/50 backdrop-blur-md p-4 rounded-[2rem] border border-white/60 shadow-lg">
                <div className="relative flex-1 w-full">
                    <Search
                        size={18}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        placeholder="Cari surat atau juz..."
                        value={searchSurah}
                        onChange={(e) => setSearchSurah(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white/70 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400 shadow-inner"
                    />
                </div>
                <div className="w-full md:w-56">
                    <select
                        value={filterJenis}
                        onChange={(e) => setFilterJenis(e.target.value)}
                        className="w-full px-6 py-4 bg-white/70 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-black text-[10px] uppercase tracking-widest text-slate-700 shadow-inner appearance-none cursor-pointer"
                    >
                        <option value="semua">Semua Jenis</option>
                        <option value="Setoran">Setoran Baru</option>
                        <option value="Muroja'ah">Muroja'ah</option>
                        <option value="Ziyadah Ulang">Ziyadah Ulang</option>
                    </select>
                </div>
            </div>

            {/* Hafalan List with Premium Cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Riwayat Hafalan</h3>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold ring-1 ring-indigo-100">
                        {filteredHafalan.length} SETORAN
                    </span>
                </div>

                {filteredHafalan.length > 0 ? (
                    <div className="space-y-4">
                        {filteredHafalan.map(hafalan => (
                            <div key={hafalan.id} className="glass-card p-6 rounded-[2rem] border border-white/40 shadow-xl overflow-hidden relative group transition-all hover:scale-[1.01] active:scale-[0.99]">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Setoran Santri</span>
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">{formatDate(hafalan.tanggal)}</span>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm border border-white/50 ${getStatusClass(hafalan.status)}`}>
                                            {getStatusIcon(hafalan.status)}
                                            {hafalan.status}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-3xl font-black text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors tracking-tighter">
                                                {hafalan.surah}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] rounded-lg font-black uppercase tracking-widest">
                                                    Juz {hafalan.juz}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    Ayat {hafalan.ayat_mulai || 1} — {hafalan.ayat_selesai || 'selesai'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {hafalan.jenis && (
                                                <span className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-100 text-slate-600 text-[10px] rounded-xl font-black uppercase tracking-widest shadow-sm">
                                                    {hafalan.jenis}
                                                </span>
                                            )}
                                        </div>

                                        {hafalan.catatan && (
                                            <div className="relative p-6 bg-slate-50/50 rounded-[1.8rem] border border-slate-100/50 group-hover:bg-white transition-colors">
                                                <p className="text-sm text-slate-600 italic leading-relaxed font-medium">
                                                    "{hafalan.catatan}"
                                                </p>
                                            </div>
                                        )}

                                        <div className="pt-6 border-t border-slate-100/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center text-slate-500 font-black text-sm shadow-inner group-hover:from-indigo-100 group-hover:to-indigo-50 group-hover:text-indigo-600 transition-all">
                                                    {hafalan.guru?.nama?.charAt(0) || 'G'}
                                                </div>
                                                <div>
                                                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Diverifikasi Oleh</span>
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider leading-none">
                                                        Ustadz {hafalan.guru?.nama || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-45">
                                                <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Background Decorative Element */}
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl group-hover:bg-indigo-100/40 transition-colors"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={BookOpen}
                        title="Belum Ada Data Hafalan"
                        description="Data hafalan santri belum tersedia atau belum diinput oleh guru."
                    />
                )}
            </div>
        </div>
    )
}

export default HafalanWaliPage
