import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Clock, RefreshCw, UserPlus, X, Check, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import './Halaqoh.css'

const HalaqohPage = () => {
    const { activeRole, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const { showToast } = useToast()

    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEdit = adminCheck
    const [halaqohList, setHalaqohList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showSantriModal, setShowSantriModal] = useState(false)
    const [showAddSantriModal, setShowAddSantriModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ nama: '', musyrif_id: '', waktu: '', keterangan: '' })
    const [guruList, setGuruList] = useState([])
    const [saving, setSaving] = useState(false)
    const [selectedHalaqoh, setSelectedHalaqoh] = useState(null)
    const [santriList, setSantriList] = useState([])
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [santriCounts, setSantriCounts] = useState({})
    const [availableSantri, setAvailableSantri] = useState([])
    const [selectedSantriIds, setSelectedSantriIds] = useState([])
    const [savingSantri, setSavingSantri] = useState(false)
    const [searchSantri, setSearchSantri] = useState('')

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
            showToast.error('Gagal memuat data halaqoh: ' + err.message)
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
            showToast.error('Gagal memuat santri: ' + err.message)
        } finally {
            setLoadingSantri(false)
        }
    }

    // Fetch santri untuk modal tambah
    const fetchAvailableSantri = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, jenis_kelamin, halaqoh_id')
                .eq('status', 'Aktif')
                .order('nama')
            if (error) throw error
            setAvailableSantri(data || [])
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat data santri: ' + err.message)
        }
    }

    // Buka modal tambah santri
    const openAddSantriModal = async (halaqoh) => {
        setSelectedHalaqoh(halaqoh)
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

    // Simpan santri ke halaqoh
    const handleAddSantriToHalaqoh = async () => {
        if (selectedSantriIds.length === 0) return
        setSavingSantri(true)
        try {
            const { error } = await supabase
                .from('santri')
                .update({ halaqoh_id: selectedHalaqoh.id })
                .in('id', selectedSantriIds)

            if (error) throw error

            fetchHalaqoh()
            fetchSantriByHalaqoh(selectedHalaqoh)
            setShowAddSantriModal(false)
            setSelectedSantriIds([])
            showToast.success(`${selectedSantriIds.length} santri berhasil ditambahkan`)
        } catch (err) {
            showToast.error('Gagal menambahkan santri: ' + err.message)
        } finally {
            setSavingSantri(false)
        }
    }

    // Hapus santri dari halaqoh
    const handleRemoveSantriFromHalaqoh = async (santriId) => {
        if (!confirm('Yakin ingin menghapus santri ini dari halaqoh?')) return
        try {
            const { error } = await supabase
                .from('santri')
                .update({ halaqoh_id: null })
                .eq('id', santriId)

            if (error) throw error
            fetchHalaqoh()
            fetchSantriByHalaqoh(selectedHalaqoh)
            showToast.success('Santri berhasil dihapus dari halaqoh')
        } catch (err) {
            showToast.error('Gagal menghapus santri: ' + err.message)
        }
    }

    // Filter santri berdasarkan search
    const filteredAvailableSantri = availableSantri.filter(s =>
        s.nama.toLowerCase().includes(searchSantri.toLowerCase()) ||
        (s.nis && s.nis.toLowerCase().includes(searchSantri.toLowerCase()))
    )

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
                showToast.success('Data halaqoh berhasil diperbarui')
            } else {
                const { error } = await supabase.from('halaqoh').insert([payload])
                if (error) throw error
                await logCreate('halaqoh', formData.nama, `Menambah halaqoh baru: ${formData.nama}`)
                showToast.success('Halaqoh baru berhasil ditambahkan')
            }

            fetchHalaqoh()
            setShowModal(false)
            setEditData(null)
            setFormData({ nama: '', musyrif_id: '', waktu: '', keterangan: '' })
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
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
            showToast.success('Halaqoh berhasil dihapus')
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    return (
        <div className="halaqoh-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Manajemen Halaqoh</h1>
                    <p className="page-subtitle">Kelola kelompok tahfizh dan musyrif</p>
                </div>
                {canEdit && (
                    <button className="btn btn-primary" onClick={() => { setEditData(null); setFormData({ nama: '', musyrif_id: '', waktu: '', keterangan: '' }); setShowModal(true) }}>
                        <Plus size={18} /> Tambah Halaqoh
                    </button>
                )}
            </div>

            {loading ? (
                <Spinner className="py-12" label="Memuat data halaqoh..." />
            ) : halaqohList.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="Belum ada data halaqoh"
                    message="Silakan buat halaqoh baru untuk mulai mengelola tahfizh."
                    actionLabel={canEdit ? "Buat Halaqoh Baru" : null}
                    onAction={canEdit ? () => { setEditData(null); setFormData({ nama: '', musyrif_id: '', waktu: '', keterangan: '' }); setShowModal(true) } : null}
                />
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
                            {canEdit && (
                                <div className="halaqoh-actions" onClick={e => e.stopPropagation()}>
                                    <button className="btn-icon btn-icon-success" title="Tambah Santri" onClick={() => openAddSantriModal(halaqoh)}><UserPlus size={16} /></button>
                                    <button className="btn-icon" onClick={() => handleEdit(halaqoh)}><Edit size={16} /></button>
                                    <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(halaqoh.id)}><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Santri Modal - Lihat Daftar Santri */}
            {showSantriModal && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title"><Users size={20} /> Santri Halaqoh {selectedHalaqoh?.nama}</h3>
                            <button className="modal-close" onClick={() => setShowSantriModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {loadingSantri ? (
                                <Spinner className="py-4" label="Memuat data santri..." />
                            ) : santriList.length === 0 ? (
                                <div className="text-center py-8 text-muted">
                                    <p>Belum ada santri di halaqoh ini.</p>
                                    {canEdit && <button className="btn btn-sm btn-primary mt-2" onClick={() => openAddSantriModal(selectedHalaqoh)}>Tambah Santri</button>}
                                </div>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr><th>NIS</th><th>Nama</th><th>L/P</th><th>Status</th>{canEdit && <th>Aksi</th>}</tr>
                                    </thead>
                                    <tbody>
                                        {santriList.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.nis || '-'}</td>
                                                <td>{s.nama}</td>
                                                <td>{s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                                <td><span className={`badge ${s.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td>
                                                {canEdit && (
                                                    <td>
                                                        <button className="btn-icon btn-icon-danger btn-sm" title="Hapus dari halaqoh" onClick={() => handleRemoveSantriFromHalaqoh(s.id)}>
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="modal-footer">
                            {canEdit && <button className="btn btn-primary" onClick={() => openAddSantriModal(selectedHalaqoh)}><UserPlus size={16} /> Tambah Santri</button>}
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
                            <h3 className="modal-title"><UserPlus size={20} /> Tambah Santri ke {selectedHalaqoh?.nama}</h3>
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
                                        <tr><th style={{ width: '40px' }}></th><th>NIS</th><th>Nama</th><th>Halaqoh Saat Ini</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredAvailableSantri.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center text-muted">Tidak ada santri ditemukan</td></tr>
                                        ) : (
                                            filteredAvailableSantri.map(s => {
                                                const currentHalaqoh = halaqohList.find(h => h.id === s.halaqoh_id)
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
                                                        <td>{currentHalaqoh?.nama || <span className="text-muted">Belum ada</span>}</td>
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
                                onClick={handleAddSantriToHalaqoh}
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
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><RefreshCw size={16} className="spin" /> Menyimpan...</> : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default HalaqohPage
