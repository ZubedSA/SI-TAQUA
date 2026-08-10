import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCalendar } from '../../context/CalendarContext'
import { Bell, User, Menu, ChevronDown, Settings, LogOut, UserCircle, Clock, Search } from 'lucide-react'
import GlobalSearch from '../common/GlobalSearch'
import NotificationDropdown from './NotificationDropdown'
import RoleSwitcher from './RoleSwitcher'
import CalendarModeToggle from '../common/CalendarModeToggle'

const Header = ({ onMenuClick }) => {
    const { user, userProfile, activeRole, signOut, hasMultipleRoles } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    
    // Check if we are on a path where Bottom Nav is active (to hide hamburger)
    const isBottomNavPage = location.pathname.startsWith('/akademik') || 
                          location.pathname.startsWith('/hafalan') || 
                          location.pathname.startsWith('/dashboard/akademik') ||
                          location.pathname.startsWith('/santri') ||
                          location.pathname.startsWith('/guru') ||
                          location.pathname.startsWith('/kelas') ||
                          location.pathname.startsWith('/halaqoh') ||
                          location.pathname.startsWith('/mapel') ||
                          location.pathname.startsWith('/semester') ||
                          location.pathname.startsWith('/laporan') ||
                          location.pathname.startsWith('/rekap-nilai') ||
                          location.pathname.startsWith('/keuangan') ||
                          location.pathname.startsWith('/dashboard/keuangan') ||
                          location.pathname.startsWith('/ota') ||
                          location.pathname.startsWith('/dashboard/ota') ||
                          location.pathname.startsWith('/admin/ota') ||
                          location.pathname.startsWith('/pengurus') ||
                          location.pathname.startsWith('/dashboard/pengurus') ||
                          location.pathname.startsWith('/dashboard/admin') ||
                          location.pathname.startsWith('/users') ||
                          location.pathname.startsWith('/roles') ||
                          location.pathname.startsWith('/security') ||
                          location.pathname.startsWith('/audit-log') ||
                          location.pathname.startsWith('/system-status') ||
                          location.pathname.startsWith('/pengaturan') ||
                          location.pathname.startsWith('/absensi')
    
    const [showDropdown, setShowDropdown] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const dropdownRef = useRef(null)
    const notificationRef = useRef(null)
    const [isScrolled, setIsScrolled] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    // Scroll listener for sticky header effects - Throttled for performance
    useEffect(() => {
        let ticking = false
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setIsScrolled(window.scrollY > 20)
                    ticking = false
                })
                ticking = true
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Real-time clock update
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Global keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setShowSearch(true)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    const { formatDate: globalFormatDate } = useCalendar()

    const formatTime = () => currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    const formatDate = () => globalFormatDate(currentTime, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

    const getUserName = () => {
        if (userProfile?.nama) return userProfile.nama
        if (user?.user_metadata?.nama) return user.user_metadata.nama
        if (user?.email) return user.email.split('@')[0]
        return 'User'
    }

    const getRoleLabel = () => {
        switch (activeRole) {
            case 'admin': return 'Administrator'
            case 'admin_akademik': return 'Admin Akademik'
            case 'admin_absensi': return 'Admin Absensi'
            case 'guru': return 'Guru/Pengajar'
            case 'bendahara': return 'Bendahara'
            case 'pengasuh': return 'Pengasuh'
            case 'wali': return 'Wali Santri'
            default: return 'User'
        }
    }

    const handleLogout = async () => {
        try {
            const isAbsensi = location.pathname.startsWith('/absensi')
            await signOut()
            navigate(isAbsensi ? '/absensi/login' : '/login')
        } catch (error) {
            console.log('Logout:', error.message)
        }
    }

    const handleProfileClick = () => {
        setShowDropdown(false)
        setShowProfileModal(true)
    }

    const handleSettingsClick = () => {
        setShowDropdown(false)
        navigate('/profil-settings')
    }

    return (
        <>
            <header className={`fixed top-0 right-0 z-40 transition-all duration-500 ${isScrolled ? 'bg-white/95 shadow-lg shadow-gray-200/50 h-16' : 'bg-white/70 backdrop-blur-xl h-20'} border-b border-gray-100/80 px-4 md:px-8 flex items-center justify-between left-0 ${location.pathname.startsWith('/absensi') ? 'lg:left-[280px]' : 'lg:left-[260px]'}`}>
                <div className="flex items-center gap-4">
                    {/* Hide sidebar toggle on mobile pages because we use Bottom Nav */}
                    {!isBottomNavPage && (
                        <button
                            className="lg:hidden p-2.5 -ml-2 rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-90"
                            onClick={onMenuClick}
                        >
                            <Menu size={22} />
                        </button>
                    )}

                    {/* Mobile Calendar Toggle (Visible < sm) */}
                    <div className="sm:hidden scale-110 origin-left">
                        <CalendarModeToggle />
                    </div>

                    {/* Breadcrumb Placeholder or Page Title could go here */}
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Global Search Button */}
                    {!location.pathname.startsWith('/absensi') && (
                        <button
                            type="button"
                            className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm text-gray-500 hover:border-gray-300 hover:bg-white hover:shadow-lg transition-all w-48 lg:w-72 group cursor-pointer relative z-10"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowSearch(true)
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowSearch(true)
                            }}
                            title="Pencarian Global (Ctrl+K)"
                        >
                            <Search size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors pointer-events-none" />
                            <span className="flex-1 text-left font-medium pointer-events-none">Cari...</span>
                            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] text-gray-400 bg-white border border-gray-100 rounded-lg font-mono pointer-events-none">⌘ K</kbd>
                        </button>
                    )}

                    <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

                    {/* Calendar Toggle */}
                    <div className="hidden sm:block">
                        <CalendarModeToggle />
                    </div>

                    {/* Real-time Clock */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium border border-gray-200">
                        <Clock size={14} />
                        <span>{formatTime()}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                        <span className="text-gray-600">{formatDate()}</span>
                    </div>

                    {/* Mobile Search Button (< md) */}
                    {!location.pathname.startsWith('/absensi') && (
                        <button
                            type="button"
                            className="flex md:hidden p-2.5 rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-90 cursor-pointer relative z-10"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowSearch(true)
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowSearch(true)
                            }}
                            title="Pencarian Global"
                        >
                            <Search size={22} strokeWidth={1.8} className="pointer-events-none" />
                        </button>
                    )}

                    {/* Notification Button */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            className={`p-2.5 rounded-2xl transition-all active:scale-90 ${showNotifications ? 'bg-gray-100 text-gray-900 shadow-inner' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={22} strokeWidth={1.8} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                        </button>
                        <NotificationDropdown
                            isOpen={showNotifications}
                            onClose={() => setShowNotifications(false)}
                        />
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative pl-1 sm:pl-3 md:pl-4 border-l border-gray-100" ref={dropdownRef}>
                        <button
                            className="flex items-center gap-1.5 sm:gap-3 py-1 sm:py-1.5 pl-1 sm:pl-3 pr-1 sm:pr-1.5 rounded-2xl hover:bg-gray-50/80 transition-all group focus:outline-none active:scale-95 border border-transparent hover:border-gray-200"
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            <div className="text-right flex flex-col justify-center">
                                <p className="text-[11px] sm:text-xs md:text-sm font-black text-gray-900 leading-tight group-hover:text-gray-700 transition-colors truncate max-w-[75px] xs:max-w-[110px] sm:max-w-none uppercase tracking-tight">
                                    {getUserName()}
                                </p>
                                <p className="hidden xs:block text-[8px] md:text-[9px] uppercase font-black text-gray-400 tracking-[0.12em] truncate max-w-[75px] xs:max-w-[110px] sm:max-w-none">
                                    {getRoleLabel()}
                                </p>
                            </div>
                            <div className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-500 group-hover:rotate-3 ${userProfile?.avatar_url ? '' : 'p-[2px] sm:p-[2.5px] bg-gradient-to-tr from-gray-600 to-gray-400 shadow-lg'}`}>
                                <div className={`w-full h-full rounded-full overflow-hidden border-2 ${showDropdown ? 'border-[#0A2619]' : 'border-white'} transition-colors bg-white`}>
                                    {userProfile?.avatar_url ? (
                                        <img src={userProfile.avatar_url} alt={getUserName()} className="w-full h-full object-cover" width="40" height="40" />
                                    ) : (
                                        <img src="/images/default-avatar.png" alt={getUserName()} className="w-full h-full object-cover" width="40" height="40" />
                                    )}
                                </div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-[#BCF32F] border-2 border-white rounded-full shadow-sm"></div>
                            </div>
                            <ChevronDown size={14} className={`text-gray-300 transition-transform duration-500 ${showDropdown ? 'rotate-180 text-emerald-600' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">Akun Saya</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>

                                {!location.pathname.startsWith('/absensi') && (
                                    <div className="p-1">
                                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-primary-600 transition-colors" onClick={handleProfileClick}>
                                            <UserCircle size={16} />
                                            <span>Profil Saya</span>
                                        </button>
                                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 hover:text-primary-600 transition-colors" onClick={handleSettingsClick}>
                                            <Settings size={16} />
                                            <span>Pengaturan Akun</span>
                                        </button>
                                    </div>
                                )}

                                {(hasMultipleRoles() || activeRole === 'admin') && !location.pathname.startsWith('/absensi') && (
                                    <>
                                        <div className="h-px bg-gray-100 my-1"></div>
                                        <div className="px-3 py-1">
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 px-1">Ganti Role</p>
                                            <RoleSwitcher inDropdown={true} onSwitch={() => setShowDropdown(false)} />
                                        </div>
                                    </>
                                )}

                                <div className="h-px bg-gray-100 my-1"></div>
                                <div className="p-1">
                                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors" onClick={handleLogout}>
                                        <LogOut size={16} />
                                        <span>Keluar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Modal Profil */}
            {showProfileModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-900">Profil Saya</h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowProfileModal(false)}>&times;</button>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-3 overflow-hidden border-4 border-white shadow-lg">
                                    {userProfile?.avatar_url ? (
                                        <img src={userProfile.avatar_url} alt={getUserName()} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src="/images/default-avatar.png" alt={getUserName()} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <h4 className="text-xl font-bold text-gray-900">{getUserName()}</h4>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 mt-1">
                                    {getRoleLabel()}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-1">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{user?.email || '-'}</p>
                                </div>
                                {userProfile?.created_at && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Bergabung Sejak</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {new Date(userProfile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowProfileModal(false)}>
                                Tutup
                            </button>
                            <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm" onClick={() => { setShowProfileModal(false); handleSettingsClick(); }}>
                                Edit Profil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Search Modal */}
            <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
        </>
    )
}

export default Header
