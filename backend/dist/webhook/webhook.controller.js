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
let WebhookController = WebhookController_1 = class WebhookController {
    constructor(supabaseService, aiService) {
        this.supabaseService = supabaseService;
        this.aiService = aiService;
        this.logger = new common_1.Logger(WebhookController_1.name);
        this.pendingActions = {};
    }
    async sendFonnteMessage(target, message, retries = 3) {
        const token = process.env.FONNTE_TOKEN || 'M77WadPpCFgeAaLWS67Z';
        const formData = new URLSearchParams();
        formData.append('target', target);
        formData.append('message', message);
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                this.logger.log(`Sending WhatsApp reply to ${target} (Attempt ${attempt}/${retries})...`);
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
                this.logger.log(`Fonnte API Response for ${target}: ${JSON.stringify(resData)}`);
                return;
            }
            catch (e) {
                this.logger.error(`Attempt ${attempt} failed to send message to ${target}: ${e.message || e}`);
                if (attempt < retries) {
                    this.logger.log(`Waiting 2 seconds before retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                else {
                    this.logger.error(`All ${retries} attempts failed to send message to ${target}.`);
                }
            }
        }
    }
    async replyToUser(res, target, text) {
        this.sendFonnteMessage(target, text).catch(e => {
            this.logger.error('Background message sending failed:', e);
        });
        return res.status(common_1.HttpStatus.OK).json({ reply: text });
    }
    async handleWebhook(req, res) {
        let sender = '';
        let message = '';
        try {
            const body = req.body || {};
            const query = req.query || {};
            sender = body.sender || query.sender || body.from || query.from || '';
            message = body.message || query.message || body.text || query.text || '';
            this.logger.log(`Webhook triggered. Sender: "${sender}", Message: "${message}"`);
            this.logger.debug(`Raw Request Body: ${JSON.stringify(body)}`);
            if (!sender) {
                this.logger.warn('Webhook request received, but sender number is missing.');
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Missing sender' });
            }
            if (!message || message.trim() === '') {
                return this.replyToUser(res, sender, 'Halo! Saya adalah Asisten AI SI-TAQUA. Ada yang bisa saya bantu? Silakan kirimkan pertanyaan Anda.');
            }
            const pending = this.pendingActions[sender];
            const normalizedMessage = message.trim().toUpperCase();
            if (pending && (normalizedMessage === 'YA' || normalizedMessage === 'TIDAK')) {
                if (normalizedMessage === 'YA') {
                    try {
                        const result = await this.executeAction(pending.intent, pending.parameters);
                        delete this.pendingActions[sender];
                        const replyText = `✅ *Data berhasil disimpan!*\n\nDetail:\n- Aksi: *${pending.intent.replace('tambah_', 'Input ')}*\n- Nama: *${pending.parameters.resolved_name}*`;
                        return this.replyToUser(res, sender, replyText);
                    }
                    catch (execError) {
                        this.logger.error('Failed to execute pending database action:', execError);
                        delete this.pendingActions[sender];
                        return this.replyToUser(res, sender, `❌ *Gagal menyimpan data:* ${execError.message || execError}`);
                    }
                }
                else {
                    delete this.pendingActions[sender];
                    return this.replyToUser(res, sender, '❌ *Transaksi dibatalkan.*');
                }
            }
            let parsed;
            try {
                parsed = await this.aiService.parseIntent(message, sender);
            }
            catch (parseError) {
                this.logger.error('AI Intent parsing failed. Falling back to default parser.', parseError);
                parsed = { intent: 'chitchat', parameters: {} };
            }
            this.logger.log(`Parsed Intent: ${parsed.intent}, Params: ${JSON.stringify(parsed.parameters)}`);
            if (parsed.intent.startsWith('tambah_') || parsed.intent === 'update_data' || parsed.intent === 'koreksi_data') {
                let santriId = null;
                let santriName = parsed.parameters?.santri_name;
                if (santriName) {
                    try {
                        const matchingSantri = await this.supabaseService.findSantriByName(santriName);
                        if (matchingSantri && matchingSantri.length > 0) {
                            santriId = matchingSantri[0].id;
                            parsed.parameters.santri_id = santriId;
                            parsed.parameters.resolved_name = matchingSantri[0].nama;
                        }
                        else {
                            return this.replyToUser(res, sender, `Maaf, santri dengan nama "${santriName}" tidak ditemukan. Silakan ulangi dengan nama yang benar.`);
                        }
                    }
                    catch (dbError) {
                        this.logger.error('Error querying student during write prep:', dbError);
                        return this.replyToUser(res, sender, `⚠️ Gagal mencari nama santri akibat gangguan koneksi database.`);
                    }
                }
                else {
                    return this.replyToUser(res, sender, `Format pesan kurang lengkap. Tolong sebutkan nama santri dengan jelas.`);
                }
                this.pendingActions[sender] = {
                    intent: parsed.intent,
                    parameters: parsed.parameters,
                    timestamp: Date.now()
                };
                let confirmationText = `Saya mendengar:\n`;
                if (parsed.parameters.resolved_name)
                    confirmationText += `- Santri: *${parsed.parameters.resolved_name}*\n`;
                if (parsed.parameters.nominal)
                    confirmationText += `- Nominal: *Rp${Number(parsed.parameters.nominal).toLocaleString('id-ID')}*\n`;
                if (parsed.parameters.kategori)
                    confirmationText += `- Kategori: *${parsed.parameters.kategori}*\n`;
                if (parsed.parameters.juz)
                    confirmationText += `- Juz: *${parsed.parameters.juz}*\n`;
                if (parsed.parameters.surah)
                    confirmationText += `- Surah: *${parsed.parameters.surah}*\n`;
                if (parsed.parameters.status)
                    confirmationText += `- Status: *${parsed.parameters.status}*\n`;
                if (parsed.parameters.keterangan)
                    confirmationText += `- Keterangan: *${parsed.parameters.keterangan}*\n`;
                if (parsed.parameters.isi_catatan)
                    confirmationText += `- Isi Catatan: *${parsed.parameters.isi_catatan}*\n`;
                confirmationText += `\nApakah data ini sudah benar?\nBalas *YA* atau *TIDAK*.`;
                return this.replyToUser(res, sender, confirmationText);
            }
            let dbResult = null;
            let targetSantri = null;
            if (parsed.parameters?.santri_name) {
                try {
                    const matchingSantri = await this.supabaseService.findSantriByName(parsed.parameters.santri_name);
                    if (matchingSantri && matchingSantri.length > 0) {
                        targetSantri = matchingSantri[0];
                    }
                }
                catch (dbError) {
                    this.logger.error('Error resolving student name:', dbError);
                }
            }
            try {
                switch (parsed.intent) {
                    case 'check_pembayaran':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan atau nama kurang jelas.' };
                        }
                        else {
                            dbResult = await this.supabaseService.checkPembayaran(targetSantri.id, parsed.parameters.bulan);
                        }
                        break;
                    case 'get_hafalan':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan atau nama kurang jelas.' };
                        }
                        else {
                            dbResult = await this.supabaseService.getHafalan(targetSantri.id);
                        }
                        break;
                    case 'get_nilai':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan atau nama kurang jelas.' };
                        }
                        else {
                            dbResult = await this.supabaseService.getNilai(targetSantri.id);
                        }
                        break;
                    case 'get_tidak_setor_today':
                        dbResult = await this.supabaseService.getWhoHasNotDepositedToday();
                        break;
                    case 'get_pemasukan_bulan':
                        dbResult = await this.supabaseService.getTotalPemasukanBulanIni();
                        break;
                    case 'get_presence_today':
                        dbResult = await this.supabaseService.getSantriHadirHariIni();
                        break;
                    case 'get_santri_most_izin':
                        dbResult = await this.supabaseService.getSantriPalingBanyakIzin();
                        break;
                    case 'get_perkembangan_summary':
                        if (!targetSantri) {
                            dbResult = { error: 'Santri tidak ditemukan atau nama kurang jelas.' };
                        }
                        else {
                            const h = await this.supabaseService.getHafalan(targetSantri.id);
                            const n = await this.supabaseService.getNilai(targetSantri.id);
                            const p = await this.supabaseService.getPresensi(targetSantri.id);
                            dbResult = {
                                santri: targetSantri.nama,
                                hafalan: h.slice(0, 5),
                                nilai: n,
                                presensi: p.slice(0, 10)
                            };
                        }
                        break;
                    case 'get_tunggakan_terbesar':
                        dbResult = await this.supabaseService.getTunggakanTerbesar();
                        break;
                    case 'get_pemasukan_perbandingan':
                        dbResult = await this.supabaseService.getPemasukanPerbandingan();
                        break;
                    case 'get_guru_belum_absen':
                        dbResult = await this.supabaseService.getGuruBelumAbsen();
                        break;
                    case 'get_jumlah_santri_aktif':
                        dbResult = { jumlah_santri_aktif: await this.supabaseService.getActiveSantriCount() };
                        break;
                    case 'chitchat':
                    default:
                        dbResult = { status: 'general conversation' };
                        break;
                }
            }
            catch (dbError) {
                this.logger.error(`Database query failed for intent ${parsed.intent}:`, dbError);
                dbResult = { error: 'Terjadi gangguan saat mengambil data dari database.' };
            }
            const reply = await this.aiService.generateResponse(message, parsed.intent, dbResult, sender);
            return this.replyToUser(res, sender, reply);
        }
        catch (error) {
            this.logger.error('Error handling Fonnte webhook:', error);
            if (sender) {
                await this.sendFonnteMessage(sender, '⚠️ Maaf, terjadi kesalahan teknis pada sistem asisten saat memproses pesan Anda.');
            }
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                reply: 'Maaf, terjadi kesalahan internal.'
            });
        }
    }
    async executeAction(intent, parameters) {
        const santriId = parameters.santri_id;
        if (!santriId)
            throw new Error('Santri ID is required to execute action');
        switch (intent) {
            case 'tambah_pembayaran':
                return await this.supabaseService.addPembayaran(santriId, parameters.kategori || 'SPP Bulanan', Number(parameters.nominal));
            case 'tambah_hafalan':
                return await this.supabaseService.addHafalan(santriId, Number(parameters.juz || 1), parameters.surah || '', Number(parameters.ayat_awal || 0), Number(parameters.ayat_akhir || 0), parameters.status || 'Proses');
            case 'tambah_absensi':
            case 'tambah_perizinan':
                return await this.supabaseService.addAbsensi(santriId, parameters.status || 'hadir', parameters.keterangan || '');
            case 'tambah_pelanggaran':
                return await this.supabaseService.addPelanggaran(santriId, parameters.kategori || 'Lainnya', Number(parameters.tingkat || 1), parameters.keterangan || '');
            case 'tambah_prestasi':
                return await this.supabaseService.addCatatanPembinaan(santriId, 'PUJIAN', parameters.isi_catatan || 'Mendapatkan prestasi');
            case 'tambah_catatan_guru':
                return await this.supabaseService.addCatatanPembinaan(santriId, 'CATATAN', parameters.isi_catatan || '');
            default:
                throw new Error(`Unsupported action intent: ${intent}`);
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