import { useState, useEffect, Suspense } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AbsensiSidebar from './AbsensiSidebar'
import AbsensiBottomNav from './AbsensiBottomNav'
import Header from './Header'
import QRScannerModal from '../absensi/QRScannerModal'
import { useToast } from '../../context/ToastContext'
import { Loader2 } from 'lucide-react'
import Spinner from '../ui/Spinner'
import { processAbsensiScan } from '../../utils/qrScanHelper'

const AbsensiLayout = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const showToast = useToast()
    const { loading, isAuthenticated, user, userProfile, isAdmin, isAdminAkademik, isAdminAbsensi } = useAuth()
    
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [validating, setValidating] = useState(false)
    const [pageKey, setPageKey] = useState(0)

    useEffect(() => {
        setPageKey(prev => prev + 1)
    }, [location.pathname])

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const closeSidebar = () => setSidebarOpen(false)

    const handleScanSuccess = async (decodedText) => {
        setIsScannerOpen(false)
        setValidating(true)

        try {
            const result = await processAbsensiScan({
                decodedText,
                user,
                userProfile,
                isAdmin,
                isAdminAkademik,
                isAdminAbsensi
            })

            if (!result.success) {
                showToast.error(result.message)
                return
            }

            showToast.success(result.message)
            navigate(`/absensi/agenda?jadwal_id=${result.targetJadwal.id}&t=${Date.now()}`)
        } catch (err) {
            console.error('Scan error:', err)
            showToast.error(err.message || 'Gagal memverifikasi QR Code.')
        } finally {
            setValidating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Spinner size="xl" label="Memuat portal absensi..." />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/absensi/login" replace />
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <AbsensiSidebar 
                    onScanClick={() => setIsScannerOpen(true)}
                />
            </div>

            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 lg:ml-[280px]">
                <Header onMenuClick={toggleSidebar} />
                
                <div key={pageKey} className="flex-1 px-4 py-6 md:px-6 lg:px-8 max-w-[1440px] w-full mx-auto pb-32 lg:pb-8 page-enter pt-24 md:pt-28">
                    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" label="Memuat halaman..." /></div>}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <AbsensiBottomNav onScanClick={() => setIsScannerOpen(true)} />

            <QRScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScanSuccess={handleScanSuccess}
            />

            {validating && (
                <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl flex items-center gap-4">
                        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        <span className="font-bold text-gray-700">Memverifikasi QR...</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AbsensiLayout
