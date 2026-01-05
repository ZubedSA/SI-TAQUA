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

            {/* Santri Selector */}
            {santriList.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {santriList.map(santri => (
                        <SantriCard
                            key={santri.id}
                            santri={santri}
                            selected={selectedSantri?.id === santri.id}
                            onClick={() => setSelectedSantri(santri)}
                        />
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
                <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'nilai'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('nilai')}
                >
                    <Award size={18} />
                    Nilai Akademik
                </button>
                <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'perilaku'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('perilaku')}
                >
                    <Heart size={18} />
                    Akhlak & Perilaku
                </button>
                <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'catatan'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('catatan')}
                >
                    <BookOpen size={18} />
                    Catatan Guru
                </button>
            </div>

            {/* Content */}
            <div>
                {/* Tab: Nilai */}
                {activeTab === 'nilai' && (
                    <Card>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">
                            Daftar Nilai
                        </h3>
                        {nilaiData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Mata Pelajaran</th>
                                            <th className="px-4 py-3 font-medium text-center">Tugas</th>
                                            <th className="px-4 py-3 font-medium text-center">UTS</th>
                                            <th className="px-4 py-3 font-medium text-center">UAS</th>
                                            <th className="px-4 py-3 font-medium text-center">Akhir</th>
                                            <th className="px-4 py-3 font-medium text-center">Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {nilaiData.map(nilai => (
                                            <tr key={nilai.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{nilai.mapel?.nama || '-'}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {nilai.semester} - {nilai.tahun_ajaran}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">{nilai.nilai_tugas || '-'}</td>
                                                <td className="px-4 py-3 text-center">{nilai.nilai_uts || '-'}</td>
                                                <td className="px-4 py-3 text-center">{nilai.nilai_uas || '-'}</td>
                                                <td className={`px-4 py-3 text-center font-bold ${getNilaiColor(nilai.nilai_akhir)}`}>
                                                    {nilai.nilai_akhir || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getNilaiColor(nilai.nilai_akhir)} ${getNilaiBg(nilai.nilai_akhir)}`}>
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
                                description="Data nilai santri belum tersedia atau belum diinput."
                            />
                        )}
                    </Card>
                )}

                {/* Tab: Perilaku/Akhlak */}
                {activeTab === 'perilaku' && (
                    <Card>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">
                            Riwayat Perilaku
                        </h3>
                        {perilakuData.length > 0 ? (
                            <div className="space-y-3">
                                {perilakuData.map(perilaku => (
                                    <div key={perilaku.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-xs text-gray-500 font-medium">
                                                {formatDate(perilaku.tanggal)}
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${perilaku.jenis === 'Positif'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {perilaku.jenis}
                                            </span>
                                        </div>
                                        <p className="text-gray-800 text-sm mb-2">{perilaku.keterangan}</p>
                                        {perilaku.poin && (
                                            <span className="inline-flex items-center px-2 py-1 bg-primary-600 text-white text-xs font-bold rounded-md">
                                                {perilaku.jenis === 'Positif' ? '+' : '-'}{perilaku.poin} Poin
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={Heart}
                                title="Belum Ada Data Perilaku"
                                description="Catatan perilaku santri belum tersedia."
                            />
                        )}
                    </Card>
                )}

                {/* Tab: Catatan Guru */}
                {activeTab === 'catatan' && (
                    <Card>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">
                            Catatan Guru / Taujihad
                        </h3>
                        {taujihadData.length > 0 ? (
                            <div className="space-y-4">
                                {taujihadData.map(catatan => (
                                    <div key={catatan.id} className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                                            <div className="flex items-center gap-2 text-sm font-medium text-primary-700">
                                                <Users size={16} />
                                                {catatan.guru?.nama || 'Guru / Ustadz'}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {formatDate(catatan.tanggal)}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                                            {catatan.isi}
                                        </p>
                                        {catatan.rekomendasi && (
                                            <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm">
                                                <Star size={16} className="mt-0.5 shrink-0" />
                                                <span>{catatan.rekomendasi}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={BookOpen}
                                title="Belum Ada Catatan"
                                description="Catatan dari guru/pembina belum tersedia."
                            />
                        )}
                    </Card>
                )}
            </div>
        </div>
    )
}

export default EvaluasiWaliPage
