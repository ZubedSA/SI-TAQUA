import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Bell, Calendar, Tag, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import '../WaliPortal.css'

/**
 * PengumumanPage - Halaman untuk melihat pengumuman pondok
 */
const PengumumanPage = () => {
    const [loading, setLoading] = useState(true)
    const [pengumumanData, setPengumumanData] = useState([])
    const [filterKategori, setFilterKategori] = useState('semua')
    const [expandedId, setExpandedId] = useState(null)

    // Fetch pengumuman
    const fetchPengumuman = async () => {
        try {
            let query = supabase
                .from('pengumuman')
                .select('*')
                .eq('is_active', true)
                .order('prioritas', { ascending: false })
                .order('tanggal_publish', { ascending: false })

            if (filterKategori !== 'semua') {
                query = query.eq('kategori', filterKategori)
            }

            const { data, error } = await query

            if (error) throw error
            setPengumumanData(data || [])

        } catch (error) {
            console.error('Error fetching pengumuman:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPengumuman()
    }, [filterKategori])

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const getKategoriClass = (kategori) => {
        const classes = {
            'Umum': 'umum',
            'Akademik': 'akademik',
            'Keuangan': 'keuangan',
            'Kegiatan': 'kegiatan',
            'Libur': 'libur',
            'Ujian': 'ujian'
        }
        return classes[kategori] || 'umum'
    }

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id)
    }

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-pengumuman-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/beranda" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Informasi & Pengumuman</h1>
                <p className="wali-page-subtitle">Berita terbaru dari pondok pesantren</p>
            </div>

            {/* Filter Kategori */}
            <div className="wali-filter-chips">
                {['semua', 'Umum', 'Akademik', 'Keuangan', 'Kegiatan', 'Libur', 'Ujian'].map(kat => (
                    <button
                        key={kat}
                        className={`wali-chip ${filterKategori === kat ? 'active' : ''}`}
                        onClick={() => setFilterKategori(kat)}
                    >
                        {kat === 'semua' ? 'Semua' : kat}
                    </button>
                ))}
            </div>

            {/* Pengumuman List */}
            <div className="wali-section" style={{ marginTop: '16px' }}>
                {pengumumanData.length > 0 ? (
                    pengumumanData.map(pengumuman => (
                        <div
                            key={pengumuman.id}
                            className={`wali-pengumuman-card ${pengumuman.prioritas > 5 ? 'priority' : ''}`}
                        >
                            <div
                                className="wali-pengumuman-card-header"
                                onClick={() => toggleExpand(pengumuman.id)}
                            >
                                <div className="wali-pengumuman-card-meta">
                                    <span className={`wali-pengumuman-kategori ${getKategoriClass(pengumuman.kategori)}`}>
                                        <Tag size={12} />
                                        {pengumuman.kategori}
                                    </span>
                                    <span className="wali-pengumuman-date">
                                        <Calendar size={12} />
                                        {formatDate(pengumuman.tanggal_publish)}
                                    </span>
                                </div>
                                <h3 className="wali-pengumuman-title">{pengumuman.judul}</h3>
                                <button className="wali-pengumuman-expand">
                                    {expandedId === pengumuman.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                            </div>

                            <div className={`wali-pengumuman-card-body ${expandedId === pengumuman.id ? 'expanded' : ''}`}>
                                <div className="wali-pengumuman-content">
                                    {pengumuman.isi.split('\n').map((paragraph, idx) => (
                                        <p key={idx}>{paragraph}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="wali-empty-state">
                        <div className="wali-empty-icon">
                            <Bell size={40} />
                        </div>
                        <h3 className="wali-empty-title">Belum Ada Pengumuman</h3>
                        <p className="wali-empty-text">
                            Tidak ada pengumuman untuk kategori ini.
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
        .wali-filter-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          overflow-x: auto;
          padding-bottom: 4px;
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
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .wali-chip:hover {
          background: var(--bg-hover);
        }
        .wali-chip.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: #fff;
        }
        .wali-pengumuman-card {
          background: var(--bg-card);
          border-radius: 16px;
          margin-bottom: 16px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        .wali-pengumuman-card.priority {
          border-left: 4px solid #dc2626;
        }
        .wali-pengumuman-card-header {
          padding: 16px;
          cursor: pointer;
          position: relative;
        }
        .wali-pengumuman-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .wali-pengumuman-kategori {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 12px;
        }
        .wali-pengumuman-kategori.umum { background: #e2e8f0; color: #475569; }
        .wali-pengumuman-kategori.akademik { background: #dbeafe; color: #1e40af; }
        .wali-pengumuman-kategori.keuangan { background: #dcfce7; color: #166534; }
        .wali-pengumuman-kategori.kegiatan { background: #fae8ff; color: #86198f; }
        .wali-pengumuman-kategori.libur { background: #fef3c7; color: #92400e; }
        .wali-pengumuman-kategori.ujian { background: #fee2e2; color: #991b1b; }
        .wali-pengumuman-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .wali-pengumuman-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          padding-right: 40px;
        }
        .wali-pengumuman-expand {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        .wali-pengumuman-card-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .wali-pengumuman-card-body.expanded {
          max-height: 1000px;
        }
        .wali-pengumuman-content {
          padding: 0 16px 16px;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }
        .wali-pengumuman-content p {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0 0 12px;
        }
        .wali-pengumuman-content p:last-child {
          margin-bottom: 0;
        }
      `}</style>
        </div>
    )
}

export default PengumumanPage
