import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, Suspense } from 'react'
import { lazyWithRetry as lazy } from './utils/lazyWithRetry'
import Spinner from './components/ui/Spinner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import LandingPage from './pages/LandingPage'

const Layout = lazy(() => import('./components/layout/Layout'));
const Login = lazy(() => import('./pages/auth/Login'));
const RoleSelectionPage = lazy(() => import('./pages/auth/RoleSelectionPage'));
const AbsensiLogin = lazy(() => import('./pages/absensi/AbsensiLogin'));
const AbsensiLayout = lazy(() => import('./components/layout/AbsensiLayout'));
const AbsensiPortal = lazy(() => import('./pages/absensi/AbsensiPortal'));
const AgendaMengajar = lazy(() => import('./pages/absensi/AgendaMengajar'));
const AbsensiQuraniyah = lazy(() => import('./pages/absensi/AbsensiQuraniyah'));
const GerbangPijar = lazy(() => import('./pages/absensi/GerbangPijar'));
const AdminAbsensiPage = lazy(() => import('./pages/absensi/AdminAbsensiPage'));

// Dashboard Components
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
const AkademikDashboard = lazy(() => import('./pages/dashboards/AkademikDashboard'));
const KeuanganDashboard = lazy(() => import('./pages/dashboards/KeuanganDashboard'));
const WaliSantriDashboard = lazy(() => import('./pages/dashboards/WaliSantriDashboard'));
const PengurusDashboard = lazy(() => import('./pages/dashboards/PengurusDashboard'));
const OTADashboard = lazy(() => import('./pages/dashboards/OTADashboard'));

// Route Modules
import AdminRoutes from './routes/AdminRoutes'
import AkademikRoutes from './routes/AkademikRoutes'
import KeuanganRoutes from './routes/KeuanganRoutes'
import PengurusRoutes from './routes/PengurusRoutes'
import OTARoutes from './routes/OTARoutes'
const CetakRaport = lazy(() => import('./pages/akademik/raport/CetakRaport'));

// Wali Portal
const WaliLayout = lazy(() => import('./pages/walisantri/WaliLayout'));
const WaliDashboardPage = lazy(() => import('./pages/walisantri/dashboard/WaliDashboardPage'));
const WaliAkademikPage = lazy(() => import('./pages/walisantri/akademik/WaliAkademikPage'));
const HafalanWaliPage = lazy(() => import('./pages/walisantri/akademik/HafalanWaliPage'));
const EvaluasiWaliPage = lazy(() => import('./pages/walisantri/akademik/EvaluasiWaliPage'));
const KehadiranWaliPage = lazy(() => import('./pages/walisantri/akademik/KehadiranWaliPage'));
const TagihanWaliPage = lazy(() => import('./pages/walisantri/keuangan/TagihanWaliPage'));
const RiwayatBayarPage = lazy(() => import('./pages/walisantri/keuangan/RiwayatBayarPage'));
const UploadBuktiPage = lazy(() => import('./pages/walisantri/keuangan/UploadBuktiPage'));
const PengumumanPage = lazy(() => import('./pages/walisantri/informasi/PengumumanPage'));
const ProfilWaliPage = lazy(() => import('./pages/walisantri/profil/ProfilWaliPage'));
const LaporanWaliPage = lazy(() => import('./pages/walisantri/laporan/LaporanWaliPage'));
const RaportWaliPage = lazy(() => import('./pages/walisantri/laporan/RaportWaliPage'));

// Other Pages
const ProfilSettingsPage = lazy(() => import('./pages/profil/ProfilSettingsPage'));
const MessagesPage = lazy(() => import('./pages/messages/MessagesPage'));

import './index.css'
import './components/common/ErrorBoundary.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes by default
      gcTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false, // Don't refetch every time tab is focused
      retry: 1
    },
  },
})

import VersionChecker from './components/system/VersionChecker'
import { CalendarProvider } from './context/CalendarContext'

const dashboardRoutes = {
  admin: '/dashboard/admin',
  admin_akademik: '/dashboard/akademik',
  guru: '/dashboard/akademik',
  bendahara: '/dashboard/keuangan',
  pengasuh: '/dashboard/keuangan',
  pengurus: '/dashboard/pengurus',
  ota: '/dashboard/ota',
  musyrif: '/dashboard/akademik',
  wali: '/wali/beranda'
}

const RoleBasedRedirect = () => {
  const { activeRole, loading } = useAuth()
  if (loading) return <div className="loading">Memuat...</div>
  const targetPath = dashboardRoutes[activeRole] || '/dashboard/admin'
  return <Navigate to={targetPath} replace />
}

