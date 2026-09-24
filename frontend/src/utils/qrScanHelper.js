import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

/**
 * Calculate the time distance in minutes from current time to a session.
 * 0 = Session is currently in progress.
 * > 0 = Upcoming or recently ended session.
 */
const getSessionDistance = (session, curMin) => {
    if (session.startMin === null || session.endMin === null) return 9999
    
    // In progress right now: Highest priority!
    if (curMin >= session.startMin && curMin <= session.endMin) {
        return 0
    }
    
    // Upcoming session starting in the future
    if (curMin < session.startMin) {
        return session.startMin - curMin
    }
    
    // Session that ended recently (slight penalty over upcoming session of same delta)
    return (curMin - session.endMin) * 1.2
}

/**
 * Unified QR Code scan processor for SI-TAQUA Absensi (Madrosah & Halaqoh/Quraniyah).
 * Automatically reads the current time, matches with teacher's today schedule & agenda,
 * records presensi staf, and returns the target schedule to immediately open the student attendance form.
 */
export const processAbsensiScan = async ({
    decodedText,
    user,
    userProfile,
    isAdmin = () => false,
    isAdminAkademik = () => false,
    isAdminAbsensi = () => false
}) => {
    if (!decodedText || typeof decodedText !== 'string' || !decodedText.startsWith('SITAQUA_ABSENSI_')) {
        return {
            success: false,
            message: 'Format QR Code tidak valid atau bukan QR Absensi SI-TAQUA.'
        }
    }

    const parts = decodedText.split('_')
    const qrType = (parts[2] || '').toUpperCase()
    const qrId = parts.slice(3).join('_').trim()

    if (!qrType || !qrId) {
        return {
            success: false,
            message: 'Data kode QR tidak lengkap.'
        }
    }

    const isBypass = Boolean(
        (isAdmin && isAdmin()) ||
        (isAdminAkademik && isAdminAkademik()) ||
        (isAdminAbsensi && isAdminAbsensi())
    )

    // 1. Resolve Guru ID
    let guruId = userProfile?.guru_id
    if (!guruId && user) {
        try {
            const { data: guruData } = await supabase
                .from('guru')
                .select('id, nama')
                .or(`user_id.eq.${user.id},email.ilike.${user.email || 'unknown@sitaqua.local'}`)
                .maybeSingle()
            if (guruData) {
                guruId = guruData.id
            }
        } catch (err) {
            console.warn('[QR Scan] Gagal mengambil guru id:', err.message)
        }
    }

    if (!guruId && !isBypass) {
        return {
            success: false,
            message: 'Data pengajar tidak ditemukan. Pastikan akun Anda terhubung dengan profil Guru/Musyrif.'
        }
    }

    // 2. Current Time & Day
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const todayDate = format(now, 'yyyy-MM-dd')
    const dayName = DAYS[now.getDay()]

    // 3. Process based on QR Type
    if (qrType === 'QURANIYAH' || qrType === 'HALAQOH') {
        // --- QURANIYAH (HALAQOH) ---
        // A. Fetch halaqoh information
        const { data: halaqohData, error: hErr } = await supabase
            .from('halaqoh')
            .select('id, nama, musyrif_id')
            .eq('id', qrId)
            .maybeSingle()

        if (hErr) {
            console.warn('[QR Scan] Error fetching halaqoh:', hErr.message)
        }

        // B. Fetch all schedules for this halaqoh today
        const { data: rawJadwal, error: jErr } = await supabase
            .from('jadwal_pelajaran')
            .select('*, mapel(nama), kelas(nama), halaqoh(nama)')
            .eq('hari', dayName)
            .eq('halaqoh_id', qrId)
            .order('jam_ke')

        if (jErr) {
            return {
                success: false,
                message: 'Gagal memuat jadwal halaqoh: ' + jErr.message
            }
        }

        // C. Fetch substitutions for today
        let substitutions = []
        try {
            const { data: pergantianData } = await supabase
                .from('pergantian_jadwal')
                .select('*, jadwal_asli:jadwal_asli_id(*), jadwal_tujuan:jadwal_tujuan_id(*)')
                .eq('status', 'Disetujui')
                .or(`tanggal_absen.eq.${todayDate},tanggal_pengganti.eq.${todayDate}`)
            substitutions = pergantianData || []
        } catch (subErr) {
            console.warn('[QR Scan] Gagal memuat pergantian jadwal:', subErr.message)
        }

        const halaqohNama = halaqohData?.nama || 'Halaqoh'
        const isMusyrif = halaqohData && guruId && String(halaqohData.musyrif_id).toLowerCase() === String(guruId).toLowerCase()

        // Filter schedules where this guru is authorized
        const authorizedJadwal = (rawJadwal || []).filter(j => {
            if (isBypass) return true
            if (isMusyrif) return true
            if (guruId && j.guru_id && String(j.guru_id).toLowerCase() === String(guruId).toLowerCase()) return true
            
            // Check if current user is substitute teacher today
            const isSubstitutedToMe = substitutions.some(g => 
                g.tanggal_absen === todayDate && 
                g.jadwal_asli_id === j.id && 
                String(g.guru_pengganti_id).toLowerCase() === String(guruId).toLowerCase()
            )
            if (isSubstitutedToMe) return true

            return false
        })

        if (!isBypass && authorizedJadwal.length === 0) {
            if (!rawJadwal || rawJadwal.length === 0) {
                return {
                    success: false,
                    message: `Jadwal halaqoh ${halaqohNama} tidak ditemukan untuk hari ${dayName}.`
                }
            }
            return {
                success: false,
                message: `Anda bukan musyrif untuk ${halaqohNama} pada hari ini.`
            }
        }

        const candidateSchedules = isBypass ? (rawJadwal || []) : authorizedJadwal

        if (candidateSchedules.length === 0) {
            return {
                success: false,
                message: `Tidak ada sesi halaqoh ${halaqohNama} pada hari ${dayName}.`
            }
        }

        // D. Smart Time Matching
        const sessionsWithTime = candidateSchedules.map(j => {
            let startMin = null
            let endMin = null
            if (j.jam_mulai && j.jam_selesai) {
                const [hM, mM] = j.jam_mulai.split(':').map(Number)
                const [hS, mS] = j.jam_selesai.split(':').map(Number)
                startMin = hM * 60 + mM
                endMin = hS * 60 + mS
            }
            return {
                ...j,
                startMin,
                endMin
            }
        })

        // Sesi yang berada dalam rentang toleransi:
        // 45 menit sebelum jam_mulai hingga 180 menit (3 jam) setelah jam_selesai
        const inWindowSessions = sessionsWithTime.filter(s => {
            if (s.startMin === null || s.endMin === null) return true
            const windowStart = s.startMin - 45
            const windowEnd = s.endMin + 180
            return currentMinutes >= windowStart && currentMinutes <= windowEnd
        })

        let targetJadwal = null

        if (inWindowSessions.length > 0) {
            inWindowSessions.sort((a, b) => {
                return getSessionDistance(a, currentMinutes) - getSessionDistance(b, currentMinutes)
            })
            targetJadwal = inWindowSessions[0]
        } else {
            // Jika di luar jendela aktif semua sesi
            if (isBypass) {
                const sortedAll = [...sessionsWithTime].sort((a, b) => {
                    return getSessionDistance(a, currentMinutes) - getSessionDistance(b, currentMinutes)
                })
                targetJadwal = sortedAll[0]
            } else {
                const summary = sessionsWithTime
                    .map(s => `Jam Ke-${s.jam_ke || 1} (${s.jam_mulai?.slice(0, 5) || '?'} - ${s.jam_selesai?.slice(0, 5) || '?'})`)
                    .join(', ')
                return {
                    success: false,
                    message: `Di luar jam halaqoh saat ini. Sesi hari ini: ${summary}.`
                }
            }
        }

        const finalJam = targetJadwal.jam_ke || 1

        // E. Catat presensi staf
        if (guruId && targetJadwal) {
            try {
                const scanPayload = {
                    staf_id: guruId,
                    tanggal: todayDate,
                    tipe: 'QURANIYAH',
                    referensi_id: qrId,
                    jam_ke: finalJam,
                    jadwal_id: targetJadwal.id,
                    waktu_scan: new Date().toISOString()
                }
                const { error: insErr } = await supabase.from('presensi_staf').insert(scanPayload)
                if (insErr) {
                    await supabase.from('presensi_staf').insert({
                        staf_id: scanPayload.staf_id,
                        tanggal: scanPayload.tanggal,
                        tipe: scanPayload.tipe,
                        referensi_id: scanPayload.referensi_id,
                        jam_ke: scanPayload.jam_ke,
                        waktu_scan: scanPayload.waktu_scan
                    })
                }
            } catch (scanErr) {
                console.warn('[QR Scan] Gagal catat presensi_staf halaqoh:', scanErr.message)
            }
        }

        // F. Set Session Storage
        sessionStorage.setItem(`SITAQUA_SCAN_${targetJadwal.id}`, 'true')
        sessionStorage.setItem(`SITAQUA_SCAN_${qrId}`, 'true')

        return {
            success: true,
            targetJadwal,
            message: `Terverifikasi: Halaqoh Jam Ke-${finalJam} (${halaqohNama})`
        }

    } else if (qrType === 'MADROSAH') {
        // --- MADROSAH (KELAS) ---
        // A. Fetch kelas information
        const { data: kelasData, error: kErr } = await supabase
            .from('kelas')
            .select('id, nama')
            .eq('id', qrId)
            .maybeSingle()

        if (kErr) {
            console.warn('[QR Scan] Error fetching kelas:', kErr.message)
        }

        // B. Fetch today's schedule for this kelas
        const { data: rawJadwal, error: jErr } = await supabase
            .from('jadwal_pelajaran')
            .select('*, mapel(nama), kelas(nama)')
            .eq('hari', dayName)
            .eq('kelas_id', qrId)
            .order('jam_ke')

        if (jErr) {
            return {
                success: false,
                message: 'Gagal memuat jadwal kelas: ' + jErr.message
            }
        }

        // C. Fetch substitutions for today
        let substitutions = []
        try {
            const { data: pergantianData } = await supabase
                .from('pergantian_jadwal')
                .select('*, jadwal_asli:jadwal_asli_id(*), jadwal_tujuan:jadwal_tujuan_id(*)')
                .eq('status', 'Disetujui')
                .or(`tanggal_absen.eq.${todayDate},tanggal_pengganti.eq.${todayDate}`)
            substitutions = pergantianData || []
        } catch (subErr) {
            console.warn('[QR Scan] Gagal memuat pergantian jadwal kelas:', subErr.message)
        }

        const kelasNama = kelasData?.nama || 'Kelas'

        // Filter schedules taught by this guru today
        const authorizedJadwal = (rawJadwal || []).filter(j => {
            if (isBypass) return true
            if (guruId && j.guru_id && String(j.guru_id).toLowerCase() === String(guruId).toLowerCase()) {
                const isSubstitutedAway = substitutions.some(g => 
                    g.tanggal_absen === todayDate && 
                    g.jadwal_asli_id === j.id && 
                    String(g.guru_pemohon_id).toLowerCase() === String(guruId).toLowerCase()
                )
                if (isSubstitutedAway) return false
                return true
            }

            const isSubstitutedToMe = substitutions.some(g => 
                g.tanggal_absen === todayDate && 
                g.jadwal_asli_id === j.id && 
                String(g.guru_pengganti_id).toLowerCase() === String(guruId).toLowerCase()
            )
            if (isSubstitutedToMe) return true

            return false
        })

        if (!isBypass && authorizedJadwal.length === 0) {
            if (!rawJadwal || rawJadwal.length === 0) {
                return {
                    success: false,
                    message: `Tidak ada jadwal pelajaran di ${kelasNama} pada hari ${dayName}.`
                }
            }
            return {
                success: false,
                message: `Anda tidak memiliki jadwal mengajar di ${kelasNama} hari ini.`
            }
        }

        const candidateSchedules = isBypass ? (rawJadwal || []) : authorizedJadwal

        if (candidateSchedules.length === 0) {
            return {
                success: false,
                message: `Tidak ada jadwal pelajaran di ${kelasNama} pada hari ${dayName}.`
            }
        }

        // D. Smart Time Matching
        const sessionsWithTime = candidateSchedules.map(j => {
            let startMin = null
            let endMin = null
            if (j.jam_mulai && j.jam_selesai) {
                const [hM, mM] = j.jam_mulai.split(':').map(Number)
                const [hS, mS] = j.jam_selesai.split(':').map(Number)
                startMin = hM * 60 + mM
                endMin = hS * 60 + mS
            }
            return {
                ...j,
                startMin,
                endMin
            }
        })

        const inWindowSessions = sessionsWithTime.filter(s => {
            if (s.startMin === null || s.endMin === null) return true
            const windowStart = s.startMin - 45
            const windowEnd = s.endMin + 180
            return currentMinutes >= windowStart && currentMinutes <= windowEnd
        })

        let targetJadwal = null

        if (inWindowSessions.length > 0) {
            inWindowSessions.sort((a, b) => {
                return getSessionDistance(a, currentMinutes) - getSessionDistance(b, currentMinutes)
            })
            targetJadwal = inWindowSessions[0]
        } else {
            if (isBypass) {
                const sortedAll = [...sessionsWithTime].sort((a, b) => {
                    return getSessionDistance(a, currentMinutes) - getSessionDistance(b, currentMinutes)
                })
                targetJadwal = sortedAll[0]
            } else {
                const summary = sessionsWithTime
                    .map(s => `${s.mapel?.nama || 'Jam'} Ke-${s.jam_ke || 1} (${s.jam_mulai?.slice(0, 5) || '?'} - ${s.jam_selesai?.slice(0, 5) || '?'})`)
                    .join(', ')
                return {
                    success: false,
                    message: `Di luar jam mengajar kelas saat ini. Jadwal hari ini: ${summary}.`
                }
            }
        }

        const finalJam = targetJadwal.jam_ke || 1

        // E. Catat presensi staf
        if (guruId && targetJadwal) {
            try {
                const scanPayload = {
                    staf_id: guruId,
                    tanggal: todayDate,
                    tipe: 'MADROSAH',
                    referensi_id: qrId,
                    jam_ke: finalJam,
                    jadwal_id: targetJadwal.id,
                    waktu_scan: new Date().toISOString()
                }
                const { error: insErr } = await supabase.from('presensi_staf').insert(scanPayload)
                if (insErr) {
                    await supabase.from('presensi_staf').insert({
                        staf_id: scanPayload.staf_id,
                        tanggal: scanPayload.tanggal,
                        tipe: scanPayload.tipe,
                        referensi_id: scanPayload.referensi_id,
                        jam_ke: scanPayload.jam_ke,
                        waktu_scan: scanPayload.waktu_scan
                    })
                }
            } catch (scanErr) {
                console.warn('[QR Scan] Gagal catat presensi_staf madrosah:', scanErr.message)
            }
        }

        // F. Set Session Storage
        sessionStorage.setItem(`SITAQUA_SCAN_${targetJadwal.id}`, 'true')
        sessionStorage.setItem(`SITAQUA_SCAN_${qrId}`, 'true')

        return {
            success: true,
            targetJadwal,
            message: `Terverifikasi: ${targetJadwal.mapel?.nama || kelasNama} Jam Ke-${finalJam}`
        }

    } else {
        return {
            success: false,
            message: `Tipe kode QR '${qrType}' tidak didukung.`
        }
    }
}
