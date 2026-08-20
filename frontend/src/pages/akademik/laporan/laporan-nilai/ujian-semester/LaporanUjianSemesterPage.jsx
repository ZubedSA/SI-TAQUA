import { useState, useEffect, useMemo } from 'react'
import { FileText, RefreshCw, Download, Printer, Users, BookOpen, GraduationCap, Shield, AlertCircle, Lock } from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../context/AuthContext'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useCalendar } from '../../../../../context/CalendarContext'
import DataTable from '../../../../../components/DataTable'
import { calculateSidogiriGrade } from '../../../../../components/akademik/RaportMadrasahTemplate'
import '../../../../../pages/laporan/Laporan.css'

const columnHelper = createColumnHelper()

const LaporanUjianSemesterPage = () => {
    const { user, userProfile, isAdmin: checkIsAdmin, isAdminAkademik: checkIsAdminAkademik } = useAuth()
    const { formatDate } = useCalendar()
    const [loading, setLoading] = useState(false)

    // Dual Mode: 'halaqoh' (Qur'aniyah / Musyrif) vs 'kelas' (Madrasah / Wali Kelas)
    const [mode, setMode] = useState('halaqoh')
    // Nilai View Mode for Madrasah: 'raport' (Hasil Olah Ujian + Harian) vs 'uas' (Ujian) vs 'harian' (Harian)
    const [nilaiViewMode, setNilaiViewMode] = useState('raport')

    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [kelas, setKelas] = useState([])
    const [data, setData] = useState([])
    const [mapelList, setMapelList] = useState([])

    const [isAdmin, setIsAdmin] = useState(false)
    const [teacherInfo, setTeacherInfo] = useState(null)

    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: '',
        kelas_id: ''
    })

    useEffect(() => {
        if (user?.id) {
            loadDropdownsAndPermissions()
        }
    }, [user?.id, userProfile?.activeRole])

    const loadDropdownsAndPermissions = async () => {
        try {
            setLoading(true)
            const adminRole = (checkIsAdmin && checkIsAdmin()) || 
                (checkIsAdminAkademik && checkIsAdminAkademik()) ||
                ['admin', 'admin_akademik'].includes(userProfile?.activeRole) || 
                ['admin', 'admin_akademik'].includes(userProfile?.role) ||
                userProfile?.roles?.includes('admin') ||
                userProfile?.roles?.includes('admin_akademik')

            setIsAdmin(Boolean(adminRole))

            const [semRes, halRes, kelRes] = await Promise.all([
                supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
                supabase.from('halaqoh').select('id, nama, musyrif_id').order('nama'),
                supabase.from('kelas').select('id, nama, wali_kelas_id').order('nama')
            ])

            const allSemesters = semRes.data || []
            const allHalaqoh = halRes.data || []
            const allKelas = kelRes.data || []

            setSemester(allSemesters)
            let activeSemId = ''
            const activeSem = allSemesters.find(s => s.is_active)
            if (activeSem) activeSemId = activeSem.id

            let activeHalaqohList = allHalaqoh
            let activeKelasList = allKelas
            let targetMode = mode

            if (!adminRole && user) {
                let guruData = null
                const userEmail = (userProfile?.email || user?.email || '').trim().toLowerCase()
                const userNames = [userProfile?.nama, userProfile?.full_name, user?.email?.split('@')[0]].filter(Boolean).map(n => n.trim().toLowerCase())

                if (userProfile?.guru_id) {
                    const { data: byGuruId } = await supabase
                        .from('guru')
                        .select('id, nama')
                        .eq('id', userProfile.guru_id)
                        .maybeSingle()
                    guruData = byGuruId
                }
                if (!guruData && userEmail) {
                    const { data: byEmail } = await supabase
                        .from('guru')
                        .select('id, nama')
                        .ilike('email', userEmail)
                        .maybeSingle()
                    guruData = byEmail
                }
                if (!guruData && user.id) {
                    const { data: byUserId } = await supabase
                        .from('guru')
                        .select('id, nama')
                        .eq('user_id', user.id)
                        .maybeSingle()
                    guruData = byUserId
                }
                if (!guruData && userNames.length > 0) {
                    const { data: allGuru } = await supabase.from('guru').select('id, nama')
                    guruData = (allGuru || []).find(g => g.nama && userNames.some(name => g.nama.trim().toLowerCase() === name))
                }

                setTeacherInfo(guruData || { nama: userProfile?.nama || userProfile?.full_name || user.email })

                const userIds = [user?.id, userProfile?.id, userProfile?.user_id, userProfile?.guru_id, guruData?.id].filter(Boolean).map(id => String(id))

                const { data: mhLinks } = await supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id, musyrif_id')

                const assignedHalaqoh = allHalaqoh.filter(h => {
                    if (h.musyrif_id && userIds.includes(String(h.musyrif_id))) return true
                    if (h.guru?.nama && userNames.some(name => h.guru.nama.trim().toLowerCase() === name)) return true
                    return (mhLinks || []).some(mh => 
                        String(mh.halaqoh_id) === String(h.id) && 
                        (userIds.includes(String(mh.user_id)) || userIds.includes(String(mh.musyrif_id)))
                    )
                })

                const assignedKelas = allKelas.filter(k => {
                    if (k.wali_kelas_id && userIds.includes(String(k.wali_kelas_id))) return true
                    if (k.wali_kelas?.nama && userNames.some(name => k.wali_kelas.nama.trim().toLowerCase() === name)) return true
                    return false
                })

                activeHalaqohList = assignedHalaqoh
                activeKelasList = assignedKelas

                if (assignedHalaqoh.length === 0 && assignedKelas.length > 0) {
                    targetMode = 'kelas'
                    setMode('kelas')
                } else if (assignedKelas.length === 0 && assignedHalaqoh.length > 0) {
                    targetMode = 'halaqoh'
                    setMode('halaqoh')
                }
            }

            setHalaqoh(activeHalaqohList)
            setKelas(activeKelasList)

            if (targetMode === 'halaqoh') {
                setFilters({
                    semester_id: activeSemId,
                    kelas_id: '',
                    halaqoh_id: activeHalaqohList.length > 0 ? activeHalaqohList[0].id : ''
                })
            } else {
                setFilters({
                    semester_id: activeSemId,
                    kelas_id: activeKelasList.length > 0 ? activeKelasList[0].id : '',
                    halaqoh_id: ''
                })
            }
        } catch (err) {
            console.error('Permission load error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleModeChange = (newMode) => {
        if (newMode === mode) return
        if (!isAdmin) {
            if (newMode === 'halaqoh' && halaqoh.length === 0) return
            if (newMode === 'kelas' && kelas.length === 0) return
        }
        setMode(newMode)
        if (newMode === 'halaqoh') {
            const firstHalaqoh = halaqoh.length > 0 ? halaqoh[0].id : ''
            setFilters(prev => ({ ...prev, kelas_id: '', halaqoh_id: firstHalaqoh }))
        } else {
            const firstKelas = kelas.length > 0 ? kelas[0].id : ''
            setFilters(prev => ({ ...prev, halaqoh_id: '', kelas_id: firstKelas }))
        }
    }

    const fetchData = async () => {
        if (!filters.semester_id || (mode === 'halaqoh' && !filters.halaqoh_id) || (mode === 'kelas' && !filters.kelas_id)) return
        setLoading(true)

        try {
            // Build santri query
            let santriQuery = supabase
                .from('santri')
                .select('id, nama, nis, kelas_id, halaqoh_id')
                .eq('status', 'Aktif')
                .order('nama')

            if (mode === 'halaqoh' && filters.halaqoh_id) {
                santriQuery = santriQuery.eq('halaqoh_id', filters.halaqoh_id)
            }
            if (mode === 'kelas' && filters.kelas_id) {
                santriQuery = santriQuery.eq('kelas_id', filters.kelas_id)
            }

            const { data: santriData } = await santriQuery

            if (!santriData || santriData.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const santriIds = santriData.map(s => s.id)

            // Get mapels list FIRST - all active mapels (Filtered by Madrasiyah/Madrosiyah)
            const { data: mapelData } = await supabase
                .from('mapel')
                .select('id, nama, kode, kategori')
                .in('kategori', ['Madrasiyah', 'Madrosiyah'])
                .order('nama')

            if (mapelData) setMapelList(mapelData)

            // Get scores for this semester
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select('*')
                .in('santri_id', santriIds)
                .eq('semester_id', filters.semester_id)

            // Map values based on mode
            let result = santriData.map(santri => {
                if (mode === 'halaqoh') {
                    // Qur'aniyah mode (Tahfizhiyah)
                    const tahfizhGrades = nilaiData?.filter(n => n.santri_id === santri.id && n.kategori === 'Tahfizhiyah') || []
                    let nilaiTahfizh = tahfizhGrades.find(n => n.jenis_ujian === 'semester') || tahfizhGrades.find(n => n.jenis_ujian === 'uas')

                    const hafalan = nilaiTahfizh?.nilai_hafalan || 0
                    const tajwid = nilaiTahfizh?.nilai_tajwid || 0
                    const kelancaran = nilaiTahfizh?.nilai_kelancaran || 0
                    const rataRataTahfizh = nilaiTahfizh ? ((hafalan + tajwid + kelancaran) / 3) : 0

                    return {
                        ...santri,
                        mapelScores: {},
                        hafalan: nilaiTahfizh ? hafalan : '-',
                        tajwid: nilaiTahfizh ? tajwid : '-',
                        kelancaran: nilaiTahfizh ? kelancaran : '-',
                        rata_rata_tahfizh: nilaiTahfizh ? rataRataTahfizh.toFixed(1) : '-',
                        rata_rata_total: nilaiTahfizh ? rataRataTahfizh : 0,
                        rata_rata_total_display: nilaiTahfizh ? rataRataTahfizh.toFixed(1) : '-'
                    }
                } else {
                    // Madrasah mode (Madrasiyah)
                    const mapelScores = {}
                    let totalMadrasiyah = 0
                    let countMadrasiyah = 0

                    mapelData?.forEach(m => {
                        const grades = nilaiData?.filter(n =>
                            n.santri_id === santri.id &&
                            (n.kategori === 'Madrasiyah' || n.kategori === 'Madrosiyah') &&
                            n.mapel_id === m.id
                        ) || []

                        const harianRec = grades.find(n => n.jenis_ujian === 'harian')
                        const uasRec = grades.find(n => n.jenis_ujian === 'semester' || n.jenis_ujian === 'uas')

                        const rawHarian = harianRec ? (harianRec.nilai_harian ?? harianRec.nilai_akhir ?? harianRec.nilai) : null
                        const rawUas = uasRec ? (uasRec.nilai_uas ?? uasRec.nilai_akhir ?? uasRec.nilai) : null

                        const harianVal = rawHarian !== null && rawHarian !== undefined && rawHarian !== '' ? Number(rawHarian) : null
                        const uasVal = rawUas !== null && rawUas !== undefined && rawUas !== '' ? Number(rawUas) : null

                        // MMU Sidogiri Pedoman: Skala 3 - 10 untuk Raport
                        const calculated = calculateSidogiriGrade(uasVal, harianVal)

                        mapelScores[m.id] = {
                            harian: rawHarian !== null && rawHarian !== undefined && rawHarian !== '' ? rawHarian : '-',
                            uas: rawUas !== null && rawUas !== undefined && rawUas !== '' ? rawUas : '-',
                            raport: calculated.finalGrade
                        }

                        let activeVal = null
                        if (nilaiViewMode === 'harian') activeVal = harianVal
                        else if (nilaiViewMode === 'uas') activeVal = uasVal
                        else activeVal = calculated.finalGrade !== '-' ? Number(calculated.finalGrade) : null

                        if (activeVal !== null && activeVal > 0) {
                            totalMadrasiyah += activeVal
                            countMadrasiyah++
                        }
                    })

                    const rataRataMadrasiyah = countMadrasiyah > 0 ? totalMadrasiyah / countMadrasiyah : 0

                    return {
                        ...santri,
                        mapelScores,
                        rata_rata_madrasiyah: countMadrasiyah > 0 ? rataRataMadrasiyah.toFixed(1) : '-',
                        rata_rata_total: countMadrasiyah > 0 ? rataRataMadrasiyah : 0,
                        rata_rata_total_display: countMadrasiyah > 0 ? rataRataMadrasiyah.toFixed(1) : '-'
                    }
                }
            })

            // Calculate Rankings (Standard Competition Ranking)
            result.forEach(r => {
                r.rata_rata_total = Number(r.rata_rata_total) || 0
            })

            result.sort((a, b) => b.rata_rata_total - a.rata_rata_total)

            let currentRank = 1
            for (let i = 0; i < result.length; i++) {
                if (i > 0 && result[i].rata_rata_total < result[i - 1].rata_rata_total) {
                    currentRank = i + 1
                }
                result[i].peringkat = result[i].rata_rata_total > 0 ? currentRank : '-'
            }

            setData(result)
        } catch (err) {
            console.error('Error fetching data:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.semester_id && (filters.halaqoh_id || filters.kelas_id)) {
            fetchData()
        }
    }, [filters.halaqoh_id, filters.kelas_id, filters.semester_id, mode, nilaiViewMode])

    const generatePDF = async () => {
        if (data.length === 0) return

        const selectedHalaqoh = halaqoh.find(h => h.id === filters.halaqoh_id)
        const selectedKelas = kelas.find(k => k.id === filters.kelas_id)
        const currentSem = semester.find(s => s.id === filters.semester_id)

        let columns = []
        let reportTitle = mode === 'halaqoh' ? 'LAPORAN UJIAN SEMESTER QUR\'ANIYAH' : 'LAPORAN UJIAN SEMESTER MADRASAH'
        let subtitle = mode === 'halaqoh' ? 'Laporan Hasil Ujian Semester - Tahfizhiyah' : 'Laporan Hasil Ujian Semester - Madrasiyah'

        if (mode === 'halaqoh') {
            columns = ['Peringkat', 'NIS', 'Nama', 'Hafalan', 'Tajwid', 'Kelancaran', 'Rata Tahfizh']
        } else {
            columns = ['Peringkat', 'NIS', 'Nama']
            mapelList.forEach(m => columns.push(m.kode || m.nama))
            columns.push('Rata Madros', 'Rata Total')
        }

        const info = [
            { label: 'Semester', value: `${currentSem?.nama || '-'} - ${currentSem?.tahun_ajaran || '-'}` }
        ]
        if (mode === 'halaqoh') {
            info.unshift({ label: 'Halaqoh', value: selectedHalaqoh?.nama || '-' })
        } else {
            info.unshift({ label: 'Kelas', value: selectedKelas?.nama || '-' })
        }

        await generateLaporanPDF({
            title: reportTitle,
            subtitle,
            additionalInfo: info,
            columns,
            data: data.map(s => {
                if (mode === 'halaqoh') {
                    return [
                        s.peringkat,
                        s.nis,
                        s.nama,
                        s.hafalan,
                        s.tajwid,
                        s.kelancaran,
                        s.rata_rata_tahfizh
                    ]
                } else {
                    const row = [
                        s.peringkat,
                        s.nis,
                        s.nama
                    ]
                    mapelList.forEach(m => {
                        const item = s.mapelScores ? s.mapelScores[m.id] : null
                        const val = (item && typeof item === 'object') ? (item[nilaiViewMode] ?? '-') : (item || '-')
                        row.push(val)
                    })
                    row.push(s.rata_rata_madrasiyah, s.rata_rata_total_display)
                    return row
                }
            }),
            filename: `Ujian_Semester_${mode}_${currentSem?.nama?.replace(/\s/g, '_') || 'Laporan'}`,
            totalLabel: 'Total Santri',
            totalValue: `${data.length} Santri`,
            printedAt: formatDate(new Date())
        })
    }

    const handleDownloadExcel = () => {
        let columns = []
        if (mode === 'halaqoh') {
            columns = ['Peringkat', 'NIS', 'Nama', 'Hafalan', 'Tajwid', 'Kelancaran', 'Rata Tahfizh']
        } else {
            columns = ['Peringkat', 'NIS', 'Nama']
            mapelList.forEach(m => columns.push(m.kode || m.nama))
            columns.push('Rata Madros', 'Rata Total')
        }

        const exportData = data.map(s => {
            if (mode === 'halaqoh') {
                return {
                    Peringkat: s.peringkat,
                    NIS: s.nis,
                    Nama: s.nama,
                    Hafalan: s.hafalan,
                    Tajwid: s.tajwid,
                    Kelancaran: s.kelancaran,
                    'Rata Tahfizh': s.rata_rata_tahfizh
                }
            } else {
                const row = {
                    Peringkat: s.peringkat,
                    NIS: s.nis,
                    Nama: s.nama
                }
                mapelList.forEach(m => {
                    const item = s.mapelScores ? s.mapelScores[m.id] : null
                    const val = (item && typeof item === 'object') ? (item[nilaiViewMode] ?? '-') : (item || '-')
                    row[m.kode || m.nama] = val
                })
                row['Rata Madros'] = s.rata_rata_madrasiyah
                row['Rata Total'] = s.rata_rata_total_display
                return row
            }
        })
        exportToExcel(exportData, columns, `laporan_ujian_semester_${mode}`)
    }

    const handleDownloadCSV = () => {
        let columns = []
        if (mode === 'halaqoh') {
            columns = ['Peringkat', 'NIS', 'Nama', 'Hafalan', 'Tajwid', 'Kelancaran', 'Rata Tahfizh']
        } else {
            columns = ['Peringkat', 'NIS', 'Nama']
            mapelList.forEach(m => columns.push(m.kode || m.nama))
            columns.push('Rata Madros', 'Rata Total')
        }

        const exportData = data.map(s => {
            if (mode === 'halaqoh') {
                return {
                    Peringkat: s.peringkat,
                    NIS: s.nis,
                    Nama: s.nama,
                    Hafalan: s.hafalan,
                    Tajwid: s.tajwid,
                    Kelancaran: s.kelancaran,
                    'Rata Tahfizh': s.rata_rata_tahfizh
                }
            } else {
                const row = {
                    Peringkat: s.peringkat,
                    NIS: s.nis,
                    Nama: s.nama
                }
                mapelList.forEach(m => {
                    const item = s.mapelScores ? s.mapelScores[m.id] : null
                    const val = (item && typeof item === 'object') ? (item[nilaiViewMode] ?? '-') : (item || '-')
                    row[m.kode || m.nama] = val
                })
                row['Rata Madros'] = s.rata_rata_madrasiyah
                row['Rata Total'] = s.rata_rata_total_display
                return row
            }
        })
        exportToCSV(exportData, columns, `laporan_ujian_semester_${mode}`)
    }

    // Define TanStack Table Columns based on mode
    const columns = useMemo(() => {
        const base = [
            columnHelper.accessor((row, index) => index + 1, {
                id: 'no',
                header: 'No',
                cell: info => info.getValue(),
                size: 50,
            }),
            columnHelper.accessor('peringkat', {
                header: 'Peringkat',
                meta: { backgroundColor: '#fef3c7', fontWeight: 'bold', textAlign: 'center' },
                size: 80,
            }),
            columnHelper.accessor('nis', {
                header: 'NIS',
                size: 100,
            }),
            columnHelper.accessor('nama', {
                header: 'Nama Santri',
                size: 200,
                meta: { fontWeight: '500' }
            })
        ]

        if (mode === 'halaqoh') {
            base.push(
                columnHelper.group({
                    id: 'tahfizhiyah',
                    header: 'Tahfizhiyah (Qur\'aniyah)',
                    meta: { backgroundColor: '#dcfce7', textAlign: 'center' },
                    columns: [
                        columnHelper.accessor('hafalan', { header: 'Hafalan', meta: { textAlign: 'center' }, size: 80 }),
                        columnHelper.accessor('tajwid', { header: 'Tajwid', meta: { textAlign: 'center' }, size: 80 }),
                        columnHelper.accessor('kelancaran', { header: 'Kelancaran', meta: { textAlign: 'center' }, size: 80 }),
                        columnHelper.accessor('rata_rata_tahfizh', { header: 'Rata-rata', meta: { textAlign: 'center', fontWeight: '600', backgroundColor: '#f0fdf4' }, size: 80 }),
                    ],
                })
            )
        } else {
            base.push(
                columnHelper.group({
                    id: 'madrasiyah',
                    header: 'Madrasiyah (Mata Pelajaran)',
                    meta: { backgroundColor: '#dbeafe', textAlign: 'center' },
                    columns: [
                        ...mapelList.map(m => columnHelper.accessor(row => {
                            const item = row.mapelScores ? row.mapelScores[m.id] : null
                            if (!item) return '-'
                            if (typeof item === 'object') {
                                return item[nilaiViewMode] ?? '-'
                            }
                            return item || '-'
                        }, {
                            id: `mapel-${m.id}`,
                            header: m.kode || m.nama,
                            meta: { textAlign: 'center' },
                            size: 80,
                        })),
                        columnHelper.accessor('rata_rata_madrasiyah', {
                            header: 'Rata-rata',
                            meta: { textAlign: 'center', fontWeight: '600', backgroundColor: '#eff6ff' },
                            size: 80
                        }),
                    ],
                })
            )
        }

        base.push(
            columnHelper.accessor('rata_rata_total_display', {
                header: 'Rata Total',
                meta: { backgroundColor: '#fef3c7', fontWeight: '700', textAlign: 'center' },
                size: 100,
            })
        )

        return base
    }, [mode, mapelList, nilaiViewMode])

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <span>Laporan Ujian Semester</span>
                    </h1>
                    <p className="page-subtitle">Laporan hasil Ujian Semester - Qur'aniyah (Halaqoh) & Madrasah (Kelas)</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={generatePDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                        disabled={data.length === 0}
                    />
                    <button
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
                        disabled={data.length === 0}
                        onClick={() => window.print()}
                    >
                        <Printer size={18} className="text-gray-500" />
                        <span>Print</span>
                    </button>
                </div>
            </div>

            {/* RESTRICTED ACCESS WARNING FOR UNASSIGNED TEACHERS */}
            {!isAdmin && halaqoh.length === 0 && kelas.length === 0 && !loading && (
                <div className="alert alert-error mb-4 flex items-center gap-2 bg-amber-50 border-amber-200 text-amber-900 rounded-xl p-3 text-xs">
                    <Lock size={18} className="text-amber-600 flex-shrink-0" />
                    <div>
                        <span className="font-bold">Akses Dibatasi: </span>
                        Akun Anda terhubung sebagai pengajar ({teacherInfo?.nama || 'Guru'}), namun belum ditugaskan sebagai Wali Kelas pada kelas manapun maupun Musyrif pada halaqoh manapun. Hanya Super Admin, Admin Akademik, Wali Kelas, dan Musyrif yang dapat melihat laporan ini.
                    </div>
                </div>
            )}

            {/* DUAL MODE & TIPE NILAI SWITCHER (Halaqoh vs Kelas) */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex bg-gray-200/80 p-1 rounded-xl gap-1 text-xs font-bold w-fit">
                    <button
                        type="button"
                        onClick={() => handleModeChange('halaqoh')}
                        disabled={!isAdmin && halaqoh.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                            mode === 'halaqoh' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        } ${!isAdmin && halaqoh.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={!isAdmin && halaqoh.length === 0 ? 'Hanya Musyrif pengampu halaqoh yang dapat mengakses mode ini' : ''}
                    >
                        {!isAdmin && halaqoh.length === 0 ? <Lock size={14} className="text-gray-400" /> : <BookOpen size={16} />}
                        <span>Qur'aniyah (Halaqoh)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange('kelas')}
                        disabled={!isAdmin && kelas.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                            mode === 'kelas' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        } ${!isAdmin && kelas.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={!isAdmin && kelas.length === 0 ? 'Hanya Wali Kelas pengampu kelas yang dapat mengakses mode ini' : ''}
                    >
                        {!isAdmin && kelas.length === 0 ? <Lock size={14} className="text-gray-400" /> : <GraduationCap size={16} />}
                        <span>Madrasah (Kelas)</span>
                    </button>
                </div>

                {mode === 'kelas' && (
                    <div className="flex items-center gap-1.5 bg-blue-50 p-1 rounded-xl border border-blue-200 text-xs font-semibold">
                        <span className="text-blue-900 font-bold px-2 text-[11px]">Tampilkan Nilai:</span>
                        <button
                            type="button"
                            onClick={() => setNilaiViewMode('raport')}
                            className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold ${
                                nilaiViewMode === 'raport' ? 'bg-blue-700 text-white shadow-xs' : 'bg-white text-blue-900 hover:bg-blue-100'
                            }`}
                        >
                            🏆 Nilai Raport (Hasil Olah)
                        </button>
                        <button
                            type="button"
                            onClick={() => setNilaiViewMode('uas')}
                            className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold ${
                                nilaiViewMode === 'uas' ? 'bg-blue-700 text-white shadow-xs' : 'bg-white text-blue-900 hover:bg-blue-100'
                            }`}
                        >
                            📝 Ujian Semester
                        </button>
                        <button
                            type="button"
                            onClick={() => setNilaiViewMode('harian')}
                            className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold ${
                                nilaiViewMode === 'harian' ? 'bg-blue-700 text-white shadow-xs' : 'bg-white text-blue-900 hover:bg-blue-100'
                            }`}
                        >
                            📖 Nilai Harian
                        </button>
                    </div>
                )}
            </div>

            {/* FILTER SECTION WITH STRICT TEACHER PERMISSION FILTERING */}
            <div className="filter-section">
                <div className="form-group">
                    <label className="form-label">Semester *</label>
                    <select
                        className="form-control"
                        value={filters.semester_id}
                        onChange={e => setFilters({ ...filters, semester_id: e.target.value })}
                    >
                        <option value="">Pilih Semester</option>
                        {semester.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nama} - {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {mode === 'halaqoh' ? (
                    <div className="form-group">
                        <label className="form-label">Halaqoh * {teacherInfo && !isAdmin ? '(Halaqoh Anda)' : ''}</label>
                        <select
                            className="form-control"
                            value={filters.halaqoh_id}
                            onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                        >
                            <option value="">Pilih Halaqoh</option>
                            {halaqoh.map(h => (
                                <option key={h.id} value={h.id}>{h.nama}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="form-group">
                        <label className="form-label">Kelas * {teacherInfo && !isAdmin ? '(Kelas Anda)' : ''}</label>
                        <select
                            className="form-control"
                            value={filters.kelas_id}
                            onChange={e => setFilters({ ...filters, kelas_id: e.target.value })}
                        >
                            <option value="">Pilih Kelas</option>
                            {kelas.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <DataTable
                columns={columns}
                data={data}
                isLoading={loading}
                emptyMessage={`Pilih semester dan ${mode === 'halaqoh' ? 'halaqoh' : 'kelas'} untuk melihat laporan`}
                globalSearchPlaceholder="Cari santri..."
            />
        </div>
    )
}

export default LaporanUjianSemesterPage
