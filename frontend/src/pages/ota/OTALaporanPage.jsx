import { useState, useEffect, useMemo } from 'react'
import {
    Download, Calendar, FileText, Printer, TrendingUp, TrendingDown,
    Wallet, Users, Filter
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
 * OTA Laporan Page - Financial Reports
 * Combined income/expense report with filters and export
 */
const OTALaporanPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [pemasukan, setPemasukan] = useState([])
    const [pengeluaran, setPengeluaran] = useState([])
    const [otaList, setOtaList] = useState([])

    const [filterMonth, setFilterMonth] = useState('all')
    const [filterYear, setFilterYear] = useState(new Date().getFullYear())
    const [filterOta, setFilterOta] = useState('all')
    const [activeTab, setActiveTab] = useState('summary') // summary, pemasukan, pengeluaran

    const [showDownloadMenu, setShowDownloadMenu] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [pemasukanRes, pengeluaranRes, otaRes] = await Promise.all([
                supabase
                    .from('ota_pemasukan')
                    .select('*, ota:orang_tua_asuh!ota_id(id, nama)')
                    .order('tanggal', { ascending: false }),
                supabase
                    .from('ota_pengeluaran')
                    .select('*')
                    .order('tanggal', { ascending: false }),
                supabase
                    .from('orang_tua_asuh')
                    .select('id, nama')
                    .order('nama')
            ])

            if (pemasukanRes.error) throw pemasukanRes.error
            if (pengeluaranRes.error) throw pengeluaranRes.error
            if (otaRes.error) throw otaRes.error

            setPemasukan(pemasukanRes.data || [])
            setPengeluaran(pengeluaranRes.data || [])
            setOtaList(otaRes.data || [])
        } catch (err) {
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // Filter pemasukan
    const filteredPemasukan = useMemo(() => {
        return pemasukan.filter(item => {
            const d = new Date(item.tanggal)
            const yearMatch = d.getFullYear() === Number(filterYear)
            const monthMatch = filterMonth === 'all' || d.getMonth() + 1 === Number(filterMonth)
            const otaMatch = filterOta === 'all' || item.ota_id === filterOta
            return yearMatch && monthMatch && otaMatch
        })
    }, [pemasukan, filterYear, filterMonth, filterOta])

    // Filter pengeluaran
    const filteredPengeluaran = useMemo(() => {
        return pengeluaran.filter(item => {
            const d = new Date(item.tanggal)
            const yearMatch = d.getFullYear() === Number(filterYear)
            const monthMatch = filterMonth === 'all' || d.getMonth() + 1 === Number(filterMonth)
            return yearMatch && monthMatch
        })
    }, [pengeluaran, filterYear, filterMonth])

    // Totals
    const totalPemasukan = filteredPemasukan.reduce((sum, item) => sum + Number(item.jumlah), 0)
    const totalPengeluaran = filteredPengeluaran.reduce((sum, item) => sum + Number(item.jumlah), 0)
    const saldoAkhir = totalPemasukan - totalPengeluaran

    // All-time totals
    const allTimePemasukan = pemasukan.reduce((sum, item) => sum + Number(item.jumlah), 0)
    const allTimePengeluaran = pengeluaran.reduce((sum, item) => sum + Number(item.jumlah), 0)
    const allTimeSaldo = allTimePemasukan - allTimePengeluaran

    const formatRupiah = (num) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

    const formatDate = (dateStr) =>
        new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

    const getPeriodLabel = () => {
        if (filterMonth === 'all') return `Tahun ${filterYear}`
        return `${new Date(0, filterMonth - 1).toLocaleString('id-ID', { month: 'long' })} ${filterYear}`
    }

    // Export functions
    const handleExportExcel = () => {
        const rows = [
            ...filteredPemasukan.map((item, idx) => ({
                No: idx + 1,
                Tipe: 'Pemasukan',
                Tanggal: formatDate(item.tanggal),
                Keterangan: item.ota?.nama || item.keterangan || '-',
                Masuk: item.jumlah,
                Keluar: 0
            })),
            ...filteredPengeluaran.map((item, idx) => ({
                No: filteredPemasukan.length + idx + 1,
                Tipe: 'Pengeluaran',
                Tanggal: formatDate(item.tanggal),
                Keterangan: item.keperluan || '-',
                Masuk: 0,
                Keluar: item.jumlah
            }))
        ].sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal))

        exportToExcel(rows, ['No', 'Tipe', 'Tanggal', 'Keterangan', 'Masuk', 'Keluar'], `Laporan_OTA_${filterYear}`)
        setShowDownloadMenu(false)
    }

    const handleExportCSV = () => {
        const rows = [
            ...filteredPemasukan.map((item, idx) => ({
                No: idx + 1,
                Tipe: 'Pemasukan',
                Tanggal: formatDate(item.tanggal),
                Keterangan: item.ota?.nama || item.keterangan || '-',
                Masuk: item.jumlah,
                Keluar: 0
            })),
            ...filteredPengeluaran.map((item, idx) => ({
                No: filteredPemasukan.length + idx + 1,
                Tipe: 'Pengeluaran',
                Tanggal: formatDate(item.tanggal),
                Keterangan: item.keperluan || '-',
                Masuk: 0,
                Keluar: item.jumlah
            }))
        ]

        exportToCSV(rows, ['No', 'Tipe', 'Tanggal', 'Keterangan', 'Masuk', 'Keluar'], `Laporan_OTA_${filterYear}`)
        setShowDownloadMenu(false)
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        const pageHeight = doc.internal.pageSize.getHeight()
        const pageWidth = doc.internal.pageSize.getWidth()

        // Header
        doc.setFontSize(18)
        doc.text('LAPORAN KEUANGAN OTA', 105, 20, { align: 'center' })
        doc.setFontSize(11)
        doc.text('PTQ Al-Usymuni Batuan', 105, 28, { align: 'center' })

        doc.setFontSize(10)
        doc.text(`Periode: ${getPeriodLabel()}`, 14, 42)
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 48)

        // Summary box
        doc.setFillColor(240, 253, 244)
        doc.rect(14, 54, 182, 28, 'F')
        doc.setFontSize(10)
        doc.text('RINGKASAN', 18, 62)
        doc.setFontSize(9)
        doc.text(`Total Pemasukan: ${formatRupiah(totalPemasukan)}`, 18, 70)
        doc.text(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, 80, 70)
        doc.text(`Saldo Akhir: ${formatRupiah(saldoAkhir)}`, 140, 70)
        doc.text(`Saldo Keseluruhan: ${formatRupiah(allTimeSaldo)}`, 18, 78)

        // Pemasukan Table
        doc.setFontSize(11)
        doc.text('PEMASUKAN', 14, 92)

        if (filteredPemasukan.length > 0) {
            doc.autoTable({
                startY: 96,
                head: [['No', 'Tanggal', 'Nama OTA', 'Nominal']],
                body: filteredPemasukan.map((item, idx) => [
                    idx + 1,
                    formatDate(item.tanggal),
                    item.ota?.nama || '-',
                    formatRupiah(item.jumlah)
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [16, 185, 129] },
                foot: [[{ content: 'Total', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, formatRupiah(totalPemasukan)]],
                footStyles: { fillColor: [220, 252, 231] },
                margin: { bottom: 30 }
            })
        } else {
            doc.text('Tidak ada data pemasukan', 14, 100)
        }

        // Pengeluaran Table
        let pengeluaranStartY = (doc.lastAutoTable?.finalY || 100) + 15

        // Check page break for title
        if (pengeluaranStartY > pageHeight - 40) {
            doc.addPage()
            pengeluaranStartY = 20
        }

        doc.text('PENGELUARAN', 14, pengeluaranStartY)

        if (filteredPengeluaran.length > 0) {
            doc.autoTable({
                startY: pengeluaranStartY + 4,
                head: [['No', 'Tanggal', 'Keperluan', 'Nominal']],
                body: filteredPengeluaran.map((item, idx) => [
                    idx + 1,
                    formatDate(item.tanggal),
                    item.keperluan || '-',
                    formatRupiah(item.jumlah)
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [234, 88, 12] },
                foot: [[{ content: 'Total', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, formatRupiah(totalPengeluaran)]],
                footStyles: { fillColor: [255, 237, 213] },
                margin: { bottom: 30 }
            })
        } else {
            doc.text('Tidak ada data pengeluaran', 14, pengeluaranStartY + 8)
        }

        // Global Footer
        const totalPages = doc.internal.getNumberOfPages()
        const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            const footerY = pageHeight - 15

            doc.setFontSize(8)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(150)

            doc.text(`Dicetak: ${printDate}`, 14, footerY)
            doc.text('PTQ Al-Usymuni Batuan', pageWidth / 2, footerY, { align: 'center' })
            doc.text(`Hal ${i} dari ${totalPages}`, pageWidth - 14, footerY, { align: 'right' })
        }

        doc.save(`Laporan_OTA_${getPeriodLabel().replace(' ', '_')}.pdf`)
        setShowDownloadMenu(false)
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="ota-container">
                <div className="ota-loading">
                    <Spinner label="Memuat laporan..." />
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
                        <h1>Laporan Keuangan OTA</h1>
                        <p>Rekap pemasukan dan pengeluaran dana Orang Tua Asuh</p>
                    </div>
                    <div className="ota-actions">
                        <div className="ota-download-dropdown">
                            <button
                                className="ota-btn ota-btn-primary"
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
            </div>

            {/* Filters */}
            <div className="ota-card" style={{ marginBottom: '1.5rem' }}>
                <div className="ota-card-body">
                    <div className="ota-filters">
                        <div className="ota-filter-group">
                            <Filter size={16} />
                            <label>Periode:</label>
                        </div>

                        <div className="ota-filter-group">
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

                        <div className="ota-filter-group">
                            <label>OTA:</label>
                            <select value={filterOta} onChange={(e) => setFilterOta(e.target.value)}>
                                <option value="all">Semua OTA</option>
                                {otaList.map(ota => (
                                    <option key={ota.id} value={ota.id}>{ota.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="ota-summary-grid">
                <div className="ota-summary-card">
                    <div className="ota-summary-icon green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Pemasukan ({getPeriodLabel()})</h3>
                        <p>{formatRupiah(totalPemasukan)}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon orange">
                        <TrendingDown size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Pengeluaran ({getPeriodLabel()})</h3>
                        <p>{formatRupiah(totalPengeluaran)}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon purple">
                        <Wallet size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Saldo Periode Ini</h3>
                        <p style={{ color: saldoAkhir >= 0 ? '#16a34a' : '#dc2626' }}>{formatRupiah(saldoAkhir)}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon blue">
                        <Users size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Saldo Keseluruhan</h3>
                        <p style={{ color: allTimeSaldo >= 0 ? '#16a34a' : '#dc2626' }}>{formatRupiah(allTimeSaldo)}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="ota-card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                    <button
                        onClick={() => setActiveTab('summary')}
                        style={{
                            flex: 1, padding: '0.875rem', border: 'none', background: 'transparent',
                            fontWeight: 500, cursor: 'pointer',
                            borderBottom: activeTab === 'summary' ? '2px solid #10b981' : '2px solid transparent',
                            color: activeTab === 'summary' ? '#10b981' : '#64748b'
                        }}
                    >
                        Ringkasan
                    </button>
                    <button
                        onClick={() => setActiveTab('pemasukan')}
                        style={{
                            flex: 1, padding: '0.875rem', border: 'none', background: 'transparent',
                            fontWeight: 500, cursor: 'pointer',
                            borderBottom: activeTab === 'pemasukan' ? '2px solid #10b981' : '2px solid transparent',
                            color: activeTab === 'pemasukan' ? '#10b981' : '#64748b'
                        }}
                    >
                        Pemasukan ({filteredPemasukan.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pengeluaran')}
                        style={{
                            flex: 1, padding: '0.875rem', border: 'none', background: 'transparent',
                            fontWeight: 500, cursor: 'pointer',
                            borderBottom: activeTab === 'pengeluaran' ? '2px solid #10b981' : '2px solid transparent',
                            color: activeTab === 'pengeluaran' ? '#10b981' : '#64748b'
                        }}
                    >
                        Pengeluaran ({filteredPengeluaran.length})
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="ota-card">
                {activeTab === 'summary' && (
                    <div className="ota-card-body">
                        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Ringkasan {getPeriodLabel()}</h3>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
                                <span>Total Pemasukan</span>
                                <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatRupiah(totalPemasukan)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fff7ed', borderRadius: '0.5rem' }}>
                                <span>Total Pengeluaran</span>
                                <span style={{ fontWeight: 600, color: '#ea580c' }}>{formatRupiah(totalPengeluaran)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f3e8ff', borderRadius: '0.5rem', borderTop: '2px solid #9333ea' }}>
                                <span style={{ fontWeight: 600 }}>Saldo Akhir Periode</span>
                                <span style={{ fontWeight: 700, color: saldoAkhir >= 0 ? '#16a34a' : '#dc2626' }}>{formatRupiah(saldoAkhir)}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>SALDO KESELURUHAN</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                                <div>
                                    <div style={{ color: '#64748b' }}>Total Masuk (All Time)</div>
                                    <div style={{ fontWeight: 600, color: '#16a34a' }}>{formatRupiah(allTimePemasukan)}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#64748b' }}>Total Keluar (All Time)</div>
                                    <div style={{ fontWeight: 600, color: '#ea580c' }}>{formatRupiah(allTimePengeluaran)}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#64748b' }}>Saldo Saat Ini</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.125rem', color: allTimeSaldo >= 0 ? '#16a34a' : '#dc2626' }}>{formatRupiah(allTimeSaldo)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'pemasukan' && (
                    <div className="ota-table-container">
                        {filteredPemasukan.length > 0 ? (
                            <table className="ota-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Tanggal</th>
                                        <th>Nama OTA</th>
                                        <th className="text-right">Nominal</th>
                                        <th>Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPemasukan.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td>{idx + 1}</td>
                                            <td>{formatDate(item.tanggal)}</td>
                                            <td style={{ fontWeight: 500 }}>{item.ota?.nama || '-'}</td>
                                            <td className="text-right" style={{ color: '#16a34a', fontWeight: 600 }}>
                                                {formatRupiah(item.jumlah)}
                                            </td>
                                            <td style={{ color: '#64748b' }}>{item.keterangan || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#f0fdf4', fontWeight: 600 }}>
                                        <td colSpan={3}>Total</td>
                                        <td className="text-right" style={{ color: '#16a34a' }}>{formatRupiah(totalPemasukan)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        ) : (
                            <div className="ota-empty">
                                <EmptyState icon={TrendingUp} message="Tidak ada data pemasukan pada periode ini" />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pengeluaran' && (
                    <div className="ota-table-container">
                        {filteredPengeluaran.length > 0 ? (
                            <table className="ota-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Tanggal</th>
                                        <th>Keperluan</th>
                                        <th className="text-right">Nominal</th>
                                        <th>Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPengeluaran.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td>{idx + 1}</td>
                                            <td>{formatDate(item.tanggal)}</td>
                                            <td style={{ fontWeight: 500 }}>{item.keperluan || '-'}</td>
                                            <td className="text-right" style={{ color: '#ea580c', fontWeight: 600 }}>
                                                {formatRupiah(item.jumlah)}
                                            </td>
                                            <td style={{ color: '#64748b' }}>{item.keterangan || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#fff7ed', fontWeight: 600 }}>
                                        <td colSpan={3}>Total</td>
                                        <td className="text-right" style={{ color: '#ea580c' }}>{formatRupiah(totalPengeluaran)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        ) : (
                            <div className="ota-empty">
                                <EmptyState icon={TrendingDown} message="Tidak ada data pengeluaran pada periode ini" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default OTALaporanPage
