import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Award, BookOpen, Heart, Users,
    TrendingUp, Star, AlertCircle
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
 * EvaluasiWaliPage - Halaman untuk melihat evaluasi dan nilai santri
 * Read-only - wali hanya bisa melihat, tidak bisa mengedit
 * Refactored to use Global Layout System (Phase 2)
 */
const EvaluasiWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [activeTab, setActiveTab] = useState('nilai')
    const [nilaiData, setNilaiData] = useState([])
    const [perilakuData, setPerilakuData] = useState([])
    const [taujihadData, setTaujihadData] = useState([])

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

    // Fetch evaluasi data area...
    const fetchEvaluasiData = async (santriId) => {
        if (!santriId) return

        try {
            // Fetch nilai
            const { data: nilai } = await supabase
                .from('nilai')
                .select('*, mapel:mapel_id (nama, kode)')
                .eq('santri_id', santriId)
                .order('tahun_ajaran', { ascending: false })

            setNilaiData(nilai || [])

            // Fetch perilaku (jika tabel ada)
            try {
                const { data: perilaku } = await supabase
                    .from('perilaku_santri')
                    .select('*')
                    .eq('santri_id', santriId)
                    .order('tanggal', { ascending: false })
                    .limit(10)

                setPerilakuData(perilaku || [])
            } catch (e) {
                setPerilakuData([])
            }

            // Fetch taujihad/catatan guru (jika tabel ada)
            try {
                const { data: taujihad } = await supabase
                    .from('taujihad')
                    .select('*, guru:guru_id (nama)')
                    .eq('santri_id', santriId)
                    .order('tanggal', { ascending: false })
                    .limit(10)

                setTaujihadData(taujihad || [])
            } catch (e) {
                setTaujihadData([])
            }

        } catch (error) {
            console.error('Error fetching evaluasi:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchEvaluasiData(selectedSantri.id)
        }
    }, [selectedSantri])

    const { formatDate } = useCalendar()

    const getNilaiColor = (nilai) => {
        if (nilai >= 80) return 'text-emerald-600'
        if (nilai >= 70) return 'text-blue-600'
        if (nilai >= 60) return 'text-amber-600'
        return 'text-red-600'
    }

    const getNilaiBg = (nilai) => {
        if (nilai >= 80) return 'bg-emerald-50'
        if (nilai >= 70) return 'bg-blue-50'
        if (nilai >= 60) return 'bg-amber-50'
        return 'bg-red-50'
    }

    const getNilaiLabel = (nilai) => {
        if (nilai >= 90) return 'Sangat Baik'
        if (nilai >= 80) return 'Baik'
        if (nilai >= 70) return 'Cukup'
        if (nilai >= 60) return 'Kurang'
        return 'Perlu Perbaikan'
    }

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
                title="Evaluasi & Nilai"
                description="Perkembangan akademik dan perilaku santri"
                icon={TrendingUp}
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
                            <div key={santri.id} className="min-w-[280px]">
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

            {/* Premium Tabs Selection */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 mask-linear-fade">
                {[
                    { id: 'nilai', label: 'Nilai Akademik', icon: Award, color: 'bg-indigo-600 shadow-indigo-200' },
                    { id: 'perilaku', label: 'Akhlak & Perilaku', icon: Heart, color: 'bg-rose-600 shadow-rose-200' },
                    { id: 'catatan', label: 'Catatan Guru', icon: BookOpen, color: 'bg-amber-600 shadow-amber-200' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shrink-0 ${activeTab === tab.id
                            ? `${tab.color} text-white scale-105 z-10`
                            : 'bg-white/70 backdrop-blur-md text-slate-500 hover:bg-white border border-white/60'
                            }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div>
                {/* Tab: Nilai with Premium Design */}
                {activeTab === 'nilai' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Capaian Nilai</h3>
                        </div>
                        {nilaiData.length > 0 ? (
                            <div className="glass-card rounded-[3rem] border border-white/50 shadow-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900/5">
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mata Pelajaran</th>
                                            <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Angka</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/50">
                                        {nilaiData.map(nilai => (
                                            <tr key={nilai.id} className="hover:bg-white transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{nilai.mapel?.nama || '-'}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        {nilai.semester} • {nilai.tahun_ajaran}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-6 text-center font-black text-2xl tracking-tighter ${getNilaiColor(nilai.nilai_akhir)}`}>
                                                    {nilai.nilai_akhir || '-'}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`inline-block px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${(getNilaiBg(nilai.nilai_akhir) || 'bg-slate-50').replace('bg-', 'bg-opacity-50 bg-')} ${getNilaiColor(nilai.nilai_akhir)} border border-white/50`}>
                                                        {getNilaiLabel(nilai.nilai_akhir)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState
                                icon={Award}
                                title="Belum Ada Data Nilai"
                                message="Data nilai santri belum tersedia atau belum diinput."
                            />
                        )}
                    </div>
                )}

                {/* Tab: Perilaku/Akhlak with Glass Design */}
                {activeTab === 'perilaku' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Riwayat Akhlak</h3>
                        </div>
                        {perilakuData.length > 0 ? (
                            <div className="space-y-4">
                                {perilakuData.map(perilaku => (
                                    <div key={perilaku.id} className="glass-card p-6 rounded-[2rem] border border-white/40 shadow-xl relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/50 px-2.5 py-1 rounded-lg border border-gray-100/50">
                                                    {formatDate(perilaku.tanggal)}
                                                </div>
                                                <div className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full shadow-sm ${perilaku.jenis === 'Positif'
                                                    ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                                                    : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                                                    }`}>
                                                    {perilaku.jenis}
                                                </div>
                                            </div>
                                            <p className="text-gray-900 font-bold mb-4 leading-relaxed">{perilaku.keterangan}</p>
                                            {perilaku.poin && (
                                                <div className={`w-fit px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${perilaku.jenis === 'Positif' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-rose-600 text-white shadow-rose-200'}`}>
                                                    {perilaku.jenis === 'Positif' ? '+' : '-'}{perilaku.poin} POIN
                                                </div>
                                            )}
                                        </div>
                                        {/* Animation Background */}
                                        <div className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-24 h-24 rounded-full blur-2xl opacity-20 ${perilaku.jenis === 'Positif' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={Heart}
                                title="Belum Ada Data Perilaku"
                                message="Catatan perilaku santri belum tersedia."
                            />
                        )}
                    </div>
                )}

                {/* Tab: Catatan Guru with Premium Aesthetic */}
                {activeTab === 'catatan' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Taujihad / Nasehat</h3>
                        </div>
                        {taujihadData.length > 0 ? (
                            <div className="space-y-4">
                                {taujihadData.map(catatan => (
                                    <div key={catatan.id} className="glass-card p-6 rounded-[2.5rem] border border-white/40 shadow-xl overflow-hidden relative group">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                                                        {catatan.guru?.nama?.charAt(0) || 'G'}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Pemberi Nasehat</h5>
                                                        <p className="text-xs font-black text-gray-900 uppercase">{catatan.guru?.nama || 'Guru / Ustadz'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                                                    {formatDate(catatan.tanggal)}
                                                </span>
                                            </div>
                                            <p className="text-gray-800 font-bold leading-relaxed whitespace-pre-line text-sm italic">
                                                "{catatan.isi}"
                                            </p>
                                            {catatan.rekomendasi && (
                                                <div className="mt-5 p-4 bg-amber-50/50 backdrop-blur-sm rounded-[1.5rem] border border-amber-100/50 flex items-start gap-3">
                                                    <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-sm">
                                                        <Star size={14} fill="currentColor" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="block text-[8px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Rekomendasi Utama</span>
                                                        <p className="text-xs font-bold text-amber-900">{catatan.rekomendasi}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Aesthetic background mesh */}
                                        <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-32 h-32 bg-indigo-50/20 rounded-full blur-3xl"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={BookOpen}
                                title="Belum Ada Catatan"
                                message="Catatan dari guru/pembina belum tersedia."
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default EvaluasiWaliPage
