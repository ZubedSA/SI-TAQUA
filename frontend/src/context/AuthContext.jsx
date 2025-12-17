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
    const [userProfile, setUserProfile] = useState({ role: 'admin' }) // Default role
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
            setUserProfile({ role: 'admin' })
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
                    setUserProfile({ role: 'admin' })
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
                console.log('Profile not found, using default admin role')
                setUserProfile({ role: 'admin' })
                return
            }

            setUserProfile(data || { role: 'admin' })
        } catch (err) {
            // Timeout atau error - gunakan default
            console.log('Using default admin role')
            setUserProfile({ role: 'admin' })
        }
    }

    // Fungsi untuk menormalisasi nomor telepon
    const normalizePhone = (phone) => {
        let cleaned = phone.replace(/[^\d]/g, '')
        // Konversi 08xxx ke 628xxx
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1)
        }
        // Hapus prefix +
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1)
        }
        return cleaned
    }

    // Cek apakah input adalah nomor telepon
    const isPhoneNumber = (input) => {
        const cleaned = input.replace(/[^\d+]/g, '')
        return /^(\+62|62|08)\d{8,12}$/.test(cleaned)
    }

    const signIn = async (emailOrPhone, password) => {
        let authEmail = emailOrPhone

        // Jika input adalah nomor telepon, cari auth email
        if (isPhoneNumber(emailOrPhone)) {
            const normalizedPhone = normalizePhone(emailOrPhone)

            // Cari user berdasarkan nomor telepon di user_profiles
            const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('email, no_telp, user_id')
                .or(`no_telp.eq.${normalizedPhone},no_telp.eq.0${normalizedPhone.substring(2)},no_telp.eq.+${normalizedPhone}`)

            if (profileError) {
                console.error('Error finding profile:', profileError)
                throw new Error('Terjadi kesalahan saat mencari akun')
            }

            if (!profiles || profiles.length === 0) {
                throw new Error('Akun tidak ditemukan dengan nomor telepon ini')
            }

            // Jika email di profile ada, gunakan itu. Jika tidak, gunakan email placeholder
            if (profiles[0].email) {
                authEmail = profiles[0].email
            } else {
                // User hanya punya no_telp, pakai email placeholder
                authEmail = `${normalizedPhone}@phone.local`
            }
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
