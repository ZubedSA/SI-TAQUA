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
    const baseStyles = "inline-flex items-center justify-center gap-2 !rounded-full font-bold uppercase tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-manipulation select-none";

    const variants = {
        primary: "!bg-[#0A2619] !text-[#BCF32F] hover:!bg-[#BCF32F] hover:!text-[#0A2619] !shadow-lg !shadow-[#0A2619]/10 hover:!shadow-[#BCF32F]/30",
        secondary: "bg-white text-[#0A2619] border border-gray-200 hover:bg-[#BCF32F]/10 hover:border-[#0A2619]/20 hover:text-[#0A2619] shadow-sm",
        danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-red-500",
        dangerPrimary: "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20 focus:ring-red-500",
        ghost: "bg-transparent text-gray-600 hover:bg-[#0A2619]/5 hover:text-[#0A2619]",
        outline: "bg-transparent border-2 border-[#0A2619] text-[#0A2619] hover:bg-[#0A2619] hover:text-[#BCF32F]",
    };

    const sizes = {
        sm: "px-4 py-2 min-h-[38px] text-[10px] sm:text-xs",
        md: "px-5 py-2.5 min-h-[44px] text-[11px] sm:text-xs",
        lg: "px-6 py-3 min-h-[48px] text-xs sm:text-sm",
        icon: "p-2.5 min-w-[40px] min-h-[40px]",
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

export { Button };
export default Button;
