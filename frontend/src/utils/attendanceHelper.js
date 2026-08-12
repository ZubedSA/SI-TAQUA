/**
 * Helper Utility for Presensi & Ketidakhadiran Calculation Across SI-TAQUA
 * 
 * Provides unified, single-source-of-truth logic for:
 * 1. Aggregating raw daily presensi logs (Madrasah vs Qur'aniyah)
 * 2. Resolving final attendance counts with saved `perilaku_semester` data and fallbacks
 */

/**
 * Calculate presensi counts from raw presensi log array for a list of santri IDs.
 * Separates Qur'aniyah (Halaqoh) and Madrasah (Kelas) logs based on `[Quraniyah]` tag in `keterangan`.
 * 
 * @param {Array} rawPresensi - Array of records from `presensi` table
 * @param {Array} santriIds - Array of santri ID strings
 * @returns {Object} Mapping of santriId -> { madrosah: {...}, quraniyah: {...} }
 */
export const calculateAutoPresensi = (rawPresensi = [], santriIds = []) => {
    const counts = {}

    santriIds.forEach(id => {
        counts[id] = {
            madrosah: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 },
            quraniyah: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 }
        }
    })

    if (rawPresensi && rawPresensi.length > 0) {
        rawPresensi.forEach(p => {
            const sId = p.santri_id
            if (!sId) return

            if (!counts[sId]) {
                counts[sId] = {
                    madrosah: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 },
                    quraniyah: { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 }
                }
            }

            const isQuraniyah = (p.keterangan || '').toLowerCase().includes('[quraniyah]')
            const target = isQuraniyah ? counts[sId].quraniyah : counts[sId].madrosah
            const st = (p.status || '').trim().toLowerCase()

            if (st === 'sakit') target.sakit++
            else if (st === 'izin') target.izin++
            else if (['alfa', 'alpha', 'alpa'].includes(st)) target.alpha++
            else if (st === 'pulang') target.pulang++
            else if (st === 'hadir') target.hadir++
            else if (st === 'terlambat' || st === 'telat') target.terlambat++
        })
    }

    return counts
}

/**
 * Resolve final numeric attendance value with fallback logic:
 * 1. Primary saved value in `perilaku_semester`
 * 2. Fallback saved value in `perilaku_semester` (cross-mode fallback)
 * 3. Auto-calculated daily presensi log count
 * 
 * @param {*} primarySaved - Value from target mode in `perilaku_semester`
 * @param {*} fallbackSaved - Value from alternate mode in `perilaku_semester`
 * @param {number} autoVal - Calculated count from `presensi` logs
 * @returns {number} Resolved numeric count
 */
export const resolveAttendanceCount = (primarySaved, fallbackSaved, autoVal = 0) => {
    if (primarySaved !== undefined && primarySaved !== null && primarySaved !== '' && primarySaved !== '-') {
        return Number(primarySaved)
    }
    if (fallbackSaved !== undefined && fallbackSaved !== null && fallbackSaved !== '' && fallbackSaved !== '-') {
        return Number(fallbackSaved)
    }
    return Number(autoVal || 0)
}

/**
 * Get resolved attendance object containing full Madrasah and Qur'aniyah metrics for a santri.
 * 
 * @param {Object} perilakuRow - Row from `perilaku_semester` table for the santri
 * @param {Object} autoObj - Auto presensi object `{ madrosah: {...}, quraniyah: {...} }`
 * @returns {Object} `{ madrosah: { sakit, izin, alpha, pulang, hadir, terlambat }, quraniyah: { ... } }`
 */
export const getResolvedAttendance = (perilakuRow = null, autoObj = { madrosah: {}, quraniyah: {} }) => {
    const autoM = autoObj?.madrosah || { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 }
    const autoQ = autoObj?.quraniyah || { sakit: 0, izin: 0, alpha: 0, pulang: 0, hadir: 0, terlambat: 0 }

    return {
        madrosah: {
            sakit: resolveAttendanceCount(perilakuRow?.sakit_kelas, perilakuRow?.sakit, autoM.sakit),
            izin: resolveAttendanceCount(perilakuRow?.izin_kelas, perilakuRow?.izin, autoM.izin),
            alpha: resolveAttendanceCount(perilakuRow?.alpha_kelas, perilakuRow?.alpha, autoM.alpha),
            pulang: resolveAttendanceCount(perilakuRow?.pulang_kelas, perilakuRow?.pulang, autoM.pulang),
            hadir: autoM.hadir,
            terlambat: autoM.terlambat
        },
        quraniyah: {
            sakit: resolveAttendanceCount(perilakuRow?.sakit, perilakuRow?.sakit_kelas, autoQ.sakit),
            izin: resolveAttendanceCount(perilakuRow?.izin, perilakuRow?.izin_kelas, autoQ.izin),
            alpha: resolveAttendanceCount(perilakuRow?.alpha, perilakuRow?.alpha_kelas, autoQ.alpha),
            pulang: resolveAttendanceCount(perilakuRow?.pulang, perilakuRow?.pulang_kelas, autoQ.pulang),
            hadir: autoQ.hadir,
            terlambat: autoQ.terlambat
        }
    }
}
