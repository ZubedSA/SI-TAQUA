import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Pengurus Pages
import PelanggaranPage from '../pages/pengurus/pelanggaran/PelanggaranPage'
import PelanggaranForm from '../pages/pengurus/pelanggaran/PelanggaranForm'
import PengumumanInternalPage from '../pages/pengurus/pengumuman/PengumumanPage'
import SantriBermasalahPage from '../pages/pengurus/santri-bermasalah/SantriBermasalahPage'
import InformasiPondokPage from '../pages/pengurus/informasi/InformasiPondokPage'
import BuletinPage from '../pages/pengurus/buletin/BuletinPage'
import ArsipPage from '../pages/pengurus/arsip/ArsipPage'

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
