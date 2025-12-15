import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Guru.css'

const GuruForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [formData, setFormData] = useState({
        nip: '',
        nama: '',
        jenis_kelamin: 'Laki-laki',
        tempat_lahir: '',
        tanggal_lahir: '',
        alamat: '',
        no_telp: '',
        email: '',
        jabatan: 'Pengajar',
        pendidikan_terakhir: '',
        status: 'Aktif'
    })

    useEffect(() => {
        if (isEdit) {
            fetchGuru()
        }
    }, [id])

    const fetchGuru = async () => {
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('guru')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            setFormData({
                nip: data.nip || '',
                nama: data.nama || '',
                jenis_kelamin: data.jenis_kelamin || 'Laki-laki',
                tempat_lahir: data.tempat_lahir || '',
                tanggal_lahir: data.tanggal_lahir || '',
                alamat: data.alamat || '',
                no_telp: data.no_telp || '',
                email: data.email || '',
                jabatan: data.jabatan || 'Pengajar',
                pendidikan_terakhir: data.pendidikan_terakhir || '',
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
                tanggal_lahir: formData.tanggal_lahir || null
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('guru')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
                setSuccess('Data guru berhasil diupdate!')
            } else {
                const { error } = await supabase
                    .from('guru')
                    .insert([payload])
                if (error) throw error
                setSuccess('Data guru berhasil disimpan!')
            }

            setTimeout(() => navigate('/guru'), 1500)
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
        <div className="guru-form-page">
            <div className="page-header">
                <div>
                    <button className="btn btn-secondary btn-sm mb-2" onClick={() => navigate('/guru')}>
                        <ArrowLeft size={16} /> Kembali
                    </button>
                    <h1 className="page-title">{isEdit ? 'Edit Guru' : 'Tambah Guru Baru'}</h1>
                    <p className="page-subtitle">{isEdit ? 'Update data guru' : 'Isi form untuk menambah guru baru'}</p>
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
                            <label className="form-label">NIP</label>
                            <input type="text" name="nip" className="form-control" value={formData.nip} onChange={handleChange} placeholder="Opsional" />
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
                            <label className="form-label">Email</label>
                            <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Alamat</label>
                        <textarea name="alamat" className="form-control" rows={2} value={formData.alamat} onChange={handleChange} />
                    </div>
                </div>

                {/* Data Kepegawaian */}
                <div className="form-section">
                    <h3 className="form-section-title">Data Kepegawaian</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">No. Telepon</label>
                            <input type="text" name="no_telp" className="form-control" value={formData.no_telp} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Jabatan</label>
                            <select name="jabatan" className="form-control" value={formData.jabatan} onChange={handleChange}>
                                <option value="Pengajar">Pengajar</option>
                                <option value="Wali Kelas">Wali Kelas</option>
                                <option value="Musyrif">Musyrif</option>
                                <option value="Kepala Sekolah">Kepala Sekolah</option>
                                <option value="Staff">Staff</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pendidikan Terakhir</label>
                            <select name="pendidikan_terakhir" className="form-control" value={formData.pendidikan_terakhir} onChange={handleChange}>
                                <option value="">Pilih</option>
                                <option value="SMA/MA">SMA/MA</option>
                                <option value="D3">D3</option>
                                <option value="S1">S1</option>
                                <option value="S2">S2</option>
                                <option value="S3">S3</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                                <option value="Aktif">Aktif</option>
                                <option value="Tidak Aktif">Tidak Aktif</option>
                                <option value="Pensiun">Pensiun</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/guru')}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan</>}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default GuruForm
