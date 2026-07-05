import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, Clock,
    AlertCircle, Filter, BarChart2
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
 * KehadiranWaliPage - Halaman untuk melihat data kehadiran santri
 * Read-only - wali hanya bisa melihat, tidak bisa mengedit
 * Refactored to use Global Layout System (Phase 2)
 */
const KehadiranWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [presensiData, setPresensiData] = useState([])
    const [stats, setStats] = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0 })
    const [filterBulan, setFilterBulan] = useState('')

    // Generate month options
    const getMonthOptions = () => {
        const options = []
        const now = new Date()
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            options.push({
                value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
            })
        }
        return options
    }

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

    // Fetch presensi data
    const fetchPresensiData = async (santriId) => {
        if (!santriId) return

        try {
            let query = supabase
                .from('presensi')
                .select('*')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            // Filter by month
            if (filterBulan) {
                const [year, month] = filterBulan.split('-')
                const startDate = `${year}-${month}-01`
                const endDate = new Date(parseInt(year), parseInt(month), 0)
                    .toISOString().split('T')[0]

                query = query
                    .gte('tanggal', startDate)
                    .lte('tanggal', endDate)
            } else {
                // Default: last 30 days
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                query = query.gte('tanggal', thirtyDaysAgo.toISOString().split('T')[0])
            }

            const { data, error } = await query

            if (error) throw error

            setPresensiData(data || [])

            // Calculate stats (Case-insensitive)
            const newStats = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
            if (data) {
                data.forEach(p => {
                    const statusKey = (p.status || '').toLowerCase()
                    if (statusKey === 'hadir' || statusKey === 'terlambat') {
                        newStats.hadir++
                    } else if (statusKey === 'izin') {
                        newStats.izin++
                    } else if (statusKey === 'sakit') {
                        newStats.sakit++
                    } else if (['alpha', 'alfa', 'alpa'].includes(statusKey)) {
                        newStats.alpha++
                    }
                })
            }
            setStats(newStats)

        } catch (error) {
            console.error('Error fetching presensi:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchPresensiData(selectedSantri.id)
        }
    }, [selectedSantri, filterBulan])

    const { formatDate } = useCalendar()

    const getStatusIcon = (status) => {
        switch (status) {
            case 'hadir': return <CheckCircle size={20} />
            case 'izin': return <Clock size={20} />
            case 'sakit': return <AlertCircle size={20} />
            case 'alpha': return <XCircle size={20} />
            default: return null
        }
    }

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'hadir': return 'bg-emerald-100 text-emerald-600'
            case 'izin': return 'bg-blue-100 text-blue-600'
            case 'sakit': return 'bg-amber-100 text-amber-600'
            case 'alpha': return 'bg-red-100 text-red-600'
            default: return 'bg-gray-100 text-gray-600'
        }
    }

    const getStatusLabel = (status) => {
        const s = status?.toLowerCase()
        const labels = {
            hadir: 'Hadir',
            terlambat: 'Terlambat',
            izin: 'Izin',
            sakit: 'Sakit',
            alpha: 'Alpha',
            alfa: 'Alpha',
            alpa: 'Alpha'
        }
        return labels[s] || status
    }

    const total = (stats.hadir || 0) + (stats.izin || 0) + (stats.sakit || 0) + (stats.alpha || 0)
    const persentaseHadir = total > 0 ? Math.round(((stats.hadir || 0) / total) * 100) : 0

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
                title="Data Kehadiran"
                description="Rekap kehadiran santri di pondok"
                icon={Calendar}
                backUrl="/wali/beranda"
            />

            {/* Premium Santri Selector (Horizontal Scroll) */}
            {santriList.length > 1 && (
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4">
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
            )}

            {/* Filter */}
            <div className="flex items-center gap-3">
                <Filter size={18} className="text-gray-400" />
                <select
                    value={filterBulan}
                    onChange={(e) => setFilterBulan(e.target.value)}
                    className="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                    <option value="">30 Hari Terakhir</option>
                    {getMonthOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-[2rem] text-white shadow-lg shadow-emerald-200/50 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="p-2 w-fit rounded-xl bg-white/20 backdrop-blur-md mb-3">
                            <CheckCircle size={20} />
                        </div>
                        <span className="block text-3xl font-black">{stats.hadir}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Hari Hadir</span>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-[2rem] text-white shadow-lg shadow-blue-200/50 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="p-2 w-fit rounded-xl bg-white/20 backdrop-blur-md mb-3">
                            <Clock size={20} />
                        </div>
                        <span className="block text-3xl font-black">{stats.izin}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Izin</span>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-[2rem] text-white shadow-lg shadow-amber-200/50 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="p-2 w-fit rounded-xl bg-white/20 backdrop-blur-md mb-3">
                            <AlertCircle size={20} />
                        </div>
                        <span className="block text-3xl font-black">{stats.sakit}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Sakit</span>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 rounded-[2rem] text-white shadow-lg shadow-rose-200/50 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="p-2 w-fit rounded-xl bg-white/20 backdrop-blur-md mb-3">
                            <XCircle size={20} />
                        </div>
                        <span className="block text-3xl font-black">{stats.alpha}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Alfa</span>
                    </div>
                </div>
            </div>

            {/* Premium Percentage Bar */}
            <div className="glass-card p-6 rounded-[2.5rem] border border-white/40 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                                <BarChart2 size={24} />
                            </div>
                            <div>
                                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Loyalitas Kehadiran</span>
                                <span className="font-black text-gray-900 uppercase">Persentase</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-3xl font-black text-indigo-600 leading-none">{persentaseHadir}%</span>
                        </div>
                    </div>
                    <div className="h-4 bg-gray-100/50 rounded-full overflow-hidden p-1 shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-out shadow-sm shadow-emerald-200"
                            style={{ width: `${persentaseHadir}%` }}
                        ></div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">
                            {persentaseHadir >= 90 ? '🌟 LUAR BIASA! Santri sangat disiplin.' :
                                persentaseHadir >= 75 ? '🔥 BAGUS! Pertahankan konsistensi.' :
                                    persentaseHadir >= 50 ? '⚠️ PERHATIAN! Perlu peningkatan.' :
                                        '🔴 KRITIS! Segera hubungi pengampu.'}
                        </span>
                    </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            </div>

            {/* Presensi List with Glass Cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Riwayat Absensi</h3>
                </div>

                {presensiData.length > 0 ? (
                    <div className="space-y-3">
                        {presensiData.map(presensi => (
                            <div key={presensi.id} className="glass-card flex items-center gap-5 p-5 bg-white/70 backdrop-blur-md border border-white/50 rounded-[2rem] shadow-lg group transition-all hover:scale-[1.01]">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${getStatusColorClass(presensi.status)}`}>
                                    {getStatusIcon(presensi.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {formatDate(presensi.tanggal)}
                                        </p>
                                        <h4 className="font-black text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                                            {presensi.keterangan?.replace('[Quraniyah] ', '') || 'Presensi Harian'}
                                        </h4>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${getStatusColorClass(presensi.status).replace('bg-', 'bg-opacity-20 bg-')}`}>
                                                {getStatusLabel(presensi.status)}
                                            </span>
                                            {presensi.keterangan?.includes('[Quraniyah]') && (
                                                <span className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">
                                                    Qur'aniyah
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-indigo-400 transition-colors" size={20} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Calendar}
                        title="Belum Ada Data Kehadiran"
                        message="Data kehadiran untuk periode ini belum tersedia."
                    />
                )}
            </div>
        </div>
    )
}

export default KehadiranWaliPage
