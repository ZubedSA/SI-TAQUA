import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
import { useKas, useKategoriPembayaran } from '../../hooks/useKeuangan'
import { useKasPemasukan } from '../../hooks/features/useKasPemasukan'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import PageHeader from '../../components/layout/PageHeader'
import StatsCard from '../../components/ui/StatsCard'
import DateRangePicker from '../../components/ui/DateRangePicker'
import SmartMonthYearFilter from '../../components/common/SmartMonthYearFilter'
import { useCalendar } from '../../context/CalendarContext'
import './Keuangan.css'


const KasPemasukanPage = () => {
    const { mode } = useCalendar()
    const { user, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const { canCreate, canUpdate, canDelete } = usePermissions()
    const showToast = useToast() // showToast is returned directly from context, not destructured

    // Permission check - admin dan bendahara
    const canEditKas = isAdmin() || isBendahara() || userProfile?.role === 'admin' || userProfile?.role === 'bendahara' || hasRole('admin') || hasRole('bendahara')

    // Filters State for hooks
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
    // Loading is handled by hook but we also have local loading for kategori? 
    // Actually hook handles main data loading.
    const { data: rawData = [], isLoading: loadingMain, error, refetch } = useKasPemasukan(filters)

    useEffect(() => {
        setLoading(loadingMain)
    }, [loadingMain])

    useEffect(() => {
        fetchKategori()
    }, [])

    // Error Handling
    useEffect(() => {
        if (error) {
            showToast.error('Gagal memuat data kas')
        }
    }, [error])

    // Fetch Kategori locally (could also be a hook, but keeping simple for now)
    const fetchKategori = async () => {
        try {
            const { data, error } = await supabase
                .from('kategori_pembayaran')
                .select('*')
                .eq('tipe', 'pemasukan')
                .eq('is_active', true)
                .order('nama')
            if (error) throw error
            setKategoriList(data || [])
        } catch {
            // Silent fail
        }
    }

    // Apply client-side filtering (Search only - Date is handled by Server/Hook)
    const filteredData = useMemo(() => {
        return rawData.filter(item => {
            let pass = true
            if (filters.search) {
                const term = filters.search.toLowerCase()
                pass = pass && (
                    item.sumber?.toLowerCase().includes(term) ||
                    item.keterangan?.toLowerCase().includes(term)
                )
            }
            // Optimization: Date filtering moved to server via hook
            return pass
        })
    }, [rawData, filters.search])

    // Original state kept for modal
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        sumber: '',
        kategori: '',
        jumlah: '',
        keterangan: ''
    })

    // Error handling


    // Removed manual useEffect fetching

    // Removed manual fetchKategori and fetchData functions

    // Modals State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null })
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        // Optimistic UI: Don't show loading, just close efficiently
        try {
            const payload = {
                ...form,
                jumlah: parseFloat(form.jumlah),
                created_by: user?.id
            }

            // 1. Close Modals IMMEDIATELY
            setSaveModal({ isOpen: false })
            setShowModal(false)

            // 2. Reset form AFTER ensuring payload is captured
            resetForm()

            // 3. Perform Background Operations
            if (editItem) {
                const { error } = await supabase
                    .from('kas_pemasukan')
                    .update(payload)
                    .eq('id', editItem.id)
                if (error) throw error

                showToast.success('Pemasukan berhasil diperbarui')

                // Audit Log - UPDATE
                try {
                    await logUpdate(
                        'kas_pemasukan',
                        payload.sumber,
                        `Update pemasukan: ${payload.sumber} - Rp ${Number(payload.jumlah).toLocaleString('id-ID')}`,
                        { sumber: editItem.sumber, jumlah: editItem.jumlah, kategori: editItem.kategori },
                        { sumber: payload.sumber, jumlah: payload.jumlah, kategori: payload.kategori }
                    )
                } catch {
                    // Audit log failed - non-critical
                }

            } else {
                const { error } = await supabase
                    .from('kas_pemasukan')
                    .insert([payload])
                if (error) throw error

                showToast.success('Pemasukan baru berhasil ditambahkan')

                // Audit Log - CREATE
                try {
                    await logCreate(
                        'kas_pemasukan',
                        payload.sumber,
                        `Tambah pemasukan: ${payload.sumber} - Rp ${Number(payload.jumlah).toLocaleString('id-ID')}`
                    )
                } catch {
                    // Audit log failed - non-critical
                }
            }

            // 4. Refresh Data (Background)
            if (refetch) await refetch()

        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
            // Form is already closed, so user just sees error toast. 
            // They can re-open form if needed.
        }
    }

    const confirmDelete = (item) => {
        setDeleteModal({ isOpen: true, item })
    }

    const handleDelete = async () => {
        const itemToDelete = deleteModal.item
        if (!itemToDelete) return

        try {
            const { error } = await supabase
                .from('kas_pemasukan')
                .delete()
                .eq('id', itemToDelete.id)
            if (error) throw error

            // Audit Log - DELETE
            await logDelete(
                'kas_pemasukan',
                itemToDelete.sumber,
                `Hapus pemasukan: ${itemToDelete.sumber} - Rp ${Number(itemToDelete.jumlah).toLocaleString('id-ID')}`
            )

            await refetch() // Updated: Use hook refetch instead of fetchData
            showToast.success('Data berhasil dihapus')
            setDeleteModal({ isOpen: false, item: null })
        } catch (err) {
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
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setShowModal(true)
    }

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Sumber', 'Kategori', 'Jumlah', 'Keterangan']
        const exportData = filteredData.map(d => ({
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
        const exportData = filteredData.map(d => ({
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
            data: filteredData.map(d => [
                formatDate(d.tanggal),
                d.sumber,
                d.kategori || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                d.keterangan || '-'
            ]),
            filename: 'laporan_pemasukan_kas',
            showTotal: true,
            totalLabel: 'Total Pemasukan',
            totalValue: filteredData.reduce((sum, d) => sum + Number(d.jumlah), 0),
            printedAt: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        })
        showToast.success('Laporan berhasil didownload')
    }

    const totalPemasukan = filteredData.reduce((sum, d) => sum + Number(d.jumlah), 0)

    return (
        <div className="keuangan-page" >
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
                        <button className="btn btn-primary" onClick={() => {
                            resetForm();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            setShowModal(true);
                        }}>
                            <Plus size={18} /> Tambah Pemasukan
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-card green">
                <div className="summary-content">
                    <span className="summary-label">Total Pemasukan</span>
                    <span className="summary-value">Rp {totalPemasukan.toLocaleString('id-ID')}</span>
                </div>
                <ArrowUpCircle size={40} className="summary-icon" />
            </div>




            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item?.sumber}
                message={`Yakin ingin menghapus pemasukan ini?`}
            />

            {/* Filters Bar */}
            <div className="filters-bar mt-6">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari sumber atau keterangan..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <DateRangePicker
                    startDate={filters.dateFrom}
                    endDate={filters.dateTo}
                    onChange={(start, end) => setFilters({
                        ...filters,
                        dateFrom: start,
                        dateTo: end,
                        bulan: '',
                        tahun: new Date().getFullYear()
                    })}
                />
                <div style={{ opacity: (filters.dateFrom || filters.dateTo) ? 0.5 : 1, pointerEvents: (filters.dateFrom || filters.dateTo) ? 'none' : 'auto' }}>
                    <SmartMonthYearFilter
                        filters={filters}
                        onFilterChange={setFilters}
                    />
                </div>
                <button className="btn btn-icon" onClick={refetch}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 w-16">No</th>
                                <th className="px-6 py-3">Tanggal</th>
                                <th className="px-6 py-3">Sumber</th>
                                <th className="px-6 py-3">Kategori</th>
                                <th className="px-6 py-3">Jumlah</th>
                                <th className="px-6 py-3">Keterangan</th>
                                {canEditKas && <th className="px-6 py-3 text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={canEditKas ? 7 : 6}><Spinner className="py-12" label="Memuat data pemasukan..." /></td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={canEditKas ? 7 : 6} className="p-8">
                                        <EmptyState
                                            icon={FileText}
                                            title="Belum ada data pemasukan"
                                            message={filters.search || filters.dateFrom ? "Tidak ditemukan data yang sesuai filter." : "Belum ada data pemasukan kas yang tercatat."}
                                            // Removed action button from empty state as form is now always visible
                                            actionLabel={null}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, i) => (
                                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${editItem?.id === item.id ? 'bg-amber-50' : ''}`}>
                                        <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.sumber}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {item.kategori || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-emerald-600 whitespace-nowrap">
                                            Rp {Number(item.jumlah).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs" title={item.keterangan}>{item.keterangan || '-'}</td>
                                        {canEditKas && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        className={`p-1.5 rounded-lg transition-colors ${editItem?.id === item.id ? 'bg-amber-100 text-amber-700' : 'text-amber-600 hover:bg-amber-50'}`}
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(item)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && createPortal(
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Pemasukan' : 'Tambah Pemasukan'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tanggal *</label>
                                    <DateRangePicker
                                        singleDate
                                        startDate={form.tanggal}
                                        onChange={(date) => setForm({ ...form, tanggal: date })}
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
                </div>,
                document.body
            )}

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item?.sumber}
                message={`Yakin ingin menghapus pemasukan ini?`}
            />

            {/* Save Confirmation Modal */}
            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Simpan Perubahan" : "Simpan Data"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan data pemasukan ini?' : 'Apakah Anda yakin ingin menambahkan data pemasukan baru ini?'}
                confirmLabel={editItem ? "Simpan" : "Tambah"}
                variant="success"
                isLoading={saving}
            />
        </div>
    )
}

export default KasPemasukanPage
