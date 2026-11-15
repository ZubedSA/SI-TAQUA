/**
 * STANDALONE CRON SCRIPT: Pengingat Jadwal Mengajar Guru
 * ========================================================
 * Dapat dijalankan via CLI: `node backend/scripts/cron-remind-guru.js`
 * Opsi CLI untuk Testing & Diagnostik:
 *   --force       : Lewati batasan waktu (06:00 - 07:00 WIB) dan lewati pengecekan audit_log duplikat
 *   --dry-run     : Simulasi saja, tampilkan daftar guru dan isi pesan WA tanpa memotong kuota / kirim via Fonnte
 *   --day <Hari>  : Uji jadwal untuk hari tertentu (contoh: --day Senin, --day Selasa, dll)
 *   --date <Tgl>  : Uji jadwal untuk tanggal tertentu (format: YYYY-MM-DD, contoh: --date 2026-11-16)
 *
 * Contoh Pengujian:
 *   node backend/scripts/cron-remind-guru.js --force --dry-run
 *   node backend/scripts/cron-remind-guru.js --day Senin --force --dry-run
 *   node backend/scripts/cron-remind-guru.js --day Senin --force
 */

const dns = require('dns')
try {
    dns.setDefaultResultOrder('ipv4first')
} catch (e) {}

const fs = require('fs')
const path = require('path')

// Load environment variables
const loadEnv = () => {
    const candidates = [
        path.join(__dirname, '../.env'),
        path.join(__dirname, '../../frontend/.env'),
        path.join(__dirname, '../../.env')
    ]
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8')
            content.split('\n').forEach(line => {
                const parts = line.split('=')
                if (parts.length >= 2) {
                    const key = parts[0].trim()
                    const val = parts.slice(1).join('=').trim()
                    if (!process.env[key]) process.env[key] = val
                }
            })
        }
    }
}
loadEnv()

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const fonnteToken = process.env.FONNTE_TOKEN || process.env.VITE_FONNTE_TOKEN || '9TKo4vZBPyQ1bjwSniV8'

if (!supabaseUrl) {
    console.error('[Cron] Error: SUPABASE_URL tidak ditemukan di environment.')
    process.exit(1)
}

// Inisialisasi client yang dapat mendeteksi key valid
let supabase = createClient(supabaseUrl, serviceKey || anonKey)

const formatPhoneNumber = (phone) => {
    if (!phone) return ''
    let cleaned = String(phone).replace(/\D/g, '')
    if (!cleaned) return ''
    if (cleaned.startsWith('00')) cleaned = cleaned.substring(2)
    if (cleaned.startsWith('620')) cleaned = '62' + cleaned.substring(3)
    else if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1)
    else if (cleaned.startsWith('8')) cleaned = '62' + cleaned
    else if (!cleaned.startsWith('62') && !cleaned.startsWith('60') && !cleaned.startsWith('65') && cleaned.length >= 9) {
        cleaned = '62' + cleaned
    }
    if (cleaned.length < 9 || cleaned.length > 15) return ''
    return cleaned
}

const formatReminderMessage = (namaGuru, hari, tanggal, jadwal) => {
    const jadwalItems = jadwal.map((j, idx) => {
        const num = idx + 1
        const jamMulai = j.jam_mulai ? String(j.jam_mulai).substring(0, 5) : ''
        const jamSelesai = j.jam_selesai ? String(j.jam_selesai).substring(0, 5) : ''
        const jamStr = jamMulai && jamSelesai ? `${jamMulai} - ${jamSelesai} WIB` : (jamMulai ? `Pukul ${jamMulai} WIB` : '')
        const isHalaqoh = j.tipe === 'HALAQOH'
        const sesiTitle = isHalaqoh ? "Halaqoh Qur'an" : "Madrasah"
        const sesiNomor = j.jam_ke ? `(Jam Ke-${j.jam_ke})` : ''
        const waktuHeader = jamStr ? `*${jamStr}* ${sesiNomor}`.trim() : `*Jam Ke-${j.jam_ke || num}*`

        const subItems = []
        subItems.push(`   • Jenis: *${sesiTitle}*`)
        if (isHalaqoh) {
            subItems.push(`   • Kelompok: ${j.targetNama}`)
        } else {
            subItems.push(`   • Kelas: ${j.targetNama}`)
            if (j.mapelNama) subItems.push(`   • Mapel: ${j.mapelNama}`)
        }
        return `${num}. ⏰ ${waktuHeader}\n${subItems.join('\n')}`
    }).join('\n\n')

    const sections = [
        "Assalamu'alaikum Wr. Wb.",
        `Yth. Ustadz *${namaGuru}*`,
        `*PENGINGAT JADWAL MENGAJAR HARI INI*\nHari, Tanggal: *${hari}, ${tanggal}*`,
        `Berikut adalah agenda mengajar Anda hari ini:\n\n${jadwalItems}`,
        "Mohon hadir tepat waktu dan melakukan pemindaian (Scan QR) di lokasi untuk validasi kehadiran & pengisian jurnal santri.",
        "Terima kasih atas dedikasi dan keikhlasannya dalam membimbing para santri.\nJazakumullah Khairan Katsiran.\nWassalamu'alaikum Wr. Wb.",
        "_PTQA BATUAN_"
    ]

    return sections.join('\n\n')
}

