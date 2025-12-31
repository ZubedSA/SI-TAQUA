import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import Login from './pages/auth/Login'
// New Dashboard Components
import { AdminDashboard, AkademikDashboard, KeuanganDashboard, WaliSantriDashboard, PengurusDashboard } from './pages/dashboards'
import SantriList from './pages/santri/SantriList'
import SantriForm from './pages/santri/SantriForm'
import GuruList from './pages/guru/GuruList'
import GuruForm from './pages/guru/GuruForm'
import KelasPage from './pages/kelas/KelasPage'
import HalaqohPage from './pages/halaqoh/HalaqohPage'
import MapelPage from './pages/mapel/MapelPage'
import InputNilaiPage from './pages/nilai/InputNilaiPage'
import RekapNilaiPage from './pages/nilai/RekapNilaiPage'
// Hafalan - dari akademik folder baru
import HafalanList from './pages/akademik/hafalan/input-hafalan/HafalanList'
import HafalanForm from './pages/akademik/hafalan/input-hafalan/HafalanForm'
import PencapaianMingguanPage from './pages/akademik/hafalan/rekap-hafalan/PencapaianMingguanPage'
import PencapaianBulananPage from './pages/akademik/hafalan/rekap-hafalan/PencapaianBulananPage'
import PencapaianSemesterPage from './pages/akademik/hafalan/rekap-hafalan/PencapaianSemesterPage'
import PresensiPage from './pages/presensi/PresensiPage'
import SemesterPage from './pages/semester/SemesterPage'
import LaporanPage from './pages/laporan/LaporanPage'
import AuditLogPage from './pages/auditlog/AuditLogPage'
import PengaturanPage from './pages/pengaturan/PengaturanPage'
import ProfilSettingsPage from './pages/profil/ProfilSettingsPage'
import WaliSantriPage from './pages/walisantri/WaliSantriPage'
// New Wali Portal Components
import WaliLayout from './pages/walisantri/WaliLayout'
import WaliDashboardPage from './pages/walisantri/dashboard/WaliDashboardPage'
import HafalanWaliPage from './pages/walisantri/akademik/HafalanWaliPage'
import EvaluasiWaliPage from './pages/walisantri/akademik/EvaluasiWaliPage'
import KehadiranWaliPage from './pages/walisantri/akademik/KehadiranWaliPage'
import TagihanWaliPage from './pages/walisantri/keuangan/TagihanWaliPage'
import RiwayatBayarPage from './pages/walisantri/keuangan/RiwayatBayarPage'
import UploadBuktiPage from './pages/walisantri/keuangan/UploadBuktiPage'
import PengumumanPage from './pages/walisantri/informasi/PengumumanPage'
import InboxPesanPage from './pages/walisantri/pesan/InboxPesanPage'
import KirimPesanPage from './pages/walisantri/pesan/KirimPesanPage'
import ProfilWaliPage from './pages/walisantri/profil/ProfilWaliPage'
import BackupPage from './pages/backup/BackupPage'
import SystemStatusPage from './pages/system/SystemStatusPage'
// Admin Pages
import UsersPage from './pages/users/UsersPage'
import RolesPage from './pages/roles/RolesPage'
// Keuangan Pages
import KasPemasukanPage from './pages/keuangan/KasPemasukanPage'
import KasPengeluaranPage from './pages/keuangan/KasPengeluaranPage'
import KasLaporanPage from './pages/keuangan/KasLaporanPage'
import TagihanSantriPage from './pages/keuangan/TagihanSantriPage'
import KategoriPembayaranPage from './pages/keuangan/KategoriPembayaranPage'
import PembayaranSantriPage from './pages/keuangan/PembayaranSantriPage'
import LaporanPembayaranPage from './pages/keuangan/LaporanPembayaranPage'
import AnggaranPage from './pages/keuangan/AnggaranPage'
import PersetujuanDanaPage from './pages/keuangan/PersetujuanDanaPage'
import RealisasiDanaPage from './pages/keuangan/RealisasiDanaPage'
import LaporanPenyaluranPage from './pages/keuangan/LaporanPenyaluranPage'
// Akademik - Input Nilai Pages (dari akademik folder baru)
import TahfizhSyahriPage from './pages/akademik/input-nilai/ujian-syahri/TahfizhSyahriPage'
import TahfizhSemesterPage from './pages/akademik/input-nilai/ujian-semester/tahfizhiyah/TahfizhSemesterPage'
import MadrosHarianPage from './pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosHarianPage'
import MadrosUTSPage from './pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosUTSPage'
import MadrosUASPage from './pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosUASPage'
// Akademik - Rekap Nilai Pages (tetap di nilai/)
import RekapSyahriPage from './pages/nilai/RekapSyahriPage'
import RekapSemesterPage from './pages/nilai/RekapSemesterPage'
import GrafikPerkembanganPage from './pages/akademik/laporan/laporan-akademik/grafik-perkembangan/GrafikPerkembanganPage'
// Note: Pencapaian pages removed from menu structure
// Akademik - Laporan Pages (dari akademik folder baru)
import LaporanHafalanHarianPage from './pages/akademik/laporan/laporan-hafalan/harian/LaporanHafalanHarianPage'
import LaporanRekapMingguanPage from './pages/akademik/laporan/laporan-hafalan/mingguan/LaporanRekapMingguanPage'
import LaporanUjianSyahriPage from './pages/akademik/laporan/laporan-nilai/ujian-syahri/LaporanUjianSyahriPage'
import LaporanUjianSemesterPage from './pages/akademik/laporan/laporan-nilai/ujian-semester/LaporanUjianSemesterPage'
import LaporanAkademikSantriPage from './pages/akademik/laporan/laporan-akademik/raport/LaporanAkademikSantriPage'
// Pengurus Pages
import PelanggaranPage from './pages/pengurus/pelanggaran/PelanggaranPage'
import PelanggaranForm from './pages/pengurus/pelanggaran/PelanggaranForm'
import PengumumanInternalPage from './pages/pengurus/pengumuman/PengumumanPage'
import SantriBermasalahPage from './pages/pengurus/santri-bermasalah/SantriBermasalahPage'
import InformasiPondokPage from './pages/pengurus/informasi/InformasiPondokPage'
import BuletinPage from './pages/pengurus/buletin/BuletinPage'
import ArsipPage from './pages/pengurus/arsip/ArsipPage'
import './index.css'
import './components/common/ErrorBoundary.css'


