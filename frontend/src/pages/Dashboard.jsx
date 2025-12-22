import { useEffect, useState } from 'react'
import { Line, Doughnut, Radar, Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Users, GraduationCap, Home, BookMarked, CheckCircle, Clock, AlertCircle, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ConnectionStatus from '../components/common/ConnectionStatus'
import './Dashboard.css'

// Register all ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
)

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalSantri: 0,
        totalGuru: 0,
        totalKelas: 0,
        totalHalaqoh: 0
    })
    const [hafalanStats, setHafalanStats] = useState({
        total: 0,
        lancar: 0,
        sedang: 0,
        lemah: 0,
        bacaNazhor: 0
    })
    const [monthlyData, setMonthlyData] = useState({
        total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lancar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        sedang: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lemah: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bacaNazhor: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    })
    const [lastYearMonthly, setLastYearMonthly] = useState({
        total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lancar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        sedang: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lemah: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bacaNazhor: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    })
    const [yearlyData, setYearlyData] = useState({
        thisYear: { total: 0, lancar: 0, sedang: 0, lemah: 0, bacaNazhor: 0 },
        lastYear: { total: 0, lancar: 0, sedang: 0, lemah: 0, bacaNazhor: 0 }
    })
    const [loading, setLoading] = useState(true)
    const [greeting, setGreeting] = useState('')

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
    const currentYear = new Date().getFullYear()
    const lastYear = currentYear - 1

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
        fetchHafalanData()
        updateGreeting()
        const interval = setInterval(updateGreeting, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            const [santriRes, guruRes, kelasRes, halaqohRes] = await Promise.all([
                supabase.from('santri').select('*', { count: 'exact', head: true }),
                supabase.from('guru').select('*', { count: 'exact', head: true }),
                supabase.from('kelas').select('*', { count: 'exact', head: true }),
                supabase.from('halaqoh').select('*', { count: 'exact', head: true })
            ])

            setStats({
                totalSantri: santriRes.count || 0,
                totalGuru: guruRes.count || 0,
                totalKelas: kelasRes.count || 0,
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

            // Initialize monthly counts
            const thisYearMonthly = {
                total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                lancar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                sedang: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                lemah: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                bacaNazhor: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }

            const prevYearMonthly = {
                total: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                lancar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                sedang: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                lemah: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                bacaNazhor: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            }

            const yearly = {
                thisYear: { total: 0, lancar: 0, sedang: 0, lemah: 0, bacaNazhor: 0 },
                lastYear: { total: 0, lancar: 0, sedang: 0, lemah: 0, bacaNazhor: 0 }
            }

            let totals = { total: 0, lancar: 0, sedang: 0, lemah: 0, bacaNazhor: 0 }

            data?.forEach(h => {
                totals.total++
                if (h.status === 'Lancar') totals.lancar++
                if (h.status === 'Sedang') totals.sedang++
                if (h.status === 'Lemah') totals.lemah++
                if (h.status === 'Baca Nazhor') totals.bacaNazhor++

                if (h.tanggal) {
                    const date = new Date(h.tanggal)
                    const year = date.getFullYear()
                    const month = date.getMonth()

                    if (year === currentYear) {
                        thisYearMonthly.total[month]++
                        yearly.thisYear.total++
                        if (h.status === 'Lancar') { thisYearMonthly.lancar[month]++; yearly.thisYear.lancar++ }
                        if (h.status === 'Sedang') { thisYearMonthly.sedang[month]++; yearly.thisYear.sedang++ }
                        if (h.status === 'Lemah') { thisYearMonthly.lemah[month]++; yearly.thisYear.lemah++ }
                        if (h.status === 'Baca Nazhor') { thisYearMonthly.bacaNazhor[month]++; yearly.thisYear.bacaNazhor++ }
                    } else if (year === lastYear) {
                        prevYearMonthly.total[month]++
                        yearly.lastYear.total++
                        if (h.status === 'Lancar') { prevYearMonthly.lancar[month]++; yearly.lastYear.lancar++ }
                        if (h.status === 'Sedang') { prevYearMonthly.sedang[month]++; yearly.lastYear.sedang++ }
                        if (h.status === 'Lemah') { prevYearMonthly.lemah[month]++; yearly.lastYear.lemah++ }
                        if (h.status === 'Baca Nazhor') { prevYearMonthly.bacaNazhor[month]++; yearly.lastYear.bacaNazhor++ }
                    }
                }
            })

            setHafalanStats(totals)
            setMonthlyData(thisYearMonthly)
            setLastYearMonthly(prevYearMonthly)
            setYearlyData(yearly)
        } catch (error) {
            console.log('Error fetching hafalan data:', error.message)
        }
    }

    // Calculate percentage change
    const getPercentChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return Math.round(((current - previous) / previous) * 100)
    }

    // Get trend icon
    const TrendIcon = ({ current, previous }) => {
        const change = getPercentChange(current, previous)
        if (change > 0) return <TrendingUp size={14} className="trend-up" />
        if (change < 0) return <TrendingDown size={14} className="trend-down" />
        return <Minus size={14} className="trend-neutral" />
    }

    // ========== CHART CONFIGURATIONS ==========

    // 1. TOTAL - Line Chart with Year Comparison
    const totalLineData = {
        labels: months,
        datasets: [
            {
                label: `${currentYear}`,
                data: monthlyData.total,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
            {
                label: `${lastYear}`,
                data: lastYearMonthly.total,
                borderColor: '#c4b5fd',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
            }
        ]
    }

    // 2. LANCAR - Donut with Year Comparison
    const lancarDonutData = {
        labels: [`${currentYear}`, `${lastYear}`],
        datasets: [{
            data: [yearlyData.thisYear.lancar, yearlyData.lastYear.lancar],
            backgroundColor: ['#10b981', '#6ee7b7'],
            borderColor: ['#ffffff', '#ffffff'],
            borderWidth: 3,
            hoverOffset: 10
        }]
    }

    // 3. SEDANG - Line Chart with Year Comparison
    const sedangLineData = {
        labels: months,
        datasets: [
            {
                label: `${currentYear}`,
                data: monthlyData.sedang,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
            {
                label: `${lastYear}`,
                data: lastYearMonthly.sedang,
                borderColor: '#93c5fd',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
            }
        ]
    }

    // 4. LEMAH - Bar Chart with Year Comparison
    const lemahBarData = {
        labels: months,
        datasets: [
            {
                label: `${currentYear}`,
                data: monthlyData.lemah,
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: '#f59e0b',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: `${lastYear}`,
                data: lastYearMonthly.lemah,
                backgroundColor: 'rgba(252, 211, 77, 0.6)',
                borderColor: '#fcd34d',
                borderWidth: 1,
                borderRadius: 4,
            }
        ]
    }

    // 5. BACA NAZHOR - Area Chart with Year Comparison
    const nazhorAreaData = {
        labels: months,
        datasets: [
            {
                label: `${currentYear}`,
                data: monthlyData.bacaNazhor,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ec4899',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
            {
                label: `${lastYear}`,
                data: lastYearMonthly.bacaNazhor,
                borderColor: '#f9a8d4',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                pointRadius: 0,
            }
        ]
    }

    // Chart Options
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } },
            tooltip: { backgroundColor: '#1f2937', padding: 10, cornerRadius: 6 }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 9 } } },
            y: { min: 0, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#6b7280', font: { size: 9 } } }
        }
    }

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { display: true, position: 'bottom', labels: { padding: 12, font: { size: 10 }, boxWidth: 12 } },
            tooltip: { backgroundColor: '#10b981', padding: 8 }
        }
    }

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } },
            tooltip: { backgroundColor: '#f59e0b', padding: 8 }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 9 } } },
            y: { min: 0, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#6b7280', font: { size: 9 } } }
        }
    }

    return (
        <div className="dashboard">
            {/* Welcome Header */}
            <div className="dashboard-welcome">
                <h1>👋 {greeting}!</h1>
                <p>Selamat datang di Sistem Akademik PTQA Batuan</p>
            </div>

            {/* Stats Ringkasan - 2 Kolom */}
            <div className="dashboard-stats-grid">
                <div className="dashboard-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Santri</span>
                        <span className="stat-value green">{loading ? '...' : stats.totalSantri}</span>
                    </div>
                    <div className="stat-icon-box green">
                        <Users size={24} />
                    </div>
                </div>

                <div className="dashboard-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Guru</span>
                        <span className="stat-value blue">{loading ? '...' : stats.totalGuru}</span>
                    </div>
                    <div className="stat-icon-box blue">
                        <GraduationCap size={24} />
                    </div>
                </div>

                <div className="dashboard-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Jumlah Kelas</span>
                        <span className="stat-value yellow">{loading ? '...' : stats.totalKelas}</span>
                    </div>
                    <div className="stat-icon-box yellow">
                        <Home size={24} />
                    </div>
                </div>

                <div className="dashboard-stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Jumlah Halaqoh</span>
                        <span className="stat-value teal">{loading ? '...' : stats.totalHalaqoh}</span>
                    </div>
                    <div className="stat-icon-box teal">
                        <BookMarked size={24} />
                    </div>
                </div>
            </div>

            {/* Section Divider */}
            <div className="dashboard-section-title">📊 Statistik Hafalan - Perbandingan Bulanan & Tahunan</div>

            {/* Charts Grid */}
            <div className="dashboard-charts-grid">
                {/* 1. TOTAL - Line Chart */}
                <div className="dashboard-chart-box purple-theme">
                    <div className="chart-box-header">
                        <div className="chart-box-icon purple">
                            <FileText size={20} />
                        </div>
                        <div className="chart-box-info">
                            <h4>Total Hafalan</h4>
                            <span className="chart-box-value">{hafalanStats.total}</span>
                        </div>
                        <div className="chart-box-comparison">
                            <TrendIcon current={yearlyData.thisYear.total} previous={yearlyData.lastYear.total} />
                            <span className={getPercentChange(yearlyData.thisYear.total, yearlyData.lastYear.total) >= 0 ? 'positive' : 'negative'}>
                                {getPercentChange(yearlyData.thisYear.total, yearlyData.lastYear.total)}%
                            </span>
                            <small>vs {lastYear}</small>
                        </div>
                    </div>
                    <div className="chart-box-content">
                        <Line data={totalLineData} options={lineChartOptions} />
                    </div>
                    <div className="chart-box-stats">
                        <div className="stat-item">
                            <span className="stat-year">{currentYear}</span>
                            <span className="stat-num">{yearlyData.thisYear.total}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-year">{lastYear}</span>
                            <span className="stat-num">{yearlyData.lastYear.total}</span>
                        </div>
                    </div>
                </div>

                {/* 2. LANCAR - Donut Chart */}
                <div className="dashboard-chart-box green-theme">
                    <div className="chart-box-header">
                        <div className="chart-box-icon green">
                            <CheckCircle size={20} />
                        </div>
                        <div className="chart-box-info">
                            <h4>Lancar</h4>
                            <span className="chart-box-value">{hafalanStats.lancar}</span>
                        </div>
                        <div className="chart-box-comparison">
                            <TrendIcon current={yearlyData.thisYear.lancar} previous={yearlyData.lastYear.lancar} />
                            <span className={getPercentChange(yearlyData.thisYear.lancar, yearlyData.lastYear.lancar) >= 0 ? 'positive' : 'negative'}>
                                {getPercentChange(yearlyData.thisYear.lancar, yearlyData.lastYear.lancar)}%
                            </span>
                            <small>vs {lastYear}</small>
                        </div>
                    </div>
                    <div className="chart-box-content donut">
                        <Doughnut data={lancarDonutData} options={donutOptions} />
                    </div>
                    <div className="chart-box-stats">
                        <div className="stat-item">
                            <span className="stat-year">{currentYear}</span>
                            <span className="stat-num">{yearlyData.thisYear.lancar}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-year">{lastYear}</span>
                            <span className="stat-num">{yearlyData.lastYear.lancar}</span>
                        </div>
                    </div>
                </div>

                {/* 3. SEDANG - Line Chart */}
                <div className="dashboard-chart-box blue-theme">
                    <div className="chart-box-header">
                        <div className="chart-box-icon blue">
                            <Clock size={20} />
                        </div>
                        <div className="chart-box-info">
                            <h4>Sedang</h4>
                            <span className="chart-box-value">{hafalanStats.sedang}</span>
                        </div>
                        <div className="chart-box-comparison">
                            <TrendIcon current={yearlyData.thisYear.sedang} previous={yearlyData.lastYear.sedang} />
                            <span className={getPercentChange(yearlyData.thisYear.sedang, yearlyData.lastYear.sedang) >= 0 ? 'positive' : 'negative'}>
                                {getPercentChange(yearlyData.thisYear.sedang, yearlyData.lastYear.sedang)}%
                            </span>
                            <small>vs {lastYear}</small>
                        </div>
                    </div>
                    <div className="chart-box-content">
                        <Line data={sedangLineData} options={lineChartOptions} />
                    </div>
                    <div className="chart-box-stats">
                        <div className="stat-item">
                            <span className="stat-year">{currentYear}</span>
                            <span className="stat-num">{yearlyData.thisYear.sedang}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-year">{lastYear}</span>
                            <span className="stat-num">{yearlyData.lastYear.sedang}</span>
                        </div>
                    </div>
                </div>

                {/* 4. LEMAH - Bar Chart */}
                <div className="dashboard-chart-box yellow-theme">
                    <div className="chart-box-header">
                        <div className="chart-box-icon yellow">
                            <AlertCircle size={20} />
                        </div>
                        <div className="chart-box-info">
                            <h4>Lemah</h4>
                            <span className="chart-box-value">{hafalanStats.lemah}</span>
                        </div>
                        <div className="chart-box-comparison">
                            <TrendIcon current={yearlyData.thisYear.lemah} previous={yearlyData.lastYear.lemah} />
                            <span className={getPercentChange(yearlyData.thisYear.lemah, yearlyData.lastYear.lemah) >= 0 ? 'positive' : 'negative'}>
                                {getPercentChange(yearlyData.thisYear.lemah, yearlyData.lastYear.lemah)}%
                            </span>
                            <small>vs {lastYear}</small>
                        </div>
                    </div>
                    <div className="chart-box-content">
                        <Bar data={lemahBarData} options={barChartOptions} />
                    </div>
                    <div className="chart-box-stats">
                        <div className="stat-item">
                            <span className="stat-year">{currentYear}</span>
                            <span className="stat-num">{yearlyData.thisYear.lemah}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-year">{lastYear}</span>
                            <span className="stat-num">{yearlyData.lastYear.lemah}</span>
                        </div>
                    </div>
                </div>

                {/* 5. BACA NAZHOR - Area Chart (Full Width) */}
                <div className="dashboard-chart-box pink-theme full-width">
                    <div className="chart-box-header">
                        <div className="chart-box-icon pink">
                            <BookMarked size={20} />
                        </div>
                        <div className="chart-box-info">
                            <h4>Baca Nazhor</h4>
                            <span className="chart-box-value">{hafalanStats.bacaNazhor}</span>
                        </div>
                        <div className="chart-box-comparison">
                            <TrendIcon current={yearlyData.thisYear.bacaNazhor} previous={yearlyData.lastYear.bacaNazhor} />
                            <span className={getPercentChange(yearlyData.thisYear.bacaNazhor, yearlyData.lastYear.bacaNazhor) >= 0 ? 'positive' : 'negative'}>
                                {getPercentChange(yearlyData.thisYear.bacaNazhor, yearlyData.lastYear.bacaNazhor)}%
                            </span>
                            <small>vs {lastYear}</small>
                        </div>
                    </div>
                    <div className="chart-box-content wide">
                        <Line data={nazhorAreaData} options={lineChartOptions} />
                    </div>
                    <div className="chart-box-stats">
                        <div className="stat-item">
                            <span className="stat-year">{currentYear}</span>
                            <span className="stat-num">{yearlyData.thisYear.bacaNazhor}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-year">{lastYear}</span>
                            <span className="stat-num">{yearlyData.lastYear.bacaNazhor}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Connection Status */}
            <ConnectionStatus />
        </div>
    )
}

export default Dashboard
