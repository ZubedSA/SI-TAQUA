import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, RefreshCw, Eye, X, UserPlus, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import './Kelas.css'

const KelasPage = () => {
    const [kelasList, setKelasList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showSantriModal, setShowSantriModal] = useState(false)
    const [showAddSantriModal, setShowAddSantriModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ nama: '', wali_kelas_id: '' })
    const [guruList, setGuruList] = useState([])
    const [saving, setSaving] = useState(false)
    const [selectedKelas, setSelectedKelas] = useState(null)
    const [santriList, setSantriList] = useState([])
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [santriCounts, setSantriCounts] = useState({})
    const [availableSantri, setAvailableSantri] = useState([])
    const [selectedSantriIds, setSelectedSantriIds] = useState([])
    const [savingSantri, setSavingSantri] = useState(false)
    const [searchSantri, setSearchSantri] = useState('')

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

    // Fetch santri yang belum punya kelas atau semua santri
    const fetchAvailableSantri = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, jenis_kelamin, kelas_id')
                .eq('status', 'Aktif')
                .order('nama')
            if (error) throw error
            // Filter santri yang belum punya kelas atau semua (bisa dipindah)
            setAvailableSantri(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    // Buka modal tambah santri
    const openAddSantriModal = async (kelas) => {
        setSelectedKelas(kelas)
        setSelectedSantriIds([])
        setSearchSantri('')
        setShowAddSantriModal(true)
        await fetchAvailableSantri()
    }

    // Toggle pilih santri
    const toggleSantriSelection = (santriId) => {
        setSelectedSantriIds(prev =>
            prev.includes(santriId)
                ? prev.filter(id => id !== santriId)
                : [...prev, santriId]
        )
    }

    // Simpan santri ke kelas
    const handleAddSantriToKelas = async () => {
        if (selectedSantriIds.length === 0) return
        setSavingSantri(true)
        try {
            const { error } = await supabase
                .from('santri')
                .update({ kelas_id: selectedKelas.id })
                .in('id', selectedSantriIds)

            if (error) throw error

            // Refresh data
            fetchKelas()
            fetchSantriByKelas(selectedKelas)
            setShowAddSantriModal(false)
            setSelectedSantriIds([])
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSavingSantri(false)
        }
    }

    // Hapus santri dari kelas
    const handleRemoveSantriFromKelas = async (santriId) => {
        if (!confirm('Hapus santri ini dari kelas?')) return
        try {
            const { error } = await supabase
                .from('santri')
                .update({ kelas_id: null })
                .eq('id', santriId)

            if (error) throw error
            fetchKelas()
            fetchSantriByKelas(selectedKelas)
        } catch (err) {
            alert('Error: ' + err.message)
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
                await logUpdate('kelas', formData.nama, `Edit kelas: ${formData.nama}`)
            } else {
                const { error } = await supabase.from('kelas').insert([payload])
                if (error) throw error
                await logCreate('kelas', formData.nama, `Tambah kelas baru: ${formData.nama}`)
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
        const kelas = kelasList.find(k => k.id === id)
        if (!confirm('Yakin ingin menghapus kelas ini?')) return
        try {
            const { error } = await supabase.from('kelas').delete().eq('id', id)
            if (error) throw error
            await logDelete('kelas', kelas?.nama || 'Kelas', `Hapus kelas: ${kelas?.nama}`)
            setKelasList(kelasList.filter(k => k.id !== id))
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    // Filter santri berdasarkan search
    const filteredAvailableSantri = availableSantri.filter(s =>
        s.nama.toLowerCase().includes(searchSantri.toLowerCase()) ||
        (s.nis && s.nis.toLowerCase().includes(searchSantri.toLowerCase()))
    )
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
                                <button className="btn-icon btn-icon-success" title="Tambah Santri" onClick={() => openAddSantriModal(kelas)}><UserPlus size={16} /></button>
                                <button className="btn-icon" onClick={() => handleEdit(kelas)}><Edit size={16} /></button>
                                <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(kelas.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Santri Modal - Lihat Daftar Santri */}
            {showSantriModal && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title"><Users size={20} /> Santri Kelas {selectedKelas?.nama}</h3>
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
                                        <tr><th>NIS</th><th>Nama</th><th>L/P</th><th>Status</th><th>Aksi</th></tr>
                                    </thead>
                                    <tbody>
                                        {santriList.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.nis || '-'}</td>
                                                <td>{s.nama}</td>
                                                <td>{s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                                <td><span className={`badge ${s.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td>
                                                <td>
                                                    <button className="btn-icon btn-icon-danger btn-sm" title="Hapus dari kelas" onClick={() => handleRemoveSantriFromKelas(s.id)}>
                                                        <X size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => openAddSantriModal(selectedKelas)}><UserPlus size={16} /> Tambah Santri</button>
                            <button className="btn btn-secondary" onClick={() => setShowSantriModal(false)}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Santri Modal - Pilih Santri untuk Ditambahkan */}
            {showAddSantriModal && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title"><UserPlus size={20} /> Tambah Santri ke {selectedKelas?.nama}</h3>
                            <button className="modal-close" onClick={() => setShowAddSantriModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group mb-3">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Cari nama atau NIS santri..."
                                    value={searchSantri}
                                    onChange={e => setSearchSantri(e.target.value)}
                                />
                            </div>

                            {selectedSantriIds.length > 0 && (
                                <div className="alert alert-info mb-3">
                                    <Check size={16} /> {selectedSantriIds.length} santri dipilih
                                </div>
                            )}

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr><th style={{ width: '40px' }}></th><th>NIS</th><th>Nama</th><th>Kelas Saat Ini</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredAvailableSantri.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center text-muted">Tidak ada santri ditemukan</td></tr>
                                        ) : (
                                            filteredAvailableSantri.map(s => {
                                                const currentKelas = kelasList.find(k => k.id === s.kelas_id)
                                                const isSelected = selectedSantriIds.includes(s.id)
                                                return (
                                                    <tr key={s.id} onClick={() => toggleSantriSelection(s.id)} style={{ cursor: 'pointer', backgroundColor: isSelected ? 'rgba(46, 204, 113, 0.1)' : 'transparent' }}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => { }}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                        <td>{s.nis || '-'}</td>
                                                        <td>{s.nama}</td>
                                                        <td>{currentKelas?.nama || <span className="text-muted">Belum ada</span>}</td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAddSantriModal(false)}>Batal</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddSantriToKelas}
                                disabled={savingSantri || selectedSantriIds.length === 0}
                            >
                                {savingSantri ? <><RefreshCw size={16} className="spin" /> Menyimpan...</> : `Tambahkan ${selectedSantriIds.length} Santri`}
                            </button>
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

