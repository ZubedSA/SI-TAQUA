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
        this.processedMessages = new Map();
        this.sentMessages = new Map();
    }
    normalizeText(txt) {
        let clean = txt.trim();
        clean = clean.replace(/>\s*_?Sent\s+via\s+fonnte\.com_?/i, '');
        return clean.trim().replace(/\s+/g, ' ').toLowerCase();
    }
    isSamePhone(phone1, phone2) {
        const clean1 = phone1.replace(/\D/g, '');
        const clean2 = phone2.replace(/\D/g, '');
        if (!clean1 || !clean2)
            return false;
        if (clean1.length >= 9 && clean2.length >= 9) {
            return clean1.slice(-9) === clean2.slice(-9);
        }
        return clean1 === clean2;
    }
    isBotSentMessage(text) {
        const norm = this.normalizeText(text);
        const timestamp = this.sentMessages.get(norm);
        if (!timestamp)
            return false;
        if (Date.now() - timestamp < 2 * 60 * 1000) {
            return true;
        }
        this.sentMessages.delete(norm);
        return false;
    }
    handleSantriMatches(matches, searchName) {
        if (!matches || matches.length === 0) {
            return { target: null };
        }
        if (matches.length === 1) {
            return { target: matches[0] };
        }
        const exactMatch = matches.find(s => s.nama.toLowerCase() === searchName.toLowerCase());
        if (exactMatch) {
            return { target: exactMatch };
        }
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
    cleanupExpiredPending() {
        const now = Date.now();
        for (const [sender, action] of Object.entries(this.pendingActions)) {
            if (now - action.timestamp > 10 * 60 * 1000) {
                delete this.pendingActions[sender];
            }
        }
    }
    cleanupExpiredProcessed() {
        const now = Date.now();
        for (const [msgId, item] of this.processedMessages.entries()) {
            if (now - item.timestamp > 10 * 60 * 1000) {
                this.processedMessages.delete(msgId);
            }
        }
    }
    cleanupExpiredSentMessages() {
        const now = Date.now();
        for (const [text, timestamp] of this.sentMessages.entries()) {
            if (now - timestamp > 2 * 60 * 1000) {
                this.sentMessages.delete(text);
            }
        }
    }
    async sendFonnteMessage(target, message) {
        this.sentMessages.set(this.normalizeText(message), Date.now());
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
    async replyToUser(res, target, text, messageId) {
        if (messageId) {
            this.processedMessages.set(messageId, { status: 'completed', timestamp: Date.now() });
        }
        await this.sendFonnteMessage(target, text);
        return res.status(common_1.HttpStatus.OK).json({ reply: text });
    }
    async getDebugLogs(res) {
        try {
            const { data, error } = await this.supabaseService.getRecentWebhookLogs();
            if (error)
                throw error;
            return res.status(common_1.HttpStatus.OK).json(data);
        }
        catch (err) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }
    async getDebugDb(res) {
        try {
            const data = await this.supabaseService.getDebugDbData();
            return res.status(common_1.HttpStatus.OK).json(data);
        }
        catch (err) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }
    async handleWebhook(req, res) {
        const startTime = Date.now();
        let sender = '';
        let message = '';
        let messageId = '';
        let parsed = { intent: 'chitchat', parameters: {} };
        let executedQuery = '';
        let dbResult = null;
        try {
            this.cleanupExpiredPending();
            this.cleanupExpiredProcessed();
            this.cleanupExpiredSentMessages();
            const body = req.body || {};
            const query = req.query || {};
            await this.supabaseService.logWebhookPayload(body, query);
            if (body.status || body.state || body.stateid) {
                this.logger.log(`Mengabaikan status update webhook: ID=${body.id || 'N/A'}, Status=${body.status || body.state}`);
                return res.status(common_1.HttpStatus.OK).json({ status: 'ignored_status_update' });
            }
            sender = body.sender || query.sender || body.from || query.from || '';
            message = body.message || query.message || body.text || query.text || '';
            const device = body.device || query.device || '';
            const member = body.member || query.member || '';
            messageId = body.id || body.inboxid || query.id || query.inboxid || '';
            this.logger.log(`Webhook: Sender="${sender}", Device="${device}", Member="${member}", MessageId="${messageId}", Message="${message}"`);
            if (!sender) {
                this.logger.warn('Sender tidak ditemukan di request.');
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Missing sender' });
            }
            if (device && (this.isSamePhone(sender, device) || (member && this.isSamePhone(member, device)))) {
                if (this.isBotSentMessage(message)) {
                    this.logger.log(`Mengabaikan pesan keluar dari device sendiri (${device}) untuk menghindari loop.`);
                    return res.status(common_1.HttpStatus.OK).json({ status: 'ignored_self_message' });
                }
            }
            if (messageId) {
                const existing = this.processedMessages.get(messageId);
                if (existing) {
                    this.logger.log(`Pesan dengan ID ${messageId} sedang/sudah diproses secara in-memory (${existing.status}). Mengabaikan duplikasi.`);
                    return res.status(common_1.HttpStatus.OK).json({ status: 'duplicate_ignored', original_status: existing.status });
                }
                const isProcessed = await this.supabaseService.isMessageProcessed(messageId);
                if (isProcessed) {
                    this.logger.log(`Pesan dengan ID ${messageId} sudah diproses secara database. Mengabaikan duplikasi.`);
                    return res.status(common_1.HttpStatus.OK).json({ status: 'duplicate_ignored', original_status: 'database' });
                }
                this.processedMessages.set(messageId, { status: 'in_progress', timestamp: Date.now() });
                await this.supabaseService.markMessageProcessed(messageId);
            }
            if (!message || message.trim() === '') {
                const replyText = "Halo! 👋 Saya adalah *Asisten AI SI-TAQUA*. Silakan kirim pertanyaan Anda tentang hafalan, pembayaran, nilai, atau kehadiran santri.";
                await this.supabaseService.logAiInteraction(message, 'chitchat', 'chitchat', {}, 'Empty Message', null, replyText, Date.now() - startTime);
                return this.replyToUser(res, sender, replyText, messageId);
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
                        await this.supabaseService.logAiInteraction(message, pending.intent, pending.intent, pending.parameters, `executeAction(${pending.intent})`, result, replyText, Date.now() - startTime);
                        return this.replyToUser(res, sender, replyText, messageId);
                    }
                    catch (execError) {
                        this.logger.error('Gagal eksekusi pending action:', execError);
                        delete this.pendingActions[sender];
                        const replyText = `❌ *Gagal menyimpan data:* ${execError.message || execError}`;
                        await this.supabaseService.logAiInteraction(message, pending.intent, pending.intent, pending.parameters, `executeAction(${pending.intent})`, null, replyText, Date.now() - startTime, execError.message || 'Execution Error');
                        return this.replyToUser(res, sender, replyText, messageId);
                    }
                }
                else if (CONFIRM_NO.has(normalizedMsg)) {
                    delete this.pendingActions[sender];
                    const replyText = '❌ *Transaksi dibatalkan.* Ada lagi yang bisa saya bantu?';
                    await this.supabaseService.logAiInteraction(message, 'konfirmasi_tidak', 'konfirmasi_tidak', {}, 'Cancel Pending Action', null, replyText, Date.now() - startTime);
                    return this.replyToUser(res, sender, replyText, messageId);
                }
                delete this.pendingActions[sender];
            }
            try {
                parsed = await this.aiService.parseIntent(message, sender);
            }
            catch (parseError) {
                this.logger.error('AI intent parsing gagal, fallback chitchat:', parseError);
                parsed = { intent: 'chitchat', parameters: {} };
            }
            this.logger.log(`Intent/Function: ${parsed.intent} | Params: ${JSON.stringify(parsed.parameters)}`);
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
                let matchingSantri;
                try {
                    matchingSantri = await this.supabaseService.findSantriByName(santriName);
                }
                catch (dbError) {
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
                await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Pending Confirm Created', null, confirmText, Date.now() - startTime);
                return this.replyToUser(res, sender, confirmText, messageId);
            }
            let targetSantri = null;
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
                    }
                    catch (dbError) {
                        this.logger.error('Gagal resolve santri name:', dbError);
                    }
                }
                else {
                    try {
                        const matches = await this.supabaseService.findSantriByWaliPhone(sender);
                        const resolution = this.handleSantriMatches(matches, 'Anak Anda');
                        if (resolution.clarification) {
                            const clarText = resolution.clarification.replace('dengan nama "Anak Anda"', 'yang terhubung dengan nomor Anda');
                            await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, 'Clarification Wali Ganda', null, clarText, Date.now() - startTime);
                            return this.replyToUser(res, sender, clarText, messageId);
                        }
                        targetSantri = resolution.target;
                    }
                    catch (dbError) {
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
                }
                else {
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
                        dbResult = allPres ? allPres.filter((p) => p.status === 'izin') : [];
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
                        dbResult = { status: 'chitchat', reply: parsed.parameters?.pesan || 'Halo! Ada yang bisa saya bantu?' };
                        break;
                }
            }
            catch (dbError) {
                this.logger.error(`Database query gagal untuk intent ${parsed.intent}:`, dbError);
                dbResult = { error: 'Terjadi gangguan saat mengambil data dari database. Coba lagi sebentar ya.' };
            }
            let reply;
            const cleanName = targetSantri?.nama || parsed.parameters?.santri_name || 'santri';
            if (parsed.intent !== 'chitchat' && (!dbResult || (Array.isArray(dbResult) && dbResult.length === 0))) {
                let type = 'data';
                if (parsed.intent === 'cekPembayaran' || parsed.intent === 'cekTagihan')
                    type = 'pembayaran';
                if (parsed.intent === 'cekHafalan')
                    type = 'hafalan';
                if (parsed.intent === 'cekNilai')
                    type = 'nilai';
                if (parsed.intent === 'cekAbsensi')
                    type = 'kehadiran';
                if (parsed.intent === 'cekPerizinan')
                    type = 'perizinan';
                if (parsed.intent === 'cekPrestasi')
                    type = 'prestasi';
                reply = `Maaf, data ${type} ${cleanName} tidak ditemukan.`;
            }
            else {
                if (parsed.intent === 'chitchat') {
                    reply = dbResult.reply;
                }
                else {
                    reply = await this.aiService.generateResponse(message, parsed.intent, dbResult, sender);
                }
            }
            await this.supabaseService.logAiInteraction(message, parsed.intent, parsed.intent, parsed.parameters, executedQuery, dbResult, reply, Date.now() - startTime, dbResult?.error || '');
            return this.replyToUser(res, sender, reply, messageId);
        }
        catch (error) {
            this.logger.error('Error global di handleWebhook:', error);
            if (messageId) {
                this.processedMessages.set(messageId, { status: 'completed', timestamp: Date.now() });
            }
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
            case 'tambahPembayaran':
                return await this.supabaseService.addPembayaran(santriId, parameters.kategori || 'SPP Bulanan', Number(parameters.nominal));
            case 'tambah_hafalan':
            case 'tambahHafalan':
                return await this.supabaseService.addHafalan(santriId, Number(parameters.juz || 1), parameters.surah || '', Number(parameters.ayat_awal || 1), Number(parameters.ayat_akhir || parameters.ayat_awal || 1), parameters.status || 'Proses');
            case 'tambah_absensi':
            case 'tambahAbsensi':
            case 'tambah_perizinan':
            case 'tambahPerizinan':
                return await this.supabaseService.addAbsensi(santriId, parameters.status || 'hadir', parameters.keterangan || '');
            case 'tambah_nilai':
            case 'tambahNilai':
                return await this.supabaseService.addNilai(santriId, parameters.mapel || '', Number(parameters.nilai || parameters.nilai_akhir || 0), parameters.semester || '1');
            case 'tambah_pelanggaran':
            case 'tambahPelanggaran':
                return await this.supabaseService.addPelanggaran(santriId, parameters.kategori || 'Lainnya', Number(parameters.tingkat || 1), parameters.keterangan || '');
            case 'tambah_prestasi':
            case 'tambahPrestasi':
                return await this.supabaseService.addCatatanPembinaan(santriId, 'PUJIAN', parameters.isi_catatan || 'Mendapatkan prestasi');
            case 'tambah_catatan_guru':
            case 'tambahCatatanGuru':
                return await this.supabaseService.addCatatanPembinaan(santriId, 'CATATAN', parameters.isi_catatan || '');
            default:
                throw new Error(`Aksi tidak dikenali: ${intent}`);
        }
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Get)('webhook/debug-logs'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "getDebugLogs", null);
__decorate([
    (0, common_1.Get)('webhook/debug-db'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "getDebugDb", null);
__decorate([
    (0, common_1.Post)('webhook'),
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