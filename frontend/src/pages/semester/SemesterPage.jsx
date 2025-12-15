import { useState, useEffect } from 'react'
import { Plus, Calendar, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Semester.css'

const SemesterPage = () => {
    const [semesterList, setSemesterList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({ nama: 'Ganjil', tahun_ajaran: '', tanggal_mulai: '', tanggal_selesai: '' })

    useEffect(() => {
        fetchSemester()
    }, [])

    const fetchSemester = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('semester')
                .select('*')
                .order('is_active', { ascending: false })
                .order('tahun_ajaran', { ascending: false })

            if (error) throw error
            setSemesterList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase.from('semester').insert([{ ...formData, is_active: false }])
            if (error) throw error
            fetchSemester()
            setShowModal(false)
            setFormData({ nama: 'Ganjil', tahun_ajaran: '', tanggal_mulai: '', tanggal_selesai: '' })
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const setActive = async (id) => {
        try {
            // Set all to inactive first
            await supabase.from('semester').update({ is_active: false }).neq('id', '')
            // Set selected to active
            const { error } = await supabase.from('semester').update({ is_active: true }).eq('id', id)
            if (error) throw error
            fetchSemester()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const formatDate = (date) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <div className="semester-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Manajemen Semester</h1>
                    <p className="page-subtitle">Kelola periode semester dan tahun ajaran</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Tambah Semester
                </button>
            </div>

            {loading ? (
                <div className="text-center py-4"><RefreshCw size={24} className="spin" /></div>
            ) : semesterList.length === 0 ? (
                <div className="text-center py-4 text-muted">Belum ada data semester</div>
            ) : (
                <div className="semester-grid">
                    {semesterList.map(sem => (
                        <div key={sem.id} className={`semester-card ${sem.is_active ? 'active' : ''}`}>
                            {sem.is_active && <div className="active-badge"><CheckCircle size={16} /> Aktif</div>}
                            <div className="semester-header">
                                <h3>Semester {sem.nama}</h3>
                                <span className="tahun-badge">{sem.tahun_ajaran}</span>
                            </div>
                            <div className="semester-dates">
                                <div className="date-item">
                                    <Calendar size={16} />
                                    <div>
                                        <span className="date-label">Mulai</span>
                                        <span className="date-value">{formatDate(sem.tanggal_mulai)}</span>
                                    </div>
                                </div>
                                <div className="date-item">
                                    <Calendar size={16} />
                                    <div>
                                        <span className="date-label">Selesai</span>
                                        <span className="date-value">{formatDate(sem.tanggal_selesai)}</span>
                                    </div>
                                </div>
                            </div>
                            {!sem.is_active && (
                                <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '16px' }} onClick={() => setActive(sem.id)}>
                                    Set sebagai Aktif
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Tambah Semester</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Semester</label>
                                    <select className="form-control" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })}>
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tahun Ajaran *</label>
                                    <input type="text" className="form-control" placeholder="2024/2025" value={formData.tahun_ajaran} onChange={e => setFormData({ ...formData, tahun_ajaran: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Mulai</label>
                                    <input type="date" className="form-control" value={formData.tanggal_mulai} onChange={e => setFormData({ ...formData, tanggal_mulai: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tanggal Selesai</label>
                                    <input type="date" className="form-control" value={formData.tanggal_selesai} onChange={e => setFormData({ ...formData, tanggal_selesai: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SemesterPage
