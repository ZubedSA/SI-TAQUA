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

/**
 * Mengirim pesan WhatsApp secara otomatis di background menggunakan API Fonnte
 * @param {string} phone - Nomor telepon wali santri
 * @param {string} message - Pesan yang akan dikirim
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const sendWhatsAppViaFonnte = async (phone, message) => {
    try {
        const token = import.meta.env.VITE_FONNTE_TOKEN;
        if (!token) {
            console.warn('[Fonnte] Token tidak ditemukan di env (VITE_FONNTE_TOKEN)');
            return { success: false, error: 'Token Fonnte tidak terkonfigurasi' };
        }

        const formattedPhone = formatPhoneNumber(phone);
        if (!formattedPhone) {
            return { success: false, error: 'Nomor telepon tidak valid' };
        }

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target: formattedPhone,
                message: message
            })
        });

        const resData = await response.json();
        if (response.ok && resData.status === true) {
            console.log(`[Fonnte] Pesan berhasil dikirim ke ${formattedPhone}`);
            return { success: true, data: resData };
        } else {
            console.error('[Fonnte] Gagal mengirim pesan:', resData.reason || resData.message || 'Unknown error');
            return { success: false, error: resData.reason || resData.message || 'Unknown error' };
        }
    } catch (err) {
        console.error('[Fonnte] Error sending message:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Membuat template pesan WhatsApp laporan ketidakhadiran santri
 */
export const templateAbsensiWali = ({ namaSantri, namaWali, status, tanggal, sesi, keterangan }) => {
    const statusText = {
        'Sakit': 'Sakit 🤒',
        'Izin': 'Izin 📝',
        'Alfa': 'Alpha / Tanpa Keterangan ❌',
        'Alpha': 'Alpha / Tanpa Keterangan ❌',
        'Alpa': 'Alpha / Tanpa Keterangan ❌',
        'Pulang': 'Pulang / Izin Pulang 🏠',
    }[status] || `${status} ❌`;

    const dataList = [
        `Kepada Yth. Wali Santri *${namaWali || 'Bapak/Ibu'}*`,
        `Kami ingin menginformasikan bahwa ananda *${namaSantri}* tercatat tidak hadir pada kegiatan pembelajaran:`,
        { label: 'Tanggal', value: tanggal },
        { label: 'Sesi / Kegiatan', value: sesi },
        { label: 'Status Kehadiran', value: statusText }
    ];

    if (keterangan && keterangan.trim() !== '') {
        dataList.push({ label: 'Catatan', value: keterangan });
    }

    return createMessage({
        intro: `LAPORAN KETIDAKHADIRAN SANTRI`,
        data: dataList,
        closing: "Terima kasih atas perhatiannya. Jazakumullah Khairan"
    });
}

export default {
    formatPhoneNumber,
    sendWhatsApp,
    createMessage,
    templateTagihanSantri,
    templateKonfirmasiPembayaran,
    sendWhatsAppViaFonnte,
    templateAbsensiWali
}
