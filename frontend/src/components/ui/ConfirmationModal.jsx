import React, { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react'
import Button from './Button'

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    description,
    confirmLabel = 'Konfirmasi',
    cancelLabel = 'Batal',
    variant = 'primary', // primary, success, danger, warning
    isLoading = false
}) => {
    const [isVisible, setIsVisible] = useState(false)
    const [shouldRender, setShouldRender] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true)
            // Small timeout to allow render before adding animation class
            setTimeout(() => setIsVisible(true), 10)
        } else {
            setIsVisible(false)
            // Wait for animation to finish before unmounting
            setTimeout(() => setShouldRender(false), 300)
        }
    }, [isOpen])

    if (!shouldRender) return null

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <div className="p-2 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={24} /></div>
            case 'warning': return <div className="p-2 bg-amber-100 text-amber-600 rounded-full"><AlertCircle size={24} /></div>
            case 'success': return <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><CheckCircle size={24} /></div>
            default: return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Info size={24} /></div>
        }
    }

    const getConfirmButtonVariant = () => {
        switch (variant) {
            case 'danger': return 'dangerPrimary'
            case 'warning': return 'primary' // styling warning as primary usually works or add warning variant to Button if needed. Using primary for now or generic style? Button has valid variants.
            // Let's check Button variants again. It has 'dangerPrimary'. It doesn't have explicit 'warning' or 'success' button styles in the snippet I saw, 
            // but I can use 'primary' for general or class overrides.
            // Actually, for semantic meaning, if Button doesn't support 'warning' yet, I'll stick to 'primary' or custom className. 
            // The user wanted premium. Let's stick to Safe defaults from Button.jsx: primary, dangerPrimary.
            // If variant is success, maybe primary is fine (usually blue/green overlap in some designs) or I should add specific coloring?
            // "primary" is defined as blue. "success" implies green. 
            // I'll stick to 'primary' for success/default, and 'dangerPrimary' for danger.
            default: return 'primary'
        }
    }

    // Custom button styling for success/warning if not in Button component
    const customConfirmClass = () => {
        if (variant === 'success') return '!bg-emerald-600 hover:!bg-emerald-700 focus:!ring-emerald-500'
        if (variant === 'warning') return '!bg-amber-500 hover:!bg-amber-600 focus:!ring-amber-500' // amber for warning
        return ''
    }

    return (
        <div
            className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'visible opacity-100' : 'invisible opacity-0'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                onClick={!isLoading ? onClose : undefined}
            />

            {/* Modal */}
            <div
                className={`relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            {getIcon()}
                        </div>
                        <div className="flex-1">
                            <p className="text-base font-medium text-gray-900 mb-2">
                                {message}
                            </p>
                            {description && (
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={getConfirmButtonVariant()}
                        className={customConfirmClass()}
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmationModal
