import { useState, useEffect, useMemo } from 'react'
import { FileText, RefreshCw, Download, Printer, Users } from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import { supabase } from '../../../../../lib/supabase'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useCalendar } from '../../../../../context/CalendarContext'
import DataTable from '../../../../../components/DataTable'
import '../../../../../pages/laporan/Laporan.css'

const columnHelper = createColumnHelper()

const LaporanUjianSemesterPage = () => {
    const { formatDate } = useCalendar()
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [kelas, setKelas] = useState([])
    const [data, setData] = useState([])
    const [mapelList, setMapelList] = useState([])
    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: '',
        kelas_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, halRes, kelasRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('halaqoh').select('id, nama').order('nama'),
            supabase.from('kelas').select('id, nama').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (halRes.data) setHalaqoh(halRes.data)
        if (kelasRes.data) setKelas(kelasRes.data)
    }

    const fetchData = async () => {
        if (!filters.semester_id || (!filters.halaqoh_id && !filters.kelas_id)) return
        setLoading(true)

        try {
            // Build santri query
            let santriQuery = supabase
                .from('santri')
                .select('id, nama, nis, kelas_id')
                .eq('status', 'Aktif')
                .order('nama')

            if (filters.halaqoh_id) {
                santriQuery = santriQuery.eq('halaqoh_id', filters.halaqoh_id)
            }
            if (filters.kelas_id) {
                santriQuery = santriQuery.eq('kelas_id', filters.kelas_id)
            }

            const { data: santriData } = await santriQuery

            if (!santriData || santriData.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const santriIds = santriData.map(s => s.id)

            // Get maps list FIRST - all active mapels (Filtered by Madrasiyah/Madrosiyah)
            const { data: mapelData } = await supabase
                .from('mapel')
                .select('id, nama, kode, kategori')
                .in('kategori', ['Madrasiyah', 'Madrosiyah'])
                .order('nama')

            if (mapelData) setMapelList(mapelData)

            // Get scores for this semester (UAS & Semester)
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select('*')
                .in('santri_id', santriIds)
                .eq('semester_id', filters.semester_id)
                .in('jenis_ujian', ['semester', 'uas']) // Fetch both types

            // Map nilai to santri
            let result = santriData.map(santri => {
                // Tahfizhiyah values
                const tahfizhGrades = nilaiData?.filter(n => n.santri_id === santri.id && n.kategori === 'Tahfizhiyah') || []

                // Prioritize 'semester' > 'uas'
                let nilaiTahfizh = tahfizhGrades.find(n => n.jenis_ujian === 'semester')
                if (!nilaiTahfizh) {
                    nilaiTahfizh = tahfizhGrades.find(n => n.jenis_ujian === 'uas')
                }

                const hafalan = nilaiTahfizh?.nilai_hafalan || 0
                const tajwid = nilaiTahfizh?.nilai_tajwid || 0
                const kelancaran = nilaiTahfizh?.nilai_kelancaran || 0
                const rataRataTahfizh = nilaiTahfizh ? ((hafalan + tajwid + kelancaran) / 3) : 0

                // Madrasiyah values - process all mapels
                const mapelScores = {}
                let totalMadrasiyah = 0
                let countMadrasiyah = 0

                // We use mapelData here to ensure we check every subject
                mapelData?.forEach(m => {
                    const grades = nilaiData?.filter(n =>
                        n.santri_id === santri.id &&
                        (n.kategori === 'Madrasiyah' || n.kategori === 'Madrosiyah') &&
                        n.mapel_id === m.id
                    ) || []

                    // Prioritize 'semester' > 'uas'
                    let scoreRecord = grades.find(n => n.jenis_ujian === 'semester')
                    if (!scoreRecord) {
                        scoreRecord = grades.find(n => n.jenis_ujian === 'uas')
                    }

                    const nilai = scoreRecord?.nilai_uas || scoreRecord?.nilai_akhir || 0
                    if (nilai > 0) {
                        mapelScores[m.id] = nilai
                        totalMadrasiyah += nilai
                        countMadrasiyah++
                    }
                })

                const rataRataMadrasiyah = countMadrasiyah > 0 ? totalMadrasiyah / countMadrasiyah : 0

                // Overall average
                let overallAvg = 0
                let totalComponents = 0
                if (nilaiTahfizh) {
                    overallAvg += rataRataTahfizh
                    totalComponents++
                }
                if (countMadrasiyah > 0) {
                    overallAvg += rataRataMadrasiyah
                    totalComponents++
                }
                overallAvg = totalComponents > 0 ? overallAvg / totalComponents : 0

                return {
                    ...santri,
                    // Tahfizhiyah
                    hafalan: nilaiTahfizh ? hafalan : '-',
                    tajwid: nilaiTahfizh ? tajwid : '-',
                    kelancaran: nilaiTahfizh ? kelancaran : '-',
                    rata_rata_tahfizh: nilaiTahfizh ? rataRataTahfizh.toFixed(1) : '-',
                    // Madrasiyah
                    mapelScores,
                    rata_rata_madrasiyah: countMadrasiyah > 0 ? rataRataMadrasiyah.toFixed(1) : '-',
                    // Overall
                    rata_rata_total: totalComponents > 0 ? overallAvg : 0, // Keep number for sorting
                    rata_rata_total_display: totalComponents > 0 ? overallAvg.toFixed(1) : '-'
                }
            })

            // Calculate Rankings (Standard Competition Ranking 1224)
            // Ensure rata_rata_total is treated as number
            result.forEach(r => {
                r.rata_rata_total = Number(r.rata_rata_total) || 0
            })

            result.sort((a, b) => b.rata_rata_total - a.rata_rata_total)

            let currentRank = 1
            for (let i = 0; i < result.length; i++) {
                if (i > 0 && result[i].rata_rata_total < result[i - 1].rata_rata_total) {
                    currentRank = i + 1
                }
                // Only rank if score > 0
                result[i].peringkat = result[i].rata_rata_total > 0 ? currentRank : '-'
            }

            console.log('Calculated Rankings:', result.map(s => ({
                nama: s.nama,
                avg: s.rata_rata_total,
                rank: s.peringkat
            })))

            setData(result)
        } catch (err) {
            console.error('Error fetching data:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.semester_id && (filters.halaqoh_id || filters.kelas_id)) fetchData()
    }, [filters.halaqoh_id, filters.kelas_id, filters.semester_id])

    const generatePDF = async () => {
        if (data.length === 0) return

        const selectedHalaqoh = halaqoh.find(h => h.id === filters.halaqoh_id)
        const selectedKelas = kelas.find(k => k.id === filters.kelas_id)
        const currentSem = semester.find(s => s.id === filters.semester_id)

        const columns = ['Peringkat', 'NIS', 'Nama', 'Hafalan', 'Tajwid', 'Kelancaran', 'Rata Tahfizh']
        mapelList.forEach(m => columns.push(m.kode || m.nama))
        columns.push('Rata Madros', 'Rata Total')

        await generateLaporanPDF({
            title: 'LAPORAN UJIAN SEMESTER',
            subtitle: 'Laporan Hasil Ujian Semester - Tahfizhiyah & Madrasiyah',
            additionalInfo: [
                { label: 'Halaqoh', value: selectedHalaqoh?.nama || '-' },
                { label: 'Kelas', value: selectedKelas?.nama || '-' },
                { label: 'Semester', value: `${currentSem?.nama || '-'} - ${currentSem?.tahun_ajaran || '-'}` }
            ],
            columns,
            data: data.map(s => {
                const row = [
                    s.peringkat,
                    s.nis,
                    s.nama,
                    s.hafalan,
                    s.tajwid,
                    s.kelancaran,
                    s.rata_rata_tahfizh
                ]
                mapelList.forEach(m => row.push(s.mapelScores[m.id] || '-'))
                row.push(s.rata_rata_madrasiyah, s.rata_rata_total_display)
                return row
            }),
            filename: `Ujian_Semester_${currentSem?.nama?.replace(/\s/g, '_') || 'Laporan'}`,
            totalLabel: 'Total Santri',
            totalValue: `${data.length} Santri`,
            printedAt: formatDate(new Date())
        })
    }

    const handleDownloadExcel = () => {
        const columns = ['Peringkat', 'NIS', 'Nama', 'Hafalan', 'Tajwid', 'Kelancaran', 'Rata Tahfizh']
        mapelList.forEach(m => columns.push(m.kode || m.nama))
        columns.push('Rata Madros', 'Rata Total')

        const exportData = data.map(s => {
            const row = {
                Peringkat: s.peringkat,
                NIS: s.nis,
                Nama: s.nama,
                Hafalan: s.hafalan,
                Tajwid: s.tajwid,
                Kelancaran: s.kelancaran,
                'Rata Tahfizh': s.rata_rata_tahfizh
            }
            mapelList.forEach(m => {
                row[m.kode || m.nama] = s.mapelScores[m.id] || '-'
            })
            row['Rata Madros'] = s.rata_rata_madrasiyah
            row['Rata Total'] = s.rata_rata_total_display
            return row
        })
        exportToExcel(exportData, columns, 'laporan_ujian_semester')
    }

    const handleDownloadCSV = () => {
        const columns = ['Peringkat', 'NIS', 'Nama', 'Hafalan', 'Tajwid', 'Kelancaran', 'Rata Tahfizh']
        mapelList.forEach(m => columns.push(m.kode || m.nama))
        columns.push('Rata Madros', 'Rata Total')

        const exportData = data.map(s => {
            const row = {
                Peringkat: s.peringkat,
                NIS: s.nis,
                Nama: s.nama,
                Hafalan: s.hafalan,
                Tajwid: s.tajwid,
                Kelancaran: s.kelancaran,
                'Rata Tahfizh': s.rata_rata_tahfizh
            }
            mapelList.forEach(m => {
                row[m.kode || m.nama] = s.mapelScores[m.id] || '-'
            })
            row['Rata Madros'] = s.rata_rata_madrasiyah
            row['Rata Total'] = s.rata_rata_total_display
            return row
        })
        exportToCSV(exportData, columns, 'laporan_ujian_semester')
    }

    // Define TanStack Table Columns
    const columns = useMemo(() => [
        columnHelper.accessor((row, index) => index + 1, {
            id: 'no',
            header: 'No',
            cell: info => info.getValue(),
            size: 50,
        }),
        columnHelper.accessor('peringkat', {
            header: 'Peringkat',
            meta: { backgroundColor: '#fef3c7', fontWeight: 'bold', textAlign: 'center' },
            size: 80,
        }),
        columnHelper.accessor('nis', {
            header: 'NIS',
            size: 100,
        }),
        columnHelper.accessor('nama', {
            header: 'Nama Santri',
            size: 200,
            meta: { fontWeight: '500' }
        }),
        columnHelper.group({
            id: 'tahfizhiyah',
            header: 'Tahfizhiyah (Qur\'aniyah)',
            meta: { backgroundColor: '#dcfce7', textAlign: 'center' },
            columns: [
                columnHelper.accessor('hafalan', { header: 'Hafalan', meta: { textAlign: 'center' }, size: 80 }),
                columnHelper.accessor('tajwid', { header: 'Tajwid', meta: { textAlign: 'center' }, size: 80 }),
                columnHelper.accessor('kelancaran', { header: 'Kelancaran', meta: { textAlign: 'center' }, size: 80 }),
                columnHelper.accessor('rata_rata_tahfizh', { header: 'Rata-rata', meta: { textAlign: 'center', fontWeight: '600', backgroundColor: '#f0fdf4' }, size: 80 }),
            ],
        }),
        columnHelper.group({
            id: 'madrasiyah',
            header: 'Madrasiyah',
            meta: { backgroundColor: '#dbeafe', textAlign: 'center' },
            columns: [
                ...mapelList.map(m => columnHelper.accessor(row => row.mapelScores[m.id] || '-', {
                    id: `mapel-${m.id}`,
                    header: m.kode || m.nama,
                    meta: { textAlign: 'center' },
                    size: 80,
                })),
                columnHelper.accessor('rata_rata_madrasiyah', {
                    header: 'Rata-rata',
                    meta: { textAlign: 'center', fontWeight: '600', backgroundColor: '#eff6ff' },
                    size: 80
                }),
            ],
        }),
        columnHelper.accessor('rata_rata_total_display', {
            header: 'Rata Total',
            meta: { backgroundColor: '#fef3c7', fontWeight: '700', textAlign: 'center' },
            size: 100,
        }),
    ], [mapelList])

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Laporan Ujian Semester
                    </h1>
                    <p className="page-subtitle">Laporan hasil Ujian Semester - Tahfizhiyah & Madrasiyah</p>
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
                    <label className="form-label">Halaqoh</label>
                    <select
                        className="form-control"
                        value={filters.halaqoh_id}
                        onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                    >
                        <option value="">Semua Halaqoh</option>
                        {halaqoh.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Kelas</label>
                    <select
                        className="form-control"
                        value={filters.kelas_id}
                        onChange={e => setFilters({ ...filters, kelas_id: e.target.value })}
                    >
                        <option value="">Semua Kelas</option>
                        {kelas.map(k => (
                            <option key={k.id} value={k.id}>{k.nama}</option>
                        ))}
                    </select>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={data}
                isLoading={loading}
                emptyMessage="Pilih semester dan halaqoh/kelas untuk melihat laporan"
                globalSearchPlaceholder="Cari santri..."
            />
        </div>
    )
}

export default LaporanUjianSemesterPage
