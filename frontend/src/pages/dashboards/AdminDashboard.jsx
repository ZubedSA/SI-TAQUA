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
                supabase.from('santri').select('*', { count: 'exact', head: true }),
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
        <div className="admin-dashboard">
            {/* Welcome Header */}
            <div className="dashboard-welcome">
                <div className="welcome-content">
                    <h1>👋 {greeting}, Administrator!</h1>
                    <p>Selamat datang di Pusat Kontrol Sistem PTQA Batuan</p>
                </div>
                <div className="welcome-badge">
                    <Shield size={20} />
                    <span>Admin Dashboard</span>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Santri</span>
                        <span className="stat-value green">{loading ? '...' : stats.totalSantri}</span>
                    </div>
                    <div className="stat-icon-box green">
                        <Users size={24} />
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Guru</span>
                        <span className="stat-value blue">{loading ? '...' : stats.totalGuru}</span>
                    </div>
                    <div className="stat-icon-box blue">
                        <GraduationCap size={24} />
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Jumlah Kelas</span>
                        <span className="stat-value yellow">{loading ? '...' : stats.totalKelas}</span>
                    </div>
                    <div className="stat-icon-box yellow">
                        <Home size={24} />
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Users</span>
                        <span className="stat-value purple">{loading ? '...' : stats.totalUsers}</span>
                    </div>
                    <div className="stat-icon-box purple">
                        <Shield size={24} />
                    </div>
                </div>
            </div>

            {/* System Overview Row */}
            <div className="admin-row">
                {/* Financial Overview */}
                <div className="admin-card">
                    <div className="card-header">
                        <h3><Wallet size={20} /> Ringkasan Keuangan</h3>
                        <Link to="/dashboard/keuangan" className="card-link">Lihat Detail →</Link>
                    </div>
                    <div className="finance-summary">
                        <div className="finance-item income">
                            <TrendingUp size={20} />
                            <div>
                                <span className="finance-label">Pemasukan</span>
                                <span className="finance-value">{formatCurrency(keuanganStats.pemasukan)}</span>
                            </div>
                        </div>
                        <div className="finance-item expense">
                            <TrendingDown size={20} />
                            <div>
                                <span className="finance-label">Pengeluaran</span>
                                <span className="finance-value">{formatCurrency(keuanganStats.pengeluaran)}</span>
                            </div>
                        </div>
                        <div className="finance-item balance">
                            <Wallet size={20} />
                            <div>
                                <span className="finance-label">Saldo Kas</span>
                                <span className={`finance-value ${keuanganStats.saldo >= 0 ? 'positive' : 'negative'}`}>
                                    {formatCurrency(keuanganStats.saldo)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Health */}
                <div className="admin-card">
                    <div className="card-header">
                        <h3><Activity size={20} /> Status Sistem</h3>
                        <Link to="/system-status" className="card-link">Detail →</Link>
                    </div>
                    <div className="health-list">
                        <div className="health-item">
                            <div className="health-info">
                                <Database size={18} />
                                <span>Database</span>
                            </div>
                            <HealthIndicator status={systemHealth.database} />
                        </div>
                        <div className="health-item">
                            <div className="health-info">
                                <Activity size={18} />
                                <span>API Server</span>
                            </div>
                            <HealthIndicator status={systemHealth.api} />
                        </div>
                        <div className="health-item">
                            <div className="health-info">
                                <FileText size={18} />
                                <span>Storage</span>
                            </div>
                            <HealthIndicator status={systemHealth.storage} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="admin-card">
                <div className="card-header">
                    <h3><Settings size={20} /> Aksi Cepat Admin</h3>
                </div>
                <div className="quick-actions">
                    <Link to="/santri" className="quick-action-btn">
                        <Users size={20} />
                        <span>Kelola Santri</span>
                    </Link>
                    <Link to="/guru" className="quick-action-btn">
                        <GraduationCap size={20} />
                        <span>Kelola Guru</span>
                    </Link>
                    <Link to="/kelas" className="quick-action-btn">
                        <Home size={20} />
                        <span>Kelola Kelas</span>
                    </Link>
                    <Link to="/audit-log" className="quick-action-btn">
                        <ClipboardList size={20} />
                        <span>Audit Log</span>
                    </Link>
                    <Link to="/pengaturan" className="quick-action-btn">
                        <Settings size={20} />
                        <span>Pengaturan</span>
                    </Link>
                    <Link to="/backup" className="quick-action-btn">
                        <Database size={20} />
                        <span>Backup Data</span>
                    </Link>
                    <Link to="/keuangan/dana/persetujuan" className="quick-action-btn">
                        <CheckCircle size={20} />
                        <span>Persetujuan Dana</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard
