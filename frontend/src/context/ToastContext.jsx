import { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/ui/Toast'

const ToastContext = createContext()

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        console.warn('[ToastContext] useToast was used outside of ToastProvider or during a Vite HMR state desync. Using resilient mock fallback to prevent page crash.')
        return {
            success: (message, title = 'Berhasil') => console.log(`[Toast Fallback] SUCCESS: ${title} - ${message}`),
            error: (message, title = 'Gagal') => {
                console.error(`[Toast Fallback] ERROR: ${title} - ${message}`);
                alert(`TERJADI KESALAHAN!\n\n${title}: ${message}\n\n(Mohon periksa koneksi internet atau status server backend Anda)`);
            },
            warning: (message, title = 'Peringatan') => console.warn(`[Toast Fallback] WARNING: ${title} - ${message}`),
            info: (message, title = 'Info') => console.info(`[Toast Fallback] INFO: ${title} - ${message}`),
        }
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
