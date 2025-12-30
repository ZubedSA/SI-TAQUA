import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, Wallet, Calendar, AlertCircle, CheckCircle,
    Clock, CreditCard, Download, ChevronRight
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import '../WaliPortal.css'

/**
 * TagihanWaliPage - Halaman untuk melihat tagihan santri
 * Menampilkan tagihan yang belum lunas dan yang sudah lunas
 */
const TagihanWaliPage = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [tagihanBelumLunas, setTagihanBelumLunas] = useState([])
    const [tagihanLunas, setTagihanLunas] = useState([])
    const [activeTab, setActiveTab] = useState('belum')
    const [totalTunggakan, setTotalTunggakan] = useState(0)

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

    // Fetch tagihan data
    const fetchTagihanData = async (santriId) => {
        if (!santriId) return

        try {
            // Fetch tagihan belum lunas
            const { data: belumLunas, error: errBelum } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama)')
                .eq('santri_id', santriId)
                .neq('status', 'Lunas')
                .order('jatuh_tempo')

            if (errBelum) throw errBelum
            setTagihanBelumLunas(belumLunas || [])

            // Calculate total tunggakan
            const total = (belumLunas || []).reduce((sum, t) => sum + parseFloat(t.jumlah), 0)
            setTotalTunggakan(total)

            // Fetch tagihan lunas (limit 20)
            const { data: lunas, error: errLunas } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama)')
                .eq('santri_id', santriId)
                .eq('status', 'Lunas')
                .order('updated_at', { ascending: false })
                .limit(20)

            if (errLunas) throw errLunas
            setTagihanLunas(lunas || [])

        } catch (error) {
            console.error('Error fetching tagihan:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchTagihanData(selectedSantri.id)
        }
    }, [selectedSantri])

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

    const isOverdue = (jatuhTempo) => {
        return new Date(jatuhTempo) < new Date()
    }

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-tagihan-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/beranda" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Tagihan & Pembayaran</h1>
                <p className="wali-page-subtitle">Daftar tagihan dan riwayat pembayaran</p>
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

            {/* Total Tunggakan Card */}
            <div className={`wali-tunggakan-card ${totalTunggakan > 0 ? 'has-tunggakan' : 'lunas'}`}>
                <div className="wali-tunggakan-icon">
                    {totalTunggakan > 0 ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                </div>
                <div className="wali-tunggakan-info">
                    <p className="wali-tunggakan-label">
                        {totalTunggakan > 0 ? 'Total Tunggakan' : 'Status Pembayaran'}
                    </p>
                    <p className="wali-tunggakan-value">
                        {totalTunggakan > 0 ? formatCurrency(totalTunggakan) : 'Semua Lunas ✓'}
                    </p>
                </div>
                {totalTunggakan > 0 && (
                    <Link to="/wali/keuangan/upload" className="wali-btn wali-btn-primary" style={{ padding: '10px 16px' }}>
                        <CreditCard size={16} />
                        Konfirmasi Bayar
                    </Link>
                )}
            </div>

            {/* Tabs */}
            <div className="wali-tabs">
                <button
                    className={`wali-tab ${activeTab === 'belum' ? 'active' : ''}`}
                    onClick={() => setActiveTab('belum')}
                >
                    Belum Lunas ({tagihanBelumLunas.length})
                </button>
                <button
                    className={`wali-tab ${activeTab === 'lunas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lunas')}
                >
                    Sudah Lunas ({tagihanLunas.length})
                </button>
            </div>

            {/* Tagihan List */}
            <div className="wali-section" style={{ marginTop: 0 }}>
                {activeTab === 'belum' && (
                    <>
                        {tagihanBelumLunas.length > 0 ? (
                            <div className="wali-data-list">
                                {tagihanBelumLunas.map(tagihan => (
                                    <div key={tagihan.id} className={`wali-tagihan-item ${isOverdue(tagihan.jatuh_tempo) ? 'overdue' : ''}`}>
                                        <div className="wali-tagihan-header">
                                            <div className="wali-tagihan-kategori">
                                                <Wallet size={16} />
                                                {tagihan.kategori?.nama || 'Pembayaran'}
                                            </div>
                                            {isOverdue(tagihan.jatuh_tempo) && (
                                                <span className="wali-tagihan-badge overdue">Jatuh Tempo</span>
                                            )}
                                        </div>
                                        <div className="wali-tagihan-body">
                                            <div className="wali-tagihan-amount">
                                                {formatCurrency(tagihan.jumlah)}
                                            </div>
                                            <div className="wali-tagihan-due">
                                                <Calendar size={14} />
                                                Jatuh tempo: {formatDate(tagihan.jatuh_tempo)}
                                            </div>
                                        </div>
                                        {tagihan.keterangan && (
                                            <p className="wali-tagihan-note">{tagihan.keterangan}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="wali-empty-state">
                                <div className="wali-empty-icon">
                                    <CheckCircle size={40} />
                                </div>
                                <h3 className="wali-empty-title">Tidak Ada Tunggakan</h3>
                                <p className="wali-empty-text">
                                    Semua tagihan sudah lunas. Terima kasih! 🎉
                                </p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'lunas' && (
                    <>
                        {tagihanLunas.length > 0 ? (
                            <div className="wali-data-list">
                                {tagihanLunas.map(tagihan => (
                                    <div key={tagihan.id} className="wali-tagihan-item lunas">
                                        <div className="wali-tagihan-header">
                                            <div className="wali-tagihan-kategori">
                                                <Wallet size={16} />
                                                {tagihan.kategori?.nama || 'Pembayaran'}
                                            </div>
                                            <span className="wali-tagihan-badge lunas">
                                                <CheckCircle size={12} />
                                                Lunas
                                            </span>
                                        </div>
                                        <div className="wali-tagihan-body">
                                            <div className="wali-tagihan-amount lunas">
                                                {formatCurrency(tagihan.jumlah)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="wali-empty-state">
                                <div className="wali-empty-icon">
                                    <Wallet size={40} />
                                </div>
                                <h3 className="wali-empty-title">Belum Ada Riwayat</h3>
                                <p className="wali-empty-text">
                                    Belum ada pembayaran yang tercatat.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Quick Links */}
            <div className="wali-section">
                <h3 className="wali-section-title" style={{ marginBottom: '12px' }}>Menu Lainnya</h3>
                <Link to="/wali/keuangan/riwayat" className="wali-quick-link">
                    <Clock size={20} />
                    <span>Riwayat Pembayaran</span>
                    <ChevronRight size={18} />
                </Link>
                <Link to="/wali/keuangan/upload" className="wali-quick-link">
                    <CreditCard size={20} />
                    <span>Konfirmasi Pembayaran</span>
                    <ChevronRight size={18} />
                </Link>
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
        .wali-tunggakan-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .wali-tunggakan-card.has-tunggakan {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          border: 1px solid #fca5a5;
        }
        .wali-tunggakan-card.lunas {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border: 1px solid #86efac;
        }
        .wali-tunggakan-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wali-tunggakan-card.has-tunggakan .wali-tunggakan-icon {
          background: #dc2626;
          color: #fff;
        }
        .wali-tunggakan-card.lunas .wali-tunggakan-icon {
          background: #16a34a;
          color: #fff;
        }
        .wali-tunggakan-info {
          flex: 1;
        }
        .wali-tunggakan-label {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }
        .wali-tunggakan-value {
          font-size: 22px;
          font-weight: 700;
          margin: 4px 0 0;
        }
        .wali-tunggakan-card.has-tunggakan .wali-tunggakan-value {
          color: #dc2626;
        }
        .wali-tunggakan-card.lunas .wali-tunggakan-value {
          color: #16a34a;
        }
        .wali-tagihan-item {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 12px;
          margin-bottom: 12px;
          border-left: 4px solid var(--border-color);
        }
        .wali-tagihan-item.overdue {
          border-left-color: #dc2626;
          background: #fff5f5;
        }
        .wali-tagihan-item.lunas {
          border-left-color: #16a34a;
        }
        .wali-tagihan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .wali-tagihan-kategori {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .wali-tagihan-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 20px;
        }
        .wali-tagihan-badge.overdue {
          background: #fee2e2;
          color: #dc2626;
        }
        .wali-tagihan-badge.lunas {
          background: #dcfce7;
          color: #16a34a;
        }
        .wali-tagihan-body {
          margin-top: 8px;
        }
        .wali-tagihan-amount {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .wali-tagihan-amount.lunas {
          color: #16a34a;
        }
        .wali-tagihan-due {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .wali-tagihan-note {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 8px 0 0;
          padding-top: 8px;
          border-top: 1px solid var(--border-color);
        }
        .wali-quick-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--bg-secondary);
          border-radius: 12px;
          text-decoration: none;
          color: var(--text-primary);
          margin-bottom: 8px;
          transition: all 0.2s ease;
        }
        .wali-quick-link:hover {
          background: var(--bg-hover);
        }
        .wali-quick-link span {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }
        .wali-quick-link svg:last-child {
          color: var(--text-secondary);
        }
      `}</style>
        </div>
    )
}

export default TagihanWaliPage
