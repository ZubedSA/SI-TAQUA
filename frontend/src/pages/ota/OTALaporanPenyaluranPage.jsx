import { useState, useEffect, useMemo } from 'react'
import { FileBarChart, Download, Calendar, Printer, FileSpreadsheet, Wallet, Users, TrendingUp, Send, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import './OTA.css'

const styles = {
    container: {
        padding: '24px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
    },
    header: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        boxShadow: '0 10px 40px -10px rgba(79, 70, 229, 0.5)',
        marginBottom: '24px'
    },
    headerContent: {
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
    },
    headerInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    headerIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: '1.5rem',
        fontWeight: 700,
        margin: 0
    },
    headerSubtitle: {
        fontSize: '0.9rem',
        color: 'rgba(255,255,255,0.85)',
        margin: '4px 0 0 0'
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
    },
    summaryCard: {
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    summaryIcon: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        marginBottom: '12px'
    },
    summaryLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px'
    },
    summaryValue: {
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#312e81'
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    },
    filterBar: {
        padding: '20px 24px',
        borderBottom: '1px solid #f3f4f6',
        background: 'linear-gradient(180deg, #f8fafc 0%, white 100%)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
    },
    filterGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    select: {
        padding: '10px 14px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.875rem',
        background: 'white',
        cursor: 'pointer',
        minWidth: '120px'
    },
    exportBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 16px',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: 500,
        border: '1px solid #e5e7eb',
        background: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '14px 20px',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
    },
    td: {
        padding: '16px 20px',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '0.875rem',
        color: '#374151'
    },
    emptyState: {
        padding: '80px 24px',
        textAlign: 'center'
    },
    emptyIcon: {
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px'
    },
    progressBar: {
        height: '8px',
        background: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
        marginTop: '8px'
    },
    progressFill: {
        height: '100%',
        borderRadius: '4px',
        transition: 'width 0.3s'
    }
}

const MONTHS = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
]

const formatCurrency = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0)
}

