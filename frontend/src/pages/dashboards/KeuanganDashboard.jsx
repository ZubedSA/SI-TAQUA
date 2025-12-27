import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Receipt,
    PiggyBank,
    FileBarChart,
    ArrowUpCircle,
    ArrowDownCircle,
    CheckCircle,
    Tag,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    RefreshCw
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../context/ThemeContext'
import './KeuanganDashboard.css'

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
)

/**
 * Keuangan Dashboard - Operasional keuangan (bendahara)
 * Fokus pada kas, pembayaran, dan penyaluran dana
 */
const KeuanganDashboard = () => {
    const { isDark } = useTheme()
    const [keuanganStats, setKeuanganStats] = useState({
        pemasukan: 0,
        pengeluaran: 0,
        pembayaran: 0,
        saldo: 0
    })
    const [filters, setFilters] = useState({
        bulan: '',
        tahun: new Date().getFullYear(),
        dateFrom: '',
        dateTo: ''
    })
    const [monthlyData, setMonthlyData] = useState({
        pemasukan: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        pengeluaran: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    })
    const [loading, setLoading] = useState(true)
    const [greeting, setGreeting] = useState('')

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    const currentYear = new Date().getFullYear()

    const updateGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 4 && hour < 11) setGreeting('Selamat Pagi')
        else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang')
        else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore')
        else setGreeting('Selamat Malam')
    }

    useEffect(() => {
        fetchKeuanganStats()
        fetchMonthlyData()
    }, [filters.bulan, filters.tahun, filters.dateFrom, filters.dateTo])

    useEffect(() => {
        updateGreeting()
        const interval = setInterval(updateGreeting, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchKeuanganStats = async () => {
        setLoading(true)
        try {
            let start = `${currentYear}-01-01`
            let end = `${currentYear}-12-31`

            if (filters.dateFrom && filters.dateTo) {
                start = filters.dateFrom
                end = filters.dateTo
            } else if (filters.tahun) {
                start = `${filters.tahun}-01-01`
                end = `${filters.tahun}-12-31`
                if (filters.bulan) {
                    const month = String(filters.bulan).padStart(2, '0')
                    start = `${filters.tahun}-${month}-01`
                    end = `${filters.tahun}-${month}-31`
                }
            }

            const [pemasukanRes, pengeluaranRes, pembayaranRes] = await Promise.all([
                supabase.from('kas_pemasukan').select('jumlah').gte('tanggal', start).lte('tanggal', end),
                supabase.from('kas_pengeluaran').select('jumlah').gte('tanggal', start).lte('tanggal', end),
                supabase.from('pembayaran_santri').select('jumlah').gte('tanggal', start).lte('tanggal', end)
            ])

            const totalPemasukan = pemasukanRes.data?.reduce((sum, d) => sum + Number(d.jumlah || 0), 0) || 0
            const totalPengeluaran = pengeluaranRes.data?.reduce((sum, d) => sum + Number(d.jumlah || 0), 0) || 0
            const totalPembayaran = pembayaranRes.data?.reduce((sum, d) => sum + Number(d.jumlah || 0), 0) || 0

            setKeuanganStats({
                pemasukan: totalPemasukan,
                pengeluaran: totalPengeluaran,
                pembayaran: totalPembayaran,
                saldo: totalPemasukan - totalPengeluaran
            })
        } catch (error) {
            console.log('Error fetching keuangan stats:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchMonthlyData = async () => {
        try {
            let start = `${currentYear}-01-01`
            let end = `${currentYear}-12-31`

            if (filters.dateFrom && filters.dateTo) {
                start = filters.dateFrom
                end = filters.dateTo
            } else if (filters.tahun) {
                start = `${filters.tahun}-01-01`
                end = `${filters.tahun}-12-31`
                if (filters.bulan) {
                    const month = String(filters.bulan).padStart(2, '0')
                    start = `${filters.tahun}-${month}-01`
                    end = `${filters.tahun}-${month}-31`
                }
            }

            const [pemasukanRes, pengeluaranRes] = await Promise.all([
                supabase.from('kas_pemasukan').select('jumlah, tanggal').gte('tanggal', start).lte('tanggal', end),
                supabase.from('kas_pengeluaran').select('jumlah, tanggal').gte('tanggal', start).lte('tanggal', end)
            ])

            const pemasukan = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            const pengeluaran = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

            pemasukanRes.data?.forEach(d => {
                const month = new Date(d.tanggal).getMonth()
                pemasukan[month] += Number(d.jumlah || 0)
            })

            pengeluaranRes.data?.forEach(d => {
                const month = new Date(d.tanggal).getMonth()
                pengeluaran[month] += Number(d.jumlah || 0)
            })

            setMonthlyData({ pemasukan, pengeluaran })
        } catch (error) {
            console.log('Error fetching monthly data:', error.message)
        }
    }

    const formatCurrency = (amount, short = false) => {
        if (short && amount >= 1000000) {
            return `Rp ${(amount / 1000000).toFixed(1)}jt`
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    // Chart Data
    const kasBarData = {
        labels: months,
        datasets: [
            {
                label: 'Pemasukan',
                data: monthlyData.pemasukan,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 4
            },
            {
                label: 'Pengeluaran',
                data: monthlyData.pengeluaran,
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 4
            }
        ]
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: isDark ? '#e2e8f0' : '#4b5563',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                titleColor: isDark ? '#f1f5f9' : '#1f2937',
                bodyColor: isDark ? '#cbd5e1' : '#4b5563',
                borderColor: isDark ? '#334155' : '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                titleFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
                bodyFont: { family: "'Inter', sans-serif", size: 13 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                border: { display: false },
                grid: {
                    color: isDark ? '#334155' : '#f3f4f6',
                },
                ticks: {
                    callback: (value) => formatCurrency(value, true),
                    color: isDark ? '#94a3b8' : '#6b7280',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    }
                }
            },
            x: {
                border: { display: false },
                grid: {
                    display: false
                },
                ticks: {
                    color: isDark ? '#94a3b8' : '#6b7280',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    }
                }
            }
        }
    }

    return (
        <div className="keuangan-dashboard">
            {/* Welcome Header */}
            <div className="dashboard-welcome keuangan">
                <div className="welcome-content">
                    <h1>👋 {greeting}!</h1>
                    <p>Dashboard Keuangan PTQA Batuan - Tahun {currentYear}</p>
                </div>
                <div className="welcome-badge">
                    <Wallet size={20} />
                    <span>Keuangan</span>
                </div>
            </div>

            {/* Financial Stats */}
            <div className="keuangan-stats-grid">
                <div className="keuangan-stat-card income">
                    <div className="stat-info">
                        <span className="stat-label">Total Pemasukan</span>
                        <span className="stat-value">{loading ? '...' : formatCurrency(keuanganStats.pemasukan)}</span>
                    </div>
                    <div className="stat-icon-box">
                        <ArrowUpCircle size={24} />
                    </div>
                </div>
                <div className="keuangan-stat-card expense">
                    <div className="stat-info">
                        <span className="stat-label">Total Pengeluaran</span>
                        <span className="stat-value">{loading ? '...' : formatCurrency(keuanganStats.pengeluaran)}</span>
                    </div>
                    <div className="stat-icon-box">
                        <ArrowDownCircle size={24} />
                    </div>
                </div>
                <div className="keuangan-stat-card payment">
                    <div className="stat-info">
                        <span className="stat-label">Pembayaran Santri</span>
                        <span className="stat-value">{loading ? '...' : formatCurrency(keuanganStats.pembayaran)}</span>
                    </div>
                    <div className="stat-icon-box">
                        <CreditCard size={24} />
                    </div>
                </div>
                <div className={`keuangan-stat-card balance ${keuanganStats.saldo >= 0 ? 'positive' : 'negative'}`}>
                    <div className="stat-info">
                        <span className="stat-label">Saldo Kas</span>
                        <span className="stat-value">{loading ? '...' : formatCurrency(keuanganStats.saldo)}</span>
                    </div>
                    <div className="stat-icon-box">
                        <Wallet size={24} />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar" style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div className="date-range-filter">
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => setFilters({ ...filters, dateFrom: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Dari Tanggal"
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => setFilters({ ...filters, dateTo: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Sampai Tanggal"
                    />
                </div>
                <select
                    value={filters.bulan}
                    onChange={e => setFilters({ ...filters, bulan: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    <option value="">Semua Bulan</option>
                    {[...Array(12)].map((_, i) => (
                        <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'long' })}</option>
                    ))}
                </select>
                <select
                    value={filters.tahun}
                    onChange={e => setFilters({ ...filters, tahun: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn btn-icon" onClick={() => { fetchKeuanganStats(); fetchMonthlyData(); }}>
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Chart */}
            <div className="keuangan-card chart-card">
                <div className="card-header">
                    <h3><TrendingUp size={20} /> Alur Kas Bulanan {currentYear}</h3>
                </div>
                <div className="chart-container">
                    <Bar data={kasBarData} options={chartOptions} />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="keuangan-card">
                <div className="card-header">
                    <h3><Wallet size={20} /> Menu Keuangan</h3>
                </div>
                <div className="quick-actions-grid">
                    <div className="action-group">
                        <h4><PiggyBank size={16} /> Alur KAS</h4>
                        <div className="action-links">
                            <Link to="/keuangan/kas/pemasukan"><ArrowUpCircle size={16} /> Pemasukan</Link>
                            <Link to="/keuangan/kas/pengeluaran"><ArrowDownCircle size={16} /> Pengeluaran</Link>
                            <Link to="/keuangan/kas/laporan"><FileBarChart size={16} /> Laporan Kas</Link>
                        </div>
                    </div>
                    <div className="action-group">
                        <h4><CreditCard size={16} /> Pembayaran</h4>
                        <div className="action-links">
                            <Link to="/keuangan/pembayaran/tagihan"><Receipt size={16} /> Tagihan Santri</Link>
                            <Link to="/keuangan/pembayaran/kategori"><Tag size={16} /> Kategori</Link>
                            <Link to="/keuangan/pembayaran/bayar"><CreditCard size={16} /> Pembayaran</Link>
                            <Link to="/keuangan/pembayaran/laporan"><FileBarChart size={16} /> Laporan</Link>
                        </div>
                    </div>
                    <div className="action-group">
                        <h4><TrendingUp size={16} /> Penyaluran Dana</h4>
                        <div className="action-links">
                            <Link to="/keuangan/dana/anggaran"><PiggyBank size={16} /> Anggaran</Link>
                            <Link to="/keuangan/dana/persetujuan"><CheckCircle size={16} /> Persetujuan</Link>
                            <Link to="/keuangan/dana/realisasi"><TrendingUp size={16} /> Realisasi</Link>
                            <Link to="/keuangan/dana/laporan"><FileBarChart size={16} /> Laporan</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default KeuanganDashboard
