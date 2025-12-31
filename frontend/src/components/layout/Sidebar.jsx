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
    Trophy,
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
    ScrollText,
    AlertTriangle,
    Bell,
    Newspaper,
    Archive
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
            { path: '/rekap-nilai/syahri', icon: FileText, label: 'Rekap Nilai Syahri' },
            { path: '/rekap-nilai/semester', icon: FileText, label: 'Rekap Nilai Semester' },
            { path: '/hafalan', icon: BookMarked, label: 'Progress Hafalan' },
            { path: '/presensi', icon: CalendarCheck, label: 'Kehadiran' },
            { path: '/laporan/akademik-santri', icon: FileSearch, label: 'Laporan Akademik' },
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

    // Portal Wali - untuk testing
    { path: '/wali/beranda', icon: UserCircle, label: 'Portal Wali (Test)' },

    // Pengaturan
    { path: '/pengaturan', icon: Settings, label: 'Pengaturan' },
]

// ============ PENGURUS MENU - Pembinaan Santri ============
const pengurusMenuItems = [
    { path: '/dashboard/pengurus', icon: LayoutDashboard, label: 'Overview' },

    // Pembinaan
    {
        id: 'pembinaan',
        icon: UserCog,
        label: 'Pembinaan',
        children: [
            { path: '/pengurus/pelanggaran', icon: AlertTriangle, label: 'Pelanggaran' },
            { path: '/pengurus/santri-bermasalah', icon: Users, label: 'Santri Bermasalah' },
        ]
    },

    // Informasi
    {
        id: 'informasi',
        icon: Bell,
        label: 'Informasi',
        children: [
            { path: '/pengurus/pengumuman', icon: Bell, label: 'Pengumuman' },
            { path: '/pengurus/informasi', icon: FileText, label: 'Info Pondok' },
            { path: '/pengurus/buletin', icon: Newspaper, label: 'Buletin' },
        ]
    },

    // Arsip
    { path: '/pengurus/arsip', icon: Archive, label: 'Arsip' },
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

    // Akademik Menu dengan Deep Nested Submenu - Sesuai struktur folder target
    {
        id: 'akademik',
        icon: School,
        label: 'Akademik',
        roles: ['admin', 'guru'],
        children: [
            // Input Nilai - root menu
            {
                id: 'input-nilai',
                icon: PenLine,
                label: 'Input Nilai',
                roles: ['admin', 'guru'],
                children: [
                    // Ujian Syahri (langsung tanpa submenu tahfizhiyah)
                    { path: '/akademik/nilai/tahfizh/syahri', icon: Calendar, label: 'Ujian Syahri', roles: ['admin', 'guru'] },
                    // Ujian Semester dengan submenu Tahfiziyah dan Madrasiyah
                    {
                        id: 'ujian-semester',
                        icon: CalendarCheck,
                        label: 'Ujian Semester',
                        roles: ['admin', 'guru'],
                        children: [
                            {
                                id: 'nilai-tahfizh',
                                icon: BookMarked,
                                label: 'Tahfiziyah',
                                roles: ['admin', 'guru'],
                                children: [
                                    { path: '/akademik/nilai/tahfizh/semester', icon: CalendarCheck, label: 'Ujian Semester', roles: ['admin', 'guru'] },
                                ]
                            },
                            {
                                id: 'nilai-madros',
                                icon: BookOpen,
                                label: 'Madrasiyah',
                                roles: ['admin', 'guru'],
                                children: [
                                    { path: '/akademik/nilai/madros/harian', icon: PenLine, label: 'Ujian Harian', roles: ['admin', 'guru'] },
                                    { path: '/akademik/nilai/madros/uts', icon: FileText, label: 'UTS', roles: ['admin', 'guru'] },
                                    { path: '/akademik/nilai/madros/uas', icon: ClipboardList, label: 'UAS', roles: ['admin', 'guru'] },
                                ]
                            },
                        ]
                    },
                ]
            },
            // Hafalan Menu
            {
                id: 'hafalan-menu',
                icon: BookMarked,
                label: 'Hafalan',
                roles: ['admin', 'guru'],
                children: [
                    { path: '/hafalan', icon: PenLine, label: 'Input Hafalan', roles: ['admin', 'guru'] },
                    { path: '/hafalan?tab=rekap', icon: FileText, label: 'Rekap Hafalan', roles: ['admin', 'guru'] },
                ]
            },
            // Laporan Menu - sesuai struktur target
            {
                id: 'laporan-akademik',
                icon: Download,
                label: 'Laporan',
                roles: ['admin', 'guru'],
                children: [
                    // Laporan Nilai
                    {
                        id: 'laporan-nilai',
                        icon: FileText,
                        label: 'Laporan Nilai',
                        roles: ['admin', 'guru'],
                        children: [
                            { path: '/laporan/ujian-syahri', icon: Calendar, label: 'Ujian Syahri', roles: ['admin', 'guru'] },
                            { path: '/laporan/ujian-semester', icon: CalendarCheck, label: 'Ujian Semester', roles: ['admin', 'guru'] },
                        ]
                    },
                    // Laporan Hafalan - dengan Harian, Mingguan, Bulanan, Semester
                    {
                        id: 'laporan-hafalan',
                        icon: BookMarked,
                        label: 'Laporan Hafalan',
                        roles: ['admin', 'guru'],
                        children: [
                            { path: '/laporan/hafalan-harian', icon: Calendar, label: 'Harian', roles: ['admin', 'guru'] },
                            { path: '/laporan/rekap-mingguan', icon: Calendar, label: 'Mingguan', roles: ['admin', 'guru'] },
                            { path: '/hafalan/pencapaian/bulanan', icon: Calendar, label: 'Bulanan', roles: ['admin', 'guru'] },
                            { path: '/hafalan/pencapaian/semester', icon: CalendarCheck, label: 'Semester', roles: ['admin', 'guru'] },
                        ]
                    },
                    // Laporan Akademik
                    {
                        id: 'laporan-akademik-santri',
                        icon: Users,
                        label: 'Laporan Akademik',
                        roles: ['admin', 'guru'],
                        children: [
                            { path: '/laporan/akademik-santri', icon: Users, label: 'Raport', roles: ['admin', 'guru'] },
                            { path: '/rekap-nilai/grafik', icon: Activity, label: 'Grafik Perkembangan', roles: ['admin', 'guru'] },
                        ]
                    },
                ]
            },
            // Pembinaan Santri (existing)
            { path: '/presensi', icon: CalendarCheck, label: 'Pembinaan Santri', roles: ['admin', 'guru'] },
            // Semester (existing)
            { path: '/semester', icon: Calendar, label: 'Semester', roles: ['admin', 'guru'] },
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
            { path: '/keuangan/dana/persetujuan', icon: CheckCircle, label: 'Persetujuan', roles: ['admin', 'pengasuh'] },
            { path: '/keuangan/dana/realisasi', icon: TrendingUp, label: 'Realisasi Dana' },
            { path: '/keuangan/dana/laporan', icon: FileBarChart, label: 'Laporan Penyaluran' },
        ]
    },

    // Portal Wali - hanya untuk admin dan wali (BUKAN guru)
    { path: '/wali/beranda', icon: UserCircle, label: 'Portal Wali', roles: ['admin', 'wali'] },

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
    // Admin gets special controller menu, pengurus gets pembinaan menu, others get operator menu
    const baseMenuItems =
        activeRole === 'admin' ? adminMenuItems :
            activeRole === 'pengurus' ? pengurusMenuItems :
                operatorMenuItems

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

    // Nested submenu IDs for Akademik deep structure with parent mapping
    const nestedSubmenuIds = [
        'input-nilai', 'ujian-semester', 'nilai-tahfizh', 'nilai-madros',
        'hafalan-menu',
        'laporan-akademik', 'laporan-nilai', 'laporan-hafalan', 'laporan-akademik-santri'
    ]

    // Define parent-child relationships for nested menus
    const submenuParents = {
        'ujian-semester': 'input-nilai',
        'nilai-tahfizh': 'ujian-semester',
        'nilai-madros': 'ujian-semester',
        'laporan-nilai': 'laporan-akademik',
        'laporan-hafalan': 'laporan-akademik',
        'laporan-akademik-santri': 'laporan-akademik'
    }

    // Get all ancestors of a menu ID
    const getAncestors = (menuId) => {
        const ancestors = []
        let current = submenuParents[menuId]
        while (current) {
            ancestors.push(current)
            current = submenuParents[current]
        }
        return ancestors
    }

    const toggleMenu = (menuId) => {
        setOpenMenus(prev => {
            const isCurrentlyOpen = prev[menuId]

            // If closing, just close it and its children
            if (isCurrentlyOpen) {
                const newState = { ...prev }
                newState[menuId] = false
                // Also close any children of this menu
                Object.keys(submenuParents).forEach(childId => {
                    if (submenuParents[childId] === menuId) {
                        newState[childId] = false
                    }
                })
                return newState
            }

            // Check if this is a top-level menu
            const isTopLevel = topLevelMenuIds.includes(menuId)

            // Check if this is a nested submenu
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
                const newState = { ...prev }
                const ancestors = getAncestors(menuId)

                // Keep ancestors open, close siblings only
                nestedSubmenuIds.forEach(key => {
                    if (key === menuId) {
                        // Open this menu
                        newState[key] = true
                    } else if (ancestors.includes(key)) {
                        // Keep ancestors open
                        newState[key] = true
                    } else if (!ancestors.includes(key) && submenuParents[menuId] === submenuParents[key]) {
                        // Close siblings (same parent)
                        newState[key] = false
                    }
                    // Leave other menus as-is
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
        // Only run on initial mount or role change, not on every path change
        // This prevents menus from closing when clicking child links
        setOpenMenus(prev => {
            const newOpenMenus = { ...prev }

            const scanItems = (items) => {
                items.forEach(item => {
                    if (item.children) {
                        if (isChildActive(item.children)) {
                            // Keep this menu open if a child is active
                            newOpenMenus[item.id] = true
                        }
                        scanItems(item.children)
                    }
                })
            }
            scanItems(baseMenuItems)
            return newOpenMenus
        })
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

        // Custom active check for paths with query params
        const isItemActive = () => {
            const currentPath = location.pathname
            const currentSearch = location.search
            const itemPath = item.path.split('?')[0]
            const itemSearch = item.path.includes('?') ? '?' + item.path.split('?')[1] : ''

            // If item has query param, must match both path and query
            if (itemSearch) {
                return currentPath === itemPath && currentSearch === itemSearch
            }
            // If item has no query param, must match path exactly and have no tab query
            return currentPath === itemPath && !currentSearch.includes('tab=')
        }

        return (
            <li key={item.path} className="nav-item">
                <NavLink
                    to={item.path}
                    className={() => `nav-link ${isItemActive() ? 'active' : ''}`}
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
