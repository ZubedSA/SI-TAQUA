import { Controller, Post, Get, Body, Res, HttpStatus, Logger, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { AiService } from '../ai/ai.service';

interface PendingAction {
  intent: string;
  parameters: any;
  timestamp: number;
}

// Alias konfirmasi YA dan TIDAK yang dikenali (case-insensitive, normalized)
const CONFIRM_YES = new Set(['YA', 'BENAR', 'BETUL', 'OK', 'OKE', 'YES', 'SIP', 'LANJUT', 'YOI', 'HEEH', 'SETUJU', 'IYA', 'LAKSANAKAN', 'KONFIRMASI']);
const CONFIRM_NO  = new Set(['TIDAK', 'BUKAN', 'SALAH', 'BATAL', 'JANGAN', 'NO', 'CANCEL', 'GA', 'GAK', 'NDAK', 'NGGAK', 'ENGGAK', 'STOP']);

@Controller()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  // In-memory store untuk pending confirmations (keyed by phone number)
  private pendingActions: Record<string, PendingAction> = {};

  // In-memory store untuk melacak message ID demi mencegah duplikasi akibat retry
  private processedMessages = new Map<string, { status: 'in_progress' | 'completed'; timestamp: number }>();

  // Cache untuk menyimpan teks pesan yang baru saja dikirim oleh bot (untuk anti-loop pada self-chat)
  private sentMessages = new Map<string, number>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
  ) {}

  // Helper untuk menormalisasi teks (menghilangkan spasi berlebih, signature Fonnte, dan case-insensitive)
  private normalizeText(txt: string): string {
    let clean = txt.trim();
    // Hapus signature Fonnte jika ada (contoh: > _Sent via fonnte.com_)
    clean = clean.replace(/>\s*_?Sent\s+via\s+fonnte\.com_?/i, '');
    return clean.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  // Helper untuk membandingkan nomor telepon secara aman (mengabaikan perbedaan format)
  private isSamePhone(phone1: string, phone2: string): boolean {
    const clean1 = phone1.replace(/\D/g, '');
    const clean2 = phone2.replace(/\D/g, '');
    if (!clean1 || !clean2) return false;
    if (clean1.length >= 9 && clean2.length >= 9) {
      return clean1.slice(-9) === clean2.slice(-9);
    }
    return clean1 === clean2;
  }

  // Memeriksa apakah teks pesan dikirim oleh bot sendiri dalam 2 menit terakhir
  private isBotSentMessage(text: string): boolean {
    const norm = this.normalizeText(text);
    const timestamp = this.sentMessages.get(norm);
    if (!timestamp) return false;
    if (Date.now() - timestamp < 2 * 60 * 1000) {
      return true;
    }
    this.sentMessages.delete(norm);
    return false;
  }

  // Helper untuk memproses hasil pencarian nama santri (klarifikasi jika ganda, atau return target tunggal)
  private handleSantriMatches(matches: any[], searchName: string): { target: any; clarification?: string } {
    if (!matches || matches.length === 0) {
      return { target: null };
    }
    
    if (matches.length === 1) {
      return { target: matches[0] };
    }

    // Cek jika ada nama yang sama persis (case-insensitive)
    const exactMatch = matches.find(s => s.nama.toLowerCase() === searchName.toLowerCase());
    if (exactMatch) {
      return { target: exactMatch };
    }

    // Jika lebih dari 1, buat teks klarifikasi ganda
    let clarificationText = `Saya menemukan beberapa santri dengan nama *"${searchName}"*:\n\n`;
    matches.slice(0, 5).forEach((s, idx) => {
      clarificationText += `${idx + 1}. *${s.nama}* (NIS: ${s.nis})\n`;
    });
    if (matches.length > 5) {
      clarificationText += `...dan ${matches.length - 5} santri lainnya.\n`;
    }
    clarificationText += `\nMohon tuliskan kembali nama santri dengan lebih lengkap atau spesifik ya. 😊`;

    return { target: null, clarification: clarificationText };
  }

  // Bersihkan pending actions yang sudah expired (>10 menit)
  private cleanupExpiredPending() {
    const now = Date.now();
    for (const [sender, action] of Object.entries(this.pendingActions)) {
      if (now - action.timestamp > 10 * 60 * 1000) {
        delete this.pendingActions[sender];
      }
    }
  }

  // Bersihkan message ID yang sudah expired (>10 menit)
  private cleanupExpiredProcessed() {
    const now = Date.now();
    for (const [msgId, item] of this.processedMessages.entries()) {
      if (now - item.timestamp > 10 * 60 * 1000) {
        this.processedMessages.delete(msgId);
      }
    }
  }

  // Bersihkan cache pesan terkirim yang sudah expired (>2 menit)
  private cleanupExpiredSentMessages() {
    const now = Date.now();
    for (const [text, timestamp] of this.sentMessages.entries()) {
      if (now - timestamp > 2 * 60 * 1000) {
        this.sentMessages.delete(text);
      }
    }
  }

  // =====================================================================
  // Helper: Kirim pesan via Fonnte (optimized untuk Vercel serverless)
  // =====================================================================
  private async sendFonnteMessage(target: string, message: string) {
    // Catat pesan yang dikirim oleh bot untuk mendeteksi loop saat self-chat
    this.sentMessages.set(this.normalizeText(message), Date.now());

    // Gunakan fallback hardcoded agar tetap berjalan di Vercel serverless
    const token = process.env.FONNTE_TOKEN || 'M77WadPpCFgeAaLWS67Z';

    const formData = new URLSearchParams();
    formData.append('target', target);
    formData.append('message', message);

    try {
      this.logger.log(`Mengirim WA ke ${target}...`);
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(8000), // 8 detik timeout agar muat di Vercel
      });
      const resData = await response.json();
      this.logger.log(`Fonnte Response: ${JSON.stringify(resData)}`);
    } catch (e) {
      this.logger.error(`Gagal kirim WA ke ${target}: ${e.message || e}`);
    }
  }

  // =====================================================================
  // Helper: Balas user — KIRIM WA DULU, BARU return response
  // Di Vercel serverless, fungsi mati setelah res.json() dikembalikan,
  // jadi SEMUA async work harus selesai SEBELUM response dikirim.
  // =====================================================================
  private async replyToUser(res: Response, target: string, text: string, messageId?: string) {
    if (messageId) {
      this.processedMessages.set(messageId, { status: 'completed', timestamp: Date.now() });
    }
    // WAJIB await! Jangan fire-and-forget di serverless!
    await this.sendFonnteMessage(target, text);
    return res.status(HttpStatus.OK).json({ reply: text });
  }

  @Get('webhook/debug-logs')
  async getDebugLogs(@Res() res: Response) {
    try {
      const { data, error } = await this.supabaseService.getRecentWebhookLogs();
      if (error) throw error;
      return res.status(HttpStatus.OK).json(data);
    } catch (err) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
    }
  }

  @Get('webhook/debug-db')
  async getDebugDb(@Res() res: Response) {
    try {
      const data = await this.supabaseService.getDebugDbData();
      return res.status(HttpStatus.OK).json(data);
    } catch (err) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
    }
  }

  // =====================================================================
  // POST /webhook — Main entry point
  // =====================================================================
  @Post('webhook')
  @Post()
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    let sender = '';
    let message = '';
    let messageId = '';

    try {
      // Bersihkan data expired
      this.cleanupExpiredPending();
      this.cleanupExpiredProcessed();
      this.cleanupExpiredSentMessages();

      const body = req.body || {};
      const query = req.query || {};

      // Catat payload masuk untuk didebug
      await this.supabaseService.logWebhookPayload(body, query);

      // 1. Deteksi dan abaikan status update dari Fonnte (karena tidak berisi pesan masuk baru)
      if (body.status || body.state || body.stateid) {
        this.logger.log(`Mengabaikan status update webhook: ID=${body.id || 'N/A'}, Status=${body.status || body.state}`);
        return res.status(HttpStatus.OK).json({ status: 'ignored_status_update' });
      }

      sender = body.sender || query.sender || body.from || query.from || '';
      message = body.message || query.message || body.text || query.text || '';
      const device = body.device || query.device || '';
      const member = body.member || query.member || '';
      messageId = body.id || body.inboxid || query.id || query.inboxid || '';

      this.logger.log(`Webhook: Sender="${sender}", Device="${device}", Member="${member}", MessageId="${messageId}", Message="${message}"`);

      if (!sender) {
        this.logger.warn('Sender tidak ditemukan di request.');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing sender' });
      }

      // 2. Abaikan jika pengirim adalah device itu sendiri DAN pesan tersebut adalah pesan yang dikirim oleh bot (anti-loop)
      // Ini memungkinkan user melakukan self-chat (kirim pesan ke diri sendiri) untuk testing,
      // tapi tetap memblokir jika webhook menerima pesan balasan yang diposting oleh bot.
      if (device && (this.isSamePhone(sender, device) || (member && this.isSamePhone(member, device)))) {
        if (this.isBotSentMessage(message)) {
          this.logger.log(`Mengabaikan pesan keluar dari device sendiri (${device}) untuk menghindari loop.`);
          return res.status(HttpStatus.OK).json({ status: 'ignored_self_message' });
        }
      }

      // 3. Cek idempotensi (duplikasi akibat retry Fonnte)
      if (messageId) {
        // Cek in-memory first (fast path)
        const existing = this.processedMessages.get(messageId);
        if (existing) {
          this.logger.log(`Pesan dengan ID ${messageId} sedang/sudah diproses secara in-memory (${existing.status}). Mengabaikan duplikasi.`);
          return res.status(HttpStatus.OK).json({ status: 'duplicate_ignored', original_status: existing.status });
        }

        // Cek database (slow path, tapi aman untuk multi-container serverless)
        const isProcessed = await this.supabaseService.isMessageProcessed(messageId);
        if (isProcessed) {
          this.logger.log(`Pesan dengan ID ${messageId} sudah diproses secara database. Mengabaikan duplikasi.`);
          return res.status(HttpStatus.OK).json({ status: 'duplicate_ignored', original_status: 'database' });
        }

        // Tandai sebagai sedang diproses di memory dan langsung simpan ke database
        this.processedMessages.set(messageId, { status: 'in_progress', timestamp: Date.now() });
        await this.supabaseService.markMessageProcessed(messageId);
      }

      if (!message || message.trim() === '') {
        return this.replyToUser(res, sender,
          "Halo! 👋 Saya adalah *Asisten AI SI-TAQUA*. Silakan kirim pertanyaan Anda tentang hafalan, pembayaran, nilai, atau kehadiran santri.",
          messageId
        );
      }

      // ----------------------------------------------------------------
      // CEK PENDING ACTION (menunggu konfirmasi)
      // ----------------------------------------------------------------
      const pending = this.pendingActions[sender];
      const normalizedMsg = message.trim().toUpperCase();

      if (pending) {
        if (CONFIRM_YES.has(normalizedMsg)) {
          // Eksekusi aksi yang tertunda
          try {
            const result = await this.executeAction(pending.intent, pending.parameters);
            delete this.pendingActions[sender];
            const actionLabel = pending.intent.replace('tambah_', 'Input ').replace('_', ' ');
            const replyText =
              `✅ *Data berhasil disimpan!*\n\n` +
              `Aksi: *${actionLabel}*\n` +
              `Santri: *${pending.parameters.resolved_name || '-'}*\n\n` +
              `Jazakumullah khairan atas konfirmasinya. 🤲`;
            return this.replyToUser(res, sender, replyText, messageId);
          } catch (execError) {
            this.logger.error('Gagal eksekusi pending action:', execError);
            delete this.pendingActions[sender];
            return this.replyToUser(res, sender,
              `❌ *Gagal menyimpan data:* ${execError.message || execError}`,
              messageId
            );
          }
        } else if (CONFIRM_NO.has(normalizedMsg)) {
          delete this.pendingActions[sender];
          return this.replyToUser(res, sender, '❌ *Transaksi dibatalkan.* Ada lagi yang bisa saya bantu?', messageId);
        }
        // Jika bukan konfirmasi, lanjut proses sebagai pesan baru (hapus pending lama)
        delete this.pendingActions[sender];
      }

      // ----------------------------------------------------------------
      // PARSE INTENT dengan AI
      // ----------------------------------------------------------------
      let parsed: any;
      try {
        parsed = await this.aiService.parseIntent(message, sender);
      } catch (parseError) {
        this.logger.error('AI intent parsing gagal, fallback chitchat:', parseError);
        parsed = { intent: 'chitchat', parameters: {} };
      }

      this.logger.log(`Intent: ${parsed.intent} | Params: ${JSON.stringify(parsed.parameters)}`);

      // ----------------------------------------------------------------
      // WRITE ACTIONS — perlu konfirmasi dulu
      // ----------------------------------------------------------------
      const writeIntents = ['tambah_pembayaran', 'tambah_hafalan', 'tambah_absensi', 'tambah_perizinan',
        'tambah_pelanggaran', 'tambah_prestasi', 'tambah_catatan_guru', 'tambah_nilai'];

      if (writeIntents.includes(parsed.intent)) {
        const santriName = parsed.parameters?.santri_name;

        if (!santriName) {
          return this.replyToUser(res, sender,
            `Format pesan kurang lengkap. Mohon sebutkan *nama santri* dengan jelas ya.\n\nContoh: "Tambah pembayaran SPP Ahmad Rp300.000"`,
            messageId
          );
        }

        let matchingSantri: any[];
        try {
          matchingSantri = await this.supabaseService.findSantriByName(santriName);
        } catch (dbError) {
          this.logger.error('Gagal mencari santri:', dbError);
          return this.replyToUser(res, sender, `⚠️ Gagal mencari nama santri akibat gangguan koneksi database.`, messageId);
        }

        const resolution = this.handleSantriMatches(matchingSantri, santriName);
        if (resolution.clarification) {
          return this.replyToUser(res, sender, resolution.clarification, messageId);
        }

        if (!resolution.target) {
          return this.replyToUser(res, sender,
            `Maaf, santri dengan nama *"${santriName}"* tidak ditemukan di sistem. Pastikan nama sudah benar ya.`,
            messageId
          );
        }

        // Gunakan santri yang ter-resolve
        parsed.parameters.santri_id = resolution.target.id;
        parsed.parameters.resolved_name = resolution.target.nama;

        // Simpan pending action
        this.pendingActions[sender] = {
          intent: parsed.intent,
          parameters: parsed.parameters,
          timestamp: Date.now()
        };

        // Buat teks konfirmasi
        let confirmText = `📝 Saya mendengar permintaan berikut:\n\n`;
        if (parsed.parameters.resolved_name)  confirmText += `👤 Santri: *${parsed.parameters.resolved_name}*\n`;
        if (parsed.parameters.nominal)        confirmText += `💰 Nominal: *Rp${Number(parsed.parameters.nominal).toLocaleString('id-ID')}*\n`;
        if (parsed.parameters.kategori)       confirmText += `📁 Kategori: *${parsed.parameters.kategori}*\n`;
        if (parsed.parameters.juz)            confirmText += `📖 Juz: *${parsed.parameters.juz}*\n`;
        if (parsed.parameters.surah)          confirmText += `📖 Surah: *${parsed.parameters.surah}*\n`;
        if (parsed.parameters.ayat_awal)      confirmText += `📖 Ayat: *${parsed.parameters.ayat_awal}${parsed.parameters.ayat_akhir ? '-' + parsed.parameters.ayat_akhir : ''}*\n`;
        if (parsed.parameters.status)         confirmText += `📋 Status: *${parsed.parameters.status}*\n`;
        if (parsed.parameters.keterangan)     confirmText += `📝 Keterangan: *${parsed.parameters.keterangan}*\n`;
        if (parsed.parameters.isi_catatan)    confirmText += `📝 Catatan: *${parsed.parameters.isi_catatan}*\n`;
        if (parsed.parameters.nilai !== undefined) confirmText += `🎯 Nilai: *${parsed.parameters.nilai}*\n`;
        if (parsed.parameters.mapel)          confirmText += `📚 Mapel: *${parsed.parameters.mapel}*\n`;

        confirmText += `\nApakah data ini sudah benar?\nBalas *YA* untuk simpan atau *TIDAK* untuk batalkan.`;

        return this.replyToUser(res, sender, confirmText, messageId);
      }

      // ----------------------------------------------------------------
      // READ QUERIES — ambil data dari database
      // ----------------------------------------------------------------
      let dbResult: any = null;
      let targetSantri: any = null;

      // Resolve santri jika ada nama, jika tidak cari berdasarkan nomor wali
      if (parsed.parameters?.santri_name) {
        try {
          const matches = await this.supabaseService.findSantriByName(parsed.parameters.santri_name);
          const resolution = this.handleSantriMatches(matches, parsed.parameters.santri_name);
          
          if (resolution.clarification) {
            return this.replyToUser(res, sender, resolution.clarification, messageId);
          }

          if (!resolution.target) {
            return this.replyToUser(res, sender,
              `Maaf, santri dengan nama *"${parsed.parameters.santri_name}"* tidak ditemukan di sistem. Pastikan nama sudah benar ya.`,
              messageId
            );
          }
          targetSantri = resolution.target;
        } catch (dbError) {
          this.logger.error('Gagal resolve santri name:', dbError);
        }
      } else {
        try {
          const matches = await this.supabaseService.findSantriByWaliPhone(sender);
          const resolution = this.handleSantriMatches(matches, 'Anak Anda');
          
          if (resolution.clarification) {
            return this.replyToUser(
              res, 
              sender, 
              resolution.clarification.replace('dengan nama "Anak Anda"', 'yang terhubung dengan nomor Anda'), 
              messageId
            );
          }
          
          targetSantri = resolution.target;
          if (targetSantri) {
            this.logger.log(`Mengidentifikasi santri secara otomatis dari nomor wali ${sender}: ${targetSantri.nama}`);
          }
        } catch (dbError) {
          this.logger.error('Gagal resolve santri berdasarkan nomor wali:', dbError);
        }
      }

      try {
        switch (parsed.intent) {
          // --- Pembayaran ---
          case 'check_pembayaran':
            dbResult = await this.supabaseService.checkPembayaran(targetSantri?.id || '', parsed.parameters.bulan);
            break;

          // --- Hafalan ---
          case 'get_hafalan':
            if (!targetSantri) {
              dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
            } else {
              dbResult = await this.supabaseService.getHafalan(targetSantri.id);
            }
            break;

          case 'get_tidak_setor_today':
            dbResult = await this.supabaseService.getWhoHasNotDepositedToday();
            break;

          case 'get_top_10_hafalan':
            dbResult = await this.supabaseService.getTop10Hafalan();
            break;

          // --- Nilai ---
          case 'get_nilai':
            if (!targetSantri) {
              dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
            } else {
              dbResult = await this.supabaseService.getNilai(targetSantri.id);
            }
            break;

          // --- Absensi ---
          case 'get_presence_today':
            dbResult = await this.supabaseService.getSantriHadirHariIni();
            break;

          case 'get_santri_most_izin':
            dbResult = await this.supabaseService.getSantriPalingBanyakIzin();
            break;

          case 'get_guru_belum_absen':
            dbResult = await this.supabaseService.getGuruBelumAbsen();
            break;

          // --- Keuangan ---
          case 'get_pemasukan_bulan':
            dbResult = await this.supabaseService.getTotalPemasukanBulanIni();
            break;

          case 'get_pemasukan_perbandingan':
            dbResult = await this.supabaseService.getPemasukanPerbandingan();
            break;

          case 'get_tunggakan_terbesar':
            dbResult = await this.supabaseService.getTunggakanTerbesar();
            break;

          // --- Santri ---
          case 'get_jumlah_santri_aktif':
            dbResult = { jumlah_santri_aktif: await this.supabaseService.getActiveSantriCount() };
            break;

          // --- Perkembangan ---
          case 'get_perkembangan_summary':
            if (!targetSantri) {
              dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
            } else {
              const [h, n, p] = await Promise.all([
                this.supabaseService.getHafalan(targetSantri.id),
                this.supabaseService.getNilai(targetSantri.id),
                this.supabaseService.getPresensi(targetSantri.id),
              ]);
              dbResult = {
                santri: targetSantri.nama,
                hafalan: h.slice(0, 5),
                nilai: n,
                presensi: p.slice(0, 30),
              };
            }
            break;

          // --- Chitchat ---
          case 'chitchat':
          default:
            dbResult = { status: 'chitchat' };
            break;
        }
      } catch (dbError) {
        this.logger.error(`Database query gagal untuk intent ${parsed.intent}:`, dbError);
        dbResult = { error: 'Terjadi gangguan saat mengambil data dari database. Coba lagi sebentar ya.' };
      }

      // Generate natural language response
      const reply = await this.aiService.generateResponse(message, parsed.intent, dbResult, sender);
      return this.replyToUser(res, sender, reply, messageId);

    } catch (error) {
      this.logger.error('Error global di handleWebhook:', error);
      if (messageId) {
        this.processedMessages.set(messageId, { status: 'completed', timestamp: Date.now() });
      }
      if (sender) {
        await this.sendFonnteMessage(sender,
          '⚠️ Maaf, terjadi kesalahan teknis pada sistem. Silakan coba lagi sebentar ya.'
        );
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ reply: 'Kesalahan internal.' });
    }
  }

  // =====================================================================
  // Helper: Eksekusi aksi write setelah konfirmasi YA
  // =====================================================================
  private async executeAction(intent: string, parameters: any) {
    const santriId = parameters.santri_id;
    if (!santriId) throw new Error('Santri ID dibutuhkan untuk menyimpan data.');

    switch (intent) {
      case 'tambah_pembayaran':
        return await this.supabaseService.addPembayaran(
          santriId,
          parameters.kategori || 'SPP Bulanan',
          Number(parameters.nominal)
        );

      case 'tambah_hafalan':
        return await this.supabaseService.addHafalan(
          santriId,
          Number(parameters.juz || 1),
          parameters.surah || '',
          Number(parameters.ayat_awal || 1),
          Number(parameters.ayat_akhir || parameters.ayat_awal || 1),
          parameters.status || 'Proses'
        );

      case 'tambah_absensi':
      case 'tambah_perizinan':
        return await this.supabaseService.addAbsensi(
          santriId,
          parameters.status || 'hadir',
          parameters.keterangan || ''
        );

      case 'tambah_nilai':
        return await this.supabaseService.addNilai(
          santriId,
          parameters.mapel || '',
          Number(parameters.nilai || parameters.nilai_akhir || 0),
          parameters.semester || '1'
        );

      case 'tambah_pelanggaran':
        return await this.supabaseService.addPelanggaran(
          santriId,
          parameters.kategori || 'Lainnya',
          Number(parameters.tingkat || 1),
          parameters.keterangan || ''
        );

      case 'tambah_prestasi':
        return await this.supabaseService.addCatatanPembinaan(
          santriId,
          'PUJIAN',
          parameters.isi_catatan || 'Mendapatkan prestasi'
        );

      case 'tambah_catatan_guru':
        return await this.supabaseService.addCatatanPembinaan(
          santriId,
          'CATATAN',
          parameters.isi_catatan || ''
        );

      default:
        throw new Error(`Aksi tidak dikenali: ${intent}`);
    }
  }
}
