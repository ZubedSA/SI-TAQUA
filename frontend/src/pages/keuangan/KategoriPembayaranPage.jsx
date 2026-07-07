import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, RefreshCw, MoreVertical, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
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
            showToast.error('Gagal memuat kategori')
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
                    <>
                        {/* Desktop Table View */}
                        <ResponsiveTable
                            columns={[
                                { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                                { header: 'Nama', accessor: 'nama', className: 'font-bold', hideOnMobile: true },
                                { 
                                    header: 'Tipe', 
                                    render: (row) => (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getTipeColor(row.tipe)}`}>
                                            {getTipeLabel(row.tipe)}
                                        </span>
                                    )
                                },
                                { header: 'Keterangan', accessor: 'keterangan', render: (row) => row.keterangan || '-' },
                                { 
                                    header: 'Nominal Default', 
                                    render: (row) => row.nominal_default > 0 ? `Rp ${Number(row.nominal_default).toLocaleString('id-ID')}` : '-'
                                },
                                { 
                                    header: 'Status', 
                                    render: (row) => (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            {row.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    )
                                },
                                {
                                    header: 'Aksi',
                                    hideOnMobile: true,
                                    className: 'text-right',
                                    render: (row) => (
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(row)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                                            <button onClick={() => confirmDelete(row)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                                        </div>
                                    )
                                }
                            ]}
                            data={filteredData}
                            mobileCardHeader={(row) => (
                                <div className="flex flex-col">
                                    <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 w-max ${getTipeColor(row.tipe)}`}>
                                        {getTipeLabel(row.tipe)}
                                    </span>
                                </div>
                            )}
                            mobileCardActions={(row) => (
                                <>
                                    <button onClick={() => openEdit(row)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => confirmDelete(row)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </>
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
