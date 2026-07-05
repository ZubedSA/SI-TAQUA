import { lazyWithRetry as lazy } from '../utils/lazyWithRetry'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Pengurus Pages
const PelanggaranPage = lazy(() => import('../pages/pengurus/pelanggaran/PelanggaranPage'))
const PelanggaranForm = lazy(() => import('../pages/pengurus/pelanggaran/PelanggaranForm'))
const PelanggaranRekap = lazy(() => import('../pages/pengurus/pelanggaran/PelanggaranRekap'))
const PengumumanInternalPage = lazy(() => import('../pages/pengurus/pengumuman/PengumumanPage'))
const SantriBermasalahPage = lazy(() => import('../pages/pengurus/santri-bermasalah/SantriBermasalahPage'))
const InformasiPondokPage = lazy(() => import('../pages/pengurus/informasi/InformasiPondokPage'))
const BuletinPage = lazy(() => import('../pages/pengurus/buletin/BuletinPage'))
const ArsipPage = lazy(() => import('../pages/pengurus/arsip/ArsipPage'))

const PengurusRoutes = () => {
    return (
        <>
            {/* Pelanggaran */}
            <Route path="/pengurus/pelanggaran" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <PelanggaranPage />
                </ProtectedRoute>
            } />
            <Route path="/pengurus/pelanggaran/create" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <PelanggaranForm />
                </ProtectedRoute>
            } />
            <Route path="/pengurus/pelanggaran/:id" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <PelanggaranForm />
                </ProtectedRoute>
            } />
            <Route path="/pengurus/pelanggaran/:id/edit" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <PelanggaranForm />
                </ProtectedRoute>
            } />
            <Route path="/pengurus/pelanggaran/rekap" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <PelanggaranRekap />
                </ProtectedRoute>
            } />

            {/* Santri Bermasalah */}
            <Route path="/pengurus/santri-bermasalah" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <SantriBermasalahPage />
                </ProtectedRoute>
            } />

            {/* Pengumuman */}
            <Route path="/pengurus/pengumuman" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <PengumumanInternalPage />
                </ProtectedRoute>
            } />

            {/* Informasi Pondok */}
            <Route path="/pengurus/informasi" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <InformasiPondokPage />
                </ProtectedRoute>
            } />

            {/* Buletin */}
            <Route path="/pengurus/buletin" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <BuletinPage />
                </ProtectedRoute>
            } />

            {/* Arsip */}
            <Route path="/pengurus/arsip" element={
                <ProtectedRoute roles={['admin', 'pengurus']} fallbackRedirect="/dashboard/pengurus">
                    <ArsipPage />
                </ProtectedRoute>
            } />
        </>
    )
}

export default PengurusRoutes
