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
    Circle,
    PiggyBank,
    ArrowUpCircle,
    ArrowDownCircle,
    FileBarChart,
    CreditCard,
    Receipt,
    Tag,
    TrendingUp,
    CheckCircle,
    Wallet,
    UserCog,
    AlertTriangle,
    Bell,
    Newspaper,
    Archive,
    Send,
    HeartHandshake,
    ShieldAlert,
    Settings,
    Shield,
    Eye,
    QrCode,
    UserCircle,
    FileSearch
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const BottomNav = () => {
    const { activeRole } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [activeSheet, setActiveSheet] = useState(null)
    const [activeSubSheet, setActiveSubSheet] = useState(null)
    const sheetRef = useRef(null)

    const path = location.pathname
    const isAcademicPath = path.startsWith('/akademik') || path.startsWith('/hafalan') || path.startsWith('/dashboard/akademik') || path.startsWith('/santri') || path.startsWith('/guru') || path.startsWith('/kelas') || path.startsWith('/halaqoh') || path.startsWith('/mapel') || path.startsWith('/semester') || path.startsWith('/laporan') || path.startsWith('/rekap-nilai') || path.startsWith('/jadwal')
    const isFinancePath = path.startsWith('/keuangan') || path.startsWith('/dashboard/keuangan')
    const isOtaPath = path.startsWith('/ota') || path.startsWith('/dashboard/ota') || (path.startsWith('/admin/ota'))
    const isPengurusPath = path.startsWith('/pengurus') || path.startsWith('/dashboard/pengurus')
    const isAdminPath = path.startsWith('/dashboard/admin') || path.startsWith('/users') || path.startsWith('/roles') || path.startsWith('/security') || path.startsWith('/audit-log') || path.startsWith('/system-status') || path.startsWith('/pengaturan')
    const isAdmin = activeRole === 'admin'

    if (!isAdmin && !isAcademicPath && !isFinancePath && !isOtaPath && !isPengurusPath && !isAdminPath) return null

    // Determine Menu Items based on current context
    const getNavItems = () => {
        // === ADMIN CONTEXT (Always show for Admin role) ===
        if (isAdmin) {
            return [
                { id: 'admin-dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard/admin' },
                { 
                    id: 'users', label: 'Users', icon: UserCog,
                    children: [
                        { path: '/users', label: 'Manajemen User', icon: Users },
                        { path: '/roles', label: 'Roles & Akses', icon: Shield },
                        { path: '/security', label: 'Akun Mencurigakan', icon: ShieldAlert },
                    ]
                },
                { 
                    id: 'master', label: 'Master', icon: Database,
                    children: [
                        { path: '/santri', label: 'Data Santri', icon: Users },
                        { path: '/guru', label: 'Data Guru', icon: GraduationCap },
                        { path: '/kelas', label: 'Data Kelas', icon: Home },
                        { path: '/mapel', label: 'Mata Pelajaran', icon: BookOpen },
                        { path: '/halaqoh', label: 'Halaqoh', icon: Circle },
                        { path: '/jadwal', label: 'Jadwal', icon: Calendar },
                        { path: '/semester', label: 'Semester', icon: Calendar },
                        { path: '/admin/ota', label: 'Orang Tua Asuh', icon: HeartHandshake },
                    ]
                },
                { 
                    id: 'monitoring', label: 'Monitor', icon: Eye,
                    children: [
                        { 
                            id: 'mon-akademik', label: 'Akademik', icon: School,
                            children: [
                                { path: '/dashboard/akademik', label: 'Dashboard', icon: School },
                                { path: '/rekap-nilai/syahri', label: 'Nilai Syahri', icon: FileText },
                                { path: '/rekap-nilai/semester', label: 'Nilai Semester', icon: FileText },
                                { path: '/hafalan', label: 'Progress Hafalan', icon: BookMarked },
                                { path: '/akademik/kalender', label: 'Kalender', icon: Calendar },
                                { path: '/laporan/akademik-santri', label: 'Lap. Raport', icon: FileSearch },
                                { path: '/admin-absensi', label: 'Absensi QR', icon: QrCode },
                            ]
                        },
                        { 
                            id: 'mon-keuangan', label: 'Keuangan', icon: Wallet,
                            children: [
                                { path: '/dashboard/keuangan', label: 'Dashboard', icon: Wallet },
                                { path: '/keuangan/kas/laporan', label: 'Lap. Kas', icon: FileBarChart },
                                { path: '/keuangan/pembayaran/laporan', label: 'Lap. Bayar', icon: FileBarChart },
                                { path: '/keuangan/dana/laporan', label: 'Lap. Penyaluran', icon: FileBarChart },
                            ]
                        },
                        { 
                            id: 'mon-pengurus', label: 'Pengurus', icon: UserCog,
                            children: [
                                { path: '/dashboard/pengurus', label: 'Dashboard', icon: LayoutDashboard },
                                { path: '/pengurus/pelanggaran', label: 'Pelanggaran', icon: AlertTriangle },
                                { path: '/pengurus/pelanggaran/rekap', label: 'Rekap Pelanggaran', icon: FileText },
                                { path: '/pengurus/santri-bermasalah', label: 'Santri Bermasalah', icon: Users },
                                { path: '/pengurus/arsip', label: 'Arsip', icon: Archive },
                            ]
                        },
                        { path: '/admin/ota', label: 'OTA', icon: HeartHandshake },
                    ]
                },
                { 
                    id: 'system', label: 'System', icon: Settings,
                    children: [
                        { path: '/audit-log', label: 'Audit Log', icon: FileText },
                        { path: '/system-status', label: 'Status Sistem', icon: Activity },
                        { path: '/pengaturan', label: 'Pengaturan', icon: Settings },
                        { path: '/wali/beranda', label: 'Portal Wali (Test)', icon: UserCircle },
                    ]
                }
            ]
        }

        // === ACADEMIC CONTEXT ===
        if (isAcademicPath) {
            return [
                { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard/akademik' },
                { 
                    id: 'nilai', label: 'Nilai', icon: PenLine,
                    children: [
                        { path: '/akademik/nilai/tahfizh/syahri', label: 'Ujian Syahri', icon: Calendar },
                        { path: '/akademik/nilai/tahfizh/semester', label: "Qur'aniyah", icon: BookMarked },
                        { path: '/akademik/nilai/madros/uas', label: 'Madrasiyah', icon: BookOpen },
                        { path: '/akademik/nilai/perilaku', label: 'Perilaku & Catatan', icon: PenLine },
                    ]
                },
                { 
                    id: 'hafalan', label: 'Hafalan', icon: BookMarked,
                    children: [
                        { path: '/hafalan', label: 'Input Hafalan', icon: PenLine },
                        { path: '/hafalan?tab=rekap', label: 'Rekap Hafalan', icon: FileText },
                    ]
                },
                { 
                    id: 'laporan', label: 'Laporan', icon: Download,
                    children: [
                        { path: '/laporan/ujian-syahri', label: 'Ujian Syahri', icon: Calendar },
                        { path: '/laporan/ujian-semester', label: 'Ujian Semester', icon: FileText },
                        { path: '/laporan/hafalan-harian', label: 'Hafalan Harian', icon: Calendar },
                        { path: '/laporan/rekap-mingguan', label: 'Rekap Mingguan', icon: Calendar },
                        { path: '/laporan/akademik-santri', label: 'Raport Santri', icon: Users },
                        { path: '/rekap-nilai/grafik', label: 'Grafik', icon: Activity },
                    ]
                },
                { 
                    id: 'more', label: 'Menu', icon: MoreHorizontal,
                    children: [
                        { path: '/absensi/agenda', label: 'Agenda Mengajar', icon: BookOpen },
                        ...( (activeRole === 'admin' || activeRole === 'admin_akademik') ? [
                            { path: '/santri', label: 'Data Santri', icon: Users },
                            { path: '/guru', label: 'Data Guru', icon: GraduationCap },
                            { path: '/kelas', label: 'Data Kelas', icon: Home },
                            { path: '/mapel', label: 'Mata Pelajaran', icon: BookOpen },
                            { path: '/halaqoh', label: 'Data Halaqoh', icon: Circle },
                            { path: '/jadwal', label: 'Jadwal Pelajaran', icon: Calendar },
                            { path: '/akademik/kalender', label: 'Kalender Akademik', icon: Calendar },
                            { path: '/semester', label: 'Data Semester', icon: Calendar },
                        ] : [])
                    ]
                }
            ]
        }

        // === FINANCE CONTEXT ===
        if (isFinancePath) {
            return [
                { id: 'dashboard', label: 'Home', icon: Wallet, path: '/dashboard/keuangan' },
                { 
                    id: 'kas', label: 'Kas', icon: PiggyBank,
                    children: [
                        { path: '/keuangan/kas/pemasukan', label: 'Pemasukan', icon: ArrowUpCircle },
                        { path: '/keuangan/kas/pengeluaran', label: 'Pengeluaran', icon: ArrowDownCircle },
                        { path: '/keuangan/kas/laporan', label: 'Laporan Kas', icon: FileBarChart },
                    ]
                },
                { 
                    id: 'pembayaran', label: 'Bayar', icon: CreditCard,
                    children: [
                        { path: '/keuangan/pembayaran/tagihan', label: 'Tagihan', icon: Receipt },
                        { path: '/keuangan/pembayaran/kategori', label: 'Kategori', icon: Tag },
                        { path: '/keuangan/pembayaran/bayar', label: 'Input Bayar', icon: CreditCard },
                        { path: '/keuangan/pembayaran/laporan', label: 'Lap. Bayar', icon: FileBarChart },
                    ]
                },
                { 
                    id: 'penyaluran', label: 'Dana', icon: TrendingUp,
                    children: [
                        { path: '/keuangan/dana/anggaran', label: 'Anggaran', icon: PiggyBank },
                        { path: '/keuangan/dana/persetujuan', label: 'Persetujuan', icon: CheckCircle },
                        { path: '/keuangan/dana/realisasi', label: 'Realisasi', icon: TrendingUp },
                        { path: '/keuangan/dana/laporan', label: 'Lap. Penyaluran', icon: FileBarChart },
                    ]
                },
                { id: 'home', label: 'Dashboard', icon: LayoutDashboard, path: '/home' }
            ]
        }

        // === PENGURUS CONTEXT ===
        if (isPengurusPath) {
            return [
                { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard/pengurus' },
                { 
                    id: 'pembinaan', label: 'Bina', icon: UserCog,
                    children: [
                        { path: '/pengurus/pelanggaran', label: 'Pelanggaran', icon: AlertTriangle },
                        { path: '/pengurus/pelanggaran/rekap', label: 'Rekap Pelanggaran', icon: FileText },
                        { path: '/pengurus/santri-bermasalah', label: 'Santri Bermasalah', icon: Users },
                    ]
                },
                { 
                    id: 'info', label: 'Info', icon: Bell,
                    children: [
                        { path: '/pengurus/pengumuman', label: 'Pengumuman', icon: Bell },
                        { path: '/pengurus/informasi', label: 'Info Pondok', icon: FileText },
                        { path: '/pengurus/buletin', label: 'Buletin', icon: Newspaper },
                    ]
                },
                { id: 'arsip', label: 'Arsip', icon: Archive, path: '/pengurus/arsip' },
                { id: 'home', label: 'Dashboard', icon: LayoutDashboard, path: '/home' }
            ]
        }

        // === OTA CONTEXT ===
        if (isOtaPath) {
            return [
                { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/dashboard/ota' },
                { 
                    id: 'keuangan', label: 'Keuangan', icon: Wallet,
                    children: [
                        { path: '/ota/pemasukan', label: 'Pemasukan', icon: ArrowUpCircle },
                        { path: '/ota/pengeluaran', label: 'Pengeluaran', icon: ArrowDownCircle },
                        { path: '/ota/penyaluran', label: 'Penyaluran', icon: Send },
                        { path: '/ota/laporan-penyaluran', label: 'Lap. Salur', icon: FileBarChart },
                    ]
                },
                { 
                    id: 'data', label: 'Data', icon: Database,
                    children: [
                        { path: '/admin/ota', label: 'Data OTA', icon: HeartHandshake },
                        { path: '/ota/santri', label: 'Santri Penerima', icon: Users },
                        { path: '/ota/kategori', label: 'Kategori OTA', icon: Tag },
                    ]
                },
                { id: 'home', label: 'Dashboard', icon: LayoutDashboard, path: '/home' }
            ]
        }

        return []
    }

    const navItems = getNavItems()

    const handleNavClick = (item) => {
        if (item.children) {
            setActiveSheet(activeSheet === item.id ? null : item.id)
            setActiveSubSheet(null) // Reset sub-sheet when changing main sheet
        } else {
            setActiveSheet(null)
            setActiveSubSheet(null)
            navigate(item.path)
        }
    }

    const handleSubMenuClick = (item) => {
        if (item.children) {
            setActiveSubSheet(item)
        } else {
            setActiveSheet(null)
            setActiveSubSheet(null)
            navigate(item.path)
        }
    }

    const goBack = () => setActiveSubSheet(null)

    const isActive = (item) => {
        if (item.path) return location.pathname === item.path
        if (item.children) return item.children.some(child => location.pathname === child.path)
        return false
    }

    const closeSheet = () => {
        setActiveSheet(null)
        setActiveSubSheet(null)
    }

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
                className={`fixed left-3 right-3 sm:left-4 sm:right-4 bg-[#0A2619]/95 backdrop-blur-md rounded-[2rem] z-[10001] shadow-2xl border border-[#143d2a] transition-all duration-300 ease-in-out md:hidden
                    ${activeSheet 
                        ? 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] opacity-100 translate-y-0 scale-100 pointer-events-auto' 
                        : 'bottom-0 opacity-0 translate-y-10 scale-95 pointer-events-none'
                    }
                `}
                style={{ maxHeight: '60vh', overflowY: 'auto' }}
            >
                <div className="sticky top-0 bg-[#0A2619] px-6 py-4 border-b border-[#143d2a] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {activeSubSheet && (
                            <button 
                                type="button"
                                onClick={goBack}
                                className="p-2 -ml-2 bg-[#143d2a] rounded-full text-white hover:bg-[#1a4a35] transition-colors cursor-pointer touch-manipulation"
                            >
                                <ChevronUp size={20} className="-rotate-90" />
                            </button>
                        )}
                        <h3 className="font-bold text-white">
                            {activeSubSheet ? activeSubSheet.label : (navItems.find(i => i.id === activeSheet)?.label || 'Menu')}
                        </h3>
                    </div>
                    <button type="button" onClick={closeSheet} className="p-2 bg-[#143d2a] rounded-full text-white cursor-pointer touch-manipulation">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-2 gap-3 sm:gap-4">
                    {activeSheet && (activeSubSheet ? activeSubSheet.children : navItems.find(i => i.id === activeSheet)?.children)?.map((child, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSubMenuClick(child)
                            }}
                            className={`
                                flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl transition-all active:scale-95 min-h-[96px] h-24 w-full relative cursor-pointer touch-manipulation
                                ${location.pathname === child.path 
                                    ? 'bg-[#BCF32F] text-black shadow-md shadow-[#BCF32F]/10 scale-[1.02]' 
                                    : 'bg-[#143d2a] text-gray-300 hover:bg-[#1a4a35] hover:text-white border border-[#1d5239]'
                                }
                            `}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <child.icon size={26} className={`shrink-0 ${location.pathname === child.path ? 'text-black' : 'text-white'}`} />
                            <span className="text-xs font-bold text-center leading-tight line-clamp-2 px-1">{child.label}</span>
                            {child.children && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-1.5 h-1.5 bg-[#BCF32F] rounded-full" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                <div className="h-4" />
            </div>

            {/* Floating Bottom Navbar Bar */}
            <nav className="lg:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-4 sm:right-4 bg-[#0A2619]/95 backdrop-blur-md border border-[#143d2a]/80 px-2 py-1.5 z-[10000] shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[1.5rem] touch-manipulation select-none">
                <div className="flex justify-around items-center h-14 max-w-md mx-auto">
                    {navItems.map((item) => {
                        const active = isActive(item)
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleNavClick(item)
                                }}
                                className={`flex flex-col items-center justify-center flex-1 transition-all relative cursor-pointer touch-manipulation active:scale-95
                                    ${active ? 'text-[#BCF32F]' : 'text-gray-400'}
                                `}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
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
                            </button>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}

export default BottomNav
