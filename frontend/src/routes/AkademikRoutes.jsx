import { lazyWithRetry as lazy } from '../utils/lazyWithRetry'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Akademik Components
const SantriList = lazy(() => import('../pages/santri/SantriList'))
const SantriForm = lazy(() => import('../pages/santri/SantriForm'))
const GuruList = lazy(() => import('../pages/guru/GuruList'))
const GuruForm = lazy(() => import('../pages/guru/GuruForm'))
const KelasPage = lazy(() => import('../pages/kelas/KelasPage'))
const MapelPage = lazy(() => import('../pages/mapel/MapelPage'))
const HalaqohPage = lazy(() => import('../pages/halaqoh/HalaqohPage'))
const SemesterPage = lazy(() => import('../pages/semester/SemesterPage'))

// Hafalan
const HafalanList = lazy(() => import('../pages/akademik/hafalan/input-hafalan/HafalanList'))
const HafalanForm = lazy(() => import('../pages/akademik/hafalan/input-hafalan/HafalanForm'))
const PencapaianMingguanPage = lazy(() => import('../pages/akademik/hafalan/rekap-hafalan/PencapaianMingguanPage'))

// Menus
const InputNilaiMenu = lazy(() => import('../pages/akademik/menus/InputNilaiMenu'))
const RekapNilaiMenu = lazy(() => import('../pages/akademik/menus/RekapNilaiMenu'))
const LaporanMenu = lazy(() => import('../pages/akademik/menus/LaporanMenu'))

// Input Nilai
const TahfizhSyahriPage = lazy(() => import('../pages/akademik/input-nilai/ujian-syahri/TahfizhSyahriPage'))
const TahfizhSemesterPage = lazy(() => import('../pages/akademik/input-nilai/ujian-semester/tahfizhiyah/TahfizhSemesterPage'))
const MadrosHarianPage = lazy(() => import('../pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosHarianPage'))
const MadrosUTSPage = lazy(() => import('../pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosUTSPage'))
const MadrosUASPage = lazy(() => import('../pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosUASPage'))
const InputPerilakuPage = lazy(() => import('../pages/akademik/input-nilai/perilaku/InputPerilakuPage'))

// Rekap Nilai
const RekapSyahriPage = lazy(() => import('../pages/akademik/rekap-nilai/RekapSyahriPage'))
const RekapSemesterPage = lazy(() => import('../pages/akademik/rekap-nilai/RekapSemesterPage'))
const GrafikPerkembanganPage = lazy(() => import('../pages/akademik/laporan/laporan-akademik/grafik-perkembangan/GrafikPerkembanganPage'))

// Laporan
const LaporanHafalanHarianPage = lazy(() => import('../pages/akademik/laporan/laporan-hafalan/harian/LaporanHafalanHarianPage'))
const LaporanRekapMingguanPage = lazy(() => import('../pages/akademik/laporan/laporan-hafalan/mingguan/LaporanRekapMingguanPage'))
const LaporanUjianSyahriPage = lazy(() => import('../pages/akademik/laporan/laporan-nilai/ujian-syahri/LaporanUjianSyahriPage'))
const LaporanUjianSemesterPage = lazy(() => import('../pages/akademik/laporan/laporan-nilai/ujian-semester/LaporanUjianSemesterPage'))
const LaporanAkademikSantriPage = lazy(() => import('../pages/akademik/laporan/laporan-akademik/raport/LaporanAkademikSantriPage'))

// Jadwal
const JadwalPage = lazy(() => import('../pages/akademik/jadwal/JadwalPage'))
const KalenderAkademikPage = lazy(() => import('../pages/akademik/kalender/KalenderAkademikPage'))

