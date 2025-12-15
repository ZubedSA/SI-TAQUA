import express from 'express'
import { supabaseAdmin, isDemoMode } from '../config/supabase.js'

const router = express.Router()

// Update user password (Admin only)
router.post('/update-password', async (req, res) => {
    try {
        const { userId, newPassword } = req.body

        console.log('📝 Update password request:', { userId, passwordLength: newPassword?.length })

        if (!userId || !newPassword) {
            return res.status(400).json({ error: 'userId dan newPassword harus diisi' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password minimal 6 karakter' })
        }

        if (isDemoMode) {
            return res.status(503).json({ error: 'Supabase tidak terkonfigurasi. Gunakan Supabase Dashboard.' })
        }

        // Update password menggunakan Admin API
        // Juga konfirmasi email agar user bisa login
        console.log('🔄 Calling Supabase Admin API updateUserById...')
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
            email_confirm: true  // Konfirmasi email agar bisa login
        })

        if (error) {
            console.error('❌ Supabase Admin API error:', error)
            return res.status(400).json({ error: error.message })
        }

        console.log('✅ Password updated successfully!')
        console.log('📦 Response data:', JSON.stringify(data, null, 2))

        res.json({
            success: true,
            message: 'Password berhasil diubah',
            user: data?.user?.email
        })
    } catch (error) {
        console.error('❌ Server error:', error)
        res.status(500).json({ error: 'Internal server error: ' + error.message })
    }
})

// Get all users (untuk verifikasi)
router.get('/users', async (req, res) => {
    try {
        if (isDemoMode) {
            return res.json({ users: [] })
        }

        const { data, error } = await supabaseAdmin.auth.admin.listUsers()

        if (error) {
            return res.status(400).json({ error: error.message })
        }

        res.json({ users: data.users })
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
