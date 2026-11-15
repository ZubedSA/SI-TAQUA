import { supabase } from '../lib/supabase'
import { sendWhatsAppViaFonnte, templatePengingatJadwalGuru, formatPhoneNumber } from './whatsapp'

/**
 * AUTO-SENTINEL: Pengingat Jadwal Mengajar Harian untuk Guru
 * ==========================================================
 * Memeriksa jadwal mengajar hari ini secara otomatis di latar belakang,
 * memvalidasi status hari libur kalender akademik, dan mengirim pengingat WA
 * ke seluruh pengajar terjadwal tepat waktu tanpa perlu klik manual.
 */

export const getWIBDateInfo = (targetDate = new Date()) => {
    const dtfJakarta = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
    const dateStr = dtfJakarta.format(targetDate)

    const dayFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long'
    })
    const rawDay = dayFormatter.format(targetDate)
    let dayName = rawDay
    if (rawDay.toLowerCase() === 'minggu') dayName = 'Ahad'
    else if (rawDay.toLowerCase() === "jum'at" || rawDay.toLowerCase() === 'jumat') dayName = 'Jumat'

    const fullDateFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
    const formattedDate = fullDateFormatter.format(targetDate)

    // Current hour and minute in WIB (Asia/Jakarta, UTC+7)
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })
    const timeStr = timeFormatter.format(targetDate) // Format: "06:15"
    const [hStr, mStr] = timeStr.split(':')
    const currentHourWIB = parseInt(hStr, 10)
    const currentMinuteWIB = parseInt(mStr, 10)
    const currentTimeMinutes = currentHourWIB * 60 + currentMinuteWIB

    return { dateStr, dayName, formattedDate, currentHourWIB, currentMinuteWIB, currentTimeMinutes, timeStr }
}

/**
 * Mengumpulkan dan mengelompokkan jadwal mengajar seluruh guru hari ini
 */
