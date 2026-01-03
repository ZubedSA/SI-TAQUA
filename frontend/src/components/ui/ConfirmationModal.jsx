import React from 'react'
import { X } from 'lucide-react'

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
    if (!isOpen) return null

    const getButtonClass = () => {
        switch (variant) {
            case 'danger': return 'btn-danger' // Assumes css class exists or style it inline
            case 'success': return 'bg-emerald-600 hover:bg-emerald-700 text-white' // Tailwind classes or inline
            case 'warning': return 'bg-amber-500 hover:bg-amber-600 text-white'
            default: return 'btn-primary' // Standard blue/primary
        }
    }

    const getButtonStyle = () => {
        // Fallback if classes aren't available globally
        switch (variant) {
            case 'danger': return {} // handled by btn-danger class usually
            case 'success': return { backgroundColor: '#10b981', color: 'white', border: 'none' }
            case 'warning': return { backgroundColor: '#f59e0b', color: 'white', border: 'none' }
            case 'primary': return { backgroundColor: '#3b82f6', color: 'white', border: 'none' }
            default: return {}
        }
    }

    return (
        <div className="modal-overlay active" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal" style={{
                background: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                width: '100%',
                maxWidth: '32rem', // max-w-lg
                margin: '1rem',
                overflow: 'hidden'
            }}>
                <div className="modal-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h3>
                    <button onClick={onClose} disabled={isLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '1rem', color: '#374151', lineHeight: '1.5' }}>
                        {message}
                    </div>
                    {description && (
                        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                            {description}
                        </p>
                    )}
                </div>

                <div className="modal-footer" style={{
                    padding: '1.25rem 1.5rem',
                    backgroundColor: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem'
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={isLoading}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.375rem',
                            fontWeight: 500,
                            border: '1px solid #d1d5db',
                            background: 'white',
                            color: '#374151',
                            cursor: 'pointer'
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className={`btn ${getButtonClass()}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.375rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            ...getButtonStyle()
                        }}
                    >
                        {isLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmationModal
