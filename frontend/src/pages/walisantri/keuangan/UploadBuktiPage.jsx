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
    // Multi-select santri - now an array of selected santri IDs
    const [selectedSantriIds, setSelectedSantriIds] = useState([])
    const [tagihanBelumLunas, setTagihanBelumLunas] = useState([])

    // Form state - multi-select tagihan
    const [selectedTagihan, setSelectedTagihan] = useState([])
    const [formData, setFormData] = useState({
        tanggal_transfer: new Date().toISOString().split('T')[0],
        catatan: '',
        bukti_file: null
    })
    const [preview, setPreview] = useState(null)

    // Calculate total amount from selected tagihan
    const totalJumlah = selectedTagihan.reduce((sum, tagihanId) => {
        const tagihan = tagihanBelumLunas.find(t => t.id === tagihanId)
        return sum + (tagihan?.jumlah || 0)
    }, 0)

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
            // Auto-select all santri by default
            if (data && data.length > 0) {
                setSelectedSantriIds(data.map(s => s.id))
            }
        } catch (error) {
            console.error('Error fetching santri:', error)
        }
    }

    // Fetch tagihan for multiple santri
    const fetchTagihanMultiple = async (santriIds) => {
        if (!santriIds || santriIds.length === 0) {
            setTagihanBelumLunas([])
            return
        }

        try {
            const { data, error } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama), santri:santri_id (id, nama)')
                .in('santri_id', santriIds)
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
        if (selectedSantriIds.length > 0) {
            fetchTagihanMultiple(selectedSantriIds)
        } else {
            setTagihanBelumLunas([])
        }
        // Reset selected tagihan when changing santri selection
        setSelectedTagihan([])
    }, [selectedSantriIds])

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

        if (selectedSantriIds.length === 0) {
            showToast.error('Pilih santri terlebih dahulu')
            return
        }

        if (selectedTagihan.length === 0) {
            showToast.error('Pilih minimal satu tagihan yang akan dibayar')
            return
        }

        if (totalJumlah <= 0) {
            showToast.error('Total jumlah pembayaran tidak valid')
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
            const fileName = `bukti_${user.id}_${Date.now()}.${fileExt}`
            const filePath = `bukti-transfer/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, formData.bukti_file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filePath)

            // Insert bukti_transfer record for each selected tagihan
            for (const tagihanId of selectedTagihan) {
                const tagihan = tagihanBelumLunas.find(t => t.id === tagihanId)
                const { error: insertError } = await supabase
                    .from('bukti_transfer')
                    .insert({
                        tagihan_id: tagihanId,
                        santri_id: tagihan?.santri?.id || tagihan?.santri_id,
                        wali_id: user.id,
                        jumlah: tagihan?.jumlah || 0,
                        tanggal_transfer: formData.tanggal_transfer,
                        bukti_url: publicUrl,
                        catatan: formData.catatan,
                        status: 'Menunggu'
                    })

                if (insertError) throw insertError
            }

            // === SEND CHAT NOTIFICATION TO BENDAHARA ===
            try {
                // Format currency helper
                const formatRp = (amount) => new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                }).format(amount)

                // Format date to Indonesian format
                const formatTanggal = (dateStr) => {
                    const date = new Date(dateStr)
                    return date.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    })
                }

                // Group tagihan by santri for detailed breakdown
                const tagihanBySantri = {}
                selectedTagihan.forEach(id => {
                    const t = tagihanBelumLunas.find(tag => tag.id === id)
                    if (t) {
                        const santriName = t.santri?.nama || 'Santri'
                        if (!tagihanBySantri[santriName]) {
                            tagihanBySantri[santriName] = []
                        }
                        tagihanBySantri[santriName].push({
                            kategori: t.kategori?.nama || 'Tagihan',
                            jumlah: t.jumlah
                        })
                    }
                })

                // Build detailed breakdown message
                let detailMessage = ''
                Object.entries(tagihanBySantri).forEach(([santriName, tagihanList], index) => {
                    const subtotal = tagihanList.reduce((sum, t) => sum + t.jumlah, 0)
                    detailMessage += `\n👤 *${santriName}*\n`
                    tagihanList.forEach(t => {
                        detailMessage += `   • ${t.kategori}: ${formatRp(t.jumlah)}\n`
                    })
                    detailMessage += `   📊 Subtotal: ${formatRp(subtotal)}\n`
                })

                // Find all Bendahara users
                const { data: bendaharaUsers } = await supabase
                    .from('user_profiles')
                    .select('user_id')
                    .or('role.eq.bendahara,roles.cs.{bendahara}')

                if (bendaharaUsers && bendaharaUsers.length > 0) {
                    // Compose professional message
                    const chatMessage =
                        `━━━━━━━━━━━━━━━━━━━━━━━━
📝 *KONFIRMASI PEMBAYARAN*
━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Tanggal Transfer:*
${formatTanggal(formData.tanggal_transfer)}

📋 *RINCIAN TAGIHAN:*
${detailMessage}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL PEMBAYARAN:*
${formatRp(totalJumlah)}
━━━━━━━━━━━━━━━━━━━━━━━━
${formData.catatan ? `\n📝 *Catatan:*\n${formData.catatan}\n` : ''}
🙏 Mohon untuk segera diverifikasi.
Terima kasih atas kerjasamanya.`

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

            {/* Santri Selector - Multi Select */}
            {santriList.length > 1 && (
                <div className="wali-form-group">
                    <label className="wali-form-label">Pilih Santri * (bisa pilih lebih dari satu)</label>
                    <div className="santri-checkbox-list">
                        {/* Select All Toggle */}
                        <label className="santri-checkbox-item select-all">
                            <input
                                type="checkbox"
                                checked={selectedSantriIds.length === santriList.length && santriList.length > 0}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedSantriIds(santriList.map(s => s.id))
                                    } else {
                                        setSelectedSantriIds([])
                                    }
                                }}
                            />
                            <span className="checkbox-label">Pilih Semua Santri</span>
                        </label>
                        <div className="santri-divider"></div>
                        {santriList.map(santri => (
                            <label key={santri.id} className="santri-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={selectedSantriIds.includes(santri.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedSantriIds(prev => [...prev, santri.id])
                                        } else {
                                            setSelectedSantriIds(prev => prev.filter(id => id !== santri.id))
                                        }
                                    }}
                                />
                                <div className="santri-info">
                                    <span className="santri-name">{santri.nama}</span>
                                    <span className="santri-nis">NIS: {santri.nis}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="wali-section">
                {/* Pilih Tagihan - Multi Select */}
                <div className="wali-form-group">
                    <label className="wali-form-label">Pilih Tagihan * (bisa pilih lebih dari satu)</label>
                    {tagihanBelumLunas.length > 0 ? (
                        <div className="tagihan-checkbox-list">
                            {/* Select All Toggle */}
                            <label className="tagihan-checkbox-item select-all">
                                <input
                                    type="checkbox"
                                    checked={selectedTagihan.length === tagihanBelumLunas.length && tagihanBelumLunas.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedTagihan(tagihanBelumLunas.map(t => t.id))
                                        } else {
                                            setSelectedTagihan([])
                                        }
                                    }}
                                />
                                <span className="checkbox-label">Pilih Semua</span>
                            </label>
                            <div className="tagihan-divider"></div>
                            {tagihanBelumLunas.map(tagihan => (
                                <label key={tagihan.id} className="tagihan-checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedTagihan.includes(tagihan.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTagihan(prev => [...prev, tagihan.id])
                                            } else {
                                                setSelectedTagihan(prev => prev.filter(id => id !== tagihan.id))
                                            }
                                        }}
                                    />
                                    <span className="checkbox-label">
                                        <span className="tagihan-santri-name">{tagihan.santri?.nama}</span>
                                        <span className="tagihan-detail">{tagihan.kategori?.nama || 'Pembayaran'} - {formatCurrency(tagihan.jumlah)}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="wali-info-box success">
                            <CheckCircle size={20} />
                            <span>Semua tagihan sudah lunas!</span>
                        </div>
                    )}
                </div>

                {/* Total Jumlah Pembayaran - Display Only */}
                {selectedTagihan.length > 0 && (
                    <div className="wali-form-group">
                        <label className="wali-form-label">Total Jumlah Pembayaran</label>
                        <div className="total-amount-display">
                            <CreditCard size={20} />
                            <span className="total-amount">{formatCurrency(totalJumlah)}</span>
                            <span className="tagihan-count">({selectedTagihan.length} tagihan dipilih)</span>
                        </div>
                    </div>
                )}

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
        /* Multi-select Tagihan Checkbox List */
        .tagihan-checkbox-list {
          border: 1px solid var(--border-color);
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
        }
        .tagihan-checkbox-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid var(--border-color);
        }
        .tagihan-checkbox-item:last-child {
          border-bottom: none;
        }
        .tagihan-checkbox-item:hover {
          background: #f8fafc;
        }
        .tagihan-checkbox-item.select-all {
          background: #f1f5f9;
          font-weight: 600;
        }
        .tagihan-checkbox-item.select-all:hover {
          background: #e2e8f0;
        }
        .tagihan-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--primary-color);
          cursor: pointer;
        }
        .checkbox-label {
          flex: 1;
          font-size: 14px;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tagihan-santri-name {
          font-weight: 600;
          font-size: 12px;
          color: var(--primary-color);
        }
        .tagihan-detail {
          font-size: 14px;
          color: var(--text-primary);
        }
        .tagihan-divider {
          height: 1px;
          background: var(--border-color);
        }
        /* Multi-select Santri Checkbox List */
        .santri-checkbox-list {
          border: 1px solid var(--border-color);
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
        }
        .santri-checkbox-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid var(--border-color);
        }
        .santri-checkbox-item:last-child {
          border-bottom: none;
        }
        .santri-checkbox-item:hover {
          background: #f8fafc;
        }
        .santri-checkbox-item.select-all {
          background: #f1f5f9;
          font-weight: 600;
        }
        .santri-checkbox-item.select-all:hover {
          background: #e2e8f0;
        }
        .santri-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--primary-color);
          cursor: pointer;
        }
        .santri-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .santri-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .santri-nis {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .santri-divider {
          height: 1px;
          background: var(--border-color);
        }
        /* Total Amount Display */
        .total-amount-display {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1px solid #86efac;
          border-radius: 10px;
        }
        .total-amount-display svg {
          color: #16a34a;
        }
        .total-amount {
          font-size: 20px;
          font-weight: 700;
          color: #15803d;
        }
        .tagihan-count {
          font-size: 13px;
          color: #4ade80;
          margin-left: auto;
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
