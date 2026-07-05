import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, Send, Loader, MessageCircle, AlertCircle
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import SantriCard from '../components/SantriCard'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import FormInput from '../../../components/ui/FormInput'
// import '../WaliPortal.css' // REMOVED

/**
 * KirimPesanPage - Halaman untuk mengirim pesan ke pondok
 * Refactored to use Global Layout System (Phase 2)
 */
const KirimPesanPage = () => {
    const { user } = useAuth()
    const showToast = useToast()
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
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Kirim Pesan"
                description="Sampaikan pertanyaan, izin, atau keluhan ke pihak pondok"
                icon={Send}
                backUrl="/wali/pesan"
            />

            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Pilih Santri (jika lebih dari 1) */}
                    {santriList.length > 1 && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Terkait Santri</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <Card>
                        <div className="space-y-4">
                            {/* Judul */}
                            <FormInput
                                label="Judul Pesan"
                                name="judul"
                                value={formData.judul}
                                onChange={handleChange}
                                placeholder="Contoh: Izin tidak masuk karena sakit"
                                required
                            />

                            {/* Kategori */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                <select
                                    name="kategori"
                                    value={formData.kategori}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-shadow"
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan</label>
                                <textarea
                                    name="isi"
                                    value={formData.isi}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 min-h-[150px] transition-shadow"
                                    placeholder="Tuliskan detail pesan Anda di sini secara jelas dan sopan..."
                                    required
                                />
                                <div className="flex justify-between mt-1">
                                    <p className="text-xs text-gray-500">Minimal 10 karakter.</p>
                                    <p className="text-xs text-gray-500">{formData.isi.length}/1000</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm mb-6">
                            <MessageCircle size={20} className="shrink-0 mt-0.5" />
                            <p>
                                Pesan Anda akan diterima oleh admin pondok. Mohon gunakan bahasa yang sopan.
                                Balasan akan muncul di halaman <strong>Inbox Pesan</strong>.
                            </p>
                        </div>

                        <Button type="submit" isLoading={submitting} className="w-full">
                            <Send size={18} className="mr-2" />
                            Kirim Pesan Sekarang
                        </Button>
                    </Card>
                </form>
            </div>
        </div>
    )
}

export default KirimPesanPage
