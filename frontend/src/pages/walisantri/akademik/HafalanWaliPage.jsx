import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    BookOpen, Calendar, User, ChevronLeft, Search,
    CheckCircle, Clock, RotateCcw, Filter
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import '../WaliPortal.css'

/**
 * HafalanWaliPage - Halaman untuk melihat riwayat hafalan santri
 * Read-only - wali hanya bisa melihat, tidak bisa mengedit
 */
const HafalanWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanData, setHafalanData] = useState([])
    const [filterJenis, setFilterJenis] = useState('semua')
    const [searchSurah, setSearchSurah] = useState('')

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

    // Fetch hafalan data
    const fetchHafalanData = async (santriId) => {
        if (!santriId) return

        try {
            let query = supabase
                .from('hafalan')
                .select('*, guru:penguji_id (nama)')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            if (filterJenis !== 'semua') {
                query = query.eq('jenis', filterJenis)
            }

            const { data, error } = await query

            if (error) throw error
            setHafalanData(data || [])
        } catch (error) {
            console.error('Error fetching hafalan:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchHafalanData(selectedSantri.id)
        }
    }, [selectedSantri, filterJenis])

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Mutqin':
                return <CheckCircle size={16} className="text-green" />
            case 'Proses':
                return <Clock size={16} className="text-yellow" />
            default:
                return <RotateCcw size={16} className="text-blue" />
        }
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Mutqin':
                return 'status-aktif'
            case 'Proses':
                return 'status-pindah'
            default:
                return 'status-lulus'
        }
    }

    // Filter by search
    const filteredHafalan = hafalanData.filter(h =>
        searchSurah === '' ||
        h.surah?.toLowerCase().includes(searchSurah.toLowerCase())
    )

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-hafalan-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/beranda" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Hafalan Al-Qur'an</h1>
                <p className="wali-page-subtitle">Riwayat setoran hafalan santri</p>
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

            {/* Selected Santri Info */}
            {selectedSantri && santriList.length === 1 && (
                <div style={{ marginBottom: '20px' }}>
                    <SantriCard santri={selectedSantri} />
                </div>
            )}

            {/* Search & Filter */}
            <div className="wali-section" style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-secondary)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Cari surat..."
                                value={searchSurah}
                                onChange={(e) => setSearchSurah(e.target.value)}
                                className="wali-form-input"
                                style={{ paddingLeft: '42px' }}
                            />
                        </div>
                    </div>
                    <select
                        value={filterJenis}
                        onChange={(e) => setFilterJenis(e.target.value)}
                        className="wali-form-select"
                        style={{ minWidth: '150px' }}
                    >
                        <option value="semua">Semua Jenis</option>
                        <option value="Setoran">Setoran</option>
                        <option value="Muroja'ah">Muroja'ah</option>
                        <option value="Ziyadah Ulang">Ziyadah Ulang</option>
                    </select>
                </div>
            </div>

            {/* Hafalan List */}
            <div className="wali-section">
                <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>
                    Riwayat Hafalan ({filteredHafalan.length})
                </h3>

                {filteredHafalan.length > 0 ? (
                    <div className="wali-data-list">
                        {filteredHafalan.map(hafalan => (
                            <div key={hafalan.id} className="wali-hafalan-item">
                                <div className="wali-hafalan-header">
                                    <div className="wali-hafalan-date">
                                        <Calendar size={14} />
                                        {formatDate(hafalan.tanggal)}
                                    </div>
                                    <span className={`santri-status-badge ${getStatusClass(hafalan.status)}`}>
                                        {getStatusIcon(hafalan.status)}
                                        {hafalan.status}
                                    </span>
                                </div>
                                <div className="wali-hafalan-content">
                                    <h4 className="wali-hafalan-surah">
                                        <BookOpen size={16} />
                                        {hafalan.surah}
                                    </h4>
                                    <p className="wali-hafalan-ayat">
                                        Juz {hafalan.juz} • Ayat {hafalan.ayat_mulai || 1} - {hafalan.ayat_selesai || 'selesai'}
                                    </p>
                                    {hafalan.jenis && (
                                        <span className="wali-hafalan-jenis">{hafalan.jenis}</span>
                                    )}
                                </div>
                                {hafalan.catatan && (
                                    <div className="wali-hafalan-catatan">
                                        <strong>Catatan Ustadz:</strong> {hafalan.catatan}
                                    </div>
                                )}
                                <div className="wali-hafalan-footer">
                                    <User size={14} />
                                    <span>Penguji: {hafalan.guru?.nama || '-'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="wali-empty-state">
                        <div className="wali-empty-icon">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="wali-empty-title">Belum Ada Data Hafalan</h3>
                        <p className="wali-empty-text">
                            Data hafalan santri belum tersedia atau belum diinput oleh guru.
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
        .wali-hafalan-item {
          padding: 16px;
          background: var(--bg-secondary, #f8fafc);
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .wali-hafalan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .wali-hafalan-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .wali-hafalan-content {
          margin-bottom: 8px;
        }
        .wali-hafalan-surah {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .wali-hafalan-ayat {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 8px 0;
        }
        .wali-hafalan-jenis {
          display: inline-block;
          padding: 4px 10px;
          background: var(--primary-color);
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          border-radius: 20px;
        }
        .wali-hafalan-catatan {
          padding: 10px;
          background: #fff;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .wali-hafalan-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .text-green { color: #16a34a; }
        .text-yellow { color: #d97706; }
        .text-blue { color: #2563eb; }
      `}</style>
        </div>
    )
}

export default HafalanWaliPage
