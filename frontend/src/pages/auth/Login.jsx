import { useState, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoFile from '../../assets/Logo_PTQA_075759.png'

const Login = () => {
    const navigate = useNavigate()
    const { signIn, signOut } = useAuth()

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
        
        // Pastikan isolation mode absensi dihapus saat mengakses halaman login utama
        localStorage.removeItem('sitaqua_absensi_mode')
        localStorage.removeItem('sitaqua_last_absensi_path')
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (!username) throw new Error('Username harus diisi')
            if (!password) throw new Error('Password harus diisi')

            const result = await signIn(username, password)
            
            // Hapus isolation mode setelah berhasil login ke sistem utama
            localStorage.removeItem('sitaqua_absensi_mode')
            localStorage.removeItem('sitaqua_last_absensi_path')

            if (result.requiresSelection) {
                navigate('/role-selection')
            } else if (result?.roles?.includes('admin_absensi') && !result?.roles?.includes('admin')) {
                // Admin Absensi must use the specific absensi portal login
                await signOut()
                throw new Error('Akses ditolak. Akun Admin Absensi hanya diizinkan masuk melalui Portal Absensi.')
            } else {
                navigate('/home')
            }

        } catch (err) {
            console.error('Login Error:', err)
            let msg = err.message
            if (msg.includes('Invalid login credentials')) msg = 'Username atau password salah.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0A2619] flex flex-col items-center justify-center p-3 sm:p-4 font-sans relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#BCF32F]/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Back Link */}
                <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-[#BCF32F] hover:text-white font-bold mb-6 transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform flex-shrink-0" />
                    <span className="text-sm sm:text-base">Kembali ke Halaman Utama</span>
                </button>

                <div className="bg-white rounded-[2rem] shadow-2xl shadow-black/30 overflow-hidden border border-white/20">

                    {/* Header */}
                    <div className="p-6 sm:p-8 text-center bg-white border-b border-gray-100">
                        <img src={logoFile} alt="Logo PTQA Batuan" className="mx-auto h-16 sm:h-20 mb-6" width="80" height="80" />
                        <h2 className="!text-[22px] sm:!text-2xl md:!text-3xl font-bold text-gray-900 whitespace-nowrap tracking-tight">Assalamualaikum</h2>
                        <p className="text-[#0A2619] font-black mt-1.5 text-[11px] sm:text-sm uppercase tracking-wider">Sistem Informasi PTQA Batuan</p>
                    </div>

                    {/* Body */}
                    <div className="p-6 sm:p-8 space-y-6">
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm animate-shake">
                                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[13px] sm:text-sm font-bold text-gray-700 ml-1">Username</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-[#0A2619]/10 focus:border-[#0A2619] transition-all outline-none bg-gray-50/50"
                                    placeholder="Masukkan username Anda"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[13px] sm:text-sm font-bold text-gray-700 ml-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-[#0A2619]/10 focus:border-[#0A2619] transition-all outline-none bg-gray-50/50 pr-12"
                                        placeholder="Masukkan password Anda"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0A2619] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 px-6 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${loading
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-[#0A2619] hover:bg-[#143d2a] hover:shadow-[#0A2619]/30'
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
                    <div className="p-6 bg-gray-50/50 border-t border-gray-100 text-center space-y-1">
                        <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">
                            © 2026 PTQA Batuan • All Rights Reserved
                        </p>
                        <p className="text-[10px] text-[#0A2619]/60 font-bold tracking-tight">
                            Developed with full solemnity by Zubed S.A.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
