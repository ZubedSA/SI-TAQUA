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
import ResponsiveTable from '../../../../../components/ui/ResponsiveTable'
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
                        Laporan Hafalan Harian
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
                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'Santri', render: (row) => row.santri?.nama || '-', className: 'font-medium text-gray-900' },
                            { header: 'Juz/Surah', render: (row) => `Juz ${row.juz_mulai || row.juz} - ${row.surah_mulai || row.surah}` },
                            { header: 'Ayat', render: (row) => `${row.ayat_mulai} - ${row.ayat_selesai}` },
                            { 
                                header: 'Jenis', 
                                render: (row) => <span className={`badge ${row.jenis === 'Setoran' ? 'badge-success' : 'badge-info'}`}>{row.jenis}</span>
                            },
                            { 
                                header: 'Status', 
                                render: (row) => <span className={`badge ${row.status === 'Lancar' ? 'badge-success' : row.status === 'Sedang' ? 'badge-warning' : 'badge-danger'}`}>{row.status}</span>
                            },
                            {
                                header: 'Aksi',
                                hideOnMobile: true,
                                render: (row) => (
                                    <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => sendWhatsApp(row)}
                                        title="Kirim ke WhatsApp"
                                    >
                                        <MessageCircle size={16} />
                                    </button>
                                )
                            }
                        ]}
                        data={data}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.santri?.nama || '-'}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">Juz {row.juz_mulai || row.juz} - {row.surah_mulai || row.surah}</span>
                            </div>
                        )}
                        mobileCardActions={(row) => null}
                        mobileCardPrimaryAction={(row) => (
                            <button
                                className="w-full btn btn-success flex items-center justify-center gap-2 mt-2"
                                onClick={() => sendWhatsApp(row)}
                            >
                                <MessageCircle size={16} /> Kirim WhatsApp
                            </button>
                        )}
                        mobileCardContent={(row) => (
                            <div className="flex flex-col gap-1 w-full text-xs mt-2 pt-2 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-500 font-medium">Status</span>
                                    <span className={`badge ${row.status === 'Lancar' ? 'badge-success' : row.status === 'Sedang' ? 'badge-warning' : 'badge-danger'} !text-[10px] !py-0.5 !px-2`}>{row.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Ayat:</span>
                                    <span className="font-semibold">{row.ayat_mulai} - {row.ayat_selesai}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Jenis:</span>
                                    <span className={`badge ${row.jenis === 'Setoran' ? 'badge-success' : 'badge-info'} !text-[10px] !py-0.5 !px-2`}>{row.jenis}</span>
                                </div>
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    )
}

export default LaporanHafalanHarianPage
