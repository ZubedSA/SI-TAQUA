import { useState, useEffect, useMemo } from 'react'
import { FileBarChart, Download, Calendar, Printer, FileSpreadsheet, Wallet, Users, TrendingUp, Send, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

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
        background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
        boxShadow: '0 10px 40px -10px rgba(16, 185, 129, 0.5)',
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
        color: '#1f2937'
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
            headStyles: { fillColor: [16, 185, 129] }
        })

        doc.save(`Laporan_Penyaluran_OTA_${filterTahun}.pdf`)
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', transform: 'translate(30%, -50%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', transform: 'translate(-30%, 50%)' }} />

                <div style={styles.headerContent}>
                    <div style={styles.headerInfo}>
                        <div style={styles.headerIcon}>
                            <FileBarChart size={26} />
                        </div>
                        <div>
                            <h1 style={styles.headerTitle}>Laporan Penyaluran OTA</h1>
                            <p style={styles.headerSubtitle}>Rekap penyaluran dana OTA ke santri penerima</p>
                        </div>
                    </div>
                    <button
                        style={{ ...styles.exportBtn, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
                        onClick={fetchData}
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                    <div style={{ ...styles.summaryIcon, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <TrendingUp size={22} />
                    </div>
                    <div style={styles.summaryLabel}>Total Pemasukan {filterTahun}</div>
                    <div style={styles.summaryValue}>{formatCurrency(summary.totalPemasukan)}</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{ ...styles.summaryIcon, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                        <Send size={22} />
                    </div>
                    <div style={styles.summaryLabel}>Total Disalurkan</div>
                    <div style={styles.summaryValue}>{formatCurrency(summary.totalPenyaluran)}</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{ ...styles.summaryIcon, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <Wallet size={22} />
                    </div>
                    <div style={styles.summaryLabel}>Sisa Saldo</div>
                    <div style={{ ...styles.summaryValue, color: summary.sisaSaldo > 0 ? '#059669' : '#dc2626' }}>
                        {formatCurrency(summary.sisaSaldo)}
                    </div>
                    <div style={styles.progressBar}>
                        <div style={{
                            ...styles.progressFill,
                            width: `${usagePercent}%`,
                            background: usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#f59e0b' : '#10b981'
                        }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>
                        {usagePercent}% disalurkan
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{ ...styles.summaryIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <Users size={22} />
                    </div>
                    <div style={styles.summaryLabel}>Penerima Aktif</div>
                    <div style={styles.summaryValue}>{summary.totalPenerima}</div>
                </div>
            </div>

            {/* Table Card */}
            <div style={styles.card}>
                {/* Filter Bar */}
                <div style={styles.filterBar}>
                    <div style={styles.filterGroup}>
                        <Calendar size={18} color="#6b7280" />
                        <select
                            style={styles.select}
                            value={filterBulan}
                            onChange={(e) => setFilterBulan(e.target.value)}
                        >
                            <option value="all">Semua Bulan</option>
                            {MONTHS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.filterGroup}>
                        <select
                            style={styles.select}
                            value={filterTahun}
                            onChange={(e) => setFilterTahun(Number(e.target.value))}
                        >
                            {years.map(y => (
                                <option key={y} value={y}>Tahun {y}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <div style={{ position: 'relative' }}>
                            <button
                                style={styles.exportBtn}
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                            >
                                <Download size={16} /> Download
                            </button>
                            {showDownloadMenu && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                        onClick={() => setShowDownloadMenu(false)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '4px',
                                        background: 'white',
                                        borderRadius: '10px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                        border: '1px solid #e5e7eb',
                                        overflow: 'hidden',
                                        zIndex: 50,
                                        minWidth: '140px'
                                    }}>
                                        <button
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                border: 'none',
                                                background: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                                            onMouseOut={(e) => e.target.style.background = 'white'}
                                            onClick={() => { handleExportExcel(); setShowDownloadMenu(false); }}
                                        >
                                            <FileSpreadsheet size={14} /> Excel
                                        </button>
                                        <button
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                border: 'none',
                                                background: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseOver={(e) => e.target.style.background = '#f3f4f6'}
                                            onMouseOut={(e) => e.target.style.background = 'white'}
                                            onClick={() => { handleExportPDF(); setShowDownloadMenu(false); }}
                                        >
                                            <Download size={14} /> PDF
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <button style={styles.exportBtn} onClick={() => window.print()}>
                            <Printer size={16} /> Print
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Spinner label="Memuat data..." />
                    </div>
                ) : data.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>No</th>
                                    <th style={styles.th}>Tanggal</th>
                                    <th style={styles.th}>Nama Santri</th>
                                    <th style={styles.th}>NIS</th>
                                    <th style={{ ...styles.th, textAlign: 'right' }}>Nominal</th>
                                    <th style={styles.th}>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td style={styles.td}>{idx + 1}</td>
                                        <td style={styles.td}>{formatDate(item.tanggal)}</td>
                                        <td style={{ ...styles.td, fontWeight: 500 }}>{item.santri?.nama || '-'}</td>
                                        <td style={styles.td}>{item.santri?.nis || '-'}</td>
                                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                            {formatCurrency(item.nominal)}
                                        </td>
                                        <td style={{ ...styles.td, color: '#6b7280' }}>{item.keterangan || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                                    <td style={styles.td} colSpan={4}>Total</td>
                                    <td style={{ ...styles.td, textAlign: 'right', color: '#10b981' }}>
                                        {formatCurrency(filteredTotal)}
                                    </td>
                                    <td style={styles.td}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>
                            <FileBarChart size={36} color="#9ca3af" />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 8px' }}>
                            Belum ada data penyaluran
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                            Data penyaluran OTA untuk periode ini belum tersedia.
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '8px' }}>
                            Salurkan dana melalui menu Keuangan → Penyaluran Dana.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default OTALaporanPenyaluranPage
