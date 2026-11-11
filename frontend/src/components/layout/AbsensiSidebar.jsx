import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, QrCode, LogOut, Users, UserCheck, FileText, ClipboardList, LayoutDashboard, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoFile from '../../assets/Logo_PTQA_075759.png'

const AbsensiSidebar = ({ onScanClick }) => {
    const { signOut, isAdmin, isAdminAbsensi } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const isSystemAdmin = isAdmin() || isAdminAbsensi()

    const teacherMenuItems = [
        { id: 'teacher-home', path: '/absensi/home', icon: Home, label: 'Beranda' },
        { id: 'teacher-gerbang', path: '/absensi/gerbang-pijar', icon: Sparkles, label: 'Gerbang Pijar' },
        { id: 'teacher-agenda', path: '/absensi/agenda', icon: Calendar, label: 'Agenda Mengajar' },
        { id: 'teacher-riwayat', path: '/absensi/riwayat', icon: ClipboardList, label: 'Riwayat Kehadiran' },
        { id: 'teacher-izin', path: '/absensi/izin', icon: FileText, label: 'Izin' },
    ]

    const adminMenuItems = [
        { id: 'admin-dashboard', path: '/absensi/admin?tab=dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'admin-kehadiran', path: '/absensi/admin?tab=kehadiran', icon: Users, label: 'Kehadiran' },
        { id: 'admin-agenda', path: '/absensi/admin?tab=agenda', icon: Calendar, label: 'Agenda & QR' },
        { id: 'admin-izin', path: '/absensi/admin-izin', icon: ClipboardList, label: 'Kelola Izin' },
    ]

    const menuItems = isSystemAdmin ? adminMenuItems : teacherMenuItems

    const handleSignOut = async () => {
        await signOut()
        navigate('/absensi/login')
    }

    const isItemActive = (path) => {
        const currentPath = location.pathname
        const currentSearch = location.search
        const itemPath = path.split('?')[0]
        const itemSearch = path.includes('?') ? '?' + path.split('?')[1] : ''

        if (currentPath !== itemPath) return false

        const currentTab = new URLSearchParams(currentSearch).get('tab') || 'dashboard'
        const itemTab = new URLSearchParams(itemSearch).get('tab') || ''

        if (itemTab) {
            if (itemTab === 'dashboard') {
                return currentTab === 'dashboard' || !new URLSearchParams(currentSearch).get('tab')
            }
            if (itemTab === 'kehadiran') {
                return ['kehadiran', 'rekap', 'staf', 'laporan'].includes(currentTab)
            }
            if (itemTab === 'agenda') {
                return ['agenda', 'jurnal', 'qr'].includes(currentTab)
            }
            return currentTab === itemTab
        }

        return !currentSearch.includes('tab=')
    }

    return (
        <aside className="fixed inset-y-0 left-0 w-[260px] bg-[#0A2619] border-r border-[#143d2a] z-50">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="h-16 flex items-center px-6 border-b border-[#143d2a] bg-[#0A2619]">
                    <div className="flex items-center gap-3">
                        <img
                            src={logoFile}
                            alt="Logo PTQA"
                            className="w-10 h-10 object-contain brightness-0 invert"
                            width="40"
                            height="40"
                        />
                        <span className="text-lg font-bold text-white tracking-tight">Portal Absensi</span>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const active = isItemActive(item.path)
                            return (
                                <li key={item.id || item.path} className="mb-1">
                                    <NavLink
                                        to={item.path}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                                            ${active 
                                                ? 'bg-[#BCF32F] text-black shadow-sm shadow-[#BCF32F]/20' 
                                                : 'text-gray-400 hover:bg-[#143d2a] hover:text-white'}
                                        `}
                                    >
                                        <item.icon size={20} className={`shrink-0 ${active ? 'text-black' : 'text-gray-400 group-hover:text-white'}`} />
                                        <span className="truncate">{item.label}</span>
                                    </NavLink>
                                </li>
                            )
                        })}

                        {/* Special Scan QR Button - Only for Teachers */}
                        {!isSystemAdmin && (
                            <li className="mb-1 mt-4">
                                <button
                                    onClick={onScanClick}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-[#BCF32F] hover:bg-[#143d2a] border border-[#BCF32F]/30"
                                >
                                    <QrCode size={20} className="shrink-0" />
                                    <span className="truncate">Scan Kode QR</span>
                                </button>
                            </li>
                        )}
                    </ul>
                </nav>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 w-full p-4 border-t border-[#143d2a] bg-[#0A2619]">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={20} className="shrink-0" />
                        <span className="truncate">Keluar Sesi</span>
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default AbsensiSidebar
