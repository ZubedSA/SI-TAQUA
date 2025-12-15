import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import routes
import authRoutes from './src/routes/authRoutes.js'
import santriRoutes from './src/routes/santriRoutes.js'
import guruRoutes from './src/routes/guruRoutes.js'
import kelasRoutes from './src/routes/kelasRoutes.js'
import hafalanRoutes from './src/routes/hafalanRoutes.js'
import presensiRoutes from './src/routes/presensiRoutes.js'
import userRoutes from './src/routes/userRoutes.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware - CORS lebih permissive untuk development
app.use(cors({
    origin: true, // Izinkan semua origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/santri', santriRoutes)
app.use('/api/guru', guruRoutes)
app.use('/api/kelas', kelasRoutes)
app.use('/api/hafalan', hafalanRoutes)
app.use('/api/presensi', presensiRoutes)
app.use('/api/users', userRoutes)

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' })
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
})

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/health`)
})
