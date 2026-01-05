import React, { useEffect, useState } from 'react'
import { useCalendar } from '../../context/CalendarContext'

const SmartMonthYearFilter = ({ filters, onFilterChange, variant = 'row' }) => {
    const { mode, getHijriMonths, getHijriMonthRange, toHijri } = useCalendar()

    // Local state for Hijri selections
    const today = new Date()
    const hijriToday = toHijri(today)

    const [hijriState, setHijriState] = useState({
        month: hijriToday.month,
        year: hijriToday.year
    })

    // Derived state for display sync
    useEffect(() => {
        if (mode === 'hijriyah') {
            // Try to approximate current Gregorian selection to Hijri
            // If filters.bulan/tahun are set
            if (filters.bulan && filters.tahun) {
                // Approximate: middle of the month
                const midMonthDate = new Date(filters.tahun, filters.bulan - 1, 15)
                const h = toHijri(midMonthDate)
                setHijriState({ month: h.month, year: h.year })
            }
        }
    }, [mode]) // Only run on mode switch or if filters change externally? careful of loops.

    const masehiMonths = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
        { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
    ]

    const hijriMonths = getHijriMonths()

    const handleHijriChange = (field, value) => {
        const newVal = parseInt(value)
        const newState = { ...hijriState, [field]: newVal }
        setHijriState(newState)

        // Convert key Hijri selection to Gregorian Target
        // Strategy: Get range of Hijri Month, pick the dominant Gregorian Month (based on midpoint)
        const { start, end } = getHijriMonthRange(newState.month, newState.year)
        // Midpoint calculation
        const midPoint = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2)

        onFilterChange({
            ...filters,
            bulan: midPoint.getMonth() + 1,
            tahun: midPoint.getFullYear(),
            // Optional: Pass full range if the parent page supports it
            dateFrom: start,
            dateTo: end,
            isHijriFilter: true
        })
    }

    const handleMasehiChange = (field, value) => {
        onFilterChange({
            ...filters,
            [field]: parseInt(value),
            isHijriFilter: false
        })
    }

    if (mode === 'hijriyah') {
        return (
            <>
                <div className="form-group">
                    <label className="form-label">Bulan (Hijriyah) *</label>
                    <select
                        className="form-control"
                        value={hijriState.month}
                        onChange={e => handleHijriChange('month', e.target.value)}
                    >
                        {hijriMonths.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Tahun (Hijriyah) *</label>
                    <input
                        type="number"
                        className="form-control"
                        value={hijriState.year}
                        onChange={e => handleHijriChange('year', e.target.value)}
                        min="1440"
                        max="1460"
                    />
                </div>
            </>
        )
    }

    return (
        <>
            <div className="form-group">
                <label className="form-label">Bulan (Masehi) *</label>
                <select
                    className="form-control"
                    value={filters.bulan}
                    onChange={e => handleMasehiChange('bulan', e.target.value)}
                >
                    {masehiMonths.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Tahun (Masehi) *</label>
                <input
                    type="number"
                    className="form-control"
                    value={filters.tahun}
                    onChange={e => handleMasehiChange('tahun', e.target.value)}
                />
            </div>
        </>
    )
}

export default SmartMonthYearFilter
