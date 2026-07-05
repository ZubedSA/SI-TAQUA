import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import './Toast.css'

const icons = {
    success: <CheckCircle className="toast-icon" />,
    error: <AlertCircle className="toast-icon" />,
    warning: <AlertTriangle className="toast-icon" />,
    info: <Info className="toast-icon" />
}

const Toast = ({ id, type = 'info', title, message, onClose, duration = 5000 }) => {
    const [isClosing, setIsClosing] = useState(false)

    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                handleClose()
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [duration])

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(() => {
            onClose(id)
        }, 300) // Match animation duration
    }

    return (
        <div className={`toast toast-${type} ${isClosing ? 'closing' : ''}`} role="alert">
            {icons[type]}
            <div className="toast-content">
                {title && <h4 className="toast-title">{title}</h4>}
                <p className="toast-message">{message}</p>
            </div>
            <button className="toast-close" onClick={handleClose}>
                <X size={16} />
            </button>
        </div>
    )
}

export default Toast