const sendFonnte = async (target, message) => {
    const formatted = formatPhoneNumber(target)
    if (!formatted) return { success: false, error: 'Nomor telepon tidak valid' }

    try {
        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': fonnteToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target: formatted,
                message: message
            })
        })
        const resData = await response.json()
        if (response.ok && (resData.status === true || resData.status === 'true')) {
            return { success: true, data: resData }
        }
        return { success: false, error: resData.reason || resData.message || 'Gagal kirim via Fonnte' }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

// Helper parsing CLI flags
const getCliArg = (flag) => {
    const idx = process.argv.indexOf(flag)
    if (idx !== -1 && idx + 1 < process.argv.length) {
        return process.argv[idx + 1]
    }
    return null
}

async function main() {
    const isForce = process.argv.includes('--force')
    const isDryRun = process.argv.includes('--dry-run')
    const customDayArg = getCliArg('--day')
    const customDateArg = getCliArg('--date')

    const now = customDateArg ? new Date(customDateArg) : new Date()
    const dtfJakarta = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
    const dateStr = dtfJakarta.format(now)

    const dayFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' })
    const rawDay = dayFormatter.format(now)
    let dayName = rawDay
    if (rawDay.toLowerCase() === 'minggu') dayName = 'Ahad'
    else if (rawDay.toLowerCase() === "jum'at" || rawDay.toLowerCase() === 'jumat') dayName = 'Jumat'

    // Jika user menentukan custom day via CLI (--day Senin)
    if (customDayArg) {
        const cap = customDayArg.charAt(0).toUpperCase() + customDayArg.slice(1).toLowerCase()
        if (cap.toLowerCase() === 'minggu') dayName = 'Ahad'
        else if (cap.toLowerCase() === 'jumat' || cap.toLowerCase() === "jum'at") dayName = 'Jumat'
        else dayName = cap
    }

    const fullDateFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' })
    const formattedDate = fullDateFormatter.format(now)

    const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })
    const timeStr = timeFormatter.format(now)
    const [hStr, mStr] = timeStr.split(':')
    const currentHour = parseInt(hStr, 10)
    const currentMinute = parseInt(mStr, 10)
    const totalMinutes = currentHour * 60 + currentMinute

    console.log('='.repeat(70))
    console.log(`[Cron] SI-TAQUA: Pengingat Otomatis Jadwal Mengajar Guru`)
    console.log(`[Cron] Target Hari    : ${dayName} ${customDayArg ? '(Custom Flag)' : ''}`)
    console.log(`[Cron] Target Tanggal : ${formattedDate} (${dateStr})`)
    console.log(`[Cron] Waktu Eksekusi : ${timeStr} WIB`)
    console.log(`[Cron] Mode Eksekusi  : ${isDryRun ? 'DRY-RUN (Simulasi / Tidak Kirim WA)' : 'LIVE (Kirim via Fonnte)'}`)
    if (isForce) console.log(`[Cron] Opsi Aktif     : --force (Bypass jam & audit log duplikasi)`)
    console.log('='.repeat(70))

    // Validasi & Auto-Detect API Key (Service Role vs Anon)
    let activeKeyType = serviceKey ? 'SERVICE_ROLE_KEY' : 'ANON_KEY'
    let { count: testCount, error: testErr } = await supabase.from('guru').select('*', { count: 'exact', head: true })

    if (testErr && serviceKey && anonKey) {
        console.warn(`[Cron] ⚠️ ${activeKeyType} ditolak oleh Supabase (${testErr.message}). Mencoba beralih ke ANON_KEY...`)
        supabase = createClient(supabaseUrl, anonKey)
        const retry = await supabase.from('guru').select('*', { count: 'exact', head: true })
        if (!retry.error) {
            activeKeyType = 'ANON_KEY'
            testErr = null
            console.log(`[Cron] ✅ Berhasil terhubung menggunakan ANON_KEY.`)
        } else {
            console.warn(`[Cron] ⚠️ ANON_KEY juga ditolak (${retry.error.message}).`)
        }
    }

    if (testErr) {
        console.error(`\n[Cron] ❌ KONEKSI SUPABASE DITOLAK:`)
        console.error(`   Pesan Error: ${testErr.message} (Code: ${testErr.code || 'N/A'})`)
        console.error(`   Supabase URL : ${supabaseUrl}`)
        console.error(`   Periksa kembali SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_ANON_KEY di backend/.env atau frontend/.env.`)
        return
    }

    console.log(`[Cron] Status Supabase: Terhubung (${activeKeyType})`)

    // Batasan Waktu: Jam 06:00 s/d maksimal 07:00 WIB (kecuali flag --force)
    if (!isForce) {
        if (totalMinutes < 360) {
            console.log(`[Cron] Belum memasuki jam 06:00 WIB (sekarang ${timeStr} WIB). Skip.`)
            console.log(`[Cron] Tips: Gunakan flag --force untuk menguji di luar jam 06:00 - 07:00 WIB.`)
            return
        }
        if (totalMinutes > 420) {
            console.log(`[Cron] Sudah melewati batas waktu maksimal pukul 07:00 WIB (sekarang ${timeStr} WIB). Pengingat jadwal pagi tidak dikirim. Skip.`)
            console.log(`[Cron] Tips: Gunakan flag --force untuk menguji di luar jam 06:00 - 07:00 WIB.`)
            return
        }
    }

    // 1. Cek Libur di Kalender Akademik
    const { data: holidays } = await supabase
        .from('kalender_akademik')
        .select('*')
        .or('jenis.eq.Libur,judul.ilike.%libur%')
        .lte('tanggal_mulai', dateStr)
        .gte('tanggal_selesai', dateStr)

    const isAllHoliday = (holidays || []).some(h => !h.cakupan || h.cakupan.toLowerCase() === 'semua' || (h.deskripsi && h.deskripsi.includes('Semua')))
    if (isAllHoliday && !isForce) {
        console.log(`[Cron] Hari ini LIBUR TOTAL sesuai kalender akademik (${holidays.map(h => h.judul).join(', ')}). Tidak ada pengingat dikirim.`)
        return
    }

    // 2. Cek audit_log agar tidak double kirim
    if (!isForce) {
        const { data: existingLogs } = await supabase
            .from('audit_log')
            .select('id')
            .eq('action', 'BROADCAST_JADWAL_GURU')
            .ilike('description', `%${dateStr}%`)
            .limit(1)

        if (existingLogs && existingLogs.length > 0) {
            console.log(`[Cron] Pengingat jadwal hari ini (${dateStr}) sudah pernah dikirim sebelumnya. Melewati eksekusi.`)
            console.log(`[Cron] Tips: Gunakan flag --force untuk menjalankan ulang.`)
            return
        }
    }

    // 3. Query Jadwal dan Guru dengan Aliases Hari (Ahad/Minggu fleksibel)
    const dayAliases = [dayName]
    if (dayName.toLowerCase() === 'ahad') dayAliases.push('Minggu')
    else if (dayName.toLowerCase() === 'minggu') dayAliases.push('Ahad')
    else if (dayName.toLowerCase() === 'jumat') dayAliases.push("Jum'at", "Jum`at")

    console.log(`[Cron] Mengambil data jadwal pelajaran untuk hari [${dayAliases.join(', ')}] dari Supabase...`)

    const [jadwalRes, guruRes, halaqohRes, mhRes, profilesRes, kelasRes, mapelRes, allJadwalStats] = await Promise.all([
        supabase.from('jadwal_pelajaran').select('*').in('hari', dayAliases),
        supabase.from('guru').select('id, nama, email, user_id, no_telp, status').eq('status', 'Aktif'),
        supabase.from('halaqoh').select('id, nama, musyrif_id'),
        supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id'),
        supabase.from('user_profiles').select('user_id, guru_id, no_hp, email'),
        supabase.from('kelas').select('id, nama'),
        supabase.from('mata_pelajaran').select('id, nama'),
        supabase.from('jadwal_pelajaran').select('hari')
    ])

    // Periksa error dari Supabase
    const dbErrors = [
        { table: 'jadwal_pelajaran', err: jadwalRes.error },
        { table: 'guru', err: guruRes.error },
        { table: 'halaqoh', err: halaqohRes.error },
        { table: 'musyrif_halaqoh', err: mhRes.error },
        { table: 'user_profiles', err: profilesRes.error },
        { table: 'kelas', err: kelasRes.error },
        { table: 'mata_pelajaran', err: mapelRes.error },
        { table: 'jadwal_pelajaran (all)', err: allJadwalStats.error }
    ].filter(item => Boolean(item.err))

    if (dbErrors.length > 0) {
        console.error(`\n[Cron] ❌ TERJADI KESALAHAN KONEKSI/QUERY SUPABASE:`)
        dbErrors.forEach(e => {
            console.error(`   • Tabel [${e.table}]: ${e.err.message || JSON.stringify(e.err)} (Code: ${e.err.code || 'N/A'})`)
        })
        console.log(`[Cron] Supabase URL : ${supabaseUrl}`)
        console.log(`[Cron] Key Type     : ${supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : 'ANON_KEY'}`)
        return
    }

    const rawJadwal = jadwalRes.data || []
    const guruList = guruRes.data || []
    const guruMap = guruList.reduce((acc, g) => ({ ...acc, [g.id]: g }), {})
    const profilesList = profilesRes.data || []
    const halaqohMap = (halaqohRes.data || []).reduce((acc, h) => ({ ...acc, [h.id]: h }), {})
    const kelasMap = (kelasRes.data || []).reduce((acc, k) => ({ ...acc, [k.id]: k }), {})
    const mapelMap = (mapelRes.data || []).reduce((acc, m) => ({ ...acc, [m.id]: m }), {})

    console.log(`[Cron] Data terhubung: ${guruList.length} guru aktif, ${Object.keys(halaqohMap).length} kelompok halaqoh.`)
    console.log(`[Cron] Sesi pelajaran ditemukan untuk hari ${dayName}: ${rawJadwal.length} sesi.`)

    if (rawJadwal.length === 0) {
        console.log(`\n[Cron] ℹ️ DIAGNOSA:`)
        console.log(`[Cron] Tidak ada jadwal pelajaran yang terdaftar untuk hari "${dayName}" di database.`)
        
        // Tampilkan hari apa saja yang memiliki jadwal
        const dayCounts = {}
        ;(allJadwalStats.data || []).forEach(j => {
            if (j.hari) dayCounts[j.hari] = (dayCounts[j.hari] || 0) + 1
        })
        const availableDays = Object.keys(dayCounts)
        if (availableDays.length > 0) {
            console.log(`[Cron] Hari-hari yang memiliki jadwal pelajaran aktif di database:`)
            availableDays.forEach(d => console.log(`   • Hari ${d}: ${dayCounts[d]} sesi pelajaran`))
            console.log(`\n[Cron] 💡 TIPS PENGUJIAN:`)
            console.log(`[Cron] Untuk menguji pengiriman pada hari yang ada jadwalnya, jalankan:`)
            console.log(`       node backend/scripts/cron-remind-guru.js --day ${availableDays[0]} --force --dry-run`)
        } else {
            console.log(`[Cron] Tabel jadwal_pelajaran saat ini masih kosong untuk semua hari.`)
        }
        return
    }

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
    ;(mhRes.data || []).forEach(mh => {
        if (!halaqohToMusyrifs[mh.halaqoh_id]) halaqohToMusyrifs[mh.halaqoh_id] = []
        const resolved = resolveToGuru(mh.user_id)
        if (resolved && !halaqohToMusyrifs[mh.halaqoh_id].includes(resolved.id)) {
            halaqohToMusyrifs[mh.halaqoh_id].push(resolved.id)
        }
    })

    const groupMap = {}

    rawJadwal.forEach(j => {
        const isHalaqoh = j.tipe === 'HALAQOH' || Boolean(j.halaqoh_id)
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
            if (directGuru) assignToMusyrif(directGuru.id)
            else if (musyrifIds.length > 0) musyrifIds.forEach(gid => assignToMusyrif(gid))
            else {
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

    // Lengkapi nomor kontak dari user_profiles jika di tabel guru kosong
    Object.values(groupMap).forEach(g => {
        if (!g.noTelp) {
            const prof = profilesList.find(p => p.guru_id === g.guruId || (g.email && p.email?.toLowerCase() === g.email.toLowerCase()))
            if (prof?.no_hp) g.noTelp = prof.no_hp
        }
        g.jadwal.sort((a, b) => {
            if (a.jam_mulai && b.jam_mulai) return a.jam_mulai.localeCompare(b.jam_mulai)
            return Number(a.jam_ke || 0) - Number(b.jam_ke || 0)
        })
    })

    const allTeachersScheduled = Object.values(groupMap)
    console.log(`[Cron] Total guru dengan jadwal mengajar: ${allTeachersScheduled.length} orang.`)

    // Detail per guru
    allTeachersScheduled.forEach((t, idx) => {
        const phone = formatPhoneNumber(t.noTelp)
        const statusTelp = phone ? `✅ ${phone}` : `❌ Nomor HP belum terdaftar di tabel guru / profil`
        console.log(`   ${idx + 1}. ${t.namaGuru}: ${t.jadwal.length} sesi [${statusTelp}]`)
    })

    const eligible = allTeachersScheduled.filter(t => Boolean(formatPhoneNumber(t.noTelp)) && t.jadwal.length > 0)
    console.log(`[Cron] Guru siap menerima pesan WhatsApp: ${eligible.length} orang.`)

    if (eligible.length === 0) {
        console.log('\n[Cron] ⚠️ Tidak ada guru yang dapat dikirimi pesan karena nomor HP kosong.')
        console.log('[Cron] Silakan lengkapi nomor telepon guru pada menu Data Guru atau Manajemen Pengguna.')
        return
    }

    if (isDryRun) {
        console.log('\n' + '='.repeat(70))
        console.log(`[Cron] MODE DRY-RUN AKTIF: Menampilkan contoh pesan WA yang akan dikirim:`)
        console.log('='.repeat(70))
        eligible.slice(0, 2).forEach((t, i) => {
            const phone = formatPhoneNumber(t.noTelp)
            const sampleMsg = formatReminderMessage(t.namaGuru, dayName, formattedDate, t.jadwal)
            console.log(`\n--- [CONTOH ${i + 1}] Untuk: ${t.namaGuru} (${phone}) ---`)
            console.log(sampleMsg)
            console.log('-'.repeat(50))
        })
        console.log(`\n[Cron] Dry-run selesai. Sebanyak ${eligible.length} pesan siap dikirim dalam mode live.`)
        console.log(`[Cron] Untuk mengirim pesan langsung ke WhatsApp guru, jalankan tanpa --dry-run:`)
        console.log(`       node backend/scripts/cron-remind-guru.js ${customDayArg ? `--day ${customDayArg}` : ''} --force`)
        return
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

        const msg = formatReminderMessage(t.namaGuru, dayName, formattedDate, t.jadwal)
        const res = await sendFonnte(phone, msg)

        if (res.success) {
            sentCount++
            console.log(`[Cron] (${sentCount}/${eligible.length}) Berhasil dikirim ke ${t.namaGuru} (${phone})`)
        } else {
            failedCount++
            console.warn(`[Cron] Gagal dikirim ke ${t.namaGuru} (${phone}): ${res.error}`)
        }

        if (i < eligible.length - 1) {
            await new Promise(r => setTimeout(r, 1200))
        }
    }

    // Catat ke audit_log
    try {
        await supabase.from('audit_log').insert({
            action: 'BROADCAST_JADWAL_GURU',
            table_name: 'jadwal_pelajaran',
            user_email: 'cron-runner@sitaqua.local',
            description: `Pengingat jadwal guru via cron script (${dayName}, ${dateStr}): ${sentCount} berhasil, ${failedCount} gagal dari ${eligible.length} guru.`
        })
        console.log(`[Cron] Sukses mencatat ke audit_log: ${sentCount} terkirim.`)
    } catch (logErr) {
        console.warn('[Cron] Gagal mencatat audit log:', logErr.message)
    }
}

main().then(() => {
    process.exit(0)
}).catch(err => {
    console.error('[Cron] Fatal error:', err)
    process.exit(1)
})
