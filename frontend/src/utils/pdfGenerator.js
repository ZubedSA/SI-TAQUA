/**
 * PDF Utility Functions
 * Untuk generate PDF laporan keuangan dan akademik
 * Professional Design with Logo
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Generate PDF laporan standar
 * @param {object} options - Opsi generate PDF
 */
export const generateLaporanPDF = async (options) => {
    const {
        title = 'Laporan',
        subtitle = '',
        columns = [], // Header columns: ['No', 'Nama', ...]
        data = [], // Data rows: [['1', 'Fulan', ...], ...]
        filename = 'laporan',
        orientation = 'portrait',
        showTotal = true,
        totalLabel = 'Total',
        totalValue = null,
        additionalInfo = [], // [{label: 'Halaqoh', value: 'A'}, ...]
        printedAt = null // Custom formatted date string for footer
    } = options

    const doc = new jsPDF(orientation)
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 15

    // ========== HEADER WITH LOGO ==========
    // Async Image Loading
    const logoSize = 25
    const logoX = 14
    let headerTextX = 45

    try {
        const logoImg = new Image()
        logoImg.src = '/logo-pondok.png'
        await new Promise((resolve) => {
            logoImg.onload = resolve
            logoImg.onerror = resolve // Continue even if fails
            // Timeout safety
            setTimeout(resolve, 1000)
        })
        doc.addImage(logoImg, 'PNG', logoX, y, logoSize, logoSize)
    } catch (e) {
        console.warn('Logo loading failed', e)
    }

    // Header Text - Professional Centered with Logo offset
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
    doc.setLineWidth(0.5) // Reset line width

    y += 10

    // Title Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105) // Green theme
    doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' })
    y += 6

    if (subtitle) {
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.setFont('helvetica', 'normal')
        doc.text(subtitle, pageWidth / 2, y, { align: 'center' })
        y += 8
    }

    // Additional Info Table (Key-Value)
    if (additionalInfo.length > 0) {
        y += 4
        doc.setTextColor(0)
        doc.setFontSize(9)
        additionalInfo.forEach(info => {
            doc.setFont('helvetica', 'bold')
            doc.text(`${info.label}:`, 14, y)
            doc.setFont('helvetica', 'normal')
            doc.text(`${info.value}`, 50, y)
            y += 5
        })
        y += 2
    }

    y += 4

    // Table
    const tableBody = data.map((row, index) => {
        if (Array.isArray(row)) {
            // Already array row
            // Check if user included numbering manually? Usually we add it. 
            // The utility assumes numbering needs to be added if not present?
            // Actually existing logic added No:
            return [index + 1, ...row]
        }
        // Object row
        return [index + 1, ...Object.values(row)]
    })

    const tableColumns = ['No', ...columns]

    autoTable(doc, {
        startY: y,
        head: [tableColumns],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [5, 150, 105],
            textColor: 255,
            halign: 'center',
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
    })

    // Total
    const finalY = (doc.previousAutoTable?.finalY || y + 50) + 10

    if (showTotal && totalValue !== null) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0)
        doc.text(`${totalLabel}: ${totalValue}`, pageWidth - 14, finalY, { align: 'right' })
    }

    // Footer
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    const printDate = printedAt || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    doc.text(`Dicetak pada: ${printDate}`, 14, finalY + 15)
    doc.text('Sistem Akademik PTQA Batuan', pageWidth / 2, finalY + 25, { align: 'center' })

    // Save
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Generate PDF kwitansi pembayaran
 * @param {object} data - Data pembayaran
 */
