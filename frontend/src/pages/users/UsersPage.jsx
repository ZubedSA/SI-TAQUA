import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
    Unlock,
    User,
    CreditCard,
    Briefcase,
    Heart,
    ChevronDown,
    AlertTriangle
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
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import MobileActionMenu from '../../components/ui/MobileActionMenu'

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
    const [statusToggleOpen, setStatusToggleOpen] = useState(false)
    const [statusToggleUser, setStatusToggleUser] = useState(null)
    const [saving, setSaving] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        nama: '',
        email: '',
        username: '',
        password: '',
        roles: ['guru'], // Changed to array
        phone: '',
        guru_id: '' // Linked Guru ID
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
        fetchGuruList()
    }, [])

    const [guruList, setGuruList] = useState([])
    const [loadingGuru, setLoadingGuru] = useState(false)

    // Fetch all guru for selection
    const fetchGuruList = async () => {
        setLoadingGuru(true)
        try {
            const { data, error } = await supabase
                .from('guru')
                .select('id, nama, email, nip')
                .order('nama', { ascending: true })

            if (error) throw error
            setGuruList(data || [])
        } catch (error) {
            console.error('Error fetching guru list:', error.message)
        } finally {
            setLoadingGuru(false)
        }
    }

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
            const [halaqohRes, assignRes, profileRes] = await Promise.all([
                supabase.from('halaqoh').select('id, nama, guru:guru!musyrif_id(nama)').order('nama', { ascending: true }),
                supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id'),
                supabase.from('user_profiles').select('user_id, nama')
            ])

            if (halaqohRes.error) throw halaqohRes.error

            const assignments = assignRes.data || []
            const profiles = profileRes.data || []

            const enrichedList = (halaqohRes.data || []).map(h => {
                const assigns = assignments.filter(a => a.halaqoh_id === h.id)
                const musyrifNames = assigns.map(a => {
                    const prof = profiles.find(p => p.user_id === a.user_id)
                    return prof ? prof.nama : null
                }).filter(Boolean)

                return {
                    ...h,
                    display_guru: musyrifNames.length > 0 ? musyrifNames.join(', ') : (h.guru?.nama || '-')
                }
            })

            setHalaqohList(enrichedList)
        } catch (error) {
            console.error('Error fetching halaqoh:', error.message)
        } finally {
            setLoadingHalaqoh(false)
        }
    }

    // Reset form when modal opens/closes
    useEffect(() => {
        if (showAddModal || resetPasswordOpen) {
            document.body.classList.add('modal-open')
        } else {
            document.body.classList.remove('modal-open')
        }

        if (showAddModal) {
            setFormData({
                nama: '',
                email: '',
                username: '',
                password: '',
                roles: ['guru'],
                phone: '',
                guru_id: ''
            })
            setFormErrors({})
            setShowPassword(false)
            setSelectedSantriIds([]) // Reset santri selection
            setSelectedHalaqohIds([]) // Reset halaqoh selection
        }

        return () => {
            document.body.classList.remove('modal-open')
        }
    }, [showAddModal, resetPasswordOpen])

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
                phone: editingUser.phone || '',
                guru_id: '' // Will be populated if linked
            })

            // Find linked guru by email (current strategy)
            if (userRoles.includes('guru') || userRoles.includes('musyrif')) {
                const linkedGuru = guruList.find(g => g.email === editingUser.email)
                if (linkedGuru) {
                    setFormData(prev => ({ ...prev, guru_id: linkedGuru.id }))
                }
            }
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

            // DEBUG: Log what we get from database
            console.log('🔍 fetchUsers result:', { dataCount: data?.length, data })

            // Normalize roles data for users who might not have it yet
            // Ensure we handle various data shapes from legacy/migrated stats
            const normalizedUsers = (data || []).map(u => {
                let safeRoles = u.roles || [];
                if (!Array.isArray(safeRoles)) {
                    // Handle if it comes as string or null
                    safeRoles = u.role ? [u.role] : ['guest'];
                }
                if (safeRoles.length === 0 && u.role) {
                    safeRoles = [u.role];
                }

                return {
                    ...u,
                    roles: safeRoles.length > 0 ? safeRoles : ['guest'],
                    // Ensure active_role is set
                    active_role: u.active_role || (safeRoles.length > 0 ? safeRoles[0] : 'guest')
                };
            })

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
            admin_akademik: 'badge-indigo',
            admin_absensi: 'badge-emerald',
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
            admin_akademik: 'Admin Akademik',
            admin_absensi: 'Admin Absensi',
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

    const handleResetPasswordClick = (e) => {
        if (e) e.preventDefault()
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
        } catch (err) {
            console.error('Reset Password Error:', err)
            if (showToast?.error) showToast.error('Gagal reset password: ' + err.message)
            else alert('Gagal: ' + err.message)
        } finally {
            setSaving(false)
            setActionModal(prev => ({ ...prev, isOpen: false, type: null }))
        }
    }

    // Confirmation Modal States
    const [actionModal, setActionModal] = useState({
        isOpen: false,
        type: null, // 'save_user', 'reset_password'
    })

    const handleSaveUserClick = (e) => {
        if (e) e.preventDefault()
        const isValid = validateForm()
        if (!isValid) return
        setActionModal({ isOpen: true, type: 'save_user' })
    }

    const executeToggleStatus = async () => {
        if (!statusToggleUser) return;
        setSaving(true);
        const newStatus = statusToggleUser.is_active === false ? true : false;
        
        try {
            const { data, error } = await supabase.rpc('admin_toggle_user_status', {
                target_user_id: statusToggleUser.user_id,
                new_status: newStatus
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message);

            if (showToast?.success) showToast.success(data.message);
            
            // Update local state directly to avoid refetching
            setUsers(prev => prev.map(u => 
                u.user_id === statusToggleUser.user_id 
                    ? { ...u, is_active: newStatus } 
                    : u
            ));
        } catch (err) {
            console.error('Toggle Status Error:', err);
            if (showToast?.error) showToast.error(err.message || 'Gagal mengubah status akun');
        } finally {
            setSaving(false);
            setStatusToggleOpen(false);
            setStatusToggleUser(null);
        }
    }

    const executeSaveUser = async () => {
        console.log('🚀 executeSaveUser V3 - RPC MODE', new Date().toISOString())
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
                    await handleWaliLinking(editingUser.user_id, selectedSantriIds)
                }

                // Link halaqoh if musyrif role
                if (formData.roles.includes('musyrif')) {
                    await handleHalaqohLinking(editingUser.user_id, selectedHalaqohIds)
                }

                // Update local state
                setUsers(prev => prev.map(u => u.user_id === editingUser.user_id ? { ...u, nama: formData.nama, username: formData.username, roles: formData.roles, role: primaryRole, active_role: resolvedActiveRole, phone: formData.phone || null } : u))

                // SYNC TO GURU TABLE
                await syncUserToGuru(formData.email, formData, formData.roles, formData.guru_id)

                if (showToast?.success) {
                    showToast.success('User berhasil diperbarui')
                }
                fetchUsers()
                closeModal()

            } else {
                // ============ CREATE USER (VIA RPC) ============
                // Using RPC to bypass Client-side Rate Limits
                console.log('✨ MODE: CREATE USER (RPC)')

                // Persiapkan data untuk RPC yang AMAN (p_ prefix)
                const createPayload = {
                    p_email: formData.email,
                    p_password: formData.password,
                    p_nama: formData.nama,
                    p_role: primaryRole,
                    p_roles: formData.roles,
                    p_phone: formData.phone || null,
                    p_username: formData.username
                }

                console.log('📡 Calling SAFE RPC admin_create_user_safe:', { ...createPayload, p_password: '***' })

                // Panggil RPC Baru
                const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user_safe', createPayload)

                if (rpcError) {
                    console.error('RPC Error:', rpcError)
                    throw new Error('Gagal membuat user: ' + rpcError.message)
                }

                if (!rpcData?.success) {
                    throw new Error('Gagal: ' + (rpcData?.message || 'Unknown server error'))
                }

                const newUserId = rpcData.data.user_id
                console.log('✅ User created via SAFE RPC, ID:', newUserId)

                // Profile is now created automatically by database trigger (on_auth_user_created)
                // No need for manual insertion here

                // Link santri if wali role
                if (formData.roles.includes('wali') && selectedSantriIds.length > 0) {
                    await handleWaliLinking(newUserId, selectedSantriIds)
                }

                // Link halaqoh if musyrif role
                if (formData.roles.includes('musyrif') && selectedHalaqohIds.length > 0) {
                    await handleHalaqohLinking(newUserId, selectedHalaqohIds)
                }

                // SYNC TO GURU TABLE
                await syncUserToGuru(formData.email, formData, formData.roles, formData.guru_id)

                if (showToast?.success) {
                    showToast.success('User berhasil ditambahkan!')
                }
                fetchUsers()
                closeModal()
                setActionModal({ isOpen: false, type: null })
            }
        } catch (err) {
            console.error('Save error:', err)
            if (showToast?.error) {
                showToast?.error(err.message || 'Gagal menyimpan user')
            } else {
                alert('Gagal menyimpan: ' + (err.message || 'Unknown error'))
            }
        } finally {
            setSaving(false)
            setActionModal(prev => ({ ...prev, isOpen: false, type: null }))
        }
    }

    // Helper for linking Wali
    const handleWaliLinking = async (userId, santriIds) => {
        console.log('🔗 Linking Santri for Wali:', userId, 'Selected:', santriIds)

        // 1. Reset old links
        const { error: resetError } = await supabase
            .from('santri')
            .update({ wali_id: null })
            .eq('wali_id', userId)

        if (resetError) console.error('❌ Error resetting santri links:', resetError)

        // 2. Set new links
        if (santriIds.length > 0) {
            const { error: linkError } = await supabase
                .from('santri')
                .update({ wali_id: userId })
                .in('id', santriIds)

            if (linkError) console.error('❌ Error linking santri:', linkError)
        }
    }

    // Helper for linking Halaqoh
    const handleHalaqohLinking = async (userId, halaqohIds) => {
        console.log('🔗 Linking Halaqoh for Musyrif:', userId, 'Selected:', halaqohIds)

        // 1. Reset old links
        const { error: resetHalaqohError } = await supabase
            .from('musyrif_halaqoh')
            .delete()
            .eq('user_id', userId)

        if (resetHalaqohError) console.error('❌ Error resetting halaqoh links:', resetHalaqohError)

        // 2. Insert new links
        if (halaqohIds.length > 0) {
            const halaqohLinks = halaqohIds.map(hid => ({
                user_id: userId,
                halaqoh_id: hid
            }))
            const { error: linkHalaqohError } = await supabase
                .from('musyrif_halaqoh')
                .insert(halaqohLinks)

            if (linkHalaqohError) console.error('❌ Error linking halaqoh:', linkHalaqohError)
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

    /**
     * SYNC USER TO GURU TABLE
     * Ensures that users with role 'guru' or 'musyrif' have a record in 'guru' table.
     */
    const syncUserToGuru = async (email, userData, roles, selectedGuruId = null) => {
        if (!roles.includes('guru') && !roles.includes('musyrif')) return

        console.log('🔄 Syncing User to Guru table...', { email, selectedGuruId })
        try {
            const jabatan = roles.includes('musyrif') ? 'Musyrif' : (roles.includes('guru') ? 'Pengajar' : 'Staff')
            const payload = {
                nama: userData.nama,
                email: email,
                no_telp: userData.phone || null,
                jabatan: jabatan,
                status: 'Aktif'
            }

            if (selectedGuruId) {
                // EXPLICIT SYNC: Update the selected guru record
                console.log('🔗 Explicitly linking to guru ID:', selectedGuruId)
                await supabase.from('guru').update(payload).eq('id', selectedGuruId)
            } else {
                // IMPLICIT SYNC: By Email
                const { data: existingGuru } = await supabase
                    .from('guru')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle()

                if (existingGuru) {
                    console.log('📝 Updating guru by email:', email)
                    await supabase.from('guru').update(payload).eq('id', existingGuru.id)
                } else {
                    console.log('✨ Creating new guru record for:', email)
                    await supabase.from('guru').insert([{
                        ...payload,
                        nip: `AUTO-${Math.floor(Math.random() * 10000)}`
                    }])
                }
            }
            
            // Refresh guru list after sync
            fetchGuruList()
        } catch (err) {
            console.error('❌ Sync User to Guru failed:', err.message)
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

    const handleOpenAddModal = () => {
        setEditingUser(null)
        setShowAddModal(true)
    }

    const handleOpenEditModal = (user) => {
        setEditingUser(user)
        setShowAddModal(true)
    }

    const handleOpenResetModal = (user) => {
        setPasswordResetUser(user)
        setResetPasswordOpen(true)
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
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenAddModal(); }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98] bg-primary-600 text-white hover:bg-primary-700 shadow-sm focus:ring-primary-500 px-4 py-2 text-sm cursor-pointer"
                    >
                        <UserPlus size={18} />
                        <span>Tambah User</span>
                    </button>
                }
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Total Pengguna" value={users.length} icon={Users} color="blue" />
                <StatsCard title="Administrator" value={users.filter(u => u.roles.includes('admin')).length} icon={Shield} color="red" />
                <StatsCard title="Guru & Pengajar" value={users.filter(u => u.roles.includes('guru') || u.roles.includes('musyrif')).length} icon={Briefcase} color="emerald" />
                <StatsCard title="Wali Santri" value={users.filter(u => u.roles.includes('wali')).length} icon={Heart} color="purple" />
            </div>

            {/* Main Table Section */}
            <Card variant="premium" className="overflow-hidden border-none shadow-2xl">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1 max-w-2xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Cari nama, email, atau username..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative group">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                            <select
                                className="pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all appearance-none font-medium text-sm min-w-[160px]"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="">Semua Role</option>
                                <option value="admin">Admin</option>
                                <option value="admin_akademik">Admin Akademik</option>
                                <option value="guru">Guru</option>
                                <option value="bendahara">Bendahara</option>
                                <option value="pengasuh">Pengasuh</option>
                                <option value="ota">OTA</option>
                                <option value="wali">Wali</option>
                                <option value="musyrif">Musyrif</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center">
                            <RefreshCw className="animate-spin mx-auto text-indigo-600 mb-4" size={48} />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sinkronisasi Data User...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-gray-300" size={32} />
                            </div>
                            <p className="text-lg font-bold text-gray-900">Tidak ada pengguna ditemukan</p>
                            <p className="text-sm text-gray-500">Coba kata kunci pencarian atau filter yang berbeda.</p>
                        </div>
                    ) : (
                    <ResponsiveTable
                        columns={[
                            { 
                                header: 'Pengguna', 
                                render: (row) => (
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                                            {row.nama?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 text-base">{row.nama}</div>
                                            <div className="text-xs font-medium text-gray-400">@{row.username}</div>
                                        </div>
                                    </div>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Roles & Akses', 
                                render: (row) => (
                                    <div className="flex flex-wrap gap-1.5">
                                        {row.roles.map((role) => (
                                            <Badge 
                                                key={role} 
                                                variant="neutral"
                                                className={`${getRoleBadgeColor(role)} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border-none shadow-sm`}
                                            >
                                                {getRoleLabel(role)}
                                            </Badge>
                                        ))}
                                    </div>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Kontak & Status', 
                                render: (row) => (
                                    <>
                                        <div className="text-sm font-bold text-gray-700">{row.email}</div>
                                        <div className="text-xs font-medium text-gray-400 mb-1">{row.phone || '-'}</div>
                                        <Badge 
                                            variant="neutral"
                                            className={`${row.is_active !== false ? 'badge-emerald' : 'badge-red'} px-2 py-0.5 rounded-md text-[10px] font-black uppercase border-none shadow-sm inline-flex items-center gap-1`}
                                        >
                                            {row.is_active !== false ? <CheckCircle size={10} /> : <Lock size={10} />}
                                            {row.is_active !== false ? 'Aktif' : 'Nonaktif'}
                                        </Badge>
                                    </>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Bergabung', 
                                render: (row) => (
                                    <>
                                        <div className="text-sm font-bold text-gray-700">{new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Aksi', 
                                className: 'px-8 py-6 text-right',
                                render: (row) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingUser(row); setShowAddModal(true); }}
                                            className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            title="Edit User"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPasswordResetUser(row); setResetPasswordOpen(true); }}
                                            className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                                            title="Reset Password"
                                        >
                                            <Key size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setStatusToggleUser(row); setStatusToggleOpen(true); }}
                                            className={`p-2.5 rounded-xl ${row.is_active !== false ? 'bg-orange-50 text-orange-600 hover:bg-orange-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600'} hover:text-white transition-all shadow-sm`}
                                            title={row.is_active !== false ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                                        >
                                            {row.is_active !== false ? <Lock size={18} /> : <Unlock size={18} />}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openDeleteUser(row); }}
                                            className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            title="Hapus User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ) 
                            }
                        ]}
                        data={filteredUsers}
                        loading={loading}
                        emptyState={
                            <div className="py-20 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="text-gray-300" size={32} />
                                </div>
                                <p className="text-lg font-bold text-gray-900">Tidak ada pengguna ditemukan</p>
                                <p className="text-sm text-gray-500">Coba kata kunci pencarian atau filter yang berbeda.</p>
                            </div>
                        }
                        mobileCardHeader={(row) => (
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shadow-sm">
                                    {row.nama?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-base">{row.nama}</div>
                                    <div className="text-xs font-medium text-gray-400">@{row.username}</div>
                                </div>
                            </div>
                        )}
                        mobileCardActions={(row) => (
                            <MobileActionMenu
                                actions={[
                                    { icon: <Edit size={16} />, label: 'Edit', onClick: () => { setEditingUser(row); setShowAddModal(true); } },
                                    { icon: <Key size={16} />, label: 'Reset Password', onClick: () => { setPasswordResetUser(row); setResetPasswordOpen(true); } },
                                    { icon: row.is_active !== false ? <Lock size={16} /> : <Unlock size={16} />, label: row.is_active !== false ? 'Nonaktifkan' : 'Aktifkan', onClick: () => { setStatusToggleUser(row); setStatusToggleOpen(true); } },
                                    { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => openDeleteUser(row), danger: true }
                                ]}
                            />
                        )}
                        mobileCardContent={(row) => (
                            <div className="flex flex-col gap-3 w-full mt-1">
                                <div className="flex flex-wrap gap-1.5">
                                    {row.roles.map((role) => (
                                        <span 
                                            key={role} 
                                            className={`${getRoleBadgeColor(role)} px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border-none`}
                                        >
                                            {getRoleLabel(role)}
                                        </span>
                                    ))}
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500">Status</span>
                                        <span className={`text-[10px] font-black uppercase ${row.is_active !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {row.is_active !== false ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500">Email</span>
                                        <span className="text-xs font-bold text-gray-900">{row.email || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500">Telp</span>
                                        <span className="text-xs font-bold text-gray-900">{row.phone || '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
                                        <span className="text-xs font-semibold text-gray-500">Bergabung</span>
                                        <span className="text-[10px] font-bold text-gray-900 text-right">
                                            {new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}<br/>
                                            <span className="text-gray-400">{new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                    )}
                </div>
            </Card>

                OR Reuse existing plain divs but styled with Tailwind 
            */}




            {/* Add/Edit Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
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
                                        { id: 'admin_akademik', label: 'Admin Akademik', color: 'indigo' },
                                        { id: 'admin_absensi', label: 'Admin Absensi', color: 'emerald' },
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

                            {/* Dynamic Role Extras: Wali */}
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

                            {/* Dynamic Role Extras: Guru / Musyrif */}
                            {(formData.roles.includes('guru') || formData.roles.includes('musyrif')) && (
                                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-blue-900">Hubungkan Data Guru/Musyrif</h4>
                                        <Badge variant="info" className="text-[10px]">Penting untuk Agenda & Halaqoh</Badge>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-blue-700 mb-1">Pilih Profil Profesional</label>
                                        <select 
                                            className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            value={formData.guru_id}
                                            onChange={(e) => setFormData(prev => ({ ...prev, guru_id: e.target.value }))}
                                        >
                                            <option value="">-- Buat Data Guru Baru Secara Otomatis --</option>
                                            {guruList.map(guru => (
                                                <option key={guru.id} value={guru.id}>
                                                    {guru.nama} ({guru.email || 'No Email'})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1.5 text-[11px] text-blue-600 leading-relaxed italic">
                                            {formData.guru_id 
                                                ? "✅ User ini akan dihubungkan dengan data guru yang sudah ada. Nama dan Email akan disinkronkan."
                                                : "✨ Jika dikosongkan, sistem akan otomatis membuat record baru di tabel Guru berdasarkan data di atas."}
                                        </p>
                                    </div>
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
                                                        <div className="text-xs text-gray-500">Guru: {halaqoh.display_guru || '-'}</div>
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
                            <button 
                                onClick={closeModal} 
                                disabled={saving}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button 
                                type="button"
                                onClick={handleSaveUserClick} 
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all text-sm font-medium shadow-sm"
                            >
                                {saving ? 'Menyimpan...' : 'Simpan User'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Reset Password Modal */}
            {resetPasswordOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                            <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                            <button onClick={() => setResetPasswordOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
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
                            <button 
                                onClick={() => setResetPasswordOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleResetPasswordClick} 
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all text-sm font-medium shadow-sm"
                            >
                                {saving ? 'Memproses...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Confirmation Modals MUST be at the end to ensure they appear on top of other portals */}
            <ConfirmationModal
                isOpen={actionModal.isOpen && actionModal.type === 'save_user'}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                onConfirm={executeSaveUser}
                title="Konfirmasi Simpan"
                message={`Apakah anda yakin ingin menyimpan data user ${formData.nama}?`}
                confirmLabel={saving ? 'Menyimpan...' : 'Ya, Simpan'}
                cancelLabel="Batal"
                variant="primary"
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ isOpen: false, type: null })}
                onConfirm={actionModal.type === 'save_user' ? executeSaveUser : executeResetPassword}
                title={actionModal.type === 'save_user' ? "Simpan Perubahan" : "Reset Password"}
                message={
                    actionModal.type === 'save_user'
                        ? "Apakah Anda yakin data pengguna ini sudah benar?"
                        : `Apakah Anda yakin ingin mereset password untuk ${passwordResetUser?.nama}?`
                }
                confirmText={actionModal.type === 'save_user' ? "Ya, Simpan" : "Ya, Reset"}
                cancelText="Batal"
                loading={saving}
                variant={actionModal.type === 'save_user' ? "primary" : "warning"}
            />

            <ConfirmationModal
                isOpen={statusToggleOpen}
                onClose={() => { setStatusToggleOpen(false); setStatusToggleUser(null); }}
                onConfirm={executeToggleStatus}
                title={statusToggleUser?.is_active !== false ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                message={
                    statusToggleUser?.is_active !== false
                        ? `Apakah Anda yakin ingin MENONAKTIFKAN akun ${statusToggleUser?.nama}? User tidak akan bisa login ke dalam sistem lagi.`
                        : `Apakah Anda yakin ingin MENGAKTIFKAN akun ${statusToggleUser?.nama}? User akan bisa login kembali.`
                }
                confirmText={statusToggleUser?.is_active !== false ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
                cancelText="Batal"
                loading={saving}
                variant={statusToggleUser?.is_active !== false ? "danger" : "primary"}
                icon={statusToggleUser?.is_active !== false ? AlertTriangle : CheckCircle}
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
