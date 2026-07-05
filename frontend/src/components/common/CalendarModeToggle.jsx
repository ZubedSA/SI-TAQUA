import React from 'react'
import { useCalendar } from '../../context/CalendarContext'
import { Calendar, Moon } from 'lucide-react'

const CalendarModeToggle = () => {
    const { mode, toggleMode } = useCalendar()
    const isHijri = mode === 'hijriyah'

    return (
        <button
            onClick={toggleMode}
            className={`
                group relative inline-flex items-center justify-center p-1 rounded-2xl h-10 w-18
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus:outline-none active:scale-95
                ${isHijri ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-gray-50 hover:bg-gray-100'}
                border ${isHijri ? 'border-emerald-100' : 'border-gray-100'}
            `}
            title={`Mode Kalender: ${isHijri ? 'Hijriyah' : 'Masehi'}`}
        >
            <span className="sr-only">Toggle Calendar Mode</span>

            {/* Sliding Pill */}
            {/* Sliding Pill */}
            <span
                className={`
                    absolute inset-y-1.5 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-xl w-7 h-7 shadow-xl
                    flex items-center justify-center z-10
                    ${isHijri 
                        ? 'left-[calc(100%-2rem)] bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-emerald-200/50' 
                        : 'left-1.5 bg-white text-gray-800 shadow-gray-200/50'}
                `}
            >
                {isHijri ? (
                    <div className="relative">
                        <Moon size={13} fill="currentColor" />
                        <span className="absolute -top-1 -right-1 w-1 h-1 bg-yellow-200 rounded-full animate-pulse"></span>
                    </div>
                ) : (
                    <Calendar size={13} strokeWidth={2.5} />
                )}
            </span>

            {/* Static Icons Background */}
            <span className="flex w-full justify-between px-2.5">
                <Calendar size={12} className={`transition-all duration-500 ${isHijri ? 'text-gray-300 opacity-50 scale-90' : 'text-transparent'}`} />
                <Moon size={12} className={`transition-all duration-500 ${isHijri ? 'text-transparent' : 'text-gray-200 opacity-50 scale-90'}`} />
            </span>
        </button>
    )
}

export default CalendarModeToggle
