import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// OTA Admin Pages
import OTAList from '../pages/admin/ota/OTAList'
import OTAForm from '../pages/admin/ota/OTAForm'
import OTADetail from '../pages/admin/ota/OTADetail'

// OTA Module Pages
import OTAKategoriPage from '../pages/ota/OTAKategoriPage'
import OTASantriPage from '../pages/ota/OTASantriPage'
import OTAPemasukanPage from '../pages/ota/OTAPemasukanPage'
import OTAPengeluaranPage from '../pages/ota/OTAPengeluaranPage'
import OTAPenyaluranPage from '../pages/ota/OTAPenyaluranPage'
import OTALaporanPage from '../pages/ota/OTALaporanPage'
import OTALaporanPenyaluranPage from '../pages/ota/OTALaporanPenyaluranPage'

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
