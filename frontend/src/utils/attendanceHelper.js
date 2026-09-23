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
 * Resolve final numeric attendance value:
 * 1. Primary saved value in `perilaku_semester` for the target mode
 * 2. Auto-calculated daily presensi log count for the target mode
 * 
 * @param {*} primarySaved - Value from target mode in `perilaku_semester`
 * @param {number} autoVal - Calculated count from `presensi` logs for target mode
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

/**
 * Check if a raw staff scan (from presensi_staf) matches a schedule item (from jadwal_pelajaran).
 * 
 * Multi-layer intelligent matching:
 * 1. Must match staf_id (guru_id / user_id)
 * 2. Must match date
 * 3. Type compatibility: MADROSAH vs QURANIYAH/HALAQOH
 * 4. Room/Group reference: p.referensi_id matches j.kelas_id, j.halaqoh_id, or j.referensi_id
 * 5. Session jam_ke: exact match if both provided
 * 6. Generous time window: within 60-90 minutes of class start/end
 * 
 * @param {Object} scan - Record from `presensi_staf`
 * @param {Object} schedule - Schedule item from `jadwal_pelajaran`
 * @param {string} dateStr - Date string 'YYYY-MM-DD'
 * @returns {boolean}
 */
export const isStaffScanMatch = (scan, schedule, dateStr) => {
    if (!scan || !schedule) return false

    // 1. Date match
    if (scan.tanggal && dateStr && scan.tanggal !== dateStr) return false

    // 2. Direct Schedule Link (from presensi_mapel / class journal or direct scan link)
    if (scan.jadwal_id && schedule.id && String(scan.jadwal_id).toLowerCase() === String(schedule.id).toLowerCase()) {
        return true
    }

    // 3. Staff ID match
    const scanStafId = String(scan.staf_id || scan.guru_id || '').toLowerCase()
    const schedGuruId = String(schedule.guru_id || '').toLowerCase()
    if (scanStafId && schedGuruId && scanStafId !== schedGuruId) {
        const origGuruId = String(schedule.original_guru_id || '').toLowerCase()
        if (scanStafId !== origGuruId) {
            // Jika scan bukan dari guru ini, jangan cocokkan
            return false
        }
    }

    // 4. Type compatibility
    const scanType = (scan.tipe || '').toUpperCase()
    const schedType = (schedule.tipe || 'MADROSAH').toUpperCase()
    const isMadrosah = (scanType === 'MADROSAH') && (schedType === 'MADROSAH')
    const isQuraniyah = ['QURANIYAH', 'HALAQOH'].includes(scanType) && ['QURANIYAH', 'HALAQOH'].includes(schedType)

    if (!isMadrosah && !isQuraniyah) return false

    // 4. Reference (Location) Check
    const schedRefId = String(schedule.kelas_id || schedule.halaqoh_id || schedule.referensi_id || '').toLowerCase()
    const scanRefId = String(scan.referensi_id || '').toLowerCase()
    const isSameRef = Boolean(schedRefId && scanRefId && schedRefId === scanRefId)

    // 5. Jam Ke Check
    const hasScanJam = scan.jam_ke !== undefined && scan.jam_ke !== null && scan.jam_ke !== ''
    const hasSchedJam = schedule.jam_ke !== undefined && schedule.jam_ke !== null && schedule.jam_ke !== ''
    const isSameJam = hasScanJam && hasSchedJam && Number(scan.jam_ke) === Number(schedule.jam_ke)

    // A. Perfect match: Same reference AND same session number
    if (isSameRef && isSameJam) return true

    // B. Direct schedule link
    if (scan.jadwal_id && schedule.id && String(scan.jadwal_id).toLowerCase() === String(schedule.id).toLowerCase()) {
        return true
    }

    // C. Same session number and compatible reference
    if (isSameJam && (!scanRefId || !schedRefId || isSameRef)) return true

    // D. If both have jam_ke and they differ, they MUST NOT match (especially for Halaqoh)
    if (hasScanJam && hasSchedJam && !isSameJam) {
        return false
    }

    // E. Physical Location Match for legacy scans without jam_ke
    if (isSameRef && !hasScanJam && !isQuraniyah) {
        return true
    }

    // F. Time Window Check (flexible window with ±30 minutes tolerance)
    if (scan.waktu_scan && schedule.jam_mulai && schedule.jam_selesai) {
        try {
            const scanTime = new Date(scan.waktu_scan)
            const scanMinutes = scanTime.getHours() * 60 + scanTime.getMinutes()
            
            const [hM, mM] = schedule.jam_mulai.split(':').map(Number)
            const [hS, mS] = schedule.jam_selesai.split(':').map(Number)
            
            const startLimit = hM * 60 + mM - 30
            const endLimit = hS * 60 + mS + 45
            
            if (scanMinutes >= startLimit && scanMinutes <= endLimit) {
                if (!scanRefId || !schedRefId || isSameRef) {
                    if (!hasScanJam || isSameJam) return true
                }
            }
        } catch (err) {
            // Ignore time parse error
        }
    }

    return false
}

/**
 * Find the best matching scan for a schedule from an array of scans.
 */
export const findStaffScan = (scanList = [], schedule, dateStr) => {
    if (!scanList || scanList.length === 0 || !schedule) return null

    // 1. First priority: Direct jadwal_id match
    const directMatch = scanList.find(p => p.jadwal_id && schedule.id && String(p.jadwal_id).toLowerCase() === String(schedule.id).toLowerCase())
    if (directMatch) return directMatch

    // 2. Second priority: Exact match on reference and jam_ke
    const exactMatch = scanList.find(p => {
        if (!isStaffScanMatch(p, schedule, dateStr)) return false
        const schedRefId = String(schedule.kelas_id || schedule.halaqoh_id || schedule.referensi_id || '').toLowerCase()
        const scanRefId = String(p.referensi_id || '').toLowerCase()
        const isSameRef = schedRefId && scanRefId && schedRefId === scanRefId
        const isSameJam = p.jam_ke && schedule.jam_ke && Number(p.jam_ke) === Number(schedule.jam_ke)
        return isSameRef && isSameJam
    })
    if (exactMatch) return exactMatch

    // 3. Third priority: Exact match on jam_ke and staff
    const jamMatch = scanList.find(p => {
        if (!isStaffScanMatch(p, schedule, dateStr)) return false
        return p.jam_ke && schedule.jam_ke && Number(p.jam_ke) === Number(schedule.jam_ke)
    })
    if (jamMatch) return jamMatch

    // 4. Non-quraniyah fallback for legacy data
    const isQuraniyah = ['QURANIYAH', 'HALAQOH'].includes((schedule.tipe || '').toUpperCase())
    if (!isQuraniyah) {
        return scanList.find(p => isStaffScanMatch(p, schedule, dateStr)) || null
    }

    return null
}
