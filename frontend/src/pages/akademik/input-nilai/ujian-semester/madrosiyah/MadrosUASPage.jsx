import { useState, useEffect } from 'react'
import { Save, RefreshCw, Info, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, UserCheck, Shield, Lock } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../context/AuthContext'
import ResponsiveTable from '../../../../../components/ui/ResponsiveTable'
import { calculateSidogiriGrade } from '../../../../../components/akademik/RaportMadrasahTemplate'
import '../../../shared/styles/Nilai.css'

/**
 * Komponen Input Nilai Madrasah V2 (Hak Akses Penugasan Guru & MMU Sidogiri)
 * Robust fallback lookup via Email & User ID
 */
const MadrosUASPage = () => {
    const { user, userProfile, isAdmin: checkIsAdmin, isAdminAkademik: checkIsAdminAkademik } = useAuth()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showPetunjuk, setShowPetunjuk] = useState(false)

    // Data Master
    const [semester, setSemester] = useState([])
    const [kelas, setKelas] = useState([])
    const [mapel, setMapel] = useState([])
    const [santri, setSantri] = useState([])

    // Teacher Access & Identity
    const [teacherInfo, setTeacherInfo] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [allowedClasses, setAllowedClasses] = useState([])
    const [teacherAssignments, setTeacherAssignments] = useState([])

    // Filters
    const [filters, setFilters] = useState({
        semester_id: '',
        kelas_id: '',
        mapel_id: ''
    })

    // Feedback State
    const [successMessage, setSuccessMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    // Flat Input State Map: { [santri_id]: { id, nilai_harian, nilai_uas } }
    const [inputMap, setInputMap] = useState({})

    useEffect(() => {
        loadDropdownOptionsAndPermissions()
    }, [user, userProfile])

    // 1. Load Dropdowns & Determine Teacher Access Permissions
    const loadDropdownOptionsAndPermissions = async () => {
        try {
            setLoading(true)
            const adminRole = (checkIsAdmin && checkIsAdmin()) || 
                (checkIsAdminAkademik && checkIsAdminAkademik()) ||
                ['admin', 'admin_akademik'].includes(userProfile?.activeRole) || 
                ['admin', 'admin_akademik'].includes(userProfile?.role) ||
                userProfile?.roles?.includes('admin') ||
                userProfile?.roles?.includes('admin_akademik')

            setIsAdmin(Boolean(adminRole))

            // A. Load Active Semesters, All Classes, and All Madrosiyah Subjects
            const [semRes, kelRes, mapRes] = await Promise.all([
                supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
                supabase.from('kelas').select('id, nama').order('nama'),
                supabase.from('mapel').select('id, nama, kategori').in('kategori', ['Madrosiyah', 'Madrasiyah']).order('nama')
            ])

            const allSemesters = semRes.data || []
            const allKelas = kelRes.data || []
            const allMapel = mapRes.data || []

            setSemester(allSemesters)

            let activeSemId = ''
            const activeSem = allSemesters.find(s => s.is_active)
            if (activeSem) activeSemId = activeSem.id

            // B. If User is GURU/MUSYRIF (Not Admin), fetch schedule assignments
            if (!adminRole && user) {
                let guruData = null

                // Search by email
                if (user.email) {
                    const { data: byEmail } = await supabase
                        .from('guru')
                        .select('id, nama')
                        .eq('email', user.email)
                        .maybeSingle()
                    guruData = byEmail
                }

                // Fallback search by user_id
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

                    // Fetch teaching assignments from jadwal_pelajaran
                    const { data: jadwalData } = await supabase
                        .from('jadwal_pelajaran')
                        .select('kelas_id, mapel_id')
                        .eq('guru_id', guruData.id)

                    const assignments = jadwalData || []
                    setTeacherAssignments(assignments)

                    if (assignments.length > 0) {
                        // Filter allowed classes for teacher
                        const allowedKelasIds = [...new Set(assignments.map(a => a.kelas_id))]
                        const filteredKelas = allKelas.filter(k => allowedKelasIds.includes(k.id))
                        setKelas(filteredKelas)

                        let initialKelasId = filteredKelas.length > 0 ? filteredKelas[0].id : ''

                        // Filter mapels for initial selected class
                        const allowedMapelIdsForClass = [...new Set(assignments.filter(a => a.kelas_id === initialKelasId).map(a => a.mapel_id))]
                        const filteredMapel = allMapel.filter(m => allowedMapelIdsForClass.includes(m.id))
                        setMapel(filteredMapel)

                        let initialMapelId = filteredMapel.length > 0 ? filteredMapel[0].id : ''

                        setFilters({
                            semester_id: activeSemId,
                            kelas_id: initialKelasId,
                            mapel_id: initialMapelId
                        })
                    } else {
                        // If guru has no schedule assigned yet, allow viewing all classes with info badge
                        setKelas(allKelas)
                        setMapel(allMapel)
                        setFilters({
                            semester_id: activeSemId,
                            kelas_id: allKelas.length > 0 ? allKelas[0].id : '',
                            mapel_id: allMapel.length > 0 ? allMapel[0].id : ''
                        })
                    }
                } else {
                    // Fallback if guru record is not linked to account
                    setKelas(allKelas)
                    setMapel(allMapel)
                    setFilters({
                        semester_id: activeSemId,
                        kelas_id: allKelas.length > 0 ? allKelas[0].id : '',
                        mapel_id: allMapel.length > 0 ? allMapel[0].id : ''
                    })
                }
            } else {
                // Admin has full access
                setKelas(allKelas)
                setMapel(allMapel)
                setFilters({
                    semester_id: activeSemId,
                    kelas_id: allKelas.length > 0 ? allKelas[0].id : '',
                    mapel_id: allMapel.length > 0 ? allMapel[0].id : ''
                })
            }
        } catch (err) {
            console.error('Permission load error:', err)
            setErrorMessage('Gagal memuat opsi filter: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // 2. Dynamic Mapel Filter when Class changes (for Teachers with Schedule)
    const handleKelasChange = async (selectedKelasId) => {
        setFilters(prev => ({ ...prev, kelas_id: selectedKelasId, mapel_id: '' }))

        if (!isAdmin && teacherAssignments.length > 0) {
            const [mapRes] = await Promise.all([
                supabase.from('mapel').select('id, nama, kategori').in('kategori', ['Madrosiyah', 'Madrasiyah']).order('nama')
            ])
            const allMapel = mapRes.data || []

            const allowedMapelIdsForClass = [...new Set(teacherAssignments.filter(a => a.kelas_id === selectedKelasId).map(a => a.mapel_id))]
            const filteredMapel = allMapel.filter(m => allowedMapelIdsForClass.includes(m.id))
            setMapel(filteredMapel)

            if (filteredMapel.length > 0) {
                setFilters(prev => ({ ...prev, mapel_id: filteredMapel[0].id }))
            }
        }
    }

    // 3. Fetch Santri & Existing Grades from Supabase
    const fetchSantriAndGrades = async () => {
        if (!filters.kelas_id || !filters.mapel_id || !filters.semester_id) return

        setLoading(true)
        setErrorMessage('')
        setSuccessMessage('')

        try {
            // A. Fetch Santri list
            const { data: santriData, error: santriErr } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('kelas_id', filters.kelas_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriErr) throw santriErr
            const listSantri = santriData || []
            setSantri(listSantri)

            if (listSantri.length === 0) {
                setInputMap({})
                setLoading(false)
                return
            }

            const santriIds = listSantri.map(s => s.id)

            // B. Fetch all grade records for these santris, semester, and mapel
            const { data: gradesData, error: gradesErr } = await supabase
                .from('nilai')
                .select('*')
                .eq('semester_id', filters.semester_id)
                .eq('mapel_id', filters.mapel_id)
                .in('santri_id', santriIds)
                .order('created_at', { ascending: true })

            if (gradesErr) throw gradesErr

            // C. Build initial input map
            const newMap = {}
            listSantri.forEach(s => {
                newMap[s.id] = {
                    harian: '',
                    uas: '',
                    catatan: ''
                }
            })

            gradesData?.forEach(row => {
                if (!newMap[row.santri_id]) return

                const rawVal = row.nilai_akhir ?? row.nilai
                const strVal = (rawVal !== null && rawVal !== undefined) ? String(rawVal) : ''

                if (row.jenis_ujian === 'harian') {
                    if (strVal !== '') {
                        newMap[row.santri_id].harian = strVal
                    }
                    if (row.catatan && !newMap[row.santri_id].catatan) {
                        newMap[row.santri_id].catatan = row.catatan
                    }
                } else {
                    // Non-harian (uas, semester, etc)
                    if (strVal !== '') {
                        newMap[row.santri_id].uas = strVal
                    }
                    if (row.catatan) {
                        newMap[row.santri_id].catatan = row.catatan
                    }
                }
            })

            setInputMap(newMap)
        } catch (err) {
            console.error('Fetch error:', err)
            setErrorMessage('Gagal memuat data santri/nilai: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSantriAndGrades()
    }, [filters.kelas_id, filters.mapel_id, filters.semester_id])

    // 4. Handle Input Change locally
    const handleFieldChange = (santriId, field, value) => {
        let cleanValue = value
        if (field !== 'catatan' && value !== '') {
            const num = parseFloat(value)
            cleanValue = isNaN(num) ? '' : String(Math.min(100, Math.max(0, num)))
        }

        setInputMap(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [field]: cleanValue
            }
        }))
    }

    const selectedSemObj = semester.find(s => String(s.id) === String(filters.semester_id))
    const isSemesterActive = Boolean(selectedSemObj ? selectedSemObj.is_active : true)

    // 5. Save All Grades
    const handleSaveAll = async () => {
        if (santri.length === 0) return
        if (!isSemesterActive) {
            setErrorMessage('Gagal menyimpan: Semester ini sudah tidak aktif (Read-Only).')
            return
        }

        setSaving(true)
        setErrorMessage('')
        setSuccessMessage('')

        let countSaved = 0

        try {
            for (const s of santri) {
                const data = inputMap[s.id]
                if (!data) continue

                const harianNum = (data.harian !== '' && data.harian !== null && data.harian !== undefined) ? parseFloat(data.harian) : null
                const uasNum = (data.uas !== '' && data.uas !== null && data.uas !== undefined) ? parseFloat(data.uas) : null

                const { data: existingRows } = await supabase
                    .from('nilai')
                    .select('id, jenis_ujian')
                    .eq('santri_id', s.id)
                    .eq('semester_id', filters.semester_id)
                    .eq('mapel_id', filters.mapel_id)

                const harianRow = existingRows?.find(r => r.jenis_ujian === 'harian')
                const examRow = existingRows?.find(r => r.jenis_ujian !== 'harian')

                // A. Save Nilai Harian if filled, or Delete if cleared
                if (harianNum !== null) {
                    const payloadH = {
                        santri_id: s.id,
                        semester_id: filters.semester_id,
                        mapel_id: filters.mapel_id,
                        jenis_ujian: 'harian',
                        kategori: 'Madrosiyah',
                        nilai_akhir: harianNum,
                        catatan: data.catatan || ''
                    }

                    if (harianRow) {
                        const { error: errUp } = await supabase.from('nilai').update(payloadH).eq('id', harianRow.id)
                        if (errUp) throw errUp
                    } else {
                        const { error: errIn } = await supabase.from('nilai').insert([payloadH])
                        if (errIn) throw errIn
                    }
                    countSaved++
                } else if (harianRow) {
                    const { error: errDel } = await supabase.from('nilai').delete().eq('id', harianRow.id)
                    if (errDel) throw errDel
                    countSaved++
                }

                // B. Save Nilai Ujian (UAS / IMDA) if filled, or Delete if cleared
                if (uasNum !== null) {
                    const payloadE = {
                        santri_id: s.id,
                        semester_id: filters.semester_id,
                        mapel_id: filters.mapel_id,
                        jenis_ujian: 'uas',
                        kategori: 'Madrosiyah',
                        nilai_akhir: uasNum,
                        catatan: data.catatan || ''
                    }

                    if (examRow) {
                        const { error: errUp } = await supabase.from('nilai').update(payloadE).eq('id', examRow.id)
                        if (errUp) throw errUp
                    } else {
                        try {
                            const { error: errIn } = await supabase.from('nilai').insert([payloadE])
                            if (errIn) {
                                if (errIn.message?.includes('unique constraint') || errIn.code === '23505') {
                                    const fallbackId = harianRow ? harianRow.id : (existingRows && existingRows[0] ? existingRows[0].id : null)
                                    if (fallbackId) {
                                        await supabase.from('nilai').update({
                                            ...payloadE,
                                            jenis_ujian: 'uas',
                                            nilai_akhir: uasNum
                                        }).eq('id', fallbackId)
                                    }
                                } else {
                                    throw errIn
                                }
                            }
                        } catch (inErr) {
                            if (inErr.message?.includes('unique constraint') || inErr.code === '23505') {
                                const fallbackId = harianRow ? harianRow.id : (existingRows && existingRows[0] ? existingRows[0].id : null)
                                if (fallbackId) {
                                    await supabase.from('nilai').update({
                                        ...payloadE,
                                        jenis_ujian: 'uas',
                                        nilai_akhir: uasNum
                                    }).eq('id', fallbackId)
                                }
                            } else {
                                throw inErr
                            }
                        }
                    }
                    countSaved++
                } else if (examRow) {
                    const { error: errDel } = await supabase.from('nilai').delete().eq('id', examRow.id)
                    if (errDel) throw errDel
                    countSaved++
                }
            }

            setSuccessMessage(`✅ Berhasil menyimpan ${countSaved} data Nilai Madrasah!`)
            setTimeout(() => setSuccessMessage(''), 4000)
            await fetchSantriAndGrades()
        } catch (err) {
            console.error('Save Error:', err)
            setErrorMessage('Gagal menyimpan nilai: ' + (err.message || 'Error tidak diketahui'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="nilai-page">
            {/* PAGE HEADER */}
            <div className="page-header flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between mb-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h1 className="page-title text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
                            Input Nilai Madrasah
                        </h1>
                        <span className="text-[10px] sm:text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full uppercase tracking-wider">
                            MMU Sidogiri
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <p className="page-subtitle text-xs sm:text-sm text-gray-500 m-0">Input Nilai Harian & Nilai UAS (IMDA) dalam 1 tabel</p>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        {isAdmin ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-full text-[11px] font-semibold shadow-2xs">
                                <Shield size={12} className="text-purple-600" />
                                <span>Akses Penuh (Admin)</span>
                            </div>
                        ) : teacherInfo ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full text-[11px] font-semibold shadow-2xs">
                                <UserCheck size={12} className="text-emerald-600" />
                                <span>Pengajar: {teacherInfo.nama}</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-50 text-gray-700 border border-gray-200/60 rounded-full text-[11px] font-semibold shadow-2xs">
                                <UserCheck size={12} className="text-gray-500" />
                                <span>Akses Pengajar</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ALERTS */}
            {errorMessage && (
                <div className="alert alert-error mb-3 flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                </div>
            )}
            {successMessage && (
                <div className="alert alert-success mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* FILTERS SECTION */}
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

                <div className="form-group">
                    <label className="form-label">
                        Kelas * {!isAdmin && teacherAssignments.length > 0 && <span className="text-[10px] text-emerald-700 font-semibold">(Sesuai Jadwal Mengajar)</span>}
                    </label>
                    <select
                        className="form-control"
                        value={filters.kelas_id}
                        onChange={e => handleKelasChange(e.target.value)}
                    >
                        <option value="">Pilih Kelas</option>
                        {kelas.map(k => (
                            <option key={k.id} value={k.id}>{k.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        Mata Pelajaran * {!isAdmin && teacherAssignments.length > 0 && <span className="text-[10px] text-emerald-700 font-semibold">(Sesuai Jadwal Mengajar)</span>}
                    </label>
                    <select
                        className="form-control"
                        value={filters.mapel_id}
                        onChange={e => setFilters({ ...filters, mapel_id: e.target.value })}
                        disabled={!filters.kelas_id}
                    >
                        <option value="">Pilih Mapel</option>
                        {mapel.map(m => (
                            <option key={m.id} value={m.id}>{m.nama}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* INACTIVE SEMESTER WARNING BANNER */}
            {filters.semester_id && !isSemesterActive && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100/80 rounded-xl text-amber-700 shrink-0">
                            <Lock size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-amber-900">Mode Lihat Saja (Semester Tidak Aktif)</div>
                            <div className="text-xs text-amber-700 mt-0.5">
                                Semester ({selectedSemObj?.nama} - {selectedSemObj?.tahun_ajaran}) sudah tidak aktif. Seluruh pengisian dan pengubahan nilai dikunci.
                            </div>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-200/80 text-amber-900 font-bold rounded-lg text-[10px] uppercase tracking-wider shrink-0 font-mono border border-amber-300">
                        Terkunci
                    </span>
                </div>
            )}

            {/* TABLE SECTION */}
            {filters.kelas_id && filters.mapel_id && filters.semester_id ? (
                <div className="table-container">
                    {/* TOGGLEABLE PETUNJUK RAPOR */}
                    <div className="mb-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setShowPetunjuk(!showPetunjuk)}
                            className="w-full px-4 py-3 flex items-center justify-between text-emerald-950 font-semibold hover:bg-emerald-50/80 transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-2xs border border-emerald-100/80">
                                    <Info size={15} />
                                </div>
                                <span className="text-xs font-bold tracking-tight">Petunjuk Rapor MMU Sidogiri</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-white/80 px-2.5 py-1 rounded-full border border-emerald-100/60">
                                <span>{showPetunjuk ? 'Sembunyikan' : 'Lihat Petunjuk'}</span>
                                {showPetunjuk ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                        </button>

                        {showPetunjuk && (
                            <div className="px-4 pb-3.5 pt-2 border-t border-emerald-100/60 text-emerald-900 text-xs space-y-2 bg-white/40">
                                <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-50 text-[11px] leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                    <div>
                                        <strong className="text-emerald-950">Rumus Rapor (3-10):</strong> (Nilai UAS × 2 + Harian) ÷ 3 &rarr; Dikonversi ke skala 3 s.d 10 (angka bulat).
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-50 text-[11px] leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                    <div>
                                        <strong className="text-emerald-950">Pewarnaan Rapor:</strong> <span className="font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">Hitam (Nilai &ge; 6)</span> &bull; <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Merah (Nilai &le; 5)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TABLE HEADER ACTIONS */}
                    <div className="table-header flex justify-between items-center mb-3">
                        <h3 className="table-title">Daftar Santri ({santri.length})</h3>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveAll}
                            disabled={saving || santri.length === 0 || !isSemesterActive}
                        >
                            {saving ? (
                                <><RefreshCw size={18} className="spin" /> Menyimpan...</>
                            ) : !isSemesterActive ? (
                                <><Lock size={18} /> Semester Terkunci</>
                            ) : (
                                <><Save size={18} /> Simpan Semua Nilai</>
                            )}
                        </button>
                    </div>

                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-12' },
                            { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                            { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                            {
                                header: 'Nilai Harian (0-100)',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        disabled={!isSemesterActive}
                                        value={inputMap[row.id]?.harian ?? ''}
                                        onChange={e => handleFieldChange(row.id, 'harian', e.target.value)}
                                    />
                                )
                            },
                            {
                                header: 'Nilai UAS / IMDA (0-100)',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        disabled={!isSemesterActive}
                                        value={inputMap[row.id]?.uas ?? ''}
                                        onChange={e => handleFieldChange(row.id, 'uas', e.target.value)}
                                    />
                                )
                            },
                            {
                                header: 'Nilai Rapor (3-10)',
                                className: 'text-center',
                                render: (row) => {
                                    const uasVal = inputMap[row.id]?.uas
                                    const harianVal = inputMap[row.id]?.harian
                                    const calc = calculateSidogiriGrade(uasVal, harianVal)

                                    const badgeClass = calc.finalGrade === '-'
                                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                                        : calc.isRed
                                            ? 'bg-red-100 text-red-700 font-black border-red-300'
                                            : 'bg-emerald-100 text-black font-black border-emerald-300'

                                    return (
                                        <div className="flex flex-col items-center">
                                            <span className={`inline-block px-3 py-1 font-black rounded-lg text-sm border ${badgeClass}`}>
                                                {calc.finalGrade}
                                            </span>
                                            {calc.raw !== '-' && (
                                                <span className="text-[9px] text-gray-400 mt-0.5 font-mono">
                                                    ({calc.raw} → {calc.finalGrade})
                                                </span>
                                            )}
                                        </div>
                                    )
                                }
                            },
                            {
                                header: 'Keterangan',
                                render: (row) => (
                                    <input
                                        type="text"
                                        className="form-control disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="Keterangan..."
                                        disabled={!isSemesterActive}
                                        value={inputMap[row.id]?.catatan ?? ''}
                                        onChange={e => handleFieldChange(row.id, 'catatan', e.target.value)}
                                        style={{ minWidth: '130px' }}
                                    />
                                )
                            }
                        ]}
                        data={santri}
                        loading={loading}
                        emptyState={<div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Tidak ada santri di kelas ini</div>}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={(row) => {
                            const uasVal = inputMap[row.id]?.uas
                            const harianVal = inputMap[row.id]?.harian
                            const calc = calculateSidogiriGrade(uasVal, harianVal)

                            return (
                                <div className="flex flex-col gap-3 w-full mt-2 pt-2 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div>
                                            <span className="text-gray-500 block">Nilai Rapor (3-10):</span>
                                            <span className={`font-bold ${calc.isRed ? 'text-red-600' : 'text-black'}`}>{calc.finalGrade}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block font-semibold">Nilai Harian</label>
                                            <input
                                                type="number"
                                                className="form-control text-sm px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                disabled={!isSemesterActive}
                                                value={inputMap[row.id]?.harian ?? ''}
                                                onChange={e => handleFieldChange(row.id, 'harian', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block font-semibold">Nilai UAS (IMDA)</label>
                                            <input
                                                type="number"
                                                className="form-control text-sm px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                disabled={!isSemesterActive}
                                                value={inputMap[row.id]?.uas ?? ''}
                                                onChange={e => handleFieldChange(row.id, 'uas', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Keterangan</label>
                                        <input
                                            type="text"
                                            className="form-control text-sm px-2 py-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            placeholder="Keterangan..."
                                            disabled={!isSemesterActive}
                                            value={inputMap[row.id]?.catatan ?? ''}
                                            onChange={e => handleFieldChange(row.id, 'catatan', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )
                        }}
                    />
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100 mt-4">
                    {!filters.kelas_id
                        ? 'Silakan pilih Kelas untuk memulai'
                        : 'Tidak ada mata pelajaran yang ditugaskan di kelas ini'}
                </div>
            )}
        </div>
    )
}

export default MadrosUASPage
