import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    AlertTriangle,
    AlertCircle,
    Eye,
    Calendar,
    Clock,
    CheckCircle,
    TrendingUp,
    ChevronRight
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

const SantriBermasalahPage = () => {
    const [santri, setSantri] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSantriBermasalah()
    }, [])

    const fetchSantriBermasalah = async () => {
        setLoading(true)
        try {
            // Try to fetch from view first
            const { data, error } = await supabase
                .from('santri_bermasalah')
                .select('*')
                .order('total_pelanggaran', { ascending: false })

            if (error) {
                console.log('View may not exist yet:', error.message)
                // Fallback - try manual aggregation
                setSantri([])
            } else {
                setSantri(data || [])
            }
        } catch (error) {
            console.error('Error:', error.message)
            setSantri([])
        } finally {
            setLoading(false)
        }
    }

    const getCategoryClass = (total, berat) => {
        if (berat >= 2) return 'critical'
        if (berat >= 1) return 'high'
        if (total >= 5) return 'medium'
        return 'low'
    }

    return (
        <div className="santri-bermasalah-page">
            <div className="page-header">
                <div className="header-left">
                    <h1><Users size={28} /> Santri Bermasalah</h1>
                    <p>Daftar santri yang memerlukan perhatian khusus berdasarkan riwayat pelanggaran</p>
                </div>
            </div>

            <div className="info-card">
                <AlertCircle size={20} />
                <p>Data santri bermasalah dihitung otomatis dari pelanggaran dalam 6 bulan terakhir. Santri akan masuk daftar jika memiliki 3+ pelanggaran atau 1+ pelanggaran berat.</p>
            </div>

            <div className="santri-grid">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data...</p>
                    </div>
                ) : santri.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={48} />
                        <h3>Tidak ada santri bermasalah</h3>
                        <p>Alhamdulillah, tidak ada santri yang memerlukan perhatian khusus saat ini</p>
                    </div>
                ) : (
                    santri.map((item) => (
                        <div key={item.id} className={`santri-card ${getCategoryClass(item.total_pelanggaran, item.pelanggaran_berat)}`}>
                            <div className="card-header">
                                <div className="santri-info">
                                    <h3>{item.nama}</h3>
                                    <span className="nis">{item.nis}</span>
                                </div>
                                <span className={`priority-badge ${getCategoryClass(item.total_pelanggaran, item.pelanggaran_berat)}`}>
                                    {item.pelanggaran_berat >= 2 ? 'Kritis' :
                                        item.pelanggaran_berat >= 1 ? 'Tinggi' :
                                            item.total_pelanggaran >= 5 ? 'Sedang' : 'Rendah'}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="stat-row">
                                    <div className="stat">
                                        <AlertTriangle size={16} />
                                        <span><strong>{item.total_pelanggaran}</strong> Pelanggaran</span>
                                    </div>
                                    <div className="stat danger">
                                        <AlertCircle size={16} />
                                        <span><strong>{item.pelanggaran_berat}</strong> Berat</span>
                                    </div>
                                </div>
                                <div className="stat-row">
                                    <div className="stat">
                                        <Clock size={16} />
                                        <span><strong>{item.kasus_open}</strong> Open</span>
                                    </div>
                                    <div className="stat">
                                        <TrendingUp size={16} />
                                        <span><strong>{item.kasus_proses}</strong> Proses</span>
                                    </div>
                                </div>
                                <div className="meta">
                                    <span className="kelas">{item.kelas_nama || '-'}</span>
                                    <span className="halaqoh">{item.halaqoh_nama || '-'}</span>
                                </div>
                            </div>
                            <Link to={`/pengurus/santri/${item.id}/riwayat`} className="card-action">
                                Lihat Riwayat
                                <ChevronRight size={16} />
                            </Link>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .santri-bermasalah-page {
                    padding: 1.5rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .page-header {
                    margin-bottom: 1.5rem;
                }
                .page-header h1 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.5rem;
                    margin: 0 0 0.25rem 0;
                }
                .page-header p {
                    color: var(--text-muted);
                    margin: 0;
                }
                .info-card {
                    display: flex;
                    gap: 0.75rem;
                    padding: 1rem;
                    background: rgba(66, 133, 244, 0.1);
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                    color: var(--color-primary);
                }
                .info-card p {
                    margin: 0;
                    font-size: 0.9rem;
                    line-height: 1.5;
                }
                .santri-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1rem;
                }
                .santri-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .santri-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .santri-card.critical { border-left: 4px solid #9c27b0; }
                .santri-card.high { border-left: 4px solid #ea4335; }
                .santri-card.medium { border-left: 4px solid #fbbc04; }
                .santri-card.low { border-left: 4px solid var(--border-color); }
                .card-header {
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 1px solid var(--border-color);
                }
                .santri-info h3 {
                    margin: 0 0 0.25rem 0;
                    font-size: 1.1rem;
                }
                .nis {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .priority-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .priority-badge.critical { background: rgba(156, 39, 176, 0.15); color: #9c27b0; }
                .priority-badge.high { background: rgba(234, 67, 53, 0.15); color: #ea4335; }
                .priority-badge.medium { background: rgba(251, 188, 4, 0.15); color: #f9a825; }
                .priority-badge.low { background: var(--bg-secondary); color: var(--text-muted); }
                .card-body { padding: 1rem; }
                .stat-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }
                .stat {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .stat.danger { color: #ea4335; }
                .meta {
                    display: flex;
                    gap: 1rem;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-top: 0.5rem;
                    padding-top: 0.75rem;
                    border-top: 1px solid var(--border-color);
                }
                .card-action {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    background: var(--bg-secondary);
                    color: var(--color-primary);
                    text-decoration: none;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                .card-action:hover {
                    background: var(--bg-hover);
                }
                .loading-state, .empty-state {
                    grid-column: 1 / -1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    color: var(--text-muted);
                    gap: 0.75rem;
                }
                .empty-state svg { opacity: 0.5; }
                .empty-state h3 { margin: 0; color: var(--text-primary); }
                .empty-state p { margin: 0; }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-color);
                    border-top-color: var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default SantriBermasalahPage
