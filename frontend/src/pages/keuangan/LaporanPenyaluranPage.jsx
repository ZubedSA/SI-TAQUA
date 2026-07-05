import { useState, useEffect } from 'react'
import { FileBarChart, Download, PiggyBank, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { useToast } from '../../context/ToastContext'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import './Keuangan.css'

const LaporanPenyaluranPage = () => {
    const showToast = useToast()
    const [anggaran, setAnggaran] = useState([])
    const [realisasi, setRealisasi] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [anggaranRes, realisasiRes] = await Promise.all([
                supabase.from('anggaran').select('*').order('created_at', { ascending: false }),
                supabase.from('realisasi_dana').select('*, anggaran:anggaran_id(nama_program)').order('tanggal', { ascending: false })
            ])
            setAnggaran(anggaranRes.data || [])
            setRealisasi(realisasiRes.data || [])
        } catch {
            showToast.error('Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    const totalDiajukan = anggaran.reduce((sum, d) => sum + Number(d.jumlah_diajukan), 0)
    const totalDisetujui = anggaran.reduce((sum, d) => sum + Number(d.jumlah_disetujui || 0), 0)
    const totalRealisasi = realisasi.reduce((sum, d) => sum + Number(d.jumlah_terpakai), 0)
    const sisaDana = totalDisetujui - totalRealisasi

    const handleDownloadExcel = () => {
        const columns = ['Program', 'Diajukan', 'Disetujui', 'Terealisasi', 'Status']
        const exportData = anggaran.map(d => {
            const realisasiProgram = realisasi
                .filter(r => r.anggaran_id === d.id)
                .reduce((sum, r) => sum + Number(r.jumlah_terpakai), 0)
            return {
                Program: d.nama_program,
                Diajukan: Number(d.jumlah_diajukan),
                Disetujui: d.jumlah_disetujui ? Number(d.jumlah_disetujui) : 0,
                Terealisasi: realisasiProgram,
                Status: d.status
            }
        })
        exportToExcel(exportData, columns, 'laporan_penyaluran_dana')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Program', 'Diajukan', 'Disetujui', 'Terealisasi', 'Status']
        const exportData = anggaran.map(d => {
            const realisasiProgram = realisasi
                .filter(r => r.anggaran_id === d.id)
                .reduce((sum, r) => sum + Number(r.jumlah_terpakai), 0)
            return {
                Program: d.nama_program,
                Diajukan: Number(d.jumlah_diajukan),
                Disetujui: d.jumlah_disetujui ? Number(d.jumlah_disetujui) : 0,
                Terealisasi: realisasiProgram,
                Status: d.status
            }
        })
        exportToCSV(exportData, columns, 'laporan_penyaluran_dana')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Penyaluran Dana',
            columns: ['Program', 'Diajukan', 'Disetujui', 'Terealisasi', 'Status'],
            data: anggaran.map(d => {
                const realisasiProgram = realisasi
                    .filter(r => r.anggaran_id === d.id)
                    .reduce((sum, r) => sum + Number(r.jumlah_terpakai), 0)
                return [
                    d.nama_program,
                    `Rp ${Number(d.jumlah_diajukan).toLocaleString('id-ID')}`,
                    d.jumlah_disetujui ? `Rp ${Number(d.jumlah_disetujui).toLocaleString('id-ID')}` : '-',
                    `Rp ${realisasiProgram.toLocaleString('id-ID')}`,
                    d.status
                ]
            }),
            filename: 'laporan_penyaluran_dana',
            additionalInfo: [
                { label: 'Total Disetujui', value: `Rp ${totalDisetujui.toLocaleString('id-ID')}` },
                { label: 'Total Realisasi', value: `Rp ${totalRealisasi.toLocaleString('id-ID')}` },
                { label: 'Sisa Dana', value: `Rp ${sisaDana.toLocaleString('id-ID')}` }
            ]
        })
        showToast.success('Laporan berhasil didownload')
    }

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FileBarChart className="title-icon blue" /> Laporan Penyaluran Dana
                    </h1>
                    <p className="page-subtitle">Ringkasan anggaran dan realisasi dana</p>
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
                <div className="summary-card blue">
                    <div className="summary-content">
                        <span className="summary-label">Total Disetujui</span>
                        <span className="summary-value">Rp {totalDisetujui.toLocaleString('id-ID')}</span>
                    </div>
                    <CheckCircle size={40} className="summary-icon" />
                </div>
                <div className="summary-card green">
                    <div className="summary-content">
                        <span className="summary-label">Total Realisasi</span>
                        <span className="summary-value">Rp {totalRealisasi.toLocaleString('id-ID')}</span>
                    </div>
                    <TrendingUp size={40} className="summary-icon" />
                </div>
                <div className={`summary-card ${sisaDana >= 0 ? 'yellow' : 'red'}`}>
                    <div className="summary-content">
                        <span className="summary-label">Sisa Dana</span>
                        <span className="summary-value">Rp {sisaDana.toLocaleString('id-ID')}</span>
                    </div>
                    <PiggyBank size={40} className="summary-icon" />
                </div>
            </div>

            <div className="filters-bar">
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : anggaran.length === 0 ? (
                    <div className="empty-state">Belum ada data anggaran</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="table-wrapper desktop-table-only">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Program</th>
                                        <th>Diajukan</th>
                                        <th>Disetujui</th>
                                        <th>Terealisasi</th>
                                        <th>Sisa</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {anggaran.map((item, i) => {
                                        const realisasiProgram = realisasi
                                            .filter(r => r.anggaran_id === item.id)
                                            .reduce((sum, r) => sum + Number(r.jumlah_terpakai), 0)
                                        const sisa = (Number(item.jumlah_disetujui) || 0) - realisasiProgram

                                        return (
                                            <tr key={item.id}>
                                                <td>{i + 1}</td>
                                                <td>
                                                    <div className="cell-santri">
                                                        <strong>{item.nama_program}</strong>
                                                        <small>{item.deskripsi?.substring(0, 40) || '-'}</small>
                                                    </div>
                                                </td>
                                                <td className="amount">Rp {Number(item.jumlah_diajukan).toLocaleString('id-ID')}</td>
                                                <td className="amount blue">
                                                    {item.jumlah_disetujui ? `Rp ${Number(item.jumlah_disetujui).toLocaleString('id-ID')}` : '-'}
                                                </td>
                                                <td className="amount green">Rp {realisasiProgram.toLocaleString('id-ID')}</td>
                                                <td className={`amount ${sisa >= 0 ? '' : 'red'}`}>Rp {sisa.toLocaleString('id-ID')}</td>
                                                <td>
                                                    <span className={`status-badge ${item.status === 'Disetujui' ? 'disetujui' : item.status === 'Ditolak' ? 'ditolak' : 'pending'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="mobile-card-only hidden mobile-card-list">
                            {anggaran.map((item, i) => {
                                const realisasiProgram = realisasi
                                    .filter(r => r.anggaran_id === item.id)
                                    .reduce((sum, r) => sum + Number(r.jumlah_terpakai), 0)
                                const sisa = (Number(item.jumlah_disetujui) || 0) - realisasiProgram

                                return (
                                    <div key={item.id} className="mobile-data-card">
                                        <div className="mobile-card-row">
                                            <div>
                                                <h4 className="mobile-card-title text-gray-900 font-bold">{item.nama_program}</h4>
                                                <div className="text-[10px] text-gray-500 mt-1">
                                                    Diajukan: Rp {Number(item.jumlah_diajukan).toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`status-badge ${item.status === 'Disetujui' ? 'disetujui' : item.status === 'Ditolak' ? 'ditolak' : 'pending'}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mobile-card-row items-center pt-2 border-t border-gray-100 mt-1">
                                            <div className="flex flex-col gap-1 w-full text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Disetujui:</span>
                                                    <span className="font-semibold text-blue-600">
                                                        {item.jumlah_disetujui ? `Rp ${Number(item.jumlah_disetujui).toLocaleString('id-ID')}` : '-'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Realisasi:</span>
                                                    <span className="font-semibold text-emerald-600">Rp {realisasiProgram.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-gray-50 pt-1 mt-0.5">
                                                    <span className="text-gray-500 font-medium">Sisa:</span>
                                                    <span className={`font-bold ${sisa >= 0 ? 'text-gray-900' : 'text-red-600'}`}>Rp {sisa.toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default LaporanPenyaluranPage
