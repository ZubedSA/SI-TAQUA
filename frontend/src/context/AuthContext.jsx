import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
    const [userProfile, setUserProfile] = useState({ role: 'admin' }) // Default role
    const [loading, setLoading] = useState(true)

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

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
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
