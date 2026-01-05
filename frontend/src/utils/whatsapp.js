/**
 * WhatsApp Utility Functions
 * Untuk mengirim notifikasi via WhatsApp
 */

/**
 * Format nomor telepon ke format internasional Indonesia
 * @param {string} phone - Nomor telepon
 * @returns {string} - Nomor dalam format 62xxx
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return ''

    // Hapus semua karakter non-digit
    let cleaned = phone.replace(/\D/g, '')

    // Jika dimulai dengan 0, ganti dengan 62
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1)
    }

    // Jika tidak dimulai dengan 62, tambahkan
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned
    }

    return cleaned
}

/**
 * Buka WhatsApp dengan pesan terformat
 * @param {string} phone - Nomor telepon tujuan
 * @param {string} message - Pesan yang akan dikirim
 */
export const sendWhatsApp = (phone, message) => {
    const formattedPhone = formatPhoneNumber(phone)
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    window.open(url, '_blank')
}

/**
 * Template pesan tagihan santri
 * @param {object} data - Data tagihan
 * @returns {string} - Pesan terformat
 */
export const templateTagihanSantri = (data) => {
    const { namaSantri, kategori, jumlah, jatuhTempo, formattedJatuhTempo, namaPesantren = 'PTQA Batuan' } = data

    return `Assalamu'alaikum Wr. Wb.

*PEMBERITAHUAN TAGIHAN*
${namaPesantren}

Kepada Yth. Wali Santri
*${namaSantri}*

Dengan hormat, kami informasikan tagihan sebagai berikut:

📋 *Kategori:* ${kategori}
💰 *Jumlah:* Rp ${Number(jumlah).toLocaleString('id-ID')}
📅 *Jatuh Tempo:* ${formattedJatuhTempo || new Date(jatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

Mohon untuk melakukan pembayaran sebelum jatuh tempo.

Terima kasih atas perhatian dan kerjasamanya.

Wassalamu'alaikum Wr. Wb.
_${namaPesantren}_`
}

/**
 * Template pesan konfirmasi pembayaran
 * @param {object} data - Data pembayaran
 * @returns {string} - Pesan terformat
 */
export const templateKonfirmasiPembayaran = (data) => {
    const { namaSantri, kategori, jumlah, tanggal, formattedTanggal, metode, namaPesantren = 'PTQA Batuan' } = data

    return `Assalamu'alaikum Wr. Wb.

*KONFIRMASI PEMBAYARAN*
${namaPesantren}

Kepada Yth. Wali Santri
*${namaSantri}*

Alhamdulillah, pembayaran santri telah kami terima:

📋 *Kategori:* ${kategori}
💰 *Jumlah:* Rp ${Number(jumlah).toLocaleString('id-ID')}
📅 *Tanggal:* ${formattedTanggal || new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
💳 *Metode:* ${metode}

✅ *Status: LUNAS*

Terima kasih atas kepercayaannya.

Wassalamu'alaikum Wr. Wb.
_${namaPesantren}_`
}

/**
 * Template pesan pengingat tagihan
 * @param {object} data - Data tagihan
 * @returns {string} - Pesan terformat
 */
export const templatePengingatTagihan = (data) => {
    const { namaSantri, kategori, jumlah, jatuhTempo, formattedJatuhTempo, sisaHari, namaPesantren = 'PTQA Batuan' } = data

    return `Assalamu'alaikum Wr. Wb.

*⏰ PENGINGAT TAGIHAN*
${namaPesantren}

Kepada Yth. Wali Santri
*${namaSantri}*

Kami mengingatkan bahwa tagihan berikut akan segera jatuh tempo:

📋 *Kategori:* ${kategori}
💰 *Jumlah:* Rp ${Number(jumlah).toLocaleString('id-ID')}
📅 *Jatuh Tempo:* ${formattedJatuhTempo || new Date(jatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
⏳ *Sisa Waktu:* ${sisaHari} hari lagi

Mohon segera melakukan pembayaran untuk menghindari keterlambatan.

Terima kasih.

Wassalamu'alaikum Wr. Wb.
_${namaPesantren}_`
}

export default {
    formatPhoneNumber,
    sendWhatsApp,
    templateTagihanSantri,
    templateKonfirmasiPembayaran,
    templatePengingatTagihan
}
