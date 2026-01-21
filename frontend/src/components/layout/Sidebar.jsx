import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import logoFile from "../../assets/Logo_PTQA_075759.png";
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
    Archive,
    HeartHandshake, // For OTA
    Send, // For Penyaluran
    ShieldAlert
} from 'lucide-react'
// import './Sidebar.css' removed

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
            { path: '/security', icon: ShieldAlert, label: 'Akun Mencurigakan' },
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
            { path: '/jadwal', icon: Calendar, label: 'Jadwal Pelajaran' },
            { path: '/semester', icon: Calendar, label: 'Semester' },
            { path: '/admin/ota', icon: HeartHandshake, label: 'Orang Tua Asuh' },
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
            { path: '/presensi', icon: CalendarCheck, label: 'Kehadiran' },
            { path: '/akademik/kalender', icon: Calendar, label: 'Kalender Akademik' },
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

    // Monitoring Pengurus
    {
        id: 'monitoring-pengurus',
        icon: UserCog,
        label: 'Monitoring Pengurus',
        children: [
            { path: '/dashboard/pengurus', icon: LayoutDashboard, label: 'Dashboard Pengurus' },
            { path: '/pengurus/pelanggaran', icon: AlertTriangle, label: 'Pelanggaran' },
            { path: '/pengurus/santri-bermasalah', icon: Users, label: 'Santri Bermasalah' },
            { path: '/pengurus/arsip', icon: Archive, label: 'Arsip' },
        ]
    },





    // Monitoring OTA
    {
        id: 'monitoring-ota',
        icon: HeartHandshake,
        label: 'Monitoring OTA',
        children: [
            // Using same list for now, later can be specific stats page if needed
            { path: '/admin/ota', icon: Users, label: 'Data OTA' },
            // Placeholder for financial monitoring
            // { path: '/admin/ota/finance', icon: TrendingUp, label: 'Keuangan OTA' }, 
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

// ============ OTA MENU - Donasi & Monitoring ============
const otaMenuItems = [
    { path: '/dashboard/ota', icon: LayoutDashboard, label: 'Dashboard OTA' },

    // Keuangan OTA
    {
        id: 'keuangan-ota',
        icon: Wallet,
        label: 'Keuangan',
        children: [
            { path: '/ota/pemasukan', icon: ArrowUpCircle, label: 'Pemasukan' },
            { path: '/ota/pengeluaran', icon: ArrowDownCircle, label: 'Pengeluaran' },
            { path: '/ota/penyaluran', icon: Send, label: 'Penyaluran Dana' },
            { path: '/ota/laporan-penyaluran', icon: FileBarChart, label: 'Laporan Penyaluran' },
        ]
    },

    // Data OTA
    {
        id: 'data-ota',
        icon: Database,
        label: 'Data',
        children: [
            { path: '/admin/ota', icon: HeartHandshake, label: 'Data OTA' },
            { path: '/ota/santri', icon: Users, label: 'Data Santri Penerima' },
            { path: '/ota/kategori', icon: Tag, label: 'Kategori OTA' },
        ]
    },
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

// ============ MUSYRIF MENU - Full Akademik Access (Filtered by Halaqoh) ============
// Musyrif = Pengajar Halaqoh dengan akses penuh ke data akademik santri halaqoh-nya
const musyrifMenuItems = [
    { path: '/dashboard/akademik', icon: LayoutDashboard, label: 'Dashboard' },

    // Data Pondok
    {
        id: 'data-pondok',
        icon: Database,
        label: 'Data Pondok',
        children: [
            { path: '/santri', icon: Users, label: 'Data Santri' },
            { path: '/guru', icon: GraduationCap, label: 'Data Guru' },
            { path: '/kelas', icon: Home, label: 'Kelas' },
            { path: '/mapel', icon: BookOpen, label: 'Mapel' },
            { path: '/halaqoh', icon: Circle, label: 'Halaqoh' },
        ]
    },

    // Akademik Menu - sama dengan guru
    {
        id: 'akademik',
        icon: School,
        label: 'Akademik',
        children: [
            // Input Nilai
            {
                id: 'input-nilai',
                icon: PenLine,
                label: 'Input Nilai',
                children: [
                    { path: '/akademik/nilai/tahfizh/syahri', icon: Calendar, label: 'Ujian Syahri' },
                    {
                        id: 'ujian-semester',
                        icon: CalendarCheck,
                        label: 'Ujian Semester',
                        children: [
                            {
                                id: 'nilai-tahfizh',
                                icon: BookMarked,
                                label: "Qur'aniyah",
                                children: [
                                    { path: '/akademik/nilai/tahfizh/semester', icon: CalendarCheck, label: 'Ujian Semester' },
                                ]
                            },
                            {
                                id: 'nilai-madros',
                                icon: BookOpen,
                                label: 'Madrasiyah',
                                children: [
                                    { path: '/akademik/nilai/madros/harian', icon: PenLine, label: 'Ujian Harian' },
                                    { path: '/akademik/nilai/madros/uts', icon: FileText, label: 'UTS' },
                                    { path: '/akademik/nilai/madros/uas', icon: ClipboardList, label: 'UAS' },
                                ]
                            },
                        ]
                    },
                ]
            },
            // Perilaku & Catatan (New)
            { path: '/akademik/nilai/perilaku', icon: PenLine, label: 'Perilaku & Catatan' },
        ]
    },
    // Hafalan Menu
    {
        id: 'hafalan-menu',
        icon: BookMarked,
        label: 'Hafalan',
        children: [
            { path: '/hafalan', icon: PenLine, label: 'Input Hafalan' },
            { path: '/hafalan?tab=rekap', icon: FileText, label: 'Rekap Hafalan' },
        ]
    },
    // Laporan Menu
    {
        id: 'laporan-akademik',
        icon: Download,
        label: 'Laporan',
        children: [
            {
                id: 'laporan-nilai',
                icon: FileText,
                label: 'Laporan Nilai',
                children: [
                    { path: '/laporan/ujian-syahri', icon: Calendar, label: 'Ujian Syahri' },
                    { path: '/laporan/ujian-semester', icon: CalendarCheck, label: 'Ujian Semester' },
                ]
            },
            {
                id: 'laporan-hafalan',
                icon: BookMarked,
                label: 'Laporan Hafalan',
                children: [
                    { path: '/laporan/hafalan-harian', icon: Calendar, label: 'Harian' },
                    { path: '/laporan/rekap-mingguan', icon: Calendar, label: 'Mingguan' },
                    { path: '/hafalan/pencapaian/bulanan', icon: Calendar, label: 'Bulanan' },
                    { path: '/hafalan/pencapaian/semester', icon: CalendarCheck, label: 'Semester' },
                ]
            },
            {
                id: 'laporan-akademik-santri',
                icon: Users,
                label: 'Laporan Akademik',
                children: [
                    { path: '/laporan/akademik-santri', icon: Users, label: 'Raport' },
                    { path: '/rekap-nilai/grafik', icon: Activity, label: 'Grafik Perkembangan' },
                ]
            },
        ]
    },
    // Presensi
    { path: '/presensi', icon: CalendarCheck, label: 'Pembinaan Santri' },
    // Semester
    { path: '/semester', icon: Calendar, label: 'Semester' },
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

            { path: '/mapel', icon: BookOpen, label: 'Mapel', roles: ['admin', 'guru'] },
            { path: '/jadwal', icon: Calendar, label: 'Jadwal Pelajaran', roles: ['admin', 'guru'] },
            { path: '/akademik/kalender', icon: Calendar, label: 'Kalender Akademik', roles: ['admin', 'guru'] },
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
            // Agenda Mengajar (Jurnal)
            { path: '/akademik/jurnal', icon: BookOpen, label: 'Agenda Mengajar', roles: ['admin', 'guru'] },

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
                                label: "Qur'aniyah",
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
                    // Perilaku & Catatan (New)
                    { path: '/akademik/nilai/perilaku', icon: PenLine, label: 'Perilaku & Catatan', roles: ['admin', 'guru'] },
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
    const { signOut, activeRole, roles, switchRole } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const queryClient = useQueryClient()
    const [openMenus, setOpenMenus] = useState({})

    // Auto-switch role based on path (Smart Context Switching)
    // Helps multi-role users see the correct sidebar menu when navigating
    useEffect(() => {
        const path = location.pathname
        const trySwitch = async (targetRole) => {
            if (activeRole !== targetRole && roles?.includes(targetRole)) {
                await switchRole(targetRole)
                // Clear cache after auto role switch
                queryClient.invalidateQueries()
            }
        }

        // 0. Admin Context - Prioritas
        if (
            path.startsWith('/dashboard/admin') ||
            path.startsWith('/users') ||
            path.startsWith('/roles') ||
            path.startsWith('/security') ||
            path.startsWith('/audit-log') ||
            path.startsWith('/system-status') ||
            path.startsWith('/pengaturan')
        ) {
            trySwitch('admin')
        }
        // 1. Keuangan / Bendahara Context
        else if (path.startsWith('/keuangan') || path.startsWith('/dashboard/keuangan')) {
            trySwitch('bendahara')
        }
        // 2. Pengurus Context
        else if (path.startsWith('/pengurus') || path.startsWith('/dashboard/pengurus')) {
            trySwitch('pengurus')
        }
        // 3. OTA Context
        else if (path.startsWith('/ota') || path.startsWith('/dashboard/ota')) {
            trySwitch('ota')
        }
        // 4. Akademik / Guru / Musyrif Context
        else if (
            path.startsWith('/akademik') ||
            path.startsWith('/dashboard/akademik') ||
            path.startsWith('/hafalan') ||
            path.startsWith('/presensi') ||
            path.startsWith('/laporan/') || // Most reports are academic
            // Core academic data paths (check if not explicitly finance)
            ((path.startsWith('/santri') || path.startsWith('/guru') || path.startsWith('/kelas') || path.startsWith('/halaqoh') || path.startsWith('/mapel') || path.startsWith('/semester')) && !path.startsWith('/keuangan'))
        ) {
            // Prioritize Guru, then Musyrif
            if (roles?.includes('guru')) trySwitch('guru')
            else if (roles?.includes('musyrif')) trySwitch('musyrif')
        }
        // 5. Wali Context
        else if (path.startsWith('/wali')) {
            trySwitch('wali')
        }

    }, [location.pathname]) // Only run when path changes to prevent race conditions with RoleSwitcher

    // Check if user is effectively an admin (even if activeRole is different)
    const isRealAdmin = roles?.includes('admin')

    // Select menu based on active role
    const baseMenuItems =
        activeRole === 'admin' ? adminMenuItems :
            activeRole === 'pengurus' ? pengurusMenuItems :
                activeRole === 'ota' ? otaMenuItems :
                    activeRole === 'musyrif' ? musyrifMenuItems :
                        operatorMenuItems

    // Filter menu berdasarkan role user
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
        if (window.innerWidth <= 1024 && onClose) onClose()
    }

    // Get all top-level menu IDs 
    const topLevelMenuIds = [
        'users-roles', 'master-data', 'monitoring-akademik', 'monitoring-keuangan', 'monitoring-pengurus', 'monitoring-ota', 'logs',
        'data-pondok', 'akademik', 'alur-kas', 'pembayaran', 'penyaluran'
    ]

    // Nested submenu IDs
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
            if (isCurrentlyOpen) {
                const newState = { ...prev }
                newState[menuId] = false
                Object.keys(submenuParents).forEach(childId => {
                    if (submenuParents[childId] === menuId) newState[childId] = false
                })
                return newState
            }

            const isTopLevel = topLevelMenuIds.includes(menuId)
            const isNestedSubmenu = nestedSubmenuIds.includes(menuId)

            if (isTopLevel) {
                const newState = {}
                Object.keys(prev).forEach(key => {
                    if (topLevelMenuIds.includes(key)) newState[key] = false
                    if (nestedSubmenuIds.includes(key)) newState[key] = false
                })
                newState[menuId] = true
                return newState
            }

            if (isNestedSubmenu) {
                const newState = { ...prev }
                const ancestors = getAncestors(menuId)
                nestedSubmenuIds.forEach(key => {
                    if (key === menuId) newState[key] = true
                    else if (ancestors.includes(key)) newState[key] = true
                    else if (!ancestors.includes(key) && submenuParents[menuId] === submenuParents[key]) newState[key] = false
                })
                newState[menuId] = true
                return newState
            }

            return { ...prev, [menuId]: true }
        })
    }

    const isChildActive = (children) => {
        if (!children) return false
        return children.some(child => {
            if (child.path) return location.pathname === child.path || location.pathname.startsWith(child.path + '/')
            if (child.children) return isChildActive(child.children)
            return false
        })
    }

    useEffect(() => {
        setOpenMenus(prev => {
            const newOpenMenus = { ...prev }
            const scanItems = (items) => {
                items.forEach(item => {
                    if (item.children) {
                        if (isChildActive(item.children)) newOpenMenus[item.id] = true
                        scanItems(item.children)
                    }
                })
            }
            scanItems(baseMenuItems)
            return newOpenMenus
        })
    }, [location.pathname, activeRole])

    const renderMenuItem = (item, level = 0) => {
        const filteredChildren = item.children?.filter(child => {
            if (!child.roles || child.roles.length === 0) return true
            if (isRealAdmin && child.roles.includes('admin')) return true
            return child.roles.includes(activeRole)
        })

        const hasChildren = filteredChildren && filteredChildren.length > 0
        const isOpen = openMenus[item.id]

        // Tailwind padding calculation
        const paddingLeftClass = level === 0 ? 'pl-3' : level === 1 ? 'pl-9' : level === 2 ? 'pl-11' : 'pl-14';

        if (hasChildren) {
            return (
                <li key={item.id} className="mb-1">
                    <button
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 
                            ${isOpen || isChildActive(item.children)
                                ? 'text-primary-700 bg-primary-50'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                            ${level > 0 ? paddingLeftClass : ''}
                        `}
                        onClick={() => toggleMenu(item.id)}
                    >
                        <item.icon size={20} className={`shrink-0 ${isOpen || isChildActive(item.children) ? 'text-primary-600' : 'text-gray-400'}`} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </button>
                    {isOpen && (
                        <ul className="mt-1 space-y-1">
                            {filteredChildren.map(child => renderMenuItem(child, level + 1))}
                        </ul>
                    )}
                </li>
            )
        }

        const isItemActive = () => {
            const currentPath = location.pathname
            const currentSearch = location.search
            const itemPath = item.path.split('?')[0]
            const itemSearch = item.path.includes('?') ? '?' + item.path.split('?')[1] : ''
            if (itemSearch) return currentPath === itemPath && currentSearch === itemSearch
            return currentPath === itemPath && !currentSearch.includes('tab=')
        }

        const active = isItemActive()

        return (
            <li key={item.path} className="mb-1">
                <NavLink
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                        ${active
                            ? 'bg-primary-600 text-white shadow-sm shadow-primary-200'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                        ${level > 0 ? paddingLeftClass : ''}
                    `}
                    onClick={handleNavClick}
                >
                    <item.icon size={20} className={`shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    <span className="truncate">{item.label}</span>
                </NavLink>
            </li>
        )
    }

    return (
        <>
            {/* Desktop Sidebar & Mobile Drawer */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-200 
                    transition-transform duration-300 ease-in-out lg:translate-x-0
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                        <img
                            src={logoFile}
                            alt="Logo PTQA"
                            className="w-16 h-16 object-contain"
                        />
                        <span className="text-lg font-bold text-gray-900 tracking-tight">Si-Taqua</span>
                    </div>
                    <button
                        className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar h-[calc(100vh-8rem)]">
                    <ul className="space-y-1">
                        {filteredMenuItems.map((item) => renderMenuItem(item))}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Keluar</span>
                    </button>
                    <div className="mt-2 text-xs text-center text-gray-400 font-mono">
                        v.2025.01.02.1
                    </div>

                </div>
            </aside>

            {/* Backdrop for Mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}
        </>
    )
}

export default Sidebar
