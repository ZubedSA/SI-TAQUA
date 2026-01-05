import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * useAutoAudit - Hook untuk mencatat aktivitas navigasi otomatis
 * 
 * Fitur:
 * - Auto-detect modul dari URL
 * - Debounce navigasi cepat
 * - Mencatat Page View
 */
export const useAutoAudit = () => {
    const location = useLocation()
    const { user } = useAuth()
    const lastPath = useRef(location.pathname)
    const timeoutRef = useRef(null)

    const getModuleFromPath = (path) => {
        const segments = path.split('/').filter(Boolean)
        if (segments.length === 0) return 'HOME'

        // Mapping simple
        const moduleMap = {
            'keuangan': 'KEUANGAN',
            'akademik': 'AKADEMIK',
            'admin': 'ADMIN',
            'wali': 'WALISANTRI',
            'ota': 'OTA',
            'pengurus': 'PENGURUS'
        }

        const firstSegment = segments[0].toLowerCase()
        return moduleMap[firstSegment] || firstSegment.toUpperCase()
    }

    const logView = async (path) => {
        if (!user) return

        const moduleName = getModuleFromPath(path)

        try {
            await supabase.rpc('log_frontend_activity', {
                p_action: 'PAGE_VIEW',
                p_module: moduleName,
                p_details: {
                    path: path,
                    user_agent: navigator.userAgent
                }
            })
        } catch (err) {
            // Fail silently, don't block user
            console.warn('[Audit] Failed to log:', err)
        }
    }

    useEffect(() => {
        // Skip duplicate logs (React StrictMode double render handled by path check)
        if (location.pathname === lastPath.current && timeoutRef.current) return

        // Debounce to prevent recording rapid redirects
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(() => {
            lastPath.current = location.pathname
            logView(location.pathname)
        }, 1000) // 1 second delay to ensure page settlement

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [location.pathname, user])
}

export default useAutoAudit
