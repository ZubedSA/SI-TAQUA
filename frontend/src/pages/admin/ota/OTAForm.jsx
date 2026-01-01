import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw, User, Mail, Phone, ShieldCheck, Tag, MapPin } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../context/ToastContext'

const OTAForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const showToast = useToast()
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [kategoriList, setKategoriList] = useState([])
    const [formData, setFormData] = useState({
        nama: '',
        email: '',
        no_hp: '',
        alamat: '',
        kategori_id: '',
        status: true
    })

    useEffect(() => {
        fetchKategori()
        if (isEdit) {
            fetchData()
        }
    }, [id])

    const fetchKategori = async () => {
        try {
            const { data, error } = await supabase
                .from('ota_kategori')
                .select('id, nama')
                .order('nama')
            if (!error) setKategoriList(data || [])
        } catch (err) {
            console.error('Error fetching kategori:', err)
        }
    }

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('orang_tua_asuh')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setFormData({
                nama: data.nama || '',
                email: data.email || '',
                no_hp: data.no_hp || '',
                alamat: data.alamat || '',
                kategori_id: data.kategori_id || '',
                status: data.status
            })
        } catch (err) {
            showToast.error('Gagal memuat data: ' + err.message)
            navigate('/admin/ota')
        } finally {
            setFetching(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                nama: formData.nama,
                email: formData.email,
                no_hp: formData.no_hp,
                alamat: formData.alamat || null,
                kategori_id: formData.kategori_id || null,
                status: formData.status
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('orang_tua_asuh')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
                showToast.success('Data OTA berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('orang_tua_asuh')
                    .insert([payload])
                if (error) throw error
                showToast.success('Orang Tua Asuh baru berhasil ditambahkan')
            }
            navigate('/admin/ota')
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            <div className="max-w-3xl mx-auto fade-in">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {isEdit ? 'Edit Profil OTA' : 'Registrasi OTA Baru'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {isEdit ? 'Perbaharui informasi data diri orang tua asuh' : 'Tambahkan data orang tua asuh baru ke sistem'}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/ota')}
                        className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition shadow-sm"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Kembali
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Personal Info Section */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <User size={18} className="text-green-600" />
                                Informasi Pribadi
                            </h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Lengkap <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: H. Abdullah"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition shadow-sm"
                                        value={formData.nama}
                                        onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="border-t border-gray-100"></div>

                        {/* Contact Info Section */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <Mail size={18} className="text-blue-600" />
                                Kontak & Akun
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Alamat Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            placeholder="email@contoh.com"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition shadow-sm"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        No. WhatsApp / Telepon
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="08xxxxxxxxxx"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition shadow-sm"
                                            value={formData.no_hp}
                                            onChange={e => setFormData({ ...formData, no_hp: e.target.value })}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Format: 08xxxxxxxxxx atau 628xxxxxxxxxx</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Kategori OTA
                                    </label>
                                    <div className="relative">
                                        <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <select
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition shadow-sm bg-white cursor-pointer"
                                            value={formData.kategori_id}
                                            onChange={e => setFormData({ ...formData, kategori_id: e.target.value })}
                                        >
                                            <option value="">-- Pilih Kategori --</option>
                                            {kategoriList.map(k => (
                                                <option key={k.id} value={k.id}>{k.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status Keaktifan
                                    </label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <select
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition shadow-sm bg-white cursor-pointer"
                                            value={formData.status.toString()}
                                            onChange={e => setFormData({ ...formData, status: e.target.value === 'true' })}
                                        >
                                            <option value="true">Aktif</option>
                                            <option value="false">Non-Aktif</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Alamat Field - Full Width */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Alamat
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-3 text-gray-400" size={18} />
                                    <textarea
                                        placeholder="Alamat lengkap OTA (opsional)"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition shadow-sm resize-none"
                                        rows={3}
                                        value={formData.alamat}
                                        onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="pt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/ota')}
                                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-green-600 text-white px-8 py-2.5 rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-medium shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                {isEdit ? 'Simpan Perubahan' : 'Simpan Data Baru'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default OTAForm
