import { useState, useEffect } from 'react'
import { Save, RefreshCw, BookMarked, Shield, UserCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../context/AuthContext'
import ResponsiveTable from '../../../../../components/ui/ResponsiveTable'
import '../../../shared/styles/Nilai.css'

/**
 * Komponen Input Nilai Ujian Semester Qur'aniyah (Tahfizhiyah)
 * Akses Ketat: Hanya Musyrif pengampu halaqoh yang diizinkan menginput nilai
 */
const TahfizhSemesterPage = () => {
    const { user, userProfile, isAdmin: checkIsAdmin, isAdminAkademik: checkIsAdminAkademik } = useAuth()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [santri, setSantri] = useState([])
    const [nilai, setNilai] = useState({})
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    // Musyrif & Admin Access Control
    const [teacherInfo, setTeacherInfo] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)

    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: ''
    })

    useEffect(() => {
        fetchOptionsAndPermissions()
    }, [user, userProfile])

    // 1. Fetch Semester, Halaqoh (Strict Musyrif Filtering)
    const fetchOptionsAndPermissions = async () => {
        try {
            setLoading(true)
            const adminRole = (checkIsAdmin && checkIsAdmin()) || 
                (checkIsAdminAkademik && checkIsAdminAkademik()) ||
                ['admin', 'admin_akademik'].includes(userProfile?.activeRole) || 
                ['admin', 'admin_akademik'].includes(userProfile?.role) ||
                userProfile?.roles?.includes('admin') ||
                userProfile?.roles?.includes('admin_akademik')

            setIsAdmin(Boolean(adminRole))

            const [semRes, halRes] = await Promise.all([
                supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
                supabase.from('halaqoh').select('id, nama').order('nama')
            ])

            const allSemesters = semRes.data || []
            const allHalaqoh = halRes.data || []

            setSemester(allSemesters)

            let activeSemId = ''
            const activeSem = allSemesters.find(s => s.is_active)
            if (activeSem) activeSemId = activeSem.id

            // Check Musyrif permissions strictly if not admin
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

                    // Fetch halaqoh STRICTLY assigned to this musyrif
                    const { data: halData } = await supabase
                        .from('halaqoh')
                        .select('id, nama')
                        .eq('musyrif_id', guruData.id)
                        .order('nama')

                    const assignedHalaqoh = halData || []
                    setHalaqoh(assignedHalaqoh)

                    if (assignedHalaqoh.length > 0) {
                        setFilters({
                            semester_id: activeSemId,
                            halaqoh_id: assignedHalaqoh[0].id
                        })
                    } else {
                        // Strict: Musyrif not assigned to any halaqoh -> empty halaqoh
                        setFilters({
                            semester_id: activeSemId,
                            halaqoh_id: ''
                        })
                    }
                } else {
                    // Strict: Guru profile not linked -> empty halaqoh
                    setHalaqoh([])
                    setFilters({
                        semester_id: activeSemId,
                        halaqoh_id: ''
                    })
                }
            } else {
                // Admin has full access to all halaqohs
                setHalaqoh(allHalaqoh)
                setFilters({
                    semester_id: activeSemId,
                    halaqoh_id: allHalaqoh.length > 0 ? allHalaqoh[0].id : ''
                })
            }
        } catch (err) {
            console.error('Fetch permissions error:', err)
            setError('Gagal memuat opsi filter: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // 2. Fetch Santri list and existing grades for selected halaqoh & semester
    const fetchSantriAndNilai = async () => {
        if (!filters.halaqoh_id || !filters.semester_id) return
        setLoading(true)
        setError('')

        try {
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', filters.halaqoh_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError
            const listSantri = santriData || []
            setSantri(listSantri)

            if (listSantri.length > 0) {
                const { data: nilaiData, error: nilaiError } = await supabase
                    .from('nilai')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .eq('jenis_ujian', 'semester')
                    .eq('kategori', 'Tahfizhiyah')
                    .in('santri_id', listSantri.map(s => s.id))

                if (nilaiError) throw nilaiError

                const nilaiMap = {}
                nilaiData?.forEach(n => {
                    nilaiMap[n.santri_id] = {
                        id: n.id,
                        hafalan_baru: n.nilai_hafalan || '',
                        tajwid: n.nilai_tajwid || '',
                        kelancaran: n.nilai_kelancaran || ''
                    }
                })
                setNilai(nilaiMap)
            } else {
                setNilai({})
            }
        } catch (err) {
            setError('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.halaqoh_id && filters.semester_id) {
            fetchSantriAndNilai()
        }
    }, [filters.halaqoh_id, filters.semester_id])

    // 3. Handle Grade Input Change
    const handleNilaiChange = (santriId, field, value) => {
        setNilai(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [field]: value === '' ? '' : parseFloat(value) || 0
            }
        }))
    }

    // 4. Calculate Average Grade
    const calculateRataRata = (santriId) => {
        const data = nilai[santriId]
        if (!data) return '-'
        const hb = parseFloat(data.hafalan_baru) || 0
        const t = parseFloat(data.tajwid) || 0
        const k = parseFloat(data.kelancaran) || 0
        if (hb === 0 && t === 0 && k === 0) return '-'
        return ((hb + t + k) / 3).toFixed(1)
    }

    // 5. Save All Grades
    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            for (const [santriId, data] of Object.entries(nilai)) {
                if (!data.hafalan_baru && !data.tajwid && !data.kelancaran) continue

                const hb = parseFloat(data.hafalan_baru) || 0
                const t = parseFloat(data.tajwid) || 0
                const k = parseFloat(data.kelancaran) || 0

                const payload = {
                    santri_id: santriId,
                    semester_id: filters.semester_id,
                    jenis_ujian: 'semester',
                    kategori: 'Tahfizhiyah',
                    nilai_hafalan: hb,
                    nilai_tajwid: t,
                    nilai_kelancaran: k,
                    nilai_akhir: (hb + t + k) / 3
                }

                if (data.id) {
                    const { error } = await supabase.from('nilai').update(payload).eq('id', data.id)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('nilai').insert([payload])
                    if (error) throw error
                }
            }

            setSuccess('✅ Nilai berhasil disimpan!')
            setTimeout(() => setSuccess(''), 3000)
            fetchSantriAndNilai()
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
                        <span>Input Nilai Ujian Semester</span>
                        <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full uppercase">Tahfizhiyah</span>
                    </h1>
                    <p className="page-subtitle">Ujian Semester Qur'aniyah (Hafalan, Tajwid & Kelancaran)</p>
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
                            <span>Musyrif: {teacherInfo.nama}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold">
                            <UserCheck size={16} className="text-gray-500" />
                            <span>Akses Musyrif</span>
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
                        Halaqoh * {!isAdmin && <span className="text-[10px] text-emerald-700 font-semibold">(Binaan Anda)</span>}
                    </label>
                    <select
                        className="form-control"
                        value={filters.halaqoh_id}
                        onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                        disabled={!isAdmin && halaqoh.length === 0}
                    >
                        <option value="">Pilih Halaqoh</option>
                        {halaqoh.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* TABLE / EMPTY ACCESS SECTION */}
            {filters.halaqoh_id && filters.semester_id ? (
                <div className="table-container">
                    <div className="table-header flex justify-between items-center mb-3">
                        <h3 className="table-title">Daftar Santri ({santri.length})</h3>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving || santri.length === 0}
                        >
                            {saving ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Nilai</>}
                        </button>
                    </div>

                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                            { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                            {
                                header: 'Hafalan (0-100)',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        value={nilai[row.id]?.hafalan_baru ?? ''}
                                        onChange={e => handleNilaiChange(row.id, 'hafalan_baru', e.target.value)}
                                    />
                                )
                            },
                            {
                                header: 'Tajwid (0-100)',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        value={nilai[row.id]?.tajwid ?? ''}
                                        onChange={e => handleNilaiChange(row.id, 'tajwid', e.target.value)}
                                    />
                                )
                            },
                            {
                                header: 'Kelancaran (0-100)',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        value={nilai[row.id]?.kelancaran ?? ''}
                                        onChange={e => handleNilaiChange(row.id, 'kelancaran', e.target.value)}
                                    />
                                )
                            },
                            { header: 'Rata-rata', render: (row) => calculateRataRata(row.id), className: 'text-center font-semibold' }
                        ]}
                        data={santri}
                        loading={loading}
                        emptyState={<div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Tidak ada santri di halaqoh ini</div>}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={(row) => (
                            <div className="flex flex-col gap-3 w-full mt-2 pt-2 border-t border-gray-100">
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Hafalan</label>
                                        <input
                                            type="number"
                                            className="form-control text-sm px-2 py-1"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={nilai[row.id]?.hafalan_baru ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'hafalan_baru', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Tajwid</label>
                                        <input
                                            type="number"
                                            className="form-control text-sm px-2 py-1"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={nilai[row.id]?.tajwid ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'tajwid', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Kelancaran</label>
                                        <input
                                            type="number"
                                            className="form-control text-sm px-2 py-1"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={nilai[row.id]?.kelancaran ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'kelancaran', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between border-t border-gray-50 pt-2 mt-1">
                                    <span className="text-gray-500 font-medium text-sm">Rata-rata:</span>
                                    <span className="font-bold text-gray-900">{calculateRataRata(row.id)}</span>
                                </div>
                            </div>
                        )}
                    />
                </div>
            ) : (
                <div className="p-8 text-center bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 mt-4">
                    {!isAdmin && halaqoh.length === 0 ? (
                        <div className="flex flex-col items-center gap-2">
                            <Lock size={28} className="text-amber-600 mb-1" />
                            <h4 className="font-bold text-sm">🔒 Akses Terbatas Musyrif</h4>
                            <p className="text-xs text-amber-800 max-w-md">
                                Akun <strong>{teacherInfo?.nama || user?.email}</strong> belum ditugaskan sebagai Musyrif pengampu di halaqoh mana pun. Hanya Musyrif pengampu halaqoh yang berhak menginput nilai.
                            </p>
                        </div>
                    ) : (
                        'Silakan pilih Halaqoh untuk memulai'
                    )}
                </div>
            )}
        </div>
    )
}

export default TahfizhSemesterPage
