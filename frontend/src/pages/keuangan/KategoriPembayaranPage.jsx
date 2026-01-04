import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, RefreshCw, MoreVertical, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import './Keuangan.css'

const KategoriPembayaranPage = () => {
    const showToast = useToast()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [search, setSearch] = useState('')
    const [filterTipe, setFilterTipe] = useState('')
    const [activeMenu, setActiveMenu] = useState(null)
    const menuRef = useRef(null)
    const [form, setForm] = useState({
        nama: '',
        tipe: 'pembayaran',
        keterangan: '',
        nominal_default: '',
        is_active: true
    })

    const tipeOptions = [
        { value: 'pemasukan', label: 'Pemasukan', color: 'green' },
        { value: 'pengeluaran', label: 'Pengeluaran', color: 'red' },
        { value: 'pembayaran', label: 'Pembayaran', color: 'blue' }
    ]

    useEffect(() => {
        fetchData()
    }, [])

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: result, error } = await supabase
                .from('kategori_pembayaran')
                .select('*')
                .order('tipe')
                .order('nama')
            if (error) throw error
            setData(result || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    // Modals State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null })
    const [saveModal, setSaveModal] = useState({ isOpen: false })
    const [saving, setSaving] = useState(false)

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            const payload = {
                nama: form.nama,
                tipe: form.tipe,
                keterangan: form.keterangan || '',
                nominal_default: parseFloat(form.nominal_default) || 0,
                is_active: form.is_active
            }

            if (editItem) {
                const { error } = await supabase.from('kategori_pembayaran').update(payload).eq('id', editItem.id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('kategori_pembayaran').insert([payload])
                if (error) throw error
            }

            setSaveModal({ isOpen: false })
            setShowModal(false)
            resetForm()
            fetchData()
            showToast.success('Kategori berhasil disimpan')
        } catch (err) {
            showToast.error('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = (item) => {
        setDeleteModal({ isOpen: true, item })
    }

    const handleDelete = async () => {
        const itemToDelete = deleteModal.item
        if (!itemToDelete) return

        try {
            const { error } = await supabase.from('kategori_pembayaran').delete().eq('id', itemToDelete.id)
            if (error) throw error
            fetchData()
            showToast.success('Kategori berhasil dihapus')
            setDeleteModal({ isOpen: false, item: null })
        } catch (err) {
            showToast.error('Error: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({ nama: '', tipe: 'pembayaran', keterangan: '', nominal_default: '', is_active: true })
        setEditItem(null)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            nama: item.nama,
            tipe: item.tipe || 'pembayaran',
            keterangan: item.keterangan || '',
            nominal_default: item.nominal_default?.toString() || '',
            is_active: item.is_active
        })
        setShowModal(true)
        setActiveMenu(null)
    }

    const getTipeColor = (tipe) => {
        const opt = tipeOptions.find(t => t.value === tipe)
        return opt?.color || 'blue'
    }

    const getTipeLabel = (tipe) => {
        const opt = tipeOptions.find(t => t.value === tipe)
        return opt?.label || tipe
    }

    const filteredData = data.filter(d => {
        const matchSearch = d.nama.toLowerCase().includes(search.toLowerCase())
        const matchTipe = !filterTipe || d.tipe === filterTipe
        return matchSearch && matchTipe
    })

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Tag className="title-icon blue" /> Kategori
                    </h1>
                    <p className="page-subtitle">Kelola kategori pemasukan, pengeluaran, dan pembayaran</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                        <Plus size={18} /> Tambah Kategori
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari kategori..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select value={filterTipe} onChange={e => setFilterTipe(e.target.value)}>
                    <option value="">Semua Tipe</option>
                    {tipeOptions.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : filteredData.length === 0 ? (
                    <div className="empty-state">Belum ada kategori</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Nama</th>
                                    <th>Tipe</th>
                                    <th className="hide-mobile">Keterangan</th>
                                    <th className="hide-mobile">Nominal Default</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, i) => (
                                    <tr key={item.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{item.nama}</strong></td>
                                        <td>
                                            <span className={`badge ${getTipeColor(item.tipe)}`}>
                                                {getTipeLabel(item.tipe)}
                                            </span>
                                        </td>
                                        <td className="hide-mobile">{item.keterangan || '-'}</td>
                                        <td className="hide-mobile amount">Rp {Number(item.nominal_default || 0).toLocaleString('id-ID')}</td>
                                        <td>
                                            <span className={`badge ${item.is_active ? 'green' : 'red'}`}>
                                                {item.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td>
                                            {/* Desktop: Show buttons directly */}
                                            <div className="action-buttons show-desktop">
                                                <button className="btn-icon-sm" onClick={() => openEdit(item)} title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn-icon-sm danger" onClick={() => confirmDelete(item)} title="Hapus">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            {/* Mobile: Show 3-dot menu */}
                                            <div className="action-menu-wrapper show-mobile" ref={activeMenu === item.id ? menuRef : null}>
                                                <button
                                                    className="btn-icon-sm"
                                                    onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {activeMenu === item.id && (
                                                    <div className="action-dropdown">
                                                        <button onClick={() => openEdit(item)}>
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                        <button className="danger" onClick={() => { setActiveMenu(null); confirmDelete(item); }}>
                                                            <Trash2 size={14} /> Hapus
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {
                showModal && (
                    <div className="modal-overlay active">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>{editItem ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
                                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleFormSubmit}>
                                <div className="modal-body">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nama *</label>
                                            <input
                                                type="text"
                                                value={form.nama}
                                                onChange={e => setForm({ ...form, nama: e.target.value })}
                                                placeholder="Contoh: SPP Bulanan"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Tipe Kategori *</label>
                                            <select
                                                value={form.tipe}
                                                onChange={e => setForm({ ...form, tipe: e.target.value })}
                                                required
                                            >
                                                {tipeOptions.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Keterangan</label>
                                        <textarea
                                            value={form.keterangan}
                                            onChange={e => setForm({ ...form, keterangan: e.target.value })}
                                            placeholder="Deskripsi kategori..."
                                            rows={2}
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nominal Default (Rp)</label>
                                            <input
                                                type="number"
                                                value={form.nominal_default}
                                                onChange={e => setForm({ ...form, nominal_default: e.target.value })}
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Status</label>
                                            <select
                                                value={form.is_active}
                                                onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}
                                            >
                                                <option value="true">Aktif</option>
                                                <option value="false">Nonaktif</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? <><RefreshCw size={14} className="spin" /> Menyimpan...</> : (editItem ? 'Simpan' : 'Tambah')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item?.nama}
                message={`Yakin ingin menghapus kategori ini?`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Simpan Perubahan" : "Simpan Data"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan data kategori ini?' : 'Apakah Anda yakin ingin menambahkan data kategori baru ini?'}
                confirmLabel={editItem ? "Simpan" : "Tambah"}
                variant="success"
                isLoading={saving}
            />
        </div >
    )
}

export default KategoriPembayaranPage
