import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Download, Printer, Users, Search, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useUserHalaqoh } from '../../../../../hooks/features/useUserHalaqoh'
import DateRangePicker from '../../../../../components/ui/DateRangePicker'
import { useCalendar } from '../../../../../context/CalendarContext'
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
                        disabled={!filters.halaqoh_id || loading}
                    >
                        <Search size={18} /> Tampilkan
                    </button>
                </div>
            </div>

            {/* PERIOD INFO */}
            {filters.halaqoh_id && filters.tanggal_mulai && filters.tanggal_akhir && (
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
                ) : !filters.halaqoh_id ? (
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
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th style={{ textAlign: 'center' }}>Setoran Baru</th>
                                    <th style={{ textAlign: 'center' }}>Muroja'ah</th>
                                    <th style={{ textAlign: 'center' }}>Ziyadah Ulang</th>
                                    <th style={{ textAlign: 'center' }}>Total Ayat</th>
                                    <th style={{ textAlign: 'center' }}>Kehadiran</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, index) => (
                                    <tr key={row.id}>
                                        <td>{index + 1}</td>
                                        <td>{row.nis}</td>
                                        <td>{row.nama}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {row.setoran_count}x ({row.setoran_ayat} ayat)
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {row.murajaah_count}x ({row.murajaah_ayat} ayat)
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {row.ziyadah_count}x ({row.ziyadah_ayat} ayat)
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                            {row.total_ayat}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {row.kehadiran}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${getStatusBadgeClass(row.status)}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot style={{ backgroundColor: '#f8f9fa', fontWeight: '600' }}>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', paddingRight: '12px' }}>
                                        <strong>TOTAL ({reportData.length} santri)</strong>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {reportData.reduce((sum, r) => sum + r.setoran_count, 0)}x
                                        ({reportData.reduce((sum, r) => sum + r.setoran_ayat, 0)} ayat)
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {reportData.reduce((sum, r) => sum + r.murajaah_count, 0)}x
                                        ({reportData.reduce((sum, r) => sum + r.murajaah_ayat, 0)} ayat)
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {reportData.reduce((sum, r) => sum + r.ziyadah_count, 0)}x
                                        ({reportData.reduce((sum, r) => sum + r.ziyadah_ayat, 0)} ayat)
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#059669' }}>
                                        {reportData.reduce((sum, r) => sum + r.total_ayat, 0)}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LaporanRekapMingguanPage
