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
const generative_ai_1 = require("@google/generative-ai");
let AiService = AiService_1 = class AiService {
    constructor() {
        this.logger = new common_1.Logger(AiService_1.name);
        this.conversationMemory = {};
        this.genAI = null;
        this.geminiModel = null;
        const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyADWtSmMkfPKwcEnkUMEB0iNEPRbNcpCV4';
        if (geminiKey) {
            try {
                this.genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
                this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                this.logger.log('AiService initialized: Gemini 1.5 Flash mode AKTIF.');
            }
            catch (e) {
                this.logger.warn('Gemini init gagal, fallback ke Local NLP:', e);
                this.genAI = null;
            }
        }
        else {
            this.logger.warn('GEMINI_API_KEY tidak ditemukan. Menggunakan Local NLP sebagai fallback.');
        }
    }
    getContext(sender) {
        if (!this.conversationMemory[sender]) {
            this.conversationMemory[sender] = {
                lastIntent: 'chitchat',
                lastSantriName: '',
                history: [],
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
    addToHistory(sender, role, text) {
        const ctx = this.getContext(sender);
        ctx.history.push({ role, parts: text });
        if (ctx.history.length > 20) {
            ctx.history = ctx.history.slice(-20);
        }
    }
    async parseIntentWithGemini(userPrompt, sender) {
        const ctx = this.getContext(sender);
        const systemPrompt = `Kamu adalah parser intent untuk sistem informasi pondok pesantren SI-TAQUA.
Tugasmu: Analisis pesan pengguna dan keluarkan JSON dengan format:
{
  "intent": "<intent_name>",
  "parameters": {
    "santri_name": "<nama santri jika ada>",
    "nominal": <angka jika ada>,
    "kategori": "<kategori jika ada>",
    "juz": <nomor juz jika ada>,
    "surah": "<nama surah jika ada>",
    "ayat_awal": <ayat awal jika ada>,
    "ayat_akhir": <ayat akhir jika ada>,
    "status": "<status jika ada>",
    "keterangan": "<keterangan jika ada>",
    "isi_catatan": "<isi catatan jika ada>",
    "mapel": "<mata pelajaran jika ada>",
    "nilai": <angka nilai jika ada>
  }
}

Daftar intent yang valid:
- chitchat: percakapan umum, salam, terima kasih
- check_pembayaran: cek status tagihan/SPP santri
- tambah_pembayaran: input/catat pembayaran SPP santri
- get_hafalan: cek progress hafalan santri
- tambah_hafalan: input setoran hafalan santri
- get_tidak_setor_today: siapa yang belum setor hafalan hari ini
- get_top_10_hafalan: santri dengan hafalan terbanyak/tertinggi
- get_nilai: cek nilai akademis santri
- tambah_nilai: input nilai santri
- get_presence_today: rekap absensi/kehadiran hari ini
- tambah_absensi: input absensi santri
- get_santri_most_izin: santri yang paling sering izin
- get_perkembangan_summary: ringkasan perkembangan santri
- get_tunggakan_terbesar: santri dengan tunggakan terbesar
- get_pemasukan_bulan: total pemasukan bulan ini
- get_pemasukan_perbandingan: bandingkan pemasukan bulan ini vs lalu
- get_guru_belum_absen: guru yang belum absen hari ini
- get_jumlah_santri_aktif: jumlah total santri aktif
- tambah_pelanggaran: input pelanggaran santri
- tambah_prestasi: input prestasi/pujian santri
- tambah_catatan_guru: input catatan pembinaan santri
- konfirmasi_ya: konfirmasi "ya/ok/oke/sip/benar"
- konfirmasi_tidak: konfirmasi "tidak/batal/cancel"

Konteks sebelumnya: Nama santri terakhir = "${ctx.lastSantriName || 'belum ada'}", Intent terakhir = "${ctx.lastIntent}".

PENTING: 
- Jika pesan adalah konfirmasi ya/setuju (ya, ok, oke, sip, lanjut, benar, betul, yoi, heeh, yes) → intent: "konfirmasi_ya"
- Jika pesan adalah penolakan (tidak, batal, cancel, ga, gak, ndak, no) → intent: "konfirmasi_tidak"
- Jika ada referensi "dia" / "santri itu" / "hafalannya" / "nilainya" dan ada nama terakhir, gunakan nama terakhir.
- Output HANYA JSON, tanpa penjelasan tambahan.`;
        const response = await this.geminiModel.generateContent([
            { text: systemPrompt },
            { text: `Pesan: "${userPrompt}"` }
        ]);
        const raw = response.response.text().trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('No JSON in Gemini response');
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.parameters) {
            Object.keys(parsed.parameters).forEach(k => {
                if (parsed.parameters[k] === null || parsed.parameters[k] === undefined || parsed.parameters[k] === '') {
                    delete parsed.parameters[k];
                }
            });
        }
        return parsed;
    }
    parseIntentLocal(userPrompt, sender) {
        const text = userPrompt.toLowerCase().trim();
        const context = this.getContext(sender);
        const result = {
            intent: 'chitchat',
            parameters: {},
        };
        if (/^(ya|benar|betul|ok|oke|yes|sip|lanjut|laksanakan|yoi|heeh|setuju|iya)$/i.test(text)) {
            result.intent = 'konfirmasi_ya';
            return result;
        }
        if (/^(tidak|bukan|salah|batal|jangan|no|cancel|ga|gak|ndak|nggak|enggak)$/i.test(text)) {
            result.intent = 'konfirmasi_tidak';
            return result;
        }
        let santriName = '';
        const nameMatchWithKeyword = userPrompt.match(/(?:santri|nama|untuk|milik|atas\s+nama|spp|perkembangan|jadwal|hafalan|nilai|absen|tagihan)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)*)/i);
        if (nameMatchWithKeyword && nameMatchWithKeyword[1]) {
            santriName = nameMatchWithKeyword[1]
                .split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
        }
        if (!santriName) {
            const nameAfterVerb = userPrompt.match(/(?:cek|lihat|tampilkan|info|data|rekap)\s+(?:hafalan|nilai|tagihan|pembayaran|absen|spp|perkembangan)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)*)/i);
            if (nameAfterVerb && nameAfterVerb[1]) {
                santriName = nameAfterVerb[1]
                    .split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ');
            }
        }
        if (!santriName && (text.includes('dia') || text.includes('kalau') || text.includes('gimana') ||
            text.includes('bagaimana') || text.includes('nominalnya') || text.includes('hafalannya') ||
            text.includes('nilainya') || text.includes('tagihannya') || text.includes('absennya'))) {
            santriName = context.lastSantriName;
        }
        if (santriName) {
            result.parameters.santri_name = santriName;
        }
        const nominalMatch = text.replace(/[\s\.]/g, '').match(/(?:rp|nominal|bayar|sebesar|sejumlah)?(\d{4,9})/);
        if (nominalMatch) {
            result.parameters.nominal = parseInt(nominalMatch[1], 10);
        }
        const juzMatch = text.match(/(?:juz|juz ke[-\s]?)(\d+)/);
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
        const nilaiMatch = text.match(/(?:nilai|skor|angka)\s*(?:nya|:)?\s*(\d{1,3}(?:[.,]\d+)?)/);
        if (nilaiMatch) {
            result.parameters.nilai = parseFloat(nilaiMatch[1].replace(',', '.'));
        }
        const keywords = {
            pembayaran: ['bayar', 'lunas', 'pembayaran', 'spp', 'tagihan', 'tunggakan'],
            hafalan: ['hafalan', 'setor', 'surah', 'juz', 'muroja', 'muraja'],
            nilai: ['nilai', 'rapor', 'ulangan', 'ujian', 'uts', 'uas', 'tugas', 'pelajaran', 'akademis', 'akademik'],
            absensi: ['hadir', 'kehadiran', 'presensi', 'absen', 'izin', 'sakit', 'alfa', 'alpha'],
            keuangan: ['pemasukan', 'kas', 'keuangan', 'pendapatan'],
        };
        if (keywords.pembayaran.some(k => text.includes(k))) {
            if (result.parameters.nominal && santriName && (text.includes('input') || text.includes('tambah') || text.includes('bayar') || text.includes('catat'))) {
                result.intent = 'tambah_pembayaran';
            }
            else if (text.includes('tunggakan terbesar') || text.includes('paling banyak tunggakan') || text.includes('tunggakan terbanyak') || text.includes('terbesar')) {
                result.intent = 'get_tunggakan_terbesar';
            }
            else {
                result.intent = 'check_pembayaran';
            }
        }
        else if (keywords.hafalan.some(k => text.includes(k))) {
            if ((text.includes('setor') || text.includes('input') || text.includes('tambah') || text.includes('catat')) && result.parameters.surah && result.parameters.juz) {
                result.intent = 'tambah_hafalan';
            }
            else if (text.includes('belum setor') || text.includes('tidak setor') || text.includes('belum hafalan')) {
                result.intent = 'get_tidak_setor_today';
            }
            else if (text.includes('tertinggi') || text.includes('terbanyak') || text.includes('top') || text.includes('terbaik')) {
                result.intent = 'get_top_10_hafalan';
            }
            else {
                result.intent = 'get_hafalan';
            }
        }
        else if (keywords.nilai.some(k => text.includes(k))) {
            if (text.includes('input') || text.includes('tambah') || text.includes('simpan') || text.includes('catat')) {
                result.intent = 'tambah_nilai';
            }
            else {
                result.intent = 'get_nilai';
            }
        }
        else if (keywords.keuangan.some(k => text.includes(k))) {
            if (text.includes('bulan lalu') || text.includes('banding') || text.includes('dibanding') || text.includes('perbandingan')) {
                result.intent = 'get_pemasukan_perbandingan';
            }
            else {
                result.intent = 'get_pemasukan_bulan';
            }
        }
        else if (keywords.absensi.some(k => text.includes(k))) {
            if (text.includes('aktif') && (text.includes('jumlah') || text.includes('berapa'))) {
                result.intent = 'get_jumlah_santri_aktif';
            }
            else if (text.includes('paling banyak izin') || text.includes('banyak izin') || text.includes('sering izin')) {
                result.intent = 'get_santri_most_izin';
            }
            else if (text.includes('guru belum') || text.includes('guru yang belum') || text.includes('ustadz belum')) {
                result.intent = 'get_guru_belum_absen';
            }
            else if (text.includes('input') || text.includes('tambah') || text.includes('catat')) {
                result.intent = 'tambah_absensi';
            }
            else {
                result.intent = 'get_presence_today';
            }
        }
        else if (text.includes('ringkas') || text.includes('perkembangan') || text.includes('summary') || text.includes('rekap santri')) {
            result.intent = 'get_perkembangan_summary';
        }
        else if (text.includes('pelanggaran') || text.includes('melanggar') || text.includes('hukuman')) {
            result.intent = 'tambah_pelanggaran';
        }
        else if (text.includes('prestasi') || text.includes('juara') || text.includes('pujian')) {
            result.intent = 'tambah_prestasi';
        }
        else if (text.includes('catatan guru') || text.includes('catatan pembinaan') || text.includes('catatan musyrif')) {
            result.intent = 'tambah_catatan_guru';
        }
        else if (text.includes('jumlah santri') || (text.includes('berapa') && text.includes('santri'))) {
            result.intent = 'get_jumlah_santri_aktif';
        }
        else if (text.includes('jumlah guru') || (text.includes('berapa') && text.includes('guru'))) {
            result.intent = 'get_guru_belum_absen';
        }
        this.setContext(sender, result.intent, santriName);
        return result;
    }
    async parseIntent(userPrompt, sender) {
        this.addToHistory(sender, 'user', userPrompt);
        if (this.geminiModel) {
            try {
                const result = await this.parseIntentWithGemini(userPrompt, sender);
                const santriName = result.parameters?.santri_name || '';
                this.setContext(sender, result.intent, santriName);
                this.logger.log(`[Gemini] Intent: ${result.intent}, Santri: ${santriName}`);
                return result;
            }
            catch (e) {
                this.logger.warn(`[Gemini] Gagal parse intent, fallback ke local NLP: ${e.message}`);
            }
        }
        const result = this.parseIntentLocal(userPrompt, sender);
        this.logger.log(`[Local NLP] Intent: ${result.intent}, Params: ${JSON.stringify(result.parameters)}`);
        return result;
    }
    async generateResponseWithGemini(userPrompt, intent, dbResult, sender) {
        const ctx = this.getContext(sender);
        const santriName = ctx.lastSantriName || '';
        let dataContext = '';
        if (dbResult && !dbResult.error) {
            dataContext = `\nData dari database:\n${JSON.stringify(dbResult, null, 2)}`;
        }
        else if (dbResult?.error) {
            dataContext = `\nError dari database: ${dbResult.error}`;
        }
        const systemPrompt = `Kamu adalah Asisten AI SI-TAQUA, asisten cerdas untuk sistem informasi pondok pesantren "PTQ Al-Usymuni Batuan".
Kamu membantu ustadz, admin, dan wali santri mendapatkan informasi akurat dari sistem.

Karakter kamu:
- Ramah, sopan, Islami (gunakan salam, lafadz Arab sesekali)
- Informatif dan akurat berdasarkan data yang diberikan
- Gunakan emoji yang sesuai untuk mempercantik pesan
- Format WhatsApp: gunakan *bold* untuk penegasan, bukan markdown lain
- Bahasa Indonesia yang baik dan mudah dipahami
- Jika data kosong, sampaikan dengan sopan dan tawarkan bantuan lain

Intent yang ditangani: ${intent}
Nama santri konteks: ${santriName || 'tidak ada'}
${dataContext}

Riwayat percakapan terakhir:
${ctx.history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Bot'}: ${h.parts}`).join('\n')}

