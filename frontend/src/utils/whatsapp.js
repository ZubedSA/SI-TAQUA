/**
 * GLOBAL WHATSAPP FORMATTER STANDARD
 * ==================================
 * Mengatur format pesan WhatsApp agar konsisten di seluruh aplikasi.
 * 
 * ATURAN:
 * 1. Gunakan formatMessage() untuk membuat pesan.
 * 2. JANGAN membuat string manual di komponen.
 * 3. Data berbentuk array of objects { label, value } atau string simple.
 */

/**
 * Format nomor telepon ke format internasional Indonesia (62xxx)
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1)
    if (!cleaned.startsWith('62')) cleaned = '62' + cleaned
    return cleaned
}

/**
 * Membuka WhatsApp dengan pesan yang sudah diformat
 * @param {string} phone - Nomor tujuan
 * @param {string} message - Pesan (gunakan hasil dari createMessage)
 */
export const sendWhatsApp = (phone, message) => {
    const formattedPhone = formatPhoneNumber(phone)
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    window.open(url, '_blank')
}

/**
 * BUILDER PESAN STANDAR
 * Menggabungkan bagian-bagian pesan dengan format yang baku.
 * 
 * @param {Object} options
 * @param {string} options.greeting - Pembuka (Default: Assalamu'alaikum Wr. Wb.)
 * @param {string} options.intro - Kalimat pengantar utama
 * @param {Array<{label: string, value: string}|string>} options.data - Data yang akan ditampilkan
 * @param {string} options.closing - Kalimat penutup (Default: Terima kasih.)
 * @param {string} options.signature - Tanda tangan (Default: PTQA Batuan)
 */
export const createMessage = ({
    greeting = "Assalamu'alaikum Wr. Wb.",
    intro = "",
    data = [],
    closing = "Terima kasih, Jazakumullah Khairan.",
    signature = "PTQ Al-Usymuni Batuan"
}) => {
    // 1. Header Section
    let content = `*${intro.toUpperCase()}*\n\n` // Judul/Intro tebal
    content += `${greeting}\n\n`

    // 2. Body / Intro Text
    if (intro && intro.length > 50) { // Jika intro panjang, taruh di paragraf sendiri
        // Skip karena sudah dijadikan judul di atas, 
        // tapi jika deskriptif (bukan judul), bisa ditambahkan disini.
        // Untuk kesederhanaan, kita anggap intro adalah Judul Utama.
    }

    // Revisi Strategi Layout:
    // Header: Greeting
    // Title/Context: Intro
    // Data List
    // Footer

    // Reset content builder
    const sections = []

    // A. Salam Pembuka
    sections.push(greeting)

    // B. Intro / Context
    if (intro) {
        sections.push(intro)
    }

    // C. Data List
    if (data && data.length > 0) {
        const dataRows = data.map(item => {
            if (!item) return null
            if (typeof item === 'string') {
                return `• ${item}` // Simple list item
            }
            if (item.label && item.value) {
                // Format: Label : Value (Label tebal)
                return `*${item.label}:* ${item.value}`
            }
            return ''
        }).filter(Boolean)

        sections.push(dataRows.join('\n'))
    }

    // D. Penutup
    if (closing) {
        sections.push(closing)
        sections.push("Wassalamu'alaikum Wr. Wb.")
    }

    // E. Signature (Italic)
    if (signature) {
        sections.push(`_${signature}_`)
    }

    // Join semua section dengan Double Newline untuk paragraf yang rapi
    return sections.join('\n\n')
}

// Backward Compatibility Helpers (Will be deprecated soon, but kept for safety during migration)
// Kita arahkan ke format baru pelan-pelan

export const templateTagihanSantri = (data) => {
    return createMessage({
        intro: `PEMBERITAHUAN TAGIHAN`,
        data: [
            `Kepada Yth. Wali Santri *${data.namaSantri}*`,
            { label: 'Kategori', value: data.kategori },
            { label: 'Jumlah', value: `Rp ${Number(data.jumlah).toLocaleString('id-ID')}` },
            { label: 'Jatuh Tempo', value: data.formattedJatuhTempo || data.jatuhTempo }
        ],
        closing: "Mohon untuk melakukan pembayaran sebelum jatuh tempo."
    })
}

export const templateKonfirmasiPembayaran = (data) => {
    return createMessage({
        intro: `KONFIRMASI PEMBAYARAN`,
        data: [
            `Kepada Yth. Wali Santri *${data.namaSantri}*`,
            `Alhamdulillah, pembayaran telah kami terima:`,
            { label: 'Kategori', value: data.kategori },
            { label: 'Jumlah', value: `Rp ${Number(data.jumlah).toLocaleString('id-ID')}` },
            { label: 'Tanggal', value: data.formattedTanggal || data.tanggal },
            { label: 'Metode', value: data.metode },
            { label: 'Status', value: 'LUNAS ✅' }
        ],
        closing: "Terima kasih atas kepercayaannya."
    })
}

export default {
    formatPhoneNumber,
    sendWhatsApp,
    createMessage,
    templateTagihanSantri,
    templateKonfirmasiPembayaran
}
