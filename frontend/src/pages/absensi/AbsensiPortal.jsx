import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Calendar,
    Clock,
    BookOpen,
    Users,
    CheckCircle,
    AlertTriangle,
    ArrowRight,
    QrCode,
    Sparkles,
    ChevronRight,
    HelpCircle,
    Camera
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCalendar } from '../../context/CalendarContext'
import { format } from 'date-fns'
import { useJurnal } from '../../hooks/useAkademik'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import QRScannerModal from '../../components/absensi/QRScannerModal'
import UpdateNotificationModal from '../../components/absensi/UpdateNotificationModal'

const AbsensiPortal = () => {
    const navigate = useNavigate()
    const { user, userProfile, isAdmin, isAdminAkademik } = useAuth()
    const { formatDate: globalFormatDate } = useCalendar()
    const showToast = useToast()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [guruId, setGuruId] = useState(null)
    const [showUpdateModal, setShowUpdateModal] = useState(false)

    useEffect(() => {
        // Cek apakah user adalah staf/pengajar dan belum pernah melihat notifikasi update
        // Kita tampilkan modal untuk semua user (karena Admin juga butuh tahu, atau bisa dibatasi untuk non-santri)
        const hasSeenUpdate = localStorage.getItem('has_seen_update_izin_v1')
        if (!hasSeenUpdate) {
            setShowUpdateModal(true)
        }
    }, [])

    const handleCloseUpdateModal = () => {
        localStorage.setItem('has_seen_update_izin_v1', 'true')
        setShowUpdateModal(false)
    }

    useEffect(() => {
        const fetchGuruId = async () => {
            // Prioritaskan dari userProfile
            if (userProfile?.guru_id) {
                setGuruId(userProfile.guru_id)
                return
            }

            if (!user?.email) return

            try {
                const { data, error } = await supabase
                    .from('guru')
                    .select('id')
                    .eq('email', user.email)
                    .maybeSingle()

                if (data) {
                    setGuruId(data.id)
                } else if (error) {
                    console.error('Error fetching guru id:', error)
                }
            } catch (err) {
                console.error('Catch fetching guru id:', err)
            }
        }
        fetchGuruId()
    }, [user, userProfile])

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const todayDate = format(currentTime, 'yyyy-MM-dd')
    const { data: jurnalList = [] } = useJurnal({
        tanggal: todayDate,
        guru_id: (isAdmin() || isAdminAkademik()) ? null : guruId
    })

    const handleScanSuccess = async (decodedText) => {
        if (!decodedText.startsWith('SITAQUA_ABSENSI_')) {
            showToast.error('Kode QR tidak dikenali.')
            return
        }

        setIsProcessing(true)
        try {
            const parts = decodedText.split('_')
            const qrType = parts[2] // MADROSAH or QURANIYAH
            const qrId = parts.slice(3).join('_')

            // ── QURANIYAH: Sistem Cerdas Deteksi Jam ──
            if (qrType === 'QURANIYAH') {
                // 1. Ambil jadwal halaqoh hari ini untuk menentukan jam_ke
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
                    if (!detectedJam) {
                        const upcoming = jadwalHalaqoh.find(jd => {
                            const [hM, mM] = jd.jam_mulai.split(':').map(Number)
                            return (hM * 60 + mM) > currentMinutes
                        })
                        detectedJam = upcoming ? upcoming.jam_ke : jadwalHalaqoh[0].jam_ke
                    }
                }

                const finalJam = detectedJam || 1

                // 2. Catat presensi staf (Hanya jika belum ada scan untuk jam ini)
                if (guruId) {
                    try {
                        const { data: existingScan } = await supabase
                            .from('presensi_staf')
                            .select('id')
                            .eq('staf_id', guruId)
                            .eq('tanggal', todayDate)
                            .eq('referensi_id', qrId)
                            .eq('jam_ke', finalJam)
                            .maybeSingle()

                        if (!existingScan) {
                            await supabase.from('presensi_staf').insert({
                                staf_id: guruId,
                                tanggal: todayDate,
                                tipe: qrType,
                                referensi_id: qrId,
                                jam_ke: finalJam,
                                waktu_scan: new Date().toISOString()
                            })
                            console.log('Presensi staf tercatat (Quraniyah)')
                        }
                    } catch (dbErr) {
                        console.warn('Gagal mencatat presensi staf:', dbErr.message)
                    }
                }

                // 3. Simpan verifikasi QR di session & Navigasi
                sessionStorage.setItem(`SITAQUA_SCAN_${qrId}`, 'true')
                const targetJadwal = jadwalHalaqoh?.find(j => j.jam_ke === finalJam)

                if (targetJadwal) {
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
            const targetType = 'MADROSAH'
            const match = jurnalList.find(j => {
                const itemType = j.tipe || 'MADROSAH'
                const itemId = j.kelas_id
                return itemType === targetType && itemId === qrId
            })

            if (match) {
                // Record Teacher Attendance (presensi_staf) - Hanya jika belum ada scan untuk jam ini
                if (guruId) {
                    try {
                        const currentJam = match.jam_ke || 1
                        const { data: existingScan } = await supabase
                            .from('presensi_staf')
                            .select('id')
                            .eq('staf_id', guruId)
                            .eq('tanggal', todayDate)
                            .eq('referensi_id', qrId)
                            .eq('jam_ke', currentJam)
                            .maybeSingle()

                        if (!existingScan) {
                            const { error: psError } = await supabase.from('presensi_staf').insert({
                                staf_id: guruId,
                                tanggal: todayDate,
                                tipe: qrType,
                                referensi_id: qrId,
                                jam_ke: currentJam,
                                waktu_scan: new Date().toISOString()
                            })
                            if (psError) {
                                console.warn('Gagal mencatat presensi staf:', psError.message)
                            } else {
                                console.log('Presensi staf tercatat (Madrosah)')
                            }
                        } else {
                            console.log('Presensi staf sudah ada untuk jam ini (Madrosah), melewati simpan.')
                        }
                    } catch (dbErr) {
                        console.warn('Gagal mencatat presensi staf (Catch):', dbErr.message)
                    }
                } else {
                    console.warn('Tidak dapat mencatat presensi staf: guruId tidak ditemukan')
                }

                sessionStorage.setItem(`SITAQUA_SCAN_${qrId}`, 'true')
                sessionStorage.setItem(`SITAQUA_SCAN_${match.id}`, 'true')

                showToast.success(`Berhasil! Terverifikasi untuk ${match.kelas?.nama || 'Kelas'}`)
                navigate(`/absensi/agenda?jadwal_id=${match.id}`)
            } else if (isAdmin() || isAdminAkademik()) {
                // Record Staff Attendance for Admin (Bypass agenda check for testing/manual)
                if (guruId) {
                    try {
                        const testJam = 1
                        const { data: existingScan } = await supabase
                            .from('presensi_staf')
                            .select('id')
                            .eq('staf_id', guruId)
                            .eq('tanggal', todayDate)
                            .eq('referensi_id', qrId)
                            .eq('jam_ke', testJam)
                            .maybeSingle()

                        if (!existingScan) {
                            await supabase.from('presensi_staf').insert({
                                staf_id: guruId,
                                tanggal: todayDate,
                                tipe: qrType,
                                referensi_id: qrId,
                                jam_ke: testJam,
                                waktu_scan: new Date().toISOString()
                            })
                            console.log('Presensi staf tercatat (Mode Admin Bypass)')
                        }
                    } catch (dbErr) {
                        console.warn('Gagal mencatat presensi staf Admin:', dbErr.message)
                    }
                }

                sessionStorage.setItem(`SITAQUA_SCAN_${qrId}`, 'true')
                showToast.success('QR Terverifikasi (Mode Admin)')
                navigate(`/absensi/agenda?kelas_id=${qrId}`)
            } else {
                showToast.error('Jadwal tidak ditemukan untuk lokasi ini hari ini.')
            }
        } catch (err) {
            console.error('Scan process error:', err)
            showToast.error('Terjadi kesalahan saat memproses data QR.')
        } finally {
            setIsProcessing(false)
            setIsScannerOpen(false)
        }
    }

    const todayStr = globalFormatDate(currentTime, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const timeStr = format(currentTime, 'HH:mm')
    const secondStr = format(currentTime, 'ss')

    const getUserName = () => {
        if (userProfile?.nama) return userProfile.nama
        if (user?.user_metadata?.nama) return user.user_metadata.nama
        return userProfile?.username || user?.email?.split('@')[0] || 'Asatidz'
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-36 px-4">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Custom Image Background */}
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage: "url('/bg-islamic.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                ></div>

                {/* Blob Decorations (hidden on small mobile) */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px] hidden sm:block"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[80px] hidden sm:block"></div>
            </div>

            <div className="relative z-10 space-y-10">
                {/* Minimal Header Section */}
                <header className="text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm animate-fade-in">
                        <Sparkles size={14} className="text-emerald-500 fill-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Portal Terverifikasi</span>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.1]">
                            Ahlan wa Sahlan, <br />
                            <span className="inline-block whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 drop-shadow-sm text-2xl md:text-6xl">
                                {getUserName()}
                            </span>
                        </h1>
                        <p className="text-gray-500 text-sm md:text-base font-medium max-w-md mx-auto leading-relaxed">
                            Pusat kendali kehadiran dan agenda pengajaran dalam satu genggaman cerdas.
                        </p>
                    </div>

                    {/* Gerbang Pijar Trigger Button */}
                    <div className="flex justify-center mb-6">
                        <button
                            onClick={() => navigate('/absensi/gerbang-pijar')}
                            className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                        >
                            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Gerbang Pijar</span>
                            <ArrowRight size={16} className="opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                        </button>
                    </div>

                    {/* Minimal Date/Time Widget */}
                    <div className="flex items-center justify-center gap-3">
                        <div className="px-5 py-3 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm flex items-center gap-3">
                            <Calendar size={18} className="text-emerald-500" />
                            <div className="text-left">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">Hari Ini</p>
                                <p className="text-xs font-bold text-gray-800">{todayStr}</p>
                            </div>
                        </div>
                        <div className="px-5 py-3 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm flex items-center gap-3">
                            <Clock size={18} className="text-indigo-500" />
                            <div className="text-left">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">Waktu</p>
                                <p className="text-xs font-bold text-gray-800 tabular-nums">
                                    {timeStr}<span className="opacity-40 ml-0.5">{secondStr}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Primary Action Card - Redesigned for Premium Look */}
                <section className="relative">
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="group w-full relative overflow-hidden rounded-[3.5rem] p-8 md:p-12 text-left transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.25)] hover:shadow-[0_40px_80px_-15px_rgba(16,185,129,0.35)]"
                    >
                        {/* Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500"></div>

                        {/* Glass Overlay Patterns */}
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-white/10 skew-x-12 translate-x-24 transition-transform duration-1000 group-hover:translate-x-32"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                            <div className="w-20 h-20 md:w-32 md:h-32 rounded-[2.5rem] bg-white/20 backdrop-blur-xl flex items-center justify-center text-white shrink-0 shadow-inner border border-white/30 group-hover:rotate-6 transition-all duration-500 group-hover:scale-110">
                                <QrCode size={48} strokeWidth={1.5} />
                            </div>

                            <div className="flex-1 space-y-4 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-[0.1em] backdrop-blur-sm">Scanner Aktif</span>
                                    <span className="px-3 py-1 rounded-full bg-emerald-400/30 text-white text-[10px] font-black uppercase tracking-[0.1em] backdrop-blur-sm">Presensi Terverifikasi</span>
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Scan QR Absensi</h2>
                                    <p className="text-emerald-50 font-medium text-sm md:text-base opacity-90 max-w-lg leading-relaxed">
                                        Lakukan pemindaian kode QR di lokasi untuk langsung menuju pengisian jurnal dan presensi santri.
                                    </p>
                                </div>

                                <div className="pt-4 inline-flex items-center gap-2 text-white font-black text-xs uppercase tracking-[0.2em] group-hover:gap-4 transition-all duration-300">
                                    <span>Pindai Sekarang</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>

                            {/* Arrow Indicator Circle */}
                            <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-full border-2 border-white/20 text-white group-hover:bg-white group-hover:text-emerald-600 transition-all duration-500 shadow-lg">
                                <Camera size={32} />
                            </div>
                        </div>

                        {/* Animated Sparkles or Blobs */}
                        <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    </button>
                </section>

                <section className="relative opacity-60 hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => navigate('/absensi/agenda')}
                        className="group w-full relative overflow-hidden rounded-[2.5rem] p-6 text-left border border-gray-200 bg-white hover:border-emerald-500 transition-all duration-300"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                <BookOpen size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-gray-900">Lihat Semua Agenda</h3>
                                <p className="text-xs text-gray-400 font-medium">Buka daftar jadwal mengajar Anda tanpa scan QR (Manual).</p>
                            </div>
                            <ChevronRight size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                    </button>
                </section>


                {/* Secondary Actions / Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* QR Code Security Card */}
                    <div className="group bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden transition-all hover:translate-y-[-4px]">
                        <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                            <div className="space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                                    <QrCode size={24} className="text-emerald-400" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-black text-xl tracking-tight text-white">Verifikasi Kehadiran</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                                        Pastikan untuk selalu melakukan <span className="text-white">Scan QR</span> di lokasi mengajar untuk memvalidasi presensi fisik Anda.
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Decorative Background Icon */}
                        <QrCode size={120} className="absolute -bottom-10 -right-10 text-white/[0.03] -rotate-12 transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-0" />
                    </div>

                    {/* Support Card */}
                    <div className="group bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden transition-all hover:translate-y-[-4px]">
                        <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                            <div className="space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                    <HelpCircle size={24} className="text-indigo-600" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-black text-xl text-gray-900 tracking-tight">Butuh Bantuan?</h4>
                                    <p className="text-gray-500 text-xs leading-relaxed font-medium">
                                        Mengalami kendala teknis atau masalah jadwal? Tim Admin siap membantu kelancaran tugas Anda.
                                    </p>
                                </div>
                            </div>

                            <a
                                href="https://wa.me/6281717594886"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between w-full bg-gray-900 hover:bg-emerald-600 text-white p-4 rounded-2xl transition-all duration-300 shadow-lg shadow-gray-200 hover:shadow-emerald-200 group/btn"
                            >
                                <span className="font-black text-[10px] uppercase tracking-widest px-2">Hubungi Admin</span>
                                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <QRScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
            />

            <UpdateNotificationModal 
                isOpen={showUpdateModal}
                onClose={handleCloseUpdateModal}
            />

            {/* Simple Footer Label */}
            <footer className="text-center">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">SI-TAQUA • Al-Usymuni Batuan</p>
            </footer>
        </div>
    )
}

export default AbsensiPortal
