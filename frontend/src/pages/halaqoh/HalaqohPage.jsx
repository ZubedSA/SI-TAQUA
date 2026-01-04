import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, RefreshCw, Users, Circle, GraduationCap, MoreVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import { useHalaqoh } from '../../hooks/useAkademik'
import { Link } from 'react-router-dom'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import '../santri/Santri.css'

const HalaqohPage = () => {
    const { isAdmin, isMusyrif } = useAuth()
    const showToast = useToast()

    const [guruList, setGuruList] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    const [halaqohList, setHalaqohList] = useState([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [formData, setFormData] = useState({ nama: '', musyrif_id: '' })
    const [saving, setSaving] = useState(false)

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteItem, setDeleteItem] = useState(null)

    useEffect(() => {
        fetchHalaqoh()
        fetchGuru()
    }, [])

    const fetchHalaqoh = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('halaqoh')
                .select(`
                    id,
                    nama,
                    musyrif_id,
                    guru:guru!musyrif_id (nama)
                `)
                .order('nama')

            if (error) throw error
            setHalaqohList(data || [])
        } catch (error) {
            console.error('Error loading halaqoh:', error)
            showToast.error('Gagal memuat data halaqoh: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchGuru = async () => {
        try {
            const { data: guruData, error: guruError } = await supabase
                .from('guru')
                .select('id, nama')
                .order('nama')

            if (guruError) throw guruError
            setGuruList(guruData || [])
        } catch (err) {
            console.error('Error fetching guru:', err)
        }
    }

    // Manual fetchData removed for halaqoh, kept only for Guru (could be hooks too but step by step)

    const openAdd = () => {
        setEditItem(null)
        setFormData({ nama: '', musyrif_id: '' })
        setShowModal(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setFormData({ nama: item.nama, musyrif_id: item.musyrif_id || '' })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditItem(null)
        setFormData({ nama: '', musyrif_id: '' })
    }

    // Save Confirmation State
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        if (!formData.nama.trim()) {
            showToast.error('Nama halaqoh wajib diisi')
            return
        }
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            const payload = {
                nama: formData.nama.trim(),
                musyrif_id: formData.musyrif_id || null
            }

            if (editItem) {
                const { error } = await supabase
                    .from('halaqoh')
                    .update(payload)
                    .eq('id', editItem.id)
                if (error) throw error
                showToast.success('Halaqoh berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('halaqoh')
                    .insert([payload])
                if (error) throw error
                showToast.success('Halaqoh berhasil ditambahkan')
            }

            closeModal()
            fetchHalaqoh()
            setSaveModal({ isOpen: false })
        } catch (err) {
            console.error('Error saving:', err)
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const openDelete = (item) => {
        setDeleteItem(item)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!deleteItem) return

        try {
            const { error } = await supabase
                .from('halaqoh')
                .delete()
                .eq('id', deleteItem.id)

            if (error) throw error
            showToast.success('Halaqoh berhasil dihapus')
            setShowDeleteModal(false)
            setDeleteItem(null)
            fetchHalaqoh()
        } catch (err) {
            console.error('Error deleting:', err)
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    // Detail Member Modal State
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedHalaqoh, setSelectedHalaqoh] = useState(null)
    const [members, setMembers] = useState([])
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [availableSantri, setAvailableSantri] = useState([])
    const [selectedSantriToAdd, setSelectedSantriToAdd] = useState('')
    const [searchSantriTerm, setSearchSantriTerm] = useState('')

    const openDetail = async (halaqoh) => {
        setSelectedHalaqoh(halaqoh)
        setShowDetailModal(true)
        setMembers([]) // Clear previous
        fetchMembers(halaqoh.id)
    }

    const fetchMembers = async (halaqohId) => {
        if (!halaqohId) return
        setLoadingMembers(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, kelas_id, kelas:kelas!kelas_id(nama)')
                .eq('halaqoh_id', halaqohId)
                .order('nama')

            if (error) throw error
            setMembers(data || [])
        } catch (err) {
            console.error('Error fetching members:', err)
            showToast.error('Gagal memuat anggota: ' + err.message)
        } finally {
            setLoadingMembers(false)
        }
    }

    const searchAvailableSantri = async (term) => {
        if (!term || term.length < 3) return
        try {
            // Cari santri yang aktif dan belum punya halaqoh (atau bisa pindah)
            // Untuk simplifikasi, kita cari yang belum punya halaqoh dulu atau tampilkan semua
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, halaqoh_id, halaqoh:halaqoh!halaqoh_id(nama)')
                .ilike('nama', `%${term}%`)
                .ilike('status', 'Aktif')
                .limit(10)

            if (error) throw error
            setAvailableSantri(data || [])
        } catch (err) {
            console.error('Error searching santri:', err)
        }
    }

    // Member Confirmation States
    const [memberModal, setMemberModal] = useState({
        isOpen: false,
        type: null, // 'add' or 'remove'
        santriId: null
    })

    const confirmAddMember = () => {
        if (!selectedSantriToAdd || !selectedHalaqoh) {
            showToast.error('Silakan pilih santri terlebih dahulu')
            return
        }
        setMemberModal({ isOpen: true, type: 'add', santriId: selectedSantriToAdd })
    }

    const confirmRemoveMember = (santriId) => {
        setMemberModal({ isOpen: true, type: 'remove', santriId })
    }

    const executeAddMember = async () => {
        try {
            const { error } = await supabase
                .from('santri')
                .update({ halaqoh_id: selectedHalaqoh.id })
                .eq('id', memberModal.santriId)

            if (error) throw error

            showToast.success('Santri berhasil ditambahkan ke halaqoh')
            setSelectedSantriToAdd('')
            setSearchSantriTerm('')
            setAvailableSantri([])
            fetchMembers(selectedHalaqoh.id)
            setMemberModal({ isOpen: false, type: null, santriId: null })
        } catch (err) {
            console.error('Error adding member:', err)
            showToast.error('Gagal menambah anggota: ' + err.message)
        }
    }

    const executeRemoveMember = async () => {
        try {
            const { error } = await supabase
                .from('santri')
                .update({ halaqoh_id: null })
                .eq('id', memberModal.santriId)

            if (error) throw error

            showToast.success('Santri berhasil dikeluarkan dari halaqoh')
            fetchMembers(selectedHalaqoh.id)
            setMemberModal({ isOpen: false, type: null, santriId: null })
        } catch (err) {
            console.error('Error removing member:', err)
            showToast.error('Gagal mengeluarkan anggota: ' + err.message)
        }
    }

    // Effect for bouncing search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchSantriTerm) {
                searchAvailableSantri(searchSantriTerm)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchSantriTerm])


    const filteredData = halaqohList.filter(item =>
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.guru?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="santri-page">
                <div className="loading-container">
                    <Spinner label="Memuat data halaqoh..." />
                </div>
            </div>
        )
    }

    return (
        <div className="santri-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <div className="header-icon">
                        <Circle size={28} />
                    </div>
                    <div>
                        <h1 className="page-title">Data Halaqoh</h1>
                        <p className="page-subtitle">Kelola data halaqoh tahfidz</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchHalaqoh}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    {isAdmin() && (
                        <button className="btn btn-primary" onClick={openAdd}>
                            <Plus size={16} /> Tambah Halaqoh
                        </button>
                    )}
                </div>
            </div>



            {/* Card */}
            <div className="data-card">
                <div className="card-header">
                    <h2>Daftar Halaqoh</h2>
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Cari halaqoh..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    {filteredData.length > 0 ? (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Nama Halaqoh</th>
                                        <th>Guru Pengajar</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {item.nama?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 500 }}>{item.nama}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {item.guru?.nama ? (
                                                    <span className="badge badge-info">{item.guru.nama}</span>
                                                ) : (
                                                    <span className="badge badge-warning">Belum ditentukan</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {/* Desktop Actions */}
                                                <div className="action-buttons desktop">
                                                    <button className="btn-icon btn-icon-primary" onClick={() => openDetail(item)} title="Detail Anggota">
                                                        <Users size={16} />
                                                    </button>
                                                    {isAdmin() && (
                                                        <>
                                                            <button className="btn-icon edit" onClick={() => openEdit(item)} title="Edit">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button className="btn-icon delete" onClick={() => openDelete(item)} title="Hapus">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                                {/* Mobile Actions */}
                                                <div className="action-buttons mobile">
                                                    <MobileActionMenu
                                                        actions={[
                                                            {
                                                                icon: <Users size={16} />,
                                                                label: 'Anggota',
                                                                onClick: () => openDetail(item)
                                                            },
                                                            isAdmin() && {
                                                                icon: <Edit2 size={16} />,
                                                                label: 'Edit',
                                                                onClick: () => openEdit(item)
                                                            },
                                                            isAdmin() && {
                                                                icon: <Trash2 size={16} />,
                                                                label: 'Hapus',
                                                                danger: true,
                                                                onClick: () => openDelete(item)
                                                            }
                                                        ].filter(Boolean)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon={Circle}
                            title="Tidak ada halaqoh"
                            description="Belum ada data halaqoh yang ditambahkan"
                        />
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Halaqoh' : 'Tambah Halaqoh'}</h3>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nama Halaqoh <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.nama}
                                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                        placeholder="Masukkan nama halaqoh"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Guru Pengajar</label>
                                    <select
                                        value={formData.musyrif_id}
                                        onChange={(e) => setFormData({ ...formData, musyrif_id: e.target.value })}
                                    >
                                        <option value="">Pilih Guru (opsional)</option>
                                        {guruList.map(guru => (
                                            <option key={guru.id} value={guru.id}>{guru.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><RefreshCw size={14} className="spin" /> Menyimpan...</> : (editItem ? 'Simpan Perubahan' : 'Tambah')}
                                </button>
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
                itemName={deleteItem?.nama}
            />

            {/* Detail Members Modal */}
            {showDetailModal && selectedHalaqoh && (
                <div className="modal-overlay active">
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <div>
                                <h3>Anggota Halaqoh: {selectedHalaqoh.nama}</h3>
                                <p className="text-muted text-sm" style={{ margin: 0 }}>Pengajar: {selectedHalaqoh.guru?.nama || 'Belum ditentukan'}</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Add Member Section */}
                            {/* Add Member Section */}
                            <div className="member-form-container">
                                <h4 className="member-form-title">Tambah Anggota Baru</h4>
                                <div className="member-search-group">
                                    <div className="member-search-wrapper">
                                        {selectedSantriToAdd ? (
                                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }}>
                                                <Users size={16} />
                                            </div>
                                        ) : (
                                            <Search size={16} className="member-search-icon" />
                                        )}
                                        <input
                                            type="text"
                                            className="member-search-input"
                                            style={selectedSantriToAdd ? { borderColor: '#10b981', background: '#ecfdf5' } : {}}
                                            placeholder="Ketik nama dan KLIK santri dari daftar..."
                                            value={searchSantriTerm}
                                            onChange={(e) => {
                                                setSearchSantriTerm(e.target.value)
                                                setSelectedSantriToAdd('') // Reset selection on typing
                                            }}
                                        />

                                        {/* Dropdown Results */}
                                        {searchSantriTerm && !selectedSantriToAdd && (
                                            <div className="member-search-results">
                                                {availableSantri.length > 0 ? (
                                                    availableSantri.map(s => (
                                                        <div
                                                            className="search-result-item"
                                                            onClick={() => {
                                                                setSelectedSantriToAdd(s.id)
                                                                setSearchSantriTerm(s.nama)
                                                                setAvailableSantri([])
                                                            }}
                                                        >
                                                            <span>{s.nama} <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({s.nis})</span></span>
                                                            {s.halaqoh && <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>Dari: {s.halaqoh.nama}</span>}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                                                        {searchSantriTerm.length < 3 ? 'Ketik minimal 3 karakter...' : 'Tidak ada santri ditemukan.'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={confirmAddMember}
                                        style={{ height: 'auto', minWidth: '100px' }}
                                    >
                                        <Plus size={16} /> Tambah
                                    </button>
                                </div>
                                {selectedSantriToAdd && (
                                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={12} />
                                        <span>Santri terpilih dan siap ditambahkan. Klik tombol Tambah.</span>
                                    </div>
                                )}
                            </div>

                            {/* Members List Table */}
                            <div className="table-container" style={{ margin: 0, boxShadow: 'none', border: '1px solid var(--border-color)' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50px' }}>No</th>
                                            <th>NIS</th>
                                            <th>Nama Santri</th>
                                            <th>Kelas</th>
                                            <th className="text-center" style={{ width: '100px' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingMembers ? (
                                            <tr><td colSpan="5" className="text-center py-8 text-muted">Memuat data anggota...</td></tr>
                                        ) : members.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-8 text-muted">Belum ada anggota di halaqoh ini.</td></tr>
                                        ) : (
                                            members.map((m, idx) => (
                                                <tr key={m.id}>
                                                    <td>{idx + 1}</td>
                                                    <td>{m.nis}</td>
                                                    <td className="font-medium">{m.nama}</td>
                                                    <td>{m.kelas?.nama || '-'}</td>
                                                    <td className="text-center">
                                                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                                            <button
                                                                className="btn-icon delete"
                                                                title="Keluarkan dari halaqoh"
                                                                onClick={() => confirmRemoveMember(m.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Konfirmasi Edit" : "Konfirmasi Tambah"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan data halaqoh ini?' : 'Apakah Anda yakin ingin menambahkan halaqoh baru ini?'}
                confirmLabel={editItem ? "Simpan Perubahan" : "Tambah Halaqoh"}
                variant="success"
                isLoading={saving}
            />

            <ConfirmationModal
                isOpen={memberModal.isOpen}
                onClose={() => setMemberModal({ ...memberModal, isOpen: false })}
                onConfirm={memberModal.type === 'add' ? executeAddMember : executeRemoveMember}
                title={memberModal.type === 'add' ? "Konfirmasi Tambah Anggota" : "Konfirmasi Hapus Anggota"}
                message={memberModal.type === 'add' ? "Apakah Anda yakin ingin menambahkan santri ini ke halaqoh?" : "Apakah Anda yakin ingin mengeluarkan santri ini dari halaqoh?"}
                confirmLabel={memberModal.type === 'add' ? "Tambah" : "Keluarkan"}
                variant={memberModal.type === 'add' ? "success" : "danger"}
            />
        </div>
    )
}

export default HalaqohPage