// Component untuk isolasi rute absensi
const AbsensiIsolationManager = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  
  useEffect(() => {
    const isAbsensiMode = localStorage.getItem('sitaqua_absensi_mode') === 'true'
    const isAbsensiPath = location.pathname.startsWith('/absensi')
    const isPublicPath = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/absensi/login'
    const isMainSystemPath = location.pathname.startsWith('/dashboard') || 
                             location.pathname.startsWith('/home') ||
                             location.pathname.startsWith('/role-selection') ||
                             location.pathname.startsWith('/wali') ||
                             location.pathname.startsWith('/profil') ||
                             location.pathname.startsWith('/messages') ||
                             location.pathname.startsWith('/raport')

    // Jika sedang di path absensi, simpan sebagai path terakhir
    if (isAbsensiMode && isAbsensiPath) {
      localStorage.setItem('sitaqua_last_absensi_path', location.pathname)
    }

    // Jika user mengakses rute sistem utama, hapus flag absensi mode
    if (isAbsensiMode && isMainSystemPath) {
      console.log('[Isolation] User accessing main system, clearing absensi mode')
      localStorage.removeItem('sitaqua_absensi_mode')
      localStorage.removeItem('sitaqua_last_absensi_path')
      return
    }

    // REDIREKSI UTAMA: Jika user buka root (/) saat masih dalam mode absensi
    if (isAbsensiMode && location.pathname === '/') {
      const lastPath = localStorage.getItem('sitaqua_last_absensi_path') || '/absensi/home'
      console.log('[Isolation] Redirecting to last absensi path:', lastPath)
      navigate(lastPath, { replace: true })
      return
    }

    if (isAbsensiMode && !isAbsensiPath && !isPublicPath) {
      console.log('[Isolation] Restricting access to non-absensi route:', location.pathname)
      const lastPath = localStorage.getItem('sitaqua_last_absensi_path') || '/absensi/home'
      navigate(lastPath, { replace: true })
    }
  }, [location.pathname, navigate])

  return children
}

function App() {
  return (
    <ErrorBoundary>
      <VersionChecker />
      <PWAInstallPrompt />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CalendarProvider>
              <ToastProvider>
                <AbsensiIsolationManager>
                  <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spinner size="xl" label="Memuat SI-TAQUA..." /></div>}>
                    <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    
                    {/* Absensi Portal Routes */}
                    <Route path="/absensi/login" element={<AbsensiLogin />} />
                    <Route path="/absensi" element={
                      <ProtectedRoute redirectTo="/absensi/login" fallbackRedirect="/absensi/home">
                        <AbsensiLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<Navigate to="/absensi/home" replace />} />
                      <Route path="home" element={<AbsensiPortal />} />
                      <Route path="agenda" element={<AgendaMengajar />} />
                      <Route path="quraniyah" element={<AbsensiQuraniyah />} />
                      <Route path="gerbang-pijar" element={<GerbangPijar />} />
                      <Route path="admin" element={
                        <ProtectedRoute roles={['admin', 'admin_absensi']} fallbackRedirect="/absensi/home">
                          <AdminAbsensiPage />
                        </ProtectedRoute>
                      } />
                    </Route>

                    <Route path="/role-selection" element={
                      <ProtectedRoute>
                        <RoleSelectionPage />
                      </ProtectedRoute>
                    } />

                    {/* Protected Routes - Main Layout */}
                    <Route element={<Layout />}>
                      <Route path="/home" element={
                        <ProtectedRoute>
                          <RoleBasedRedirect />
                        </ProtectedRoute>
                      } />

                      <Route path="/dashboard/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/akademik" element={<ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']}><AkademikDashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/keuangan" element={<ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']}><KeuanganDashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/walisantri" element={<ProtectedRoute roles={['wali']}><WaliSantriDashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/pengurus" element={<ProtectedRoute roles={['admin', 'pengurus']}><PengurusDashboard /></ProtectedRoute>} />
                      <Route path="/dashboard/ota" element={<ProtectedRoute roles={['admin', 'ota']}><OTADashboard /></ProtectedRoute>} />

                      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                      <Route path="/profil-settings" element={<ProtectedRoute><ProfilSettingsPage /></ProtectedRoute>} />

                      {AdminRoutes()}
                      {AkademikRoutes()}
                      {KeuanganRoutes()}
                      {PengurusRoutes()}
                      {OTARoutes()}

                      <Route path="*" element={<Navigate to="/home" replace />} />
                    </Route>

                    {/* Wali Portal Routes */}
                    <Route path="/wali" element={<ProtectedRoute roles={['wali', 'admin']}><WaliLayout /></ProtectedRoute>}>
                      <Route index element={<Navigate to="/wali/beranda" replace />} />
                      <Route path="beranda" element={<WaliDashboardPage />} />
                      <Route path="akademik" element={<WaliAkademikPage />} />
                      <Route path="akademik/hafalan" element={<HafalanWaliPage />} />
                      <Route path="akademik/evaluasi" element={<EvaluasiWaliPage />} />
                      <Route path="akademik/kehadiran" element={<KehadiranWaliPage />} />
                      <Route path="keuangan" element={<TagihanWaliPage />} />
                      <Route path="keuangan/riwayat" element={<RiwayatBayarPage />} />
                      <Route path="keuangan/upload" element={<UploadBuktiPage />} />
                      <Route path="laporan" element={<LaporanWaliPage />} />
                      <Route path="laporan/hafalan" element={<HafalanWaliPage />} />
                      <Route path="laporan/pembayaran" element={<RiwayatBayarPage />} />
                      <Route path="laporan/raport" element={<RaportWaliPage />} />
                      <Route path="informasi" element={<PengumumanPage />} />
                      <Route path="profil" element={<ProfilWaliPage />} />
                    </Route>

                    <Route path="/raport/cetak/:santriId/:semesterId" element={<ProtectedRoute><CetakRaport /></ProtectedRoute>} />
                    </Routes>
                  </Suspense>
                </AbsensiIsolationManager>
              </ToastProvider>
            </CalendarProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary >
  )
}

export default App
