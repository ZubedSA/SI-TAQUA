import { supabase } from '../lib/supabase'
import { ROLE_CONFIG } from '../config/roleConfig'

/**
 * Authentication Service (ROBUST VERSION)
 * Handles: Login (Username->Email), Role Switching, Scope Resolution
 * Guaranteed to return a session if credentials are correct, regardless of profile state.
 */
export const authService = {
    /**
     * Login with Username or Email
     * @param {string} usernameOrEmail 
     * @param {string} password 
     */
    async login(usernameOrEmail, password) {
        let email = usernameOrEmail.trim()

        try {
            // 1. Resolve Username to Email if not already an email
            if (!email.includes('@')) {
                // Try RPC
                const { data, error } = await supabase.rpc('get_email_by_username', {
                    p_username: email
                })

                // If RPC fails, don't throw yet, maybe it IS an email but typed weirdly? 
                // No, just proceed. If it was a username and we found nothing,
                // Supabase auth will fail anyway if we pass the username as email.
                // But let's rely on the RPC result if it exists.
                if (data) {
                    email = data
                } else {
                    // If RPC returns null, it might be an invalid username.
                    // But we try to login anyway to let Supabase handle the error ("Invalid login credentials")
                }
            }

            // 2. Check Login Restrictions - DISABLED (function removed from DB)
            // Uncomment when check_login_restriction function is restored
            // try {
            //     const { data: restriction } = await supabase.rpc('check_login_restriction', {
            //         p_email: email
            //     })
            //     if (restriction?.restricted) {
            //         throw new Error(`Akun dibatasi sementara. Coba lagi dalam ${Math.ceil(restriction.remaining_seconds / 60)} menit.`)
            //     }
            // } catch (rpcError) {
            //     console.warn('Login restriction check failed (ignoring):', rpcError)
            // }

            // 3. Authenticate with Supabase
            // This is the CRITICAL part.
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (authError) throw authError

            // Determine Roles (SAFE MODE)
            // This will NEVER throw "Gagal mengambil data pengguna"
            const { profile, roles, requiresSelection } = await this.resolveRoles(authData.user.id, authData.user)

            // 4. Log Success Activity (Fire and forget)
            this.logLoginAttempt(email, 'SUCCESS').catch(e => console.warn('Log failed', e))

            return {
                user: authData.user,
                profile,
                roles,
                requiresSelection,
                session: authData.session
            }

        } catch (error) {
            console.error('Login process error:', error)

            // Log Failure (Fire and forget)
            if (error.message !== 'Username tidak ditemukan.') {
                this.logLoginAttempt(email || usernameOrEmail, 'FAILED', error.message).catch(e => console.warn('Log failed', e))
            }

            throw error
        }
    },

    /**
     * Resolve Roles & Profile
     * Helper to get role data with FALLBACK
     */
    async resolveRoles(userId, authUser = null) {
        try {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error) throw error // Trigger fallback

            // Normalize roles array
            let roles = profile.roles || (profile.role ? [profile.role] : ['guest'])

            // Legacy/Fix: if roles is empty but role exists
            if ((!profile.roles || profile.roles.length === 0) && profile.role) {
                roles = [profile.role]
            }

            // Admin override
            if (roles.includes('admin') || profile.role === 'admin') {
                // Admin might have other roles implicitly
            }

            const requiresSelection = roles.length > 1

            return {
                profile,
                roles,
                requiresSelection
            }

        } catch (error) {
            console.warn('Profile fetch failed, using fallback profile:', error)

            // CONSTRUCT FALLBACK PROFILE from Auth Metadata
            const metadata = authUser?.user_metadata || {}
            const fallbackRole = metadata.role || 'guest'
            const fallbackName = metadata.nama || metadata.full_name || 'User'

            return {
                profile: {
                    user_id: userId,
                    nama: fallbackName,
                    role: fallbackRole,
                    active_role: fallbackRole,
                    roles: [fallbackRole]
                },
                roles: [fallbackRole],
                requiresSelection: false
            }
        }
    },

    /**
     * Switch Active Role
     */
    async switchRole(userId, targetRole) {
        if (!ROLE_CONFIG[targetRole]) {
            throw new Error('Role tidak valid.')
        }

        const scopeId = await this.resolveScope(userId, targetRole)

        // Try to update DB, but don't crash if it fails
        try {
            await supabase
                .from('user_profiles')
                .update({ active_role: targetRole })
                .eq('user_id', userId)
        } catch (e) {
            console.warn('Failed to update active_role in DB:', e)
        }

        this.logLoginAttempt(null, 'ROLE_SWITCH', `Switched to ${targetRole}`).catch(() => { })

        return { role: targetRole, scopeId }
    },

    /**
     * Resolve Scope ID based on Role
     */
    async resolveScope(userId, role) {
        try {
            if (role === 'musyrif') {
                const { data } = await supabase
                    .from('halaqoh')
                    .select('id')
                    .eq('musyrif_id', userId)
                    .single()
                return data?.id || null
            }
            // Add other scope resolutions here
            return null
        } catch (error) {
            console.warn(`Scope resolution failed for ${role}:`, error)
            return null
        }
    },

    /**
     * Log Login Activity
     */
    async logLoginAttempt(email, status, message = null) {
        // DISABLED - log_login_activity function removed from DB
        // Uncomment when the function is restored
        // try {
        //     await supabase.rpc('log_login_activity', {
        //         p_email: email,
        //         p_status: status,
        //         p_message: message
        //     })
        // } catch (error) {
        //     console.warn('Logging failed:', error)
        // }
        console.log(`[Auth Log] ${status}: ${email} - ${message || ''}`)
    }
}
