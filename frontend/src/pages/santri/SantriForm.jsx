import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, User, Phone, School, Edit } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { logCreate, logUpdate } from '../../lib/auditLog'
import Spinner from '../../components/ui/Spinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'

const SantriForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const location = useLocation()
    const { isAdmin, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Determine mode: view (read-only) vs edit
    const isViewMode = location.pathname.includes('/santri/') && !location.pathname.includes('/edit') && !location.pathname.includes('/create')
    const canEdit = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [kelasList, setKelasList] = useState([])
    const [halaqohList, setHalaqohList] = useState([])

    const [formData, setFormData] = useState({
        nis: '',
        nama: '',
        jenis_kelamin: 'Laki-laki',
        tempat_lahir: '',
        tanggal_lahir: '',
        alamat: '',
        no_telp: '',
        nama_wali: '',
        no_telp_wali: '',
        kelas_id: '',
        halaqoh_id: '',
        status: 'Aktif',
        angkatan: ''
    })

    useEffect(() => {
        fetchOptions()
        if (isEdit) {
            fetchSantri()
        }
    }, [id])

    const fetchOptions = async () => {
        try {
            const [kelasRes, halaqohRes] = await Promise.all([
                supabase.from('kelas').select('id, nama').order('tingkat').order('nama'),
                supabase.from('halaqoh').select('id, nama').order('nama')
            ])
            setKelasList(kelasRes.data || [])
            setHalaqohList(halaqohRes.data || [])
        } catch (err) {
            console.error('Error fetching options:', err)
            showToast.error('Gagal memuat options: ' + err.message)
        }
    }

    const fetchSantri = async () => {
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            // Fetch angkatan name separately if exists
            let angkatanNama = ''
            if (data.angkatan_id) {
                const { data: angkatan } = await supabase
                    .from('angkatan')
                    .select('nama')
                    .eq('id', data.angkatan_id)
                    .single()
                angkatanNama = angkatan?.nama || ''
            }

            setFormData({
                nis: data.nis || '',
                nama: data.nama || '',
                jenis_kelamin: data.jenis_kelamin || 'Laki-laki',
                tempat_lahir: data.tempat_lahir || '',
                tanggal_lahir: data.tanggal_lahir || '',
                alamat: data.alamat || '',
                no_telp: data.no_telp || '',
                nama_wali: data.nama_wali || '',
                no_telp_wali: data.no_telp_wali || '',
                kelas_id: data.kelas_id || '',
                halaqoh_id: data.halaqoh_id || '',
                status: data.status || 'Aktif',
                angkatan: angkatanNama
            })
        } catch (err) {
            showToast.error('Gagal memuat data santri: ' + err.message)
        } finally {
            setFetching(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Confirmation Modal
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setLoading(true)
        try {
            // Find or Create Angkatan by nama
            let angkatanId = null
            if (formData.angkatan) {
                const namaAngkatan = formData.angkatan.trim()

                // Try to find existing
                const { data: existing } = await supabase
                    .from('angkatan')
                    .select('id')
                    .eq('nama', namaAngkatan)
                    .single()

                if (existing) {
                    angkatanId = existing.id
                } else {
                    // Create new
                    const { data: created, error: createErr } = await supabase
                        .from('angkatan')
                        .insert({ nama: namaAngkatan })
                        .select('id')
                        .single()

                    if (createErr) throw createErr
                    angkatanId = created.id
                }
            }

            const payload = {
                nis: formData.nis,
                nama: formData.nama,
                jenis_kelamin: formData.jenis_kelamin,
                tempat_lahir: formData.tempat_lahir || null,
                tanggal_lahir: formData.tanggal_lahir || null,
                alamat: formData.alamat || null,
                no_telp: formData.no_telp || null,
                nama_wali: formData.nama_wali || null,
                no_telp_wali: formData.no_telp_wali || null,
                kelas_id: formData.kelas_id || null,
                halaqoh_id: formData.halaqoh_id || null,
                status: formData.status,
                angkatan_id: angkatanId
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('santri')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
                await logUpdate('santri', formData.nama, `Edit data santri: ${formData.nama} (${formData.nis})`)
                showToast.success('Data santri berhasil diupdate!')
            } else {
                const { error } = await supabase
                    .from('santri')
                    .insert([payload])
                if (error) throw error
                await logCreate('santri', formData.nama, `Tambah santri baru: ${formData.nama} (${formData.nis})`)
                showToast.success('Data santri berhasil disimpan!')
            }

            setSaveModal({ isOpen: false })
            setTimeout(() => navigate('/santri'), 1500)
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return <Spinner className="py-12" label="Memuat data santri..." />
    }

    const inputClass = "w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
    const labelClass = "block text-sm font-medium text-gray-700 mb-1"

    return (
        <div className="space-y-6">
            <PageHeader
                title={isViewMode ? 'Detail Santri' : isEdit ? 'Edit Santri' : 'Tambah Santri Baru'}
                description={isViewMode ? 'Informasi lengkap data santri' : isEdit ? 'Update data santri' : 'Isi form untuk menambah santri baru'}
                icon={User}
                actions={
                    <Button variant="secondary" onClick={() => navigate('/santri')}>
                        <ArrowLeft size={16} /> Kembali
                    </Button>
                }
            />

            <form onSubmit={handleFormSubmit}>
                <div className="space-y-6">
                    {/* Data Pribadi */}
                    <Card className="border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                            <User className="text-primary-600" size={20} />
                            <h3 className="font-semibold text-lg text-gray-900">Data Pribadi</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput
                                label="NIS *"
                                name="nis"
                                value={formData.nis}
                                onChange={handleChange}
                                required
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                            <FormInput
                                label="Nama Lengkap *"
                                name="nama"
                                value={formData.nama}
                                onChange={handleChange}
                                required
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                            <div>
                                <label className={labelClass}>Jenis Kelamin</label>
                                <select
                                    name="jenis_kelamin"
                                    className={inputClass}
                                    value={formData.jenis_kelamin}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>
                            <FormInput
                                label="Tempat Lahir"
                                name="tempat_lahir"
                                value={formData.tempat_lahir}
                                onChange={handleChange}
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                            <FormInput
                                label="Tanggal Lahir"
                                type="date"
                                name="tanggal_lahir"
                                value={formData.tanggal_lahir}
                                onChange={handleChange}
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                            <FormInput
                                label="No. Telepon"
                                name="no_telp"
                                value={formData.no_telp}
                                onChange={handleChange}
                                readOnly={isViewMode}
                                disabled={isViewMode}
                                icon={Phone}
                            />
                        </div>
                        <div className="mt-6">
                            <label className={labelClass}>Alamat</label>
                            <textarea
                                name="alamat"
                                className={inputClass}
                                rows={3}
                                value={formData.alamat}
                                onChange={handleChange}
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                        </div>
                    </Card>

                    {/* Data Wali */}
                    <Card className="border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                            <User className="text-primary-600" size={20} />
                            <h3 className="font-semibold text-lg text-gray-900">Data Wali</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput
                                label="Nama Wali"
                                name="nama_wali"
                                value={formData.nama_wali}
                                onChange={handleChange}
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                            <FormInput
                                label="No. Telepon Wali"
                                name="no_telp_wali"
                                value={formData.no_telp_wali}
                                onChange={handleChange}
                                readOnly={isViewMode}
                                disabled={isViewMode}
                                icon={Phone}
                            />
                        </div>
                    </Card>

                    {/* Penempatan */}
                    <Card className="border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                            <School className="text-primary-600" size={20} />
                            <h3 className="font-semibold text-lg text-gray-900">Penempatan & Akademik</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Kelas</label>
                                <select
                                    name="kelas_id"
                                    className={inputClass}
                                    value={formData.kelas_id}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="">Pilih Kelas</option>
                                    <option value="unknown">Tidak Ada Kelas</option>
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Halaqoh</label>
                                <select
                                    name="halaqoh_id"
                                    className={inputClass}
                                    value={formData.halaqoh_id}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="">Pilih Halaqoh</option>
                                    {halaqohList.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                                </select>
                            </div>
                            <FormInput
                                label="Angkatan"
                                type="number"
                                name="angkatan"
                                placeholder="Angkatan ke- (Contoh: 2024)"
                                value={formData.angkatan}
                                onChange={handleChange}
                                min="1"
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                            <div>
                                <label className={labelClass}>Status</label>
                                <select
                                    name="status"
                                    className={inputClass}
                                    value={formData.status}
                                    onChange={handleChange}
                                    disabled={isViewMode}
                                >
                                    <option value="Aktif">Aktif</option>
                                    <option value="Tidak Aktif">Tidak Aktif</option>
                                    <option value="Lulus">Lulus</option>
                                    <option value="Pindah">Pindah</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => navigate('/santri')}>
                            {isViewMode ? 'Kembali' : 'Batal'}
                        </Button>
                        {isViewMode ? (
                            canEdit && (
                                <Button type="button" onClick={() => navigate(`/santri/${id}/edit`)}>
                                    <Edit size={18} /> Edit Data
                                </Button>
                            )
                        ) : (
                            <Button type="submit" disabled={loading} isLoading={loading}>
                                <Save size={18} /> Simpan
                            </Button>
                        )}
                    </div>
                </div>
            </form>

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={isEdit ? "Konfirmasi Edit" : "Konfirmasi Simpan"}
                message={isEdit ? 'Apakah Anda yakin ingin menyimpan perubahan data santri ini?' : 'Apakah Anda yakin ingin menambahkan data santri baru ini?'}
                confirmLabel={isEdit ? "Simpan Perubahan" : "Simpan Data"}
                variant="success"
                isLoading={loading}
            />
        </div>
    )
}

export default SantriForm
