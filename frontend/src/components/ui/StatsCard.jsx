import React from 'react'
import { Card } from './Card'

const StatsCard = ({ title, value, icon: Icon, trend, trendLabel, color = 'primary', className = '' }) => {
    const colorStyles = {
        primary: 'bg-primary-50 text-primary-600',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        red: 'bg-red-50 text-red-600',
        purple: 'bg-purple-50 text-purple-600',
        gray: 'bg-gray-50 text-gray-600'
    }

    return (
        <Card className={`p-6 hover:shadow-md transition-shadow duration-200 ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2 font-mono tracking-tight">{value}</h3>
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <span>{trend > 0 ? '+' : ''}{trend}%</span>
                            <span className="text-gray-400 font-normal">{trendLabel || 'bln lalu'}</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.primary}`}>
                        <Icon size={24} />
                    </div>
                )}
            </div>
        </Card>
    )
}

export default StatsCard
