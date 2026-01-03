import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Download, Printer, Users } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useUserHalaqoh } from '../../../../../hooks/features/useUserHalaqoh'
import '../../../../../pages/laporan/Laporan.css'

const bulanOptions = [
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

const LaporanUjianSyahriPage = () => {
    // AUTO-FILTER: Halaqoh berdasarkan akun
    const {
        halaqohIds,
        halaqohNames,
        halaqohList,
        musyrifInfo,
        isLoading: loadingHalaqoh,
        hasHalaqoh,
        isAdmin
    } = useUserHalaqoh()

    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [guruMap, setGuruMap] = useState({})
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: '',
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    // Sync halaqoh data from hook (for non-admin)
    useEffect(() => {
        if (!isAdmin && hasHalaqoh && halaqohList.length > 0) {
            setHalaqoh(halaqohList)
            // Auto-select first halaqoh if not set
            if (!filters.halaqoh_id && halaqohIds.length > 0) {
                setFilters(prev => ({ ...prev, halaqoh_id: halaqohIds[0] }))
            }
        }
    }, [isAdmin, hasHalaqoh, halaqohList, halaqohIds])

    const fetchOptions = async () => {
        // Fetch semester & guru
        const [semRes, guruRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('guru').select('id, nama')
        ])

        // Only fetch all halaqohs if ADMIN
        if (isAdmin) {
            const { data: halRes } = await supabase.from('halaqoh').select('id, nama').order('nama')
            if (halRes) setHalaqoh(halRes)
        }

        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }

        if (guruRes.data) {
            const map = {}
            guruRes.data.forEach(g => { map[g.id] = g.nama })
            setGuruMap(map)
        }
    }

    const fetchData = async () => {
        if (!filters.halaqoh_id || !filters.semester_id) return
        setLoading(true)

        try {
            // Get santri in this halaqoh
            const { data: santriData } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', filters.halaqoh_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (!santriData || santriData.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const santriIds = santriData.map(s => s.id)

            // Get nilai data for this semester, month, and jenis_ujian = syahri
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select('*')
                .in('santri_id', santriIds)
                .eq('semester_id', filters.semester_id)
                .eq('jenis_ujian', 'syahri')
                .eq('bulan', filters.bulan)
                .eq('tahun', filters.tahun)

            // Get latest setoran (Pencapaian Terakhir) per santri
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select('santri_id, juz, surah, tanggal, jenis')
                .in('santri_id', santriIds)
                .eq('jenis', 'Setoran')
                .order('tanggal', { ascending: false })

            // Create map of latest setoran per santri
            const latestSetoranMap = {}
            hafalanData?.forEach(h => {
                if (!latestSetoranMap[h.santri_id]) {
                    latestSetoranMap[h.santri_id] = h
                }
            })

            // Map nilai to santri
            const result = santriData.map(santri => {
                const nilai = nilaiData?.find(n => n.santri_id === santri.id)
                const latestSetoran = latestSetoranMap[santri.id]

                const hafalan = nilai?.nilai_hafalan || 0
                const tajwid = nilai?.nilai_tajwid || 0
                const tilawah = nilai?.nilai_kelancaran || 0
                const rataRata = nilai ? ((hafalan + tajwid + tilawah) / 3) : 0

                let predikat = '-'
                if (nilai) {
                    if (rataRata >= 90) predikat = 'A (Mumtaz)'
                    else if (rataRata >= 80) predikat = 'B (Jayyid Jiddan)'
                    else if (rataRata >= 70) predikat = 'C (Jayyid)'
                    else if (rataRata >= 60) predikat = 'D (Maqbul)'
                    else predikat = 'E (Rasib)'
                }

                return {
                    ...santri,
                    hafalan: nilai ? hafalan : '-',
                    tajwid: nilai ? tajwid : '-',
                    tilawah: nilai ? tilawah : '-',
                    rata_rata: nilai ? rataRata.toFixed(1) : '-',
                    predikat,
                    pencapaian_juz: latestSetoran?.juz || '-',
                    pencapaian_surah: latestSetoran?.surah || '-',
                    jumlah_hafalan: nilai?.jumlah_hafalan || '-',
                    jumlah_hafalan_halaman: nilai?.jumlah_hafalan_halaman || '-',
                    penguji: nilai?.penguji_id ? (guruMap[nilai.penguji_id] || '-') : '-'
                }
            })

            setData(result)
        } catch (err) {
            console.error('Error fetching data:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.halaqoh_id && filters.semester_id) fetchData()
    }, [filters.halaqoh_id, filters.semester_id, filters.bulan, filters.tahun, guruMap])

    const getPredikatBadgeClass = (predikat) => {
        if (predikat.startsWith('A')) return 'badge-success'
        if (predikat.startsWith('B')) return 'badge-info'
        if (predikat.startsWith('C')) return 'badge-warning'
        if (predikat.startsWith('D')) return 'badge-warning'
        if (predikat.startsWith('E')) return 'badge-danger'
        return ''
    }

    const generatePDF = async () => {
        if (data.length === 0) return

        const selectedHalaqoh = halaqoh.find(h => h.id === filters.halaqoh_id)
        const bulanNama = bulanOptions.find(b => b.value === filters.bulan)?.label || '-'

        await generateLaporanPDF({
            title: 'LAPORAN UJIAN SYAHRI (BULANAN)',
            subtitle: 'Hasil Ujian Bulanan Tahfizhiyah',
            orientation: 'landscape',
            additionalInfo: [
                { label: 'Halaqoh', value: selectedHalaqoh?.nama || '-' },
                { label: 'Periode', value: `${bulanNama} ${filters.tahun}` }
            ],
            columns: ['NIS', 'Nama', 'Hafalan', 'Tajwid', 'Tilawah', 'Rata-rata', 'Predikat', 'Pencapaian', 'Jml Juz', 'Jml Hal', 'Penguji'],
            data: data.map(s => [
                s.nis,
                s.nama,
                s.hafalan,
                s.tajwid,
                s.tilawah,
                s.rata_rata,
                s.predikat,
                s.pencapaian_juz !== '-' ? `Juz ${s.pencapaian_juz} - ${s.pencapaian_surah}` : '-',
                s.jumlah_hafalan !== '-' ? `${s.jumlah_hafalan} Juz` : '-',
                s.jumlah_hafalan_halaman !== '-' ? `${s.jumlah_hafalan_halaman} Hal` : '-',
                s.penguji
            ]),
            filename: `Ujian_Syahri_${bulanNama}_${filters.tahun}`,
            totalLabel: 'Total Santri',
            totalValue: `${data.length} Santri`
        })
    }

    const handleDownloadExcel = () => {
        const columns = ['NIS', 'Nama', 'Hafalan', 'Tajwid', 'Tilawah', 'Rata-rata', 'Predikat', 'Pencapaian Terakhir', 'Jml Juz', 'Jml Hal', 'Mukhtabir']
        const exportData = data.map(s => ({
            NIS: s.nis,
            Nama: s.nama,
            Hafalan: s.hafalan,
            Tajwid: s.tajwid,
            Tilawah: s.tilawah,
            'Rata-rata': s.rata_rata,
            Predikat: s.predikat,
            'Pencapaian Terakhir': s.pencapaian_juz !== '-' ? `Juz ${s.pencapaian_juz} - ${s.pencapaian_surah}` : '-',
            'Jml Juz': s.jumlah_hafalan !== '-' ? `${s.jumlah_hafalan} Juz` : '-',
            'Jml Hal': s.jumlah_hafalan_halaman !== '-' ? `${s.jumlah_hafalan_halaman} Hal` : '-',
            Mukhtabir: s.penguji
        }))
        exportToExcel(exportData, columns, 'laporan_ujian_syahri')
    }

    const handleDownloadCSV = () => {
        const columns = ['NIS', 'Nama', 'Hafalan', 'Tajwid', 'Tilawah', 'Rata-rata', 'Predikat', 'Pencapaian Terakhir', 'Jml Juz', 'Jml Hal', 'Mukhtabir']
        const exportData = data.map(s => ({
            NIS: s.nis,
            Nama: s.nama,
            Hafalan: s.hafalan,
            Tajwid: s.tajwid,
            Tilawah: s.tilawah,
            'Rata-rata': s.rata_rata,
            Predikat: s.predikat,
            'Pencapaian Terakhir': s.pencapaian_juz !== '-' ? `Juz ${s.pencapaian_juz} - ${s.pencapaian_surah}` : '-',
            'Jml Juz': s.jumlah_hafalan !== '-' ? `${s.jumlah_hafalan} Juz` : '-',
            'Jml Hal': s.jumlah_hafalan_halaman !== '-' ? `${s.jumlah_hafalan_halaman} Hal` : '-',
            Mukhtabir: s.penguji
        }))
        exportToCSV(exportData, columns, 'laporan_ujian_syahri')
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FileText className="title-icon green" /> Laporan Ujian Syahri
                    </h1>
                    <p className="page-subtitle">Laporan hasil ujian bulanan (Syahri) - Tahfizhiyah</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={generatePDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                        disabled={data.length === 0}
                    />
                    <button className="btn btn-outline" disabled={data.length === 0} onClick={() => window.print()}>
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>

            <div className="filter-section">
                <div className="form-group">
                    <label className="form-label">Semester *</label>
                    <select
                        className="form-control"
                        value={filters.semester_id}
                        onChange={e => setFilters({ ...filters, semester_id: e.target.value })}
                    >
                        <option value="">Pilih Semester</option>
                        {semester.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nama} - {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Halaqoh *</label>
                    {(!isAdmin && halaqohList.length === 1) ? (
                        <input
                            type="text"
                            className="form-control"
                            value={halaqohList[0]?.nama || ''}
                            disabled
                            readOnly
                            style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed' }}
                        />
                    ) : (
                        <select
                            className="form-control"
                            value={filters.halaqoh_id}
                            onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                            disabled={loadingHalaqoh}
                        >
                            <option value="">{loadingHalaqoh ? 'Memuat...' : 'Pilih Halaqoh'}</option>
                            {halaqoh.map(h => (
                                <option key={h.id} value={h.id}>{h.nama}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Bulan *</label>
                    <select
                        className="form-control"
                        value={filters.bulan}
                        onChange={e => setFilters({ ...filters, bulan: parseInt(e.target.value) })}
                    >
                        {bulanOptions.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Tahun *</label>
                    <input
                        type="number"
                        className="form-control"
                        value={filters.tahun}
                        onChange={e => setFilters({ ...filters, tahun: parseInt(e.target.value) })}
                    />
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
                        <p>Pilih semester dan halaqoh untuk melihat laporan</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th style={{ textAlign: 'center' }}>Hafalan</th>
                                    <th style={{ textAlign: 'center' }}>Tajwid</th>
                                    <th style={{ textAlign: 'center' }}>Tilawah</th>
                                    <th style={{ textAlign: 'center' }}>Rata-rata</th>
                                    <th style={{ textAlign: 'center' }}>Predikat</th>
                                    <th style={{ textAlign: 'center' }}>Pencapaian Terakhir</th>
                                    <th style={{ textAlign: 'center' }}>Jml Juz</th>
                                    <th style={{ textAlign: 'center' }}>Jml Hal</th>
                                    <th style={{ textAlign: 'center' }}>Mukhtabir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((s, i) => (
                                    <tr key={s.id}>
                                        <td>{i + 1}</td>
                                        <td>{s.nis}</td>
                                        <td>{s.nama}</td>
                                        <td style={{ textAlign: 'center' }}>{s.hafalan}</td>
                                        <td style={{ textAlign: 'center' }}>{s.tajwid}</td>
                                        <td style={{ textAlign: 'center' }}>{s.tilawah}</td>
                                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{s.rata_rata}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${getPredikatBadgeClass(s.predikat)}`}>{s.predikat}</span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                            {s.pencapaian_juz !== '-' ? (
                                                <span>Juz {s.pencapaian_juz}<br /><small style={{ color: '#64748b' }}>{s.pencapaian_surah}</small></span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {s.jumlah_hafalan !== '-' ? `${s.jumlah_hafalan} Juz` : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {s.jumlah_hafalan_halaman !== '-' ? `${s.jumlah_hafalan_halaman} Hal` : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{s.penguji}</td>
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

export default LaporanUjianSyahriPage
