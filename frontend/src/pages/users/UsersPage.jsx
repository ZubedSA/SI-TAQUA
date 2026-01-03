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
    Key,
    Lock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import './UsersPage.css'

/**
 * Users Management Page - Admin Only
 * Manage all system users, their roles and status
 */
const UsersPage = () => {
    const showToast = useToast()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
    const [passwordResetUser, setPasswordResetUser] = useState(null)
    const [newPasswordReset, setNewPasswordReset] = useState('')
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

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

    // Halaqoh data for musyrif role
    const [halaqohList, setHalaqohList] = useState([])
    const [selectedHalaqohIds, setSelectedHalaqohIds] = useState([])
    const [loadingHalaqoh, setLoadingHalaqoh] = useState(false)

    useEffect(() => {
        fetchUsers()
        fetchSantri()
        fetchHalaqoh()
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

    // Fetch all halaqoh for musyrif selection
    const fetchHalaqoh = async () => {
        setLoadingHalaqoh(true)
        try {
            const { data, error } = await supabase
                .from('halaqoh')
                .select('id, nama, guru:guru!musyrif_id(nama)')
                .order('nama', { ascending: true })

            if (error) throw error
            setHalaqohList(data || [])
        } catch (error) {
            console.error('Error fetching halaqoh:', error.message)
        } finally {
            setLoadingHalaqoh(false)
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
            setSelectedHalaqohIds([]) // Reset halaqoh selection
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

            // Fetch linked halaqoh if editing musyrif user
            if (userRoles.includes('musyrif') && editingUser.user_id) {
                fetchLinkedHalaqoh(editingUser.user_id)
            } else {
                setSelectedHalaqohIds([])
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

    // Fetch halaqoh linked to a musyrif user
    const fetchLinkedHalaqoh = async (musyrifUserId) => {
        try {
            const { data, error } = await supabase
                .from('musyrif_halaqoh')
                .select('halaqoh_id')
                .eq('user_id', musyrifUserId)

            if (error) throw error
            setSelectedHalaqohIds(data?.map(h => h.halaqoh_id) || [])
        } catch (error) {
            console.error('Error fetching linked halaqoh:', error.message)
            setSelectedHalaqohIds([])
        }
    }

    const [fetchError, setFetchError] = useState(null)

    const fetchUsers = async () => {
        setLoading(true)
        setFetchError(null)
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
            setFetchError(error.message)
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
            pengasuh: 'badge-teal',
            pengurus: 'badge-orange',
            ota: 'badge-orange',
            wali: 'badge-purple',
            musyrif: 'badge-emerald'
        }
        return colors[role] || 'badge-gray'
    }

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Admin',
            guru: 'Guru',
            bendahara: 'Bendahara',
            pengasuh: 'Pengasuh',
            pengasuh: 'Pengasuh',
            pengurus: 'Pengurus',
            ota: 'Orang Tua Asuh',
            wali: 'Wali',
            musyrif: 'Musyrif'
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

        // Musyrif must have at least one halaqoh selected
        if (formData.roles.includes('musyrif') && selectedHalaqohIds.length === 0) {
            errors.halaqoh = 'Musyrif harus memiliki minimal 1 halaqoh'
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

    const handleResetPasswordClick = () => {
        if (!newPasswordReset || newPasswordReset.length < 6) {
            showToast?.error('Password minimal 6 karakter')
            return
        }
        setActionModal({ isOpen: true, type: 'reset_password' })
    }

    const executeResetPassword = async () => {
        try {
            setSaving(true)
            const { data, error } = await supabase.rpc('admin_reset_password', {
                target_user_id: passwordResetUser.user_id,
                new_password: newPasswordReset
            })

            if (error) throw error
            if (!data.success) throw new Error(data.message)

            if (showToast?.success) showToast.success('Password berhasil direset!')
            setResetPasswordOpen(false)
            setNewPasswordReset('')
            setPasswordResetUser(null)
            setActionModal({ ...actionModal, isOpen: false })
        } catch (err) {
            console.error('Reset Password Error:', err)
            if (showToast?.error) showToast.error('Gagal reset password: ' + err.message)
            else alert('Gagal: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // Confirmation Modal States
    const [actionModal, setActionModal] = useState({
        isOpen: false,
        type: null, // 'save_user', 'reset_password'
    })

    const handleSaveUserClick = () => {
        const isValid = validateForm()
        if (!isValid) return
        setActionModal({ isOpen: true, type: 'save_user' })
    }

    const executeSaveUser = async () => {
        console.log('🚀 executeSaveUser V2 - START', new Date().toISOString())
        setSaving(true)

        // Determine primary role for legacy compatibility
        const rolePriority = ['admin', 'bendahara', 'guru', 'pengurus', 'pengasuh', 'wali']
        const primaryRole = rolePriority.find(r => formData.roles.includes(r)) || formData.roles[0]
        console.log('👤 Determined Primary Role:', primaryRole)

        try {
            if (editingUser) {
                console.log('✏️ MODE: EDIT USER', editingUser.user_id)
                // ============ EDIT USER (VIA RPC) ============
                // Menggunakan RPC agar Email & Auth Data ikut terupdate (Sync)

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

                console.log('📡 Calling RPC admin_update_user_email:', updatePayload)
                const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_user_email', updatePayload)

                if (rpcError) throw new Error('RPC Error: ' + rpcError.message)
                if (!rpcData?.success) throw new Error('Update Failed: ' + (rpcData?.message || 'Unknown RPC error'))

                // RPC sudah mengupdate Profile + Auth. Jadi tidak perlu update manual lagi.

                /* KODE LAMA (BACKUP) - UPDATE LANGSUNG TABEL
                const updateRes = await supabase
                    .from('user_profiles')
                    .update(...)
                */

                // Link santri if wali role
                if (formData.roles.includes('wali')) {
                    console.log('🔗 Linking Santri for Wali:', editingUser.user_id, 'Selected:', selectedSantriIds)

                    // 1. Reset old links (Wajib dilakukan agar uncheck santri tersimpan)
                    const { error: resetError } = await supabase
                        .from('santri')
                        .update({ wali_id: null })
                        .eq('wali_id', editingUser.user_id)

                    if (resetError) console.error('❌ Error resetting santri links:', resetError)

                    // 2. Set new links (Only if selected)
                    if (selectedSantriIds.length > 0) {
                        const { error: linkError } = await supabase
                            .from('santri')
                            .update({ wali_id: editingUser.user_id })
                            .in('id', selectedSantriIds)

                        if (linkError) console.error('❌ Error linking santri:', linkError)
                    }
                }

                // Link halaqoh if musyrif role
                if (formData.roles.includes('musyrif')) {
                    console.log('🔗 Linking Halaqoh for Musyrif:', editingUser.user_id, 'Selected:', selectedHalaqohIds)

                    // 1. Reset old links (Hapus semua halaqoh lama)
                    const { error: resetHalaqohError } = await supabase
                        .from('musyrif_halaqoh')
                        .delete()
                        .eq('user_id', editingUser.user_id)

                    if (resetHalaqohError) console.error('❌ Error resetting halaqoh links:', resetHalaqohError)

                    // 2. Insert new links
                    if (selectedHalaqohIds.length > 0) {
                        const halaqohLinks = selectedHalaqohIds.map(hid => ({
                            user_id: editingUser.user_id,
                            halaqoh_id: hid
                        }))
                        const { error: linkHalaqohError } = await supabase
                            .from('musyrif_halaqoh')
                            .insert(halaqohLinks)

                        if (linkHalaqohError) console.error('❌ Error linking halaqoh:', linkHalaqohError)
                    }
                }

                // Update local state
                setUsers(prev => prev.map(u => u.user_id === editingUser.user_id ? { ...u, nama: formData.nama, username: formData.username, roles: formData.roles, role: primaryRole, active_role: resolvedActiveRole, phone: formData.phone || null } : u))

                if (showToast?.success) {
                    showToast.success('User berhasil diperbarui')
                }
                fetchUsers()
                closeModal()

            } else {
                // ============ CREATE USER ============
                const signUpRes = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: { data: { nama: formData.nama, role: primaryRole } }
                })

                if (signUpRes.error) {
                    throw new Error('Signup failed: ' + signUpRes.error.message)
                }

                if (!signUpRes.data || !signUpRes.data.user) {
                    throw new Error('User creation failed - no user returned')
                }

                const newUser = signUpRes.data.user

                // Insert profile
                const insertRes = await supabase.from('user_profiles').insert({
                    user_id: newUser.id,
                    email: formData.email,
                    nama: formData.nama,
                    username: formData.username,
                    roles: formData.roles,
                    role: primaryRole,
                    active_role: primaryRole,
                    phone: formData.phone || null
                })

                if (insertRes.error) {
                    throw new Error('Profile creation failed: ' + insertRes.error.message)
                }

                // Link santri if wali role
                if (formData.roles.includes('wali') && selectedSantriIds.length > 0) {
                    await supabase.from('santri').update({ wali_id: newUser.id }).in('id', selectedSantriIds)
                }

                // Link halaqoh if musyrif role
                if (formData.roles.includes('musyrif') && selectedHalaqohIds.length > 0) {
                    const halaqohLinks = selectedHalaqohIds.map(hid => ({
                        user_id: newUser.id,
                        halaqoh_id: hid
                    }))
                    await supabase.from('musyrif_halaqoh').insert(halaqohLinks)
                }

                if (showToast?.success) {
                    showToast.success('User berhasil ditambahkan!')
                }
                fetchUsers()
                closeModal()
            }
        } catch (err) {
            console.error('Save error:', err)
            if (showToast?.error) {
                showToast?.error('Gagal menyimpan: ' + (err.message || 'Unknown error'))
            } else {
                alert('Gagal menyimpan: ' + (err.message || 'Unknown error'))
            }
        } finally {
            setSaving(false)
        }
    }

    // Helper to insert profile and link wali
    const finalizeUserCreation = async (user, primaryRole) => {
        const insertRes = await supabase
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

        if (insertRes && insertRes.error) {
            throw new Error('Gagal membuat profil: ' + (insertRes.error.message || 'Unknown'))
        }

        if (formData.roles.includes('wali') && selectedSantriIds.length > 0) {
            await linkSantriToWali(user.id, selectedSantriIds)
        }
    }

    // Link santri to wali user
    const linkSantriToWali = async (waliUserId, santriIds) => {
        try {
            // First, remove this wali from all santri (reset)
            const resetRes = await supabase
                .from('santri')
                .update({ wali_id: null })
                .eq('wali_id', waliUserId)

            if (resetRes.error) {
                console.warn('Warning resetting wali:', resetRes.error)
            }

            // Then, set wali_id for selected santri
            if (santriIds && santriIds.length > 0) {
                const linkRes = await supabase
                    .from('santri')
                    .update({ wali_id: waliUserId })
                    .in('id', santriIds)

                if (linkRes.error) {
                    throw new Error('Gagal link santri: ' + (linkRes.error.message || 'Unknown'))
                }
            }
            console.log('✅ Santri linked to wali successfully')
        } catch (err) {
            console.error('Error linking santri to wali:', err)
            throw new Error('Gagal menghubungkan santri: ' + (err?.message || 'Unknown error'))
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

    // Toggle halaqoh selection for musyrif
    const toggleHalaqohSelection = (halaqohId) => {
        setSelectedHalaqohIds(prev =>
            prev.includes(halaqohId)
                ? prev.filter(id => id !== halaqohId)
                : [...prev, halaqohId]
        )
        // Clear halaqoh error when selecting
        if (formErrors.halaqoh) {
            setFormErrors(prev => ({ ...prev, halaqoh: null }))
        }
    }

    const openDeleteUser = (user) => {
        setUserToDelete(user)
        setDeleteModalOpen(true)
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return
        const userId = userToDelete.user_id

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
            showToast?.success('User berhasil dihapus sepenuhnya.')
            setDeleteModalOpen(false)
            setUserToDelete(null)
        } catch (error) {
            console.error('Delete error:', error)

            // Fallback: Try normal delete if RPC missing/fails (for robustness)
            if (error.message.includes('function delete_user_completely') || error.message.includes('does not exist')) {
                const { error: fallbackError } = await supabase
                    .from('user_profiles')
                    .delete()
                    .eq('user_id', userId)

                if (fallbackError) {
                    showToast?.error('Gagal menghapus user: ' + fallbackError.message)
                } else {
                    setUsers(users.filter(u => u.user_id !== userId))
                    showToast?.success('User profile dihapus (Auth login mungkin masih ada).')
                    setDeleteModalOpen(false)
                    setUserToDelete(null)
                }
            } else {
                showToast?.error('Gagal menghapus user: ' + error.message)
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

    // Legacy Password Functions Removed

    const handleDownloadExcel = () => {
        const columns = ['Nama', 'Email', 'Username', 'Roles', 'Phone', 'Created At']
        const exportData = filteredUsers.map(u => ({
            Nama: u.nama,
            Email: u.email,
            Username: u.username,
            Roles: (u.roles || [u.role]).join(', '),
            Phone: u.phone || '-',
            'Created At': new Date(u.created_at).toLocaleDateString('id-ID')
        }))
        exportToExcel(exportData, columns, 'users_data')
    }

    const handleDownloadCSV = () => {
        const columns = ['Nama', 'Email', 'Username', 'Roles', 'Phone', 'Created At']
        const exportData = filteredUsers.map(u => ({
            Nama: u.nama,
            Email: u.email,
            Username: u.username,
            Roles: (u.roles || [u.role]).join(', '),
            Phone: u.phone || '-',
            'Created At': new Date(u.created_at).toLocaleDateString('id-ID')
        }))
        exportToCSV(exportData, columns, 'users_data')
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
                        <option value="pengurus">Pengurus</option>
                        <option value="ota">Orang Tua Asuh</option>
                        <option value="wali">Wali Santri</option>
                    </select>
                </div>
                <button className="btn-icon" onClick={fetchUsers} title="Refresh">
                    <RefreshCw size={18} />
                </button>
                <DownloadButton
                    onDownloadExcel={handleDownloadExcel}
                    onDownloadCSV={handleDownloadCSV}
                />
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
                    <span className="stat-number">{users.filter(u => (u.roles || []).includes('pengurus')).length}</span>
                    <span className="stat-label">Pengurus</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-number">{users.filter(u => (u.roles || []).includes('ota')).length}</span>
                    <span className="stat-label">OTA</span>
                </div>
                <div className="stat-chip">
                    <span className="stat-number">{users.filter(u => (u.roles || []).includes('wali')).length}</span>
                    <span className="stat-label">Wali</span>
                </div>
            </div>

            {/* Users Table */}
            <div className="users-table-container">
                {/* Error State */}
                {fetchError && (
                    <div className="alert alert-error mb-4">
                        <span>Gagal memuat data: {fetchError}</span>
                        <button className="btn-xs btn-secondary ml-2" onClick={fetchUsers}>Coba Lagi</button>
                    </div>
                )}

                {/* Loading State or Table */}
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
                                        <MobileActionMenu
                                            actions={[
                                                {
                                                    icon: <Edit size={16} />,
                                                    label: 'Edit',
                                                    onClick: () => setEditingUser(user)
                                                },
                                                {
                                                    icon: <Lock size={16} />,
                                                    label: 'Reset Password',
                                                    onClick: () => {
                                                        setPasswordResetUser(user)
                                                        setResetPasswordOpen(true)
                                                    }
                                                },
                                                {
                                                    icon: <Trash2 size={16} />,
                                                    label: 'Hapus',
                                                    danger: true,
                                                    onClick: () => openDeleteUser(user)
                                                }
                                            ]}
                                        >
                                            {/* Desktop buttons */}
                                            <button
                                                className="btn-action edit"
                                                title="Edit"
                                                onClick={() => setEditingUser(user)}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn-action warning"
                                                title="Reset Password"
                                                onClick={() => {
                                                    setPasswordResetUser(user)
                                                    setResetPasswordOpen(true)
                                                }}
                                            >
                                                <Lock size={16} />
                                            </button>
                                            <button
                                                className="btn-action delete"
                                                title="Hapus"
                                                onClick={() => openDeleteUser(user)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </MobileActionMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Reset Password */}
            {resetPasswordOpen && (
                <div className="modal-overlay">
                    <div className="modal-content small-modal">
                        <div className="modal-header">
                            <h2>Reset Password</h2>
                            <button className="close-btn" onClick={() => setResetPasswordOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Reset password untuk user <strong>{passwordResetUser?.nama}</strong>?</p>
                            <div className="form-group">
                                <label>Password Baru</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newPasswordReset}
                                    onChange={(e) => setNewPasswordReset(e.target.value)}
                                    placeholder="Masukkan password baru"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setResetPasswordOpen(false)}>Batal</button>
                            <button className="btn-primary btn-warning" onClick={handleResetPasswordClick} disabled={saving}>
                                {saving ? 'Memproses...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    {['admin', 'guru', 'bendahara', 'pengurus', 'pengasuh', 'wali', 'ota', 'musyrif'].map(role => (
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

                            {/* Halaqoh Selection for Musyrif role */}
                            {formData.roles.includes('musyrif') && (
                                <div className="form-group santri-selection">
                                    <label>Pilih Halaqoh (Akses Musyrif) *</label>
                                    <div className="santri-list">
                                        {loadingHalaqoh ? (
                                            <p className="loading-text">Memuat data halaqoh...</p>
                                        ) : halaqohList.length === 0 ? (
                                            <p className="empty-text">Tidak ada data halaqoh</p>
                                        ) : (
                                            halaqohList.map(halaqoh => (
                                                <label key={halaqoh.id} className="santri-checkbox-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHalaqohIds.includes(halaqoh.id)}
                                                        onChange={() => toggleHalaqohSelection(halaqoh.id)}
                                                    />
                                                    <div className="santri-checkbox-info">
                                                        <span className="santri-nama">{halaqoh.nama}</span>
                                                        <span className="santri-detail">
                                                            {halaqoh.guru?.nama ? `Pengajar: ${halaqoh.guru.nama}` : 'Belum ada pengajar'}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    {selectedHalaqohIds.length > 0 && (
                                        <p className="selection-info">
                                            {selectedHalaqohIds.length} halaqoh dipilih
                                        </p>
                                    )}
                                    {formErrors.halaqoh && <span className="error-text">{formErrors.halaqoh}</span>}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>
                                Batal
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSaveUserClick}
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

            {/* Legacy Password Modal Removed */}

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteUser}
                itemName={userToDelete?.nama}
                message={`Yakin ingin menghapus user ${userToDelete?.nama}? Action ini akan menghapus login user juga dan tidak dapat dibatalkan.`}
            />

            <ConfirmationModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                onConfirm={actionModal.type === 'save_user' ? executeSaveUser : executeResetPassword}
                title={actionModal.type === 'save_user' ? (editingUser ? "Konfirmasi Edit User" : "Konfirmasi User Baru") : "Konfirmasi Reset Password"}
                message={actionModal.type === 'save_user'
                    ? (editingUser ? 'Apakah Anda yakin ingin menyimpan perubahan data user ini?' : 'Apakah Anda yakin ingin membuat user baru ini?')
                    : `Apakah Anda yakin ingin mereset password untuk user ${passwordResetUser?.nama}?`}
                confirmLabel={actionModal.type === 'save_user' ? (editingUser ? "Simpan Perubahan" : "Buat User") : "Reset Password"}
                variant={actionModal.type === 'save_user' ? "success" : "warning"}
                isLoading={saving}
            />
        </div>
    )
}

export default UsersPage
