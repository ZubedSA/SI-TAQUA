import React from 'react';

const Badge = ({ variant = 'info', className = '', children }) => {
    const variants = {
        success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border border-amber-200",
        danger: "bg-red-50 text-red-700 border border-red-200",
        info: "bg-blue-50 text-blue-700 border border-blue-200",
        neutral: "bg-gray-100 text-gray-700 border border-gray-200",
        primary: "bg-primary-50 text-primary-700 border border-primary-200",
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.neutral} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
