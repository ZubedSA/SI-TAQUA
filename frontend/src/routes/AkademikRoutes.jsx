import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/auth/ProtectedRoute'

// Akademik Components
import SantriList from '../pages/santri/SantriList'
import SantriForm from '../pages/santri/SantriForm'
import GuruList from '../pages/guru/GuruList'
import GuruForm from '../pages/guru/GuruForm'
import KelasPage from '../pages/kelas/KelasPage'
import MapelPage from '../pages/mapel/MapelPage'
import HalaqohPage from '../pages/halaqoh/HalaqohPage'
import SemesterPage from '../pages/semester/SemesterPage'

// Hafalan
import HafalanList from '../pages/akademik/hafalan/input-hafalan/HafalanList'
import HafalanForm from '../pages/akademik/hafalan/input-hafalan/HafalanForm'
import PencapaianMingguanPage from '../pages/akademik/hafalan/rekap-hafalan/PencapaianMingguanPage'

// Menus
import InputNilaiMenu from '../pages/akademik/menus/InputNilaiMenu'
import RekapNilaiMenu from '../pages/akademik/menus/RekapNilaiMenu'
import LaporanMenu from '../pages/akademik/menus/LaporanMenu'

// Input Nilai
import TahfizhSyahriPage from '../pages/akademik/input-nilai/ujian-syahri/TahfizhSyahriPage'
import TahfizhSemesterPage from '../pages/akademik/input-nilai/ujian-semester/tahfizhiyah/TahfizhSemesterPage'
import MadrosHarianPage from '../pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosHarianPage'
import MadrosUTSPage from '../pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosUTSPage'
import MadrosUASPage from '../pages/akademik/input-nilai/ujian-semester/madrosiyah/MadrosUASPage'
import InputPerilakuPage from '../pages/akademik/input-nilai/perilaku/InputPerilakuPage'

// Rekap Nilai
import RekapSyahriPage from '../pages/akademik/rekap-nilai/RekapSyahriPage'
import RekapSemesterPage from '../pages/akademik/rekap-nilai/RekapSemesterPage'
import GrafikPerkembanganPage from '../pages/akademik/laporan/laporan-akademik/grafik-perkembangan/GrafikPerkembanganPage'

// Laporan
import LaporanHafalanHarianPage from '../pages/akademik/laporan/laporan-hafalan/harian/LaporanHafalanHarianPage'
import LaporanRekapMingguanPage from '../pages/akademik/laporan/laporan-hafalan/mingguan/LaporanRekapMingguanPage'
import LaporanUjianSyahriPage from '../pages/akademik/laporan/laporan-nilai/ujian-syahri/LaporanUjianSyahriPage'
import LaporanUjianSemesterPage from '../pages/akademik/laporan/laporan-nilai/ujian-semester/LaporanUjianSemesterPage'
import LaporanAkademikSantriPage from '../pages/akademik/laporan/laporan-akademik/raport/LaporanAkademikSantriPage'

// Jadwal
import JadwalPage from '../pages/akademik/jadwal/JadwalPage'
import JurnalPage from '../pages/akademik/jurnal/JurnalPage'
import KalenderAkademikPage from '../pages/akademik/kalender/KalenderAkademikPage'

