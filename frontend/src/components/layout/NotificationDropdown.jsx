import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './NotificationDropdown.css'

const NotificationDropdown = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const { user, role } = useAuth()
    const navigate = useNavigate()

    // Fetch notifications on mount and when dropdown opens
    useEffect(() => {
        if (isOpen && user) {
            fetchNotifications()
        }
    }, [isOpen, user])

    // Subscribe to real-time updates
    useEffect(() => {
        if (!user) return

        // Initial fetch for unread count
        fetchUnreadCount()

        // Subscribe to notifications table (if exists)
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchNotifications()
                    fetchUnreadCount()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    const fetchNotifications = async () => {
        if (!user) return
        setLoading(true)

        try {
            // Try to fetch from notifications table
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) {
                // Table might not exist - use mock data
                console.log('Notifications table not found, using defaults')
                setNotifications(getDefaultNotifications())
            } else {
                setNotifications(data || [])
            }
        } catch (err) {
            console.log('Using default notifications')
            setNotifications(getDefaultNotifications())
        } finally {
            setLoading(false)
        }
    }

    const fetchUnreadCount = async () => {
        if (!user) return

        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false)

            if (!error) {
                setUnreadCount(count || 0)
            } else {
                // Use default count if table doesn't exist
                setUnreadCount(getDefaultNotifications().filter(n => !n.is_read).length)
            }
        } catch {
            setUnreadCount(getDefaultNotifications().filter(n => !n.is_read).length)
        }
    }

    const getDefaultNotifications = () => {
        // Default notifications for demo purposes
        const now = new Date()
        return [
            {
                id: 1,
                title: 'Selamat Datang!',
                message: 'Selamat datang di Sistem Akademik PTQ Al-Usymuni',
                type: 'info',
                is_read: false,
                created_at: new Date(now - 1000 * 60 * 5).toISOString() // 5 minutes ago
            },
            {
                id: 2,
                title: 'Update Sistem',
                message: 'Sistem telah diperbarui dengan fitur pencarian global baru',
                type: 'success',
                is_read: false,
                created_at: new Date(now - 1000 * 60 * 60).toISOString() // 1 hour ago
            },
            {
                id: 3,
                title: 'Backup Tersedia',
                message: 'Backup otomatis terakhir berhasil dibuat',
                type: 'info',
                is_read: true,
                created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
            }
        ]
    }

    const markAsRead = async (id) => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch {
            // If table doesn't exist, just update local state
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
    }

    const markAllAsRead = async () => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
        } catch {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
        }
    }

    const deleteNotification = async (id) => {
        try {
            await supabase
                .from('notifications')
                .delete()
                .eq('id', id)

            setNotifications(prev => prev.filter(n => n.id !== id))
        } catch {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now - date

        if (diff < 60000) return 'Baru saja'
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} hari lalu`

        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return '✓'
            case 'warning': return '⚠'
            case 'error': return '✕'
            default: return 'ℹ'
        }
    }

    if (!isOpen) return null

    return (
        <div className="notification-dropdown">
            <div className="notification-header">
                <h4>Notifikasi</h4>
                {unreadCount > 0 && (
                    <button
                        className="mark-all-read-btn"
                        onClick={markAllAsRead}
                        title="Tandai semua sudah dibaca"
                    >
                        <CheckCheck size={16} />
                        <span>Baca semua</span>
                    </button>
                )}
            </div>

            <div className="notification-list">
                {loading ? (
                    <div className="notification-loading">
                        <div className="spinner"></div>
                        <span>Memuat...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                        <Bell size={32} />
                        <p>Tidak ada notifikasi</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div
                            key={notif.id}
                            className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                        >
                            <div className={`notification-icon type-${notif.type || 'info'}`}>
                                {getTypeIcon(notif.type)}
                            </div>
                            <div className="notification-content">
                                <div className="notification-title">{notif.title}</div>
                                <div className="notification-message">{notif.message}</div>
                                <div className="notification-time">{formatTime(notif.created_at)}</div>
                            </div>
                            <div className="notification-actions">
                                {!notif.is_read && (
                                    <button
                                        className="notif-action-btn"
                                        onClick={() => markAsRead(notif.id)}
                                        title="Tandai sudah dibaca"
                                    >
                                        <Check size={14} />
                                    </button>
                                )}
                                <button
                                    className="notif-action-btn delete"
                                    onClick={() => deleteNotification(notif.id)}
                                    title="Hapus"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Badge for unread count - rendered in parent */}
            {unreadCount > 0 && (
                <span className="floating-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
        </div>
    )
}

export default NotificationDropdown
