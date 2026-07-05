import React from 'react';

const FormInput = React.forwardRef(({
    label,
    error,
    helperText,
    className = '',
    id,
    type = 'text',
    icon: Icon,
    ...props
}, ref) => {
    const inputId = id || props.name;

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={inputId}
                    ref={ref}
                    type={type}
                    className={`
            flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
            transition-all duration-200
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
          `}
                    {...props}
                />
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon size={18} />
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs text-red-600 font-medium animate-in slide-in-from-top-1 fade-in-0">{error}</p>
            )}
            {helperText && !error && (
                <p className="text-xs text-gray-500">{helperText}</p>
            )}
        </div>
    );
});

FormInput.displayName = 'FormInput';

export default FormInput;
