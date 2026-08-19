import { useState, useEffect, useMemo, useRef } from 'react'
import { Users, RefreshCw, Printer, FileText, BookOpen, Layers, Filter, Search, ChevronDown, X } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../context/AuthContext'
import { useUserHalaqoh } from '../../../../../hooks/features/useUserHalaqoh'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import RaportTemplate from '../../../../../components/akademik/RaportTemplate'
import { calculateSidogiriGrade } from '../../../../../components/akademik/RaportMadrasahTemplate'
import { calculateAutoPresensi, getResolvedAttendance } from '../../../../../utils/attendanceHelper'
import { fetchUnifiedSantriNonAkademik } from '../../../../../utils/raportNonAkademikHelper'
import '../../../../../pages/laporan/Laporan.css'

/**
 * Komponen Select Pencarian Cerdas Santri
 * Fitur: Instant Filter by Nama / NIS, Popover Dropdown, Keyboard & Click friendly
 */
const SmartSantriSelect = ({ options = [], value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef(null)

    const selectedOption = useMemo(() => {
        return options.find(o => o.id === value) || null
    }, [options, value])

    const searchFilteredOptions = useMemo(() => {
        if (!search.trim()) return options
        const q = search.toLowerCase().trim()
        return options.filter(s =>
            s.nama?.toLowerCase().includes(q) ||
            s.nis?.toLowerCase().includes(q)
        )
    }, [options, search])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm cursor-pointer hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-xs min-h-[38px]"
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption ? (
                        <span className="font-bold text-gray-800 truncate">
                            {selectedOption.nama} <span className="text-xs text-gray-500 font-medium">({selectedOption.nis})</span>
                        </span>
                    ) : (
                        <span className="text-gray-400 font-normal">Cari Nama / NIS Santri...</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-2 max-h-64 overflow-y-auto">
                    <div className="relative mb-2">
                        <input
                            type="text"
                            className="w-full px-3 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                            placeholder="Ketik Nama atau NIS santri..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {searchFilteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-500">
                                Santri tidak ditemukan
                            </div>
                        ) : (
                            searchFilteredOptions.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(s.id)
                                        setIsOpen(false)
                                        setSearch('')
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                                        s.id === value ? 'bg-emerald-50 text-emerald-800 font-bold' : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    <span className="truncate">{s.nama}</span>
                                    <span className="text-[10px] text-gray-500 font-mono ml-2 flex-shrink-0">NIS: {s.nis}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const LaporanAkademikSantriPage = () => {
    const { user, userProfile, isAdmin: checkIsAdmin, isAdminAkademik: checkIsAdminAkademik } = useAuth()
    const { halaqohList, halaqohIds, isAdmin: isHalaqohAdmin } = useUserHalaqoh()

    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [kelasList, setKelasList] = useState([])
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [nilaiTahfizh, setNilaiTahfizh] = useState([])
    const [nilaiMadros, setNilaiMadros] = useState([])
    const [perilaku, setPerilaku] = useState(null)
    const [taujihad, setTaujihad] = useState(null)
    const [activeTab, setActiveTab] = useState('all') // 'all', 'tahfizh', 'madrasah'
    const [presensiData, setPresensiData] = useState({ pulang: 0, izin: 0, sakit: 0, alpha: 0 })

    const [filters, setFilters] = useState({
        semester_id: '',
        kelas_id: '',
        halaqoh_id: '',
        santri_id: ''
    })

    const [isAdminRole, setIsAdminRole] = useState(false)

    useEffect(() => {
        fetchOptionsAndPermissions()
    }, [user?.id, userProfile?.activeRole])

    const fetchOptionsAndPermissions = async () => {
        try {
            setLoading(true)
            const adminRole = (checkIsAdmin && checkIsAdmin()) || 
                (checkIsAdminAkademik && checkIsAdminAkademik()) ||
                ['admin', 'admin_akademik'].includes(userProfile?.activeRole) || 
                ['admin', 'admin_akademik'].includes(userProfile?.role) ||
                userProfile?.roles?.includes('admin') ||
                userProfile?.roles?.includes('admin_akademik')

            setIsAdminRole(Boolean(adminRole))

            const [semRes, kelRes, santriRes] = await Promise.all([
                supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
                supabase.from('kelas').select('id, nama, wali_kelas_id').order('nama'),
                supabase.from('santri').select(`
                    id, nama, nis, nama_wali, kelas_id, halaqoh_id,
                    kelas:kelas!kelas_id(id, nama, wali_kelas_id, wali_kelas:guru!wali_kelas_id(nama)),
                    halaqoh:halaqoh!halaqoh_id(id, nama, musyrif_id, musyrif:guru!musyrif_id(nama))
                `).eq('status', 'Aktif').order('nama')
            ])

            const allSemesters = semRes.data || []
            const allKelas = kelRes.data || []
            const allSantri = santriRes.data || []

            setSemester(allSemesters)
            setSantriList(allSantri)

            let activeSemId = ''
            const activeSem = allSemesters.find(s => s.is_active)
            if (activeSem) activeSemId = activeSem.id

            let activeKelasList = allKelas

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
                    const assignedKelas = allKelas.filter(k => k.wali_kelas_id === guruData.id)
                    if (assignedKelas.length > 0) {
                        activeKelasList = assignedKelas
                    }
                }
            }

            setKelasList(activeKelasList)

            setFilters(prev => ({
                ...prev,
                semester_id: activeSemId
            }))
        } catch (err) {
            console.error('Error loading options:', err)
        } finally {
            setLoading(false)
        }
    }

    // Filter santri dynamically based on selected kelas_id and halaqoh_id
    const filteredSantriList = useMemo(() => {
        return santriList.filter(s => {
            let matchKelas = true
            let matchHalaqoh = true

            if (filters.kelas_id) {
                const sKelasId = s.kelas?.id || s.kelas_id
                matchKelas = sKelasId === filters.kelas_id
            }

            if (filters.halaqoh_id) {
                const sHalaqohId = s.halaqoh?.id || s.halaqoh_id
                matchHalaqoh = sHalaqohId === filters.halaqoh_id
            }

            return matchKelas && matchHalaqoh
        })
    }, [santriList, filters.kelas_id, filters.halaqoh_id])

    // Auto select first santri when filteredSantriList changes or filter changes
    useEffect(() => {
        if (filteredSantriList.length > 0) {
            const exists = filteredSantriList.some(s => s.id === filters.santri_id)
            if (!exists) {
                setFilters(prev => ({ ...prev, santri_id: filteredSantriList[0].id }))
            }
        } else {
            setFilters(prev => ({ ...prev, santri_id: '' }))
        }
    }, [filteredSantriList])

    useEffect(() => {
        if (filters.santri_id && filters.semester_id) {
            fetchSantriReport(filters.santri_id)
        } else {
            setSelectedSantri(null)
        }
    }, [filters.santri_id, filters.semester_id])

    const fetchSantriReport = async (santriId) => {
        if (!santriId || !filters.semester_id) return
        setLoading(true)

        try {
            const selected = santriList.find(s => s.id === santriId)

            const filterAdminName = (nameStr) => {
                if (!nameStr) return null
                const parts = nameStr.split(',').map(s => s.trim()).filter(s => s && !s.toUpperCase().includes('ADMIN'))
                return parts.length > 0 ? parts.join(', ') : null
            }

            let musyrifName = filterAdminName(selected?.halaqoh?.musyrif?.nama)
            if (!musyrifName && selected?.halaqoh?.musyrif_id) {
                const { data: guruData } = await supabase
                    .from('guru')
                    .select('nama')
                    .eq('id', selected.halaqoh.musyrif_id)
                    .maybeSingle()
                if (guruData) musyrifName = filterAdminName(guruData.nama)
            }
            if (!musyrifName && (selected?.halaqoh?.id || selected?.halaqoh_id)) {
                const halId = selected?.halaqoh?.id || selected?.halaqoh_id
                const { data: mhData } = await supabase
                    .from('musyrif_halaqoh')
                    .select('user_id')
                    .eq('halaqoh_id', halId)
                if (mhData && mhData.length > 0) {
                    const userIds = mhData.map(m => m.user_id)
                    const { data: profileData } = await supabase
                        .from('user_profiles')
                        .select('nama')
                        .in('user_id', userIds)
                    if (profileData && profileData.length > 0) {
                        const names = profileData.map(p => p.nama).filter(n => n && !n.toUpperCase().includes('ADMIN'))
                        if (names.length > 0) musyrifName = names.join(', ')
                    }
                }
            }

            let waliKelasName = filterAdminName(selected?.kelas?.wali_kelas?.nama)
            if (!waliKelasName && selected?.kelas?.wali_kelas_id) {
                const { data: guruData } = await supabase
                    .from('guru')
                    .select('nama')
                    .eq('id', selected.kelas.wali_kelas_id)
                    .maybeSingle()
                if (guruData) waliKelasName = filterAdminName(guruData.nama)
            }

            if (selected) {
                selected.musyrif_nama = musyrifName || "....................."
                selected.wali_kelas_nama = waliKelasName || "....................."
            }
            setSelectedSantri(selected ? { ...selected } : null)

            // --- 1. Fetch Mapels ---
            const { data: allMapels } = await supabase
                .from('mapel')
                .select('*')
                .order('nama', { ascending: true })
            const expectedMapels = allMapels || []

            // --- 2. Fetch All Grades for Semester ---
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select(`
                    *,
                    mapel:mapel_id(nama, kode)
                `)
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)

            // Split into Tahfizhiyah & Madrasiyah
            const tahfizhGrades = nilaiData?.filter(n => n.kategori === 'Tahfizhiyah') || []
            const mapelGrades = nilaiData?.filter(n => n.kategori === 'Madrasiyah' || n.kategori === 'Madrosiyah') || []

            let nilaiTahfizhList = []
            if (tahfizhGrades.length > 0) {
                let activeRecord = tahfizhGrades.find(n => n.jenis_ujian === 'semester')
                if (!activeRecord) activeRecord = tahfizhGrades.find(n => n.jenis_ujian === 'uas')
                if (!activeRecord && tahfizhGrades.length > 0) activeRecord = tahfizhGrades[0]

                if (activeRecord) {
                    const hafalan = activeRecord.nilai_hafalan || 0
                    const tajwid = activeRecord.nilai_tajwid || 0
                    const kelancaran = activeRecord.nilai_kelancaran || 0

                    nilaiTahfizhList = [
                        { mapel: { nama: 'Hafalan' }, komponen: 'Hafalan', aspek: 'Hafalan', nama: 'Hafalan', nilai: hafalan },
                        { mapel: { nama: 'Tajwid' }, komponen: 'Tajwid', aspek: 'Tajwid', nama: 'Tajwid', nilai: tajwid },
                        { mapel: { nama: 'Fashohah / Kelancaran' }, komponen: 'Fashohah / Kelancaran', aspek: 'Kelancaran', nama: 'Fashohah / Kelancaran', nilai: kelancaran }
                    ]
                }
            }
            setNilaiTahfizh(nilaiTahfizhList)

            // Map all expected Madrasiyah mapels with Sidogiri grade calculation
            const nilaiMadrosList = expectedMapels.map(m => {
                const mapelScores = mapelGrades.filter(n => n.mapel_id === m.id || n.mapel?.nama === m.nama)
                const harianRec = mapelScores.find(n => n.jenis_ujian === 'harian')
                const uasRec = mapelScores.find(n => n.jenis_ujian === 'semester' || n.jenis_ujian === 'uas')

                const harianVal = harianRec ? (Number(harianRec.nilai_harian ?? harianRec.nilai_akhir ?? harianRec.nilai) || null) : null
                const uasVal = uasRec ? (Number(uasRec.nilai_uas ?? uasRec.nilai_akhir ?? uasRec.nilai) || null) : null

                const calculated = calculateSidogiriGrade(uasVal, harianVal)

                if (harianVal === null && uasVal === null && (calculated.finalGrade === '-' || calculated.finalGrade === null)) {
                    return null
                }

                return {
                    mapel: m,
                    mapel_nama: m.nama,
                    mapel_kode: m.kode || m.nama,
                    nilai_harian: harianVal !== null ? harianVal : '-',
                    nilai_ujian: uasVal !== null ? uasVal : '-',
                    nilai_raport: calculated.finalGrade,
                    nilai: calculated.finalGrade,
                    isRed: calculated.isRed
                }
            }).filter(Boolean)
            setNilaiMadros(nilaiMadrosList)

            // --- 3. Fetch Unified Non-Academic Data (Perilaku, Taujihad, Presensi, Tahfizh) ---
            const nonAkademikData = await fetchUnifiedSantriNonAkademik(supabase, santriId, filters.semester_id)
            setPerilaku(nonAkademikData.perilaku)
            setTaujihad(nonAkademikData.taujihad)
            setPresensiData(nonAkademikData.ketidakhadiran)

        } catch (err) {
            console.error('Error fetching report:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const currentSemesterObj = semester.find(s => s.id === filters.semester_id)

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Laporan Raport Santri</h1>
                    <p className="page-subtitle">Pratinjau & cetak raport resmi santri</p>
                </div>
                <div className="header-actions">
                    <button 
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0A2619] text-[#BCF32F] rounded-lg text-sm font-bold hover:bg-[#143d2a] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs" 
                        disabled={!selectedSantri}
                        onClick={() => window.print()}
                    >
                        <Printer size={18} />
                        <span>Cetak / Download Raport</span>
                    </button>
                </div>
            </div>

            {/* FILTER SECTION WITH SMART SEARCHABLE SANTRI SELECT */}
            <div className="filter-section">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full items-end">
                    {/* 1. SEMESTER FILTER */}
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

                    {/* 2. KELAS FILTER */}
                    <div className="form-group">
                        <label className="form-label">Kelas</label>
                        <select
                            className="form-control"
                            value={filters.kelas_id}
                            onChange={e => setFilters({ ...filters, kelas_id: e.target.value })}
                        >
                            <option value="">Semua Kelas</option>
                            {kelasList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. HALAQOH FILTER */}
                    <div className="form-group">
                        <label className="form-label">Halaqoh</label>
                        <select
                            className="form-control"
                            value={filters.halaqoh_id}
                            onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                        >
                            <option value="">Semua Halaqoh</option>
                            {halaqohList.map(h => (
                                <option key={h.id} value={h.id}>
                                    {h.nama} {h.musyrif_nama ? `(${h.musyrif_nama})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 4. SANTRI FILTER WITH SMART SEARCH */}
                    <div className="form-group">
                        <label className="form-label">
                            Pilih Santri * ({filteredSantriList.length})
                        </label>
                        <SmartSantriSelect
                            options={filteredSantriList}
                            value={filters.santri_id}
                            onChange={val => setFilters({ ...filters, santri_id: val })}
                        />
                    </div>
                </div>
            </div>

            {/* TAB SWITCHER & LIVE PREVIEW */}
            {selectedSantri && (
                <div className="flex bg-gray-200/80 p-1 rounded-xl gap-1 text-xs md:text-sm font-bold w-fit mb-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Layers size={16} />
                        <span>Tampilkan Semua (2 Lembar)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('tahfizh')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${activeTab === 'tahfizh' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <BookOpen size={16} />
                        <span>Raport Tahfizh (Qur'aniyah)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('madrasah')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all ${activeTab === 'madrasah' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <FileText size={16} />
                        <span>Raport Madrasah (Madrosiyah)</span>
                    </button>
                </div>
            )}

            <div className="card p-0 overflow-hidden bg-gray-100">
                {loading ? (
                    <div className="loading-state p-12 text-center">
                        <RefreshCw className="spin" size={24} />
                        <span>Memuat data raport santri...</span>
                    </div>
                ) : !selectedSantri ? (
                    <div className="empty-state p-12 text-center">
                        <Users size={48} />
                        <p>Pilih santri untuk melihat pratinjau raport resmi</p>
                    </div>
                ) : (
                    <div className="p-4 md:p-8 flex justify-center bg-gray-100 overflow-x-auto">
                        <div className="w-full max-w-[210mm] shadow-md rounded-lg overflow-hidden bg-white">
                            <RaportTemplate
                                santri={selectedSantri}
                                semester={currentSemesterObj}
                                nilaiTahfizh={nilaiTahfizh}
                                nilaiMadrasah={nilaiMadros}
                                perilaku={perilaku}
                                taujihad={taujihad}
                                ketidakhadiran={presensiData}
                                catatanWali={perilaku?.catatan_wali || taujihad?.catatan_wali}
                                musyrifName={selectedSantri?.musyrif_nama}
                                waliKelasName={selectedSantri?.wali_kelas_nama}
                                type={activeTab}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LaporanAkademikSantriPage
