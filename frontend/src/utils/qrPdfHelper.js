import jsPDF from 'jspdf'

/**
 * Generate Luxury A4 PDF containing QR codes for Classes or Halaqoh.
 * Layout: 2 columns x 2 rows (4 luxury cards per A4 page).
 * Design is styled with premium Islamic boarding school aesthetics:
 * - Rich Emerald / Royal Navy Header with gold accents
 * - Dedicated Name Plate with bold typography
 * - Framed QR Container with gold corner brackets
 * - Clean footer instructions & precise crop marks
 * 
 * @param {Object} options
 * @param {Array<{ id: string, name: string, type: string }>} options.items
 * @param {Function} options.getCanvasElement - Callback (index, item) => HTMLCanvasElement | null
 * @param {string} [options.fileName='QR_Absensi_SITAQUA.pdf']
 * @param {Function} [options.onProgress] - Callback (current, total) => void
 */
export async function generateQRPdf({
    items = [],
    getCanvasElement,
    fileName = 'QR_Absensi_SITAQUA.pdf',
    onProgress
}) {
    if (!items || items.length === 0) {
        throw new Error('Tidak ada data QR yang dipilih untuk dicetak.')
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    })

    const total = items.length

    for (let index = 0; index < total; index++) {
        const item = items[index]
        if (onProgress) {
            onProgress(index + 1, total)
        }

        const itemIndexInPage = index % 4
        if (index > 0 && itemIndexInPage === 0) {
            doc.addPage()
        }

        // Layout calculation: 2 cols x 2 rows per A4 sheet (210 x 297 mm)
        const col = itemIndexInPage % 2
        const row = Math.floor(itemIndexInPage / 2)

        const cardW = 92
        const cardH = 134
        const cardX = 9 + col * 100  // 9mm (col 0) or 109mm (col 1) -> 9 + 92 + 8 + 92 + 9 = 210mm
        const cardY = 10 + row * 142 // 10mm (row 0) or 152mm (row 1) -> 10 + 134 + 8 + 134 + 11 = 297mm

        const isMadrosah = item.type === 'MADROSAH'

        // ==========================================
        // 1. CROP MARKS / CUTTING GUIDES (Di Luar Kartu)
        // ==========================================
        doc.setDrawColor(203, 213, 225) // slate-300
        doc.setLineWidth(0.2)
        const markLen = 2.5
        // Top-left
        doc.line(cardX - 1.5, cardY, cardX - 1.5 - markLen, cardY)
        doc.line(cardX, cardY - 1.5, cardX, cardY - 1.5 - markLen)
        // Top-right
        doc.line(cardX + cardW + 1.5, cardY, cardX + cardW + 1.5 + markLen, cardY)
        doc.line(cardX + cardW, cardY - 1.5, cardX + cardW, cardY - 1.5 - markLen)
        // Bottom-left
        doc.line(cardX - 1.5, cardY + cardH, cardX - 1.5 - markLen, cardY + cardH)
        doc.line(cardX, cardY + cardH + 1.5, cardX, cardY + cardH + 1.5 + markLen)
        // Bottom-right
        doc.line(cardX + cardW + 1.5, cardY + cardH, cardX + cardW + 1.5 + markLen, cardY + cardH)
        doc.line(cardX + cardW, cardY + cardH + 1.5, cardX + cardW, cardY + cardH + 1.5 + markLen)

        // ==========================================
        // 2. KARTU BASE & DOUBLE BORDER MEWAH
        // ==========================================
        // Base Card Body (White)
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(226, 232, 240) // Slate-200 border
        doc.setLineWidth(0.4)
        doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD')

        // Inner Gold Decorative Border
        doc.setDrawColor(212, 175, 55) // Rich Gold
        doc.setLineWidth(0.35)
        doc.roundedRect(cardX + 1.8, cardY + 1.8, cardW - 3.6, cardH - 3.6, 2.5, 2.5, 'S')

        // ==========================================
        // 3. HEADER RIBBON MEWAH
        // ==========================================
        const headerH = 22
        // Header background fill
        if (isMadrosah) {
            // Deep Forest Emerald (Mewah & Islami)
            doc.setFillColor(6, 78, 59)
        } else {
            // Royal Sapphire Navy (Elegan & Berwibawa)
            doc.setFillColor(15, 23, 62)
        }
        doc.roundedRect(cardX + 2, cardY + 2, cardW - 4, headerH, 2.5, 2.5, 'F')
        // Tutup rounded rect bawah header agar menyatu lurus
        doc.rect(cardX + 2, cardY + 15, cardW - 4, 9, 'F')

        // Gold Ribbon Accent Line di bawah header
        doc.setFillColor(212, 175, 55) // Gold
        doc.rect(cardX + 2, cardY + 2 + headerH, cardW - 4, 0.8, 'F')

        // Teks Lembaga (Gold Foil Look)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(245, 197, 66) // Gold text
        doc.text('PPTQ AL-USYMUNI', cardX + cardW / 2, cardY + 8, {
            align: 'center',
            charSpace: 0.5
        })

        // Teks Sub-Kategori Utama
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(255, 255, 255) // White
        const categoryTitle = isMadrosah ? 'PORTAL ABSENSI KELAS' : 'PORTAL ABSENSI HALAQOH'
        doc.text(categoryTitle, cardX + cardW / 2, cardY + 14.5, { align: 'center' })

        // Teks Lembaga Kecil
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(203, 213, 225) // Slate-300
        doc.text('Madrosah Diniyah & Tahfidzul Quran', cardX + cardW / 2, cardY + 19.5, { align: 'center' })

        // ==========================================
        // 4. PLAKAT NAMA KELAS / HALAQOH
        // ==========================================
        const plateW = cardW - 12
        const plateH = 13.5
        const plateX = cardX + 6
        const plateY = cardY + 27.5

        // Plakat Background
        doc.setFillColor(248, 250, 252) // slate-50
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.roundedRect(plateX, plateY, plateW, plateH, 2.5, 2.5, 'FD')

        // Plakat Accent Line Kiri (Emerald atau Navy)
        if (isMadrosah) {
            doc.setFillColor(5, 150, 105) // emerald-600
        } else {
            doc.setFillColor(37, 99, 235) // blue-600
        }
        doc.roundedRect(plateX, plateY, 2, plateH, 1, 1, 'F')

        // Teks Nama Kelas / Halaqoh
        const name = (item.name || 'QR Code').trim()
        doc.setTextColor(15, 23, 42) // slate-900 tebal
        doc.setFont('helvetica', 'bold')

        if (name.length > 22) {
            doc.setFontSize(10.5)
        } else if (name.length > 15) {
            doc.setFontSize(12.5)
        } else {
            doc.setFontSize(15)
        }

        doc.text(name, cardX + cardW / 2, plateY + 8.8, {
            align: 'center',
            maxWidth: plateW - 6
        })

        // ==========================================
        // 5. WADAH QR CODE (LUXURY CORNER FRAME)
        // ==========================================
        const qrBoxSize = 65
        const qrBoxX = cardX + (cardW - qrBoxSize) / 2
        const qrBoxY = cardY + 44.5

        // Kotak Bingkai Putih Dalam
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(226, 232, 240) // border halus
        doc.setLineWidth(0.3)
        doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 3, 3, 'FD')

        // 4 Sudut Emas Mewah (Corner Brackets / Accents)
        doc.setDrawColor(212, 175, 55) // Gold
        doc.setLineWidth(0.7)
        const cornerLen = 4
        const offset = 1.2

        // Top-left corner
        doc.line(qrBoxX - offset, qrBoxY - offset + cornerLen, qrBoxX - offset, qrBoxY - offset)
        doc.line(qrBoxX - offset, qrBoxY - offset, qrBoxX - offset + cornerLen, qrBoxY - offset)
        // Top-right corner
        doc.line(qrBoxX + qrBoxSize + offset - cornerLen, qrBoxY - offset, qrBoxX + qrBoxSize + offset, qrBoxY - offset)
        doc.line(qrBoxX + qrBoxSize + offset, qrBoxY - offset, qrBoxX + qrBoxSize + offset, qrBoxY - offset + cornerLen)
        // Bottom-left corner
        doc.line(qrBoxX - offset, qrBoxY + qrBoxSize + offset - cornerLen, qrBoxX - offset, qrBoxY + qrBoxSize + offset)
        doc.line(qrBoxX - offset, qrBoxY + qrBoxSize + offset, qrBoxX - offset + cornerLen, qrBoxY + qrBoxSize + offset)
        // Bottom-right corner
        doc.line(qrBoxX + qrBoxSize + offset - cornerLen, qrBoxY + qrBoxSize + offset, qrBoxX + qrBoxSize + offset, qrBoxY + qrBoxSize + offset)
        doc.line(qrBoxX + qrBoxSize + offset, qrBoxY + qrBoxSize + offset, qrBoxX + qrBoxSize + offset, qrBoxY + qrBoxSize + offset - cornerLen)

        // Render QR Code Image dari Canvas
        const canvas = getCanvasElement ? getCanvasElement(index, item) : null
        if (canvas) {
            try {
                const imgData = canvas.toDataURL('image/png')
                const innerQrSize = 58 // 58 mm x 58 mm (Sangat tajam & mudah di-scan)
                const innerQrX = qrBoxX + (qrBoxSize - innerQrSize) / 2
                const innerQrY = qrBoxY + (qrBoxSize - innerQrSize) / 2
                doc.addImage(imgData, 'PNG', innerQrX, innerQrY, innerQrSize, innerQrSize, undefined, 'FAST')
            } catch (err) {
                console.error(`Gagal merender QR untuk ${name}:`, err)
            }
        }

        // ==========================================
        // 6. FOOTER ELEGAN & INSTRUKSI PRESENSI
        // ==========================================
        // Divider Emas Halus
        doc.setDrawColor(212, 175, 55)
        doc.setLineWidth(0.35)
        doc.line(cardX + 16, cardY + 114.5, cardX + cardW - 16, cardY + 114.5)

        // Titik Aksen Emas di Tengah Divider
        doc.setFillColor(212, 175, 55)
        doc.circle(cardX + cardW / 2, cardY + 114.5, 0.6, 'F')

        // Instruksi Scan
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.8)
        doc.setTextColor(71, 85, 105) // Slate-600
        doc.text('Scan kamera untuk memulai presensi santri & asatidz', cardX + cardW / 2, cardY + 119.5, { align: 'center' })

        // Watermark Sistem
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.8)
        doc.setTextColor(148, 163, 184) // Slate-400
        doc.text('SI-TAQUA Presensi Digital - Keaslian Terverifikasi', cardX + cardW / 2, cardY + 124.5, { align: 'center' })

        // Aksen Strip Bawah (Gold Bar)
        doc.setFillColor(212, 175, 55)
        doc.roundedRect(cardX + (cardW - 32) / 2, cardY + 128.5, 32, 0.7, 0.3, 0.3, 'F')
    }

    doc.save(fileName)
    return doc
}
