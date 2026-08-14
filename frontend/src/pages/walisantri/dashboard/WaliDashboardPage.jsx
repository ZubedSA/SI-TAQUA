import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    BookOpen, Wallet, Calendar, Bell, CheckCircle, AlertCircle,
    Clock, TrendingUp, ChevronRight, RefreshCw, User
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useCalendar } from '../../../context/CalendarContext'
import SantriCard from '../components/SantriCard'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'


/**
 * WaliDashboardPage - Dashboard utama untuk Portal Wali Santri
 * Refactored to use Global Layout System (Phase 2)
 */
const WaliDashboardPage = () => {
    const { user, userProfile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [dashboardData, setDashboardData] = useState({
        hafalanTerakhir: null,
        presensiStats: { hadir: 0, izin: 0, alpha: 0 },
        tagihanBelumLunas: [],
        pengumumanTerbaru: []
    })

    // Fetch santri list milik wali
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

    // Fetch dashboard data untuk santri yang dipilih
    const fetchDashboardData = async (santriId) => {
        if (!santriId) return

        try {
            // Fetch hafalan terakhir
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select('*, guru:penguji_id (nama)')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })
                .limit(1)
                .single()

            // Fetch presensi stats (30 hari terakhir)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { data: presensiData } = await supabase
                .from('presensi')
                .select('status')
                .eq('santri_id', santriId)
                .gte('tanggal', thirtyDaysAgo.toISOString().split('T')[0])

            const presensiStats = {
                hadir: 0,
                izin: 0,
                sakit: 0,
                alpha: 0
            }

            if (presensiData) {
                presensiData.forEach(p => {
                    const status = (p.status || '').toLowerCase()
                    if (status === 'hadir' || status === 'terlambat') presensiStats.hadir++
                    else if (status === 'izin') presensiStats.izin++
                    else if (status === 'sakit') presensiStats.sakit++
                    else if (['alpha', 'alfa', 'alpa'].includes(status)) presensiStats.alpha++
                })
            }

            // Fetch tagihan belum lunas
            const { data: tagihanData } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama)')
                .eq('santri_id', santriId)
                .neq('status', 'Lunas')
                .order('jatuh_tempo')
                .limit(5)

            // Fetch pengumuman terbaru
            const { data: pengumumanData } = await supabase
                .from('pengumuman')
                .select('*')
                .eq('is_active', true)
                .order('tanggal_publish', { ascending: false })
                .limit(3)

            setDashboardData({
                hafalanTerakhir: hafalanData,
                presensiStats: presensiStats,
                tagihanBelumLunas: tagihanData || [],
                pengumumanTerbaru: pengumumanData || []
            })
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchDashboardData(selectedSantri.id)
        }
    }, [selectedSantri])

    const handleRefresh = () => {
        setLoading(true)
        fetchSantriList().finally(() => setLoading(false))
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const { formatDate } = useCalendar()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    if (santriList.length === 0) {
        return (
            <div className="p-6">
                <EmptyState
                    icon={User}
                    title="Belum Ada Data Santri"
                    description="Akun Anda belum terhubung dengan data santri. Silakan hubungi admin pondok."
                />
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-24 sm:pb-8">
            {/* Premium Personalized Header */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 sm:p-8 text-white shadow-xl sm:shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                    <div className="space-y-1.5 sm:space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Portal Wali Santri Aktif
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            Assalamu'alaikum, <br className="sm:hidden" />
                            <span>{userProfile?.nama?.split(' ')[0] || 'Bapak/Ibu'}</span>
                        </h1>
                        <p className="text-indigo-100 text-xs sm:text-sm md:text-base max-w-md font-medium opacity-90">
                            Selamat datang kembali. Berikut ringkasan aktivitas dan administrasi santri Anda hari ini.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-end md:self-auto">
                        <button
                            onClick={handleRefresh}
                            className="p-2.5 sm:p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all active:scale-95 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>
            </div>

            {/* Santri Selection - Premium Scroll */}
            {santriList.length > 1 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Pilih Santri</h3>
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Total: {santriList.length}</span>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-2 px-2 mask-linear-fade">
                        {santriList.map(santri => (
                            <div key={santri.id} className="min-w-[260px] transform transition-all duration-300">
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

            {/* Main Info Display (If only 1 santri or currently showing details) */}
            {selectedSantri && (
                <div className="space-y-8">
                    {/* Stats Grid - Glassmorphism Premium */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                        {/* Hafalan Card */}
                        <div className="glass-card group p-4 sm:p-6 rounded-2xl md:rounded-[2rem] bg-emerald-50/50 hover:bg-emerald-50 transition-all duration-300 border border-emerald-100/50 shadow-sm sm:shadow-lg active:scale-95 touch-manipulation">
                            <div className="flex justify-between items-start mb-3 sm:mb-6">
                                <div className="p-3 sm:p-4 bg-emerald-500 text-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex flex-col items-end">
                                    <Badge variant="success">Akademik</Badge>
                                    <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Hafalan</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Hafalan Terakhir</p>
                                <h3 className="text-xl sm:text-2xl font-black text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                                    {dashboardData.hafalanTerakhir?.surah || 'Belum ada data'}
                                </h3>
                                {dashboardData.hafalanTerakhir?.tanggal && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                        <Calendar size={12} className="text-emerald-400" />
                                        {formatDate(dashboardData.hafalanTerakhir.tanggal)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Presensi Card */}
                        <div className="glass-card group p-4 sm:p-6 rounded-2xl md:rounded-[2rem] bg-blue-50/50 hover:bg-blue-50 transition-all duration-300 border border-blue-100/50 shadow-sm sm:shadow-lg active:scale-95 touch-manipulation">
                            <div className="flex justify-between items-start mb-3 sm:mb-6">
                                <div className="p-3 sm:p-4 bg-blue-500 text-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex flex-col items-end">
                                    <Badge variant="info">Disiplin</Badge>
                                    <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Kehadiran</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Kehadiran (30 Hari)</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-blue-700 transition-colors">
                                        {dashboardData.presensiStats.hadir}
                                    </h3>
                                    <span className="text-xs sm:text-sm font-bold text-gray-500">Hari Hadir</span>
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2 sm:mt-3">
                                    <div
                                        className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min((dashboardData.presensiStats.hadir / 25) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Keuangan Card */}
                        <div className={`glass-card group p-4 sm:p-6 rounded-2xl md:rounded-[2rem] transition-all duration-300 border shadow-sm sm:shadow-lg active:scale-95 touch-manipulation ${dashboardData.tagihanBelumLunas.length > 0
                            ? 'bg-rose-50/50 hover:bg-rose-50 border-rose-100/50 hover:shadow-rose-200/50'
                            : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100/50 hover:shadow-indigo-200/50'
                            }`}>
                            <div className="flex justify-between items-start mb-3 sm:mb-6">
                                <div className={`p-3 sm:p-4 text-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg group-hover:scale-110 transition-transform ${dashboardData.tagihanBelumLunas.length > 0 ? 'bg-rose-500 shadow-rose-200' : 'bg-indigo-500 shadow-indigo-200'
                                    }`}>
                                    <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex flex-col items-end">
                                    <Badge variant={dashboardData.tagihanBelumLunas.length > 0 ? 'danger' : 'success'}>Keuangan</Badge>
                                    <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Administrasi</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className={`text-xs font-bold uppercase tracking-wider ${dashboardData.tagihanBelumLunas.length > 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                                    Status Pembayaran
                                </p>
                                {dashboardData.tagihanBelumLunas.length > 0 ? (
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-3xl font-black text-rose-600 group-hover:text-rose-700 transition-colors">
                                            {dashboardData.tagihanBelumLunas.length}
                                        </h3>
                                        <span className="text-sm font-bold text-gray-500 uppercase">Tagihan Aktif</span>
                                    </div>
                                ) : (
                                    <h3 className="text-3xl font-black text-indigo-600 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">
                                        Lunas
                                    </h3>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Section: Detailed Info & Quick Access */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Middle Column: Tagihan (Priority) */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Premium Quick Access */}
                            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm border-b-4 border-b-indigo-500/20">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                        <TrendingUp className="text-indigo-600" size={24} />
                                        Akses Cepat
                                    </h3>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <Link to="/wali/akademik/hafalan" className="flex flex-col items-center gap-4 group">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-[1.5rem] group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 group-hover:rotate-6 group-hover:shadow-xl group-hover:shadow-indigo-200">
                                            <BookOpen size={28} />
                                        </div>
                                        <span className="text-xs sm:text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Hafalan</span>
                                    </Link>
                                    <Link to="/wali/keuangan" className="flex flex-col items-center gap-4 group">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-rose-50 text-rose-600 rounded-[1.5rem] group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 group-hover:-rotate-6 group-hover:shadow-xl group-hover:shadow-rose-200">
                                            <Wallet size={28} />
                                        </div>
                                        <span className="text-xs sm:text-sm font-bold text-gray-700 group-hover:text-rose-600 transition-colors">Keuangan</span>
                                    </Link>
                                    <Link to="/wali/akademik/kehadiran" className="flex flex-col items-center gap-4 group">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-[1.5rem] group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 group-hover:rotate-6 group-hover:shadow-xl group-hover:shadow-emerald-200">
                                            <Calendar size={28} />
                                        </div>
                                        <span className="text-xs sm:text-sm font-bold text-gray-700 group-hover:text-emerald-600 transition-colors">Presensi</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Tagihan Section */}
                            {dashboardData.tagihanBelumLunas.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tagihan Ringkas</h3>
                                        <Link to="/wali/keuangan" className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors">
                                            BAYAR SEKARANG <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                    <div className="space-y-3">
                                        {dashboardData.tagihanBelumLunas.map(tagihan => (
                                            <div key={tagihan.id} className="p-5 rounded-[1.5rem] bg-white border border-gray-100 flex justify-between items-center hover:border-rose-200 transition-all shadow-sm">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-gray-900">{tagihan.kategori?.nama || 'Tagihan'}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tempo: {formatDate(tagihan.jatuh_tempo)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-lg font-black text-rose-600">{formatCurrency(tagihan.jumlah)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Info & Announcements */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm overflow-hidden relative">
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <Bell className="text-amber-500 animate-bounce" size={24} />
                                    <h3 className="text-lg font-black text-gray-900">Pengumuman</h3>
                                </div>
                                {dashboardData.pengumumanTerbaru.length > 0 ? (
                                    <div className="space-y-4 relative z-10">
                                        {dashboardData.pengumumanTerbaru.map(pengumuman => (
                                            <div key={pengumuman.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white transition-all cursor-default">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="info" size="sm">{pengumuman.kategori}</Badge>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(pengumuman.tanggal_publish)}</span>
                                                </div>
                                                <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">{pengumuman.judul}</h4>
                                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                    {pengumuman.isi}
                                                </p>
                                            </div>
                                        ))}
                                        <Link to="/wali/informasi" className="block text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 py-3 border-t border-gray-100 mt-2 transition-colors uppercase tracking-widest">
                                            Lihat Arsip Berita
                                        </Link>
                                    </div>
                                ) : (
                                    <EmptyState icon={Bell} title="Sunyi Senyap" description="Belum ada kabar terbaru." compact />
                                )}
                                {/* Background Decorative Circle */}
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-amber-50 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WaliDashboardPage
