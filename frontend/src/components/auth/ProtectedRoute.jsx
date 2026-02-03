import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../context/ToastContext'
import { useEffect, useRef } from 'react'

// Global throttling to prevent toast spam
let lastUnauthorizedToastTime = 0
const TOAST_COOLDOWN = 2000 // 2 seconds

/**
 * Helper component to handle redirect with notification
 */
const UnauthorizedRedirect = ({ to, message }) => {
    const showToast = useToast()

    useEffect(() => {
        const now = Date.now()
        if (message && (now - lastUnauthorizedToastTime > TOAST_COOLDOWN)) {
            showToast.error(message, 'Akses Ditolak')
            lastUnauthorizedToastTime = now
        }
    }, [message, showToast])

    return <Navigate to={to} replace />
}

/**
 * Enhanced Protected Route Component
 * Protects routes based on authentication and permissions
 * 
 * @param {ReactNode} children - Component to render if authorized
 * @param {Array|string} roles - Allowed roles (optional)
 * @param {string} module - Module name for permission check (optional)
 * @param {string} redirectTo - Path to redirect if unauthorized
 * @param {boolean} requireAuth - Whether authentication is required (default true)
 * @param {string} unauthorizedMessage - Message to show when access is denied
 */
const ProtectedRoute = ({
    children,
    roles = null,
    module = null,
    redirectTo = '/login',
    fallbackRedirect = '/',
    requireAuth = true,
    unauthorizedMessage = 'Anda tidak memiliki akses ke halaman ini'
}) => {
    const { user, loading } = useAuth()
    const { hasRole, canAccess, isAuthenticated } = usePermissions()
    const location = useLocation()

    // Show loading state
    if (loading) {
        return (
            <div className="loading-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e5e7eb',
                    borderTopColor: '#059669',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p>Memuat...</p>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    // Check authentication
    if (requireAuth && !user) {
        // Save the attempted URL for redirect after login
        return <Navigate to={redirectTo} state={{ from: location }} replace />
    }

    // Check role-based access
    if (roles) {
        const allowedRoles = Array.isArray(roles) ? roles : [roles]
        if (!hasRole(allowedRoles)) {
            return <UnauthorizedRedirect to={fallbackRedirect} message={unauthorizedMessage} />
        }
    }

    // Check module-based access
    if (module && !canAccess(module)) {
        return <UnauthorizedRedirect to={fallbackRedirect} message={unauthorizedMessage} />
    }

    return children
}

/**
 * Higher-order component for protecting routes
 * Usage: withProtection(Component, { roles: ['admin'], module: 'settings' })
 */
export const withProtection = (WrappedComponent, options = {}) => {
    return function ProtectedComponent(props) {
        return (
            <ProtectedRoute {...options}>
                <WrappedComponent {...props} />
            </ProtectedRoute>
        )
    }
}

/**
 * Component to conditionally render based on permissions
 * Usage: <PermissionGate roles={['admin']}><AdminButton /></PermissionGate>
 */
export const PermissionGate = ({
    children,
    roles = null,
    module = null,
    fallback = null
}) => {
    const { hasRole, canAccess } = usePermissions()

    // Check role-based access
    if (roles) {
        const allowedRoles = Array.isArray(roles) ? roles : [roles]
        if (!hasRole(allowedRoles)) {
            return fallback
        }
    }

    // Check module-based access
    if (module && !canAccess(module)) {
        return fallback
    }

    return children
}

/**
 * Component for CRUD operation permissions
 * Usage: <CrudGate action="create" resource="santri"><CreateButton /></CrudGate>
 */
export const CrudGate = ({
    children,
    action,
    resource,
    fallback = null
}) => {
    const { canCreate, canUpdate, canDelete, canRead } = usePermissions()

    const checkPermission = () => {
        switch (action) {
            case 'create': return canCreate(resource)
            case 'update': return canUpdate(resource)
            case 'delete': return canDelete(resource)
            case 'read': return canRead(resource)
            default: return false
        }
    }

    if (!checkPermission()) {
        return fallback
    }

    return children
}

export default ProtectedRoute
