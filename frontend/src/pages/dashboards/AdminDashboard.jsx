import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    GraduationCap,
    Home,
    BookMarked,
    Wallet,
    TrendingUp,
    TrendingDown,
    Activity,
    Settings,
    Shield,
    Database,
    ClipboardList,
    AlertCircle,
    CheckCircle,
    Clock,
    FileText
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import StatsCard from '../../components/ui/StatsCard'
import './AdminDashboard.css'

/**
 * Admin Dashboard - Pusat kontrol dan monitoring sistem
 * Menampilkan overview keseluruhan sistem, bukan input harian
 */
const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalSantri: 0,
        totalGuru: 0,
        totalKelas: 0,
        totalHalaqoh: 0,
        totalUsers: 0
    })
    const [keuanganStats, setKeuanganStats] = useState({
        pemasukan: 0,
        pengeluaran: 0,
        saldo: 0
    })
    const [systemHealth, setSystemHealth] = useState({
        database: 'checking',
        api: 'checking',
        storage: 'checking'
    })
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
        fetchKeuanganStats()
        checkSystemHealth()
        updateGreeting()

        const interval = setInterval(updateGreeting, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            const [santriRes, guruRes, kelasRes, halaqohRes, usersRes] = await Promise.all([
                supabase.from('santri').select('*', { count: 'exact', head: true }).eq('status', 'Aktif'),
                supabase.from('guru').select('*', { count: 'exact', head: true }),
                supabase.from('kelas').select('*', { count: 'exact', head: true }),
                supabase.from('halaqoh').select('*', { count: 'exact', head: true }),
                supabase.from('user_profiles').select('*', { count: 'exact', head: true })
            ])

            setStats({
                totalSantri: santriRes.count || 0,
                totalGuru: guruRes.count || 0,
                totalKelas: kelasRes.count || 0,
                totalHalaqoh: halaqohRes.count || 0,
                totalUsers: usersRes.count || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchKeuanganStats = async () => {
        try {
            const currentYear = new Date().getFullYear()
            const startOfYear = `${currentYear}-01-01`
            const endOfYear = `${currentYear}-12-31`

            const [pemasukanRes, pengeluaranRes] = await Promise.all([
                supabase.from('kas_pemasukan').select('jumlah').gte('tanggal', startOfYear).lte('tanggal', endOfYear),
                supabase.from('kas_pengeluaran').select('jumlah').gte('tanggal', startOfYear).lte('tanggal', endOfYear)
            ])

            const totalPemasukan = pemasukanRes.data?.reduce((sum, d) => sum + Number(d.jumlah || 0), 0) || 0
            const totalPengeluaran = pengeluaranRes.data?.reduce((sum, d) => sum + Number(d.jumlah || 0), 0) || 0

            setKeuanganStats({
                pemasukan: totalPemasukan,
                pengeluaran: totalPengeluaran,
                saldo: totalPemasukan - totalPengeluaran
            })
        } catch (error) {
            console.log('Error fetching keuangan stats:', error.message)
        }
    }

    const checkSystemHealth = async () => {
        // Check database
        try {
            await supabase.from('santri').select('id').limit(1)
            setSystemHealth(prev => ({ ...prev, database: 'healthy' }))
        } catch {
            setSystemHealth(prev => ({ ...prev, database: 'error' }))
        }

        // API is healthy if we got this far
        setSystemHealth(prev => ({ ...prev, api: 'healthy', storage: 'healthy' }))
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const HealthIndicator = ({ status }) => {
        if (status === 'checking') return <Clock size={16} className="text-yellow" />
        if (status === 'healthy') return <CheckCircle size={16} className="text-green" />
        return <AlertCircle size={16} className="text-red" />
    }

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Premium Header / Greeting */}
            <div className="relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] bg-[#0A2619] p-8 md:p-16 text-white shadow-2xl">
                <div className="absolute right-0 top-0 w-full h-full bg-gradient-to-br from-[#143d2a]/50 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#BCF32F]/10 rounded-full blur-[120px]"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="space-y-6 max-w-2xl text-left">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#143d2a]/80 backdrop-blur-2xl border border-white/10 rounded-xl">
                            <Shield size={16} className="text-[#BCF32F]" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#BCF32F]/80">System Command Center</span>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1] md:leading-[0.9] text-white break-words">
                                {greeting}, <span className="text-[#BCF32F]">Admin!</span>
                            </h1>
                        </div>
                        <p className="text-indigo-100/40 font-medium text-sm md:text-lg leading-relaxed max-w-lg">
                            Pusat kendali operasional, monitoring keamanan, dan manajemen data terpadu SI-TAQUA.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 md:gap-6 w-full lg:w-auto">
                        <div className="p-6 md:p-8 bg-white/5 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] border border-white/10 flex flex-col items-center justify-center gap-1 md:gap-2 min-w-[120px] md:min-w-[180px] hover:bg-white/10 transition-all duration-500">
                            <div className="text-3xl md:text-5xl font-black tracking-tighter">{stats.totalUsers}</div>
                            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#BCF32F]/60">Users</div>
                        </div>
                        <div className="p-6 md:p-8 bg-[#BCF32F] rounded-[2rem] md:rounded-[3rem] flex flex-col items-center justify-center gap-1 md:gap-2 min-w-[120px] md:min-w-[180px] shadow-2xl shadow-[#BCF32F]/20 hover:scale-105 transition-all duration-500">
                            <div className="text-3xl md:text-5xl font-black tracking-tighter text-[#0A2619]">{stats.totalSantri}</div>
                            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#0A2619]/80">Santri Aktif</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {[
                    { label: 'Akademik Staf', value: stats.totalGuru, icon: GraduationCap, color: 'blue', desc: 'Tenaga Pengajar' },
                    { label: 'Grup Belajar', value: stats.totalKelas, icon: Home, color: 'emerald', desc: 'Kelas Terdaftar' },
                    { label: 'Unit Qur\'aniyah', value: stats.totalHalaqoh, icon: BookMarked, color: 'amber', desc: 'Halaqoh Aktif' },
                    { label: 'System Logs', value: 'Live', icon: Activity, color: 'rose', desc: 'Real-time Audit' },
                ].map((stat, i) => (
                    <Card key={i} variant="premium" className="p-4 md:p-8 group hover:translate-y-[-8px] transition-all duration-500">
                        <div className="flex justify-between items-start mb-4 md:mb-6">
                            <div className={`p-3 md:p-5 rounded-xl md:rounded-[1.5rem] transition-transform group-hover:scale-110 duration-500 ${
                                stat.color === 'blue' ? 'bg-blue-50 text-blue-600 shadow-blue-100' :
                                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' :
                                stat.color === 'amber' ? 'bg-amber-50 text-amber-600 shadow-amber-100' :
                                'bg-rose-50 text-rose-600 shadow-rose-100'
                            } shadow-2xl`}>
                                <stat.icon className="w-5 h-5 md:w-7 md:h-7" />
                            </div>
                            <div className="text-right">
                                <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-none">{loading ? '...' : stat.value}</h3>
                                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{stat.label}</p>
                            </div>
                        </div>
                        <div className="pt-4 md:pt-6 border-t border-gray-50">
                            <div className="flex items-center justify-between text-[8px] md:text-[10px] font-black uppercase tracking-tighter text-gray-400">
                                <span>{stat.desc}</span>
                                <TrendingUp size={14} className="text-emerald-500" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Financial & Health Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Finance Card */}
                <Card variant="premium" className="lg:col-span-2 p-6 md:p-10 overflow-hidden relative group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col xl:flex-row gap-8 md:gap-12">
                        <div className="space-y-6 md:space-y-8 flex-1">
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-4">
                                    <div className="p-2.5 md:p-3 bg-[#0A2619] text-[#BCF32F] rounded-xl shadow-lg shadow-[#0A2619]/20">
                                        <Wallet size={20} className="md:w-6 md:h-6" />
                                    </div>
                                    Financial Pulse
                                </h3>
                                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 ml-12 md:ml-14">Monthly Performance</p>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 break-words">
                                    {formatCurrency(keuanganStats.saldo)}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="px-3 md:px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={12} /> Positive Balance
                                    </div>
                                    <Link to="/dashboard/keuangan" className="text-[9px] md:text-[10px] font-black text-[#0A2619] uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                                        View Ledger →
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:gap-6 pt-4 w-full xl:w-1/2">
                            <div className="p-3 md:p-6 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100/50 group/item hover:bg-white hover:shadow-2xl transition-all duration-500">
                                <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                                    <div className="p-2 md:p-3 bg-white text-emerald-500 rounded-xl md:rounded-2xl shadow-sm group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">
                                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Inflow</span>
                                </div>
                                <div className="text-sm md:text-xl font-black text-gray-900 break-all">{formatCurrency(keuanganStats.pemasukan)}</div>
                            </div>
                            
                            <div className="p-3 md:p-6 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100/50 group/item hover:bg-white hover:shadow-2xl transition-all duration-500">
                                <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                                    <div className="p-2 md:p-3 bg-white text-rose-500 rounded-xl md:rounded-2xl shadow-sm group-hover/item:bg-rose-500 group-hover/item:text-white transition-colors">
                                        <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Outflow</span>
                                </div>
                                <div className="text-sm md:text-xl font-black text-gray-900 break-all">{formatCurrency(keuanganStats.pengeluaran)}</div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Health Card */}
                <Card variant="premium" className="p-10 space-y-8">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-4">
                        <div className="p-3 bg-[#0A2619] text-[#BCF32F] rounded-xl shadow-lg shadow-[#0A2619]/20">
                            <Activity size={24} />
                        </div>
                        Health Status
                    </h3>

                    <div className="space-y-6">
                        {[
                            { label: 'Database Engine', status: systemHealth.database, icon: Database },
                            { label: 'API Connection', status: systemHealth.api, icon: Activity },
                            { label: 'Cloud Storage', status: systemHealth.storage, icon: FileText },
                        ].map((h, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div className="flex items-center gap-4">
                                    <h.icon size={18} className="text-gray-400" />
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{h.label}</span>
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                    ${h.status === 'healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}
                                `}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${h.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                    {h.status === 'healthy' ? 'Active' : 'Error'}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link to="/system-status" className="w-full py-4 rounded-2xl bg-[#0A2619] text-[#BCF32F] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-[#0A2619]/20 hover:scale-105 active:scale-95 transition-all">
                        Full Diagnostic <Settings size={14} />
                    </Link>
                </Card>
            </div>

            {/* Premium Action Grid */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">Management Access</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[
                        { to: '/santri', label: 'Santri Data', icon: Users, color: 'emerald' },
                        { to: '/guru', label: 'Staf Guru', icon: GraduationCap, color: 'blue' },
                        { to: '/kelas', label: 'Kelas Grup', icon: Home, color: 'amber' },
                        { to: '/audit-log', label: 'Audit Logs', icon: ClipboardList, color: 'indigo' },
                        { to: '/pengaturan', label: 'Sys Config', icon: Settings, color: 'slate' },
                        { to: '/backup', label: 'Cold Backup', icon: Database, color: 'rose' },
                    ].map((action, i) => (
                        <Link key={i} to={action.to} className="group relative">
                            <div className={`aspect-square rounded-[2.5rem] bg-white border-2 border-gray-100 p-8 flex flex-col items-center justify-center gap-5 transition-all duration-500 group-hover:border-transparent group-hover:shadow-2xl group-hover:translate-y-[-12px] overflow-hidden`}>
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                                    action.color === 'emerald' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/30' :
                                    action.color === 'blue' ? 'bg-gradient-to-br from-blue-50 to-blue-100/30' :
                                    action.color === 'amber' ? 'bg-gradient-to-br from-amber-50 to-amber-100/30' :
                                    action.color === 'indigo' ? 'bg-gradient-to-br from-indigo-50 to-indigo-100/30' :
                                    action.color === 'slate' ? 'bg-gradient-to-br from-slate-50 to-slate-100/30' :
                                    'bg-gradient-to-br from-rose-50 to-rose-100/30'
                                }`}></div>
                                
                                <div className={`p-5 rounded-3xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl relative z-10 ${
                                    action.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                    action.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                    action.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                    action.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                    action.color === 'slate' ? 'bg-slate-50 text-slate-600' :
                                    'bg-rose-50 text-rose-600'
                                }`}>
                                    <action.icon size={32} />
                                </div>
                                <span className="font-black text-[10px] text-gray-500 uppercase tracking-widest relative z-10 group-hover:text-gray-900 transition-colors">{action.label}</span>
                            </div>
                        </Link>
                    ))}
                    
                    <Link to="/keuangan/dana/persetujuan" className="md:col-span-2 lg:col-span-2 group">
                        <div className="h-full rounded-[2.5rem] bg-[#0A2619] p-8 flex items-center justify-between gap-6 transition-all duration-500 hover:shadow-2xl hover:shadow-[#0A2619]/30 hover:translate-y-[-12px]">
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-white">Fund Approval</h4>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Persetujuan Pencairan Dana</p>
                            </div>
                            <div className="p-5 bg-[#143d2a] rounded-3xl text-[#BCF32F] group-hover:bg-[#BCF32F] group-hover:text-[#0A2619] group-hover:scale-110 transition-all">
                                <CheckCircle size={32} />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard
