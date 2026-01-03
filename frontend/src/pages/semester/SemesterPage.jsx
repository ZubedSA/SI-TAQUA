import { useState, useEffect } from 'react'
import { Plus, Calendar, CheckCircle, RefreshCw, Edit, Trash2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import './Semester.css'

const SemesterPage = () => {
    const showToast = useToast()
    const [semesterList, setSemesterList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [currentId, setCurrentId] = useState(null)
    const [formData, setFormData] = useState({ nama: 'Ganjil', tahun_ajaran: '', tanggal_mulai: '', tanggal_selesai: '' })
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedDeleteId, setSelectedDeleteId] = useState(null)

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

    const resetForm = () => {
        setFormData({ nama: 'Ganjil', tahun_ajaran: '', tanggal_mulai: '', tanggal_selesai: '' })
        setEditMode(false)
        setCurrentId(null)
    }

    const openAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (sem) => {
        setFormData({
            nama: sem.nama,
            tahun_ajaran: sem.tahun_ajaran,
            tanggal_mulai: sem.tanggal_mulai,
            tanggal_selesai: sem.tanggal_selesai
        })
        setCurrentId(sem.id)
        setEditMode(true)
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editMode) {
                const { error } = await supabase
                    .from('semester')
                    .update(formData)
                    .eq('id', currentId)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('semester')
                    .insert([{ ...formData, is_active: false }])
                if (error) throw error
            }
            fetchSemester()
            setShowModal(false)
            resetForm()
            showToast.success('Data semester berhasil disimpan')
        } catch (err) {
            showToast.error('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const setActive = async (id) => {
        try {
            // Set all to inactive first by updating where id is not 0 (effectively all)
            // Note: Postgres usually requires a WHERE clause for updates to avoid accidental full table updates, 
            // but Supabase client adds one if 'eq' is used. Here we want to update ALL others.
            // Using a hack: .neq('id', '00000000-0000-0000-0000-000000000000') or similar if UUID.
            // But cleaner is to update all. 
            // supabase-js: .update({is_active: false}).neq('id', 0) might fail if id is UUID.
            // Better to iterate or use a stored procedure, but for small list, client side loop or wide update is ok.
            // Let's try updating all where is_active is true.
            await supabase.from('semester').update({ is_active: false }).eq('is_active', true)

            // Set selected to active
            const { error } = await supabase.from('semester').update({ is_active: true }).eq('id', id)
            if (error) throw error
            fetchSemester()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const setInactive = async (id) => {
        if (!confirm('Yakin ingin menonaktifkan semester ini? Tidak akan ada semester yang aktif setelah ini.')) return
        try {
            const { error } = await supabase.from('semester').update({ is_active: false }).eq('id', id)
            if (error) throw error
            fetchSemester()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const confirmDelete = (id) => {
        setSelectedDeleteId(id)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!selectedDeleteId) return
        try {
            const { error } = await supabase.from('semester').delete().eq('id', selectedDeleteId)
            if (error) throw error
            fetchSemester()
            setShowDeleteModal(false)
            setSelectedDeleteId(null)
            showToast.success('Data semester berhasil dihapus')
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const initData = async () => {
        if (!confirm('Ini akan menambahkan data semester default. Lanjutkan?')) return
        setLoading(true)
        try {
            const currentYear = new Date().getFullYear()
            const { error } = await supabase.from('semester').insert([
                { nama: 'Ganjil', tahun_ajaran: `${currentYear}/${currentYear + 1}`, tanggal_mulai: `${currentYear}-07-15`, tanggal_selesai: `${currentYear}-12-20`, is_active: true },
                { nama: 'Genap', tahun_ajaran: `${currentYear}/${currentYear + 1}`, tanggal_mulai: `${currentYear + 1}-01-05`, tanggal_selesai: `${currentYear + 1}-06-20`, is_active: false }
            ])
            if (error) throw error
            if (error) throw error
            fetchSemester()
            showToast.success('Data default berhasil digenerate')
        } catch (err) {
            showToast.error('Error: ' + err.message)
        } finally {
            setLoading(false)
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
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={18} /> Tambah Semester
                </button>
            </div>

            {loading ? (
                <div className="text-center py-4"><RefreshCw size={24} className="spin" /></div>
            ) : semesterList.length === 0 ? (
                <div className="empty-state text-center py-5">
                    <p className="text-muted mb-3">Belum ada data semester</p>
                    <button className="btn btn-secondary btn-sm" onClick={initData}>
                        Generate Data Default
                    </button>
                </div>
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

                            <div className="semester-actions">
                                {sem.is_active ? (
                                    <button className="btn btn-warning btn-sm btn-block" onClick={() => setInactive(sem.id)}>
                                        Nonaktifkan
                                    </button>
                                ) : (
                                    <button className="btn btn-success btn-sm btn-block" onClick={() => setActive(sem.id)}>
                                        Set Aktif
                                    </button>
                                )}
                                <div className="action-row mt-2">
                                    <button className="btn btn-secondary btn-sm flex-1 mr-1" onClick={() => openEditModal(sem)}>
                                        <Edit size={14} /> Edit
                                    </button>
                                    <button className="btn btn-danger btn-sm flex-1 ml-1" onClick={() => confirmDelete(sem.id)}>
                                        <Trash2 size={14} /> Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editMode ? 'Edit Semester' : 'Tambah Semester'}</h3>
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

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Hapus Semester"
                message="Perhatian: Menghapus semester dapat mempengaruhi data nilai dan riwayat lainnya yang terkait. Apakah Anda yakin ingin menghapus data semester ini?"
            />
        </div>
    )
}

export default SemesterPage
