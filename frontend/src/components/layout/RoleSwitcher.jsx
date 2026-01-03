import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
    Shield,
    GraduationCap,
    Wallet,
    Users,
    ChevronDown,
    Check,
    RefreshCw,
    BookMarked
} from 'lucide-react'
import './RoleSwitcher.css'

/**
 * Role configuration with labels, icons, colors, and dashboard paths
 */
const roleConfig = {
    admin: {
        label: 'Administrator',
        icon: Shield,
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        path: '/dashboard/admin',
        description: 'Kontrol penuh sistem'
    },
    guru: {
        label: 'Guru/Akademik',
        icon: GraduationCap,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        path: '/dashboard/akademik',
        description: 'Kelola akademik & santri'
    },
    bendahara: {
        label: 'Bendahara',
        icon: Wallet,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        path: '/dashboard/keuangan',
        description: 'Kelola keuangan'
    },
    pengasuh: {
        label: 'Pengasuh',
        icon: Wallet,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        path: '/dashboard/keuangan',
        description: 'Kelola keuangan'
    },
    pengurus: {
        label: 'Pengurus',
        icon: Shield,
        color: '#ea4335',
        bgColor: 'rgba(234, 67, 53, 0.1)',
        path: '/dashboard/pengurus',
        description: 'Pembinaan santri'
    },
    wali: {
        label: 'Wali Santri',
        icon: Users,
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.1)',
        path: '/wali/beranda',
        description: 'Pantau perkembangan anak'
    },
    ota: {
        label: 'Orang Tua Asuh',
        icon: Users,
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        path: '/dashboard/ota',
        description: 'Pantau dana & santri'
    },
    musyrif: {
        label: 'Musyrif',
        icon: BookMarked,
        color: '#059669',
        bgColor: 'rgba(5, 150, 105, 0.1)',
        path: '/dashboard/akademik',
        description: 'Pantau halaqoh & hafalan'
    }
}

/**
 * RoleSwitcher Component
 * @param {boolean} inDropdown - If true, renders as inline list (for profile dropdown)
 * @param {function} onSwitch - Callback after role switch (to close parent dropdown)
 */
const RoleSwitcher = ({ inDropdown = false, onSwitch }) => {
    const { roles, activeRole, switchRole, hasMultipleRoles } = useAuth()
    const navigate = useNavigate()
    const [switching, setSwitching] = useState(false)

    // Don't render if user has only one role
    if (!hasMultipleRoles()) {
        return null
    }

    const handleSwitch = async (role) => {
        if (role === activeRole || switching) return

        setSwitching(true)
        try {
            await switchRole(role)

            // Call parent callback to close dropdown
            if (onSwitch) onSwitch()

            // Navigate to the new dashboard
            const config = roleConfig[role]
            if (config?.path) {
                navigate(config.path)
            }
        } catch (error) {
            console.error('Failed to switch role:', error)
            alert('Gagal mengubah role: ' + error.message)
        } finally {
            setSwitching(false)
        }
    }

    // Inline mode for profile dropdown
    if (inDropdown) {
        return (
            <div className="role-switcher-inline">
                <div className="role-switcher-header-inline">
                    <RefreshCw size={14} />
                    <span>Ganti Role</span>
                </div>
                <div className="role-switcher-list-inline">
                    {roles.map(role => {
                        const config = roleConfig[role]
                        if (!config) return null

                        const RoleIcon = config.icon
                        const isActive = role === activeRole

                        return (
                            <button
                                key={role}
                                className={`role-item-inline ${isActive ? 'active' : ''}`}
                                onClick={() => handleSwitch(role)}
                                disabled={switching || isActive}
                                style={{
                                    '--role-color': config.color,
                                    '--role-bg': config.bgColor
                                }}
                            >
                                <div className="role-item-icon-inline">
                                    <RoleIcon size={16} />
                                </div>
                                <span className="role-item-label-inline">{config.label}</span>
                                {isActive && <Check size={14} className="role-item-check-inline" />}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Standalone mode (original) - not used anymore but kept for reference
    return null
}

export default RoleSwitcher
