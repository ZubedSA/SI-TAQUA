import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Admin Pages
import UsersPage from '../pages/users/UsersPage'
import RolesPage from '../pages/admin/RolesPage'
import AuditLogPage from '../pages/admin/AuditLogPage'
import SuspiciousAccountsPage from '../pages/admin/SuspiciousAccountsPage'
import BackupPage from '../pages/backup/BackupPage'
import SystemStatusPage from '../pages/system/SystemStatusPage'
import PengaturanPage from '../pages/pengaturan/PengaturanPage'

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
                    <BackupPage />
                </ProtectedRoute>
            } />
            <Route path="/system-status" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                    <SystemStatusPage />
                </ProtectedRoute>
            } />
        </>
    )
}

export default AdminRoutes
