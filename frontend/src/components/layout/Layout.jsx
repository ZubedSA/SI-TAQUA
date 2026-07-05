import { useState, useEffect, Suspense } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import FloatingChatButton from '../chat/FloatingChatButton'
import Spinner from '../ui/Spinner'
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

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const closeSidebar = () => setSidebarOpen(false)

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Spinner size="xl" label="Memuat aplikasi..." />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return (
        <div className="min-h-screen bg-[#F4F6F4] flex">
            {/* Sidebar */}
            <Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main Content */}
            <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-[260px]`}>
                <Header onMenuClick={toggleSidebar} />
                
                {/* Mobile-only Universal Bottom Navigation */}
                <BottomNav />

                <div className="flex-1 px-4 py-6 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto pb-20 lg:pb-0 pt-24 md:pt-28 lg:pt-28">
                    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" label="Memuat halaman..." /></div>}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>

            {/* Floating Chat Button */}
            <FloatingChatButton />
        </div>
    )
}

export default Layout


