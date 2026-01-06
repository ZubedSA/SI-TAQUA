import { useEffect, useState } from 'react'
import {
    Users,
    UserPlus,
    Search,
    Edit,
    Trash2,
    Shield,
    CheckCircle,
    Filter,
    Download,
    RefreshCw,
    X,
    Eye,
    EyeOff,
    Save,
    Loader2,
    Key,
    Lock,
    User,
    CreditCard,
    Briefcase,
    Heart,
    ChevronDown
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { exportToExcel } from '../../utils/exportUtils'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import PageHeader from '../../components/layout/PageHeader'
import StatsCard from '../../components/ui/StatsCard'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FormInput from '../../components/ui/FormInput'

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

                // Link santri if wali role
                if (formData.roles.includes('wali')) {
                    console.log('🔗 Linking Santri for Wali:', editingUser.user_id, 'Selected:', selectedSantriIds)

                    // 1. Reset old links
                    const { error: resetError } = await supabase
                        .from('santri')
                        .update({ wali_id: null })
                        .eq('wali_id', editingUser.user_id)

                    if (resetError) console.error('❌ Error resetting santri links:', resetError)

                    // 2. Set new links
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

                    // 1. Reset old links
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

    // Stats Calculations
    const stats = {
        total: users.length,
        admin: users.filter(u => (u.roles || []).includes('admin')).length,
        guru: users.filter(u => (u.roles || []).includes('guru')).length,
        bendahara: users.filter(u => (u.roles || []).includes('bendahara')).length,
        pengurus: users.filter(u => (u.roles || []).includes('pengurus')).length,
        ota: users.filter(u => (u.roles || []).includes('ota')).length,
        wali: users.filter(u => (u.roles || []).includes('wali')).length,
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Manajemen User"
                description="Kelola akses dan role pengguna sistem"
                actions={
                    <Button onClick={() => setShowAddModal(true)} icon={UserPlus}>
                        Tambah User
                    </Button>
                }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <StatsCard title="Total" value={stats.total} icon={Users} color="primary" />
                <StatsCard title="Admin" value={stats.admin} icon={Shield} color="red" />
                <StatsCard title="Guru" value={stats.guru} icon={User} color="blue" />
                <StatsCard title="Bendahara" value={stats.bendahara} icon={CreditCard} color="green" />
                <StatsCard title="Pengurus" value={stats.pengurus} icon={Briefcase} color="orange" />
                <StatsCard title="OTA" value={stats.ota} icon={Heart} color="purple" />
                <StatsCard title="Wali" value={stats.wali} icon={Users} color="gray" />
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari user..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white appearance-none cursor-pointer"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="">Semua Role</option>
                                <option value="admin">Admin</option>
                                <option value="guru">Guru</option>
                                <option value="bendahara">Bendahara</option>
                                <option value="pengurus">Pengurus</option>
                                <option value="ota">OTA</option>
                                <option value="wali">Wali</option>
                                <option value="musyrif">Musyrif</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchUsers} icon={RefreshCw} title="Refresh Data" />
                        <Button variant="outline" size="sm" onClick={handleDownloadExcel} icon={Download} title="Export Excel" />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">User Details</th>
                                <th className="px-6 py-4 font-medium">Roles</th>
                                <th className="px-6 py-4 font-medium">Phone</th>
                                <th className="px-6 py-4 font-medium">Status/Waktu</th>
                                <th className="px-6 py-4 font-medium text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-500" />
                                        <p>Memuat data user...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Users className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">Tidak ada user ditemukan</h3>
                                        <p>Coba sesuaikan filter pencarian anda.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center text-primary-700 font-bold border border-primary-100 shadow-sm shrink-0">
                                                    {(user.nama || user.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{user.nama}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                    <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200">
                                                        {user.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(user.roles || [user.role]).map((role, idx) => (
                                                    <Badge key={idx} variant={
                                                        role === 'admin' ? 'danger' :
                                                            role === 'guru' ? 'info' :
                                                                role === 'bendahara' ? 'success' :
                                                                    role === 'musyrif' ? 'primary' :
                                                                        'neutral'
                                                    }>
                                                        {getRoleLabel(role)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                                            {user.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-gray-500">
                                                    Joined: {new Date(user.created_at).toLocaleDateString('id-ID')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => { setEditingUser(user); setShowAddModal(true); }}
                                                    title="Edit User"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-orange-600 hover:bg-orange-50"
                                                    onClick={() => { setPasswordResetUser(user); setResetPasswordOpen(true); }}
                                                    title="Reset Password"
                                                >
                                                    <Key size={16} />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                    onClick={() => openDeleteUser(user)}
                                                    title="Hapus User"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modals will be replaced with new Modal Components in next steps if needed, 
                for now keeping the logic but cleaning up styles if possible 
                OR Reuse existing plain divs but styled with Tailwind 
            */}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Personal Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Nama Lengkap"
                                    name="nama"
                                    value={formData.nama}
                                    onChange={handleInputChange}
                                    error={formErrors.nama}
                                    placeholder="Contoh: Ahmad Dahlan"
                                />
                                <FormInput
                                    label="Username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    error={formErrors.username}
                                    placeholder="username_login"
                                />
                                <FormInput
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    error={formErrors.email}
                                    placeholder="email@sekolah.id"
                                />
                                <FormInput
                                    label="No HP/WA"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="08123456789"
                                />
                            </div>

                            {/* Password Section (Only for new or explicit reset) */}
                            {!editingUser && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Lock size={14} /> Keamanan
                                    </h4>
                                    <div className="relative">
                                        <FormInput
                                            label="Password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            error={formErrors.password}
                                            placeholder="Minimal 6 karakter"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Hak Akses / Role (Bisa pilih lebih dari satu)</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { id: 'admin', label: 'Admin', color: 'red' },
                                        { id: 'guru', label: 'Guru', color: 'blue' },
                                        { id: 'bendahara', label: 'Bendahara', color: 'green' },
                                        { id: 'pengurus', label: 'Pengurus', color: 'orange' },
                                        { id: 'musyrif', label: 'Musyrif', color: 'teal' },
                                        { id: 'ota', label: 'OTA', color: 'purple' },
                                        { id: 'wali', label: 'Wali', color: 'gray' },
                                    ].map(role => (
                                        <div
                                            key={role.id}
                                            onClick={() => handleRoleToggle(role.id)}
                                            className={`
                                                cursor-pointer px-4 py-3 rounded-lg border flex items-center gap-3 transition-all
                                                ${formData.roles.includes(role.id)
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                                                }
                                            `}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.roles.includes(role.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white'}`}>
                                                {formData.roles.includes(role.id) && <CheckCircle size={12} className="text-white" />}
                                            </div>
                                            <span className="text-sm font-medium">{role.label}</span>
                                        </div>
                                    ))}
                                </div>
                                {formErrors.roles && <p className="mt-2 text-xs text-red-500">{formErrors.roles}</p>}
                            </div>

                            {/* Dynamic Role Extras */}
                            {formData.roles.includes('wali') && (
                                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in">
                                    <h4 className="text-sm font-semibold text-purple-900">Hubungkan Santri (Wali)</h4>
                                    <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-purple-200 p-2 space-y-1 custom-scrollbar">
                                        {loadingSantri ? (
                                            <div className="text-center py-4 text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /> Loading...</div>
                                        ) : santriList.length === 0 ? (
                                            <p className="text-center py-4 text-gray-500 text-sm">Tidak ada data santri.</p>
                                        ) : (
                                            santriList.map(santri => (
                                                <div
                                                    key={santri.id}
                                                    onClick={() => toggleSantriSelection(santri.id)}
                                                    className={`
                                                        flex items-center gap-3 p-2 rounded cursor-pointer transition-colors
                                                        ${selectedSantriIds.includes(santri.id) ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50 text-gray-700'}
                                                    `}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedSantriIds.includes(santri.id) ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'}`}>
                                                        {selectedSantriIds.includes(santri.id) && <CheckCircle size={12} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{santri.nama}</div>
                                                        <div className="text-xs text-gray-500">Kelas: {santri.kelas?.nama} | NIS: {santri.nis}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-purple-600 font-medium">
                                        {selectedSantriIds.length} Santri dipilih
                                    </p>
                                </div>
                            )}

                            {formData.roles.includes('musyrif') && (
                                <div className="space-y-3 p-4 bg-teal-50 rounded-lg border border-teal-100 animate-in fade-in">
                                    <h4 className="text-sm font-semibold text-teal-900">Hubungkan Halaqoh (Musyrif)</h4>
                                    <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-teal-200 p-2 space-y-1 custom-scrollbar">
                                        {loadingHalaqoh ? (
                                            <div className="text-center py-4 text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /> Loading...</div>
                                        ) : halaqohList.length === 0 ? (
                                            <p className="text-center py-4 text-gray-500 text-sm">Tidak ada data halaqoh.</p>
                                        ) : (
                                            halaqohList.map(halaqoh => (
                                                <div
                                                    key={halaqoh.id}
                                                    onClick={() => toggleHalaqohSelection(halaqoh.id)}
                                                    className={`
                                                        flex items-center gap-3 p-2 rounded cursor-pointer transition-colors
                                                        ${selectedHalaqohIds.includes(halaqoh.id) ? 'bg-teal-100 text-teal-700' : 'hover:bg-gray-50 text-gray-700'}
                                                    `}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedHalaqohIds.includes(halaqoh.id) ? 'bg-teal-600 border-teal-600' : 'border-gray-300 bg-white'}`}>
                                                        {selectedHalaqohIds.includes(halaqoh.id) && <CheckCircle size={12} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{halaqoh.nama}</div>
                                                        <div className="text-xs text-gray-500">Guru: {halaqoh.guru?.nama || '-'}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {formErrors.halaqoh && <p className="text-xs text-red-500">{formErrors.halaqoh}</p>}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                            <Button variant="secondary" onClick={closeModal} disabled={saving}>Batal</Button>
                            <Button onClick={handleSaveUserClick} loading={saving}>Simpan User</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                            <button onClick={() => setResetPasswordOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-100">
                                Password baru akan langsung aktif. User harus login dengan password ini.
                            </div>
                            <FormInput
                                label="Password Baru"
                                type="text"
                                value={newPasswordReset}
                                onChange={(e) => setNewPasswordReset(e.target.value)}
                                placeholder="Masukkan password baru..."
                                className="font-mono"
                            />
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                            <Button variant="secondary" onClick={() => setResetPasswordOpen(false)}>Batal</Button>
                            <Button onClick={handleResetPasswordClick} loading={saving}>Reset Password</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={actionModal.isOpen && actionModal.type === 'save_user'}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                onConfirm={executeSaveUser}
                title="Konfirmasi Simpan"
                message={`Apakah anda yakin ingin menyimpan data user ${formData.nama}?`}
                confirmText={saving ? 'Menyimpan...' : 'Ya, Simpan'}
                cancelText="Batal"
                type="info"
            />

            <ConfirmationModal
                isOpen={actionModal.isOpen && actionModal.type === 'reset_password'}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                onConfirm={executeResetPassword}
                title="Konfirmasi Reset Password"
                message={`Yakin reset password untuk user ${passwordResetUser?.nama}?`}
                confirmText={saving ? 'Memproses...' : 'Ya, Reset'}
                cancelText="Batal"
                type="warning"
            />

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteUser}
                itemName={userToDelete?.nama}
            />

        </div>
    )
}

export default UsersPage
