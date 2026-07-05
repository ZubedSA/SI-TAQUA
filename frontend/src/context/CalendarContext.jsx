import React, { createContext, useContext, useState, useEffect } from 'react'
import { toHijri, getHijriMonthRange, getHijriMonths, toGregorian } from '../utils/hijri'

const CalendarContext = createContext()

export const useCalendar = () => {
    const context = useContext(CalendarContext)
    if (!context) {
        throw new Error('useCalendar must be used within a CalendarProvider')
    }
    return context
}

export const CalendarProvider = ({ children }) => {
    // Default to 'masehi' if not set
    const [mode, setMode] = useState(() => {
        return localStorage.getItem('calendar_mode') || 'masehi'
    })

    useEffect(() => {
        localStorage.setItem('calendar_mode', mode)
    }, [mode])

    const toggleMode = () => {
        setMode(prev => prev === 'masehi' ? 'hijriyah' : 'masehi')
    }

    /**
     * Formats a date object or string into the current mode's string representation.
     * @param {Date|string} dateInput - The date to format
     * @param {Intl.DateTimeFormatOptions} options - Optional formatting options
     * @returns {string} Formatted date string
     */
    const formatDate = (dateInput, options = {}) => {
        if (!dateInput) return '-'

        const date = new Date(dateInput)
        if (isNaN(date.getTime())) return '-'

        // Determine options. If user provides options, use them. 
        // Otherwise use default full date display.
        const dateOptions = Object.keys(options).length > 0
            ? options
            : { day: 'numeric', month: 'long', year: 'numeric' }

        if (mode === 'hijriyah') {
            const h = toHijri(date)
            // Basic support for excluding day in hijri mode
            if (dateOptions.day === undefined && options.month && options.year) {
                return `${h.monthName} ${h.year} H`
            }
            return `${h.day} ${h.monthName} ${h.year} H`
        } else {
            // Standard Gregorian calendar
            return new Intl.DateTimeFormat('id-ID', dateOptions).format(date)
        }
    }

    const value = {
        mode,
        toggleMode,
        formatDate,
        toHijri,
        toGregorian,
        getHijriMonthRange,
        getHijriMonths
    }

    return (
        <CalendarContext.Provider value={value}>
            {children}
        </CalendarContext.Provider>
    )
}
