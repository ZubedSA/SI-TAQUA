import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
    variant = 'primary', // primary, secondary, danger, ghost, outline
    size = 'md', // sm, md, lg, icon
    className = '',
    isLoading = false,
    disabled,
    children,
    type = 'button',
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
        primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm focus:ring-primary-500",
        secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm focus:ring-gray-200",
        danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 focus:ring-red-500",
        dangerPrimary: "bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-red-500",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        outline: "bg-transparent border border-primary-600 text-primary-600 hover:bg-primary-50",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "p-2",
    };

    const classes = [
        baseStyles,
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
    ].join(" ");

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
};

export default Button;
