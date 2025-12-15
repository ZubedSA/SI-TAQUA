import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Komponen untuk proteksi route berdasarkan role
 * @param {Array} allowedRoles - Array role yang diizinkan, contoh: ['admin', 'guru']
 * @param {ReactNode} children - Komponen yang akan dirender jika role sesuai
 * @param {string} redirectTo - Path untuk redirect jika tidak memiliki akses, default '/'
 */
const RoleGuard = ({ allowedRoles = [], children, redirectTo = '/' }) => {
    const { role, loading } = useAuth()

    // Tampilkan loading jika masih mengambil data user
    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spin"></div>
                Memuat...
            </div>
        )
    }

    // Jika tidak ada roles yang ditentukan, izinkan semua
    if (!allowedRoles || allowedRoles.length === 0) {
        return children
    }

    // Cek apakah role user ada dalam daftar yang diizinkan
    if (allowedRoles.includes(role)) {
        return children
    }

    // Redirect jika tidak memiliki akses
    return <Navigate to={redirectTo} replace />
}

export default RoleGuard
