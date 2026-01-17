import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Keuangan Pages
import KasPemasukanPage from '../pages/keuangan/KasPemasukanPage'
import KasPengeluaranPage from '../pages/keuangan/KasPengeluaranPage'
import KasLaporanPage from '../pages/keuangan/KasLaporanPage'
import TagihanSantriPage from '../pages/keuangan/TagihanSantriPage'
import KategoriPembayaranPage from '../pages/keuangan/KategoriPembayaranPage'
import PembayaranSantriPage from '../pages/keuangan/PembayaranSantriPage'
import LaporanPembayaranPage from '../pages/keuangan/LaporanPembayaranPage'
import AnggaranPage from '../pages/keuangan/AnggaranPage'
import PersetujuanDanaPage from '../pages/keuangan/PersetujuanDanaPage'
import RealisasiDanaPage from '../pages/keuangan/RealisasiDanaPage'
import LaporanPenyaluranPage from '../pages/keuangan/LaporanPenyaluranPage'

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