// Dashboard redirect mapping based on active role
const dashboardRoutes = {
  admin: '/dashboard/admin',
  guru: '/dashboard/akademik',
  bendahara: '/dashboard/keuangan',
  pengasuh: '/dashboard/keuangan',
  pengurus: '/dashboard/pengurus',
  wali: '/wali/beranda'
}

// Component untuk redirect berdasarkan role setelah login
const RoleBasedRedirect = () => {
  const { activeRole, loading } = useAuth()

  if (loading) {
    return <div className="loading">Memuat...</div>
  }

  // Redirect to appropriate dashboard based on active role
  const targetPath = dashboardRoutes[activeRole] || '/dashboard/admin'
  return <Navigate to={targetPath} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes - Require Authentication */}
                <Route element={<Layout />}>

                  {/* Dashboard - Role-based redirect */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <RoleBasedRedirect />
                    </ProtectedRoute>
                  } />

                  {/* ============ NEW DASHBOARD ROUTES ============ */}

                  {/* Admin Dashboard - Full control */}
                  <Route path="/dashboard/admin" element={
                    <ProtectedRoute roles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />

                  {/* Akademik Dashboard - Teachers & Admin */}
                  <Route path="/dashboard/akademik" element={
                    <ProtectedRoute roles={['admin', 'guru']}>
                      <AkademikDashboard />
                    </ProtectedRoute>
                  } />

                  {/* Keuangan Dashboard - Bendahara & Admin */}
                  <Route path="/dashboard/keuangan" element={
                    <ProtectedRoute roles={['admin', 'bendahara', 'pengasuh']}>
                      <KeuanganDashboard />
                    </ProtectedRoute>
                  } />

                  {/* Wali Santri Dashboard - Parents Only */}
                  <Route path="/dashboard/walisantri" element={
                    <ProtectedRoute roles={['wali']}>
                      <WaliSantriDashboard />
                    </ProtectedRoute>
                  } />

                  {/* Pengurus Dashboard - Pembinaan Santri */}
                  <Route path="/dashboard/pengurus" element={
                    <ProtectedRoute roles={['admin', 'pengurus']}>
                      <PengurusDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ============ ADMIN ONLY ROUTES ============ */}

                  {/* User Management */}
                  <Route path="/users" element={
                    <ProtectedRoute roles={['admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/roles" element={
                    <ProtectedRoute roles={['admin']}>
                      <RolesPage />
                    </ProtectedRoute>
                  } />

                  <Route path="/santri" element={
                    <ProtectedRoute roles={['admin', 'guru', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <SantriList />
                    </ProtectedRoute>
                  } />
                  <Route path="/santri/create" element={
                    <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                      <SantriForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/santri/:id" element={
                    <ProtectedRoute roles={['admin', 'guru', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <SantriForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/santri/:id/edit" element={
                    <ProtectedRoute roles={['admin', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <SantriForm />
                    </ProtectedRoute>
                  } />

                  {/* Guru Management */}
                  <Route path="/guru" element={
                    <ProtectedRoute roles={['admin', 'guru', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <GuruList />
                    </ProtectedRoute>
                  } />
                  <Route path="/guru/create" element={
                    <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                      <GuruForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/guru/:id" element={
                    <ProtectedRoute roles={['admin', 'guru', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <GuruForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/guru/:id/edit" element={
                    <ProtectedRoute roles={['admin', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <GuruForm />
                    </ProtectedRoute>
                  } />

                  {/* Master Data - Admin Only */}
                  <Route path="/kelas" element={
                    <ProtectedRoute roles={['admin', 'guru', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <KelasPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/mapel" element={
                    <ProtectedRoute roles={['admin', 'guru', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <MapelPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/semester" element={
                    <ProtectedRoute roles={['admin', 'guru', 'bendahara']} fallbackRedirect="/dashboard/admin">
                      <SemesterPage />
                    </ProtectedRoute>
                  } />

                  {/* Admin Settings */}
                  <Route path="/audit-log" element={
                    <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                      <AuditLogPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/pengaturan" element={
                    <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                      <PengaturanPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/backup" element={
                    <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                      <BackupPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/system-status" element={
                    <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                      <SystemStatusPage />
                    </ProtectedRoute>
                  } />

                  {/* ============ ADMIN + GURU ROUTES ============ */}

                  {/* Halaqoh */}
                  <Route path="/halaqoh" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <HalaqohPage />
                    </ProtectedRoute>
                  } />

                  {/* Hafalan */}
                  <Route path="/hafalan" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <HafalanList />
                    </ProtectedRoute>
                  } />
                  <Route path="/hafalan/create" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <HafalanForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/hafalan/:id/edit" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <HafalanForm />
                    </ProtectedRoute>
                  } />

                  {/* Pencapaian Hafalan */}
                  <Route path="/hafalan/pencapaian/mingguan" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <PencapaianMingguanPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/hafalan/pencapaian/bulanan" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <PencapaianBulananPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/hafalan/pencapaian/semester" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <PencapaianSemesterPage />
                    </ProtectedRoute>
                  } />

                  {/* Presensi */}
                  <Route path="/presensi" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <PresensiPage />
                    </ProtectedRoute>
                  } />

                  {/* Nilai */}
                  <Route path="/input-nilai" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <InputNilaiPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/rekap-nilai" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <RekapNilaiPage />
                    </ProtectedRoute>
                  } />

                  {/* Laporan */}
                  <Route path="/laporan" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <LaporanPage />
                    </ProtectedRoute>
                  } />

                  {/* ============ AKADEMIK - INPUT NILAI ROUTES ============ */}

                  {/* Tahfizhiyah - Ujian Syahri */}
                  <Route path="/akademik/nilai/tahfizh/syahri" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <TahfizhSyahriPage />
                    </ProtectedRoute>
                  } />
                  {/* Tahfizhiyah - Ujian Semester */}
                  <Route path="/akademik/nilai/tahfizh/semester" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <TahfizhSemesterPage />
                    </ProtectedRoute>
                  } />
                  {/* Madrosiyah - Ujian Harian */}
                  <Route path="/akademik/nilai/madros/harian" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <MadrosHarianPage />
                    </ProtectedRoute>
                  } />
                  {/* Madrosiyah - UTS */}
                  <Route path="/akademik/nilai/madros/uts" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <MadrosUTSPage />
                    </ProtectedRoute>
                  } />
                  {/* Madrosiyah - UAS */}
                  <Route path="/akademik/nilai/madros/uas" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <MadrosUASPage />
                    </ProtectedRoute>
                  } />

                  {/* ============ AKADEMIK - REKAP NILAI ROUTES ============ */}

                  {/* Rekap Syahri */}
                  <Route path="/rekap-nilai/syahri" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <RekapSyahriPage />
                    </ProtectedRoute>
                  } />
                  {/* Rekap Semester */}
                  <Route path="/rekap-nilai/semester" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <RekapSemesterPage />
                    </ProtectedRoute>
                  } />
                  {/* Grafik Perkembangan */}
                  <Route path="/rekap-nilai/grafik" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <GrafikPerkembanganPage />
                    </ProtectedRoute>
                  } />


                  {/* ============ AKADEMIK - LAPORAN ROUTES ============ */}

                  {/* Laporan Hafalan Harian */}
                  <Route path="/laporan/hafalan-harian" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <LaporanHafalanHarianPage />
                    </ProtectedRoute>
                  } />
                  {/* Laporan Rekap Mingguan */}
                  <Route path="/laporan/rekap-mingguan" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <LaporanRekapMingguanPage />
                    </ProtectedRoute>
                  } />
                  {/* Laporan Ujian Syahri */}
                  <Route path="/laporan/ujian-syahri" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <LaporanUjianSyahriPage />
                    </ProtectedRoute>
                  } />
                  {/* Laporan Ujian Semester */}
                  <Route path="/laporan/ujian-semester" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <LaporanUjianSemesterPage />
                    </ProtectedRoute>
                  } />
                  {/* Laporan Akademik Santri */}
                  <Route path="/laporan/akademik-santri" element={
                    <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                      <LaporanAkademikSantriPage />
                    </ProtectedRoute>
                  } />

                  {/* ============ KEUANGAN ROUTES (Admin, Bendahara, Pengasuh) ============ */}

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

                  {/* ============ PENGURUS ROUTES ============ */}

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

                  {/* ============ WALI PORTAL ROUTES ============ */}

                  {/* Profil Settings */}
                  <Route path="/profil-settings" element={
                    <ProtectedRoute>
                      <ProfilSettingsPage />
                    </ProtectedRoute>
                  } />

                  {/* 404 - Redirect to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>

                {/* ============ WALI PORTAL ROUTES (OUTSIDE MAIN LAYOUT) ============ */}
                {/* Wali Portal with separate layout - NO SIDEBAR */}
                {/* Admin can also access for testing purposes */}
                <Route path="/wali" element={
                  <ProtectedRoute roles={['wali', 'admin']}>
                    <WaliLayout />
                  </ProtectedRoute>
                }>
                  {/* Redirect /wali to /wali/beranda */}
                  <Route index element={<Navigate to="/wali/beranda" replace />} />

                  {/* Dashboard */}
                  <Route path="beranda" element={<WaliDashboardPage />} />

                  {/* Akademik Routes */}
                  <Route path="akademik" element={<Navigate to="/wali/akademik/hafalan" replace />} />
                  <Route path="akademik/hafalan" element={<HafalanWaliPage />} />
                  <Route path="akademik/evaluasi" element={<EvaluasiWaliPage />} />
                  <Route path="akademik/kehadiran" element={<KehadiranWaliPage />} />

                  {/* Keuangan Routes */}
                  <Route path="keuangan" element={<TagihanWaliPage />} />
                  <Route path="keuangan/riwayat" element={<RiwayatBayarPage />} />
                  <Route path="keuangan/upload" element={<UploadBuktiPage />} />

                  {/* Informasi */}
                  <Route path="informasi" element={<PengumumanPage />} />

                  {/* Pesan Routes */}
                  <Route path="pesan" element={<InboxPesanPage />} />
                  <Route path="pesan/kirim" element={<KirimPesanPage />} />

                  {/* Profil */}
                  <Route path="profil" element={<ProfilWaliPage />} />
                </Route>
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
