import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Calendar, CheckCircle, XCircle, Clock,
    AlertCircle, Filter, BarChart2
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
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

            // Calculate stats
            const newStats = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
            if (data) {
                data.forEach(p => {
                    if (newStats.hasOwnProperty(p.status)) {
                        newStats[p.status]++
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

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

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
        const labels = {
            hadir: 'Hadir',
            izin: 'Izin',
            sakit: 'Sakit',
            alpha: 'Alpha'
        }
        return labels[status] || status
    }

    const total = stats.hadir + stats.izin + stats.sakit + stats.alpha
    const persentaseHadir = total > 0 ? Math.round((stats.hadir / total) * 100) : 0

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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                        <CheckCircle size={20} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stats.hadir}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Hadir</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600 mb-2">
                        <Clock size={20} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stats.izin}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Izin</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 rounded-full bg-amber-100 text-amber-600 mb-2">
                        <AlertCircle size={20} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stats.sakit}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Sakit</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 rounded-full bg-red-100 text-red-600 mb-2">
                        <XCircle size={20} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{stats.alpha}</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Alpha</span>
                </div>
            </div>

            {/* Percentage Bar */}
            <Card>
                <div className="p-2">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-gray-600">
                            <BarChart2 size={18} />
                            <span className="font-medium text-sm">Persentase Kehadiran</span>
                        </div>
                        <span className="font-bold text-xl text-primary-600">{persentaseHadir}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${persentaseHadir}%` }}
                        ></div>
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                        {persentaseHadir >= 90 ? '🎉 Excellent! Kehadiran sangat baik.' :
                            persentaseHadir >= 75 ? '👍 Baik! Pertahankan kehadiran.' :
                                persentaseHadir >= 50 ? '⚠️ Perlu ditingkatkan.' :
                                    '❌ Kehadiran perlu perhatian khusus.'}
                    </p>
                </div>
            </Card>

            {/* Presensi List */}
            <Card>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Riwayat Kehadiran ({presensiData.length})
                </h3>

                {presensiData.length > 0 ? (
                    <div className="space-y-3">
                        {presensiData.map(presensi => (
                            <div key={presensi.id} className="flex items-start gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getStatusColorClass(presensi.status)}`}>
                                    {getStatusIcon(presensi.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                        <p className="font-medium text-gray-900">
                                            {formatDate(presensi.tanggal)}
                                        </p>
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusColorClass(presensi.status).replace('bg-', 'bg-opacity-20 bg-')}`}>
                                            {getStatusLabel(presensi.status)}
                                        </span>
                                    </div>
                                    {presensi.keterangan && (
                                        <p className="text-sm text-gray-500 mt-1">{presensi.keterangan}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Calendar}
                        title="Belum Ada Data Kehadiran"
                        description="Data kehadiran untuk periode ini belum tersedia."
                    />
                )}
            </Card>
        </div>
    )
}

export default KehadiranWaliPage
