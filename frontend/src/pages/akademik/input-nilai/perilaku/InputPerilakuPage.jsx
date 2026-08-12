import { useState, useEffect } from 'react'
import { Save, RefreshCw, Shield, UserCheck, Lock, AlertCircle, CheckCircle2, BookOpen, GraduationCap, Calendar } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../context/AuthContext'
import ResponsiveTable from '../../../../components/ui/ResponsiveTable'
import { calculateAutoPresensi, getResolvedAttendance } from '../../../../utils/attendanceHelper'
import '../../shared/styles/Nilai.css'

/**
 * Helper Components (Defined Outside InputPerilakuPage to prevent React unmounting/remounting on render)
 */
const BehaviorOptions = ({ value, onChange }) => (
    <select 
        className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer" 
        value={value || ''} 
        onChange={e => onChange(e.target.value)}
    >
        <option value="">Pilih...</option>
        <option value="Sangat Baik">Sangat Baik</option>
        <option value="Baik">Baik</option>
        <option value="Cukup">Cukup</option>
        <option value="Kurang">Kurang</option>
        {!['Sangat Baik', 'Baik', 'Cukup', 'Kurang', ''].includes(value) && value && (
            <option value={value}>{value} (Lama)</option>
        )}
    </select>
)

const PredikatOptions = ({ value, onChange }) => (
    <select 
        className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer" 
        value={value || ''} 
        onChange={e => onChange(e.target.value)}
    >
        <option value="">Pilih...</option>
        <option value="Mumtaz">Mumtaz</option>
        <option value="Jayyid Jiddan">Jayyid Jiddan</option>
        <option value="Jayyid">Jayyid</option>
        <option value="Maqbul">Maqbul</option>
        {!['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', ''].includes(value) && value && (
            <option value={value}>{value} (Lama)</option>
        )}
    </select>
)

const AttendanceInputs = ({ data = {}, onChange }) => {
    const handleNumChange = (field, rawVal) => {
        const numOnly = rawVal.replace(/[^0-9]/g, '')
        onChange(field, numOnly)
    }

    return (
        <div className="grid grid-cols-4 gap-1.5 w-full max-w-[300px] mx-auto">
            <div className="flex flex-col items-center min-w-0">
                <span className="text-[10px] font-black text-blue-700 bg-blue-100 border border-blue-300 rounded-t-lg w-full text-center py-0.5 leading-tight uppercase tracking-wide truncate" title="Sakit">Sakit</span>
                <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full text-sm font-bold text-center text-gray-900 bg-white border border-t-0 border-blue-300 rounded-b-lg py-1 px-1 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none" 
                    placeholder="0"
                    value={data.sakit ?? ''} 
                    onChange={e => handleNumChange('sakit', e.target.value)} 
                />
            </div>
            <div className="flex flex-col items-center min-w-0">
                <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 rounded-t-lg w-full text-center py-0.5 leading-tight uppercase tracking-wide truncate" title="Izin">Izin</span>
                <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full text-sm font-bold text-center text-gray-900 bg-white border border-t-0 border-amber-300 rounded-b-lg py-1 px-1 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none" 
                    placeholder="0"
                    value={data.izin ?? ''} 
                    onChange={e => handleNumChange('izin', e.target.value)} 
                />
            </div>
            <div className="flex flex-col items-center min-w-0">
                <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-300 rounded-t-lg w-full text-center py-0.5 leading-tight uppercase tracking-wide truncate" title="Alpa">Alpa</span>
                <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full text-sm font-bold text-center text-gray-900 bg-white border border-t-0 border-red-300 rounded-b-lg py-1 px-1 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none" 
                    placeholder="0"
                    value={data.alpha ?? ''} 
                    onChange={e => handleNumChange('alpha', e.target.value)} 
                />
            </div>
            <div className="flex flex-col items-center min-w-0">
                <span className="text-[10px] font-black text-purple-700 bg-purple-100 border border-purple-300 rounded-t-lg w-full text-center py-0.5 leading-tight uppercase tracking-wide truncate" title="Pulang">Pulang</span>
                <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full text-sm font-bold text-center text-gray-900 bg-white border border-t-0 border-purple-300 rounded-b-lg py-1 px-1 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none" 
                    placeholder="0"
                    value={data.pulang ?? ''} 
                    onChange={e => handleNumChange('pulang', e.target.value)} 
                />
            </div>
        </div>
    )
}

