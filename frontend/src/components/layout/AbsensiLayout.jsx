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
            
            if (!guruId && user?.email) {
                const { data: guru } = await supabase
                    .from('guru')
                    .select('id')
                    .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
                    .maybeSingle()
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
                const isBypass = isAdmin() || isAdminAkademik()
                const now = new Date()
                const dayNameRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now)
                const capitalizedDay = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1).toLowerCase()
                const dayName = capitalizedDay === 'Minggu' ? 'Ahad' : capitalizedDay
                const currentMinutes = now.getHours() * 60 + now.getMinutes()

                // Ambil jadwal halaqoh hari ini
                let query = supabase
                    .from('jadwal_pelajaran')
                    .select('id, jam_ke, jam_mulai, jam_selesai, halaqoh_id, referensi_id, tipe, guru_id')
                    .or(`halaqoh_id.eq.${qrId},referensi_id.eq.${qrId}`)
                    .eq('tipe', 'HALAQOH')
                    .eq('hari', dayName)
                    .order('jam_ke')

                if (!isBypass && guruId) {
                    query = query.eq('guru_id', guruId)
                }

                const { data: jadwalHalaqoh } = await query

                if (!isBypass && (!jadwalHalaqoh || jadwalHalaqoh.length === 0)) {
                    showToast.error('Jadwal halaqoh Anda tidak ditemukan untuk lokasi ini pada hari ini.')
                    setValidating(false)
                    return
                }

                // Ambil data scan staf hari ini untuk mengetahui jam mana saja yang SUDAH discan
                let scannedJams = new Set()
                if (guruId) {
                    try {
                        const { data: existingScans } = await supabase
                            .from('presensi_staf')
                            .select('jam_ke')
                            .eq('staf_id', guruId)
                            .eq('tanggal', todayDate)
                            .eq('referensi_id', qrId)
                        if (existingScans) {
                            existingScans.forEach(s => scannedJams.add(Number(s.jam_ke)))
                        }
                    } catch (err) {
                        console.warn('Gagal membaca existing scan layout:', err)
                    }
                }

                let targetJadwal = null

                // A. Prioritas 1: Cocokkan dengan sesi yang aktif saat ini (toleransi 30 menit sebelum s/d 60 menit sesudah)
                if (jadwalHalaqoh && jadwalHalaqoh.length > 0) {
                    for (const jd of jadwalHalaqoh) {
                        if (jd.jam_mulai && jd.jam_selesai) {
                            const [hM, mM] = jd.jam_mulai.split(':').map(Number)
                            const [hS, mS] = jd.jam_selesai.split(':').map(Number)
                            const startLimit = hM * 60 + mM - 30
                            const endLimit = hS * 60 + mS + 60

                            if (currentMinutes >= startLimit && currentMinutes <= endLimit) {
                                targetJadwal = jd
                                break
                            }
                        }
                    }

                    // B. Prioritas 2: Jika di luar jendela aktif, cari sesi hari ini yang BELUM discan
                    if (!targetJadwal) {
                        const unscanned = jadwalHalaqoh.filter(jd => !scannedJams.has(Number(jd.jam_ke)))
                        if (unscanned.length > 0) {
                            const upcoming = unscanned.find(jd => {
                                if (!jd.jam_mulai) return false
                                const [hM, mM] = jd.jam_mulai.split(':').map(Number)
                                return (hM * 60 + mM) >= currentMinutes
                            })
                            targetJadwal = upcoming || unscanned[0]
                        }
                    }

                    // C. Prioritas 3: Fallback ke jadwal pertama jika semua telah discan
                    if (!targetJadwal) {
                        targetJadwal = jadwalHalaqoh[0]
                    }
                }

                const finalJam = targetJadwal ? (targetJadwal.jam_ke || 1) : 1

                // Catat presensi staf
                if (guruId && targetJadwal) {
                    try {
                        const scanPayload = {
                            staf_id: guruId,
                            tanggal: todayDate,
                            tipe: qrType,
                            referensi_id: qrId,
                            jam_ke: finalJam,
                            jadwal_id: targetJadwal.id,
                            waktu_scan: new Date().toISOString()
                        }
                        const { error: psError } = await supabase.from('presensi_staf').insert(scanPayload)
                        if (psError) {
                            await supabase.from('presensi_staf').insert({
                                staf_id: scanPayload.staf_id,
                                tanggal: scanPayload.tanggal,
                                tipe: scanPayload.tipe,
                                referensi_id: scanPayload.referensi_id,
                                jam_ke: scanPayload.jam_ke,
                                waktu_scan: scanPayload.waktu_scan
                            })
                        }
                        console.log(`Presensi staf tercatat (Layout Quraniyah Jam ${finalJam})`)
                    } catch (dbErr) {
                        console.warn('Gagal mencatat presensi staf (Quraniyah):', dbErr.message)
                    }
                }

                // Simpan verifikasi QR di session KHUSUS untuk jadwal ini (TIDAK menyimpan qrId global)
                if (targetJadwal && targetJadwal.id) {
                    sessionStorage.setItem(`SITAQUA_SCAN_${targetJadwal.id}`, 'true')
                    showToast.success(`Terverifikasi: Halaqoh Jam Ke-${finalJam}`)
                    navigate(`/absensi/agenda?jadwal_id=${targetJadwal.id}`)
                } else {
                    showToast.success(`Terverifikasi: Halaqoh Jam Ke-${finalJam}`)
                    navigate(`/absensi/quraniyah?id=${qrId}&jam=${finalJam}`)
                }
                return
            }

            // ── MADROSAH: Alur biasa via Agenda Mengajar ──
            const dayNameRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date())
            const capitalizedDay = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1).toLowerCase()
            const dayName = capitalizedDay === 'Minggu' ? 'Ahad' : capitalizedDay

            const { data: rawJadwalData } = await supabase
                .from('jadwal_pelajaran')
                .select('*, mapel(nama), kelas(nama), halaqoh(nama)')
                .eq('hari', dayName)

            let finalJadwalData = rawJadwalData || []

            const { data: pergantianData } = await supabase
                .from('pergantian_jadwal')
                .select('*, jadwal_asli:jadwal_asli_id(*), jadwal_tujuan:jadwal_tujuan_id(*)')
                .eq('status', 'Disetujui')
                .or(`tanggal_absen.eq.${todayDate},tanggal_pengganti.eq.${todayDate}`)

            const gantiList = pergantianData || []

            gantiList.forEach(g => {
                if (g.tanggal_absen === todayDate) {
                    if (g.jenis === 'Guru Pengganti' || g.jenis === 'Tukar Jam') {
                        finalJadwalData = finalJadwalData.map(j => 
                            j.id === g.jadwal_asli_id ? { ...j, guru_id: g.guru_pengganti_id } : j
                        )
                    } else if (g.jenis === 'Ganti Jam') {
                        finalJadwalData = finalJadwalData.filter(j => j.id !== g.jadwal_asli_id)
                    }
                }
                
                if (g.tanggal_pengganti === todayDate) {
                    if (g.jenis === 'Ganti Jam' && g.jadwal_asli) {
                        finalJadwalData.push({
                            ...g.jadwal_asli,
                            id: g.jadwal_asli.id,
                            kelas_id: g.jadwal_asli.kelas_id,
                            guru_id: g.jadwal_asli.guru_id
                        })
                    } else if (g.jenis === 'Tukar Jam' && g.jadwal_tujuan) {
                        finalJadwalData = finalJadwalData.map(j => 
                            j.id === g.jadwal_tujuan_id ? { ...j, guru_id: g.guru_pemohon_id } : j
                        )
                    }
                }
            })

            const agendaData = finalJadwalData.filter(j => j.guru_id === guruId)

            const match = agendaData.find(j => {
                const itemType = j.tipe || 'MADROSAH'
                const itemId = j.kelas_id
                return itemType === 'MADROSAH' && String(itemId) === String(qrId)
            })

            if (!match && !isAdmin() && !isAdminAkademik()) {
                throw new Error('Jadwal tidak ditemukan untuk lokasi ini hari ini.')
            }

            // Record Teacher Attendance (presensi_staf)
            if (guruId) {
                try {
                    const currentJam = match?.jam_ke || 1
                    const scanPayload = {
                        staf_id: guruId,
                        tanggal: todayDate,
                        tipe: qrType,
                        referensi_id: qrId,
                        jam_ke: currentJam,
                        waktu_scan: new Date().toISOString()
                    }
                    const { error: psError } = await supabase.from('presensi_staf').insert(scanPayload)
                    if (psError) {
                        // Fallback jika belum ada kolom jam_ke
                        await supabase.from('presensi_staf').insert({
                            staf_id: guruId,
                            tanggal: todayDate,
                            tipe: qrType,
                            referensi_id: qrId,
                            waktu_scan: scanPayload.waktu_scan
                        })
                    }
                } catch (dbErr) {
                    console.warn('Gagal mencatat presensi staf (Madrosah):', dbErr.message)
                }
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
