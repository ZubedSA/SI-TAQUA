import jsPDF from 'jspdf'

/**
 * Generate A4 PDF containing QR codes for Classes or Halaqoh.
 * Layout: 2 columns x 2 rows (4 cards per A4 page).
 * Design is kept simple per requirement: only QR code and the Class/Halaqoh name.
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

        const cardW = 90
        const cardH = 130
        const cardX = 10 + col * 100 // 10mm (col 0) or 110mm (col 1)
        const cardY = 12 + row * 143 // 12mm (row 0) or 155mm (row 1)

        // 1. Border / Cut guide dashed outline
        doc.setDrawColor(203, 213, 225) // slate-300
        doc.setLineWidth(0.4)
        doc.setLineDashPattern([2, 2], 0)
        doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'S')
        doc.setLineDashPattern([], 0)

        // 2. Class / Halaqoh Name (simpel, bold, terpusat)
        const name = (item.name || 'QR Code').trim()
        doc.setTextColor(15, 23, 42) // slate-900
        doc.setFont('helvetica', 'bold')

        // Sesuaikan ukuran font dengan panjang nama agar muat rapi
        if (name.length > 24) {
            doc.setFontSize(12)
        } else if (name.length > 16) {
            doc.setFontSize(14)
        } else {
            doc.setFontSize(17)
        }

        const textY = cardY + 22
        doc.text(name, cardX + cardW / 2, textY, {
            align: 'center',
            maxWidth: 82
        })

        // 3. QR Code Canvas Image
        const canvas = getCanvasElement ? getCanvasElement(index, item) : null
        if (canvas) {
            try {
                const imgData = canvas.toDataURL('image/png')
                const qrSize = 70 // 70mm x 70mm (besar, tajam & mudah di-scan)
                const qrX = cardX + (cardW - qrSize) / 2
                const qrY = cardY + 38
                doc.addImage(imgData, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST')
            } catch (err) {
                console.error(`Gagal merender QR untuk ${name}:`, err)
            }
        }
    }

    doc.save(fileName)
    return doc
}
