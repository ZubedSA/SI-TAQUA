import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, MessageCircle, Search, Users, Check, CheckCheck, MessageSquare, Paperclip, X, Image, FileText, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import './Messages.css'

const MessagesPage = () => {
    const navigate = useNavigate()
    const { user, userProfile } = useAuth()
    const messagesEndRef = useRef(null)

    // State
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('conversations') // 'conversations' | 'directory'
    const [conversations, setConversations] = useState([])
    const [directory, setDirectory] = useState([])
    const [activeConversation, setActiveConversation] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [loadingDirectory, setLoadingDirectory] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadingFile, setUploadingFile] = useState(false)
    const fileInputRef = useRef(null)

    // Fetch conversations and directory on mount
    useEffect(() => {
        if (!user) return
        fetchConversations()
        fetchDirectory()

        // Subscribe to new messages
        const channel = supabase
            .channel('messages-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    if (payload.new && activeConversation?.id === payload.new.conversation_id) {
                        fetchMessages(activeConversation.id)
                    }
                    fetchConversations()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchConversations = async () => {
        try {
            // Simple query without embedded joins
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
                .order('last_message_at', { ascending: false, nullsFirst: false })

            if (error) throw error

            // Enrich with user profiles
            const enriched = await Promise.all((data || []).map(async (conv) => {
                const otherId = conv.user_1_id === user.id ? conv.user_2_id : conv.user_1_id
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('nama, role, roles')
                    .eq('user_id', otherId)
                    .single()

                // Get unread count for this conversation
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .eq('is_read', false)
                    .neq('sender_id', user.id)

                return {
                    ...conv,
                    otherUser: {
                        id: otherId,
                        nama: profile?.nama || 'User',
                        role: profile?.role || 'user',
                        roles: profile?.roles || []
                    },
                    unreadCount: count || 0
                }
            }))

            setConversations(enriched)
        } catch (err) {
            console.error('Error fetching conversations:', err)
        } finally {
            setLoading(false)
        }
    }

    // Fetch ALL contacts that can be chatted with (from RPC)
    const fetchDirectory = async () => {
        setLoadingDirectory(true)
        try {
            const { data, error } = await supabase.rpc('get_chat_contacts')
            if (error) throw error

            // Check which contacts already have conversations
            const enrichedDirectory = (data || []).map(contact => {
                const hasConversation = conversations.some(
                    conv => conv.otherUser.id === contact.user_id
                )
                return {
                    ...contact,
                    hasConversation
                }
            })

            setDirectory(enrichedDirectory)
        } catch (err) {
            console.error('Error fetching directory:', err)
        } finally {
            setLoadingDirectory(false)
        }
    }

    // Refresh directory when conversations change
    useEffect(() => {
        if (directory.length > 0) {
            const enrichedDirectory = directory.map(contact => {
                const hasConversation = conversations.some(
                    conv => conv.otherUser.id === contact.user_id
                )
                return {
                    ...contact,
                    hasConversation
                }
            })
            setDirectory(enrichedDirectory)
        }
    }, [conversations])

    const fetchMessages = async (conversationId) => {
        setLoadingMessages(true)
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages(data || [])

            // Mark as read
            await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId })
            fetchConversations() // Refresh unread counts
        } catch (err) {
            console.error('Error fetching messages:', err)
        } finally {
            setLoadingMessages(false)
        }
    }

    const handleSelectConversation = (conv) => {
        setActiveConversation(conv)
        fetchMessages(conv.id)
    }

    const handleSelectContact = async (contact) => {
        try {
            const { data: conversationId, error } = await supabase.rpc('get_or_create_conversation', {
                p_other_user_id: contact.user_id
            })

            if (error) throw error

            // Refresh conversations and select the new/existing one
            await fetchConversations()
            const conv = {
                id: conversationId,
                otherUser: {
                    id: contact.user_id,
                    nama: contact.nama,
                    role: contact.role,
                    roles: contact.roles
                }
            }
            setActiveConversation(conv)
            fetchMessages(conversationId)
        } catch (err) {
            console.error('Error creating conversation:', err)
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if ((!newMessage.trim() && !selectedFile) || !activeConversation || sending) return

        setSending(true)
        try {
            let fileData = null

            // Upload file if selected
            if (selectedFile) {
                setUploadingFile(true)
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}.${fileExt}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('chat-files')
                    .upload(fileName, selectedFile)

                if (uploadError) throw uploadError

                const { data: urlData } = supabase.storage
                    .from('chat-files')
                    .getPublicUrl(fileName)

                fileData = {
                    file_url: urlData.publicUrl,
                    file_name: selectedFile.name,
                    file_type: selectedFile.type,
                    file_size: selectedFile.size
                }
                setUploadingFile(false)
            }

            // Determine message type
            const msgType = fileData
                ? (fileData.file_type.startsWith('image/') ? 'image' : 'file')
                : 'text'

            const { error } = await supabase.rpc('send_message', {
                p_conversation_id: activeConversation.id,
                p_message: newMessage.trim() || '',
                p_type: msgType,
                p_file_url: fileData?.file_url || null,
                p_file_name: fileData?.file_name || null,
                p_file_type: fileData?.file_type || null,
                p_file_size: fileData?.file_size || null
            })

            if (error) throw error
            setNewMessage('')
            setSelectedFile(null)
            fetchMessages(activeConversation.id)
        } catch (err) {
            console.error('Error sending message:', err)
            setUploadingFile(false)
        } finally {
            setSending(false)
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Check file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                alert('Ukuran file maksimal 10MB')
                return
            }
            setSelectedFile(file)
        }
    }

    const removeSelectedFile = () => {
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const renderMessageContent = (msg) => {
        if (msg.type === 'image' && msg.file_url) {
            return (
                <div className="message-image">
                    <img src={msg.file_url} alt={msg.file_name || 'Image'} onClick={() => window.open(msg.file_url, '_blank')} />
                    {msg.message && <div className="message-text">{msg.message}</div>}
                </div>
            )
        }
        if (msg.type === 'file' && msg.file_url) {
            return (
                <div className="message-file">
                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="file-attachment">
                        <FileText size={24} />
                        <div className="file-info">
                            <span className="file-name">{msg.file_name || 'File'}</span>
                            {msg.file_size && <span className="file-size">{formatFileSize(msg.file_size)}</span>}
                        </div>
                        <Download size={18} />
                    </a>
                    {msg.message && <div className="message-text">{msg.message}</div>}
                </div>
            )
        }
        return <div className="message-text">{msg.message}</div>
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage(e)
        }
    }

    const handleBack = () => {
        const previousUrl = sessionStorage.getItem('chat_previous_url')
        if (previousUrl) {
            navigate(previousUrl)
        } else {
            navigate(-1)
        }
    }

    const formatTime = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now - date

        if (diff < 86400000) { // Less than 24 hours
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        } else if (diff < 604800000) { // Less than 7 days
            return date.toLocaleDateString('id-ID', { weekday: 'short' })
        } else {
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        }
    }

    const getRoleBadge = (role) => {
        const roleColors = {
            admin: '#ef4444',
            pengasuh: '#8b5cf6',
            bendahara: '#10b981',
            akademik: '#3b82f6',
            musyrif: '#f59e0b',
            wali: '#6366f1',
            ota: '#ec4899',
            guru: '#0891b2'
        }
        return roleColors[role] || '#64748b'
    }

    // Filter based on search term
    const filteredConversations = conversations.filter(conv =>
        conv.otherUser.nama?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredDirectory = directory.filter(contact =>
        contact.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.role?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="messages-loading">
                <Spinner label="Memuat pesan..." />
            </div>
        )
    }

    return (
        <div className="messages-container">
            {/* Sidebar */}
            <div className={`messages-sidebar ${activeConversation ? 'mobile-hidden' : ''}`}>
                <div className="messages-sidebar-header">
                    <button className="back-btn" onClick={handleBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2>Pesan</h2>
                </div>

                {/* Tab Buttons */}
                <div className="messages-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('conversations')}
                    >
                        <MessageSquare size={16} />
                        Percakapan
                        {conversations.some(c => c.unreadCount > 0) && (
                            <span className="tab-badge"></span>
                        )}
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('directory')}
                    >
                        <Users size={16} />
                        Direktori
                    </button>
                </div >

                {/* Search Bar */}
                < div className="messages-search" >
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={activeTab === 'conversations' ? 'Cari percakapan...' : 'Cari user...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div >

                {/* Content based on active tab */}
                < div className="messages-list" >
                    {activeTab === 'conversations' ? (
                        // PERCAKAPAN TAB
                        filteredConversations.length === 0 ? (
                            <div className="empty-conversations">
                                <MessageCircle size={48} />
                                <p>Belum ada percakapan</p>
                                <button onClick={() => setActiveTab('directory')}>
                                    Lihat Direktori User
                                </button>
                            </div>
                        ) : (
                            filteredConversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                                    onClick={() => handleSelectConversation(conv)}
                                >
                                    <div className="conversation-avatar">
                                        {conv.otherUser.nama?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="conversation-info">
                                        <div className="conversation-name">
                                            {conv.otherUser.nama}
                                            <span
                                                className="role-badge"
                                                style={{ background: getRoleBadge(conv.otherUser.role) }}
                                            >
                                                {conv.otherUser.role}
                                            </span>
                                        </div>
                                        <div className="conversation-preview">
                                            {conv.last_message || 'Belum ada pesan'}
                                        </div>
                                    </div>
                                    <div className="conversation-meta">
                                        <span className="conversation-time">
                                            {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                                        </span>
                                        {conv.unreadCount > 0 && (
                                            <span className="unread-badge">{conv.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        // DIREKTORI TAB
                        loadingDirectory ? (
                            <div className="loading-directory">
                                <Spinner />
                            </div>
                        ) : filteredDirectory.length === 0 ? (
                            <div className="empty-contacts">
                                <Users size={48} />
                                <p>Tidak ada user yang tersedia</p>
                            </div>
                        ) : (
                            filteredDirectory.map(contact => (
                                <div
                                    key={contact.user_id}
                                    className="contact-item"
                                    onClick={() => handleSelectContact(contact)}
                                >
                                    <div className="contact-avatar">
                                        {contact.nama?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="contact-info">
                                        <div className="contact-name">{contact.nama}</div>
                                        <div className="contact-meta-row">
                                            <span
                                                className="role-badge"
                                                style={{ background: getRoleBadge(contact.role) }}
                                            >
                                                {contact.role}
                                            </span>
                                            {contact.hasConversation ? (
                                                <span className="has-chat-label">Sudah ada chat</span>
                                            ) : (
                                                <span className="no-chat-label">Belum ada chat</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="contact-action">
                                        <MessageCircle size={18} />
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div >
            </div >

            {/* Chat Panel */}
            < div className={`messages-panel ${!activeConversation ? 'mobile-hidden' : ''}`}>
                {
                    activeConversation ? (
                        // Active Chat View
                        <>
                            <div className="panel-header">
                                <button className="back-btn mobile-only" onClick={() => setActiveConversation(null)}>
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="chat-user-info">
                                    <div className="chat-avatar">
                                        {activeConversation.otherUser.nama?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="chat-user-name">{activeConversation.otherUser.nama}</div>
                                        <span
                                            className="role-badge"
                                            style={{ background: getRoleBadge(activeConversation.otherUser.role) }}
                                        >
                                            {activeConversation.otherUser.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="messages-content">
                                {loadingMessages ? (
                                    <div className="messages-loading-inline">
                                        <Spinner />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="empty-messages">
                                        <MessageCircle size={48} />
                                        <p>Mulai percakapan dengan {activeConversation.otherUser.nama}</p>
                                    </div>
                                ) : (
                                    messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`message-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                                        >
                                            {renderMessageContent(msg)}
                                            <div className="message-meta">
                                                <span className="message-time">
                                                    {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.sender_id === user.id && (
                                                    <span className="message-status">
                                                        {msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* File Preview */}
                            {selectedFile && (
                                <div className="file-preview">
                                    <div className="file-preview-info">
                                        {selectedFile.type.startsWith('image/') ? (
                                            <Image size={20} />
                                        ) : (
                                            <FileText size={20} />
                                        )}
                                        <span className="file-preview-name">{selectedFile.name}</span>
                                        <span className="file-preview-size">{formatFileSize(selectedFile.size)}</span>
                                    </div>
                                    <button type="button" className="file-preview-remove" onClick={removeSelectedFile}>
                                        <X size={18} />
                                    </button>
                                </div>
                            )}

                            <form className="message-input-form" onSubmit={handleSendMessage}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                />
                                <button
                                    type="button"
                                    className="attach-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sending || uploadingFile}
                                >
                                    <Paperclip size={20} />
                                </button>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ketik pesan..."
                                    rows={1}
                                    disabled={sending || uploadingFile}
                                />
                                <button type="submit" disabled={(!newMessage.trim() && !selectedFile) || sending || uploadingFile}>
                                    {uploadingFile ? <Spinner /> : <Send size={20} />}
                                </button>
                            </form>
                        </>
                    ) : (
                        // Empty State
                        <div className="empty-panel">
                            <MessageCircle size={64} />
                            <h3>Pilih Percakapan</h3>
                            <p>Pilih dari tab Percakapan atau Direktori untuk memulai chat</p>
                        </div>
                    )}
            </div >
        </div >
    )
}

export default MessagesPage
