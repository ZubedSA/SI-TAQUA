import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Calendar, CheckCircle, XCircle, Clock,
    AlertCircle, Filter, BarChart2
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import '../WaliPortal.css'

/**
 * KehadiranWaliPage - Halaman untuk melihat data kehadiran santri
 * Read-only - wali hanya bisa melihat, tidak bisa mengedit
 */
const KehadiranWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [presensiData, setPresensiData] = useState([])
    const [stats, setStats] = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0 })
    const [filterBulan, setFilterBulan] = useState('')

    // Generate month options
    const getMonthOptions = () => {
        const options = []
        const now = new Date()
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            options.push({
                value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
            })
        }
        return options
    }

    // Fetch santri list
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

    // Fetch presensi data
    const fetchPresensiData = async (santriId) => {
        if (!santriId) return

        try {
            let query = supabase
                .from('presensi')
                .select('*')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            // Filter by month
            if (filterBulan) {
                const [year, month] = filterBulan.split('-')
                const startDate = `${year}-${month}-01`
                const endDate = new Date(parseInt(year), parseInt(month), 0)
                    .toISOString().split('T')[0]

                query = query
                    .gte('tanggal', startDate)
                    .lte('tanggal', endDate)
            } else {
                // Default: last 30 days
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                query = query.gte('tanggal', thirtyDaysAgo.toISOString().split('T')[0])
            }

            const { data, error } = await query

            if (error) throw error

            setPresensiData(data || [])

            // Calculate stats
            const newStats = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
            if (data) {
                data.forEach(p => {
                    if (newStats.hasOwnProperty(p.status)) {
                        newStats[p.status]++
                    }
                })
            }
            setStats(newStats)

        } catch (error) {
            console.error('Error fetching presensi:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchPresensiData(selectedSantri.id)
        }
    }, [selectedSantri, filterBulan])

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'hadir':
                return <CheckCircle size={18} />
            case 'izin':
                return <Clock size={18} />
            case 'sakit':
                return <AlertCircle size={18} />
            case 'alpha':
                return <XCircle size={18} />
            default:
                return null
        }
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'hadir':
                return 'status-hadir'
            case 'izin':
                return 'status-izin'
            case 'sakit':
                return 'status-sakit'
            case 'alpha':
                return 'status-alpha'
            default:
                return ''
        }
    }

    const getStatusLabel = (status) => {
        const labels = {
            hadir: 'Hadir',
            izin: 'Izin',
            sakit: 'Sakit',
            alpha: 'Alpha'
        }
        return labels[status] || status
    }

    const total = stats.hadir + stats.izin + stats.sakit + stats.alpha
    const persentaseHadir = total > 0 ? Math.round((stats.hadir / total) * 100) : 0

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-kehadiran-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/beranda" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Data Kehadiran</h1>
                <p className="wali-page-subtitle">Rekap kehadiran santri di pondok</p>
            </div>

            {/* Santri Selector */}
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

            {/* Filter */}
            <div className="wali-section" style={{ marginTop: santriList.length > 1 ? 0 : '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
                    <select
                        value={filterBulan}
                        onChange={(e) => setFilterBulan(e.target.value)}
                        className="wali-form-select"
                        style={{ flex: 1 }}
                    >
                        <option value="">30 Hari Terakhir</option>
                        {getMonthOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="wali-stats-grid">
                <div className="wali-stat-mini hadir">
                    <CheckCircle size={20} />
                    <div>
                        <span className="wali-stat-mini-value">{stats.hadir}</span>
                        <span className="wali-stat-mini-label">Hadir</span>
                    </div>
                </div>
                <div className="wali-stat-mini izin">
                    <Clock size={20} />
                    <div>
                        <span className="wali-stat-mini-value">{stats.izin}</span>
                        <span className="wali-stat-mini-label">Izin</span>
                    </div>
                </div>
                <div className="wali-stat-mini sakit">
                    <AlertCircle size={20} />
                    <div>
                        <span className="wali-stat-mini-value">{stats.sakit}</span>
                        <span className="wali-stat-mini-label">Sakit</span>
                    </div>
                </div>
                <div className="wali-stat-mini alpha">
                    <XCircle size={20} />
                    <div>
                        <span className="wali-stat-mini-value">{stats.alpha}</span>
                        <span className="wali-stat-mini-label">Alpha</span>
                    </div>
                </div>
            </div>

            {/* Percentage Bar */}
            <div className="wali-section">
                <div className="wali-attendance-bar">
                    <div className="wali-attendance-header">
                        <BarChart2 size={18} />
                        <span>Persentase Kehadiran</span>
                        <strong>{persentaseHadir}%</strong>
                    </div>
                    <div className="wali-progress-bar">
                        <div
                            className="wali-progress-fill"
                            style={{ width: `${persentaseHadir}%` }}
                        ></div>
                    </div>
                    <p className="wali-attendance-note">
                        {persentaseHadir >= 90 ? '🎉 Excellent! Kehadiran sangat baik.' :
                            persentaseHadir >= 75 ? '👍 Baik! Pertahankan kehadiran.' :
                                persentaseHadir >= 50 ? '⚠️ Perlu ditingkatkan.' :
                                    '❌ Kehadiran perlu perhatian khusus.'}
                    </p>
                </div>
            </div>

            {/* Presensi List */}
            <div className="wali-section">
                <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>
                    Riwayat Kehadiran ({presensiData.length})
                </h3>

                {presensiData.length > 0 ? (
                    <div className="wali-data-list">
                        {presensiData.map(presensi => (
                            <div key={presensi.id} className="wali-presensi-item">
                                <div className={`wali-presensi-icon ${getStatusClass(presensi.status)}`}>
                                    {getStatusIcon(presensi.status)}
                                </div>
                                <div className="wali-presensi-info">
                                    <p className="wali-presensi-date">{formatDate(presensi.tanggal)}</p>
                                    <span className={`wali-presensi-status ${getStatusClass(presensi.status)}`}>
                                        {getStatusLabel(presensi.status)}
                                    </span>
                                    {presensi.keterangan && (
                                        <p className="wali-presensi-ket">{presensi.keterangan}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="wali-empty-state">
                        <div className="wali-empty-icon">
                            <Calendar size={40} />
                        </div>
                        <h3 className="wali-empty-title">Belum Ada Data Kehadiran</h3>
                        <p className="wali-empty-text">
                            Data kehadiran untuk periode ini belum tersedia.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
        .wali-back-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .wali-back-link:hover {
          color: var(--primary-color);
        }
        .wali-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 640px) {
          .wali-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .wali-stat-mini {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }
        .wali-stat-mini.hadir { color: #16a34a; }
        .wali-stat-mini.izin { color: #2563eb; }
        .wali-stat-mini.sakit { color: #d97706; }
        .wali-stat-mini.alpha { color: #dc2626; }
        .wali-stat-mini-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: inherit;
        }
        .wali-stat-mini-label {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .wali-attendance-bar {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 12px;
        }
        .wali-attendance-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .wali-attendance-header strong {
          margin-left: auto;
          font-size: 18px;
          color: var(--primary-color);
        }
        .wali-progress-bar {
          height: 12px;
          background: var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }
        .wali-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #16a34a, #22c55e);
          border-radius: 6px;
          transition: width 0.3s ease;
        }
        .wali-attendance-note {
          margin: 12px 0 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .wali-presensi-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 12px;
          margin-bottom: 8px;
        }
        .wali-presensi-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wali-presensi-icon.status-hadir { background: #dcfce7; color: #16a34a; }
        .wali-presensi-icon.status-izin { background: #dbeafe; color: #2563eb; }
        .wali-presensi-icon.status-sakit { background: #fef3c7; color: #d97706; }
        .wali-presensi-icon.status-alpha { background: #fee2e2; color: #dc2626; }
        .wali-presensi-info {
          flex: 1;
        }
        .wali-presensi-date {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .wali-presensi-status {
          display: inline-block;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 12px;
        }
        .wali-presensi-status.status-hadir { background: #dcfce7; color: #16a34a; }
        .wali-presensi-status.status-izin { background: #dbeafe; color: #2563eb; }
        .wali-presensi-status.status-sakit { background: #fef3c7; color: #d97706; }
        .wali-presensi-status.status-alpha { background: #fee2e2; color: #dc2626; }
        .wali-presensi-ket {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 6px 0 0;
        }
      `}</style>
        </div>
    )
}

export default KehadiranWaliPage
