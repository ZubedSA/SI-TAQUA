import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, MessageCircle, Send, Clock, CheckCircle,
    Eye, ChevronRight, Plus
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import '../WaliPortal.css'

/**
 * InboxPesanPage - Halaman untuk melihat pesan wali ke pondok
 */
const InboxPesanPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [pesanData, setPesanData] = useState([])
    const [selectedPesan, setSelectedPesan] = useState(null)
    const [filterStatus, setFilterStatus] = useState('semua')

    // Fetch pesan
    const fetchPesan = async () => {
        try {
            let query = supabase
                .from('pesan_wali')
                .select('*')
                .eq('wali_id', user.id)
                .order('created_at', { ascending: false })

            if (filterStatus !== 'semua') {
                query = query.eq('status', filterStatus)
            }

            const { data, error } = await query

            if (error) throw error
            setPesanData(data || [])

        } catch (error) {
            console.error('Error fetching pesan:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchPesan()
        }
    }, [user, filterStatus])

    const formatDate = (date) => {
        const d = new Date(date)
        const now = new Date()
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        } else if (diffDays === 1) {
            return 'Kemarin'
        } else if (diffDays < 7) {
            return d.toLocaleDateString('id-ID', { weekday: 'long' })
        } else {
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Terkirim':
                return <Send size={14} />
            case 'Dibaca':
                return <Eye size={14} />
            case 'Diproses':
                return <Clock size={14} />
            case 'Dibalas':
            case 'Selesai':
                return <CheckCircle size={14} />
            default:
                return <Send size={14} />
        }
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Terkirim':
                return 'terkirim'
            case 'Dibaca':
                return 'dibaca'
            case 'Diproses':
                return 'diproses'
            case 'Dibalas':
            case 'Selesai':
                return 'dibalas'
            default:
                return 'terkirim'
        }
    }

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-pesan-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/beranda" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Pesan</h1>
                <p className="wali-page-subtitle">Komunikasi dengan pihak pondok</p>
            </div>

            {/* New Message Button */}
            <Link to="/wali/pesan/kirim" className="wali-btn wali-btn-primary" style={{ width: '100%', marginBottom: '20px' }}>
                <Plus size={18} />
                Tulis Pesan Baru
            </Link>

            {/* Filter */}
            <div className="wali-filter-chips" style={{ marginBottom: '16px' }}>
                {[
                    { value: 'semua', label: 'Semua' },
                    { value: 'Terkirim', label: 'Terkirim' },
                    { value: 'Dibalas', label: 'Dibalas' }
                ].map(opt => (
                    <button
                        key={opt.value}
                        className={`wali-chip ${filterStatus === opt.value ? 'active' : ''}`}
                        onClick={() => setFilterStatus(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Pesan List or Detail */}
            <div className="wali-section" style={{ marginTop: 0 }}>
                {selectedPesan ? (
                    // Detail View
                    <div className="wali-pesan-detail">
                        <button
                            className="wali-back-link"
                            onClick={() => setSelectedPesan(null)}
                            style={{ marginBottom: '16px' }}
                        >
                            <ChevronLeft size={18} />
                            Kembali ke daftar
                        </button>

                        <div className="wali-pesan-detail-header">
                            <h3 className="wali-pesan-detail-title">{selectedPesan.judul}</h3>
                            <span className={`wali-pesan-status ${getStatusClass(selectedPesan.status)}`}>
                                {getStatusIcon(selectedPesan.status)}
                                {selectedPesan.status}
                            </span>
                        </div>

                        <p className="wali-pesan-detail-date">
                            Dikirim pada {new Date(selectedPesan.created_at).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>

                        <div className="wali-pesan-bubble sent">
                            <p>{selectedPesan.isi}</p>
                        </div>

                        {selectedPesan.balasan && (
                            <div className="wali-pesan-bubble reply">
                                <p className="wali-pesan-reply-label">Balasan dari Pondok:</p>
                                <p>{selectedPesan.balasan}</p>
                                {selectedPesan.dibalas_pada && (
                                    <span className="wali-pesan-reply-date">
                                        {new Date(selectedPesan.dibalas_pada).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // List View
                    <>
                        {pesanData.length > 0 ? (
                            <div className="wali-pesan-list">
                                {pesanData.map(pesan => (
                                    <div
                                        key={pesan.id}
                                        className={`wali-pesan-item ${pesan.balasan ? 'has-reply' : ''}`}
                                        onClick={() => setSelectedPesan(pesan)}
                                    >
                                        <div className="wali-pesan-item-header">
                                            <h4 className="wali-pesan-item-title">{pesan.judul}</h4>
                                            <span className="wali-pesan-item-date">{formatDate(pesan.created_at)}</span>
                                        </div>
                                        <p className="wali-pesan-item-preview">
                                            {pesan.isi.length > 80 ? pesan.isi.substring(0, 80) + '...' : pesan.isi}
                                        </p>
                                        <div className="wali-pesan-item-footer">
                                            <span className={`wali-pesan-status ${getStatusClass(pesan.status)}`}>
                                                {getStatusIcon(pesan.status)}
                                                {pesan.status}
                                            </span>
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="wali-empty-state">
                                <div className="wali-empty-icon">
                                    <MessageCircle size={40} />
                                </div>
                                <h3 className="wali-empty-title">Belum Ada Pesan</h3>
                                <p className="wali-empty-text">
                                    Anda belum pernah mengirim pesan ke pondok.
                                </p>
                                <Link to="/wali/pesan/kirim" className="wali-btn wali-btn-primary" style={{ marginTop: '16px' }}>
                                    <Send size={16} />
                                    Kirim Pesan Pertama
                                </Link>
                            </div>
                        )}
                    </>
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
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .wali-filter-chips {
          display: flex;
          gap: 8px;
        }
        .wali-chip {
          padding: 8px 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .wali-chip.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: #fff;
        }
        .wali-pesan-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .wali-pesan-item {
          padding: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .wali-pesan-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .wali-pesan-item.has-reply {
          border-left: 4px solid #16a34a;
        }
        .wali-pesan-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .wali-pesan-item-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .wali-pesan-item-date {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .wali-pesan-item-preview {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 12px;
          line-height: 1.5;
        }
        .wali-pesan-item-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .wali-pesan-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 12px;
        }
        .wali-pesan-status.terkirim { background: #e2e8f0; color: #475569; }
        .wali-pesan-status.dibaca { background: #dbeafe; color: #1e40af; }
        .wali-pesan-status.diproses { background: #fef3c7; color: #92400e; }
        .wali-pesan-status.dibalas { background: #dcfce7; color: #166534; }
        
        /* Detail View */
        .wali-pesan-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .wali-pesan-detail-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .wali-pesan-detail-date {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 20px;
        }
        .wali-pesan-bubble {
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 12px;
        }
        .wali-pesan-bubble.sent {
          background: var(--primary-color);
          color: #fff;
          border-bottom-right-radius: 4px;
          margin-left: 20px;
        }
        .wali-pesan-bubble.reply {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-bottom-left-radius: 4px;
          margin-right: 20px;
        }
        .wali-pesan-bubble p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }
        .wali-pesan-reply-label {
          font-size: 12px !important;
          font-weight: 600;
          color: var(--text-secondary) !important;
          margin-bottom: 8px !important;
        }
        .wali-pesan-reply-date {
          display: block;
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }
      `}</style>
        </div>
    )
}

export default InboxPesanPage
