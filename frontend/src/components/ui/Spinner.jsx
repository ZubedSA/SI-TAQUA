import { Loader2 } from 'lucide-react'

const Spinner = ({ size = 'md', label = '', className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    }

    return (
        <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
            <Loader2 className={`animate-spin text-primary-600 ${sizeClasses[size] || sizeClasses.md}`} />
            {label && <span className="mt-3 text-sm font-medium text-gray-500">{label}</span>}
        </div>
    )
}

export default Spinner
