import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getRolePermissions } from '../utils/permissionStorage'

/**
 * Custom hook untuk permission checking
 * Menggunakan RBAC (Role Based Access Control) dinamis
 */
export const usePermissions = () => {
    const { userProfile, user } = useAuth()
    const [rolePermissions, setRolePermissions] = useState(getRolePermissions())
    
    // Multiple fallback untuk role detection - check activeRole, role, then user metadata
    const metadataRole = user?.user_metadata?.role || user?.role
    const role = userProfile?.activeRole || userProfile?.role || metadataRole || 'guest'

    // Listen for permissions updates in real-time
    useEffect(() => {
        const handlePermissionsUpdated = (event) => {
            if (event.detail) {
                setRolePermissions(event.detail)
            } else {
                setRolePermissions(getRolePermissions())
            }
        }

        window.addEventListener('sitaqua_permissions_updated', handlePermissionsUpdated)
        return () => {
            window.removeEventListener('sitaqua_permissions_updated', handlePermissionsUpdated)
        }
    }, [])

    /**
     * Check if current role has access to specific module ID (from permissionStorage)
     */
    const hasModuleAccess = (moduleId) => {
        if (role === 'admin') return true // Super admin always has access
        const allowedRoles = rolePermissions[moduleId] || []
        return allowedRoles.includes(role)
    }

    // Permission definitions with dynamic matrix integration
    const permissions = {
        // Module access
        canAccessDashboard: hasModuleAccess('dashboard_admin') || hasModuleAccess('dashboard_akademik') || hasModuleAccess('dashboard_keuangan') || hasModuleAccess('dashboard_pengurus') || hasModuleAccess('dashboard_ota') || hasModuleAccess('dashboard_wali'),
        canAccessSantri: hasModuleAccess('santri'),
        canAccessGuru: hasModuleAccess('guru'),
        canAccessKelas: hasModuleAccess('kelas'),
        canAccessHalaqoh: hasModuleAccess('halaqoh'),
        canAccessHafalan: hasModuleAccess('hafalan_input') || hasModuleAccess('hafalan_rekap'),
        canAccessPresensi: hasModuleAccess('presensi_akademik'),
        canAccessNilai: hasModuleAccess('nilai_input') || hasModuleAccess('nilai_rekap'),
        canAccessLaporan: hasModuleAccess('raport') || hasModuleAccess('hafalan_rekap') || hasModuleAccess('nilai_rekap'),
        canAccessSettings: hasModuleAccess('settings'),
        canAccessAuditLog: hasModuleAccess('audit_log'),
        canAccessWaliPortal: hasModuleAccess('dashboard_wali'),
        
        // Keuangan permissions
        canAccessKeuangan: hasModuleAccess('dashboard_keuangan'),
        canAccessKas: hasModuleAccess('kas_pemasukan') || hasModuleAccess('kas_pengeluaran'),
        canAccessPembayaran: hasModuleAccess('pembayaran_santri') || hasModuleAccess('tagihan_spp'),
        canAccessAnggaran: hasModuleAccess('anggaran'),
        canAccessPersetujuan: hasModuleAccess('persetujuan_dana'),

        // Keuangan CRUD
        canCrudKeuangan: ['admin', 'bendahara'].includes(role),
        canCrudPersetujuan: ['admin', 'bendahara', 'pengasuh'].includes(role),

        // CRUD operations
        canCreate: {
            santri: hasModuleAccess('santri') && ['admin', 'admin_akademik'].includes(role),
            guru: hasModuleAccess('guru') && ['admin', 'admin_akademik'].includes(role),
            kelas: hasModuleAccess('kelas') && ['admin', 'admin_akademik'].includes(role),
            halaqoh: hasModuleAccess('halaqoh') && ['admin', 'admin_akademik'].includes(role),
            hafalan: hasModuleAccess('hafalan_input'),
            presensi: hasModuleAccess('presensi_akademik'),
            nilai: hasModuleAccess('nilai_input'),
            mapel: hasModuleAccess('mapel') && ['admin', 'admin_akademik'].includes(role),
            kas: hasModuleAccess('kas_pemasukan') && ['admin', 'bendahara'].includes(role),
            pembayaran: hasModuleAccess('pembayaran_santri') && ['admin', 'bendahara'].includes(role),
            tagihan: hasModuleAccess('tagihan_spp') && ['admin', 'bendahara'].includes(role),
            anggaran: hasModuleAccess('anggaran') && ['admin', 'bendahara'].includes(role),
            persetujuan: hasModuleAccess('persetujuan_dana') && ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: hasModuleAccess('anggaran') && ['admin', 'bendahara'].includes(role),
        },
        canUpdate: {
            santri: hasModuleAccess('santri') && ['admin', 'admin_akademik', 'guru', 'musyrif'].includes(role),
            guru: hasModuleAccess('guru') && ['admin', 'admin_akademik'].includes(role),
            kelas: hasModuleAccess('kelas') && ['admin', 'admin_akademik'].includes(role),
            halaqoh: hasModuleAccess('halaqoh') && ['admin', 'admin_akademik'].includes(role),
            hafalan: hasModuleAccess('hafalan_input'),
            presensi: hasModuleAccess('presensi_akademik'),
            nilai: hasModuleAccess('nilai_input'),
            mapel: hasModuleAccess('mapel') && ['admin', 'admin_akademik'].includes(role),
            kas: hasModuleAccess('kas_pemasukan') && ['admin', 'bendahara'].includes(role),
            pembayaran: hasModuleAccess('pembayaran_santri') && ['admin', 'bendahara'].includes(role),
            tagihan: hasModuleAccess('tagihan_spp') && ['admin', 'bendahara'].includes(role),
            anggaran: hasModuleAccess('anggaran') && ['admin', 'bendahara'].includes(role),
            persetujuan: hasModuleAccess('persetujuan_dana') && ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: hasModuleAccess('anggaran') && ['admin', 'bendahara'].includes(role),
        },
        canDelete: {
            santri: hasModuleAccess('santri') && ['admin', 'admin_akademik'].includes(role),
            guru: hasModuleAccess('guru') && ['admin', 'admin_akademik'].includes(role),
            kelas: hasModuleAccess('kelas') && ['admin', 'admin_akademik'].includes(role),
            halaqoh: hasModuleAccess('halaqoh') && ['admin', 'admin_akademik'].includes(role),
            hafalan: hasModuleAccess('hafalan_input') && ['admin', 'admin_akademik', 'musyrif'].includes(role),
            presensi: hasModuleAccess('presensi_akademik') && ['admin', 'admin_akademik', 'musyrif'].includes(role),
            nilai: hasModuleAccess('nilai_input') && ['admin', 'admin_akademik', 'musyrif'].includes(role),
            mapel: hasModuleAccess('mapel') && ['admin', 'admin_akademik'].includes(role),
            kas: hasModuleAccess('kas_pemasukan') && ['admin', 'bendahara'].includes(role),
            pembayaran: hasModuleAccess('pembayaran_santri') && ['admin', 'bendahara'].includes(role),
            tagihan: hasModuleAccess('tagihan_spp') && ['admin', 'bendahara'].includes(role),
            anggaran: hasModuleAccess('anggaran') && ['admin', 'bendahara'].includes(role),
            persetujuan: hasModuleAccess('persetujuan_dana') && ['admin', 'bendahara', 'pengasuh'].includes(role),
            realisasi: hasModuleAccess('anggaran') && ['admin', 'bendahara'].includes(role),
        },
        canRead: {
            santri: hasModuleAccess('santri'),
            guru: hasModuleAccess('guru'),
            kelas: hasModuleAccess('kelas'),
            halaqoh: hasModuleAccess('halaqoh'),
            hafalan: hasModuleAccess('hafalan_input') || hasModuleAccess('hafalan_rekap'),
            presensi: hasModuleAccess('presensi_akademik'),
            nilai: hasModuleAccess('nilai_input') || hasModuleAccess('nilai_rekap'),
            mapel: hasModuleAccess('mapel'),
            kas: hasModuleAccess('kas_pemasukan') || hasModuleAccess('kas_pengeluaran'),
            pembayaran: hasModuleAccess('pembayaran_santri'),
            tagihan: hasModuleAccess('tagihan_spp'),
            anggaran: hasModuleAccess('anggaran'),
            persetujuan: hasModuleAccess('persetujuan_dana'),
            realisasi: hasModuleAccess('anggaran'),
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
    const isAdminAkademik = () => role === 'admin_akademik'
    const isGuru = () => role === 'guru'
    const isWali = () => role === 'wali'
    const isMusyrif = () => role === 'musyrif'
    const isBendahara = () => role === 'bendahara'
    const isPengasuh = () => role === 'pengasuh'
    const isPengurus = () => role === 'pengurus'
    const isOTA = () => role === 'ota'
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
        return permissions[modulePermission] !== undefined ? permissions[modulePermission] : hasModuleAccess(module)
    }

    return {
        role,
        permissions,
        rolePermissions,
        hasModuleAccess,
        hasPermission,
        canCreate,
        canUpdate,
        canDelete,
        canRead,
        canAccess,
        isAdmin,
        isAdminAkademik,
        isGuru,
        isWali,
        isMusyrif,
        isBendahara,
        isPengasuh,
        isPengurus,
        isOTA,
        isAuthenticated,
        hasRole,
        hasAssignedRole,
    }
}

export default usePermissions
