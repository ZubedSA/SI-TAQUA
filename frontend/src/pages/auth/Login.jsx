import { useState, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, RefreshCw, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoFile from '../../assets/Logo_PTQA_075759.png'
import './Login.css'

const Login = () => {
    const navigate = useNavigate()
    const { signIn } = useAuth()

    // UI State
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Force light mode
    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light')
        localStorage.setItem('ptqa-theme', 'light')
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (!username) throw new Error('Username harus diisi')
            if (!password) throw new Error('Password harus diisi')

            const result = await signIn(username, password)

            if (result.requiresSelection) {
                navigate('/role-selection')
            } else {
                // Auto redirect handled by RoleBasedRedirect or context
                // But context.signIn returns role info, so we can manual redirect if needed
                // App.jsx RoleBasedRedirect handles '/'
                navigate('/')
            }

        } catch (err) {
            console.error('Login Error:', err)
            // Error handling user friendly
            let msg = err.message
            if (msg.includes('Invalid login credentials')) msg = 'Username atau password salah.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page bg-gray-50 flex items-center justify-center min-h-screen p-4">
            <div className="login-card w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">

                {/* Header */}
                <div className="login-header p-8 text-center bg-white border-b border-gray-100">
                    <img src={logoFile} alt="Logo PTQA Batuan" className="mx-auto h-20 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Assalamualaikum</h2>
                    <p className="text-gray-500 mt-2 text-sm">Masuk untuk mengakses Sistem Informasi</p>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Error Alert */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-shake">
                            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Username</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                                placeholder="Masukkan username Anda"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none pr-12"
                                    placeholder="Masukkan password Anda"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 px-6 rounded-lg font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-green-500/30'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <RefreshCw size={20} className="animate-spin" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    <span>Masuk ke Sistem</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400 font-medium">
                        © 2026 PTQA Batuan. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
