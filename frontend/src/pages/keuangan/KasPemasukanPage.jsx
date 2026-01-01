import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, ArrowUpCircle, Download, RefreshCw, Filter, MessageCircle, FileText } from 'lucide-react'
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
import './Keuangan.css'

const KasPemasukanPage = () => {
    const { user, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const { canCreate, canUpdate, canDelete } = usePermissions()
    const showToast = useToast() // showToast is returned directly from context, not destructured

    // Multiple checks - admin dan bendahara bisa CRUD
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEditKas = adminCheck || bendaharaCheck
    const [data, setData] = useState([])
    const [kategoriList, setKategoriList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [filters, setFilters] = useState({
        search: '',
        bulan: '',
        tahun: new Date().getFullYear(),
        dateFrom: '',
        dateTo: ''
    })
    const [form, setForm] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        sumber: '',
        kategori: '',
        jumlah: '',
        keterangan: ''
    })

    useEffect(() => {
        fetchData()
        fetchKategori()
    }, [filters.bulan, filters.tahun, filters.dateFrom, filters.dateTo])

    const fetchKategori = async () => {
        const { data } = await supabase
            .from('kategori_pembayaran')
            .select('*')
            .eq('is_active', true)
            .eq('tipe', 'pemasukan')
            .order('nama')
        setKategoriList(data || [])
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('kas_pemasukan')
                .select('*')
                .order('tanggal', { ascending: false })

            // Date range filter takes priority
            if (filters.dateFrom && filters.dateTo) {
                query = query.gte('tanggal', filters.dateFrom)
                    .lte('tanggal', filters.dateTo)
            } else if (filters.dateFrom) {
                query = query.gte('tanggal', filters.dateFrom)
            } else if (filters.dateTo) {
                query = query.lte('tanggal', filters.dateTo)
            } else {
                // Fallback to bulan/tahun filter
                if (filters.tahun) {
                    query = query.gte('tanggal', `${filters.tahun}-01-01`)
                        .lte('tanggal', `${filters.tahun}-12-31`)
                }
                if (filters.bulan) {
                    const month = String(filters.bulan).padStart(2, '0')
                    query = query.gte('tanggal', `${filters.tahun}-${month}-01`)
                        .lte('tanggal', `${filters.tahun}-${month}-31`)
                }
            }

            const { data: result, error } = await query
            if (error) throw error
            setData(result || [])
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                ...form,
                jumlah: parseFloat(form.jumlah),
                created_by: user?.id
            }

            if (editItem) {
                const { error } = await supabase
                    .from('kas_pemasukan')
                    .update(payload)
                    .eq('id', editItem.id)
                if (error) throw error

                // Audit Log - UPDATE
                await logUpdate(
                    'kas_pemasukan',
                    payload.sumber,
                    `Update pemasukan: ${payload.sumber} - Rp ${Number(payload.jumlah).toLocaleString('id-ID')}`,
                    { sumber: editItem.sumber, jumlah: editItem.jumlah, kategori: editItem.kategori },
                    { sumber: payload.sumber, jumlah: payload.jumlah, kategori: payload.kategori }
                )
                showToast.success('Pemasukan berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('kas_pemasukan')
                    .insert([payload])
                if (error) throw error

                // Audit Log - CREATE
                await logCreate(
                    'kas_pemasukan',
                    payload.sumber,
                    `Tambah pemasukan: ${payload.sumber} - Rp ${Number(payload.jumlah).toLocaleString('id-ID')}`
                )
                showToast.success('Pemasukan baru berhasil ditambahkan')
            }

            setShowModal(false)
            resetForm()
            await fetchData() // Added await for proper data refresh
        } catch (err) {
            console.error('Submit error:', err)
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin hapus data ini?')) return
        try {
            // Get data before delete for audit log
            const itemToDelete = data.find(d => d.id === id)

            const { error } = await supabase
                .from('kas_pemasukan')
                .delete()
                .eq('id', id)
            if (error) throw error

            // Audit Log - DELETE
            if (itemToDelete) {
                await logDelete(
                    'kas_pemasukan',
                    itemToDelete.sumber,
                    `Hapus pemasukan: ${itemToDelete.sumber} - Rp ${Number(itemToDelete.jumlah).toLocaleString('id-ID')}`
                )
            }

            await fetchData() // Added await for proper data refresh
            showToast.success('Data berhasil dihapus')
        } catch (err) {
            console.error('Delete error:', err)
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            tanggal: new Date().toISOString().split('T')[0],
            sumber: '',
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
            sumber: item.sumber,
            kategori: item.kategori || '',
            jumlah: item.jumlah.toString(),
            keterangan: item.keterangan || ''
        })
        setShowModal(true)
    }

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Sumber', 'Kategori', 'Jumlah', 'Keterangan']
        const exportData = data.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Sumber: d.sumber,
            Kategori: d.kategori || '-',
            Jumlah: Number(d.jumlah),
            Keterangan: d.keterangan || '-'
        }))
        exportToExcel(exportData, columns, 'laporan_pemasukan_kas')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Sumber', 'Kategori', 'Jumlah', 'Keterangan']
        const exportData = data.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Sumber: d.sumber,
            Kategori: d.kategori || '-',
            Jumlah: Number(d.jumlah),
            Keterangan: d.keterangan || '-'
        }))
        exportToCSV(exportData, columns, 'laporan_pemasukan_kas')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Pemasukan Kas',
            subtitle: filters.bulan
                ? `Bulan ${filters.bulan}/${filters.tahun}`
                : `Tahun ${filters.tahun}`,
            columns: ['Tanggal', 'Sumber', 'Kategori', 'Jumlah', 'Keterangan'],
            data: data.map(d => [
                new Date(d.tanggal).toLocaleDateString('id-ID'),
                d.sumber,
                d.kategori || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                d.keterangan || '-'
            ]),
            filename: 'laporan_pemasukan_kas',
            showTotal: true,
            totalLabel: 'Total Pemasukan',
            totalValue: data.reduce((sum, d) => sum + Number(d.jumlah), 0)
        })
        showToast.success('Laporan berhasil didownload')
    }

    const totalPemasukan = data.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const filteredData = data.filter(d =>
        d.sumber.toLowerCase().includes(filters.search.toLowerCase()) ||
        (d.keterangan && d.keterangan.toLowerCase().includes(filters.search.toLowerCase()))
    )

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <ArrowUpCircle className="title-icon green" /> Pemasukan Kas
                    </h1>
                    <p className="page-subtitle">Kelola data pemasukan kas pesantren</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canEditKas && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Tambah Pemasukan
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Card */}
            <div className="summary-card green">
                <div className="summary-content">
                    <span className="summary-label">Total Pemasukan</span>
                    <span className="summary-value">Rp {totalPemasukan.toLocaleString('id-ID')}</span>
                </div>
                <ArrowUpCircle size={40} className="summary-icon" />
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari sumber atau keterangan..."
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
                    {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <button className="btn btn-icon" onClick={fetchData}>
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Data Table */}
            <div className="data-card">
                {loading ? (
                    <Spinner className="py-8" label="Memuat data pemasukan..." />
                ) : filteredData.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="Belum ada data pemasukan"
                        message={filters.search || filters.dateFrom ? "Tidak ditemukan data yang sesuai filter." : "Belum ada data pemasukan kas yang tercatat."}
                        actionLabel={canEditKas ? "Tambah Pemasukan" : null}
                        onAction={canEditKas ? () => { resetForm(); setShowModal(true) } : null}
                    />
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Tanggal</th>
                                <th>Sumber</th>
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
                                    <td>{item.sumber}</td>
                                    <td><span className="badge green">{item.kategori || '-'}</span></td>
                                    <td className="amount green">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                                    <td>{item.keterangan || '-'}</td>
                                    {canEditKas && (
                                        <td>
                                            <MobileActionMenu
                                                actions={[
                                                    { label: 'Edit', icon: <Edit2 size={14} />, onClick: () => openEdit(item) },
                                                    { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(item.id), danger: true }
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
                                                    onClick={() => handleDelete(item.id)}
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
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Pemasukan' : 'Tambah Pemasukan'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tanggal *</label>
                                    <input
                                        type="date"
                                        value={form.tanggal}
                                        onChange={e => setForm({ ...form, tanggal: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Sumber Pemasukan *</label>
                                    <input
                                        type="text"
                                        value={form.sumber}
                                        onChange={e => setForm({ ...form, sumber: e.target.value })}
                                        placeholder="Contoh: Donasi Bapak Ahmad"
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Kategori</label>
                                        <select
                                            value={form.kategori}
                                            onChange={e => setForm({ ...form, kategori: e.target.value })}
                                        >
                                            <option value="">Pilih Kategori</option>
                                            {kategoriList.map(k => (
                                                <option key={k.id} value={k.nama}>{k.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Jumlah (Rp) *</label>
                                        <input
                                            type="number"
                                            value={form.jumlah}
                                            onChange={e => setForm({ ...form, jumlah: e.target.value })}
                                            placeholder="0"
                                            min="0"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Keterangan</label>
                                    <textarea
                                        value={form.keterangan}
                                        onChange={e => setForm({ ...form, keterangan: e.target.value })}
                                        placeholder="Keterangan tambahan..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
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
        </div>
    )
}

export default KasPemasukanPage
