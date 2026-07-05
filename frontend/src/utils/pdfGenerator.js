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
        columns = [],
        data = [],
        filename = 'laporan',
        orientation = 'portrait',
        showTotal = true,
        totalLabel = 'Total',
        totalValue = null,
        additionalInfo = [],
        printedAt = null
    } = options

    const doc = new jsPDF(orientation)
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

    y += 32
    doc.setDrawColor(5, 150, 105)
    doc.setLineWidth(1)
    doc.line(14, y, pageWidth - 14, y)
    doc.setLineWidth(0.5)

    y += 10

    // Title Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105)
    doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' })
    y += 6

    if (subtitle) {
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.setFont('helvetica', 'normal')
        doc.text(subtitle, pageWidth / 2, y, { align: 'center' })
        y += 8
    }

    // Additional Info Table
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

    // Table Data Preparation
    const tableBody = data.map((row, index) => {
        if (Array.isArray(row)) return [index + 1, ...row]
        return [index + 1, ...Object.values(row)]
    })
    const tableColumns = ['No', ...columns]

    // Print Date for Footer
    const printDate = printedAt || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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
        // Reserve bottom margin for footer
        margin: { left: 14, right: 14, bottom: 30 }
    })

    // Total Section (Placement Check)
    let finalY = doc.lastAutoTable.finalY + 10

    // Check if there is enough space for Total (need approx 20 units)
    if (finalY > pageHeight - 30) {
        doc.addPage()
        finalY = 20 // Reset Y on new page
    }

    if (showTotal && totalValue !== null) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0)
        doc.text(`${totalLabel}: ${totalValue}`, pageWidth - 14, finalY, { align: 'right' })
    }

    // Global Footer (Executed at the end for all pages)
    const totalPages = doc.internal.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        const footerY = pageHeight - 15

        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150)

        // Left: Printed At
        doc.text(`Dicetak pada: ${printDate}`, 14, footerY)

        // Center: System Name
        doc.text('Sistem Akademik PTQA Batuan', pageWidth / 2, footerY, { align: 'center' })

        // Right: Page Number
        doc.text(`Hal ${i} dari ${totalPages}`, pageWidth - 14, footerY, { align: 'right' })
    }

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
    // Decorative line
    doc.setDrawColor(5, 150, 105)
    doc.setLineWidth(1)
    doc.line(14, y, pageWidth - 14, y)
    doc.setLineWidth(0.5)

    y += 15

    // Title
    doc.setTextColor(5, 150, 105)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('BUKTI PEMBAYARAN', pageWidth / 2, y, { align: 'center' })

    y += 8
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.setFont('helvetica', 'normal')
    doc.text(nomorKwitansi, pageWidth / 2, y, { align: 'center' })

    y += 15
    doc.setTextColor(0)

    // ========== CONTENT ROWS (Clean Design) ==========
    const startY = y
    const rowHeight = 11 // More spacing
    const labelWidth = 60
    const valueX = 14 + labelWidth
    const contentWidth = pageWidth - 28
    let currentRow = 0

    const drawRow = (label, value, isTotal = false) => {
        const rowY = startY + (currentRow * rowHeight)

        if (isTotal) {
            // Highlight Total Row
            doc.setFillColor(240, 253, 244) // Light green
            doc.setDrawColor(5, 150, 105)
            doc.rect(14, rowY - 6, contentWidth, rowHeight, 'FD')

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(11)
            doc.setTextColor(5, 150, 105)
            doc.text(label, 18, rowY + 1)
            doc.text(value || '-', 18 + labelWidth, rowY + 1)
            doc.setTextColor(0) // Reset
        } else {
            // Normal Row - Just bottom line
            doc.setDrawColor(240) // Very light gray line
            doc.line(14, rowY + 4, pageWidth - 14, rowY + 4)

            // Label
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(100)
            doc.text(label, 14, rowY)

            // Value
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            doc.setTextColor(0)
            doc.text(value || '-', 14 + labelWidth, rowY)
        }

        currentRow++
    }

    // Row 1: Tanggal
    const displayTanggal = formattedTanggal || new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    drawRow('Tanggal Pembayaran', displayTanggal)

    // Row 2: Nama Santri
    drawRow('Nama Santri', namaSantri)

    // Row 3: Nama Wali
    drawRow('Nama Wali Santri', namaWali || '-')

    // Row 4: Jenis Pembayaran
    drawRow('Untuk Pembayaran', kategori)

    // Row 5: Periode
    drawRow('Periode', periode || '-')

    // Row 6: Metode
    drawRow('Metode Pembayaran', metode)

    y = startY + (currentRow * rowHeight) + 10

    // Row 7: Jumlah (Highlighted)
    // Manually putting it separate for better layout control
    doc.setFillColor(5, 150, 105)
    doc.rect(14, y, contentWidth, 14, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('TOTAL JUMLAH', 20, y + 9)
    doc.setFontSize(12)
    doc.text(`Rp ${Number(jumlah).toLocaleString('id-ID')}`, pageWidth - 20, y + 9, { align: 'right' })

    y += 35

    // ========== LUNAS BADGE - STAMP EFFECT ==========
    doc.setDrawColor(5, 150, 105)
    doc.setLineWidth(2)
    doc.setTextColor(5, 150, 105)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')

    // Rotate context for stamp
    // jsPDF rotation is complex, keeping it simple horizontal for now
    doc.text('LUNAS', pageWidth / 2, y - 10, { align: 'center' })
    // doc.rect((pageWidth / 2) - 25, y - 19, 50, 14) // Box around LUNAS
    doc.setLineWidth(0.5) // Reset

    y += 10

    // ========== SIGNATURE ==========
    doc.setTextColor(0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    const signatureY = y
    doc.text('Sumenep, ' + (formattedTanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })), pageWidth - 50, signatureY, { align: 'center' })
    doc.text('Bendahara', pageWidth - 50, signatureY + 5, { align: 'center' })

    // Space for signature
    doc.line(pageWidth - 70, signatureY + 25, pageWidth - 30, signatureY + 25)

    doc.setFont('helvetica', 'bold')
    doc.text(kasir || 'Admin Keuangan', pageWidth - 50, signatureY + 30, { align: 'center' })

    // ========== FOOTER ==========
    const finalY = 280
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(150)
    doc.text('Simpan kwitansi ini sebagai bukti pembayaran yang sah.', pageWidth / 2, finalY, { align: 'center' })

    // Save
    doc.save(`Kwitansi_${nomorKwitansi}_${namaSantri?.replace(/\s/g, '_') || 'santri'}.pdf`)
}

export default {
    generateLaporanPDF,
    generateKwitansiPDF
}
