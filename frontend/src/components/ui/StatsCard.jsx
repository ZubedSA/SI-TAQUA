import React from 'react'
import { Card } from './Card'

const StatsCard = ({ title, value, icon: Icon, trend, trendLabel, color = 'primary', className = '' }) => {
    const colorStyles = {
        primary: 'bg-[#0A2619] text-[#BCF32F] shadow-md shadow-[#0A2619]/10',
        blue: 'bg-[#0A2619]/5 text-[#0A2619] border border-[#0A2619]/10',
        green: 'bg-[#BCF32F]/20 text-[#0A2619] border border-[#BCF32F]/30',
        emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
        orange: 'bg-amber-50 text-amber-700 border border-amber-100',
        red: 'bg-red-50 text-red-600 border border-red-100',
        purple: 'bg-purple-50 text-purple-700 border border-purple-100',
        gray: 'bg-gray-50 text-gray-600'
    }

    return (
        <Card variant="premium" className={`p-3 sm:p-4 lg:p-6 hover:translate-y-[-2px] sm:hover:translate-y-[-4px] transition-all duration-300 group active:scale-95 touch-manipulation ${className}`}>
            <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="space-y-0.5 sm:space-y-1.5 min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[11px] lg:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{title}</p>
                    <h3 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 tracking-tight truncate">{value}</h3>
                    {trend && (
                        <div className={`flex flex-wrap items-center gap-1 mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <span className={`px-1 py-0.2 rounded text-[9px] sm:text-[10px] ${trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {trend > 0 ? '+' : ''}{trend}%
                            </span>
                            <span className="text-gray-400 font-medium text-[9px] sm:text-[10px] truncate">{trendLabel || 'bln lalu'}</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-105 ${colorStyles[color] || colorStyles.primary}`}>
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </div>
                )}
            </div>
        </Card>
    )
}

export default StatsCard
