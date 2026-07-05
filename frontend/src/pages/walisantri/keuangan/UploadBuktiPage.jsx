import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, Upload, Camera, FileImage, CheckCircle,
    AlertCircle, Loader, CreditCard, User, List, Calendar as CalendarIcon,
    ArrowRight, CheckCircle2, Info
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import SantriCard from '../components/SantriCard'
import PageHeader from '../../../components/layout/PageHeader'
import Button from '../../../components/ui/Button'

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
                showToast.error('Hanya file gambar yang diperbolehkan')
                return
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast.error('Ukuran file maksimal 5MB')
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
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2"

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <PageHeader
                title="Konfirmasi Pembayaran"
                description="Upload bukti transfer untuk verifikasi admin"
                icon={Upload}
                backUrl="/wali/keuangan"
            />

            {/* Santri Selector - Multi Select */}
            {santriList.length > 1 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Pilih Santri</h3>
                        <button 
                            type="button"
                            onClick={() => {
                                if (selectedSantriIds.length === santriList.length) setSelectedSantriIds([])
                                else setSelectedSantriIds(santriList.map(s => s.id))
                            }}
                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1 rounded-full transition-colors"
                        >
                            {selectedSantriIds.length === santriList.length ? 'Batal Semua' : 'Pilih Semua'}
                        </button>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4">
                        {santriList.map(santri => (
                            <div key={santri.id} className="min-w-[280px]">
                                <SantriCard
                                    santri={santri}
                                    selected={selectedSantriIds.includes(santri.id)}
                                    onClick={() => {
                                        if (selectedSantriIds.includes(santri.id)) {
                                            setSelectedSantriIds(prev => prev.filter(id => id !== santri.id))
                                        } else {
                                            setSelectedSantriIds(prev => [...prev, santri.id])
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Pilih Tagihan Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                                    <List size={26} />
                                </div>
                                <div className="min-w-0">
                                    <span className={labelClass}>Tagihan Terbuka</span>
                                    <h4 className="font-black text-gray-900 uppercase leading-tight text-lg">Pilih Pembayaran</h4>
                                </div>
                            </div>
                            {tagihanBelumLunas.length > 0 && (
                                <button 
                                    type="button"
                                    onClick={() => {
                                        if (selectedTagihan.length === tagihanBelumLunas.length) setSelectedTagihan([])
                                        else setSelectedTagihan(tagihanBelumLunas.map(t => t.id))
                                    }}
                                    className="w-fit text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/50 px-4 py-2 rounded-full hover:bg-indigo-600 hover:text-white transition-all shrink-0"
                                >
                                    {selectedTagihan.length === tagihanBelumLunas.length ? 'Batal Semua' : 'Centang Semua'}
                                </button>
                            )}
                        </div>

                        {tagihanBelumLunas.length > 0 ? (
                            <div className="grid gap-3">
                                {tagihanBelumLunas.map(tagihan => (
                                    <label 
                                        key={tagihan.id} 
                                        className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${
                                            selectedTagihan.includes(tagihan.id) 
                                            ? 'border-indigo-500 bg-indigo-50/30' 
                                            : 'border-gray-100 bg-slate-50/50 hover:border-gray-200'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTagihan.includes(tagihan.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedTagihan(prev => [...prev, tagihan.id])
                                                else setSelectedTagihan(prev => prev.filter(id => id !== tagihan.id))
                                            }}
                                            className="w-6 h-6 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                            <div className="min-w-0">
                                                <span className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1 truncate">
                                                    {tagihan.santri?.nama}
                                                </span>
                                                <span className="block font-black text-gray-900 uppercase text-sm leading-tight truncate">
                                                    {tagihan.kategori?.nama || 'Pembayaran'}
                                                </span>
                                            </div>
                                            <span className="font-black text-gray-900 text-base shrink-0 whitespace-nowrap">
                                                {formatCurrency(tagihan.jumlah)}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="p-10 text-center bg-slate-50/50 rounded-3xl border border-dashed border-gray-200">
                                <div className="p-4 w-fit mx-auto rounded-full bg-emerald-50 text-emerald-500 mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h5 className="font-black text-gray-900 uppercase">Semua Tagihan Lunas</h5>
                                <p className="text-slate-400 text-xs mt-1">Tidak ada tagihan yang perlu dibayar saat ini.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Total & Tanggal Transfer */}
                {selectedTagihan.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Total Display */}
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-4">
                                    <div className="p-3 w-fit rounded-2xl bg-white/20 backdrop-blur-md">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Total Pembayaran</span>
                                        <h3 className="text-3xl font-black leading-none">{formatCurrency(totalJumlah)}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-2 block italic">{selectedTagihan.length} Tagihan Dipilih</span>
                                    </div>
                                </div>
                                <ArrowRight size={40} className="opacity-20 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>

                        {/* Tanggal Form */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 rounded-2xl bg-slate-50 text-slate-600">
                                        <CalendarIcon size={24} />
                                    </div>
                                    <div>
                                        <span className={labelClass}>Waktu Bayar</span>
                                        <h4 className="font-black text-gray-900 uppercase leading-none">Tanggal Transfer</h4>
                                    </div>
                                </div>
                                <input
                                    type="date"
                                    value={formData.tanggal_transfer}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal_transfer: e.target.value }))}
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Upload Input */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                    <Camera size={24} />
                                </div>
                                <div>
                                    <span className={labelClass}>Lampiran Dokumen</span>
                                    <h4 className="font-black text-gray-900 uppercase leading-none">Bukti Pembayaran</h4>
                                </div>
                            </div>

                            <div className="relative group">
                                {preview ? (
                                    <div className="relative rounded-3xl overflow-hidden border-4 border-slate-50 shadow-lg">
                                        <img src={preview} alt="Preview" className="w-full aspect-[4/3] object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <button
                                                type="button"
                                                onClick={() => { setPreview(null); setFormData(prev => ({ ...prev, bukti_file: null })) }}
                                                className="p-4 rounded-full bg-red-500 text-white shadow-xl hover:scale-110 transition-transform"
                                            >
                                                <AlertCircle size={24} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full aspect-[4/3] rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer group">
                                        <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                                        <div className="p-6 rounded-full bg-white shadow-sm mb-4 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-indigo-500">
                                            <Upload size={32} />
                                        </div>
                                        <span className="font-black text-gray-900 uppercase tracking-tight text-sm">Klik Untuk Upload</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Format: JPG, PNG (Maks 5MB)</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Notes & Actions */}
                        <div className="flex flex-col justify-between space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <span className={labelClass}>Informasi Tambahan</span>
                                    <textarea
                                        value={formData.catatan}
                                        onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                                        className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                                        placeholder="Tulis catatan pembayaran di sini (opsional)..."
                                        rows={4}
                                    />
                                </div>

                                <div className="p-5 rounded-3xl bg-amber-50/50 border border-amber-100 flex gap-4">
                                    <Info className="text-amber-500 shrink-0" size={20} />
                                    <div>
                                        <span className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Penting</span>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                            Bukti pembayaran akan diverifikasi oleh Admin Bendahara dalam waktu 1-2 hari kerja. Harap pastikan foto bukti terlihat jelas.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                variant="primary" 
                                className="w-full h-16 rounded-3xl !text-base !font-black uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={submitting || tagihanBelumLunas.length === 0}
                                isLoading={submitting}
                            >
                                <CheckCircle2 size={24} className="mr-2" />
                                Kirim Konfirmasi
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default UploadBuktiPage
