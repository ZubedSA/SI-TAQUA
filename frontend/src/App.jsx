import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import Login from './pages/auth/Login'
import RoleSelectionPage from './pages/auth/RoleSelectionPage'

// Dashboard Components
import { AdminDashboard, AkademikDashboard, KeuanganDashboard, WaliSantriDashboard, PengurusDashboard, OTADashboard } from './pages/dashboards'

// Route Modules
import AdminRoutes from './routes/AdminRoutes'
import AkademikRoutes from './routes/AkademikRoutes'
import KeuanganRoutes from './routes/KeuanganRoutes'
import PengurusRoutes from './routes/PengurusRoutes'
import OTARoutes from './routes/OTARoutes'

// Wali Portal
import WaliLayout from './pages/walisantri/WaliLayout'
import WaliDashboardPage from './pages/walisantri/dashboard/WaliDashboardPage'
import HafalanWaliPage from './pages/walisantri/akademik/HafalanWaliPage'
import EvaluasiWaliPage from './pages/walisantri/akademik/EvaluasiWaliPage'
import KehadiranWaliPage from './pages/walisantri/akademik/KehadiranWaliPage'
import TagihanWaliPage from './pages/walisantri/keuangan/TagihanWaliPage'
import RiwayatBayarPage from './pages/walisantri/keuangan/RiwayatBayarPage'
import UploadBuktiPage from './pages/walisantri/keuangan/UploadBuktiPage'
import PengumumanPage from './pages/walisantri/informasi/PengumumanPage'
import ProfilWaliPage from './pages/walisantri/profil/ProfilWaliPage'

// Other Pages
import ProfilSettingsPage from './pages/profil/ProfilSettingsPage'
import MessagesPage from './pages/messages/MessagesPage'

import './index.css'
import './components/common/ErrorBoundary.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 detik - data lebih responsive
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true, // Auto-refetch saat focus kembali ke tab
      retry: 1
    },
  },
})

import VersionChecker from './components/system/VersionChecker'
import { CalendarProvider } from './context/CalendarContext'

// Dashboard redirect mapping based on active role
const dashboardRoutes = {
  admin: '/dashboard/admin',
  guru: '/dashboard/akademik',
  bendahara: '/dashboard/keuangan',
  pengasuh: '/dashboard/keuangan',
  pengurus: '/dashboard/pengurus',
  ota: '/dashboard/ota',
  musyrif: '/dashboard/akademik',
  wali: '/wali/beranda'
}

// Component untuk redirect berdasarkan role setelah login
const RoleBasedRedirect = () => {
  const { activeRole, loading } = useAuth()

  if (loading) {
    return <div className="loading">Memuat...</div>
  }

  const targetPath = dashboardRoutes[activeRole] || '/dashboard/admin'
  return <Navigate to={targetPath} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <VersionChecker />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CalendarProvider>
              <ToastProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/role-selection" element={
                    <ProtectedRoute>
                      <RoleSelectionPage />
                    </ProtectedRoute>
                  } />

                  {/* Protected Routes - Main Layout */}
                  <Route element={<Layout />}>
                    <Route path="/" element={
                      <ProtectedRoute>
                        <RoleBasedRedirect />
                      </ProtectedRoute>
                    } />

                    {/* Dashboards */}
                    <Route path="/dashboard/admin" element={
                      <ProtectedRoute roles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/akademik" element={
                      <ProtectedRoute roles={['admin', 'guru', 'musyrif']}>
                        <AkademikDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/keuangan" element={
                      <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']}>
                        <KeuanganDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/walisantri" element={
                      <ProtectedRoute roles={['wali']}>
                        <WaliSantriDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/pengurus" element={
                      <ProtectedRoute roles={['admin', 'pengurus']}>
                        <PengurusDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/ota" element={
                      <ProtectedRoute roles={['admin', 'ota']}>
                        <OTADashboard />
                      </ProtectedRoute>
                    } />

                    {/* Messages */}
                    <Route path="/messages" element={
                      <ProtectedRoute>
                        <MessagesPage />
                      </ProtectedRoute>
                    } />

                    {/* Profil Settings */}
                    <Route path="/profil-settings" element={
                      <ProtectedRoute>
                        <ProfilSettingsPage />
                      </ProtectedRoute>
                    } />

                    {/* Modular Routes */}
                    {AdminRoutes()}
                    {AkademikRoutes()}
                    {KeuanganRoutes()}
                    {PengurusRoutes()}
                    {OTARoutes()}

                    {/* 404 - Redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>

                  {/* Wali Portal Routes (Separate Layout) */}
                  <Route path="/wali" element={
                    <ProtectedRoute roles={['wali', 'admin']}>
                      <WaliLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/wali/beranda" replace />} />
                    <Route path="beranda" element={<WaliDashboardPage />} />
                    <Route path="akademik" element={<Navigate to="/wali/akademik/hafalan" replace />} />
                    <Route path="akademik/hafalan" element={<HafalanWaliPage />} />
                    <Route path="akademik/evaluasi" element={<EvaluasiWaliPage />} />
                    <Route path="akademik/kehadiran" element={<KehadiranWaliPage />} />
                    <Route path="keuangan" element={<TagihanWaliPage />} />
                    <Route path="keuangan/riwayat" element={<RiwayatBayarPage />} />
                    <Route path="keuangan/upload" element={<UploadBuktiPage />} />
                    <Route path="informasi" element={<PengumumanPage />} />
                    <Route path="profil" element={<ProfilWaliPage />} />
                  </Route>
                </Routes>
              </ToastProvider>
            </CalendarProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary >
  )
}

export default App
