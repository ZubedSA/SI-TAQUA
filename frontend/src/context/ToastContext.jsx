import { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/ui/Toast'

const ToastContext = createContext()

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((type, title, message, duration = 5000) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { id, type, title, message, duration }])
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    // Convenience methods
    const showToast = {
        success: (message, title = 'Berhasil') => addToast('success', title, message),
        error: (message, title = 'Gagal') => addToast('error', title, message),
        warning: (message, title = 'Peringatan') => addToast('warning', title, message),
        info: (message, title = 'Info') => addToast('info', title, message),
    }

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    )
}
