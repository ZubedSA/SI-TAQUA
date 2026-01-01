import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    AlertTriangle,
    AlertCircle,
    Bell,
    FileText,
    Newspaper,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Shield,
    UserCog,
    Eye,
    Calendar,
    ClipboardList,
    ChevronRight,
    Search
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Dashboard Pengurus - Pusat pembinaan dan pengawasan santri
 * Fokus: Pelanggaran, Santri Bermasalah, Pengumuman, Buletin
 */
const PengurusDashboard = () => {
    const [stats, setStats] = useState({
        totalPelanggaran: 0,
        kasusOpen: 0,
        kasusProses: 0,
        kasusSelesai: 0,
        santriBermasalah: 0,
        pengumumanAktif: 0,
        buletinBulanIni: 0
    })
    const [recentPelanggaran, setRecentPelanggaran] = useState([])
    const [loading, setLoading] = useState(true)
    const [greeting, setGreeting] = useState('')

    const updateGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 4 && hour < 11) {
            setGreeting('Selamat Pagi')
        } else if (hour >= 11 && hour < 15) {
            setGreeting('Selamat Siang')
        } else if (hour >= 15 && hour < 18) {
            setGreeting('Selamat Sore')
        } else {
            setGreeting('Selamat Malam')
        }
    }

    useEffect(() => {
        fetchStats()
        fetchRecentPelanggaran()
        updateGreeting()

        const interval = setInterval(updateGreeting, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            // Fetch pelanggaran stats
            const { data: pelanggaranData, error: pelanggaranError } = await supabase
                .from('pelanggaran')
                .select('status')

            if (pelanggaranError) {
                console.log('Pelanggaran table may not exist yet:', pelanggaranError.message)
            }

            const pelanggaran = pelanggaranData || []
            const kasusOpen = pelanggaran.filter(p => p.status === 'OPEN').length
            const kasusProses = pelanggaran.filter(p => p.status === 'PROSES').length
            const kasusSelesai = pelanggaran.filter(p => p.status === 'SELESAI').length

            // Fetch santri bermasalah count
            const { count: santriBermasalahCount } = await supabase
                .from('santri_bermasalah')
                .select('*', { count: 'exact', head: true })
                .catch(() => ({ count: 0 }))

            // Fetch pengumuman aktif
            const today = new Date().toISOString().split('T')[0]
            const { count: pengumumanCount } = await supabase
                .from('pengumuman_internal')
                .select('*', { count: 'exact', head: true })
                .eq('is_archived', false)
                .lte('mulai_tampil', today)
                .or(`selesai_tampil.is.null,selesai_tampil.gte.${today}`)
                .catch(() => ({ count: 0 }))

            // Fetch buletin bulan ini
            const currentMonth = new Date().getMonth() + 1
            const currentYear = new Date().getFullYear()
            const { count: buletinCount } = await supabase
                .from('buletin_pondok')
                .select('*', { count: 'exact', head: true })
                .eq('bulan', currentMonth)
                .eq('tahun', currentYear)
                .catch(() => ({ count: 0 }))

            setStats({
                totalPelanggaran: pelanggaran.length,
                kasusOpen,
                kasusProses,
                kasusSelesai,
                santriBermasalah: santriBermasalahCount || 0,
                pengumumanAktif: pengumumanCount || 0,
                buletinBulanIni: buletinCount || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchRecentPelanggaran = async () => {
        try {
            const { data, error } = await supabase
                .from('pelanggaran')
                .select(`
                    id,
                    tanggal,
                    jenis,
                    tingkat,
                    status,
                    santri:santri_id (
                        id,
                        nama,
                        nis
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) {
                console.log('Pelanggaran table may not exist yet')
                return
            }

            setRecentPelanggaran(data || [])
        } catch (error) {
            console.log('Error fetching recent pelanggaran:', error.message)
        }
    }

    const getTingkatLabel = (tingkat) => {
        const labels = {
            1: { text: 'Ringan', class: 'bg-green-100 text-green-700' },
            2: { text: 'Sedang', class: 'bg-yellow-100 text-yellow-700' },
            3: { text: 'Berat', class: 'bg-red-100 text-red-700' },
            4: { text: 'Sangat Berat', class: 'bg-purple-100 text-purple-700' }
        }
        return labels[tingkat] || { text: 'Unknown', class: 'bg-gray-100 text-gray-700' }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'OPEN': return <AlertCircle size={16} className="text-red-500" />
            case 'PROSES': return <Clock size={16} className="text-yellow-500" />
            case 'SELESAI': return <CheckCircle size={16} className="text-green-500" />
            default: return <XCircle size={16} className="text-gray-400" />
        }
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold mb-2">👋 {greeting}, Pengurus!</h1>
                        <p className="text-emerald-50 text-base lg:text-lg">Dashboard Pembinaan & Pengawasan Santri</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 border border-white/30">
                        <UserCog size={20} />
                        <span className="font-medium text-sm">Dashboard Pengurus</span>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-12 -mb-12"></div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pelanggaran Stats */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">Total Pelanggaran</p>
                            <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalPelanggaran}</h3>
                        </div>
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">Kasus Open</p>
                            <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.kasusOpen}</h3>
                        </div>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(stats.kasusOpen / (stats.totalPelanggaran || 1)) * 100}%` }}></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">Dalam Proses</p>
                            <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.kasusProses}</h3>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stats.kasusProses / (stats.totalPelanggaran || 1)) * 100}%` }}></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">Selesai</p>
                            <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.kasusSelesai}</h3>
                        </div>
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.kasusSelesai / (stats.totalPelanggaran || 1)) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 shrink-0">
                        <Users size={24} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.santriBermasalah}</h4>
                        <p className="text-sm text-slate-500">Santri Bermasalah</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 shrink-0">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.pengumumanAktif}</h4>
                        <p className="text-sm text-slate-500">Pengumuman Aktif</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shrink-0">
                        <Newspaper size={24} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.buletinBulanIni}</h4>
                        <p className="text-sm text-slate-500">Buletin Bulan Ini</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Pelanggaran */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-slate-400" />
                            Pelanggaran Terbaru
                        </h3>
                        <Link to="/pengurus/pelanggaran" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors">
                            Lihat Semua <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="p-5 flex-1">
                        {recentPelanggaran.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={32} className="text-slate-300" />
                                </div>
                                <p className="text-sm">Belum ada pelanggaran tercatat</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentPelanggaran.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                        <div className="shrink-0 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                                            {getStatusIcon(item.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 truncate">{item.santri?.nama || 'Unknown'}</p>
                                            <p className="text-xs text-slate-500 truncate">{item.jenis}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-1 ${getTingkatLabel(item.tingkat).class}`}>
                                                {getTingkatLabel(item.tingkat).text}
                                            </span>
                                            <p className="text-xs text-slate-400">{formatDate(item.tanggal)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions & Summary */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ClipboardList size={18} className="text-slate-400" />
                            Aksi Cepat
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link to="/pengurus/pelanggaran/create" className="p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-red-100 group">
                                <AlertTriangle size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Catat Pelanggaran</span>
                            </Link>
                            <Link to="/pengurus/santri-bermasalah" className="p-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-orange-100 group">
                                <Users size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Santri Bermasalah</span>
                            </Link>
                            <Link to="/pengurus/pengumuman" className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-blue-100 group">
                                <Bell size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Buat Pengumuman</span>
                            </Link>
                            <Link to="/pengurus/buletin" className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-emerald-100 group">
                                <Newspaper size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Upload Buletin</span>
                            </Link>
                            <Link to="/pengurus/informasi" className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-purple-100 group">
                                <FileText size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Info Pondok</span>
                            </Link>
                            <Link to="/pengurus/arsip" className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-slate-100 group">
                                <Eye size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Lihat Arsip</span>
                            </Link>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={18} className="text-slate-400" />
                                Ringkasan
                            </h3>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1">
                                <Calendar size={12} /> Bulan Ini
                            </span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-red-50/50 rounded-lg border border-red-50">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <span className="block text-xl font-bold text-slate-800">{stats.kasusOpen + stats.kasusProses}</span>
                                    <span className="text-xs text-red-600 font-medium">Perlu Ditangani</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-50">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <CheckCircle size={18} />
                                </div>
                                <div>
                                    <span className="block text-xl font-bold text-slate-800">{stats.kasusSelesai}</span>
                                    <span className="text-xs text-emerald-600 font-medium">Terselesaikan</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-50">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <span className="block text-xl font-bold text-slate-800">
                                        {stats.totalPelanggaran > 0
                                            ? Math.round((stats.kasusSelesai / stats.totalPelanggaran) * 100)
                                            : 100}%
                                    </span>
                                    <span className="text-xs text-blue-600 font-medium">Rate Penyelesaian</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PengurusDashboard