/**
 * Komponen Input Data Raport (Non-Akademik) Dual Mode
 * Mode Halaqoh: Ketat khusus Musyrif pengampu halaqoh (halaqoh.musyrif_id)
 * Mode Kelas: Ketat khusus Wali Kelas pengampu kelas (kelas.wali_kelas_id)
 */
const InputPerilakuPage = () => {
    const { user, userProfile, isAdmin: checkIsAdmin, isAdminAkademik: checkIsAdminAkademik } = useAuth()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Mode: 'halaqoh' (Musyrif) vs 'kelas' (Wali Kelas)
    const [mode, setMode] = useState('halaqoh')

    const [semester, setSemester] = useState([])
    const [kelasList, setKelasList] = useState([])
    const [halaqohList, setHalaqohList] = useState([])
    const [santri, setSantri] = useState([])
    const [formData, setFormData] = useState({}) // Stores { santriId: { ...perilakuData, ...taujihadData } }

    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    // Access Control States
    const [teacherInfo, setTeacherInfo] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)

    const [filters, setFilters] = useState({
        semester_id: '',
        kelas_id: '',
        halaqoh_id: ''
    })

    useEffect(() => {
        if (user?.id) {
            loadDropdownsAndPermissions()
        }
    }, [user?.id, userProfile?.activeRole])

    const handleModeChange = (newMode) => {
        if (newMode === mode) return
        if (!isAdmin) {
            if (newMode === 'halaqoh' && halaqohList.length === 0) {
                setError('Akses Dibatasi: Anda tidak terdaftar sebagai Musyrif pada halaqoh manapun.')
                return
            }
            if (newMode === 'kelas' && kelasList.length === 0) {
                setError('Akses Dibatasi: Anda tidak terdaftar sebagai Wali Kelas pada kelas manapun.')
                return
            }
        }
        setError('')
        setMode(newMode)
        if (newMode === 'halaqoh') {
            setFilters(prev => ({
                ...prev,
                kelas_id: '',
                halaqoh_id: halaqohList.length > 0 ? halaqohList[0].id : ''
            }))
        } else {
            setFilters(prev => ({
                ...prev,
                halaqoh_id: '',
                kelas_id: kelasList.length > 0 ? kelasList[0].id : ''
            }))
        }
    }

    // 1. Load Dropdowns & Determine Permissions (Strict Wali Kelas / Musyrif Filter)
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

            const [semRes, kelRes, halRes] = await Promise.all([
                supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
                supabase.from('kelas').select('id, nama, wali_kelas_id').order('nama'),
                supabase.from('halaqoh').select('id, nama, musyrif_id').order('nama')
            ])

            const allSemesters = semRes.data || []
            const allKelas = kelRes.data || []
            const allHalaqoh = halRes.data || []

            setSemester(allSemesters)

            let activeSemId = ''
            const activeSem = allSemesters.find(s => s.is_active)
            if (activeSem) activeSemId = activeSem.id

            let activeHalaqohList = allHalaqoh
            let activeKelasList = allKelas
            let targetMode = mode

            if (!adminRole && user) {
                let guruData = null

                if (user.email) {
                    const { data: byEmail } = await supabase
                        .from('guru')
                        .select('id, nama')
                        .eq('email', user.email)
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

                if (guruData) {
                    setTeacherInfo(guruData)

                    const assignedHalaqoh = allHalaqoh.filter(h => h.musyrif_id === guruData.id)
                    const assignedKelas = allKelas.filter(k => k.wali_kelas_id === guruData.id)

                    activeHalaqohList = assignedHalaqoh
                    activeKelasList = assignedKelas

                    if (assignedHalaqoh.length === 0 && assignedKelas.length > 0) {
                        targetMode = 'kelas'
                        setMode('kelas')
                    } else if (assignedKelas.length === 0 && assignedHalaqoh.length > 0) {
                        targetMode = 'halaqoh'
                        setMode('halaqoh')
                    }
                } else {
                    activeHalaqohList = []
                    activeKelasList = []
                }
            }

            setHalaqohList(activeHalaqohList)
            setKelasList(activeKelasList)

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
            setError('Gagal memuat opsi filter: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // 2. Fetch Santri and existing Perilaku / Taujihat Data
    const fetchSantriAndData = async () => {
        if (!filters.semester_id || (!filters.kelas_id && !filters.halaqoh_id)) return

        setLoading(true)
        setError('')

        try {
            // A. Query Santri
            let query = supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('status', 'Aktif')
                .order('nama')

            if (mode === 'kelas' && filters.kelas_id) {
                query = query.eq('kelas_id', filters.kelas_id)
            }
            if (mode === 'halaqoh' && filters.halaqoh_id) {
                query = query.eq('halaqoh_id', filters.halaqoh_id)
            }

            const { data: santriData, error: santriError } = await query

            if (santriError) throw santriError
            setSantri(santriData || [])

            if (santriData && santriData.length > 0) {
                const santriIds = santriData.map(s => s.id)

                // B. Query Perilaku Semester
                const { data: perilakuData } = await supabase
                    .from('perilaku_semester')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .in('santri_id', santriIds)

                // C. Query Taujihat (Catatan Musyrif / Wali Kelas)
                const { data: taujihadData } = await supabase
                    .from('taujihad')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .in('santri_id', santriIds)

                // D. Query Presensi Log filtered by Semester Date Range & Attendance Type (Halaqoh vs Madrasah)
                const activeSem = semester.find(s => s.id === filters.semester_id)
                let presensiQuery = supabase
                    .from('presensi')
                    .select('santri_id, status, keterangan, tanggal')
                    .in('santri_id', santriIds)

                if (activeSem?.tanggal_mulai && activeSem?.tanggal_selesai) {
                    presensiQuery = presensiQuery
                        .gte('tanggal', activeSem.tanggal_mulai)
                        .lte('tanggal', activeSem.tanggal_selesai)
                }

                const { data: rawPresensi, error: presensiErr } = await presensiQuery
                if (presensiErr) {
                    console.warn('Gagal memuat log presensi:', presensiErr)
                }

                // Aggregate absence counts per santri from presensi logs using attendanceHelper
                const autoCounts = calculateAutoPresensi(rawPresensi, santriIds)

                // E. Merge Data
                const mergedData = {}
                santriData.forEach(s => {
                    const p = perilakuData?.find(x => x.santri_id === s.id)
                    const t = taujihadData?.find(x => x.santri_id === s.id)
                    const autoObj = autoCounts[s.id] || { madrosah: {}, quraniyah: {} }
                    const resolved = getResolvedAttendance(p, autoObj)

                    const catatanMusyrif = t?.catatan || t?.isi || ''
                    const catatanWali = p?.catatan_wali || t?.catatan_wali || ''

                    if (mode === 'halaqoh') {
                        const qRes = resolved.quraniyah
                        mergedData[s.id] = {
                            perilaku_id: p?.id,
                            taujihad_id: t?.id,

                            ketekunan: p?.ketekunan || 'Sangat Baik',
                            kedisiplinan: p?.kedisiplinan || 'Sangat Baik',
                            kebersihan: p?.kebersihan || 'Sangat Baik',
                            kerapian: p?.kerapian || 'Sangat Baik',

                            jumlah_hafalan: p?.jumlah_hafalan || '',
                            predikat_hafalan: p?.predikat_hafalan || 'Baik',
                            total_hafalan: p?.total_hafalan || '',

                            sakit: qRes.sakit > 0 ? qRes.sakit : '',
                            izin: qRes.izin > 0 ? qRes.izin : '',
                            alpha: qRes.alpha > 0 ? qRes.alpha : '',
                            pulang: qRes.pulang > 0 ? qRes.pulang : '',

                            auto_sakit: autoObj.quraniyah.sakit,
                            auto_izin: autoObj.quraniyah.izin,
                            auto_alpha: autoObj.quraniyah.alpha,
                            auto_pulang: autoObj.quraniyah.pulang,

                            catatan_musyrif: catatanMusyrif,
                            catatan_wali: catatanWali,
                            catatan: catatanMusyrif
                        }
                    } else {
                        const mRes = resolved.madrosah
                        mergedData[s.id] = {
                            perilaku_id: p?.id,
                            taujihad_id: t?.id,

                            ketekunan: p?.ketekunan_kelas || 'Sangat Baik',
                            kedisiplinan: p?.kedisiplinan_kelas || 'Sangat Baik',
                            kebersihan: p?.kebersihan_kelas || 'Sangat Baik',
                            kerapian: p?.kerapian_kelas || 'Sangat Baik',

                            jumlah_hafalan: p?.jumlah_hafalan || '',
                            predikat_hafalan: p?.predikat_hafalan || 'Baik',
                            total_hafalan: p?.total_hafalan || '',

                            sakit: mRes.sakit > 0 ? mRes.sakit : '',
                            izin: mRes.izin > 0 ? mRes.izin : '',
                            alpha: mRes.alpha > 0 ? mRes.alpha : '',
                            pulang: mRes.pulang > 0 ? mRes.pulang : '',

                            auto_sakit: autoObj.madrosah.sakit,
                            auto_izin: autoObj.madrosah.izin,
                            auto_alpha: autoObj.madrosah.alpha,
                            auto_pulang: autoObj.madrosah.pulang,

                            catatan_musyrif: catatanMusyrif,
                            catatan_wali: catatanWali,
                            catatan: catatanWali
                        }
                    }
                })
                setFormData(mergedData)
            } else {
                setFormData({})
            }
        } catch (err) {
            setError('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // 2.1 Handle Manual Sync Action from Presensi Logs
    const handleSyncPresensi = () => {
        setFormData(prev => {
            const updated = { ...prev }
            let count = 0
            Object.keys(updated).forEach(sId => {
                const item = updated[sId]
                if (item) {
                    updated[sId] = {
                        ...item,
                        sakit: item.auto_sakit > 0 ? item.auto_sakit : '',
                        izin: item.auto_izin > 0 ? item.auto_izin : '',
                        alpha: item.auto_alpha > 0 ? item.auto_alpha : '',
                        pulang: item.auto_pulang > 0 ? item.auto_pulang : ''
                    }
                    count++
                }
            })
            setSuccess(`✅ Data ketidakhadiran berhasil disinkronkan otomatis dari presensi ${mode === 'halaqoh' ? 'Halaqoh' : 'Madrasah'} (${count} santri)!`)
            setTimeout(() => setSuccess(''), 4000)
            return updated
        })
    }

    useEffect(() => {
        if (filters.semester_id && (filters.kelas_id || filters.halaqoh_id)) {
            fetchSantriAndData()
        }
    }, [filters.kelas_id, filters.semester_id, filters.halaqoh_id, mode])

    // 3. Handle Input Field Changes
    const handleInputChange = (santriId, field, value) => {
        setFormData(prev => {
            const prevItem = prev[santriId] || {}
            let updated = { ...prevItem, [field]: value }
            if (field === 'catatan') {
                if (mode === 'halaqoh') {
                    updated.catatan_musyrif = value
                } else {
                    updated.catatan_wali = value
                }
            }
            return {
                ...prev,
                [santriId]: updated
            }
        })
    }

    // 4. Save All Data (Perilaku & Taujihat)
    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const perilakuUpserts = []
            const taujihadUpserts = []

            for (const [santriId, data] of Object.entries(formData)) {
                if (mode === 'halaqoh') {
                    perilakuUpserts.push({
                        id: data.perilaku_id || crypto.randomUUID(),
                        santri_id: santriId,
                        semester_id: filters.semester_id,
                        ketekunan: data.ketekunan,
                        kedisiplinan: data.kedisiplinan,
                        kebersihan: data.kebersihan,
                        kerapian: data.kerapian,
                        jumlah_hafalan: data.jumlah_hafalan,
                        predikat_hafalan: data.predikat_hafalan,
                        total_hafalan: data.total_hafalan,
                        sakit: parseInt(data.sakit) || 0,
                        izin: parseInt(data.izin) || 0,
                        alpha: parseInt(data.alpha) || 0,
                        pulang: parseInt(data.pulang) || 0
                    })
                } else {
                    perilakuUpserts.push({
                        id: data.perilaku_id || crypto.randomUUID(),
                        santri_id: santriId,
                        semester_id: filters.semester_id,
                        ketekunan_kelas: data.ketekunan,
                        kedisiplinan_kelas: data.kedisiplinan,
                        kebersihan_kelas: data.kebersihan,
                        kerapian_kelas: data.kerapian,
                        sakit_kelas: parseInt(data.sakit) || 0,
                        izin_kelas: parseInt(data.izin) || 0,
                        alpha_kelas: parseInt(data.alpha) || 0,
                        pulang_kelas: parseInt(data.pulang) || 0,
                        catatan_wali: data.catatan
                    })
                }

                const catatanMusyrifSave = mode === 'halaqoh' ? (data.catatan_musyrif || data.catatan) : data.catatan_musyrif
                const catatanWaliSave = mode === 'kelas' ? (data.catatan_wali || data.catatan) : data.catatan_wali

                if (catatanMusyrifSave || catatanWaliSave) {
                    taujihadUpserts.push({
                        id: data.taujihad_id || crypto.randomUUID(),
                        santri_id: santriId,
                        semester_id: filters.semester_id,
                        catatan: catatanMusyrifSave || '',
                        catatan_wali: catatanWaliSave || ''
                    })
                }
            }

            if (perilakuUpserts.length > 0) {
                const { error: pErr } = await supabase
                    .from('perilaku_semester')
                    .upsert(perilakuUpserts, {
                        onConflict: 'santri_id, semester_id',
                        ignoreDuplicates: false
                    })

                if (pErr) {
                    if (pErr.message?.includes('_kelas') || pErr.message?.includes('catatan_wali') || pErr.code === 'PGRST204') {
                        throw new Error("Kolom data Kelas ('_kelas') belum ada di tabel 'perilaku_semester' Supabase. Mohon jalankan SQL query di Supabase SQL Editor terlebih dahulu.")
                    }
                    throw pErr
                }
            }

            if (taujihadUpserts.length > 0) {
                const { error: tErr } = await supabase
                    .from('taujihad')
                    .upsert(taujihadUpserts, {
                        onConflict: 'santri_id, semester_id',
                        ignoreDuplicates: false
                    })

                if (tErr) {
                    // Fallback if catatan_wali column does not exist on taujihad table
                    if (tErr.message?.includes('catatan_wali') || tErr.code === 'PGRST204') {
                        const fallbackTaujihad = taujihadUpserts.map(({ catatan_wali, ...rest }) => rest)
                        const { error: fallbackTErr } = await supabase
                            .from('taujihad')
                            .upsert(fallbackTaujihad, {
                                onConflict: 'santri_id, semester_id',
                                ignoreDuplicates: false
                            })
                        if (fallbackTErr) throw fallbackTErr
                    } else {
                        throw tErr
                    }
                }
            }

            setSuccess('✅ Data Rapor Non-Akademik berhasil disimpan!')
            setTimeout(() => setSuccess(''), 3000)
            fetchSantriAndData()
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="nilai-page">
            {/* PAGE HEADER */}
            <div className="page-header flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <span>Input Data Raport (Non-Akademik)</span>
                    </h1>
                    <p className="page-subtitle">Perilaku, Tahfizh Summary, & Catatan Musyrif / Wali Kelas</p>
                </div>

                {/* ACCESS BADGE */}
                <div>
                    {isAdmin ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold shadow-xs">
                            <Shield size={16} className="text-purple-600" />
                            <span>Akses Penuh (Admin)</span>
                        </div>
                    ) : teacherInfo ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-xs">
                            <UserCheck size={16} className="text-emerald-600" />
                            <span>{mode === 'halaqoh' ? 'Musyrif' : 'Wali Kelas'}: {teacherInfo.nama}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold">
                            <UserCheck size={16} className="text-gray-500" />
                            <span>Akses Pengajar</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ALERTS */}
            {error && (
                <div className="alert alert-error mb-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="alert alert-success mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}

            {/* RESTRICTED ACCESS WARNING FOR NON-TEACHER / UNASSIGNED */}
            {!isAdmin && halaqohList.length === 0 && kelasList.length === 0 && !loading && (
                <div className="alert alert-error mb-4 flex items-center gap-2 bg-amber-50 border-amber-200 text-amber-900 rounded-xl p-3 text-xs">
                    <Lock size={18} className="text-amber-600 flex-shrink-0" />
                    <div>
                        <span className="font-bold">Akses Dibatasi: </span>
                        Akun Anda terhubung sebagai pengajar ({teacherInfo?.nama || 'Guru'}), namun belum ditugaskan sebagai Wali Kelas pada kelas manapun maupun Musyrif pada halaqoh manapun. Hanya Super Admin, Admin Akademik, Wali Kelas, dan Musyrif yang dapat mengakses data ini.
                    </div>
                </div>
            )}

            {/* DUAL MODE SWITCHER */}
            <div className="flex bg-gray-200/80 p-1 rounded-xl gap-1 text-xs font-bold mb-4 w-fit">
                <button
                    type="button"
                    onClick={() => handleModeChange('halaqoh')}
                    disabled={!isAdmin && halaqohList.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        mode === 'halaqoh' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    } ${!isAdmin && halaqohList.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!isAdmin && halaqohList.length === 0 ? 'Hanya Musyrif pengampu halaqoh yang dapat mengakses mode ini' : ''}
                >
                    {!isAdmin && halaqohList.length === 0 ? <Lock size={14} className="text-gray-400" /> : <BookOpen size={16} />}
                    <span>Perilaku & Catatan Halaqoh (Musyrif)</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleModeChange('kelas')}
                    disabled={!isAdmin && kelasList.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        mode === 'kelas' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    } ${!isAdmin && kelasList.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={!isAdmin && kelasList.length === 0 ? 'Hanya Wali Kelas pengampu kelas yang dapat mengakses mode ini' : ''}
                >
                    {!isAdmin && kelasList.length === 0 ? <Lock size={14} className="text-gray-400" /> : <GraduationCap size={16} />}
                    <span>Perilaku & Catatan Kelas (Wali Kelas)</span>
                </button>
            </div>

            {/* FILTERS SECTION */}
            <div className="filter-section">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
                            <label className="form-label">
                                Halaqoh * {!isAdmin && <span className="text-[10px] text-emerald-700 font-semibold">(Binaan Anda)</span>}
                            </label>
                            <select
                                className="form-control"
                                value={filters.halaqoh_id}
                                onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                                disabled={!isAdmin && halaqohList.length === 0}
                            >
                                <option value="">Pilih Halaqoh</option>
                                {halaqohList.map(h => (
                                    <option key={h.id} value={h.id}>{h.nama}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">
                                Kelas * {!isAdmin && <span className="text-[10px] text-blue-700 font-semibold">(Wali Kelas Anda)</span>}
                            </label>
                            <select
                                className="form-control"
                                value={filters.kelas_id}
                                onChange={e => setFilters({ ...filters, kelas_id: e.target.value })}
                                disabled={!isAdmin && kelasList.length === 0}
                            >
                                <option value="">Pilih Kelas</option>
                                {kelasList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* TABLE / EMPTY ACCESS SECTION */}
            {(filters.kelas_id || filters.halaqoh_id) && filters.semester_id ? (
                <div className="table-container">
                    {/* SEMESTER DATE RANGE BADGE */}
                    {(() => {
                        const activeSemObj = semester.find(s => s.id === filters.semester_id)
                        if (!activeSemObj) return null
                        const formatDate = (dt) => dt ? new Date(dt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
                        return (
                            <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2 bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold mb-3 shadow-xs">
                                <div className="flex items-center gap-2">
                                    <Calendar size={15} className="text-emerald-700 flex-shrink-0" />
                                    <span>
                                        Periode Semester {activeSemObj.nama} ({activeSemObj.tahun_ajaran}): <strong>{formatDate(activeSemObj.tanggal_mulai)}</strong> s/d <strong>{formatDate(activeSemObj.tanggal_selesai)}</strong>
                                        {' '}<span className="text-emerald-700 font-normal">({mode === 'halaqoh' ? 'Kehadiran Halaqoh / Qur\'aniyah' : 'Kehadiran Madrasah'})</span>
                                    </span>
                                </div>
                                <span className="text-[11px] text-emerald-800 bg-white/90 px-2 py-0.5 rounded border border-emerald-200/80 font-medium">
                                    ⚡ Auto-Calculate Log Presensi
                                </span>
                            </div>
                        )
                    })()}

                    <div className="table-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                        <h3 className="table-title">Daftar Santri ({santri.length})</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                className="btn btn-outline text-xs flex items-center gap-1.5 bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition-all"
                                onClick={handleSyncPresensi}
                                disabled={loading || santri.length === 0}
                                title="Hitung ulang otomatis dari data log presensi harian sesuai periode tanggal semester"
                            >
                                <RefreshCw size={14} /> Hitung Otomatis Presensi
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving || santri.length === 0}
                            >
                                {saving ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Data</>}
                            </button>
                        </div>
                    </div>

                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-12 text-center min-w-[48px]' },
                            { header: 'Nama Santri', accessor: 'nama', className: 'min-w-[190px] font-medium text-gray-900', hideOnMobile: true },

                            { header: 'Ketekunan', className: 'min-w-[150px]', render: (row) => <BehaviorOptions value={formData[row.id]?.ketekunan} onChange={v => handleInputChange(row.id, 'ketekunan', v)} /> },
                            { header: 'Kedisiplinan', className: 'min-w-[150px]', render: (row) => <BehaviorOptions value={formData[row.id]?.kedisiplinan} onChange={v => handleInputChange(row.id, 'kedisiplinan', v)} /> },
                            { header: 'Kebersihan', className: 'min-w-[150px]', render: (row) => <BehaviorOptions value={formData[row.id]?.kebersihan} onChange={v => handleInputChange(row.id, 'kebersihan', v)} /> },
                            { header: 'Kerapian', className: 'min-w-[150px]', render: (row) => <BehaviorOptions value={formData[row.id]?.kerapian} onChange={v => handleInputChange(row.id, 'kerapian', v)} /> },

                            ...(mode === 'halaqoh' ? [
                                { header: 'Hafalan (Juz)', className: 'min-w-[160px] border-l border-gray-200/60', render: (row) => <input type="text" className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none" placeholder="Contoh: 1 Juz" value={formData[row.id]?.jumlah_hafalan || ''} onChange={e => handleInputChange(row.id, 'jumlah_hafalan', e.target.value)} /> },
                                { header: 'Predikat', className: 'min-w-[150px]', render: (row) => <PredikatOptions value={formData[row.id]?.predikat_hafalan} onChange={v => handleInputChange(row.id, 'predikat_hafalan', v)} /> },
                                { header: 'Total Hafalan', className: 'min-w-[160px]', render: (row) => <input type="text" className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none" placeholder="Contoh: 3 Juz" value={formData[row.id]?.total_hafalan || ''} onChange={e => handleInputChange(row.id, 'total_hafalan', e.target.value)} /> },
                            ] : []),
                            {
                                header: 'Ketidakhadiran (S/I/A/P)', 
                                className: 'min-w-[320px] border-l border-gray-200/60 text-center', 
                                cellClassName: 'px-2 py-4',
                                render: (row) => (
                                    <AttendanceInputs 
                                        data={formData[row.id]} 
                                        onChange={(field, val) => handleInputChange(row.id, field, val)} 
                                    />
                                )
                            },

                            { header: mode === 'halaqoh' ? 'Catatan Musyrif (Taujihat)' : 'Catatan Wali Kelas', className: 'min-w-[250px] border-l border-gray-200/60', render: (row) => <textarea className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg p-2 min-h-[50px] focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none" placeholder="Catatan untuk santri..." value={formData[row.id]?.catatan || ''} onChange={e => handleInputChange(row.id, 'catatan', e.target.value)} /> }
                        ]}
                        data={santri}
                        loading={loading}
                        emptyState={<div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Tidak ada santri di kelas/halaqoh ini</div>}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={(row) => {
                            const d = formData[row.id] || {}
                            return (
                                <div className="flex flex-col gap-4 w-full mt-2 pt-2 border-t border-gray-100">
                                    {/* Perilaku */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Perilaku</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Ketekunan</label>
                                                <BehaviorOptions value={d.ketekunan} onChange={v => handleInputChange(row.id, 'ketekunan', v)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Kedisiplinan</label>
                                                <BehaviorOptions value={d.kedisiplinan} onChange={v => handleInputChange(row.id, 'kedisiplinan', v)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Kebersihan</label>
                                                <BehaviorOptions value={d.kebersihan} onChange={v => handleInputChange(row.id, 'kebersihan', v)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Kerapian</label>
                                                <BehaviorOptions value={d.kerapian} onChange={v => handleInputChange(row.id, 'kerapian', v)} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Tahfizh Summary (Hanya Mode Halaqoh) */}
                                    {mode === 'halaqoh' && (
                                        <div className="border-t border-gray-50 pt-3">
                                            <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Tahfizh Summary</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="col-span-2">
                                                    <label className="text-[10px] text-gray-500 mb-1 block">Hafalan (Juz)</label>
                                                    <input type="text" className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none" placeholder="Contoh: 1 Juz" value={d.jumlah_hafalan || ''} onChange={e => handleInputChange(row.id, 'jumlah_hafalan', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 mb-1 block">Predikat</label>
                                                    <PredikatOptions value={d.predikat_hafalan} onChange={v => handleInputChange(row.id, 'predikat_hafalan', v)} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 mb-1 block">Total Hafalan</label>
                                                    <input type="text" className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none" placeholder="Contoh: 3 Juz" value={d.total_hafalan || ''} onChange={e => handleInputChange(row.id, 'total_hafalan', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Presensi */}
                                    <div className="border-t border-gray-50 pt-3">
                                        <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Ketidakhadiran (S/I/A/P)</h4>
                                        <AttendanceInputs 
                                            data={d} 
                                            onChange={(field, val) => handleInputChange(row.id, field, val)} 
                                        />
                                    </div>
                                    {/* Taujihat */}
                                    <div className="border-t border-gray-50 pt-3">
                                        <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Catatan Musyrif / Wali Kelas</h4>
                                        <textarea className="form-control text-sm min-h-[80px]" placeholder="Catatan untuk santri..." value={d.catatan || ''} onChange={e => handleInputChange(row.id, 'catatan', e.target.value)} />
                                    </div>
                                </div>
                            )
                        }}
                    />
                </div>
            ) : (
                <div className="p-8 text-center bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 mt-4">
                    {!isAdmin && (mode === 'halaqoh' ? halaqohList.length === 0 : kelasList.length === 0) ? (
                        <div className="flex flex-col items-center gap-2">
                            <Lock size={28} className="text-amber-600 mb-1" />
                            <h4 className="font-bold text-sm">
                                🔒 Akses Terbatas {mode === 'halaqoh' ? 'Musyrif' : 'Wali Kelas'}
                            </h4>
                            <p className="text-xs text-amber-800 max-w-md">
                                Akun <strong>{teacherInfo?.nama || user?.email}</strong> belum ditugaskan sebagai {mode === 'halaqoh' ? 'Musyrif pengampu di halaqoh' : 'Wali Kelas di kelas'} mana pun.
                            </p>
                        </div>
                    ) : (
                        `Silakan pilih ${mode === 'halaqoh' ? 'Halaqoh' : 'Kelas'} untuk memulai`
                    )}
                </div>
            )}
        </div>
    )
}

export default InputPerilakuPage
