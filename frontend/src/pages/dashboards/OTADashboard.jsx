import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Wallet, TrendingUp, TrendingDown, Users,
    ChevronRight, Info, HeartHandshake, AlertCircle,
    ArrowUpCircle, ArrowDownCircle, PieChart, BarChart3,
    Plus, RefreshCw, Target, Award, Shield
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import './OTADashboard.css'

/**
 * OTA Dashboard - Professional Design
 * Consistent with KeuanganDashboard styling
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
            <div className="ota-dashboard">
                <div className="ota-dashboard-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <Spinner label="Memuat Dashboard OTA..." />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="ota-dashboard">
                <div className="ota-dashboard-inner">
                    <div style={{ maxWidth: 480, margin: '4rem auto', padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '1rem', textAlign: 'center' }}>
                        <AlertCircle style={{ margin: '0 auto 1rem', color: '#dc2626' }} size={48} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#b91c1c', marginBottom: '0.5rem' }}>Terjadi Kesalahan</h3>
                        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>
                        <button onClick={fetchDashboardData} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
                            <RefreshCw size={16} /> Coba Lagi
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const progressPercent = stats.totalDonasi > 0 ? Math.min(Math.round((stats.pengeluaran / stats.totalDonasi) * 100), 100) : 0

    return (
        <div className="ota-dashboard">
            <div className="ota-dashboard-inner">

                {/* === WELCOME HEADER === */}
                <div className="ota-welcome-header">
                    <div className="ota-welcome-content">
                        <div className="ota-welcome-info">
                            <div className="ota-welcome-icon">
                                <HeartHandshake size={28} />
                            </div>
                            <div className="ota-welcome-text">
                                <h1>Dashboard Orang Tua Asuh</h1>
                                <p>Kelola program donasi dan monitoring santri penerima</p>
                            </div>
                        </div>
                        <div className="ota-welcome-actions">
                            <button className="ota-welcome-btn secondary" onClick={() => navigate('/ota/pemasukan')}>
                                <Plus size={16} /> Tambah Donasi
                            </button>
                            <button className="ota-welcome-btn primary" onClick={() => navigate('/ota/laporan')}>
                                <BarChart3 size={16} /> Lihat Laporan
                            </button>
                        </div>
                    </div>
                </div>

                {/* === STATS GRID === */}
                <div className="ota-stats-grid">
                    <div className="ota-stat-card blue">
                        <div className="ota-stat-info">
                            <span className="ota-stat-label">Total OTA Aktif</span>
                            <span className="ota-stat-value">{stats.otaCount}</span>
                        </div>
                        <div className="ota-stat-icon-box">
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="ota-stat-card purple">
                        <div className="ota-stat-info">
                            <span className="ota-stat-label">Santri Penerima</span>
                            <span className="ota-stat-value">{stats.santriCount}</span>
                        </div>
                        <div className="ota-stat-icon-box">
                            <Target size={24} />
                        </div>
                    </div>
                    <div className="ota-stat-card green">
                        <div className="ota-stat-info">
                            <span className="ota-stat-label">Total Donasi</span>
                            <span className="ota-stat-value">{formatRupiah(stats.totalDonasi)}</span>
                            <span className="ota-stat-subvalue">+{formatRupiah(stats.donasiThisMonth)} bulan ini</span>
                        </div>
                        <div className="ota-stat-icon-box">
                            <ArrowUpCircle size={24} />
                        </div>
                    </div>
                    <div className={`ota-stat-card ${stats.saldo >= 0 ? 'emerald' : 'red'}`}>
                        <div className="ota-stat-info">
                            <span className="ota-stat-label">Saldo Tersedia</span>
                            <span className="ota-stat-value">{formatRupiah(stats.saldo)}</span>
                        </div>
                        <div className="ota-stat-icon-box">
                            <Wallet size={24} />
                        </div>
                    </div>
                </div>

                {/* === MAIN CONTENT === */}
                <div className="ota-content-grid">

                    {/* LEFT COLUMN */}
                    <div>
                        {/* Recent Pemasukan */}
                        <div className="ota-panel">
                            <div className="ota-panel-header">
                                <div className="ota-panel-title">
                                    <div className="ota-panel-title-icon green">
                                        <ArrowUpCircle size={18} />
                                    </div>
                                    <div>
                                        <h3>Donasi Terbaru</h3>
                                        <p>5 donasi terakhir</p>
                                    </div>
                                </div>
                                <button className="ota-panel-link" onClick={() => navigate('/ota/pemasukan')}>
                                    Lihat Semua <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="ota-transaction-list">
                                {recentPemasukan.length > 0 ? recentPemasukan.map((item, idx) => (
                                    <div key={idx} className="ota-transaction-item">
                                        <div className="ota-transaction-info">
                                            <div className="ota-transaction-avatar income">
                                                {item.ota?.nama?.substring(0, 2).toUpperCase() || 'OT'}
                                            </div>
                                            <div className="ota-transaction-details">
                                                <h4>{item.ota?.nama || '-'}</h4>
                                                <p>{formatDate(item.tanggal)}</p>
                                            </div>
                                        </div>
                                        <span className="ota-transaction-amount income">{formatRupiah(item.jumlah)}</span>
                                    </div>
                                )) : (
                                    <div className="ota-empty-state">
                                        <TrendingUp size={32} style={{ color: '#d1d5db', marginBottom: '0.5rem' }} />
                                        <p>Belum ada data donasi</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Pengeluaran */}
                        <div className="ota-panel">
                            <div className="ota-panel-header">
                                <div className="ota-panel-title">
                                    <div className="ota-panel-title-icon orange">
                                        <ArrowDownCircle size={18} />
                                    </div>
                                    <div>
                                        <h3>Pengeluaran Terbaru</h3>
                                        <p>5 pengeluaran terakhir</p>
                                    </div>
                                </div>
                                <button className="ota-panel-link" onClick={() => navigate('/ota/pengeluaran')}>
                                    Lihat Semua <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="ota-transaction-list">
                                {recentPengeluaran.length > 0 ? recentPengeluaran.map((item, idx) => (
                                    <div key={idx} className="ota-transaction-item">
                                        <div className="ota-transaction-info">
                                            <div className="ota-transaction-avatar expense">
                                                <TrendingDown size={16} />
                                            </div>
                                            <div className="ota-transaction-details">
                                                <h4>{item.keperluan || item.keterangan || '-'}</h4>
                                                <p>{formatDate(item.tanggal)}</p>
                                            </div>
                                        </div>
                                        <span className="ota-transaction-amount expense">-{formatRupiah(item.jumlah)}</span>
                                    </div>
                                )) : (
                                    <div className="ota-empty-state">
                                        <TrendingDown size={32} style={{ color: '#d1d5db', marginBottom: '0.5rem' }} />
                                        <p>Belum ada data pengeluaran</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div>
                        {/* Financial Summary */}
                        <div className="ota-panel">
                            <div className="ota-panel-header">
                                <div className="ota-panel-title">
                                    <div className="ota-panel-title-icon emerald">
                                        <PieChart size={18} />
                                    </div>
                                    <div>
                                        <h3>Ringkasan Keuangan</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="ota-summary-panel">
                                <div className="ota-summary-row">
                                    <span className="ota-summary-label">Total Pemasukan</span>
                                    <span className="ota-summary-value income">{formatRupiah(stats.totalDonasi)}</span>
                                </div>
                                <div className="ota-summary-row">
                                    <span className="ota-summary-label">Total Pengeluaran</span>
                                    <span className="ota-summary-value expense">{formatRupiah(stats.pengeluaran)}</span>
                                </div>
                                <div className="ota-summary-row total">
                                    <span className="ota-summary-label" style={{ fontWeight: 600, color: '#1f2937' }}>Saldo Akhir</span>
                                    <span className={`ota-summary-value balance ${stats.saldo < 0 ? 'negative' : ''}`}>
                                        {formatRupiah(stats.saldo)}
                                    </span>
                                </div>
                            </div>
                            <div className="ota-progress-wrapper">
                                <div className="ota-progress-header">
                                    <span>Dana Tersalurkan</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="ota-progress-bar">
                                    <div className="ota-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Top Donors */}
                        <div className="ota-panel" style={{ marginTop: '1.5rem' }}>
                            <div className="ota-panel-header">
                                <div className="ota-panel-title">
                                    <div className="ota-panel-title-icon amber">
                                        <Award size={18} />
                                    </div>
                                    <div>
                                        <h3>Top Donatur</h3>
                                    </div>
                                </div>
                            </div>
                            <div>
                                {topDonors.length > 0 ? topDonors.map((donor, idx) => (
                                    <div key={idx} className="ota-donor-item">
                                        <div className={`ota-donor-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default'}`}>
                                            {idx + 1}
                                        </div>
                                        <span className="ota-donor-name">{donor.nama}</span>
                                        <span className="ota-donor-amount">{formatRupiah(donor.total)}</span>
                                    </div>
                                )) : (
                                    <div className="ota-empty-state">
                                        <p>Belum ada data donatur</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Announcements */}
                        {announcements.length > 0 && (
                            <div className="ota-panel ota-announcements" style={{ marginTop: '1.5rem' }}>
                                <div className="ota-panel-header">
                                    <div className="ota-panel-title">
                                        <Info size={18} style={{ color: '#d97706' }} />
                                        <div>
                                            <h3>Pengumuman</h3>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {announcements.map((item, idx) => (
                                        <div key={idx} className="ota-announcement-item">
                                            <h4>{item.judul}</h4>
                                            <p>{item.isi}</p>
                                            <time>{formatDate(item.created_at)}</time>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Links */}
                        <div className="ota-quick-links" style={{ marginTop: '1.5rem' }}>
                            <h4><Shield size={16} /> Akses Cepat</h4>
                            <button className="ota-quick-link" onClick={() => navigate('/admin/ota')}>
                                Data OTA <ChevronRight size={16} />
                            </button>
                            <button className="ota-quick-link" onClick={() => navigate('/ota/santri')}>
                                Santri Penerima <ChevronRight size={16} />
                            </button>
                            <button className="ota-quick-link" onClick={() => navigate('/ota/laporan')}>
                                Laporan Keuangan <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OTADashboard
