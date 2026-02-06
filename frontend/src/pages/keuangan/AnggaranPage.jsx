import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, PiggyBank, Download, RefreshCw, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import { useToast } from '../../context/ToastContext'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import DateRangePicker from '../../components/ui/DateRangePicker'
import { useCalendar } from '../../context/CalendarContext'
import './Keuangan.css'

const AnggaranPage = () => {
    const { mode } = useCalendar()
    const { user, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()
    // Multiple checks - admin dan bendahara bisa CRUD
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEditKas = adminCheck || bendaharaCheck
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filters, setFilters] = useState({ search: '', status: '' })
    const [form, setForm] = useState({
        nama_program: '',
        deskripsi: '',
        jumlah_diajukan: '',
        tanggal_pengajuan: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: result, error } = await supabase
                .from('anggaran')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setData(result || [])
        } catch (err) {
            // Error handled by UI state or silent
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
                nama_program: form.nama_program,
                deskripsi: form.deskripsi,
                jumlah_diajukan: parseFloat(form.jumlah_diajukan),
                tanggal_pengajuan: form.tanggal_pengajuan,
                status: 'Pending',
                created_by: user?.id
            }

            if (editItem) {
                const { error } = await supabase.from('anggaran').update(payload).eq('id', editItem.id)
                if (error) throw error

                // Audit Log - UPDATE
                await logUpdate(
                    'anggaran',
                    payload.nama_program,
                    `Update anggaran: ${payload.nama_program} - Rp ${Number(payload.jumlah_diajukan).toLocaleString('id-ID')}`,
                    { nama_program: editItem.nama_program, jumlah: editItem.jumlah_diajukan },
                    { nama_program: payload.nama_program, jumlah: payload.jumlah_diajukan }
                )
                showToast.success('Anggaran berhasil diperbarui')
            } else {
                const { error } = await supabase.from('anggaran').insert([payload])
                if (error) throw error

                // Audit Log - CREATE
                await logCreate(
                    'anggaran',
                    payload.nama_program,
                    `Ajukan anggaran baru: ${payload.nama_program} - Rp ${Number(payload.jumlah_diajukan).toLocaleString('id-ID')}`
                )
                showToast.success('Anggaran berhasil diajukan')
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
            const { error } = await supabase.from('anggaran').delete().eq('id', itemToDelete.id)
            if (error) throw error

            // Audit Log - DELETE
            await logDelete(
                'anggaran',
                itemToDelete.nama_program,
                `Hapus anggaran: ${itemToDelete.nama_program} - Rp ${Number(itemToDelete.jumlah_diajukan).toLocaleString('id-ID')}`
            )

            fetchData()
            setDeleteModal({ isOpen: false, item: null })
            showToast.success('Anggaran berhasil dihapus')
        } catch (err) {
            showToast.error('Error: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            nama_program: '',
            deskripsi: '',
            jumlah_diajukan: '',
            tanggal_pengajuan: new Date().toISOString().split('T')[0]
        })
        setEditItem(null)
    }

    const openEdit = (item) => {
        if (item.status !== 'Pending') {
            showToast.error('Hanya anggaran dengan status Pending yang dapat diedit')
            return
        }
        setEditItem(item)
        setForm({
            nama_program: item.nama_program,
            deskripsi: item.deskripsi || '',
            jumlah_diajukan: item.jumlah_diajukan.toString(),
            tanggal_pengajuan: item.tanggal_pengajuan
        })
        setShowModal(true)
    }

    const handleDownloadExcel = () => {
        const columns = ['Program', 'Jumlah Diajukan', 'Jumlah Disetujui', 'Tanggal', 'Status']
        const exportData = filteredData.map(d => ({
            Program: d.nama_program,
            'Jumlah Diajukan': Number(d.jumlah_diajukan),
            'Jumlah Disetujui': d.jumlah_disetujui ? Number(d.jumlah_disetujui) : 0,
            Tanggal: new Date(d.tanggal_pengajuan).toLocaleDateString('id-ID'),
            Status: d.status
        }))
        exportToExcel(exportData, columns, 'laporan_anggaran')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Program', 'Jumlah Diajukan', 'Jumlah Disetujui', 'Tanggal', 'Status']
        const exportData = filteredData.map(d => ({
            Program: d.nama_program,
            'Jumlah Diajukan': Number(d.jumlah_diajukan),
            'Jumlah Disetujui': d.jumlah_disetujui ? Number(d.jumlah_disetujui) : 0,
            Tanggal: new Date(d.tanggal_pengajuan).toLocaleDateString('id-ID'),
            Status: d.status
        }))
        exportToCSV(exportData, columns, 'laporan_anggaran')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Pengajuan Anggaran',
            columns: ['Program', 'Jumlah Diajukan', 'Tanggal', 'Status'],
            data: filteredData.map(d => [
                d.nama_program,
                `Rp ${Number(d.jumlah_diajukan).toLocaleString('id-ID')}`,
                new Date(d.tanggal_pengajuan).toLocaleDateString('id-ID'),
                d.status
            ]),
            filename: 'laporan_anggaran',
            showTotal: true,
            totalLabel: 'Total Diajukan',
            totalValue: filteredData.reduce((sum, d) => sum + Number(d.jumlah_diajukan), 0)
        })
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Disetujui': return 'disetujui'
            case 'Ditolak': return 'ditolak'
            case 'Selesai': return 'lunas'
            default: return 'pending'
        }
    }

    const filteredData = data.filter(d => {
        const matchSearch = d.nama_program.toLowerCase().includes(filters.search.toLowerCase())
        const matchStatus = !filters.status || d.status === filters.status
        return matchSearch && matchStatus
    })

    const totalDiajukan = filteredData.reduce((sum, d) => sum + Number(d.jumlah_diajukan), 0)

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <PiggyBank className="title-icon blue" /> Pengajuan Anggaran
                    </h1>
                    <p className="page-subtitle">Ajukan anggaran untuk program pesantren</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canEditKas && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Ajukan Anggaran
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-card blue">
                <div className="summary-content">
                    <span className="summary-label">Total Dana Diajukan</span>
                    <span className="summary-value">Rp {totalDiajukan.toLocaleString('id-ID')}</span>
                </div>
                <PiggyBank size={40} className="summary-icon" />
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari program..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">Semua Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Ditolak">Ditolak</option>
                    <option value="Selesai">Selesai</option>
                </select>
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : filteredData.length === 0 ? (
                    <div className="empty-state">Belum ada pengajuan anggaran</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Program</th>
                                    <th>Jumlah Diajukan</th>
                                    <th>Disetujui</th>
                                    <th>Tanggal</th>
                                    <th>Status</th>
                                    {canEditKas && <th>Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, i) => (
                                    <tr key={item.id}>
                                        <td>{i + 1}</td>
                                        <td>
                                            <div className="cell-santri">
                                                <strong>{item.nama_program}</strong>
                                                <small>{item.deskripsi?.substring(0, 50) || '-'}</small>
                                            </div>
                                        </td>
                                        <td className="amount">Rp {Number(item.jumlah_diajukan).toLocaleString('id-ID')}</td>
                                        <td className="amount green">
                                            {item.jumlah_disetujui ? `Rp ${Number(item.jumlah_disetujui).toLocaleString('id-ID')}` : '-'}
                                        </td>
                                        <td>{new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID')}</td>
                                        <td><span className={`status-badge ${getStatusClass(item.status)}`}>{item.status}</span></td>
                                        {canEditKas && (
                                            <td>
                                                <div className="action-buttons" style={{ display: 'flex', gap: '4px' }}>
                                                    <MobileActionMenu
                                                        actions={[
                                                            { label: 'Edit', icon: <Edit2 size={14} />, onClick: () => openEdit(item) },
                                                            { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => confirmDelete(item), danger: true },
                                                            { label: 'Detail', icon: <Eye size={14} />, onClick: () => { } }
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
                                                                cursor: 'pointer'
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
                                                        <button
                                                            title="Detail"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '6px',
                                                                background: '#dbeafe',
                                                                color: '#2563eb',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </MobileActionMenu>
                                                </div>
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
                            <h3>{editItem ? 'Edit Anggaran' : 'Ajukan Anggaran Baru'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nama Program *</label>
                                    <input
                                        type="text"
                                        value={form.nama_program}
                                        onChange={e => setForm({ ...form, nama_program: e.target.value })}
                                        placeholder="Contoh: Renovasi Asrama"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Deskripsi</label>
                                    <textarea
                                        value={form.deskripsi}
                                        onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                                        placeholder="Jelaskan detail program..."
                                        rows={3}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Jumlah Dana (Rp) *</label>
                                        <input
                                            type="number"
                                            value={form.jumlah_diajukan}
                                            onChange={e => setForm({ ...form, jumlah_diajukan: e.target.value })}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tanggal Pengajuan</label>
                                        <DateRangePicker
                                            singleDate
                                            startDate={form.tanggal_pengajuan}
                                            onChange={(date) => setForm({ ...form, tanggal_pengajuan: date })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><RefreshCw size={14} className="spin" /> Menyimpan...</> : (editItem ? 'Simpan' : 'Ajukan')}
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
                itemName={deleteModal.item?.nama_program}
                message={`Yakin ingin menghapus anggaran ${deleteModal.item?.nama_program || 'ini'}?`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Simpan Perubahan" : "Konfirmasi Pengajuan"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan anggaran ini?' : `Apakah Anda yakin ingin mengajukan anggaran untuk program ${form.nama_program}?`}
                confirmLabel={editItem ? "Simpan" : "Ajukan"}
                variant="success"
                isLoading={saving}
            />
        </div>
    )
}

export default AnggaranPage
