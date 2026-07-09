import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, QrCode, Users, UserCheck, LayoutDashboard, FileText, ClipboardList } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const AbsensiBottomNav = ({ onScanClick }) => {
    const { isAdmin, isAdminAbsensi } = useAuth()
    const location = useLocation()
    const isSystemAdmin = isAdmin() || isAdminAbsensi()

    const isItemActive = (path) => {
        const currentPath = location.pathname
        const currentSearch = location.search
        const itemPath = path.split('?')[0]
        const itemSearch = path.includes('?') ? '?' + path.split('?')[1] : ''
        if (itemSearch) return currentPath === itemPath && currentSearch === itemSearch
        return currentPath === itemPath && !currentSearch.includes('tab=')
    }

    const adminMenuItems = [
        { path: '/absensi/admin?tab=rekap', icon: Users, label: 'Rekap' },
        { path: '/absensi/admin?tab=staf', icon: UserCheck, label: 'Staf' },
        { path: '/absensi/admin?tab=jurnal', icon: Calendar, label: 'Agenda' },
        { path: '/absensi/admin?tab=laporan', icon: FileText, label: 'Laporan' },
        { path: '/absensi/admin-izin', icon: ClipboardList, label: 'Izin' },
        { path: '/absensi/admin?tab=qr', icon: QrCode, label: 'QR' },
    ]

    const teacherMenuItems = [
        { path: '/absensi/home', icon: Home, label: 'Home' },
        { path: '/absensi/izin', icon: ClipboardList, label: 'Izin' },
        { id: 'scan', icon: QrCode, label: 'Scan QR' },
        { path: '/absensi/agenda', icon: Calendar, label: 'Agenda' },
    ]

    const items = isSystemAdmin ? adminMenuItems : teacherMenuItems

    return (
        <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-[#0A2619]/95 backdrop-blur-md border border-[#143d2a]/80 px-2 py-1.5 z-[10000] shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[1.5rem]">
            <div className="flex justify-around items-center h-14 max-w-md mx-auto">
                {items.map((item, index) => {
                    if (item.id === 'scan') {
                        return (
                            <button
                                key={index}
                                onClick={onScanClick}
                                className="flex flex-col items-center justify-center flex-1 transition-all relative text-[#BCF32F]"
                            >
                                <div className="p-2 rounded-xl transition-all duration-300 scale-110 bg-[#BCF32F]/10 border border-[#BCF32F]/30 -mt-6 shadow-lg shadow-[#BCF32F]/20">
                                    <item.icon size={26} className="stroke-[2.5px]" />
                                </div>
                                <span className="text-[10px] font-bold mt-1 tracking-tight opacity-100">
                                    {item.label}
                                </span>
                            </button>
                        )
                    }

                    const active = isItemActive(item.path)
                    
                    return (
                        <NavLink
                            key={index}
                            to={item.path}
                            className={`flex flex-col items-center justify-center flex-1 transition-all relative
                                ${active ? 'text-[#BCF32F]' : 'text-gray-400'}
                            `}
                        >
                            <div className={`p-1 rounded-xl transition-all duration-300 ${active ? 'scale-110' : ''}`}>
                                <item.icon size={22} className={active ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                            </div>
                            <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${active ? 'opacity-100' : 'opacity-85'}`}>
                                {item.label}
                            </span>
                            
                            {active && (
                                <div className="absolute -top-1 w-1 h-1 bg-[#BCF32F] rounded-full" />
                            )}
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}

export default AbsensiBottomNav
