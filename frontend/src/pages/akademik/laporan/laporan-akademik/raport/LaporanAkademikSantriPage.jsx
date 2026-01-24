import { useState, useEffect, useRef } from 'react'
import { Users, RefreshCw, Download, Printer, BookMarked, FileText, Calendar } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import RaportTemplate from '../../../../../components/akademik/RaportTemplate'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useCalendar } from '../../../../../context/CalendarContext'
import DateDisplay from '../../../../../components/common/DateDisplay'
import '../../../../../pages/laporan/Laporan.css'

const LaporanAkademikSantriPage = () => {
    const { formatDate } = useCalendar()
    const [loading, setLoading] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const pdfTemplateRef = useRef(null)
    const [semester, setSemester] = useState([])
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanData, setHafalanData] = useState([])
    const [nilaiTahfizh, setNilaiTahfizh] = useState(null)
    const [nilaiMadros, setNilaiMadros] = useState([])
    const [presensiData, setPresensiData] = useState({ pulang: 0, izin: 0, sakit: 0, alpha: 0 })
    const [taujihad, setTaujihad] = useState(null)
    const [perilaku, setPerilaku] = useState(null)
    const [musyrifName, setMusyrifName] = useState("Imam 'Ashim Al-Kufi")
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
            supabase.from('santri').select('id, nama, nis, nama_wali, kelas:kelas!kelas_id(nama), halaqoh:halaqoh!halaqoh_id(nama, musyrif_id)').eq('status', 'Aktif').order('nama')
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

                // Exclude if no grade found (User Request: Only show mapels with input)
                if (!bestGrade) return null

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
                    rata_rata: bestGrade.nilai_akhir, // Main score
                    predikat: getPredikat(bestGrade.nilai_akhir)
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

            // --- Fetch Musyrif Name ---
            if (selected.halaqoh?.musyrif_id) {
                const { data: guruData } = await supabase
                    .from('guru')
                    .select('nama')
                    .eq('id', selected.halaqoh.musyrif_id)
                    .single()
                if (guruData) setMusyrifName(guruData.nama)
            } else {
                setMusyrifName("Imam 'Ashim Al-Kufi")
            }

            // --- 5. Fetch Presensi & Perilaku Full ---
            const { data: perilakuData } = await supabase
                .from('perilaku_semester')
                .select('*')
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)
                .single()

            setPerilaku(perilakuData)

            if (perilakuData) {
                setPresensiData({
                    pulang: perilakuData.pulang ?? 0,
                    sakit: perilakuData.sakit ?? 0,
                    izin: perilakuData.izin ?? 0,
                    alpha: perilakuData.alpha ?? 0,
                    hadir: perilakuData.hadir ?? 0 // if available
                })
            } else {
                setPresensiData({ pulang: 0, izin: 0, sakit: 0, alpha: 0 })
            }

            // --- 6. Fetch Taujihad ---
            const { data: taujihadData } = await supabase
                .from('taujihad')
                .select('*')
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)
                .single()
            setTaujihad(taujihadData)

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
        setIsGeneratingPDF(true)

        try {
            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 500))

            const element = pdfTemplateRef.current
            if (!element) throw new Error("Template not found")

            // Capture format
            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()

            // Calculate aspect ratio to fit A4
            const imgProps = pdf.getImageProperties(imgData)
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width

            // Allow multiple pages if content is long (though Raport usually 1 page)
            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
            heightLeft -= pdfHeight

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
                heightLeft -= pdfHeight
            }

            const currentSem = semester.find(s => s.id === filters.semester_id)
            pdf.save(`Raport_${selectedSantri.nama.replace(/\s/g, '_')}_${currentSem?.nama}.pdf`)

        } catch (error) {
            console.error("PDF Generation Error:", error)
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const generatePDF_OLD_UNUSED = async () => {
        if (!selectedSantri) return

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        let y = 0

        // Colors
        const GREEN_HEADER = [0, 155, 124] // #009B7C

        // ========== HEADER WITH GREEN BACKGROUND ==========
        // Draw Green Block
        doc.setFillColor(...GREEN_HEADER)
        doc.rect(0, 0, pageWidth, 40, 'F')

        // Logo (White)
        const logoSize = 22
        const logoX = 14
        const logoY = 9
        try {
            const logoImg = new Image()
            logoImg.src = '/logo-white.png'
            await new Promise((resolve) => {
                logoImg.onload = resolve
                logoImg.onerror = resolve
                setTimeout(resolve, 800)
            })
            // Add image with alias to avoid compression issues if repeated
            doc.addImage(logoImg, 'PNG', logoX, logoY, logoSize, logoSize, 'logo', 'FAST')
        } catch (e) {
            console.warn('Logo loading failed', e)
        }

        // Header Text White
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('YAYASAN ABDULLAH DEWI HASANAH', 42, 16)

        doc.setFontSize(11)
        doc.text("PONDOK PESANTREN TAHFIZH QUR'AN AL-USYMUNI BATUAN", 42, 22)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text('Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep', 42, 27)

        // Green Border bottom line (slightly darker)
        doc.setDrawColor(0, 122, 97) // #007A61
        doc.setLineWidth(1.5)
        doc.line(0, 40, pageWidth, 40)

        // --- TITLE ---
        y = 55
        doc.setTextColor(0, 155, 124) // #009B7C
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.text('LAPORAN AKADEMIK SANTRI', pageWidth / 2, y, { align: 'center' })

        // --- BIODATA ---
        y += 10
        // Remove "DATA SANTRI" title to match print layout
        doc.setTextColor(0)

        y += 6
        const currentSem = semester.find(s => s.id === filters.semester_id)

        // 2 Column Biodata
        const leftColX = 14
        const rightColX = 110
        const labelWidth = 35
        const rowHeight = 6

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')

        // Row 1
        doc.text('Nama', leftColX, y)
        doc.text(':', leftColX + labelWidth - 3, y)
        doc.setFont('helvetica', 'bold')
        doc.text(selectedSantri.nama.toUpperCase(), leftColX + labelWidth, y)

        doc.setFont('helvetica', 'normal')
        doc.text('Halaqoh', rightColX, y)
        doc.text(':', rightColX + labelWidth - 3, y)
        doc.text(selectedSantri.halaqoh?.nama || '-', rightColX + labelWidth, y)

        y += rowHeight
        // Row 2
        doc.text('NIS', leftColX, y)
        doc.text(':', leftColX + labelWidth - 3, y)
        doc.text(selectedSantri.nis, leftColX + labelWidth, y)

        doc.text('Semester', rightColX, y)
        doc.text(':', rightColX + labelWidth - 3, y)
        doc.text(currentSem ? currentSem.nama : '-', rightColX + labelWidth, y)

        y += rowHeight
        // Row 3
        doc.text('Jenjang / Kelas', leftColX, y)
        doc.text(':', leftColX + labelWidth - 3, y)
        doc.text(selectedSantri.kelas?.nama || '-', leftColX + labelWidth, y)

        doc.text('Tahun Ajaran', rightColX, y)
        doc.text(':', rightColX + labelWidth - 3, y)
        doc.text(currentSem ? currentSem.tahun_ajaran : '-', rightColX + labelWidth, y)

        // --- CONTENT LAYOUT (2 Columns: Grades Left, Sidebars Right) ---
        y += 12
        const contentStartY = y
        const leftContentWidth = 105
        const rightContentX = 130
        const rightContentWidth = pageWidth - rightContentX - 14

        // --- LEFT COLUMN: NILAI TAHFIZH & MADROSIYAH ---

        // 1. Nilai Tahfizh
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)

        // Use autoTable for styling flexibility
        // Custom header drawing for "NILAI TAHFIZH" block
        autoTable(doc, {
            startY: y,
            head: [
                [{ content: 'NILAI TAHFIZH', colSpan: 4, styles: { halign: 'center', fillColor: GREEN_HEADER, textColor: 255, fontStyle: 'bold' } }],
                ['No', 'Mata Pelajaran', 'Nilai', 'Predikat']
            ],
            body: nilaiTahfizh && nilaiTahfizh.length > 0 ? nilaiTahfizh.map((row, i) => [
                i + 1,
                row.komponen,
                row.nilai || '-',
                row.predikat
            ]) : [[1, 'Hafalan Baru', '-', '-']],
            theme: 'plain',
            margin: { left: 14, right: pageWidth - (14 + leftContentWidth) }, // Limit width
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: GREEN_HEADER, textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { halign: 'center', width: 8 },
                2: { halign: 'center', width: 15, fontStyle: 'bold' },
                3: { halign: 'center', width: 15 }
            },
            didParseCell: (data) => {
                // Add borders to body cells manually if using plain theme
                if (data.section === 'body') {
                    data.cell.styles.lineWidth = 0.1
                    data.cell.styles.lineColor = [220, 220, 220]
                }
            }
        })

        let gradeY = doc.lastAutoTable.finalY + 8

        // 2. Nilai Madrosiyah
        autoTable(doc, {
            startY: gradeY,
            head: [
                [{ content: 'NILAI MADRASAH', colSpan: 4, styles: { halign: 'center', fillColor: GREEN_HEADER, textColor: 255, fontStyle: 'bold' } }],
                ['No', 'Mata Pelajaran', 'Nilai', 'Predikat']
            ],
            body: nilaiMadros.length > 0 ? nilaiMadros.map((m, i) => [
                i + 1,
                m.nama,
                m.rata_rata,
                m.predikat
            ]) : [['-', 'Belum ada data', '-', '-']],
            theme: 'plain',
            margin: { left: 14, right: pageWidth - (14 + leftContentWidth) },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: GREEN_HEADER, textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { halign: 'center', width: 8 },
                2: { halign: 'center', width: 15, fontStyle: 'bold' },
                3: { halign: 'center', width: 15 }
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    data.cell.styles.lineWidth = 0.1
                    data.cell.styles.lineColor = [220, 220, 220]
                }
            }
        })

        const leftColEndY = doc.lastAutoTable.finalY


        // --- RIGHT COLUMN: SIDEBARS ---
        let sideY = contentStartY

        // Function to draw side box
        const drawSideBox = (title, contentCallback) => {
            // Header
            doc.setFillColor(...GREEN_HEADER)
            doc.rect(rightContentX, sideY, rightContentWidth, 7, 'F')
            doc.setTextColor(255)
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.text(title, rightContentX + (rightContentWidth / 2), sideY + 5, { align: 'center' })

            // Border box
            const boxY = sideY + 7
            let currentY = boxY + 4

            // Content
            doc.setTextColor(0)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)

            const contentHeight = contentCallback(currentY)

            // Draw Outline
            doc.setDrawColor(...GREEN_HEADER)
            doc.setLineWidth(0.1)
            doc.rect(rightContentX, sideY, rightContentWidth, 7 + contentHeight + 4)

            sideY += 7 + contentHeight + 4 + 6 // Gap
        }

        // 1. Pencapaian Hafalan
        drawSideBox('PENCAPAIAN TAHFIZH', (startY) => {
            const hGap = 4.5
            let cy = startY

            const items = [
                ['Jumlah Hafalan:', perilaku?.jumlah_hafalan || '0 Juz'],
                ['Predikat:', perilaku?.predikat_hafalan || 'Baik'],
                ['Total Hafalan:', perilaku?.total_hafalan || '-']
            ]

            items.forEach((item, idx) => {
                doc.setFont('helvetica', idx === 1 ? 'bold' : 'normal') // make label bold? no, value bold
                doc.text(item[0], rightContentX + 3, cy)
                doc.setFont('helvetica', 'bold')
                doc.text(String(item[1]), rightContentX + rightContentWidth - 3, cy, { align: 'right' })
                doc.setFont('helvetica', 'normal')

                if (idx < items.length - 1) {
                    doc.setDrawColor(240)
                    doc.line(rightContentX + 3, cy + 1.5, rightContentX + rightContentWidth - 3, cy + 1.5)
                }
                cy += hGap
            })

            return (items.length * hGap)
        })

        // 2. Perilaku Murid
        drawSideBox('PERILAKU MURID', (startY) => {
            const hGap = 4.5
            let cy = startY

            const items = [
                ['A. Ketekunan:', perilaku?.ketekunan || 'Baik'],
                ['B. Kedisiplinan:', perilaku?.kedisiplinan || 'Baik'],
                ['C. Kebersihan:', perilaku?.kebersihan || 'Sangat Baik'],
                ['D. Kerapian:', perilaku?.kerapian || 'Sangat Baik']
            ]

            items.forEach((item) => {
                doc.text(item[0], rightContentX + 3, cy)
                doc.setFont('helvetica', 'bold')
                doc.text(item[1], rightContentX + rightContentWidth - 3, cy, { align: 'right' })
                doc.setFont('helvetica', 'normal')
                cy += hGap
            })

            return (items.length * hGap)
        })

        // 3. Ketidakhadiran
        drawSideBox('KETIDAKHADIRAN', (startY) => {
            let cy = startY + 2

            doc.setFontSize(8)
            const parts = [
                { l: 'Alpha', v: presensiData.alpha },
                { l: 'Sakit', v: presensiData.sakit },
                { l: 'Izin', v: presensiData.izin },
                { l: 'Pulang', v: presensiData.pulang }
            ]

            // 2x2 Grid inside standard box
            // Row 1
            doc.text(`Alpha: ${parts[0].v}`, rightContentX + 3, cy)
            doc.text(`Sakit: ${parts[1].v}`, rightContentX + (rightContentWidth / 2) + 2, cy)
            cy += 5
            doc.text(`Izin:   ${parts[2].v}`, rightContentX + 3, cy)
            doc.text(`Pulg:  ${parts[3].v}`, rightContentX + (rightContentWidth / 2) + 2, cy)

            return 12
        })


        // --- FOOTER SECTION: TAUJIHAT & SIGNATURES ---
        y = Math.max(leftColEndY, sideY) + 5

        // Page break check
        if (y > pageHeight - 60) {
            doc.addPage()
            y = 20
        }

        // Taujihat
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('Taujihat Musyrif', 14, y)
        y += 2

        doc.setDrawColor(150)
        doc.setLineWidth(0.1)
        doc.rect(14, y, pageWidth - 28, 25)

        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        const taujihatText = taujihad?.catatan || taujihad?.isi || 'Alhamdulillah, santri menunjukkan perkembangan yang baik. Terus semangat!'
        doc.text(doc.splitTextToSize(taujihatText, pageWidth - 32), 17, y + 5)

        y += 35

        // Signatures
        // 3 Columns: Wali, Pengasuh (Center Bottom), Musyrif
        const colW = (pageWidth - 28) / 3

        // Date
        const dateStr = `Batuan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)

        // Right Col Date
        doc.text(dateStr, 14 + (colW * 2) + (colW / 2), y, { align: 'center' })
        y += 5

        // Titles
        doc.text('Wali Murid', 14 + (colW / 2), y, { align: 'center' })
        doc.text('Musyrif', 14 + (colW * 2) + (colW / 2), y, { align: 'center' })

        y += 25

        // Names
        doc.setFont('helvetica', 'bold')
        doc.text(`(${selectedSantri.nama_wali?.toUpperCase() || '....................'})`, 14 + (colW / 2), y, { align: 'center' }) // Wali
        doc.text(musyrifName.toUpperCase(), 14 + (colW * 2) + (colW / 2), y, { align: 'center' }) // Musyrif

        y += 5

        // Center Bottom: Pengasuh
        doc.setFont('helvetica', 'normal')
        doc.text('Mengetahui,', pageWidth / 2, y, { align: 'center' })
        doc.text('Pengasuh PTQA Batuan', pageWidth / 2, y + 5, { align: 'center' })

        y += 30
        doc.setFont('helvetica', 'bold')
        doc.text('KH. MIFTAHUL ARIFIN, LC.', pageWidth / 2, y, { align: 'center' })
        doc.setLineWidth(0.2)
        doc.line((pageWidth / 2) - 30, y + 1, (pageWidth / 2) + 30, y + 1)


        // Save
        doc.save(`Raport_${selectedSantri.nama.replace(/\s/g, '_')}_${currentSem?.nama}.pdf`)
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
            {/* Hidden Template for PDF Generation */}
            <div style={{ position: 'absolute', left: '-10000px', top: 0 }}>
                {selectedSantri && (
                    <div ref={pdfTemplateRef} style={{ width: '210mm', minHeight: '297mm', background: 'white' }}>
                        <RaportTemplate
                            santri={selectedSantri}
                            semester={semester.find(s => s.id === filters.semester_id)}
                            nilaiTahfizh={nilaiTahfizh}
                            nilaiMadrasah={nilaiMadros}
                            perilaku={perilaku}
                            taujihad={taujihad}
                            ketidakhadiran={presensiData}
                            musyrifName={musyrifName}
                        />
                    </div>
                )}
            </div>

            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Laporan Akademik Santri
                    </h1>
                    <p className="page-subtitle">Laporan lengkap per santri</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={generatePDF}
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
