import React from 'react'
import { useCalendar } from '../../context/CalendarContext'

/**
 * Global component to display dates.
 * Automatically adapts to Masehi or Hijriyah based on CalendarContext.
 * 
 * @param {Object} props
 * @param {Date|string} props.date - The date to display
 * @param {Intl.DateTimeFormatOptions} props.format - Optional formatting options
 * @param {string} props.className - Optional CSS classes
 */
const DateDisplay = ({ date, format, className = '' }) => {
    const { formatDate } = useCalendar()

    return (
        <span className={className}>
            {formatDate(date, format)}
        </span>
    )
}

export default DateDisplay
