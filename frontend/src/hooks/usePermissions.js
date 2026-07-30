import { useAuth } from '../context/AuthContext'

/**
 * Custom hook untuk permission checking
 * Menggunakan RBAC (Role Based Access Control)
 */
export const usePermissions = () => {
    const { userProfile, user, hasRole: authHasRole } = useAuth()
    
    // Multiple fallback untuk role detection - check activeRole, role, then user metadata
    const metadataRole = user?.user_metadata?.role || user?.role
    const role = userProfile?.activeRole || userProfile?.role || metadataRole || 'guest'

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
        canAccessAnggaran: ['admin', 'bendahara'].includes(role),
        canAccessPersetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),

        // Keuangan CRUD
        canCrudKeuangan: ['admin', 'bendahara'].includes(role),
        canCrudPersetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),

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
            kas: ['admin', 'bendahara'].includes(role),
            pembayaran: ['admin', 'bendahara'].includes(role),
            tagihan: ['admin', 'bendahara'].includes(role),
            anggaran: ['admin', 'bendahara'].includes(role),
            persetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: ['admin', 'bendahara'].includes(role),
        },
        canRead: {
            santri: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            guru: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            kelas: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            halaqoh: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            hafalan: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            presensi: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            nilai: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
            mapel: ['admin', 'admin_akademik', 'guru', 'wali', 'musyrif'].includes(role),
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
    const hasRole = (roles) => {
        if (!user) return false
        const userRoles = userProfile?.roles?.length ? userProfile.roles : (userProfile?.role ? [userProfile.role] : (metadataRole ? [metadataRole] : []))
        const currentRole = userProfile?.activeRole || userProfile?.role || metadataRole || 'guest'

        if (typeof roles === 'string') {
            return currentRole === roles || userRoles.includes(roles)
        }
        return roles.includes(currentRole) || roles.some(r => userRoles.includes(r))
    }

    const hasAssignedRole = (targetRole) => {
        const userRoles = userProfile?.roles || (userProfile?.role ? [userProfile.role] : (metadataRole ? [metadataRole] : []))
        return userRoles.includes(targetRole)
    }

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
