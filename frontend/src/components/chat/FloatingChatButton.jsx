import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './FloatingChatButton.css'

const FloatingChatButton = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, isAuthenticated } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)

    // Draggable state
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('chat_button_position')
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch {
                return { x: null, y: null }
            }
        }
        return { x: null, y: null }
    })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const buttonRef = useRef(null)

    // Fetch unread count
    useEffect(() => {
        if (!user) return

        const fetchUnreadCount = async () => {
            try {
                const { data, error } = await supabase.rpc('get_unread_message_count')
                if (!error && data !== null) {
                    setUnreadCount(data)
                }
            } catch (err) {
                console.error('Error fetching unread count:', err)
            }
        }

        fetchUnreadCount()

        // Poll every 30 seconds for updates
        const interval = setInterval(fetchUnreadCount, 30000)

        // Subscribe to realtime updates
        const channel = supabase
            .channel('messages-unread')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                () => {
                    fetchUnreadCount()
                }
            )
            .subscribe()

        return () => {
            clearInterval(interval)
            supabase.removeChannel(channel)
        }
    }, [user])

    // Handle drag start
    const handleMouseDown = (e) => {
        if (e.button !== 0) return // Only left click
        const rect = buttonRef.current.getBoundingClientRect()
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
        setIsDragging(true)
        e.preventDefault()
    }

    const handleTouchStart = (e) => {
        const touch = e.touches[0]
        const rect = buttonRef.current.getBoundingClientRect()
        setDragOffset({
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        })
        setIsDragging(true)
    }

    // Handle drag move
    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e) => {
            const newX = e.clientX - dragOffset.x
            const newY = e.clientY - dragOffset.y

            // Clamp to viewport
            const maxX = window.innerWidth - 60
            const maxY = window.innerHeight - 60

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            })
        }

        const handleTouchMove = (e) => {
            const touch = e.touches[0]
            const newX = touch.clientX - dragOffset.x
            const newY = touch.clientY - dragOffset.y

            const maxX = window.innerWidth - 60
            const maxY = window.innerHeight - 60

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            })
        }

        const handleMouseUp = () => {
            setIsDragging(false)
            // Save position to localStorage
            if (position.x !== null && position.y !== null) {
                localStorage.setItem('chat_button_position', JSON.stringify(position))
            }
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('touchmove', handleTouchMove)
        document.addEventListener('touchend', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleMouseUp)
        }
    }, [isDragging, dragOffset, position])

    // Save position when it changes
    useEffect(() => {
        if (position.x !== null && position.y !== null && !isDragging) {
            localStorage.setItem('chat_button_position', JSON.stringify(position))
        }
    }, [position, isDragging])

    // Don't show on login page or messages page
    if (!isAuthenticated || location.pathname === '/login' || location.pathname === '/messages') {
        return null
    }

    const handleClick = (e) => {
        // Only navigate if not dragging
        if (isDragging) {
            e.preventDefault()
            return
        }
        // Save current URL for "back" functionality
        sessionStorage.setItem('chat_previous_url', location.pathname)
        navigate('/messages')
    }

    // Calculate style
    const buttonStyle = position.x !== null && position.y !== null
        ? {
            left: `${position.x}px`,
            top: `${position.y}px`,
            right: 'auto',
            bottom: 'auto',
            cursor: isDragging ? 'grabbing' : 'grab'
        }
        : {
            cursor: isDragging ? 'grabbing' : 'grab'
        }

    return (
        <button
            ref={buttonRef}
            className={`floating-chat-button ${isDragging ? 'dragging' : ''} ${position.x !== null ? 'custom-position' : ''}`}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={buttonStyle}
            title="Pesan (Drag untuk pindahkan)"
        >
            <MessageCircle size={24} />
            {unreadCount > 0 && (
                <span className="floating-chat-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    )
}

export default FloatingChatButton
