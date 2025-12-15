import { useState, useEffect } from 'react'
import { Download, FileText, Users, BookMarked, CalendarCheck, RefreshCw, Eye, Printer, X, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './Laporan.css'

const laporanTypes = [
    { id: 'santri', icon: Users, title: 'Laporan Santri', desc: 'Data lengkap seluruh santri', color: 'green' },
    { id: 'guru', icon: Users, title: 'Laporan Guru', desc: 'Data pengajar dan wali kelas', color: 'yellow' },
    { id: 'hafalan', icon: BookMarked, title: 'Laporan Hafalan', desc: 'Progress hafalan per santri', color: 'teal' },
    { id: 'presensi', icon: CalendarCheck, title: 'Laporan Presensi', desc: 'Rekap kehadiran bulanan', color: 'olive' },
    { id: 'nilai', icon: FileText, title: 'Laporan Nilai', desc: 'Rekap nilai per semester', color: 'green' },
    { id: 'raport', icon: GraduationCap, title: 'Raport Santri', desc: 'Raport lengkap per santri', color: 'purple' },
]

const LaporanPage = () => {
    const [selectedType, setSelectedType] = useState(null)
    const [filters, setFilters] = useState({ kelas: '', semester: '', santri: '', dariTanggal: '', sampaiTanggal: '' })
    const [kelasList, setKelasList] = useState([])
    const [semesterList, setSemesterList] = useState([])
    const [santriList, setSantriList] = useState([])
    const [generating, setGenerating] = useState(false)
    const [success, setSuccess] = useState('')
    const [showPreview, setShowPreview] = useState(false)
    const [previewData, setPreviewData] = useState({ columns: [], rows: [], title: '', total: 0 })
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [showRaport, setShowRaport] = useState(false)
    const [raportData, setRaportData] = useState(null)

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        try {
            const [kelasRes, semesterRes, santriRes] = await Promise.all([
                supabase.from('kelas').select('id, nama').order('nama'),
                supabase.from('semester').select('id, nama, tahun_ajaran, is_active').order('is_active', { ascending: false }),
                supabase.from('santri').select('id, nama, nis').eq('status', 'Aktif').order('nama')
            ])
            setKelasList(kelasRes.data || [])
            setSemesterList(semesterRes.data || [])
            setSantriList(santriRes.data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchPreviewData = async () => {
        setLoadingPreview(true)
        try {
            let tableData = []
            let columns = []
            const reportTitle = laporanTypes.find(l => l.id === selectedType)?.title || 'Laporan'

            if (selectedType === 'santri') {
                let query = supabase.from('santri').select('nis, nama, jenis_kelamin, kelas:kelas_id(nama), status').order('nama')
                if (filters.kelas) query = query.eq('kelas_id', filters.kelas)
                const { data } = await query
                columns = ['No', 'NIS', 'Nama', 'L/P', 'Kelas', 'Status']
                tableData = data?.map((s, i) => ({
                    no: i + 1,
                    nis: s.nis,
                    nama: s.nama,
                    jk: s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
                    kelas: s.kelas?.nama || '-',
                    status: s.status
                })) || []
            } else if (selectedType === 'guru') {
                const { data } = await supabase.from('guru').select('nip, nama, jenis_kelamin, jabatan, no_telp, status').order('nama')
                columns = ['No', 'NIP', 'Nama', 'L/P', 'Jabatan', 'Telepon', 'Status']
                tableData = data?.map((g, i) => ({
                    no: i + 1,
                    nip: g.nip || '-',
                    nama: g.nama,
                    jk: g.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
                    jabatan: g.jabatan,
                    telepon: g.no_telp || '-',
                    status: g.status
                })) || []
            } else if (selectedType === 'hafalan') {
                let query = supabase.from('hafalan').select('santri:santri_id(nama), juz, surah, ayat_mulai, ayat_selesai, jenis, status, tanggal').order('tanggal', { ascending: false })

                // Filter by santri
                if (filters.santri) {
                    query = query.eq('santri_id', filters.santri)
                }
                // Filter by date range
                if (filters.dariTanggal) {
                    query = query.gte('tanggal', filters.dariTanggal)
                }
                if (filters.sampaiTanggal) {
                    query = query.lte('tanggal', filters.sampaiTanggal)
                }

                const { data } = await query
                columns = ['No', 'Santri', 'Juz', 'Surah', 'Ayat', 'Jenis', 'Status', 'Tanggal']
                tableData = data?.map((h, i) => ({
                    no: i + 1,
                    santri: h.santri?.nama || '-',
                    juz: h.juz,
                    surah: h.surah,
                    ayat: `${h.ayat_mulai}-${h.ayat_selesai}`,
                    jenis: h.jenis || 'Setoran',
                    status: h.status,
                    tanggal: new Date(h.tanggal).toLocaleDateString('id-ID')
                })) || []
            } else if (selectedType === 'presensi') {
                const { data } = await supabase.from('presensi').select('santri:santri_id(nama), tanggal, status, keterangan').order('tanggal', { ascending: false }).limit(50)
                columns = ['No', 'Santri', 'Tanggal', 'Status', 'Keterangan']
                tableData = data?.map((p, i) => ({
                    no: i + 1,
                    santri: p.santri?.nama || '-',
                    tanggal: new Date(p.tanggal).toLocaleDateString('id-ID'),
                    status: p.status,
                    keterangan: p.keterangan || '-'
                })) || []
            } else if (selectedType === 'nilai') {
                let query = supabase.from('nilai').select('santri:santri_id(nama), mapel:mapel_id(nama), nilai_akhir').order('santri_id')
                if (filters.semester) query = query.eq('semester_id', filters.semester)
                // Filter by santri
                if (filters.santri) {
                    query = query.eq('santri_id', filters.santri)
                }
                const { data } = await query
                columns = ['No', 'Santri', 'Mapel', 'Nilai']
                tableData = data?.map((n, i) => ({
                    no: i + 1,
                    santri: n.santri?.nama || '-',
                    mapel: n.mapel?.nama || '-',
                    nilai: n.nilai_akhir?.toFixed(0) || '-'
                })) || []
            } else if (selectedType === 'raport') {
                // Raport uses special modal
                await fetchRaportData()
                setLoadingPreview(false)
                return
            }

            setPreviewData({ columns, rows: tableData, title: reportTitle, total: tableData.length })
            setShowPreview(true)
        } catch (err) {
            console.error('Error:', err.message)
            alert('Gagal memuat preview: ' + err.message)
        } finally {
            setLoadingPreview(false)
        }
    }

    const fetchRaportData = async () => {
        if (!filters.santri || !filters.semester) {
            alert('Pilih Santri dan Semester terlebih dahulu!')
            return
        }

        try {
            // Fetch santri data with halaqoh
            const { data: santriData } = await supabase
                .from('santri')
                .select('*, kelas:kelas_id(nama, wali_kelas:wali_kelas_id(nama)), halaqoh:halaqoh_id(nama, musyrif:musyrif_id(nama))')
                .eq('id', filters.santri)
                .single()

            // Fetch semester data
            const { data: semesterData } = await supabase
                .from('semester')
                .select('*')
                .eq('id', filters.semester)
                .single()

            // Fetch nilai for this santri & semester
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select('mapel:mapel_id(nama, kategori), nilai_akhir')
                .eq('santri_id', filters.santri)
                .eq('semester_id', filters.semester)
                .order('mapel_id')

            // Fetch hafalan summary
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select('juz, status')
                .eq('santri_id', filters.santri)
                .eq('status', 'Mutqin')

            // Fetch perilaku data
            const { data: perilakuData } = await supabase
                .from('perilaku')
                .select('ketekunan, kedisiplinan, kebersihan, kerapian')
                .eq('santri_id', filters.santri)
                .eq('semester_id', filters.semester)
                .single()

            // Fetch pencapaian hafalan
            const { data: pencapaianData } = await supabase
                .from('pencapaian_hafalan')
                .select('jumlah_hafalan, predikat, total_hafalan')
                .eq('santri_id', filters.santri)
                .eq('semester_id', filters.semester)
                .single()

            // Calculate stats
            const nilaiList = nilaiData || []
            const totalNilai = nilaiList.reduce((sum, n) => sum + (n.nilai_akhir || 0), 0)
            const rataRata = nilaiList.length > 0 ? totalNilai / nilaiList.length : 0
            const juzMutqin = [...new Set(hafalanData?.map(h => h.juz) || [])].length

            // Get grade
            const getGrade = (avg) => {
                if (avg >= 90) return 'A'
                if (avg >= 80) return 'B'
                if (avg >= 70) return 'C'
                return 'D'
            }

            setRaportData({
                santri: santriData,
                semester: semesterData,
                nilai: nilaiList,
                hafalan: {
                    juzMutqin,
                    totalSetoran: hafalanData?.length || 0,
                    jumlahHafalan: pencapaianData?.jumlah_hafalan || `${juzMutqin} Juz`,
                    predikat: pencapaianData?.predikat || 'Baik',
                    totalHafalan: pencapaianData?.total_hafalan || '-'
                },
                perilaku: perilakuData || { ketekunan: 'Baik', kedisiplinan: 'Baik', kebersihan: 'Baik', kerapian: 'Baik' },
                stats: { rataRata, grade: getGrade(rataRata), totalMapel: nilaiList.length }
            })
            setShowRaport(true)
        } catch (err) {
            console.error('Error:', err.message)
            alert('Gagal memuat data raport: ' + err.message)
        }
    }

    const generatePDF = async () => {
        setGenerating(true)
        setSuccess('')

        try {
            const doc = new jsPDF()
            const pageWidth = doc.internal.pageSize.getWidth()

            // Header
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('PTQA BATUAN', pageWidth / 2, 20, { align: 'center' })
            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            doc.text('Sistem Akademik Pondok Pesantren', pageWidth / 2, 28, { align: 'center' })
            doc.line(14, 32, pageWidth - 14, 32)

            // Title
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text(previewData.title.toUpperCase(), pageWidth / 2, 42, { align: 'center' })

            // Date
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 50)

            // Generate table
            const tableBody = previewData.rows.map(row => Object.values(row))
            autoTable(doc, {
                startY: 55,
                head: [previewData.columns],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105], textColor: 255 },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            })

            // Footer
            const finalY = (doc.previousAutoTable?.finalY || 55 + tableBody.length * 10) + 15
            doc.setFontSize(9)
            doc.text(`Total: ${previewData.total} data`, 14, finalY)
            doc.text('Dicetak oleh Sistem Akademik PTQA Batuan', pageWidth / 2, finalY + 10, { align: 'center' })

            // Save
            doc.save(`${previewData.title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
            setSuccess('PDF berhasil di-download!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert('Gagal generate PDF: ' + err.message)
        } finally {
            setGenerating(false)
        }
    }

    const generateRaportPDF = async () => {
        if (!raportData) return
        setGenerating(true)

        try {
            const doc = new jsPDF()
            const pageWidth = doc.internal.pageSize.getWidth()
            let y = 15

            // Load logo as base64
            const loadImageAsBase64 = (url) => {
                return new Promise((resolve, reject) => {
                    const img = new Image()
                    img.crossOrigin = 'Anonymous'
                    img.onload = () => {
                        const canvas = document.createElement('canvas')
                        canvas.width = img.width
                        canvas.height = img.height
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0)
                        resolve(canvas.toDataURL('image/png'))
                    }
                    img.onerror = reject
                    img.src = url
                })
            }

            // Header - Kop Surat dengan Logo
            doc.setFillColor(5, 150, 105)
            doc.rect(14, y, pageWidth - 28, 28, 'F')

            // Try to add logo - ukuran lebih besar
            try {
                const logoBase64 = await loadImageAsBase64('/logo-white.png')
                doc.addImage(logoBase64, 'PNG', 16, y + 2, 24, 24)
            } catch (e) {
                console.log('Logo tidak dapat dimuat')
            }

            doc.setTextColor(255)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('YAYASAN ABDULLAH DEWI HASANAH', pageWidth / 2 + 8, y + 8, { align: 'center' })
            doc.setFontSize(12)
            doc.text('PONDOK PESANTREN TAHFIZH QUR\'AN AL-USYMUNI BATUAN', pageWidth / 2 + 8, y + 16, { align: 'center' })
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text('Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep', pageWidth / 2 + 8, y + 23, { align: 'center' })

            y += 33
            doc.setTextColor(0)

            // Biodata
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            // Get halaqoh and musyrif from halaqoh table
            const halaqohNama = raportData.santri?.halaqoh?.nama || '-'
            const musyrifNama = raportData.santri?.halaqoh?.musyrif?.nama || raportData.santri?.kelas?.wali_kelas?.nama || '-'
            const bioLeft = [
                ['Nama', raportData.santri?.nama || '-'],
                ['Jenjang / Kelas', raportData.santri?.kelas?.nama || '-'],
                ['NIS', raportData.santri?.nis || '-']
            ]
            const bioRight = [
                ['Halaqoh', halaqohNama],
                ['Semester', raportData.semester?.nama || '-'],
                ['Tahun Ajaran', raportData.semester?.tahun_ajaran || '-']
            ]

            bioLeft.forEach((item, i) => {
                doc.text(`${item[0]}`, 14, y + (i * 6))
                doc.text(`: ${item[1]}`, 50, y + (i * 6))
            })
            bioRight.forEach((item, i) => {
                doc.text(`${item[0]}`, 110, y + (i * 6))
                doc.text(`: ${item[1]}`, 145, y + (i * 6))
            })

            y += 22

            // Tabel Nilai Tahfizh
            const tahfizhNilai = raportData.nilai.filter(n => n.mapel?.kategori === 'Tahfizhiyah')
            const madrasahNilai = raportData.nilai.filter(n => n.mapel?.kategori !== 'Tahfizhiyah')

            const getPredikat = (nilai) => {
                if (nilai >= 90) return 'A'
                if (nilai >= 80) return 'B'
                if (nilai >= 70) return 'C'
                if (nilai >= 60) return 'D'
                return 'E'
            }

            // Nilai Tahfizh Table
            autoTable(doc, {
                startY: y,
                head: [['No', 'Mata Pelajaran', 'Nilai', 'Predikat']],
                body: [
                    [{ content: 'NILAI TAHFIZH', colSpan: 4, styles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', halign: 'center' } }],
                    ...tahfizhNilai.map((n, i) => [i + 1, n.mapel?.nama || '-', n.nilai_akhir?.toFixed(0) || '-', getPredikat(n.nilai_akhir || 0)]),
                    [{ content: 'NILAI MADRASAH', colSpan: 4, styles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', halign: 'center' } }],
                    ...madrasahNilai.map((n, i) => [i + 1, n.mapel?.nama || '-', n.nilai_akhir?.toFixed(0) || '-', getPredikat(n.nilai_akhir || 0)])
                ],
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105], textColor: 255, halign: 'center' },
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'center' },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 22, halign: 'center' }
                },
                margin: { left: 14, right: pageWidth / 2 + 5 },
                tableWidth: pageWidth / 2 - 20
            })

            // Info Boxes di kanan
            const boxX = pageWidth / 2 + 5
            const boxWidth = pageWidth / 2 - 20
            let boxY = y

            // Pencapaian Tahfizh - Header Hijau
            doc.setFillColor(5, 150, 105)
            doc.rect(boxX, boxY, boxWidth, 8, 'F')
            doc.setDrawColor(4, 120, 87)
            doc.rect(boxX, boxY, boxWidth, 30)
            doc.setTextColor(255)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.text('Pencapaian Tahfizh', boxX + boxWidth / 2, boxY + 5, { align: 'center' })
            doc.setTextColor(0)
            doc.setFont('helvetica', 'normal')
            doc.text(`Jumlah Hafalan: ${raportData.hafalan.jumlahHafalan}`, boxX + 5, boxY + 14)
            doc.text(`Predikat: ${raportData.hafalan.predikat}`, boxX + 5, boxY + 20)
            doc.text(`Total Hafalan: ${raportData.hafalan.totalHafalan}`, boxX + 5, boxY + 26)
            boxY += 35

            // Perilaku Murid - Header Hijau
            doc.setFillColor(5, 150, 105)
            doc.rect(boxX, boxY, boxWidth, 8, 'F')
            doc.rect(boxX, boxY, boxWidth, 30)
            doc.setTextColor(255)
            doc.setFont('helvetica', 'bold')
            doc.text('Perilaku Murid', boxX + boxWidth / 2, boxY + 5, { align: 'center' })
            doc.setTextColor(0)
            doc.setFont('helvetica', 'normal')
            const perilakuList = [
                `A. Ketekunan: ${raportData.perilaku?.ketekunan || 'Baik'}`,
                `B. Kedisiplinan: ${raportData.perilaku?.kedisiplinan || 'Baik'}`,
                `C. Kebersihan: ${raportData.perilaku?.kebersihan || 'Baik'}`,
                `D. Kerapian: ${raportData.perilaku?.kerapian || 'Baik'}`
            ]
            perilakuList.forEach((p, i) => doc.text(p, boxX + 5, boxY + 14 + (i * 5)))
            boxY += 35

            // Ketidakhadiran - Header Hijau
            doc.setFillColor(5, 150, 105)
            doc.rect(boxX, boxY, boxWidth, 8, 'F')
            doc.rect(boxX, boxY, boxWidth, 28)
            doc.setTextColor(255)
            doc.setFont('helvetica', 'bold')
            doc.text('Ketidakhadiran', boxX + boxWidth / 2, boxY + 5, { align: 'center' })
            doc.setTextColor(0)
            doc.setFont('helvetica', 'normal')
            doc.text('Alpa: -  |  Sakit: -  |  Izin: -  |  Pulang: -', boxX + 5, boxY + 18)

            // Taujihat
            const tauY = boxY + 40
            doc.setFont('helvetica', 'bold')
            doc.text('Taujihat Musyrif', 14, tauY)
            doc.setFont('helvetica', 'normal')
            doc.setDrawColor(200)
            doc.rect(14, tauY + 2, pageWidth - 28, 15)
            doc.setFontSize(8)
            doc.text('Alhamdulillah, santri menunjukkan perkembangan yang baik. Terus semangat!', 16, tauY + 10)

            // Tanggal
            const sigY = tauY + 25
            doc.setFontSize(9)
            doc.text(`Batuan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 14, sigY, { align: 'right' })

            // Tanda Tangan
            const sig1X = 40
            const sig2X = pageWidth - 40
            const sigNameY = sigY + 35

            doc.text('Wali Murid', sig1X, sigY + 8, { align: 'center' })
            doc.line(sig1X - 25, sigNameY - 3, sig1X + 25, sigNameY - 3)
            doc.setFont('helvetica', 'bold')
            doc.text(raportData.santri?.nama_wali || '_______________', sig1X, sigNameY + 2, { align: 'center' })

            doc.setFont('helvetica', 'normal')
            doc.text('Musyrif', sig2X, sigY + 8, { align: 'center' })
            doc.line(sig2X - 25, sigNameY - 3, sig2X + 25, sigNameY - 3)
            doc.setFont('helvetica', 'bold')
            doc.text(musyrifNama !== '-' ? musyrifNama : '_______________', sig2X, sigNameY + 2, { align: 'center' })

            // Kepala Pondok
            const kepalaY = sigNameY + 15
            doc.setFont('helvetica', 'normal')
            doc.text('Mengetahui', pageWidth / 2, kepalaY, { align: 'center' })
            doc.text('Pengasuh PTQA Batuan', pageWidth / 2, kepalaY + 5, { align: 'center' })
            doc.line(pageWidth / 2 - 30, kepalaY + 25, pageWidth / 2 + 30, kepalaY + 25)
            doc.setFont('helvetica', 'bold')
            doc.text('KH. MIFTAHUL ARIFIN, LC.', pageWidth / 2, kepalaY + 30, { align: 'center' })

            // Save
            doc.save(`Raport_${raportData.santri?.nama?.replace(/\s/g, '_')}_${raportData.semester?.nama?.replace(/\s/g, '_')}.pdf`)
            setSuccess('Raport PDF berhasil di-download!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Error generating Raport PDF:', err)
            alert('Gagal generate Raport PDF: ' + err.message)
        } finally {
            setGenerating(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Laporan</h1>
                    <p className="page-subtitle">Generate dan download laporan dalam format PDF</p>
                </div>
            </div>

            {success && <div className="alert alert-success mb-3">{success}</div>}

            <div className="laporan-grid">
                {laporanTypes.map(laporan => (
                    <div
                        key={laporan.id}
                        className={`laporan-card ${selectedType === laporan.id ? 'selected' : ''}`}
                        onClick={() => setSelectedType(laporan.id)}
                    >
                        <div className={`laporan-icon ${laporan.color}`}>
                            <laporan.icon size={28} />
                        </div>
                        <div className="laporan-content">
                            <h3>{laporan.title}</h3>
                            <p>{laporan.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {selectedType && (
                <div className="generate-section">
                    <h3>Filter Laporan</h3>
                    <div className="filter-grid">
                        {(selectedType === 'santri' || selectedType === 'nilai') && (
                            <div className="form-group">
                                <label className="form-label">Kelas</label>
                                <select className="form-control" value={filters.kelas} onChange={e => setFilters({ ...filters, kelas: e.target.value })}>
                                    <option value="">Semua Kelas</option>
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                        )}
                        {(selectedType === 'hafalan' || selectedType === 'nilai') && (
                            <div className="form-group">
                                <label className="form-label">Santri</label>
                                <select className="form-control" value={filters.santri} onChange={e => setFilters({ ...filters, santri: e.target.value })}>
                                    <option value="">Semua Santri</option>
                                    {santriList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                                </select>
                            </div>
                        )}
                        {selectedType === 'hafalan' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Dari Tanggal</label>
                                    <input type="date" className="form-control" value={filters.dariTanggal} onChange={e => setFilters({ ...filters, dariTanggal: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sampai Tanggal</label>
                                    <input type="date" className="form-control" value={filters.sampaiTanggal} onChange={e => setFilters({ ...filters, sampaiTanggal: e.target.value })} />
                                </div>
                            </>
                        )}
                        {selectedType === 'nilai' && (
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select className="form-control" value={filters.semester} onChange={e => setFilters({ ...filters, semester: e.target.value })}>
                                    <option value="">Semua</option>
                                    {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} {s.tahun_ajaran}</option>)}
                                </select>
                            </div>
                        )}
                        {selectedType === 'raport' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Santri *</label>
                                    <select className="form-control" value={filters.santri} onChange={e => setFilters({ ...filters, santri: e.target.value })}>
                                        <option value="">Pilih Santri</option>
                                        {santriList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Semester *</label>
                                    <select className="form-control" value={filters.semester} onChange={e => setFilters({ ...filters, semester: e.target.value })}>
                                        <option value="">Pilih Semester</option>
                                        {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} {s.tahun_ajaran}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="generate-actions">
                        <button className="btn btn-secondary" onClick={fetchPreviewData} disabled={loadingPreview}>
                            {loadingPreview ? <><RefreshCw size={18} className="spin" /> Memuat...</> : <><Eye size={18} /> Preview Laporan</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="modal-overlay active">
                    <div className="modal preview-modal">
                        <div className="modal-header">
                            <h3 className="modal-title"><FileText size={20} /> Preview: {previewData.title}</h3>
                            <button className="modal-close" onClick={() => setShowPreview(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Preview Header */}
                            <div className="preview-header">
                                <div className="preview-logo">
                                    <h2>PTQA BATUAN</h2>
                                    <p>Sistem Akademik Pondok Pesantren</p>
                                </div>
                                <div className="preview-info">
                                    <p><strong>Laporan:</strong> {previewData.title}</p>
                                    <p><strong>Tanggal:</strong> {new Date().toLocaleDateString('id-ID')}</p>
                                    <p><strong>Total Data:</strong> {previewData.total}</p>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="preview-table-wrapper">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            {previewData.columns.map((col, i) => <th key={i}>{col}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.rows.length === 0 ? (
                                            <tr><td colSpan={previewData.columns.length} className="text-center">Tidak ada data</td></tr>
                                        ) : (
                                            previewData.rows.map((row, i) => (
                                                <tr key={i}>
                                                    {Object.values(row).map((val, j) => <td key={j}>{val}</td>)}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Preview Footer */}
                            <div className="preview-footer">
                                <p>Total: {previewData.total} data</p>
                                <p className="text-muted">Dicetak oleh Sistem Akademik PTQA Batuan</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>
                                <X size={16} /> Tutup
                            </button>
                            <button className="btn btn-secondary" onClick={handlePrint}>
                                <Printer size={16} /> Print
                            </button>
                            <button className="btn btn-primary" onClick={generatePDF} disabled={generating}>
                                {generating ? <><RefreshCw size={16} className="spin" /> Generating...</> : <><Download size={16} /> Download PDF</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Raport Modal - Compact Design */}
            {showRaport && raportData && (
                <div className="modal-overlay active">
                    <div className="modal raport-modal">
                        <div className="modal-header">
                            <h3 className="modal-title"><GraduationCap size={20} /> Raport Santri</h3>
                            <button className="modal-close" onClick={() => setShowRaport(false)}>×</button>
                        </div>
                        <div className="modal-body raport-content" id="raport-print">
                            {/* Header Institusi */}
                            <div className="raport-header-compact">
                                <img src="/logo-white.png" alt="Logo" className="raport-logo-sm" />
                                <div className="raport-institution-compact">
                                    <h1>YAYASAN ABDULLAH DEWI HASANAH</h1>
                                    <h2>PONDOK PESANTREN TAHFIZH QUR'AN AL-USYMUNI BATUAN</h2>
                                    <p>Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004 Desa Batuan</p>
                                    <p>Kecamatan Batuan Kabupaten Sumenep Jawa Timur</p>
                                </div>
                            </div>

                            {/* Biodata 2 Kolom */}
                            <div className="raport-biodata-compact">
                                <div className="biodata-left">
                                    <div className="bio-row"><span>Nama</span><span>: {raportData.santri?.nama}</span></div>
                                    <div className="bio-row"><span>Jenjang / Kelas</span><span>: {raportData.santri?.kelas?.nama || '-'}</span></div>
                                    <div className="bio-row"><span>NIS</span><span>: {raportData.santri?.nis}</span></div>
                                </div>
                                <div className="biodata-right">
                                    <div className="bio-row"><span>Halaqoh</span><span>: {raportData.santri?.halaqoh?.nama || '-'}</span></div>
                                    <div className="bio-row"><span>Semester</span><span>: {raportData.semester?.nama}</span></div>
                                    <div className="bio-row"><span>Tahun Ajaran</span><span>: {raportData.semester?.tahun_ajaran}</span></div>
                                </div>
                            </div>

                            {/* Content 2 Kolom */}
                            <div className="raport-body-compact">
                                {/* Kolom Kiri - Tabel Nilai */}
                                <div className="raport-left-col">
                                    <table className="raport-table-compact">
                                        <thead>
                                            <tr>
                                                <th>No</th>
                                                <th>Mata Pelajaran</th>
                                                <th>Nilai</th>
                                                <th>Predikat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Nilai Tahfizh */}
                                            <tr className="section-header"><td colSpan="4">NILAI TAHFIZH</td></tr>
                                            {raportData.nilai.filter(n => n.mapel?.kategori === 'Tahfizhiyah').map((n, i) => {
                                                const nilai = n.nilai_akhir || 0
                                                let predikat = nilai >= 90 ? 'A' : nilai >= 80 ? 'B' : nilai >= 70 ? 'C' : nilai >= 60 ? 'D' : 'E'
                                                return (
                                                    <tr key={`t-${i}`}>
                                                        <td>{i + 1}</td>
                                                        <td>{n.mapel?.nama}</td>
                                                        <td className="text-center">{nilai.toFixed(0)}</td>
                                                        <td className="text-center"><span className={`pred pred-${predikat.toLowerCase()}`}>{predikat}</span></td>
                                                    </tr>
                                                )
                                            })}
                                            {/* Nilai Madrasah */}
                                            <tr className="section-header"><td colSpan="4">NILAI MADRASAH</td></tr>
                                            {raportData.nilai.filter(n => n.mapel?.kategori !== 'Tahfizhiyah').map((n, i) => {
                                                const nilai = n.nilai_akhir || 0
                                                let predikat = nilai >= 90 ? 'A' : nilai >= 80 ? 'B' : nilai >= 70 ? 'C' : nilai >= 60 ? 'D' : 'E'
                                                return (
                                                    <tr key={`m-${i}`}>
                                                        <td>{i + 1}</td>
                                                        <td>{n.mapel?.nama}</td>
                                                        <td className="text-center">{nilai.toFixed(0)}</td>
                                                        <td className="text-center"><span className={`pred pred-${predikat.toLowerCase()}`}>{predikat}</span></td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Kolom Kanan */}
                                <div className="raport-right-col">
                                    {/* Pencapaian Tahfizh */}
                                    <div className="raport-box">
                                        <h4>Pencapaian Tahfizh</h4>
                                        <table className="info-table">
                                            <tbody>
                                                <tr><td>Jumlah Hafalan</td><td>: {raportData.hafalan.jumlahHafalan}</td></tr>
                                                <tr><td>Predikat</td><td>: <span className="pred pred-b">{raportData.hafalan.predikat}</span></td></tr>
                                                <tr><td>Jumlah Seluruh Hafalan</td><td>: {raportData.hafalan.totalHafalan}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Perilaku Murid */}
                                    <div className="raport-box">
                                        <h4>Perilaku Murid</h4>
                                        <table className="info-table">
                                            <tbody>
                                                <tr><td>A. Ketekunan</td><td><span className="pred pred-b">{raportData.perilaku?.ketekunan || 'Baik'}</span></td></tr>
                                                <tr><td>B. Kedisiplinan</td><td><span className="pred pred-b">{raportData.perilaku?.kedisiplinan || 'Baik'}</span></td></tr>
                                                <tr><td>C. Kebersihan</td><td><span className="pred pred-b">{raportData.perilaku?.kebersihan || 'Baik'}</span></td></tr>
                                                <tr><td>D. Kerapian</td><td><span className="pred pred-b">{raportData.perilaku?.kerapian || 'Baik'}</span></td></tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Ketidakhadiran */}
                                    <div className="raport-box">
                                        <h4>Ketidakhadiran</h4>
                                        <table className="info-table">
                                            <tbody>
                                                <tr><td>Alpa</td><td className="text-center">-</td></tr>
                                                <tr><td>Sakit</td><td className="text-center">-</td></tr>
                                                <tr><td>Izin</td><td className="text-center">-</td></tr>
                                                <tr><td>Pulang</td><td className="text-center">-</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Taujihat Musyrif */}
                            <div className="raport-taujihat">
                                <strong>Taujihat Musyrif</strong>
                                <p>Alhamdulillah, santri menunjukkan perkembangan yang baik dalam proses pembelajaran. Terus semangat dan perbanyak belajar dari kesalahan.</p>
                            </div>

                            {/* Tanggal & Tanda Tangan */}
                            <div className="raport-signature-compact">
                                <p className="raport-date">Batuan, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                                <div className="sig-row">
                                    <div className="sig-item">
                                        <p>Wali Murid</p>
                                        <div className="sig-line"></div>
                                        <p className="sig-name">{raportData.santri?.nama_wali || '_______________'}</p>
                                    </div>
                                    <div className="sig-item">
                                        <p>Musyrif</p>
                                        <div className="sig-line"></div>
                                        <p className="sig-name">{raportData.santri?.halaqoh?.musyrif?.nama || raportData.santri?.kelas?.wali_kelas?.nama || '_______________'}</p>
                                    </div>
                                </div>

                                <div className="sig-center">
                                    <p>Mengetahui</p>
                                    <p>Pengasuh PTQA Batuan</p>
                                    <div className="sig-line"></div>
                                    <p className="sig-name">KH. MIFTAHUL ARIFIN, LC.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRaport(false)}>
                                <X size={16} /> Tutup
                            </button>
                            <button className="btn btn-secondary" onClick={handlePrint}>
                                <Printer size={16} /> Print
                            </button>
                            <button className="btn btn-primary" onClick={generateRaportPDF} disabled={generating}>
                                <Download size={16} /> {generating ? 'Generating...' : 'Download PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LaporanPage
