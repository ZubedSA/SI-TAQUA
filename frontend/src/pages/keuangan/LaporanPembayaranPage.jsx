import { useState, useEffect } from 'react'
import { FileBarChart, Download, CreditCard, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { useToast } from '../../context/ToastContext'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { useCalendar } from '../../context/CalendarContext'
import DateDisplay from '../../components/common/DateDisplay'
import DateRangePicker from '../../components/ui/DateRangePicker'
import SmartMonthYearFilter from '../../components/common/SmartMonthYearFilter'
import './Keuangan.css'

const LaporanPembayaranPage = () => {
    const showToast = useToast()
    const { formatDate, mode } = useCalendar()
    const [pembayaran, setPembayaran] = useState([])
    const [tagihan, setTagihan] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        bulan: '',
        tahun: new Date().getFullYear(),
        dateFrom: '',
        dateTo: ''
    })

    const fetchData = async () => {
        console.log('[LaporanPembayaran] Fetch triggered:', filters)
        console.log('[LaporanPembayaran] Mode:', mode)
        setLoading(true)
        try {
            let queryPembayaran = supabase
                .from('pembayaran_santri')
                .select('*, tagihan:tagihan_id(kategori:kategori_id(nama)), santri:santri_id(nama, nis)')
                .order('tanggal', { ascending: false })

            // Date range filter takes priority
            if (filters.dateFrom && filters.dateTo) {
                queryPembayaran = queryPembayaran.gte('tanggal', filters.dateFrom).lte('tanggal', filters.dateTo)
            } else if (filters.dateFrom) {
                queryPembayaran = queryPembayaran.gte('tanggal', filters.dateFrom)
            } else if (filters.dateTo) {
                queryPembayaran = queryPembayaran.lte('tanggal', filters.dateTo)
            } else {
                // Fallback to bulan/tahun filter
                if (filters.tahun) {
                    queryPembayaran = queryPembayaran.gte('tanggal', `${filters.tahun}-01-01`).lte('tanggal', `${filters.tahun}-12-31`)
                }
                if (filters.bulan) {
                    const month = String(filters.bulan).padStart(2, '0')
                    queryPembayaran = queryPembayaran.gte('tanggal', `${filters.tahun}-${month}-01`).lte('tanggal', `${filters.tahun}-${month}-31`)
                }
            }

            const [pembayaranRes, tagihanRes] = await Promise.all([
                queryPembayaran,
                supabase.from('tagihan_santri').select('*')
            ])

            setPembayaran(pembayaranRes.data || [])
            setTagihan(tagihanRes.data || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [filters.bulan, filters.tahun, filters.dateFrom, filters.dateTo])

    const totalPembayaran = pembayaran.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const totalTagihan = tagihan.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const lunasCount = tagihan.filter(t => t.status === 'Lunas').length
    const belumLunasCount = tagihan.filter(t => t.status !== 'Lunas').length

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Santri', 'NIS', 'Kategori', 'Jumlah', 'Metode']
        const exportData = pembayaran.map(d => ({
            Tanggal: formatDate(d.tanggal),
            Santri: d.santri?.nama || '-',
            NIS: d.santri?.nis || '-',
            Kategori: d.tagihan?.kategori?.nama || '-',
            Jumlah: Number(d.jumlah),
            Metode: d.metode
        }))
        exportToExcel(exportData, columns, 'laporan_pembayaran_santri')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Santri', 'NIS', 'Kategori', 'Jumlah', 'Metode']
        const exportData = pembayaran.map(d => ({
            Tanggal: formatDate(d.tanggal),
            Santri: d.santri?.nama || '-',
            NIS: d.santri?.nis || '-',
            Kategori: d.tagihan?.kategori?.nama || '-',
            Jumlah: Number(d.jumlah),
            Metode: d.metode
        }))
        exportToCSV(exportData, columns, 'laporan_pembayaran_santri')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Pembayaran Santri',
            subtitle: filters.dateFrom && filters.dateTo
                ? `Periode ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
                : filters.bulan ? `Bulan ${filters.bulan}/${filters.tahun}` : `Tahun ${filters.tahun}`,
            columns: ['Tanggal', 'Santri', 'NIS', 'Kategori', 'Jumlah', 'Metode'],
            data: pembayaran.map(d => [
                formatDate(d.tanggal),
                d.santri?.nama || '-',
                d.santri?.nis || '-',
                d.tagihan?.kategori?.nama || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                d.metode
            ]),
            filename: 'laporan_pembayaran_santri',
            showTotal: true,
            totalLabel: 'Total Pembayaran',
            totalValue: totalPembayaran,
            printedAt: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        })
        showToast.success('Laporan berhasil didownload')
    }

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FileBarChart className="title-icon green" /> Laporan Pembayaran
                    </h1>
                    <p className="page-subtitle">Ringkasan pembayaran santri</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                </div>
            </div>

            <div className="summary-grid">
                <div className="summary-card green">
                    <div className="summary-content">
                        <span className="summary-label">Total Pembayaran</span>
                        <span className="summary-value">Rp {totalPembayaran.toLocaleString('id-ID')}</span>
                    </div>
                    <CreditCard size={40} className="summary-icon" />
                </div>
                <div className="summary-card blue">
                    <div className="summary-content">
                        <span className="summary-label">Tagihan Lunas</span>
                        <span className="summary-value">{lunasCount} tagihan</span>
                    </div>
                    <CheckCircle size={40} className="summary-icon" />
                </div>
                <div className="summary-card yellow">
                    <div className="summary-content">
                        <span className="summary-label">Belum Lunas</span>
                        <span className="summary-value">{belumLunasCount} tagihan</span>
                    </div>
                    <AlertCircle size={40} className="summary-icon" />
                </div>
            </div>



            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Riwayat Pembayaran ({pembayaran.length})</h3>
                    <div className="table-controls">
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
                        <div style={{ opacity: (filters.dateFrom || filters.dateTo) ? 0.5 : 1, pointerEvents: (filters.dateFrom || filters.dateTo) ? 'none' : 'auto', display: 'flex', gap: '10px' }}>
                            <SmartMonthYearFilter
                                filters={filters}
                                onFilterChange={setFilters}
                            />
                        </div>
                        <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
                    </div>
                </div>
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : pembayaran.length === 0 ? (
                    <div className="empty-state">Belum ada pembayaran</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal</th>
                                    <th>Santri</th>
                                    <th>Kategori</th>
                                    <th>Jumlah</th>
                                    <th>Metode</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pembayaran.map((item, i) => (
                                    <tr key={item.id}>
                                        <td>{i + 1}</td>
                                        <td><DateDisplay date={item.tanggal} /></td>
                                        <td>
                                            <div className="cell-santri">
                                                <strong>{item.santri?.nama}</strong>
                                                <small>{item.santri?.nis}</small>
                                            </div>
                                        </td>
                                        <td><span className="badge green">{item.tagihan?.kategori?.nama || '-'}</span></td>
                                        <td className="amount green">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                                        <td>{item.metode}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LaporanPembayaranPage
