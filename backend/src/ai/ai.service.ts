import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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
    const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyADWtSmMkfPKwcEnkUMEB0iNEPRbNcpCV4';
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
                name: 'cekPembayaran',
                description: 'Mengecek status tagihan atau pembayaran SPP/uang makan/asrama santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja (tanpa kata tanya/kata kerja)' },
                    bulan: { type: SchemaType.STRING, description: 'Bulan tagihan (misal: Juli atau bulan ini)' }
                  }
                }
              },
              {
                name: 'cekHafalan',
                description: 'Mengecek progress atau riwayat setoran hafalan santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' }
                  }
                }
              },
              {
                name: 'cekNilai',
                description: 'Mengecek nilai akademis atau pelajaran santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' }
                  }
                }
              },
              {
                name: 'cekAbsensi',
                description: 'Mengecek rekap kehadiran atau absensi santri',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    santri_name: { type: SchemaType.STRING, description: 'Nama santri saja' }
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
                name: 'cekTagihan',
                description: 'Mengecek rincian tagihan aktif santri',
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

  private setContext(sender: string, intent: string, santriName: string) {
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

    // 2. Extract Santri Name — FIX: sekarang nameMatch benar-benar digunakan
    let santriName = '';

    // Coba regex dengan konteks kata kunci (case insensitive)
    const nameMatchWithKeyword = userPrompt.match(
      /(?:santri|nama|untuk|milik|atas\s+nama|spp|perkembangan|jadwal|hafalan|nilai|absen|tagihan)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)*)/i
    );
    if (nameMatchWithKeyword && nameMatchWithKeyword[1]) {
      santriName = nameMatchWithKeyword[1]
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    // Fallback: cari nama setelah "cek", "lihat", "tampilkan", "siapa" + kata benda
    if (!santriName) {
      const nameAfterVerb = userPrompt.match(
        /(?:cek|lihat|tampilkan|info|data|rekap)\s+(?:hafalan|nilai|tagihan|pembayaran|absen|spp|perkembangan)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)*)/i
      );
      if (nameAfterVerb && nameAfterVerb[1]) {
        santriName = nameAfterVerb[1]
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
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
      // Hapus awalan sebutan yang sering tidak sengaja tertangkap regex
      santriName = santriName.replace(/^(santri|siswa|anak|ananda|saudara|adek|kakak|atas nama)\s+/i, '').trim();
      result.parameters.santri_name = santriName;
    }

    // 3. Extract Nominal (angka keuangan)
    const nominalMatch = text.replace(/[\s\.]/g, '').match(/(?:rp|nominal|bayar|sebesar|sejumlah)?(\d{4,9})/);
    if (nominalMatch) {
      result.parameters.nominal = parseInt(nominalMatch[1], 10);
    }

    // 4. Extract Juz, Surah, Ayat
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

    // 7. Detect Intent
    const keywords = {
      pembayaran: ['bayar', 'lunas', 'pembayaran', 'spp', 'tagihan', 'tunggakan'],
      hafalan: ['hafalan', 'setor', 'surah', 'juz', 'muroja', 'muraja'],
      nilai: ['nilai', 'rapor', 'ulangan', 'ujian', 'uts', 'uas', 'tugas', 'pelajaran', 'akademis', 'akademik'],
      absensi: ['hadir', 'kehadiran', 'presensi', 'absen', 'izin', 'sakit', 'alfa', 'alpha'],
      keuangan: ['pemasukan', 'kas', 'keuangan', 'pendapatan'],
    };

    // FIX #4: Gunakan intent baru (cekPembayaran, cekHafalan, dll.) agar cocok dengan switch-case di webhook
    if (keywords.pembayaran.some(k => text.includes(k))) {
      if (result.parameters.nominal && santriName && (text.includes('input') || text.includes('tambah') || text.includes('bayar') || text.includes('catat'))) {
        result.intent = 'tambahPembayaran';
      } else {
        result.intent = 'cekPembayaran';
      }
    } else if (keywords.hafalan.some(k => text.includes(k))) {
      if ((text.includes('setor') || text.includes('input') || text.includes('tambah') || text.includes('catat')) && result.parameters.surah && result.parameters.juz) {
        result.intent = 'tambahHafalan';
      } else {
        result.intent = 'cekHafalan';
      }
    } else if (keywords.nilai.some(k => text.includes(k))) {
      if (text.includes('input') || text.includes('tambah') || text.includes('simpan') || text.includes('catat')) {
        result.intent = 'tambahNilai';
      } else {
        result.intent = 'cekNilai';
      }
    } else if (keywords.absensi.some(k => text.includes(k))) {
      if (text.includes('input') || text.includes('tambah') || text.includes('catat')) {
        result.intent = 'tambahAbsensi';
      } else {
        result.intent = 'cekAbsensi';
      }
    } else if (text.includes('pelanggaran') || text.includes('melanggar') || text.includes('hukuman')) {
      result.intent = 'tambahPelanggaran';
    } else if (text.includes('prestasi') || text.includes('juara') || text.includes('pujian')) {
      result.intent = 'cekPrestasi';
    } else if (text.includes('izin') || text.includes('perizinan')) {
      result.intent = 'cekPerizinan';
    } else if (text.includes('santri') && (text.includes('profil') || text.includes('data') || text.includes('info'))) {
      result.intent = 'cekSantri';
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
        // Sync context dari Gemini result
        const santriName = result.parameters?.santri_name || '';
        this.setContext(sender, result.intent, santriName);
        this.logger.log(`[Gemini] Intent: ${result.intent}, Santri: ${santriName}`);
        return result;
      } catch (e) {
        this.logger.warn(`[Gemini] Gagal parse intent, fallback ke local NLP: ${e.message}`);
      }
    }

    // Fallback: local NLP
    const result = this.parseIntentLocal(userPrompt, sender);
    this.logger.log(`[Local NLP] Intent: ${result.intent}, Params: ${JSON.stringify(result.parameters)}`);
    return result;
  }

  // =====================================================================
  // GEMINI: Format response cerdas berbasis data
  // =====================================================================
  private async formatResponseWithGemini(
    userPrompt: string,
    intent: string,
    dbResult: any,
    sender: string
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

    // FIX #2: systemInstruction sudah di getGenerativeModel(), cukup kirim content saja
    const promptText = `Pesan user: "${userPrompt}"
Nama santri konteks: ${santriName || 'tidak ada'}
Fungsi dijalankan: ${intent}
${dataContext}`;

    const response = await this.geminiResponseModel.generateContent(promptText);
    return response.response.text().trim();
  }

  // =====================================================================
  // LOCAL: Generate response (fallback, diperbaiki & dilengkapi)
  // =====================================================================
  private generateResponseLocal(userPrompt: string, intent: string, dbResult: any, sender: string): string {
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
        dbResult.forEach((t: any) => {
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
        dbResult.slice(0, 5).forEach((h: any) => {
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
        dbResult.forEach((n: any) => {
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
        dbResult.forEach((s: any, idx: number) => {
          noSetorText += `${idx + 1}. *${s.nama}*\n`;
        });
        noSetorText += `\nMohon dipantau dan dimotivasi nggih. Jazakumullah khairan. 🙏`;
        return noSetorText;

      case 'get_top_10_hafalan':
        if (!dbResult || dbResult.length === 0) {
          return `Belum ada data hafalan yang cukup untuk menampilkan ranking.`;
        }
        let topText = `🏆 *Top Santri Hafalan Terbanyak*\nPTQ Al-Usymuni Batuan:\n\n`;
        dbResult.slice(0, 10).forEach((item: any, idx: number) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          topText += `${medal} *${item.nama}* — Juz *${item.maxJuz}*\n`;
        });
        topText += `\nMasya Allah, semoga terus istiqomah dan berkah hafalannya. 🌙`;
        return topText;

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

      case 'get_tunggakan_terbesar':
        if (!dbResult || dbResult.length === 0) {
          return `Alhamdulillah! Tidak ada santri yang memiliki tunggakan pembayaran. 🎉`;
        }
        let tunggakanText = `💳 *Santri dengan Tunggakan Terbesar*\n\n`;
        dbResult.slice(0, 10).forEach((item: any, idx: number) => {
          tunggakanText += `${idx + 1}. *${item.nama}*: Rp${Number(item.total).toLocaleString('id-ID')}\n`;
        });
        return tunggakanText;

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

      case 'get_jumlah_santri_aktif':
        return `👥 Total santri *Aktif* di PTQ Al-Usymuni Batuan saat ini: *${dbResult.jumlah_santri_aktif}* santri.`;

      default:
        return `Halo, Assalamu'alaikum! 😊 Saya adalah *Asisten AI SI-TAQUA*.\n\nSaya bisa membantu Anda dengan:\n📖 Cek hafalan santri\n💰 Status pembayaran SPP\n📊 Nilai akademis\n✅ Data kehadiran\n💳 Laporan keuangan\n\nSilakan tanyakan kebutuhan Anda!`;
    }
  }

  // =====================================================================
  // PUBLIC: Generate response (coba Gemini dulu, fallback local)
  // =====================================================================
  async generateResponse(userPrompt: string, intent: string, dbResult: any, sender: string): Promise<string> {
    let reply = '';

    if (this.geminiResponseModel && intent !== 'konfirmasi_ya' && intent !== 'konfirmasi_tidak') {
      try {
        reply = await this.formatResponseWithGemini(userPrompt, intent, dbResult, sender);
      } catch (e) {
        this.logger.warn(`[Gemini] Gagal generate response, fallback ke local: ${e.message}`);
        reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender);
      }
    } else {
      reply = this.generateResponseLocal(userPrompt, intent, dbResult, sender);
    }

    // Simpan ke history
    this.addToHistory(sender, 'model', reply.substring(0, 300));
    return reply;
  }
}