Pesan user: "${userPrompt}"

Buat respons yang:
1. Sesuai dengan data yang ada
2. Format WhatsApp friendly (bukan HTML/markdown, gunakan *bold* dan _italic_)
3. Singkat tapi lengkap (maksimal 500 kata)
4. Jika data error, sampaikan dengan sopan
5. Akhiri dengan tawaran bantuan jika sesuai`;
        const response = await this.geminiModel.generateContent(systemPrompt);
        return response.response.text().trim();
    }
    generateResponseLocal(userPrompt, intent, dbResult, sender) {
        const context = this.getContext(sender);
        const santriName = context.lastSantriName || 'nanda';
        const greetings = [
            "Assalamu'alaikum Wr. Wb. 😊",
            'Halo, salam sejahtera Ayah/Bunda. 🌟',
            'Nggih Ayah/Bunda, siap membantu. 🤲',
        ];
        const getGreeting = () => greetings[Math.floor(Math.random() * greetings.length)];
        const closings = [
            '\n\nSemoga nanda selalu istiqomah dalam menuntut ilmu. Amin. 🤲',
            '\n\nAda lagi yang bisa saya bantu?',
            '\n\nDemikian informasinya nggih, Ayah/Bunda. Jazakumullah khairan.',
        ];
        const getClosing = () => closings[Math.floor(Math.random() * closings.length)];
        if (dbResult && dbResult.error) {
            return `⚠️ *Afwan Ayah/Bunda,* terjadi kendala: ${dbResult.error}`;
        }
        switch (intent) {
            case 'check_pembayaran':
                if (!dbResult || dbResult.length === 0) {
                    return `${getGreeting()}\n\nUntuk data tagihan nanda *${santriName}*, belum ada tagihan aktif yang terdata nggih.${getClosing()}`;
                }
                let payText = `${getGreeting()}\n\nBerikut laporan status pembayaran nanda *${santriName}*:\n\n`;
                dbResult.forEach((t) => {
                    const kategori = t.kategori_pembayaran?.nama || 'Tagihan';
                    const nominal = Number(t.jumlah).toLocaleString('id-ID');
                    const status = t.status === 'Lunas' ? '✅ *Lunas*' : '❌ *Belum Lunas*';
                    payText += `- *${kategori}*: Rp${nominal} → ${status}\n`;
                });
                payText += getClosing();
                return payText;
            case 'get_hafalan':
                if (!dbResult || dbResult.length === 0) {
                    return `${getGreeting()}\n\nBelum ada catatan setoran hafalan nanda *${santriName}* yang terdata nggih.${getClosing()}`;
                }
                let hafText = `📖 *Catatan Hafalan Terbaru*\nNanda *${santriName}*:\n\n`;
                dbResult.slice(0, 5).forEach((h) => {
                    const tanggal = new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    hafText += `📅 ${tanggal}\n  Juz *${h.juz}* | Surah *${h.surah}* (Ayat ${h.ayat_mulai}-${h.ayat_selesai})\n  Status: *${h.status}*\n\n`;
                });
                hafText += `Masya Allah, semoga hafalannya berkah dan lancar. 🌙`;
                return hafText;
            case 'get_nilai':
                if (!dbResult || dbResult.length === 0) {
                    return `${getGreeting()}\n\nNilai akademis nanda *${santriName}* belum terinput ke sistem.${getClosing()}`;
                }
                let nilText = `📊 *Nilai Akademis*\nNanda *${santriName}*:\n\n`;
                dbResult.forEach((n) => {
                    const mapel = n.mapel?.nama || 'Mata Pelajaran';
                    nilText += `📚 *${mapel}* (Sem. ${n.semester})\n  Tugas: ${n.nilai_tugas ?? '-'} | UTS: ${n.nilai_uts ?? '-'} | UAS: ${n.nilai_uas ?? '-'}\n  *Nilai Akhir: ${n.nilai_akhir ?? '-'}*\n\n`;
                });
                nilText += `Semoga nilai ini menjadi motivasi nanda untuk terus berprestasi. 🌟`;
                return nilText;
            case 'get_tidak_setor_today':
                if (!dbResult || dbResult.length === 0) {
                    return `Alhamdulillah! 🌟 Hari ini *seluruh santri aktif* sudah menyelesaikan setoran hafalannya. Luar biasa!`;
                }
                let noSetorText = `📋 *Santri Belum Setor Hafalan Hari Ini*\nTotal: *${dbResult.length} santri*\n\n`;
                dbResult.forEach((s, idx) => {
                    noSetorText += `${idx + 1}. *${s.nama}*\n`;
                });
                noSetorText += `\nMohon dipantau dan dimotivasi nggih. Jazakumullah khairan. 🙏`;
                return noSetorText;
            case 'get_top_10_hafalan':
                if (!dbResult || dbResult.length === 0) {
                    return `Belum ada data hafalan yang cukup untuk menampilkan ranking.`;
                }
                let topText = `🏆 *Top Santri Hafalan Terbanyak*\nPTQ Al-Usymuni Batuan:\n\n`;
                dbResult.slice(0, 10).forEach((item, idx) => {
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                    topText += `${medal} *${item.nama}* — Juz *${item.maxJuz}*\n`;
                });
                topText += `\nMasya Allah, semoga terus istiqomah dan berkah hafalannya. 🌙`;
                return topText;
            case 'get_pemasukan_bulan':
                if (!dbResult)
                    return `Data keuangan tidak tersedia saat ini.`;
                return `💰 *Laporan Pemasukan Bulan Ini*\nPTQ Al-Usymuni Batuan:\n\n` +
                    `- Pembayaran Santri: *Rp${Number(dbResult.pembayaran_santri).toLocaleString('id-ID')}*\n` +
                    `- Kas Masuk Lain: *Rp${Number(dbResult.kas_pemasukan).toLocaleString('id-ID')}*\n\n` +
                    `*Total: Rp${Number(dbResult.total).toLocaleString('id-ID')}*\n\n` +
                    `Alhamdulillah, semoga berkah dan cukup untuk operasional pondok. 🤲`;
            case 'get_presence_today':
                if (!dbResult)
                    return `Data absensi tidak tersedia.`;
                return `📊 *Rekap Kehadiran Hari Ini*\n\n` +
                    `✅ Hadir: *${dbResult.hadir}* santri\n` +
                    `🏥 Sakit: *${dbResult.sakit}* santri\n` +
                    `🏠 Izin: *${dbResult.izin}* santri\n` +
                    `❌ Alfa: *${dbResult.alpha}* santri\n\n` +
                    `*Total terdata: ${dbResult.total} santri*`;
            case 'get_santri_most_izin':
                if (!dbResult || dbResult.length === 0) {
                    return `Belum ada santri yang tercatat sering izin belakangan ini.`;
                }
                let izinText = `📋 *Santri Paling Sering Izin*\n\n`;
                dbResult.slice(0, 5).forEach((item, idx) => {
                    izinText += `${idx + 1}. *${item.nama}* — *${item.count}* kali izin\n`;
                });
                return izinText;
            case 'get_perkembangan_summary':
                let sumText = `${getGreeting()}\n\nBerikut ringkasan perkembangan nanda *${santriName}* sebulan terakhir:\n\n`;
                if (dbResult.hafalan && dbResult.hafalan.length > 0) {
                    sumText += `📖 *Hafalan*: Setoran terbaru Juz ${dbResult.hafalan[0].juz} Surah ${dbResult.hafalan[0].surah} (${dbResult.hafalan[0].status})\n\n`;
                }
                else {
                    sumText += `📖 *Hafalan*: Belum ada setoran terbaru bulan ini\n\n`;
                }
                if (dbResult.nilai && dbResult.nilai.length > 0) {
                    const avg = dbResult.nilai.reduce((acc, cur) => acc + Number(cur.nilai_akhir || 0), 0) / dbResult.nilai.length;
                    sumText += `📊 *Akademis*: Rata-rata nilai *${avg.toFixed(1)}* dari ${dbResult.nilai.length} mapel\n\n`;
                }
                else {
                    sumText += `📊 *Akademis*: Belum ada laporan nilai\n\n`;
                }
                if (dbResult.presensi && dbResult.presensi.length > 0) {
                    const totalDays = dbResult.presensi.length;
                    const hadirDays = dbResult.presensi.filter((p) => p.status?.toLowerCase() === 'hadir').length;
                    sumText += `✅ *Kehadiran*: ${hadirDays} dari ${totalDays} hari (${((hadirDays / totalDays) * 100).toFixed(0)}%)`;
                }
                else {
                    sumText += `✅ *Kehadiran*: Belum ada data absensi bulan ini`;
                }
                sumText += getClosing();
                return sumText;
            case 'get_tunggakan_terbesar':
                if (!dbResult || dbResult.length === 0) {
                    return `Alhamdulillah! Tidak ada santri yang memiliki tunggakan pembayaran. 🎉`;
                }
                let tunggakanText = `💳 *Santri dengan Tunggakan Terbesar*\n\n`;
                dbResult.slice(0, 10).forEach((item, idx) => {
                    tunggakanText += `${idx + 1}. *${item.nama}*: Rp${Number(item.total).toLocaleString('id-ID')}\n`;
                });
                return tunggakanText;
            case 'get_pemasukan_perbandingan':
                if (!dbResult)
                    return `Data perbandingan tidak tersedia.`;
                const trendIcon = dbResult.selisih >= 0 ? '📈 Naik' : '📉 Turun';
                return `📊 *Perbandingan Pemasukan Bulanan*\n\n` +
                    `- Bulan Ini: *Rp${Number(dbResult.bulan_ini).toLocaleString('id-ID')}*\n` +
                    `- Bulan Lalu: *Rp${Number(dbResult.bulan_lalu).toLocaleString('id-ID')}*\n\n` +
                    `*Tren: ${trendIcon}* sebesar Rp${Math.abs(dbResult.selisih).toLocaleString('id-ID')} (${dbResult.persentase.toFixed(1)}%)`;
            case 'get_guru_belum_absen':
                if (!dbResult || dbResult.length === 0) {
                    return `Alhamdulillah! Seluruh ustadz/ustadzah sudah absen hari ini. 🎉`;
                }
                let guruText = `🧑‍🏫 *Ustadz/Ustadzah Belum Absen Hari Ini*\n(Total: *${dbResult.length}* orang)\n\n`;
                dbResult.forEach((g, idx) => {
                    guruText += `${idx + 1}. *${g.nama}*${g.nip ? ` (NIP: ${g.nip})` : ''}\n`;
                });
                return guruText;
            case 'get_jumlah_santri_aktif':
                return `👥 Total santri *Aktif* di PTQ Al-Usymuni Batuan saat ini: *${dbResult.jumlah_santri_aktif}* santri.`;
            default:
                return `Halo, Assalamu'alaikum! 😊 Saya adalah *Asisten AI SI-TAQUA*.\n\nSaya bisa membantu Anda dengan:\n📖 Cek hafalan santri\n💰 Status pembayaran SPP\n📊 Nilai akademis\n✅ Data kehadiran\n💳 Laporan keuangan\n\nSilakan tanyakan kebutuhan Anda!`;
        }
    }
    async generateResponse(userPrompt, intent, dbResult, sender) {
        let reply = '';
        if (this.geminiModel && intent !== 'konfirmasi_ya' && intent !== 'konfirmasi_tidak') {
            try {
                reply = await this.generateResponseWithGemini(userPrompt, intent, dbResult, sender);
            }
            catch (e) {
                this.logger.warn(`[Gemini] Gagal generate response, fallback ke local: ${e.message}`);
                reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender);
            }
        }
        else {
            reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender);
        }
        this.addToHistory(sender, 'model', reply.substring(0, 300));
        return reply;
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map