export const getTodayTeacherSchedules = async (targetDateStr) => {
    const { dateStr, dayName, formattedDate } = getWIBDateInfo(targetDateStr ? new Date(targetDateStr) : new Date())

    // 1. Cek Hari Libur di Kalender Akademik
    const { data: holidays } = await supabase
        .from('kalender_akademik')
        .select('*')
        .or('jenis.eq.Libur,judul.ilike.%libur%')
        .lte('tanggal_mulai', dateStr)
        .gte('tanggal_selesai', dateStr)

    const holidayList = (holidays || []).map(h => {
        let scope = 'Semua'
        if (h.cakupan) {
            const c = String(h.cakupan).trim().toLowerCase()
            if (['madrasah', 'madrosah'].includes(c)) scope = 'Madrosah'
            else if (['halaqoh', 'quraniyah'].includes(c)) scope = 'Quraniyah'
        }
        return { ...h, scope }
    })

    const isAllHoliday = holidayList.some(h => h.scope === 'Semua')
    if (isAllHoliday) {
        return {
            dateStr,
            dayName,
            formattedDate,
            isHoliday: true,
            holidayReason: holidayList.map(h => h.judul).join(', '),
            teachers: []
        }
    }

    const isMadrosahHoliday = holidayList.some(h => h.scope === 'Madrosah')
    const isQuraniyahHoliday = holidayList.some(h => h.scope === 'Quraniyah')

    // Aliases nama hari agar fleksibel (Ahad / Minggu, Jumat / Jum'at)
    const dayAliases = [dayName]
    if (dayName.toLowerCase() === 'ahad') dayAliases.push('Minggu')
    else if (dayName.toLowerCase() === 'minggu') dayAliases.push('Ahad')
    else if (dayName.toLowerCase() === 'jumat') dayAliases.push("Jum'at", "Jum`at")

    // 2. Query Jadwal, Guru, Halaqoh, User Profiles, Kelas, dan Mapel
    const [jadwalRes, guruRes, halaqohRes, musyrifHalaqohRes, profilesRes, kelasRes, mapelRes] = await Promise.all([
        supabase.from('jadwal_pelajaran').select('*').in('hari', dayAliases),
        supabase.from('guru').select('id, nama, email, user_id, no_telp, status').eq('status', 'Aktif'),
        supabase.from('halaqoh').select('id, nama, musyrif_id'),
        supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id'),
        supabase.from('user_profiles').select('user_id, guru_id, no_hp, email'),
        supabase.from('kelas').select('id, nama'),
        supabase.from('mata_pelajaran').select('id, nama')
    ])

    const rawJadwal = jadwalRes.data || []
    const guruList = guruRes.data || []
    const guruMap = guruList.reduce((acc, g) => ({ ...acc, [g.id]: g }), {})
    const profilesList = profilesRes.data || []
    const halaqohMap = (halaqohRes.data || []).reduce((acc, h) => ({ ...acc, [h.id]: h }), {})
    const kelasMap = (kelasRes.data || []).reduce((acc, k) => ({ ...acc, [k.id]: k }), {})
    const mapelMap = (mapelRes.data || []).reduce((acc, m) => ({ ...acc, [m.id]: m }), {})
    const mhData = musyrifHalaqohRes.data || []

    const resolveToGuru = (targetId) => {
        if (!targetId) return null
        const cleanId = String(targetId).toLowerCase()
        if (guruMap[targetId]) return guruMap[targetId]
        const byUserId = guruList.find(g => g.user_id && String(g.user_id).toLowerCase() === cleanId)
        if (byUserId) return byUserId
        const prof = profilesList.find(p => p.user_id && String(p.user_id).toLowerCase() === cleanId)
        if (prof?.guru_id && guruMap[prof.guru_id]) return guruMap[prof.guru_id]
        if (prof?.email) {
            const byEmail = guruList.find(g => g.email && g.email.toLowerCase() === prof.email.toLowerCase())
            if (byEmail) return byEmail
        }
        return null
    }

    const halaqohToMusyrifs = {}
    mhData.forEach(mh => {
        if (!halaqohToMusyrifs[mh.halaqoh_id]) halaqohToMusyrifs[mh.halaqoh_id] = []
        const resolved = resolveToGuru(mh.user_id)
        if (resolved && !halaqohToMusyrifs[mh.halaqoh_id].includes(resolved.id)) {
            halaqohToMusyrifs[mh.halaqoh_id].push(resolved.id)
        }
    })

    const groupMap = {}

    rawJadwal.forEach(j => {
        const isHalaqoh = j.tipe === 'HALAQOH' || Boolean(j.halaqoh_id)
        if (isHalaqoh && isQuraniyahHoliday) return
        if (!isHalaqoh && isMadrosahHoliday) return

        const targetHalaqohId = j.halaqoh_id || j.referensi_id

        if (isHalaqoh && targetHalaqohId) {
            const musyrifIds = halaqohToMusyrifs[targetHalaqohId] || []
            const hData = halaqohMap[targetHalaqohId]
            const hName = hData?.nama || 'Kelompok Halaqoh'

            const assignToMusyrif = (gid) => {
                const g = guruMap[gid]
                if (!g) return
                if (!groupMap[gid]) {
                    groupMap[gid] = {
                        guruId: gid,
                        namaGuru: g.nama,
                        noTelp: g.no_telp || '',
                        email: g.email || '',
                        jadwal: []
                    }
                }
                groupMap[gid].jadwal.push({
                    tipe: 'HALAQOH',
                    jam_ke: j.jam_ke || 1,
                    jam_mulai: j.jam_mulai,
                    jam_selesai: j.jam_selesai,
                    targetNama: hName
                })
            }

            const directGuru = resolveToGuru(j.guru_id)
            if (directGuru) {
                assignToMusyrif(directGuru.id)
            } else if (musyrifIds.length > 0) {
                musyrifIds.forEach(gid => assignToMusyrif(gid))
            } else {
                const direct = resolveToGuru(hData?.musyrif_id)
                if (direct) assignToMusyrif(direct.id)
            }
        } else {
            const g = resolveToGuru(j.guru_id)
            if (g) {
                if (!groupMap[g.id]) {
                    groupMap[g.id] = {
                        guruId: g.id,
                        namaGuru: g.nama,
                        noTelp: g.no_telp || '',
                        email: g.email || '',
                        jadwal: []
                    }
                }
                const kName = kelasMap[j.kelas_id]?.nama || 'Kelas'
                const mName = mapelMap[j.mapel_id]?.nama || ''
                groupMap[g.id].jadwal.push({
                    tipe: 'MADROSAH',
                    jam_ke: j.jam_ke || 1,
                    jam_mulai: j.jam_mulai,
                    jam_selesai: j.jam_selesai,
                    targetNama: kName,
                    mapelNama: mName
                })
            }
        }
    })

    // Lengkapi nomor telepon dari user_profiles jika guru.no_telp kosong
    Object.values(groupMap).forEach(g => {
        if (!g.noTelp) {
            const prof = profilesList.find(p => p.guru_id === g.guruId || (g.email && p.email?.toLowerCase() === g.email.toLowerCase()))
            if (prof?.no_hp) g.noTelp = prof.no_hp
        }
        // Urutkan jadwal kronologis
        g.jadwal.sort((a, b) => {
            if (a.jam_mulai && b.jam_mulai) return a.jam_mulai.localeCompare(b.jam_mulai)
            return Number(a.jam_ke || 0) - Number(b.jam_ke || 0)
        })
    })

    const teachers = Object.values(groupMap).sort((a, b) => a.namaGuru.localeCompare(b.namaGuru))

    return {
        dateStr,
        dayName,
        formattedDate,
        isHoliday: false,
        teachers
    }
}

