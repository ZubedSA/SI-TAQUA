import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'

const MobileActionMenu = ({ children, actions }) => {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef(null)
    const navigate = useNavigate()

    // Close on outside click - but not immediately to allow button clicks to complete
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is on menu item - if so, don't close yet
            if (event.target.closest('.mobile-action-item')) {
                return
            }
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            // Delay adding listener to prevent immediate close
            const timer = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside)
                document.addEventListener('touchstart', handleClickOutside, { passive: true })
            }, 100)

            return () => {
                clearTimeout(timer)
                document.removeEventListener('mousedown', handleClickOutside)
                document.removeEventListener('touchstart', handleClickOutside)
            }
        }
    }, [isOpen])

    const handleActionClick = (action, e) => {
        e.preventDefault()
        e.stopPropagation()

        // Close menu first
        setIsOpen(false)

        // Execute action after a small delay to ensure state update completes
        setTimeout(() => {
            if (action.path) {
                navigate(action.path)
            } else if (action.onClick) {
                action.onClick()
            }
        }, 50)
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
                    onTouchEnd={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                    }}
                    title="Menu Aksi"
                    aria-label="Menu Aksi"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    type="button"
                >
                    <MoreVertical size={18} aria-hidden="true" />
                </button>
                {isOpen && (
                    <div className="mobile-action-menu show" role="menu">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                className={`mobile-action-item ${action.danger ? 'danger' : ''}`}
                                onClick={(e) => handleActionClick(action, e)}
                                onTouchEnd={(e) => handleActionClick(action, e)}
                                type="button"
                                role="menuitem"
                            >
                                <span className="action-icon" aria-hidden="true">{action.icon}</span>
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
