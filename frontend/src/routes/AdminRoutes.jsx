import { lazyWithRetry as lazy } from '../utils/lazyWithRetry'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Admin Pages
const UsersPage = lazy(() => import('../pages/users/UsersPage'))
const RolesPage = lazy(() => import('../pages/admin/RolesPage'))
const AuditLogPage = lazy(() => import('../pages/admin/AuditLogPage'))
const SuspiciousAccountsPage = lazy(() => import('../pages/admin/SuspiciousAccountsPage'))
const SystemStatusPage = lazy(() => import('../pages/system/SystemStatusPage'))
const PengaturanPage = lazy(() => import('../pages/pengaturan/PengaturanPage'))
const AdminAbsensiPage = lazy(() => import('../pages/absensi/AdminAbsensiPage'))

const AdminRoutes = () => {
    return (
        <>
            {/* User Management */}
            <Route path="/users" element={
                <ProtectedRoute roles={['admin']}>
                    <UsersPage />
                </ProtectedRoute>
            } />

            {/* Suspicious Accounts (Security) */}
            <Route path="/security" element={
                <ProtectedRoute roles={['admin']}>
                    <SuspiciousAccountsPage />
                </ProtectedRoute>
            } />

            {/* Roles & Permissions */}
            <Route path="/roles" element={
                <ProtectedRoute roles={['admin']}>
                    <RolesPage />
                </ProtectedRoute>
            } />

            {/* Audit Logs */}
            <Route path="/audit-log" element={
                <ProtectedRoute roles={['admin']}>
                    <AuditLogPage />
                </ProtectedRoute>
            } />

            {/* Admin Settings */}
            <Route path="/pengaturan" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                    <PengaturanPage />
                </ProtectedRoute>
            } />
            <Route path="/backup" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                    <SystemStatusPage title="Backup Data" />
                </ProtectedRoute>
            } />
            <Route path="/system-status" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                    <SystemStatusPage />
                </ProtectedRoute>
            } />

            {/* Attendance Management */}
            <Route path="/admin-absensi" element={
                <ProtectedRoute roles={['admin']}>
                    <AdminAbsensiPage />
                </ProtectedRoute>
            } />
        </>
    )
}

export default AdminRoutes
