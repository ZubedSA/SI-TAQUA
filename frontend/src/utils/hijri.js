/**
 * Utility untuk konversi tanggal Hijriyah - Masehi
 * Menggunakan algoritma pendekatan standard yang umum digunakan
 */

const HIJRI_MONTHS = [
    'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
    'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Sya\'ban',
    'Ramadhan', 'Syawal', 'Dzulqa\'dah', 'Dzulhijjah'
]

/**
 * Konversi tanggal Masehi ke Hijriyah
 * @param {Date} date - Tanggal Masehi
 * @returns {object} { day, month, year, monthName }
 */
export const toHijri = (date) => {
    try {
        const adjustment = 0
        const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        })

        const parts = formatter.formatToParts(new Date(date))
        const hDay = parseInt(parts.find(p => p.type === 'day')?.value || 1)
        const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || 1)
        const hYear = parseInt(parts.find(p => p.type === 'year')?.value || 1445)

        return {
            day: hDay,
            month: hMonth,
            year: hYear,
            monthName: HIJRI_MONTHS[hMonth - 1] || 'Bulan ?'
        }
    } catch (e) {
        console.error('Hijri conversion error:', e)
        // Fallback safety to prevent white screen
        return {
            day: 1,
            month: 1,
            year: 1445,
            monthName: HIJRI_MONTHS[0]
        }
    }
}

/**
 * Mendapatkan rentang tanggal Masehi dari Bulan Hijriyah
 * @param {number} hijriMonth - 1-12
 * @param {number} hijriYear - e.g. 1445
 * @returns {object} { start: Date, end: Date }
 */
export const getHijriMonthRange = (hijriMonth, hijriYear) => {
    // Estimasi awal: 1 Tahun Hijriah ~ 354 hari
    // Epoch: 16 Juli 622 M (1 Muharam 1 H)
    // Tapi kita gunakan scan pendekatan menggunakan Intl untuk akurasi UI

    // Cari tanggal 1 Bulan X Tahun Y
    // Mulai pendekatan dari (Year - 1445) * 354 hari dari referensi hari ini (2024=1445)
    // 1 Ramadhan 1445 is approx March 11 2024

    const approxDays = (hijriYear - 1445) * 354 + (hijriMonth - 9) * 29
    const baseDate = new Date(2024, 2, 11) // 11 Mar 2024
    baseDate.setDate(baseDate.getDate() + approxDays)

    // Scan backward/forward to find exact 1st day
    let current = new Date(baseDate)
    current.setDate(current.getDate() - 20) // Start checking 20 days before

    // Limit loop safety
    let startDate = null

    for (let i = 0; i < 40; i++) {
        const h = toHijri(current)
        if (h.year === hijriYear && h.month === hijriMonth && h.day === 1) {
            startDate = new Date(current)
            break
        }
        current.setDate(current.getDate() + 1)
    }

    // Jika tidak ketemu pas tgl 1 (karena loncat), ambil tgl paling awal di bulan itu
    if (!startDate) {
        current = new Date(baseDate)
        current.setDate(current.getDate() - 15)
        for (let i = 0; i < 40; i++) {
            const h = toHijri(current)
            if (h.year === hijriYear && h.month === hijriMonth) {
                startDate = new Date(current)
                break
            }
            current.setDate(current.getDate() + 1)
        }
    }

    // Cari akhir bulan (cari tgl 1 bulan berikutnya - 1 hari)
    let nextMonth = hijriMonth + 1
    let nextYear = hijriYear
    if (nextMonth > 12) {
        nextMonth = 1
        nextYear++
    }

    let endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 27) // Jump to end

    for (let i = 0; i < 10; i++) {
        const d = new Date(endDate)
        d.setDate(d.getDate() + 1)
        const h = toHijri(d)
        if (h.month !== hijriMonth) {
            // Sudah masuk bulan baru
            break
        }
        endDate = d
    }

    return { start: startDate, end: endDate }
}

/**
 * Konversi tanggal Hijriyah ke Masehi (Estimasi akurat via Intl)
 * @param {number} day 
 * @param {number} month 
 * @param {number} year 
 * @returns {Date}
 */
export const toGregorian = (day, month, year) => {
    // Cari rentang bulan
    const { start } = getHijriMonthRange(month, year)
    if (!start) return new Date()

    // Scan dari start date
    // Kita asumsikan start adalah tgl 1.
    // Loop max 30 hari
    let current = new Date(start)
    for (let i = 1; i <= 30; i++) {
        if (i === day) return current
        current.setDate(current.getDate() + 1)

        // Verifikasi jika loncat (jarang terjadi pada sequential, tapi aman)
        // const h = toHijri(current) 
        // if (h.day === day && h.month === month) return current
    }
    return current
}

export const getHijriMonths = () => HIJRI_MONTHS
