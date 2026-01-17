import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import FloatingChatButton from '../chat/FloatingChatButton'
import { Loader2 } from 'lucide-react'
import { useAutoAudit } from '../../hooks/useAutoAudit'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const Layout = () => {
    // Auto-log navigation events
    useAutoAudit()

    // Initialize scroll animations
    useScrollAnimation()

    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { loading, isAuthenticated } = useAuth()

    // Key for triggering page animation on route change
    const [pageKey, setPageKey] = useState(0)

    useEffect(() => {
        // Trigger new animation on route change
        setPageKey(prev => prev + 1)
    }, [location.pathname])

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const closeSidebar = () => setSidebarOpen(false)

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Memuat aplikasi...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main Content */}
            <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[260px]`}>
                <Header onMenuClick={toggleSidebar} />

                <div key={pageKey} className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto page-enter">
                    <Outlet />
                </div>
            </main>

            {/* Floating Chat Button */}
            <FloatingChatButton />
        </div>
    )
}

export default Layout


