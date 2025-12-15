import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, UserPlus, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

const Login = () => {
    const navigate = useNavigate()
    const { signIn, signUp } = useAuth()

    const [isRegister, setIsRegister] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Fungsi untuk menerjemahkan error Supabase ke bahasa Indonesia
    const translateError = (error) => {
        const errorMsg = error?.message || error || 'Terjadi kesalahan'

        // Map error messages ke bahasa Indonesia
        if (errorMsg.includes('Invalid login credentials')) {
            return 'Email atau password salah. Pastikan data yang Anda masukkan benar.'
        }
        if (errorMsg.includes('Email not confirmed')) {
            return 'Email belum dikonfirmasi. Silakan cek email Anda untuk verifikasi.'
        }
        if (errorMsg.includes('User not found')) {
            return 'Akun dengan email ini tidak ditemukan.'
        }
        if (errorMsg.includes('Password should be at least')) {
            return 'Password minimal 6 karakter.'
        }
        if (errorMsg.includes('User already registered')) {
            return 'Email ini sudah terdaftar. Silakan login atau gunakan email lain.'
        }
        if (errorMsg.includes('Invalid email')) {
            return 'Format email tidak valid.'
        }
        if (errorMsg.includes('Too many requests')) {
            return 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
        }
        if (errorMsg.includes('Network')) {
            return 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
        }

        return errorMsg
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (isRegister) {
                if (password !== confirmPassword) throw new Error('Password dan konfirmasi password tidak sama')
                if (password.length < 6) throw new Error('Password minimal 6 karakter')
                await signUp(email, password)
                setSuccess('Registrasi berhasil! Silakan login dengan akun baru Anda.')
                setIsRegister(false)
                setPassword('')
            } else {
                if (!email) throw new Error('Email harus diisi')
                if (!password) throw new Error('Password harus diisi')

                await signIn(email, password)
                navigate('/')
            }
        } catch (err) {
            console.error('Login error:', err)
            setError(translateError(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Header with Logo */}
                <div className="login-header">
                    <img src="/logo.png" alt="Logo PTQ Al-Usymuni" className="login-logo" />
                    <p className="system-title">Sistem Informasi Akademik</p>
                </div>

                {/* Alerts */}
                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="Masukkan email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="password-field">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {isRegister && (
                        <div className="input-group">
                            <label>Konfirmasi Password</label>
                            <input
                                type="password"
                                placeholder="Ulangi password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? <RefreshCw size={18} className="spin" /> : isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
                        <span>{loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Masuk'}</span>
                    </button>
                </form>

                {/* Footer */}
                <div className="login-footer">
                    <p>
                        {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
                        <button onClick={() => setIsRegister(!isRegister)}>
                            {isRegister ? 'Masuk' : 'Daftar'}
                        </button>
                    </p>
                </div>
            </div>

            {/* Copyright */}
            <p className="copyright">© 2025 PTQA Batuan. All rights reserved.</p>
        </div>
    )
}

export default Login
