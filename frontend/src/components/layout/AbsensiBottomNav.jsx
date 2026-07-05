import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Calendar, QrCode, Users, UserCheck, LayoutDashboard, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const AbsensiBottomNav = ({ onScanClick }) => {
    const { isAdmin, isAdminAbsensi } = useAuth()
    const isSystemAdmin = isAdmin() || isAdminAbsensi()

    if (isSystemAdmin) {
        return (
            <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 lg:hidden">
                <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-[2.5rem] flex items-center justify-around px-2 py-2 max-w-md mx-auto">
                    {/* Beranda Admin */}
                    <NavLink 
                        to="/absensi/admin?tab=rekap" 
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all duration-300
                            ${isActive && !window.location.search.includes('tab=staf') && !window.location.search.includes('tab=jurnal') && !window.location.search.includes('tab=qr') 
                                ? 'text-emerald-600 scale-110 font-bold' : 'text-gray-400'}
                        `}
                    >
                        <Users size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Rekap Santri</span>
                    </NavLink>



                    {/* Staf */}
                    <NavLink 
                        to="/absensi/admin?tab=staf" 
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all duration-300
                            ${isActive && window.location.search.includes('tab=staf') ? 'text-emerald-600 scale-110 font-bold' : 'text-gray-400'}
                        `}
                    >
                        <UserCheck size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Staf</span>
                    </NavLink>

                    {/* Jurnal */}
                    <NavLink 
                        to="/absensi/admin?tab=jurnal" 
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all duration-300
                            ${isActive && window.location.search.includes('tab=jurnal') ? 'text-emerald-600 scale-110 font-bold' : 'text-gray-400'}
                        `}
                    >
                        <Calendar size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Agenda</span>
                    </NavLink>

                    {/* Laporan */}
                    <NavLink 
                        to="/absensi/admin?tab=laporan" 
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all duration-300
                            ${isActive && window.location.search.includes('tab=laporan') ? 'text-emerald-600 scale-110 font-bold' : 'text-gray-400'}
                        `}
                    >
                        <FileText size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Laporan</span>
                    </NavLink>

                    {/* QR Code */}
                    <NavLink 
                        to="/absensi/admin?tab=qr" 
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all duration-300
                            ${isActive && window.location.search.includes('tab=qr') ? 'text-emerald-600 scale-110 font-bold' : 'text-gray-400'}
                        `}
                    >
                        <QrCode size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">QR Kode</span>
                    </NavLink>
                </div>
            </nav>
        )
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2 lg:hidden">
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-[2.5rem] flex items-center justify-between px-4 py-2 max-w-md mx-auto relative">
                {/* Home */}
                <NavLink 
                    to="/absensi/home" 
                    className={({ isActive }) => `
                        flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-2xl transition-all duration-300
                        ${isActive ? 'text-emerald-600 scale-110' : 'text-gray-400 hover:text-gray-600'}
                    `}
                >
                    <Home size={22} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
                </NavLink>

                {/* Scan QR - Central Floating-ish Button */}
                <div className="relative -mt-10 px-2">
                    <button 
                        onClick={onScanClick}
                        className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white rounded-2xl shadow-xl shadow-emerald-200 flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-300 group"
                    >
                        <QrCode size={28} className="group-hover:rotate-12 transition-transform" />
                        
                        {/* Pulse effect */}
                        <span className="absolute inset-0 rounded-2xl bg-emerald-400 animate-ping opacity-20 pointer-events-none"></span>
                    </button>
                    <span className="absolute left-1/2 -translate-x-1/2 top-18 text-[10px] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                        Scan QR
                    </span>
                </div>

                {/* Agenda */}
                <NavLink 
                    to="/absensi/agenda" 
                    className={({ isActive }) => `
                        flex flex-col items-center justify-center gap-1 w-20 py-2 rounded-2xl transition-all duration-300
                        ${isActive ? 'text-emerald-600 scale-110' : 'text-gray-400 hover:text-gray-600'}
                    `}
                >
                    <Calendar size={22} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Agenda</span>
                </NavLink>

                {/* Background active indicator (optional, maybe too complex for now) */}
            </div>
        </nav>
    )
}

export default AbsensiBottomNav
