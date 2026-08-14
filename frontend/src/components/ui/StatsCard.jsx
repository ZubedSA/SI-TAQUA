import React from 'react'
import { Card } from './Card'

const StatsCard = ({ title, value, icon: Icon, trend, trendLabel, color = 'primary', className = '' }) => {
    const colorStyles = {
        primary: 'bg-[#0A2619] text-[#BCF32F] shadow-lg shadow-[#0A2619]/10',
        blue: 'bg-[#0A2619]/5 text-[#0A2619] border border-[#0A2619]/10',
        green: 'bg-[#BCF32F]/20 text-[#0A2619] border border-[#BCF32F]/30',
        orange: 'bg-[#0A2619]/10 text-[#0A2619]',
        red: 'bg-red-50 text-red-600 border border-red-100',
        purple: 'bg-[#BCF32F]/10 text-[#0A2619]',
        gray: 'bg-gray-50 text-gray-600'
    }

    return (
        <Card variant="premium" className={`p-3.5 sm:p-5 lg:p-7 hover:translate-y-[-2px] sm:hover:translate-y-[-4px] transition-all duration-300 group active:scale-95 touch-manipulation ${className}`}>
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-[0.12em] sm:tracking-[0.18em] truncate">{title}</p>
                    <h3 className="text-lg sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight truncate">{value}</h3>
                    {trend && (
                        <div className={`flex flex-wrap items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1.5 text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs ${trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {trend > 0 ? '+' : ''}{trend}%
                            </span>
                            <span className="text-gray-400 font-medium text-[10px] sm:text-xs">{trendLabel || 'bln lalu'}</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl shrink-0 transition-transform duration-500 group-hover:scale-110 ${colorStyles[color] || colorStyles.primary}`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                    </div>
                )}
            </div>
        </Card>
    )
}

export default StatsCard