/**
 * Memeriksa status dan menjalankan pengiriman pengingat guru harian secara otomatis
 * @param {Object} options - { user, showToast, force?: boolean }
 */
export const checkAndSendDailyGuruReminders = async (options = {}) => {
    // Mode pengujian otomatis via URL parameter: misal buka http://localhost:5173/absensi?test_auto_reminder=true
    const isUrlTest = typeof window !== 'undefined' && window.location.search.includes('test_auto_reminder=true')
    const { user, showToast, force = isUrlTest } = options
    const { dateStr, dayName, formattedDate, currentHourWIB, currentMinuteWIB, currentTimeMinutes, timeStr } = getWIBDateInfo()

    // 1. Cek Batasan Waktu: Pengingat jadwal pagi hanya berjalan di jam 06:00 WIB s/d maksimal 07:00 WIB
    // (06:00 = 360 menit, 07:00 = 420 menit)
    const minTimeMinutes = 6 * 60 // 06:00 WIB
    const maxTimeMinutes = 7 * 60 // 07:00 WIB (maksimal jam 7 pagi)

    if (!force) {
        if (currentTimeMinutes < minTimeMinutes) {
            console.log(`[AutoReminder Guru] Belum memasuki jam 06:00 WIB (sekarang ${timeStr} WIB). Pengingat pagi dijadwalkan pukul 06:00 WIB. Skip.`)
            return { skipped: true, reason: `Belum pukul 06:00 WIB (sekarang ${timeStr} WIB)` }
        }
        if (currentTimeMinutes > maxTimeMinutes) {
            console.log(`[AutoReminder Guru] Sudah melewati batas waktu maksimal jam 07:00 pagi (sekarang ${timeStr} WIB). Tidak mengirim pengingat jadwal pagi. Skip.`)
            return { skipped: true, reason: `Sudah melewati batas maksimal pukul 07:00 WIB (sekarang ${timeStr} WIB)` }
        }
    }

    // 2. Cek Cache Session agar tidak mengecek berkali-kali dalam 1 sesi browser
    const sessionKey = `sitaqua_guru_reminder_${dateStr}`
    if (!force && sessionStorage.getItem(sessionKey) === 'done') {
        return { skipped: true, reason: 'Sudah diperiksa pada sesi ini' }
    }

    try {
        // 3. Cek Audit Log Supabase: Apakah broadcast hari ini sudah pernah berhasil dikirim?
        const { data: existingLogs } = await supabase
            .from('audit_log')
            .select('id, created_at, description')
            .eq('action', 'BROADCAST_JADWAL_GURU')
            .ilike('description', `%${dateStr}%`)
            .limit(1)

        if (!force && existingLogs && existingLogs.length > 0) {
            sessionStorage.setItem(sessionKey, 'done')
            console.log(`[AutoReminder Guru] Pengingat jadwal hari ini (${dateStr}) sudah pernah dikirim sebelumnya. Skip.`)
            return { skipped: true, reason: 'Sudah pernah dikirim hari ini' }
        }

        console.log(`[AutoReminder Guru] Menjalankan pengingat jadwal mengajar harian otomatis (${dayName}, ${dateStr})...`)

        // 4. Kumpulkan Jadwal Hari Ini
        const scheduleData = await getTodayTeacherSchedules(dateStr)
        if (scheduleData.isHoliday) {
            console.log(`[AutoReminder Guru] Hari ini libur (${scheduleData.holidayReason}). Tidak ada pesan dikirim.`)
            sessionStorage.setItem(sessionKey, 'done')
            return { skipped: true, reason: `Hari libur: ${scheduleData.holidayReason}` }
        }

        const eligible = (scheduleData.teachers || []).filter(t => t.noTelp && t.jadwal.length > 0)
        if (eligible.length === 0) {
            console.log('[AutoReminder Guru] Tidak ada guru dengan jadwal mengajar dan nomor telepon valid hari ini.')
            sessionStorage.setItem(sessionKey, 'done')
            return { skipped: true, reason: 'Tidak ada guru terjadwal dengan nomor telepon' }
        }

        let sentCount = 0
        let failedCount = 0

        for (let i = 0; i < eligible.length; i++) {
            const t = eligible[i]
            const phone = formatPhoneNumber(t.noTelp)
            if (!phone) {
                failedCount++
                continue
            }

            const msg = templatePengingatJadwalGuru({
                namaGuru: t.namaGuru,
                hari: dayName,
                tanggal: formattedDate,
                jadwalList: t.jadwal
            })

            const res = await sendWhatsAppViaFonnte(phone, msg)
            if (res.success) {
                sentCount++
                console.log(`[AutoReminder Guru] (${sentCount}/${eligible.length}) Berhasil dikirim ke Ustadz ${t.namaGuru}`)
            } else {
                failedCount++
                console.warn(`[AutoReminder Guru] Gagal dikirim ke Ustadz ${t.namaGuru}: ${res.error}`)
            }

            // Jeda aman anti-rate-limit 1.2 detik antar nomor
            if (i < eligible.length - 1) {
                await new Promise(r => setTimeout(r, 1200))
            }
        }

        // 5. Catat ke tabel audit_log agar sistem tahu hari ini sudah berhasil
        try {
            await supabase.from('audit_log').insert({
                action: 'BROADCAST_JADWAL_GURU',
                table_name: 'jadwal_pelajaran',
                user_email: user?.email || 'auto-sentinel@sitaqua.local',
                description: `Pengingat jadwal guru otomatis (${dayName}, ${dateStr}): ${sentCount} berhasil, ${failedCount} gagal dari ${eligible.length} guru terjadwal.`
            })
        } catch (auditErr) {
            console.warn('[AutoReminder Guru] Gagal mencatat audit log:', auditErr)
        }

        sessionStorage.setItem(sessionKey, 'done')

        if (sentCount > 0 && showToast) {
            showToast.success(`Pengingat jadwal mengajar hari ini otomatis terkirim ke ${sentCount} ustadz via WhatsApp.`)
        }

        return {
            success: true,
            total: eligible.length,
            sent: sentCount,
            failed: failedCount,
            date: dateStr
        }
    } catch (err) {
        console.error('[AutoReminder Guru] Error:', err)
        return { success: false, error: err.message }
    }
}

