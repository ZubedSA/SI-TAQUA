import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, RefreshCw, Eye, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Kelas.css'

const KelasPage = () => {
    const [kelasList, setKelasList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showSantriModal, setShowSantriModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ nama: '', wali_kelas_id: '' })
    const [guruList, setGuruList] = useState([])
    const [saving, setSaving] = useState(false)
    const [selectedKelas, setSelectedKelas] = useState(null)
    const [santriList, setSantriList] = useState([])
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [santriCounts, setSantriCounts] = useState({})

    useEffect(() => {
        fetchKelas()
        fetchGuru()
    }, [])

    const fetchKelas = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('kelas')
                .select('*, wali_kelas:wali_kelas_id(nama)')
                .order('nama')

            if (error) throw error
            setKelasList(data || [])

            // Fetch santri count per kelas
            const counts = {}
            for (const kelas of data || []) {
                const { count } = await supabase.from('santri').select('*', { count: 'exact', head: true }).eq('kelas_id', kelas.id)
                counts[kelas.id] = count || 0
            }
            setSantriCounts(counts)
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchGuru = async () => {
        try {
            const { data } = await supabase.from('guru').select('id, nama').order('nama')
            setGuruList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchSantriByKelas = async (kelas) => {
        setSelectedKelas(kelas)
        setShowSantriModal(true)
        setLoadingSantri(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, jenis_kelamin, status')
                .eq('kelas_id', kelas.id)
                .order('nama')
            if (error) throw error
            setSantriList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoadingSantri(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                nama: formData.nama,
                wali_kelas_id: formData.wali_kelas_id || null
            }

            if (editData) {
                const { error } = await supabase.from('kelas').update(payload).eq('id', editData.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('kelas').insert([payload])
                if (error) throw error
            }

            fetchKelas()
            setShowModal(false)
            setEditData(null)
            setFormData({ nama: '', wali_kelas_id: '' })
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (kelas) => {
        setEditData(kelas)
        setFormData({
            nama: kelas.nama,
            wali_kelas_id: kelas.wali_kelas_id || ''
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus kelas ini?')) return
        try {
            const { error } = await supabase.from('kelas').delete().eq('id', id)
            if (error) throw error
            setKelasList(kelasList.filter(k => k.id !== id))
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    return (
        <div className="kelas-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Manajemen Kelas</h1>
                    <p className="page-subtitle">Kelola data kelas dan wali kelas</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditData(null); setFormData({ nama: '', wali_kelas_id: '' }); setShowModal(true) }}>
                    <Plus size={18} /> Tambah Kelas
                </button>
            </div>

            {loading ? (
                <div className="text-center py-4"><RefreshCw size={24} className="spin" /></div>
            ) : kelasList.length === 0 ? (
                <div className="text-center py-4 text-muted">Belum ada data kelas</div>
            ) : (
                <div className="kelas-grid">
                    {kelasList.map(kelas => (
                        <div key={kelas.id} className="kelas-card" onClick={() => fetchSantriByKelas(kelas)} style={{ cursor: 'pointer' }}>
                            <div className="kelas-header">
                                <h3 className="kelas-name">{kelas.nama}</h3>
                            </div>
                            <div className="kelas-body">
                                <div className="kelas-info">
                                    <Users size={16} />
                                    <span>{santriCounts[kelas.id] || 0} Santri</span>
                                </div>
                                <p className="wali-kelas">Wali: {kelas.wali_kelas?.nama || '-'}</p>
                            </div>
                            <div className="kelas-actions" onClick={e => e.stopPropagation()}>
                                <button className="btn-icon" onClick={() => handleEdit(kelas)}><Edit size={16} /></button>
                                <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(kelas.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Santri Modal */}
            {showSantriModal && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title"><Users size={20} /> Santri {selectedKelas?.nama}</h3>
                            <button className="modal-close" onClick={() => setShowSantriModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {loadingSantri ? (
                                <div className="text-center py-3"><RefreshCw size={20} className="spin" /> Memuat...</div>
                            ) : santriList.length === 0 ? (
                                <div className="text-center py-3 text-muted">Belum ada santri di kelas ini</div>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr><th>NIS</th><th>Nama</th><th>L/P</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {santriList.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.nis || '-'}</td>
                                                <td>{s.nama}</td>
                                                <td>{s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                                <td><span className={`badge ${s.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowSantriModal(false)}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editData ? 'Edit Kelas' : 'Tambah Kelas'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); setEditData(null) }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Kelas *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Contoh: 7A, 8B, 9C, 10 IPA 1"
                                        value={formData.nama}
                                        onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                        required
                                    />
                                    <small className="form-hint">Masukkan nama kelas beserta tingkatnya</small>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Wali Kelas</label>
                                    <select className="form-control" value={formData.wali_kelas_id} onChange={e => setFormData({ ...formData, wali_kelas_id: e.target.value })}>
                                        <option value="">Pilih Wali Kelas</option>
                                        {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                                    </select>
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

export default KelasPage

