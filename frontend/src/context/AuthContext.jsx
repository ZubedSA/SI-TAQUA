import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { authService } from '../services/authService'
import { subscribeToPush, isPushSupported } from '../utils/pushNotification'

const AuthContext = createContext({})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState({
        roles: [],
        activeRole: 'guest',
        role: 'guest' // Legacy support
    })
    const [loading, setLoading] = useState(true)

    // Helper to log auth events securely
    const logAuthEvent = async (action, details = {}) => {
        try {
            await supabase.rpc('log_frontend_activity', {
                p_action: action,
                p_module: 'AUTH',
                p_details: details
            })
        } catch (e) {
            console.warn('[AuthAudit] Failed to log:', e)
        }
    }

    // Ref to skip redundant fetchUserProfile after signIn
    const justSignedInRef = useRef(false)

    useEffect(() => {
        // Create a single initialization function
        const initializeAuth = async () => {
            try {
                // 1. Get initial session
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Session error:', error.message)
                    setUser(null)
                    setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
                    setLoading(false)
                    return
                }

                // 2. Handle session if exists
                if (session?.user) {
                    setUser(session.user)
                    await fetchUserProfile(session.user.id)
                } else {
                    setUser(null)
                    setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
                }
            } catch (error) {
                console.error('Auth initialization error:', error)
                setUser(null)
                setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
            } finally {
                // 3. ONLY set loading false after everything is ready
                setLoading(false)
            }
        }

        // Run initialization
        initializeAuth()

        // Listen for subsequent changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // If it's just a refresh, we already handled it in initializeAuth
                if (event === 'INITIAL_SESSION') return

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    if (session?.user) {
                        setUser(session.user)
                        // Skip re-fetching profile if signIn() just set it
                        // This prevents a race condition where the profile
                        // is temporarily reset during the fetch
                        if (justSignedInRef.current) {
                            justSignedInRef.current = false
                            return
                        }
                        await fetchUserProfile(session.user.id)
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserProfile = async (userId) => {
        // Coba fetch profile dengan timeout 5 detik (lebih responsif)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000)
        )

        const fetchPromise = supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()

        try {
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

            if (error) {
                console.warn('Profile fetch error:', error.message)
                // Use functional update to check latest state and avoid stale closure
                setUserProfile(prev => {
                    if (prev?.nama && prev?.activeRole !== 'guest') return prev
                    return { roles: [], activeRole: 'guest', role: 'guest' }
                })
                return
            }

            // Handle roles
            let roles = data.roles || (data.role ? [data.role] : ['guest'])
            
            // If user is admin (either in roles array or single role), grant access to all dashboards
            if (roles.includes('admin') || data.role === 'admin') {
                roles = ['admin', 'admin_akademik', 'admin_absensi', 'guru', 'bendahara', 'pengurus', 'wali', 'ota', 'musyrif']
            } else if (roles.includes('admin_akademik') || data.role === 'admin_akademik') {
                // Admin Akademik gets academic-related roles
                if (!roles.includes('guru')) roles.push('guru')
                if (!roles.includes('musyrif')) roles.push('musyrif')
            } else if (roles.includes('admin_absensi') || data.role === 'admin_absensi') {
                // Admin Absensi
                if (!roles.includes('guru')) roles.push('guru')
            }

            // Persist active role selection across refreshes
            const savedRole = localStorage.getItem('sitaqua_active_role')
            const isValidSavedRole = savedRole && roles.includes(savedRole)
            
            const activeRole = isValidSavedRole ? savedRole : (data.active_role || data.role || (roles.length > 0 ? roles[0] : 'guest'))

            setUserProfile({
                ...data,
                roles: roles,
                activeRole: activeRole,
                role: activeRole
            })
        } catch (err) {
            console.error('Profile fetch failed or timed out:', err.message)
            setUserProfile(prev => {
                if (prev?.nama && prev?.activeRole !== 'guest') return prev
                return { roles: [], activeRole: 'guest', role: 'guest' }
            })
        }
    }

    // Refresh profile (used after avatar update, etc.)
    const refreshProfile = async () => {
        if (user?.id) {
            await fetchUserProfile(user.id)
        }
    }

    // Switch active role (for multi-role users)
    const switchRole = async (newRole) => {
        try {
            if (!user) throw new Error('User not authenticated')

            const { scopeId } = await authService.switchRole(user.id, newRole)
            
            // Save selection to localStorage to persist across refreshes
            localStorage.setItem('sitaqua_active_role', newRole)

            setUserProfile(prev => ({
                ...prev,
                activeRole: newRole,
                role: newRole, // Legacy
                scopeId: scopeId
            }))

            return { success: true, activeRole: newRole, scopeId }
        } catch (error) {
            console.error('Switch role failed:', error)
            throw error
        }
    }

    const signIn = async (input, password) => {
        try {
            // Signal to onAuthStateChange to skip re-fetching profile
            justSignedInRef.current = true

            const result = await authService.login(input, password)

            // Set basic user info locally immediately
            setUser(result.user)

            // If internal logic in authService didn't set everything yet, we can do it here
            // but authService returns { user, profile, roles, requiresSelection }

            const activeRole = result.requiresSelection ? null : result.roles[0]
            
            if (activeRole) {
                localStorage.setItem('sitaqua_active_role', activeRole)
            }

            // Admin gets all roles immediately for role switching
            let finalRoles = result.roles
            if (result.roles.includes('admin') || result.profile?.role === 'admin') {
                finalRoles = ['admin', 'admin_akademik', 'admin_absensi', 'guru', 'bendahara', 'pengurus', 'wali', 'ota', 'musyrif']
            }

            setUserProfile({
                ...result.profile,
                roles: finalRoles,
                activeRole: activeRole || 'guest',
                role: activeRole || 'guest'
            })

            // Auto-subscribe to push notifications (silent, non-blocking)
            if (isPushSupported()) {
                subscribeToPush(result.user.id).catch(() => {})
            }

            return {
                ...result,
                roles: finalRoles,
                user: result.user
            }
        } catch (error) {
            throw error // bubbling up to UI
        }
    }

    const signUp = async (email, password, metadata = {}) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        })
        if (error) throw error
        return data
    }

    const signOut = async () => {
        // 1. Log audit BEFORE signing out (so we have the user_id)
        await logAuthEvent('LOGOUT', { reason: 'USER_ACTION' })

        try {
            // 2. Perform Supabase SignOut
            const { error } = await supabase.auth.signOut()
            if (error) {
                console.error('Supabase signOut error (ignored):', error.message)
            }
        } catch (err) {
            console.error('SignOut Exception:', err)
        } finally {
            // 3. ALWAYS clear local state and redirect
            setUser(null)
            setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
            localStorage.removeItem('sitaqua_absensi_mode')
            localStorage.removeItem('sitaqua_last_absensi_path')
            localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
        }
    }

    // Role checking helpers
    const isAdmin = () => userProfile?.activeRole === 'admin'
    const isAdminAkademik = () => userProfile?.activeRole === 'admin_akademik'
    const isAdminAbsensi = () => userProfile?.activeRole === 'admin_absensi'
    const isGuru = () => userProfile?.activeRole === 'guru'
    const isBendahara = () => userProfile?.activeRole === 'bendahara'
    const isWali = () => userProfile?.activeRole === 'wali'
    const isPengurus = () => userProfile?.activeRole === 'pengurus'
    const isOTA = () => userProfile?.activeRole === 'ota'
    const isMusyrif = () => userProfile?.activeRole === 'musyrif'

    // Check if user has specific role in their roles array
    const hasRole = (roles) => {
        if (typeof roles === 'string') {
            return userProfile?.roles?.includes(roles)
        }
        return roles.some(r => userProfile?.roles?.includes(r))
    }

    // Check if user can access based on active role
    const canAccessWithActiveRole = (allowedRoles) => {
        if (typeof allowedRoles === 'string') {
            return userProfile?.activeRole === allowedRoles
        }
        return allowedRoles.includes(userProfile?.activeRole)
    }

    // Check if user has multiple roles (for showing role switcher)
    const hasMultipleRoles = () => (userProfile?.roles?.length || 0) > 1

    const value = {
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        switchRole,
        refreshProfile,
        isAuthenticated: !!user,
        isAdmin,
        isAdminAkademik,
        isAdminAbsensi,
        isGuru,
        isBendahara,
        isWali,

        isPengurus,
        isOTA,
        isMusyrif,
        hasRole,
        canAccessWithActiveRole,
        hasMultipleRoles,
        // Multi-role properties
        roles: userProfile?.roles || [],
        activeRole: userProfile?.activeRole || 'guest',
        // Legacy support (single role)
        role: userProfile?.activeRole || userProfile?.role || 'guest'
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