const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const OTALaporanPenyaluranPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState([])
    const [summary, setSummary] = useState({
        totalPemasukan: 0,
        totalPenyaluran: 0,
        sisaSaldo: 0,
        totalPenerima: 0
    })

    // Filters
    const currentDate = new Date()
    const [filterTahun, setFilterTahun] = useState(currentDate.getFullYear())
    const [filterBulan, setFilterBulan] = useState('all')
    const [showDownloadMenu, setShowDownloadMenu] = useState(false)

    useEffect(() => {
        fetchData()
    }, [filterTahun, filterBulan])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch penyaluran data from ota_penyaluran (NEW TABLE)
            let query = supabase
                .from('ota_penyaluran')
                .select(`
                    *,
                    santri:santri_id(id, nama, nis)
                `)
                .order('tanggal', { ascending: false })

            // Filter by year
            query = query.gte('tanggal', `${filterTahun}-01-01`)
            query = query.lte('tanggal', `${filterTahun}-12-31`)

            // Filter by month if not 'all'
            if (filterBulan !== 'all') {
                const month = String(filterBulan).padStart(2, '0')
                query = query.gte('tanggal', `${filterTahun}-${month}-01`)
                // Get last day of month
                const lastDay = new Date(filterTahun, filterBulan, 0).getDate()
                query = query.lte('tanggal', `${filterTahun}-${month}-${lastDay}`)
            }

            const { data: penyaluranData, error } = await query

            if (error) throw error
            setData(penyaluranData || [])

            // Fetch summary
            await fetchSummary()
        } catch (err) {
            console.error('Fetch error:', err)
            setData([])
        } finally {
            setLoading(false)
        }
    }

    const fetchSummary = async () => {
        try {
            // Get total pemasukan for the year
            const { data: pemasukanData } = await supabase
                .from('ota_pemasukan')
                .select('jumlah')
                .gte('tanggal', `${filterTahun}-01-01`)
                .lte('tanggal', `${filterTahun}-12-31`)

            const totalPemasukan = (pemasukanData || []).reduce((sum, p) => sum + (parseFloat(p.jumlah) || 0), 0)

            // Get total pengeluaran
            const { data: pengeluaranData } = await supabase
                .from('ota_pengeluaran')
                .select('jumlah')
                .gte('tanggal', `${filterTahun}-01-01`)
                .lte('tanggal', `${filterTahun}-12-31`)

            const totalPengeluaran = (pengeluaranData || []).reduce((sum, p) => sum + (parseFloat(p.jumlah) || 0), 0)

            // Get total penyaluran from NEW table
            const { data: penyaluranData } = await supabase
                .from('ota_penyaluran')
                .select('nominal')
                .gte('tanggal', `${filterTahun}-01-01`)
                .lte('tanggal', `${filterTahun}-12-31`)

            const totalPenyaluran = (penyaluranData || []).reduce((sum, p) => sum + (parseFloat(p.nominal) || 0), 0)

            // Get active penerima count
            const { count: penerimaCount } = await supabase
                .from('santri_penerima_ota')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'aktif')

            setSummary({
                totalPemasukan,
                totalPenyaluran,
                sisaSaldo: totalPemasukan - totalPengeluaran - totalPenyaluran,
                totalPenerima: penerimaCount || 0
            })
        } catch (err) {
            console.log('Summary fetch error:', err)
        }
    }

    // Calculated values
    const filteredTotal = useMemo(() =>
        data.reduce((sum, item) => sum + Number(item.nominal), 0)
        , [data])

    const usagePercent = summary.totalPemasukan > 0
        ? Math.round((summary.totalPenyaluran / summary.totalPemasukan) * 100)
        : 0

    const years = []
    for (let y = currentDate.getFullYear(); y >= 2020; y--) {
        years.push(y)
    }

    // Export functions
    const getExportData = () => data.map((item, idx) => ({
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
            `Laporan_Penyaluran_OTA_${filterTahun}`
        )
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        const pageHeight = doc.internal.pageSize.getHeight()
        const pageWidth = doc.internal.pageSize.getWidth()

        doc.setFontSize(16)
        doc.text('Laporan Penyaluran Dana OTA', 14, 20)
        doc.setFontSize(10)
        doc.text(`Tahun: ${filterTahun}${filterBulan !== 'all' ? ' - ' + MONTHS.find(m => m.value === Number(filterBulan))?.label : ''}`, 14, 28)
        doc.text(`Total Disalurkan: ${formatCurrency(filteredTotal)}`, 14, 34)

        doc.autoTable({
            startY: 42,
            head: [['No', 'Tanggal', 'Nama Santri', 'NIS', 'Nominal', 'Keterangan']],
            body: getExportData().map(row => [row.No, row.Tanggal, row['Nama Santri'], row.NIS, formatCurrency(row.Nominal), row.Keterangan]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [16, 185, 129] },
            margin: { bottom: 30 }
        })

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

        doc.save(`Laporan_Penyaluran_OTA_${filterTahun}.pdf`)
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
                            <FileBarChart size={26} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'white' }}>Laporan Penyaluran OTA</h1>
                            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0 0' }}>Rekap penyaluran dana OTA ke santri penerima</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer' }}
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="ota-summary-grid">
                <div className="ota-summary-card">
                    <div className="ota-summary-icon green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Pemasukan {filterTahun}</h3>
                        <p style={{ color: '#059669' }}>{formatCurrency(summary.totalPemasukan)}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon purple">
                        <Send size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Disalurkan</h3>
                        <p style={{ color: '#7c3aed' }}>{formatCurrency(summary.totalPenyaluran)}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon blue">
                        <Wallet size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Sisa Saldo</h3>
                        <p style={{ color: summary.sisaSaldo > 0 ? '#059669' : '#dc2626' }}>{formatCurrency(summary.sisaSaldo)}</p>
                        <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${usagePercent}%`, background: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#f59e0b' : '#10b981', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{usagePercent}% disalurkan</span>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon orange">
                        <Users size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Penerima Aktif</h3>
                        <p style={{ color: '#d97706' }}>{summary.totalPenerima}</p>
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
                                    <button className="ota-download-item" onClick={() => { handleExportExcel(); setShowDownloadMenu(false); }}>
                                        <FileSpreadsheet size={14} /> Excel
                                    </button>
                                    <button className="ota-download-item" onClick={() => { handleExportPDF(); setShowDownloadMenu(false); }}>
                                        <Download size={14} /> PDF
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
                        <div className="ota-filter-group">
                            <Calendar size={16} />
                            <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
                                <option value="all">Semua Bulan</option>
                                {MONTHS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="ota-filter-group">
                            <select value={filterTahun} onChange={(e) => setFilterTahun(Number(e.target.value))}>
                                {years.map(y => (
                                    <option key={y} value={y}>Tahun {y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="ota-table-container">
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Spinner label="Memuat data..." />
                        </div>
                    ) : data.length > 0 ? (
                        <table className="ota-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal</th>
                                    <th>Nama Santri</th>
                                    <th>NIS</th>
                                    <th className="text-right">Nominal</th>
                                    <th>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td>{idx + 1}</td>
                                        <td>{formatDate(item.tanggal)}</td>
                                        <td style={{ fontWeight: 500 }}>{item.santri?.nama || '-'}</td>
                                        <td>{item.santri?.nis || '-'}</td>
                                        <td className="text-right" style={{ fontWeight: 600, color: '#10b981' }}>
                                            {formatCurrency(item.nominal)}
                                        </td>
                                        <td style={{ color: '#6b7280' }}>{item.keterangan || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                                    <td colSpan={4}>Total</td>
                                    <td className="text-right" style={{ color: '#10b981' }}>
                                        {formatCurrency(filteredTotal)}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    ) : (
                        <div className="ota-empty-state">
                            <FileBarChart size={48} />
                            <h3>Belum ada data penyaluran</h3>
                            <p>Data penyaluran OTA untuk periode ini belum tersedia.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OTALaporanPenyaluranPage

