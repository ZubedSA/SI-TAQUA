import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Users, GraduationCap, Home, BookMarked } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ConnectionStatus from '../components/common/ConnectionStatus'
import './Dashboard.css'

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
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
        totalHafalan: 0
    })
    const [loading, setLoading] = useState(true)

    const [hafalanProgress, setHafalanProgress] = useState([])

    // Chart data
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'],
        datasets: [
            {
                label: 'Rata-rata',
                data: [65, 68, 66, 70, 72, 75, 78, 80, 77, 82, 79, 85],
                borderColor: '#059669',
                backgroundColor: 'rgba(26, 92, 56, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#059669',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            }
        ]
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#059669',
                padding: 12,
                cornerRadius: 8,
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280' } },
            y: { min: 0, max: 100, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#6b7280', stepSize: 25 } }
        }
    }

    useEffect(() => {
        fetchStats()
        fetchHafalanProgress()
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            // Get total santri
            const { count: santriCount, error: e1 } = await supabase
                .from('santri')
                .select('*', { count: 'exact', head: true })

            // Get total guru
            const { count: guruCount, error: e2 } = await supabase
                .from('guru')
                .select('*', { count: 'exact', head: true })

            // Get total kelas
            const { count: kelasCount, error: e3 } = await supabase
                .from('kelas')
                .select('*', { count: 'exact', head: true })

            // Get hafalan mutqin count
            const { count: hafalanCount, error: e4 } = await supabase
                .from('hafalan')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Mutqin')

            if (e1 || e2 || e3 || e4) {
                console.log('Some queries failed, using partial data')
            }

            setStats({
                totalSantri: santriCount || 0,
                totalGuru: guruCount || 0,
                totalKelas: kelasCount || 0,
                totalHafalan: hafalanCount || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchHafalanProgress = async () => {
        try {
            const { data, error } = await supabase
                .from('hafalan')
                .select('juz, status')

            if (error) throw error

            // Calculate progress per juz
            const progressMap = {}
            data?.forEach(h => {
                if (!progressMap[h.juz]) {
                    progressMap[h.juz] = { juz: h.juz, mutqin: 0, total: 0 }
                }
                progressMap[h.juz].total++
                if (h.status === 'Mutqin') {
                    progressMap[h.juz].mutqin++
                }
            })

            setHafalanProgress(Object.values(progressMap).sort((a, b) => a.juz - b.juz))
        } catch (error) {
            console.log('Error fetching hafalan progress:', error.message)
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Selamat Pagi'
        if (hour < 15) return 'Selamat Siang'
        if (hour < 18) return 'Selamat Sore'
        return 'Selamat Malam'
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">👋 {getGreeting()}!</h1>
                    <p className="page-subtitle">Selamat datang di Sistem Akademik PTQA Batuan</p>
                </div>
                <ConnectionStatus />
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card green">
                    <div className="stat-content">
                        <span className="stat-label">Total Santri</span>
                        <span className="stat-value">{loading ? '...' : stats.totalSantri}</span>
                        <span className="stat-description">Santri aktif</span>
                    </div>
                    <div className="stat-icon">
                        <Users size={28} />
                    </div>
                </div>

                <div className="stat-card yellow">
                    <div className="stat-content">
                        <span className="stat-label">Total Guru</span>
                        <span className="stat-value">{loading ? '...' : stats.totalGuru}</span>
                        <span className="stat-description">Pengajar & Wali Kelas</span>
                    </div>
                    <div className="stat-icon">
                        <GraduationCap size={28} />
                    </div>
                </div>

                <div className="stat-card olive">
                    <div className="stat-content">
                        <span className="stat-label">Jumlah Kelas</span>
                        <span className="stat-value">{loading ? '...' : stats.totalKelas}</span>
                        <span className="stat-description">Tingkat 7, 8, dan 9</span>
                    </div>
                    <div className="stat-icon">
                        <Home size={28} />
                    </div>
                </div>

                <div className="stat-card teal">
                    <div className="stat-content">
                        <span className="stat-label">Total Hafalan Mutqin</span>
                        <span className="stat-value">{loading ? '...' : stats.totalHafalan}</span>
                        <span className="stat-description">Hafalan sempurna</span>
                    </div>
                    <div className="stat-icon">
                        <BookMarked size={28} />
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                <div className="chart-card">
                    <h3 className="chart-title">Tren Nilai Rata-rata</h3>
                    <div className="chart-container">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                    <div className="chart-legend">
                        <span className="legend-item">
                            <span className="legend-dot"></span>
                            Rata-rata
                        </span>
                    </div>
                </div>

                <div className="chart-card">
                    <h3 className="chart-title">
                        <span className="title-icon">📖</span>
                        Progress Hafalan per Juz
                    </h3>
                    <div className="hafalan-list">
                        {hafalanProgress.length === 0 ? (
                            <p className="text-muted text-center">Belum ada data hafalan</p>
                        ) : (
                            hafalanProgress.slice(0, 5).map((item) => {
                                const percentage = item.total > 0 ? Math.round((item.mutqin / item.total) * 100) : 0
                                return (
                                    <div key={item.juz} className="hafalan-item">
                                        <div className="hafalan-header">
                                            <span className="hafalan-name">Juz {item.juz}</span>
                                            <span className="hafalan-count">{item.mutqin} mutqin / {item.total} total</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className={`progress-fill ${percentage === 100 ? 'full' : 'empty'}`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className={`progress-percent ${percentage === 100 ? 'full' : 'empty'}`}>
                                            {percentage}%
                                        </span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
