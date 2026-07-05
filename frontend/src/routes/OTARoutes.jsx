import { lazyWithRetry as lazy } from '../utils/lazyWithRetry'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// OTA Admin Pages
const OTAList = lazy(() => import("../pages/ota/OTAList"));
const OTAForm = lazy(() => import("../pages/ota/OTAForm"));
const OTADetail = lazy(() => import("../pages/ota/OTADetail"));

// OTA Module Pages
const OTAKategoriPage = lazy(() => import('../pages/ota/OTAKategoriPage'))
const OTASantriPage = lazy(() => import('../pages/ota/OTASantriPage'))
const OTAPemasukanPage = lazy(() => import('../pages/ota/OTAPemasukanPage'))
const OTAPengeluaranPage = lazy(() => import('../pages/ota/OTAPengeluaranPage'))
const OTAPenyaluranPage = lazy(() => import('../pages/ota/OTAPenyaluranPage'))
const OTALaporanPage = lazy(() => import('../pages/ota/OTALaporanPage'))
const OTALaporanPenyaluranPage = lazy(() => import('../pages/ota/OTALaporanPenyaluranPage'))

const OTARoutes = () => {
    return (
        <>
            {/* OTA Management - Admin + OTA */}
            <Route path="/admin/ota" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTAList />
                </ProtectedRoute>
            } />
            <Route path="/admin/ota/create" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTAForm />
                </ProtectedRoute>
            } />
            <Route path="/admin/ota/:id" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTADetail />
                </ProtectedRoute>
            } />
            <Route path="/admin/ota/:id/edit" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTAForm />
                </ProtectedRoute>
            } />

            {/* OTA Kategori - Admin Only */}
            <Route path="/ota/kategori" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/ota">
                    <OTAKategoriPage />
                </ProtectedRoute>
            } />

            {/* OTA Santri Penerima - Admin + OTA */}
            <Route path="/ota/santri" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTASantriPage />
                </ProtectedRoute>
            } />

            {/* OTA Pemasukan - Admin + OTA */}
            <Route path="/ota/pemasukan" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTAPemasukanPage />
                </ProtectedRoute>
            } />

            {/* OTA Pengeluaran - Admin + OTA */}
            <Route path="/ota/pengeluaran" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTAPengeluaranPage />
                </ProtectedRoute>
            } />

            {/* OTA Penyaluran Dana - Admin + OTA */}
            <Route path="/ota/penyaluran" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTAPenyaluranPage />
                </ProtectedRoute>
            } />

            {/* OTA Laporan Keuangan - Admin + OTA */}
            <Route path="/ota/laporan" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTALaporanPage />
                </ProtectedRoute>
            } />

            {/* OTA Laporan Penyaluran - Admin + OTA */}
            <Route path="/ota/laporan-penyaluran" element={
                <ProtectedRoute roles={['admin', 'ota']} fallbackRedirect="/dashboard/ota">
                    <OTALaporanPenyaluranPage />
                </ProtectedRoute>
            } />
        </>
    )
}

export default OTARoutes
