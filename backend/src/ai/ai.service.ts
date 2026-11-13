import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType as SchemaType } from '@google/generative-ai';

interface ChatContext {
  lastIntent: string;
  lastSantriName: string;
  history: Array<{ role: 'user' | 'model'; parts: string }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private conversationMemory: Record<string, ChatContext> = {};
  private genAI: GoogleGenerativeAI | null = null;
  private geminiParserModel: any = null;
  private geminiResponseModel: any = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY || '';
    if (geminiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(geminiKey);
        // Parser model: systemInstruction HARUS di getGenerativeModel(), bukan di generateContent()
        this.geminiParserModel = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: 'Kamu adalah parser intent untuk AI Assistant Sistem Manajemen Pondok SI-TAQUA. Analisis pesan pengguna dan panggil salah satu fungsi (Function Calling/Tools) yang sesuai beserta parameternya. Jika pesan adalah sapaan ramah, salam, terima kasih, atau percakapan santai biasa, panggil fungsi chitchat. Jangan pernah mengarang data. Argumen santri_name hanya boleh diisi nama orang aslinya saja, JANGAN sertakan kata sebutan awalan seperti "santri", "siswa", "anak", "atas nama", atau "ananda".',
          tools: [{
            functionDeclarations: [
              {
                name: 'cekTagihan',
                description: 'Mengecek rincian tagihan aktif santri yang belum lunas atau harus dibayar',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri atau nama panggilan santri saja (misal: Wildan)' },
                    bulan: { type: SchemaType.STRING, description: 'Bulan tagihan opsional (misal: Juli)' }
                  }
                }
              },
              {
                name: 'cekPembayaran',
                description: 'Mengecek status pembayaran SPP/biaya santri (lunas maupun belum lunas per bulan)',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri atau nama panggilan santri saja (misal: Wildan)' },
                    bulan: { type: SchemaType.STRING, description: 'Bulan tagihan opsional (misal: Juli)' }
                  }
                }
              },
              {
                name: 'cekHafalan',
                description: 'Mengecek progress atau riwayat setoran hafalan Al-Qur\'an santri (juz, surah, ayat)',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri atau nama panggilan saja (misal: Wildan)' }
                  }
                }
              },
              {
                name: 'cekNilai',
                description: 'Mengecek nilai akademis, raport, atau ujian pelajaran santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri atau nama panggilan saja (misal: Wildan)' }
                  }
                }
              },
              {
                name: 'cekAbsensi',
                description: 'Mengecek data presensi, kehadiran, atau absensi santri (hadir, sakit, izin, atau alfa)',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri atau nama panggilan saja (misal: Wildan)' }
                  }
                }
              },
              {
                name: 'cekSantri',
                description: 'Mengecek detail profil atau informasi pribadi santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' }
                  }
                }
              },

              {
                name: 'cekPrestasi',
                description: 'Mengecek prestasi akademis atau pujian santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' }
                  }
                }
              },
              {
                name: 'cekPerizinan',
                description: 'Mengecek status izin keluar/pulang santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' }
                  }
                }
              },
              {
                name: 'cekBelumSetor',
                description: 'Mengecek daftar santri yang belum menyetorkan hafalan Al-Qur\'an hari ini',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'cekSantriSakit',
                description: 'Mengecek daftar santri yang tercatat sakit hari ini',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'cekSantriIzin',
                description: 'Mengecek daftar santri yang sedang izin keluar atau pulang dari pondok hari ini',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'cekRankingHafalan',
                description: 'Mengecek peringkat atau ranking capaian tahfidz/hafalan santri terbanyak',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'cekRekapTunggakan',
                description: 'Mengecek daftar santri dengan tunggakan pembayaran atau SPP terbesar',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'cekSantriAktif',
                description: 'Mengecek total jumlah santri yang berstatus aktif di pondok',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {}
                }
              },
              {
                name: 'tambahPembayaran',
                description: 'Input atau catat transaksi pembayaran baru untuk santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' },
                    nominal: { type: SchemaType.NUMBER, description: 'Nominal uang pembayaran' },
                    kategori: { type: SchemaType.STRING, description: 'Kategori pembayaran (SPP Bulanan, Uang Makan, Uang Asrama)' }
                  },
                  required: ['santri_name', 'nominal']
                }
              },
              {
                name: 'tambahHafalan',
                description: 'Input setoran hafalan baru santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' },
                    juz: { type: SchemaType.NUMBER, description: 'Nomor juz (1-30)' },
                    surah: { type: SchemaType.STRING, description: 'Nama surah' },
                    ayat_awal: { type: SchemaType.NUMBER, description: 'Nomor ayat mulai' },
                    ayat_akhir: { type: SchemaType.NUMBER, description: 'Nomor ayat selesai (opsional)' }
                  },
                  required: ['santri_name', 'juz', 'surah', 'ayat_awal']
                }
              },
              {
                name: 'tambahAbsensi',
                description: 'Input absensi kehadiran santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' },
                    status: { type: SchemaType.STRING, description: 'Status (hadir, sakit, izin, alpha)' }
                  },
                  required: ['santri_name', 'status']
                }
              },
              {
                name: 'chitchat',
                description: 'Percakapan umum, salam pembuka, sapaan, terima kasih, chitchat, pertanyaan di luar konteks pondok',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    pesan: { type: SchemaType.STRING, description: 'Pesan balasan ramah' }
                  }
                }
              }
            ]
          }]
        });
        // Response formatter model: systemInstruction HARUS di getGenerativeModel()
        this.geminiResponseModel = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: `Kamu adalah AI Assistant Sistem Manajemen Pondok.
Tugasmu hanya menyusun jawaban berdasarkan data yang diberikan backend.
Jangan pernah membuat data sendiri. Jangan pernah menebak. Jangan pernah mengarang.
Jika backend tidak memberikan data maka katakan data tidak ditemukan.
Semua jawaban harus berasal dari database.
Gunakan bahasa yang sopan, Islami, dan ramah.
Gunakan *bold* untuk penegasan. Jangan gunakan markdown lain seperti HTML/backticks.
Jika data kosong atau error, sampaikan dengan jujur. Jangan berhalusinasi.`
        });
        this.logger.log('AiService initialized: Gemini 1.5 Flash Parser & Response mode AKTIF.');
      } catch (e) {
        this.logger.warn('Gemini init gagal, fallback ke Local NLP:', e);
        this.genAI = null;
      }
    } else {
      this.logger.warn('GEMINI_API_KEY tidak ditemukan. Menggunakan Local NLP sebagai fallback.');
    }
  }

  private getContext(sender: string): ChatContext {
    if (!this.conversationMemory[sender]) {
      this.conversationMemory[sender] = {
        lastIntent: 'chitchat',
        lastSantriName: '',
        history: [],
      };
    }
    return this.conversationMemory[sender];
  }

  public setContext(sender: string, intent: string, santriName: string) {
    const context = this.getContext(sender);
    if (intent && intent !== 'chitchat') {
      context.lastIntent = intent;
    }
    if (santriName) {
      context.lastSantriName = santriName;
    }
  }

  private addToHistory(sender: string, role: 'user' | 'model', text: string) {
    const ctx = this.getContext(sender);
    ctx.history.push({ role, parts: text });
    // Keep last 10 turns (20 messages)
    if (ctx.history.length > 20) {
      ctx.history = ctx.history.slice(-20);
    }
  }

  // =====================================================================
  // GEMINI: Parse intent via AI (lebih cerdas)
  // =====================================================================
  private async parseIntentWithGemini(userPrompt: string, sender: string): Promise<any> {
    const ctx = this.getContext(sender);

    if (!this.geminiParserModel) {
      throw new Error('Gemini Parser Model not initialized');
    }

    // Tambahkan konteks santri terakhir ke pesan user agar model aware
    let enrichedPrompt = userPrompt;
    if (ctx.lastSantriName) {
      enrichedPrompt = `[Konteks: nama santri terakhir = "${ctx.lastSantriName}"] ${userPrompt}`;
    }

    // FIX #2: systemInstruction sudah di getGenerativeModel(), jadi generateContent() hanya perlu content
    const response = await this.geminiParserModel.generateContent(enrichedPrompt);

    // FIX #1: functionCalls() adalah METHOD — harus dipanggil dengan tanda kurung ()
    const calls = response.response.functionCalls();
    if (calls && calls.length > 0) {
      const call = calls[0];
      const args = call.args || {};
      const cleanedArgs: any = {};
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

    // FIX #3: Jangan pakai teks bebas Gemini sebagai chitchat — gunakan pesan statis
    this.logger.warn('[Gemini FC] Tidak ada function call terdeteksi, fallback ke chitchat statis.');
    return {
      intent: 'chitchat',
      parameters: {},
    };
  }

  // Helper untuk membersihkan dan memformat nama santri
  private cleanSantriName(raw: string): string {
    if (!raw) return '';
    let name = raw.trim();

    // Hapus awalan sebutan atau kata kerja/tanya yang tidak sengaja tertangkap
    name = name.replace(/^(santri|siswa|anak|ananda|saudara|adek|kakak|atas\s+nama|nama|si|tentang|data|info|cek|lihat|tampilkan|status|rekap|input|tambah|catat)\s+/gi, '').trim();

    // Hapus kata kunci kategori yang mungkin nempel di depan
    name = name.replace(/^(spp|tagihan|pembayaran|biaya|hafalan|nilai|absen|absensi|kehadiran|presensi)\s+/gi, '').trim();

    // Potong jika diikuti kata kunci parameter hafalan/absensi/nilai/keuangan
    const cutoffMatch = name.match(/^(.*?)(?:\s+(?:juz|surah|surat|ayat|sakit|izin|hadir|alfa|alpha|lancar|kurang|nilai|rp|sebesar))\b/i);
    if (cutoffMatch && cutoffMatch[1]) {
      name = cutoffMatch[1].trim();
    }

    // Hapus stopwords di bagian akhir (trailing time/question markers)
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

    if (!name) return '';
    return name
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // =====================================================================
  // LOCAL NLP: Fallback parser (diperbaiki dari versi lama)
  // =====================================================================
  private parseIntentLocal(userPrompt: string, sender: string): any {
    const text = userPrompt.toLowerCase().trim();
    const context = this.getContext(sender);

    const result = {
      intent: 'chitchat',
      parameters: {} as any,
    };

    // 1. Detect Confirmation
    if (/^(ya|benar|betul|ok|oke|yes|sip|lanjut|laksanakan|yoi|heeh|setuju|iya)$/i.test(text)) {
      result.intent = 'konfirmasi_ya';
      return result;
    }
    if (/^(tidak|bukan|salah|batal|jangan|no|cancel|ga|gak|ndak|nggak|enggak)$/i.test(text)) {
      result.intent = 'konfirmasi_tidak';
      return result;
    }

    // 2. Extract Santri Name — ekstraksi nama dengan regex yang lebih cerdas dan fleksibel
    let santriName = '';

    // Pola 1: Konteks kata kunci diikuti nama santri
    const nameMatchWithKeyword = userPrompt.match(
      /(?:santri|nama|untuk|milik|atas\s+nama|spp|pembayaran|biaya|tagihan|tunggakan|perkembangan|jadwal|hafalan|setoran|nilai|rapor|absen|absensi|kehadiran|presensi|prestasi|izin|perizinan|tentang|profil|data\s+kehadiran|data\s+hafalan|data\s+nilai|data\s+tagihan|status\s+spp|status\s+kehadiran|cek\s+kehadiran|cek\s+hafalan|cek\s+nilai|cek\s+tagihan|cek\s+pembayaran)\s+([A-Za-z0-9\s]+)/i
    );
    if (nameMatchWithKeyword && nameMatchWithKeyword[1]) {
      santriName = this.cleanSantriName(nameMatchWithKeyword[1]);
    }

    // Pola 2: Setelah kata kerja / kata tanya
    if (!santriName) {
      const nameAfterVerb = userPrompt.match(
        /(?:cek|lihat|tampilkan|info|data|rekap|status)\s+(?:hafalan\s+|nilai\s+|tagihan\s+|pembayaran\s+|biaya\s+|absen\s+|absensi\s+|kehadiran\s+|presensi\s+|spp\s+|perkembangan\s+){1,3}([A-Za-z0-9\s]+)/i
      );
      if (nameAfterVerb && nameAfterVerb[1]) {
        santriName = this.cleanSantriName(nameAfterVerb[1]);
      }
    }

    // Pola 3: Nama di depan kalimat diikuti kata kunci / pertanyaan
    // Contoh: "wildan kehadiran", "wildan hafalan", "wildan spp", "ahmad wildan sudah bayar?"
    if (!santriName) {
      const nameAtStart = userPrompt.match(
        /^([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\s+(?:apakah|sudah|belum|hadir|masuk|absen|absensi|kehadiran|presensi|hafalan|setoran|nilai|spp|tagihan|pembayaran|biaya|gimana|bagaimana|hari\s+ini|bulan\s+ini)/i
      );
      if (nameAtStart && nameAtStart[1]) {
        santriName = this.cleanSantriName(nameAtStart[1]);
      }
    }

    // Pola 4: Standalone name / jawaban singkat (1-4 kata, tanpa sapaan chitchat)
    // Contoh: "wildan", "ahmad wildan", "wildan ramdlani", "si wildan"
    if (!santriName) {
      const isGreeting = /^(halo|hai|assalamu|assalamualaikum|salam|pagi|siang|sore|malam|terima\s+kasih|makasih|bantuan|menu|help|info)$/i.test(text);
      if (!isGreeting) {
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length >= 1 && words.length <= 4) {
          const isAlphaOnly = words.every(w => /^[a-z0-9]+$/i.test(w));
          if (isAlphaOnly) {
            const cleaned = this.cleanSantriName(userPrompt);
            if (cleaned && cleaned.length >= 2) {
              santriName = cleaned;
            }
          }
        }
      }
    }

    // Referensi ke santri sebelumnya
    if (!santriName && (
      text.includes('dia') || text.includes('kalau') || text.includes('gimana') ||
      text.includes('bagaimana') || text.includes('nominalnya') || text.includes('hafalannya') ||
      text.includes('nilainya') || text.includes('tagihannya') || text.includes('absennya')
    )) {
      santriName = context.lastSantriName;
    }

    if (santriName) {
      result.parameters.santri_name = santriName;
    }

    // 3. Extract Nominal (angka keuangan)
    const nominalMatch = text.replace(/[\s\.]/g, '').match(/(?:rp|nominal|bayar|sebesar|sejumlah)?(\d{4,9})/);
    if (nominalMatch) {
      result.parameters.nominal = parseInt(nominalMatch[1], 10);
    }

    // 4. Extract Juz, Surah, Ayat
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

    // 5. Extract Category Pembayaran
    if (text.includes('spp') || text.includes('bulanan')) {
      result.parameters.kategori = 'SPP Bulanan';
    } else if (text.includes('makan')) {
      result.parameters.kategori = 'Uang Makan';
    } else if (text.includes('asrama')) {
      result.parameters.kategori = 'Uang Asrama';
    }

    // 6. Extract Nilai
    const nilaiMatch = text.match(/(?:nilai|skor|angka)\s*(?:nya|:)?\s*(\d{1,3}(?:[.,]\d+)?)/);
    if (nilaiMatch) {
      result.parameters.nilai = parseFloat(nilaiMatch[1].replace(',', '.'));
    }

    // Ekstraksi status hafalan / absensi jika ada
    if (text.includes('lancar') || text.includes('mutqin')) {
      result.parameters.status = 'Lancar';
    } else if (text.includes('kurang') || text.includes('ulang')) {
      result.parameters.status = 'Kurang Lancar';
    } else if (text.includes('proses') || text.includes('ziyadah')) {
      result.parameters.status = 'Proses';
    } else if (text.includes('sakit')) {
      result.parameters.status = 'sakit';
    } else if (text.includes('izin')) {
      result.parameters.status = 'izin';
    } else if (text.includes('alfa') || text.includes('alpha') || text.includes('bolos')) {
      result.parameters.status = 'alfa';
    } else if (text.includes('hadir') || text.includes('masuk')) {
      result.parameters.status = 'hadir';
    }

    // 7. Detect Intent Kolektif (Rekap Pondok untuk Ustadz/Ustadzah)
    const isBelumSetor = /(belum\s+setor|tidak\s+setor|siapa\s+yang\s+belum\s+setor|santri\s+belum\s+setor)/i.test(text);
    const isSantriSakit = /(santri\s+sakit|siapa\s+(?:yang|saja)\s+sakit|yang\s+sakit\s+hari\s+ini|rekap\s+sakit)/i.test(text);
    const isSantriIzin = /(santri\s+izin|siapa\s+(?:yang|saja)\s+izin|yang\s+izin\s+hari\s+ini|rekap\s+izin|izin\s+keluar|izin\s+pulang)/i.test(text);
    const isRankingHafalan = /(ranking\s+hafalan|peringkat\s+hafalan|top\s+hafalan|hafalan\s+terbanyak|ranking\s+tahfidz|tahfidz\s+terbanyak)/i.test(text);
    const isRekapTunggakan = /(rekap\s+tunggakan|tunggakan.*terbesar|santri\s+belum\s+bayar|rekap\s+belum\s+lunas|daftar\s+tunggakan|rekap.*spp|tunggakan.*spp)/i.test(text);
    const isSantriAktif = /(total\s+santri\s+aktif|jumlah\s+santri\s+aktif|berapa\s+santri\s+aktif|total\s+santri)/i.test(text);

    // Intent Personal Santri
    const isTagihan = /\b(tagihan|tunggakan|belum\s+lunas|harus\s+dibayar|kewajiban|tunggak)\b/i.test(text);
    const isPembayaran = /\b(bayar|lunas|pembayaran|spp|transaksi|kwitansi|bukti\s+bayar|sudah\s+bayar|uang\s+makan|uang\s+gedung)\b/i.test(text);
    const isHafalan = /\b(hafalan|setor|setoran|surah|surat|juz|muroja|muraja|tahfidz|ziyadah)\b/i.test(text);
    const isNilai = /\b(nilai|rapor|raport|ulangan|ujian|uts|uas|tugas|pelajaran|akademis|akademik|skor|mapel)\b/i.test(text);
    const isAbsensi = /\b(hadir|kehadiran|presensi|absen|absensi|masuk|bolos|alfa|alpha|sakit|masuk\s+gak|hadir\s+gak|tidak\s+masuk)\b/i.test(text);
    const isPerizinan = /\b(izin\s+pulang|izin\s+keluar|perizinan|surat\s+izin)\b/i.test(text);
    const isPrestasi = /\b(prestasi|juara|lomba|pujian|penghargaan)\b/i.test(text);
    const isSantri = /\b(profil|biodata|data\s+santri|info\s+santri|tentang\s+santri|kelas|halaqoh)\b/i.test(text);

    if (isBelumSetor) {
      result.intent = 'cekBelumSetor';
    } else if (isSantriSakit) {
      result.intent = 'cekSantriSakit';
    } else if (isSantriIzin) {
      result.intent = 'cekSantriIzin';
    } else if (isRankingHafalan) {
      result.intent = 'cekRankingHafalan';
    } else if (isRekapTunggakan) {
      result.intent = 'cekRekapTunggakan';
    } else if (isSantriAktif) {
      result.intent = 'cekSantriAktif';
    } else if (isTagihan) {
      result.intent = 'cekTagihan';
    } else if (isPembayaran) {
      if (result.parameters.nominal && santriName && (text.includes('input') || text.includes('tambah') || text.includes('bayar') || text.includes('catat'))) {
        result.intent = 'tambahPembayaran';
      } else {
        result.intent = 'cekPembayaran';
      }
    } else if (isPerizinan) {
      result.intent = 'cekPerizinan';
    } else if (isAbsensi) {
      if (text.includes('input') || text.includes('tambah') || text.includes('catat')) {
        result.intent = 'tambahAbsensi';
      } else {
        result.intent = 'cekAbsensi';
      }
    } else if (isHafalan) {
      if ((text.includes('setor') || text.includes('input') || text.includes('tambah') || text.includes('catat')) && (result.parameters.surah || result.parameters.juz)) {
        result.intent = 'tambahHafalan';
      } else {
        result.intent = 'cekHafalan';
      }
    } else if (isNilai) {
      if (text.includes('input') || text.includes('tambah') || text.includes('simpan') || text.includes('catat')) {
        result.intent = 'tambahNilai';
      } else {
        result.intent = 'cekNilai';
      }
    } else if (isPrestasi) {
      result.intent = 'cekPrestasi';
    } else if (isSantri) {
      result.intent = 'cekSantri';
    } else if (text.includes('pelanggaran') || text.includes('melanggar') || text.includes('hukuman')) {
      result.intent = 'tambahPelanggaran';
    } else if (santriName) {
      // Jika user hanya menuliskan nama santri (misal: "Wildan"), lanjutkan intent sebelumnya!
      if (context.lastIntent && context.lastIntent !== 'chitchat') {
        result.intent = context.lastIntent;
      } else {
        result.intent = 'cekSantri';
      }
    }

    this.setContext(sender, result.intent, santriName);
    return result;
  }

  // =====================================================================
  // PUBLIC: Parse intent (coba Gemini dulu, fallback local NLP)
  // =====================================================================
  async parseIntent(userPrompt: string, sender: string): Promise<any> {
    this.addToHistory(sender, 'user', userPrompt);

    if (this.geminiParserModel) {
      try {
        const result = await this.parseIntentWithGemini(userPrompt, sender);
        // Jika Gemini berhasil mendeteksi intent spesifik (bukan chitchat), gunakan hasil Gemini
        if (result && result.intent && result.intent !== 'chitchat') {
          const santriName = result.parameters?.santri_name || '';
          this.setContext(sender, result.intent, santriName);
          this.logger.log(`[Gemini] Intent: ${result.intent}, Santri: ${santriName}`);
          return result;
        }
      } catch (e) {
        this.logger.warn(`[Gemini] Gagal parse intent, fallback ke local NLP: ${e.message}`);
      }
    }

    // Jika Gemini mengembalikan chitchat atau gagal, uji dengan local NLP
    const localResult = this.parseIntentLocal(userPrompt, sender);
    if (localResult && localResult.intent !== 'chitchat') {
      this.logger.log(`[Local NLP Override] Intent: ${localResult.intent}, Params: ${JSON.stringify(localResult.parameters)}`);
      return localResult;
    }

    this.logger.log(`[Local NLP] Intent: ${localResult.intent}, Params: ${JSON.stringify(localResult.parameters)}`);
    return localResult;
  }

  // =====================================================================
  // GEMINI: Format response cerdas berbasis data
  // =====================================================================
  private async formatResponseWithGemini(
    userPrompt: string,
    intent: string,
    dbResult: any,
    sender: string,
    isGuru: boolean = false,
    guruName: string = ''
  ): Promise<string> {
    const ctx = this.getContext(sender);
    const santriName = ctx.lastSantriName || '';

    // Siapkan konteks data untuk Gemini
    let dataContext = '';
    if (dbResult && !dbResult.error) {
      dataContext = `\nData dari database:\n${JSON.stringify(dbResult, null, 2)}`;
    } else if (dbResult?.error) {
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
   - Jika intent cekTagihan: fokuskan pada tagihan yang BELUM LUNAS dan sebutkan total yang harus dibayar.
2. Jika tentang kehadiran/absensi:
   - Jelaskan kehadiran hari ini (jika ada catatan hari ini) dan rangkum total hadir, sakit, izin, alfa.
3. Jika tentang hafalan:
   - Sebutkan setoran terakhir (surah, juz, ayat, dan tanggal) serta riwayat sebelumnya.
4. Jika tentang nilai:
   - Sebutkan mata pelajaran, nilai tugas, UTS, UAS, dan nilai akhir.
5. Jika rekap kolektif (belum setor, santri sakit, ranking):
   - Sajikan dalam bentuk daftar nomor urut yang rapi dan ringkas.
${dataContext}`;

    const response = await this.geminiResponseModel.generateContent(promptText);
    return response.response.text().trim();
  }

  // =====================================================================
  // LOCAL: Generate response (fallback, diperbaiki & dilengkapi)
  // =====================================================================
  private generateResponseLocal(
    userPrompt: string,
    intent: string,
    dbResult: any,
    sender: string,
    isGuru: boolean = false,
    guruName: string = ''
  ): string {
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
    const formatPeriodeBulan = (jatuhTempo: string, ket?: string) => {
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
          if (m >= 0 && m < 12) return `${bulanIndo[m]} ${parts[0]}`;
        }
      }
      return 'Bulan Berjalan';
    };
    const formatTanggalIndo = (tgl: string) => {
      if (!tgl) return '-';
      try {
        const d = new Date(tgl);
        if (isNaN(d.getTime())) return tgl;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch {
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

        bills.forEach((t: any) => {
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
          } else {
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
        } else {
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
        const unpaidBills = bills.filter((t: any) => String(t.status).toLowerCase() !== 'lunas');

        if (unpaidBills.length === 0) {
          return `${getGreeting()}\n\nAlhamdulillah! 🌟 Seluruh tagihan untuk nanda *${santriName}* sudah *Lunas*. Tidak ada tagihan yang harus dibayar saat ini. Jazakumullah khairan. 🤲${getClosing()}`;
        }

        let tagText = `${getGreeting()}\n\nBerikut rincian *tagihan aktif / belum lunas* nanda *${santriName}*:\n\n`;
        let totalUnpaid = 0;

        unpaidBills.forEach((t: any, idx: number) => {
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
          records.slice(1, 4).forEach((h: any) => {
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

        records.forEach((n: any) => {
          const mapel = n.mapel?.nama || n.nama_mapel || n.kategori || 'Mata Pelajaran';
          const semNama = n.semester?.nama || n.semester || '';
          const sem = semNama ? `Semester ${semNama}` : '';
          const ta = n.tahun_ajaran ? `TA ${n.tahun_ajaran}` : '';
          const jenis = n.jenis_ujian ? `[${String(n.jenis_ujian).toUpperCase()}]` : '';
          const header = [mapel, jenis, sem, ta].filter(Boolean).join(' - ');

          nilText += `📚 *${header}*\n`;
          if (n.nilai_tugas !== null && n.nilai_tugas !== undefined) nilText += `  • Tugas: *${n.nilai_tugas}*\n`;
          if (n.nilai_uts !== null && n.nilai_uts !== undefined) nilText += `  • UTS: *${n.nilai_uts}*\n`;
          if (n.nilai_uas !== null && n.nilai_uas !== undefined) nilText += `  • UAS: *${n.nilai_uas}*\n`;
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
        const hadir = records.filter((p: any) => String(p.status).toLowerCase() === 'hadir').length;
        const sakit = records.filter((p: any) => String(p.status).toLowerCase() === 'sakit').length;
        const izin = records.filter((p: any) => String(p.status).toLowerCase() === 'izin').length;
        const alpha = records.filter((p: any) => ['alfa', 'alpha'].includes(String(p.status).toLowerCase())).length;

        // Cek catatan hari ini (WIB / UTC+7)
        const todayStr = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
        const todayRec = records.find((p: any) => p.tanggal && String(p.tanggal).startsWith(todayStr));

        let absText = `${getGreeting()}\n\nBerikut rekap *kehadiran / absensi* nanda *${santriName}*:\n\n`;

        if (todayRec) {
          const statusToday = String(todayRec.status).toUpperCase();
          const iconToday = statusToday === 'HADIR' ? '✅' : statusToday === 'SAKIT' ? '🏥' : statusToday === 'IZIN' ? '🏠' : '❌';
          absText += `📌 *Kehadiran Hari Ini*: ${iconToday} *${statusToday}*\n\n`;
        } else {
          absText += `📌 *Kehadiran Hari Ini*: Belum ada sesi absensi tercatat hari ini.\n\n`;
        }

        absText += `📊 *Ringkasan Kehadiran:*\n`;
        absText += `• ✅ Hadir: *${hadir}* kali\n`;
        absText += `• 🏥 Sakit: *${sakit}* kali\n`;
        absText += `• 🏠 Izin: *${izin}* kali\n`;
        absText += `• ❌ Alpha: *${alpha}* kali\n`;
        absText += `• Total Sesi: *${total}* hari\n\n`;

        absText += `📋 *3 Catatan Terakhir:*\n`;
        records.slice(0, 3).forEach((p: any) => {
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
        if (s.kelas?.nama) sText += `📚 Kelas: *${s.kelas.nama}*\n`;
        sText += getClosing();
        return sText;
      }

      case 'cekPrestasi':
        if (!dbResult || dbResult.length === 0) {
          return `${getGreeting()}\n\nBelum ada catatan prestasi yang terdata untuk nanda *${santriName}*.${getClosing()}`;
        }
        let presText = `🏆 *Catatan Prestasi*\nNanda *${santriName}*:\n\n`;
        (Array.isArray(dbResult) ? dbResult : [dbResult]).forEach((p: any, idx: number) => {
          presText += `${idx + 1}. *${p.nama_prestasi || p.judul || 'Prestasi'}* (${p.tingkat || 'Pondok'})\n`;
        });
        return presText + getClosing();

      case 'cekPerizinan':
        if (!dbResult || dbResult.length === 0) {
          return `${getGreeting()}\n\nTidak ada riwayat perizinan aktif untuk nanda *${santriName}*.${getClosing()}`;
        }
        let izinSantriText = `📝 *Riwayat Perizinan*\nNanda *${santriName}*:\n\n`;
        (Array.isArray(dbResult) ? dbResult : [dbResult]).slice(0, 5).forEach((iz: any, idx: number) => {
          izinSantriText += `${idx + 1}. *${iz.keperluan || iz.alasan || 'Izin'}* (${iz.status || 'Selesai'})\n`;
        });
        return izinSantriText + getClosing();

      case 'cekBelumSetor':
      case 'get_tidak_setor_today': {
        if (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0)) {
          return `${getGreeting()}\n\nAlhamdulillah! 🌟 Hari ini *seluruh santri aktif* sudah menyelesaikan setoran hafalannya. Luar biasa! 🎉${getClosing()}`;
        }
        const students = Array.isArray(dbResult) ? dbResult : [dbResult];
        let noSetorText = `${getGreeting()}\n\n📋 *Daftar Santri Belum Setor Hafalan Hari Ini:*\nTotal: *${students.length} santri*\n\n`;
        students.slice(0, 15).forEach((s: any, idx: number) => {
          const kelasData = s.kelas as any;
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
        records.forEach((r: any, idx: number) => {
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
        records.forEach((r: any, idx: number) => {
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
        ranking.forEach((r: any, idx: number) => {
          const m = medals[idx] || `${idx + 1}.`;
          const kls = r.kelas && r.kelas !== '-' ? ` (${r.kelas})` : '';
          topText += `${m} *${r.nama}*${kls}\n   • Capaian: *Juz ${r.maxJuz || '-'}* (${r.totalSetoran || 0} kali setoran)\n`;
        });
        topText += `\nMasya Allah, semoga barokah dan memotivasi santri lainnya. 🌟`;
        return topText;
      }

      case 'get_pemasukan_bulan':
        if (!dbResult) return `Data keuangan tidak tersedia saat ini.`;
        return `💰 *Laporan Pemasukan Bulan Ini*\nPTQ Al-Usymuni Batuan:\n\n` +
          `- Pembayaran Santri: *Rp${Number(dbResult.pembayaran_santri).toLocaleString('id-ID')}*\n` +
          `- Kas Masuk Lain: *Rp${Number(dbResult.kas_pemasukan).toLocaleString('id-ID')}*\n\n` +
          `*Total: Rp${Number(dbResult.total).toLocaleString('id-ID')}*\n\n` +
          `Alhamdulillah, semoga berkah dan cukup untuk operasional pondok. 🤲`;

      case 'get_presence_today':
        if (!dbResult) return `Data absensi tidak tersedia.`;
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
        dbResult.slice(0, 5).forEach((item: any, idx: number) => {
          izinText += `${idx + 1}. *${item.nama}* — *${item.count}* kali izin\n`;
        });
        return izinText;

      case 'get_perkembangan_summary':
        let sumText = `${getGreeting()}\n\nBerikut ringkasan perkembangan nanda *${santriName}* sebulan terakhir:\n\n`;
        if (dbResult.hafalan && dbResult.hafalan.length > 0) {
          sumText += `📖 *Hafalan*: Setoran terbaru Juz ${dbResult.hafalan[0].juz} Surah ${dbResult.hafalan[0].surah} (${dbResult.hafalan[0].status})\n\n`;
        } else {
          sumText += `📖 *Hafalan*: Belum ada setoran terbaru bulan ini\n\n`;
        }
        if (dbResult.nilai && dbResult.nilai.length > 0) {
          const avg = dbResult.nilai.reduce((acc: number, cur: any) => acc + Number(cur.nilai_akhir || 0), 0) / dbResult.nilai.length;
          sumText += `📊 *Akademis*: Rata-rata nilai *${avg.toFixed(1)}* dari ${dbResult.nilai.length} mapel\n\n`;
        } else {
          sumText += `📊 *Akademis*: Belum ada laporan nilai\n\n`;
        }
        if (dbResult.presensi && dbResult.presensi.length > 0) {
          const totalDays = dbResult.presensi.length;
          const hadirDays = dbResult.presensi.filter((p: any) => p.status?.toLowerCase() === 'hadir').length;
          sumText += `✅ *Kehadiran*: ${hadirDays} dari ${totalDays} hari (${((hadirDays / totalDays) * 100).toFixed(0)}%)`;
        } else {
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
        items.slice(0, 10).forEach((item: any, idx: number) => {
          tunggakanText += `${idx + 1}. *${item.nama}*: Rp${Number(item.total).toLocaleString('id-ID')}\n`;
        });
        tunggakanText += getClosing();
        return tunggakanText;
      }

      case 'get_pemasukan_perbandingan':
        if (!dbResult) return `Data perbandingan tidak tersedia.`;
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
        dbResult.forEach((g: any, idx: number) => {
          guruText += `${idx + 1}. *${g.nama}*${g.nip ? ` (NIP: ${g.nip})` : ''}\n`;
        });
        return guruText;

      case 'cekSantriAktif':
      case 'get_jumlah_santri_aktif': {
        const total = typeof dbResult === 'number' ? dbResult : (dbResult?.jumlah_santri_aktif || dbResult?.total || 0);
        return `${getGreeting()}\n\n👥 Total santri *Aktif* di PTQ Al-Usymuni Batuan saat ini: *${total}* santri.${getClosing()}`;
      }

      default:
        return isGuru
          ? `Ahlan wa Sahlan, Ustadz/Ustadzah ${guruName || ''}! 🧑‍🏫\n\nSaya adalah *Asisten AI SI-TAQUA*, siap membantu aktivitas pengajaran dan pemantauan santri:\n📖 *Cek Perkembangan Santri:* "Hafalan Wildan", "Kehadiran Wildan", "Nilai Wildan"\n📋 *Rekapitulasi Santri:* "Siapa yang belum setor hari ini?", "Santri yang sakit hari ini", "Ranking hafalan"\n✍️ *Input Cepat:* "Input hafalan Wildan juz 30 surah An-Naba 1-20 lancar", "Input absensi Wildan sakit"\n\nSilakan ketik kebutuhan antum! 🤲`
          : `Halo, Assalamu'alaikum! 😊 Saya adalah *Asisten AI SI-TAQUA*.\n\nSaya bisa membantu Anda dengan:\n📖 Cek hafalan santri\n💰 Status pembayaran SPP\n📊 Nilai akademis\n✅ Data kehadiran\n💳 Rincian tagihan\n\nSilakan tanyakan kebutuhan Anda! 🤲`;
    }
  }

  // =====================================================================
  // PUBLIC: Generate response (coba Gemini dulu, fallback local)
  // =====================================================================
  async generateResponse(
    userPrompt: string,
    intent: string,
    dbResult: any,
    sender: string,
    isGuru: boolean = false,
    guruName: string = ''
  ): Promise<string> {
    let reply = '';

    if (this.geminiResponseModel && intent !== 'konfirmasi_ya' && intent !== 'konfirmasi_tidak') {
      try {
        reply = await this.formatResponseWithGemini(userPrompt, intent, dbResult, sender, isGuru, guruName);
      } catch (e) {
        this.logger.warn(`[Gemini] Gagal generate response, fallback ke local: ${e.message}`);
        reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender, isGuru, guruName);
      }
    } else {
      reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender, isGuru, guruName);
    }

    // Simpan ke history
    this.addToHistory(sender, 'model', reply.substring(0, 300));
    return reply;
  }
}
