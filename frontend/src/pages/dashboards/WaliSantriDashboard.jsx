import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
    Users,
    BookMarked,
    FileText,
    CalendarCheck,
    Receipt,
    Download,
    User,
    CheckCircle,
    Clock,
    AlertCircle,
    GraduationCap
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './WaliSantriDashboard.css'

/**
 * Wali Santri Dashboard - Read-only portal untuk wali santri
 * Fokus pada melihat data anak: nilai, hafalan, presensi, tagihan
 */
const WaliSantriDashboard = () => {
    const { user, userProfile } = useAuth()
    const [santriData, setSantriData] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanStats, setHafalanStats] = useState({ total: 0, lancar: 0 })
    const [tagihanStats, setTagihanStats] = useState({ total: 0, lunas: 0, pending: 0 })
    const [loading, setLoading] = useState(true)
    const [greeting, setGreeting] = useState('')

    const updateGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 4 && hour < 11) setGreeting('Selamat Pagi')
        else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang')
        else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore')
        else setGreeting('Selamat Malam')
    }

    useEffect(() => {
        fetchSantriData()
        updateGreeting()
        const interval = setInterval(updateGreeting, 60000)
        return () => clearInterval(interval)
    }, [user])

    const fetchSantriData = async () => {
        setLoading(true)
        try {
            // Fetch santri linked to this wali
            const { data: santriList, error } = await supabase
                .from('santri')
                .select(`
                    id, nama, nis, kelas_id,
                    kelas:kelas_id(nama)
                `)
                .eq('wali_user_id', user?.id)

            if (error) {
                // Fallback: try to get santri from wali profile link
                console.log('Fetching from wali profile...')
            }

            if (santriList && santriList.length > 0) {
                setSantriData(santriList)
                setSelectedSantri(santriList[0])
                await fetchSantriStats(santriList[0].id)
            }
        } catch (error) {
            console.error('Error fetching santri data:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchSantriStats = async (santriId) => {
        try {
            // Fetch hafalan stats
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select('status')
                .eq('santri_id', santriId)

            const total = hafalanData?.length || 0
            const lancar = hafalanData?.filter(h => h.status === 'Lancar').length || 0
            setHafalanStats({ total, lancar })

            // Fetch tagihan stats
            const { data: tagihanData } = await supabase
                .from('tagihan_santri')
                .select('status, jumlah')
                .eq('santri_id', santriId)

            const totalTagihan = tagihanData?.length || 0
            const lunas = tagihanData?.filter(t => t.status === 'lunas').length || 0
            const pending = totalTagihan - lunas
            setTagihanStats({ total: totalTagihan, lunas, pending })
        } catch (error) {
            console.log('Error fetching stats:', error.message)
        }
    }

    const handleSelectSantri = async (santri) => {
        setSelectedSantri(santri)
        await fetchSantriStats(santri.id)
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const waliName = userProfile?.nama || user?.email?.split('@')[0] || 'Wali'

    return (
        <div className="walisantri-dashboard" data-dashboard="walisantri">
            {/* Welcome Header */}
            <div className="dashboard-welcome walisantri">
                <div className="welcome-content">
                    <h1>👋 {greeting}, {waliName}!</h1>
                    <p>Portal Wali Santri - PTQA Batuan</p>
                </div>
                <div className="welcome-badge">
                    <Users size={20} />
                    <span>Wali Santri</span>
                </div>
            </div>

            {/* Santri Selector (if more than one) */}
            {santriData.length > 1 && (
                <div className="santri-selector">
                    <span className="selector-label">Pilih Anak:</span>
                    <div className="santri-tabs">
                        {santriData.map(santri => (
                            <button
                                key={santri.id}
                                className={`santri-tab ${selectedSantri?.id === santri.id ? 'active' : ''}`}
                                onClick={() => handleSelectSantri(santri)}
                            >
                                <User size={16} />
                                {santri.nama}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Memuat data...</p>
                </div>
            ) : selectedSantri ? (
                <>
                    {/* Santri Profile Card */}
                    <div className="wali-card profile-card">
                        <div className="profile-avatar">
                            <User size={48} />
                        </div>
                        <div className="profile-info">
                            <h2>{selectedSantri.nama}</h2>
                            <div className="profile-details">
                                <span><GraduationCap size={16} /> NIS: {selectedSantri.nis || '-'}</span>
                                <span><Users size={16} /> Kelas: {selectedSantri.kelas?.nama || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="wali-stats-grid">
                        <div className="wali-stat-card">
                            <div className="stat-icon hafalan">
                                <BookMarked size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{hafalanStats.total}</span>
                                <span className="stat-label">Total Hafalan</span>
                            </div>
                        </div>
                        <div className="wali-stat-card">
                            <div className="stat-icon lancar">
                                <CheckCircle size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{hafalanStats.lancar}</span>
                                <span className="stat-label">Hafalan Lancar</span>
                            </div>
                        </div>
                        <div className="wali-stat-card">
                            <div className="stat-icon tagihan">
                                <Receipt size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{tagihanStats.pending}</span>
                                <span className="stat-label">Tagihan Pending</span>
                            </div>
                        </div>
                        <div className="wali-stat-card">
                            <div className="stat-icon lunas">
                                <CheckCircle size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{tagihanStats.lunas}</span>
                                <span className="stat-label">Tagihan Lunas</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick View Cards */}
                    <div className="wali-cards-grid">
                        <div className="wali-card">
                            <div className="card-header">
                                <h3><FileText size={20} /> Nilai</h3>
                            </div>
                            <div className="card-body placeholder">
                                <p>Lihat rekap nilai anak Anda di menu Nilai</p>
                            </div>
                        </div>
                        <div className="wali-card">
                            <div className="card-header">
                                <h3><BookMarked size={20} /> Hafalan</h3>
                            </div>
                            <div className="card-body placeholder">
                                <p>Progress hafalan: {hafalanStats.lancar} dari {hafalanStats.total} lancar</p>
                            </div>
                        </div>
                        <div className="wali-card">
                            <div className="card-header">
                                <h3><CalendarCheck size={20} /> Kehadiran</h3>
                            </div>
                            <div className="card-body placeholder">
                                <p>Lihat rekap kehadiran anak Anda</p>
                            </div>
                        </div>
                        <div className="wali-card">
                            <div className="card-header">
                                <h3><Receipt size={20} /> Tagihan</h3>
                            </div>
                            <div className="card-body placeholder">
                                <p>{tagihanStats.pending} tagihan belum lunas</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Notice */}
                    <div className="wali-notice">
                        <AlertCircle size={20} />
                        <div>
                            <strong>Portal Read-Only</strong>
                            <p>Anda hanya dapat melihat data. Untuk perubahan, silakan hubungi pihak sekolah.</p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="empty-state">
                    <Users size={48} />
                    <h3>Tidak Ada Data Santri</h3>
                    <p>Akun Anda belum terhubung dengan data santri. Silakan hubungi pihak sekolah.</p>
                </div>
            )}
        </div>
    )
}

export default WaliSantriDashboard
