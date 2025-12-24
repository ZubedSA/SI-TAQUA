/**
 * Integration Test: Authentication
 * Menguji flow autentikasi dengan mocked Supabase client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Mock Supabase Client
// ============================================

const mockUser = {
    id: 'user-123',
    email: 'admin@ptqa.sch.id',
    user_metadata: { role: 'admin', nama: 'Admin PTQA' }
}

const mockSession = {
    user: mockUser,
    access_token: 'mock-access-token',
    expires_at: Date.now() + 3600000
}

// Mock Supabase auth functions
const createMockSupabase = (options = {}) => ({
    auth: {
        signInWithPassword: vi.fn().mockImplementation(async ({ email, password }) => {
            if (email === 'admin@ptqa.sch.id' && password === 'password123') {
                return { data: { user: mockUser, session: mockSession }, error: null }
            }
            return {
                data: { user: null, session: null },
                error: { message: 'Invalid login credentials' }
            }
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({
            data: { session: options.hasSession ? mockSession : null },
            error: null
        }),
        getUser: vi.fn().mockResolvedValue({
            data: { user: options.hasSession ? mockUser : null },
            error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } }
        })
    },
    from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
            data: { role: 'admin', nama: 'Admin PTQA' },
            error: null
        })
    })
})

// ============================================
// Integration Tests
// ============================================

describe('Authentication Flow', () => {
    let mockSupabase

    beforeEach(() => {
        mockSupabase = createMockSupabase()
        vi.clearAllMocks()
    })

    describe('Login', () => {
        it('should login successfully with valid credentials', async () => {
            const { data, error } = await mockSupabase.auth.signInWithPassword({
                email: 'admin@ptqa.sch.id',
                password: 'password123'
            })

            expect(error).toBeNull()
            expect(data.user).toBeDefined()
            expect(data.user.email).toBe('admin@ptqa.sch.id')
            expect(data.session).toBeDefined()
            expect(data.session.access_token).toBe('mock-access-token')
        })

        it('should fail login with invalid credentials', async () => {
            const { data, error } = await mockSupabase.auth.signInWithPassword({
                email: 'wrong@email.com',
                password: 'wrongpassword'
            })

            expect(error).toBeDefined()
            expect(error.message).toBe('Invalid login credentials')
            expect(data.user).toBeNull()
        })

        it('should fail login with empty credentials', async () => {
            const { data, error } = await mockSupabase.auth.signInWithPassword({
                email: '',
                password: ''
            })

            expect(error).toBeDefined()
            expect(data.user).toBeNull()
        })
    })

    describe('Logout', () => {
        it('should logout successfully', async () => {
            const { error } = await mockSupabase.auth.signOut()
            expect(error).toBeNull()
        })
    })

    describe('Session Management', () => {
        it('should get current session when logged in', async () => {
            const supabaseWithSession = createMockSupabase({ hasSession: true })
            const { data, error } = await supabaseWithSession.auth.getSession()

            expect(error).toBeNull()
            expect(data.session).toBeDefined()
            expect(data.session.user.email).toBe('admin@ptqa.sch.id')
        })

        it('should return null session when not logged in', async () => {
            const supabaseNoSession = createMockSupabase({ hasSession: false })
            const { data } = await supabaseNoSession.auth.getSession()

            expect(data.session).toBeNull()
        })
    })

    describe('User Profile', () => {
        it('should fetch user profile after login', async () => {
            // First login
            await mockSupabase.auth.signInWithPassword({
                email: 'admin@ptqa.sch.id',
                password: 'password123'
            })

            // Then fetch profile
            const { data, error } = await mockSupabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', 'user-123')
                .single()

            expect(error).toBeNull()
            expect(data.role).toBe('admin')
            expect(data.nama).toBe('Admin PTQA')
        })
    })
})

describe('Role-Based Access', () => {
    const adminUser = { ...mockUser, user_metadata: { role: 'admin' } }
    const guruUser = { ...mockUser, id: 'guru-123', user_metadata: { role: 'guru' } }
    const waliUser = { ...mockUser, id: 'wali-123', user_metadata: { role: 'wali' } }

    const checkAccess = (user, requiredRoles) => {
        const userRole = user.user_metadata?.role
        return requiredRoles.includes(userRole)
    }

    it('should allow admin to access admin-only routes', () => {
        expect(checkAccess(adminUser, ['admin'])).toBe(true)
        expect(checkAccess(adminUser, ['admin', 'guru'])).toBe(true)
    })

    it('should deny guru from accessing admin-only routes', () => {
        expect(checkAccess(guruUser, ['admin'])).toBe(false)
    })

    it('should allow guru to access guru routes', () => {
        expect(checkAccess(guruUser, ['admin', 'guru'])).toBe(true)
        expect(checkAccess(guruUser, ['guru'])).toBe(true)
    })

    it('should restrict wali to wali-only routes', () => {
        expect(checkAccess(waliUser, ['admin'])).toBe(false)
        expect(checkAccess(waliUser, ['guru'])).toBe(false)
        expect(checkAccess(waliUser, ['wali'])).toBe(true)
    })
})

describe('Auth Error Handling', () => {
    it('should handle network error', async () => {
        const mockSupabaseError = {
            auth: {
                signInWithPassword: vi.fn().mockRejectedValue(new Error('Network error'))
            }
        }

        try {
            await mockSupabaseError.auth.signInWithPassword({ email: 'test@test.com', password: 'test' })
        } catch (error) {
            expect(error.message).toBe('Network error')
        }
    })

    it('should handle rate limiting error', async () => {
        const mockSupabaseRateLimit = {
            auth: {
                signInWithPassword: vi.fn().mockResolvedValue({
                    data: { user: null, session: null },
                    error: { message: 'Too many requests', status: 429 }
                })
            }
        }

        const { error } = await mockSupabaseRateLimit.auth.signInWithPassword({
            email: 'test@test.com',
            password: 'test'
        })

        expect(error.status).toBe(429)
        expect(error.message).toContain('Too many')
    })
})
