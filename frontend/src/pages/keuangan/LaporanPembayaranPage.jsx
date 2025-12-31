import { useState, useEffect } from 'react'
import { FileBarChart, Download, CreditCard, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import './Keuangan.css'

const LaporanPembayaranPage = () => {
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

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Pembayaran Santri',
            subtitle: filters.dateFrom && filters.dateTo
                ? `Periode ${new Date(filters.dateFrom).toLocaleDateString('id-ID')} - ${new Date(filters.dateTo).toLocaleDateString('id-ID')}`
                : filters.bulan ? `Bulan ${filters.bulan}/${filters.tahun}` : `Tahun ${filters.tahun}`,
            columns: ['Tanggal', 'Santri', 'NIS', 'Kategori', 'Jumlah', 'Metode'],
            data: pembayaran.map(d => [
                new Date(d.tanggal).toLocaleDateString('id-ID'),
                d.santri?.nama || '-',
                d.santri?.nis || '-',
                d.tagihan?.kategori?.nama || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                d.metode
            ]),
            filename: 'laporan_pembayaran_santri',
            showTotal: true,
            totalLabel: 'Total Pembayaran',
            totalValue: totalPembayaran
        })
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
                    <button className="btn btn-primary" onClick={handleDownloadPDF}>
                        <Download size={18} /> Download PDF
                    </button>
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

            <div className="data-card">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : pembayaran.length === 0 ? (
                    <div className="empty-state">Belum ada pembayaran</div>
                ) : (
                    <table className="data-table">
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
                                    <td>{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
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
                )}
            </div>
        </div>
    )
}

export default LaporanPembayaranPage
