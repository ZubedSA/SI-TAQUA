import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, ArrowDownCircle, Download, RefreshCw, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../context/ToastContext'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { useKas, useKategoriPembayaran } from '../../hooks/useKeuangan'
import { useKasPengeluaran } from '../../hooks/features/useKasPengeluaran'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import './Keuangan.css'

const KasPengeluaranPage = () => {
    const { user, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const { canCreate, canUpdate, canDelete } = usePermissions()
    const showToast = useToast() // showToast is returned directly from context, not destructured

    // Multiple checks - admin dan bendahara bisa CRUD
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEditKas = adminCheck || bendaharaCheck

    // Filters State
    const [filters, setFilters] = useState({
        search: '',
        bulan: '',
        tahun: new Date().getFullYear(),
        dateFrom: '',
        dateTo: ''
    })

    const [loading, setLoading] = useState(true)
    const [kategoriList, setKategoriList] = useState([])

    // Performance Update: Use Cached Hook
    const { data: rawData = [], isLoading: loadingMain, error, refetch } = useKasPengeluaran(filters)

    useEffect(() => {
        setLoading(loadingMain)
    }, [loadingMain])

    useEffect(() => {
        fetchKategori()
    }, [])

    // Error Handling
    useEffect(() => {
        if (error) {
            console.error('Error loading kas:', error)
            showToast.error('Gagal memuat data kas')
        }
    }, [error])

    const fetchKategori = async () => {
        try {
            const { data, error } = await supabase
                .from('kategori_pembayaran')
                .select('*')
                .eq('tipe', 'pengeluaran')
                .eq('is_active', true)
                .order('nama')
            if (error) throw error
            setKategoriList(data || [])
        } catch (error) {
            console.error('Error loading kategori:', error)
        }
    }
    const [form, setForm] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        keperluan: '',
        kategori: '',
        jumlah: '',
        keterangan: ''
    })

    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [saving, setSaving] = useState(false)



    // Client-side filtering for search & specific dates
    const filteredDataRaw = useMemo(() => {
        return rawData.filter(item => {
            let pass = true
            if (filters.search) {
                const term = filters.search.toLowerCase()
                pass = pass && (
                    item.keperluan?.toLowerCase().includes(term) ||
                    item.keterangan?.toLowerCase().includes(term)
                )
            }
            // Optimization: Date filtering (month/year) is handled by server via hook
            return pass
        })
    }, [rawData, filters.search])

    // Modals State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null })
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            const payload = {
                ...form,
                jumlah: parseFloat(form.jumlah),
                created_by: user?.id
            }

            if (editItem) {
                const { error } = await supabase.from('kas_pengeluaran').update(payload).eq('id', editItem.id)
                if (error) throw error

                // Audit Log - UPDATE
                await logUpdate(
                    'kas_pengeluaran',
                    payload.keperluan,
                    `Update pengeluaran: ${payload.keperluan} - Rp ${Number(payload.jumlah).toLocaleString('id-ID')}`,
                    { keperluan: editItem.keperluan, jumlah: editItem.jumlah, kategori: editItem.kategori },
                    { keperluan: payload.keperluan, jumlah: payload.jumlah, kategori: payload.kategori }
                )
                showToast.success('Pengeluaran berhasil diperbarui')
            } else {
                const { error } = await supabase.from('kas_pengeluaran').insert([payload])
                if (error) throw error

                // Audit Log - CREATE
                await logCreate(
                    'kas_pengeluaran',
                    payload.keperluan,
                    `Tambah pengeluaran: ${payload.keperluan} - Rp ${Number(payload.jumlah).toLocaleString('id-ID')}`
                )
                showToast.success('Pengeluaran baru berhasil ditambahkan')
            }

            setSaveModal({ isOpen: false })
            setShowModal(false)
            resetForm()
            await refetch()
        } catch (err) {
            console.error('Submit error:', err)
            showToast.error('Gagal menyimpan: ' + err.message)
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
            const { error } = await supabase.from('kas_pengeluaran').delete().eq('id', itemToDelete.id)
            if (error) throw error

            // Audit Log - DELETE
            await logDelete(
                'kas_pengeluaran',
                itemToDelete.keperluan,
                `Hapus pengeluaran: ${itemToDelete.keperluan} - Rp ${Number(itemToDelete.jumlah).toLocaleString('id-ID')}`
            )

            await refetch()
            showToast.success('Data berhasil dihapus')
            setDeleteModal({ isOpen: false, item: null })
        } catch (err) {
            console.error('Delete error:', err)
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            tanggal: new Date().toISOString().split('T')[0],
            keperluan: '',
            kategori: '',
            jumlah: '',
            keterangan: ''
        })
        setEditItem(null)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            tanggal: item.tanggal,
            keperluan: item.keperluan,
            kategori: item.kategori || '',
            jumlah: item.jumlah.toString(),
            keterangan: item.keterangan || ''
        })
        setShowModal(true)
    }

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Keperluan', 'Kategori', 'Jumlah', 'Keterangan']
        const exportData = filteredData.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Keperluan: d.keperluan,
            Kategori: d.kategori || '-',
            Jumlah: Number(d.jumlah),
            Keterangan: d.keterangan || '-'
        }))
        exportToExcel(exportData, columns, 'laporan_pengeluaran_kas')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Keperluan', 'Kategori', 'Jumlah', 'Keterangan']
        const exportData = filteredData.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Keperluan: d.keperluan,
            Kategori: d.kategori || '-',
            Jumlah: Number(d.jumlah),
            Keterangan: d.keterangan || '-'
        }))
        exportToCSV(exportData, columns, 'laporan_pengeluaran_kas')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Pengeluaran Kas',
            subtitle: filters.bulan ? `Bulan ${filters.bulan}/${filters.tahun}` : `Tahun ${filters.tahun}`,
            columns: ['Tanggal', 'Keperluan', 'Kategori', 'Jumlah', 'Keterangan'],
            data: filteredData.map(d => [
                new Date(d.tanggal).toLocaleDateString('id-ID'),
                d.keperluan,
                d.kategori || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                d.keterangan || '-'
            ]),
            filename: 'laporan_pengeluaran_kas',
            showTotal: true,
            totalLabel: 'Total Pengeluaran',
            totalValue: filteredData.reduce((sum, d) => sum + Number(d.jumlah), 0)
        })
        showToast.success('Laporan berhasil didownload')
    }

    const totalPengeluaran = filteredDataRaw.reduce((sum, d) => sum + Number(d.jumlah), 0)
    // filteredDataRaw already filtered above if needed or use data
    // based on original code logic
    const filteredData = filteredDataRaw

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <ArrowDownCircle className="title-icon red" /> Pengeluaran Kas
                    </h1>
                    <p className="page-subtitle">Kelola data pengeluaran kas pesantren</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canEditKas && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Tambah Pengeluaran
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-card red">
                <div className="summary-content">
                    <span className="summary-label">Total Pengeluaran</span>
                    <span className="summary-value">Rp {totalPengeluaran.toLocaleString('id-ID')}</span>
                </div>
                <ArrowDownCircle size={40} className="summary-icon" />
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari keperluan..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <div className="date-range-filter">
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => setFilters({ ...filters, dateFrom: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Dari Tanggal"
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => setFilters({ ...filters, dateTo: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Sampai Tanggal"
                    />
                </div>
                <select
                    value={filters.bulan}
                    onChange={e => setFilters({ ...filters, bulan: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    <option value="">Semua Bulan</option>
                    {[...Array(12)].map((_, i) => (
                        <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'long' })}</option>
                    ))}
                </select>
                <select
                    value={filters.tahun}
                    onChange={e => setFilters({ ...filters, tahun: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn btn-icon" onClick={refetch}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                {loading ? (
                    <Spinner className="py-8" label="Memuat data pengeluaran..." />
                ) : filteredData.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="Belum ada data pengeluaran"
                        message={filters.search || filters.dateFrom ? "Tidak ditemukan data yang sesuai filter." : "Belum ada data pengeluaran kas yang tercatat."}
                        actionLabel={canEditKas ? "Tambah Pengeluaran" : null}
                        onAction={canEditKas ? () => { resetForm(); setShowModal(true) } : null}
                    />
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal</th>
                                    <th>Keperluan</th>
                                    <th>Kategori</th>
                                    <th>Jumlah</th>
                                    <th>Keterangan</th>
                                    {canEditKas && <th>Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, i) => (
                                    <tr key={item.id}>
                                        <td>{i + 1}</td>
                                        <td>{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                        <td>{item.keperluan}</td>
                                        <td><span className="badge red">{item.kategori || '-'}</span></td>
                                        <td className="amount red">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                                        <td>{item.keterangan || '-'}</td>
                                        {canEditKas && (
                                            <td>
                                                <MobileActionMenu
                                                    actions={[
                                                        { label: 'Edit', icon: <Edit2 size={14} />, onClick: () => openEdit(item) },
                                                        { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => confirmDelete(item), danger: true }
                                                    ]}
                                                >
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        title="Edit"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#fef3c7',
                                                            color: '#d97706',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            marginRight: '4px'
                                                        }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(item)}
                                                        title="Hapus"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </MobileActionMenu>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tanggal *</label>
                                    <input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Keperluan *</label>
                                    <input type="text" value={form.keperluan} onChange={e => setForm({ ...form, keperluan: e.target.value })} placeholder="Contoh: Beli ATK" required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Kategori</label>
                                        <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>
                                            <option value="">Pilih Kategori</option>
                                            {kategoriList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Jumlah (Rp) *</label>
                                        <input type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} min="0" required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Keterangan</label>
                                    <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} rows={3} />
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
            )}

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item?.keperluan}
                message={`Yakin ingin menghapus pengeluaran ini?`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Simpan Perubahan" : "Simpan Data"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan data pengeluaran ini?' : 'Apakah Anda yakin ingin menambahkan data pengeluaran baru ini?'}
                confirmLabel={editItem ? "Simpan" : "Tambah"}
                variant="success"
                isLoading={saving}
            />
        </div >
    )
}

export default KasPengeluaranPage
