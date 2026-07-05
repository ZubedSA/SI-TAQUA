import { useState, useRef, useEffect } from 'react'
import { Calendar, X, Check } from 'lucide-react'
import { useCalendar } from '../../context/CalendarContext'

const DateRangePicker = ({ startDate, endDate, onChange, className = '', singleDate = false }) => {
    const { mode, formatDate, getHijriMonths, toHijri, toGregorian } = useCalendar()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    // Hijri State (for temporary inputs)
    // Initialize with TODAY's Hijri date
    const today = new Date()
    const hijriToday = toHijri(today)

    const [hijriStart, setHijriStart] = useState({
        day: hijriToday.day,
        month: hijriToday.month,
        year: hijriToday.year
    })
    const [hijriEnd, setHijriEnd] = useState({
        day: hijriToday.day,
        month: hijriToday.month,
        year: hijriToday.year
    })

    // Sync Hijri state from props when opening or props change
    useEffect(() => {
        if (startDate) {
            const h = toHijri(new Date(startDate))
            setHijriStart({ day: h.day, month: h.month, year: h.year })
            // Sync end date helper if single date
            if (singleDate) {
                setHijriEnd({ day: h.day, month: h.month, year: h.year })
            }
        }
        if (!singleDate && endDate) {
            const h = toHijri(new Date(endDate))
            setHijriEnd({ day: h.day, month: h.month, year: h.year })
        } else if (!singleDate && startDate) {
            // If no end date, default to start date
            const h = toHijri(new Date(startDate))
            setHijriEnd({ day: h.day, month: h.month, year: h.year })
        }
    }, [startDate, endDate, mode, isOpen, singleDate])

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleStartChange = (e) => {
        if (singleDate) {
            onChange(e.target.value)
        } else {
            onChange(e.target.value, endDate)
        }
    }

    const handleEndChange = (e) => {
        onChange(startDate, e.target.value)
    }

    // Hijri Handlers
    const handleHijriStartUpdate = (field, value) => {
        const newState = { ...hijriStart, [field]: parseInt(value) }
        setHijriStart(newState)

        // Convert to Gregorian and trigger change
        const gDate = toGregorian(newState.day, newState.month, newState.year)
        // Format to YYYY-MM-DD
        const gStr = gDate.toISOString().split('T')[0]

        if (singleDate) {
            onChange(gStr)
        } else {
            onChange(gStr, endDate)
        }
    }

    const handleHijriEndUpdate = (field, value) => {
        const newState = { ...hijriEnd, [field]: parseInt(value) }
        setHijriEnd(newState)

        const gDate = toGregorian(newState.day, newState.month, newState.year)
        const gStr = gDate.toISOString().split('T')[0]
        onChange(startDate, gStr)
    }

    const handleClear = (e) => {
        e.stopPropagation()
        if (singleDate) {
            onChange('')
        } else {
            onChange('', '')
        }
        setIsOpen(false)
    }

    const getDisplayText = () => {
        if (singleDate) {
            return startDate ? formatDate(startDate) : 'Pilih Tanggal'
        }

        if (startDate && endDate) {
            return `${formatDate(startDate)} - ${formatDate(endDate)}`
        }
        if (startDate) {
            return `${formatDate(startDate)} - ...`
        }
        if (endDate) {
            return `... - ${formatDate(endDate)}`
        }
        return 'Pilih Periode'
    }

    const isActive = singleDate ? !!startDate : (startDate || endDate)
    const hijriMonths = getHijriMonths()

    // Helper to render Hijri Inputs
    const renderHijriInput = (label, state, updater) => (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
            <div className="grid grid-cols-12 gap-2">
                {/* Tanggal */}
                <div className="col-span-3">
                    <select
                        className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 transition-colors"
                        value={state.day}
                        onChange={e => updater('day', e.target.value)}
                    >
                        {[...Array(30)].map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                    </select>
                </div>

                {/* Bulan */}
                <div className="col-span-5">
                    <select
                        className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 transition-colors"
                        value={state.month}
                        onChange={e => updater('month', e.target.value)}
                        style={{ textOverflow: 'ellipsis' }}
                    >
                        {hijriMonths.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                </div>

                {/* Tahun */}
                <div className="col-span-4">
                    <input
                        type="number"
                        className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 transition-colors text-center"
                        value={state.year}
                        onChange={e => updater('year', e.target.value)}
                        min="1400" max="1500"
                        placeholder="Tahun"
                    />
                </div>
            </div>
        </div>
    )

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                className={`flex items-center gap-2 px-3 py-2.5 bg-white border rounded-lg text-sm transition-all w-full md:w-auto min-w-[200px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${isActive ? 'border-primary-500 text-primary-700 bg-primary-50/30' : 'border-gray-200 text-gray-600'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Calendar size={18} className={isActive ? 'text-primary-500' : 'text-gray-400'} />
                <span className="flex-1 text-left truncate">{getDisplayText()}</span>
                {isActive && (
                    <div
                        role="button"
                        onClick={handleClear}
                        className="p-0.5 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        title="Hapus filter"
                    >
                        <X size={14} />
                    </div>
                )}
            </button>

            {/* Adaptive Content Wrapper */}
            {isOpen && (
                <>
                    {/* Mobile Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Content Container: Modal on Mobile, Popover on Desktop */}
                    <div className="fixed inset-x-4 top-[20%] md:absolute md:top-full md:left-0 md:inset-x-auto z-50 
                                  w-auto md:w-[32rem] bg-white rounded-xl shadow-2xl md:shadow-xl border border-gray-100 
                                  p-5 md:p-4 mt-0 md:mt-2 animate-in fade-in zoom-in-95 duration-200">

                        <div className="flex justify-between items-center mb-4 md:hidden">
                            <h3 className="font-semibold text-gray-900">Pilih Periode</h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 md:space-y-4">
                            {mode === 'hijriyah' ? (
                                <>
                                    {renderHijriInput(singleDate ? 'Tanggal (Hijriyah)' : 'Dari Tanggal (Hijriyah)', hijriStart, handleHijriStartUpdate)}
                                    {!singleDate && renderHijriInput('Sampai Tanggal (Hijriyah)', hijriEnd, handleHijriEndUpdate)}
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{singleDate ? 'Tanggal' : 'Dari Tanggal'}</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={handleStartChange}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-colors"
                                        />
                                    </div>
                                    {!singleDate && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sampai Tanggal</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={handleEndChange}
                                                min={startDate}
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-colors"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm active:scale-95 transform"
                                >
                                    <Check size={16} />
                                    Terapkan Filter
                                </button>
                            </div>
                        </div>

                        {/* Arrow Pointer (Desktop Only) */}
                        <div className="hidden md:block absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-gray-100 transform rotate-45"></div>
                    </div>
                </>
            )}
        </div>
    )
}

export default DateRangePicker
