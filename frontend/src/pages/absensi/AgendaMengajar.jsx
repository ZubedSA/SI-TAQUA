import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { 
    ArrowLeft, 
    Save, 
    RefreshCw, 
    CheckCircle2, 
    BookOpen, 
    Calendar, 
    Users, 
    Clock, 
    AlertCircle,
    CheckCircle,
    Circle,
    ArrowRight,
    UserCheck,
    QrCode
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useJurnal } from '../../hooks/useAkademik'
import { Card } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { useCalendar } from '../../context/CalendarContext'
import { format } from 'date-fns'
import { sendPushNotification } from '../../utils/pushNotification'
import { sendWhatsAppViaFonnte, templateAbsensiWali } from '../../utils/whatsapp'

const STATUS_OPTIONS = [
    { value: 'Hadir', label: 'Hadir', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'Sakit', label: 'Sakit', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'Izin', label: 'Izin', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'Alfa', label: 'Alpha', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'Terlambat', label: 'Terlambat', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { value: 'Pulang', label: 'Pulang', color: 'bg-purple-50 text-purple-700 border-purple-200' },
]

const AgendaMengajar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const queryParams = new URLSearchParams(location.search)
    const { user, userProfile, isAdmin, isAdminAkademik, isAdminAbsensi, hasRole } = useAuth()
    const { formatDate: globalFormatDate } = useCalendar()
    const showToast = useToast()
    
    const [selectedDate, setSelectedDate] = useState(queryParams.get('tanggal') || new Date().toISOString().split('T')[0])
    const [guruId, setGuruId] = useState(null)
    const [loadingGuru, setLoadingGuru] = useState(true)

    // Form State
    const [selectedJadwal, setSelectedJadwal] = useState(null)
    const [formData, setFormData] = useState({ materi: '', catatan: '', status: 'Terlaksana' })
    const [santriList, setSantriList] = useState([])
    const [attendanceMap, setAttendanceMap] = useState({})
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [saving, setSaving] = useState(false)

    // Auto-select from URL (if scanned)
    const scannedJadwalId = queryParams.get('jadwal_id')

    useEffect(() => {
        const fetchGuruId = async () => {
            if (!user?.email) {
                setLoadingGuru(false)
                return
            }
            const { data, error } = await supabase.from('guru').select('id').eq('email', user.email).maybeSingle()
            if (data) setGuruId(data.id)
            if (error) console.warn('Info guru tidak ditemukan (Admin):', error.message)
            setLoadingGuru(false)
        }
        fetchGuruId()
    }, [user])

    const isSystemAdmin = hasRole(['admin', 'admin_akademik', 'admin_absensi']) || isAdmin() || isAdminAkademik() || isAdminAbsensi()

    const { data: jurnalList = [], isLoading: loadingJurnal, refetch: refetchJurnal } = useJurnal({
        tanggal: selectedDate,
        guru_id: isSystemAdmin ? null : guruId
    })

    useEffect(() => {
        if (scannedJadwalId && jurnalList.length > 0 && !selectedJadwal) {
            // Gunakan pembersihan ID dan perbandingan string yang aman
            const targetId = String(scannedJadwalId).trim()
            const found = jurnalList.find(j => String(j.id).trim() === targetId)
            
            if (found) {
                openJurnalForm(found)
            } else if (!loadingJurnal) {
                // Timeout sedikit lebih lama untuk memastikan data benar-benar sudah tersinkronisasi
                const timer = setTimeout(() => {
                    // Cek lagi setelah timeout, siapa tahu data baru masuk
                    const doubleCheck = jurnalList.find(j => String(j.id).trim() === targetId)
                    if (doubleCheck) {
                        openJurnalForm(doubleCheck)
                    } else if (!selectedJadwal) {
                        showToast.error('Jadwal tidak ditemukan atau bukan jadwal Anda hari ini.')
                        if (searchParams.get('tanggal')) {
                            // Jangan langsung redirect agar user bisa lihat jadwal lain
                            // navigate('/absensi/home') 
                        }
                    }
                }, 1000)
                return () => clearTimeout(timer)
            }
        }
    }, [scannedJadwalId, jurnalList, loadingJurnal, selectedJadwal])

    const openJurnalForm = async (jadwalItem) => {
        const isScanned = sessionStorage.getItem(`SITAQUA_SCAN_${jadwalItem.kelas_id}`) || 
                         sessionStorage.getItem(`SITAQUA_SCAN_${jadwalItem.id}`)
        
        if (!isSystemAdmin && !isScanned) {
            showToast.error('Anda harus melakukan Scan QR Kode di kelas terlebih dahulu untuk mengisi jurnal.')
            return
        }

        if (!isSystemAdmin) {
            const now = new Date()
            const dayNameRaw = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now)
            const capitalizedDay = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1).toLowerCase()
            const currentDay = capitalizedDay === 'Minggu' ? 'Ahad' : capitalizedDay
            const currentTime = now.getHours() * 60 + now.getMinutes()
            
            const [hM, mM] = jadwalItem.jam_mulai.split(':').map(Number)
            const [hS, mS] = jadwalItem.jam_selesai.split(':').map(Number)
            const startLimit = hM * 60 + mM - 15
            const endLimit = hS * 60 + mS + 45

            if (jadwalItem.hari !== currentDay || currentTime < startLimit || currentTime > endLimit) {
                showToast.error(`Di luar jam mengajar (${jadwalItem.jam_mulai} - ${jadwalItem.jam_selesai})`)
                return
            }
        }

        setSelectedJadwal(jadwalItem)
        setFormData({
            materi: jadwalItem.jurnal?.materi || '',
            catatan: jadwalItem.jurnal?.catatan || '',
            status: jadwalItem.jurnal?.status || 'Terlaksana'
        })
        setLoadingSantri(true)

        try {
            const isHalaqoh = !!jadwalItem.halaqoh_id
            const { data: sData } = await supabase
                .from('santri')
                .select('id, nama, nis, no_telp_wali, nama_wali')
                .eq(isHalaqoh ? 'halaqoh_id' : 'kelas_id', isHalaqoh ? jadwalItem.halaqoh_id : jadwalItem.kelas_id)
                .eq('status', 'Aktif')
                .order('nama')

            setSantriList(sData || [])

            const initialMap = {}
            if (jadwalItem.jurnal) {
                const { data: detilData } = await supabase
                    .from('presensi_mapel_detil')
                    .select('*')
                    .eq('presensi_mapel_id', jadwalItem.jurnal.id)

                sData?.forEach(s => {
                    const existing = detilData?.find(d => d.santri_id === s.id)
                    initialMap[s.id] = {
                        status: existing?.status || '',
                        keterangan: existing?.keterangan || ''
                    }
                })
            } else {
                sData?.forEach(s => {
                    initialMap[s.id] = { status: '', keterangan: '' }
                })
            }
            setAttendanceMap(initialMap)
        } catch (err) {
            console.error(err)
            showToast.error('Gagal memuat data santri')
        } finally {
            setLoadingSantri(false)
        }
    }

    const handleSave = async (e) => {
        if (e) e.preventDefault()
        
        // Cek jika status pembelajaran "Terlaksana", pastikan semua absensi terisi
        if (formData.status === 'Terlaksana') {
            const hasEmptyStatus = santriList.some(s => !attendanceMap[s.id]?.status)
            if (hasEmptyStatus) {
                showToast.error('Mohon lengkapi status kehadiran untuk seluruh santri')
                return
            }
        }

        setSaving(true)
        try {
            const headerPayload = {
                jadwal_id: selectedJadwal.id,
                kelas_id: selectedJadwal.kelas_id || null,
                halaqoh_id: selectedJadwal.halaqoh_id || null,
                guru_id: selectedJadwal.guru_id,
                mapel_id: selectedJadwal.mapel_id,
                tanggal: selectedDate,
                materi: formData.materi,
                catatan: formData.catatan,
                status: formData.status
            }

            if (selectedJadwal.jurnal?.id) {
                headerPayload.id = selectedJadwal.jurnal.id
            }

            const { data: headerData, error: headerError } = await supabase
                .from('presensi_mapel')
                .upsert(headerPayload)
                .select()
                .single()

            if (headerError) throw headerError

            const jurnalId = headerData.id
            await supabase.from('presensi_mapel_detil').delete().eq('presensi_mapel_id', jurnalId)

            const isTerlaksana = formData.status === 'Terlaksana'

            const detailsPayload = isTerlaksana ? santriList.map(s => ({
                presensi_mapel_id: jurnalId,
                santri_id: s.id,
                status: attendanceMap[s.id].status,
                keterangan: attendanceMap[s.id].keterangan
            })) : []

            if (detailsPayload.length > 0) {
                const { error: detilError } = await supabase.from('presensi_mapel_detil').insert(detailsPayload)
                if (detilError) throw detilError
            }

            // ── Sync ke tabel 'presensi' agar muncul di Admin Rekap Santri ──
            try {
                if (!isTerlaksana) {
                    // Jika Kosong/Libur, hapus semua presensi santri di kelas ini pada jam tsb
                    if (santriList.length > 0) {
                        await supabase.from('presensi')
                            .delete()
                            .eq('tanggal', selectedDate)
                            .eq('jam_ke', selectedJadwal.jam_ke || 1)
                            .in('santri_id', santriList.map(s => s.id))
                    }
                } else {
                    // Siapkan data presensi untuk sinkronisasi
                    const isHalaqoh = !!selectedJadwal.halaqoh_id
                    const presensiPayload = santriList.map(s => {
                        const subjectName = selectedJadwal.tipe === 'HALAQOH' 
                            ? (selectedJadwal.halaqoh?.nama || 'Halaqoh')
                            : (selectedJadwal.mapel?.nama || 'Madrosah');
                            
                        return {
                            santri_id: s.id,
                            tanggal: selectedDate,
                            jam_ke: selectedJadwal.jam_ke || 1,
                            status: attendanceMap[s.id].status,
                            keterangan: isHalaqoh 
                                ? `[Quraniyah] ${subjectName}: ${attendanceMap[s.id].keterangan || ''}`.trim()
                                : `${subjectName}: ${attendanceMap[s.id].keterangan || ''}`.trim(),
                            nama_pengabsen: userProfile?.nama || user?.user_metadata?.nama || user?.email || 'Sistem'
                        };
                    })

                    // 1. Hapus data presensi santri ini di tanggal dan jam yang sama agar tidak bentrok
                    if (presensiPayload.length > 0) {
                        await supabase.from('presensi')
                            .delete()
                            .eq('tanggal', selectedDate)
                            .eq('jam_ke', selectedJadwal.jam_ke || 1)
                            .in('santri_id', presensiPayload.map(p => p.santri_id))

                        // 2. Insert record presensi baru
                        const { error: presensiError } = await supabase
                            .from('presensi')
                            .insert(presensiPayload)
                        
                        if (presensiError) {
                            console.warn('Sync ke tabel presensi gagal:', presensiError.message)
                        }
                    }
                }
            } catch (syncErr) {
                console.warn('Sync presensi warning:', syncErr.message)
            }

            showToast.success('Jurnal berhasil disimpan')

            // === Push Notification: Kirim ke wali santri yang alpha (Hanya jika Terlaksana) ===
            if (isTerlaksana) {
                try {
                    const alphaSantri = santriList.filter(s => {
                        const st = (attendanceMap[s.id]?.status || '').toLowerCase()
                        return ['alfa', 'alpha', 'alpa'].includes(st)
                    })
                    if (alphaSantri.length > 0) {
                        const mapelNama = selectedJadwal.tipe === 'HALAQOH'
                            ? (selectedJadwal.halaqoh?.nama || 'Halaqoh')
                            : (selectedJadwal.mapel?.nama || 'Pelajaran')

                        // Ambil wali_id untuk santri yang alpha
                        const { data: santriWithWali } = await supabase
                            .from('santri')
                            .select('id, nama, wali_id')
                            .in('id', alphaSantri.map(s => s.id))
                            .not('wali_id', 'is', null)

                        if (santriWithWali && santriWithWali.length > 0) {
                            // Kirim notif per wali
                            for (const santri of santriWithWali) {
                                sendPushNotification({
                                    type: 'santri_alpha',
                                    target_user_ids: [santri.wali_id],
                                    title: `${santri.nama} Tidak Hadir`,
                                    body: `Ananda ${santri.nama} tercatat tidak hadir (Alpha) pada ${mapelNama}, ${selectedDate}`,
                                    url: '/wali'
                                }).catch(() => {}) // Non-blocking
                            }
                        }
                    }
                } catch (notifErr) {
                    console.warn('[Push] Notification warning:', notifErr.message)
                }

                // === WhatsApp Notification via Fonnte (Absent Students) ===
                try {
                    const absentSantri = santriList.filter(s => {
                        const st = attendanceMap[s.id]?.status || 'Hadir'
                        return st !== 'Hadir' && st !== 'Terlambat'
                    })
                    
                    if (absentSantri.length > 0) {
                        const mapelNama = selectedJadwal.tipe === 'HALAQOH'
                            ? (selectedJadwal.halaqoh?.nama || 'Halaqoh')
                            : (selectedJadwal.mapel?.nama || 'Pelajaran')
                            
                        const formattedDateStr = new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        
                        for (const santri of absentSantri) {
                            if (santri.no_telp_wali) {
                                const msg = templateAbsensiWali({
                                    namaSantri: santri.nama,
                                    namaWali: santri.nama_wali,
                                    status: attendanceMap[santri.id].status,
                                    tanggal: formattedDateStr,
                                    sesi: `${selectedJadwal.tipe || 'Madrosah'} (${mapelNama})`,
                                    keterangan: attendanceMap[santri.id].keterangan
                                })
                                sendWhatsAppViaFonnte(santri.no_telp_wali, msg).catch(err => {
                                    console.error('Gagal kirim WA Fonnte:', err)
                                })
                            }
                        }
                    }
                } catch (waErr) {
                    console.warn('[WA] Fonnte error:', waErr.message)
                }
            }

            setSelectedJadwal(null)
            refetchJurnal()
            if (scannedJadwalId) navigate('/absensi/home')

        } catch (err) {
            console.error(err)
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const markAll = (status) => {
        const newMap = { ...attendanceMap }
        santriList.forEach(s => {
            newMap[s.id] = { ...newMap[s.id], status }
        })
        setAttendanceMap(newMap)
    }

    if (loadingGuru) return <div className="min-h-screen flex items-center justify-center"><Spinner label="Memuat profil..." /></div>

    if (selectedJadwal) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
                <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
                    <div className="max-w-5xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative">
                        <button 
                            onClick={() => setSelectedJadwal(null)}
                            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors z-10"
                        >
                            <ArrowLeft size={20} strokeWidth={2.5} />
                        </button>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-12">
                            <h1 className="font-black text-gray-400 tracking-[0.2em] uppercase text-[9px] md:text-[10px] mb-0.5">Formulir Jurnal</h1>
                            <p className="text-sm md:text-base font-black text-gray-900 truncate w-full text-center">
                                {selectedJadwal.tipe === 'HALAQOH' ? `Halaqoh Jam Ke-${selectedJadwal.jam_ke}` : (selectedJadwal.mapel?.nama || '-')}
                            </p>
                        </div>
                        
                        <div className="w-10 z-10 shrink-0"></div>
                    </div>
                </header>

                <main className="flex-1 max-w-5xl w-full mx-auto px-3 md:px-6 space-y-6 md:space-y-8 pb-32">
                    {/* Jurnal Section */}
                    <div className="bg-white rounded-3xl md:rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-50 p-4 md:p-10 space-y-6 md:space-y-8">
                        <div className="flex items-center gap-3 md:gap-4 border-b border-gray-50 pb-4 md:pb-6">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                <BookOpen size={24} className="md:w-7 md:h-7" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight truncate">Detail Pembelajaran</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{selectedJadwal.tipe === 'HALAQOH' ? (selectedJadwal.halaqoh?.nama || '-') : (selectedJadwal.kelas?.nama || '-')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    Materi Pembelajaran
                                </label>
                                <textarea
                                    className={`w-full px-5 py-4 rounded-2xl border-2 transition-all outline-none text-sm font-semibold leading-relaxed resize-none ${
                                        formData.status === 'Terlaksana'
                                        ? 'border-gray-100 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 bg-white text-gray-700 placeholder:text-gray-300'
                                        : 'border-gray-50 bg-gray-50/50 text-gray-400 cursor-not-allowed'
                                    }`}
                                    rows="4"
                                    placeholder={formData.status === 'Terlaksana' ? "Tulis materi yang diajarkan hari ini..." : `Sesi ${formData.status} (opsional)`}
                                    value={formData.materi}
                                    onChange={e => setFormData({ ...formData, materi: e.target.value })}
                                    required={formData.status === 'Terlaksana'}
                                    disabled={formData.status !== 'Terlaksana'}
                                ></textarea>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        Status Sesi
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Terlaksana', 'Kosong', 'Libur'].map(st => (
                                            <button
                                                key={st}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, status: st })}
                                                className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${
                                                    formData.status === st 
                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' 
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                                                }`}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        Catatan Guru
                                    </label>
                                    <textarea
                                        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all outline-none bg-white text-sm font-semibold text-gray-700 leading-relaxed placeholder:text-gray-300 resize-none"
                                        rows="2"
                                        placeholder="Hambatan atau evaluasi (opsional)..."
                                        value={formData.catatan}
                                        onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Section */}
                    <div className={`transition-all duration-500 overflow-hidden ${formData.status === 'Terlaksana' ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-8 md:mt-12 border-t border-gray-100 pt-8 md:pt-12 mb-6">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                    <Users size={20} className="md:w-6 md:h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">Presensi Santri</h3>
                                    <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">{santriList.length} Santri Terdaftar</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    const newMap = {}
                                    santriList.forEach(s => {
                                        newMap[s.id] = { status: 'Hadir', keterangan: '' }
                                    })
                                    setAttendanceMap(newMap)
                                }}
                                className="w-full md:w-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={14} /> Set Semua Hadir
                            </button>
                        </div>

                        {loadingSantri ? (
                            <div className="py-20 flex justify-center"><Spinner label="Memuat santri..." /></div>
                        ) : (
                            <div className="grid gap-3 md:gap-6">
                                {santriList.map((s, idx) => {
                                    const current = attendanceMap[s.id] || { status: 'Hadir', keterangan: '' }
                                    return (
                                        <div key={s.id} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-4 group hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-[0.8rem] md:rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 font-black text-xs md:text-sm group-hover:bg-emerald-50 group-hover:text-emerald-400 transition-colors shrink-0">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-black text-sm md:text-base text-gray-900 group-hover:text-emerald-700 transition-colors truncate">{s.nama}</h4>
                                                        <p className="text-[9px] md:text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase">{s.nis}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="w-full space-y-3">
                                                <div className="grid grid-cols-3 md:flex md:flex-wrap gap-1.5 md:gap-2 p-1.5 bg-gray-50/80 rounded-[1.2rem] md:rounded-2xl border border-gray-100">
                                                    {STATUS_OPTIONS.map(opt => {
                                                        const isSelected = current.status === opt.value
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => setAttendanceMap(prev => ({
                                                                    ...prev,
                                                                    [s.id]: { ...prev[s.id], status: opt.value }
                                                                }))}
                                                                className={`w-full md:flex-none px-1 md:px-4 py-2.5 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-tighter transition-all ${
                                                                    isSelected 
                                                                    ? `${opt.color} shadow-sm border`
                                                                    : 'text-gray-400 hover:text-gray-600 hover:bg-white border border-transparent'
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                
                                                <div className={`transition-all duration-300 overflow-hidden ${current.status === 'Hadir' && !current.keterangan ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100 mt-2'}`}>
                                                    <input 
                                                        type="text"
                                                        placeholder={`Keterangan ${current.status} (opsional)...`}
                                                        value={current.keterangan}
                                                        onChange={e => setAttendanceMap(prev => ({
                                                            ...prev,
                                                            [s.id]: { ...prev[s.id], keterangan: e.target.value }
                                                        }))}
                                                        className={`w-full text-xs font-bold px-4 py-3 rounded-xl border transition-all outline-none ${
                                                            current.status === 'Hadir' 
                                                                ? 'border-gray-100 focus:border-emerald-200 bg-gray-50/30'
                                                                : 'border-amber-200 focus:border-amber-400 bg-amber-50/30 text-amber-900 placeholder:text-amber-300'
                                                        }`}
                                                    />
                                                </div>
                                                
                                                {current.status === 'Hadir' && !current.keterangan && (
                                                    <button 
                                                        onClick={() => setAttendanceMap(prev => ({ ...prev, [s.id]: { ...prev[s.id], keterangan: ' ' } }))}
                                                        className="w-full text-left text-[10px] font-bold text-gray-400 px-2 pt-1 flex items-center gap-1 hover:text-emerald-500 transition-colors uppercase tracking-widest"
                                                    >
                                                        + Tambah catatan khusus
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            )}
                        </div>
                        
                        {/* Inline Save Button below the list */}
                        {!loadingSantri && (
                            <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-100">
                                <div className="text-center md:text-left w-full md:w-auto">
                                    <h4 className="text-sm font-black text-gray-900 tracking-tight">Sudah Selesai?</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pastikan data presensi sudah benar</p>
                                </div>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full md:w-auto flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl md:rounded-[1.5rem] font-black text-xs md:text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-200 active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                    <span>Simpan Jurnal & Presensi</span>
                                </button>
                            </div>
                        )}
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <button 
                        onClick={() => navigate('/absensi/home')}
                        className="flex items-center gap-2 text-gray-400 hover:text-emerald-600 transition-colors font-black text-[10px] uppercase tracking-widest shrink-0"
                    >
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Portal</span>
                    </button>
                    <h1 className="font-black text-gray-900 text-base md:text-xl tracking-tight truncate text-center flex-1">Agenda Mengajar</h1>
                    <div className="w-10 sm:w-20 shrink-0"></div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 space-y-8 pb-32">
                {/* Date Selection */}
                <div className="bg-white p-5 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-xl shadow-gray-200/40 border border-gray-50 flex flex-col md:flex-row items-center md:justify-between gap-6 md:gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
                        <div className="bg-emerald-50 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                            <Calendar size={24} className="md:w-8 md:h-8" />
                        </div>
                        <div className="text-center md:text-left space-y-1">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Pilih Tanggal</p>
                            <h2 className="text-lg md:text-2xl font-black text-gray-900 leading-tight">
                                {globalFormatDate(new Date(selectedDate), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </h2>
                        </div>
                    </div>
                    <div className="relative w-full md:w-64">
                        <input
                            type="date"
                            className="w-full px-6 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 outline-none font-bold text-sm bg-gray-50/50 transition-all text-center"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>

                {loadingJurnal ? (
                    <div className="py-20 flex justify-center"><Spinner label="Menyusun jadwal..." /></div>
                ) : jurnalList.length === 0 ? (
                    <div className="py-20">
                        <EmptyState
                            icon={Clock}
                            title="Jadwal Kosong"
                            message="Tidak ada agenda mengajar yang terdaftar pada tanggal ini."
                        />
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {jurnalList.map((jadwal, idx) => {
                            const isFilled = !!jadwal.jurnal
                            return (
                                <button
                                    key={jadwal.id}
                                    onClick={() => openJurnalForm(jadwal)}
                                    className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-5 md:gap-8 text-left hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group active:scale-[0.98] relative"
                                >
                                    {/* Number Badge */}
                                    <div className="absolute -top-3 -left-3 w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xs font-black shadow-lg">
                                        {idx + 1}
                                    </div>

                                    {/* Time Block */}
                                    <div className="flex md:flex-col items-center justify-center bg-gray-50 rounded-[2.5rem] p-6 md:w-36 shrink-0 group-hover:bg-emerald-600 transition-colors duration-500">
                                        <span className="text-2xl font-black text-gray-900 group-hover:text-white transition-colors">{jadwal.jam_mulai.slice(0, 5)}</span>
                                        <div className="h-px w-8 bg-gray-200 my-2 group-hover:bg-emerald-400 transition-colors"></div>
                                        <span className="text-xl font-bold text-gray-500 group-hover:text-emerald-100 transition-colors">{jadwal.jam_selesai.slice(0, 5)}</span>
                                        <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full group-hover:bg-emerald-800 group-hover:text-white transition-all">
                                            Jam {jadwal.jam_ke}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-between py-2">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-2">
                                                    <div className="flex gap-2 flex-wrap">
                                                        <Badge variant={jadwal.tipe === 'HALAQOH' ? 'info' : 'success'} className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg">
                                                            {jadwal.tipe || 'MADROSAH'}
                                                        </Badge>
                                                        {jadwal.is_ganti_jam && (
                                                            <span className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg bg-amber-100 text-amber-800">
                                                                GANTI JAM
                                                            </span>
                                                        )}
                                                        {jadwal.is_pengganti && (
                                                            <span className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg bg-indigo-100 text-indigo-800">
                                                                GURU PENGGANTI
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-2xl font-black text-gray-900 leading-tight group-hover:text-emerald-900 transition-colors">
                                                        {jadwal.tipe === 'HALAQOH' ? `Halaqoh Jam Ke-${jadwal.jam_ke}` : (jadwal.mapel?.nama || '-')}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        <div className="w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                                                            <Users size={12} />
                                                        </div>
                                                        <span className="text-xs font-bold uppercase tracking-widest">
                                                            {jadwal.tipe === 'HALAQOH' ? (jadwal.halaqoh?.nama || '-') : (jadwal.kelas?.nama || '-')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isFilled ? (
                                                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-[1.5rem] shadow-inner">
                                                        <CheckCircle2 size={32} strokeWidth={2.5} />
                                                    </div>
                                                ) : (
                                                    <div className="bg-amber-50 text-amber-600 p-4 rounded-[1.5rem] shadow-inner animate-pulse">
                                                        <AlertCircle size={32} strokeWidth={2.5} />
                                                    </div>
                                                )}
                                            </div>

                                            {jadwal.jurnal ? (
                                                <div className="bg-gray-50/80 rounded-2xl p-5 text-sm text-gray-600 border border-gray-100 line-clamp-2 italic font-medium leading-relaxed">
                                                    <span className="font-black text-emerald-600 uppercase text-[10px] tracking-widest not-italic mb-1 block">Materi Terisi:</span> 
                                                    "{jadwal.jurnal.materi}"
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 text-emerald-600 font-black text-xs uppercase tracking-widest pt-2">
                                                    <span>Lengkapi Jurnal</span>
                                                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:translate-x-2 transition-transform">
                                                        <ArrowRight size={16} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
                
                {/* Info Card */}
                <div className="bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-gray-200">
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-20 h-20 rounded-[2rem] bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                            <BookOpen size={40} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-2xl font-black tracking-tight text-white">Panduan Verifikasi QR</h4>
                            <p className="text-white text-sm leading-relaxed max-w-2xl font-medium">
                                Untuk menjaga integritas data, setiap agenda mengajar wajib diawali dengan melakukan <span className="text-white font-bold underline underline-offset-4 decoration-emerald-500">Scan Kode QR</span> yang ada di ruang belajar. Ini akan membuka akses pengisian jurnal secara otomatis.
                            </p>
                        </div>
                    </div>
                    <QrCode className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 rotate-12" />
                </div>

                <div className="h-20"></div>
            </main>
        </div>
    )
}

export default AgendaMengajar
