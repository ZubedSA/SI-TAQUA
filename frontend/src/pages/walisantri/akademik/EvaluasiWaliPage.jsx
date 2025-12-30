import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Award, BookOpen, Heart, Users,
    TrendingUp, Star, AlertCircle
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import '../WaliPortal.css'

/**
 * EvaluasiWaliPage - Halaman untuk melihat evaluasi dan nilai santri
 * Read-only - wali hanya bisa melihat, tidak bisa mengedit
 */
const EvaluasiWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [activeTab, setActiveTab] = useState('nilai')
    const [nilaiData, setNilaiData] = useState([])
    const [perilakuData, setPerilakuData] = useState([])
    const [taujihadData, setTaujihadData] = useState([])

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

    // Fetch evaluasi data
    const fetchEvaluasiData = async (santriId) => {
        if (!santriId) return

        try {
            // Fetch nilai
            const { data: nilai } = await supabase
                .from('nilai')
                .select('*, mapel:mapel_id (nama, kode)')
                .eq('santri_id', santriId)
                .order('tahun_ajaran', { ascending: false })

            setNilaiData(nilai || [])

            // Fetch perilaku (jika tabel ada)
            try {
                const { data: perilaku } = await supabase
                    .from('perilaku_santri')
                    .select('*')
                    .eq('santri_id', santriId)
                    .order('tanggal', { ascending: false })
                    .limit(10)

                setPerilakuData(perilaku || [])
            } catch (e) {
                setPerilakuData([])
            }

            // Fetch taujihad/catatan guru (jika tabel ada)
            try {
                const { data: taujihad } = await supabase
                    .from('taujihad')
                    .select('*, guru:guru_id (nama)')
                    .eq('santri_id', santriId)
                    .order('tanggal', { ascending: false })
                    .limit(10)

                setTaujihadData(taujihad || [])
            } catch (e) {
                setTaujihadData([])
            }

        } catch (error) {
            console.error('Error fetching evaluasi:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchEvaluasiData(selectedSantri.id)
        }
    }, [selectedSantri])

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const getNilaiColor = (nilai) => {
        if (nilai >= 80) return '#16a34a'
        if (nilai >= 70) return '#2563eb'
        if (nilai >= 60) return '#d97706'
        return '#dc2626'
    }

    const getNilaiLabel = (nilai) => {
        if (nilai >= 90) return 'Sangat Baik'
        if (nilai >= 80) return 'Baik'
        if (nilai >= 70) return 'Cukup'
        if (nilai >= 60) return 'Kurang'
        return 'Perlu Perbaikan'
    }

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-evaluasi-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/beranda" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Evaluasi & Nilai</h1>
                <p className="wali-page-subtitle">Perkembangan akademik dan perilaku santri</p>
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

            {/* Tabs */}
            <div className="wali-tabs">
                <button
                    className={`wali-tab ${activeTab === 'nilai' ? 'active' : ''}`}
                    onClick={() => setActiveTab('nilai')}
                >
                    <Award size={16} />
                    Nilai
                </button>
                <button
                    className={`wali-tab ${activeTab === 'perilaku' ? 'active' : ''}`}
                    onClick={() => setActiveTab('perilaku')}
                >
                    <Heart size={16} />
                    Akhlak
                </button>
                <button
                    className={`wali-tab ${activeTab === 'catatan' ? 'active' : ''}`}
                    onClick={() => setActiveTab('catatan')}
                >
                    <BookOpen size={16} />
                    Catatan Guru
                </button>
            </div>

            {/* Content */}
            <div className="wali-section" style={{ marginTop: 0 }}>
                {/* Tab: Nilai */}
                {activeTab === 'nilai' && (
                    <>
                        <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>
                            Nilai Akademik
                        </h3>

                        {nilaiData.length > 0 ? (
                            <div className="wali-table-container">
                                <table className="wali-table">
                                    <thead>
                                        <tr>
                                            <th>Mata Pelajaran</th>
                                            <th>Tugas</th>
                                            <th>UTS</th>
                                            <th>UAS</th>
                                            <th>Akhir</th>
                                            <th>Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiData.map(nilai => (
                                            <tr key={nilai.id}>
                                                <td>
                                                    <strong>{nilai.mapel?.nama || '-'}</strong>
                                                    <br />
                                                    <small style={{ color: 'var(--text-secondary)' }}>
                                                        {nilai.semester} - {nilai.tahun_ajaran}
                                                    </small>
                                                </td>
                                                <td>{nilai.nilai_tugas || '-'}</td>
                                                <td>{nilai.nilai_uts || '-'}</td>
                                                <td>{nilai.nilai_uas || '-'}</td>
                                                <td style={{
                                                    fontWeight: 600,
                                                    color: getNilaiColor(nilai.nilai_akhir)
                                                }}>
                                                    {nilai.nilai_akhir || '-'}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        background: `${getNilaiColor(nilai.nilai_akhir)}20`,
                                                        color: getNilaiColor(nilai.nilai_akhir)
                                                    }}>
                                                        {getNilaiLabel(nilai.nilai_akhir)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="wali-empty-state">
                                <div className="wali-empty-icon">
                                    <Award size={40} />
                                </div>
                                <h3 className="wali-empty-title">Belum Ada Data Nilai</h3>
                                <p className="wali-empty-text">
                                    Data nilai santri belum tersedia atau belum diinput.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Tab: Perilaku/Akhlak */}
                {activeTab === 'perilaku' && (
                    <>
                        <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>
                            Evaluasi Akhlak & Kedisiplinan
                        </h3>

                        {perilakuData.length > 0 ? (
                            <div className="wali-data-list">
                                {perilakuData.map(perilaku => (
                                    <div key={perilaku.id} className="wali-perilaku-item">
                                        <div className="wali-perilaku-header">
                                            <span className="wali-perilaku-date">
                                                {formatDate(perilaku.tanggal)}
                                            </span>
                                            <span className={`santri-status-badge ${perilaku.jenis === 'Positif' ? 'status-aktif' : 'status-tidak-aktif'
                                                }`}>
                                                {perilaku.jenis}
                                            </span>
                                        </div>
                                        <p className="wali-perilaku-desc">{perilaku.keterangan}</p>
                                        {perilaku.poin && (
                                            <span className="wali-perilaku-poin">
                                                {perilaku.jenis === 'Positif' ? '+' : '-'}{perilaku.poin} Poin
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="wali-empty-state">
                                <div className="wali-empty-icon">
                                    <Heart size={40} />
                                </div>
                                <h3 className="wali-empty-title">Belum Ada Data Perilaku</h3>
                                <p className="wali-empty-text">
                                    Catatan perilaku santri belum tersedia.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Tab: Catatan Guru */}
                {activeTab === 'catatan' && (
                    <>
                        <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>
                            Catatan dari Guru/Pembina
                        </h3>

                        {taujihadData.length > 0 ? (
                            <div className="wali-data-list">
                                {taujihadData.map(catatan => (
                                    <div key={catatan.id} className="wali-catatan-item">
                                        <div className="wali-catatan-header">
                                            <span className="wali-catatan-guru">
                                                <Users size={14} />
                                                {catatan.guru?.nama || 'Guru'}
                                            </span>
                                            <span className="wali-catatan-date">
                                                {formatDate(catatan.tanggal)}
                                            </span>
                                        </div>
                                        <p className="wali-catatan-content">{catatan.isi}</p>
                                        {catatan.rekomendasi && (
                                            <div className="wali-catatan-rekomendasi">
                                                <Star size={14} />
                                                <span>{catatan.rekomendasi}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="wali-empty-state">
                                <div className="wali-empty-icon">
                                    <BookOpen size={40} />
                                </div>
                                <h3 className="wali-empty-title">Belum Ada Catatan</h3>
                                <p className="wali-empty-text">
                                    Catatan dari guru/pembina belum tersedia.
                                </p>
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
          margin-bottom: 16px;
        }
        .wali-back-link:hover {
          color: var(--primary-color);
        }
        .wali-tabs {
          display: flex;
          gap: 8px;
        }
        .wali-tab {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .wali-perilaku-item,
        .wali-catatan-item {
          padding: 16px;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .wali-perilaku-header,
        .wali-catatan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .wali-perilaku-date,
        .wali-catatan-date {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .wali-perilaku-desc,
        .wali-catatan-content {
          font-size: 14px;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.5;
        }
        .wali-perilaku-poin {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 10px;
          background: var(--primary-color);
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          border-radius: 20px;
        }
        .wali-catatan-guru {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .wali-catatan-rekomendasi {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding: 10px;
          background: #fef3c7;
          border-radius: 8px;
          font-size: 13px;
          color: #92400e;
        }
      `}</style>
        </div>
    )
}

export default EvaluasiWaliPage
