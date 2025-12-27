import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
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
    Activity,
    Wallet,
    ChevronDown,
    ChevronRight,
    ArrowUpCircle,
    ArrowDownCircle,
    Receipt,
    CreditCard,
    Tag,
    FileBarChart,
    PiggyBank,
    CheckCircle,
    TrendingUp,
    Database,
    School,
    Shield,
    Eye,
    UserCog,
    BarChart3,
    FileSearch,
    ScrollText
} from 'lucide-react'
import './Sidebar.css'

// ============ ADMIN MENU - Controller/Audit Focus ============
// Admin = controller, fokus kontrol & audit, menu sedikit tapi kuat
const adminMenuItems = [
    { path: '/dashboard/admin', icon: LayoutDashboard, label: 'Overview' },

    // Users & Roles
    {
        id: 'users-roles',
        icon: UserCog,
        label: 'Users & Roles',
        children: [
            { path: '/users', icon: Users, label: 'Manajemen User' },
            { path: '/roles', icon: Shield, label: 'Roles & Akses' },
        ]
    },

    // Master Data
    {
        id: 'master-data',
        icon: Database,
        label: 'Master Data',
        children: [
            { path: '/santri', icon: Users, label: 'Data Santri' },
            { path: '/guru', icon: GraduationCap, label: 'Data Guru' },
            { path: '/kelas', icon: Home, label: 'Kelas' },
            { path: '/mapel', icon: BookOpen, label: 'Mata Pelajaran' },
            { path: '/halaqoh', icon: Circle, label: 'Halaqoh' },
            { path: '/semester', icon: Calendar, label: 'Semester' },
        ]
    },

    // Monitoring Akademik
    {
        id: 'monitoring-akademik',
        icon: Eye,
        label: 'Monitoring Akademik',
        children: [
            { path: '/dashboard/akademik', icon: School, label: 'Dashboard Akademik' },
            { path: '/rekap-nilai', icon: FileText, label: 'Rekap Nilai' },
            { path: '/hafalan', icon: BookMarked, label: 'Progress Hafalan' },
            { path: '/presensi', icon: CalendarCheck, label: 'Kehadiran' },
            { path: '/laporan', icon: FileSearch, label: 'Laporan' },
        ]
    },

    // Monitoring Keuangan
    {
        id: 'monitoring-keuangan',
        icon: BarChart3,
        label: 'Monitoring Keuangan',
        children: [
            { path: '/dashboard/keuangan', icon: Wallet, label: 'Dashboard Keuangan' },
            { path: '/keuangan/kas/laporan', icon: FileBarChart, label: 'Laporan Kas' },
            { path: '/keuangan/pembayaran/laporan', icon: Receipt, label: 'Laporan Pembayaran' },
            { path: '/keuangan/dana/laporan', icon: TrendingUp, label: 'Laporan Penyaluran' },
        ]
    },

    // Logs
    {
        id: 'logs',
        icon: ScrollText,
        label: 'Logs',
        children: [
            { path: '/audit-log', icon: ClipboardList, label: 'Audit Log' },
            { path: '/system-status', icon: Activity, label: 'Status Sistem' },
        ]
    },


    // Pengaturan
    { path: '/pengaturan', icon: Settings, label: 'Pengaturan' },
]

