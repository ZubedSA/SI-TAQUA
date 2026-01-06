import { useState, useEffect } from 'react'
import { BookMarked, RefreshCw, MessageCircle, Users, Send, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { useUserHalaqoh } from '../../../../../hooks/features/useUserHalaqoh'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import DateRangePicker from '../../../../../components/ui/DateRangePicker'
import { useCalendar } from '../../../../../context/CalendarContext'
import { createMessage, sendWhatsApp as sendWhatsAppGlobal } from '../../../../../utils/whatsapp'
import '../../../../../pages/laporan/Laporan.css'

const LaporanHafalanHarianPage = () => {
    const { formatDate, mode } = useCalendar()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState([])

    // AUTO-FILTER: Halaqoh adalah ATRIBUT AKUN, bukan input user
    const { halaqohIds, halaqohNames, isLoading: loadingHalaqoh, hasHalaqoh, isAdmin } = useUserHalaqoh()

    const [filters, setFilters] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    })

    const fetchData = async () => {
        console.log('[LaporanHafalanHarian] Fetch triggered:', filters)
        console.log('[LaporanHafalanHarian] Mode:', mode)
        if (!hasHalaqoh) return
        setLoading(true)

        try {
            // Get santri based on halaqoh
            let santriQuery = supabase
                .from('santri')
                .select('id')
                .eq('status', 'Aktif')

            if (!isAdmin && halaqohIds.length > 0) {
                santriQuery = santriQuery.in('halaqoh_id', halaqohIds)
            } else if (!isAdmin && halaqohIds.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const { data: santriData } = await santriQuery

            if (!santriData || santriData.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const santriIds = santriData.map(s => s.id)

            // Fetch hafalan data
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select(`
                    id, tanggal, juz, juz_mulai, surah, surah_mulai, surah_selesai, 
                    ayat_mulai, ayat_selesai, jenis, status, catatan,
                    santri:santri_id (id, nama, nis, no_telp_wali, nama_wali)
                `)
                .in('santri_id', santriIds)
                .in('santri_id', santriIds)
                .gte('tanggal', filters.startDate)
                .lte('tanggal', filters.endDate)
                .order('created_at', { ascending: false })

            setData(hafalanData || [])
        } catch (err) {
            console.error('Error fetching data:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!loadingHalaqoh && hasHalaqoh) fetchData()
    }, [halaqohIds, loadingHalaqoh, filters.startDate, filters.endDate])

    const sendWhatsApp = (item) => {
        const santri = item.santri
        if (!santri?.no_telp_wali) {
            alert('Nomor WA wali tidak tersedia')
            return
        }

        const message = createMessage({
            intro: `LAPORAN HAFALAN HARIAN`,
            data: [
                `Kepada Yth. *${santri.nama_wali || 'Wali Santri'}*`,
                { label: 'Nama', value: santri.nama },
                { label: 'Tanggal', value: formatDate(item.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                `--- Detail Hafalan ---`,
                { label: 'Juz', value: item.juz_mulai || item.juz },
                { label: 'Surah', value: item.surah_mulai || item.surah },
                { label: 'Ayat', value: `${item.ayat_mulai} - ${item.ayat_selesai}` },
                { label: 'Jenis', value: item.jenis },
                { label: 'Status', value: item.status },
                item.catatan ? { label: 'Catatan', value: item.catatan } : null
            ],
            closing: "Jazakumullah khairan."
        })

        sendWhatsAppGlobal(santri.no_telp_wali, message)
    }

    const sendAllWhatsApp = () => {
        if (data.length === 0) return
        if (!window.confirm(`Kirim laporan ke ${data.length} wali santri?`)) return
        data.forEach((item, index) => {
            setTimeout(() => sendWhatsApp(item), index * 2000)
        })
    }

    const generatePDF = async () => {
        if (data.length === 0) return
        const tanggalFormatted = `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`

        await generateLaporanPDF({
            title: 'LAPORAN HAFALAN HARIAN',
            subtitle: 'Laporan Hafalan Santri Harian',
            additionalInfo: [
                { label: 'Halaqoh', value: isAdmin ? 'Semua Halaqoh' : halaqohNames },
                { label: 'Tanggal', value: tanggalFormatted }
            ],
            columns: ['Santri', 'Juz/Surah', 'Ayat', 'Jenis', 'Status'],
            data: data.map(item => [
                item.santri?.nama || '-',
                `Juz ${item.juz_mulai || item.juz} - ${item.surah_mulai || item.surah}`,
                `${item.ayat_mulai} - ${item.ayat_selesai}`,
                item.jenis,
                item.status
            ]),
            filename: `Hafalan_Harian_${filters.startDate}_${filters.endDate}`,
            totalLabel: 'Total Santri',
            totalValue: `${data.length} Santri`
        })
    }

    const handleDownloadExcel = () => {
        const columns = ['Santri', 'Juz/Surah', 'Ayat', 'Jenis', 'Status']
        const exportData = data.map(item => ({
            Santri: item.santri?.nama || '-',
            'Juz/Surah': `Juz ${item.juz_mulai || item.juz} - ${item.surah_mulai || item.surah}`,
            Ayat: `${item.ayat_mulai} - ${item.ayat_selesai}`,
            Jenis: item.jenis,
            Status: item.status
        }))
        exportToExcel(exportData, columns, 'hafalan_harian')
    }

    const handleDownloadCSV = () => {
        const columns = ['Santri', 'Juz/Surah', 'Ayat', 'Jenis', 'Status']
        const exportData = data.map(item => ({
            Santri: item.santri?.nama || '-',
            'Juz/Surah': `Juz ${item.juz_mulai || item.juz} - ${item.surah_mulai || item.surah}`,
            Ayat: `${item.ayat_mulai} - ${item.ayat_selesai}`,
            Jenis: item.jenis,
            Status: item.status
        }))
        exportToCSV(exportData, columns, 'hafalan_harian')
    }

    if (loadingHalaqoh) {
        return <div className="loading-state"><RefreshCw className="spin" size={24} /> Memuat data...</div>
    }

    if (!hasHalaqoh) {
        return (
            <div className="laporan-page">
                <div className="alert alert-warning" style={{ maxWidth: '600px', margin: '40px auto' }}>
                    <AlertCircle size={24} />
                    <div>
                        <strong>Akses Dibatasi</strong>
                        <p>Akun Anda belum terhubung dengan halaqoh. Hubungi admin.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <BookMarked className="title-icon green" /> Laporan Hafalan Harian
                    </h1>
                    <p className="page-subtitle">Kirim laporan hafalan harian via WhatsApp</p>
                </div>
                <div className="header-actions">
                    {data.length > 0 && (
                        <>
                            <DownloadButton
                                onDownloadPDF={generatePDF}
                                onDownloadExcel={handleDownloadExcel}
                                onDownloadCSV={handleDownloadCSV}
                            />
                            <button className="btn btn-success" onClick={sendAllWhatsApp}>
                                <Send size={18} /> Kirim Semua WA
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="filter-section">
                {/* HALAQOH INFO - Read-only */}
                <div className="form-group">
                    <label className="form-label">Halaqoh</label>
                    <input
                        type="text"
                        className="form-control"
                        value={isAdmin ? 'Semua Halaqoh (Admin)' : (halaqohNames || 'Memuat...')}
                        disabled
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed' }}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Periode</label>
                    <DateRangePicker
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onChange={(start, end) => setFilters({ ...filters, startDate: start, endDate: end })}
                    />
                </div>

                <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={fetchData}>
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading-state">
                        <RefreshCw className="spin" size={24} />
                        <span>Memuat data...</span>
                    </div>
                ) : data.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Tidak ada data hafalan untuk tanggal ini</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Santri</th>
                                    <th>Juz/Surah</th>
                                    <th>Ayat</th>
                                    <th>Jenis</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, i) => (
                                    <tr key={item.id}>
                                        <td>{i + 1}</td>
                                        <td>{item.santri?.nama || '-'}</td>
                                        <td>Juz {item.juz_mulai || item.juz} - {item.surah_mulai || item.surah}</td>
                                        <td>{item.ayat_mulai} - {item.ayat_selesai}</td>
                                        <td><span className={`badge ${item.jenis === 'Setoran' ? 'badge-success' : 'badge-info'}`}>{item.jenis}</span></td>
                                        <td><span className={`badge ${item.status === 'Lancar' ? 'badge-success' : item.status === 'Sedang' ? 'badge-warning' : 'badge-danger'}`}>{item.status}</span></td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => sendWhatsApp(item)}
                                                title="Kirim ke WhatsApp"
                                            >
                                                <MessageCircle size={16} />
                                            </button>
                                        </td>
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

export default LaporanHafalanHarianPage
