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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const ai_service_1 = require("../ai/ai.service");
const CONFIRM_YES = new Set(['YA', 'BENAR', 'BETUL', 'OK', 'OKE', 'YES', 'SIP', 'LANJUT', 'YOI', 'HEEH', 'SETUJU', 'IYA', 'LAKSANAKAN', 'KONFIRMASI']);
const CONFIRM_NO = new Set(['TIDAK', 'BUKAN', 'SALAH', 'BATAL', 'JANGAN', 'NO', 'CANCEL', 'GA', 'GAK', 'NDAK', 'NGGAK', 'ENGGAK', 'STOP']);
let WebhookController = WebhookController_1 = class WebhookController {
    constructor(supabaseService, aiService) {
        this.supabaseService = supabaseService;
        this.aiService = aiService;
        this.logger = new common_1.Logger(WebhookController_1.name);
        this.pendingActions = {};
    }
    cleanupExpiredPending() {
        const now = Date.now();
        for (const [sender, action] of Object.entries(this.pendingActions)) {
            if (now - action.timestamp > 10 * 60 * 1000) {
                delete this.pendingActions[sender];
            }
        }
    }
    async sendFonnteMessage(target, message) {
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
                signal: AbortSignal.timeout(8000),
            });
            const resData = await response.json();
            this.logger.log(`Fonnte Response: ${JSON.stringify(resData)}`);
        }
        catch (e) {
            this.logger.error(`Gagal kirim WA ke ${target}: ${e.message || e}`);
        }
    }
    async replyToUser(res, target, text) {
        await this.sendFonnteMessage(target, text);
        return res.status(common_1.HttpStatus.OK).json({ reply: text });
    }
    async handleWebhook(req, res) {
        let sender = '';
        let message = '';
        try {
            this.cleanupExpiredPending();
            const body = req.body || {};
            const query = req.query || {};
            sender = body.sender || query.sender || body.from || query.from || '';
            message = body.message || query.message || body.text || query.text || '';
            this.logger.log(`Webhook: Sender="${sender}", Message="${message}"`);
            if (!sender) {
                this.logger.warn('Sender tidak ditemukan di request.');
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Missing sender' });
            }
            if (!message || message.trim() === '') {
                return this.replyToUser(res, sender, "Halo! 👋 Saya adalah *Asisten AI SI-TAQUA*. Silakan kirim pertanyaan Anda tentang hafalan, pembayaran, nilai, atau kehadiran santri.");
            }
            const pending = this.pendingActions[sender];
            const normalizedMsg = message.trim().toUpperCase();
            if (pending) {
                if (CONFIRM_YES.has(normalizedMsg)) {
                    try {
                        const result = await this.executeAction(pending.intent, pending.parameters);
                        delete this.pendingActions[sender];
                        const actionLabel = pending.intent.replace('tambah_', 'Input ').replace('_', ' ');
                        const replyText = `✅ *Data berhasil disimpan!*\n\n` +
                            `Aksi: *${actionLabel}*\n` +
                            `Santri: *${pending.parameters.resolved_name || '-'}*\n\n` +
                            `Jazakumullah khairan atas konfirmasinya. 🤲`;
                        return this.replyToUser(res, sender, replyText);
                    }
                    catch (execError) {
                        this.logger.error('Gagal eksekusi pending action:', execError);
                        delete this.pendingActions[sender];
                        return this.replyToUser(res, sender, `❌ *Gagal menyimpan data:* ${execError.message || execError}`);
                    }
                }
                else if (CONFIRM_NO.has(normalizedMsg)) {
                    delete this.pendingActions[sender];
                    return this.replyToUser(res, sender, '❌ *Transaksi dibatalkan.* Ada lagi yang bisa saya bantu?');
                }
                delete this.pendingActions[sender];
            }
            let parsed;
            try {
                parsed = await this.aiService.parseIntent(message, sender);
            }
            catch (parseError) {
                this.logger.error('AI intent parsing gagal, fallback chitchat:', parseError);
                parsed = { intent: 'chitchat', parameters: {} };
            }
            this.logger.log(`Intent: ${parsed.intent} | Params: ${JSON.stringify(parsed.parameters)}`);
            const writeIntents = ['tambah_pembayaran', 'tambah_hafalan', 'tambah_absensi', 'tambah_perizinan',
                'tambah_pelanggaran', 'tambah_prestasi', 'tambah_catatan_guru', 'tambah_nilai'];
            if (writeIntents.includes(parsed.intent)) {
                const santriName = parsed.parameters?.santri_name;
                if (!santriName) {
                    return this.replyToUser(res, sender, `Format pesan kurang lengkap. Mohon sebutkan *nama santri* dengan jelas ya.\n\nContoh: "Tambah pembayaran SPP Ahmad Rp300.000"`);
                }
                let matchingSantri;
                try {
                    matchingSantri = await this.supabaseService.findSantriByName(santriName);
                }
                catch (dbError) {
                    this.logger.error('Gagal mencari santri:', dbError);
                    return this.replyToUser(res, sender, `⚠️ Gagal mencari nama santri akibat gangguan koneksi database.`);
                }
                if (!matchingSantri || matchingSantri.length === 0) {
                    return this.replyToUser(res, sender, `Maaf, santri dengan nama *"${santriName}"* tidak ditemukan di sistem. Pastikan nama sudah benar ya.`);
                }
                parsed.parameters.santri_id = matchingSantri[0].id;
                parsed.parameters.resolved_name = matchingSantri[0].nama;
                this.pendingActions[sender] = {
                    intent: parsed.intent,
                    parameters: parsed.parameters,
                    timestamp: Date.now()
                };
                let confirmText = `📝 Saya mendengar permintaan berikut:\n\n`;
                if (parsed.parameters.resolved_name)
                    confirmText += `👤 Santri: *${parsed.parameters.resolved_name}*\n`;
                if (parsed.parameters.nominal)
                    confirmText += `💰 Nominal: *Rp${Number(parsed.parameters.nominal).toLocaleString('id-ID')}*\n`;
                if (parsed.parameters.kategori)
                    confirmText += `📁 Kategori: *${parsed.parameters.kategori}*\n`;
                if (parsed.parameters.juz)
                    confirmText += `📖 Juz: *${parsed.parameters.juz}*\n`;
                if (parsed.parameters.surah)
                    confirmText += `📖 Surah: *${parsed.parameters.surah}*\n`;
                if (parsed.parameters.ayat_awal)
                    confirmText += `📖 Ayat: *${parsed.parameters.ayat_awal}${parsed.parameters.ayat_akhir ? '-' + parsed.parameters.ayat_akhir : ''}*\n`;
                if (parsed.parameters.status)
                    confirmText += `📋 Status: *${parsed.parameters.status}*\n`;
                if (parsed.parameters.keterangan)
                    confirmText += `📝 Keterangan: *${parsed.parameters.keterangan}*\n`;
                if (parsed.parameters.isi_catatan)
                    confirmText += `📝 Catatan: *${parsed.parameters.isi_catatan}*\n`;
                if (parsed.parameters.nilai !== undefined)
                    confirmText += `🎯 Nilai: *${parsed.parameters.nilai}*\n`;
                if (parsed.parameters.mapel)
                    confirmText += `📚 Mapel: *${parsed.parameters.mapel}*\n`;
                confirmText += `\nApakah data ini sudah benar?\nBalas *YA* untuk simpan atau *TIDAK* untuk batalkan.`;
                return this.replyToUser(res, sender, confirmText);
            }
            let dbResult = null;
            let targetSantri = null;
            if (parsed.parameters?.santri_name) {
                try {
                    const matches = await this.supabaseService.findSantriByName(parsed.parameters.santri_name);
                    if (matches && matches.length > 0) {
                        targetSantri = matches[0];
                    }
                }
                catch (dbError) {
                    this.logger.error('Gagal resolve santri name:', dbError);
                }
            }
            try {
                switch (parsed.intent) {
                    case 'check_pembayaran':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
                        }
                        else {
                            dbResult = await this.supabaseService.checkPembayaran(targetSantri.id, parsed.parameters.bulan);
                        }
                        break;
                    case 'get_hafalan':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
                        }
                        else {
                            dbResult = await this.supabaseService.getHafalan(targetSantri.id);
                        }
                        break;
                    case 'get_tidak_setor_today':
                        dbResult = await this.supabaseService.getWhoHasNotDepositedToday();
                        break;
                    case 'get_top_10_hafalan':
                        dbResult = await this.supabaseService.getTop10Hafalan();
                        break;
                    case 'get_nilai':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
                        }
                        else {
                            dbResult = await this.supabaseService.getNilai(targetSantri.id);
                        }
                        break;
                    case 'get_presence_today':
                        dbResult = await this.supabaseService.getSantriHadirHariIni();
                        break;
                    case 'get_santri_most_izin':
                        dbResult = await this.supabaseService.getSantriPalingBanyakIzin();
                        break;
                    case 'get_guru_belum_absen':
                        dbResult = await this.supabaseService.getGuruBelumAbsen();
                        break;
                    case 'get_pemasukan_bulan':
                        dbResult = await this.supabaseService.getTotalPemasukanBulanIni();
                        break;
                    case 'get_pemasukan_perbandingan':
                        dbResult = await this.supabaseService.getPemasukanPerbandingan();
                        break;
                    case 'get_tunggakan_terbesar':
                        dbResult = await this.supabaseService.getTunggakanTerbesar();
                        break;
                    case 'get_jumlah_santri_aktif':
                        dbResult = { jumlah_santri_aktif: await this.supabaseService.getActiveSantriCount() };
                        break;
                    case 'get_perkembangan_summary':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan. Pastikan nama sudah benar.' };
                        }
                        else {
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
                    case 'chitchat':
                    default:
                        dbResult = { status: 'chitchat' };
                        break;
                }
            }
            catch (dbError) {
                this.logger.error(`Database query gagal untuk intent ${parsed.intent}:`, dbError);
                dbResult = { error: 'Terjadi gangguan saat mengambil data dari database. Coba lagi sebentar ya.' };
            }
            const reply = await this.aiService.generateResponse(message, parsed.intent, dbResult, sender);
            return this.replyToUser(res, sender, reply);
        }
        catch (error) {
            this.logger.error('Error global di handleWebhook:', error);
            if (sender) {
                await this.sendFonnteMessage(sender, '⚠️ Maaf, terjadi kesalahan teknis pada sistem. Silakan coba lagi sebentar ya.');
            }
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ reply: 'Kesalahan internal.' });
        }
    }
    async executeAction(intent, parameters) {
        const santriId = parameters.santri_id;
        if (!santriId)
            throw new Error('Santri ID dibutuhkan untuk menyimpan data.');
        switch (intent) {
            case 'tambah_pembayaran':
                return await this.supabaseService.addPembayaran(santriId, parameters.kategori || 'SPP Bulanan', Number(parameters.nominal));
            case 'tambah_hafalan':
                return await this.supabaseService.addHafalan(santriId, Number(parameters.juz || 1), parameters.surah || '', Number(parameters.ayat_awal || 1), Number(parameters.ayat_akhir || parameters.ayat_awal || 1), parameters.status || 'Proses');
            case 'tambah_absensi':
            case 'tambah_perizinan':
                return await this.supabaseService.addAbsensi(santriId, parameters.status || 'hadir', parameters.keterangan || '');
            case 'tambah_nilai':
                return await this.supabaseService.addNilai(santriId, parameters.mapel || '', Number(parameters.nilai || parameters.nilai_akhir || 0), parameters.semester || '1');
            case 'tambah_pelanggaran':
                return await this.supabaseService.addPelanggaran(santriId, parameters.kategori || 'Lainnya', Number(parameters.tingkat || 1), parameters.keterangan || '');
            case 'tambah_prestasi':
                return await this.supabaseService.addCatatanPembinaan(santriId, 'PUJIAN', parameters.isi_catatan || 'Mendapatkan prestasi');
            case 'tambah_catatan_guru':
                return await this.supabaseService.addCatatanPembinaan(santriId, 'CATATAN', parameters.isi_catatan || '');
            default:
                throw new Error(`Aksi tidak dikenali: ${intent}`);
        }
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleWebhook", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        ai_service_1.AiService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map