// ============ OPERATOR MENU - Guru/Akademik ============
const operatorMenuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['guru', 'bendahara', 'pengasuh'] },

    // Data Pondok Menu dengan Nested Submenu
    {
        id: 'data-pondok',
        icon: Database,
        label: 'Data Pondok',
        roles: ['admin', 'guru'],
        children: [
            { path: '/santri', icon: Users, label: 'Data Santri', roles: ['admin', 'guru'] },
            { path: '/guru', icon: GraduationCap, label: 'Data Guru', roles: ['admin', 'guru'] },
            { path: '/kelas', icon: Home, label: 'Kelas', roles: ['admin', 'guru'] },
            { path: '/mapel', icon: BookOpen, label: 'Mapel', roles: ['admin', 'guru'] },
            { path: '/halaqoh', icon: Circle, label: 'Halaqoh', roles: ['admin', 'guru'] },
        ]
    },

    // Akademik Menu dengan Nested Submenu
    {
        id: 'akademik',
        icon: School,
        label: 'Akademik',
        roles: ['admin', 'guru'],
        children: [
            { path: '/input-nilai', icon: PenLine, label: 'Input Nilai', roles: ['admin', 'guru'] },
            { path: '/rekap-nilai', icon: FileText, label: 'Rekap Nilai', roles: ['admin', 'guru'] },
            { path: '/hafalan', icon: BookMarked, label: 'Hafalan', roles: ['admin', 'guru'] },
            { path: '/presensi', icon: CalendarCheck, label: 'Pembinaan Santri', roles: ['admin', 'guru'] },
            { path: '/semester', icon: Calendar, label: 'Semester', roles: ['admin', 'guru'] },
            { path: '/laporan', icon: Download, label: 'Laporan', roles: ['admin', 'guru'] },
        ]
    },

    // ============ KEUANGAN MENU (Bendahara) - Flattened Structure ============
    // Alur KAS - Main menu (bukan submenu dari Keuangan)
    {
        id: 'alur-kas',
        icon: PiggyBank,
        label: 'Arus KAS',
        roles: ['admin', 'bendahara', 'pengasuh'],
        children: [
            { path: '/keuangan/kas/pemasukan', icon: ArrowUpCircle, label: 'Pemasukan' },
            { path: '/keuangan/kas/pengeluaran', icon: ArrowDownCircle, label: 'Pengeluaran' },
            { path: '/keuangan/kas/laporan', icon: FileBarChart, label: 'Laporan Kas' },
        ]
    },

    // Pembayaran - Main menu (bukan submenu dari Keuangan)
    {
        id: 'pembayaran',
        icon: CreditCard,
        label: 'Pembayaran',
        roles: ['admin', 'bendahara', 'pengasuh'],
        children: [
            { path: '/keuangan/pembayaran/tagihan', icon: Receipt, label: 'Tagihan Santri' },
            { path: '/keuangan/pembayaran/kategori', icon: Tag, label: 'Kategori' },
            { path: '/keuangan/pembayaran/bayar', icon: CreditCard, label: 'Pembayaran Santri' },
            { path: '/keuangan/pembayaran/laporan', icon: FileBarChart, label: 'Laporan Pembayaran' },
        ]
    },

    // Penyaluran Dana - Main menu (bukan submenu dari Keuangan)
    {
        id: 'penyaluran',
        icon: TrendingUp,
        label: 'Penyaluran Dana',
        roles: ['admin', 'bendahara', 'pengasuh'],
        children: [
            { path: '/keuangan/dana/anggaran', icon: PiggyBank, label: 'Anggaran', roles: ['admin', 'bendahara'] },
            { path: '/keuangan/dana/persetujuan', icon: CheckCircle, label: 'Persetujuan' },
            { path: '/keuangan/dana/realisasi', icon: TrendingUp, label: 'Realisasi Dana' },
            { path: '/keuangan/dana/laporan', icon: FileBarChart, label: 'Laporan Penyaluran' },
        ]
    },

    // Portal Wali - hanya untuk admin dan wali (BUKAN guru)
    { path: '/wali-santri', icon: UserCircle, label: 'Portal Wali', roles: ['admin', 'wali'] },

    // Admin-only menus
    { path: '/audit-log', icon: ClipboardList, label: 'Audit Log', roles: ['admin'] },
    { path: '/system-status', icon: Activity, label: 'Status Sistem', roles: ['admin'] },
    { path: '/pengaturan', icon: Settings, label: 'Pengaturan', roles: ['admin'] },
]

