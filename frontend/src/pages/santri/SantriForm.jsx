import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Santri.css'

const SantriForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [kelasList, setKelasList] = useState([])
    const [halaqohList, setHalaqohList] = useState([])
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

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
        status: 'Aktif'
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
                status: data.status || 'Aktif'
            })
        } catch (err) {
            setError('Gagal memuat data: ' + err.message)
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
        setError('')
        setSuccess('')

        try {
            const payload = {
                ...formData,
                kelas_id: formData.kelas_id || null,
                halaqoh_id: formData.halaqoh_id || null,
                tanggal_lahir: formData.tanggal_lahir || null
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('santri')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
                setSuccess('Data santri berhasil diupdate!')
            } else {
                const { error } = await supabase
                    .from('santri')
                    .insert([payload])
                if (error) throw error
                setSuccess('Data santri berhasil disimpan!')
            }

            setTimeout(() => navigate('/santri'), 1500)
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return (
            <div className="text-center py-4">
                <RefreshCw size={24} className="spin" /> Loading...
            </div>
        )
    }

    return (
        <div className="santri-form-page">
            <div className="page-header">
                <div>
                    <button className="btn btn-secondary btn-sm mb-2" onClick={() => navigate('/santri')}>
                        <ArrowLeft size={16} /> Kembali
                    </button>
                    <h1 className="page-title">{isEdit ? 'Edit Santri' : 'Tambah Santri Baru'}</h1>
                    <p className="page-subtitle">{isEdit ? 'Update data santri' : 'Isi form untuk menambah santri baru'}</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                {/* Data Pribadi */}
                <div className="form-section">
                    <h3 className="form-section-title">Data Pribadi</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">NIS *</label>
                            <input type="text" name="nis" className="form-control" value={formData.nis} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nama Lengkap *</label>
                            <input type="text" name="nama" className="form-control" value={formData.nama} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Jenis Kelamin</label>
                            <select name="jenis_kelamin" className="form-control" value={formData.jenis_kelamin} onChange={handleChange}>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tempat Lahir</label>
                            <input type="text" name="tempat_lahir" className="form-control" value={formData.tempat_lahir} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tanggal Lahir</label>
                            <input type="date" name="tanggal_lahir" className="form-control" value={formData.tanggal_lahir} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">No. Telepon</label>
                            <input type="text" name="no_telp" className="form-control" value={formData.no_telp} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Alamat</label>
                        <textarea name="alamat" className="form-control" rows={2} value={formData.alamat} onChange={handleChange} />
                    </div>
                </div>

                {/* Data Wali */}
                <div className="form-section">
                    <h3 className="form-section-title">Data Wali</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Nama Wali</label>
                            <input type="text" name="nama_wali" className="form-control" value={formData.nama_wali} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">No. Telepon Wali</label>
                            <input type="text" name="no_telp_wali" className="form-control" value={formData.no_telp_wali} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* Penempatan */}
                <div className="form-section">
                    <h3 className="form-section-title">Penempatan</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Kelas</label>
                            <select name="kelas_id" className="form-control" value={formData.kelas_id} onChange={handleChange}>
                                <option value="">Pilih Kelas</option>
                                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Halaqoh</label>
                            <select name="halaqoh_id" className="form-control" value={formData.halaqoh_id} onChange={handleChange}>
                                <option value="">Pilih Halaqoh</option>
                                {halaqohList.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
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
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/santri')}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan</>}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default SantriForm
