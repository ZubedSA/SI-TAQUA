import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Download, Printer, Users, Search, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useUserHalaqoh } from '../../../../../hooks/features/useUserHalaqoh'
import DateRangePicker from '../../../../../components/ui/DateRangePicker'
import { useCalendar } from '../../../../../context/CalendarContext'
import ResponsiveTable from '../../../../../components/ui/ResponsiveTable'
import '../../../../../pages/laporan/Laporan.css'

const LaporanRekapMingguanPage = () => {
    // =============================================
    // STATE
    // =============================================
    const { formatDate, mode } = useCalendar()
    const [loading, setLoading] = useState(false)
    const [reportData, setReportData] = useState([])

    useEffect(() => {
        console.log('[LaporanRekapMingguan] Mode changed:', mode)
    }, [mode])


    // Filter dengan rentang tanggal fleksibel
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 6)

    // Hook Data Halaqoh (Auto Filter)
    const {
        halaqohList,
        halaqohIds,
        isLoading: loadingHalaqoh,
        hasHalaqoh,
        isAdmin,
        selectedHalaqohId,
        setSelectedHalaqohId
    } = useUserHalaqoh()

    const [filters, setFilters] = useState({
        // halaqoh_id removed, using selectedHalaqohId
        tanggal_mulai: weekAgo.toISOString().split('T')[0],
        tanggal_akhir: today.toISOString().split('T')[0]
    })

    // Auto-select handled by hook now. Removed useEffect.

    // =============================================
    // FETCH REPORT DATA
    // =============================================
    const fetchReportData = async () => {
        console.log('[LaporanRekapMingguan] Fetch triggered:', filters)
        if (!selectedHalaqohId) return
        if (!filters.tanggal_mulai || !filters.tanggal_akhir) return

        setLoading(true)

        try {
            // STEP 1: Ambil daftar santri aktif di halaqoh
            const { data: santriList, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', selectedHalaqohId)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError

            if (!santriList || santriList.length === 0) {
                setReportData([])
                setLoading(false)
                return
            }

            const santriIds = santriList.map(s => s.id)

            // STEP 2: Ambil data hafalan dalam rentang tanggal
            const { data: hafalanList, error: hafalanError } = await supabase
                .from('hafalan')
                .select('id, santri_id, jenis, ayat_mulai, ayat_selesai, status, tanggal')
                .in('santri_id', santriIds)
                .gte('tanggal', filters.tanggal_mulai)
                .lte('tanggal', filters.tanggal_akhir)

            if (hafalanError) throw hafalanError

            // STEP 3: Ambil data presensi dalam rentang tanggal
            const { data: presensiList, error: presensiError } = await supabase
                .from('presensi')
                .select('santri_id, status, tanggal')
                .in('santri_id', santriIds)
                .gte('tanggal', filters.tanggal_mulai)
                .lte('tanggal', filters.tanggal_akhir)

            if (presensiError) console.error('Presensi error:', presensiError)

            // STEP 4: Proses dan agregasi data per santri
            const processedData = santriList.map(santri => {
                // Filter data untuk santri ini
                const santriHafalan = (hafalanList || []).filter(h => h.santri_id === santri.id)
                const santriPresensi = (presensiList || []).filter(p => p.santri_id === santri.id)

                // Inisialisasi counter
                let setoranCount = 0, setoranAyat = 0
                let murajaahCount = 0, murajaahAyat = 0
                let ziyadahCount = 0, ziyadahAyat = 0

                // Hitung per jenis hafalan
                santriHafalan.forEach(h => {
                    const jenis = (h.jenis || '').toLowerCase().trim()
                    const jumlahAyat = Math.max(0, (h.ayat_selesai || 0) - (h.ayat_mulai || 0) + 1)

                    if (jenis === 'setoran' || jenis === 'hafalan baru' || jenis === '') {
                        setoranCount++
                        setoranAyat += jumlahAyat
                    } else if (jenis.includes('muroja') || jenis.includes('muraja')) {
                        murajaahCount++
                        murajaahAyat += jumlahAyat
                    } else if (jenis.includes('ziyadah')) {
                        ziyadahCount++
                        ziyadahAyat += jumlahAyat
                    }
                })

                // Hitung kehadiran
                const totalHari = santriPresensi.length
                const hadir = santriPresensi.filter(p =>
                    p.status?.toLowerCase() === 'hadir'
                ).length

                // Tentukan status berdasarkan performa
                let status = 'Belum Ada Data'
                if (santriHafalan.length > 0) {
                    const lancar = santriHafalan.filter(h =>
                        h.status?.toLowerCase() === 'lancar'
                    ).length
                    const ratio = lancar / santriHafalan.length

                    if (ratio >= 0.8) status = 'Sangat Baik'
                    else if (ratio >= 0.6) status = 'Baik'
                    else if (ratio >= 0.4) status = 'Cukup'
                    else status = 'Perlu Perhatian'
                }

                return {
                    id: santri.id,
                    nis: santri.nis || '-',
                    nama: santri.nama,
                    setoran_count: setoranCount,
                    setoran_ayat: setoranAyat,
                    murajaah_count: murajaahCount,
                    murajaah_ayat: murajaahAyat,
                    ziyadah_count: ziyadahCount,
                    ziyadah_ayat: ziyadahAyat,
                    total_ayat: setoranAyat + murajaahAyat + ziyadahAyat,
                    kehadiran: totalHari > 0 ? `${hadir}/${totalHari}` : '-',
                    status: status
                }
            })

            setReportData(processedData)

        } catch (error) {
            console.error('Error fetching report:', error)
            alert('Gagal memuat data: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    // =============================================
    // TRIGGER FETCH ON FILTER CHANGE (REAL-TIME)
    // =============================================
    useEffect(() => {
        if (selectedHalaqohId && filters.tanggal_mulai && filters.tanggal_akhir) {
            fetchReportData()
        }
    }, [selectedHalaqohId, filters.tanggal_mulai, filters.tanggal_akhir])

    // =============================================
    // STATUS BADGE STYLING
    // =============================================
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Sangat Baik': return 'badge-success'
            case 'Baik': return 'badge-info'
            case 'Cukup': return 'badge-warning'
            case 'Perlu Perhatian': return 'badge-danger'
            default: return ''
        }
    }

    // =============================================
    // GENERATE PDF
    // =============================================
    const generatePDF = async () => {
        if (reportData.length === 0) return

        const selectedHalaqoh = halaqohList.find(h => h.id === selectedHalaqohId)
        const periodeStr = `${formatDate(filters.tanggal_mulai)} s/d ${formatDate(filters.tanggal_akhir)}`

        await generateLaporanPDF({
            title: 'LAPORAN REKAP HAFALAN MINGGUAN',
            subtitle: 'Rekapitulasi Hafalan Mingguan Santri',
            orientation: 'landscape',
            additionalInfo: [
                { label: 'Halaqoh', value: selectedHalaqoh?.nama || (selectedHalaqoh?.nama_halaqoh || '-') },
                { label: 'Periode', value: periodeStr }
            ],
            columns: ['NIS', 'Nama Santri', 'Setoran Baru', 'Muroja\'ah', 'Ziyadah Ulang', 'Total Ayat', 'Kehadiran', 'Status'],
            data: reportData.map(row => [
                row.nis,
                row.nama,
                `${row.setoran_count}x (${row.setoran_ayat} ayat)`,
                `${row.murajaah_count}x (${row.murajaah_ayat} ayat)`,
                `${row.ziyadah_count}x (${row.ziyadah_ayat} ayat)`,
                row.total_ayat,
                row.kehadiran,
                row.status
            ]),
            filename: `Laporan_Mingguan_${filters.tanggal_mulai}_${filters.tanggal_akhir}`,
            totalLabel: 'Total Santri',
            totalValue: `${reportData.length} Santri`
        })
    }

    const handleDownloadExcel = () => {
        const columns = ['NIS', 'Nama Santri', 'Setoran Baru', 'Muroja\'ah', 'Ziyadah Ulang', 'Total Ayat', 'Kehadiran', 'Status']
        const exportData = reportData.map(row => ({
            NIS: row.nis,
            'Nama Santri': row.nama,
            'Setoran Baru': `${row.setoran_count}x (${row.setoran_ayat} ayat)`,
            'Muroja\'ah': `${row.murajaah_count}x (${row.murajaah_ayat} ayat)`,
            'Ziyadah Ulang': `${row.ziyadah_count}x (${row.ziyadah_ayat} ayat)`,
            'Total Ayat': row.total_ayat,
            Kehadiran: row.kehadiran,
            Status: row.status
        }))
        exportToExcel(exportData, columns, 'laporan_rekap_mingguan')
    }

    const handleDownloadCSV = () => {
        const columns = ['NIS', 'Nama Santri', 'Setoran Baru', 'Muroja\'ah', 'Ziyadah Ulang', 'Total Ayat', 'Kehadiran', 'Status']
        const exportData = reportData.map(row => ({
            NIS: row.nis,
            'Nama Santri': row.nama,
            'Setoran Baru': `${row.setoran_count}x (${row.setoran_ayat} ayat)`,
            'Muroja\'ah': `${row.murajaah_count}x (${row.murajaah_ayat} ayat)`,
            'Ziyadah Ulang': `${row.ziyadah_count}x (${row.ziyadah_ayat} ayat)`,
            'Total Ayat': row.total_ayat,
            Kehadiran: row.kehadiran,
            Status: row.status
        }))
        exportToCSV(exportData, columns, 'laporan_rekap_mingguan')
    }

    // =============================================
    // RENDER
    // =============================================
    return (
        <div className="laporan-page">
            {/* HEADER */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Laporan Rekap Mingguan
                    </h1>
                    <p className="page-subtitle">Rekap hafalan per rentang tanggal</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={generatePDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                        disabled={reportData.length === 0}
                    />
                    <button
                        className="btn btn-outline"
                        disabled={reportData.length === 0}
                        onClick={() => window.print()}
                    >
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>

            {/* FILTERS */}
            <div className="filter-section">
                <div className="form-group">
                    <label className="form-label">Halaqoh *</label>
                    {loadingHalaqoh ? (
                        <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={16} className="spin" /> Memuat...
                        </div>
                    ) : !hasHalaqoh && !isAdmin ? (
                        <div className="alert alert-warning" style={{ margin: 0 }}>
                            <AlertCircle size={16} /> Belum ada halaqoh
                        </div>
                    ) : (!isAdmin && halaqohList.length === 1) ? (
                        <input
                            type="text"
                            className="form-control"
                            value={halaqohList[0]?.nama || (halaqohList[0]?.nama_halaqoh || '')}
                            disabled
                            readOnly
                            style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed' }}
                        />
                    ) : (
                        <select
                            className="form-control"
                            value={selectedHalaqohId}
                            onChange={e => setSelectedHalaqohId(e.target.value)}
                        >
                            {isAdmin && <option value="">Pilih Halaqoh</option>}
                            {halaqohList.map(h => (
                                <option key={h.id} value={h.id}>{h.nama || h.nama_halaqoh}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Periode</label>
                    <DateRangePicker
                        startDate={filters.tanggal_mulai}
                        endDate={filters.tanggal_akhir}
                        onChange={(start, end) => setFilters({
                            ...filters,
                            tanggal_mulai: start,
                            tanggal_akhir: end
                        })}
                    />
                </div>

                <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                    <button
                        className="btn btn-primary"
                        onClick={fetchReportData}
                        disabled={!selectedHalaqohId || loading}
                    >
                        <Search size={18} /> Tampilkan
                    </button>
                </div>
            </div>

            {/* PERIOD INFO */}
            {selectedHalaqohId && filters.tanggal_mulai && filters.tanggal_akhir && (
                <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Calendar size={18} style={{ color: '#059669' }} />
                    <strong>Periode:</strong>
                    <span style={{ color: '#166534' }}>
                        {formatDate(filters.tanggal_mulai)}
                        {' s/d '}
                        {formatDate(filters.tanggal_akhir)}
                    </span>
                </div>
            )}

            {/* DATA TABLE */}
            <div className="card">
                {loading ? (
                    <div className="loading-state">
                        <RefreshCw className="spin" size={24} />
                        <span>Memuat data...</span>
                    </div>
                ) : !selectedHalaqohId ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Pilih halaqoh dan rentang tanggal untuk melihat laporan</p>
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Tidak ada data untuk periode yang dipilih</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                            { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                            { header: 'Setoran Baru', render: (row) => `${row.setoran_count}x (${row.setoran_ayat} ayat)`, className: 'text-center' },
                            { header: "Muroja'ah", render: (row) => `${row.murajaah_count}x (${row.murajaah_ayat} ayat)`, className: 'text-center' },
                            { header: 'Ziyadah Ulang', render: (row) => `${row.ziyadah_count}x (${row.ziyadah_ayat} ayat)`, className: 'text-center' },
                            { header: 'Total Ayat', accessor: 'total_ayat', className: 'text-center font-semibold' },
                            { header: 'Kehadiran', accessor: 'kehadiran', className: 'text-center' },
                            { 
                                header: 'Status', 
                                className: 'text-center',
                                render: (row) => <span className={`badge ${getStatusBadgeClass(row.status)}`}>{row.status}</span>
                            }
                        ]}
                        data={reportData}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={(row) => (
                            <div className="flex flex-col gap-1 w-full text-xs mt-2 pt-2 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-500 font-medium">Status</span>
                                    <span className={`badge ${getStatusBadgeClass(row.status)} !text-[10px] !py-0.5 !px-2`}>{row.status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Setoran Baru:</span>
                                    <span className="font-semibold">{row.setoran_count}x ({row.setoran_ayat} ayat)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Muroja'ah:</span>
                                    <span className="font-semibold">{row.murajaah_count}x ({row.murajaah_ayat} ayat)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Ziyadah Ulang:</span>
                                    <span className="font-semibold">{row.ziyadah_count}x ({row.ziyadah_ayat} ayat)</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-50 pt-1 mt-0.5">
                                    <span className="text-gray-500 font-medium">Total Ayat:</span>
                                    <span className="font-bold text-[#059669]">{row.total_ayat}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-50 pt-1 mt-0.5">
                                    <span className="text-gray-500">Kehadiran:</span>
                                    <span className="font-semibold">{row.kehadiran}</span>
                                </div>
                            </div>
                        )}
                        footer={
                            <tr>
                                <td colSpan={3} className="text-right pr-4 font-bold">TOTAL ({reportData.length} santri)</td>
                                <td className="text-center font-medium">
                                    {reportData.reduce((sum, r) => sum + r.setoran_count, 0)}x ({reportData.reduce((sum, r) => sum + r.setoran_ayat, 0)} ayat)
                                </td>
                                <td className="text-center font-medium">
                                    {reportData.reduce((sum, r) => sum + r.murajaah_count, 0)}x ({reportData.reduce((sum, r) => sum + r.murajaah_ayat, 0)} ayat)
                                </td>
                                <td className="text-center font-medium">
                                    {reportData.reduce((sum, r) => sum + r.ziyadah_count, 0)}x ({reportData.reduce((sum, r) => sum + r.ziyadah_ayat, 0)} ayat)
                                </td>
                                <td className="text-center font-bold text-[#059669]">
                                    {reportData.reduce((sum, r) => sum + r.total_ayat, 0)}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        }
                    />
                )}
            </div>
        </div>
    )
}

export default LaporanRekapMingguanPage
