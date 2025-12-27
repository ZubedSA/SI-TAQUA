import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Line, Doughnut } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import {
    Users,
    GraduationCap,
    BookMarked,
    CalendarCheck,
    PenLine,
    FileText,
    Download,
    CheckCircle,
    Clock,
    AlertCircle,
    Circle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../context/ThemeContext'
import './AkademikDashboard.css'

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

/**
 * Akademik Dashboard - Operasional akademik (guru/admin)
 * Fokus pada hafalan, nilai, presensi, dan santri
 */
const AkademikDashboard = () => {
    const { isDark } = useTheme()
    const [stats, setStats] = useState({
        totalSantri: 0,
        totalHalaqoh: 0
    })
    const [hafalanStats, setHafalanStats] = useState({
        total: 0,
        lancar: 0,
        sedang: 0,
        lemah: 0
    })
    const [monthlyData, setMonthlyData] = useState({
        total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lancar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
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
        fetchStats()
        fetchHafalanData()
        updateGreeting()
        const interval = setInterval(updateGreeting, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            const [santriRes, halaqohRes] = await Promise.all([
                supabase.from('santri').select('*', { count: 'exact', head: true }),
                supabase.from('halaqoh').select('*', { count: 'exact', head: true })
            ])
            setStats({
                totalSantri: santriRes.count || 0,
                totalHalaqoh: halaqohRes.count || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchHafalanData = async () => {
        try {
            const { data, error } = await supabase.from('hafalan').select('status, tanggal')
            if (error) throw error

            const thisYearMonthly = {
                total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                lancar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }

            let totals = { total: 0, lancar: 0, sedang: 0, lemah: 0 }

            data?.forEach(h => {
                totals.total++
                if (h.status === 'Lancar') totals.lancar++
                if (h.status === 'Sedang') totals.sedang++
                if (h.status === 'Lemah') totals.lemah++

                if (h.tanggal) {
                    const date = new Date(h.tanggal)
                    const year = date.getFullYear()
                    const month = date.getMonth()

                    if (year === currentYear) {
                        thisYearMonthly.total[month]++
                        if (h.status === 'Lancar') thisYearMonthly.lancar[month]++
                    }
                }
            })

            setHafalanStats(totals)
            setMonthlyData(thisYearMonthly)
        } catch (error) {
            console.log('Error fetching hafalan data:', error.message)
        }
    }

    // Chart Data
    const hafalanLineData = {
        labels: months,
        datasets: [
            {
                label: 'Total Hafalan',
                data: monthlyData.total,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            },
            {
                label: 'Lancar',
                data: monthlyData.lancar,
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4
            }
        ]
    }

    const hafalanDonutData = {
        labels: ['Lancar', 'Sedang', 'Lemah'],
        datasets: [{
            data: [hafalanStats.lancar, hafalanStats.sedang, hafalanStats.lemah],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
            borderWidth: 0
        }]
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
                grid: {
                    color: isDark ? '#334155' : '#f3f4f6',
                },
                ticks: {
                    color: isDark ? '#94a3b8' : '#6b7280',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    }
                }
            },
            x: {
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
        <div className="akademik-dashboard">
            {/* Welcome Header */}
            <div className="dashboard-welcome akademik">
                <div className="welcome-content">
                    <h1>👋 {greeting}!</h1>
                    <p>Dashboard Akademik PTQA Batuan</p>
                </div>
                <div className="welcome-badge">
                    <GraduationCap size={20} />
                    <span>Akademik</span>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="akademik-stats-grid">
                <div className="akademik-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Santri</span>
                        <span className="stat-value green">{loading ? '...' : stats.totalSantri}</span>
                    </div>
                    <div className="stat-icon-box green"><Users size={24} /></div>
                </div>
                <div className="akademik-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Halaqoh</span>
                        <span className="stat-value teal">{loading ? '...' : stats.totalHalaqoh}</span>
                    </div>
                    <div className="stat-icon-box teal"><Circle size={24} /></div>
                </div>
                <div className="akademik-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Hafalan</span>
                        <span className="stat-value purple">{hafalanStats.total}</span>
                    </div>
                    <div className="stat-icon-box purple"><BookMarked size={24} /></div>
                </div>
                <div className="akademik-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Hafalan Lancar</span>
                        <span className="stat-value blue">{hafalanStats.lancar}</span>
                    </div>
                    <div className="stat-icon-box blue"><CheckCircle size={24} /></div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="akademik-row">
                <div className="akademik-card chart-card">
                    <div className="card-header">
                        <h3><BookMarked size={20} /> Trend Hafalan {currentYear}</h3>
                    </div>
                    <div className="chart-container">
                        <Line data={hafalanLineData} options={chartOptions} />
                    </div>
                </div>
                <div className="akademik-card chart-card small">
                    <div className="card-header">
                        <h3><CheckCircle size={20} /> Status Hafalan</h3>
                    </div>
                    <div className="chart-container donut">
                        <Doughnut data={hafalanDonutData} options={{ ...chartOptions, cutout: '65%' }} />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="akademik-card">
                <div className="card-header">
                    <h3><PenLine size={20} /> Menu Akademik</h3>
                </div>
                <div className="quick-actions">
                    <Link to="/input-nilai" className="quick-action-btn">
                        <PenLine size={20} />
                        <span>Input Nilai</span>
                    </Link>
                    <Link to="/rekap-nilai" className="quick-action-btn">
                        <FileText size={20} />
                        <span>Rekap Nilai</span>
                    </Link>
                    <Link to="/hafalan" className="quick-action-btn">
                        <BookMarked size={20} />
                        <span>Hafalan</span>
                    </Link>
                    <Link to="/presensi" className="quick-action-btn">
                        <CalendarCheck size={20} />
                        <span>Pembinaan</span>
                    </Link>
                    <Link to="/halaqoh" className="quick-action-btn">
                        <Circle size={20} />
                        <span>Halaqoh</span>
                    </Link>
                    <Link to="/laporan" className="quick-action-btn">
                        <Download size={20} />
                        <span>Laporan</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default AkademikDashboard
