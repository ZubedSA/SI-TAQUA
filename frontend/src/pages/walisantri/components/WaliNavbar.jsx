import { NavLink, useNavigate, Link } from 'react-router-dom'
import { Home, BookOpen, Wallet, Bell, MessageCircle, User, LogOut, ArrowLeft, Shield, FileText } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useState } from 'react'

/**
 * WaliNavbar - Bottom navigation untuk Portal Wali Santri
 * Mobile-first design dengan icon dan label yang jelas
 */
const WaliNavbar = () => {
    const { signOut, userProfile, activeRole, roles } = useAuth()
    const navigate = useNavigate()
    const [showProfileMenu, setShowProfileMenu] = useState(false)

    // Check if user is admin (has admin role in their roles array)
    const isAdmin = roles?.includes('admin') || activeRole === 'admin'

    const handleLogout = async () => {
        try {
            await signOut()
            navigate('/login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const handleBackToAdmin = () => {
        navigate('/dashboard/admin')
    }

    const menuItems = [
        { path: '/wali/beranda', icon: Home, label: 'Beranda' },
        { path: '/wali/akademik', icon: BookOpen, label: 'Akademik' },
        { path: '/wali/keuangan', icon: Wallet, label: 'Keuangan' },
        { path: '/wali/informasi', icon: Bell, label: 'Info' },
        { path: '/wali/laporan', icon: FileText, label: 'Laporan' },
    ]

    return (
        <>
            {/* Header untuk Desktop */}
            <header className="wali-header">
                <div className="wali-header-content">
                    <div className="wali-logo">
                        {/* Back to Admin button for admin users */}
                        {isAdmin && (
                            <button
                                onClick={handleBackToAdmin}
                                className="wali-back-to-admin"
                                title="Kembali ke Dashboard Admin"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <span className="wali-logo-icon">🕌</span>
                        <span className="wali-logo-text">Portal Wali Santri</span>
                        {isAdmin && (
                            <span className="wali-admin-badge">
                                <Shield size={12} />
                                Test Mode
                            </span>
                        )}
                    </div>

                    <nav className="wali-header-nav">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `wali-header-link ${isActive ? 'active' : ''}`
                                }
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="wali-header-profile">
                        <button
                            className="wali-profile-btn"
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        >
                            <User size={20} />
                            <span className="wali-profile-name">{userProfile?.nama || 'Wali'}</span>
                        </button>

                        {showProfileMenu && (
                            <div className="wali-profile-dropdown">
                                {isAdmin && (
                                    <button onClick={handleBackToAdmin} className="wali-dropdown-item admin-back">
                                        <ArrowLeft size={16} />
                                        <span>Kembali ke Admin</span>
                                    </button>
                                )}
                                <NavLink to="/wali/profil" className="wali-dropdown-item">
                                    <User size={16} />
                                    <span>Profil Saya</span>
                                </NavLink>
                                <button onClick={handleLogout} className="wali-dropdown-item logout">
                                    <LogOut size={16} />
                                    <span>Keluar</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Bottom Navigation untuk Mobile */}
            <nav className="wali-bottom-nav">
                {/* Back to Admin for mobile */}
                {isAdmin && (
                    <button onClick={handleBackToAdmin} className="wali-nav-item admin-back">
                        <ArrowLeft size={20} />
                        <span className="wali-nav-label">Admin</span>
                    </button>
                )}
                {menuItems.slice(0, isAdmin ? 4 : 5).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `wali-nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <item.icon size={20} />
                        <span className="wali-nav-label">{item.label}</span>
                    </NavLink>
                ))}
                <NavLink
                    to="/wali/profil"
                    className={({ isActive }) =>
                        `wali-nav-item ${isActive ? 'active' : ''}`
                    }
                >
                    <User size={20} />
                    <span className="wali-nav-label">Profil</span>
                </NavLink>
            </nav>

            <style>{`
                .wali-back-to-admin {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                    cursor: pointer;
                    margin-right: 12px;
                    transition: all 0.2s ease;
                }
                .wali-back-to-admin:hover {
                    background: #ef4444;
                    color: #fff;
                }
                .wali-admin-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    margin-left: 8px;
                    padding: 4px 8px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    color: #ef4444;
                }
                .wali-dropdown-item.admin-back {
                    color: #ef4444;
                    border-bottom: 1px solid var(--border-color);
                }
                .wali-nav-item.admin-back {
                    color: #ef4444;
                }
            `}</style>
        </>
    )
}

export default WaliNavbar

