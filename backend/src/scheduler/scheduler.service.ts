import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface SesiMengajar {
  tipe: 'MADROSAH' | 'HALAQOH';
  jam_ke: number;
  jam_mulai?: string;
  jam_selesai?: string;
  targetNama: string;
  mapelNama?: string;
}

export interface GuruScheduleGroup {
  guruId: string;
  namaGuru: string;
  noTelp: string;
  jadwal: SesiMengajar[];
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly supabaseService: SupabaseService) { }

  /**
   * Helper untuk mendapatkan tanggal dan nama hari sesuai zona waktu Indonesia Barat (WIB, UTC+7)
   */
  getWIBDateInfo(overrideDateStr?: string) {
    let now = new Date();
    if (overrideDateStr) {
      now = new Date(overrideDateStr);
    }

    // Format tanggal ke YYYY-MM-DD sesuai Asia/Jakarta
    const dtfJakarta = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const dateStr = overrideDateStr || dtfJakarta.format(now);

    // Ambil nama hari dalam bahasa Indonesia
    const dayFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long'
    });
    const rawDay = dayFormatter.format(now);

    // Normalisasi nama hari agar cocok dengan kolom `hari` di jadwal (Ahad/Minggu -> Ahad)
    let dayName = rawDay;
    if (rawDay.toLowerCase() === 'minggu') dayName = 'Ahad';
    else if (rawDay.toLowerCase() === 'jum\'at' || rawDay.toLowerCase() === 'jumat') dayName = 'Jumat';

    // Format tanggal panjang untuk teks pesan (misal: "Sabtu, 14 November 2026")
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

  /**
   * Cek apakah tanggal ini libur sesuai kalender akademik
   */
  async getActiveHolidays(dateStr: string) {
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
        if (['madrasah', 'madrosah'].includes(c)) scope = 'Madrosah';
        else if (['halaqoh', 'quraniyah'].includes(c)) scope = 'Quraniyah';
      } else {
        const match = (h.deskripsi || '').match(/\[Cakupan:\s*(Semua|Madrosah|Quraniyah)\]/i);
        if (match) scope = match[1];
      }
      return { ...h, scope };
    });
  }

  /**
   * Kumpulkan seluruh jadwal guru hari ini
   */
  async getTodayTeacherSchedules(overrideDateStr?: string) {
    const { dateStr, dayName, formattedDate } = this.getWIBDateInfo(overrideDateStr);
    const supabase = this.supabaseService.getClient();

    // 1. Cek Hari Libur
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

    // 2. Fetch data jadwal, guru, kelas, mapel, halaqoh, dan musyrif
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

    // Resolver helper
    const resolveToGuru = (targetId: string) => {
      if (!targetId) return null;
      const cleanId = String(targetId).toLowerCase();
      if (guruMap[targetId]) return guruMap[targetId];
      const byUserId = guruList.find(g => g.user_id && String(g.user_id).toLowerCase() === cleanId);
      if (byUserId) return byUserId;
      const prof = profilesList.find(p => p.user_id && String(p.user_id).toLowerCase() === cleanId);
      if (prof?.guru_id && guruMap[prof.guru_id]) return guruMap[prof.guru_id];
      if (prof?.email) {
        const byEmail = guruList.find(g => g.email && g.email.toLowerCase() === prof.email.toLowerCase());
        if (byEmail) return byEmail;
      }
      return null;
    };

    const halaqohToMusyrifs: Record<string, string[]> = {};
    mhData.forEach(mh => {
      if (!halaqohToMusyrifs[mh.halaqoh_id]) halaqohToMusyrifs[mh.halaqoh_id] = [];
      const resolved = resolveToGuru(mh.user_id);
      if (resolved && !halaqohToMusyrifs[mh.halaqoh_id].includes(resolved.id)) {
        halaqohToMusyrifs[mh.halaqoh_id].push(resolved.id);
      }
    });

    const teacherSchedules: Record<string, SesiMengajar[]> = {};

    rawJadwal.forEach(j => {
      const isHalaqoh = j.tipe === 'HALAQOH' || Boolean(j.halaqoh_id);

      // Jika tipe sesi ini sedang libur, lewati
      if (isHalaqoh && isQuraniyahHoliday) return;
      if (!isHalaqoh && isMadrosahHoliday) return;

      const targetHalaqohId = j.halaqoh_id || j.referensi_id;

      if (isHalaqoh && targetHalaqohId) {
        const musyrifIds = halaqohToMusyrifs[targetHalaqohId] || [];
        const hData = halaqohMap[targetHalaqohId];
        const hName = hData?.nama || 'Kelompok Halaqoh';

        const assignToMusyrif = (gid: string) => {
          if (!teacherSchedules[gid]) teacherSchedules[gid] = [];
          teacherSchedules[gid].push({
            tipe: 'HALAQOH',
            jam_ke: j.jam_ke || 1,
            jam_mulai: j.jam_mulai,
            jam_selesai: j.jam_selesai,
            targetNama: hName
          });
        };

        // PRIORITAS 1: Jika jadwal_pelajaran memiliki guru_id spesifik yang aktif
        const directGuru = resolveToGuru(j.guru_id);
        if (directGuru && directGuru.status === 'Aktif') {
          assignToMusyrif(directGuru.id);
        } else if (musyrifIds.length > 0) {
          musyrifIds.forEach(gid => assignToMusyrif(gid));
        } else {
          const direct = resolveToGuru(hData?.musyrif_id);
          if (direct) assignToMusyrif(direct.id);
        }
      } else {
        // Madrasah
        const g = resolveToGuru(j.guru_id);
        if (g && g.status === 'Aktif') {
          if (!teacherSchedules[g.id]) teacherSchedules[g.id] = [];
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

    // Bentuk kelompok data guru yang akan menerima WA
    const guruGroups: GuruScheduleGroup[] = [];

    Object.entries(teacherSchedules).forEach(([gid, schedules]) => {
      const guru = guruMap[gid];
      if (!guru || guru.status !== 'Aktif') return;

      // Cari nomor telepon dari data guru atau user_profiles
      let rawPhone = guru.no_telp || '';
      if (!rawPhone) {
        const prof = profilesList.find(p => p.guru_id === gid || (guru.email && p.email?.toLowerCase() === guru.email.toLowerCase()));
        if (prof?.no_hp) rawPhone = prof.no_hp;
      }

      // Sort jadwal secara kronologis berdasarkan waktu jam_mulai dahulu, lalu jam_ke
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

  /**
   * Format pesan pengingat jadwal guru
   */
  formatReminderMessage(namaGuru: string, hari: string, tanggal: string, jadwal: SesiMengajar[]): string {
    const jadwalItems = jadwal.map((j, idx) => {
      const num = idx + 1;
      const jamMulai = j.jam_mulai ? j.jam_mulai.substring(0, 5) : '';
      const jamSelesai = j.jam_selesai ? j.jam_selesai.substring(0, 5) : '';
      const jamStr = jamMulai && jamSelesai ? `${jamMulai} - ${jamSelesai} WIB` : (jamMulai ? `Pukul ${jamMulai} WIB` : '');
      const isHalaqoh = j.tipe === 'HALAQOH';
      const sesiTitle = isHalaqoh ? "Halaqoh Qur'an" : "Madrasah";
      const sesiNomor = j.jam_ke ? `(Jam Ke-${j.jam_ke})` : '';
      const waktuHeader = jamStr ? `*${jamStr}* ${sesiNomor}`.trim() : `*Jam Ke-${j.jam_ke || num}*`;

      const subItems: string[] = [];
      subItems.push(`   • Jenis: *${sesiTitle}*`);
      if (isHalaqoh) {
        subItems.push(`   • Kelompok: ${j.targetNama}`);
      } else {
        subItems.push(`   • Kelas: ${j.targetNama}`);
        if (j.mapelNama) subItems.push(`   • Mapel: ${j.mapelNama}`);
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

  /**
   * Normalisasi nomor telepon ke format internasional (62xxx)
   */
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
    else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
    else if (!cleaned.startsWith('62') && !cleaned.startsWith('60') && !cleaned.startsWith('65') && cleaned.length >= 9) {
      cleaned = '62' + cleaned;
    }
    if (cleaned.length < 9) return '';
    return cleaned;
  }

  /**
   * Kirim pesan ke API Fonnte
   */
  async sendFonnte(target: string, message: string): Promise<{ success: boolean; data?: any; error?: string }> {
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
        signal: AbortSignal.timeout(6000), // 6 detik per panggilan agar muat dalam batas serverless
      });

      const resData = await response.json();
      if (response.ok && (resData.status === true || resData.status === 'true')) {
        return { success: true, data: resData };
      } else {
        return { success: false, error: resData.reason || resData.message || 'Gagal kirim Fonnte' };
      }
    } catch (e: any) {
      this.logger.error(`[Fonnte Scheduler] Error kirim ke ${formattedTarget}: ${e.message || e}`);
      return { success: false, error: e.message || 'Network error' };
    }
  }

  /**
   * Eksekutor utama: Mengirim pengingat jadwal ke seluruh guru yang mengajar hari ini
   */
  async executeTeacherReminders(overrideDateStr?: string) {
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

    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;
    let noPhoneCount = 0;

    // Filter guru yang memiliki nomor telepon valid
    const eligibleTeachers: GuruScheduleGroup[] = [];
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
      } else {
        eligibleTeachers.push(group);
      }
    }

    // Proses pengiriman dalam batch concurrency 2 untuk efisiensi waktu eksekusi Vercel
    const batchSize = 2;
    for (let i = 0; i < eligibleTeachers.length; i += batchSize) {
      const batch = eligibleTeachers.slice(i, i + batchSize);
      await Promise.all(batch.map(async (group) => {
        const msg = this.formatReminderMessage(group.namaGuru, dayName, formattedDate, group.jadwal);
        let sendResult = await this.sendFonnte(group.noTelp, msg);

        // Retry sekali jika gateway sibuk
        if (!sendResult.success && sendResult.error && (
          sendResult.error.toLowerCase().includes('busy') ||
          sendResult.error.toLowerCase().includes('rate')
        )) {
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
        } else {
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

      // Jeda 500ms antar batch agar aman dari batas frekuensi Fonnte
      if (i + batchSize < eligibleTeachers.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.logger.log(`[Scheduler] Selesai: ${successCount} berhasil, ${failedCount} gagal, ${noPhoneCount} tanpa nomor HP.`);

    // Catat histori eksekusi ke audit_log Supabase demi transparansi & pemantauan
    try {
      const supabase = this.supabaseService.getClient();
      await supabase.from('audit_log').insert({
        action: 'BROADCAST_JADWAL_GURU',
        table_name: 'jadwal_pelajaran',
        user_email: 'scheduler@sitaqua.local',
        description: `Pengingat jadwal guru jam 06:00 WIB (${dayName}, ${dateStr}): ${successCount} berhasil, ${failedCount} gagal, ${noPhoneCount} tanpa nomor dari ${guruGroups.length} guru.`
      });
    } catch (logErr: any) {
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
}

