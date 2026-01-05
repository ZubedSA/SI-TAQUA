import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Bell, User, Menu, ChevronDown, Settings, LogOut, UserCircle, Clock, Search } from 'lucide-react'
import GlobalSearch from '../common/GlobalSearch'
import NotificationDropdown from './NotificationDropdown'
import RoleSwitcher from './RoleSwitcher'

const Header = ({ onMenuClick }) => {
    const { user, userProfile, activeRole, signOut, hasMultipleRoles } = useAuth()
    const navigate = useNavigate()
    const [showDropdown, setShowDropdown] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const dropdownRef = useRef(null)
    const notificationRef = useRef(null)
    const [currentTime, setCurrentTime] = useState(new Date())

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

    const formatTime = () => currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    const formatDate = () => currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

    const getUserName = () => {
        if (userProfile?.nama) return userProfile.nama
        if (user?.user_metadata?.nama) return user.user_metadata.nama
        if (user?.email) return user.email.split('@')[0]
        return 'User'
    }

    const getRoleLabel = () => {
        switch (activeRole) {
            case 'admin': return 'Administrator'
            case 'guru': return 'Guru/Pengajar'
            case 'bendahara': return 'Bendahara'
            case 'pengasuh': return 'Pengasuh'
            case 'wali': return 'Wali Santri'
            default: return 'User'
        }
    }

    const handleLogout = async () => {
        try {
            await signOut()
            navigate('/login')
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
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 px-4 md:px-6 flex items-center justify-between transition-all duration-300">
                <div className="flex items-center gap-4">
                    <button
                        className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-100"
                        onClick={onMenuClick}
                    >
                        <Menu size={24} />
                    </button>

                    {/* Breadcrumb Placeholder or Page Title could go here */}
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Global Search Button */}
                    <button
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 hover:border-gray-300 hover:bg-white transition-all w-48 lg:w-64 group"
                        onClick={() => setShowSearch(true)}
                        title="Pencarian Global (Ctrl+K)"
                    >
                        <Search size={16} className="text-gray-400 group-hover:text-primary-500" />
                        <span className="flex-1 text-left">Cari...</span>
                        <kbd className="px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded font-mono group-hover:bg-gray-50">Ctrl K</kbd>
                    </button>

                    <button
                        className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100"
                        onClick={() => setShowSearch(true)}
                    >
                        <Search size={20} />
                    </button>

                    <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

                    {/* Real-time Clock */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-primary-50 text-emerald-700 rounded-full text-xs font-medium border border-primary-100">
                        <Clock size={14} />
                        <span>{formatTime()}</span>
                        <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                        <span className="text-emerald-600">{formatDate()}</span>
                    </div>

                    {/* Notification Button */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            className={`p-2 rounded-full transition-colors ${showNotifications ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={20} />
                            {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span> */}
                        </button>
                        <NotificationDropdown
                            isOpen={showNotifications}
                            onClose={() => setShowNotifications(false)}
                        />
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative pl-2 md:pl-4 md:border-l border-gray-200" ref={dropdownRef}>
                        <button
                            className="flex items-center gap-3 py-1 pl-1 pr-2 rounded-full hover:bg-gray-50 transition-colors group focus:outline-none"
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-emerald-400 p-[2px] shadow-sm group-hover:shadow-md transition-shadow">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <User size={16} className="text-primary-600" />
                                </div>
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-semibold text-gray-800 leading-tight group-hover:text-primary-700">{getUserName()}</p>
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-right">{getRoleLabel()}</p>
                            </div>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180 text-primary-500' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">Akun Saya</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>

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

                                {hasMultipleRoles() && (
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
                                <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-3">
                                    <User size={40} />
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
