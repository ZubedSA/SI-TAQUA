import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, User, Phone, School, Edit, AlertTriangle, Camera, Upload, Trash2, ShieldCheck, Sparkles, Image as ImageIcon } from 'lucide-react'
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
import Badge from '../../components/ui/Badge'
import KartuSantriModal from '../../components/santri/KartuSantriModal'

const SantriForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const location = useLocation()
    const { isAdmin, isAdminAkademik, userProfile, hasRole } = useAuth()
    const showToast = useToast()
    const photoInputRef = useRef(null)

    // Determine mode: view (read-only) vs edit
    const isViewMode = location.pathname.includes('/santri/') && !location.pathname.includes('/edit') && !location.pathname.includes('/create')
    const canEdit = isAdmin() || isAdminAkademik() || userProfile?.role === 'admin' || hasRole('admin')
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [kelasList, setKelasList] = useState([])
    const [halaqohList, setHalaqohList] = useState([])

    // Photo state
    const [photoFile, setPhotoFile] = useState(null)
    const [photoPreview, setPhotoPreview] = useState(null)
    const [showKartuModal, setShowKartuModal] = useState(false)

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
        angkatan: '',
        foto_url: ''
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
                angkatan: angkatanNama,
                foto_url: data.foto_url || ''
            })

            if (data.foto_url) {
                setPhotoPreview(data.foto_url)
            }
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

    // Handle Photo Selection
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            showToast.error('File harus berupa gambar (JPG, PNG, atau WEBP)')
            return
        }

        // Limit to 3MB
        if (file.size > 3 * 1024 * 1024) {
            showToast.error('Ukuran foto maksimal 3MB')
            return
        }

        setPhotoFile(file)
        const reader = new FileReader()
        reader.onload = (evt) => {
            setPhotoPreview(evt.target.result)
        }
        reader.readAsDataURL(file)
    }

    const handleRemovePhoto = () => {
        setPhotoFile(null)
        setPhotoPreview(null)
        setFormData(prev => ({ ...prev, foto_url: '' }))
        if (photoInputRef.current) {
            photoInputRef.current.value = ''
        }
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

            let finalFotoUrl = formData.foto_url || null

            // Upload new photo if file selected
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop() || 'jpg'
                const fileName = `santri_${formData.nis || Date.now()}_${Date.now()}.${fileExt}`
                const filePath = `santri/${fileName}`

                // Delete old photo if it was in Supabase storage uploads
                if (formData.foto_url && formData.foto_url.includes('/uploads/')) {
                    const oldPath = formData.foto_url.split('/uploads/')[1]
                    if (oldPath) {
                        try {
                            await supabase.storage.from('uploads').remove([oldPath])
                        } catch (cleanErr) {
                            console.warn('Gagal menghapus foto lama:', cleanErr.message)
                        }
                    }
                }

                // Upload to Supabase Storage bucket 'uploads'
                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(filePath, photoFile, { upsert: true })

                if (uploadError) {
                    throw new Error('Gagal upload foto santri: ' + uploadError.message)
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(filePath)

                finalFotoUrl = urlData.publicUrl
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
                angkatan_id: angkatanId,
                foto_url: finalFotoUrl
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
            setTimeout(() => navigate('/santri'), 1200)
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

    // Construct enriched santri object for Kartu Santri modal
    const santriForCard = {
        id: id || 'preview',
        nis: formData.nis,
        nama: formData.nama,
        jenis_kelamin: formData.jenis_kelamin,
        tempat_lahir: formData.tempat_lahir,
        tanggal_lahir: formData.tanggal_lahir,
        alamat: formData.alamat,
        status: formData.status,
        foto_url: photoPreview || formData.foto_url,
        kelas: kelasList.find(k => k.id === formData.kelas_id)?.nama || '-',
        halaqoh: halaqohList.find(h => h.id === formData.halaqoh_id)?.nama || '-',
        angkatan: formData.angkatan || '-'
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={isViewMode ? 'Detail Santri' : isEdit ? 'Edit Santri' : 'Tambah Santri Baru'}
                description={isViewMode ? 'Informasi lengkap data santri' : isEdit ? 'Update data santri' : 'Isi form untuk menambah santri baru'}
                icon={User}
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="secondary" onClick={() => navigate('/santri')}>
                            <ArrowLeft size={16} /> Kembali
                        </Button>
                        {isViewMode && (
                            <Button 
                                onClick={() => setShowKartuModal(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 text-white font-bold"
                            >
                                <ShieldCheck size={16} /> Cetak / Lihat Kartu Santri
                            </Button>
                        )}
                    </div>
                }
            />

            <form onSubmit={handleFormSubmit}>
                <div className="space-y-6">

                    {/* Foto & Identitas Header Showcase (Khusus View Mode) */}
                    {isViewMode && (
                        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-6 border border-emerald-600/30">
                            {/* Decorative blur */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

                            {/* Photo Showcase */}
                            <div className="relative shrink-0 group">
                                <div className="w-28 h-36 rounded-2xl overflow-hidden bg-emerald-950 border-2 border-amber-400/80 shadow-2xl flex items-center justify-center relative">
                                    {photoPreview ? (
                                        <img 
                                            src={photoPreview} 
                                            alt={formData.nama} 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-900/80 text-emerald-300">
                                            <User size={48} className="text-emerald-300/60 mb-1" />
                                            <span className="text-[10px] font-bold tracking-wider">BELUM ADA FOTO</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Santri Info Spotlight */}
                            <div className="flex-1 text-center md:text-left space-y-2">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                    <Badge variant={formData.status === 'Aktif' ? 'success' : 'default'} size="md" className="font-black">
                                        {formData.status}
                                    </Badge>
                                    <span className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-mono font-bold text-amber-300 border border-white/15">
                                        NIS: {formData.nis}
                                    </span>
                                </div>

                                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                                    {formData.nama}
                                </h2>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-emerald-100/90 pt-1">
                                    <span>Kelas: <strong>{kelasList.find(k => k.id === formData.kelas_id)?.nama || '-'}</strong></span>
                                    <span>•</span>
                                    <span>Halaqoh: <strong>{halaqohList.find(h => h.id === formData.halaqoh_id)?.nama || '-'}</strong></span>
                                    <span>•</span>
                                    <span>Angkatan: <strong>{formData.angkatan || '-'}</strong></span>
                                </div>

                                <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-3">
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        onClick={() => setShowKartuModal(true)}
                                        className="bg-amber-400 hover:bg-amber-500 text-emerald-950 font-black rounded-xl shadow-md border-0"
                                    >
                                        <Sparkles size={15} /> Buka Kartu Santri (KTS)
                                    </Button>
                                    {canEdit && (
                                        <Button 
                                            type="button"
                                            size="sm" 
                                            variant="secondary"
                                            onClick={() => navigate(`/santri/${id}/edit`)}
                                            className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl"
                                        >
                                            <Edit size={15} /> Edit Data & Foto
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Pribadi & Foto Santri */}
                    <Card className="border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                            <User className="text-primary-600" size={20} />
                            <h3 className="font-semibold text-lg text-gray-900">Data Pribadi</h3>
                        </div>

                        {/* Foto Upload Section (Edit / Create Mode) */}
                        {!isViewMode && (
                            <div className="mb-6 p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 flex flex-col sm:flex-row items-center gap-5">
                                {/* Photo Preview Frame */}
                                <div className="relative shrink-0 group">
                                    <div className="w-24 h-32 rounded-xl overflow-hidden bg-gray-100 border-2 border-primary-500/40 shadow-md flex items-center justify-center relative">
                                        {photoPreview ? (
                                            <img 
                                                src={photoPreview} 
                                                alt="Preview Foto Santri" 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-gray-400 text-center p-2">
                                                <Camera size={28} className="mb-1 text-gray-300" />
                                                <span className="text-[10px] font-bold">Foto Santri</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Upload Controls */}
                                <div className="flex-1 space-y-2 text-center sm:text-left">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-1.5">
                                        <ImageIcon size={16} className="text-primary-600" /> Foto Resmi Santri
                                    </h4>
                                    <p className="text-xs text-gray-500 max-w-md">
                                        Foto ini akan tercetak langsung pada <strong>Kartu Tanda Santri (KTS)</strong> dan profil santri. Format JPG, PNG, atau WEBP (Maksimal 3MB).
                                    </p>

                                    <input 
                                        type="file"
                                        ref={photoInputRef}
                                        onChange={handlePhotoSelect}
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                    />

                                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => photoInputRef.current?.click()}
                                            className="rounded-xl font-bold"
                                        >
                                            <Upload size={14} /> {photoPreview ? 'Ganti Foto' : 'Unggah Foto'}
                                        </Button>

                                        {photoPreview && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="danger"
                                                onClick={handleRemovePhoto}
                                                className="rounded-xl font-bold"
                                            >
                                                <Trash2 size={14} /> Hapus Foto
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                    <option value="Boyong">Boyong (Keluar/Berhenti)</option>
                                    <option value="Lulus">Lulus (Alumni)</option>
                                    <option value="Pindah">Pindah Pesantren</option>
                                    <option value="Tidak Aktif">Tidak Aktif / Cuti</option>
                                </select>
                            </div>
                            {formData.status && formData.status !== 'Aktif' && (
                                <div className="col-span-1 md:col-span-2 mt-1 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-3 text-amber-900 text-xs shadow-sm transition-all">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block text-amber-800 mb-0.5">Peringatan Status Non-Aktif ({formData.status})</span>
                                        Santri dengan status ini otomatis <b>dikecualikan</b> dari absensi harian, pembuatan tagihan bulanan baru, serta daftar input hafalan dan pelanggaran. Riwayat lama tetap tersimpan dengan aman.
                                    </div>
                                </div>
                            )}
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

            {/* Kartu Santri Modal */}
            <KartuSantriModal
                isOpen={showKartuModal}
                onClose={() => setShowKartuModal(false)}
                santri={santriForCard}
            />
        </div>
    )
}

export default SantriForm