const AkademikRoutes = () => {
    return (
        <>
            {/* Santri Management */}
            <Route path="/santri" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <SantriList />
                </ProtectedRoute>
            } />
            <Route path="/santri/create" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <SantriForm />
                </ProtectedRoute>
            } />
            <Route path="/santri/:id" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <SantriForm />
                </ProtectedRoute>
            } />
            <Route path="/santri/:id/edit" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'bendahara']} fallbackRedirect="/dashboard/admin">
                    <SantriForm />
                </ProtectedRoute>
            } />

            {/* Guru Management */}
            <Route path="/guru" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <GuruList />
                </ProtectedRoute>
            } />
            <Route path="/guru/create" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <GuruForm />
                </ProtectedRoute>
            } />
            <Route path="/guru/:id" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <GuruForm />
                </ProtectedRoute>
            } />
            <Route path="/guru/:id/edit" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'bendahara']} fallbackRedirect="/dashboard/admin">
                    <GuruForm />
                </ProtectedRoute>
            } />

            {/* Master Data */}
            <Route path="/kelas" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <KelasPage />
                </ProtectedRoute>
            } />
            <Route path="/mapel" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <MapelPage />
                </ProtectedRoute>
            } />
            <Route path="/halaqoh" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <HalaqohPage />
                </ProtectedRoute>
            } />
            <Route path="/semester" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <SemesterPage />
                </ProtectedRoute>
            } />

            {/* Jadwal */}
            <Route path="/jadwal" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <JadwalPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/kalender" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/dashboard/admin">
                    <KalenderAkademikPage />
                </ProtectedRoute>
            } />

            {/* Hafalan */}
            <Route path="/hafalan" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <HafalanList />
                </ProtectedRoute>
            } />
            <Route path="/hafalan/create" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <HafalanForm />
                </ProtectedRoute>
            } />
            <Route path="/hafalan/:id/edit" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <HafalanForm />
                </ProtectedRoute>
            } />

            {/* Pencapaian Hafalan */}
            <Route path="/hafalan/pencapaian/mingguan" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <PencapaianMingguanPage />
                </ProtectedRoute>
            } />


            {/* Nilai Navigation Menus */}
            <Route path="/akademik/menu/input-nilai" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru']} fallbackRedirect="/dashboard/admin">
                    <InputNilaiMenu />
                </ProtectedRoute>
            } />
            <Route path="/akademik/menu/rekap-nilai" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru']} fallbackRedirect="/dashboard/admin">
                    <RekapNilaiMenu />
                </ProtectedRoute>
            } />
            <Route path="/akademik/menu/laporan" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru']} fallbackRedirect="/dashboard/admin">
                    <LaporanMenu />
                </ProtectedRoute>
            } />

            {/* Input Nilai Routes */}
            <Route path="/akademik/nilai/tahfizh/syahri" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <TahfizhSyahriPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/tahfizh/semester" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/">
                    <TahfizhSemesterPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/madros/harian" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <MadrosHarianPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/madros/uts" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <MadrosUTSPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/madros/uas" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/">
                    <MadrosUASPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/perilaku" element={
                <ProtectedRoute roles={['admin', 'admin_akademik']} fallbackRedirect="/">
                    <InputPerilakuPage />
                </ProtectedRoute>
            } />

            {/* Rekap Nilai Routes */}
            <Route path="/rekap-nilai/syahri" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <RekapSyahriPage />
                </ProtectedRoute>
            } />
            <Route path="/rekap-nilai/semester" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <RekapSemesterPage />
                </ProtectedRoute>
            } />
            <Route path="/rekap-nilai/grafik" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <GrafikPerkembanganPage />
                </ProtectedRoute>
            } />

            {/* Laporan Routes */}
            <Route path="/laporan/hafalan-harian" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanHafalanHarianPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/rekap-mingguan" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanRekapMingguanPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/ujian-syahri" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanUjianSyahriPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/ujian-semester" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanUjianSemesterPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/akademik-santri" element={
                <ProtectedRoute roles={['admin', 'admin_akademik', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanAkademikSantriPage />
                </ProtectedRoute>
            } />
        </>
    )
}

export default AkademikRoutes
