import { Controller, Post, Body, Res, HttpStatus, Logger, Req } from '@nestjs/common';
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

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
  ) {
    // Bersihkan pending actions yang sudah lebih dari 10 menit setiap 5 menit
    setInterval(() => {
      const now = Date.now();
      for (const [sender, action] of Object.entries(this.pendingActions)) {
        if (now - action.timestamp > 10 * 60 * 1000) {
          delete this.pendingActions[sender];
          this.logger.log(`Pending action expired for ${sender}`);
        }
      }
    }, 5 * 60 * 1000);
  }

  // =====================================================================
  // Helper: Kirim pesan via Fonnte dengan auto-retry
  // =====================================================================
  private async sendFonnteMessage(target: string, message: string, retries = 3) {
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      this.logger.warn('FONNTE_TOKEN tidak dikonfigurasi, skip pengiriman WA.');
      return;
    }

    const formData = new URLSearchParams();
    formData.append('target', target);
    formData.append('message', message);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.log(`Mengirim WA ke ${target} (Percobaan ${attempt}/${retries})...`);
        const response = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          signal: AbortSignal.timeout(10000),
        });
        const resData = await response.json();
        this.logger.log(`Fonnte Response untuk ${target}: ${JSON.stringify(resData)}`);
        return;
      } catch (e) {
        this.logger.error(`Percobaan ${attempt} gagal kirim ke ${target}: ${e.message || e}`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          this.logger.error(`Semua ${retries} percobaan gagal untuk ${target}.`);
        }
      }
    }
  }

  // =====================================================================
  // Helper: Balas user dan kirim WA di background
  // =====================================================================
  private async replyToUser(res: Response, target: string, text: string) {
    this.sendFonnteMessage(target, text).catch(e => {
      this.logger.error('Background message sending gagal:', e);
    });
    return res.status(HttpStatus.OK).json({ reply: text });
  }

  // =====================================================================
  // POST /webhook — Main entry point
  // =====================================================================
  @Post('webhook')
  @Post()
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    let sender = '';
    let message = '';

    try {
      const body = req.body || {};
      const query = req.query || {};

      sender = body.sender || query.sender || body.from || query.from || '';
      message = body.message || query.message || body.text || query.text || '';

      this.logger.log(`Webhook: Sender="${sender}", Message="${message}"`);

      if (!sender) {
        this.logger.warn('Sender tidak ditemukan di request.');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing sender' });
      }

      if (!message || message.trim() === '') {
        return this.replyToUser(res, sender,
          "Halo! 👋 Saya adalah *Asisten AI SI-TAQUA*. Silakan kirim pertanyaan Anda tentang hafalan, pembayaran, nilai, atau kehadiran santri."
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
            return this.replyToUser(res, sender, replyText);
          } catch (execError) {
            this.logger.error('Gagal eksekusi pending action:', execError);
            delete this.pendingActions[sender];
            return this.replyToUser(res, sender,
              `❌ *Gagal menyimpan data:* ${execError.message || execError}`
            );
          }
        } else if (CONFIRM_NO.has(normalizedMsg)) {
          delete this.pendingActions[sender];
          return this.replyToUser(res, sender, '❌ *Transaksi dibatalkan.* Ada lagi yang bisa saya bantu?');
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
            `Format pesan kurang lengkap. Mohon sebutkan *nama santri* dengan jelas ya.\n\nContoh: "Tambah pembayaran SPP Ahmad Rp300.000"`
          );
        }

        let matchingSantri: any[];
        try {
          matchingSantri = await this.supabaseService.findSantriByName(santriName);
        } catch (dbError) {
          this.logger.error('Gagal mencari santri:', dbError);
          return this.replyToUser(res, sender, `⚠️ Gagal mencari nama santri akibat gangguan koneksi database.`);
        }

        if (!matchingSantri || matchingSantri.length === 0) {
          return this.replyToUser(res, sender,
            `Maaf, santri dengan nama *"${santriName}"* tidak ditemukan di sistem. Pastikan nama sudah benar ya.`
          );
        }

        // Jika ada lebih dari 1 santri dengan nama mirip, gunakan yang pertama
        parsed.parameters.santri_id = matchingSantri[0].id;
        parsed.parameters.resolved_name = matchingSantri[0].nama;

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

        return this.replyToUser(res, sender, confirmText);
      }

      // ----------------------------------------------------------------
      // READ QUERIES — ambil data dari database
      // ----------------------------------------------------------------
      let dbResult: any = null;
      let targetSantri: any = null;

      // Resolve santri jika ada nama
      if (parsed.parameters?.santri_name) {
        try {
          const matches = await this.supabaseService.findSantriByName(parsed.parameters.santri_name);
          if (matches && matches.length > 0) {
            targetSantri = matches[0];
          }
        } catch (dbError) {
          this.logger.error('Gagal resolve santri name:', dbError);
        }
      }

      try {
        switch (parsed.intent) {
          // --- Pembayaran ---
          case 'check_pembayaran':
            if (!targetSantri) {
              dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
            } else {
              dbResult = await this.supabaseService.checkPembayaran(targetSantri.id, parsed.parameters.bulan);
            }
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
      return this.replyToUser(res, sender, reply);

    } catch (error) {
      this.logger.error('Error global di handleWebhook:', error);
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
