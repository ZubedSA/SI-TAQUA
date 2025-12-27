import { useAuth } from '../context/AuthContext'

/**
 * Custom hook untuk permission checking
 * Menggunakan RBAC (Role Based Access Control)
 */
export const usePermissions = () => {
    const { userProfile, user } = useAuth()
    const role = userProfile?.role || 'guest'

    // Permission definitions
    const permissions = {
        // Module access
        canAccessDashboard: ['admin', 'guru', 'wali', 'bendahara'].includes(role),
        canAccessSantri: ['admin', 'guru'].includes(role),
        canAccessGuru: ['admin'].includes(role),
        canAccessKelas: ['admin'].includes(role),
        canAccessHalaqoh: ['admin'].includes(role),
        canAccessHafalan: ['admin', 'guru'].includes(role),
        canAccessPresensi: ['admin', 'guru'].includes(role),
        canAccessNilai: ['admin', 'guru'].includes(role),
        canAccessLaporan: ['admin', 'guru'].includes(role),
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
            santri: ['admin'].includes(role),
            guru: ['admin'].includes(role),
            kelas: ['admin'].includes(role),
            halaqoh: ['admin'].includes(role),
            hafalan: ['admin', 'guru'].includes(role),
            presensi: ['admin', 'guru'].includes(role),
            nilai: ['admin', 'guru'].includes(role),
            mapel: ['admin'].includes(role),
            // Keuangan
            kas: ['admin', 'bendahara'].includes(role),
            pembayaran: ['admin', 'bendahara'].includes(role),
            tagihan: ['admin', 'bendahara'].includes(role),
            anggaran: ['admin', 'bendahara'].includes(role),
            persetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: ['admin', 'bendahara'].includes(role),
        },
        canUpdate: {
            santri: ['admin', 'guru'].includes(role),
            guru: ['admin'].includes(role),
            kelas: ['admin'].includes(role),
            halaqoh: ['admin'].includes(role),
            hafalan: ['admin', 'guru'].includes(role),
            presensi: ['admin', 'guru'].includes(role),
            nilai: ['admin', 'guru'].includes(role),
            mapel: ['admin'].includes(role),
            // Keuangan
            kas: ['admin', 'bendahara'].includes(role),
            pembayaran: ['admin', 'bendahara'].includes(role),
            tagihan: ['admin', 'bendahara'].includes(role),
            anggaran: ['admin', 'bendahara'].includes(role),
            persetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: ['admin', 'bendahara'].includes(role),
        },
        canDelete: {
            santri: ['admin'].includes(role),
            guru: ['admin'].includes(role),
            kelas: ['admin'].includes(role),
            halaqoh: ['admin'].includes(role),
            hafalan: ['admin'].includes(role),
            presensi: ['admin'].includes(role),
            nilai: ['admin'].includes(role),
            mapel: ['admin'].includes(role),
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
            santri: ['admin', 'guru', 'wali'].includes(role),
            guru: ['admin', 'guru', 'wali'].includes(role),
            kelas: ['admin', 'guru', 'wali'].includes(role),
            halaqoh: ['admin', 'guru', 'wali'].includes(role),
            hafalan: ['admin', 'guru', 'wali'].includes(role),
            presensi: ['admin', 'guru', 'wali'].includes(role),
            nilai: ['admin', 'guru', 'wali'].includes(role),
            mapel: ['admin', 'guru', 'wali'].includes(role),
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
    const isAuthenticated = () => !!user

    // Check if user has any of the specified roles
    const hasRole = (roles) => {
        if (typeof roles === 'string') return role === roles
        return roles.includes(role)
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
        isAuthenticated,
        hasRole,
    }
}

export default usePermissions
