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
                    if (presensiStats.hasOwnProperty(p.status)) {
                        presensiStats[p.status]++
                    }
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
        <div className="space-y-6">
            {/* Standard Page Header */}
            <PageHeader
                title="Beranda Wali"
                description={`Assalamu'alaikum, ${userProfile?.nama || 'Bapak/Ibu'} 👋`}
                icon={BookOpen}
                actions={
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw size={16} className="mr-2" />
                        Refresh
                    </Button>
                }
            />

            {/* Santri Selector (jika lebih dari 1 santri) */}
            {santriList.length > 1 && (
                <div className="flex overflow-x-auto gap-4 pb-2">
                    {santriList.map(santri => (
                        <div key={santri.id} className="min-w-[300px]">
                            <SantriCard
                                santri={santri}
                                selected={selectedSantri?.id === santri.id}
                                onClick={() => setSelectedSantri(santri)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Santri Info Card (If only 1) */}
            {selectedSantri && santriList.length === 1 && (
                <SantriCard santri={selectedSantri} showDetails />
            )}

            {/* Global Grid System: Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hafalan Terakhir */}
                <Card className="p-6 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <BookOpen size={24} />
                        </div>
                        <Badge variant="success">Terbaru</Badge>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-gray-500 font-medium">Hafalan Terakhir</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {dashboardData.hafalanTerakhir?.surah || '-'}
                        </h3>
                        {dashboardData.hafalanTerakhir?.tanggal && (
                            <p className="text-xs text-gray-400">
                                {formatDate(dashboardData.hafalanTerakhir.tanggal)}
                            </p>
                        )}
                    </div>
                </Card>

                {/* Kehadiran */}
                <Card className="p-6 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Calendar size={24} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-gray-500 font-medium">Kehadiran (30 Hari)</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {dashboardData.presensiStats.hadir} <span className="text-sm font-normal text-gray-500">Hadir</span>
                        </h3>
                    </div>
                </Card>

                {/* Status SPP */}
                <Card className={`p-6 border-l-4 ${dashboardData.tagihanBelumLunas.length > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${dashboardData.tagihanBelumLunas.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-gray-500 font-medium">Status Pembayaran</p>
                        {dashboardData.tagihanBelumLunas.length > 0 ? (
                            <h3 className="text-2xl font-bold text-red-600">
                                {dashboardData.tagihanBelumLunas.length} <span className="text-sm font-normal text-gray-500">Tagihan</span>
                            </h3>
                        ) : (
                            <h3 className="text-2xl font-bold text-green-600">Lunas</h3>
                        )}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Tagihan & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tagihan Belum Lunas */}
                    {dashboardData.tagihanBelumLunas.length > 0 && (
                        <Card title="Tagihan Belum Lunas">
                            <div className="divide-y divide-gray-100">
                                {dashboardData.tagihanBelumLunas.map(tagihan => (
                                    <div key={tagihan.id} className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50 transition-colors px-4 -mx-4">
                                        <div className="pl-4">
                                            <p className="text-sm font-medium text-gray-900">
                                                {tagihan.kategori?.nama || 'Pembayaran'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Jatuh tempo: {formatDate(tagihan.jatuh_tempo)}
                                            </p>
                                        </div>
                                        <div className="pr-4 text-right">
                                            <span className="block text-sm font-bold text-red-600 mb-1">
                                                {formatCurrency(tagihan.jumlah)}
                                            </span>
                                            <Badge variant="danger">Belum Lunas</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <Link to="/wali/keuangan" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                    Lihat Semua Tagihan <ChevronRight size={16} />
                                </Link>
                            </div>
                        </Card>
                    )}

                    {/* Quick Access Grid */}
                    <Card title="Akses Cepat">
                        <div className="grid grid-cols-3 gap-4">
                            <Link to="/wali/akademik/hafalan" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-gray-100 group">
                                <BookOpen size={24} className="text-gray-400 group-hover:text-primary-600 mb-2" />
                                <span className="text-sm font-medium">Hafalan</span>
                            </Link>
                            <Link to="/wali/keuangan" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-gray-100 group">
                                <Wallet size={24} className="text-gray-400 group-hover:text-primary-600 mb-2" />
                                <span className="text-sm font-medium">Tagihan</span>
                            </Link>
                            <Link to="/wali/akademik/kehadiran" className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-gray-100 group">
                                <Calendar size={24} className="text-gray-400 group-hover:text-primary-600 mb-2" />
                                <span className="text-sm font-medium">Kehadiran</span>
                            </Link>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Pengumuman */}
                <div className="lg:col-span-1">
                    <Card title="Pengumuman Terbaru" className="h-full">
                        {dashboardData.pengumumanTerbaru.length > 0 ? (
                            <div className="space-y-4">
                                {dashboardData.pengumumanTerbaru.map(pengumuman => (
                                    <div key={pengumuman.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="info" size="sm">{pengumuman.kategori}</Badge>
                                            <span className="text-xs text-gray-500">{formatDate(pengumuman.tanggal_publish)}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{pengumuman.judul}</h4>
                                        <p className="text-xs text-gray-600 line-clamp-3">
                                            {pengumuman.isi}
                                        </p>
                                    </div>
                                ))}
                                <div className="pt-2">
                                    <Link to="/wali/informasi" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 justify-center">
                                        Lihat Semua Pengumuman <ChevronRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={Bell}
                                title="Tidak Ada Pengumuman"
                                description="Belum ada informasi terbaru dari pondok."
                                compact
                            />
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default WaliDashboardPage
