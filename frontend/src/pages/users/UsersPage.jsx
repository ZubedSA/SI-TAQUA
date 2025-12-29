import { useEffect, useState } from 'react'
import {
    Users,
    UserPlus,
    Search,
    Edit,
    Trash2,
    Shield,
    CheckCircle,
    XCircle,
    Filter,
    Download,
    RefreshCw,
    X,
    Eye,
    EyeOff,
    Save,
    Loader2,
    Key
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import './UsersPage.css'

/**
 * Users Management Page - Admin Only
 * Manage all system users, their roles and status
 */
const UsersPage = () => {
    const { showToast } = useToast()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Change Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [passwordTarget, setPasswordTarget] = useState(null)
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
    const [passwordErrors, setPasswordErrors] = useState({})
    const [savingPassword, setSavingPassword] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        nama: '',
        email: '',
        username: '',
        password: '',
        roles: ['guru'], // Changed to array
        phone: ''
    })
    const [formErrors, setFormErrors] = useState({})

    // Santri data for wali role
    const [santriList, setSantriList] = useState([])
    const [selectedSantriIds, setSelectedSantriIds] = useState([])
    const [loadingSantri, setLoadingSantri] = useState(false)

    useEffect(() => {
        fetchUsers()
        fetchSantri()
    }, [])

    // Fetch all santri for wali selection
    const fetchSantri = async () => {
        setLoadingSantri(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, kelas:kelas_id(nama)')
                .order('nama', { ascending: true })

            if (error) throw error
            setSantriList(data || [])
        } catch (error) {
            console.error('Error fetching santri:', error.message)
        } finally {
            setLoadingSantri(false)
        }
    }

    // Reset form when modal opens/closes
    useEffect(() => {
        if (showAddModal) {
            setFormData({
                nama: '',
                email: '',
                username: '',
                password: '',
                roles: ['guru'],
                phone: ''
            })
            setFormErrors({})
            setShowPassword(false)
            setSelectedSantriIds([]) // Reset santri selection
        }
    }, [showAddModal])

    // Populate form when editing
    useEffect(() => {
        if (editingUser) {
            // Handle legacy single role vs new multi roles
            let userRoles = editingUser.roles || []
            if (userRoles.length === 0 && editingUser.role) {
                userRoles = [editingUser.role]
            }
            if (userRoles.length === 0) {
                userRoles = ['guru'] // Default
            }

            setFormData({
                nama: editingUser.nama || '',
                email: editingUser.email || '',
                username: editingUser.username || '',
                password: '',
                roles: userRoles,
                phone: editingUser.phone || ''
            })
            setFormErrors({})

            // Fetch linked santri if editing wali user
            if (userRoles.includes('wali') && editingUser.user_id) {
                fetchLinkedSantri(editingUser.user_id)
            } else {
                setSelectedSantriIds([])
            }
        }
    }, [editingUser])

    // Fetch santri linked to a wali user
    const fetchLinkedSantri = async (waliUserId) => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id')
                .eq('wali_id', waliUserId)

            if (error) throw error
            setSelectedSantriIds(data?.map(s => s.id) || [])
        } catch (error) {
            console.error('Error fetching linked santri:', error.message)
            setSelectedSantriIds([])
        }
    }

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Normalize roles data for users who might not have it yet
            const normalizedUsers = (data || []).map(u => ({
                ...u,
                roles: u.roles || (u.role ? [u.role] : ['guest'])
            }))

            setUsers(normalizedUsers)
        } catch (error) {
            console.error('Error fetching users:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const getRoleBadgeColor = (role) => {
        const colors = {
            admin: 'badge-red',
            guru: 'badge-blue',
            bendahara: 'badge-green',
            pengasuh: 'badge-teal',
            wali: 'badge-purple'
        }
        return colors[role] || 'badge-gray'
    }

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Admin',
            guru: 'Guru',
            bendahara: 'Bendahara',
            pengasuh: 'Pengasuh',
            wali: 'Wali'
        }
        return labels[role] || role
    }

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchTerm.toLowerCase())

        // Check if user has the selected filter role
        const matchesRole = !filterRole || (user.roles && user.roles.includes(filterRole)) || user.role === filterRole

        return matchesSearch && matchesRole
    })

    const validateForm = () => {
        const errors = {}

        if (!formData.nama.trim()) {
            errors.nama = 'Nama wajib diisi'
        }

        if (!formData.email.trim()) {
            errors.email = 'Email wajib diisi'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Format email tidak valid'
        }

        if (!formData.username.trim()) {
            errors.username = 'Username wajib diisi'
        } else if (formData.username.length < 3) {
            errors.username = 'Username minimal 3 karakter'
        }

        if (formData.roles.length === 0) {
            errors.roles = 'Pilih minimal satu role'
        }

        // Password required only for new users
        if (!editingUser && !formData.password) {
            errors.password = 'Password wajib diisi'
        } else if (!editingUser && formData.password.length < 6) {
            errors.password = 'Password minimal 6 karakter'
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error when user types
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const handleRoleToggle = (role) => {
        setFormData(prev => {
            const currentRoles = prev.roles || []
            let newRoles
            if (currentRoles.includes(role)) {
                newRoles = currentRoles.filter(r => r !== role)
            } else {
                newRoles = [...currentRoles, role]
            }
            return { ...prev, roles: newRoles }
        })
        if (formErrors.roles) {
            setFormErrors(prev => ({ ...prev, roles: null }))
        }
    }

    const handleSaveUser = async () => {
        if (!validateForm()) return

        setSaving(true)
        try {
            // Determine primary role for legacy compatibility
            const rolePriority = ['admin', 'bendahara', 'guru', 'pengasuh', 'wali']
            const primaryRole = rolePriority.find(r => formData.roles.includes(r)) || formData.roles[0]

            if (editingUser) {
                // ... Existing Edit Logic ...
                // Calculate Active Role based on new roles selection
                const resolvedActiveRole = (editingUser.active_role && formData.roles.includes(editingUser.active_role))
                    ? editingUser.active_role
                    : primaryRole

                const updatePayload = {
                    target_user_id: editingUser.user_id,
                    new_email: formData.email,
                    new_username: formData.username,
                    new_full_name: formData.nama,
                    new_role: primaryRole,
                    new_roles: formData.roles,
                    new_active_role: resolvedActiveRole,
                    new_phone: formData.phone || null
                }

                console.log('🚀 Calling admin_update_user_email RPC with payload:', updatePayload)

                // Call RPC to update AUTH (Atomic) and Profile
                const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_update_user_email', updatePayload)

                console.log('✅ RPC Result:', { rpcResult, rpcError })

                if (rpcError) throw rpcError
                if (!rpcResult.success) throw new Error(rpcResult.message)

                // Update Local State
                const finalUpdateData = {
                    nama: formData.nama,
                    username: formData.username,
                    roles: formData.roles,
                    role: primaryRole,
                    active_role: resolvedActiveRole,
                    email: formData.email,
                    phone: formData.phone || null
                }

                setUsers(users.map(u =>
                    u.user_id === editingUser.user_id
                        ? { ...u, ...finalUpdateData }
                        : u
                ))

                if (formData.roles.includes('wali')) {
                    await linkSantriToWali(editingUser.user_id, selectedSantriIds)
                }

                if (rpcResult && rpcResult.message) {
                    showToast.success('Status Server: ' + rpcResult.message)
                } else {
                    showToast.success('User berhasil diperbarui')
                }

                fetchUsers()
                closeModal()
            } else {
                // CREATE USER FLOW

                // 1. Attempt Sign Up
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            nama: formData.nama,
                            role: primaryRole
                        }
                    }
                })

                if (authError) {
                    // CHECK FOR DUPLICATE/ZOMBIE ERROR
                    // 406 Error often masked as generic error or duplicate
                    if (authError.message.includes('already registered') ||
                        authError.status === 422 ||
                        authError.status === 406) {

                        const doReset = window.confirm(
                            `Email ${formData.email} mengalami konflik data (Error ${authError.status || 'Duplicate'}).\n\nKlik OK untuk membersihkan data lama dan membuat ulang user baru.`
                        )

                        if (doReset) {
                            // Call Robust Cleanup RPC
                            const { data: resultMsg, error: rpcError } = await supabase.rpc('admin_cleanup_user_by_email', {
                                target_email: formData.email
                            })

                            if (rpcError) {
                                throw new Error('Gagal membersihkan data: ' + rpcError.message)
                            }

                            if (resultMsg && resultMsg.startsWith('Error')) {
                                throw new Error(resultMsg)
                            }

                            console.log('Cleanup result:', resultMsg)

                            // Short delay to ensure propagation
                            await new Promise(r => setTimeout(r, 500))

                            // Retry Creation
                            const { data: retryData, error: retryError } = await supabase.auth.signUp({
                                email: formData.email,
                                password: formData.password,
                                options: {
                                    data: { nama: formData.nama, role: primaryRole }
                                }
                            })

                            if (retryError) throw retryError

                            if (retryData.user) {
                                if (retryData.user) {
                                    await finalizeUserCreation(retryData.user, primaryRole)
                                    showToast.success('User berhasil diperbaiki dan dibuat ulang!')
                                    fetchUsers()
                                    closeModal()
                                    return
                                }
                            }
                        } else {
                            return // User cancelled
                        }
                    }
                    throw authError
                }

                if (authData.user) {
                    await finalizeUserCreation(authData.user, primaryRole)
                    showToast.success('User berhasil ditambahkan!')
                    fetchUsers()
                    closeModal()
                }
            }
        } catch (error) {
            console.error('Save error details:', error)
            showToast.error('Gagal menyimpan: ' + (error.message || 'Error tidak diketahui'))
        } finally {
            setSaving(false)
        }
    }

    // Helper to insert profile and link wali
    const finalizeUserCreation = async (user, primaryRole) => {
        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                user_id: user.id,
                email: formData.email,
                nama: formData.nama,
                username: formData.username,
                roles: formData.roles,
                role: primaryRole,
                active_role: primaryRole,
                phone: formData.phone || null
            })

        if (profileError) {
            // If profile creation fails, we should rollback auth user to prevent zombies
            // But for now just throw
            throw new Error('Gagal membuat profil: ' + profileError.message)
        }

        if (formData.roles.includes('wali') && selectedSantriIds.length > 0) {
            await linkSantriToWali(user.id, selectedSantriIds)
        }
    }

    // Link santri to wali user
    const linkSantriToWali = async (waliUserId, santriIds) => {
        try {
            // First, remove this wali from all santri (reset)
            await supabase
                .from('santri')
                .update({ wali_id: null })
                .eq('wali_id', waliUserId)

            // Then, set wali_id for selected santri
            if (santriIds.length > 0) {
                const { error } = await supabase
                    .from('santri')
                    .update({ wali_id: waliUserId })
                    .in('id', santriIds)

                if (error) throw error
            }
        } catch (error) {
            console.error('Error linking santri to wali:', error.message)
            throw error
        }
    }

    // Toggle santri selection
    const toggleSantriSelection = (santriId) => {
        setSelectedSantriIds(prev =>
            prev.includes(santriId)
                ? prev.filter(id => id !== santriId)
                : [...prev, santriId]
        )
    }

    const handleDeleteUser = async (userId) => {
        if (!confirm('Yakin ingin menghapus user ini? Action ini akan menghapus login user juga.')) return

        try {
            // Use RPC to delete from auth.users AND public.user_profiles
            const { data, error } = await supabase.rpc('delete_user_completely', {
                p_user_id: userId
            })

            if (error) throw error

            if (data && data.success === false) {
                throw new Error(data.error)
            }

            // Remove from local state
            setUsers(users.filter(u => u.user_id !== userId))
            showToast.success('User berhasil dihapus sepenuhnya.')
        } catch (error) {
            console.error('Delete error:', error)

            // Fallback: Try normal delete if RPC missing/fails (for robustness)
            if (error.message.includes('function delete_user_completely') || error.message.includes('does not exist')) {
                const { error: fallbackError } = await supabase
                    .from('user_profiles')
                    .delete()
                    .eq('user_id', userId)

                if (fallbackError) {
                    showToast.error('Gagal menghapus user: ' + fallbackError.message)
                } else {
                    setUsers(users.filter(u => u.user_id !== userId))
                    showToast.success('User profile dihapus (Auth login mungkin masih ada).')
                }
            } else {
                showToast.error('Gagal menghapus user: ' + error.message)
            }
        }
    }

    const closeModal = () => {
        setShowAddModal(false)
        setEditingUser(null)
        setFormData({
            nama: '',
            email: '',
            username: '',
            password: '',
            roles: ['guru'],
            phone: ''
        })
        setFormErrors({})
    }

    // ==========================================
    // CHANGE PASSWORD FUNCTIONS
    // ==========================================
    const openPasswordModal = (user) => {
        setPasswordTarget(user)
        setPasswordForm({ newPassword: '', confirmPassword: '' })
        setPasswordErrors({})
        setShowPasswordModal(true)
    }

    const closePasswordModal = () => {
        setShowPasswordModal(false)
        setPasswordTarget(null)
        setPasswordForm({ newPassword: '', confirmPassword: '' })
        setPasswordErrors({})
    }

    const validatePasswordForm = () => {
        const errors = {}

        if (!passwordForm.newPassword) {
            errors.newPassword = 'Password baru wajib diisi'
        } else if (passwordForm.newPassword.length < 8) {
            errors.newPassword = 'Password minimal 8 karakter'
        }

        if (!passwordForm.confirmPassword) {
            errors.confirmPassword = 'Konfirmasi password wajib diisi'
        } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            errors.confirmPassword = 'Password tidak sama'
        }

        setPasswordErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleChangePassword = async () => {
        if (!validatePasswordForm()) return
        if (!passwordTarget?.user_id) {
            alert('User tidak valid')
            return
        }

        setSavingPassword(true)
        try {
            // Use Supabase RPC to change password (requires admin function)
            const { data, error } = await supabase.rpc('admin_change_user_password', {
                target_user_id: passwordTarget.user_id,
                new_password: passwordForm.newPassword
            })

            if (error) throw error

            showToast.success(`✅ Password untuk ${passwordTarget.nama} berhasil diubah!`)
            closePasswordModal()
        } catch (error) {
            console.error('Change password error:', error)

            // If RPC doesn't exist, show helpful message
            if (error.message.includes('function') && error.message.includes('does not exist')) {
                showToast.error('Fitur ubah password memerlukan fungsi database. Silakan hubungi administrator.')
            } else {
                showToast.error('Gagal mengubah password: ' + error.message)
            }
        } finally {
            setSavingPassword(false)
        }
    }

    return (
        <div className="users-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-info">
                    <h1><Users size={28} /> Manajemen User</h1>
                    <p>Kelola semua pengguna sistem</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddModal(true)}
                    type="button"
                >
                    <UserPlus size={18} />
                    <span>Tambah User</span>
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama, email, atau username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                        <option value="">Semua Role</option>
                        <option value="admin">Administrator</option>
                        <option value="guru">Guru</option>
                        <option value="bendahara">Bendahara</option>
                        <option value="wali">Wali Santri</option>
                    </select>
                </div>
                <button className="btn-icon" onClick={fetchUsers} title="Refresh">
                    <RefreshCw size={18} />
                </button>
                <button className="btn-icon" title="Export">
                    <Download size={18} />
                </button>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-chip">
                    <span className="stat-number">{users.length}</span>
                    <span className="stat-label">Total Users</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-number">{users.filter(u => (u.roles || []).includes('admin')).length}</span>
                    <span className="stat-label">Admin</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-number">{users.filter(u => (u.roles || []).includes('guru')).length}</span>
                    <span className="stat-label">Guru</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-number">{users.filter(u => (u.roles || []).includes('bendahara')).length}</span>
                    <span className="stat-label">Bendahara</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-number">{users.filter(u => (u.roles || []).includes('wali')).length}</span>
                    <span className="stat-label">Wali</span>
                </div>
            </div>

            {/* Users Table */}
            <div className="users-table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data user...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <h3>Tidak ada user ditemukan</h3>
                        <p>Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Username</th>
                                <th>Roles</th>
                                <th>Status</th>
                                <th>Dibuat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.user_id || user.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar">
                                                {user.nama?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="user-info">
                                                <span className="user-name">{user.nama || '-'}</span>
                                                <span className="user-email">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="username">@{user.username || '-'}</span>
                                    </td>
                                    <td>
                                        <div className="roles-cell">
                                            {(user.roles || [user.role]).map((r, idx) => (
                                                <span key={idx} className={`role-badge ${getRoleBadgeColor(r)}`}>
                                                    {getRoleLabel(r)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${user.is_active !== false ? 'active' : 'inactive'}`}>
                                            {user.is_active !== false ? (
                                                <><CheckCircle size={12} /> Aktif</>
                                            ) : (
                                                <><XCircle size={12} /> Nonaktif</>
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="date-text">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons" style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                className="btn-action edit"
                                                title="Edit"
                                                onClick={() => setEditingUser(user)}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="btn-action password"
                                                title="Ubah Password"
                                                onClick={() => openPasswordModal(user)}
                                                style={{ background: '#f59e0b', color: 'white' }}
                                            >
                                                <Key size={14} />
                                            </button>
                                            <button
                                                className="btn-action delete"
                                                title="Hapus"
                                                onClick={() => handleDeleteUser(user.user_id)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {(showAddModal || editingUser) && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content user-form-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="form-body">
                            <div className="form-group">
                                <label>Nama Lengkap *</label>
                                <input
                                    type="text"
                                    name="nama"
                                    value={formData.nama}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan nama lengkap"
                                    className={formErrors.nama ? 'error' : ''}
                                />
                                {formErrors.nama && <span className="error-text">{formErrors.nama}</span>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="email@contoh.com"
                                        className={formErrors.email ? 'error' : ''}
                                        disabled={!!editingUser}
                                    />
                                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Username *</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        placeholder="username"
                                        className={formErrors.username ? 'error' : ''}
                                    />
                                    {formErrors.username && <span className="error-text">{formErrors.username}</span>}
                                </div>
                            </div>

                            {!editingUser && (
                                <div className="form-group">
                                    <label>Password *</label>
                                    <div className="password-input">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Minimal 6 karakter"
                                            className={formErrors.password ? 'error' : ''}
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {formErrors.password && <span className="error-text">{formErrors.password}</span>}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Roles (Hak Akses) *</label>
                                <div className="roles-checkbox-group">
                                    {['admin', 'guru', 'bendahara', 'pengasuh', 'wali'].map(role => (
                                        <label key={role} className={`role-checkbox ${formData.roles.includes(role) ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={formData.roles.includes(role)}
                                                onChange={() => handleRoleToggle(role)}
                                            />
                                            <span className="role-label-text">{getRoleLabel(role)}</span>
                                            {formData.roles.includes(role) && <CheckCircle size={14} className="check-icon" />}
                                        </label>
                                    ))}
                                </div>
                                {formErrors.roles && <span className="error-text">{formErrors.roles}</span>}
                            </div>

                            <div className="form-group">
                                <label>No. Telepon</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>

                            {/* Santri Selection for Wali role */}
                            {formData.roles.includes('wali') && (
                                <div className="form-group santri-selection">
                                    <label>Pilih Santri (Wali Santri dari) *</label>
                                    <div className="santri-list">
                                        {loadingSantri ? (
                                            <p className="loading-text">Memuat data santri...</p>
                                        ) : santriList.length === 0 ? (
                                            <p className="empty-text">Tidak ada data santri</p>
                                        ) : (
                                            santriList.map(santri => (
                                                <label key={santri.id} className="santri-checkbox-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSantriIds.includes(santri.id)}
                                                        onChange={() => toggleSantriSelection(santri.id)}
                                                    />
                                                    <div className="santri-checkbox-info">
                                                        <span className="santri-nama">{santri.nama}</span>
                                                        <span className="santri-detail">
                                                            {santri.nis} {santri.kelas?.nama ? `• ${santri.kelas.nama}` : ''}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    {selectedSantriIds.length > 0 && (
                                        <p className="selection-info">
                                            {selectedSantriIds.length} santri dipilih
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>
                                Batal
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveUser}
                                disabled={saving}
                            >
                                {saving ? (
                                    <><Loader2 size={18} className="spin" /> Menyimpan...</>
                                ) : (
                                    <><Save size={18} /> Simpan</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && passwordTarget && (
                <div className="modal-overlay" onClick={closePasswordModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2><Key size={20} /> Ubah Password</h2>
                            <button className="modal-close" onClick={closePasswordModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="form-body">
                            <div style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '16px'
                            }}>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                    <strong>User:</strong> {passwordTarget.nama}
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                    {passwordTarget.email}
                                </p>
                            </div>

                            <div className="form-group">
                                <label>Password Baru *</label>
                                <div className="password-input">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordForm.newPassword}
                                        onChange={e => {
                                            setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))
                                            if (passwordErrors.newPassword) {
                                                setPasswordErrors(prev => ({ ...prev, newPassword: null }))
                                            }
                                        }}
                                        placeholder="Minimal 8 karakter"
                                        className={passwordErrors.newPassword ? 'error' : ''}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {passwordErrors.newPassword && <span className="error-text">{passwordErrors.newPassword}</span>}
                            </div>

                            <div className="form-group">
                                <label>Konfirmasi Password Baru *</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordForm.confirmPassword}
                                    onChange={e => {
                                        setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                                        if (passwordErrors.confirmPassword) {
                                            setPasswordErrors(prev => ({ ...prev, confirmPassword: null }))
                                        }
                                    }}
                                    placeholder="Ulangi password baru"
                                    className={passwordErrors.confirmPassword ? 'error' : ''}
                                />
                                {passwordErrors.confirmPassword && <span className="error-text">{passwordErrors.confirmPassword}</span>}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closePasswordModal}>
                                Batal
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleChangePassword}
                                disabled={savingPassword}
                                style={{ background: '#f59e0b' }}
                            >
                                {savingPassword ? (
                                    <><Loader2 size={18} className="spin" /> Menyimpan...</>
                                ) : (
                                    <><Key size={18} /> Ubah Password</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UsersPage
