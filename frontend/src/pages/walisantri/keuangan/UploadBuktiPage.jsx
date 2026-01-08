import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, Upload, Camera, FileImage, CheckCircle,
    AlertCircle, Loader, CreditCard
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import SantriCard from '../components/SantriCard'

/**
 * UploadBuktiPage - Halaman untuk upload bukti transfer pembayaran
 * Wali bisa upload bukti pembayaran untuk diverifikasi admin
 */
const UploadBuktiPage = () => {
    const { user } = useAuth()
    const showToast = useToast()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [tagihanBelumLunas, setTagihanBelumLunas] = useState([])

    // Form state
    const [formData, setFormData] = useState({
        tagihan_id: '',
        jumlah: '',
        tanggal_transfer: new Date().toISOString().split('T')[0],
        catatan: '',
        bukti_file: null
    })
    const [preview, setPreview] = useState(null)

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
        }
    }

    // Fetch tagihan belum lunas
    const fetchTagihan = async (santriId) => {
        if (!santriId) return

        try {
            const { data, error } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama)')
                .eq('santri_id', santriId)
                .neq('status', 'Lunas')
                .order('jatuh_tempo')

            if (error) throw error
            setTagihanBelumLunas(data || [])

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
            fetchTagihan(selectedSantri.id)
            // Reset form when switching santri
            setFormData(prev => ({ ...prev, tagihan_id: '' }))
        }
    }, [selectedSantri])

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Hanya file gambar yang diperbolehkan', 'error')
                return
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Ukuran file maksimal 5MB', 'error')
                return
            }

            setFormData(prev => ({ ...prev, bukti_file: file }))

            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setPreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!selectedSantri) {
            showToast.error('Pilih santri terlebih dahulu')
            return
        }

        if (!formData.tagihan_id) {
            showToast.error('Pilih tagihan yang akan dibayar')
            return
        }

        if (!formData.jumlah) {
            showToast.error('Masukkan jumlah pembayaran')
            return
        }

        if (!formData.bukti_file) {
            showToast.error('Upload bukti transfer terlebih dahulu')
            return
        }

        setSubmitting(true)

        try {
            // Upload file to storage
            const fileExt = formData.bukti_file.name.split('.').pop()
            const fileName = `bukti_${selectedSantri.id}_${Date.now()}.${fileExt}`
            const filePath = `bukti-transfer/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, formData.bukti_file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath)

            // Insert bukti_transfer record
            const { error: insertError } = await supabase
                .from('bukti_transfer')
                .insert({
                    tagihan_id: formData.tagihan_id,
                    santri_id: selectedSantri.id,
                    wali_id: user.id,
                    jumlah: parseFloat(formData.jumlah),
                    tanggal_transfer: formData.tanggal_transfer,
                    bukti_url: publicUrl,
                    catatan: formData.catatan,
                    status: 'Menunggu'
                })

            if (insertError) throw insertError

            // === SEND CHAT NOTIFICATION TO BENDAHARA ===
            try {
                // Get tagihan info for the message
                const selectedTagihan = tagihanBelumLunas.find(t => t.id === formData.tagihan_id)
                const tagihanNama = selectedTagihan?.kategori?.nama || 'Tagihan'
                const jumlahFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(formData.jumlah)

                // Find all Bendahara users
                const { data: bendaharaUsers } = await supabase
                    .from('user_profiles')
                    .select('user_id')
                    .or('role.eq.bendahara,roles.cs.{bendahara}')

                if (bendaharaUsers && bendaharaUsers.length > 0) {
                    // Compose message
                    const chatMessage = `📝 *Konfirmasi Pembayaran Baru*\n\n` +
                        `👨‍👦 Santri: ${selectedSantri.nama}\n` +
                        `📋 Tagihan: ${tagihanNama}\n` +
                        `💰 Jumlah: ${jumlahFormatted}\n` +
                        `📅 Tanggal Transfer: ${formData.tanggal_transfer}\n` +
                        (formData.catatan ? `📝 Catatan: ${formData.catatan}\n\n` : '\n') +
                        `Mohon segera diverifikasi. Terima kasih 🙏`

                    // Send to each Bendahara
                    for (const bendahara of bendaharaUsers) {
                        // Get or create conversation
                        const { data: conversationId } = await supabase.rpc('get_or_create_conversation', {
                            p_other_user_id: bendahara.user_id
                        })

                        if (conversationId) {
                            // Send message with image attachment
                            await supabase.rpc('send_message', {
                                p_conversation_id: conversationId,
                                p_message: chatMessage,
                                p_type: 'image',
                                p_file_url: publicUrl,
                                p_file_name: formData.bukti_file.name,
                                p_file_type: formData.bukti_file.type,
                                p_file_size: formData.bukti_file.size
                            })
                        }
                    }
                }
            } catch (chatError) {
                console.error('Error sending chat to bendahara:', chatError)
                // Don't fail the whole process if chat fails
            }

            showToast.success('Bukti pembayaran berhasil dikirim! Menunggu verifikasi admin.')
            navigate('/wali/keuangan')

        } catch (error) {
            console.error('Error submitting:', error)
            showToast.error('Gagal mengirim bukti pembayaran: ' + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="wali-loading">
                <div className="wali-loading-spinner"></div>
            </div>
        )
    }

    return (
        <div className="wali-upload-page">
            {/* Header */}
            <div className="wali-page-header">
                <Link to="/wali/keuangan" className="wali-back-link">
                    <ChevronLeft size={20} />
                    <span>Kembali</span>
                </Link>
                <h1 className="wali-page-title">Konfirmasi Pembayaran</h1>
                <p className="wali-page-subtitle">Upload bukti transfer untuk diverifikasi</p>
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="wali-section">
                {/* Pilih Tagihan */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Pilih Tagihan *</label>
                    {tagihanBelumLunas.length > 0 ? (
                        <select
                            value={formData.tagihan_id}
                            onChange={(e) => {
                                const tagihan = tagihanBelumLunas.find(t => t.id === e.target.value)
                                setFormData(prev => ({
                                    ...prev,
                                    tagihan_id: e.target.value,
                                    jumlah: tagihan ? tagihan.jumlah.toString() : ''
                                }))
                            }}
                            className="wali-form-select"
                            required
                        >
                            <option value="">-- Pilih Tagihan --</option>
                            {tagihanBelumLunas.map(tagihan => (
                                <option key={tagihan.id} value={tagihan.id}>
                                    {tagihan.kategori?.nama || 'Pembayaran'} - {formatCurrency(tagihan.jumlah)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="wali-info-box success">
                            <CheckCircle size={20} />
                            <span>Semua tagihan sudah lunas!</span>
                        </div>
                    )}
                </div>

                {/* Jumlah Pembayaran */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Jumlah Pembayaran *</label>
                    <input
                        type="number"
                        value={formData.jumlah}
                        onChange={(e) => setFormData(prev => ({ ...prev, jumlah: e.target.value }))}
                        className="wali-form-input"
                        placeholder="Masukkan jumlah"
                        required
                    />
                </div>

                {/* Tanggal Transfer */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Tanggal Transfer *</label>
                    <input
                        type="date"
                        value={formData.tanggal_transfer}
                        onChange={(e) => setFormData(prev => ({ ...prev, tanggal_transfer: e.target.value }))}
                        className="wali-form-input"
                        required
                    />
                </div>

                {/* Upload Bukti */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Bukti Transfer *</label>
                    <div className="wali-upload-area">
                        {preview ? (
                            <div className="wali-upload-preview">
                                <img src={preview} alt="Preview" />
                                <button
                                    type="button"
                                    className="wali-upload-remove"
                                    onClick={() => {
                                        setPreview(null)
                                        setFormData(prev => ({ ...prev, bukti_file: null }))
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <label className="wali-upload-placeholder">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    hidden
                                />
                                <FileImage size={40} />
                                <span>Klik untuk upload bukti transfer</span>
                                <small>Format: JPG, PNG (maks. 5MB)</small>
                            </label>
                        )}
                    </div>
                </div>

                {/* Catatan */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Catatan (opsional)</label>
                    <textarea
                        value={formData.catatan}
                        onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                        className="wali-form-textarea"
                        placeholder="Catatan tambahan..."
                        rows={3}
                    />
                </div>

                {/* Info */}
                <div className="wali-info-box">
                    <AlertCircle size={18} />
                    <span>Bukti pembayaran akan diverifikasi oleh admin dalam 1-2 hari kerja.</span>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="wali-btn wali-btn-primary"
                    style={{ width: '100%', marginTop: '16px' }}
                    disabled={submitting || tagihanBelumLunas.length === 0}
                >
                    {submitting ? (
                        <>
                            <Loader size={18} className="spin" />
                            Mengirim...
                        </>
                    ) : (
                        <>
                            <Upload size={18} />
                            Kirim Bukti Pembayaran
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
        .wali-upload-area {
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }
        .wali-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }
        .wali-upload-placeholder:hover {
          background: var(--bg-secondary);
          color: var(--primary-color);
        }
        .wali-upload-placeholder span {
          margin-top: 12px;
          font-size: 14px;
          font-weight: 500;
        }
        .wali-upload-placeholder small {
          margin-top: 4px;
          font-size: 12px;
          opacity: 0.7;
        }
        .wali-upload-preview {
          position: relative;
        }
        .wali-upload-preview img {
          width: 100%;
          max-height: 300px;
          object-fit: contain;
        }
        .wali-upload-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
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
        .wali-info-box.success {
          background: #dcfce7;
          color: #166534;
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

export default UploadBuktiPage
