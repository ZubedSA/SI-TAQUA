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

        // Default options for full date display
        const defaultOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            ...options
        }

        if (mode === 'hijriyah') {
            const h = toHijri(date)
            return `${h.day} ${h.monthName} ${h.year} H`
        } else {
            // Standard Gregorian calendar
            return new Intl.DateTimeFormat('id-ID', defaultOptions).format(date)
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