const Sidebar = ({ mobileOpen, onClose }) => {
    const { signOut, activeRole } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [openMenus, setOpenMenus] = useState({})

    // Select menu based on active role
    // Admin gets special controller menu, others get operator menu
    const baseMenuItems = activeRole === 'admin' ? adminMenuItems : operatorMenuItems

    // Filter menu berdasarkan role user (for operator menu)
    const filteredMenuItems = baseMenuItems.filter(item => {
        if (!item.roles || item.roles.length === 0) return true
        return item.roles.includes(activeRole)
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

    // Get all top-level menu IDs (both admin and operator menus)
    const topLevelMenuIds = [
        // Admin menu IDs
        'users-roles', 'master-data', 'monitoring-akademik', 'monitoring-keuangan', 'logs',
        // Operator menu IDs
        'data-pondok', 'akademik', 'alur-kas', 'pembayaran', 'penyaluran'
    ]

    // No more nested submenus since keuangan items are now top-level
    const nestedSubmenuIds = []

    const toggleMenu = (menuId) => {
        setOpenMenus(prev => {
            const isCurrentlyOpen = prev[menuId]

            // If closing, just close it
            if (isCurrentlyOpen) {
                return {
                    ...prev,
                    [menuId]: false
                }
            }

            // Check if this is a top-level menu
            const isTopLevel = topLevelMenuIds.includes(menuId)

            // Check if this is a nested submenu (inside keuangan)
            const isNestedSubmenu = nestedSubmenuIds.includes(menuId)

            if (isTopLevel) {
                // Close all other top-level menus AND their nested children
                const newState = {}
                Object.keys(prev).forEach(key => {
                    // Close other top-level menus
                    if (topLevelMenuIds.includes(key)) {
                        newState[key] = false
                    }
                    // Close all nested submenus when switching top-level
                    if (nestedSubmenuIds.includes(key)) {
                        newState[key] = false
                    }
                })
                newState[menuId] = true
                return newState
            }

            if (isNestedSubmenu) {
                // Close only other nested submenus, keep parent open
                const newState = { ...prev }
                nestedSubmenuIds.forEach(key => {
                    if (key !== menuId) {
                        newState[key] = false
                    }
                })
                newState[menuId] = true
                return newState
            }

            // Default: just toggle
            return {
                ...prev,
                [menuId]: true
            }
        })
    }

    // Check if any child path is active
    const isChildActive = (children) => {
        if (!children) return false
        return children.some(child => {
            if (child.path) {
                return location.pathname === child.path || location.pathname.startsWith(child.path + '/')
            }
            if (child.children) {
                return isChildActive(child.children)
            }
            return false
        })
    }

    useEffect(() => {
        const newOpenMenus = {}
        const scanItems = (items) => {
            items.forEach(item => {
                if (item.children) {
                    if (isChildActive(item.children)) {
                        newOpenMenus[item.id] = true
                    }
                    scanItems(item.children)
                }
            })
        }
        scanItems(baseMenuItems)
        setOpenMenus(newOpenMenus)
    }, [location.pathname, activeRole])

    // Render submenu item
    const renderMenuItem = (item, level = 0) => {
        // Filter children by role if they exist
        const filteredChildren = item.children?.filter(child => {
            if (!child.roles || child.roles.length === 0) return true
            return child.roles.includes(activeRole)
        })

        const hasChildren = filteredChildren && filteredChildren.length > 0
        const isOpen = openMenus[item.id]
        const paddingLeft = 14 + (level * 12)

        if (hasChildren) {
            return (
                <li key={item.id} className="nav-item has-submenu">
                    <button
                        className={`nav-link submenu-toggle ${isOpen ? 'open' : ''} ${isChildActive(item.children) ? 'active' : ''}`}
                        onClick={() => toggleMenu(item.id)}
                        style={{ paddingLeft: `${paddingLeft}px` }}
                    >
                        <span className="nav-icon">
                            <item.icon size={level === 0 ? 20 : 16} />
                        </span>
                        <span className="nav-text">{item.label}</span>
                        <span className="submenu-arrow">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                    </button>
                    <ul className={`submenu ${isOpen ? 'open' : ''}`}>
                        {filteredChildren.map(child => renderMenuItem(child, level + 1))}
                    </ul>
                </li>
            )
        }

        return (
            <li key={item.path} className="nav-item">
                <NavLink
                    to={item.path}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={handleNavClick}
                    style={{ paddingLeft: `${paddingLeft}px` }}
                >
                    <span className="nav-icon">
                        <item.icon size={level === 0 ? 20 : 16} />
                    </span>
                    <span className="nav-text">{item.label}</span>
                </NavLink>
            </li>
        )
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
                        <span className="logo-title">Si-Taqua</span>
                    </div>
                </div>
                <button className="sidebar-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>
            </div>

            <nav className="sidebar-nav">
                <ul className="nav-list">
                    {filteredMenuItems.map((item) => renderMenuItem(item))}
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
