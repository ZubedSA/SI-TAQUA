import { useState, useEffect } from 'react'
import { Users, RefreshCw, Download, Printer, BookMarked, FileText, Calendar } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useCalendar } from '../../../../../context/CalendarContext'
import DateDisplay from '../../../../../components/common/DateDisplay'
import '../../../../../pages/laporan/Laporan.css'

const LaporanAkademikSantriPage = () => {
    const { formatDate } = useCalendar()
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanData, setHafalanData] = useState([])
    const [nilaiTahfizh, setNilaiTahfizh] = useState(null)
    const [nilaiMadros, setNilaiMadros] = useState([])
    const [presensiData, setPresensiData] = useState({ pulang: 0, izin: 0, sakit: 0, alpha: 0 })
    const [filters, setFilters] = useState({
        semester_id: '',
        santri_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, santriRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('santri').select('id, nama, nis, kelas:kelas!kelas_id(nama), halaqoh:halaqoh!halaqoh_id(nama)').eq('status', 'Aktif').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (santriRes.data) setSantriList(santriRes.data)
    }

    const fetchSantriReport = async (santriId) => {
        if (!santriId || !filters.semester_id) return
        setLoading(true)

        try {
            const selected = santriList.find(s => s.id === santriId)
            setSelectedSantri(selected)

            // --- 1. Fetch Hafalan Progress (Keep existing logic) ---
            const { data: hafalan } = await supabase
                .from('hafalan')
                .select('juz, juz_mulai, status, tanggal')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            const juzProgress = {}
            hafalan?.forEach(h => {
                const juz = h.juz_mulai || h.juz
                if (!juzProgress[juz] || h.status === 'Lancar') {
                    juzProgress[juz] = {
                        juz,
                        status: h.status,
                        tanggal: h.tanggal
                    }
                }
            })
            setHafalanData(Object.values(juzProgress).sort((a, b) => a.juz - b.juz))

            // --- 2. Fetch All Mapels (Master List) ---
            const { data: allMapels } = await supabase
                .from('mapel')
                .select('*')
                .order('nama', { ascending: true })
            const expectedMapels = allMapels || []

            // --- 3. Fetch All Grades for Semester ---
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select(`
                    *,
                    mapel:mapel_id(nama, kode)
                `)
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)

            // --- 4. Process Logic (Same as CetakRaport) ---
            const typePriority = { 'semester': 4, 'uas': 3, 'uts': 2, 'harian': 1 }

            const getBestGrade = (grades) => {
                if (!grades || grades.length === 0) return null
                return grades.reduce((prev, current) => {
                    const prevP = typePriority[prev.jenis_ujian] || 0
                    const currP = typePriority[current.jenis_ujian] || 0
                    if (currP > prevP) return current
                    if (currP === prevP) {
                        return (current.nilai_akhir || 0) > (prev.nilai_akhir || 0) ? current : prev
                    }
                    return prev
                })
            }

            // A. Process Madrasah
            let madrasahList = expectedMapels.map(mapel => {
                const mapelGrades = nilaiData?.filter(n => n.mapel_id === mapel.id) || []
                const bestGrade = getBestGrade(mapelGrades)

                // Exclude Tahfizh/Quran from Madrasah list
                if (mapel.nama.toLowerCase().includes('tahfizh') || mapel.nama.toLowerCase().includes('quran')) {
                    return null
                }

                // Format for UI (compatible with existing table if possible, or we update table)
                return {
                    id: mapel.id,
                    nama: mapel.nama,
                    harian: '-', // Simplified for report view as we focus on "Final"
                    uts: '-',
                    uas: '-',
                    rata_rata: bestGrade ? bestGrade.nilai_akhir : '-', // Main score
                    predikat: bestGrade ? getPredikat(bestGrade.nilai_akhir) : '-'
                }
            }).filter(Boolean)
            setNilaiMadros(madrasahList)

            // B. Process Tahfizh (Decomposition)
            const tahfizhRecords = nilaiData?.filter(n => {
                const isCatTahfizh = n.kategori === 'Tahfizhiyah'
                const isNameTahfizh = n.mapel?.nama?.toLowerCase().includes('tahfizh') || n.mapel?.nama?.toLowerCase().includes('quran')
                return isCatTahfizh || isNameTahfizh
            }) || []

            const bestTahfizhRecord = getBestGrade(tahfizhRecords)

            // Transform for UI - We need to supply 'nilaiTahfizh' state which expects an object or array?
            // Existing UI expects 'nilaiTahfizh' object with keys like nilai_hafalan. 
            // BUT we want to show rows. Let's change state structure.
            // For now, let's keep the single object structure if possible OR update state.
            // Let's update state to hold the 'rows' directly.

            let tahfizhRows = []
            if (bestTahfizhRecord) {
                const components = [
                    { key: 'nilai_hafalan', label: 'Hafalan' },
                    { key: 'nilai_tajwid', label: 'Tajwid' },
                    { key: 'nilai_kelancaran', label: 'Kelancaran' }, // Changed label to match UI
                    { key: 'nilai_murajaah', label: 'Murajaah' }
                ]

                components.forEach(comp => {
                    if (bestTahfizhRecord[comp.key] != null) {
                        tahfizhRows.push({
                            komponen: comp.label,
                            nilai: bestTahfizhRecord[comp.key],
                            predikat: getPredikat(bestTahfizhRecord[comp.key])
                        })
                    }
                })

                // If empty but has mapel name
                if (tahfizhRows.length === 0 && bestTahfizhRecord.mapel?.nama) {
                    tahfizhRows.push({
                        komponen: bestTahfizhRecord.mapel.nama,
                        nilai: bestTahfizhRecord.nilai_akhir,
                        predikat: getPredikat(bestTahfizhRecord.nilai_akhir)
                    })
                }
            }
            setNilaiTahfizh(tahfizhRows.length > 0 ? tahfizhRows : null) // Modified state usage

            // --- 5. Fetch Presensi (Now using Manual Input from Perilaku) ---
            const { data: perilakuData } = await supabase
                .from('perilaku_semester')
                .select('sakit, izin, alpha, pulang')
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)
                .single()

            if (perilakuData) {
                setPresensiData({
                    pulang: perilakuData.pulang ?? 0,
                    sakit: perilakuData.sakit ?? 0,
                    izin: perilakuData.izin ?? 0,
                    alpha: perilakuData.alpha ?? 0
                })
            } else {
                setPresensiData({ pulang: 0, izin: 0, sakit: 0, alpha: 0 })
            }

            // --- 6. Fetch Perilaku & Taujihad (Extra data for Report) ---
            // We might just store these in state if we want to display them, 
            // but for now the user asked to filter -> then PRINT.
            // The Print button will load CetakRaport which fetches its own data.
            // So we just need to ensure the "Preview" in Laporan page looks correct.

        } catch (err) {
            console.error('Error fetching report:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.santri_id && filters.semester_id) {
            fetchSantriReport(filters.santri_id)
        }
    }, [filters.santri_id, filters.semester_id])

    const getPredikat = (nilai) => {
        if (!nilai && nilai !== 0) return '-'
        if (nilai >= 90) return 'A'
        if (nilai >= 80) return 'B'
        if (nilai >= 70) return 'C'
        if (nilai >= 60) return 'D'
        return 'E'
    }

    const generatePDF = async () => {
        if (!selectedSantri) return

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        let y = 15

        // ========== HEADER WITH LOGO ==========
        const logoSize = 25
        const logoX = 14
        let headerTextX = 45

        try {
            const logoImg = new Image()
            logoImg.src = '/logo-pondok.png'
            await new Promise((resolve) => {
                logoImg.onload = resolve
                logoImg.onerror = resolve
                setTimeout(resolve, 1000)
            })
            doc.addImage(logoImg, 'PNG', logoX, y, logoSize, logoSize)
        } catch (e) {
            console.warn('Logo loading failed', e)
        }

        // Header Text
        doc.setTextColor(0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('YAYASAN ABDULLAH DEWI HASANAH', headerTextX, y + 6)

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('PONDOK PESANTREN TAHFIZH QUR\'AN AL-USYMUNI BATUAN', headerTextX, y + 13)

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep', headerTextX, y + 19)

        // Line separator
        y += 32
        doc.setDrawColor(5, 150, 105)
        doc.setLineWidth(1)
        doc.line(14, y, pageWidth - 14, y)
        doc.setLineWidth(0.5)

        y += 10

        // Title
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(5, 150, 105)
        doc.text('LAPORAN AKADEMIK SANTRI', pageWidth / 2, y, { align: 'center' })

        y += 10
        doc.setTextColor(0)

        // Biodata Santri
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('DATA SANTRI', 14, y)
        y += 8
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const currentSem = semester.find(s => s.id === filters.semester_id)
        const bioData = [
            ['Nama', selectedSantri.nama],
            ['NIS', selectedSantri.nis],
            ['Kelas', selectedSantri.kelas?.nama || '-'],
            ['Halaqoh', selectedSantri.halaqoh?.nama || '-'],
            ['Semester', currentSem ? `${currentSem.nama} - ${currentSem.tahun_ajaran}` : '-']
        ]
        bioData.forEach(item => {
            doc.text(`${item[0]}: ${item[1]}`, 14, y)
            y += 6
        })

        y += 5

        // Hafalan Progress
        if (hafalanData.length > 0) {
            // Check potential page break for header
            if (y > pageHeight - 40) {
                doc.addPage()
                y = 20
            }
            doc.setFont('helvetica', 'bold')
            doc.text('PROGRESS HAFALAN', 14, y)
            y += 3
            autoTable(doc, {
                startY: y,
                head: [['Juz', 'Status', 'Tanggal']],
                body: hafalanData.map(h => [
                    `Juz ${h.juz}`,
                    h.status,
                    formatDate(h.tanggal)
                ]),
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14, bottom: 30 } // Bottom margin for footer
            })
            y = doc.lastAutoTable.finalY + 10
        }

        // Nilai Tahfizh
        if (nilaiTahfizh) {
            if (y > pageHeight - 40) {
                doc.addPage()
                y = 20
            }
            doc.setFont('helvetica', 'bold')
            doc.text('NILAI TAHFIZHIYAH', 14, y)
            y += 3
            autoTable(doc, {
                startY: y,
                head: [['Komponen', 'Nilai', 'Predikat']],
                body: [
                    ['Hafalan Baru', nilaiTahfizh.nilai_hafalan || '-', getPredikat(nilaiTahfizh.nilai_hafalan)],
                    ['Murajaah', nilaiTahfizh.nilai_murajaah || '-', getPredikat(nilaiTahfizh.nilai_murajaah)],
                    ['Tajwid', nilaiTahfizh.nilai_tajwid || '-', getPredikat(nilaiTahfizh.nilai_tajwid)],
                    ['Kelancaran', nilaiTahfizh.nilai_kelancaran || '-', getPredikat(nilaiTahfizh.nilai_kelancaran)],
                    ['Rata-rata', nilaiTahfizh.nilai_akhir?.toFixed(1) || '-', getPredikat(nilaiTahfizh.nilai_akhir)]
                ],
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 100, bottom: 30 }
            })
            y = doc.lastAutoTable.finalY + 10
        }

        // Nilai Madros
        if (nilaiMadros.length > 0) {
            if (y > pageHeight - 40) {
                doc.addPage()
                y = 20
            }
            doc.setFont('helvetica', 'bold')
            doc.text('NILAI MADROSIYAH', 14, y)
            y += 3
            autoTable(doc, {
                startY: y,
                head: [['Mapel', 'Harian', 'UTS', 'UAS', 'Rata-rata']],
                body: nilaiMadros.map(m => [m.nama, m.harian, m.uts, m.uas, m.rata_rata]),
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14, bottom: 30 }
            })
            y = doc.lastAutoTable.finalY + 10
        }

        // Kehadiran
        if (y > pageHeight - 40) {
            doc.addPage()
            y = 20
        }
        doc.setFont('helvetica', 'bold')
        doc.text('KEHADIRAN SEMESTER INI', 14, y)
        y += 3
        autoTable(doc, {
            startY: y,
            head: [['Hadir', 'Izin', 'Sakit', 'Alpha']],
            body: [[presensiData.hadir, presensiData.izin, presensiData.sakit, presensiData.alpha]],
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] },
            styles: { fontSize: 9, halign: 'center' },
            margin: { left: 14, right: 100, bottom: 30 }
        })

        // Global Footer (Executed at the end for all pages)
        const totalPages = doc.internal.getNumberOfPages()
        const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            const footerY = pageHeight - 15

            doc.setFontSize(8)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(150)

            // Left
            doc.text(`Dicetak: ${printDate}`, 14, footerY)

            // Center
            doc.text(`Si-Taqua PTQA Batuan`, pageWidth / 2, footerY, { align: 'center' })

            // Right (Page Number)
            doc.text(`Hal ${i} dari ${totalPages}`, pageWidth - 14, footerY, { align: 'right' })
        }

        doc.save(`Laporan_Akademik_${selectedSantri.nama.replace(/\s/g, '_')}.pdf`)
    }

    const handleDownloadExcel = () => {
        if (!selectedSantri) return
        const currentSem = semester.find(s => s.id === filters.semester_id)

        const exportData = [{
            NIS: selectedSantri.nis,
            Nama: selectedSantri.nama,
            Kelas: selectedSantri.kelas?.nama || '-',
            Halaqoh: selectedSantri.halaqoh?.nama || '-',
            Semester: currentSem ? `${currentSem.nama} - ${currentSem.tahun_ajaran}` : '-',
            'Nilai Tahfizh Avg': nilaiTahfizh?.nilai_akhir?.toFixed(1) || '-',
            // Calculate Madros Avg from displayed table if needed, or just list subjects?
            // For summary, maybe just list average of averages or leave strict detail to PDF.
            // Let's output Presensi:
            'Hadir': presensiData.hadir,
            'Izin': presensiData.izin,
            'Sakit': presensiData.sakit,
            'Alpha': presensiData.alpha,
        }]

        // Flatten Nilai Madros as columns? e.g. "Mapel X": 80
        nilaiMadros.forEach(m => {
            exportData[0][`Nilai ${m.nama}`] = m.rata_rata
        })

        const columns = Object.keys(exportData[0])
        exportToExcel(exportData, columns, `laporan_akademik_${selectedSantri.nama.replace(/\s/g, '_')}`)
    }

    const handleDownloadCSV = () => {
        if (!selectedSantri) return
        const currentSem = semester.find(s => s.id === filters.semester_id)

        const exportData = [{
            NIS: selectedSantri.nis,
            Nama: selectedSantri.nama,
            Kelas: selectedSantri.kelas?.nama || '-',
            Halaqoh: selectedSantri.halaqoh?.nama || '-',
            Semester: currentSem ? `${currentSem.nama} - ${currentSem.tahun_ajaran}` : '-',
            'Nilai Tahfizh Avg': nilaiTahfizh?.nilai_akhir?.toFixed(1) || '-',
            'Hadir': presensiData.hadir,
            'Izin': presensiData.izin,
            'Sakit': presensiData.sakit,
            'Alpha': presensiData.alpha,
        }]

        nilaiMadros.forEach(m => {
            exportData[0][`Nilai ${m.nama}`] = m.rata_rata
        })

        const columns = Object.keys(exportData[0])
        exportToCSV(exportData, columns, `laporan_akademik_${selectedSantri.nama.replace(/\s/g, '_')}`)
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Laporan Akademik Santri
                    </h1>
                    <p className="page-subtitle">Laporan lengkap per santri</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={() => window.open(`/raport/cetak/${filters.santri_id}/${filters.semester_id}`, '_blank')}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                        disabled={!selectedSantri}
                        pdfLabel="Cetak PDF Raport"
                    />
                    <button
                        className="btn btn-outline"
                        disabled={!selectedSantri}
                        onClick={() => window.open(`/raport/cetak/${filters.santri_id}/${filters.semester_id}`, '_blank')}
                    >
                        <Printer size={18} /> Preview Print
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
                    <label className="form-label">Santri *</label>
                    <select
                        className="form-control"
                        value={filters.santri_id}
                        onChange={e => setFilters({ ...filters, santri_id: e.target.value })}
                    >
                        <option value="">Pilih Santri</option>
                        {santriList.map(s => (
                            <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading-state">
                        <RefreshCw className="spin" size={24} />
                        <span>Memuat data...</span>
                    </div>
                ) : !selectedSantri ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Pilih santri untuk melihat laporan akademik</p>
                    </div>
                ) : (
                    <div className="laporan-akademik-content">
                        {/* Santri Profile */}
                        <div className="santri-profile" style={{
                            padding: '24px',
                            background: 'var(--bg-light)',
                            borderRadius: '12px',
                            marginBottom: '24px'
                        }}>
                            <h2>{selectedSantri.nama}</h2>
                            <p>NIS: {selectedSantri.nis}</p>
                            <p>Kelas: {selectedSantri.kelas?.nama || '-'} | Halaqoh: {selectedSantri.halaqoh?.nama || '-'}</p>
                        </div>

                        <div className="laporan-sections" style={{ display: 'grid', gap: '24px' }}>
                            {/* Hafalan Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookMarked size={20} /> Progress Hafalan
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Juz</th>
                                            <th>Status</th>
                                            <th>Tanggal Terakhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hafalanData.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    Belum ada data hafalan
                                                </td>
                                            </tr>
                                        ) : (
                                            hafalanData.map((h, i) => (
                                                <tr key={i}>
                                                    <td>Juz {h.juz}</td>
                                                    <td>
                                                        <span className={`badge ${h.status === 'Lancar' ? 'badge-success' : h.status === 'Sedang' ? 'badge-warning' : 'badge-danger'}`}>
                                                            {h.status}
                                                        </span>
                                                    </td>
                                                    <td><DateDisplay date={h.tanggal} /></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Nilai Tahfizh Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={20} /> Nilai Tahfizhiyah (Semester)
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Komponen</th>
                                            <th style={{ textAlign: 'center' }}>Nilai</th>
                                            <th style={{ textAlign: 'center' }}>Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!nilaiTahfizh || nilaiTahfizh.length === 0) ? (
                                            <tr><td colSpan="3" className="text-center text-gray-500">Belum ada data nilai tahfizh</td></tr>
                                        ) : (
                                            nilaiTahfizh.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td>{row.komponen}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.nilai || '-'}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.predikat}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Nilai Madros Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={20} /> Nilai Madrosiyah
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mapel</th>
                                            <th style={{ textAlign: 'center' }}>Nilai Akhir</th>
                                            <th style={{ textAlign: 'center' }}>Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiMadros.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    Belum ada data nilai
                                                </td>
                                            </tr>
                                        ) : (
                                            nilaiMadros.map((m, i) => (
                                                <tr key={i}>
                                                    <td>{m.nama}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{m.rata_rata}</td>
                                                    <td style={{ textAlign: 'center' }}>{m.predikat}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Kehadiran Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={20} /> Kehadiran Semester Ini
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.pulang}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Pulang</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.izin}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Izin</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.sakit}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Sakit</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.alpha}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Alpha</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LaporanAkademikSantriPage
