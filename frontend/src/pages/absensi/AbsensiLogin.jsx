import { useState, useLayoutEffect, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoFile from '../../assets/Logo_PTQA_075759.png'

const AbsensiLogin = () => {
    const navigate = useNavigate()
    const { signIn, user, userProfile, loading: authLoading } = useAuth()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light')
    }, [])

    useEffect(() => {
        // Clear isolation flags when entering login page to prevent lock-in loops
        localStorage.removeItem('sitaqua_absensi_mode')
        localStorage.removeItem('sitaqua_last_absensi_path')
    }, [])

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && user) {
            const roles = userProfile?.roles || []
            if (roles.includes('admin') || roles.includes('admin_absensi')) {
                navigate('/absensi/admin')
            } else {
                navigate('/absensi/home')
            }
        }
    }, [user, authLoading, userProfile, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            if (!username) throw new Error('Username harus diisi')
            if (!password) throw new Error('Password harus diisi')

            const result = await signIn(username, password)

            // Set isolation flag
            localStorage.setItem('sitaqua_absensi_mode', 'true')

            // Redirect based on role
            if (result?.roles?.includes('admin') || result?.roles?.includes('admin_absensi')) {
                navigate('/absensi/admin')
            } else {
                navigate('/absensi/home')
            }

        } catch (err) {
            console.error('Login Error:', err)
            let msg = err.message
            if (msg.includes('Invalid login credentials')) msg = 'Username atau password salah.'
            setError(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[#BCF32F]/5 -skew-x-12 translate-x-24"></div>
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#0A2619]/5 rounded-full blur-[100px]"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#BCF32F]/10 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-[480px] relative z-10">
                {/* Back Link */}
                <button
                    onClick={() => {
                        localStorage.removeItem('sitaqua_absensi_mode')
                        localStorage.removeItem('sitaqua_last_absensi_path')
                        navigate('/')
                    }}
                    className="group inline-flex items-center gap-2 mb-8 bg-white/60 backdrop-blur-md border border-gray-200 hover:border-[#0A2619]/30 hover:bg-white text-gray-500 hover:text-[#0A2619] px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Kembali
                </button>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl md:rounded-[3.5rem] shadow-2xl shadow-black/10 overflow-hidden border border-white/50">
                    {/* Header */}
                    <div className="p-6 md:p-10 text-center pb-6">
                        <div className="inline-block p-4 rounded-[2.5rem] bg-[#0A2619]/5 mb-6 md:mb-8 shadow-inner">
                            <img src={logoFile} alt="Logo" className="h-16 w-auto sm:h-20 object-contain mx-auto" />
                        </div>
                        <div className="flex flex-col items-center">
                            <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-3">Portal Absensi</h2>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0A2619]/5 border border-[#0A2619]/10 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#BCF32F] shadow-[0_0_8px_#BCF32F] animate-pulse"></div>
                                <p className="text-[10px] font-black text-[#0A2619] uppercase tracking-[0.3em]">SI-TAQUA BATUAN</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="px-6 md:px-10 pb-10 space-y-8">
                        {error && (
                            <div className="flex items-center gap-4 p-5 rounded-3xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold animate-shake">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                                    <AlertCircle size={16} />
                                </div>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Username Asatidz</label>
                                <input
                                    type="text"
                                    className="w-full px-8 py-5 rounded-[2rem] border border-gray-100 focus:ring-4 focus:ring-[#0A2619]/10 focus:border-[#0A2619] transition-all outline-none bg-gray-50/50 text-sm font-bold placeholder:font-medium"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Kata Sandi</label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="w-full px-8 py-5 rounded-[2rem] border border-gray-100 focus:ring-4 focus:ring-[#0A2619]/10 focus:border-[#0A2619] transition-all outline-none bg-gray-50/50 pr-16 text-sm font-bold"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#0A2619] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-6 px-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 group ${isSubmitting
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#0A2619] text-[#BCF32F] hover:bg-[#BCF32F] hover:text-[#0A2619] shadow-black/10 hover:shadow-[#BCF32F]/30 active:scale-[0.98]'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Masuk Sekarang</span>
                                        <LogIn size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer Info */}
                    <div className="px-10 py-8 bg-gray-50/30 border-t border-gray-50 text-center space-y-2">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed opacity-60">
                            Khusus Guru & Musyrif PTQA<br />
                            Al-Usymuni Batuan
                        </p>
                        <p className="text-[10px] text-[#0A2619]/60 font-black uppercase tracking-widest leading-relaxed">
                            Developed with full solemnity by Zubed S.A.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AbsensiLogin
