import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Receipt, Calendar, CheckCircle, Clock,
    Filter, CreditCard
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import DownloadButton from '../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../utils/exportUtils'
import '../WaliPortal.css'

/**
 * RiwayatBayarPage - Halaman untuk melihat riwayat pembayaran santri
 */
const RiwayatBayarPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [pembayaranData, setPembayaranData] = useState([])
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

    // Fetch pembayaran data
    const fetchPembayaranData = async (santriId) => {
        if (!santriId) return

        try {
            let query = supabase
                .from('pembayaran_santri')
                .select(`
          *,
          tagihan:tagihan_id (
            jumlah,
            kategori:kategori_id (nama)
          )
        `)
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
            }

            const { data, error } = await query

            if (error) throw error
            setPembayaranData(data || [])

        } catch (error) {
            console.error('Error fetching pembayaran:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchPembayaranData(selectedSantri.id)
        }
    }, [selectedSantri, filterBulan])

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const getMetodeIcon = (metode) => {
        switch (metode) {
            case 'Transfer':
                return <CreditCard size={16} />
            case 'QRIS':
                return <Receipt size={16} />
            default:
                return <Receipt size={16} />
        }
    }

    // Calculate total
    const totalPembayaran = pembayaranData.reduce((sum, p) => sum + parseFloat(p.jumlah), 0)

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Kategori', 'Metode', 'Jumlah', 'Santri']
        const exportData = pembayaranData.map(p => ({
            Tanggal: formatDate(p.tanggal),
            Kategori: p.tagihan?.kategori?.nama || 'Pembayaran',
            Metode: p.metode || 'Tunai',
            Jumlah: parseFloat(p.jumlah),
            Santri: selectedSantri?.nama || '-'
        }))
        exportToExcel(exportData, columns, 'riwayat_pembayaran')
    }

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Kategori', 'Metode', 'Jumlah', 'Santri']
        const exportData = pembayaranData.map(p => ({
            Tanggal: formatDate(p.tanggal),
            Kategori: p.tagihan?.kategori?.nama || 'Pembayaran',
            Metode: p.metode || 'Tunai',
            Jumlah: parseFloat(p.jumlah),
            Santri: selectedSantri?.nama || '-'
        }))
        exportToCSV(exportData, columns, 'riwayat_pembayaran')
    }

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-riwayat-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/keuangan" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Riwayat Pembayaran</h1>
                <p className="wali-page-subtitle">Daftar pembayaran yang sudah dilakukan</p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <Filter size={18} style={{ color: 'var(--text-secondary)' }} />
                        <select
                            value={filterBulan}
                            onChange={(e) => setFilterBulan(e.target.value)}
                            className="wali-form-select"
                            style={{ flex: 1 }}
                        >
                            <option value="">Semua Waktu</option>
                            {getMonthOptions().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {pembayaranData.length > 0 && (
                        <div style={{ flexShrink: 0 }}>
                            <DownloadButton
                                onDownloadExcel={handleDownloadExcel}
                                onDownloadCSV={handleDownloadCSV}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Total Summary */}
            {pembayaranData.length > 0 && (
                <div className="wali-summary-card">
                    <Receipt size={20} />
                    <div>
                        <p className="wali-summary-label">Total {filterBulan ? 'Bulan Ini' : 'Pembayaran'}</p>
                        <p className="wali-summary-value">{formatCurrency(totalPembayaran)}</p>
                    </div>
                    <span className="wali-summary-count">{pembayaranData.length} transaksi</span>
                </div>
            )}

            {/* Pembayaran List */}
            <div className="wali-section">
                <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>
                    Daftar Pembayaran
                </h3>

                {pembayaranData.length > 0 ? (
                    <div className="wali-data-list">
                        {pembayaranData.map(pembayaran => (
                            <div key={pembayaran.id} className="wali-pembayaran-item">
                                <div className="wali-pembayaran-icon">
                                    <CheckCircle size={20} />
                                </div>
                                <div className="wali-pembayaran-info">
                                    <p className="wali-pembayaran-kategori">
                                        {pembayaran.tagihan?.kategori?.nama || 'Pembayaran'}
                                    </p>
                                    <p className="wali-pembayaran-date">
                                        <Calendar size={12} />
                                        {formatDate(pembayaran.tanggal)}
                                    </p>
                                    <div className="wali-pembayaran-meta">
                                        {getMetodeIcon(pembayaran.metode)}
                                        <span>{pembayaran.metode || 'Tunai'}</span>
                                    </div>
                                </div>
                                <div className="wali-pembayaran-amount">
                                    {formatCurrency(pembayaran.jumlah)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="wali-empty-state">
                        <div className="wali-empty-icon">
                            <Receipt size={40} />
                        </div>
                        <h3 className="wali-empty-title">Belum Ada Pembayaran</h3>
                        <p className="wali-empty-text">
                            Belum ada riwayat pembayaran untuk periode ini.
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
        .wali-summary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border: 1px solid #86efac;
          border-radius: 12px;
          margin-bottom: 20px;
          color: #166534;
        }
        .wali-summary-label {
          font-size: 12px;
          margin: 0;
          opacity: 0.8;
        }
        .wali-summary-value {
          font-size: 18px;
          font-weight: 700;
          margin: 2px 0 0;
        }
        .wali-summary-count {
          margin-left: auto;
          font-size: 12px;
          background: rgba(255,255,255,0.5);
          padding: 4px 10px;
          border-radius: 20px;
        }
        .wali-pembayaran-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--bg-secondary);
          border-radius: 12px;
          margin-bottom: 10px;
        }
        .wali-pembayaran-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #dcfce7;
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wali-pembayaran-info {
          flex: 1;
        }
        .wali-pembayaran-kategori {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .wali-pembayaran-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0 0 4px;
        }
        .wali-pembayaran-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-secondary);
        }
        .wali-pembayaran-amount {
          font-size: 16px;
          font-weight: 700;
          color: #16a34a;
        }
      `}</style>
        </div>
    )
}

export default RiwayatBayarPage
