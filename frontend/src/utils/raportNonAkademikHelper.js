import { calculateAutoPresensi } from './attendanceHelper'

/**
 * Fetch unified non-academic report card data (perilaku, presensi, taujihad, tahfizh summary)
 * for a single santri and semester across SI-TAQUA.
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {string} santriId - Target santri ID
 * @param {string} semesterId - Target semester ID
 * @returns {Promise<Object>} Unified data object
 */
export const fetchUnifiedSantriNonAkademik = async (supabase, santriId, semesterId) => {
    if (!supabase || !santriId || !semesterId) {
        return getEmptyNonAkademikData()
    }

    try {
        // 1. Query Semester Date Range
        const { data: semObj } = await supabase
            .from('semester')
            .select('id, tanggal_mulai, tanggal_selesai')
            .eq('id', semesterId)
            .maybeSingle()

        // 2. Query All Perilaku Rows for (santri_id, semester_id)
        const { data: perilakuRows } = await supabase
            .from('perilaku_semester')
            .select('*')
            .eq('santri_id', santriId)
            .eq('semester_id', semesterId)

        // Merge all rows if multiple exist
        const p = (perilakuRows && perilakuRows.length > 0)
            ? perilakuRows.reduce((acc, curr) => ({ ...acc, ...curr }), {})
            : null

        // 3. Query All Taujihad Rows for (santri_id, semester_id)
        const { data: taujihadRows } = await supabase
            .from('taujihad')
            .select('*')
            .eq('santri_id', santriId)
            .eq('semester_id', semesterId)

        const t = (taujihadRows && taujihadRows.length > 0)
            ? taujihadRows.reduce((acc, curr) => ({ ...acc, ...curr }), {})
            : null

        // 4. Query Daily Presensi Logs
        let presensiQuery = supabase
            .from('presensi')
            .select('santri_id, status, keterangan, tanggal')
            .eq('santri_id', santriId)

        if (semObj?.tanggal_mulai && semObj?.tanggal_selesai) {
            presensiQuery = presensiQuery
                .gte('tanggal', semObj.tanggal_mulai)
                .lte('tanggal', semObj.tanggal_selesai)
        }

        const { data: rawPresensi } = await presensiQuery
        const autoCounts = calculateAutoPresensi(rawPresensi || [], [santriId])
        const autoObj = autoCounts[santriId] || { madrosah: {}, quraniyah: {} }

        // 5. Resolve Attendance Counts (Saved vs Auto Logs)
        const autoM = autoObj.madrosah || {}
        const autoQ = autoObj.quraniyah || {}

        const resolveCount = (val1, val2, autoVal) => {
            if (val1 !== undefined && val1 !== null && val1 !== '' && val1 !== '-') return Number(val1)
            if (val2 !== undefined && val2 !== null && val2 !== '' && val2 !== '-') return Number(val2)
            return Number(autoVal || 0)
        }

        const sakit = resolveCount(p?.sakit, p?.sakit_kelas, autoQ.sakit || autoM.sakit)
        const izin = resolveCount(p?.izin, p?.izin_kelas, autoQ.izin || autoM.izin)
        const alpha = resolveCount(p?.alpha, p?.alpha_kelas, autoQ.alpha || autoM.alpha)
        const pulang = resolveCount(p?.pulang, p?.pulang_kelas, autoQ.pulang || autoM.pulang)

        const sakit_kelas = resolveCount(p?.sakit_kelas, p?.sakit, autoM.sakit || autoQ.sakit)
        const izin_kelas = resolveCount(p?.izin_kelas, p?.izin, autoM.izin || autoQ.izin)
        const alpha_kelas = resolveCount(p?.alpha_kelas, p?.alpha, autoM.alpha || autoQ.alpha)
        const pulang_kelas = resolveCount(p?.pulang_kelas, p?.pulang, autoM.pulang || autoQ.pulang)

        // 6. Resolve Perilaku Aspects
        const ketekunan = p?.ketekunan || p?.ketekunan_kelas || 'Sangat Baik'
        const kedisiplinan = p?.kedisiplinan || p?.kedisiplinan_kelas || 'Sangat Baik'
        const kebersihan = p?.kebersihan || p?.kebersihan_kelas || 'Sangat Baik'
        const kerapian = p?.kerapian || p?.kerapian_kelas || 'Sangat Baik'

        const ketekunan_kelas = p?.ketekunan_kelas || p?.ketekunan || 'Sangat Baik'
        const kedisiplinan_kelas = p?.kedisiplinan_kelas || p?.kedisiplinan || 'Sangat Baik'
        const kebersihan_kelas = p?.kebersihan_kelas || p?.kebersihan || 'Sangat Baik'
        const kerapian_kelas = p?.kerapian_kelas || p?.kerapian || 'Sangat Baik'

        // 7. Resolve Notes & Tahfizh Summary
        const catatan_musyrif = t?.catatan || p?.catatan_musyrif || t?.catatan_wali || p?.catatan_wali || ''
        const catatan_wali = p?.catatan_wali || t?.catatan_wali || t?.catatan || p?.catatan_musyrif || ''

        const jumlah_hafalan = p?.jumlah_hafalan || ''
        const predikat_hafalan = p?.predikat_hafalan || ''
        const total_hafalan = p?.total_hafalan || ''

        return {
            perilaku: {
                ...p,
                ketekunan,
                kedisiplinan,
                kebersihan,
                kerapian,
                ketekunan_kelas,
                kedisiplinan_kelas,
                kebersihan_kelas,
                kerapian_kelas,
                jumlah_hafalan,
                predikat_hafalan,
                total_hafalan,
                catatan_wali
            },
            taujihad: {
                ...t,
                catatan: catatan_musyrif,
                catatan_wali: catatan_wali
            },
            ketidakhadiran: {
                sakit,
                izin,
                alpha,
                pulang,
                sakit_kelas,
                izin_kelas,
                alpha_kelas,
                pulang_kelas
            },
            catatanWali: catatan_wali,
            catatanMusyrif: catatan_musyrif
        }
    } catch (err) {
        console.error('Error in fetchUnifiedSantriNonAkademik:', err)
        return getEmptyNonAkademikData()
    }
}

const getEmptyNonAkademikData = () => ({
    perilaku: {
        ketekunan: 'Sangat Baik',
        kedisiplinan: 'Sangat Baik',
        kebersihan: 'Sangat Baik',
        kerapian: 'Sangat Baik',
        ketekunan_kelas: 'Sangat Baik',
        kedisiplinan_kelas: 'Sangat Baik',
        kebersihan_kelas: 'Sangat Baik',
        kerapian_kelas: 'Sangat Baik',
        jumlah_hafalan: '',
        predikat_hafalan: '',
        total_hafalan: '',
        catatan_wali: ''
    },
    taujihad: {
        catatan: '',
        catatan_wali: ''
    },
    ketidakhadiran: {
        sakit: 0,
        izin: 0,
        alpha: 0,
        pulang: 0,
        sakit_kelas: 0,
        izin_kelas: 0,
        alpha_kelas: 0,
        pulang_kelas: 0
    },
    catatanWali: '',
    catatanMusyrif: ''
})
