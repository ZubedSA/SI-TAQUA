import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Download, Printer, Users } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useUserHalaqoh } from '../../../../../hooks/features/useUserHalaqoh'
import { useCalendar } from '../../../../../context/CalendarContext'
import ResponsiveTable from '../../../../../components/ui/ResponsiveTable'
import '../../../../../pages/laporan/Laporan.css'

import SmartMonthYearFilter from '../../../../../components/common/SmartMonthYearFilter'

const LaporanUjianSyahriPage = () => {
    const { formatDate, mode } = useCalendar()
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
        console.log('[LaporanUjianSyahri] Fetch triggered:', filters)
        console.log('[LaporanUjianSyahri] Mode:', mode)
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
        // const bulanNama = bulanOptions.find(b => b.value === filters.bulan)?.label || '-'
        // Use standard date formatter for period name since options are gone
        const dateObj = new Date(filters.tahun, filters.bulan - 1, 1)
        const bulanNama = dateObj.toLocaleDateString('id-ID', { month: 'long' })

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
            totalValue: `${data.length} Santri`,
            printedAt: formatDate(new Date())
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
                        Laporan Ujian Syahri
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

                <SmartMonthYearFilter
                    filters={filters}
                    onFilterChange={setFilters}
                />
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
                    <div className="table-container">
                        <ResponsiveTable
                            columns={[
                                { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                                { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                                { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                                { header: 'Hafalan', accessor: 'hafalan', className: 'text-center' },
                                { header: 'Tajwid', accessor: 'tajwid', className: 'text-center' },
                                { header: 'Tilawah', accessor: 'tilawah', className: 'text-center' },
                                { header: 'Rata-rata', accessor: 'rata_rata', className: 'text-center font-semibold' },
                                { 
                                    header: 'Predikat', 
                                    className: 'text-center',
                                    render: (row) => <span className={`badge ${getPredikatBadgeClass(row.predikat)}`}>{row.predikat}</span>
                                },
                                { 
                                    header: 'Pencapaian Terakhir', 
                                    className: 'text-center text-sm',
                                    render: (row) => row.pencapaian_juz !== '-' ? (
                                        <span>Juz {row.pencapaian_juz}<br /><small className="text-gray-500">{row.pencapaian_surah}</small></span>
                                    ) : '-'
                                },
                                { header: 'Jml Juz', render: (row) => row.jumlah_hafalan !== '-' ? `${row.jumlah_hafalan} Juz` : '-', className: 'text-center' },
                                { header: 'Jml Hal', render: (row) => row.jumlah_hafalan_halaman !== '-' ? `${row.jumlah_hafalan_halaman} Hal` : '-', className: 'text-center' },
                                { header: 'Mukhtabir', accessor: 'penguji', className: 'text-center text-sm' }
                            ]}
                            data={data}
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
                                        <span className="text-gray-500 font-medium">Predikat</span>
                                        <span className={`badge ${getPredikatBadgeClass(row.predikat)} !text-[10px] !py-0.5 !px-2`}>{row.predikat}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Hafalan:</span>
                                        <span className="font-semibold">{row.hafalan}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tajwid:</span>
                                        <span className="font-semibold">{row.tajwid}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tilawah:</span>
                                        <span className="font-semibold">{row.tilawah}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-50 pt-1 mt-0.5">
                                        <span className="text-gray-500 font-medium">Rata-rata:</span>
                                        <span className="font-bold text-gray-900">{row.rata_rata}</span>
                                    </div>
                                    
                                    <div className="flex justify-between border-t border-gray-50 pt-1 mt-1">
                                        <span className="text-gray-500">Pencapaian:</span>
                                        <span className="font-semibold text-right">
                                            {row.pencapaian_juz !== '-' ? `Juz ${row.pencapaian_juz} - ${row.pencapaian_surah}` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Mukhtabir:</span>
                                        <span className="font-semibold">{row.penguji}</span>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>
        </div >
    )
}

export default LaporanUjianSyahriPage
