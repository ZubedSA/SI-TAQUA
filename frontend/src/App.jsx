import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import RoleGuard from './components/auth/RoleGuard'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SantriList from './pages/santri/SantriList'
import SantriForm from './pages/santri/SantriForm'
import GuruList from './pages/guru/GuruList'
import GuruForm from './pages/guru/GuruForm'
import KelasPage from './pages/kelas/KelasPage'
import HalaqohPage from './pages/halaqoh/HalaqohPage'
import MapelPage from './pages/mapel/MapelPage'
import InputNilaiPage from './pages/nilai/InputNilaiPage'
import RekapNilaiPage from './pages/nilai/RekapNilaiPage'
import HafalanList from './pages/hafalan/HafalanList'
import HafalanForm from './pages/hafalan/HafalanForm'
import PresensiPage from './pages/presensi/PresensiPage'
import SemesterPage from './pages/semester/SemesterPage'
import LaporanPage from './pages/laporan/LaporanPage'
import AuditLogPage from './pages/auditlog/AuditLogPage'
import PengaturanPage from './pages/pengaturan/PengaturanPage'
import ProfilSettingsPage from './pages/profil/ProfilSettingsPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<Layout />}>
            {/* Dashboard - Semua role */}
            <Route path="/" element={<Dashboard />} />

            {/* Admin Only Routes */}
            <Route path="/santri" element={<RoleGuard allowedRoles={['admin']}><SantriList /></RoleGuard>} />
            <Route path="/santri/create" element={<RoleGuard allowedRoles={['admin']}><SantriForm /></RoleGuard>} />
            <Route path="/santri/:id" element={<RoleGuard allowedRoles={['admin']}><SantriForm /></RoleGuard>} />
            <Route path="/santri/:id/edit" element={<RoleGuard allowedRoles={['admin']}><SantriForm /></RoleGuard>} />
            <Route path="/guru" element={<RoleGuard allowedRoles={['admin']}><GuruList /></RoleGuard>} />
            <Route path="/guru/create" element={<RoleGuard allowedRoles={['admin']}><GuruForm /></RoleGuard>} />
            <Route path="/guru/:id" element={<RoleGuard allowedRoles={['admin']}><GuruForm /></RoleGuard>} />
            <Route path="/guru/:id/edit" element={<RoleGuard allowedRoles={['admin']}><GuruForm /></RoleGuard>} />
            <Route path="/kelas" element={<RoleGuard allowedRoles={['admin']}><KelasPage /></RoleGuard>} />
            <Route path="/mapel" element={<RoleGuard allowedRoles={['admin']}><MapelPage /></RoleGuard>} />
            <Route path="/semester" element={<RoleGuard allowedRoles={['admin']}><SemesterPage /></RoleGuard>} />
            <Route path="/audit-log" element={<RoleGuard allowedRoles={['admin']}><AuditLogPage /></RoleGuard>} />
            <Route path="/pengaturan" element={<RoleGuard allowedRoles={['admin']}><PengaturanPage /></RoleGuard>} />

            {/* Admin + Guru Routes */}
            <Route path="/halaqoh" element={<RoleGuard allowedRoles={['admin', 'guru']}><HalaqohPage /></RoleGuard>} />
            <Route path="/input-nilai" element={<RoleGuard allowedRoles={['admin', 'guru']}><InputNilaiPage /></RoleGuard>} />
            <Route path="/hafalan" element={<RoleGuard allowedRoles={['admin', 'guru']}><HafalanList /></RoleGuard>} />
            <Route path="/hafalan/create" element={<RoleGuard allowedRoles={['admin', 'guru']}><HafalanForm /></RoleGuard>} />
            <Route path="/hafalan/:id/edit" element={<RoleGuard allowedRoles={['admin', 'guru']}><HafalanForm /></RoleGuard>} />
            <Route path="/presensi" element={<RoleGuard allowedRoles={['admin', 'guru']}><PresensiPage /></RoleGuard>} />

            {/* Semua Role (Admin + Guru + Wali) */}
            <Route path="/rekap-nilai" element={<RekapNilaiPage />} />
            <Route path="/laporan" element={<LaporanPage />} />
            <Route path="/profil-settings" element={<ProfilSettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App


