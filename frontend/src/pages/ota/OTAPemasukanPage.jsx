import { useState, useEffect, useMemo } from 'react'
import {
    Plus, Search, Edit2, Trash2, Download, Filter, RefreshCw, X,
    ArrowUpCircle, Calendar, MessageCircle, FileText, Printer
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { useOTAPemasukan, useOrangTuaAsuh } from '../../hooks/useOTA'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { sendWhatsApp, createMessage } from '../../utils/whatsapp'
import './OTA.css'

/**
 * OTA Pemasukan Page - Keuangan Pemasukan
 * Full CRUD with WhatsApp confirmation
 */
const OTAPemasukanPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
    const [filterYear, setFilterYear] = useState(new Date().getFullYear())

    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        ota_id: '',
        jumlah: '',
        metode: 'Transfer',
        keterangan: ''
    })

    const [showDownloadMenu, setShowDownloadMenu] = useState(false)

    const [data, setData] = useState([])
    const [otaList, setOtaList] = useState([])

    useEffect(() => {
        fetchData()
        fetchOTA()
    }, [])

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('ota_pemasukan')
                .select('*, ota:orang_tua_asuh!ota_id(id, nama, no_hp)')
                .order('tanggal', { ascending: false })
            if (error) throw error
            setData(data || [])
        } catch (err) {
            console.error('Error fetching data:', err)
            showToast.error('Gagal memuat data pemasukan')
        } finally {
            setLoading(false)
        }
    }

    const fetchOTA = async () => {
        try {
            const { data, error } = await supabase
                .from('orang_tua_asuh')
                .select('*')
                .eq('status', true)
                .order('nama')
            if (error) throw error
            setOtaList(data || [])
        } catch (err) {
            console.error('Error fetching OTA:', err)
        }
    }

    // Removed fetchAllData manual call

    // Filter data
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const d = new Date(item.tanggal)
            const yearMatch = d.getFullYear() === Number(filterYear)
            const monthMatch = filterMonth === 'all' || d.getMonth() + 1 === Number(filterMonth)
            const searchMatch = !search ||
                item.ota?.nama?.toLowerCase().includes(search.toLowerCase()) ||
                item.keterangan?.toLowerCase().includes(search.toLowerCase())
            return yearMatch && monthMatch && searchMatch
        })
    }, [data, filterYear, filterMonth, search])

    // Calculate total
    const totalPemasukan = useMemo(() =>
        filteredData.reduce((sum, item) => sum + Number(item.jumlah), 0)
        , [filteredData])

    const formatRupiah = (num) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

    const formatDate = (dateStr) =>
        new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

    const openAdd = () => {
        setEditItem(null)
        setFormData({
            tanggal: new Date().toISOString().split('T')[0],
            ota_id: '',
            jumlah: '',
            metode: 'Transfer',
            keterangan: ''
        })
        setShowModal(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setFormData({
            tanggal: item.tanggal,
            ota_id: item.ota_id || '',
            jumlah: item.jumlah.toString(),
            metode: item.metode || 'Transfer',
            keterangan: item.keterangan || ''
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditItem(null)
    }

    // WhatsApp confirmation helper
    const sendWhatsAppConfirmation = (ota, nominal, tanggal) => {
        if (!ota?.no_hp) return

        const formattedDate = new Date(tanggal).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
        const formattedNominal = formatRupiah(nominal)

        const message = createMessage({
            intro: `KONFIRMASI DONASI OTA`,
            data: [
                `Terima kasih atas donasi Bapak/Ibu *${ota.nama}* untuk program Orang Tua Asuh.`,
                { label: 'Tanggal', value: formattedDate },
                { label: 'Nominal', value: formattedNominal }
            ],
            closing: "Semoga menjadi amal jariyah yang diterima Allah SWT."
        })

        sendWhatsApp(ota.no_hp, message)
    }

    // Save Confirmation State
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()

        if (!formData.ota_id) {
            showToast.error('Pilih OTA terlebih dahulu')
            return
        }
        if (!formData.jumlah || Number(formData.jumlah) <= 0) {
            showToast.error('Nominal harus lebih dari 0')
            return
        }

        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            const payload = {
                tanggal: formData.tanggal,
                ota_id: formData.ota_id,
                jumlah: Number(formData.jumlah),
                metode: formData.metode,
                keterangan: formData.keterangan.trim() || null
            }

            if (editItem) {
                const { error } = await supabase
                    .from('ota_pemasukan')
                    .update(payload)
                    .eq('id', editItem.id)

                if (error) throw error
                showToast.success('Data pemasukan berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('ota_pemasukan')
                    .insert([payload])

                if (error) throw error
                showToast.success('Pemasukan berhasil ditambahkan')

                // Send WhatsApp confirmation for NEW entries
                const selectedOta = otaList.find(o => o.id === formData.ota_id)
                if (selectedOta?.no_hp) {
                    // Use a small timeout to allow toast to show first
                    setTimeout(() => {
                        if (confirm('Kirim konfirmasi WhatsApp ke OTA?')) {
                            sendWhatsAppConfirmation(selectedOta, payload.jumlah, payload.tanggal)
                        }
                    }, 500)
                }
            }

            closeModal()
            fetchData()
            setSaveModal({ isOpen: false })
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // Delete Confirmation State
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        item: null
    })

    const openDeleteModal = (item) => {
        setDeleteModal({ isOpen: true, item })
    }

    const handleDelete = async () => {
        const item = deleteModal.item
        if (!item) return

        try {
            const { error } = await supabase
                .from('ota_pemasukan')
                .delete()
                .eq('id', item.id)

            if (error) throw error
            showToast.success('Pemasukan berhasil dihapus')
            fetchData()
            setDeleteModal({ isOpen: false, item: null })
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    // Export functions
    const getExportData = () => filteredData.map((item, idx) => ({
        No: idx + 1,
        Tanggal: formatDate(item.tanggal),
        'Nama OTA': item.ota?.nama || '-',
        Nominal: item.jumlah,
        Metode: item.metode || '-',
        Keterangan: item.keterangan || '-'
    }))

    const handleExportExcel = () => {
        exportToExcel(
            getExportData(),
            ['No', 'Tanggal', 'Nama OTA', 'Nominal', 'Metode', 'Keterangan'],
            `Pemasukan_OTA_${filterMonth}_${filterYear}`
        )
        setShowDownloadMenu(false)
    }

    const handleExportCSV = () => {
        exportToCSV(
            getExportData(),
            ['No', 'Tanggal', 'Nama OTA', 'Nominal', 'Metode', 'Keterangan'],
            `Pemasukan_OTA_${filterMonth}_${filterYear}`
        )
        setShowDownloadMenu(false)
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text('Laporan Pemasukan OTA', 14, 20)
        doc.setFontSize(10)
        doc.text(`Periode: ${filterMonth === 'all' ? 'Semua Bulan' : new Date(0, filterMonth - 1).toLocaleString('id-ID', { month: 'long' })} ${filterYear}`, 14, 28)
        doc.text(`Total: ${formatRupiah(totalPemasukan)}`, 14, 34)

        doc.autoTable({
            startY: 42,
            head: [['No', 'Tanggal', 'Nama OTA', 'Nominal', 'Metode', 'Keterangan']],
            body: getExportData().map(row => [row.No, row.Tanggal, row['Nama OTA'], formatRupiah(row.Nominal), row.Metode, row.Keterangan]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [16, 185, 129] }
        })

        doc.save(`Pemasukan_OTA_${filterMonth}_${filterYear}.pdf`)
        setShowDownloadMenu(false)
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="ota-container">
                <div className="ota-loading">
                    <Spinner label="Memuat data pemasukan..." />
                </div>
            </div>
        )
    }

    return (
        <div className="ota-container">
            {/* Header */}
            <div style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 10px 40px -10px rgba(79, 70, 229, 0.5)',
                marginBottom: '24px'
            }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', transform: 'translate(30%, -50%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', transform: 'translate(-30%, 50%)' }} />

                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowUpCircle size={26} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'white' }}>Pemasukan OTA</h1>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0 0' }}>Kelola data pemasukan dana dari Orang Tua Asuh</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={fetchData}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer' }}
                        >
                            <RefreshCw size={16} /> Refresh
                        </button>
                        <button
                            onClick={openAdd}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, border: 'none', background: 'white', color: '#4f46e5', cursor: 'pointer' }}
                        >
                            <Plus size={18} /> Tambah Pemasukan
                        </button>
                    </div>
                </div>
            </div>


            {/* Summary */}
            <div className="ota-summary-grid">
                <div className="ota-summary-card">
                    <div className="ota-summary-icon green">
                        <ArrowUpCircle size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Pemasukan</h3>
                        <p style={{ color: '#059669' }}>{formatRupiah(totalPemasukan)}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon blue">
                        <FileText size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Jumlah Transaksi</h3>
                        <p style={{ color: '#2563eb' }}>{filteredData.length}</p>
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="ota-card">
                <div className="ota-card-header">
                    <h2>Riwayat Pemasukan</h2>
                    <div className="ota-actions">
                        <div className="ota-download-dropdown">
                            <button
                                className="ota-btn ota-btn-secondary"
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                            >
                                <Download size={16} />
                                Download
                            </button>
                            {showDownloadMenu && (
                                <div className="ota-download-menu">
                                    <button className="ota-download-item" onClick={handleExportExcel}>
                                        <FileText size={14} /> Excel
                                    </button>
                                    <button className="ota-download-item" onClick={handleExportCSV}>
                                        <FileText size={14} /> CSV
                                    </button>
                                    <button className="ota-download-item" onClick={handleExportPDF}>
                                        <FileText size={14} /> PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="ota-btn ota-btn-secondary" onClick={handlePrint}>
                            <Printer size={16} />
                            Print
                        </button>
                    </div>
                </div>

                <div className="ota-card-body">
                    {/* Filters */}
                    <div className="ota-filters">
                        <div className="ota-search">
                            <Search size={18} className="ota-search-icon" />
                            <input
                                type="text"
                                placeholder="Cari OTA atau keterangan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="ota-filter-group">
                            <Calendar size={16} />
                            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                                <option value="all">Semua Bulan</option>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i} value={i + 1}>
                                        {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="ota-filter-group">
                            <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="ota-table-container">
                    {filteredData.length > 0 ? (
                        <table className="ota-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal</th>
                                    <th>Nama OTA</th>
                                    <th className="text-right">Nominal</th>
                                    <th>Metode</th>
                                    <th>Keterangan</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td>{idx + 1}</td>
                                        <td>{formatDate(item.tanggal)}</td>
                                        <td style={{ fontWeight: 500 }}>{item.ota?.nama || '-'}</td>
                                        <td className="text-right" style={{ color: '#16a34a', fontWeight: 600 }}>
                                            {formatRupiah(item.jumlah)}
                                        </td>
                                        <td>
                                            <span className="ota-badge ota-badge-info">{item.metode || 'Transfer'}</span>
                                        </td>
                                        <td style={{ color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.keterangan || '-'}
                                        </td>
                                        <td>
                                            <div className="ota-action-buttons desktop">
                                                {item.ota?.no_hp && (
                                                    <button
                                                        className="ota-action-btn"
                                                        style={{ color: '#25d366' }}
                                                        onClick={() => sendWhatsAppConfirmation(item.ota, item.jumlah, item.tanggal)}
                                                        title="Kirim WhatsApp"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                )}
                                                <button className="ota-action-btn edit" onClick={() => openEdit(item)} title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="ota-action-btn delete" onClick={() => openDeleteModal(item)} title="Hapus">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <MobileActionMenu
                                                item={item}
                                                onEdit={() => openEdit(item)}
                                                onDelete={() => openDeleteModal(item)}
                                                onWhatsApp={item.ota?.no_hp ? () => sendWhatsAppConfirmation(item.ota, item.jumlah, item.tanggal) : null}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                                    <td colSpan={3}>Total</td>
                                    <td className="text-right" style={{ color: '#16a34a' }}>{formatRupiah(totalPemasukan)}</td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <div className="ota-empty">
                            <EmptyState
                                icon={ArrowUpCircle}
                                message="Belum ada data pemasukan"
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
                            <h2>{editItem ? 'Edit Pemasukan' : 'Tambah Pemasukan'}</h2>
                            <button className="ota-modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="ota-modal-body">
                                <div className="ota-form-row">
                                    <div className="ota-form-group">
                                        <label className="ota-form-label">
                                            Tanggal <span className="required">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="ota-form-input"
                                            value={formData.tanggal}
                                            onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="ota-form-group">
                                        <label className="ota-form-label">
                                            Metode Pembayaran
                                        </label>
                                        <select
                                            className="ota-form-select"
                                            value={formData.metode}
                                            onChange={(e) => setFormData({ ...formData, metode: e.target.value })}
                                        >
                                            <option value="Transfer">Transfer Bank</option>
                                            <option value="Tunai">Tunai</option>
                                            <option value="E-Wallet">E-Wallet</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="ota-form-group">
                                    <label className="ota-form-label">
                                        Nama OTA <span className="required">*</span>
                                    </label>
                                    <select
                                        className="ota-form-select"
                                        value={formData.ota_id}
                                        onChange={(e) => setFormData({ ...formData, ota_id: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Pilih OTA --</option>
                                        {otaList.map(ota => (
                                            <option key={ota.id} value={ota.id}>{ota.nama}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="ota-form-group">
                                    <label className="ota-form-label">
                                        Nominal <span className="required">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="ota-form-input"
                                        placeholder="Contoh: 500000"
                                        value={formData.jumlah}
                                        onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="ota-form-group">
                                    <label className="ota-form-label">Keterangan</label>
                                    <textarea
                                        className="ota-form-textarea"
                                        placeholder="Keterangan tambahan (opsional)"
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
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item ? `${deleteModal.item.ota?.nama} (${formatRupiah(deleteModal.item.jumlah)})` : ''}
                message={`Yakin ingin menghapus data pemasukan ini?`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? 'Konfirmasi Edit' : 'Konfirmasi Tambah'}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan data ini?' : 'Apakah Anda yakin ingin menambahkan data pembayaran ini?'}
                confirmLabel={editItem ? 'Simpan Perubahan' : 'Tambah Data'}
                variant="success"
                isLoading={saving}
            />
        </div>
    )
}

// Mobile Action Menu
const MobileActionMenu = ({ item, onEdit, onDelete, onWhatsApp }) => {
    const [open, setOpen] = useState(false)

    return (
        <div className="ota-mobile-menu">
            <button className="ota-mobile-menu-trigger" onClick={() => setOpen(!open)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="19" r="1" />
                </svg>
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
                    <div className="ota-mobile-menu-dropdown">
                        {onWhatsApp && (
                            <button className="ota-mobile-menu-item" style={{ color: '#25d366' }} onClick={() => { onWhatsApp(); setOpen(false) }}>
                                <MessageCircle size={16} />
                                Kirim WhatsApp
                            </button>
                        )}
                        <button className="ota-mobile-menu-item" onClick={() => { onEdit(); setOpen(false) }}>
                            <Edit2 size={16} />
                            Edit
                        </button>
                        <button className="ota-mobile-menu-item danger" onClick={() => { onDelete(); setOpen(false) }}>
                            <Trash2 size={16} />
                            Hapus
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default OTAPemasukanPage
