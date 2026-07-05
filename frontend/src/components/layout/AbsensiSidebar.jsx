import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Calendar, QrCode, LogOut, LayoutDashboard, Users, UserCheck, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoFile from '../../assets/Logo_PTQA_075759.png'

const AbsensiSidebar = ({ onScanClick }) => {
    const { signOut, isAdmin, isAdminAbsensi } = useAuth()
    const navigate = useNavigate()

    const isSystemAdmin = isAdmin() || isAdminAbsensi()

    const teacherMenuItems = [
        { id: 'teacher-home', path: '/absensi/home', icon: Home, label: 'Beranda' },
        { id: 'teacher-agenda', path: '/absensi/agenda', icon: Calendar, label: 'Agenda Mengajar' },
    ]

    const adminMenuItems = [
        { id: 'admin-rekap', path: '/absensi/admin?tab=rekap', icon: Users, label: 'Rekap Santri' },
        { id: 'admin-staf', path: '/absensi/admin?tab=staf', icon: UserCheck, label: 'Kehadiran Staf' },
        { id: 'admin-jurnal', path: '/absensi/admin?tab=jurnal', icon: Calendar, label: 'Agenda Mengajar' },
        { id: 'admin-laporan', path: '/absensi/admin?tab=laporan', icon: FileText, label: 'Laporan Kehadiran' },
        { id: 'admin-qr', path: '/absensi/admin?tab=qr', icon: QrCode, label: 'Manajemen QR Code' },

    ]

    const menuItems = isSystemAdmin ? adminMenuItems : teacherMenuItems

    const handleSignOut = async () => {
        await signOut()
        navigate('/absensi/login')
    }

    return (
        <aside className="fixed top-0 left-0 bottom-0 w-[280px] bg-white border-r border-gray-100 z-50">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-8 border-b border-gray-50 text-center">
                        <img src={logoFile} alt="Logo" className="h-16 mx-auto mb-4" width="64" height="64" />
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Portal Absensi</h2>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">SITAQUA PTQA</p>
                    </div>

                    {/* Menu Items */}
                    <nav className="flex-1 p-4 space-y-2 mt-4">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.id || item.path}
                                to={item.path}
                                className={({ isActive }) => `
                                    flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all group
                                    ${isActive 
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                                        : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-700'}
                                `}
                            >
                                <item.icon size={22} className="group-hover:scale-110 transition-transform" />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}

                        {/* Special Scan QR Button - Only for Teachers */}
                        {!isSystemAdmin && (
                            <button
                                onClick={() => {
                                    onScanClick()
                                }}
                                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all text-indigo-600 hover:bg-indigo-50 group"
                            >
                                <QrCode size={22} className="group-hover:rotate-12 transition-transform" />
                                <span>Scan Kode QR</span>
                            </button>
                        )}
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-50 space-y-2">
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-4 px-6 py-3 rounded-xl font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                            <LogOut size={20} />
                            <span className="text-sm">Keluar Sesi</span>
                        </button>
                    </div>
                </div>
            </aside>
    )
}

export default AbsensiSidebar
