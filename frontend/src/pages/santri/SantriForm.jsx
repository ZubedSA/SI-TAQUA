import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, Upload, FileSpreadsheet, X, MoreVertical, ArrowLeft, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import Spinner from '../../components/ui/Spinner'
import './Santri.css'

const SantriForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const location = useLocation()
    const { isAdmin, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Determine mode: view (read-only) vs edit
    // If URL is /santri/:id (without /edit), it's view mode
    // If URL is /santri/:id/edit, it's edit mode
    // If URL is /santri/create, it's create mode
    // Check if view mode (based on URL)
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
        angkatan: '' // Add angkatan field
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

    const handleSubmit = async (e) => {
        e.preventDefault()
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

    return (
        <div className="santri-form-page">
            <div className="page-header">
                <div>
                    <button className="btn btn-secondary btn-sm mb-2" onClick={() => navigate('/santri')}>
                        <ArrowLeft size={16} /> Kembali
                    </button>
                    <h1 className="page-title">{isViewMode ? 'Detail Santri' : isEdit ? 'Edit Santri' : 'Tambah Santri Baru'}</h1>
                    <p className="page-subtitle">{isViewMode ? 'Informasi lengkap data santri' : isEdit ? 'Update data santri' : 'Isi form untuk menambah santri baru'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="form-card">
                {/* Data Pribadi */}
                <div className="form-section">
                    <h3 className="form-section-title">Data Pribadi</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">NIS *</label>
                            <input type="text" name="nis" className="form-control" value={formData.nis} onChange={handleChange} required readOnly={isViewMode} disabled={isViewMode} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nama Lengkap *</label>
                            <input type="text" name="nama" className="form-control" value={formData.nama} onChange={handleChange} required readOnly={isViewMode} disabled={isViewMode} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Jenis Kelamin</label>
                            <select name="jenis_kelamin" className="form-control" value={formData.jenis_kelamin} onChange={handleChange} disabled={isViewMode}>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tempat Lahir</label>
                            <input type="text" name="tempat_lahir" className="form-control" value={formData.tempat_lahir} onChange={handleChange} readOnly={isViewMode} disabled={isViewMode} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tanggal Lahir</label>
                            <input type="date" name="tanggal_lahir" className="form-control" value={formData.tanggal_lahir} onChange={handleChange} readOnly={isViewMode} disabled={isViewMode} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">No. Telepon</label>
                            <input type="text" name="no_telp" className="form-control" value={formData.no_telp} onChange={handleChange} readOnly={isViewMode} disabled={isViewMode} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Alamat</label>
                        <textarea name="alamat" className="form-control" rows={2} value={formData.alamat} onChange={handleChange} readOnly={isViewMode} disabled={isViewMode} />
                    </div>
                </div>

                {/* Data Wali */}
                <div className="form-section">
                    <h3 className="form-section-title">Data Wali</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Nama Wali</label>
                            <input type="text" name="nama_wali" className="form-control" value={formData.nama_wali} onChange={handleChange} readOnly={isViewMode} disabled={isViewMode} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">No. Telepon Wali</label>
                            <input type="text" name="no_telp_wali" className="form-control" value={formData.no_telp_wali} onChange={handleChange} readOnly={isViewMode} disabled={isViewMode} />
                        </div>
                    </div>
                </div>

                {/* Penempatan */}
                <div className="form-section">
                    <h3 className="form-section-title">Penempatan</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Kelas</label>
                            <select name="kelas_id" className="form-control" value={formData.kelas_id} onChange={handleChange} disabled={isViewMode}>
                                <option value="">Pilih Kelas</option>
                                <option value="unknown">Tidak Ada Kelas</option>
                                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Halaqoh</label>
                            <select name="halaqoh_id" className="form-control" value={formData.halaqoh_id} onChange={handleChange} disabled={isViewMode}>
                                <option value="">Pilih Halaqoh</option>
                                {halaqohList.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Angkatan</label>
                            <input
                                type="number"
                                name="angkatan"
                                placeholder="Angkatan ke- (1, 2, 3...)"
                                className="form-control"
                                value={formData.angkatan}
                                onChange={handleChange}
                                min="1"
                                readOnly={isViewMode}
                                disabled={isViewMode}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select name="status" className="form-control" value={formData.status} onChange={handleChange} disabled={isViewMode}>
                                <option value="Aktif">Aktif</option>
                                <option value="Tidak Aktif">Tidak Aktif</option>
                                <option value="Lulus">Lulus</option>
                                <option value="Pindah">Pindah</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/santri')}>
                        {isViewMode ? 'Kembali' : 'Batal'}
                    </button>
                    {isViewMode ? (
                        canEdit && (
                            <button type="button" className="btn btn-primary" onClick={() => navigate(`/santri/${id}/edit`)}>
                                Edit Data
                            </button>
                        )
                    ) : (
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan</>}
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}

export default SantriForm
