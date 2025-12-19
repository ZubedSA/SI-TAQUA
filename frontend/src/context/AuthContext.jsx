import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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
    const [userProfile, setUserProfile] = useState({ role: 'guest' }) // Default role
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

    // Handle auto logout
    const handleAutoLogout = async () => {
        try {
            await supabase.auth.signOut()
            setUser(null)
            setUserProfile({ role: 'guest' })
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
                const { data: { session } } = await supabase.auth.getSession()
                setUser(session?.user ?? null)
                if (session?.user) {
                    // Fetch profile dengan timeout
                    fetchUserProfile(session.user.id)
                }
            } catch (error) {
                console.error('Auth error:', error.message)
            } finally {
                setLoading(false)
            }
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null)
                if (session?.user) {
                    fetchUserProfile(session.user.id)
                } else {
                    setUserProfile({ role: 'guest' })
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
                setUserProfile({ role: 'guest' })
                return
            }

            setUserProfile(data || { role: 'admin' })
        } catch (err) {
            // Timeout atau error - gunakan default
            console.log('Using default guest role')
            setUserProfile({ role: 'guest' })
        }
    }

    const signIn = async (input, password) => {
        let authEmail = input.trim()

        // Cek apakah input adalah email valid (mengandung @)
        // Jika TIDAK mengandung @, kita asumsikan sebagai USERNAME
        if (!authEmail.includes('@')) {
            console.log('Looking up username:', authEmail)
            const { data: foundEmail, error: rpcError } = await supabase
                .rpc('get_email_by_username', { p_username: authEmail })

            if (rpcError) {
                console.error('Error finding username:', rpcError)
                if (rpcError.message.includes('function get_email_by_username')) {
                    throw new Error('Database belum update (MIGRATE_TO_USERNAME.sql)')
                }
                throw new Error('Gagal mencari username')
            }

            if (!foundEmail) {
                throw new Error('Username tidak ditemukan!')
            }

            authEmail = foundEmail
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
        })
        if (error) throw error

        // Fetch profile untuk mendapatkan role
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', data.user.id)
            .single()

        const role = profile?.role || 'admin'
        setUserProfile({ ...profile, role })

        return { ...data, role }
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
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setUser(null)
        setUserProfile({ role: 'admin' })
    }

    // Role checking helpers
    const isAdmin = () => userProfile?.role === 'admin'
    const isGuru = () => userProfile?.role === 'guru'
    const isWali = () => userProfile?.role === 'wali'
    const hasRole = (roles) => roles.includes(userProfile?.role)

    const value = {
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
        isAdmin,
        isGuru,
        isWali,
        hasRole,
        role: userProfile?.role || 'admin'
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
