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
        this.geminiParserModel = null;
        this.geminiResponseModel = null;
        this.NON_SANTRI_STOPWORDS = new Set([
            'saya', 'kami', 'kita', 'dia', 'mereka', 'anda', 'kamu', 'antum', 'ana', 'ente',
            'mengajar', 'mengajar saya', 'jadwal', 'jadwal saya', 'jadwal mengajar', 'kapan jadwal', 'jadwal pelajaran',
            'anak', 'anak saya', 'anak kami', 'putra', 'putra saya', 'putri', 'putri saya', 'ananda',
            'ustadz', 'ustadzah', 'guru', 'pengajar', 'musyrif', 'musyrifah', 'wali', 'wali santri', 'santri',
            'hari ini', 'besok', 'kemarin', 'lusa', 'nanti', 'sekarang', 'saat ini',
            'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'jum\'at', 'sabtu', 'ahad', 'minggu',
            'libur', 'kapan libur', 'kalender', 'akademik', 'ujian', 'kegiatan', 'agenda',
            'pondok', 'pesantren', 'info', 'informasi', 'rekening', 'alamat', 'lokasi',
            'kunjungan', 'sambangan', 'jenguk', 'besuk', 'paket', 'kiriman', 'admin', 'bantuan', 'menu', 'cs', 'help',
            'jam', 'jam berapa', 'kapan', 'pukul', 'hari', 'tanggal', 'bulan', 'tahun', 'wali santri', 'keluarga',
            'apa', 'siapa', 'dimana', 'bagaimana', 'gimana', 'kenapa', 'mengapa', 'berapa',
            'kelas', 'kelas 1', 'kelas 2', 'kelas 3', 'kelas 4', 'kelas 5', 'kelas 6',
            'kelas 7', 'kelas 8', 'kelas 9', 'kelas 10', 'kelas 11', 'kelas 12',
            'kelas i', 'kelas ii', 'kelas iii', 'kelas iv', 'kelas v', 'kelas vi', 'kelas vii', 'kelas viii', 'kelas ix',
            'halaqoh', 'kelompok', 'kamar', 'asrama', 'angkatan', 'tingkat',
            'semua', 'total', 'jumlah', 'banyak', 'banyaknya', 'seluruh', 'daftar'
        ]);
        const geminiKey = process.env.GEMINI_API_KEY || '';
        if (geminiKey) {
            try {
                this.genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
                this.geminiParserModel = this.genAI.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    systemInstruction: `Kamu adalah parser intent untuk AI Assistant Sistem Manajemen Pondok SI-TAQUA.
Tugas utamamu adalah membedakan dengan tegas antara dua jenis pesan:

1. CHAT SANTAI / KONSULTASI / SIKAP RAMAH (WAJIB panggil fungsi "chitchat"):
   - Sapaan, salam ("Assalamu'alaikum"), ucapan terima kasih ("Jazakallah", "Syukron", "Matur nuwun"), atau permohonan doa.
   - Menanyakan kabar ("Gimana kabarnya?", "Kabar pondok hari ini?", "Sehat selalu ustadz").
   - Curhat wali santri atau ustadz, obrolan santai sehari-hari, pertanyaan umum (cuaca, suasana, kondisi santri secara umum).
   - Permintaan tips, nasihat islami, motivasi belajar/hafalan (misal: "Tips agar anak rajin muraja'ah", "Adab santri", "Cara agar santri mutqin").
   - Pertanyaan atau tanggapan yang TIDAK meminta data rekaman database spesifik aplikasi SI-TAQUA.

2. PERMINTAAN DATA APLIKASI (panggil fungsi data yang spesifik):
   - Hanya panggil fungsi data jika pengguna meminta data faktual spesifik di sistem (cekTagihan, cekPembayaran, cekHafalan, cekNilai, cekAbsensi, cekSantri, cekJadwal, cekKalender, cekInfoPondok, cekSantriAktif, atau input data).
   - Parameter santri_name HANYA boleh berisi nama orang asli (JANGAN diisi nama kelas seperti "Kelas 2", kelompok halaqoh, atau kata benda umum).
   - Jika menanyakan jumlah/total/daftar santri di kelas atau halaqoh, panggil cekSantriAktif dengan parameter kelas/halaqoh.`,
                    tools: [{
                            functionDeclarations: [
                                {
                                    name: 'cekTagihan',
                                    description: 'Mengecek rincian tagihan aktif santri yang belum lunas atau harus dibayar',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri atau nama panggilan santri saja (misal: Wildan)' },
                                            bulan: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Bulan tagihan opsional (misal: Juli)' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekPembayaran',
                                    description: 'Mengecek status pembayaran SPP/biaya santri (lunas maupun belum lunas per bulan)',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri atau nama panggilan santri saja (misal: Wildan)' },
                                            bulan: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Bulan tagihan opsional (misal: Juli)' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekHafalan',
                                    description: 'Mengecek progress atau riwayat setoran hafalan Al-Qur\'an santri (juz, surah, ayat)',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri atau nama panggilan saja (misal: Wildan)' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekNilai',
                                    description: 'Mengecek nilai akademis, raport, atau ujian pelajaran santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri atau nama panggilan saja (misal: Wildan)' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekAbsensi',
                                    description: 'Mengecek data presensi, kehadiran, atau absensi santri (hadir, sakit, izin, atau alfa)',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri atau nama panggilan saja (misal: Wildan)' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekSantri',
                                    description: 'Mengecek detail profil atau informasi pribadi santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri saja' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekPrestasi',
                                    description: 'Mengecek prestasi akademis atau pujian santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri saja' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekPerizinan',
                                    description: 'Mengecek status izin keluar/pulang santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri saja' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekBelumSetor',
                                    description: 'Mengecek daftar santri yang belum menyetorkan hafalan Al-Qur\'an hari ini',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'cekSantriSakit',
                                    description: 'Mengecek daftar santri yang tercatat sakit hari ini',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'cekSantriIzin',
                                    description: 'Mengecek daftar santri yang sedang izin keluar atau pulang dari pondok hari ini',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'cekRankingHafalan',
                                    description: 'Mengecek peringkat atau ranking capaian tahfidz/hafalan santri terbanyak',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'cekRekapTunggakan',
                                    description: 'Mengecek daftar santri dengan tunggakan pembayaran atau SPP terbesar',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'cekSantriAktif',
                                    description: 'Mengecek total, jumlah, atau statistik santri aktif di pondok pesantren, baik secara keseluruhan, per tingkatan kelas (contoh: "berapa jumlah santri kelas 2", "santri kelas 1 ada berapa", "total murid kelas 3"), maupun per halaqoh',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            kelas: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama atau nomor kelas jika menanyakan jumlah/daftar santri kelas tertentu (misal: "Kelas 2", "Kelas 1", "VII A", "2")' },
                                            halaqoh: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama kelompok halaqoh jika menanyakan santri halaqoh tertentu' },
                                            detail: { type: generative_ai_1.FunctionDeclarationSchemaType.BOOLEAN, description: 'True jika user menanyakan siapa saja santrinya (daftar nama)' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekJadwal',
                                    description: 'Mengecek jadwal mengajar ustadz/guru atau jadwal pelajaran/halaqoh santri (contoh: "kapan jadwal mengajar saya", "jadwal mengajar hari ini", "jadwal hari senin", "jadwal pelajaran")',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            hari: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama hari spesifik (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Ahad/Minggu, hari ini, besok)' },
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri jika wali menanyakan jadwal pelajaran ananda santri' },
                                            guru_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama guru jika menanyakan jadwal guru lain' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekKalender',
                                    description: 'Mengecek kalender akademik pondok pesantren, tanggal hari libur, jadwal ujian, atau agenda kegiatan pondok',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            bulan: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama bulan atau periode waktu agenda' }
                                        }
                                    }
                                },
                                {
                                    name: 'cekInfoPondok',
                                    description: 'Mengecek info umum resmi pondok: jadwal sambangan/kunjungan wali santri, rekening resmi pembayaran SPP, alamat/lokasi pesantren, aturan kirim paket/barang santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            topik: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Topik informasi yang dicari: sambangan, rekening, alamat, paket, atau umum' }
                                        }
                                    }
                                },
                                {
                                    name: 'tambahPembayaran',
                                    description: 'Input atau catat transaksi pembayaran baru untuk santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri saja' },
                                            nominal: { type: generative_ai_1.FunctionDeclarationSchemaType.NUMBER, description: 'Nominal uang pembayaran' },
                                            kategori: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Kategori pembayaran (SPP Bulanan, Uang Makan, Uang Asrama)' }
                                        },
                                        required: ['santri_name', 'nominal']
                                    }
                                },
                                {
                                    name: 'tambahHafalan',
                                    description: 'Input setoran hafalan baru santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri saja' },
                                            juz: { type: generative_ai_1.FunctionDeclarationSchemaType.NUMBER, description: 'Nomor juz (1-30)' },
                                            surah: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama surah' },
                                            ayat_awal: { type: generative_ai_1.FunctionDeclarationSchemaType.NUMBER, description: 'Nomor ayat mulai' },
                                            ayat_akhir: { type: generative_ai_1.FunctionDeclarationSchemaType.NUMBER, description: 'Nomor ayat selesai (opsional)' }
                                        },
                                        required: ['santri_name', 'juz', 'surah', 'ayat_awal']
                                    }
                                },
                                {
                                    name: 'tambahAbsensi',
                                    description: 'Input absensi kehadiran santri',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            santri_name: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Nama santri saja' },
                                            status: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Status (hadir, sakit, izin, alpha)' }
                                        },
                                        required: ['santri_name', 'status']
                                    }
                                },
                                {
                                    name: 'chitchat',
                                    description: 'Percakapan santai, salam pembuka, sapaan, ucapan terima kasih, curhat wali/ustadz, doa, diskusi ringan, tips/nasihat belajar santri, atau pertanyaan umum di luar konteks database pondok',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            pesan: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Pesan balasan ramah' }
                                        }
                                    }
                                }
                            ]
                        }]
                });
                this.geminiResponseModel = this.genAI.getGenerativeModel({
                    model: 'gemini-1.5-flash',
                    systemInstruction: `Kamu adalah Asisten AI WhatsApp Resmi untuk Pondok Pesantren Tahfidz Qur'an Al-Usymuni (PTQA) Batuan, Sumenep, Madura (Sistem SI-TAQUA).

Karakter & Etika Komunikasi:
1. Penuh adab Islami khas pesantren, hangat, ramah, santun, dan empatik (tidak kaku seperti robot).
2. Pembedaan Lawan Bicara:
   - Jika pengguna adalah Wali Santri: Sapa dengan hangat penuh rasa kekeluargaan menggunakan "Ayah/Bunda" atau "Bapak/Ibu", serta doakan keberkahan untuk ananda santri.
   - Jika pengguna adalah Ustadz/Ustadzah (Guru Pondok): Sapa dengan rasa hormat dan takzim menggunakan "Ustadz/Ustadzah", serta doakan keistiqamahan dan pahala jariyah dalam membimbing santri.
3. Kesopanan Percakapan (Chitchat & Sapaan):
   - Jika ada yang mengucapkan salam ("Assalamu'alaikum"): Balas dengan salam lengkap yang ramah ("Wa'alaikumussalam Warahmatullahi Wabarakatuh...").
   - Jika ada yang mengucapkan terima kasih ("Jazakallah", "Syukron", "Terima kasih"): Balas dengan hangat ("Wa jazakallahu khairan", "Sama-sama Ayah/Bunda...").
   - Jika ada obrolan santai atau sapaan pembuka: Balas dengan luwes dan tawarkan bantuan secara wajar tanpa memaksakan menu kaku yang panjang.
4. Sentuhan Empati & Doa:
   - Jika santri tercatat sakit: Sertakan doa kesembuhan yang tulus ("Syafakallah / Syafakillah, semoga ananda lekas sehat kembali...").
   - Jika santri berprestasi atau hafalannya bertambah lancar: Berikan apresiasi tulus ("Masya Allah Tabarakallah, semoga mutqin dan barokah...").
   - Jika ada tagihan yang belum lunas: Sampaikan rinciannya secara jelas, transparan, dan bertutur kata santun tanpa membuat canggung.
5. Integritas Data (Anti-Halusinasi):
   - Jangan pernah mengarang data nominal uang, angka tagihan, nilai rapor, atau ayat hafalan. Semua data angka dan riwayat kegiatan santri HARUS bersumber murni dari data database yang disediakan oleh backend.
   - Gunakan format *bold* untuk penegasan kata penting. Jangan gunakan format HTML atau backticks (\`\`\`).`
                });
                this.logger.log('AiService initialized: Gemini 1.5 Flash Parser & Response mode AKTIF.');
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
        if (!this.geminiParserModel) {
            throw new Error('Gemini Parser Model not initialized');
        }
        let enrichedPrompt = userPrompt;
        if (ctx.lastSantriName) {
            enrichedPrompt = `[Konteks: nama santri terakhir = "${ctx.lastSantriName}"] ${userPrompt}`;
        }
        const response = await this.geminiParserModel.generateContent(enrichedPrompt);
        const calls = response.response.functionCalls();
        if (calls && calls.length > 0) {
            const call = calls[0];
            const args = call.args || {};
            const cleanedArgs = {};
            Object.keys(args).forEach(k => {
                if (args[k] !== null && args[k] !== undefined && args[k] !== '') {
                    cleanedArgs[k] = args[k];
                }
            });
            this.logger.log(`[Gemini FC] Function: ${call.name}, Args: ${JSON.stringify(cleanedArgs)}`);
            return {
                intent: call.name,
                parameters: cleanedArgs,
            };
        }
        this.logger.warn('[Gemini FC] Tidak ada function call terdeteksi, fallback ke chitchat statis.');
        return {
            intent: 'chitchat',
            parameters: {},
        };
    }
    cleanSantriName(raw) {
        if (!raw)
            return '';
        let name = raw.trim();
        name = name.replace(/^(santri|siswa|anak|ananda|saudara|adek|kakak|atas\s+nama|nama|si|tentang|data|info|cek|lihat|tampilkan|status|rekap|input|tambah|catat)\s+/gi, '').trim();
        name = name.replace(/^(spp|tagihan|pembayaran|biaya|hafalan|nilai|absen|absensi|kehadiran|presensi)\s+/gi, '').trim();
        const cutoffMatch = name.match(/^(.*?)(?:\s+(?:juz|surah|surat|ayat|sakit|izin|hadir|alfa|alpha|lancar|kurang|nilai|rp|sebesar))\b/i);
        if (cutoffMatch && cutoffMatch[1]) {
            name = cutoffMatch[1].trim();
        }
        const trailingStopwords = [
            'hari\\s+ini', 'bulan\\s+ini', 'minggu\\s+ini', 'tahun\\s+ini',
            'kemarin', 'besok', 'sekarang', 'saat\\s+ini',
            'semester\\s+\\d+', 'semester\\s+ini', 'semester\\s+ganjil', 'semester\\s+genap',
            'apakah\\s+sudah\\s+bayar', 'sudah\\s+bayar', 'belum\\s+bayar', 'sudah\\s+lunas', 'belum\\s+lunas',
            'sudah\\s+setor', 'belum\\s+setor', 'sudah\\s+masuk', 'belum\\s+masuk',
            'hadir\\s+gak', 'masuk\\s+gak', 'masuk\\s+tidak', 'hadir\\s+tidak',
            'gimana', 'bagaimana', 'kabarnya', 'dong', 'ya', 'nggih', 'kah',
            'nya', 'saja', 'berapa', 'apa', 'spp', 'tagihan', 'pembayaran', 'hafalan', 'nilai', 'absen', 'kehadiran'
        ];
        for (const sw of trailingStopwords) {
            name = name.replace(new RegExp(`\\s+${sw}$`, 'i'), '').trim();
        }
        const lower = name.toLowerCase().trim();
        if (!lower || this.NON_SANTRI_STOPWORDS.has(lower)) {
            return '';
        }
        if (/^(?:kelas|kls|halaqoh|kelompok|kamar|asrama|angkatan|tingkat)\b/i.test(lower)) {
            return '';
        }
        if (lower.includes('mengajar') || lower.includes('jadwal') || lower === 'saya' || lower === 'anak saya' || lower === 'putra saya') {
            return '';
        }
        return name
            .split(/\s+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
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
        const hasDataKeyword = /\b(jadwal|mengajar|ngajar|hafalan|setoran|tahfidz|ziyadah|muroja|surah|surat|juz|ayat|nilai|rapor|raport|ujian|ulangan|uts|uas|absen|absensi|kehadiran|presensi|izin|sakit|alfa|bayar|pembayaran|tagihan|tunggakan|spp|nominal|biaya|kalender|libur|sambang|sambangan|rekening|jumlah\s+santri|total\s+santri|santri\s+aktif|kelas\s+\d+|peringkat|ranking|pelanggaran)\b/i.test(text);
        const isChitChatStrict = /^(halo|hai|hei|hey|tes|test|ping|p)$/i.test(text) ||
            /\b(assalamu|assalam|salam|waalaikum|walaikum)\b/i.test(text) ||
            /\b(terima\s*kasih|makasih|matur\s*nuwun|jazak|syukron|thanks|thank\s*you)\b/i.test(text) ||
            /\b(apa\s*kabar|kabarnya|gimana\s*kabarnya|bagaimana\s*kabarnya|sehat|sehat\s*selalu)\b/i.test(text) ||
            /\b(tips|nasihat|adab|motivasi|semangat|curhat|konsultasi|bimbingan|saran|masukan)\b/i.test(text) ||
            /\b(doakan|minta\s*doa|mohon\s*doa|barakallah|barokallah|masya\s*allah|insya\s*allah|subhanallah)\b/i.test(text) ||
            /\b(mau\s*tanya|boleh\s*tanya|bisa\s*tanya|mau\s*nanya|boleh\s*nanya|bisa\s*nanya|permisi|afwan)\b/i.test(text) ||
            /\b(cuaca|hujan|panas|mendung|dingin|kondisi\s*pondok|suasana\s*pondok|kabar\s*pondok)\b/i.test(text);
        if (isChitChatStrict && !hasDataKeyword) {
            result.intent = 'chitchat';
            return result;
        }
        let santriName = '';
        const nameMatchWithKeyword = userPrompt.match(/(?:santri|nama|untuk|milik|atas\s+nama|spp|pembayaran|biaya|tagihan|tunggakan|perkembangan|hafalan|setoran|nilai|rapor|absen|absensi|kehadiran|presensi|prestasi|izin|perizinan|tentang|profil|data\s+kehadiran|data\s+hafalan|data\s+nilai|data\s+tagihan|status\s+spp|status\s+kehadiran|cek\s+kehadiran|cek\s+hafalan|cek\s+nilai|cek\s+tagihan|cek\s+pembayaran)\s+([A-Za-z0-9\s]+)/i);
        if (nameMatchWithKeyword && nameMatchWithKeyword[1]) {
            santriName = this.cleanSantriName(nameMatchWithKeyword[1]);
        }
        if (!santriName) {
            const nameAfterVerb = userPrompt.match(/(?:cek|lihat|tampilkan|info|data|rekap|status)\s+(?:hafalan\s+|nilai\s+|tagihan\s+|pembayaran\s+|biaya\s+|absen\s+|absensi\s+|kehadiran\s+|presensi\s+|spp\s+|perkembangan\s+){1,3}([A-Za-z0-9\s]+)/i);
            if (nameAfterVerb && nameAfterVerb[1]) {
                santriName = this.cleanSantriName(nameAfterVerb[1]);
            }
        }
        if (!santriName) {
            const nameAtStart = userPrompt.match(/^([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\s+(?:apakah|sudah|belum|hadir|masuk|absen|absensi|kehadiran|presensi|hafalan|setoran|nilai|spp|tagihan|pembayaran|biaya|gimana|bagaimana|hari\s+ini|bulan\s+ini)/i);
            if (nameAtStart && nameAtStart[1]) {
                santriName = this.cleanSantriName(nameAtStart[1]);
            }
        }
        if (!santriName && !hasDataKeyword) {
            const CONVERSATIONAL_WORDS = new Set([
                'ada', 'apa', 'bagaimana', 'gimana', 'siapa', 'kenapa', 'mengapa', 'mana', 'dimana',
                'mau', 'bisa', 'boleh', 'minta', 'tolong', 'terima', 'kasih', 'sehat', 'kabar', 'kabarnya',
                'cuaca', 'panas', 'hujan', 'tips', 'doakan', 'doa', 'nanya', 'tanya', 'santai', 'sibuk',
                'lagi', 'sedang', 'sudah', 'belum', 'sekarang', 'nanti', 'kemarin', 'besok', 'hari',
                'malam', 'pagi', 'siang', 'sore', 'nggih', 'ya', 'dong', 'kah', 'oke', 'sip', 'amin',
                'aamiin', 'alhamdulillah', 'bismillah', 'insyaallah', 'masyaallah', 'syukron', 'afwan',
                'halo', 'hai', 'salam', 'assalamu', 'assalamualaikum', 'waalaikumsalam', 'baik', 'jelek',
                'dingin', 'sejuk', 'ramai', 'sepi', 'banget', 'sekali', 'saja', 'dong', 'deh', 'pun'
            ]);
            const words = text.split(/\s+/).filter(Boolean);
            const hasChatWord = words.some(w => CONVERSATIONAL_WORDS.has(w));
            if (!hasChatWord && words.length >= 1 && words.length <= 4) {
                const isAlphaOnly = words.every(w => /^[a-z0-9]+$/i.test(w));
                if (isAlphaOnly) {
                    const cleaned = this.cleanSantriName(userPrompt);
                    if (cleaned && cleaned.length >= 2) {
                        santriName = cleaned;
                    }
                }
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
        const juzMatch = text.match(/(?:juz\s*ke[-\s]*|juz\s*)(\d+)/i);
        if (juzMatch) {
            result.parameters.juz = parseInt(juzMatch[1], 10);
        }
        const surahMatch = text.match(/(?:surat|surah)\s*([a-zA-Z\-]+)/i);
        if (surahMatch) {
            result.parameters.surah = surahMatch[1].charAt(0).toUpperCase() + surahMatch[1].slice(1);
        }
        const ayatMatch = text.match(/(?:ayat\s*|ayat ke[-\s]*)(\d+)(?:\s*(?:sampai|-)\s*(\d+))?/i);
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
        if (text.includes('lancar') || text.includes('mutqin')) {
            result.parameters.status = 'Lancar';
        }
        else if (text.includes('kurang') || text.includes('ulang')) {
            result.parameters.status = 'Kurang Lancar';
        }
        else if (text.includes('proses') || text.includes('ziyadah')) {
            result.parameters.status = 'Proses';
        }
        else if (text.includes('sakit')) {
            result.parameters.status = 'sakit';
        }
        else if (text.includes('izin')) {
            result.parameters.status = 'izin';
        }
        else if (text.includes('alfa') || text.includes('alpha') || text.includes('bolos')) {
            result.parameters.status = 'alfa';
        }
        else if (text.includes('hadir') || text.includes('masuk')) {
            result.parameters.status = 'hadir';
        }
        const hariMatch = text.match(/\b(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|ahad|minggu|hari\s+ini|besok)\b/i);
        if (hariMatch) {
            result.parameters.hari = hariMatch[1];
        }
        const isJadwal = /\b(jadwal|mengajar|ngajar|kapan.*ngajar|kapan.*mengajar|jadwal.*saya|jadwal.*pelajaran|jadwal.*halaqoh)\b/i.test(text);
        const isKalender = /\b(kalender|akademik|libur|kapan\s+libur|hari\s+libur|agenda|kegiatan\s+pondok)\b/i.test(text);
        const isInfoPondok = /\b(sambang|sambangan|kunjung|kunjungan|besuk|jenguk|alamat\s+pondok|lokasi\s+pondok|rekening|transfer|no\s+rek|nomor\s+rekening|kirim\s+paket|aturan\s+paket|titip\s+barang|kontak\s+pondok|cs\s+pondok)\b/i.test(text);
        const isBelumSetor = /(belum\s+setor|tidak\s+setor|siapa\s+yang\s+belum\s+setor|santri\s+belum\s+setor)/i.test(text);
        const isSantriSakit = /(santri\s+sakit|siapa\s+(?:yang|saja)\s+sakit|yang\s+sakit\s+hari\s+ini|rekap\s+sakit)/i.test(text);
        const isSantriIzin = /(santri\s+izin|siapa\s+(?:yang|saja)\s+izin|yang\s+izin\s+hari\s+ini|rekap\s+izin|izin\s+keluar|izin\s+pulang)/i.test(text);
        const isRankingHafalan = /(ranking\s+hafalan|peringkat\s+hafalan|top\s+hafalan|hafalan\s+terbanyak|ranking\s+tahfidz|tahfidz\s+terbanyak)/i.test(text);
        const isRekapTunggakan = /(rekap\s+tunggakan|tunggakan.*terbesar|santri\s+belum\s+bayar|rekap\s+belum\s+lunas|daftar\s+tunggakan|rekap.*spp|tunggakan.*spp)/i.test(text);
        const isStatistikSantri = /(?:berapa|jumlah|total|banyak(?:nya)?|daftar|siapa\s+(?:saja\s+)?)\s*(?:jumlah\s+)?(?:seluruh\s+)?(?:anak|santri|siswa)/i.test(text) ||
            /(?:santri|siswa|anak)(?:\s+(?:di|pada|untuk)?\s*(?:kelas|halaqoh)\s+[a-zA-Z0-9\s\-]+)?\s+(?:ada\s+berapa|berapa|ada\s+berapa\s+orang|siapa\s+saja)/i.test(text) ||
            /(?:total|jumlah|banyaknya)\s+(?:santri|anak|siswa)/i.test(text) ||
            /(?:berapa\s+(?:jumlah\s+)?santri)/i.test(text) ||
            /(?:siapa\s+(?:saja\s+)?santri)/i.test(text);
        const isSantriAktif = isStatistikSantri || /(total\s+santri\s+aktif|jumlah\s+santri\s+aktif|berapa\s+santri\s+aktif|total\s+santri)/i.test(text);
        const kelasRegex = /\b(?:di\s+|pada\s+)?(?:kelas|kls)\s+([0-9a-zA-Z\s\-]+?)(?:\s+(?:ada|berapa|dan|siapa|saja|orang)|$)/i;
        const kelasMatch = text.match(kelasRegex);
        const halaqohRegex = /\b(?:di\s+|pada\s+)?(?:halaqoh|kelompok)\s+([0-9a-zA-Z\s\-]+?)(?:\s+(?:ada|berapa|dan|siapa|saja|orang)|$)/i;
        const halaqohMatch = text.match(halaqohRegex);
        const isTagihan = /\b(tagihan|tunggakan|belum\s+lunas|harus\s+dibayar|kewajiban|tunggak)\b/i.test(text);
        const isPembayaran = /\b(bayar|lunas|pembayaran|spp|transaksi|kwitansi|bukti\s+bayar|sudah\s+bayar|uang\s+makan|uang\s+gedung)\b/i.test(text);
        const isHafalan = /\b(hafalan|setor|setoran|surah|surat|juz|muroja|muraja|tahfidz|ziyadah)\b/i.test(text);
        const isNilai = /\b(nilai|rapor|raport|ulangan|ujian|uts|uas|tugas|pelajaran|akademis|akademik|skor|mapel)\b/i.test(text);
        const isAbsensi = /\b(hadir|kehadiran|presensi|absen|absensi|masuk|bolos|alfa|alpha|sakit|masuk\s+gak|hadir\s+gak|tidak\s+masuk)\b/i.test(text);
        const isPerizinan = /\b(izin\s+pulang|izin\s+keluar|perizinan|surat\s+izin)\b/i.test(text);
        const isPrestasi = /\b(prestasi|juara|lomba|pujian|penghargaan)\b/i.test(text);
        const isSantri = /\b(profil|biodata|data\s+santri|info\s+santri|tentang\s+santri)\b/i.test(text);
        if (isInfoPondok) {
            result.intent = 'cekInfoPondok';
            if (text.includes('sambang') || text.includes('kunjung') || text.includes('besuk') || text.includes('jenguk')) {
                result.parameters.topik = 'sambangan';
            }
            else if (text.includes('rekening') || text.includes('transfer') || text.includes('no rek') || text.includes('nomor rekening')) {
                result.parameters.topik = 'rekening';
            }
            else if (text.includes('alamat') || text.includes('lokasi')) {
                result.parameters.topik = 'alamat';
            }
            else if (text.includes('paket') || text.includes('kirim') || text.includes('titip')) {
                result.parameters.topik = 'paket';
            }
            delete result.parameters.santri_name;
        }
        else if (isKalender) {
            result.intent = 'cekKalender';
            delete result.parameters.santri_name;
        }
        else if (isJadwal) {
            result.intent = 'cekJadwal';
            if (!santriName) {
                const santriJadwalMatch = userPrompt.match(/jadwal\s+(?:pelajaran\s+|halaqoh\s+)?(?:santri\s+|ananda\s+|anak\s+)?([A-Za-z0-9\s]+)/i);
                if (santriJadwalMatch && santriJadwalMatch[1]) {
                    const cleaned = this.cleanSantriName(santriJadwalMatch[1]);
                    if (cleaned) {
                        santriName = cleaned;
                        result.parameters.santri_name = cleaned;
                    }
                }
            }
            if (text.includes('saya') || text.includes('mengajar') || text.includes('guru') || text.includes('ustadz') || (santriName && /^(?:hari\s+)?(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|ahad|minggu)$/i.test(santriName))) {
                delete result.parameters.santri_name;
            }
        }
        else if (isBelumSetor) {
            result.intent = 'cekBelumSetor';
        }
        else if (isSantriSakit) {
            result.intent = 'cekSantriSakit';
        }
        else if (isSantriIzin) {
            result.intent = 'cekSantriIzin';
        }
        else if (isRankingHafalan) {
            result.intent = 'cekRankingHafalan';
        }
        else if (isRekapTunggakan) {
            result.intent = 'cekRekapTunggakan';
        }
        else if (isSantriAktif) {
            result.intent = 'cekSantriAktif';
            if (kelasMatch && kelasMatch[1]) {
                result.parameters.kelas = kelasMatch[1].trim();
            }
            if (halaqohMatch && halaqohMatch[1]) {
                result.parameters.halaqoh = halaqohMatch[1].trim();
            }
            if (text.includes('siapa') || text.includes('daftar') || text.includes('nama')) {
                result.parameters.detail = true;
            }
            delete result.parameters.santri_name;
        }
        else if (isTagihan) {
            result.intent = 'cekTagihan';
        }
        else if (isPembayaran) {
            if (result.parameters.nominal && santriName && (text.includes('input') || text.includes('tambah') || text.includes('bayar') || text.includes('catat'))) {
                result.intent = 'tambahPembayaran';
            }
            else {
                result.intent = 'cekPembayaran';
            }
        }
        else if (isPerizinan) {
            result.intent = 'cekPerizinan';
        }
        else if (isAbsensi) {
            if (text.includes('input') || text.includes('tambah') || text.includes('catat')) {
                result.intent = 'tambahAbsensi';
            }
            else {
                result.intent = 'cekAbsensi';
            }
        }
        else if (isHafalan) {
            if ((text.includes('setor') || text.includes('input') || text.includes('tambah') || text.includes('catat')) && (result.parameters.surah || result.parameters.juz)) {
                result.intent = 'tambahHafalan';
            }
            else {
                result.intent = 'cekHafalan';
            }
        }
        else if (isNilai) {
            if (text.includes('input') || text.includes('tambah') || text.includes('simpan') || text.includes('catat')) {
                result.intent = 'tambahNilai';
            }
            else {
                result.intent = 'cekNilai';
            }
        }
        else if (isPrestasi) {
            result.intent = 'cekPrestasi';
        }
        else if (isSantri) {
            result.intent = 'cekSantri';
        }
        else if (text.includes('pelanggaran') || text.includes('melanggar') || text.includes('hukuman')) {
            result.intent = 'tambahPelanggaran';
        }
        else if (santriName) {
            if (context.lastIntent && context.lastIntent !== 'chitchat') {
                result.intent = context.lastIntent;
            }
            else {
                result.intent = 'cekSantri';
            }
        }
        this.setContext(sender, result.intent, santriName);
        return result;
    }
    async parseIntent(userPrompt, sender) {
        this.addToHistory(sender, 'user', userPrompt);
        if (this.geminiParserModel) {
            try {
                const result = await this.parseIntentWithGemini(userPrompt, sender);
                if (result && result.intent && result.intent !== 'chitchat') {
                    const santriName = result.parameters?.santri_name || '';
                    this.setContext(sender, result.intent, santriName);
                    this.logger.log(`[Gemini] Intent: ${result.intent}, Santri: ${santriName}`);
                    return result;
                }
            }
            catch (e) {
                this.logger.warn(`[Gemini] Gagal parse intent, fallback ke local NLP: ${e.message}`);
            }
        }
        const localResult = this.parseIntentLocal(userPrompt, sender);
        if (localResult && localResult.intent !== 'chitchat') {
            this.logger.log(`[Local NLP Override] Intent: ${localResult.intent}, Params: ${JSON.stringify(localResult.parameters)}`);
            return localResult;
        }
        this.logger.log(`[Local NLP] Intent: ${localResult.intent}, Params: ${JSON.stringify(localResult.parameters)}`);
        return localResult;
    }
    async formatResponseWithGemini(userPrompt, intent, dbResult, sender, isGuru = false, guruName = '') {
        const ctx = this.getContext(sender);
        const santriName = ctx.lastSantriName || '';
        let dataContext = '';
        if (dbResult && !dbResult.error) {
            dataContext = `\nData dari database:\n${JSON.stringify(dbResult, null, 2)}`;
        }
        else if (dbResult?.error) {
            dataContext = `\nError dari database: ${dbResult.error}`;
        }
        const rolePrompt = isGuru
            ? `Pengguna adalah Ustadz/Ustadzah (Guru Pondok) bernama: ${guruName || 'Ustadz/Ustadzah'}. Gunakan sapaan hormat Islami "Ustadz/Ustadzah", bukan "Ayah/Bunda".`
            : `Pengguna adalah Wali Santri. Gunakan sapaan hangat "Ayah/Bunda".`;
        const promptText = `Pesan user: "${userPrompt}"
${rolePrompt}
Nama santri konteks: ${santriName || 'tidak ada'}
Fungsi dijalankan: ${intent}
Panduan menyusun jawaban:
1. Jika tentang pembayaran/tagihan:
   - Sebutkan Bulan/Periode tagihan (ambil dari field jatuh_tempo atau keterangan, contoh: Juli 2026).
   - Sebutkan tanggal jatuh tempo, nominal, dan statusnya (Lunas/Belum Lunas).
   - Jika intent cekTagihan: fokuskan pada tagihan yang BELUM LUNAS dan sebutkan total yang harus dibayar dengan tutur bahasa yang santun dan menenangkan.
2. Jika tentang kehadiran/absensi:
   - Jelaskan kehadiran hari ini (jika ada catatan hari ini) dan rangkum total hadir, sakit, izin, alfa.
   - Jika ananda santri tercatat sakit, sertakan doa kesembuhan yang tulus ("Syafakallah / Syafakillah...").
3. Jika tentang hafalan:
   - Sebutkan setoran terakhir (surah, juz, ayat, dan tanggal) serta riwayat sebelumnya.
   - Berikan apresiasi dan doa keistiqamahan ("Masya Allah Tabarakallah, semoga berkah dan mutqin...").
4. Jika tentang nilai:
   - Sebutkan mata pelajaran, nilai tugas, UTS, UAS, dan nilai akhir secara terstruktur dan jelas.
5. Jika rekap kolektif (belum setor, santri sakit, ranking):
   - Sajikan dalam bentuk daftar nomor urut yang rapi dan ringkas.
6. Jika percakapan santai, konsultasi, sapaan, ucapan terima kasih, curhat, nasihat, atau doa (chitchat):
   - Jawablah secara manusiawi, luwes, bijak, hangat, dan beradab Islami khas kultur pondok pesantren PTQ Al-Usymuni Batuan.
   - Balas salam lengkap ("Wa'alaikumussalam Warahmatullahi Wabarakatuh...") dan doakan kebaikan yang berlimpah.
   - Jika pengguna curhat atau meminta tips/nasihat (misal: tips muraja'ah santri, motivasi tholabul ilmi, adab menghafal Al-Qur'an, doa keistiqamahan): berikan motivasi dan tips bijak yang menyejukkan hati dan penuh hikmah.
   - Jika pengguna bertanya santai (kabar, cuaca, suasana pondok): jawablah dengan ramah dan wajar layaknya ustadz/pengurus pondok yang bersahabat.
   - Tunjukkan empati mendalam layaknya pengurus/ustadz pondok yang mengayomi.
   - JANGAN mencari-cari nama santri di database dan JANGAN memaksakan menu fitur yang panjang kecuali jika pengguna memang bertanya fitur yang tersedia.
7. Jika tentang jadwal (cekJadwal):
   - Pahami maksud dan pertanyaan pengguna secara cerdas, kontekstual, peka, dan solutif (bukan template kaku).
   - Perhatikan konteks hari ini dari field currentDayName pada data (misal: hari ini Ahad):
     * Jika pertanyaan terbuka ("kapan saya mengajar?", "kapan jam mengajar saya?", "jadwal mengajar saya", "kapan saya ada kelas?"):
       - Jika hari ini (misal Ahad) tidak ada jadwal mengajar, jelaskan dengan santun bahwa hari ini libur/tidak ada jadwal mengajar, selamat beristirahat.
       - Tunjukkan secara jelas kapan jadwal mengajar terdekat berikutnya (contoh: "Agenda mengajar terdekat antum adalah besok hari Senin, pukul...").
       - Sajikan rincian hari dan jam mengajar lainnya selama sepekan secara rapi dan terstruktur (dikelompokkan per hari).
     * Jika pertanyaan spesifik hari ini ("jadwal hari ini", "ada ngajar hari ini?"):
       - Fokuskan jawaban untuk hari ini. Jika hari ini kosong, beritahukan bahwa hari ini tidak ada jadwal dan sebutkan jadwal terdekat di hari berikutnya.
     * Jika pertanyaan spesifik hari lain ("jadwal besok", "jadwal senin"):
       - Fokuskan jawaban pada hari yang ditanyakan.
   - Cantumkan jam mulai - selesai (WIB), nama mata pelajaran / halaqoh tahfidz, dan kelas atau kelompok target.
   - Jika guru belum memiliki alokasi jadwal di database (schedules kosong):
     - Jelaskan secara ramah bahwa jadwal mengajar antum belum teralokasi di sistem untuk semester ini dan sarankan konfirmasi ke bagian kurikulum/akademik.
   - Tutup dengan doa keberkahan atas dedikasi dakwah dan pengajaran antum.
8. Jika tentang kalender akademik / libur (cekKalender):
   - Tampilkan daftar agenda dan hari libur mendatang dengan tanggal yang jelas, rapi, dan mudah dibaca.
9. Jika tentang info pondok (cekInfoPondok):
   - Sampaikan info sambangan (Ahad 08.00-17.00 WIB), alamat di Batuan Sumenep, rekening resmi SPP di Bank BSI 7188899912 a.n. Pesantren Tahfidz Al-Qur'an Al-Usymuni, dan aturan paket santri secara akurat.
10. Jika tentang perizinan (cekPerizinan):
   - Tampilkan riwayat izin santri atau guru dengan status dan tanggal yang jelas disertai doa kebaikan.
11. Jika tentang statistik / jumlah santri (cekSantriAktif):
   - Pahami apakah pengguna menanyakan jumlah santri secara keseluruhan pondok, atau per kelas tertentu (contoh: "Kelas 2"), atau per kelompok halaqoh.
   - Jika query tentang kelas tertentu (contoh: "Berapa jumlah santri kelas 2"): sebutkan nama kelasnya dan total jumlah santrinya secara lugas dan ramah (contoh: "Jumlah santri aktif di Kelas 2 adalah sebanyak *X santri*"). Jika ada daftar nama dan pengguna memintanya ("siapa saja", "daftar santri"), cantumkan nama-nama santrinya dengan nomor urut yang rapi.
   - Jika query global seluruh pondok: sebutkan total santri aktif di PTQ Al-Usymuni dan sertakan rincian santri per kelas yang ada di data.
   - Tutup dengan doa keberkahan atas tholabul 'ilmi para santri di pesantren.
${dataContext}`;
        const response = await this.geminiResponseModel.generateContent(promptText);
        return response.response.text().trim();
    }
    generateResponseLocal(userPrompt, intent, dbResult, sender, isGuru = false, guruName = '') {
        const context = this.getContext(sender);
        const santriName = context.lastSantriName || 'nanda';
        const greetings = isGuru
            ? [
                guruName ? `Ahlan wa Sahlan, Ustadz/Ustadzah ${guruName}! 🧑‍🏫` : `Ahlan wa Sahlan, Ustadz/Ustadzah! 🧑‍🏫`,
                guruName ? `Assalamu'alaikum Ustadz/Ustadzah ${guruName}. Siap membantu antum. 🤲` : `Assalamu'alaikum Ustadz/Ustadzah. Siap membantu antum. 🤲`,
            ]
            : [
                "Assalamu'alaikum Wr. Wb. 😊",
                'Halo, salam sejahtera Ayah/Bunda. 🌟',
                'Nggih Ayah/Bunda, siap membantu. 🤲',
            ];
        const getGreeting = () => greetings[Math.floor(Math.random() * greetings.length)];
        const closings = isGuru
            ? [
                '\n\nSemoga Allah senantiasa memberkahi perjuangan dakwah dan pengajaran antum. Jazakumullah khairan. 🤲',
                '\n\nAda lagi data atau rekap santri yang perlu dicek, Ustadz/Ustadzah?',
                '\n\nDemikian informasinya nggih, Ustadz/Ustadzah. Barokallahu fiikum.',
            ]
            : [
                '\n\nSemoga nanda selalu istiqomah dalam menuntut ilmu. Amin. 🤲',
                '\n\nAda lagi yang bisa saya bantu?',
                '\n\nDemikian informasinya nggih, Ayah/Bunda. Jazakumullah khairan.',
            ];
        const getClosing = () => closings[Math.floor(Math.random() * closings.length)];
        const bulanIndo = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const formatPeriodeBulan = (jatuhTempo, ket) => {
            if (ket) {
                for (const b of bulanIndo) {
                    if (new RegExp(`\\b${b}\\b`, 'i').test(ket)) {
                        const yr = ket.match(/\b(20\d{2})\b/);
                        return yr ? `${b} ${yr[1]}` : b;
                    }
                }
            }
            if (jatuhTempo) {
                const parts = String(jatuhTempo).split('-');
                if (parts.length >= 2) {
                    const m = parseInt(parts[1], 10) - 1;
                    if (m >= 0 && m < 12)
                        return `${bulanIndo[m]} ${parts[0]}`;
                }
            }
            return 'Bulan Berjalan';
        };
        const formatTanggalIndo = (tgl) => {
            if (!tgl)
                return '-';
            try {
                const d = new Date(tgl);
                if (isNaN(d.getTime()))
                    return tgl;
                return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            }
            catch {
                return tgl;
            }
        };
        if (dbResult && dbResult.error) {
            const roleCall = isGuru ? 'Ustadz/Ustadzah' : 'Ayah/Bunda';
            return `⚠️ *Afwan ${roleCall},* terjadi kendala: ${dbResult.error}`;
        }
        switch (intent) {
            case 'cekPembayaran':
            case 'check_pembayaran': {
                if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
                    return `${getGreeting()}\n\nAlhamdulillah, tidak ada catatan tagihan/pembayaran tertunggak untuk nanda *${santriName}*. Status aman nggih.${getClosing()}`;
                }
                const bills = Array.isArray(dbResult) ? dbResult : [dbResult];
                let payText = `${getGreeting()}\n\nBerikut laporan *status pembayaran & SPP* nanda *${santriName}*:\n\n`;
                let totalTagihan = 0;
                let totalLunas = 0;
                let totalBelumLunas = 0;
                let countBelum = 0;
                bills.forEach((t) => {
                    const kategori = t.kategori_pembayaran?.nama || t.kategori || 'SPP/Tagihan';
                    const nominalNum = Number(t.jumlah || t.nominal || 0);
                    const nominalStr = nominalNum.toLocaleString('id-ID');
                    const isLunas = String(t.status).toLowerCase() === 'lunas';
                    const statusIcon = isLunas ? '✅ *Lunas*' : '❌ *Belum Lunas*';
                    const periode = formatPeriodeBulan(t.jatuh_tempo, t.keterangan);
                    const tglJatuhTempo = formatTanggalIndo(t.jatuh_tempo);
                    totalTagihan += nominalNum;
                    if (isLunas) {
                        totalLunas += nominalNum;
                    }
                    else {
                        totalBelumLunas += nominalNum;
                        countBelum++;
                    }
                    payText += `📌 *${kategori}* (Bulan: *${periode}*)\n`;
                    payText += `   • Nominal: Rp${nominalStr}\n`;
                    payText += `   • Jatuh Tempo: ${tglJatuhTempo}\n`;
                    payText += `   • Status: ${statusIcon}\n\n`;
                });
                payText += `📊 *Ringkasan Keuangan:*\n`;
                if (totalBelumLunas > 0) {
                    payText += `• Belum Dibayar: *Rp${totalBelumLunas.toLocaleString('id-ID')}* (${countBelum} tagihan)\n`;
                }
                else {
                    payText += `• Status: *Alhamdulillah, Seluruh Tagihan Lunas* 🎉\n`;
                }
                payText += `• Sudah Lunas: *Rp${totalLunas.toLocaleString('id-ID')}*\n`;
                payText += getClosing();
                return payText;
            }
            case 'cekTagihan': {
                if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
                    return `${getGreeting()}\n\nAlhamdulillah! 🌟 Nanda *${santriName}* tidak memiliki tagihan aktif saat ini. Seluruh kewajiban telah diselesaikan.${getClosing()}`;
                }
                const bills = Array.isArray(dbResult) ? dbResult : [dbResult];
                const unpaidBills = bills.filter((t) => String(t.status).toLowerCase() !== 'lunas');
                if (unpaidBills.length === 0) {
                    return `${getGreeting()}\n\nAlhamdulillah! 🌟 Seluruh tagihan untuk nanda *${santriName}* sudah *Lunas*. Tidak ada tagihan yang harus dibayar saat ini. Jazakumullah khairan. 🤲${getClosing()}`;
                }
                let tagText = `${getGreeting()}\n\nBerikut rincian *tagihan aktif / belum lunas* nanda *${santriName}*:\n\n`;
                let totalUnpaid = 0;
                unpaidBills.forEach((t, idx) => {
                    const kategori = t.kategori_pembayaran?.nama || t.kategori || 'Tagihan';
                    const nominalNum = Number(t.jumlah || t.nominal || 0);
                    const nominalStr = nominalNum.toLocaleString('id-ID');
                    const periode = formatPeriodeBulan(t.jatuh_tempo, t.keterangan);
                    const tglJatuhTempo = formatTanggalIndo(t.jatuh_tempo);
                    totalUnpaid += nominalNum;
                    tagText += `${idx + 1}. *${kategori}* (Bulan: *${periode}*)\n`;
                    tagText += `   • Jumlah: *Rp${nominalStr}*\n`;
                    tagText += `   • Jatuh Tempo: ${tglJatuhTempo}\n\n`;
                });
                tagText += `💰 *Total Yang Harus Dibayar: Rp${totalUnpaid.toLocaleString('id-ID')}*\n`;
                tagText += `\nPembayaran dapat dilakukan melalui kantor pondok atau transfer resmi nggih. Jazakumullah khairan. 🤲`;
                return tagText;
            }
            case 'cekHafalan':
            case 'get_hafalan': {
                if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
                    return `${getGreeting()}\n\nBelum ada catatan setoran hafalan nanda *${santriName}* yang terdata nggih.${getClosing()}`;
                }
                const records = Array.isArray(dbResult) ? dbResult : [dbResult];
                const latest = records[0];
                const latestDate = formatTanggalIndo(latest.tanggal);
                const aM = latest.ayat_mulai || latest.ayat_awal || 1;
                const aS = latest.ayat_selesai || latest.ayat_akhir || '';
                const ayatStr = aS ? `(Ayat ${aM}-${aS})` : `(Ayat ${aM})`;
                let hafText = `${getGreeting()}\n\nBerikut perkembangan *hafalan Al-Qur'an* nanda *${santriName}*:\n\n`;
                hafText += `🌟 *Setoran Terakhir:*\n`;
                hafText += `📅 Tanggal: *${latestDate}*\n`;
                hafText += `📖 Juz: *${latest.juz || '-'}* | Surah: *${latest.surah || '-'}* ${ayatStr}\n`;
                hafText += `📋 Status: *${latest.status || 'Lancar'}*\n\n`;
                if (records.length > 1) {
                    hafText += `📜 *Riwayat Setoran Sebelumnya:*\n`;
                    records.slice(1, 4).forEach((h) => {
                        const tgl = formatTanggalIndo(h.tanggal);
                        const subAM = h.ayat_mulai || h.ayat_awal || 1;
                        const subAS = h.ayat_selesai || h.ayat_akhir || '';
                        const subAStr = subAS ? `ayat ${subAM}-${subAS}` : `ayat ${subAM}`;
                        hafText += `• ${tgl}: Juz ${h.juz}, Surah ${h.surah} (${subAStr}) → *${h.status || 'Lancar'}*\n`;
                    });
                    hafText += `\n`;
                }
                hafText += `Masya Allah, semoga nanda selalu dimudahkan dalam menjaga dan menambah hafalannya. Amin. 🌙`;
                return hafText;
            }
            case 'cekNilai':
            case 'get_nilai': {
                if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
                    return `${getGreeting()}\n\nNilai akademis nanda *${santriName}* belum terinput ke sistem.${getClosing()}`;
                }
                const records = Array.isArray(dbResult) ? dbResult : [dbResult];
                let nilText = `${getGreeting()}\n\nBerikut rekap *nilai akademis* nanda *${santriName}*:\n\n`;
                records.forEach((n) => {
                    const mapel = n.mapel?.nama || n.nama_mapel || n.kategori || 'Mata Pelajaran';
                    const semNama = n.semester?.nama || n.semester || '';
                    const sem = semNama ? `Semester ${semNama}` : '';
                    const ta = n.tahun_ajaran ? `TA ${n.tahun_ajaran}` : '';
                    const jenis = n.jenis_ujian ? `[${String(n.jenis_ujian).toUpperCase()}]` : '';
                    const header = [mapel, jenis, sem, ta].filter(Boolean).join(' - ');
                    nilText += `📚 *${header}*\n`;
                    if (n.nilai_tugas !== null && n.nilai_tugas !== undefined)
                        nilText += `  • Tugas: *${n.nilai_tugas}*\n`;
                    if (n.nilai_uts !== null && n.nilai_uts !== undefined)
                        nilText += `  • UTS: *${n.nilai_uts}*\n`;
                    if (n.nilai_uas !== null && n.nilai_uas !== undefined)
                        nilText += `  • UAS: *${n.nilai_uas}*\n`;
                    nilText += `  🎯 *Nilai Akhir: ${n.nilai_akhir ?? '-'}*\n\n`;
                });
                nilText += `Semoga hasil ini menjadi motivasi nanda untuk terus berprestasi. 🌟`;
                return nilText;
            }
            case 'cekAbsensi':
            case 'get_presence_today': {
                if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
                    return `${getGreeting()}\n\nData absensi/kehadiran nanda *${santriName}* belum tersedia di sistem.${getClosing()}`;
                }
                const records = Array.isArray(dbResult) ? dbResult : [dbResult];
                const total = records.length;
                const hadir = records.filter((p) => String(p.status).toLowerCase() === 'hadir').length;
                const sakit = records.filter((p) => String(p.status).toLowerCase() === 'sakit').length;
                const izin = records.filter((p) => String(p.status).toLowerCase() === 'izin').length;
                const alpha = records.filter((p) => ['alfa', 'alpha'].includes(String(p.status).toLowerCase())).length;
                const todayStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
                const todayRec = records.find((p) => p.tanggal && String(p.tanggal).startsWith(todayStr));
                let absText = `${getGreeting()}\n\nBerikut rekap *kehadiran / absensi* nanda *${santriName}*:\n\n`;
                if (todayRec) {
                    const statusToday = String(todayRec.status).toUpperCase();
                    const iconToday = statusToday === 'HADIR' ? '✅' : statusToday === 'SAKIT' ? '🏥' : statusToday === 'IZIN' ? '🏠' : '❌';
                    absText += `📌 *Kehadiran Hari Ini*: ${iconToday} *${statusToday}*\n\n`;
                }
                else {
                    absText += `📌 *Kehadiran Hari Ini*: Belum ada sesi absensi tercatat hari ini.\n\n`;
                }
                absText += `📊 *Ringkasan Kehadiran:*\n`;
                absText += `• ✅ Hadir: *${hadir}* kali\n`;
                absText += `• 🏥 Sakit: *${sakit}* kali\n`;
                absText += `• 🏠 Izin: *${izin}* kali\n`;
                absText += `• ❌ Alpha: *${alpha}* kali\n`;
                absText += `• Total Sesi: *${total}* hari\n\n`;
                absText += `📋 *3 Catatan Terakhir:*\n`;
                records.slice(0, 3).forEach((p) => {
                    const tgl = formatTanggalIndo(p.tanggal);
                    const st = String(p.status).toLowerCase();
                    const ic = st === 'hadir' ? '✅' : st === 'sakit' ? '🏥' : st === 'izin' ? '🏠' : '❌';
                    const ket = p.keterangan ? ` (${p.keterangan})` : '';
                    absText += `- ${tgl}: ${ic} *${p.status}*${ket}\n`;
                });
                absText += getClosing();
                return absText;
            }
            case 'cekSantri': {
                if (!dbResult) {
                    return `${getGreeting()}\n\nData profil nanda *${santriName}* tidak ditemukan.${getClosing()}`;
                }
                const s = dbResult;
                let sText = `${getGreeting()}\n\nBerikut informasi profil santri:\n\n`;
                sText += `👤 Nama: *${s.nama}*\n`;
                sText += `🆔 NIS: *${s.nis || '-'}*\n`;
                sText += `🏫 Status: *${s.status || 'Aktif'}*\n`;
                if (s.kelas?.nama)
                    sText += `📚 Kelas: *${s.kelas.nama}*\n`;
                sText += getClosing();
                return sText;
            }
            case 'cekPrestasi':
                if (!dbResult || dbResult.length === 0) {
                    return `${getGreeting()}\n\nBelum ada catatan prestasi yang terdata untuk nanda *${santriName}*.${getClosing()}`;
                }
                let presText = `🏆 *Catatan Prestasi*\nNanda *${santriName}*:\n\n`;
                (Array.isArray(dbResult) ? dbResult : [dbResult]).forEach((p, idx) => {
                    presText += `${idx + 1}. *${p.nama_prestasi || p.judul || 'Prestasi'}* (${p.tingkat || 'Pondok'})\n`;
                });
                return presText + getClosing();
            case 'cekJadwal': {
                if (!dbResult) {
                    return `${getGreeting()}\n\nData jadwal tidak ditemukan.${getClosing()}`;
                }
                const isGuruSchedule = !!dbResult.guruNama;
                const targetName = dbResult.guruNama || dbResult.santriNama || (guruName ? `Ustadz ${guruName}` : 'Santri');
                const schedules = dbResult.schedules || [];
                const isWeekly = !dbResult.dayName || dbResult.dayName === 'Semua Hari (Mingguan)' || dbResult.dayName === 'Semua Hari';
                const currentDay = dbResult.currentDayName || 'Ahad';
                if (schedules.length === 0) {
                    if (isGuru) {
                        return isWeekly
                            ? `${getGreeting()}\n\nAfwan Ustadz/Ustadzah *${targetName}*, saat ini belum ada alokasi jadwal mengajar aktif yang terdaftar di sistem atas nama antum.\n\nSilakan konfirmasi ke bagian kurikulum/akademik pondok nggih. Barokallahu fiikum. 🤲`
                            : `${getGreeting()}\n\nAlhamdulillah Ustadz/Ustadzah *${targetName}*, tidak ada agenda jadwal mengajar pada *${dbResult.dayName}*.\n\nSelamat beristirahat atau beraktivitas lainnya nggih. Barokallahu fiikum. 🤲`;
                    }
                    else {
                        return `${getGreeting()}\n\nAlhamdulillah, tidak ada jadwal pelajaran atau halaqoh untuk nanda *${targetName}* pada *${dbResult.dayName || 'hari ini'}*.${getClosing()}`;
                    }
                }
                if (isWeekly) {
                    const todaySchedules = schedules.filter((s) => s.hari === currentDay);
                    let jadwalText = isGuru
                        ? `${getGreeting()}\n\n`
                        : `${getGreeting()}\n\nBerikut jadwal nanda *${targetName}*:\n\n`;
                    if (isGuru) {
                        if (todaySchedules.length === 0) {
                            jadwalText += `Untuk hari ini (*${currentDay}*), antum tidak ada agenda jadwal mengajar. Selamat beristirahat nggih. 🤲\n\n`;
                        }
                        else {
                            jadwalText += `📌 *Agenda Mengajar Hari Ini (${currentDay}):*\n`;
                            todaySchedules.forEach((s, idx) => {
                                const time = s.jam_mulai && s.jam_selesai
                                    ? `${s.jam_mulai.slice(0, 5)} - ${s.jam_selesai.slice(0, 5)} WIB`
                                    : `Jam ke-${s.jam_ke || idx + 1}`;
                                const tipeIcon = s.tipe === 'HALAQOH' ? '📖' : '📚';
                                jadwalText += `  ${idx + 1}. ⏰ *${time}* | ${tipeIcon} *${s.mapelNama || 'Pelajaran'}* (${s.targetNama || 'Kelas'})\n`;
                            });
                            jadwalText += `\n`;
                        }
                        jadwalText += `📋 *Rincian Jadwal Mengajar Antum Selama Sepekan:*\n\n`;
                    }
                    const byDay = {};
                    schedules.forEach((s) => {
                        const h = s.hari || 'Lainnya';
                        if (!byDay[h])
                            byDay[h] = [];
                        byDay[h].push(s);
                    });
                    for (const [namaHari, list] of Object.entries(byDay)) {
                        jadwalText += `🗓️ *Hari ${namaHari}:*\n`;
                        list.forEach((s, idx) => {
                            const time = s.jam_mulai && s.jam_selesai
                                ? `${s.jam_mulai.slice(0, 5)} - ${s.jam_selesai.slice(0, 5)} WIB`
                                : `Jam ke-${s.jam_ke || idx + 1}`;
                            const tipeIcon = s.tipe === 'HALAQOH' ? '📖' : '📚';
                            const target = s.targetNama || s.kelasNama || '';
                            const mapel = s.mapelNama || 'Pelajaran';
                            const guruStr = !isGuru && s.guruNama ? ` (Pengampu: *${s.guruNama}*)` : '';
                            jadwalText += `  ${idx + 1}. ⏰ *${time}* | ${tipeIcon} *${mapel}* - ${target}${guruStr}\n`;
                        });
                        jadwalText += `\n`;
                    }
                    jadwalText += isGuru
                        ? `Semoga Allah Ta'ala melimpahkan kelancaran, kesabaran, dan keberkahan dalam mendidik para santri. Jazakumullah khairan. 🤲`
                        : `Semoga nanda selalu istiqamah dan bersemangat dalam menuntut ilmu. Amin. 🤲`;
                    return jadwalText;
                }
                let jadwalText = isGuru
                    ? `${getGreeting()}\n\n📅 *Jadwal Mengajar Ustadz/Ustadzah ${targetName}*\n📌 Hari: *${dbResult.dayName}*\n\n`
                    : `${getGreeting()}\n\n📅 *Jadwal Pelajaran & Halaqoh Nanda ${targetName}*\n📌 Hari: *${dbResult.dayName}*\n\n`;
                schedules.forEach((s, idx) => {
                    const time = s.jam_mulai && s.jam_selesai
                        ? `${s.jam_mulai.slice(0, 5)} - ${s.jam_selesai.slice(0, 5)} WIB`
                        : `Jam ke-${s.jam_ke || idx + 1}`;
                    const tipeIcon = s.tipe === 'HALAQOH' ? '📖' : '📚';
                    const target = s.targetNama || s.kelasNama || '';
                    const mapel = s.mapelNama || 'Pelajaran';
                    const guruStr = !isGuru && s.guruNama ? ` (Pengampu: *${s.guruNama}*)` : '';
                    jadwalText += `${idx + 1}. ⏰ *${time}*\n`;
                    jadwalText += `   ${tipeIcon} *${mapel}* - ${target}${guruStr}\n\n`;
                });
                jadwalText += isGuru
                    ? `Semoga Allah Ta'ala melimpahkan kelancaran, kesabaran, dan keberkahan dalam mendidik para santri. Jazakumullah khairan. 🤲`
                    : `Semoga nanda selalu istiqamah dan bersemangat dalam menuntut ilmu. Amin. 🤲`;
                return jadwalText;
            }
            case 'cekKalender': {
                const events = Array.isArray(dbResult) ? dbResult : [];
                if (events.length === 0) {
                    return `${getGreeting()}\n\nAlhamdulillah, belum ada agenda kalender akademik atau jadwal libur pondok khusus dalam waktu dekat ini.${getClosing()}`;
                }
                let calText = `${getGreeting()}\n\n📅 *Agenda Kalender Akademik & Libur Pondok PTQA:*\n\n`;
                events.forEach((ev, idx) => {
                    const tglMulai = formatTanggalIndo(ev.tanggal_mulai);
                    const tglSelesai = ev.tanggal_selesai && ev.tanggal_selesai !== ev.tanggal_mulai
                        ? ` s/d ${formatTanggalIndo(ev.tanggal_selesai)}`
                        : '';
                    const jenisIcon = String(ev.jenis).toLowerCase().includes('libur') ? '🏖️' : '📌';
                    const cakupan = ev.cakupan && ev.cakupan !== 'Semua' ? ` [${ev.cakupan}]` : '';
                    calText += `${idx + 1}. ${jenisIcon} *${ev.judul}*${cakupan}\n`;
                    calText += `   🗓️ ${tglMulai}${tglSelesai}\n`;
                    if (ev.deskripsi)
                        calText += `   📝 ${ev.deskripsi}\n`;
                    calText += `\n`;
                });
                calText += `Semoga seluruh agenda kegiatan santri dan pondok senantiasa diridhoi oleh Allah SWT. 🤲`;
                return calText;
            }
            case 'cekInfoPondok': {
                const info = dbResult || {};
                if (info.topik === 'sambangan') {
                    const d = info.data || {};
                    return `${getGreeting()}\n\n🕌 *Informasi Sambangan / Kunjungan Wali Santri*\n*${info.namaPondok}*:\n\n` +
                        `📅 *Waktu*: ${d.hari || 'Setiap Hari Ahad'}\n` +
                        `⏰ *Jam*: *${d.jam || '08.00 - 17.00 WIB'}*\n` +
                        `📋 *Ketentuan*: ${d.aturan || 'Melapor ke pos keamanan/pengurus dan berbusana muslim/muslimah rapi & sopan.'}\n\n` +
                        `Ditunggu kehadirannya Ayah/Bunda untuk melepas rindu dengan ananda tercinta. Semoga sehat selalu! 🤲`;
                }
                if (info.topik === 'rekening') {
                    const r = info.data || {};
                    return `${getGreeting()}\n\n💳 *Nomor Rekening Resmi Pembayaran SPP / Infaq*\n*${info.namaPondok}*:\n\n` +
                        `🏦 Bank: *${r.bank || 'Bank Syariah Indonesia (BSI)'}*\n` +
                        `🔢 No. Rekening: *${r.nomor || '7188899912'}*\n` +
                        `👤 Atas Nama: *${r.atasNama || "Pesantren Tahfidz Al-Qur'an Al-Usymuni"}*\n\n` +
                        `📌 *Konfirmasi Pembayaran*:\nSetelah transfer, silakan kirim foto bukti transfer ke nomor WhatsApp ini atau bendahara pondok nggih. Jazakumullah khairan katsiran. 🤲`;
                }
                if (info.topik === 'alamat') {
                    return `${getGreeting()}\n\n📍 *Alamat & Lokasi Pesantren*:\n\n` +
                        `*${info.namaPondok}*\n` +
                        `📌 ${info.alamat || 'Kompleks Pondok Pesantren Al-Usymuni, Desa Batuan, Kec. Batuan, Kab. Sumenep, Madura, Jawa Timur 69451'}\n\n` +
                        `Lokasi mudah dijangkau dan berada di lingkungan Pondok Pesantren Al-Usymuni Batuan Sumenep. 🚗🛵`;
                }
                if (info.topik === 'paket') {
                    const p = info.data || {};
                    return `${getGreeting()}\n\n📦 *Aturan Pengiriman Paket / Titipan Santri*:\n\n` +
                        `📌 ${p.aturan || 'Paket barang atau makanan dapat dititipkan melalui Pos Keamanan / Pengurus Putra atau Putri.'}\n\n` +
                        `⚠️ *Catatan*: Mohon cantumkan *Nama Lengkap Santri* dan *Kelas/Kamar* pada paket agar memudahkan pengurus menyalurkan kepada ananda. Jazakumullah khairan. 🤲`;
                }
                return `${getGreeting()}\n\n🕌 *Pusat Informasi ${info.info?.namaPondok || "Pesantren Tahfidz Al-Qur'an Al-Usymuni"}*:\n\n` +
                    `📍 *Alamat*: Desa Batuan, Sumenep, Madura\n` +
                    `🗓️ *Sambangan*: Hari Ahad (08.00 - 17.00 WIB)\n` +
                    `💳 *Rekening SPP*: BSI 7188899912 a.n. Pesantren Tahfidz Al-Qur'an Al-Usymuni\n` +
                    `📦 *Paket Santri*: Dititipkan di pos pengurus pondok\n\n` +
                    `Silakan tanyakan hal yang ingin Ayah/Bunda atau Ustadz/Ustadzah ketahui nggih. 🤲`;
            }
            case 'cekPerizinan':
                if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
                    return `${getGreeting()}\n\nAlhamdulillah, tidak ada riwayat izin atau sakit yang aktif saat ini.${getClosing()}`;
                }
                const izinList = Array.isArray(dbResult) ? dbResult : [dbResult];
                let riwayatIzinText = `${getGreeting()}\n\n📝 *Riwayat Perizinan & Kehadiran:*\n\n`;
                izinList.slice(0, 5).forEach((iz, idx) => {
                    const tgl = formatTanggalIndo(iz.tanggal || iz.tanggal_mulai);
                    const st = iz.status || 'Izin';
                    const ket = iz.keterangan || iz.keperluan || iz.jenis_izin || '-';
                    riwayatIzinText += `${idx + 1}. *${tgl}* - Status: *${st}*\n   • Keperluan/Ket: ${ket}\n\n`;
                });
                riwayatIzinText += `Semoga Allah senantiasa menjaga keselamatan dan kesehatan santri di manapun berada. 🤲`;
                return riwayatIzinText;
            case 'cekBelumSetor':
            case 'get_tidak_setor_today': {
                if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
                    return `${getGreeting()}\n\nAlhamdulillah! 🌟 Hari ini *seluruh santri aktif* sudah menyelesaikan setoran hafalannya. Luar biasa! 🎉${getClosing()}`;
                }
                const students = Array.isArray(dbResult) ? dbResult : [dbResult];
                let noSetorText = `${getGreeting()}\n\n📋 *Daftar Santri Belum Setor Hafalan Hari Ini:*\nTotal: *${students.length} santri*\n\n`;
                students.slice(0, 15).forEach((s, idx) => {
                    const kelasData = s.kelas;
                    const kls = (Array.isArray(kelasData) ? kelasData[0]?.nama : kelasData?.nama) || '';
                    const klsStr = kls ? ` (${kls})` : '';
                    noSetorText += `${idx + 1}. *${s.nama}*${klsStr}\n`;
                });
                if (students.length > 15) {
                    noSetorText += `...dan ${students.length - 15} santri lainnya.\n`;
                }
                noSetorText += `\nMohon dipantau dan dimotivasi nggih, Ustadz/Ustadzah. Jazakumullah khairan. 🙏`;
                return noSetorText;
            }
            case 'cekSantriSakit': {
                const records = Array.isArray(dbResult) ? dbResult : [];
                if (records.length === 0) {
                    return `${getGreeting()}\n\nAlhamdulillah! 🌟 Hari ini tidak ada santri yang tercatat sakit. Seluruh santri dalam keadaan sehat wal afiat. 🤲${getClosing()}`;
                }
                let text = `${getGreeting()}\n\n🏥 *Daftar Santri Sakit Hari Ini:*\nTotal: *${records.length} santri*\n\n`;
                records.forEach((r, idx) => {
                    const s = r.santri || {};
                    const kls = s.kelas?.nama ? ` (${s.kelas.nama})` : '';
                    const ket = r.keterangan ? ` - Ket: ${r.keterangan}` : '';
                    text += `${idx + 1}. *${s.nama || 'Santri'}*${kls}${ket}\n`;
                });
                text += `\nSyafahumullah, semoga lekas sembuh dan bisa kembali beraktivitas di pondok. 🤲`;
                return text;
            }
            case 'cekSantriIzin': {
                const records = Array.isArray(dbResult) ? dbResult : [];
                if (records.length === 0) {
                    return `${getGreeting()}\n\nAlhamdulillah! 🌟 Hari ini tidak ada santri yang tercatat izin keluar/pulang. Seluruh santri berada di pondok. 🤲${getClosing()}`;
                }
                let text = `${getGreeting()}\n\n🏠 *Daftar Santri Izin Hari Ini:*\nTotal: *${records.length} santri*\n\n`;
                records.forEach((r, idx) => {
                    const s = r.santri || {};
                    const kls = s.kelas?.nama ? ` (${s.kelas.nama})` : '';
                    const ket = r.keterangan ? ` - Keperluan: ${r.keterangan}` : '';
                    text += `${idx + 1}. *${s.nama || 'Santri'}*${kls}${ket}\n`;
                });
                text += getClosing();
                return text;
            }
            case 'cekRankingHafalan':
            case 'get_top_10_hafalan': {
                const ranking = Array.isArray(dbResult) ? dbResult : [];
                if (ranking.length === 0) {
                    return `${getGreeting()}\n\nBelum ada data hafalan yang cukup untuk menampilkan ranking capaian tahfidz.${getClosing()}`;
                }
                let topText = `${getGreeting()}\n\n🏆 *Top Ranking Prestasi Tahfidz Santri:*\n\n`;
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                ranking.forEach((r, idx) => {
                    const m = medals[idx] || `${idx + 1}.`;
                    const kls = r.kelas && r.kelas !== '-' ? ` (${r.kelas})` : '';
                    topText += `${m} *${r.nama}*${kls}\n   • Capaian: *Juz ${r.maxJuz || '-'}* (${r.totalSetoran || 0} kali setoran)\n`;
                });
                topText += `\nMasya Allah, semoga barokah dan memotivasi santri lainnya. 🌟`;
                return topText;
            }
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
            case 'cekRekapTunggakan':
            case 'get_tunggakan_terbesar': {
                const items = Array.isArray(dbResult) ? dbResult : [];
                if (items.length === 0) {
                    return `${getGreeting()}\n\nAlhamdulillah! Tidak ada santri yang memiliki tunggakan pembayaran. 🎉${getClosing()}`;
                }
                let tunggakanText = `${getGreeting()}\n\n💳 *Rekap Santri dengan Tunggakan Terbesar:*\n\n`;
                items.slice(0, 10).forEach((item, idx) => {
                    tunggakanText += `${idx + 1}. *${item.nama}*: Rp${Number(item.total).toLocaleString('id-ID')}\n`;
                });
                tunggakanText += getClosing();
                return tunggakanText;
            }
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
            case 'cekSantriAktif':
            case 'get_jumlah_santri_aktif': {
                if (dbResult && typeof dbResult === 'object') {
                    if (dbResult.type === 'KELAS') {
                        const kName = (dbResult.matchedKelas && dbResult.matchedKelas.length > 0)
                            ? dbResult.matchedKelas.join(', ')
                            : (dbResult.query || 'Kelas');
                        let resp = `${getGreeting()}\n\n📊 *Data Santri - ${kName}*\n` +
                            `Jumlah santri aktif: *${dbResult.total} santri*.\n`;
                        if (dbResult.santriNames && dbResult.santriNames.length > 0) {
                            resp += `\n*Daftar Santri:*\n` +
                                dbResult.santriNames.map((n, i) => `${i + 1}. ${n}`).join('\n');
                        }
                        resp += `\n\nSemoga para santri senantiasa istiqamah, berakhlak mulia, dan dimudahkan dalam menuntut ilmu. Aamiin ya Rabbal 'Alamin. 🤲${getClosing()}`;
                        return resp;
                    }
                    if (dbResult.type === 'HALAQOH') {
                        const hName = (dbResult.matchedHalaqoh && dbResult.matchedHalaqoh.length > 0)
                            ? dbResult.matchedHalaqoh.join(', ')
                            : (dbResult.query || 'Halaqoh');
                        let resp = `${getGreeting()}\n\n📖 *Data Santri - ${hName}*\n` +
                            `Jumlah santri aktif: *${dbResult.total} santri*.\n`;
                        if (dbResult.santriNames && dbResult.santriNames.length > 0) {
                            resp += `\n*Daftar Santri:*\n` +
                                dbResult.santriNames.map((n, i) => `${i + 1}. ${n}`).join('\n');
                        }
                        resp += `\n\nSemoga santri istiqamah dan lancar dalam ziyadah maupun muroja'ah Al-Qur'an. Barokallahu fiikum. 🤲${getClosing()}`;
                        return resp;
                    }
                    if (dbResult.type === 'GLOBAL' && dbResult.breakdown && dbResult.breakdown.length > 0) {
                        let resp = `${getGreeting()}\n\n👥 *Statistik Santri Aktif PTQ Al-Usymuni Batuan*\n` +
                            `Total santri aktif saat ini: *${dbResult.total} santri*.\n\n` +
                            `*Rincian Per Kelas:*\n` +
                            dbResult.breakdown.map((b) => `• ${b.kelas}: *${b.count} santri*`).join('\n') +
                            `\n\nAlhamdulillah, semoga para santri senantiasa dalam lindungan dan keberkahan Allah Ta'ala. Aamiin. 🤲${getClosing()}`;
                        return resp;
                    }
                }
                const total = typeof dbResult === 'number' ? dbResult : (dbResult?.jumlah_santri_aktif || dbResult?.total || 0);
                return `${getGreeting()}\n\n👥 Total santri *Aktif* di PTQ Al-Usymuni Batuan saat ini: *${total}* santri.${getClosing()}`;
            }
            case 'chitchat': {
                const text = (userPrompt || '').toLowerCase().trim();
                if (/assalamu|assalam|salam/i.test(text)) {
                    return isGuru
                        ? `Wa'alaikumussalam Warahmatullahi Wabarakatuh, Ustadz/Ustadzah ${guruName ? guruName + ' ' : ''}🧑‍🏫\n\nAhlan wa Sahlan! Alhamdulillah saya siap membantu antum. Apakah ada data jadwal mengajar, presensi santri, hafalan, atau rekap yang ingin dicek hari ini? 🤲`
                        : `Wa'alaikumussalam Warahmatullahi Wabarakatuh, Ayah/Bunda. 😊\n\nAlhamdulillah, semoga Ayah/Bunda sekeluarga senantiasa dalam keadaan sehat dan penuh berkah. Ada yang bisa saya bantu terkait perkembangan ananda di pondok hari ini? 🤲`;
                }
                if (/terima\s*kasih|makasih|matur\s*nuwun|jazak|syukron|makasi|thanks/i.test(text)) {
                    return isGuru
                        ? `Wa jazakumullah khairan katsiran, Ustadz/Ustadzah. 🤲\nSemoga seluruh dedikasi dan keikhlasan antum dalam membimbing para santri bernilai amal jariyah dan pahala yang berlipat ganda. Aamiin ya Rabbal 'Alamin.`
                        : `Sama-sama Ayah/Bunda! 😊 Senang sekali bisa membantu.\nSemoga ananda selalu diberikan kemudahan, keistiqamahan, dan keberkahan dalam menuntut ilmu dan menghafal Al-Qur'an di PTQ Al-Usymuni. Aamiin ya Rabbal 'Alamin. 🤲\n\nJika ada hal lain yang ingin dipantau, jangan sungkan ya.`;
                }
                if (/apa\s*kabar|kabarnya|gimana\s*kabarnya/i.test(text)) {
                    return isGuru
                        ? `Alhamdulillah, sistem SI-TAQUA berjalan lancar dan siap membantu antum. 🧑‍🏫 Semoga Ustadz/Ustadzah selalu diberikan kesehatan, kelapangan, dan kekuatan dalam mengajar santri. Ada data yang ingin dicek hari ini? 🤲`
                        : `Alhamdulillah, kabar baik Ayah/Bunda. 😊 Semoga Ayah/Bunda sekeluarga juga senantiasa dinaungi kesehatan dan kebahagiaan oleh Allah SWT. Ada perkembangan ananda yang ingin dicek hari ini? 🤲`;
                }
                if (/mau\s*tanya|boleh\s*tanya|bisa\s*tanya|mau\s*nanya|boleh\s*nanya|bisa\s*nanya|permisi/i.test(text)) {
                    return isGuru
                        ? `Tentu, tafadhdhal Ustadz/Ustadzah! 🧑‍🏫 Silakan sampaikan apa yang ingin antum tanyakan atau cek di SI-TAQUA, saya siap membantu.`
                        : `Nggih mangga Ayah/Bunda, tentu sangat boleh! 😊 Silakan tanyakan apa saja yang ingin diketahui seputar ananda atau pondok, saya siap membantu dengan senang hati.`;
                }
                if (/tips|nasihat|adab|motivasi|muraja|semangat|curhat|konsultasi|bimbingan/i.test(text)) {
                    return isGuru
                        ? `Masya Allah, Ustadz/Ustadzah ${guruName || ''}. 🤲\n\nDalam membimbing para santri penghafal Al-Qur'an, kunci utamanya adalah keikhlasan, kesabaran, dan istiqamah dalam muraja'ah berkala. Rasulullah SAW mengingatkan bahwa Al-Qur'an lebih cepat lepas daripada unta dari ikatannya jika tidak dijaga.\n\nSemoga Allah Ta'ala senantiasa melimpahkan kelapangan dada dan pahala jariyah yang mengalir tanpa henti untuk antum sekeluarga. Aamiin ya Rabbal 'Alamin. 🤲`
                        : `Masya Allah, Ayah/Bunda. 😊\n\nKunci keberhasilan ananda dalam menghafal Al-Qur'an di pondok adalah doa tulus orang tua di setiap sepertiga malam, ridho orang tua, dan suasana hati yang tenang. Motivasi ananda dengan penuh cinta dan hindari membanding-bandingkan capaian hafalan.\n\nSemoga ananda tumbuh menjadi ahlul Qur'an yang mutqin, berakhlak mulia, dan menghadiahkan mahkota kemuliaan bagi Ayah/Bunda di akhirat kelak. Aamiin ya Rabbal 'Alamin. 🤲`;
                }
                if (/doakan|mohon\s*doa|minta\s*doa|barakallah|barokallah|sehat\s*selalu/i.test(text)) {
                    return isGuru
                        ? `Aamiin Aamiin ya Rabbal 'Alamin. 🤲\nJazakumullah khairan katsiran atas doa dan dedikasinya, Ustadz/Ustadzah. Semoga antum dan keluarga senantiasa berada dalam lindungan, kesehatan, dan keberkahan Allah SWT.`
                        : `Aamiin Aamiin ya Rabbal 'Alamin. 🤲\nJazakumullah khairan Ayah/Bunda atas doa dan kepercayaannya kepada PTQ Al-Usymuni Batuan. Semoga Ayah/Bunda sekeluarga senantiasa dilimpahkan kesehatan, rizki yang berkah, dan kemudahan dalam segala urusan.`;
                }
                if (/cuaca|hujan|panas|suasana|kondisi|kabar\s*pondok/i.test(text)) {
                    return isGuru
                        ? `Alhamdulillah, suasana di pesantren PTQ Al-Usymuni Batuan senantiasa hidup dengan lantunan ayat-ayat suci Al-Qur'an para santri. 🕌 Semoga aktivitas mengajar dan berdakwah antum hari ini berjalan lancar penuh berkah. 🤲`
                        : `Alhamdulillah, suasana di pondok pesantren PTQA Batuan terpantau kondusif, damai, dan para santri beraktivitas dengan penuh semangat menuntut ilmu dan menghafal Al-Qur'an. 🕌 Semoga ananda selalu betah dan istiqamah nggih Ayah/Bunda. 🤲`;
                }
                if (/^(halo|hai|hi|pagi|siang|sore|malam|selamat\s+pagi|selamat\s+siang|selamat\s+sore|selamat\s+malam)\b/i.test(text)) {
                    return isGuru
                        ? `Ahlan wa Sahlan, Ustadz/Ustadzah ${guruName ? guruName + ' ' : ''}! 🧑‍🏫\nSelamat datang di asisten virtual SI-TAQUA. Silakan beri tahu saya data santri atau agenda kelas yang ingin diakses hari ini.`
                        : `Halo, salam hangat Ayah/Bunda! 😊\nSelamat datang di layanan informasi PTQ Al-Usymuni Batuan. Saya siap membantu memantau perkembangan hafalan, kehadiran, nilai, maupun administrasi SPP ananda. Silakan sebutkan nama ananda santri nggih.`;
                }
                if (/bisa\s*apa|menu|bantuan|fitur|cara\s*pakai|panduan|tolong/i.test(text)) {
                    return isGuru
                        ? `Ahlan wa Sahlan, Ustadz/Ustadzah ${guruName || ''}! 🧑‍🏫\n\nSaya adalah *Asisten AI SI-TAQUA*, siap membantu seluruh aktivitas pengajaran dan manajemen santri antum:\n\n📅 *Jadwal Mengajar:* "Kapan jadwal mengajar saya?", "Jadwal hari ini", "Jadwal besok"\n📖 *Data Santri:* "Hafalan [nama]", "Kehadiran [nama]", "Nilai [nama]", "Profil [nama]"\n📋 *Rekap Operasional:* "Siapa yang belum setor hari ini?", "Santri yang sakit hari ini", "Santri yang izin hari ini", "Ranking hafalan", "Total santri aktif"\n🗓️ *Kalender & Libur:* "Kalender akademik", "Kapan libur pondok?"\n🕌 *Info Pondok:* "Jadwal sambangan", "Rekening pondok", "Alamat pondok"\n✍️ *Input Cepat:* "Input hafalan [nama] juz 30 surah An-Naba 1-20 lancar", "Input absensi [nama] sakit"\n\nSilakan ketik pertanyaan atau perintah antum! 🤲`
                        : `Assalamu'alaikum, Ayah/Bunda! 😊 Saya adalah *Asisten AI SI-TAQUA*.\n\nSaya siap membantu Ayah/Bunda memantau ananda di PTQA Batuan:\n\n📖 *Hafalan:* ketik "Hafalan [nama ananda]"\n💰 *SPP & Pembayaran:* ketik "SPP [nama ananda]"\n💳 *Rincian Tagihan:* ketik "Tagihan [nama ananda]"\n✅ *Kehadiran & Sakit:* ketik "Kehadiran [nama ananda]"\n📊 *Nilai Rapor:* ketik "Nilai [nama ananda]"\n📅 *Jadwal Pelajaran:* ketik "Jadwal [nama ananda]"\n🗓️ *Hari Libur:* ketik "Kapan libur pondok?"\n🕌 *Info Sambangan/Kunjungan:* ketik "Jadwal sambangan"\n💳 *Rekening Transfer:* ketik "Nomor rekening SPP"\n📍 *Alamat Pondok:* ketik "Alamat pondok"\n\nSilakan tanyakan apa saja seputar ananda dan pondok nggih! 🤲`;
                }
                return isGuru
                    ? `Nggih Ustadz/Ustadzah. 🧑‍🏫 Ada data jadwal mengajar, presensi santri, atau rekap setoran yang bisa saya bantu carikan saat ini? Silakan ketik kebutuhan antum nggih.`
                    : `Nggih Ayah/Bunda. 😊 Senang bisa menemani Ayah/Bunda. Apakah ada informasi tentang ananda (seperti hafalan, kehadiran, SPP, atau jadwal sambangan) yang ingin dicek hari ini?`;
            }
            default:
                return isGuru
                    ? `Ahlan wa Sahlan, Ustadz/Ustadzah ${guruName || ''}! 🧑‍🏫\n\nSaya adalah *Asisten AI SI-TAQUA*, siap membantu seluruh aktivitas pengajaran dan manajemen santri antum:\n\n📅 *Jadwal Mengajar:* "Kapan jadwal mengajar saya?", "Jadwal hari ini"\n📖 *Data Santri:* "Hafalan Wildan", "Kehadiran Wildan", "Nilai Wildan"\n📋 *Rekapitulasi:* "Siapa yang belum setor hari ini?", "Santri yang sakit hari ini", "Ranking hafalan"\n🗓️ *Kalender:* "Kalender akademik", "Kapan libur pondok?"\n✍️ *Input Cepat:* "Input hafalan Wildan juz 30 surah An-Naba 1-20 lancar"\n\nSilakan ketik kebutuhan antum! 🤲`
                    : `Halo, Assalamu'alaikum! 😊 Saya adalah *Asisten AI SI-TAQUA*.\n\nSaya bisa membantu Ayah/Bunda dengan:\n📖 Cek hafalan santri\n💰 Status pembayaran & tagihan SPP\n✅ Data kehadiran & perizinan santri\n📊 Nilai akademis santri\n📅 Jadwal pelajaran & kalender libur pondok\n🕌 Info sambangan wali santri & rekening pondok\n\nSilakan tanyakan kebutuhan Ayah/Bunda! 🤲`;
        }
    }
    async generateResponse(userPrompt, intent, dbResult, sender, isGuru = false, guruName = '') {
        let reply = '';
        if (this.geminiResponseModel && intent !== 'konfirmasi_ya' && intent !== 'konfirmasi_tidak') {
            try {
                reply = await this.formatResponseWithGemini(userPrompt, intent, dbResult, sender, isGuru, guruName);
            }
            catch (e) {
                this.logger.warn(`[Gemini] Gagal generate response, fallback ke local: ${e.message}`);
                reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender, isGuru, guruName);
            }
        }
        else {
            reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender, isGuru, guruName);
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