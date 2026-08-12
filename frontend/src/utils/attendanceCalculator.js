import { supabase } from '../lib/supabase'

/**
 * Unified Attendance Summary Calculator for SI-TAQUA
 * Ensures 100% identical attendance metrics across:
 * 1. Input Perilaku & Catatan (InputPerilakuPage.jsx)
 * 2. Laporan Kehadiran Santri (AdminAbsensiPage.jsx)
 * 3. Pratinjau Raport (LaporanAkademikSantriPage.jsx)
 * 4. Cetak Raport (CetakRaport.jsx)
 *
 * @param {Object} params
 * @param {string} params.semesterId - ID of selected semester
 * @param {Array<string>} [params.santriIds] - Optional array of santri IDs to filter
 * @returns {Promise<Object>} Map of santriId -> { madrosah: {...}, halaqoh: {...}, rawPerilaku: {...} }
 */
export async function fetchAttendanceSummary({ semesterId, santriIds = null }) {
    if (!semesterId) return {}

    try {
        // 1. Fetch Semester Date Range
        const { data: semesterData } = await supabase
            .from('semester')
            .select('id, nama, tahun_ajaran, tanggal_mulai, tanggal_selesai')
            .eq('id', semesterId)
            .single()

        if (!semesterData) return {}

        // 2. Fetch Saved Perilaku Semester Records
        let perilakuQuery = supabase
            .from('perilaku_semester')
            .select('*')
            .eq('semester_id', semesterId)

        if (santriIds && santriIds.length > 0) {
            perilakuQuery = perilakuQuery.in('santri_id', santriIds)
        }

        const { data: perilakuList } = await perilakuQuery

        // 3. Fetch Daily Presensi Logs within Semester Date Range
        let presensiQuery = supabase
            .from('presensi')
            .select('santri_id, status, keterangan, tanggal')

        if (santriIds && santriIds.length > 0) {
            presensiQuery = presensiQuery.in('santri_id', santriIds)
        }

        if (semesterData.tanggal_mulai && semesterData.tanggal_selesai) {
            presensiQuery = presensiQuery
                .gte('tanggal', semesterData.tanggal_mulai)
                .lte('tanggal', semesterData.tanggal_selesai)
        }

        const { data: presensiList } = await presensiQuery

        // 4. Calculate Auto Counts per Santri from daily logs
        const autoCounts = {} // { santriId: { madrosah: { sakit, izin, alpha, pulang, hadir, terlambat }, halaqoh: { ... } } }

        (presensiList || []).forEach(p => {
            const sId = p.santri_id
            if (!sId) return

            if (!autoCounts[sId]) {
                autoCounts[sId] = {
                    madrosah: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 },
                    halaqoh: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 }
                }
            }

            const isQuraniyah = (p.keterangan || '').toLowerCase().includes('[quraniyah]')
            const target = isQuraniyah ? autoCounts[sId].halaqoh : autoCounts[sId].madrosah
            const st = (p.status || '').trim().toLowerCase()

            if (st === 'hadir') target.hadir += 1
            else if (st === 'terlambat' || st === 'telat') target.terlambat += 1
            else if (st === 'sakit') target.sakit += 1
            else if (st === 'izin') target.izin += 1
            else if (['alpha', 'alpa', 'alfa'].includes(st)) target.alpha += 1
            else if (st === 'pulang') target.pulang += 1
        })

        // 5. Build Unified Result per Santri
        const summaryMap = {}

        const getVal = (primarySaved, fallbackSaved, autoVal) => {
            if (primarySaved !== undefined && primarySaved !== null && primarySaved !== '' && primarySaved !== 0 && primarySaved !== '-') {
                return Number(primarySaved)
            }
            if (fallbackSaved !== undefined && fallbackSaved !== null && fallbackSaved !== '' && fallbackSaved !== 0 && fallbackSaved !== '-') {
                return Number(fallbackSaved)
            }
            return autoVal || 0
        }

        const allTargetSantriIds = Array.from(new Set([
            ...(santriIds || []),
            ...(perilakuList || []).map(p => p.santri_id),
            ...Object.keys(autoCounts)
        ]))

        allTargetSantriIds.forEach(sId => {
            const pSaved = (perilakuList || []).find(p => p.santri_id === sId)
            const autoObj = autoCounts[sId] || {
                madrosah: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 },
                halaqoh: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 }
            }

            summaryMap[sId] = {
                // Madrasah / Kelas Metrics
                madrosah: {
                    sakit: getVal(pSaved?.sakit_kelas, pSaved?.sakit, autoObj.madrosah.sakit),
                    izin: getVal(pSaved?.izin_kelas, pSaved?.izin, autoObj.madrosah.izin),
                    alpha: getVal(pSaved?.alpha_kelas, pSaved?.alpha, autoObj.madrosah.alpha),
                    pulang: getVal(pSaved?.pulang_kelas, pSaved?.pulang, autoObj.madrosah.pulang),
                    hadir: autoObj.madrosah.hadir,
                    terlambat: autoObj.madrosah.terlambat,
                    auto_sakit: autoObj.madrosah.sakit,
                    auto_izin: autoObj.madrosah.izin,
                    auto_alpha: autoObj.madrosah.alpha,
                    auto_pulang: autoObj.madrosah.pulang
                },
                // Halaqoh / Qur'aniyah Metrics
                halaqoh: {
                    sakit: getVal(pSaved?.sakit, pSaved?.sakit_kelas, autoObj.halaqoh.sakit),
                    izin: getVal(pSaved?.izin, pSaved?.izin_kelas, autoObj.halaqoh.izin),
                    alpha: getVal(pSaved?.alpha, pSaved?.alpha_kelas, autoObj.halaqoh.alpha),
                    pulang: getVal(pSaved?.pulang, pSaved?.pulang_kelas, autoObj.halaqoh.pulang),
                    hadir: autoObj.halaqoh.hadir,
                    terlambat: autoObj.halaqoh.terlambat,
                    auto_sakit: autoObj.halaqoh.sakit,
                    auto_izin: autoObj.halaqoh.izin,
                    auto_alpha: autoObj.halaqoh.alpha,
                    auto_pulang: autoObj.halaqoh.pulang
                },
                rawPerilaku: pSaved || null
            }
        })

        return summaryMap
    } catch (err) {
        console.error('Error computing attendance summary:', err)
        return {}
    }
}
