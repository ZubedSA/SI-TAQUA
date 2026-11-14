/**
 * GLOBAL WHATSAPP FORMATTER STANDARD - SI-TAQUA
 * ==============================================
 * Mengatur format pesan WhatsApp agar konsisten di seluruh aplikasi.
 */

/**
 * Format nomor telepon ke format internasional Indonesia (62xxx) atau kode negara lainnya
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    let cleaned = String(phone).replace(/\D/g, '')
    if (!cleaned) return ''

    // Jika diawali 0, ubah ke 62 (contoh: 0812 -> 62812)
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1)
    }
    // Jika diawali 8 (misal: 812xxxx), tambahkan 62 di depan
    else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned
    }
    // Jika nomor belum memiliki kode negara (tidak diawali 62, 60, 65, dll) dan panjangnya minimal 9 digit
    else if (!cleaned.startsWith('62') && !cleaned.startsWith('60') && !cleaned.startsWith('65') && cleaned.length >= 9) {
        cleaned = '62' + cleaned
    }

    // Nomor telepon valid minimal 9 digit
    if (cleaned.length < 9) return ''
    return cleaned
}

/**
 * Membuka WhatsApp Web / App dengan pesan yang sudah diformat
 * @param {string} phone - Nomor tujuan
 * @param {string} message - Pesan
 */
export const sendWhatsApp = (phone, message) => {
    const formattedPhone = formatPhoneNumber(phone)
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    window.open(url, '_blank')
}

/**
 * BUILDER PESAN STANDAR
 */
