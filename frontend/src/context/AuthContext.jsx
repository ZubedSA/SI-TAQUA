import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { authService } from '../services/authService'

const AuthContext = createContext({})

// Idle timeout duration in milliseconds (20 minutes)
const IDLE_TIMEOUT = 20 * 60 * 1000

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
    const idleTimerRef = useRef(null)
    const lastActivityRef = useRef(Date.now())

    // Reset idle timer on user activity
    const resetIdleTimer = useCallback(() => {
        lastActivityRef.current = Date.now()

        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current)
        }

        // Only set timer if user is logged in
        if (user) {
            idleTimerRef.current = setTimeout(() => {
                // Auto logout after idle timeout
                console.log('Session expired due to inactivity')
                handleAutoLogout()
            }, IDLE_TIMEOUT)
        }
    }, [user])

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

    // Handle auto logout
    const handleAutoLogout = async () => {
        try {
            await supabase.auth.signOut()
            logAuthEvent('LOGOUT', { reason: 'IDLE_TIMEOUT' })
            setUser(null)
            setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
            alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 20 menit. Silakan login kembali.')
            window.location.href = '/login'
        } catch (error) {
            console.error('Auto logout error:', error)
        }
    }

    // Setup activity listeners
    useEffect(() => {
        if (!user) {
            // Clear timer if user is not logged in
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current)
            }
            return
        }

        // Activity events to track
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

        // Throttle function to prevent too many resets
        let lastReset = 0
        const throttledReset = () => {
            const now = Date.now()
            if (now - lastReset > 1000) { // Only reset once per second
                lastReset = now
                resetIdleTimer()
            }
        }

        // Add event listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, throttledReset, { passive: true })
        })

        // Start the idle timer
        resetIdleTimer()

        // Cleanup
        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, throttledReset)
            })
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current)
            }
        }
    }, [user, resetIdleTimer])

    useEffect(() => {
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                // Handle session errors (like invalid refresh token)
                if (error) {
                    console.error('Session error:', error.message)
                    // Clear any stale session data
                    localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
                    await supabase.auth.signOut()
                    setUser(null)
                    setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
                    setLoading(false)
                    return
                }

                setUser(session?.user ?? null)
                if (session?.user) {
                    // Fetch profile dengan timeout
                    fetchUserProfile(session.user.id)
                }
            } catch (error) {
                console.error('Auth error:', error.message)
                // Clear session on any auth error
                try {
                    await supabase.auth.signOut()
                } catch (e) {
                    console.error('Signout error:', e)
                }
                setUser(null)
                setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
            } finally {
                setLoading(false)
            }
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Handle token refresh errors
                if (event === 'TOKEN_REFRESHED' && !session) {
                    console.log('Token refresh failed, signing out')
                    setUser(null)
                    setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
                    return
                }

                setUser(session?.user ?? null)
                if (session?.user) {
                    fetchUserProfile(session.user.id)
                } else {
                    setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserProfile = async (userId) => {
        // Coba fetch profile dengan timeout 3 detik
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
        )

        const fetchPromise = supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()

        try {
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

            if (error) {
                // Tabel tidak ada atau error lainnya - gunakan default
                console.log('Profile not found, using default guest role')
                setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
                return
            }

            // Handle both old (single role) and new (multi-role) format
            // Admin gets access to ALL dashboards by default
            let roles = data.roles || (data.role ? [data.role] : ['guest'])
            const activeRole = data.active_role || data.role || (roles.length > 0 ? roles[0] : 'guest')

            // If user is admin (either in roles array or single role), grant access to all dashboards
            if (roles.includes('admin') || data.role === 'admin') {
                // Admin can switch to any dashboard
                roles = ['admin', 'guru', 'bendahara', 'pengurus', 'wali', 'ota']
            }

            setUserProfile({
                ...data,
                roles: roles,
                activeRole: activeRole,
                role: activeRole // Legacy support
            })
        } catch (err) {
            // Timeout atau error - gunakan default
            console.log('Using default guest role')
            setUserProfile({ roles: [], activeRole: 'guest', role: 'guest' })
        }
    }

    // Switch active role (for multi-role users)
    const switchRole = async (newRole) => {
        try {
            if (!user) throw new Error('User not authenticated')

            const { scopeId } = await authService.switchRole(user.id, newRole)

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
            const result = await authService.login(input, password)

            // Set basic user info locally immediately
            setUser(result.user)

            // If internal logic in authService didn't set everything yet, we can do it here
            // but authService returns { user, profile, roles, requiresSelection }

            const activeRole = result.requiresSelection ? null : result.roles[0]

            setUserProfile({
                ...result.profile,
                roles: result.roles,
                activeRole: activeRole || 'guest',
                role: activeRole || 'guest'
            })

            return {
                ...result,
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
            localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
        }
    }

    // Role checking helpers
    const isAdmin = () => userProfile?.activeRole === 'admin'
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
        isAuthenticated: !!user,
        isAdmin,
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
