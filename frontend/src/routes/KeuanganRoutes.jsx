import { lazyWithRetry as lazy } from '../utils/lazyWithRetry'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Keuangan Pages
const KasPemasukanPage = lazy(() => import('../pages/keuangan/KasPemasukanPage'))
const KasPengeluaranPage = lazy(() => import('../pages/keuangan/KasPengeluaranPage'))
const KasLaporanPage = lazy(() => import('../pages/keuangan/KasLaporanPage'))
const TagihanSantriPage = lazy(() => import('../pages/keuangan/TagihanSantriPage'))
const KategoriPembayaranPage = lazy(() => import('../pages/keuangan/KategoriPembayaranPage'))
const PembayaranSantriPage = lazy(() => import('../pages/keuangan/PembayaranSantriPage'))
const LaporanPembayaranPage = lazy(() => import('../pages/keuangan/LaporanPembayaranPage'))
const AnggaranPage = lazy(() => import('../pages/keuangan/AnggaranPage'))
const PersetujuanDanaPage = lazy(() => import('../pages/keuangan/PersetujuanDanaPage'))
const RealisasiDanaPage = lazy(() => import('../pages/keuangan/RealisasiDanaPage'))
const LaporanPenyaluranPage = lazy(() => import('../pages/keuangan/LaporanPenyaluranPage'))

const KeuanganRoutes = () => {
    return (
        <>
            {/* Kas - Pemasukan */}
            <Route path="/keuangan/kas/pemasukan" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <KasPemasukanPage />
                </ProtectedRoute>
            } />
            {/* Kas - Pengeluaran */}
            <Route path="/keuangan/kas/pengeluaran" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <KasPengeluaranPage />
                </ProtectedRoute>
            } />
            {/* Kas - Laporan */}
            <Route path="/keuangan/kas/laporan" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <KasLaporanPage />
                </ProtectedRoute>
            } />

            {/* Pembayaran - Tagihan Santri */}
            <Route path="/keuangan/pembayaran/tagihan" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <TagihanSantriPage />
                </ProtectedRoute>
            } />
            {/* Pembayaran - Kategori */}
            <Route path="/keuangan/pembayaran/kategori" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <KategoriPembayaranPage />
                </ProtectedRoute>
            } />
            {/* Pembayaran - Pembayaran Santri */}
            <Route path="/keuangan/pembayaran/bayar" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <PembayaranSantriPage />
                </ProtectedRoute>
            } />
            {/* Pembayaran - Laporan */}
            <Route path="/keuangan/pembayaran/laporan" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <LaporanPembayaranPage />
                </ProtectedRoute>
            } />

            {/* Penyaluran Dana - Anggaran */}
            <Route path="/keuangan/dana/anggaran" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <AnggaranPage />
                </ProtectedRoute>
            } />
            {/* Penyaluran Dana - Persetujuan */}
            <Route path="/keuangan/dana/persetujuan" element={
                <ProtectedRoute roles={['admin', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <PersetujuanDanaPage />
                </ProtectedRoute>
            } />
            {/* Penyaluran Dana - Realisasi */}
            <Route path="/keuangan/dana/realisasi" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <RealisasiDanaPage />
                </ProtectedRoute>
            } />
            {/* Penyaluran Dana - Laporan */}
            <Route path="/keuangan/dana/laporan" element={
                <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <LaporanPenyaluranPage />
                </ProtectedRoute>
            } />
        </>
    )
}

export default KeuanganRoutes
