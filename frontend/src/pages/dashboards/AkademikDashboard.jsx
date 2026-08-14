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

import { PageSkeleton } from '../../components/ui/Skeleton'

/**
 * Akademik Dashboard - Operasional akademik (guru/admin)
 * Fokus pada hafalan, nilai, presensi, dan santri
 */
const AkademikDashboard = () => {
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
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        try {
            const fetchPromise = Promise.all([
                supabase.from('santri').select('*', { count: 'exact', head: true }).eq('status', 'Aktif'),
                supabase.from('halaqoh').select('*', { count: 'exact', head: true })
            ])
            const [santriRes, halaqohRes] = await Promise.race([fetchPromise, timeoutPromise])
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
                    color: '#4b5563',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: '#ffffff',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                titleFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
                bodyFont: { family: "'Inter', sans-serif", size: 13 }
            }
        },
        scales: {
            y: {
                grid: {
                    color: '#f3f4f6',
                },
                ticks: {
                    color: '#6b7280',
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
                    color: '#6b7280',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    }
                }
            }
        }
    }

    if (loading) return <PageSkeleton />

    return (
        <div className="akademik-dashboard" data-dashboard="akademik">
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

            {/* Quick Stats - Mobile-First 2x2 Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 mb-6 mt-4">
                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md flex flex-col justify-between group hover:border-emerald-300 transition-all duration-300 relative overflow-hidden active:scale-95 touch-manipulation">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full hidden sm:inline-block">Santri</span>
                    </div>
                    <div>
                        <p className="text-gray-500 font-semibold mb-0.5 text-[11px] sm:text-xs truncate">Santri Aktif</p>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                            {loading ? '...' : stats.totalSantri}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md flex flex-col justify-between group hover:border-teal-300 transition-all duration-300 relative overflow-hidden active:scale-95 touch-manipulation">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="p-2 sm:p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                            <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full hidden sm:inline-block">Halaqoh</span>
                    </div>
                    <div>
                        <p className="text-gray-500 font-semibold mb-0.5 text-[11px] sm:text-xs truncate">Total Halaqoh</p>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                            {loading ? '...' : stats.totalHalaqoh}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md flex flex-col justify-between group hover:border-purple-300 transition-all duration-300 relative overflow-hidden active:scale-95 touch-manipulation">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="p-2 sm:p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            <BookMarked className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full hidden sm:inline-block">Hafalan</span>
                    </div>
                    <div>
                        <p className="text-gray-500 font-semibold mb-0.5 text-[11px] sm:text-xs truncate">Total Hafalan</p>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                            {hafalanStats.total}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md flex flex-col justify-between group hover:border-blue-300 transition-all duration-300 relative overflow-hidden active:scale-95 touch-manipulation">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full hidden sm:inline-block">Lancar</span>
                    </div>
                    <div>
                        <p className="text-gray-500 font-semibold mb-0.5 text-[11px] sm:text-xs truncate">Hafalan Lancar</p>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                            {hafalanStats.lancar}
                        </h3>
                    </div>
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

            {/* Akses Cepat */}
            <div className="akademik-card">
                <div className="card-header">
                    <h3><Clock size={20} /> Akses Cepat</h3>
                </div>
                <div className="quick-actions">
                    <Link to="/akademik/menu/input-nilai" className="quick-action-btn">
                        <PenLine size={20} />
                        <span>Input Nilai</span>
                    </Link>
                    <Link to="/akademik/menu/rekap-nilai" className="quick-action-btn">
                        <FileText size={20} />
                        <span>Rekap Nilai</span>
                    </Link>
                    <Link to="/hafalan" className="quick-action-btn">
                        <BookMarked size={20} />
                        <span>Hafalan</span>
                    </Link>
                    <Link to="/akademik/menu/laporan" className="quick-action-btn">
                        <Download size={20} />
                        <span>Laporan</span>
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}

        </div>
    )
}

export default AkademikDashboard
