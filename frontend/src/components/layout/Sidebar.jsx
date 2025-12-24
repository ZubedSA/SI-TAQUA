import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Home,
    Circle,
    BookOpen,
    PenLine,
    FileText,
    BookMarked,
    CalendarCheck,
    Calendar,
    Download,
    ClipboardList,
    LogOut,
    X,
    Settings,
    UserCircle,
    HardDrive,
    Activity
} from 'lucide-react'
import './Sidebar.css'

// Menu items dengan role yang diizinkan
// roles: ['admin', 'guru', 'wali'] - jika undefined/kosong = semua role
const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'guru'] },
    { path: '/santri', icon: Users, label: 'Data Santri', roles: ['admin'] },
    { path: '/guru', icon: GraduationCap, label: 'Data Guru', roles: ['admin'] },
    { path: '/kelas', icon: Home, label: 'Kelas', roles: ['admin'] },
    { path: '/halaqoh', icon: Circle, label: 'Halaqoh', roles: ['admin', 'guru'] },
    { path: '/mapel', icon: BookOpen, label: 'Mapel', roles: ['admin'] },
    { path: '/input-nilai', icon: PenLine, label: 'Input Nilai', roles: ['admin', 'guru'] },
    { path: '/rekap-nilai', icon: FileText, label: 'Rekap Nilai', roles: ['admin', 'guru'] },
    { path: '/hafalan', icon: BookMarked, label: 'Hafalan', roles: ['admin', 'guru'] },
    { path: '/presensi', icon: CalendarCheck, label: 'Pembinaan Santri', roles: ['admin', 'guru'] },
    { path: '/semester', icon: Calendar, label: 'Semester', roles: ['admin'] },
    { path: '/laporan', icon: Download, label: 'Laporan', roles: ['admin', 'guru'] },
    { path: '/wali-santri', icon: UserCircle, label: 'Portal Wali', roles: ['admin', 'guru', 'wali'] },
    { path: '/audit-log', icon: ClipboardList, label: 'Audit Log', roles: ['admin'] },
    { path: '/system-status', icon: Activity, label: 'Status Sistem', roles: ['admin'] },
    { path: '/pengaturan', icon: Settings, label: 'Pengaturan', roles: ['admin'] },
]

const Sidebar = ({ mobileOpen, onClose }) => {
    const { signOut, role } = useAuth()
    const navigate = useNavigate()

    // Filter menu berdasarkan role user
    const filteredMenuItems = menuItems.filter(item => {
        if (!item.roles || item.roles.length === 0) return true
        return item.roles.includes(role)
    })

    const handleLogout = async () => {
        try {
            await signOut()
        } catch (error) {
            console.log('Logout notice:', error.message)
        }
        navigate('/login')
    }

    const handleNavClick = () => {
        if (onClose) onClose()
    }

    const sidebarStyle = {
        transform: mobileOpen ? 'translateX(0)' : undefined
    }

    return (
        <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={sidebarStyle}>
            <div className="sidebar-header">
                <div className="logo">
                    <img src="/logo-white.png" alt="Logo" className="logo-image" />
                    <div className="logo-text">
                        <span className="logo-title">PTQA BATUAN</span>
                        <span className="logo-subtitle">Sistem Akademik</span>
                    </div>
                </div>
                <button className="sidebar-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            <nav className="sidebar-nav">
                <ul className="nav-list">
                    {filteredMenuItems.map((item) => (
                        <li key={item.path} className="nav-item">
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                onClick={handleNavClick}
                            >
                                <span className="nav-icon">
                                    <item.icon size={20} />
                                </span>
                                <span className="nav-text">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <button className="nav-link logout-link" onClick={handleLogout}>
                    <span className="nav-icon">
                        <LogOut size={20} />
                    </span>
                    <span className="nav-text">Keluar</span>
                </button>
            </div>
        </aside>
    )
}

export default Sidebar

