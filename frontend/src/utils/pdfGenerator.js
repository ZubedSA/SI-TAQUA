/**
 * PDF Utility Functions
 * Untuk generate PDF laporan keuangan
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Generate PDF laporan standar
 * @param {object} options - Opsi generate PDF
 */
export const generateLaporanPDF = (options) => {
    const {
        title = 'Laporan',
        subtitle = '',
        columns = [],
        data = [],
        filename = 'laporan',
        orientation = 'portrait',
        showTotal = true,
        totalLabel = 'Total',
        totalValue = null,
        additionalInfo = []
    } = options

    const doc = new jsPDF(orientation)
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 15

    // Header - Kop Surat
    doc.setFillColor(5, 150, 105)
    doc.rect(14, y, pageWidth - 28, 25, 'F')

    doc.setTextColor(255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('YAYASAN ABDULLAH DEWI HASANAH', pageWidth / 2, y + 8, { align: 'center' })
    doc.setFontSize(12)
    doc.text('PONDOK PESANTREN TAHFIZH QUR\'AN AL-USYMUNI BATUAN', pageWidth / 2, y + 15, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep', pageWidth / 2, y + 21, { align: 'center' })

    y += 30
    doc.setTextColor(0)

    // Title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' })
    y += 6

    if (subtitle) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(subtitle, pageWidth / 2, y, { align: 'center' })
        y += 6
    }

    // Additional Info
    if (additionalInfo.length > 0) {
        y += 4
        doc.setFontSize(10)
        additionalInfo.forEach(info => {
            doc.text(`${info.label}: ${info.value}`, 14, y)
            y += 5
        })
    }

    y += 4

    // Table
    const tableBody = data.map((row, index) => {
        if (Array.isArray(row)) {
            return [index + 1, ...row]
        }
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
            cellPadding: 3
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
        doc.text(`${totalLabel}: Rp ${Number(totalValue).toLocaleString('id-ID')}`, pageWidth - 14, finalY, { align: 'right' })
    }

    // Footer
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, finalY + 15)
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
        kasir
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
    drawRow('Tanggal', new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))

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
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, y + 5, { align: 'center' })

    // Save
    doc.save(`Kwitansi_${nomorKwitansi}_${namaSantri?.replace(/\s/g, '_') || 'santri'}.pdf`)
}

export default {
    generateLaporanPDF,
    generateKwitansiPDF
}
