import React from 'react';

export const Card = ({ children, className = '', variant = 'default', ...props }) => {
    const variants = {
        default: 'bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-xl shadow-black/5',
        premium: 'bg-white rounded-2xl sm:rounded-[2.5rem] border border-gray-100 shadow-xl sm:shadow-2xl shadow-[#0A2619]/10',
        glass: 'bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] border border-white/50 shadow-xl sm:shadow-2xl shadow-black/5'
    }

    return (
        <div className={`${variants[variant] || variants.default} overflow-hidden ${className}`} {...props}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className = '', actions, ...props }) => {
    return (
        <div className={`px-4 py-3.5 sm:px-6 sm:py-4 border-b border-gray-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${className}`} {...props}>
            <div className="flex-1 min-w-0">{children}</div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
};

export const CardTitle = ({ children, className = '', ...props }) => {
    return (
        <h3 className={`text-base sm:text-lg font-bold text-gray-900 tracking-tight ${className}`} {...props}>
            {children}
        </h3>
    );
};

export const CardDescription = ({ children, className = '', ...props }) => {
    return (
        <p className={`text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 ${className}`} {...props}>
            {children}
        </p>
    );
};

export const CardContent = ({ children, className = '', ...props }) => {
    return (
        <div className={`p-4 sm:p-6 ${className}`} {...props}>
            {children}
        </div>
    );
};

export const CardFooter = ({ children, className = '', ...props }) => {
    return (
        <div className={`px-4 py-3.5 sm:px-6 sm:py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 ${className}`} {...props}>
            {children}
        </div>
    );
};

export default Card;
