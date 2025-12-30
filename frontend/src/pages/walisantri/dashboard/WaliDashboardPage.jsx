import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    BookOpen, Wallet, Calendar, Bell, CheckCircle, AlertCircle,
    Clock, TrendingUp, ChevronRight, RefreshCw
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import '../WaliPortal.css'

/**
 * WaliDashboardPage - Dashboard utama untuk Portal Wali Santri
 * Menampilkan ringkasan info santri, hafalan terakhir, status SPP, dan kehadiran
 */
const WaliDashboardPage = () => {
    const { user, userProfile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [dashboardData, setDashboardData] = useState({
        hafalanTerakhir: null,
        presensiStats: { hadir: 0, izin: 0, alpha: 0 },
        tagihanBelumLunas: [],
        pengumumanTerbaru: []
    })

    // Fetch santri list milik wali
    const fetchSantriList = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select(`
          *,
          kelas:kelas_id (nama),
          halaqoh:halaqoh_id (nama)
        `)
                .eq('wali_id', user.id)
                .order('nama')

            if (error) throw error

            setSantriList(data || [])
            if (data && data.length > 0) {
                setSelectedSantri(data[0])
            }
        } catch (error) {
            console.error('Error fetching santri:', error)
        }
    }

    // Fetch dashboard data untuk santri yang dipilih
    const fetchDashboardData = async (santriId) => {
        if (!santriId) return

        try {
            // Fetch hafalan terakhir
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select('*, guru:penguji_id (nama)')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })
                .limit(1)
                .single()

            // Fetch presensi stats (30 hari terakhir)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const { data: presensiData } = await supabase
                .from('presensi')
                .select('status')
                .eq('santri_id', santriId)
                .gte('tanggal', thirtyDaysAgo.toISOString().split('T')[0])

            const presensiStats = {
                hadir: 0,
                izin: 0,
                sakit: 0,
                alpha: 0
            }

            if (presensiData) {
                presensiData.forEach(p => {
                    if (presensiStats.hasOwnProperty(p.status)) {
                        presensiStats[p.status]++
                    }
                })
            }

            // Fetch tagihan belum lunas
            const { data: tagihanData } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama)')
                .eq('santri_id', santriId)
                .neq('status', 'Lunas')
                .order('jatuh_tempo')
                .limit(5)

            // Fetch pengumuman terbaru
            const { data: pengumumanData } = await supabase
                .from('pengumuman')
                .select('*')
                .eq('is_active', true)
                .order('tanggal_publish', { ascending: false })
                .limit(3)

            setDashboardData({
                hafalanTerakhir: hafalanData,
                presensiStats: presensiStats,
                tagihanBelumLunas: tagihanData || [],
                pengumumanTerbaru: pengumumanData || []
            })
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchDashboardData(selectedSantri.id)
        }
    }, [selectedSantri])

    const handleRefresh = () => {
        setLoading(true)
        fetchSantriList().finally(() => setLoading(false))
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    if (santriList.length === 0) {
        return (
            <div className="wali-empty-state">
                <div className="wali-empty-icon">
                    <AlertCircle size={40} />
                </div>
                <h3 className="wali-empty-title">Belum Ada Data Santri</h3>
                <p className="wali-empty-text">
                    Akun Anda belum terhubung dengan data santri. Silakan hubungi admin pondok.
                </p>
            </div>
        )
    }

    return (
        <div className="wali-dashboard">
            {/* Header */}
            <div className="wali-page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="wali-page-title">Beranda</h1>
                        <p className="wali-page-subtitle">
                            Assalamu'alaikum, {userProfile?.nama || 'Bapak/Ibu'} 👋
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="wali-btn wali-btn-secondary"
                        style={{ padding: '10px' }}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Santri Selector (jika lebih dari 1 santri) */}
            {santriList.length > 1 && (
                <div className="wali-santri-selector">
                    {santriList.map(santri => (
                        <SantriCard
                            key={santri.id}
                            santri={santri}
                            selected={selectedSantri?.id === santri.id}
                            onClick={() => setSelectedSantri(santri)}
                        />
                    ))}
                </div>
            )}

            {/* Santri Info Card */}
            {selectedSantri && santriList.length === 1 && (
                <SantriCard santri={selectedSantri} showDetails />
            )}

            {/* Quick Stats */}
            <div className="wali-dashboard-grid" style={{ marginTop: '24px' }}>
                {/* Hafalan Terakhir */}
                <div className="wali-stat-card">
                    <div className="wali-stat-header">
                        <div className="wali-stat-icon green">
                            <BookOpen size={22} />
                        </div>
                    </div>
                    <p className="wali-stat-value">
                        {dashboardData.hafalanTerakhir?.surah || '-'}
                    </p>
                    <p className="wali-stat-label">
                        Hafalan Terakhir
                        {dashboardData.hafalanTerakhir?.tanggal && (
                            <span> • {formatDate(dashboardData.hafalanTerakhir.tanggal)}</span>
                        )}
                    </p>
                </div>

                {/* Kehadiran */}
                <div className="wali-stat-card">
                    <div className="wali-stat-header">
                        <div className="wali-stat-icon blue">
                            <Calendar size={22} />
                        </div>
                    </div>
                    <p className="wali-stat-value">
                        {dashboardData.presensiStats.hadir}
                    </p>
                    <p className="wali-stat-label">
                        Hadir (30 hari terakhir)
                    </p>
                </div>

                {/* Status SPP */}
                <div className="wali-stat-card">
                    <div className="wali-stat-header">
                        <div className={`wali-stat-icon ${dashboardData.tagihanBelumLunas.length > 0 ? 'red' : 'green'}`}>
                            <Wallet size={22} />
                        </div>
                    </div>
                    <p className="wali-stat-value">
                        {dashboardData.tagihanBelumLunas.length > 0 ? (
                            <span style={{ color: '#dc2626' }}>
                                {dashboardData.tagihanBelumLunas.length} Tagihan
                            </span>
                        ) : (
                            <span style={{ color: '#16a34a' }}>Lunas</span>
                        )}
                    </p>
                    <p className="wali-stat-label">Status Pembayaran</p>
                </div>
            </div>

            {/* Tagihan Belum Lunas */}
            {dashboardData.tagihanBelumLunas.length > 0 && (
                <div className="wali-section">
                    <div className="wali-section-header">
                        <h3 className="wali-section-title">Tagihan Belum Lunas</h3>
                        <Link to="/wali/keuangan" className="wali-section-link">
                            Lihat Semua <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="wali-data-list">
                        {dashboardData.tagihanBelumLunas.map(tagihan => (
                            <div key={tagihan.id} className="wali-data-item">
                                <div className="wali-data-item-info">
                                    <p className="wali-data-item-title">
                                        {tagihan.kategori?.nama || 'Pembayaran'}
                                    </p>
                                    <p className="wali-data-item-subtitle">
                                        Jatuh tempo: {formatDate(tagihan.jatuh_tempo)}
                                    </p>
                                </div>
                                <span className="wali-data-item-value belum">
                                    {formatCurrency(tagihan.jumlah)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pengumuman Terbaru */}
            <div className="wali-section">
                <div className="wali-section-header">
                    <h3 className="wali-section-title">Pengumuman Terbaru</h3>
                    <Link to="/wali/informasi" className="wali-section-link">
                        Lihat Semua <ChevronRight size={14} />
                    </Link>
                </div>

                {dashboardData.pengumumanTerbaru.length > 0 ? (
                    dashboardData.pengumumanTerbaru.map(pengumuman => (
                        <div key={pengumuman.id} className="wali-pengumuman-item">
                            <p className="wali-pengumuman-date">
                                {formatDate(pengumuman.tanggal_publish)}
                            </p>
                            <h4 className="wali-pengumuman-title">{pengumuman.judul}</h4>
                            <p className="wali-pengumuman-content">
                                {pengumuman.isi.length > 150
                                    ? pengumuman.isi.substring(0, 150) + '...'
                                    : pengumuman.isi}
                            </p>
                            <span className={`wali-pengumuman-kategori ${pengumuman.kategori?.toLowerCase()}`}>
                                {pengumuman.kategori}
                            </span>
                        </div>
                    ))
                ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Belum ada pengumuman terbaru.
                    </p>
                )}
            </div>

            {/* Quick Actions */}
            <div className="wali-section">
                <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>Akses Cepat</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <Link to="/wali/akademik/hafalan" className="wali-btn wali-btn-secondary">
                        <BookOpen size={18} />
                        Lihat Hafalan
                    </Link>
                    <Link to="/wali/keuangan" className="wali-btn wali-btn-secondary">
                        <Wallet size={18} />
                        Cek Tagihan
                    </Link>
                    <Link to="/wali/akademik/kehadiran" className="wali-btn wali-btn-secondary">
                        <Calendar size={18} />
                        Kehadiran
                    </Link>
                    <Link to="/wali/pesan/kirim" className="wali-btn wali-btn-primary">
                        <Bell size={18} />
                        Kirim Pesan
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default WaliDashboardPage
