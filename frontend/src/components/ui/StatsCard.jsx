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
        <Card variant="premium" className={`p-8 hover:translate-y-[-4px] transition-all duration-300 group ${className}`}>
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</p>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
                    {trend && (
                        <div className={`flex items-center gap-1.5 mt-2 text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <span className={`px-1.5 py-0.5 rounded-md ${trend > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                {trend > 0 ? '+' : ''}{trend}%
                            </span>
                            <span className="text-gray-400 font-medium">{trendLabel || 'bln lalu'}</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-5 rounded-[1.5rem] transition-transform duration-500 group-hover:scale-110 ${colorStyles[color] || colorStyles.primary}`}>
                        <Icon size={28} />
                    </div>
                )}
            </div>
        </Card>
    )
}

export default StatsCard
