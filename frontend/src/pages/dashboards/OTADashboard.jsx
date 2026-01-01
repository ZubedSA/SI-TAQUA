import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Wallet, TrendingUp, TrendingDown, Users,
    ChevronRight, Info, HeartHandshake, AlertCircle,
    ArrowUpCircle, ArrowDownCircle, PieChart, BarChart3,
    Plus, RefreshCw, Target, Award, Shield, FileText
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'

/**
 * OTA Dashboard - Professional Design
 * Consistent with Admin & Pengurus styling
 */
const OTADashboard = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Stats
    const [stats, setStats] = useState({
        otaCount: 0,
        santriCount: 0,
        totalDonasi: 0,
        pengeluaran: 0,
        saldo: 0,
        donasiThisMonth: 0
    })

    // Data Lists
    const [recentPemasukan, setRecentPemasukan] = useState([])
    const [recentPengeluaran, setRecentPengeluaran] = useState([])
    const [topDonors, setTopDonors] = useState([])
    const [announcements, setAnnouncements] = useState([])

    useEffect(() => {
        if (user) fetchDashboardData()
    }, [user])

    const fetchDashboardData = async () => {
        setLoading(true)
        setError(null)

        try {
            const currentMonth = new Date().getMonth() + 1
            const currentYear = new Date().getFullYear()

            const [otaRes, santriRes, pemasukanRes, pengeluaranRes, announcementRes] = await Promise.all([
                supabase.from('orang_tua_asuh').select('id, nama').eq('status', true),
                supabase.from('ota_santri').select('id'),
                supabase.from('ota_pemasukan').select('*, ota:ota_id(nama)').order('tanggal', { ascending: false }),
                supabase.from('ota_pengeluaran').select('*').order('tanggal', { ascending: false }),
                supabase.from('ota_announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(3)
            ])

            const pemasukan = pemasukanRes.data || []
            const pengeluaran = pengeluaranRes.data || []

            // Calculate totals
            const totalDonasi = pemasukan.reduce((sum, item) => sum + Number(item.jumlah), 0)
            const totalPengeluaran = pengeluaran.reduce((sum, item) => sum + Number(item.jumlah), 0)

            const donasiThisMonth = pemasukan
                .filter(item => {
                    const d = new Date(item.tanggal)
                    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear
                })
                .reduce((sum, item) => sum + Number(item.jumlah), 0)

            // Top donors
            const donorMap = {}
            pemasukan.forEach(item => {
                const name = item.ota?.nama || 'Unknown'
                donorMap[name] = (donorMap[name] || 0) + Number(item.jumlah)
            })
            const topDonorsList = Object.entries(donorMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([nama, total]) => ({ nama, total }))

            setStats({
                otaCount: otaRes.data?.length || 0,
                santriCount: santriRes.data?.length || 0,
                totalDonasi,
                pengeluaran: totalPengeluaran,
                saldo: totalDonasi - totalPengeluaran,
                donasiThisMonth
            })

            setRecentPemasukan(pemasukan.slice(0, 5))
            setRecentPengeluaran(pengeluaran.slice(0, 5))
            setTopDonors(topDonorsList)
            setAnnouncements(announcementRes.data || [])

        } catch (err) {
            console.error('Error fetching dashboard:', err)
            setError('Gagal memuat data. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner label="Memuat Dashboard OTA..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
                <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-red-800 mb-2">Terjadi Kesalahan</h3>
                    <p className="text-red-600 mb-6">{error}</p>
                    <button
                        onClick={fetchDashboardData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                    >
                        <RefreshCw size={16} /> Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    const progressPercent = stats.totalDonasi > 0 ? Math.min(Math.round((stats.pengeluaran / stats.totalDonasi) * 100), 100) : 0

    return (
        <div className="p-4 lg:p-6 space-y-6">

            {/* === WELCOME HEADER === */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                            <HeartHandshake size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold mb-1">Dashboard Orang Tua Asuh</h1>
                            <p className="text-emerald-50 text-sm lg:text-base">Kelola program donasi dan monitoring santri penerima</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium"
                            onClick={() => navigate('/ota/pemasukan')}
                        >
                            <Plus size={16} /> Tambah Donasi
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg shadow-md transition-colors text-sm font-medium"
                            onClick={() => navigate('/ota/laporan')}
                        >
                            <BarChart3 size={16} /> Lihat Laporan
                        </button>
                    </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-12 -mb-12"></div>
            </div>

            {/* === STATS GRID === */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-100 transition-colors"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wide">Total OTA Aktif</p>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">{stats.otaCount}</h3>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Users size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-purple-100 transition-colors"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wide">Santri Penerima</p>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">{stats.santriCount}</h3>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                            <Target size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-100 transition-colors"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wide">Total Donasi</p>
                            <h3 className="text-2xl font-bold text-slate-800 mb-1">{formatRupiah(stats.totalDonasi)}</h3>
                            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <ArrowUpCircle size={12} /> +{formatRupiah(stats.donasiThisMonth)} bulan ini
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>

                <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}>
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-6 -mt-6 transition-colors ${stats.saldo >= 0 ? 'bg-emerald-50 group-hover:bg-emerald-100' : 'bg-red-50 group-hover:bg-red-100'}`}></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wide">Saldo Tersedia</p>
                            <h3 className={`text-2xl font-bold mb-2 ${stats.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(stats.saldo)}</h3>
                        </div>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.saldo >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <Wallet size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* === MAIN CONTENT === */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Recent Pemasukan */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                                    <ArrowUpCircle size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Donasi Terbaru</h3>
                                    <p className="text-xs text-slate-500">5 donasi terakhir</p>
                                </div>
                            </div>
                            <button onClick={() => navigate('/ota/pemasukan')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors">
                                Lihat Semua <ChevronRight size={16} />
                            </button>
                        </div>
                        <div>
                            {recentPemasukan.length > 0 ? recentPemasukan.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                                            {item.ota?.nama?.substring(0, 2).toUpperCase() || 'OT'}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-700">{item.ota?.nama || '-'}</h4>
                                            <p className="text-xs text-slate-500">{formatDate(item.tanggal)}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-emerald-600">{formatRupiah(item.jumlah)}</span>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-400">
                                    <TrendingUp className="mx-auto mb-2 opacity-50" size={32} />
                                    <p>Belum ada data donasi</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Pengeluaran */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                                    <ArrowDownCircle size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Pengeluaran Terbaru</h3>
                                    <p className="text-xs text-slate-500">5 pengeluaran terakhir</p>
                                </div>
                            </div>
                            <button onClick={() => navigate('/ota/pengeluaran')} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors">
                                Lihat Semua <ChevronRight size={16} />
                            </button>
                        </div>
                        <div>
                            {recentPengeluaran.length > 0 ? recentPengeluaran.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                                            <TrendingDown size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-700">{item.keperluan || item.keterangan || '-'}</h4>
                                            <p className="text-xs text-slate-500">{formatDate(item.tanggal)}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-orange-600">-{formatRupiah(item.jumlah)}</span>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-400">
                                    <TrendingDown className="mx-auto mb-2 opacity-50" size={32} />
                                    <p>Belum ada data pengeluaran</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Financial Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                <PieChart size={18} />
                            </div>
                            <h3 className="font-bold text-slate-800">Ringkasan Keuangan</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Total Pemasukan</span>
                                <span className="font-semibold text-emerald-600">{formatRupiah(stats.totalDonasi)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Total Pengeluaran</span>
                                <span className="font-semibold text-orange-600">{formatRupiah(stats.pengeluaran)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-bold text-slate-800">Saldo Akhir</span>
                                <span className={`text-xl font-bold ${stats.saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {formatRupiah(stats.saldo)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Dana Tersalurkan</span>
                                <span>{progressPercent}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access - Refactored to Grid */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Shield size={18} className="text-slate-400" />
                            Akses Cepat
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('/admin/ota')} className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-blue-100 group">
                                <Users size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Data OTA</span>
                            </button>
                            <button onClick={() => navigate('/ota/santri')} className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-purple-100 group">
                                <Target size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Santri Penerima</span>
                            </button>
                            <button onClick={() => navigate('/ota/laporan')} className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-emerald-100 group col-span-2">
                                <FileText size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-semibold text-center">Laporan Keuangan</span>
                            </button>
                        </div>
                    </div>

                    {/* Top Donors */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                                <Award size={18} />
                            </div>
                            <h3 className="font-bold text-slate-800">Top Donatur</h3>
                        </div>
                        <div className="space-y-3">
                            {topDonors.length > 0 ? topDonors.map((donor, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm
                                        ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-700' : 'bg-slate-200 text-slate-500'}
                                    `}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{donor.nama}</p>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600">{formatRupiah(donor.total)}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400 text-center py-4">Belum ada data donatur</p>
                            )}
                        </div>
                    </div>

                    {/* Announcements */}
                    {announcements.length > 0 && (
                        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
                            <div className="flex items-center gap-2 mb-3 text-amber-800">
                                <Info size={18} />
                                <h3 className="font-bold">Pengumuman</h3>
                            </div>
                            <div className="space-y-3">
                                {announcements.map((item, idx) => (
                                    <div key={idx} className="pb-3 border-b border-amber-100 last:border-0">
                                        <h4 className="font-semibold text-amber-900 text-sm mb-1">{item.judul}</h4>
                                        <p className="text-xs text-amber-800 leading-relaxed line-clamp-2">{item.isi}</p>
                                        <time className="text-[10px] text-amber-600 mt-1 block">{formatDate(item.created_at)}</time>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OTADashboard
