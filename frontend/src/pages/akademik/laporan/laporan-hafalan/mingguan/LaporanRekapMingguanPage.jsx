import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Download, Printer, Users, Search } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import '../../../../../pages/laporan/Laporan.css'

const LaporanRekapMingguanPage = () => {
    // =============================================
    // STATE
    // =============================================
    const [loading, setLoading] = useState(false)
    const [halaqohList, setHalaqohList] = useState([])
    const [reportData, setReportData] = useState([])

    // Filter dengan rentang tanggal fleksibel
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 6)

    const [filters, setFilters] = useState({
        halaqoh_id: '',
        tanggal_mulai: weekAgo.toISOString().split('T')[0],
        tanggal_akhir: today.toISOString().split('T')[0]
    })

    // =============================================
    // LOAD HALAQOH OPTIONS
    // =============================================
    useEffect(() => {
        const loadHalaqoh = async () => {
            const { data, error } = await supabase
                .from('halaqoh')
                .select('id, nama')
                .order('nama')

            if (error) {
                console.error('Error loading halaqoh:', error)
                return
            }
            setHalaqohList(data || [])
        }
        loadHalaqoh()
    }, [])

    // =============================================
    // FETCH REPORT DATA
    // =============================================
    const fetchReportData = async () => {
        if (!filters.halaqoh_id) return
        if (!filters.tanggal_mulai || !filters.tanggal_akhir) return

        setLoading(true)

        try {
            // STEP 1: Ambil daftar santri aktif di halaqoh
            const { data: santriList, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', filters.halaqoh_id)
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

                    if (jenis === 'setoran' || jenis === '') {
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
        if (filters.halaqoh_id && filters.tanggal_mulai && filters.tanggal_akhir) {
            fetchReportData()
        }
    }, [filters.halaqoh_id, filters.tanggal_mulai, filters.tanggal_akhir])

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

        const selectedHalaqoh = halaqohList.find(h => h.id === filters.halaqoh_id)
        const periodeStr = `${new Date(filters.tanggal_mulai).toLocaleDateString('id-ID')} s/d ${new Date(filters.tanggal_akhir).toLocaleDateString('id-ID')}`

        await generateLaporanPDF({
            title: 'LAPORAN REKAP HAFALAN MINGGUAN',
            subtitle: 'Rekapitulasi Hafalan Mingguan Santri',
            orientation: 'landscape', // Landscape for wide tables
            additionalInfo: [
                { label: 'Halaqoh', value: selectedHalaqoh?.nama || '-' },
                { label: 'Periode', value: periodeStr }
            ],
            columns: ['NIS', 'Nama Santri', 'Setoran', 'Muroja\'ah', 'Ziyadah Ulang', 'Total Ayat', 'Kehadiran', 'Status'],
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
        const columns = ['NIS', 'Nama Santri', 'Setoran', 'Muroja\'ah', 'Ziyadah Ulang', 'Total Ayat', 'Kehadiran', 'Status']
        const exportData = reportData.map(row => ({
            NIS: row.nis,
            'Nama Santri': row.nama,
            Setoran: `${row.setoran_count}x (${row.setoran_ayat} ayat)`,
            'Muroja\'ah': `${row.murajaah_count}x (${row.murajaah_ayat} ayat)`,
            'Ziyadah Ulang': `${row.ziyadah_count}x (${row.ziyadah_ayat} ayat)`,
            'Total Ayat': row.total_ayat,
            Kehadiran: row.kehadiran,
            Status: row.status
        }))
        exportToExcel(exportData, columns, 'laporan_rekap_mingguan')
    }

    const handleDownloadCSV = () => {
        const columns = ['NIS', 'Nama Santri', 'Setoran', 'Muroja\'ah', 'Ziyadah Ulang', 'Total Ayat', 'Kehadiran', 'Status']
        const exportData = reportData.map(row => ({
            NIS: row.nis,
            'Nama Santri': row.nama,
            Setoran: `${row.setoran_count}x (${row.setoran_ayat} ayat)`,
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
                        <Calendar className="title-icon blue" /> Laporan Rekap Mingguan
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
                    <select
                        className="form-control"
                        value={filters.halaqoh_id}
                        onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                    >
                        <option value="">Pilih Halaqoh</option>
                        {halaqohList.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Tanggal Mulai</label>
                    <input
                        type="date"
                        className="form-control"
                        value={filters.tanggal_mulai}
                        onChange={e => setFilters({ ...filters, tanggal_mulai: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Tanggal Akhir</label>
                    <input
                        type="date"
                        className="form-control"
                        value={filters.tanggal_akhir}
                        onChange={e => setFilters({ ...filters, tanggal_akhir: e.target.value })}
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
                        {new Date(filters.tanggal_mulai).toLocaleDateString('id-ID', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                        })}
                        {' s/d '}
                        {new Date(filters.tanggal_akhir).toLocaleDateString('id-ID', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                        })}
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
                                    <th style={{ textAlign: 'center' }}>Setoran</th>
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