export const createMessage = ({
    greeting = "Assalamu'alaikum Wr. Wb.",
    intro = "",
    data = [],
    closing = "Terima kasih, Jazakumullah Khairan.",
    signature = "PTQA BATUAN"
}) => {
    const sections = []

    // A. Salam Pembuka
    if (greeting) sections.push(greeting)

    // B. Intro / Context
    if (intro) sections.push(intro)

    // C. Data List
    if (data && data.length > 0) {
        const dataRows = data.map(item => {
            if (!item) return null
            if (typeof item === 'string') {
                return item.startsWith('•') || item.startsWith('-') || item.startsWith('*') ? item : `• ${item}`
            }
            if (item.label && item.value) {
                return `*${item.label}:* ${item.value}`
            }
            return ''
        }).filter(Boolean)

        if (dataRows.length > 0) {
            sections.push(dataRows.join('\n'))
        }
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

    return sections.join('\n\n')
}

export const templateTagihanSantri = (data) => {
    return createMessage({
        intro: `*PEMBERITAHUAN TAGIHAN*\nKepada Yth. Wali Santri *${data.namaSantri}*`,
        data: [
            { label: 'Kategori', value: data.kategori },
            { label: 'Jumlah', value: `Rp ${Number(data.jumlah).toLocaleString('id-ID')}` },
            { label: 'Jatuh Tempo', value: data.formattedJatuhTempo || data.jatuhTempo }
        ],
        closing: "Mohon untuk melakukan pembayaran sebelum jatuh tempo.",
        signature: "PTQA BATUAN"
    })
}

export const templateKonfirmasiPembayaran = (data) => {
    return createMessage({
        intro: `*KONFIRMASI PEMBAYARAN*\nKepada Yth. Wali Santri *${data.namaSantri}*\n\nAlhamdulillah, pembayaran telah kami terima:`,
        data: [
            { label: 'Kategori', value: data.kategori },
            { label: 'Jumlah', value: `Rp ${Number(data.jumlah).toLocaleString('id-ID')}` },
            { label: 'Tanggal', value: data.formattedTanggal || data.tanggal },
            { label: 'Metode', value: data.metode },
            { label: 'Status', value: 'LUNAS ✅' }
        ],
        closing: "Terima kasih atas kepercayaannya.",
        signature: "PTQA BATUAN"
    })
}

/**
 * Mengirim pesan WhatsApp secara otomatis di background menggunakan API Fonnte
 * @param {string} phone - Nomor telepon tujuan
 * @param {string} message - Pesan yang akan dikirim
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const sendWhatsAppViaFonnte = async (phone, message) => {
    try {
        const token = import.meta.env.VITE_FONNTE_TOKEN || '9TKo4vZBPyQ1bjwSniV8';
        if (!token) {
            console.warn('[Fonnte] Token tidak ditemukan di env (VITE_FONNTE_TOKEN)');
            return { success: false, error: 'Token Fonnte tidak terkonfigurasi' };
        }

        const formattedPhone = formatPhoneNumber(phone);
        if (!formattedPhone) {
            return { success: false, error: 'Nomor telepon tidak valid' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s safety timeout

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target: formattedPhone,
                message: message
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const resData = await response.json();
        if (response.ok && (resData.status === true || resData.status === 'true')) {
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
 * Mengirim notifikasi WhatsApp laporan ketidakhadiran santri secara sequential
 * dengan jeda aman anti-rate-limit (800ms) agar SELURUH pesan terkirim lengkap tanpa ada yang drop.
 * @param {Array} absentList - Array santri tidak hadir: [{ id, nama, nama_wali, no_telp_wali, status, keterangan }]
 * @param {Object} options - { sesi: string, tanggal: string, onProgress?: Function }
 * @returns {Promise<{ total: number, sent: number, failed: number, skipped: number, errors: Array }>}
 */
export const sendBulkAbsensiWhatsApp = async (absentList = [], options = {}) => {
    const { sesi = 'Madrosah', tanggal = '', onProgress } = options;
    const results = {
        total: absentList.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };

    if (!absentList || absentList.length === 0) {
        return results;
    }

    console.log(`[WA Bulk Absensi] Memulai pengiriman laporan untuk ${absentList.length} santri tidak hadir...`);

    for (let i = 0; i < absentList.length; i++) {
        const item = absentList[i];
        if (onProgress) {
            onProgress({ current: i + 1, total: absentList.length, nama: item.nama });
        }

        const phone = formatPhoneNumber(item.no_telp_wali);
        if (!phone) {
            console.warn(`[WA Bulk Absensi] Santri "${item.nama}" dilewati: Nomor telepon wali kosong / tidak valid.`);
            results.skipped++;
            results.errors.push({ nama: item.nama, reason: 'Nomor WhatsApp wali tidak tersedia / tidak valid' });
            continue;
        }

        const msg = templateAbsensiWali({
            namaSantri: item.nama,
            namaWali: item.nama_wali,
            status: item.status,
            tanggal: tanggal,
            sesi: sesi,
            keterangan: item.keterangan || ''
        });

        let sendRes = await sendWhatsAppViaFonnte(phone, msg);

        // Jika gateway Fonnte melaporkan busy atau rate-limit, tunggu 1.5 detik lalu coba sekali lagi
        if (!sendRes.success && (
            sendRes.error?.toLowerCase().includes('busy') ||
            sendRes.error?.toLowerCase().includes('rate') ||
            sendRes.error?.toLowerCase().includes('wait')
        )) {
            console.warn(`[WA Bulk Absensi] Gateway sibuk untuk "${item.nama}". Mencoba ulang dalam 1.5 detik...`);
            await new Promise(r => setTimeout(r, 1500));
            sendRes = await sendWhatsAppViaFonnte(phone, msg);
        }

        if (sendRes.success) {
            results.sent++;
            console.log(`[WA Bulk Absensi] (${results.sent}/${absentList.length}) Terkirim ke wali santri "${item.nama}" (${phone})`);
        } else {
            results.failed++;
            results.errors.push({ nama: item.nama, phone: phone, reason: sendRes.error });
            console.error(`[WA Bulk Absensi] Gagal mengirim ke wali santri "${item.nama}" (${phone}): ${sendRes.error}`);
        }

        // Jeda aman anti-rate-limit 800ms antar pengiriman nomor berikutnya
        if (i < absentList.length - 1) {
            await new Promise(r => setTimeout(r, 800));
        }
    }

    console.log(`[WA Bulk Absensi] Selesai: ${results.sent} terkirim, ${results.failed} gagal, ${results.skipped} dilewati (tanpa no HP).`);
    return results;
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

    const rincian = [
        `*Tanggal:* ${tanggal}`,
        `*Sesi / Kegiatan:* ${sesi}`,
        `*Status Kehadiran:* ${statusText}`
    ];

    if (keterangan && keterangan.trim() !== '') {
        rincian.push(`*Catatan:* ${keterangan.trim()}`);
    }

    const sections = [
        "Assalamu'alaikum Wr. Wb.",
        `Kepada Yth. Wali Santri *${namaWali || 'Bapak/Ibu'}*`,
        `*LAPORAN KETIDAKHADIRAN SANTRI*\nKami ingin menginformasikan bahwa ananda *${namaSantri}* tercatat tidak hadir pada kegiatan pembelajaran:`,
        rincian.join('\n'),
        "Terima kasih atas perhatiannya. Jazakumullah Khairan.\nWassalamu'alaikum Wr. Wb.",
        `_PTQA BATUAN_`
    ];

    return sections.join('\n\n');
}

/**
 * Membuat template pesan WhatsApp pengingat jadwal mengajar untuk guru (Madrasah & Halaqoh)
 */
export const templatePengingatJadwalGuru = ({ namaGuru, hari, tanggal, jadwalList = [] }) => {
    let jadwalText = '';
    if (jadwalList.length === 0) {
        jadwalText = '_Tidak ada jadwal mengajar terdaftar hari ini._';
    } else {
        jadwalText = jadwalList.map((j, idx) => {
            const num = idx + 1;
            const jamMulai = j.jam_mulai ? String(j.jam_mulai).substring(0, 5) : '';
            const jamSelesai = j.jam_selesai ? String(j.jam_selesai).substring(0, 5) : '';
            const jamStr = jamMulai && jamSelesai ? `${jamMulai} - ${jamSelesai} WIB` : (jamMulai ? `Pukul ${jamMulai} WIB` : '');

            const isHalaqoh = String(j.tipe || '').toUpperCase() === 'HALAQOH' || Boolean(j.halaqoh_id);
            const sesiTitle = isHalaqoh ? "Halaqoh Qur'an" : "Madrasah";
            const sesiNomor = j.jam_ke ? `(Jam Ke-${j.jam_ke})` : '';
            const waktuHeader = jamStr ? `*${jamStr}* ${sesiNomor}`.trim() : `*Jam Ke-${j.jam_ke || num}*`;

            const subItems = [];
            subItems.push(`   • Jenis: *${sesiTitle}*`);
            if (isHalaqoh) {
                subItems.push(`   • Kelompok: ${j.targetNama || j.halaqoh_nama || j.halaqoh?.nama || 'Kelompok Halaqoh'}`);
            } else {
                subItems.push(`   • Kelas: ${j.targetNama || j.kelas_nama || j.kelas?.nama || 'Kelas'}`);
                const mapel = j.mapelNama || j.mapel_nama || j.mapel?.nama;
                if (mapel) subItems.push(`   • Mapel: ${mapel}`);
            }
            return `${num}. ⏰ ${waktuHeader}\n${subItems.join('\n')}`;
        }).join('\n\n');
    }

    const sections = [
        "Assalamu'alaikum Wr. Wb.",
        `Yth. Ustadz *${namaGuru}*`,
        `*PENGINGAT JADWAL MENGAJAR HARI INI*\nHari, Tanggal: *${hari}, ${tanggal}*`,
        `Berikut adalah agenda mengajar Anda hari ini:\n\n${jadwalText}`,
        "Mohon hadir tepat waktu dan melakukan pemindaian (Scan QR) di lokasi untuk validasi presensi & pengisian jurnal santri.",
        "Terima kasih atas dedikasi dan keikhlasannya dalam membimbing para santri.\nJazakumullah Khairan Katsiran.\nWassalamu'alaikum Wr. Wb.",
        `_PTQA BATUAN_`
    ];

    return sections.join('\n\n');
}

export default {
    formatPhoneNumber,
    sendWhatsApp,
    createMessage,
    templateTagihanSantri,
    templateKonfirmasiPembayaran,
    sendWhatsAppViaFonnte,
    sendBulkAbsensiWhatsApp,
    templateAbsensiWali,
    templatePengingatJadwalGuru
}
