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
  // POST /webhook — Main entry point
  // =====================================================================
  @Post('webhook')
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
        const replyText = "Halo! 👋 Saya adalah *Asisten AI SI-TAQUA*. Silakan kirim pertanyaan Anda tentang hafalan, pembayaran, nilai, atau kehadiran santri.";
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
        const isGuru = await this.supabaseService.isGuru(sender);
        if (!isGuru) {
          const replyText = 'Maaf, Anda tidak memiliki hak akses untuk mengubah data tersebut.';
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Write Access Denied', null, replyText, Date.now() - startTime, 'Access Denied');
          return this.replyToUser(res, sender, replyText, messageId);
        }

        const santriName = parsed.parameters?.santri_name;

        if (!santriName) {
          const replyText = `Format pesan kurang lengkap. Mohon sebutkan *nama santri* dengan jelas ya.\n\nContoh: "Tambah pembayaran SPP Ahmad Rp300.000"`;
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

        await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Pending Confirm Created', null, confirmText, Date.now() - startTime);
        return this.replyToUser(res, sender, confirmText, messageId);
      }

      // ----------------------------------------------------------------
      // READ QUERIES — ambil data dari database & filter hak akses
      // ----------------------------------------------------------------
      let targetSantri: any = null;

      if ((parsed.intent === 'cekPembayaran' || parsed.intent === 'cekTagihan') && !parsed.parameters?.santri_name) {
        const isGuru = await this.supabaseService.isGuru(sender);
        if (!isGuru) {
          const replyText = 'Maaf, Anda tidak memiliki hak akses untuk melihat data tersebut.';
          await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Global Access Check Failed', null, replyText, Date.now() - startTime, 'Access Denied');
          return this.replyToUser(res, sender, replyText, messageId);
        }
      }

      const specSantriIntents = ['cekPembayaran', 'cekTagihan', 'cekHafalan', 'cekNilai', 'cekAbsensi', 'cekSantri', 'cekPrestasi', 'cekPerizinan'];

      if (specSantriIntents.includes(parsed.intent)) {
        if (parsed.parameters?.santri_name) {
          try {
            const matches = await this.supabaseService.findSantriByName(parsed.parameters.santri_name);
            const resolution = this.handleSantriMatches(matches, parsed.parameters.santri_name);
            
            if (resolution.clarification) {
              await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Clarification Ganda', null, resolution.clarification, Date.now() - startTime);
              return this.replyToUser(res, sender, resolution.clarification, messageId);
            }

            if (!resolution.target) {
              const replyText = `Maaf, data santri dengan nama *"${parsed.parameters.santri_name}"* tidak ditemukan di sistem. Pastikan nama sudah benar ya.`;
              await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Santri Not Found', null, replyText, Date.now() - startTime, 'Santri Not Found');
              return this.replyToUser(res, sender, replyText, messageId);
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
              const clarText = resolution.clarification.replace('dengan nama "Anak Anda"', 'yang terhubung dengan nomor Anda');
              await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Clarification Wali Ganda', null, clarText, Date.now() - startTime);
              return this.replyToUser(res, sender, clarText, messageId);
            }
            
            targetSantri = resolution.target;
          } catch (dbError) {
            this.logger.error('Gagal resolve santri berdasarkan nomor wali:', dbError);
          }
        }

        if (targetSantri) {
          const hasAccess = await this.supabaseService.hasAccessToSantri(sender, targetSantri.id);
          if (!hasAccess) {
            const replyText = 'Maaf, Anda tidak memiliki hak akses untuk melihat data tersebut.';
            await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Access Denied', null, replyText, Date.now() - startTime, 'Access Denied');
            return this.replyToUser(res, sender, replyText, messageId);
          }
        } else {
          const replyText = `Maaf, data santri tidak ditemukan di sistem. Pastikan nama sudah benar ya.`;
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
      const cleanName = targetSantri?.nama || parsed.parameters?.santri_name || 'santri';

      if (parsed.intent !== 'chitchat' && (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0))) {
        let type = 'data';
        if (parsed.intent === 'cekPembayaran' || parsed.intent === 'cekTagihan') type = 'pembayaran';
        if (parsed.intent === 'cekHafalan') type = 'hafalan';
        if (parsed.intent === 'cekNilai') type = 'nilai';
        if (parsed.intent === 'cekAbsensi') type = 'kehadiran';
        if (parsed.intent === 'cekPerizinan') type = 'perizinan';
        if (parsed.intent === 'cekPrestasi') type = 'prestasi';
        reply = `Maaf, data ${type} ${cleanName} tidak ditemukan.`;
      } else {
        if (parsed.intent === 'chitchat') {
          // FIX #3: Pesan statis aman — JANGAN PERNAH pakai teks bebas Gemini untuk chitchat
          reply = `Assalamu'alaikum! 😊 Saya adalah *Asisten AI SI-TAQUA*.

Saya bisa membantu Anda dengan:
📖 Cek hafalan santri
💰 Status pembayaran SPP
📊 Nilai akademis
✅ Data kehadiran
💳 Rincian tagihan

Silakan tanyakan kebutuhan Anda! 🤲`;
        } else {
          reply = await this.aiService.generateResponse(message, parsed.intent, dbResult, sender);
        }
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
