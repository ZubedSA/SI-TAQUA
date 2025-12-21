import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'

const MobileActionMenu = ({ children, actions }) => {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef(null)
    const navigate = useNavigate()

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [])

    const handleActionClick = (action) => {
        setIsOpen(false)

        // If action has a path, use navigate
        if (action.path) {
            navigate(action.path)
        } else if (action.onClick) {
            action.onClick()
        }
    }

    return (
        <div className="action-buttons">
            {/* Desktop: Show regular buttons */}
            {children}

            {/* Mobile: Show dropdown */}
            <div className="mobile-action-wrapper" ref={menuRef}>
                <button
                    className="mobile-action-toggle"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                    }}
                    title="Menu"
                    type="button"
                >
                    <MoreVertical size={18} />
                </button>
                {isOpen && (
                    <div className="mobile-action-menu show">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                className={`mobile-action-item ${action.danger ? 'danger' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleActionClick(action)
                                }}
                                type="button"
                            >
                                {action.icon}
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MobileActionMenu
