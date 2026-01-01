import { useState, useEffect, useMemo } from 'react'
import {
    Plus, Search, Edit2, Trash2, Download, RefreshCw, X,
    Send, Calendar, FileText, Printer, Users, Wallet, CheckCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import './OTA.css'

/**
 * OTA Penyaluran Page - Distribusi Dana ke Santri
 * Langsung salurkan dana tanpa menunggu bulanan
 */
const OTAPenyaluranPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState([])
    const [santriList, setSantriList] = useState([])
    const [saldoTersedia, setSaldoTersedia] = useState(0)

    const [search, setSearch] = useState('')
    const [filterMonth, setFilterMonth] = useState('all')
    const [filterYear, setFilterYear] = useState(new Date().getFullYear())

    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        tanggal: new Date().toISOString().split('T')[0],
        santri_id: '',
        nominal: '',
        keterangan: ''
    })

    const [showDownloadMenu, setShowDownloadMenu] = useState(false)

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        setLoading(true)
        try {
            // Fetch penyaluran data
            const { data: penyaluranData, error: penyaluranError } = await supabase
                .from('ota_penyaluran')
                .select(`
                    *,
                    santri:santri_id(id, nama, nis)
                `)
                .order('tanggal', { ascending: false })

            if (penyaluranError) throw penyaluranError
            setData(penyaluranData || [])

            // Fetch active santri penerima
            const { data: santriData, error: santriError } = await supabase
                .from('santri_penerima_ota')
                .select(`
                    santri_id,
                    santri:santri_id(id, nama, nis)
                `)
                .eq('status', 'aktif')

            if (santriError) throw santriError
            setSantriList(santriData?.map(s => s.santri).filter(Boolean) || [])

            // Calculate saldo
            await fetchSaldo()
        } catch (err) {
            console.error('Fetch error:', err)
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchSaldo = async () => {
        try {
            // Total pemasukan
            const { data: pemasukanData } = await supabase
                .from('ota_pemasukan')
                .select('jumlah')

            const totalPemasukan = (pemasukanData || []).reduce((sum, p) => sum + Number(p.jumlah), 0)

            // Total pengeluaran
            const { data: pengeluaranData } = await supabase
                .from('ota_pengeluaran')
                .select('jumlah')

            const totalPengeluaran = (pengeluaranData || []).reduce((sum, p) => sum + Number(p.jumlah), 0)

            // Total penyaluran
            const { data: penyaluranData } = await supabase
                .from('ota_penyaluran')
                .select('nominal')

            const totalPenyaluran = (penyaluranData || []).reduce((sum, p) => sum + Number(p.nominal), 0)

            setSaldoTersedia(totalPemasukan - totalPengeluaran - totalPenyaluran)
        } catch (err) {
            console.error('Saldo error:', err)
        }
    }

    // Filter data
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const d = new Date(item.tanggal)
            const yearMatch = d.getFullYear() === Number(filterYear)
            const monthMatch = filterMonth === 'all' || d.getMonth() + 1 === Number(filterMonth)
            const searchMatch = !search ||
                item.santri?.nama?.toLowerCase().includes(search.toLowerCase()) ||
                item.keterangan?.toLowerCase().includes(search.toLowerCase())
            return yearMatch && monthMatch && searchMatch
        })
    }, [data, filterYear, filterMonth, search])

    const filteredTotal = useMemo(() =>
        filteredData.reduce((sum, item) => sum + Number(item.nominal), 0)
        , [filteredData])

    const totalPenyaluran = useMemo(() =>
        data.reduce((sum, item) => sum + Number(item.nominal), 0)
        , [data])

    const formatRupiah = (num) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

    const formatDate = (dateStr) =>
        new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

    const openAdd = () => {
        setEditItem(null)
        setFormData({
            tanggal: new Date().toISOString().split('T')[0],
            santri_id: '',
            nominal: '',
            keterangan: ''
        })
        setShowModal(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setFormData({
            tanggal: item.tanggal,
            santri_id: item.santri_id || '',
            nominal: item.nominal.toString(),
            keterangan: item.keterangan || ''
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditItem(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.santri_id) {
            showToast.error('Pilih santri penerima')
            return
        }
        if (!formData.nominal || Number(formData.nominal) <= 0) {
            showToast.error('Nominal harus lebih dari 0')
            return
        }

        const nominal = Number(formData.nominal)
        const currentEditAmount = editItem ? Number(editItem.nominal) : 0
        const availableSaldo = saldoTersedia + currentEditAmount

        // Balance validation
        if (nominal > availableSaldo) {
            showToast.error(`Saldo tidak mencukupi! Saldo tersedia: ${formatRupiah(availableSaldo)}`)
            return
        }

        setSaving(true)
        try {
            const payload = {
                tanggal: formData.tanggal,
                santri_id: formData.santri_id,
                nominal: nominal,
                keterangan: formData.keterangan.trim() || null
            }

            if (editItem) {
                const { error } = await supabase
                    .from('ota_penyaluran')
                    .update(payload)
                    .eq('id', editItem.id)

                if (error) throw error
                showToast.success('Data penyaluran berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('ota_penyaluran')
                    .insert([payload])

                if (error) throw error
                showToast.success('Penyaluran berhasil dicatat!')
            }

            closeModal()
            fetchAllData()
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (item) => {
        const santriNama = item.santri?.nama || 'Santri'
        if (!confirm(`Hapus penyaluran untuk "${santriNama}" sebesar ${formatRupiah(item.nominal)}?`)) return

        try {
            const { error } = await supabase
                .from('ota_penyaluran')
                .delete()
                .eq('id', item.id)

            if (error) throw error
            showToast.success('Penyaluran berhasil dihapus')
            fetchAllData()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    // Export functions
    const getExportData = () => filteredData.map((item, idx) => ({
        No: idx + 1,
        Tanggal: formatDate(item.tanggal),
        'Nama Santri': item.santri?.nama || '-',
        NIS: item.santri?.nis || '-',
        Nominal: item.nominal,
        Keterangan: item.keterangan || '-'
    }))

    const handleExportExcel = () => {
        exportToExcel(
            getExportData(),
            ['No', 'Tanggal', 'Nama Santri', 'NIS', 'Nominal', 'Keterangan'],
            `Penyaluran_OTA_${filterYear}`
        )
        setShowDownloadMenu(false)
    }

    const handleExportCSV = () => {
        exportToCSV(
            getExportData(),
            ['No', 'Tanggal', 'Nama Santri', 'NIS', 'Nominal', 'Keterangan'],
            `Penyaluran_OTA_${filterYear}`
        )
        setShowDownloadMenu(false)
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text('Laporan Penyaluran Dana OTA', 14, 20)
        doc.setFontSize(10)
        doc.text(`Tahun: ${filterYear}`, 14, 28)
        doc.text(`Total: ${formatRupiah(filteredTotal)}`, 14, 34)

        doc.autoTable({
            startY: 42,
            head: [['No', 'Tanggal', 'Nama Santri', 'Nominal', 'Keterangan']],
            body: getExportData().map(row => [row.No, row.Tanggal, row['Nama Santri'], formatRupiah(row.Nominal), row.Keterangan]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [16, 185, 129] }
        })

        doc.save(`Penyaluran_OTA_${filterYear}.pdf`)
        setShowDownloadMenu(false)
    }

    if (loading) {
        return (
            <div className="ota-container">
                <div className="ota-loading">
                    <Spinner label="Memuat data penyaluran..." />
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
                        <h1>Penyaluran Dana OTA</h1>
                        <p>Distribusi dana langsung ke santri penerima</p>
                    </div>
                    <button className="ota-btn ota-btn-primary" onClick={openAdd}>
                        <Send size={18} />
                        Salurkan Dana
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="ota-summary-grid">
                <div className="ota-summary-card">
                    <div className="ota-summary-icon green">
                        <Wallet size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Saldo Tersedia</h3>
                        <p style={{ color: saldoTersedia > 0 ? '#16a34a' : '#dc2626' }}>
                            {formatRupiah(saldoTersedia)}
                        </p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon purple">
                        <Send size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Tersalurkan</h3>
                        <p>{formatRupiah(totalPenyaluran)}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon blue">
                        <Users size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Santri Penerima</h3>
                        <p>{santriList.length}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon orange">
                        <FileText size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Transaksi</h3>
                        <p>{data.length}</p>
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="ota-card">
                <div className="ota-card-header">
                    <h2>Riwayat Penyaluran</h2>
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
                        <button className="ota-btn ota-btn-secondary" onClick={() => window.print()}>
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
                                placeholder="Cari nama santri..."
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

                        <button className="ota-btn ota-btn-ghost" onClick={fetchAllData}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                <div className="ota-table-container">
                    {filteredData.length > 0 ? (
                        <table className="ota-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal</th>
                                    <th>Santri</th>
                                    <th className="text-right">Nominal</th>
                                    <th>Keterangan</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td>{idx + 1}</td>
                                        <td>{formatDate(item.tanggal)}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{item.santri?.nama || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                {item.santri?.nis || '-'}
                                            </div>
                                        </td>
                                        <td className="text-right" style={{ color: '#10b981', fontWeight: 600 }}>
                                            {formatRupiah(item.nominal)}
                                        </td>
                                        <td style={{ color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.keterangan || '-'}
                                        </td>
                                        <td>
                                            <div className="ota-action-buttons desktop">
                                                <button className="ota-action-btn edit" onClick={() => openEdit(item)} title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="ota-action-btn delete" onClick={() => handleDelete(item)} title="Hapus">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                                    <td colSpan={3}>Total Periode Ini</td>
                                    <td className="text-right" style={{ color: '#10b981' }}>{formatRupiah(filteredTotal)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <div className="ota-empty">
                            <EmptyState
                                icon={Send}
                                message="Belum ada data penyaluran"
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
                            <h2>{editItem ? 'Edit Penyaluran' : 'Salurkan Dana'}</h2>
                            <button className="ota-modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="ota-modal-body">
                                {/* Balance info */}
                                <div style={{
                                    background: saldoTersedia > 0 ? '#f0fdf4' : '#fef2f2',
                                    border: `1px solid ${saldoTersedia > 0 ? '#86efac' : '#fecaca'}`,
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '1rem',
                                    fontSize: '0.875rem'
                                }}>
                                    <strong>Saldo Tersedia:</strong> {formatRupiah(saldoTersedia + (editItem ? Number(editItem.nominal) : 0))}
                                </div>

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
                                        Santri Penerima <span className="required">*</span>
                                    </label>
                                    <select
                                        className="ota-form-input"
                                        value={formData.santri_id}
                                        onChange={(e) => setFormData({ ...formData, santri_id: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Pilih Santri --</option>
                                        {santriList.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.nama} ({s.nis})
                                            </option>
                                        ))}
                                    </select>
                                    {santriList.length === 0 && (
                                        <p style={{ fontSize: '0.75rem', color: '#f59e0b', margin: '4px 0 0' }}>
                                            Belum ada santri penerima aktif. Tambahkan di menu Data Santri Penerima.
                                        </p>
                                    )}
                                </div>

                                <div className="ota-form-group">
                                    <label className="ota-form-label">
                                        Nominal <span className="required">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="ota-form-input"
                                        placeholder="Contoh: 500000"
                                        value={formData.nominal}
                                        onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="ota-form-group">
                                    <label className="ota-form-label">Keterangan</label>
                                    <textarea
                                        className="ota-form-textarea"
                                        placeholder="Keterangan penyaluran (opsional)"
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
                                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    {editItem ? 'Simpan Perubahan' : 'Salurkan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OTAPenyaluranPage
