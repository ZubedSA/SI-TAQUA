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
                group relative inline-flex items-center justify-center p-1 rounded-full h-9 w-16
                transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500/50
                ${isHijri ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'bg-slate-100 hover:bg-slate-200'}
                border ${isHijri ? 'border-emerald-200' : 'border-slate-200'}
            `}
            title={`Mode Kalender: ${isHijri ? 'Hijriyah' : 'Masehi'}`}
        >
            <span className="sr-only">Toggle Calendar Mode</span>

            {/* Sliding Pill */}
            <span
                className={`
                    absolute inset-y-1 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-full w-7 h-7 shadow-sm
                    flex items-center justify-center
                    ${isHijri ? 'left-[calc(100%-2rem)] bg-emerald-500 text-white' : 'left-1 bg-white text-slate-700'}
                `}
            >
                {isHijri ? <Moon size={14} fill="currentColor" /> : <Calendar size={14} />}
            </span>

            {/* Static Icons Background */}
            <span className="flex w-full justify-between px-2">
                <Calendar size={14} className={`transition-colors duration-300 ${isHijri ? 'text-slate-400' : 'text-transparent'}`} />
                <Moon size={14} className={`transition-colors duration-300 ${isHijri ? 'text-transparent' : 'text-slate-300'}`} />
            </span>
        </button>
    )
}

export default CalendarModeToggle
