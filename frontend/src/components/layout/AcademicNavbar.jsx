import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { 
    LayoutDashboard, 
    BookOpen, 
    PenLine, 
    BookMarked, 
    Download, 
    ChevronDown, 
    Calendar,
    FileText,
    Activity,
    School,
    Users,
    GraduationCap,
    Home,
    Circle,
    Database
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const AcademicNavbar = () => {
    const { activeRole } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [activeDropdown, setActiveDropdown] = useState(null)
    const dropdownRef = useRef(null)
    const scrollRef = useRef(null)

    // Only show for academic paths
    const isAcademicPath = location.pathname.startsWith('/akademik') || 
                          location.pathname.startsWith('/hafalan') || 
                          location.pathname.startsWith('/dashboard/akademik') ||
                          location.pathname.startsWith('/santri') ||
                          location.pathname.startsWith('/guru')

    if (!isAcademicPath) return null

    // Academic Menu Configuration (Simplified for Mobile Navbar)
    const getAcademicMenu = () => {
        const menus = [
            { 
                id: 'dashboard', 
                label: 'Dashboard', 
                icon: LayoutDashboard, 
                path: '/dashboard/akademik' 
            },
            { 
                id: 'jurnal', 
                label: 'Agenda', 
                icon: BookOpen, 
                path: '/absensi/agenda' 
            },
            { 
                id: 'nilai', 
                label: 'Nilai', 
                icon: PenLine,
                children: [
                    { path: '/akademik/nilai/tahfizh/syahri', label: 'Ujian Syahri', icon: Calendar },
                    { path: '/akademik/nilai/tahfizh/semester', label: "Qur'aniyah", icon: BookMarked },
                    { path: '/akademik/nilai/madros/uas', label: 'Madrasiyah', icon: BookOpen },
                    { path: '/akademik/nilai/perilaku', label: 'Perilaku', icon: PenLine },
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
                    { path: '/laporan/akademik-santri', label: 'Raport', icon: Users },
                    { path: '/rekap-nilai/grafik', label: 'Grafik', icon: Activity },
                ]
            }
        ]

        if (activeRole === 'admin' || activeRole === 'admin_akademik') {
            menus.splice(1, 0, {
                id: 'data-pondok',
                label: 'Data Pondok',
                icon: Database,
                children: [
                    { path: '/santri', label: 'Santri', icon: Users },
                    { path: '/guru', label: 'Guru', icon: GraduationCap },
                    { path: '/kelas', label: 'Kelas', icon: Home },
                    { path: '/halaqoh', label: 'Halaqoh', icon: Circle },
                ]
            })
        }

        return menus
    }

    const academicMenu = getAcademicMenu()

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMenuClick = (item) => {
        if (item.children) {
            setActiveDropdown(activeDropdown === item.id ? null : item.id)
        } else {
            setActiveDropdown(null)
            navigate(item.path)
        }
    }

    const isActive = (item) => {
        if (item.path) return location.pathname === item.path
        if (item.children) return item.children.some(child => location.pathname === child.path)
        return false
    }

    return (
        <div className="lg:hidden sticky top-16 z-30 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
            <div className="relative overflow-hidden">
                <div 
                    ref={scrollRef}
                    className="flex items-center gap-1 px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth"
                >
                    {academicMenu.map((item) => (
                        <div key={item.id} className="relative flex-shrink-0">
                            <button
                                onClick={() => handleMenuClick(item)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
                                    ${isActive(item) 
                                        ? 'bg-primary-600 text-white shadow-md shadow-primary-200' 
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                                {item.children && (
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === item.id ? 'rotate-180' : ''}`} />
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {activeDropdown === item.id && item.children && (
                                <div 
                                    ref={dropdownRef}
                                    className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95"
                                >
                                    {item.children.map((child, idx) => (
                                        <NavLink
                                            key={idx}
                                            to={child.path}
                                            onClick={() => setActiveDropdown(null)}
                                            className={({ isActive }) => `
                                                flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                                                ${isActive 
                                                    ? 'text-primary-600 bg-primary-50 font-semibold' 
                                                    : 'text-gray-700 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <child.icon size={16} className={location.pathname === child.path ? 'text-primary-600' : 'text-gray-400'} />
                                            <span>{child.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {/* Visual Indicators for scrolling */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}

export default AcademicNavbar
