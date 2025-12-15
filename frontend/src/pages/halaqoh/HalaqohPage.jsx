import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import './Halaqoh.css'

const HalaqohPage = () => {
    const [halaqohList, setHalaqohList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showSantriModal, setShowSantriModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ nama: '', musyrif_id: '', waktu: '', keterangan: '' })
    const [guruList, setGuruList] = useState([])
    const [saving, setSaving] = useState(false)
    const [selectedHalaqoh, setSelectedHalaqoh] = useState(null)
    const [santriList, setSantriList] = useState([])
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [santriCounts, setSantriCounts] = useState({})

    useEffect(() => {
        fetchHalaqoh()
        fetchGuru()
    }, [])

    const fetchHalaqoh = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('halaqoh')
                .select('*, musyrif:musyrif_id(nama)')
                .order('nama')

            if (error) throw error
            setHalaqohList(data || [])

            // Fetch santri count per halaqoh
            const counts = {}
            for (const h of data || []) {
                const { count } = await supabase.from('santri').select('*', { count: 'exact', head: true }).eq('halaqoh_id', h.id)
                counts[h.id] = count || 0
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

    const fetchSantriByHalaqoh = async (halaqoh) => {
        setSelectedHalaqoh(halaqoh)
        setShowSantriModal(true)
        setLoadingSantri(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, jenis_kelamin, status')
                .eq('halaqoh_id', halaqoh.id)
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
                waktu: formData.waktu,
                keterangan: formData.keterangan,
                musyrif_id: formData.musyrif_id || null
            }

            if (editData) {
                const { error } = await supabase.from('halaqoh').update(payload).eq('id', editData.id)
                if (error) throw error
                await logUpdate('halaqoh', formData.nama, `Mengubah data halaqoh: ${formData.nama}`)
            } else {
                const { error } = await supabase.from('halaqoh').insert([payload])
                if (error) throw error
                await logCreate('halaqoh', formData.nama, `Menambah halaqoh baru: ${formData.nama}`)
            }

            fetchHalaqoh()
            setShowModal(false)
            setEditData(null)
            setFormData({ nama: '', musyrif_id: '', waktu: '', keterangan: '' })
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (halaqoh) => {
        setEditData(halaqoh)
        setFormData({
            nama: halaqoh.nama,
            musyrif_id: halaqoh.musyrif_id || '',
            waktu: halaqoh.waktu || '',
            keterangan: halaqoh.keterangan || ''
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus halaqoh ini?')) return
        const halaqoh = halaqohList.find(h => h.id === id)
        try {
            const { error } = await supabase.from('halaqoh').delete().eq('id', id)
            if (error) throw error
            await logDelete('halaqoh', halaqoh?.nama, `Menghapus halaqoh: ${halaqoh?.nama}`)
            setHalaqohList(halaqohList.filter(h => h.id !== id))
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    return (
        <div className="halaqoh-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Manajemen Halaqoh</h1>
                    <p className="page-subtitle">Kelola kelompok tahfizh dan musyrif</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditData(null); setFormData({ nama: '', musyrif_id: '', waktu: '', keterangan: '' }); setShowModal(true) }}>
                    <Plus size={18} /> Tambah Halaqoh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-4"><RefreshCw size={24} className="spin" /></div>
            ) : halaqohList.length === 0 ? (
                <div className="text-center py-4 text-muted">Belum ada data halaqoh</div>
            ) : (
                <div className="halaqoh-grid">
                    {halaqohList.map(halaqoh => (
                        <div key={halaqoh.id} className="halaqoh-card" onClick={() => fetchSantriByHalaqoh(halaqoh)} style={{ cursor: 'pointer' }}>
                            <div className="halaqoh-icon">📖</div>
                            <div className="halaqoh-content">
                                <h3 className="halaqoh-name">{halaqoh.nama}</h3>
                                <p className="halaqoh-musyrif">Musyrif: {halaqoh.musyrif?.nama || '-'}</p>
                                <div className="halaqoh-meta">
                                    <span><Clock size={14} /> {halaqoh.waktu || '-'}</span>
                                    <span><Users size={14} /> {santriCounts[halaqoh.id] || 0} Santri</span>
                                </div>
                            </div>
                            <div className="halaqoh-actions" onClick={e => e.stopPropagation()}>
                                <button className="btn-icon" onClick={() => handleEdit(halaqoh)}><Edit size={16} /></button>
                                <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(halaqoh.id)}><Trash2 size={16} /></button>
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
                            <h3 className="modal-title"><Users size={20} /> Santri Halaqoh {selectedHalaqoh?.nama}</h3>
                            <button className="modal-close" onClick={() => setShowSantriModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {loadingSantri ? (
                                <div className="text-center py-3"><RefreshCw size={20} className="spin" /> Memuat...</div>
                            ) : santriList.length === 0 ? (
                                <div className="text-center py-3 text-muted">Belum ada santri di halaqoh ini</div>
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
                            <h3 className="modal-title">{editData ? 'Edit Halaqoh' : 'Tambah Halaqoh'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); setEditData(null) }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nama Halaqoh *</label>
                                    <input type="text" className="form-control" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Musyrif</label>
                                    <select className="form-control" value={formData.musyrif_id} onChange={e => setFormData({ ...formData, musyrif_id: e.target.value })}>
                                        <option value="">Pilih Musyrif</option>
                                        {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Waktu</label>
                                    <select className="form-control" value={formData.waktu} onChange={e => setFormData({ ...formData, waktu: e.target.value })}>
                                        <option value="">Pilih Waktu</option>
                                        <option value="Ba'da Subuh">Ba'da Subuh</option>
                                        <option value="Ba'da Dzuhur">Ba'da Dzuhur</option>
                                        <option value="Ba'da Ashar">Ba'da Ashar</option>
                                        <option value="Ba'da Maghrib">Ba'da Maghrib</option>
                                        <option value="Ba'da Isya">Ba'da Isya</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Keterangan</label>
                                    <textarea className="form-control" rows={2} value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })} />
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

export default HalaqohPage
