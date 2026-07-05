import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
    AlertTriangle,
    Save,
    ArrowLeft,
    User,
    Calendar,
    MapPin,
    FileText,
    Users,
    ChevronLeft
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import FormInput from '../../../components/ui/FormInput'
import Spinner from '../../../components/ui/Spinner'

const PelanggaranForm = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userProfile } = useAuth()
    const isEdit = Boolean(id)

    const [formData, setFormData] = useState({
        santri_id: '',
        tanggal: new Date().toISOString().split('T')[0],
        tingkat: 1,
        jenis: '',
        deskripsi: '',
        lokasi: '',
        saksi: '',
        status: 'OPEN',
        poin: 0,
        sanksi: ''
    })
    const [santriList, setSantriList] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetchingData, setFetchingData] = useState(isEdit)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        fetchSantriList()
        if (isEdit) {
            fetchPelanggaran()
        }
    }, [id])

    const fetchSantriList = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, kelas:kelas_id(nama)')
                .eq('status', 'Aktif')
                .order('nama')

            if (error) throw error
            setSantriList(data || [])
        } catch (error) {
            console.error('Error fetching santri:', error.message)
        }
    }

    const fetchPelanggaran = async () => {
        setFetchingData(true)
        try {
            const { data, error } = await supabase
                .from('pelanggaran')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            if (data) {
                setFormData({
                    santri_id: data.santri_id,
                    tanggal: data.tanggal,
                    tingkat: data.tingkat,
                    jenis: data.jenis,
                    deskripsi: data.deskripsi || '',
                    lokasi: data.lokasi || '',
                    saksi: data.saksi || '',
                    status: data.status,
                    poin: data.poin || 0,
                    sanksi: data.sanksi || ''
                })
            }
        } catch (error) {
            console.error('Error fetching pelanggaran:', error.message)
            alert('Data tidak ditemukan')
            navigate('/pengurus/pelanggaran')
        } finally {
            setFetchingData(false)
        }
    }

    const getWeekRange = (dateStr) => {
        const parts = dateStr.split('-')
        const date = new Date(parts[0], parts[1] - 1, parts[2])
        const day = date.getDay()
        const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date.setDate(diffToMonday))
        
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        
        const formatLocal = (d) => {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }
        
        return {
            start: formatLocal(monday),
            end: formatLocal(sunday)
        }
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.santri_id) newErrors.santri_id = 'Pilih santri'
        if (!formData.tanggal) newErrors.tanggal = 'Tanggal wajib diisi'
        if (!formData.jenis) newErrors.jenis = 'Jenis pelanggaran wajib diisi'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        try {
            const { start, end } = getWeekRange(formData.tanggal)

            const { data: existingViolations, error: fetchErr } = await supabase
                .from('pelanggaran')
                .select('id, poin')
                .eq('santri_id', formData.santri_id)
                .gte('tanggal', start)
                .lte('tanggal', end)

            if (fetchErr) throw fetchErr

            const filteredViolations = isEdit 
                ? (existingViolations || []).filter(v => v.id !== id)
                : (existingViolations || [])

            const existingPoints = filteredViolations.reduce((sum, v) => sum + (v.poin || 0), 0)
            const totalWeeklyPoints = existingPoints + (formData.poin || 0)

            let tingkat = 1
            let sanksi = ''
            
            if (totalWeeklyPoints >= 1 && totalWeeklyPoints <= 3) {
                tingkat = 1
                sanksi = `Menghafalkan mufrodat ${15 * totalWeeklyPoints} (15 per kelipatan)`
            } else if (totalWeeklyPoints >= 4 && totalWeeklyPoints <= 6) {
                tingkat = 2
                sanksi = "Menulis istighfar 500 kali didepan dhalem pengasuh setelah sholat jum'at dan memakai rompi"
            } else if (totalWeeklyPoints >= 7 && totalWeeklyPoints <= 9) {
                tingkat = 3
                sanksi = "Meminta surat pernyataan kepada pengasuh dan botak abri"
            } else if (totalWeeklyPoints >= 10) {
                tingkat = 4
                sanksi = "Botak bersih dan membuat surat pernyataan kepada pengasuh kemudian dikabari kepada wali secara online / whatsapp"
            } else {
                tingkat = 1
                sanksi = "Tidak ada sanksi"
            }

            const payload = {
                ...formData,
                tingkat,
                sanksi,
                pelapor_id: userProfile?.id
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('pelanggaran')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('pelanggaran')
                    .insert([payload])
                if (error) throw error
            }

            navigate('/pengurus/pelanggaran')
        } catch (error) {
            console.error('Error saving:', error.message)
            alert('Gagal menyimpan: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const tingkatOptions = [
        { value: 1, label: 'Ringan', sub: 'Teguran Lisan', color: 'emerald' },
        { value: 2, label: 'Sedang', sub: 'Peringatan Tertulis', color: 'amber' },
        { value: 3, label: 'Berat', sub: 'Panggilan Wali', color: 'red' },
        { value: 4, label: 'Sangat Berat', sub: 'Skorsing/Khusus', color: 'purple' }
    ]

    const jenisOptions = [
        'Terlambat',
        'Bolos',
        'Tidak mengikuti kegiatan',
        'Berbicara kasar',
        'Berkelahi',
        'Merusak fasilitas',
        'Membawa barang terlarang',
        'Melanggar tata tertib',
        'Lainnya'
    ]

    if (fetchingData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Spinner size="lg" />
                <p className="text-gray-500 font-medium">Memuat data pelanggaran...</p>
            </div>
        )
    }

    const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"
    const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center gap-4 mb-2">
                <Button variant="secondary" size="sm" onClick={() => navigate('/pengurus/pelanggaran')} className="rounded-xl">
                    <ChevronLeft size={18} /> Kembali
                </Button>
            </div>

            <PageHeader
                title={isEdit ? 'Edit Pelanggaran' : 'Catat Pelanggaran Baru'}
                description={isEdit ? 'Perbarui data kejadian pelanggaran santri' : 'Dokumentasikan kejadian pelanggaran untuk pembinaan santri'}
                icon={AlertTriangle}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Data Santri & Waktu */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User size={20} className="text-primary-600" />
                            Data Santri & Kejadian
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Pilih Santri *</label>
                                <select
                                    value={formData.santri_id}
                                    onChange={(e) => setFormData({ ...formData, santri_id: e.target.value })}
                                    className={`${inputClass} ${errors.santri_id ? 'border-red-500' : ''}`}
                                >
                                    <option value="">-- Pilih Santri --</option>
                                    {santriList.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.nama} ({s.nis}) - {s.kelas?.nama || '-'}
                                        </option>
                                    ))}
                                </select>
                                {errors.santri_id && <p className="text-xs text-red-500 mt-1">{errors.santri_id}</p>}
                            </div>

                            <FormInput
                                label="Tanggal Kejadian *"
                                type="date"
                                value={formData.tanggal}
                                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                error={errors.tanggal}
                                icon={Calendar}
                            />

                            <FormInput
                                label="Lokasi Kejadian"
                                placeholder="Contoh: Masjid, Asrama, Kelas..."
                                value={formData.lokasi}
                                onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                                icon={MapPin}
                            />

                            <FormInput
                                label="Saksi (Jika ada)"
                                placeholder="Nama saksi..."
                                value={formData.saksi}
                                onChange={(e) => setFormData({ ...formData, saksi: e.target.value })}
                                icon={Users}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Detail Pelanggaran */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle size={20} className="text-amber-500" />
                            Detail Pelanggaran
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Jenis Pelanggaran *</label>
                                <select
                                    value={formData.jenis}
                                    onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                                    className={`${inputClass} ${errors.jenis ? 'border-red-500' : ''}`}
                                >
                                    <option value="">-- Pilih Jenis --</option>
                                    {jenisOptions.map((j) => (
                                        <option key={j} value={j}>{j}</option>
                                    ))}
                                </select>
                                {errors.jenis && <p className="text-xs text-red-500 mt-1">{errors.jenis}</p>}
                            </div>

                            <FormInput
                                label="Poin Pelanggaran *"
                                type="number"
                                min="0"
                                placeholder="Masukkan jumlah poin..."
                                value={formData.poin}
                                onChange={(e) => setFormData({ ...formData, poin: parseInt(e.target.value) || 0 })}
                                error={errors.poin}
                                icon={Save}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Deskripsi Kronologi</label>
                            <textarea
                                rows="3"
                                placeholder="Jelaskan kronologi kejadian secara mendetail..."
                                className={inputClass}
                                value={formData.deskripsi}
                                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                            />
                        </div>

                        {isEdit && (
                            <div className="pt-4 border-t border-gray-100">
                                <label className={labelClass}>Status Penyelesaian</label>
                                <div className="flex gap-2">
                                    {['OPEN', 'PROSES', 'SELESAI'].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: s })}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                                                ${formData.status === s 
                                                    ? 'bg-gray-900 text-white border-gray-900 shadow-lg' 
                                                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={() => navigate('/pengurus/pelanggaran')}>
                        Batal
                    </Button>
                    <Button type="submit" disabled={loading} isLoading={loading} className="px-8 shadow-lg shadow-primary-500/20">
                        <Save size={18} /> {isEdit ? 'Simpan Perubahan' : 'Simpan Pelanggaran'}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default PelanggaranForm
