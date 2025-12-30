import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, Send, Loader, MessageCircle
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import SantriCard from '../components/SantriCard'
import '../WaliPortal.css'

/**
 * KirimPesanPage - Halaman untuk mengirim pesan ke pondok
 */
const KirimPesanPage = () => {
    const { user } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)

    // Form state
    const [formData, setFormData] = useState({
        judul: '',
        kategori: 'Umum',
        isi: ''
    })

    // Fetch santri list
    const fetchSantriList = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select(`
          *,
          kelas:kelas_id (nama)
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
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList()
        }
    }, [user])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.judul.trim()) {
            showToast('Masukkan judul pesan', 'error')
            return
        }

        if (!formData.isi.trim()) {
            showToast('Masukkan isi pesan', 'error')
            return
        }

        setSubmitting(true)

        try {
            const { error } = await supabase
                .from('pesan_wali')
                .insert({
                    wali_id: user.id,
                    santri_id: selectedSantri?.id || null,
                    judul: formData.judul.trim(),
                    kategori: formData.kategori,
                    isi: formData.isi.trim(),
                    status: 'Terkirim'
                })

            if (error) throw error

            showToast('Pesan berhasil dikirim!', 'success')
            navigate('/wali/pesan')

        } catch (error) {
            console.error('Error sending message:', error)
            showToast('Gagal mengirim pesan: ' + error.message, 'error')
        } finally {
            setSubmitting(false)
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
        <div className="wali-kirim-pesan-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/pesan" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Kirim Pesan</h1>
                <p className="wali-page-subtitle">Sampaikan pesan Anda ke pihak pondok</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="wali-section">
                {/* Pilih Santri (jika lebih dari 1) */}
                {santriList.length > 1 && (
                    <div className="wali-form-group">
                        <label className="wali-form-label">Terkait Santri</label>
                        <div className="wali-santri-selector" style={{ marginBottom: 0, padding: 0 }}>
                            {santriList.map(santri => (
                                <SantriCard
                                    key={santri.id}
                                    santri={santri}
                                    selected={selectedSantri?.id === santri.id}
                                    onClick={() => setSelectedSantri(santri)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Judul */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Judul Pesan *</label>
                    <input
                        type="text"
                        name="judul"
                        value={formData.judul}
                        onChange={handleChange}
                        className="wali-form-input"
                        placeholder="Contoh: Izin tidak masuk"
                        required
                    />
                </div>

                {/* Kategori */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Kategori</label>
                    <select
                        name="kategori"
                        value={formData.kategori}
                        onChange={handleChange}
                        className="wali-form-select"
                    >
                        <option value="Umum">Umum</option>
                        <option value="Akademik">Akademik</option>
                        <option value="Keuangan">Keuangan</option>
                        <option value="Izin">Izin</option>
                        <option value="Keluhan">Keluhan</option>
                        <option value="Lainnya">Lainnya</option>
                    </select>
                </div>

                {/* Isi Pesan */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Isi Pesan *</label>
                    <textarea
                        name="isi"
                        value={formData.isi}
                        onChange={handleChange}
                        className="wali-form-textarea"
                        placeholder="Tuliskan pesan Anda di sini..."
                        rows={6}
                        required
                    />
                    <small className="wali-form-hint">
                        {formData.isi.length}/1000 karakter
                    </small>
                </div>

                {/* Info */}
                <div className="wali-info-box">
                    <MessageCircle size={18} />
                    <span>Pesan akan dibalas oleh admin pondok. Anda akan menerima balasan di halaman pesan.</span>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="wali-btn wali-btn-primary"
                    style={{ width: '100%', marginTop: '16px' }}
                    disabled={submitting}
                >
                    {submitting ? (
                        <>
                            <Loader size={18} className="spin" />
                            Mengirim...
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            Kirim Pesan
                        </>
                    )}
                </button>
            </form>

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
        .wali-form-hint {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: var(--text-secondary);
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

export default KirimPesanPage
