import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { getRoleConfig } from '../../config/roleConfig'
import { LogOut, ArrowRight, Shield } from 'lucide-react'
import logoFile from '../../assets/Logo_PTQA_075759.png'

const RoleSelectionPage = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, roles, switchRole, signOut } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Redirect if no session
    useEffect(() => {
        if (!user) {
            navigate('/login')
        }
    }, [user, navigate])

    const handleRoleSelect = async (roleId) => {
        setLoading(true)
        setError('')
        try {
            const { scopeId } = await switchRole(roleId)

            // Clear all cached data saat switch role untuk memastikan data fresh
            await queryClient.invalidateQueries()

            const config = getRoleConfig(roleId)

            // Redirect to dashboard
            if (config?.dashboard) {
                navigate(config.dashboard)
            } else {
                navigate('/home')
            }
        } catch (err) {
            console.error('Role switch error:', err)
            setError(err.message || 'Gagal masuk ke role tersebut.')
            setLoading(false)
        }
    }

    const availableRoles = roles.map(r => {
        const config = getRoleConfig(r)
        return config ? { ...config, id: r } : { id: r, label: r.toUpperCase() }
    })

    return (
        <div className="min-h-screen bg-slate-50 relative flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Ambient Background Decorative Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-100/20 blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-100/20 blur-[150px] pointer-events-none" />
            
            <div className="max-w-4xl w-full relative z-10">

                {/* Header */}
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="inline-flex p-4 rounded-3xl bg-white shadow-xl shadow-emerald-500/5 border border-emerald-500/10 mb-6 group hover:scale-105 transition-all duration-500">
                        <img src={logoFile} alt="Logo" className="h-16 w-auto object-contain" width="64" height="64" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                        Pilih Akses Anda
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto mt-3 font-semibold">
                        Selamat datang kembali di <span className="text-emerald-600 font-bold">SITAQUA</span>. Silakan pilih salah satu peran aktif Anda di bawah ini untuk memulai.
                    </p>
                </div>

                {error && (
                    <div className="max-w-md mx-auto bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl relative mb-8 text-center text-sm font-bold shadow-sm animate-in shake duration-500">
                        {error}
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                    {availableRoles.map((role) => {
                        const Icon = role.icon || Shield
                        
                        // Map standard color keys to Tailwind border/text/bg/hover-glow gradients
                        const colorMap = {
                            'bg-red-500': { 
                                border: 'hover:border-red-500/30 focus:border-red-500', 
                                iconBg: 'bg-red-50 text-red-600',
                                indicator: 'bg-red-500'
                            },
                            'bg-indigo-600': { 
                                border: 'hover:border-indigo-600/30 focus:border-indigo-600', 
                                iconBg: 'bg-indigo-50 text-indigo-600',
                                indicator: 'bg-indigo-600'
                            },
                            'bg-blue-500': { 
                                border: 'hover:border-blue-500/30 focus:border-blue-500', 
                                iconBg: 'bg-blue-50 text-blue-600',
                                indicator: 'bg-blue-500'
                            },
                            'bg-emerald-500': { 
                                border: 'hover:border-emerald-500/30 focus:border-emerald-500', 
                                iconBg: 'bg-emerald-50 text-emerald-600',
                                indicator: 'bg-emerald-500'
                            },
                            'bg-violet-500': { 
                                border: 'hover:border-violet-500/30 focus:border-violet-500', 
                                iconBg: 'bg-violet-50 text-violet-600',
                                indicator: 'bg-violet-500'
                            },
                            'bg-orange-500': { 
                                border: 'hover:border-orange-500/30 focus:border-orange-500', 
                                iconBg: 'bg-orange-50 text-orange-600',
                                indicator: 'bg-orange-500'
                            },
                            'bg-pink-500': { 
                                border: 'hover:border-pink-500/30 focus:border-pink-500', 
                                iconBg: 'bg-pink-50 text-pink-600',
                                indicator: 'bg-pink-500'
                            },
                            'bg-indigo-500': { 
                                border: 'hover:border-indigo-500/30 focus:border-indigo-500', 
                                iconBg: 'bg-indigo-50 text-indigo-600',
                                indicator: 'bg-indigo-500'
                            }
                        }
                        
                        const roleColor = colorMap[role.color] || {
                            border: 'hover:border-gray-500/30 focus:border-gray-500',
                            iconBg: 'bg-gray-50 text-gray-600',
                            indicator: 'bg-gray-500'
                        }

                        return (
                            <button
                                key={role.id}
                                onClick={() => handleRoleSelect(role.id)}
                                disabled={loading}
                                className={`bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/80 p-8 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:scale-[1.03] hover:-translate-y-1.5 transition-all duration-500 text-left relative overflow-hidden group focus:outline-none focus:ring-4 focus:ring-slate-100 ${roleColor.border}`}
                            >
                                {/* Role Color Left Accent Bar */}
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${roleColor.indicator}`}></div>

                                <div className="flex items-center justify-between mb-6">
                                    <div className={`p-4 rounded-2xl ${roleColor.iconBg} transition-all duration-500 group-hover:scale-110 shadow-sm`}>
                                        <Icon size={28} />
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 group-hover:bg-slate-100 group-hover:translate-x-1 transition-all duration-500">
                                        <ArrowRight size={18} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-slate-800 mb-2 leading-none">{role.label}</h3>
                                <p className="text-slate-400 text-sm font-bold leading-relaxed group-hover:text-slate-500 transition-colors">
                                    {role.description || 'Masuk sebagai ' + role.label}
                                </p>
                            </button>
                        )
                    })}
                </div>

                {/* Footer Actions */}
                <div className="mt-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <p className="text-slate-400 font-bold text-sm mb-4">Ingin masuk dengan akun lain?</p>
                    <button
                        onClick={() => signOut()}
                        className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 font-black text-xs uppercase tracking-widest rounded-2xl bg-white hover:bg-red-50/30 transition-all duration-300 gap-2 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100"
                    >
                        <LogOut size={16} />
                        <span>Keluar Aplikasi</span>
                    </button>
                </div>

            </div>
        </div>
    )
}

export default RoleSelectionPage
