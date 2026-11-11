import React, { useState, useEffect, useMemo } from 'react'
import { 
    Calendar, 
    CheckCircle, 
    AlertTriangle, 
    AlertCircle,
    Briefcase,
    Clock, 
    FileText, 
    ChevronLeft, 
    ChevronRight,
    Loader2,
    Palmtree,
    Sparkles,
    Info,
    CalendarCheck
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import Badge from '../../components/ui/Badge'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { findStaffScan, isBeforeScheduleActive, getActiveHolidayForSchedule } from '../../utils/attendanceHelper'

const RiwayatKehadiranPage = () => {
    const { user, userProfile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [guruId, setGuruId] = useState(null)
    const [guruData, setGuruData] = useState(null)
    
    // Filter State: Pilihan antara Bulan Spesifik vs Semester Penuh (Identik Admin)
    const [periodType, setPeriodType] = useState('bulan') // 'bulan' | 'semester'
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [semesterList, setSemesterList] = useState([])
    const [selectedSemesterId, setSelectedSemesterId] = useState('')
    const [holidayList, setHolidayList] = useState([])
    
    // Data State
    const [allJadwal, setAllJadwal] = useState([])
    const [presensiList, setPresensiList] = useState([])
    const [izinList, setIzinList] = useState([])

    // 1. Fetch Metadata: Semester & Kalender Akademik (Hari Libur)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [semRes, holRes] = await Promise.all([
                    supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
                    supabase.from('kalender_akademik').select('*').or('jenis.eq.Libur,judul.ilike.%libur%').order('tanggal_mulai', { ascending: false })
                ])
                if (semRes.data) {
                    setSemesterList(semRes.data)
                    const active = semRes.data.find(s => s.is_active)
                    if (active) setSelectedSemesterId(active.id)
                }
                if (holRes.data) {
                    setHolidayList(holRes.data)
                }
            } catch (e) {
                console.warn('Error fetching metadata (semester / holiday):', e)
            }
        }
        fetchMetadata()
    }, [])

    // 2. Resolve Guru ID dari user login
    useEffect(() => {
        const fetchGuruId = async () => {
            if (userProfile?.guru_id) {
                setGuruId(userProfile.guru_id)
                fetchGuruData(userProfile.guru_id)
                return
            }
            if (!user?.email && !user?.id) return

            try {
                const { data } = await supabase
                    .from('guru')
                    .select('id, nama, created_at')
                    .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
                    .maybeSingle()
                if (data) {
                    setGuruId(data.id)
                    setGuruData(data)
                }
            } catch (err) {
                console.error('Error resolving guru id:', err)
            }
        }
        fetchGuruId()
    }, [user, userProfile])

    const fetchGuruData = async (gId) => {
        const { data } = await supabase.from('guru').select('nama, created_at').eq('id', gId).maybeSingle()
        if (data) setGuruData(data)
    }

    // 3. Menghitung Rentang Tanggal Efektif
    const selectedSemester = useMemo(() => {
        return semesterList.find(s => String(s.id) === String(selectedSemesterId)) || semesterList.find(s => s.is_active) || null
    }, [semesterList, selectedSemesterId])

    const { startDateStr, endDateStr, limitDateStr } = useMemo(() => {
        const today = new Date()
        const todayStr = format(today, 'yyyy-MM-dd')

        if (periodType === 'semester' && selectedSemester?.tanggal_mulai && selectedSemester?.tanggal_selesai) {
            const sStart = selectedSemester.tanggal_mulai
            const sEnd = selectedSemester.tanggal_selesai
            const sLimit = sEnd > todayStr ? todayStr : sEnd
            return { startDateStr: sStart, endDateStr: sEnd, limitDateStr: sLimit }
        }

        const mStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        const mEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
        const mLimit = isBefore(today, endOfMonth(currentMonth)) ? todayStr : mEnd
        return { startDateStr: mStart, endDateStr: mEnd, limitDateStr: mLimit }
    }, [periodType, selectedSemester, currentMonth])

    // 4. Fetch Data Kehadiran, Jadwal & Izin
    useEffect(() => {
        if (!guruId) return

        const fetchData = async () => {
            setLoading(true)
            try {
                // A. Direct Schedules for this teacher
                const directJadwalQuery = supabase
                    .from('jadwal_pelajaran')
                    .select('*')
                    .eq('guru_id', guruId)

                // B. Musyrif Halaqoh links (from halaqoh table where this teacher is musyrif)
                const halaqohDirectPromise = supabase
                    .from('halaqoh')
                    .select('id')
                    .or(`musyrif_id.eq.${guruId}${user?.id ? `,musyrif_id.eq.${user.id}` : ''}`)

                const musyrifHalaqohPromise = user?.id
                    ? supabase.from('musyrif_halaqoh').select('halaqoh_id').eq('user_id', user.id)
                    : Promise.resolve({ data: [] })

                // C. Presensi Staf Scan for this teacher
                const presensiPromise = (async () => {
                    try {
                        let q = supabase
                            .from('presensi_staf')
                            .select('*')
                            .gte('tanggal', startDateStr)
                            .lte('tanggal', endDateStr)
                        
                        if (user?.id && guruId !== user.id) {
                            q = q.or(`staf_id.eq.${guruId},staf_id.eq.${user.id}`)
                        } else {
                            q = q.eq('staf_id', guruId)
                        }
                        const res = await q
                        return res.data || []
                    } catch (e) {
                        console.warn('Presensi staf fetch error:', e)
                        return []
                    }
                })()

                // D. Izin Guru
                const izinQuery = supabase
                    .from('izin_guru')
                    .select('*')
                    .eq('guru_id', guruId)
                    .eq('status', 'Disetujui')
                    .lte('tanggal_mulai', endDateStr)
                    .gte('tanggal_selesai', startDateStr)

                const [jadwalRes, hDirectRes, mhRes, stafScans, izinRes] = await Promise.all([
                    directJadwalQuery,
                    halaqohDirectPromise,
                    musyrifHalaqohPromise,
                    presensiPromise,
                    izinQuery
                ])

                let combinedJadwal = (jadwalRes.data || []).map(j => ({
                    ...j,
                    referensi_id: j.referensi_id || j.kelas_id || j.halaqoh_id
                }))
                
                // Collect all linked halaqoh IDs for this musyrif
                const hDirectIds = (hDirectRes.data || []).map(h => h.id)
                const mhIds = (mhRes.data || []).map(h => h.halaqoh_id)
                const allLinkedHalaqohIds = [...new Set([...hDirectIds, ...mhIds].filter(Boolean))]

                if (allLinkedHalaqohIds.length > 0) {
                    const { data: halaqohJadwal } = await supabase
                        .from('jadwal_pelajaran')
                        .select('*')
                        .or(`halaqoh_id.in.(${allLinkedHalaqohIds.join(',')}),referensi_id.in.(${allLinkedHalaqohIds.join(',')})`)
                    
                    if (halaqohJadwal && halaqohJadwal.length > 0) {
                        const existingIds = new Set(combinedJadwal.map(j => j.id))
                        halaqohJadwal.forEach(j => {
                            const isHalaqoh = j.tipe === 'HALAQOH' || j.tipe === 'QURANIYAH' || Boolean(j.halaqoh_id)
                            if (isHalaqoh && !existingIds.has(j.id) && (!j.guru_id || j.guru_id === guruId)) {
                                combinedJadwal.push({
                                    ...j,
                                    guru_id: guruId,
                                    tipe: 'HALAQOH',
                                    referensi_id: j.halaqoh_id || j.referensi_id
                                })
                            }
                        })
                    }
                }

                setAllJadwal(combinedJadwal)
                setPresensiList(stafScans)
                setIzinList(izinRes.data || [])

            } catch (err) {
                console.error('Error fetching riwayat:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [guruId, startDateStr, endDateStr, user?.id])

    // 5. Olah Logika Kehadiran Terpadu (Identik dengan Admin Laporan)
    const attendanceRecords = useMemo(() => {
        if (!allJadwal.length && !presensiList.length) return []

        const start = new Date(startDateStr)
        const limit = new Date(limitDateStr)
        if (isAfter(start, limit)) return []

        const daysInPeriod = eachDayOfInterval({ start, end: limit })
        const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

        const allActDates = [
            ...presensiList.map(p => p.tanggal),
            ...izinList.map(i => i.tanggal_mulai)
        ].filter(Boolean).sort()
        const firstActivityDate = allActDates.length > 0 ? allActDates[0] : null

        const records = []

        daysInPeriod.forEach(dateObj => {
            const dateStr = format(dateObj, 'yyyy-MM-dd')
            const dayName = dayMap[dateObj.getDay()]

            const dayScans = presensiList.filter(p => p.tanggal === dateStr)
            const matchedScanIds = new Set()

            // Filter jadwal untuk hari ini
            const todaysSchedules = allJadwal.filter(j => {
                if (j.hari !== dayName) return false
                // Jangan anggap jadwal aktif sebelum tanggal pendaftaran guru, jadwal dibuat, atau aktivitas dimulai
                const hasScan = dayScans.some(p => p.staf_id === guruId)
                if (!hasScan && isBeforeScheduleActive(dateStr, guruData?.created_at, j.created_at, firstActivityDate)) {
                    return false
                }
                return true
            })

            // Cek izin yang disetujui untuk tanggal ini
            const matchedIzin = izinList.find(izin => {
                return izin.tanggal_mulai <= dateStr && izin.tanggal_selesai >= dateStr
            })

            todaysSchedules.forEach(jadwal => {
                // Cari kecocokan scan staf dengan helper terpadu
                const scan = findStaffScan(
                    dayScans.filter(p => !matchedScanIds.has(p.id)),
                    jadwal,
                    dateStr
                )

                if (scan) {
                    matchedScanIds.add(scan.id)
                }
                
                let status = 'Belum Absen'
                let keterangan = null

                if (scan) {
                    status = 'Hadir'
                } else {
                    // Cek Hari Libur sesuai Kalender Akademik (Madrasah / Halaqoh / Semua) - Identik dengan Admin
                    const holidayMatch = getActiveHolidayForSchedule(dateStr, jadwal.tipe, holidayList)
                    if (holidayMatch) {
                        status = 'Libur'
                        keterangan = `${holidayMatch.judul || 'Libur'}${holidayMatch.scope && holidayMatch.scope !== 'Semua' ? ` (${holidayMatch.scope})` : ''}`
                    } else if (matchedIzin) {
                        status = matchedIzin.jenis_izin || 'Izin'
                        keterangan = matchedIzin.keterangan
                    } else {
                        // Cek apakah jadwal ini sudah lewat batas waktu kelas
                        const now = new Date()
                        const classDate = new Date(dateObj)
                        if (jadwal.jam_selesai) {
                            const [h, m] = jadwal.jam_selesai.split(':').map(Number)
                            classDate.setHours(h, m, 0, 0)
                        } else {
                            classDate.setHours(23, 59, 59, 999)
                        }
                        
                        if (now > classDate) {
                            status = 'Alpha'
                        }
                    }
                }

                records.push({
                    id: `${dateStr}_${jadwal.id}`,
                    tanggal: dateStr,
                    dateObj: dateObj,
                    tipe: jadwal.tipe,
                    jam_ke: jadwal.jam_ke,
                    jam_mulai: jadwal.jam_mulai,
                    jam_selesai: jadwal.jam_selesai,
                    waktu_scan: scan ? scan.waktu_scan : null,
                    status,
                    keterangan
                })
            })
            
            // Tambahkan scan yang dilakukan pada hari ini namun di luar jadwal reguler (Sesi Tambahan)
            const extraScans = dayScans.filter(p => !matchedScanIds.has(p.id))
            extraScans.forEach(scan => {
                records.push({
                    id: scan.id,
                    tanggal: dateStr,
                    dateObj: dateObj,
                    tipe: scan.tipe || 'MADROSAH',
                    jam_ke: scan.jam_ke || 1,
                    jam_mulai: null,
                    jam_selesai: null,
                    waktu_scan: scan.waktu_scan,
                    status: 'Hadir',
                    is_tambahan: true
                })
            })
        })

        // Urutkan tanggal terbaru ke terlama, lalu jam_ke
        return records.sort((a, b) => {
            if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal)
            return Number(a.jam_ke) - Number(b.jam_ke)
        })
    }, [allJadwal, presensiList, izinList, holidayList, startDateStr, limitDateStr, guruData, guruId])

    // 6. Hitung Statistik Ringkasan (Identik dengan Admin Staf Summary)
    const stats = useMemo(() => {
        let totalSelesai = 0, hadir = 0, izin = 0, alpha = 0, belum_absen = 0, libur = 0
        attendanceRecords.forEach(r => {
            if (r.status === 'Hadir') hadir++
            else if (['Izin', 'Sakit', 'Dinas'].includes(r.status)) izin++
            else if (r.status === 'Alpha') alpha++
            else if (r.status === 'Belum Absen') belum_absen++
            else if (r.status === 'Libur') libur++
            
            // Hanya sesi yang selesai dievaluasi (bukan sesi tambahan, bukan belum absen, dan bukan libur) yang dihitung totalnya
            if (!r.is_tambahan && r.status !== 'Belum Absen' && r.status !== 'Libur') {
                totalSelesai++
            }
        })
        const skor = totalSelesai > 0 ? Math.round(((hadir + izin) / totalSelesai) * 100) : 0
        return { total: totalSelesai + belum_absen, totalSelesai, hadir, izin, alpha, belum_absen, libur, skor }
    }, [attendanceRecords])

    // Handlers Navigasi Bulan
    const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    const isNextDisabled = isAfter(startOfMonth(currentMonth), startOfMonth(new Date())) || isSameDay(startOfMonth(currentMonth), startOfMonth(new Date()))

    const getStatusBadge = (status, isTambahan) => {
        if (isTambahan) return <Badge variant="primary" className="bg-blue-50 text-blue-600 border-blue-200">Tambahan</Badge>
        if (status === 'Hadir') return <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-200"><CheckCircle size={12} className="mr-1 inline" /> Hadir</Badge>
        if (status === 'Sakit') return <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200"><AlertCircle size={12} className="mr-1 inline" /> Sakit</Badge>
        if (status === 'Izin') return <Badge variant="info" className="bg-blue-50 text-blue-700 border-blue-200"><FileText size={12} className="mr-1 inline" /> Izin</Badge>
        if (status === 'Dinas') return <Badge variant="primary" className="bg-indigo-50 text-indigo-700 border-indigo-200"><Briefcase size={12} className="mr-1 inline" /> Dinas</Badge>
        if (status === 'Libur') return <Badge variant="neutral" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold"><Palmtree size={12} className="mr-1 inline" /> Libur</Badge>
        if (status === 'Belum Absen') return <Badge variant="neutral" className="bg-gray-50 text-gray-500 border-gray-200"><Clock size={12} className="mr-1 inline" /> Belum Absen</Badge>
        return <Badge variant="danger" className="bg-red-50 text-red-600 border-red-200"><AlertTriangle size={12} className="mr-1 inline" /> Alpha</Badge>
    }

    if (!guruId && !loading && !guruData) {
        return (
            <div className="p-4 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in">
                <AlertTriangle size={48} className="text-amber-500 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Akses Terbatas</h3>
                <p className="text-gray-500 max-w-md">Akun Anda tidak terhubung dengan profil Pengajar/Staf. Halaman ini khusus untuk melihat riwayat kehadiran Anda sebagai pengajar.</p>
            </div>
        )
    }

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto mb-20 lg:mb-8 space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title="Riwayat Kehadiran"
                subtitle={guruData ? `Halo, ${guruData.nama}` : "Pantau rekam jejak kehadiran mengajar Anda"}
                icon={Clock}
            />

            {/* Filter Periode Terpadu: Pilihan Per Bulan vs Semester Penuh (Sinkron Admin) */}
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mode Periode:</span>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setPeriodType('bulan')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodType === 'bulan' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Per Bulan
                            </button>
                            <button
                                onClick={() => setPeriodType('semester')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodType === 'semester' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Semester Penuh (Identik Admin)
                            </button>
                        </div>
                    </div>

                    {periodType === 'semester' && (
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedSemesterId}
                                onChange={(e) => setSelectedSemesterId(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-900 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                            >
                                {semesterList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nama} ({s.tahun_ajaran}) {s.is_active ? '— Aktif' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {periodType === 'bulan' ? (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <button 
                            onClick={prevMonth}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                            title="Bulan Sebelumnya"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Bulan Rekap</span>
                            <span className="text-base md:text-lg font-bold text-gray-900">
                                {format(currentMonth, 'MMMM yyyy', { locale: id })}
                            </span>
                        </div>
                        <button 
                            onClick={nextMonth}
                            disabled={isNextDisabled}
                            className={`p-2 rounded-lg transition-colors ${isNextDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
                            title="Bulan Selanjutnya"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-gray-50 text-xs text-emerald-800 font-medium gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>
                                Rekap semester: <b>{selectedSemester?.nama || 'Semester Aktif'} ({selectedSemester?.tahun_ajaran || ''})</b>
                            </span>
                        </div>
                        <span className="text-gray-500 text-[11px] font-mono">
                            {startDateStr} s/d {limitDateStr}
                        </span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-emerald-600" />
                </div>
            ) : (
                <>
                    {/* Statistik Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-emerald-50 border-emerald-100 overflow-hidden relative">
                            <div className="p-4 flex flex-col relative z-10">
                                <span className="text-xs font-bold text-emerald-600/80 uppercase mb-1">Hadir</span>
                                <div className="text-3xl font-black text-emerald-700">{stats.hadir}</div>
                            </div>
                            <CheckCircle className="absolute -bottom-4 -right-4 w-20 h-20 text-emerald-500/10" />
                        </Card>
                        <Card className="bg-amber-50 border-amber-100 overflow-hidden relative">
                            <div className="p-4 flex flex-col relative z-10">
                                <span className="text-xs font-bold text-amber-600/80 uppercase mb-1">Izin / Sakit</span>
                                <div className="text-3xl font-black text-amber-700">{stats.izin}</div>
                            </div>
                            <FileText className="absolute -bottom-4 -right-4 w-20 h-20 text-amber-500/10" />
                        </Card>
                        <Card className="bg-red-50 border-red-100 overflow-hidden relative">
                            <div className="p-4 flex flex-col relative z-10">
                                <span className="text-xs font-bold text-red-600/80 uppercase mb-1">Alpha</span>
                                <div className="text-3xl font-black text-red-700">{stats.alpha}</div>
                            </div>
                            <AlertTriangle className="absolute -bottom-4 -right-4 w-20 h-20 text-red-500/10" />
                        </Card>
                        <Card className="bg-[#0A2619] border-[#143d2a] overflow-hidden relative">
                            <div className="p-4 flex flex-col relative z-10">
                                <span className="text-xs font-bold text-[#BCF32F]/80 uppercase mb-1">Skor Kehadiran</span>
                                <div className="text-3xl font-black text-[#BCF32F]">{stats.skor}%</div>
                            </div>
                            <Calendar className="absolute -bottom-4 -right-4 w-20 h-20 text-white/5" />
                        </Card>
                    </div>

                    {stats.libur > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-medium">
                            <Palmtree size={16} className="text-emerald-600 shrink-0" />
                            <span>
                                Terdapat <b>{stats.libur} jam mengajar</b> yang diliburkan sesuai Kalender Akademik pondok (hari libur tidak dihitung Alpha &amp; tidak mengurangi skor).
                            </span>
                        </div>
                    )}

                    {/* Tabel Riwayat */}
                    <Card className="overflow-hidden border-gray-100 shadow-sm">
                        <ResponsiveTable
                            data={attendanceRecords}
                            columns={[
                                { 
                                    header: 'Tanggal', 
                                    render: (row) => (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{format(row.dateObj, 'dd MMM yyyy', { locale: id })}</span>
                                            <span className="text-xs font-medium text-gray-500">{format(row.dateObj, 'EEEE', { locale: id })}</span>
                                        </div>
                                    ),
                                    className: 'px-6 py-4 w-40'
                                },
                                { 
                                    header: 'Jadwal Mengajar', 
                                    render: (row) => (
                                        <div className="flex flex-col">
                                            <Badge variant="neutral" className="w-fit text-[10px] mb-1 font-black uppercase tracking-wider">{row.tipe}</Badge>
                                            <span className="text-sm font-bold text-gray-800">Jam ke-{row.jam_ke}</span>
                                            {row.jam_mulai && <span className="text-xs font-semibold text-gray-500 mt-0.5">{row.jam_mulai.substring(0,5)} - {row.jam_selesai.substring(0,5)} WIB</span>}
                                        </div>
                                    ),
                                    className: 'px-6 py-4'
                                },
                                { 
                                    header: 'Status & Keterangan', 
                                    render: (row) => (
                                        <div className="flex flex-col items-start gap-1">
                                            {getStatusBadge(row.status, row.is_tambahan)}
                                            {row.waktu_scan && (
                                                <span className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded flex items-center gap-1.5 mt-0.5">
                                                    <Clock size={12} className="text-gray-400" />
                                                    {format(new Date(row.waktu_scan), 'HH:mm')} WIB
                                                </span>
                                            )}
                                            {row.keterangan && (
                                                <span className="text-[11px] text-gray-600 font-medium italic mt-0.5">
                                                    {row.keterangan}
                                                </span>
                                            )}
                                        </div>
                                    ),
                                    className: 'px-6 py-4'
                                }
                            ]}
                            mobileCardRender={(row) => (
                                <div className="p-4 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">{format(row.dateObj, 'EEEE, dd MMM yyyy', { locale: id })}</span>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Badge variant="neutral" className="text-[10px] uppercase font-black">{row.tipe}</Badge>
                                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">Jam ke-{row.jam_ke}</span>
                                            </div>
                                        </div>
                                        {getStatusBadge(row.status, row.is_tambahan)}
                                    </div>
                                    {row.waktu_scan && (
                                        <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-gray-400" />
                                                <span className="text-xs font-medium text-gray-500">Waktu Scan</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-700">{format(new Date(row.waktu_scan), 'HH:mm:ss')} WIB</span>
                                        </div>
                                    )}
                                    {row.keterangan && (
                                        <div className="text-xs text-gray-600 italic bg-gray-50/50 p-2 rounded-lg">
                                            {row.keterangan}
                                        </div>
                                    )}
                                </div>
                            )}
                            emptyMessage={
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Calendar size={28} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Riwayat</h3>
                                    <p className="text-sm font-medium text-gray-500 max-w-sm leading-relaxed">
                                        Tidak ada catatan kehadiran, izin, ataupun jadwal mengajar pada periode yang dipilih.
                                    </p>
                                </div>
                            }
                        />
                    </Card>
                </>
            )}
        </div>
    )
}

export default RiwayatKehadiranPage
