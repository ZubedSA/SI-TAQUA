import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, User, Phone, Mail, Save, Loader,
    GraduationCap, BookOpen
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import SantriCard from '../components/SantriCard'
import '../WaliPortal.css'

/**
 * ProfilWaliPage - Halaman profil wali santri
 * Wali bisa edit no HP dan email, tidak bisa edit data santri
 */
const ProfilWaliPage = () => {
    const { user, userProfile } = useAuth()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [santriList, setSantriList] = useState([])

    // Form state
    const [formData, setFormData] = useState({
        nama: '',
        phone: '',
        email: ''
    })

    // Fetch data
    const fetchData = async () => {
        try {
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (profileError && profileError.code !== 'PGRST116') throw profileError

            if (profile) {
                setFormData({
                    nama: profile.nama || '',
                    phone: profile.phone || '',
                    email: profile.email || user.email || ''
                })
            }

            // Fetch santri
            const { data: santri, error: santriError } = await supabase
                .from('santri')
                .select(`
          *,
          kelas:kelas_id (nama),
          halaqoh:halaqoh_id (nama)
        `)
                .eq('wali_id', user.id)
                .order('nama')

            if (santriError) throw santriError
            setSantriList(santri || [])

        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    phone: formData.phone,
                    email: formData.email
                })
                .eq('user_id', user.id)

            if (error) throw error

            showToast('Profil berhasil diperbarui!', 'success')

        } catch (error) {
            console.error('Error updating profile:', error)
            showToast('Gagal memperbarui profil: ' + error.message, 'error')
        } finally {
            setSaving(false)
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
        <div className="wali-profil-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/beranda" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Profil Saya</h1>
                <p className="wali-page-subtitle">Kelola data profil Anda</p>
            </div>

            {/* Profil Wali Form */}
            <form onSubmit={handleSubmit} className="wali-section">
                <h3 className="wali-section-title" style={{ marginBottom: '20px' }}>
                    <User size={18} />
                    Data Wali
                </h3>

                {/* Nama (Read Only) */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Nama Lengkap</label>
                    <input
                        type="text"
                        value={formData.nama}
                        className="wali-form-input"
                        disabled
                    />
                    <small className="wali-form-hint">
                        Nama tidak dapat diubah. Hubungi admin jika perlu perubahan.
                    </small>
                </div>

                {/* No HP (Editable) */}
                <div className="wali-form-group">
                    <label className="wali-form-label">
                        <Phone size={14} />
                        Nomor HP
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="wali-form-input"
                        placeholder="08xxxxxxxxxx"
                    />
                </div>

                {/* Email (Editable) */}
                <div className="wali-form-group">
                    <label className="wali-form-label">
                        <Mail size={14} />
                        Email
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="wali-form-input"
                        placeholder="email@example.com"
                    />
                </div>

                {/* Save Button */}
                <button
                    type="submit"
                    className="wali-btn wali-btn-primary"
                    style={{ width: '100%' }}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <Loader size={18} className="spin" />
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Simpan Perubahan
                        </>
                    )}
                </button>
            </form>

            {/* Data Santri (Read Only) */}
            <div className="wali-section">
                <h3 className="wali-section-title" style={{ marginBottom: '16px' }}>
                    <GraduationCap size={18} />
                    Data Santri ({santriList.length})
                </h3>

                {santriList.length > 0 ? (
                    <div className="wali-santri-list">
                        {santriList.map(santri => (
                            <div key={santri.id} className="wali-santri-profil-card">
                                <div className="wali-santri-profil-header">
                                    <div className="wali-santri-avatar-lg">
                                        {santri.foto_url ? (
                                            <img src={santri.foto_url} alt={santri.nama} />
                                        ) : (
                                            <User size={40} />
                                        )}
                                    </div>
                                    <div className="wali-santri-profil-info">
                                        <h4>{santri.nama}</h4>
                                        <p>NIS: {santri.nis}</p>
                                    </div>
                                </div>
                                <div className="wali-santri-profil-details">
                                    <div className="wali-profil-detail-row">
                                        <span className="wali-profil-detail-label">Kelas</span>
                                        <span className="wali-profil-detail-value">{santri.kelas?.nama || '-'}</span>
                                    </div>
                                    <div className="wali-profil-detail-row">
                                        <span className="wali-profil-detail-label">Halaqoh</span>
                                        <span className="wali-profil-detail-value">{santri.halaqoh?.nama || '-'}</span>
                                    </div>
                                    <div className="wali-profil-detail-row">
                                        <span className="wali-profil-detail-label">Status</span>
                                        <span className={`wali-profil-status ${santri.status === 'Aktif' ? 'aktif' : 'tidak-aktif'}`}>
                                            {santri.status}
                                        </span>
                                    </div>
                                    <div className="wali-profil-detail-row">
                                        <span className="wali-profil-detail-label">Jenis Kelamin</span>
                                        <span className="wali-profil-detail-value">{santri.jenis_kelamin}</span>
                                    </div>
                                    {santri.tempat_lahir && santri.tanggal_lahir && (
                                        <div className="wali-profil-detail-row">
                                            <span className="wali-profil-detail-label">TTL</span>
                                            <span className="wali-profil-detail-value">
                                                {santri.tempat_lahir}, {new Date(santri.tanggal_lahir).toLocaleDateString('id-ID')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Belum ada data santri yang terhubung.
                    </p>
                )}

                <div className="wali-info-box" style={{ marginTop: '16px' }}>
                    <BookOpen size={18} />
                    <span>Data santri tidak dapat diubah melalui portal ini. Hubungi admin jika ada perubahan data.</span>
                </div>
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
        .wali-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .wali-form-label {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .wali-form-hint {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .wali-santri-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .wali-santri-profil-card {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 16px;
          border: 1px solid var(--border-color);
        }
        .wali-santri-profil-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }
        .wali-santri-avatar-lg {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          overflow: hidden;
        }
        .wali-santri-avatar-lg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .wali-santri-profil-info h4 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .wali-santri-profil-info p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }
        .wali-santri-profil-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .wali-profil-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .wali-profil-detail-label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .wali-profil-detail-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .wali-profil-status {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .wali-profil-status.aktif {
          background: #dcfce7;
          color: #166534;
        }
        .wali-profil-status.tidak-aktif {
          background: #fee2e2;
          color: #991b1b;
        }
        .wali-info-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: #dbeafe;
          border-radius: 10px;
          font-size: 13px;
          color: #1e40af;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}

export default ProfilWaliPage
