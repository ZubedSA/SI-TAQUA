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
                navigate('/')
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
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full">

                {/* Header */}
                <div className="text-center mb-8">
                    <img src={logoFile} alt="Logo" className="h-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-800">Pilih Akses Anda</h1>
                    <p className="text-gray-500 mt-2">Anda memiliki akses ke beberapa peran. Silakan pilih salah satu untuk melanjutkan.</p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-center">
                        {error}
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableRoles.map((role) => {
                        const Icon = role.icon || Shield
                        return (
                            <button
                                key={role.id}
                                onClick={() => handleRoleSelect(role.id)}
                                disabled={loading}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-left relative overflow-hidden group"
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full ${role.color || 'bg-gray-500'}`}></div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${role.color ? role.color.replace('bg-', 'bg-opacity-10 text-') : 'bg-gray-100'}`}>
                                        <Icon size={24} className={role.color ? role.color.replace('bg-', 'text-') : 'text-gray-600'} />
                                    </div>
                                    <ArrowRight className="text-gray-300 group-hover:text-gray-600 transition-colors" size={20} />
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-1">{role.label}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    {role.description || 'Masuk sebagai ' + role.label}
                                </p>
                            </button>
                        )
                    })}
                </div>

                {/* Footer Actions */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 mb-4">Ingin masuk dengan akun lain?</p>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center justify-center mx-auto text-gray-600 hover:text-red-600 font-medium transition-colors gap-2"
                    >
                        <LogOut size={18} />
                        Keluar Aplikasi
                    </button>
                </div>

            </div>
        </div>
    )
}

export default RoleSelectionPage
