import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, TrendingUp, Download, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import { useToast } from '../../context/ToastContext'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import DateRangePicker from '../../components/ui/DateRangePicker'
import { useCalendar } from '../../context/CalendarContext'
import './Keuangan.css'

const RealisasiDanaPage = () => {
    const { mode, formatDate } = useCalendar()
    const { user, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()
    // Multiple checks - admin dan bendahara bisa CRUD
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEditKas = adminCheck || bendaharaCheck
    const [data, setData] = useState([])
    const [anggaranList, setAnggaranList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filters, setFilters] = useState({ search: '', anggaran: '' })
    const [form, setForm] = useState({
        anggaran_id: '',
        jumlah_terpakai: '',
        tanggal: new Date().toISOString().split('T')[0],
        keperluan: '',
        keterangan: ''
    })

    useEffect(() => {
        fetchData()
        fetchAnggaran()
    }, [])

    const fetchAnggaran = async () => {
        const { data } = await supabase
            .from('anggaran')
            .select('*')
            .eq('status', 'Disetujui')
            .order('nama_program')
        setAnggaranList(data || [])
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: result, error } = await supabase
                .from('realisasi_dana')
                .select('*, anggaran:anggaran_id(nama_program, jumlah_disetujui)')
                .order('tanggal', { ascending: false })
            if (error) throw error
            setData(result || [])
        } catch {
            showToast.error('Gagal memuat data')
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
            const anggaran = anggaranList.find(a => a.id === form.anggaran_id)
            const payload = {
                anggaran_id: form.anggaran_id,
                jumlah_terpakai: parseFloat(form.jumlah_terpakai),
                tanggal: form.tanggal,
                keperluan: form.keperluan,
                keterangan: form.keterangan || '',
                created_by: user?.id
            }

            if (editItem) {
                const { error } = await supabase.from('realisasi_dana').update(payload).eq('id', editItem.id)
                if (error) throw error

                // Audit Log - UPDATE
                await logUpdate(
                    'realisasi_dana',
                    payload.keperluan || anggaran?.nama_program,
                    `Update realisasi dana: ${anggaran?.nama_program} - ${payload.keperluan} - Rp ${Number(payload.jumlah_terpakai).toLocaleString('id-ID')}`,
                    { jumlah: editItem.jumlah_terpakai, keperluan: editItem.keperluan },
                    { jumlah: payload.jumlah_terpakai, keperluan: payload.keperluan }
                )
                showToast.success('Realisasi dana berhasil diperbarui')
            } else {
                const { error } = await supabase.from('realisasi_dana').insert([payload])
                if (error) throw error

                // Add to kas_pengeluaran
                await supabase.from('kas_pengeluaran').insert([{
                    tanggal: form.tanggal,
                    keperluan: `Realisasi: ${anggaran?.nama_program} - ${form.keperluan}`,
                    kategori: 'Kegiatan',
                    jumlah: parseFloat(form.jumlah_terpakai),
                    keterangan: form.keterangan || '',
                    created_by: user?.id
                }])

                // Audit Log - CREATE
                await logCreate(
                    'realisasi_dana',
                    payload.keperluan || anggaran?.nama_program,
                    `Tambah realisasi dana: ${anggaran?.nama_program} - ${payload.keperluan} - Rp ${Number(payload.jumlah_terpakai).toLocaleString('id-ID')}`
                )
                showToast.success('Realisasi dana berhasil disimpan')
            }

            setSaveModal({ isOpen: false })
            setShowModal(false)
            resetForm()
            fetchData()
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
            const { error } = await supabase.from('realisasi_dana').delete().eq('id', itemToDelete.id)
            if (error) throw error

            // Audit Log - DELETE
            await logDelete(
                'realisasi_dana',
                itemToDelete.keperluan || itemToDelete.anggaran?.nama_program,
                `Hapus realisasi dana: ${itemToDelete.anggaran?.nama_program} - Rp ${Number(itemToDelete.jumlah_terpakai).toLocaleString('id-ID')}`
            )

            fetchData()
            setDeleteModal({ isOpen: false, item: null })
            showToast.success('Realisasi dana berhasil dihapus')
        } catch (err) {
            showToast.error('Error: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            anggaran_id: '',
            jumlah_terpakai: '',
            tanggal: new Date().toISOString().split('T')[0],
            keperluan: '',
            keterangan: ''
        })
        setEditItem(null)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            anggaran_id: item.anggaran_id,
            jumlah_terpakai: item.jumlah_terpakai.toString(),
            tanggal: item.tanggal,
            keperluan: item.keperluan || '',
            keterangan: item.keterangan || ''
        })
        setShowModal(true)
    }

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Program', 'Keperluan', 'Jumlah']
        const exportData = data.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Program: d.anggaran?.nama_program || '-',
            Keperluan: d.keperluan || '-',
            Jumlah: Number(d.jumlah_terpakai)
        }))
        exportToExcel(exportData, columns, 'laporan_realisasi_dana')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Program', 'Keperluan', 'Jumlah']
        const exportData = data.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Program: d.anggaran?.nama_program || '-',
            Keperluan: d.keperluan || '-',
            Jumlah: Number(d.jumlah_terpakai)
        }))
        exportToCSV(exportData, columns, 'laporan_realisasi_dana')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Realisasi Dana',
            columns: ['Tanggal', 'Program', 'Keperluan', 'Jumlah'],
            data: data.map(d => [
                formatDate(d.tanggal), // Use standardized formatter
                d.anggaran?.nama_program || '-',
                d.keperluan || '-',
                `Rp ${Number(d.jumlah_terpakai).toLocaleString('id-ID')}`
            ]),
            filename: 'laporan_realisasi_dana',
            showTotal: true,
            totalLabel: 'Total Realisasi',
            totalValue: data.reduce((sum, d) => sum + Number(d.jumlah_terpakai), 0),
            printedAt: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) // Pass formatted print date
        })
    }

    const totalRealisasi = data.reduce((sum, d) => sum + Number(d.jumlah_terpakai), 0)

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <TrendingUp className="title-icon green" /> Realisasi Dana
                    </h1>
                    <p className="page-subtitle">Catat penggunaan dana dari anggaran yang disetujui</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canEditKas && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Tambah Realisasi
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-card green">
                <div className="summary-content">
                    <span className="summary-label">Total Realisasi Dana</span>
                    <span className="summary-value">Rp {totalRealisasi.toLocaleString('id-ID')}</span>
                </div>
                <TrendingUp size={40} className="summary-icon" />
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : data.length === 0 ? (
                    <div className="empty-state">Belum ada realisasi dana</div>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'Tanggal', render: (row) => new Date(row.tanggal).toLocaleDateString('id-ID') },
                            { 
                                header: 'Program', 
                                render: (row) => (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                        {row.anggaran?.nama_program || '-'}
                                    </span>
                                )
                            },
                            { header: 'Keperluan', accessor: 'keperluan', className: 'font-medium text-gray-900', hideOnMobile: true },
                            { 
                                header: 'Jumlah', 
                                render: (row) => <span className="font-mono font-bold text-red-600 whitespace-nowrap">Rp {Number(row.jumlah_terpakai).toLocaleString('id-ID')}</span>
                            },
                            ...(canEditKas ? [{
                                header: 'Aksi',
                                hideOnMobile: true,
                                className: 'text-right',
                                render: (row) => (
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(row)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                                        <button onClick={() => confirmDelete(row)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                                    </div>
                                )
                            }] : [])
                        ]}
                        data={data}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.keperluan || 'Pengeluaran'}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 w-max bg-blue-50 text-blue-700 border border-blue-200">
                                    {row.anggaran?.nama_program || '-'}
                                </span>
                            </div>
                        )}
                        mobileCardActions={(row) => canEditKas ? (
                            <>
                                <button onClick={() => openEdit(row)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => confirmDelete(row)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </>
                        ) : null}
                    />
                )}
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Realisasi' : 'Tambah Realisasi Dana'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Program Anggaran *</label>
                                    <select
                                        value={form.anggaran_id}
                                        onChange={e => setForm({ ...form, anggaran_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Pilih Anggaran</option>
                                        {anggaranList.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.nama_program} (Rp {Number(a.jumlah_disetujui).toLocaleString('id-ID')})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Jumlah (Rp) *</label>
                                        <input
                                            type="number"
                                            value={form.jumlah_terpakai}
                                            onChange={e => setForm({ ...form, jumlah_terpakai: e.target.value })}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tanggal *</label>
                                        <DateRangePicker
                                            singleDate
                                            startDate={form.tanggal}
                                            onChange={(date) => setForm({ ...form, tanggal: date })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Keperluan</label>
                                    <input
                                        type="text"
                                        value={form.keperluan}
                                        onChange={e => setForm({ ...form, keperluan: e.target.value })}
                                        placeholder="Contoh: Pembelian material"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Keterangan</label>
                                    <textarea
                                        value={form.keterangan}
                                        onChange={e => setForm({ ...form, keterangan: e.target.value })}
                                        rows={2}
                                    />
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
                itemName={deleteModal.item?.keperluan || deleteModal.item?.anggaran?.nama_program}
                message={`Yakin ingin menghapus realisasi dana ini?`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Simpan Perubahan" : "Konfirmasi Realisasi"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan realisasi ini?' : `Apakah Anda yakin ingin menyimpan realisasi dana sebesar Rp ${Number(form.jumlah_terpakai).toLocaleString('id-ID')}?`}
                confirmLabel={editItem ? "Simpan" : "Simpan"}
                variant="success"
                isLoading={saving}
            />
        </div>
    )
}

export default RealisasiDanaPage
