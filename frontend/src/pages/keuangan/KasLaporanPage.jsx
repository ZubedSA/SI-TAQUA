import { useState, useEffect } from 'react'
import { FileBarChart, Download, ArrowUpCircle, ArrowDownCircle, TrendingUp, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { useToast } from '../../context/ToastContext'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import './Keuangan.css'

const KasLaporanPage = () => {
    const showToast = useToast()
    const [pemasukan, setPemasukan] = useState([])
    const [pengeluaran, setPengeluaran] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        bulan: '',
        tahun: new Date().getFullYear(),
        dateFrom: '',
        dateTo: ''
    })

    const fetchData = async () => {
        setLoading(true)
        try {
            let queryPemasukan = supabase.from('kas_pemasukan').select('*').order('tanggal', { ascending: false })
            let queryPengeluaran = supabase.from('kas_pengeluaran').select('*').order('tanggal', { ascending: false })

            // Date range filter takes priority
            if (filters.dateFrom && filters.dateTo) {
                queryPemasukan = queryPemasukan.gte('tanggal', filters.dateFrom).lte('tanggal', filters.dateTo)
                queryPengeluaran = queryPengeluaran.gte('tanggal', filters.dateFrom).lte('tanggal', filters.dateTo)
            } else if (filters.dateFrom) {
                queryPemasukan = queryPemasukan.gte('tanggal', filters.dateFrom)
                queryPengeluaran = queryPengeluaran.gte('tanggal', filters.dateFrom)
            } else if (filters.dateTo) {
                queryPemasukan = queryPemasukan.lte('tanggal', filters.dateTo)
                queryPengeluaran = queryPengeluaran.lte('tanggal', filters.dateTo)
            } else {
                // Fallback to bulan/tahun filter
                if (filters.tahun) {
                    queryPemasukan = queryPemasukan.gte('tanggal', `${filters.tahun}-01-01`).lte('tanggal', `${filters.tahun}-12-31`)
                    queryPengeluaran = queryPengeluaran.gte('tanggal', `${filters.tahun}-01-01`).lte('tanggal', `${filters.tahun}-12-31`)
                }
                if (filters.bulan) {
                    const month = String(filters.bulan).padStart(2, '0')
                    queryPemasukan = queryPemasukan.gte('tanggal', `${filters.tahun}-${month}-01`).lte('tanggal', `${filters.tahun}-${month}-31`)
                    queryPengeluaran = queryPengeluaran.gte('tanggal', `${filters.tahun}-${month}-01`).lte('tanggal', `${filters.tahun}-${month}-31`)
                }
            }

            const [pemasukanRes, pengeluaranRes] = await Promise.all([queryPemasukan, queryPengeluaran])
            setPemasukan(pemasukanRes.data || [])
            setPengeluaran(pengeluaranRes.data || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [filters.bulan, filters.tahun, filters.dateFrom, filters.dateTo])

    const totalPemasukan = pemasukan.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const totalPengeluaran = pengeluaran.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const saldo = totalPemasukan - totalPengeluaran

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Jenis', 'Keterangan', 'Masuk', 'Keluar']
        const allData = [
            ...pemasukan.map(d => ({ ...d, type: 'Pemasukan' })),
            ...pengeluaran.map(d => ({ ...d, type: 'Pengeluaran' }))
        ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

        const exportData = allData.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Jenis: d.type,
            Keterangan: d.sumber || d.keperluan,
            Masuk: d.type === 'Pemasukan' ? Number(d.jumlah) : 0,
            Keluar: d.type === 'Pengeluaran' ? Number(d.jumlah) : 0
        }))

        exportToExcel(exportData, columns, 'laporan_alur_kas')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Jenis', 'Keterangan', 'Masuk', 'Keluar']
        const allData = [
            ...pemasukan.map(d => ({ ...d, type: 'Pemasukan' })),
            ...pengeluaran.map(d => ({ ...d, type: 'Pengeluaran' }))
        ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

        const exportData = allData.map(d => ({
            Tanggal: new Date(d.tanggal).toLocaleDateString('id-ID'),
            Jenis: d.type,
            Keterangan: d.sumber || d.keperluan,
            Masuk: d.type === 'Pemasukan' ? Number(d.jumlah) : 0,
            Keluar: d.type === 'Pengeluaran' ? Number(d.jumlah) : 0
        }))

        exportToCSV(exportData, columns, 'laporan_alur_kas')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        const allData = [
            ...pemasukan.map(d => ({ ...d, type: 'Pemasukan' })),
            ...pengeluaran.map(d => ({ ...d, type: 'Pengeluaran' }))
        ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

        generateLaporanPDF({
            title: 'Laporan Arus Kas',
            subtitle: filters.dateFrom && filters.dateTo
                ? `Periode ${new Date(filters.dateFrom).toLocaleDateString('id-ID')} - ${new Date(filters.dateTo).toLocaleDateString('id-ID')}`
                : filters.bulan ? `Bulan ${filters.bulan}/${filters.tahun}` : `Tahun ${filters.tahun}`,
            columns: ['Tanggal', 'Jenis', 'Keterangan', 'Masuk', 'Keluar'],
            data: allData.map(d => [
                new Date(d.tanggal).toLocaleDateString('id-ID'),
                d.type,
                d.sumber || d.keperluan,
                d.type === 'Pemasukan' ? `Rp ${Number(d.jumlah).toLocaleString('id-ID')}` : '-',
                d.type === 'Pengeluaran' ? `Rp ${Number(d.jumlah).toLocaleString('id-ID')}` : '-'
            ]),
            filename: 'laporan_alur_kas',
            additionalInfo: [
                { label: 'Total Pemasukan', value: `Rp ${totalPemasukan.toLocaleString('id-ID')}` },
                { label: 'Total Pengeluaran', value: `Rp ${totalPengeluaran.toLocaleString('id-ID')}` },
                { label: 'Saldo', value: `Rp ${saldo.toLocaleString('id-ID')}` }
            ]
        })
        showToast.success('Laporan berhasil didownload')
    }

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FileBarChart className="title-icon blue" /> Laporan Arus Kas
                    </h1>
                    <p className="page-subtitle">Ringkasan pemasukan dan pengeluaran</p>
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
                        <span className="summary-label">Total Pemasukan</span>
                        <span className="summary-value">Rp {totalPemasukan.toLocaleString('id-ID')}</span>
                    </div>
                    <ArrowUpCircle size={40} className="summary-icon" />
                </div>
                <div className="summary-card red">
                    <div className="summary-content">
                        <span className="summary-label">Total Pengeluaran</span>
                        <span className="summary-value">Rp {totalPengeluaran.toLocaleString('id-ID')}</span>
                    </div>
                    <ArrowDownCircle size={40} className="summary-icon" />
                </div>
                <div className={`summary-card ${saldo >= 0 ? 'blue' : 'yellow'}`}>
                    <div className="summary-content">
                        <span className="summary-label">Saldo</span>
                        <span className="summary-value">Rp {saldo.toLocaleString('id-ID')}</span>
                    </div>
                    <TrendingUp size={40} className="summary-icon" />
                </div>
            </div>

            <div className="filters-bar">
                <div className="date-range-filter">
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => setFilters({ ...filters, dateFrom: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Dari Tanggal"
                    />
                    <span>-</span>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => setFilters({ ...filters, dateTo: e.target.value, bulan: '', tahun: new Date().getFullYear() })}
                        title="Sampai Tanggal"
                    />
                </div>
                <select
                    value={filters.bulan}
                    onChange={e => setFilters({ ...filters, bulan: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    <option value="">Semua Bulan</option>
                    {[...Array(12)].map((_, i) => (
                        <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'long' })}</option>
                    ))}
                </select>
                <select
                    value={filters.tahun}
                    onChange={e => setFilters({ ...filters, tahun: e.target.value, dateFrom: '', dateTo: '' })}
                    disabled={filters.dateFrom || filters.dateTo}
                >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            {loading ? (
                <div className="data-card"><div className="loading-state">Memuat data...</div></div>
            ) : (
                <div className="report-grid">
                    <div className="table-container">
                        <h3 className="card-title green"><ArrowUpCircle size={20} /> Pemasukan ({pemasukan.length})</h3>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr><th>Tanggal</th><th>Sumber</th><th>Jumlah</th></tr>
                                </thead>
                                <tbody>
                                    {pemasukan.slice(0, 10).map(item => (
                                        <tr key={item.id}>
                                            <td>{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td>{item.sumber}</td>
                                            <td className="amount green">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="table-container">
                        <h3 className="card-title red"><ArrowDownCircle size={20} /> Pengeluaran ({pengeluaran.length})</h3>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr><th>Tanggal</th><th>Keperluan</th><th>Jumlah</th></tr>
                                </thead>
                                <tbody>
                                    {pengeluaran.slice(0, 10).map(item => (
                                        <tr key={item.id}>
                                            <td>{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td>{item.keperluan}</td>
                                            <td className="amount red">Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default KasLaporanPage
