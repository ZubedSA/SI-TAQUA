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

    // FIX #5: Gunakan token yang sesuai dengan .env terbaru
    const token = process.env.FONNTE_TOKEN || 'ytZayjjW1QaTtx4EQn4d';

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
  // GET & POST /webhook & / — Main entry point (mendukung GET & POST sesuai syarat Fonnte)
  // =====================================================================
  @Get('webhook')
  @Post('webhook')
  @Get('')
  @Post('')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const startTime = Date.now();
    let sender = '';
    let message = '';
    let messageId = '';
    let parsed: any = { intent: 'chitchat', parameters: {} };
    let executedQuery = '';
    let dbResult: any = null;

    try {
      // Bersihkan data expired
      this.cleanupExpiredPending();
      this.cleanupExpiredProcessed();
      this.cleanupExpiredSentMessages();

      const body = req.body || {};
      const query = req.query || {};

      // 0. Respon cepat untuk ping verifikasi Fonnte (GET/POST kosong)
      if (Object.keys(body).length === 0 && Object.keys(query).length === 0) {
        return res.status(HttpStatus.OK).json({ status: 'ok', service: 'SI-TAQUA Webhook Active' });
      }

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

      // Jika pesan adalah ping tanpa sender, respon OK agar verifikasi URL Fonnte sukses
      if (!sender && !message) {
        return res.status(HttpStatus.OK).json({ status: 'ok', service: 'SI-TAQUA Webhook Active' });
      }

      if (!sender) {
        this.logger.warn('Sender tidak ditemukan di request.');
        return res.status(HttpStatus.OK).json({ status: 'ignored_missing_sender' });
      }

      // Deteksi identitas Guru / Ustadz
      const guru = await this.supabaseService.getGuruByPhone(sender);
      const isGuru = !!guru;
      const guruNama = guru?.nama || '';
      if (isGuru) {
        this.logger.log(`Sender ${sender} teridentifikasi sebagai Guru/Ustadz: ${guruNama}`);
      }

      // 2. Abaikan jika pengirim adalah device itu sendiri DAN pesan tersebut adalah pesan yang dikirim oleh bot (anti-loop)
      if (device && (this.isSamePhone(sender, device) || (member && this.isSamePhone(member, device)))) {
        if (this.isBotSentMessage(message)) {
          this.logger.log(`Mengabaikan pesan keluar dari device sendiri (${device}) untuk menghindari loop.`);
          return res.status(HttpStatus.OK).json({ status: 'ignored_self_message' });
        }
      }

      // 3. Cek idempotensi (duplikasi akibat retry Fonnte)
      if (messageId) {
        const existing = this.processedMessages.get(messageId);
        if (existing) {
          this.logger.log(`Pesan dengan ID ${messageId} sedang/sudah diproses secara in-memory (${existing.status}). Mengabaikan duplikasi.`);
          return res.status(HttpStatus.OK).json({ status: 'duplicate_ignored', original_status: existing.status });
        }
        const isProcessed = await this.supabaseService.isMessageProcessed(messageId);
        if (isProcessed) {
          this.logger.log(`Pesan dengan ID ${messageId} sudah diproses secara database. Mengabaikan duplikasi.`);
          return res.status(HttpStatus.OK).json({ status: 'duplicate_ignored', original_status: 'database' });
        }
        this.processedMessages.set(messageId, { status: 'in_progress', timestamp: Date.now() });
        await this.supabaseService.markMessageProcessed(messageId);
      }

      if (!message || message.trim() === '') {
        const replyText = isGuru
          ? `Ahlan wa Sahlan, Ustadz/Ustadzah ${guruNama || ''}! 🧑‍🏫 Silakan tanyakan data perkembangan santri atau rekapitulasi operasional pondok.`
          : `Halo! 👋 Saya adalah *Asisten AI SI-TAQUA*. Silakan kirim pertanyaan Anda tentang hafalan, pembayaran, nilai, atau kehadiran santri.`;
        await this.supabaseService.logAiInteraction(message, 'chitchat', 'chitchat', {}, 'Empty Message', null, replyText, Date.now() - startTime);
        return this.replyToUser(res, sender, replyText, messageId);
      }

      // ----------------------------------------------------------------
      // CEK PENDING ACTION (menunggu konfirmasi)
      // ----------------------------------------------------------------
      const pending = this.pendingActions[sender];
      const normalizedMsg = message.trim().toUpperCase();

      if (pending) {
        if (CONFIRM_YES.has(normalizedMsg)) {
          try {
            const result = await this.executeAction(pending.intent, pending.parameters);
            delete this.pendingActions[sender];
            const actionLabel = pending.intent.replace('tambah_', 'Input ').replace('_', ' ');
            const replyText =
              `✅ *Data berhasil disimpan!*\n\n` +
              `Aksi: *${actionLabel}*\n` +
              `Santri: *${pending.parameters.resolved_name || '-'}*\n\n` +
              `Jazakumullah khairan atas konfirmasinya. 🤲`;

            await this.supabaseService.logAiInteraction(
              message,
              pending.intent,
              pending.intent,
              pending.parameters,
              `executeAction(${pending.intent})`,
              result,
              replyText,
              Date.now() - startTime
            );

            return this.replyToUser(res, sender, replyText, messageId);
          } catch (execError) {
            this.logger.error('Gagal eksekusi pending action:', execError);
            delete this.pendingActions[sender];
            const replyText = `❌ *Gagal menyimpan data:* ${execError.message || execError}`;

            await this.supabaseService.logAiInteraction(
              message,
              pending.intent,
              pending.intent,
              pending.parameters,
              `executeAction(${pending.intent})`,
              null,
              replyText,
              Date.now() - startTime,
              execError.message || 'Execution Error'
            );

            return this.replyToUser(res, sender, replyText, messageId);
          }
        } else if (CONFIRM_NO.has(normalizedMsg)) {
          delete this.pendingActions[sender];
          const replyText = '❌ *Transaksi dibatalkan.* Ada lagi yang bisa saya bantu?';
          await this.supabaseService.logAiInteraction(message, 'konfirmasi_tidak', 'konfirmasi_tidak', {}, 'Cancel Pending Action', null, replyText, Date.now() - startTime);
          return this.replyToUser(res, sender, replyText, messageId);
        }
        delete this.pendingActions[sender];
      }

      // ----------------------------------------------------------------
      // PARSE INTENT dengan AI (Function Calling)
      // ----------------------------------------------------------------
      try {
        parsed = await this.aiService.parseIntent(message, sender);
        // Sanitasi tambahan lapis kedua
        if (parsed.parameters && typeof parsed.parameters.santri_name === 'string') {
          parsed.parameters.santri_name = parsed.parameters.santri_name.replace(/^(santri|siswa|anak|ananda|saudara|adek|kakak|atas nama)\s+/i, '').trim();
        }
      } catch (parseError) {
        this.logger.error('AI intent parsing gagal, fallback chitchat:', parseError);
        parsed = { intent: 'chitchat', parameters: {} };
      }

      this.logger.log(`Intent/Function: ${parsed.intent} | Params: ${JSON.stringify(parsed.parameters)}`);

      // ----------------------------------------------------------------
      // WRITE ACTIONS — perlu konfirmasi dan hak akses guru
      // ----------------------------------------------------------------
      const writeIntents = ['tambahPembayaran', 'tambahHafalan', 'tambahAbsensi', 'tambahNilai',
        'tambahPelanggaran', 'tambahPrestasi', 'tambahCatatanGuru',
        'tambah_pembayaran', 'tambah_hafalan', 'tambah_absensi', 'tambah_nilai',
        'tambah_pelanggaran', 'tambah_prestasi', 'tambah_catatan_guru'];

      if (writeIntents.includes(parsed.intent)) {
        if (!isGuru) {
          const replyText = 'Afwan, fitur pencatatan dan input data (hafalan, absensi, nilai, pelanggaran) hanya dapat dilakukan oleh Ustadz/Ustadzah yang terdaftar di sistem SI-TAQUA. 🙏';
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Write Access Denied', null, replyText, Date.now() - startTime, 'Access Denied');
          return this.replyToUser(res, sender, replyText, messageId);
        }

        const santriName = parsed.parameters?.santri_name;

        if (!santriName) {
          const replyText = `Format pesan kurang lengkap. Mohon sebutkan *nama santri* dengan jelas ya.\n\nContoh: "Tambah hafalan Ahmad juz 30 surah An-Naba 1-20"`;
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Missing Santri Name', null, replyText, Date.now() - startTime, 'Missing Santri Name');
          return this.replyToUser(res, sender, replyText, messageId);
        }

        let matchingSantri: any[];
        try {
          matchingSantri = await this.supabaseService.findSantriByName(santriName);
        } catch (dbError) {
          this.logger.error('Gagal mencari santri:', dbError);
          const replyText = `⚠️ Gagal mencari nama santri akibat gangguan koneksi database.`;
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'DB Error Find Santri', null, replyText, Date.now() - startTime, dbError.message);
          return this.replyToUser(res, sender, replyText, messageId);
        }

        const resolution = this.handleSantriMatches(matchingSantri, santriName);
        if (resolution.clarification) {
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Clarification Ganda', null, resolution.clarification, Date.now() - startTime);
          return this.replyToUser(res, sender, resolution.clarification, messageId);
        }

        if (!resolution.target) {
          const replyText = `Maaf, santri dengan nama *"${santriName}"* tidak ditemukan di sistem. Pastikan nama sudah benar ya.`;
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Santri Not Found', null, replyText, Date.now() - startTime, 'Santri Not Found');
          return this.replyToUser(res, sender, replyText, messageId);
        }

        parsed.parameters.santri_id = resolution.target.id;
        parsed.parameters.resolved_name = resolution.target.nama;

        this.pendingActions[sender] = {
          intent: parsed.intent,
          parameters: parsed.parameters,
          timestamp: Date.now()
        };

        let confirmText = `📝 *Ustadz/Ustadzah ${guruNama || ''}*, mohon konfirmasi data pencatatan berikut:\n\n`;
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

        await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Pending Confirm Created', null, confirmText, Date.now() - startTime);
        return this.replyToUser(res, sender, confirmText, messageId);
      }

      // ----------------------------------------------------------------
      // COLLECTIVE GURU QUERIES — rekap operasional pesantren
      // ----------------------------------------------------------------
      const collectiveGuruIntents = [
        'cekBelumSetor', 'cekSantriSakit', 'cekSantriIzin',
        'cekRankingHafalan', 'cekRekapTunggakan', 'cekSantriAktif'
      ];

      if (collectiveGuruIntents.includes(parsed.intent)) {
        if (!isGuru) {
          const replyText = 'Maaf, data rekapitulasi operasional pondok ini hanya dapat diakses oleh Ustadz/Ustadzah yang terdaftar di sistem SI-TAQUA. 🙏';
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Collective Access Denied', null, replyText, Date.now() - startTime, 'Access Denied');
          return this.replyToUser(res, sender, replyText, messageId);
        }

        try {
          switch (parsed.intent) {
            case 'cekBelumSetor':
              executedQuery = 'getWhoHasNotDepositedToday()';
              dbResult = await this.supabaseService.getWhoHasNotDepositedToday();
              break;
            case 'cekSantriSakit':
              executedQuery = 'getSantriByStatusPresensiToday(sakit)';
              dbResult = await this.supabaseService.getSantriByStatusPresensiToday('sakit');
              break;
            case 'cekSantriIzin':
              executedQuery = 'getSantriByStatusPresensiToday(izin)';
              dbResult = await this.supabaseService.getSantriByStatusPresensiToday('izin');
              break;
            case 'cekRankingHafalan':
              executedQuery = 'getTop10Hafalan()';
              dbResult = await this.supabaseService.getTop10Hafalan();
              break;
            case 'cekRekapTunggakan':
              executedQuery = 'getTunggakanTerbesar()';
              dbResult = await this.supabaseService.getTunggakanTerbesar();
              break;
            case 'cekSantriAktif':
              executedQuery = 'getActiveSantriCount()';
              dbResult = await this.supabaseService.getActiveSantriCount();
              break;
          }
        } catch (dbError) {
          this.logger.error(`Database query gagal untuk intent kolektif ${parsed.intent}:`, dbError);
          dbResult = { error: 'Terjadi gangguan saat mengambil data dari database. Coba lagi sebentar ya.' };
        }

        const reply = await this.aiService.generateResponse(message, parsed.intent, dbResult, sender, isGuru, guruNama);
        await this.supabaseService.logAiInteraction(
          message,
          parsed.intent,
          parsed.intent,
          parsed.parameters,
          executedQuery,
          dbResult,
          reply,
          Date.now() - startTime,
          dbResult?.error || ''
        );
        return this.replyToUser(res, sender, reply, messageId);
      }

      // ----------------------------------------------------------------
      // READ QUERIES — ambil data dari database & filter hak akses
      // ----------------------------------------------------------------
      let targetSantri: any = null;

      const specSantriIntents = ['cekPembayaran', 'cekTagihan', 'cekHafalan', 'cekNilai', 'cekAbsensi', 'cekSantri', 'cekPrestasi', 'cekPerizinan'];

      if (specSantriIntents.includes(parsed.intent)) {
        // Ambil data santri yang terhubung dengan nomor WhatsApp sender (jika terdaftar sebagai wali)
        let waliSantri: any[] = [];
        try {
          waliSantri = (await this.supabaseService.findSantriByWaliPhone(sender)) || [];
        } catch (e) {
          this.logger.warn('Gagal ambil data santri berdasarkan nomor wali:', e);
        }

        let candidateName = (parsed.parameters?.santri_name || '').trim();

        // Cek jika nomor WhatsApp wali memiliki anak dan pesan mengandung nama/potongan nama anaknya
        // (contoh: user cukup ketik "wildan", langsung kenali Ahmad Wildan Ramdlani tanpa klarifikasi!)
        if (waliSantri.length > 0) {
          const cleanMsg = message.toLowerCase();
          for (const s of waliSantri) {
            const parts = s.nama.toLowerCase().split(/\s+/);
            const matchedPart = parts.find((p: string) => p.length >= 3 && cleanMsg.includes(p));
            if (matchedPart) {
              candidateName = s.nama;
              targetSantri = s;
              break;
            }
          }

          // Cek jika user membalas dengan angka indeks anak (contoh: "1" atau "2")
          if (!targetSantri && /^[1-9]$/.test(message.trim())) {
            const idx = parseInt(message.trim(), 10) - 1;
            if (idx >= 0 && idx < waliSantri.length) {
              targetSantri = waliSantri[idx];
            }
          }
        }

        // Jika belum resolved dan ada candidateName (dari parameter AI atau regex), cari di database
        if (!targetSantri && candidateName) {
          try {
            const matches = await this.supabaseService.findSantriByName(candidateName);

            // Jika ada beberapa match di database, tapi salah satunya adalah anak si wali, langsung prioritaskan anak wali!
            if (matches && matches.length > 1 && waliSantri.length > 0) {
              const myChild = matches.find(m => waliSantri.some(w => w.id === m.id));
              if (myChild) {
                targetSantri = myChild;
              }
            }

            if (!targetSantri) {
              const resolution = this.handleSantriMatches(matches, candidateName);
              if (resolution.clarification) {
                await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Clarification Ganda', null, resolution.clarification, Date.now() - startTime);
                return this.replyToUser(res, sender, resolution.clarification, messageId);
              }
              if (!resolution.target) {
                const replyText = `Maaf, data santri dengan nama *"${candidateName}"* tidak ditemukan di sistem. Pastikan nama sudah benar ya.`;
                await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Santri Not Found', null, replyText, Date.now() - startTime, 'Santri Not Found');
                return this.replyToUser(res, sender, replyText, messageId);
              }
              targetSantri = resolution.target;
            }
          } catch (dbError) {
            this.logger.error('Gagal resolve santri name:', dbError);
          }
        }

        // Jika masih belum resolved dan tidak ada nama yang disebut
        if (!targetSantri && !candidateName) {
          if (waliSantri.length === 1) {
            // Jika wali hanya punya 1 anak, otomatis pilih anak tersebut!
            targetSantri = waliSantri[0];
          } else if (waliSantri.length > 1) {
            // Jika wali punya lebih dari 1 anak, mintakan pilihan
            const resolution = this.handleSantriMatches(waliSantri, 'Anak Anda');
            if (resolution.clarification) {
              const clarText = resolution.clarification.replace(/dengan nama\s*\*?"Anak Anda"\*?/gi, 'yang terhubung dengan nomor WhatsApp Anda');
              await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Clarification Wali Ganda', null, clarText, Date.now() - startTime);
              return this.replyToUser(res, sender, clarText, messageId);
            }
          }
        }

        if (targetSantri) {
          if (targetSantri.nama) {
            this.aiService.setContext(sender, parsed.intent, targetSantri.nama);
          }
          const hasAccess = await this.supabaseService.hasAccessToSantri(sender, targetSantri.id);
          if (!hasAccess) {
            const replyText = 'Maaf, Anda tidak memiliki hak akses untuk melihat data tersebut.';
            await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Access Denied', null, replyText, Date.now() - startTime, 'Access Denied');
            return this.replyToUser(res, sender, replyText, messageId);
          }
        } else {
          const replyText = isGuru
            ? `Afwan Ustadz/Ustadzah, mohon sebutkan nama santri yang ingin dilihat datanya ya. Contoh: "Hafalan Wildan" atau "Kehadiran Ahmad". 😊`
            : `Maaf, data santri tidak ditemukan di sistem. Mohon sebutkan nama santri dengan jelas ya. 😊`;
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'No Target Resolved', null, replyText, Date.now() - startTime, 'No Target Resolved');
          return this.replyToUser(res, sender, replyText, messageId);
        }
      }

      try {
        switch (parsed.intent) {
          case 'cekPembayaran':
          case 'cekTagihan':
            executedQuery = `checkPembayaran(${targetSantri?.id || ''}, ${parsed.parameters.bulan || ''})`;
            dbResult = await this.supabaseService.checkPembayaran(targetSantri?.id || '', parsed.parameters.bulan || '');
            break;
          case 'cekHafalan':
            executedQuery = `getHafalan(${targetSantri.id})`;
            dbResult = await this.supabaseService.getHafalan(targetSantri.id);
            break;
          case 'cekNilai':
            executedQuery = `getNilai(${targetSantri.id})`;
            dbResult = await this.supabaseService.getNilai(targetSantri.id);
            break;
          case 'cekAbsensi':
            executedQuery = `getPresensi(${targetSantri.id})`;
            dbResult = await this.supabaseService.getPresensi(targetSantri.id);
            break;
          case 'cekPerizinan':
            executedQuery = `getPresensi(${targetSantri.id}) filtered by status = 'izin'`;
            const allPres = await this.supabaseService.getPresensi(targetSantri.id);
            dbResult = allPres ? allPres.filter((p: any) => p.status === 'izin') : [];
            break;
          case 'cekSantri':
            executedQuery = `getSantriDetails(${targetSantri.id})`;
            dbResult = targetSantri;
            break;
          case 'cekPrestasi':
            executedQuery = `getPrestasi(${targetSantri.id})`;
            dbResult = await this.supabaseService.getPrestasi(targetSantri.id);
            break;
          case 'chitchat':
          default:
            executedQuery = 'N/A (Chitchat)';
            // FIX #3: Pesan statis yang aman, bukan teks bebas Gemini
            dbResult = { status: 'chitchat' };
            break;
        }
      } catch (dbError) {
        this.logger.error(`Database query gagal untuk intent ${parsed.intent}:`, dbError);
        dbResult = { error: 'Terjadi gangguan saat mengambil data dari database. Coba lagi sebentar ya.' };
      }

      let reply: string;
      if (parsed.intent === 'chitchat') {
        if (isGuru) {
          reply = `Ahlan wa Sahlan, Ustadz/Ustadzah ${guruNama ? guruNama + ' ' : ''}! 🧑‍🏫

Saya adalah *Asisten AI SI-TAQUA*, siap membantu aktivitas pengajaran dan pemantauan santri:
📖 *Cek Santri:* "Hafalan [nama]", "Kehadiran [nama]", "Nilai [nama]"
📋 *Rekapitulasi:* "Siapa yang belum setor hari ini?", "Santri yang sakit hari ini", "Ranking hafalan", "Total santri aktif"
✍️ *Input Cepat:* "Input hafalan Ahmad juz 30 surah An-Naba 1-20 lancar", "Input absensi Ahmad sakit"

Silakan ketik kebutuhan antum! 🤲`;
        } else {
          // FIX #3: Pesan statis aman — JANGAN PERNAH pakai teks bebas Gemini untuk chitchat
          reply = `Assalamu'alaikum! 😊 Saya adalah *Asisten AI SI-TAQUA*.

Saya bisa membantu Anda dengan:
📖 Cek hafalan santri
💰 Status pembayaran SPP
📊 Nilai akademis
✅ Data kehadiran
💳 Rincian tagihan

Silakan tanyakan kebutuhan Anda! 🤲`;
        }
      } else {
        reply = await this.aiService.generateResponse(message, parsed.intent, dbResult, sender, isGuru, guruNama);
      }

      await this.supabaseService.logAiInteraction(
        message,
        parsed.intent,
        parsed.intent,
        parsed.parameters,
        executedQuery,
        dbResult,
        reply,
        Date.now() - startTime,
        dbResult?.error || ''
      );

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
      case 'tambahPembayaran':
        return await this.supabaseService.addPembayaran(
          santriId,
          parameters.kategori || 'SPP Bulanan',
          Number(parameters.nominal)
        );

      case 'tambah_hafalan':
      case 'tambahHafalan':
        return await this.supabaseService.addHafalan(
          santriId,
          Number(parameters.juz || 1),
          parameters.surah || '',
          Number(parameters.ayat_awal || 1),
          Number(parameters.ayat_akhir || parameters.ayat_awal || 1),
          parameters.status || 'Proses'
        );

      case 'tambah_absensi':
      case 'tambahAbsensi':
      case 'tambah_perizinan':
      case 'tambahPerizinan':
        return await this.supabaseService.addAbsensi(
          santriId,
          parameters.status || 'hadir',
          parameters.keterangan || ''
        );

      case 'tambah_nilai':
      case 'tambahNilai':
        return await this.supabaseService.addNilai(
          santriId,
          parameters.mapel || '',
          Number(parameters.nilai || parameters.nilai_akhir || 0),
          parameters.semester || '1'
        );

      case 'tambah_pelanggaran':
      case 'tambahPelanggaran':
        return await this.supabaseService.addPelanggaran(
          santriId,
          parameters.kategori || 'Lainnya',
          Number(parameters.tingkat || 1),
          parameters.keterangan || ''
        );

      case 'tambah_prestasi':
      case 'tambahPrestasi':
        return await this.supabaseService.addCatatanPembinaan(
          santriId,
          'PUJIAN',
          parameters.isi_catatan || 'Mendapatkan prestasi'
        );

      case 'tambah_catatan_guru':
      case 'tambahCatatanGuru':
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
