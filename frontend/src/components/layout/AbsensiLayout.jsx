import { useState, useEffect, Suspense } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AbsensiSidebar from './AbsensiSidebar'
import AbsensiBottomNav from './AbsensiBottomNav'
import Header from './Header'
import QRScannerModal from '../absensi/QRScannerModal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { Loader2, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import Spinner from '../ui/Spinner'

const AbsensiLayout = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const showToast = useToast()
    const { loading, isAuthenticated, user, userProfile, isAdmin, isAdminAkademik } = useAuth()
    
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [validating, setValidating] = useState(false)
    const [pageKey, setPageKey] = useState(0)

    useEffect(() => {
        setPageKey(prev => prev + 1)
    }, [location.pathname])

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const closeSidebar = () => setSidebarOpen(false)

    const handleScanSuccess = async (decodedText) => {
        setIsScannerOpen(false)
        setValidating(true)

        try {
            if (!decodedText.startsWith('SITAQUA_ABSENSI_')) {
                throw new Error('Format QR Code tidak valid.')
            }

            const parts = decodedText.split('_')
            const qrType = parts[2] // MADROSAH or QURANIYAH
            const qrId = parts.slice(3).join('_') 

            // 1. Get Guru ID
            let guruId = userProfile?.guru_id
            
            if (!guruId) {
                const { data: guru } = await supabase.from('guru').select('id').eq('email', user.email).maybeSingle()
                if (guru) {
                    guruId = guru.id
                }
            }

            if (!guruId) {
                throw new Error('Data pengajar tidak ditemukan. Pastikan profil Anda terhubung dengan data Guru.')
            }

            const todayDate = format(new Date(), 'yyyy-MM-dd')

            // ── QURANIYAH: Sistem Cerdas Deteksi Jam ──
            if (qrType === 'QURANIYAH') {
                // Catat presensi staf
                try {
                    const { error: psError } = await supabase.from('presensi_staf').insert({
                        staf_id: guruId,
                        tanggal: todayDate,
                        tipe: qrType,
                        referensi_id: qrId,
                        waktu_scan: new Date().toISOString()
                    })
                    if (psError) {
                        console.warn('Gagal mencatat presensi staf:', psError.message)
                    }
                } catch (dbErr) {
                    console.warn('Gagal mencatat presensi staf (Catch):', dbErr.message)
                }

                // Simpan verifikasi QR di session
                sessionStorage.setItem(`SITAQUA_SCAN_${qrId}`, 'true')

                // Ambil jadwal halaqoh hari ini untuk menentukan jam_ke
                const now = new Date()
                const dayNameRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now)
                const dayName = dayNameRaw === 'Minggu' ? 'Ahad' : dayNameRaw
                const currentMinutes = now.getHours() * 60 + now.getMinutes()

                const { data: jadwalHalaqoh } = await supabase
                    .from('jadwal_pelajaran')
                    .select('id, jam_ke, jam_mulai, jam_selesai, halaqoh_id, tipe')
                    .eq('halaqoh_id', qrId)
                    .eq('tipe', 'HALAQOH')
                    .eq('hari', dayName)
                    .order('jam_ke')

                let detectedJam = null

                if (jadwalHalaqoh && jadwalHalaqoh.length > 0) {
                    // Cari jadwal yang sesuai waktu saat ini (buffer: 15 menit sebelum, 45 menit sesudah)
                    for (const jd of jadwalHalaqoh) {
                        const [hM, mM] = jd.jam_mulai.split(':').map(Number)
                        const [hS, mS] = jd.jam_selesai.split(':').map(Number)
                        const startLimit = hM * 60 + mM - 15
                        const endLimit = hS * 60 + mS + 45

                        if (currentMinutes >= startLimit && currentMinutes <= endLimit) {
                            detectedJam = jd.jam_ke
                            sessionStorage.setItem(`SITAQUA_SCAN_${jd.id}`, 'true')
                            break
                        }
                    }

                    // Jika tidak ada jam yang cocok, pilih jam terdekat berikutnya
                    if (!detectedJam) {
                        const upcoming = jadwalHalaqoh.find(jd => {
                            const [hM, mM] = jd.jam_mulai.split(':').map(Number)
                            return (hM * 60 + mM) > currentMinutes
                        })
                        detectedJam = upcoming ? upcoming.jam_ke : jadwalHalaqoh[0].jam_ke
                    }
                }

                const finalJam = detectedJam || 1

                // Ambil info jadwal spesifik untuk dialihkan ke Agenda Mengajar
                const targetJadwal = jadwalHalaqoh?.find(j => j.jam_ke === finalJam)

                if (targetJadwal) {
                    sessionStorage.setItem(`SITAQUA_SCAN_${targetJadwal.id}`, 'true')
                    showToast.success(`Terverifikasi: Halaqoh Jam Ke-${finalJam}`)
                    navigate(`/absensi/agenda?jadwal_id=${targetJadwal.id}`)
                } else {
                    // Fallback jika tidak ada jadwal terdaftar, tetap ke halaman khusus
                    showToast.success(`Terverifikasi: Halaqoh Jam Ke-${finalJam}`)
                    navigate(`/absensi/quraniyah?id=${qrId}&jam=${finalJam}`)
                }
                return
            }

            // ── MADROSAH: Alur biasa via Agenda Mengajar ──
            const dayNameRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date())
            const dayName = dayNameRaw === 'Minggu' ? 'Ahad' : dayNameRaw

            const { data: agendaData } = await supabase
                .from('jadwal_pelajaran')
                .select('*, mapel(nama), kelas(nama), halaqoh(nama)')
                .eq('hari', dayName)
                .eq('guru_id', guruId)

            const match = agendaData?.find(j => {
                const itemType = j.tipe || 'MADROSAH'
                const itemId = j.kelas_id
                return itemType === 'MADROSAH' && String(itemId) === String(qrId)
            })

            if (!match && !isAdmin() && !isAdminAkademik()) {
                throw new Error('Jadwal tidak ditemukan untuk lokasi ini hari ini.')
            }

            // Record Teacher Attendance (presensi_staf)
            try {
                const { error: psError } = await supabase.from('presensi_staf').insert({
                    staf_id: guruId,
                    tanggal: todayDate,
                    tipe: qrType,
                    referensi_id: qrId,
                    waktu_scan: new Date().toISOString()
                })
                if (psError) {
                    console.warn('Gagal mencatat presensi staf:', psError.message)
                }
            } catch (dbErr) {
                console.warn('Gagal mencatat presensi staf (Catch):', dbErr.message)
            }

            // Unlock Session
            sessionStorage.setItem(`SITAQUA_SCAN_${qrId}`, 'true')
            if (match) sessionStorage.setItem(`SITAQUA_SCAN_${match.id}`, 'true')

            showToast.success(match 
                ? `Terverifikasi: ${match.mapel?.nama || match.tipe}` 
                : 'QR Terverifikasi (Mode Admin)')
            
            // Redirect
            if (match) {
                navigate(`/absensi/agenda?jadwal_id=${match.id}`)
            } else {
                navigate(`/absensi/agenda?kelas_id=${qrId}`)
            }

        } catch (err) {
            console.error(err)
            showToast.error(err.message || 'Gagal memverifikasi QR Code.')
        } finally {
            setValidating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Spinner size="xl" label="Memuat portal absensi..." />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/absensi/login" replace />
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <AbsensiSidebar 
                    onScanClick={() => setIsScannerOpen(true)}
                />
            </div>

            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0 lg:ml-[280px]">
                <Header onMenuClick={toggleSidebar} />
                
                <div key={pageKey} className="flex-1 px-4 py-6 md:px-6 lg:px-8 max-w-[1440px] w-full mx-auto pb-32 lg:pb-8 page-enter pt-24 md:pt-28">
                    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" label="Memuat halaman..." /></div>}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <AbsensiBottomNav onScanClick={() => setIsScannerOpen(true)} />

            <QRScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScanSuccess={handleScanSuccess}
            />

            {validating && (
                <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl flex items-center gap-4">
                        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        <span className="font-bold text-gray-700">Memverifikasi QR...</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AbsensiLayout
