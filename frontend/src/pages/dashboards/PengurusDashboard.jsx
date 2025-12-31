import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    AlertTriangle,
    AlertCircle,
    Bell,
    FileText,
    Newspaper,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Shield,
    UserCog,
    Eye,
    Calendar,
    ClipboardList
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './PengurusDashboard.css'

/**
 * Dashboard Pengurus - Pusat pembinaan dan pengawasan santri
 * Fokus: Pelanggaran, Santri Bermasalah, Pengumuman, Buletin
 */
const PengurusDashboard = () => {
    const [stats, setStats] = useState({
        totalPelanggaran: 0,
        kasusOpen: 0,
        kasusProses: 0,
        kasusSelesai: 0,
        santriBermasalah: 0,
        pengumumanAktif: 0,
        buletinBulanIni: 0
    })
    const [recentPelanggaran, setRecentPelanggaran] = useState([])
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
        fetchRecentPelanggaran()
        updateGreeting()

        const interval = setInterval(updateGreeting, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            // Fetch pelanggaran stats
            const { data: pelanggaranData, error: pelanggaranError } = await supabase
                .from('pelanggaran')
                .select('status')

            if (pelanggaranError) {
                console.log('Pelanggaran table may not exist yet:', pelanggaranError.message)
            }

            const pelanggaran = pelanggaranData || []
            const kasusOpen = pelanggaran.filter(p => p.status === 'OPEN').length
            const kasusProses = pelanggaran.filter(p => p.status === 'PROSES').length
            const kasusSelesai = pelanggaran.filter(p => p.status === 'SELESAI').length

            // Fetch santri bermasalah count
            const { count: santriBermasalahCount } = await supabase
                .from('santri_bermasalah')
                .select('*', { count: 'exact', head: true })
                .catch(() => ({ count: 0 }))

            // Fetch pengumuman aktif
            const today = new Date().toISOString().split('T')[0]
            const { count: pengumumanCount } = await supabase
                .from('pengumuman_internal')
                .select('*', { count: 'exact', head: true })
                .eq('is_archived', false)
                .lte('mulai_tampil', today)
                .or(`selesai_tampil.is.null,selesai_tampil.gte.${today}`)
                .catch(() => ({ count: 0 }))

            // Fetch buletin bulan ini
            const currentMonth = new Date().getMonth() + 1
            const currentYear = new Date().getFullYear()
            const { count: buletinCount } = await supabase
                .from('buletin_pondok')
                .select('*', { count: 'exact', head: true })
                .eq('bulan', currentMonth)
                .eq('tahun', currentYear)
                .catch(() => ({ count: 0 }))

            setStats({
                totalPelanggaran: pelanggaran.length,
                kasusOpen,
                kasusProses,
                kasusSelesai,
                santriBermasalah: santriBermasalahCount || 0,
                pengumumanAktif: pengumumanCount || 0,
                buletinBulanIni: buletinCount || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchRecentPelanggaran = async () => {
        try {
            const { data, error } = await supabase
                .from('pelanggaran')
                .select(`
                    id,
                    tanggal,
                    jenis,
                    tingkat,
                    status,
                    santri:santri_id (
                        id,
                        nama,
                        nis
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) {
                console.log('Pelanggaran table may not exist yet')
                return
            }

            setRecentPelanggaran(data || [])
        } catch (error) {
            console.log('Error fetching recent pelanggaran:', error.message)
        }
    }

    const getTingkatLabel = (tingkat) => {
        const labels = {
            1: { text: 'Ringan', class: 'tingkat-ringan' },
            2: { text: 'Sedang', class: 'tingkat-sedang' },
            3: { text: 'Berat', class: 'tingkat-berat' },
            4: { text: 'Sangat Berat', class: 'tingkat-sangat-berat' }
        }
        return labels[tingkat] || { text: 'Unknown', class: '' }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'OPEN': return <AlertCircle size={16} className="status-open" />
            case 'PROSES': return <Clock size={16} className="status-proses" />
            case 'SELESAI': return <CheckCircle size={16} className="status-selesai" />
            default: return <XCircle size={16} />
        }
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="pengurus-dashboard">
            {/* Welcome Header */}
            <div className="dashboard-welcome pengurus-welcome">
                <div className="welcome-content">
                    <h1>👋 {greeting}, Pengurus!</h1>
                    <p>Dashboard Pembinaan & Pengawasan Santri</p>
                </div>
                <div className="welcome-badge pengurus-badge">
                    <UserCog size={20} />
                    <span>Dashboard Pengurus</span>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="pengurus-stats-grid">
                {/* Pelanggaran Stats */}
                <div className="pengurus-stat-card danger">
                    <div className="stat-info">
                        <span className="stat-label">Total Pelanggaran</span>
                        <span className="stat-value">{loading ? '...' : stats.totalPelanggaran}</span>
                    </div>
                    <div className="stat-icon-box danger">
                        <AlertTriangle size={24} />
                    </div>
                </div>

                <div className="pengurus-stat-card warning">
                    <div className="stat-info">
                        <span className="stat-label">Kasus Open</span>
                        <span className="stat-value">{loading ? '...' : stats.kasusOpen}</span>
                    </div>
                    <div className="stat-icon-box warning">
                        <AlertCircle size={24} />
                    </div>
                </div>

                <div className="pengurus-stat-card info">
                    <div className="stat-info">
                        <span className="stat-label">Dalam Proses</span>
                        <span className="stat-value">{loading ? '...' : stats.kasusProses}</span>
                    </div>
                    <div className="stat-icon-box info">
                        <Clock size={24} />
                    </div>
                </div>

                <div className="pengurus-stat-card success">
                    <div className="stat-info">
                        <span className="stat-label">Selesai</span>
                        <span className="stat-value">{loading ? '...' : stats.kasusSelesai}</span>
                    </div>
                    <div className="stat-icon-box success">
                        <CheckCircle size={24} />
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="pengurus-secondary-stats">
                <div className="secondary-stat-card">
                    <div className="secondary-stat-icon purple">
                        <Users size={20} />
                    </div>
                    <div className="secondary-stat-info">
                        <span className="secondary-stat-value">{loading ? '...' : stats.santriBermasalah}</span>
                        <span className="secondary-stat-label">Santri Bermasalah</span>
                    </div>
                </div>

                <div className="secondary-stat-card">
                    <div className="secondary-stat-icon blue">
                        <Bell size={20} />
                    </div>
                    <div className="secondary-stat-info">
                        <span className="secondary-stat-value">{loading ? '...' : stats.pengumumanAktif}</span>
                        <span className="secondary-stat-label">Pengumuman Aktif</span>
                    </div>
                </div>

                <div className="secondary-stat-card">
                    <div className="secondary-stat-icon green">
                        <Newspaper size={20} />
                    </div>
                    <div className="secondary-stat-info">
                        <span className="secondary-stat-value">{loading ? '...' : stats.buletinBulanIni}</span>
                        <span className="secondary-stat-label">Buletin Bulan Ini</span>
                    </div>
                </div>
            </div>

            {/* Main Content Row */}
            <div className="pengurus-row">
                {/* Recent Pelanggaran */}
                <div className="pengurus-card">
                    <div className="card-header">
                        <h3><AlertTriangle size={20} /> Pelanggaran Terbaru</h3>
                        <Link to="/pengurus/pelanggaran" className="card-link">Lihat Semua →</Link>
                    </div>
                    <div className="pelanggaran-list">
                        {recentPelanggaran.length === 0 ? (
                            <div className="empty-state">
                                <CheckCircle size={40} />
                                <p>Belum ada pelanggaran tercatat</p>
                            </div>
                        ) : (
                            recentPelanggaran.map((item) => (
                                <div key={item.id} className="pelanggaran-item">
                                    <div className="pelanggaran-status">
                                        {getStatusIcon(item.status)}
                                    </div>
                                    <div className="pelanggaran-info">
                                        <span className="pelanggaran-santri">{item.santri?.nama || 'Unknown'}</span>
                                        <span className="pelanggaran-jenis">{item.jenis}</span>
                                    </div>
                                    <div className="pelanggaran-meta">
                                        <span className={`tingkat-badge ${getTingkatLabel(item.tingkat).class}`}>
                                            {getTingkatLabel(item.tingkat).text}
                                        </span>
                                        <span className="pelanggaran-date">{formatDate(item.tanggal)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="pengurus-card">
                    <div className="card-header">
                        <h3><ClipboardList size={20} /> Aksi Cepat</h3>
                    </div>
                    <div className="quick-actions-grid">
                        <Link to="/pengurus/pelanggaran/create" className="quick-action-btn danger">
                            <AlertTriangle size={24} />
                            <span>Catat Pelanggaran</span>
                        </Link>
                        <Link to="/pengurus/santri-bermasalah" className="quick-action-btn warning">
                            <Users size={24} />
                            <span>Santri Bermasalah</span>
                        </Link>
                        <Link to="/pengurus/pengumuman" className="quick-action-btn info">
                            <Bell size={24} />
                            <span>Buat Pengumuman</span>
                        </Link>
                        <Link to="/pengurus/buletin" className="quick-action-btn success">
                            <Newspaper size={24} />
                            <span>Upload Buletin</span>
                        </Link>
                        <Link to="/pengurus/informasi" className="quick-action-btn purple">
                            <FileText size={24} />
                            <span>Info Pondok</span>
                        </Link>
                        <Link to="/pengurus/arsip" className="quick-action-btn gray">
                            <Eye size={24} />
                            <span>Lihat Arsip</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            <div className="pengurus-card summary-card">
                <div className="card-header">
                    <h3><TrendingUp size={20} /> Ringkasan Pembinaan</h3>
                    <span className="summary-period">
                        <Calendar size={16} />
                        Bulan Ini
                    </span>
                </div>
                <div className="summary-content">
                    <div className="summary-item">
                        <div className="summary-icon danger">
                            <AlertTriangle size={20} />
                        </div>
                        <div className="summary-text">
                            <span className="summary-number">{stats.kasusOpen + stats.kasusProses}</span>
                            <span className="summary-label">Kasus perlu ditangani</span>
                        </div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-icon success">
                            <CheckCircle size={20} />
                        </div>
                        <div className="summary-text">
                            <span className="summary-number">{stats.kasusSelesai}</span>
                            <span className="summary-label">Kasus terselesaikan</span>
                        </div>
                    </div>
                    <div className="summary-item">
                        <div className="summary-icon info">
                            <Shield size={20} />
                        </div>
                        <div className="summary-text">
                            <span className="summary-number">
                                {stats.totalPelanggaran > 0
                                    ? Math.round((stats.kasusSelesai / stats.totalPelanggaran) * 100)
                                    : 100}%
                            </span>
                            <span className="summary-label">Tingkat penyelesaian</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PengurusDashboard
