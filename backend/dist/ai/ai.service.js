"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
let AiService = AiService_1 = class AiService {
    constructor() {
        this.logger = new common_1.Logger(AiService_1.name);
        this.conversationMemory = {};
        this.logger.log('AiService initialized in HUMAN-LIKE LOCAL NLP mode.');
    }
    getContext(sender) {
        if (!this.conversationMemory[sender]) {
            this.conversationMemory[sender] = {
                lastIntent: 'chitchat',
                lastSantriName: '',
            };
        }
        return this.conversationMemory[sender];
    }
    setContext(sender, intent, santriName) {
        const context = this.getContext(sender);
        if (intent && intent !== 'chitchat') {
            context.lastIntent = intent;
        }
        if (santriName) {
            context.lastSantriName = santriName;
        }
    }
    async parseIntent(userPrompt, sender) {
        const text = userPrompt.toLowerCase().trim();
        const context = this.getContext(sender);
        const result = {
            intent: 'chitchat',
            parameters: {},
        };
        if (/^(ya|benar|betul|ok|oke|yes|sip|lanjut|laksanakan|yoi|heeh)$/i.test(text)) {
            result.intent = 'konfirmasi_ya';
            return result;
        }
        if (/^(tidak|bukan|salah|batal|jangan|no|cancel|ga|gak|ndak)$/i.test(text)) {
            result.intent = 'konfirmasi_tidak';
            return result;
        }
        let santriName = '';
        const nameMatch = userPrompt.match(/(?:santri|nama|untuk|milik|atas\s+nama|spp|perkembangan|jadwal|hafalan)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        const commonNames = ['ahmad', 'ali', 'budi', 'fauzi', 'rizki', 'yusuf', 'hasan', 'husein', 'fatimah', 'aisyah', 'zainab', 'faizan', 'fauzan'];
        for (const name of commonNames) {
            if (text.includes(name)) {
                santriName = name.charAt(0).toUpperCase() + name.slice(1);
                break;
            }
        }
        if (!santriName && (text.includes('dia') || text.includes('kalau') || text.includes('gimana') || text.includes('bagaimana') || text.includes('nominalnya') || text.includes('hafalannya') || text.includes('nilainya'))) {
            santriName = context.lastSantriName;
        }
        if (santriName) {
            result.parameters.santri_name = santriName;
        }
        const nominalMatch = text.replace(/[\s\.]/g, '').match(/(?:rp|nominal|bayar|sebesar)?(\d{5,8})/);
        if (nominalMatch) {
            result.parameters.nominal = parseInt(nominalMatch[1], 10);
        }
        const juzMatch = text.match(/(?:juz)\s*(\d+)/);
        if (juzMatch) {
            result.parameters.juz = parseInt(juzMatch[1], 10);
        }
        const surahMatch = text.match(/(?:surat|surah)\s*([a-zA-Z\-]+)/);
        if (surahMatch) {
            result.parameters.surah = surahMatch[1].charAt(0).toUpperCase() + surahMatch[1].slice(1);
        }
        const ayatMatch = text.match(/(?:ayat)\s*(\d+)(?:\s*(?:sampai|-)\s*(\d+))?/);
        if (ayatMatch) {
            result.parameters.ayat_awal = parseInt(ayatMatch[1], 10);
            if (ayatMatch[2]) {
                result.parameters.ayat_akhir = parseInt(ayatMatch[2], 10);
            }
        }
        if (text.includes('spp') || text.includes('bulanan')) {
            result.parameters.kategori = 'SPP Bulanan';
        }
        else if (text.includes('makan')) {
            result.parameters.kategori = 'Uang Makan';
        }
        else if (text.includes('asrama')) {
            result.parameters.kategori = 'Uang Asrama';
        }
        if (text.includes('bayar') || text.includes('lunas') || text.includes('pembayaran') || text.includes('spp') || text.includes('tagihan') || text.includes('tunggakan')) {
            if (result.parameters.nominal && santriName && (text.includes('input') || text.includes('tambah') || text.includes('bayar'))) {
                result.intent = 'tambah_pembayaran';
            }
            else if (text.includes('tunggakan terbesar') || text.includes('paling banyak tunggakan') || text.includes('tunggakan terbanyak')) {
                result.intent = 'get_tunggakan_terbesar';
            }
            else {
                result.intent = 'check_pembayaran';
            }
        }
        else if (text.includes('hafalan') || text.includes('setor') || text.includes('surah') || text.includes('juz')) {
            if ((text.includes('setor') || text.includes('input') || text.includes('tambah')) && result.parameters.surah && result.parameters.juz) {
                result.intent = 'tambah_hafalan';
            }
            else if (text.includes('belum setor') || text.includes('tidak setor')) {
                result.intent = 'get_tidak_setor_today';
            }
            else if (text.includes('tertinggi') || text.includes('terbanyak') || text.includes('top 10')) {
                result.intent = 'get_top_10_hafalan';
            }
            else {
                result.intent = 'get_hafalan';
            }
        }
        else if (text.includes('nilai') || text.includes('rata-rata') || text.includes('pelajaran')) {
            if (text.includes('input') || text.includes('tambah') || text.includes('simpan')) {
                result.intent = 'tambah_nilai';
            }
            else {
                result.intent = 'get_nilai';
            }
        }
        else if (text.includes('pemasukan')) {
            if (text.includes('bulan lalu') || text.includes('banding') || text.includes('dibanding')) {
                result.intent = 'get_pemasukan_perbandingan';
            }
            else {
                result.intent = 'get_pemasukan_bulan';
            }
        }
        else if (text.includes('hadir') || text.includes('kehadiran') || text.includes('presensi') || text.includes('absen')) {
            if (text.includes('aktif')) {
                result.intent = 'get_jumlah_santri_aktif';
            }
            else if (text.includes('paling banyak izin') || text.includes('banyak izin') || text.includes('sering izin')) {
                result.intent = 'get_santri_most_izin';
            }
            else if (text.includes('guru belum') || text.includes('guru yang belum')) {
                result.intent = 'get_guru_belum_absen';
            }
            else if (text.includes('input') || text.includes('tambah') || text.includes('hadir') || text.includes('izin') || text.includes('sakit') || text.includes('alfa')) {
                result.intent = 'tambah_absensi';
            }
            else {
                result.intent = 'get_presence_today';
            }
        }
        else if (text.includes('ringkas') || text.includes('perkembangan') || text.includes('summary')) {
            result.intent = 'get_perkembangan_summary';
        }
        else if (text.includes('pelanggaran') || text.includes('melanggar')) {
            result.intent = 'tambah_pelanggaran';
        }
        else if (text.includes('prestasi') || text.includes('juara') || text.includes('pujian')) {
            result.intent = 'tambah_prestasi';
        }
        else if (text.includes('catatan guru') || text.includes('catatan pembinaan')) {
            result.intent = 'tambah_catatan_guru';
        }
        this.setContext(sender, result.intent, santriName);
        return result;
    }
    async generateResponse(userPrompt, intent, dbResult, sender) {
        const context = this.getContext(sender);
        const santriName = context.lastSantriName || 'nanda';
        const greetings = [
            'Assalamu\'alaikum Wr. Wb. 😊',
            'Halo, selamat pagi/sore Ayah/Bunda.',
            'Nggih Ayah/Bunda, silakan.',
            'Semoga Ayah/Bunda senantiasa dalam keadaan sehat wal afiat. Amin. 🤲',
        ];
        const getGreeting = () => greetings[Math.floor(Math.random() * greetings.length)];
        const closings = [
            '\n\nSemoga nanda selalu istiqomah dalam menuntut ilmu di PTQ Al-Usymuni. Amin. 🤲',
            '\n\nAda lagi yang bisa saya bantu terkait perkembangan nanda?',
            '\n\nDemikian informasinya nggih, Ayah/Bunda. Terima kasih.',
        ];
        const getClosing = () => closings[Math.floor(Math.random() * closings.length)];
        if (dbResult && dbResult.error) {
            return `⚠️ *Afwan Ayah/Bunda,* sepertinya terjadi sedikit kendala: ${dbResult.error}`;
        }
        switch (intent) {
            case 'check_pembayaran':
                if (!dbResult || dbResult.length === 0) {
                    return `${getGreeting()}\n\nUntuk data pembayaran nanda *${santriName}*, setelah kami cek di sistem, nampaknya belum ada tagihan aktif atau data pembayaran yang terdata nggih.`;
                }
                let payText = `${getGreeting()}\n\nBaik, berikut adalah laporan status administrasi pembayaran nanda *${santriName}* saat ini:\n\n`;
                dbResult.forEach((t) => {
                    const kategori = t.kategori_pembayaran?.nama || 'Tagihan';
                    const nominal = Number(t.jumlah).toLocaleString('id-ID');
                    const status = t.status === 'Lunas' ? '✅ *Lunas*' : '❌ *Belum Lunas*';
                    payText += `- *${kategori}* sebesar *Rp${nominal}* statusnya ${status}\n`;
                });
                payText += getClosing();
                return payText;
            case 'get_hafalan':
                if (!dbResult || dbResult.length === 0) {
                    return `${getGreeting()}\n\nUntuk progress hafalan nanda *${santriName}*, kami belum mendeteksi adanya setoran hafalan terbaru di buku laporan kami nggih.`;
                }
                let hafText = `Masya Allah, tabarakallah! 📖\n\nBerikut adalah catatan setoran hafalan terbaru nanda *${santriName}*:\n\n`;
                dbResult.slice(0, 5).forEach((h) => {
                    const tanggal = new Date(h.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    hafText += `* ${tanggal}\n  - Juz *${h.juz}*, Surah *${h.surah}* (ayat ${h.ayat_mulai} sampai ${h.ayat_selesai})\n  - Predikat kelancaran: *${h.status}*\n\n`;
                });
                hafText += `Mari kita doakan bersama semoga nanda lancar dalam muraja'ah dan hafalannya berkah.`;
                return hafText;
            case 'get_nilai':
                if (!dbResult || dbResult.length === 0) {
                    return `${getGreeting()}\n\nUntuk nilai akademis nanda *${santriName}*, nampaknya para ustadz belum selesai menginput nilainya ke dalam rapor sistem nggih.`;
                }
                let nilText = `${getGreeting()}\n\nBerikut adalah rincian nilai akademis nanda *${santriName}* yang sudah terinput:\n\n`;
                dbResult.forEach((n) => {
                    const mapel = n.mapel?.nama || 'Mata Pelajaran';
                    nilText += `* *${mapel}* (Semester ${n.semester})\n  - Nilai Akhir: *${n.nilai_akhir || '-'}* (Tugas: ${n.nilai_tugas || '-'}, UTS: ${n.nilai_uts || '-'}, UAS: ${n.nilai_uas || '-'}) \n\n`;
                });
                nilText += `Semoga hasil nilai ini bisa memicu semangat belajar nanda agar lebih berprestasi lagi.`;
                return nilText;
            case 'get_tidak_setor_today':
                if (!dbResult || dbResult.length === 0) {
                    return `Alhamdulillah, luar biasa! 🌟\nHari ini seluruh santri aktif sudah menyelesaikan setoran hafalannya ke ustadz pembimbing masing-masing.`;
                }
                let noSetorText = `Ustadz/Ustadzah, berikut adalah daftar nama santri aktif yang tercatat *belum menyetor hafalan* hari ini (Total: ${dbResult.length} santri):\n\n`;
                dbResult.forEach((s, idx) => {
                    noSetorText += `${idx + 1}. *${s.nama}*\n`;
                });
                noSetorText += `\nMohon bantuannya untuk dipantau dan dimotivasi nggih. Terima kasih.`;
                return noSetorText;
            case 'get_pemasukan_bulan':
                return `💰 *Laporan Keuangan Pemasukan Pondok (Bulan Ini)*\n\n` +
                    `Berikut adalah rekapitulasi pemasukan kas pondok yang sudah diverifikasi oleh bendahara:\n` +
                    `- SPP / Pembayaran Santri: *Rp${dbResult.pembayaran_santri.toLocaleString('id-ID')}*\n` +
                    `- Kas Pemasukan Lain-lain: *Rp${dbResult.kas_pemasukan.toLocaleString('id-ID')}*\n\n` +
                    `*Total Pemasukan Keseluruhan:* *Rp${dbResult.total.toLocaleString('id-ID')}*`;
            case 'get_presence_today':
                return `📊 *Rekap Absensi Harian Santri*\n\n` +
                    `Berikut adalah tingkat kehadiran santri di pondok hari ini:\n` +
                    `- Hadir: *${dbResult.hadir}* anak\n` +
                    `- Sakit: *${dbResult.sakit}* anak\n` +
                    `- Izin pulang/keperluan: *${dbResult.izin}* anak\n` +
                    `- Tanpa keterangan (Alpha): *${dbResult.alpha}* anak\n\n` +
                    `Total santri terdata di sistem hari ini: *${dbResult.total}* anak.`;
            case 'get_santri_most_izin':
                if (!dbResult || dbResult.length === 0) {
                    return `Laporan absensi kosong, belum ada santri yang mengajukan izin belakangan ini.`;
                }
                let izinText = `📊 *Laporan Frekuensi Izin Santri Tertinggi*\n\n` +
                    `Berikut adalah daftar santri dengan jumlah perizinan paling sering:\n\n`;
                dbResult.slice(0, 5).forEach((item, idx) => {
                    izinText += `${idx + 1}. *${item.nama}* (Mengajukan izin sebanyak *${item.count}* kali)\n`;
                });
                return izinText;
            case 'get_perkembangan_summary':
                let sumText = `${getGreeting()}\n\nBerikut kami buatkan ringkasan perkembangan nanda *${santriName}* selama sebulan terakhir ya:\n\n`;
                if (dbResult.hafalan && dbResult.hafalan.length > 0) {
                    sumText += `1. *Progress Hafalan*:\n   Nanda telah menyetor hafalan terbaru pada *Juz ${dbResult.hafalan[0].juz} Surah ${dbResult.hafalan[0].surah}* (Status: ${dbResult.hafalan[0].status}).\n\n`;
                }
                else {
                    sumText += `1. *Progress Hafalan*:\n   Belum ada setoran hafalan terbaru yang tercatat bulan ini.\n\n`;
                }
                if (dbResult.nilai && dbResult.nilai.length > 0) {
                    const avg = dbResult.nilai.reduce((acc, cur) => acc + Number(cur.nilai_akhir || 0), 0) / dbResult.nilai.length;
                    sumText += `2. *Nilai Akademis*:\n   Rata-rata pencapaian akademis nanda berada di angka *${avg.toFixed(1)}* dari ${dbResult.nilai.length} mata pelajaran.\n\n`;
                }
                else {
                    sumText += `2. *Nilai Akademis*:\n   Belum ada laporan nilai ustadz yang dirilis ke sistem.\n\n`;
                }
                if (dbResult.presensi && dbResult.presensi.length > 0) {
                    const totalDays = dbResult.presensi.length;
                    const hadirDays = dbResult.presensi.filter((p) => p.status === 'hadir').length;
                    sumText += `3. *Kedisiplinan Kehadiran*:\n   Tingkat kehadiran nanda sangat baik, mencapai *${((hadirDays / totalDays) * 100).toFixed(0)}%* (${hadirDays} hari hadir dari total ${totalDays} hari absensi).`;
                }
                else {
                    sumText += `3. *Kedisiplinan Kehadiran*:\n   Belum ada laporan absensi nanda yang masuk untuk bulan ini.`;
                }
                sumText += getClosing();
                return sumText;
            case 'get_tunggakan_terbesar':
                if (!dbResult || dbResult.length === 0) {
                    return `Alhamdulillah Ustadz/Ustadzah, tidak ada santri yang memiliki tunggakan pembayaran bulan ini.`;
                }
                let tunggakanText = `💳 *Laporan Santri dengan Tunggakan Terbesar*\n\n` +
                    `Berikut adalah daftar santri dengan kewajiban pembayaran yang belum diselesaikan:\n\n`;
                dbResult.slice(0, 10).forEach((item, idx) => {
                    tunggakanText += `${idx + 1}. *${item.nama}*: Rp${item.total.toLocaleString('id-ID')}\n`;
                });
                return tunggakanText;
            case 'get_pemasukan_perbandingan':
                const trendIcon = dbResult.selisih >= 0 ? '📈 Naik' : '📉 Turun';
                return `📊 *Analisis Perbandingan Pemasukan Bulanan*\n\n` +
                    `- Kas Masuk Bulan Ini: *Rp${dbResult.bulan_ini.toLocaleString('id-ID')}*\n` +
                    `- Kas Masuk Bulan Lalu: *Rp${dbResult.bulan_lalu.toLocaleString('id-ID')}*\n\n` +
                    `*Perkembangan:* ${trendIcon} sebesar *Rp${Math.abs(dbResult.selisih).toLocaleString('id-ID')}* (${dbResult.persentase.toFixed(1)}% dibandingkan bulan lalu).`;
            case 'get_guru_belum_absen':
                let guruText = `🧑‍🏫 *Daftar Ustadz/Ustadzah Aktif*\n\n` +
                    `Berikut adalah daftar nama pengajar aktif di PTQ Al-Usymuni:\n\n`;
                dbResult.forEach((g, idx) => {
                    guruText += `${idx + 1}. *${g.nama}* (NIP: ${g.nip})\n`;
                });
                return guruText;
            case 'get_jumlah_santri_aktif':
                return `👥 Saat ini, total santri yang berstatus *Aktif* dan belajar di PTQ Al-Usymuni Batuan adalah sebanyak *${dbResult.jumlah_santri_aktif}* santri.`;
            default:
                return `Halo, selamat datang! 😊 Saya adalah Asisten AI SI-TAQUA. Ada yang bisa saya bantu terkait pengecekan hafalan santri, status pembayaran SPP, nilai rapor, atau absensi? Silakan tanyakan saja ya.`;
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map