export const generateKwitansiPDF = async (data) => {
    const {
        nomorKwitansi,
        tanggal,
        namaSantri,
        namaWali,
        kategori, // jenis pembayaran
        periode, // contoh: "Desember 2025"
        jumlah,
        metode,
        kasir,
        printedAt = null,
        formattedTanggal = null
    } = data

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 15

    // ========== HEADER WITH LOGO ==========
    // Try to load logo image
    try {
        const logoImg = new Image()
        logoImg.src = '/logo-pondok.png'
        await new Promise((resolve, reject) => {
            logoImg.onload = resolve
            logoImg.onerror = reject
            setTimeout(reject, 2000) // timeout after 2s
        })
        doc.addImage(logoImg, 'PNG', 14, y, 25, 25)
    } catch (e) {
        // Fallback: draw circle placeholder if logo fails
        doc.setFillColor(5, 150, 105)
        doc.circle(26, y + 12, 10, 'F')
        doc.setTextColor(255)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('P', 26, y + 15, { align: 'center' })
    }

    // Institution name
    doc.setTextColor(0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('YAYASAN ABDULLAH DEWI HASANAH', 45, y + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PONDOK PESANTREN TAHFIZH QUR\'AN AL-USYMUNI', 45, y + 13)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep', 45, y + 19)

    y += 32

    // Title bar
    doc.setFillColor(5, 150, 105)
    doc.rect(14, y, pageWidth - 28, 12, 'F')
    doc.setTextColor(255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('KWITANSI PEMBAYARAN', pageWidth / 2, y + 8, { align: 'center' })

    y += 20
    doc.setTextColor(0)

    // ========== CONTENT ROWS (with borders) ==========
    const startY = y
    const rowHeight = 10
    const labelWidth = 50
    const valueX = 14 + labelWidth
    const contentWidth = pageWidth - 28
    let currentRow = 0

    const drawRow = (label, value) => {
        const rowY = startY + (currentRow * rowHeight)
        // Draw border
        doc.setDrawColor(180)
        doc.rect(14, rowY, contentWidth, rowHeight)
        // Label background
        doc.setFillColor(245, 245, 245)
        doc.rect(14, rowY, labelWidth, rowHeight, 'F')
        // Label border
        doc.line(14 + labelWidth, rowY, 14 + labelWidth, rowY + rowHeight)
        // Text
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(label, 18, rowY + 7)
        doc.text(value || '-', valueX + 4, rowY + 7)
        currentRow++
    }

    // Row 1: No. Kwitansi
    drawRow('No. Kwitansi', nomorKwitansi)

    // Row 2: Tanggal
    const displayTanggal = formattedTanggal || new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    drawRow('Tanggal', displayTanggal)

    // Row 3: Nama Santri
    drawRow('Nama Santri', namaSantri)

    // Row 4: Nama Wali Santri
    drawRow('Nama Wali Santri', namaWali || '-')

    // Row 5: Jenis Pembayaran
    drawRow('Jenis Pembayaran', kategori)

    // Row 6: Periode
    drawRow('Periode', periode || '-')

    // Row 7: Jumlah (bold)
    const jumlahRowY = startY + (currentRow * rowHeight)
    doc.setDrawColor(180)
    doc.rect(14, jumlahRowY, contentWidth, rowHeight)
    doc.setFillColor(240, 253, 244) // light green
    doc.rect(14, jumlahRowY, labelWidth, rowHeight, 'F')
    doc.line(14 + labelWidth, jumlahRowY, 14 + labelWidth, jumlahRowY + rowHeight)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Jumlah', 18, jumlahRowY + 7)
    doc.setFontSize(11)
    doc.text(`Rp ${Number(jumlah).toLocaleString('id-ID')}`, valueX + 4, jumlahRowY + 7)
    currentRow++

    // Row 8: Metode Pembayaran
    drawRow('Metode Pembayaran', metode)

    y = startY + (currentRow * rowHeight) + 20

    // ========== LUNAS BADGE - CENTERED & BIG ==========
    doc.setTextColor(5, 150, 105)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(28)
    doc.text('LUNAS', pageWidth / 2, y, { align: 'center' })

    y += 20

    // ========== SIGNATURE SECTION - CENTERED ==========
    doc.setTextColor(0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Hormat Kami,', pageWidth / 2, y, { align: 'center' })

    y += 25
    // Signature line - centered
    doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y)

    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text(kasir || 'Bendahara PTQA', pageWidth / 2, y, { align: 'center' })

    // ========== FOOTER ==========
    y += 20
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text('PTQA Batuan - Pondok Pesantren Tahfizh Qur\'an Al-Usymuni Batuan', pageWidth / 2, y, { align: 'center' })
    const printDate = printedAt || new Date().toLocaleDateString('id-ID')
    doc.text(`Dicetak: ${printDate}`, pageWidth / 2, y + 5, { align: 'center' })

    // Save
    doc.save(`Kwitansi_${nomorKwitansi}_${namaSantri?.replace(/\s/g, '_') || 'santri'}.pdf`)
}

export default {
    generateLaporanPDF,
    generateKwitansiPDF
}
