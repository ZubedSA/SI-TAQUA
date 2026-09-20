import React, { useState, useEffect, useMemo } from 'react'
import { 
    Calendar, 
    CheckCircle, 
    AlertTriangle, 
    Clock, 
    FileText, 
    ChevronLeft, 
    ChevronRight,
    Loader2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import Badge from '../../components/ui/Badge'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { findStaffScan } from '../../utils/attendanceHelper'

const RiwayatKehadiranPage = () => {
    const { user, userProfile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [guruId, setGuruId] = useState(null)
    const [guruData, setGuruData] = useState(null)
    
    // Filter State
    const [currentMonth, setCurrentMonth] = useState(new Date())
    
    // Data State
    const [allJadwal, setAllJadwal] = useState([])
    const [presensiList, setPresensiList] = useState([])
    const [izinList, setIzinList] = useState([])

    // 1. Resolve Guru ID
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
                    .select('id, nama')
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
        const { data } = await supabase.from('guru').select('nama').eq('id', gId).maybeSingle()
        if (data) setGuruData(data)
    }

    // 2. Fetch Data per Month
    useEffect(() => {
        // Jangan fetch jika guruId belum siap agar tidak memuat seluruh jadwal satu pesantren
        if (!guruId) return

        const fetchData = async () => {
            setLoading(true)
            try {
                const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
                const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

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
                            .gte('tanggal', startDate)
                            .lte('tanggal', endDate)
                        
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

                // D. Presensi Mapel / Jurnal Mengajar Terlaksana for this teacher
                const mapelPromise = (async () => {
                    try {
                        const res = await supabase
                            .from('presensi_mapel')
                            .select('*')
                            .gte('tanggal', startDate)
                            .lte('tanggal', endDate)
                            .eq('status', 'Terlaksana')
                            .eq('guru_id', guruId)
                        
                        return (res.data || []).map(m => ({
                            id: `mapel_${m.id}`,
                            staf_id: m.guru_id,
                            tanggal: m.tanggal,
                            tipe: m.halaqoh_id ? 'QURANIYAH' : 'MADROSAH',
                            referensi_id: m.kelas_id || m.halaqoh_id,
                            jadwal_id: m.jadwal_id,
                            waktu_scan: m.created_at || `${m.tanggal}T08:00:00Z`,
                            source: 'jurnal'
                        }))
                    } catch (e) {
                        console.warn('Presensi mapel fetch error:', e)
                        return []
                    }
                })()

                // E. Izin Guru
                const izinQuery = supabase
                    .from('izin_guru')
                    .select('*')
                    .eq('guru_id', guruId)
                    .eq('status', 'Disetujui')
                    .lte('tanggal_mulai', endDate)
                    .gte('tanggal_selesai', startDate)

                const [jadwalRes, hDirectRes, mhRes, stafScans, mapelScans, izinRes] = await Promise.all([
                    directJadwalQuery,
                    halaqohDirectPromise,
                    musyrifHalaqohPromise,
                    presensiPromise,
                    mapelPromise,
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
                        .in('halaqoh_id', allLinkedHalaqohIds)
                        .eq('tipe', 'HALAQOH')
                    
                    if (halaqohJadwal && halaqohJadwal.length > 0) {
                        const existingIds = new Set(combinedJadwal.map(j => j.id))
                        halaqohJadwal.forEach(j => {
                            // Hanya masukkan jika belum ada dan jadwal ini milik guru ini atau belum ada pengajar lain
                            if (!existingIds.has(j.id) && (!j.guru_id || j.guru_id === guruId)) {
                                combinedJadwal.push({
                                    ...j,
                                    guru_id: guruId,
                                    referensi_id: j.halaqoh_id || j.referensi_id
                                })
                            }
                        })
                    }
                }

                setAllJadwal(combinedJadwal)
                setPresensiList([...stafScans, ...mapelScans])
                setIzinList(izinRes.data || [])

            } catch (err) {
                console.error('Error fetching riwayat:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [guruId, currentMonth, user?.id])

    // 3. Process Attendance Logic
    const attendanceRecords = useMemo(() => {
        if (!allJadwal.length && !presensiList.length) return []

        const startDate = startOfMonth(currentMonth)
        const endDate = endOfMonth(currentMonth)
        const today = new Date()
        
        // Stop generating future absences if we're in the current month
        const limitDate = isBefore(today, endDate) ? today : endDate

        const daysInMonth = eachDayOfInterval({ start: startDate, end: limitDate })
        const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

        const records = []

        daysInMonth.forEach(dateObj => {
            const dateStr = format(dateObj, 'yyyy-MM-dd')
            const dayName = dayMap[dateObj.getDay()]

            // Find schedule for this day of week
            const todaysSchedules = allJadwal.filter(j => j.hari === dayName)

            // Check if there is an approved Izin for this date
            const isIzin = izinList.some(izin => {
                const start = new Date(izin.tanggal_mulai)
                const end = new Date(izin.tanggal_selesai)
                start.setHours(0,0,0,0)
                end.setHours(0,0,0,0)
                const current = new Date(dateObj)
                current.setHours(0,0,0,0)
                return current >= start && current <= end
            })

            const dayScans = presensiList.filter(p => p.tanggal === dateStr)
            const matchedScanIds = new Set()

            todaysSchedules.forEach(jadwal => {
                // Find matching scan using unified logic
                const scan = findStaffScan(
                    dayScans.filter(p => !matchedScanIds.has(p.id)),
                    jadwal,
                    dateStr
                )

                if (scan) {
                    matchedScanIds.add(scan.id)
                }
                
                let status = 'Belum Absen'
                if (scan) {
                    status = 'Hadir'
                } else if (isIzin) {
                    status = 'Izin'
                } else {
                    // Cek apakah jadwal ini sudah lewat
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

                records.push({
                    id: `${dateStr}_${jadwal.id}`,
                    tanggal: dateStr,
                    dateObj: dateObj,
                    tipe: jadwal.tipe,
                    jam_ke: jadwal.jam_ke,
                    jam_mulai: jadwal.jam_mulai,
                    jam_selesai: jadwal.jam_selesai,
                    waktu_scan: scan ? scan.waktu_scan : null,
                    status
                })
            })
            
            // Also add ANY scans that happened on this day but weren't in schedule (Tambahan)
            const extraScans = dayScans.filter(p => !matchedScanIds.has(p.id))
            extraScans.forEach(scan => {
                records.push({
                    id: scan.id,
                    tanggal: dateStr,
                    dateObj: dateObj,
                    tipe: scan.tipe,
                    jam_ke: scan.jam_ke,
                    jam_mulai: null,
                    jam_selesai: null,
                    waktu_scan: scan.waktu_scan,
                    status: 'Hadir',
                    is_tambahan: true
                })
            })
        })

        // Sort descending by date, then ascending by jam_ke
        return records.sort((a, b) => {
            if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal)
            return Number(a.jam_ke) - Number(b.jam_ke)
        })
    }, [allJadwal, presensiList, izinList, currentMonth])

    // Calculate Summary Stats
    const stats = useMemo(() => {
        let totalSelesai = 0, hadir = 0, izin = 0, alpha = 0, belum_absen = 0
        attendanceRecords.forEach(r => {
            if (r.status === 'Hadir') hadir++
            else if (r.status === 'Izin') izin++
            else if (r.status === 'Alpha') alpha++
            else if (r.status === 'Belum Absen') belum_absen++
            
            if (!r.is_tambahan && r.status !== 'Belum Absen') {
                 totalSelesai++
            }
        })
        const skor = totalSelesai > 0 ? Math.round(((hadir + izin) / totalSelesai) * 100) : 0
        return { total: totalSelesai + belum_absen, totalSelesai, hadir, izin, alpha, belum_absen, skor }
    }, [attendanceRecords])

    // Navigation Handlers
    const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    const isNextDisabled = isAfter(startOfMonth(currentMonth), startOfMonth(new Date())) || isSameDay(startOfMonth(currentMonth), startOfMonth(new Date()))

    const getStatusBadge = (status, isTambahan) => {
        if (isTambahan) return <Badge variant="primary" className="bg-blue-50 text-blue-600 border-blue-200">Tambahan</Badge>
        if (status === 'Hadir') return <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-200"><CheckCircle size={12} className="mr-1 inline" /> Hadir</Badge>
        if (status === 'Izin') return <Badge variant="warning" className="bg-amber-50 text-amber-600 border-amber-200"><FileText size={12} className="mr-1 inline" /> Izin</Badge>
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

            {/* Filter Bulan */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <button 
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Periode</span>
                    <span className="text-lg font-bold text-gray-900">
                        {format(currentMonth, 'MMMM yyyy', { locale: id })}
                    </span>
                </div>
                <button 
                    onClick={nextMonth}
                    disabled={isNextDisabled}
                    className={`p-2 rounded-lg transition-colors ${isNextDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-primary-600" />
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
                                <span className="text-xs font-bold text-amber-600/80 uppercase mb-1">Izin</span>
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
                                    header: 'Status & Waktu', 
                                    render: (row) => (
                                        <div className="flex flex-col items-start gap-1.5">
                                            {getStatusBadge(row.status, row.is_tambahan)}
                                            {row.waktu_scan && (
                                                <span className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded flex items-center gap-1.5 mt-1">
                                                    <Clock size={12} className="text-gray-400" />
                                                    {format(new Date(row.waktu_scan), 'HH:mm')} WIB
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
                                </div>
                            )}
                            emptyMessage={
                                <div className="py-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Calendar size={28} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Riwayat</h3>
                                    <p className="text-sm font-medium text-gray-500 max-w-sm leading-relaxed">
                                        Tidak ada catatan kehadiran, izin, ataupun jadwal mengajar pada bulan {format(currentMonth, 'MMMM yyyy', { locale: id })}.
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