// Pasang fungsi test langsung di window browser untuk memudahkan pengujian tanpa CLI/deploy
if (typeof window !== 'undefined') {
    window.testDailyGuruReminder = async () => {
        console.log('%c[TEST PENGINGAT JADWAL GURU]', 'background: #0284c7; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
        try {
            const data = await getTodayTeacherSchedules()
            console.log('Target Hari   :', data.dayName)
            console.log('Tanggal       :', data.formattedDate)
            console.log('Status Libur  :', data.isHoliday ? `Ya (${data.holidayReason})` : 'Tidak (KBM Aktif)')
            console.log('Total Guru    :', data.teachers?.length || 0)
            
            if (data.teachers && data.teachers.length > 0) {
                console.table(data.teachers.map((t, idx) => ({
                    'No': idx + 1,
                    'Nama Guru': t.namaGuru,
                    'Nomor WhatsApp': t.noTelp ? `✅ ${t.noTelp}` : '❌ (Belum ada)',
                    'Jumlah Sesi': t.jadwal.length,
                    'Rincian Jadwal': t.jadwal.map(j => `${j.targetNama} [${j.tipe}]`).join(' | ')
                })))
                console.log('💡 Contoh pesan WA untuk guru pertama:')
                console.log(templatePengingatJadwalGuru({
                    namaGuru: data.teachers[0].namaGuru,
                    hari: data.dayName,
                    tanggal: data.formattedDate,
                    jadwalList: data.teachers[0].jadwal
                }))
            } else {
                console.warn('Tidak ada guru dengan jadwal aktif hari ini.')
            }
            return data
        } catch (e) {
            console.error('Error saat test reminder:', e)
        }
    }
}

export default {
    getWIBDateInfo,
    getTodayTeacherSchedules,
    checkAndSendDailyGuruReminders
}
