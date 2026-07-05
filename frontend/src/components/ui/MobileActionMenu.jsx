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
        <div className="flex items-center gap-2">
            {/* Desktop: Show regular buttons */}
            <div className="hidden md:flex items-center gap-2">
                {children}
            </div>

            {/* Mobile: Show dropdown */}
            <div className="relative md:hidden" ref={menuRef}>
                <button
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 origin-top-right animate-in fade-in zoom-in-95" role="menu">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${action.danger
                                        ? 'text-red-600 hover:bg-red-50'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                onClick={(e) => handleActionClick(action, e)}
                                type="button"
                                role="menuitem"
                            >
                                <span className="text-current opacity-70" aria-hidden="true">{action.icon}</span>
                                <span className="font-medium">{action.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MobileActionMenu
