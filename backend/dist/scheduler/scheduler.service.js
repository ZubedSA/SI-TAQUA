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
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(SchedulerService_1.name);
    }
    getWIBDateInfo(overrideDateStr) {
        let now = new Date();
        if (overrideDateStr) {
            now = new Date(overrideDateStr);
        }
        const dtfJakarta = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const dateStr = overrideDateStr || dtfJakarta.format(now);
        const dayFormatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long'
        });
        const rawDay = dayFormatter.format(now);
        let dayName = rawDay;
        if (rawDay.toLowerCase() === 'minggu')
            dayName = 'Ahad';
        else if (rawDay.toLowerCase() === 'jum\'at' || rawDay.toLowerCase() === 'jumat')
            dayName = 'Jumat';
        const fullDateFormatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const formattedDate = fullDateFormatter.format(now);
        return {
            dateStr,
            dayName,
            formattedDate
        };
    }
    async getActiveHolidays(dateStr) {
        const supabase = this.supabaseService.getClient();
        const { data, error } = await supabase
            .from('kalender_akademik')
            .select('*')
            .or('jenis.eq.Libur,judul.ilike.%libur%')
            .lte('tanggal_mulai', dateStr)
            .gte('tanggal_selesai', dateStr);
        if (error) {
            this.logger.warn(`Gagal mengambil kalender akademik: ${error.message}`);
            return [];
        }
        return (data || []).map(h => {
            let scope = 'Semua';
            if (h.cakupan) {
                const c = String(h.cakupan).trim().toLowerCase();
                if (['madrasah', 'madrosah'].includes(c))
                    scope = 'Madrosah';
                else if (['halaqoh', 'quraniyah'].includes(c))
                    scope = 'Quraniyah';
            }
            else {
                const match = (h.deskripsi || '').match(/\[Cakupan:\s*(Semua|Madrosah|Quraniyah)\]/i);
                if (match)
                    scope = match[1];
            }
            return { ...h, scope };
        });
    }
    async getTodayTeacherSchedules(overrideDateStr) {
        const { dateStr, dayName, formattedDate } = this.getWIBDateInfo(overrideDateStr);
        const supabase = this.supabaseService.getClient();
        const holidays = await this.getActiveHolidays(dateStr);
        const isAllHoliday = holidays.some(h => h.scope === 'Semua');
        const isMadrosahHoliday = isAllHoliday || holidays.some(h => h.scope === 'Madrosah');
        const isQuraniyahHoliday = isAllHoliday || holidays.some(h => h.scope === 'Quraniyah');
        if (isAllHoliday) {
            this.logger.log(`[Scheduler] Hari ini (${dateStr}) LIBUR TOTAL sesuai Kalender Akademik. Pengingat tidak dikirim.`);
            return {
                dateStr,
                dayName,
                formattedDate,
                isHoliday: true,
                holidayReason: holidays.map(h => h.judul).join(', '),
                guruGroups: []
            };
        }
        const [jadwalRes, halaqohRes, guruRes, musyrifHalaqohRes, profilesRes, kelasRes, mapelRes] = await Promise.all([
            supabase.from('jadwal_pelajaran').select('*').eq('hari', dayName),
            supabase.from('halaqoh').select('id, nama, musyrif_id'),
            supabase.from('guru').select('id, nama, email, user_id, no_telp, status'),
            supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id'),
            supabase.from('user_profiles').select('user_id, nama, email, guru_id, no_hp'),
            supabase.from('kelas').select('id, nama'),
            supabase.from('mata_pelajaran').select('id, nama')
        ]);
        const rawJadwal = jadwalRes.data || [];
        const halaqohMap = (halaqohRes.data || []).reduce((acc, h) => ({ ...acc, [h.id]: h }), {});
        const guruMap = (guruRes.data || []).reduce((acc, g) => ({ ...acc, [g.id]: g }), {});
        const guruList = guruRes.data || [];
        const profilesList = profilesRes.data || [];
        const kelasMap = (kelasRes.data || []).reduce((acc, k) => ({ ...acc, [k.id]: k }), {});
        const mapelMap = (mapelRes.data || []).reduce((acc, m) => ({ ...acc, [m.id]: m }), {});
        const mhData = musyrifHalaqohRes.data || [];
        const resolveToGuru = (targetId) => {
            if (!targetId)
                return null;
            const cleanId = String(targetId).toLowerCase();
            if (guruMap[targetId])
                return guruMap[targetId];
            const byUserId = guruList.find(g => g.user_id && String(g.user_id).toLowerCase() === cleanId);
            if (byUserId)
                return byUserId;
            const prof = profilesList.find(p => p.user_id && String(p.user_id).toLowerCase() === cleanId);
            if (prof?.guru_id && guruMap[prof.guru_id])
                return guruMap[prof.guru_id];
            if (prof?.email) {
                const byEmail = guruList.find(g => g.email && g.email.toLowerCase() === prof.email.toLowerCase());
                if (byEmail)
                    return byEmail;
            }
            return null;
        };
        const halaqohToMusyrifs = {};
        mhData.forEach(mh => {
            if (!halaqohToMusyrifs[mh.halaqoh_id])
                halaqohToMusyrifs[mh.halaqoh_id] = [];
            const resolved = resolveToGuru(mh.user_id);
            if (resolved && !halaqohToMusyrifs[mh.halaqoh_id].includes(resolved.id)) {
                halaqohToMusyrifs[mh.halaqoh_id].push(resolved.id);
            }
        });
        const teacherSchedules = {};
        rawJadwal.forEach(j => {
            const isHalaqoh = j.tipe === 'HALAQOH' || Boolean(j.halaqoh_id);
            if (isHalaqoh && isQuraniyahHoliday)
                return;
            if (!isHalaqoh && isMadrosahHoliday)
                return;
            const targetHalaqohId = j.halaqoh_id || j.referensi_id;
            if (isHalaqoh && targetHalaqohId) {
                const musyrifIds = halaqohToMusyrifs[targetHalaqohId] || [];
                const hData = halaqohMap[targetHalaqohId];
                const hName = hData?.nama || 'Kelompok Halaqoh';
                const assignToMusyrif = (gid) => {
                    if (!teacherSchedules[gid])
                        teacherSchedules[gid] = [];
                    teacherSchedules[gid].push({
                        tipe: 'HALAQOH',
                        jam_ke: j.jam_ke || 1,
                        jam_mulai: j.jam_mulai,
                        jam_selesai: j.jam_selesai,
                        targetNama: hName
                    });
                };
                const directGuru = resolveToGuru(j.guru_id);
                if (directGuru && directGuru.status === 'Aktif') {
                    assignToMusyrif(directGuru.id);
                }
                else if (musyrifIds.length > 0) {
                    musyrifIds.forEach(gid => assignToMusyrif(gid));
                }
                else {
                    const direct = resolveToGuru(hData?.musyrif_id);
                    if (direct)
                        assignToMusyrif(direct.id);
                }
            }
            else {
                const g = resolveToGuru(j.guru_id);
                if (g && g.status === 'Aktif') {
                    if (!teacherSchedules[g.id])
                        teacherSchedules[g.id] = [];
                    const kName = kelasMap[j.kelas_id]?.nama || 'Kelas';
                    const mName = mapelMap[j.mapel_id]?.nama || '';
                    teacherSchedules[g.id].push({
                        tipe: 'MADROSAH',
                        jam_ke: j.jam_ke || 1,
                        jam_mulai: j.jam_mulai,
                        jam_selesai: j.jam_selesai,
                        targetNama: kName,
                        mapelNama: mName
                    });
                }
            }
        });
        const guruGroups = [];
        Object.entries(teacherSchedules).forEach(([gid, schedules]) => {
            const guru = guruMap[gid];
            if (!guru || guru.status !== 'Aktif')
                return;
            let rawPhone = guru.no_telp || '';
            if (!rawPhone) {
                const prof = profilesList.find(p => p.guru_id === gid || (guru.email && p.email?.toLowerCase() === guru.email.toLowerCase()));
                if (prof?.no_hp)
                    rawPhone = prof.no_hp;
            }
            schedules.sort((a, b) => {
                if (a.jam_mulai && b.jam_mulai) {
                    return a.jam_mulai.localeCompare(b.jam_mulai);
                }
                return Number(a.jam_ke || 0) - Number(b.jam_ke || 0);
            });
            guruGroups.push({
                guruId: gid,
                namaGuru: guru.nama,
                noTelp: rawPhone,
                jadwal: schedules
            });
        });
        return {
            dateStr,
            dayName,
            formattedDate,
            isHoliday: false,
            guruGroups
        };
    }
    formatReminderMessage(namaGuru, hari, tanggal, jadwal) {
        const jadwalItems = jadwal.map((j, idx) => {
            const num = idx + 1;
            const jamMulai = j.jam_mulai ? j.jam_mulai.substring(0, 5) : '';
            const jamSelesai = j.jam_selesai ? j.jam_selesai.substring(0, 5) : '';
            const jamStr = jamMulai && jamSelesai ? `${jamMulai} - ${jamSelesai} WIB` : (jamMulai ? `Pukul ${jamMulai} WIB` : '');
            const isHalaqoh = j.tipe === 'HALAQOH';
            const sesiTitle = isHalaqoh ? "Halaqoh Qur'an" : "Madrasah";
            const sesiNomor = j.jam_ke ? `(Jam Ke-${j.jam_ke})` : '';
            const waktuHeader = jamStr ? `*${jamStr}* ${sesiNomor}`.trim() : `*Jam Ke-${j.jam_ke || num}*`;
            const subItems = [];
            subItems.push(`   • Jenis: *${sesiTitle}*`);
            if (isHalaqoh) {
                subItems.push(`   • Kelompok: ${j.targetNama}`);
            }
            else {
                subItems.push(`   • Kelas: ${j.targetNama}`);
                if (j.mapelNama)
                    subItems.push(`   • Mapel: ${j.mapelNama}`);
            }
            return `${num}. ⏰ ${waktuHeader}\n${subItems.join('\n')}`;
        }).join('\n\n');
        const sections = [
            "Assalamu'alaikum Wr. Wb.",
            `Yth. Ustadz *${namaGuru}*`,
            `*PENGINGAT JADWAL MENGAJAR HARI INI*\nHari, Tanggal: *${hari}, ${tanggal}*`,
            `Berikut adalah agenda mengajar Anda hari ini:\n\n${jadwalItems}`,
            "Mohon hadir tepat waktu dan melakukan pemindaian (Scan QR) di lokasi untuk validasi kehadiran & pengisian jurnal santri.",
            "Terima kasih atas dedikasi dan keikhlasannya dalam membimbing para santri.\nJazakumullah Khairan Katsiran.\nWassalamu'alaikum Wr. Wb.",
            "_PTQA BATUAN_"
        ];
        return sections.join('\n\n');
    }
    formatPhoneNumber(phone) {
        if (!phone)
            return '';
        let cleaned = phone.replace(/\D/g, '');
        if (!cleaned)
            return '';
        if (cleaned.startsWith('0'))
            cleaned = '62' + cleaned.substring(1);
        else if (cleaned.startsWith('8'))
            cleaned = '62' + cleaned;
        else if (!cleaned.startsWith('62') && !cleaned.startsWith('60') && !cleaned.startsWith('65') && cleaned.length >= 9) {
            cleaned = '62' + cleaned;
        }
        if (cleaned.length < 9)
            return '';
        return cleaned;
    }
    async sendFonnte(target, message) {
        const token = process.env.FONNTE_TOKEN || '9TKo4vZBPyQ1bjwSniV8';
        if (!token) {
            return { success: false, error: 'Token Fonnte tidak terpasang di environment' };
        }
        const formattedTarget = this.formatPhoneNumber(target);
        if (!formattedTarget || formattedTarget.length < 9) {
            return { success: false, error: 'Nomor telepon tidak valid' };
        }
        const formData = new URLSearchParams();
        formData.append('target', formattedTarget);
        formData.append('message', message);
        try {
            this.logger.log(`[Fonnte Scheduler] Mengirim pengingat jadwal ke ${formattedTarget}...`);
            const response = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                signal: AbortSignal.timeout(6000),
            });
            const resData = await response.json();
            if (response.ok && (resData.status === true || resData.status === 'true')) {
                return { success: true, data: resData };
            }
            else {
                return { success: false, error: resData.reason || resData.message || 'Gagal kirim Fonnte' };
            }
        }
        catch (e) {
            this.logger.error(`[Fonnte Scheduler] Error kirim ke ${formattedTarget}: ${e.message || e}`);
            return { success: false, error: e.message || 'Network error' };
        }
    }
    async executeTeacherReminders(overrideDateStr) {
        this.logger.log(`[Scheduler] Memulai proses pengingat jadwal guru...`);
        const scheduleData = await this.getTodayTeacherSchedules(overrideDateStr);
        if (scheduleData.isHoliday) {
            return {
                success: true,
                skipped: true,
                message: `Hari ini libur: ${scheduleData.holidayReason}. Tidak ada pengingat yang dikirim.`,
                date: scheduleData.dateStr,
                results: []
            };
        }
        const { dateStr, dayName, formattedDate, guruGroups } = scheduleData;
        if (!guruGroups || guruGroups.length === 0) {
            return {
                success: true,
                skipped: true,
                message: `Tidak ada jadwal mengajar pada hari ${dayName}, ${formattedDate}.`,
                date: dateStr,
                results: []
            };
        }
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        let noPhoneCount = 0;
        const eligibleTeachers = [];
        for (const group of guruGroups) {
            if (!group.noTelp) {
                this.logger.warn(`[Scheduler] Ustadz ${group.namaGuru} tidak memiliki nomor telepon terdaftar.`);
                noPhoneCount++;
                results.push({
                    guruId: group.guruId,
                    nama: group.namaGuru,
                    status: 'SKIPPED_NO_PHONE',
                    message: 'Nomor telepon belum diisi di data guru'
                });
            }
            else {
                eligibleTeachers.push(group);
            }
        }
        const batchSize = 2;
        for (let i = 0; i < eligibleTeachers.length; i += batchSize) {
            const batch = eligibleTeachers.slice(i, i + batchSize);
            await Promise.all(batch.map(async (group) => {
                const msg = this.formatReminderMessage(group.namaGuru, dayName, formattedDate, group.jadwal);
                let sendResult = await this.sendFonnte(group.noTelp, msg);
                if (!sendResult.success && sendResult.error && (sendResult.error.toLowerCase().includes('busy') ||
                    sendResult.error.toLowerCase().includes('rate'))) {
                    await new Promise(r => setTimeout(r, 1200));
                    sendResult = await this.sendFonnte(group.noTelp, msg);
                }
                if (sendResult.success) {
                    successCount++;
                    results.push({
                        guruId: group.guruId,
                        nama: group.namaGuru,
                        phone: group.noTelp,
                        status: 'SUCCESS'
                    });
                }
                else {
                    failedCount++;
                    results.push({
                        guruId: group.guruId,
                        nama: group.namaGuru,
                        phone: group.noTelp,
                        status: 'FAILED',
                        error: sendResult.error
                    });
                }
            }));
            if (i + batchSize < eligibleTeachers.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        this.logger.log(`[Scheduler] Selesai: ${successCount} berhasil, ${failedCount} gagal, ${noPhoneCount} tanpa nomor HP.`);
        try {
            const supabase = this.supabaseService.getClient();
            await supabase.from('audit_log').insert({
                action: 'BROADCAST_JADWAL_GURU',
                table_name: 'jadwal_pelajaran',
                user_email: 'scheduler@sitaqua.local',
                description: `Pengingat jadwal guru jam 06:00 WIB (${dayName}, ${dateStr}): ${successCount} berhasil, ${failedCount} gagal, ${noPhoneCount} tanpa nomor dari ${guruGroups.length} guru.`
            });
        }
        catch (logErr) {
            this.logger.warn(`[Scheduler] Gagal catat audit_log: ${logErr.message}`);
        }
        return {
            success: true,
            skipped: false,
            date: dateStr,
            day: dayName,
            totalTeachers: guruGroups.length,
            successCount,
            failedCount,
            noPhoneCount,
            results
        };
    }
};
exports.SchedulerService = SchedulerService;
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map