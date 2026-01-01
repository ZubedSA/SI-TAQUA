import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, X, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import './OTA.css'

/**
 * OTA Kategori Page - Master Data Kategori OTA
 * Admin Only - Full CRUD
 */
const OTAKategoriPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState([])
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({ nama: '', keterangan: '' })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: result, error } = await supabase
                .from('ota_kategori')
                .select('*')
                .order('nama')

            if (error) throw error
            setData(result || [])
        } catch (err) {
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredData = data.filter(item =>
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(search.toLowerCase()))
    )

    const openAdd = () => {
        setEditItem(null)
        setFormData({ nama: '', keterangan: '' })
        setShowModal(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setFormData({ nama: item.nama, keterangan: item.keterangan || '' })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditItem(null)
        setFormData({ nama: '', keterangan: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.nama.trim()) {
            showToast.error('Nama kategori wajib diisi')
            return
        }

        setSaving(true)
        try {
            if (editItem) {
                const { error } = await supabase
                    .from('ota_kategori')
                    .update({
                        nama: formData.nama.trim(),
                        keterangan: formData.keterangan.trim() || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editItem.id)

                if (error) throw error
                showToast.success('Kategori berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('ota_kategori')
                    .insert([{
                        nama: formData.nama.trim(),
                        keterangan: formData.keterangan.trim() || null
                    }])

                if (error) throw error
                showToast.success('Kategori berhasil ditambahkan')
            }

            closeModal()
            fetchData()
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (item) => {
        if (!confirm(`Hapus kategori "${item.nama}"?\n\nOTA dengan kategori ini akan menjadi tanpa kategori.`)) return

        try {
            const { error } = await supabase
                .from('ota_kategori')
                .delete()
                .eq('id', item.id)

            if (error) throw error
            showToast.success('Kategori berhasil dihapus')
            fetchData()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    if (loading) {
        return (
            <div className="ota-container">
                <div className="ota-loading">
                    <Spinner label="Memuat data kategori..." />
                </div>
            </div>
        )
    }

    return (
        <div className="ota-container">
            {/* Header */}
            <div className="ota-header">
                <div className="ota-header-top">
                    <div>
                        <h1>Kategori OTA</h1>
                        <p>Kelola master data kategori Orang Tua Asuh</p>
                    </div>
                    <button className="ota-btn ota-btn-primary" onClick={openAdd}>
                        <Plus size={18} />
                        Tambah Kategori
                    </button>
                </div>
            </div>

            {/* Card */}
            <div className="ota-card">
                <div className="ota-card-header">
                    <h2>Daftar Kategori</h2>
                    <div className="ota-search">
                        <Search size={18} className="ota-search-icon" />
                        <input
                            type="text"
                            placeholder="Cari kategori..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="ota-table-container">
                    {filteredData.length > 0 ? (
                        <table className="ota-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Nama Kategori</th>
                                    <th>Keterangan</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td>{idx + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Tag size={16} style={{ color: '#10b981' }} />
                                                <span style={{ fontWeight: 500 }}>{item.nama}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: '#64748b' }}>{item.keterangan || '-'}</td>
                                        <td>
                                            <div className="ota-action-buttons desktop">
                                                <button
                                                    className="ota-action-btn edit"
                                                    onClick={() => openEdit(item)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="ota-action-btn delete"
                                                    onClick={() => handleDelete(item)}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            {/* Mobile Menu */}
                                            <MobileActionMenu
                                                onEdit={() => openEdit(item)}
                                                onDelete={() => handleDelete(item)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="ota-empty">
                            <EmptyState
                                icon={Tag}
                                message={search ? 'Tidak ada kategori yang cocok' : 'Belum ada kategori OTA'}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="ota-modal-overlay" onClick={closeModal}>
                    <div className="ota-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ota-modal-header">
                            <h2>{editItem ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
                            <button className="ota-modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="ota-modal-body">
                                <div className="ota-form-group">
                                    <label className="ota-form-label">
                                        Nama Kategori <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="ota-form-input"
                                        placeholder="Contoh: Perorangan"
                                        value={formData.nama}
                                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="ota-form-group">
                                    <label className="ota-form-label">Keterangan</label>
                                    <textarea
                                        className="ota-form-textarea"
                                        placeholder="Deskripsi kategori (opsional)"
                                        value={formData.keterangan}
                                        onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="ota-modal-footer">
                                <button type="button" className="ota-btn ota-btn-secondary" onClick={closeModal}>
                                    Batal
                                </button>
                                <button type="submit" className="ota-btn ota-btn-primary" disabled={saving}>
                                    {saving ? <RefreshCw size={16} className="animate-spin" /> : null}
                                    {editItem ? 'Simpan Perubahan' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

// Mobile Action Menu Component
const MobileActionMenu = ({ onEdit, onDelete }) => {
    const [open, setOpen] = useState(false)

    return (
        <div className="ota-mobile-menu">
            <button
                className="ota-mobile-menu-trigger"
                onClick={() => setOpen(!open)}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="19" r="1" />
                </svg>
            </button>
            {open && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                        onClick={() => setOpen(false)}
                    />
                    <div className="ota-mobile-menu-dropdown">
                        <button
                            className="ota-mobile-menu-item"
                            onClick={() => { onEdit(); setOpen(false) }}
                        >
                            <Edit2 size={16} />
                            Edit
                        </button>
                        <button
                            className="ota-mobile-menu-item danger"
                            onClick={() => { onDelete(); setOpen(false) }}
                        >
                            <Trash2 size={16} />
                            Hapus
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default OTAKategoriPage