const AkademikRoutes = () => {
    return (
        <>
            {/* Santri Management */}
            <Route path="/santri" element={
                <ProtectedRoute roles={['admin', 'guru', 'bendahara', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <SantriList />
                </ProtectedRoute>
            } />
            <Route path="/santri/create" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                    <SantriForm />
                </ProtectedRoute>
            } />
            <Route path="/santri/:id" element={
                <ProtectedRoute roles={['admin', 'guru', 'bendahara', 'musyrif']} fallbackRedirect="/dashboard/admin">
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
                <ProtectedRoute roles={['admin', 'guru', 'bendahara', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <GuruList />
                </ProtectedRoute>
            } />
            <Route path="/guru/create" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/dashboard/admin">
                    <GuruForm />
                </ProtectedRoute>
            } />
            <Route path="/guru/:id" element={
                <ProtectedRoute roles={['admin', 'guru', 'bendahara', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <GuruForm />
                </ProtectedRoute>
            } />
            <Route path="/guru/:id/edit" element={
                <ProtectedRoute roles={['admin', 'bendahara']} fallbackRedirect="/dashboard/admin">
                    <GuruForm />
                </ProtectedRoute>
            } />

            {/* Master Data */}
            <Route path="/kelas" element={
                <ProtectedRoute roles={['admin', 'guru', 'bendahara', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <KelasPage />
                </ProtectedRoute>
            } />
            <Route path="/mapel" element={
                <ProtectedRoute roles={['admin', 'guru', 'bendahara', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <MapelPage />
                </ProtectedRoute>
            } />
            <Route path="/halaqoh" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <HalaqohPage />
                </ProtectedRoute>
            } />
            <Route path="/semester" element={
                <ProtectedRoute roles={['admin', 'guru', 'bendahara', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <SemesterPage />
                </ProtectedRoute>
            } />

            {/* Jadwal */}
            <Route path="/jadwal" element={
                <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                    <JadwalPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/jurnal" element={
                <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                    <JurnalPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/kalender" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif', 'pengasuh']} fallbackRedirect="/dashboard/admin">
                    <KalenderAkademikPage />
                </ProtectedRoute>
            } />

            {/* Hafalan */}
            <Route path="/hafalan" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <HafalanList />
                </ProtectedRoute>
            } />
            <Route path="/hafalan/create" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <HafalanForm />
                </ProtectedRoute>
            } />
            <Route path="/hafalan/:id/edit" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <HafalanForm />
                </ProtectedRoute>
            } />

            {/* Pencapaian Hafalan */}
            <Route path="/hafalan/pencapaian/mingguan" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <PencapaianMingguanPage />
                </ProtectedRoute>
            } />


            {/* Nilai Navigation Menus */}
            <Route path="/akademik/menu/input-nilai" element={
                <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                    <InputNilaiMenu />
                </ProtectedRoute>
            } />
            <Route path="/akademik/menu/rekap-nilai" element={
                <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                    <RekapNilaiMenu />
                </ProtectedRoute>
            } />
            <Route path="/akademik/menu/laporan" element={
                <ProtectedRoute roles={['admin', 'guru']} fallbackRedirect="/dashboard/admin">
                    <LaporanMenu />
                </ProtectedRoute>
            } />

            {/* Input Nilai Routes */}
            <Route path="/akademik/nilai/tahfizh/syahri" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <TahfizhSyahriPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/tahfizh/semester" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/">
                    <TahfizhSemesterPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/madros/harian" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <MadrosHarianPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/madros/uts" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <MadrosUTSPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/madros/uas" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/">
                    <MadrosUASPage />
                </ProtectedRoute>
            } />
            <Route path="/akademik/nilai/perilaku" element={
                <ProtectedRoute roles={['admin']} fallbackRedirect="/">
                    <InputPerilakuPage />
                </ProtectedRoute>
            } />

            {/* Rekap Nilai Routes */}
            <Route path="/rekap-nilai/syahri" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <RekapSyahriPage />
                </ProtectedRoute>
            } />
            <Route path="/rekap-nilai/semester" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <RekapSemesterPage />
                </ProtectedRoute>
            } />
            <Route path="/rekap-nilai/grafik" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <GrafikPerkembanganPage />
                </ProtectedRoute>
            } />

            {/* Laporan Routes */}
            <Route path="/laporan/hafalan-harian" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanHafalanHarianPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/rekap-mingguan" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanRekapMingguanPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/ujian-syahri" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanUjianSyahriPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/ujian-semester" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanUjianSemesterPage />
                </ProtectedRoute>
            } />
            <Route path="/laporan/akademik-santri" element={
                <ProtectedRoute roles={['admin', 'guru', 'musyrif']} fallbackRedirect="/dashboard/admin">
                    <LaporanAkademikSantriPage />
                </ProtectedRoute>
            } />
        </>
    )
}

export default AkademikRoutes
