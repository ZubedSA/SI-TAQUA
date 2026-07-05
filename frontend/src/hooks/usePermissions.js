import { useAuth } from '../context/AuthContext'

/**
 * Custom hook untuk permission checking
 * Menggunakan RBAC (Role Based Access Control)
 */
export const usePermissions = () => {
    const { userProfile, user, hasRole: authHasRole } = useAuth()
    // Multiple fallback untuk role detection - check activeRole first, then role
    const role = userProfile?.activeRole || userProfile?.role || 'guest'

    // Permission definitions
    const permissions = {
        // Module access
        canAccessDashboard: ['admin', 'admin_akademik', 'guru', 'wali', 'bendahara', 'musyrif'].includes(role),
        canAccessSantri: ['admin', 'admin_akademik'].includes(role),
        canAccessGuru: ['admin', 'admin_akademik'].includes(role),
        canAccessKelas: ['admin', 'admin_akademik'].includes(role),
        canAccessHalaqoh: ['admin', 'admin_akademik'].includes(role),
        canAccessHafalan: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
        canAccessPresensi: ['admin', 'admin_akademik', 'guru'].includes(role),
        canAccessNilai: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
        canAccessLaporan: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
        canAccessSettings: ['admin'].includes(role),
        canAccessAuditLog: ['admin'].includes(role),
        canAccessWaliPortal: ['wali', 'admin'].includes(role),
        // Keuangan permissions
        canAccessKeuangan: ['admin', 'bendahara', 'pengasuh'].includes(role),
        canAccessKas: ['admin', 'bendahara', 'pengasuh'].includes(role),
        canAccessPembayaran: ['admin', 'bendahara', 'pengasuh'].includes(role),
        canAccessAnggaran: ['admin', 'bendahara'].includes(role), // Pengasuh cannot access Anggaran
        canAccessPersetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),

        // Keuangan CRUD - Pengasuh can only CRUD in Persetujuan
        canCrudKeuangan: ['admin', 'bendahara'].includes(role), // General keuangan CRUD
        canCrudPersetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role), // Persetujuan CRUD

        // CRUD operations
        canCreate: {
            santri: ['admin', 'admin_akademik'].includes(role),
            guru: ['admin', 'admin_akademik'].includes(role),
            kelas: ['admin', 'admin_akademik'].includes(role),
            halaqoh: ['admin', 'admin_akademik'].includes(role),
            hafalan: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            presensi: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            nilai: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            mapel: ['admin', 'admin_akademik'].includes(role),
            // Keuangan
            kas: ['admin', 'bendahara'].includes(role),
            pembayaran: ['admin', 'bendahara'].includes(role),
            tagihan: ['admin', 'bendahara'].includes(role),
            anggaran: ['admin', 'bendahara'].includes(role),
            persetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: ['admin', 'bendahara'].includes(role),
        },
        canUpdate: {
            santri: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            guru: ['admin', 'admin_akademik'].includes(role),
            kelas: ['admin', 'admin_akademik'].includes(role),
            halaqoh: ['admin', 'admin_akademik'].includes(role),
            hafalan: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            presensi: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            nilai: ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            mapel: ['admin', 'admin_akademik'].includes(role),
            // Keuangan
            kas: ['admin', 'bendahara'].includes(role),
            pembayaran: ['admin', 'bendahara'].includes(role),
            tagihan: ['admin', 'bendahara'].includes(role),
            anggaran: ['admin', 'bendahara'].includes(role),
            persetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: ['admin', 'bendahara'].includes(role),
        },
        canDelete: {
            santri: ['admin', 'admin_akademik'].includes(role),
            guru: ['admin', 'admin_akademik'].includes(role),
            kelas: ['admin', 'admin_akademik'].includes(role),
            halaqoh: ['admin', 'admin_akademik'].includes(role),
            hafalan: ['admin', 'admin_akademik', 'musyrif'].includes(role),
            presensi: ['admin', 'admin_akademik', 'musyrif'].includes(role),
            nilai: ['admin', 'admin_akademik', 'musyrif'].includes(role),
            mapel: ['admin', 'admin_akademik'].includes(role),
            // Keuangan
            kas: ['admin', 'bendahara'].includes(role),
            pembayaran: ['admin', 'bendahara'].includes(role),
            tagihan: ['admin', 'bendahara'].includes(role),
            anggaran: ['admin', 'bendahara'].includes(role),
            persetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: ['admin', 'bendahara'].includes(role),
        },
        canRead: {
            // Wali hanya bisa read data santri yang terhubung (enforced by RLS)
            santri: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            guru: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            kelas: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            halaqoh: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            hafalan: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            presensi: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            nilai: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            mapel: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            // Keuangan - Pengasuh can read all
            kas: ['admin', 'bendahara', 'pengasuh'].includes(role),
            pembayaran: ['admin', 'bendahara', 'pengasuh'].includes(role),
            tagihan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            anggaran: ['admin', 'bendahara'].includes(role),
            persetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: ['admin', 'bendahara', 'pengasuh'].includes(role),
        },
    }

    // Helper functions
    const hasPermission = (action, resource) => {
        if (!permissions[action]) return false
        if (typeof permissions[action] === 'boolean') return permissions[action]
        return permissions[action][resource] || false
    }

    const canCreate = (resource) => hasPermission('canCreate', resource)
    const canUpdate = (resource) => hasPermission('canUpdate', resource)
    const canDelete = (resource) => hasPermission('canDelete', resource)
    const canRead = (resource) => hasPermission('canRead', resource)

    const isAdmin = () => role === 'admin'
    const isGuru = () => role === 'guru'
    const isWali = () => role === 'wali'
    const isMusyrif = () => role === 'musyrif'
    const isAuthenticated = () => !!user

    // Check if user has any of the specified roles
    // Now checks both active role AND roles array for flexibility
    const hasRole = (roles) => {
        const userRoles = userProfile?.roles || []
        const currentRole = userProfile?.activeRole || userProfile?.role || 'guest'

        if (typeof roles === 'string') {
            return currentRole === roles || userRoles.includes(roles)
        }
        // Check if current active role is in allowed roles OR any roles array item is allowed
        return roles.includes(currentRole) || roles.some(r => userRoles.includes(r))
    }

    // Check if user actually possesses the role (regardless of active state)
    const hasAssignedRole = (targetRole) => {
        const userRoles = userProfile?.roles || []
        return userRoles.includes(targetRole)
    }

    // Check if user can access a specific route/module
    const canAccess = (module) => {
        const modulePermission = `canAccess${module.charAt(0).toUpperCase() + module.slice(1)}`
        return permissions[modulePermission] || false
    }

    return {
        role,
        permissions,
        hasPermission,
        canCreate,
        canUpdate,
        canDelete,
        canRead,
        canAccess,
        isAdmin,
        isGuru,
        isWali,
        isMusyrif,
        isAuthenticated,
        hasRole,
        hasAssignedRole,
    }
}

export default usePermissions
