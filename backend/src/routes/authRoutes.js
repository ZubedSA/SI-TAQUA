import express from 'express'

const router = express.Router()

// Demo users
const demoUsers = [
    { id: 1, email: 'admin@ptq-alusymuni.com', nama: 'Admin Pondok', role: 'admin' }
]

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        // For demo, accept any login
        const user = demoUsers[0]
        res.json({ user, message: 'Login successful' })
    } catch (error) {
        res.status(401).json({ error: 'Invalid credentials' })
    }
})

// Get current user
router.get('/me', async (req, res) => {
    try {
        // For demo, return demo user
        res.json({ user: demoUsers[0] })
    } catch (error) {
        res.status(401).json({ error: 'Not authenticated' })
    }
})

// Logout
router.post('/logout', async (req, res) => {
    res.json({ message: 'Logged out successfully' })
})

export default router
