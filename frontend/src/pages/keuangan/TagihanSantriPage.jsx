import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Receipt, Download, RefreshCw, MessageCircle, AlertCircle, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../hooks/usePermissions'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { sendWhatsApp, templateTagihanSantri, templatePengingatTagihan } from '../../utils/whatsapp'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { useKategoriPembayaran } from '../../hooks/useKeuangan'
import { useTagihanSantri } from '../../hooks/features/useTagihanSantri'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import './Keuangan.css'

const TagihanSantriPage = () => {
    const { user } = useAuth()
    const { canCreate, canUpdate, canDelete } = usePermissions()
    const showToast = useToast()
    const [santriList, setSantriList] = useState([])
    const [angkatanList, setAngkatanList] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filters, setFilters] = useState({ search: '', status: '', kategori: '' })

    const [loading, setLoading] = useState(true)
    const [kategoriList, setKategoriList] = useState([])

    // Performance Update: Use Cached Hook
    const { data: rawData = [], isLoading: loadingMain, error, refetch } = useTagihanSantri(filters)

    useEffect(() => {
        setLoading(loadingMain)
    }, [loadingMain])

    useEffect(() => {
        fetchKategori()
        fetchSantriOptions()
    }, [])

    // Error Handling
    useEffect(() => {
        if (error) {
            console.error('Error loading tagihan:', error)
            showToast.error('Gagal memuat data tagihan') // Generic error for safety
        }
    }, [error])

    // Client-side filtering for Search (efficient for <2000 items)
    const data = useMemo(() => {
        // Fix for 400 Error: Join client-side instead of server-side
        const enrichedData = rawData.map(item => ({
            ...item,
            santri: santriList.find(s => s.id === item.santri_id) || {},
            kategori: kategoriList.find(k => k.id === item.kategori_id) || {}
        }))

        let result = enrichedData
        if (filters.search) {
            const term = filters.search.toLowerCase()
            result = result.filter(item =>
                item.santri?.nama?.toLowerCase().includes(term) ||
                item.santri?.nis?.toLowerCase().includes(term)
            )
        }
        return result
    }, [rawData, filters.search, santriList, kategoriList])

    const fetchKategori = async () => {
        try {
            const { data, error } = await supabase
                .from('kategori_pembayaran')
                .select('*')
                .eq('tipe', 'pembayaran')
                .eq('is_active', true)
                .order('nama')
            if (error) throw error
            setKategoriList(data || [])
        } catch (error) {
            console.error('Error loading kategori:', error)
        }
    }

    const fetchSantriOptions = async () => {
        // Keep manual fetch for Santri list used in Modal (could be hook too but separate)
        const [santriRes] = await Promise.all([
            supabase.from('santri').select('id, nama, nis, no_telp_wali, angkatan_id').eq('status', 'Aktif').order('nama')
        ])
        const santris = santriRes.data || []
        setSantriList(santris)

        // Fetch angkatan data
        const angkatanIds = [...new Set(santris.map(s => s.angkatan_id).filter(Boolean))]
        if (angkatanIds.length > 0) {
            const { data: angkatanData } = await supabase
                .from('angkatan')
                .select('id, nama')
                .in('id', angkatanIds)
                .order('nama')
            setAngkatanList(angkatanData || [])
        } else {
            setAngkatanList([])
        }
    }

    // Manual fetchData removed for tagihan and kategori in favor of hooks

    // Modals State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null })
    const [saveModal, setSaveModal] = useState({ isOpen: false })
    const [saving, setSaving] = useState(false)

    const handleFormSubmit = (e) => {
        e.preventDefault()
        // Validation for bulk mode
        if (!editItem && !form.angkatan_id) {
            alert('Pilih angkatan terlebih dahulu')
            return
        }
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            // Calculate Due Date: 10th of the selected month
            const dueDate = `${form.jatuh_tempo_bulan}-10`
            const kategori = kategoriList.find(k => k.id === form.kategori_id)

            const basePayload = {
                kategori_id: form.kategori_id,
                jumlah: parseFloat(form.jumlah),
                jatuh_tempo: dueDate,
                keterangan: form.keterangan || '',
                created_by: user?.id
            }

            if (editItem) {
                // Update Single
                const { error } = await supabase.from('tagihan_santri').update(basePayload).eq('id', editItem.id)
                if (error) throw error

                // Audit Log - UPDATE
                await logUpdate(
                    'tagihan_santri',
                    editItem.santri?.nama || 'Unknown',
                    `Update tagihan santri: ${editItem.santri?.nama} - ${kategori?.nama} - Rp ${Number(basePayload.jumlah).toLocaleString('id-ID')}`,
                    { jumlah: editItem.jumlah, kategori: editItem.kategori?.nama },
                    { jumlah: basePayload.jumlah, kategori: kategori?.nama }
                )
                showToast.success('Tagihan berhasil diperbarui')
            } else {
                // Bulk Insert by angkatan
                const targetSantris = santriList.filter(s => s.angkatan_id === form.angkatan_id)
                const angkatan = angkatanList.find(a => a.id === form.angkatan_id)

                if (targetSantris.length === 0) {
                    showToast.error('Tidak ada santri pada angkatan yang dipilih')
                    return
                }

                // Prepare bulk data
                const bulkData = targetSantris.map(s => ({
                    ...basePayload,
                    santri_id: s.id
                }))

                const { error } = await supabase.from('tagihan_santri').insert(bulkData)
                if (error) throw error

                // Audit Log - CREATE (bulk)
                await logCreate(
                    'tagihan_santri',
                    `Bulk - ${angkatan?.nama}`,
                    `Buat tagihan massal: ${targetSantris.length} santri - ${kategori?.nama} - Rp ${Number(basePayload.jumlah).toLocaleString('id-ID')}`
                )

                showToast.success(`Berhasil membuat tagihan untuk ${targetSantris.length} santri`)
            }

            setSaveModal({ isOpen: false })
            setShowModal(false)
            resetForm()
            await refetch()
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
            const { error } = await supabase.from('tagihan_santri').delete().eq('id', itemToDelete.id)
            if (error) throw error

            // Audit Log - DELETE
            await logDelete(
                'tagihan_santri',
                itemToDelete.santri?.nama || 'Unknown',
                `Hapus tagihan: ${itemToDelete.santri?.nama} - ${itemToDelete.kategori?.nama} - Rp ${Number(itemToDelete.jumlah).toLocaleString('id-ID')}`
            )

            await refetch()
            showToast.success('Tagihan berhasil dihapus')
            setDeleteModal({ isOpen: false, item: null })
        } catch (err) {
            showToast.error('Error: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            angkatan_id: '',
            santri_id: '',
            kategori_id: '',
            jumlah: '',
            jatuh_tempo_bulan: new Date().toISOString().slice(0, 7),
            keterangan: ''
        })
        setEditItem(null)
        setIsBulkMode(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            angkatan_id: '',
            santri_id: item.santri_id,
            kategori_id: item.kategori_id,
            jumlah: item.jumlah.toString(),
            jatuh_tempo_bulan: item.jatuh_tempo.slice(0, 7),
            keterangan: item.keterangan || ''
        })
        setIsBulkMode(false)
        setShowModal(true)
    }

    const handleKategoriChange = (kategoriId) => {
        const kat = kategoriList.find(k => k.id === kategoriId)
        setForm({
            ...form,
            kategori_id: kategoriId,
            jumlah: kat?.nominal_default?.toString() || form.jumlah
        })
    }

    // handleAngkatanToggle removed - using dropdown now

    const handleSendWhatsApp = (item) => {
        const phone = item.santri?.no_telp_wali
        if (!phone) {
            alert('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const message = templateTagihanSantri({
            namaSantri: item.santri?.nama,
            kategori: item.kategori?.nama,
            jumlah: item.jumlah,
            jatuhTempo: item.jatuh_tempo
        })

        sendWhatsApp(phone, message)
    }

    const handleDownloadExcel = () => {
        const columns = ['Santri', 'NIS', 'Kategori', 'Jumlah', 'Periode', 'Status']
        const exportData = filteredData.map(d => ({
            Santri: d.santri?.nama || '-',
            NIS: d.santri?.nis || '-',
            Kategori: d.kategori?.nama || '-',
            Jumlah: Number(d.jumlah),
            Periode: new Date(d.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            Status: d.status
        }))
        exportToExcel(exportData, columns, 'laporan_tagihan_santri')
    }

    const handleDownloadCSV = () => {
        const columns = ['Santri', 'NIS', 'Kategori', 'Jumlah', 'Periode', 'Status']
        const exportData = filteredData.map(d => ({
            Santri: d.santri?.nama || '-',
            NIS: d.santri?.nis || '-',
            Kategori: d.kategori?.nama || '-',
            Jumlah: Number(d.jumlah),
            Periode: new Date(d.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            Status: d.status
        }))
        exportToCSV(exportData, columns, 'laporan_tagihan_santri')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Tagihan Santri',
            columns: ['Santri', 'NIS', 'Kategori', 'Jumlah', 'Periode', 'Status'],
            data: filteredData.map(d => [
                d.santri?.nama || '-',
                d.santri?.nis || '-',
                d.kategori?.nama || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                new Date(d.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                d.status
            ]),
            filename: 'laporan_tagihan_santri',
            showTotal: true,
            totalLabel: 'Total Tagihan',
            totalValue: filteredData.reduce((sum, d) => sum + Number(d.jumlah), 0)
        })
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Lunas': return 'lunas'
            case 'Sebagian': return 'sebagian'
            default: return 'belum'
        }
    }

    const isOverdue = (jatuhTempo) => {
        return new Date(jatuhTempo) < new Date()
    }

    const filteredData = data.filter(d => {
        const matchSearch = d.santri?.nama?.toLowerCase().includes(filters.search.toLowerCase()) ||
            d.santri?.nis?.includes(filters.search)
        const matchStatus = !filters.status || d.status === filters.status
        const matchKategori = !filters.kategori || d.kategori_id === filters.kategori
        return matchSearch && matchStatus && matchKategori
    })

    const totalTagihan = filteredData.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const belumLunas = filteredData.filter(d => d.status !== 'Lunas').length

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Receipt className="title-icon blue" /> Tagihan Santri
                    </h1>
                    <p className="page-subtitle">Kelola tagihan pembayaran santri</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canCreate('tagihan') && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Buat Tagihan
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-grid">
                <div className="summary-card blue">
                    <div className="summary-content">
                        <span className="summary-label">Total Tagihan</span>
                        <span className="summary-value">Rp {totalTagihan.toLocaleString('id-ID')}</span>
                    </div>
                    <Receipt size={40} className="summary-icon" />
                </div>
                <div className="summary-card yellow">
                    <div className="summary-content">
                        <span className="summary-label">Belum Lunas</span>
                        <span className="summary-value">{belumLunas} tagihan</span>
                    </div>
                    <AlertCircle size={40} className="summary-icon" />
                </div>
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari santri..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">Semua Status</option>
                    <option value="Belum Lunas">Belum Lunas</option>
                    <option value="Sebagian">Sebagian</option>
                    <option value="Lunas">Lunas</option>
                </select>
                <select value={filters.kategori} onChange={e => setFilters({ ...filters, kategori: e.target.value })}>
                    <option value="">Semua Kategori</option>
                    {kategoriList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                <button className="btn btn-icon" onClick={refetch}><RefreshCw size={18} /></button>
            </div>

            <div className="data-card">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : filteredData.length === 0 ? (
                    <div className="empty-state">Belum ada tagihan</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Santri</th>
                                <th>Kategori</th>
                                <th>Jumlah</th>
                                <th>Periode</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item, i) => (
                                <tr key={item.id} className={isOverdue(item.jatuh_tempo) && item.status !== 'Lunas' ? 'row-overdue' : ''}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <div className="cell-santri">
                                            <strong>{item.santri?.nama}</strong>
                                            <small>{item.santri?.nis} • {item.santri?.kelas?.nama || '-'}</small>
                                        </div>
                                    </td>
                                    <td><span className="badge blue">{item.kategori?.nama || '-'}</span></td>
                                    <td className="amount">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                                    <td>
                                        {new Date(item.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                        {isOverdue(item.jatuh_tempo) && item.status !== 'Lunas' && (
                                            <span className="overdue-badge">Terlambat</span>
                                        )}
                                    </td>
                                    <td><span className={`status-badge ${getStatusClass(item.status)}`}>{item.status}</span></td>
                                    <td>
                                        <MobileActionMenu
                                            actions={[
                                                { icon: <MessageCircle size={16} />, label: 'WhatsApp', onClick: () => handleSendWhatsApp(item) },
                                                ...(canUpdate('tagihan') ? [{ icon: <Edit2 size={16} />, label: 'Edit', onClick: () => openEdit(item) }] : []),
                                                ...(canDelete('tagihan') ? [{ icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => confirmDelete(item), danger: true }] : [])
                                            ]}
                                        >
                                            <button className="btn-icon-sm success" onClick={() => handleSendWhatsApp(item)} title="Kirim WhatsApp">
                                                <MessageCircle size={16} />
                                            </button>
                                            {canUpdate('tagihan') && (
                                                <button className="btn-icon-sm" onClick={() => openEdit(item)}><Edit2 size={16} /></button>
                                            )}
                                            {canDelete('tagihan') && (
                                                <button className="btn-icon-sm danger" onClick={() => confirmDelete(item)}><Trash2 size={16} /></button>
                                            )}
                                        </MobileActionMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Tagihan' : 'Buat Tagihan (Per Angkatan)'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                {!editItem && (
                                    <div className="form-group">
                                        <label>Pilih Angkatan *</label>
                                        <select
                                            value={form.angkatan_id}
                                            onChange={e => setForm({ ...form, angkatan_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Pilih Angkatan --</option>
                                            {angkatanList.map(ang => (
                                                <option key={ang.id} value={ang.id}>{ang.nama}</option>
                                            ))}
                                        </select>
                                        {angkatanList.length === 0 && (
                                            <small className="text-muted" style={{ color: 'red' }}>Belum ada data angkatan di santri</small>
                                        )}
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Kategori *</label>
                                        <select value={form.kategori_id} onChange={e => handleKategoriChange(e.target.value)} required>
                                            <option value="">Pilih Kategori</option>
                                            {kategoriList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Jumlah (Rp) *</label>
                                        <input type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} min="0" required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Periode (Bulan & Tahun) *</label>
                                    <input
                                        type="month"
                                        value={form.jatuh_tempo_bulan}
                                        onChange={e => setForm({ ...form, jatuh_tempo_bulan: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Keterangan</label>
                                    <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} rows={3} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><RefreshCw size={14} className="spin" /> Menyimpan...</> : (editItem ? 'Simpan' : 'Buat Tagihan Massal')}
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
                itemName={deleteModal.item?.santri?.nama ? `${deleteModal.item.kategori?.nama} - ${deleteModal.item.santri.nama}` : 'Tagihan ini'}
                message={`Yakin ingin menghapus tagihan ini?`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Simpan Perubahan" : "Konfirmasi Buat Tagihan"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan tagihan ini?' : `Apakah Anda yakin ingin membuat tagihan massal untuk angkatan terpilih?`}
                confirmLabel={editItem ? "Simpan" : "Buat Tagihan"}
                variant="success"
                isLoading={saving}
            />
        </div>
    )
}

export default TagihanSantriPage
