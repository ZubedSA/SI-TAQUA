import { useAuth } from '../../context/AuthContext'
import { Bell, User, Menu } from 'lucide-react'
import './Header.css'

const Header = ({ onMenuClick }) => {
    const { user, userProfile, role } = useAuth()

    // Mendapatkan nama dan label role
    const getUserName = () => {
        // Prioritas: nama dari userProfile, lalu dari user metadata, lalu email
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

    return (
        <header className="header">
            <div className="header-left">
                {/* Hamburger Menu - selalu ada tapi hanya visible di mobile via CSS */}
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

                <div className="user-profile">
                    <div className="user-avatar">
                        <User size={20} />
                    </div>
                    <div className="user-info">
                        <span className="user-name">{getUserName()}</span>
                        <span className="user-role">{getRoleLabel()}</span>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header

