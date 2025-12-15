import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Hafalan.css'

const HafalanForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [santriList, setSantriList] = useState([])
    const [guruList, setGuruList] = useState([])
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [formData, setFormData] = useState({
        santri_id: '',
        juz: 30,
        surah: '',
        ayat_mulai: 1,
        ayat_selesai: 1,
        jenis: 'Setoran',
        status: 'Lancar',
        tanggal: new Date().toISOString().split('T')[0],
        penguji_id: '',
        catatan: ''
    })

    useEffect(() => {
        fetchSantri()
        fetchGuru()
        if (isEdit) {
            fetchHafalan()
        }
    }, [id])

    const fetchSantri = async () => {
        try {
            const { data } = await supabase
                .from('santri')
                .select('id, nis, nama')
                .eq('status', 'Aktif')
                .order('nama')
            setSantriList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchGuru = async () => {
        try {
            const { data } = await supabase
                .from('guru')
                .select('id, nama')
                .order('nama')
            setGuruList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchHafalan = async () => {
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('hafalan')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            setFormData({
                santri_id: data.santri_id || '',
                juz: data.juz || 30,
                surah: data.surah || '',
                ayat_mulai: data.ayat_mulai || 1,
                ayat_selesai: data.ayat_selesai || 1,
                jenis: data.jenis || 'Setoran',
                status: data.status || 'Lancar',
                tanggal: data.tanggal || new Date().toISOString().split('T')[0],
                penguji_id: data.penguji_id || '',
                catatan: data.catatan || ''
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
                juz: parseInt(formData.juz),
                ayat_mulai: parseInt(formData.ayat_mulai),
                ayat_selesai: parseInt(formData.ayat_selesai),
                penguji_id: formData.penguji_id || null
            }

            if (isEdit) {
                const { error } = await supabase.from('hafalan').update(payload).eq('id', id)
                if (error) throw error
                setSuccess('Data hafalan berhasil diupdate!')
            } else {
                const { error } = await supabase.from('hafalan').insert([payload])
                if (error) throw error
                setSuccess('Data hafalan berhasil disimpan!')
            }

            setTimeout(() => navigate('/hafalan'), 1500)
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return <div className="text-center py-4"><RefreshCw size={24} className="spin" /> Loading...</div>
    }

    return (
        <div className="hafalan-form-page">
            <div className="page-header">
                <div>
                    <button className="btn btn-secondary btn-sm mb-2" onClick={() => navigate('/hafalan')}>
                        <ArrowLeft size={16} /> Kembali
                    </button>
                    <h1 className="page-title">{isEdit ? 'Edit Hafalan' : 'Input Setoran/Muroja\'ah'}</h1>
                    <p className="page-subtitle">{isEdit ? 'Update data hafalan' : 'Catat progress hafalan santri'}</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-section">
                    <h3 className="form-section-title">Data Hafalan</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Santri *</label>
                            <select name="santri_id" className="form-control" value={formData.santri_id} onChange={handleChange} required>
                                <option value="">Pilih Santri</option>
                                {santriList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Jenis *</label>
                            <select name="jenis" className="form-control" value={formData.jenis} onChange={handleChange}>
                                <option value="Setoran">Setoran (Hafalan Baru)</option>
                                <option value="Muroja'ah">Muroja'ah (Mengulang)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tanggal *</label>
                            <input type="date" name="tanggal" className="form-control" value={formData.tanggal} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Juz *</label>
                            <select name="juz" className="form-control" value={formData.juz} onChange={handleChange}>
                                {[...Array(30)].map((_, i) => <option key={i + 1} value={i + 1}>Juz {i + 1}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Surah *</label>
                            <input type="text" name="surah" className="form-control" placeholder="An-Naba" value={formData.surah} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ayat Mulai</label>
                            <input type="number" name="ayat_mulai" className="form-control" min="1" value={formData.ayat_mulai} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ayat Selesai</label>
                            <input type="number" name="ayat_selesai" className="form-control" min="1" value={formData.ayat_selesai} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status *</label>
                            <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                                <option value="Lancar">Lancar</option>
                                <option value="Mutqin">Mutqin</option>
                                <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Penguji</label>
                            <select name="penguji_id" className="form-control" value={formData.penguji_id} onChange={handleChange}>
                                <option value="">Pilih Penguji</option>
                                {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Catatan</label>
                        <textarea name="catatan" className="form-control" rows={2} value={formData.catatan} onChange={handleChange} placeholder="Catatan tambahan..." />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/hafalan')}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan</>}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default HafalanForm
