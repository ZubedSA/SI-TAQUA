import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { 
    LayoutDashboard, 
    BookOpen, 
    PenLine, 
    BookMarked, 
    Download, 
    MoreHorizontal,
    Calendar,
    FileText,
    Activity,
    School,
    Users,
    Database,
    ChevronUp,
    X,
    GraduationCap,
    Home,
    Circle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const AcademicBottomNav = () => {
    const { activeRole } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [activeSheet, setActiveSheet] = useState(null)
    const sheetRef = useRef(null)

    // Only show for academic paths
    const isAcademicPath = location.pathname.startsWith('/akademik') || 
                          location.pathname.startsWith('/hafalan') || 
                          location.pathname.startsWith('/dashboard/akademik') ||
                          location.pathname.startsWith('/santri') ||
                          location.pathname.startsWith('/guru') ||
                          location.pathname.startsWith('/kelas') ||
                          location.pathname.startsWith('/halaqoh') ||
                          location.pathname.startsWith('/mapel') ||
                          location.pathname.startsWith('/semester') ||
                          location.pathname.startsWith('/laporan') ||
                          location.pathname.startsWith('/rekap-nilai')

    if (!isAcademicPath) return null

    const navItems = [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard/akademik' },
        { 
            id: 'nilai', 
            label: 'Nilai', 
            icon: PenLine,
            children: [
                { path: '/akademik/nilai/tahfizh/syahri', label: 'Ujian Syahri', icon: Calendar },
                { path: '/akademik/nilai/tahfizh/semester', label: "Qur'aniyah", icon: BookMarked },
                { path: '/akademik/nilai/madros/uas', label: 'Madrasiyah', icon: BookOpen },
                { path: '/akademik/nilai/perilaku', label: 'Perilaku & Catatan', icon: PenLine },
            ]
        },
        { 
            id: 'hafalan', 
            label: 'Hafalan', 
            icon: BookMarked,
            children: [
                { path: '/hafalan', label: 'Input Hafalan', icon: PenLine },
                { path: '/hafalan?tab=rekap', label: 'Rekap Hafalan', icon: FileText },
            ]
        },
        { 
            id: 'laporan', 
            label: 'Laporan', 
            icon: Download,
            children: [
                { path: '/laporan/ujian-syahri', label: 'Ujian Syahri', icon: Calendar },
                { path: '/laporan/ujian-semester', label: 'Ujian Semester', icon: FileText },
                { path: '/laporan/akademik-santri', label: 'Raport Santri', icon: Users },
                { path: '/rekap-nilai/grafik', label: 'Grafik', icon: Activity },
            ]
        },
        { 
            id: 'more', 
            label: 'Menu', 
            icon: MoreHorizontal,
            children: [
                { path: '/absensi/agenda', label: 'Agenda Mengajar', icon: BookOpen },
                // Admin specific items
                ...( (activeRole === 'admin' || activeRole === 'admin_akademik') ? [
                    { path: '/santri', label: 'Data Santri', icon: Users },
                    { path: '/guru', label: 'Data Guru', icon: GraduationCap },
                    { path: '/kelas', label: 'Data Kelas', icon: Home },
                    { path: '/halaqoh', label: 'Data Halaqoh', icon: Circle },
                    { path: '/akademik/kalender', label: 'Kalender Akademik', icon: Calendar },
                ] : [])
            ]
        }
    ]

    const handleNavClick = (item) => {
        if (item.children) {
            setActiveSheet(activeSheet === item.id ? null : item.id)
        } else {
            setActiveSheet(null)
            navigate(item.path)
        }
    }

    const isActive = (item) => {
        if (item.path) return location.pathname === item.path
        if (item.children) return item.children.some(child => location.pathname === child.path)
        return false
    }

    // Close sheet on backdrop click
    const closeSheet = () => setActiveSheet(null)

    return (
        <>
            {/* Bottom Sheet Overlay */}
            {activeSheet && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity animate-in fade-in duration-300 md:hidden"
                    onClick={closeSheet}
                />
            )}

            {/* Bottom Sheet Menu */}
            <div 
                className={`fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl z-[9999] shadow-2xl transition-transform duration-300 ease-out md:hidden
                    ${activeSheet ? 'translate-y-0' : 'translate-y-full'}
                `}
                style={{ maxHeight: '70vh', overflowY: 'auto' }}
            >
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">
                        {navItems.find(i => i.id === activeSheet)?.label || 'Menu'}
                    </h3>
                    <button onClick={closeSheet} className="p-2 bg-gray-100 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                    {activeSheet && navItems.find(i => i.id === activeSheet)?.children?.map((child, idx) => (
                        <NavLink
                            key={idx}
                            to={child.path}
                            onClick={closeSheet}
                            className={({ isActive }) => `
                                flex flex-col items-center gap-2 p-4 rounded-2xl transition-all
                                ${isActive 
                                    ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' 
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                }
                            `}
                        >
                            <child.icon size={24} className={location.pathname === child.path ? 'text-primary-600' : 'text-gray-400'} />
                            <span className="text-xs font-semibold text-center leading-tight">{child.label}</span>
                        </NavLink>
                    ))}
                </div>
                <div className="h-20" /> {/* Spacer for bottom nav */}
            </div>

            {/* Bottom Navbar Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-[10000] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                    {navItems.map((item) => {
                        const active = isActive(item)
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item)}
                                className={`flex flex-col items-center justify-center flex-1 transition-all relative
                                    ${active ? 'text-primary-600' : 'text-gray-400'}
                                `}
                            >
                                <div className={`p-1 rounded-xl transition-all duration-300 ${active ? 'scale-110' : ''}`}>
                                    <item.icon size={22} className={active ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                                </div>
                                <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${active ? 'opacity-100' : 'opacity-80'}`}>
                                    {item.label}
                                </span>
                                
                                {active && (
                                    <div className="absolute -top-1 w-1 h-1 bg-primary-600 rounded-full" />
                                )}
                                
                                {item.children && !activeSheet && (
                                    <ChevronUp size={10} className="absolute -top-1 right-1/4 text-gray-300 animate-bounce" />
                                )}
                            </button>
                        )
                    })}
                </div>
                {/* iPhone Home Indicator Spacer */}
                <div className="h-safe-area-bottom pb-2" />
            </div>

            <style>{`
                .h-safe-area-bottom {
                    height: env(safe-area-inset-bottom);
                }
            `}</style>
        </>
    )
}

export default AcademicBottomNav
