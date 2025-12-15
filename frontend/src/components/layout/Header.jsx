import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Bell, User, Menu, ChevronDown, Settings, LogOut, UserCircle } from 'lucide-react'
import './Header.css'

const Header = ({ onMenuClick }) => {
    const { user, userProfile, role, signOut } = useAuth()
    const navigate = useNavigate()
    const [showDropdown, setShowDropdown] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const dropdownRef = useRef(null)

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

    const getUserName = () => {
        if (userProfile?.nama) return userProfile.nama
        if (user?.user_metadata?.nama) return user.user_metadata.nama
        if (user?.email) return user.email.split('@')[0]
        return 'User'
    }

    const getRoleLabel = () => {
        switch (role) {
            case 'admin': return 'Administrator'
            case 'guru': return 'Guru/Pengajar'
            case 'wali': return 'Wali Santri'
            default: return 'User'
        }
    }

    const handleLogout = async () => {
        try {
            await signOut()
        } catch (error) {
            console.log('Logout:', error.message)
        }
        navigate('/login')
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
            <header className="header">
                <div className="header-left">
                    <button
                        className="menu-btn"
                        onClick={onMenuClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: 'none'
                        }}
                    >
                        <Menu size={24} />
                    </button>
                </div>

                <div className="header-actions">
                    <button className="notification-btn">
                        <Bell size={20} />
                        <span className="notification-badge">3</span>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="user-profile-wrapper" ref={dropdownRef}>
                        <div
                            className="user-profile"
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="user-avatar">
                                <User size={20} />
                            </div>
                            <div className="user-info">
                                <span className="user-name">{getUserName()}</span>
                                <span className="user-role">{getRoleLabel()}</span>
                            </div>
                            <ChevronDown size={16} className={`dropdown-arrow ${showDropdown ? 'open' : ''}`} />
                        </div>

                        {/* Dropdown Menu */}
                        {showDropdown && (
                            <div className="profile-dropdown">
                                <button className="dropdown-item" onClick={handleProfileClick}>
                                    <UserCircle size={18} />
                                    <span>Profil Saya</span>
                                </button>
                                <button className="dropdown-item" onClick={handleSettingsClick}>
                                    <Settings size={18} />
                                    <span>Pengaturan Akun</span>
                                </button>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item logout" onClick={handleLogout}>
                                    <LogOut size={18} />
                                    <span>Keluar</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Modal Profil */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Profil Saya</h3>
                            <button className="modal-close" onClick={() => setShowProfileModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="profile-card">
                                <div className="profile-avatar-large">
                                    <User size={48} />
                                </div>
                                <div className="profile-details">
                                    <div className="profile-row">
                                        <label>Nama Lengkap</label>
                                        <span>{getUserName()}</span>
                                    </div>
                                    <div className="profile-row">
                                        <label>Email</label>
                                        <span>{user?.email || '-'}</span>
                                    </div>
                                    <div className="profile-row">
                                        <label>Role</label>
                                        <span className={`badge badge-${role}`}>{getRoleLabel()}</span>
                                    </div>
                                    {userProfile?.created_at && (
                                        <div className="profile-row">
                                            <label>Bergabung Sejak</label>
                                            <span>{new Date(userProfile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Tutup</button>
                            <button className="btn btn-primary" onClick={() => { setShowProfileModal(false); handleSettingsClick(); }}>Edit Profil</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Header


