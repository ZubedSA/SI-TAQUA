import { useState, useEffect } from 'react'
import { Users, RefreshCw, Printer, FileText, BookOpen, Layers } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import RaportTemplate from '../../../../../components/akademik/RaportTemplate'
import { calculateSidogiriGrade } from '../../../../../components/akademik/RaportMadrasahTemplate'
import '../../../../../pages/laporan/Laporan.css'

const LaporanAkademikSantriPage = () => {
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
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
        santri_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (filters.santri_id && filters.semester_id) {
            fetchSantriReport(filters.santri_id)
        } else {
            setSelectedSantri(null)
        }
    }, [filters.santri_id, filters.semester_id])

    const fetchOptions = async () => {
        const [semRes, santriRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('santri').select('id, nama, nis, nama_wali, kelas:kelas!kelas_id(nama), halaqoh:halaqoh!halaqoh_id(nama, musyrif_id)').eq('status', 'Aktif').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (santriRes.data) setSantriList(santriRes.data)
    }

    const fetchSantriReport = async (santriId) => {
        if (!santriId || !filters.semester_id) return
        setLoading(true)

        try {
            const selected = santriList.find(s => s.id === santriId)

            let musyrifName = "UST. SUBAIDI"
            if (selected?.halaqoh?.musyrif_id) {
                const { data: guruData } = await supabase
                    .from('guru')
                    .select('nama')
                    .eq('id', selected.halaqoh.musyrif_id)
                    .single()
                if (guruData) musyrifName = guruData.nama
            }
            if (selected) selected.musyrif_nama = musyrifName
            setSelectedSantri(selected)

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

            const typePriority = { 'semester': 4, 'uas': 3, 'uts': 2, 'harian': 1 }

            const getBestGrade = (grades) => {
                if (!grades || grades.length === 0) return null
                return grades.reduce((prev, current) => {
                    const prevVal = prev.nilai_akhir ?? prev.nilai ?? 0
                    const currVal = current.nilai_akhir ?? current.nilai ?? 0
                    const prevP = typePriority[prev.jenis_ujian] || 0
                    const currP = typePriority[current.jenis_ujian] || 0
                    if (currP > prevP) return current
                    if (currP === prevP) {
                        return currVal > prevVal ? current : prev
                    }
                    return prev
                })
            }

            let mapelsToProcess = [...expectedMapels]
            nilaiData?.forEach(n => {
                if (n.mapel_id && !mapelsToProcess.some(m => m.id === n.mapel_id)) {
                    const mapelName = n.mapel?.nama || 'Mata Pelajaran'
                    const isTahfizh = mapelName.toLowerCase().includes('tahfizh') || mapelName.toLowerCase().includes('quran')
                    if (!isTahfizh && n.kategori !== 'Tahfizhiyah') {
                        mapelsToProcess.push({ id: n.mapel_id, nama: mapelName })
                    }
                }
            })

            let madrasahList = mapelsToProcess.map(mapel => {
                if (mapel.nama?.toLowerCase().includes('tahfizh') || mapel.nama?.toLowerCase().includes('quran')) {
                    return null
                }

                const mapelGrades = nilaiData?.filter(n => n.mapel_id === mapel.id || n.mapel?.nama === mapel.nama) || []

                const harianRecord = mapelGrades.find(g => g.jenis_ujian === 'harian')
                const examGrades = mapelGrades.filter(g => g.jenis_ujian !== 'harian')
                const bestExamRecord = getBestGrade(examGrades)

                const nilaiHarian = harianRecord ? (harianRecord.nilai_akhir ?? harianRecord.nilai) : null
                const nilaiUjian = bestExamRecord ? (bestExamRecord.nilai_akhir ?? bestExamRecord.nilai) : null

                const calc = calculateSidogiriGrade(nilaiUjian, nilaiHarian)

                return {
                    mapel: mapel,
                    nilai_harian: nilaiHarian !== null ? nilaiHarian : '-',
                    nilai_ujian: nilaiUjian !== null ? nilaiUjian : '-',
                    nilai_akhir: calc.finalGrade,
                    nilai_raport: calc.finalGrade,
                    predikat: getPredikat(calc.finalGrade),
                    isRed: calc.isRed
                }
            }).filter(Boolean)
            setNilaiMadros(madrasahList)

            // --- 3. Process Tahfizh ---
            const tahfizhRecords = nilaiData?.filter(n => {
                const isCatTahfizh = n.kategori === 'Tahfizhiyah'
                const isNameTahfizh = n.mapel?.nama?.toLowerCase().includes('tahfizh') || n.mapel?.nama?.toLowerCase().includes('quran')
                return isCatTahfizh || isNameTahfizh
            }) || []

            const bestTahfizhRecord = getBestGrade(tahfizhRecords)

            let tahfizhRows = []
            if (bestTahfizhRecord) {
                const components = [
                    { key: 'nilai_hafalan', label: 'Hafalan' },
                    { key: 'nilai_tajwid', label: 'Tajwid' },
                    { key: 'nilai_kelancaran', label: 'Fashohah / Kelancaran' }
                ]

                components.forEach(comp => {
                    if (bestTahfizhRecord[comp.key] != null) {
                        tahfizhRows.push({
                            mapel: { nama: comp.label },
                            nilai_akhir: bestTahfizhRecord[comp.key],
                            predikat: getPredikat(bestTahfizhRecord[comp.key])
                        })
                    }
                })

                if (tahfizhRows.length === 0 && bestTahfizhRecord.mapel?.nama) {
                    tahfizhRows.push({
                        mapel: { nama: bestTahfizhRecord.mapel.nama },
                        nilai_akhir: bestTahfizhRecord.nilai_akhir,
                        predikat: getPredikat(bestTahfizhRecord.nilai_akhir)
                    })
                }
            }
            setNilaiTahfizh(tahfizhRows)

            // --- 4. Fetch Taujihad & Perilaku ---
            const { data: taujihadData } = await supabase.from('taujihad').select('*').eq('santri_id', santriId).eq('semester_id', filters.semester_id).maybeSingle()
            setTaujihad(taujihadData)

            const { data: perilakuData } = await supabase.from('perilaku_semester').select('*').eq('santri_id', santriId).eq('semester_id', filters.semester_id).maybeSingle()
            setPerilaku(perilakuData)

            if (perilakuData) {
                setPresensiData({
                    pulang: perilakuData.pulang ?? 0,
                    sakit: perilakuData.sakit ?? 0,
                    izin: perilakuData.izin ?? 0,
                    alpha: perilakuData.alpha ?? 0
                })
            } else {
                setPresensiData({ pulang: 0, izin: 0, sakit: 0, alpha: 0 })
            }

        } catch (err) {
            console.error('Error fetching report:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const getPredikat = (nilai) => {
        if (nilai === null || nilai === undefined || nilai === '' || nilai === '-' || String(nilai).trim() === '-') return '-'
        const n = Number(nilai)
        if (isNaN(n) || n === 0) return '-'
        if (n >= 9 || n >= 90) return 'A'
        if (n >= 8 || n >= 80) return 'B'
        if (n >= 7 || n >= 70) return 'C'
        if (n >= 6 || n >= 60) return 'D'
        return 'E'
    }

    const handleDownloadExcel = () => {
        if (!selectedSantri) return
        const currentSem = semester.find(s => s.id === filters.semester_id)

        const exportData = [{
            NIS: selectedSantri.nis,
            Nama: selectedSantri.nama,
            Kelas: selectedSantri.kelas?.nama || '-',
            Halaqoh: selectedSantri.halaqoh?.nama || '-',
            Semester: currentSem ? `${currentSem.nama} - ${currentSem.tahun_ajaran}` : '-',
            'Izin': presensiData.izin,
            'Sakit': presensiData.sakit,
            'Alpha': presensiData.alpha,
            'Pulang': presensiData.pulang,
        }]

        nilaiMadros.forEach(m => {
            exportData[0][`Nilai ${m.mapel?.nama || m.nama}`] = m.nilai_akhir
        })

        const columns = Object.keys(exportData[0])
        exportToExcel(exportData, columns, `laporan_akademik_${selectedSantri.nama.replace(/\s/g, '_')}`)
    }

    const handleDownloadCSV = () => {
        if (!selectedSantri) return
        const currentSem = semester.find(s => s.id === filters.semester_id)

        const exportData = [{
            NIS: selectedSantri.nis,
            Nama: selectedSantri.nama,
            Kelas: selectedSantri.kelas?.nama || '-',
            Halaqoh: selectedSantri.halaqoh?.nama || '-',
            Semester: currentSem ? `${currentSem.nama} - ${currentSem.tahun_ajaran}` : '-',
            'Izin': presensiData.izin,
            'Sakit': presensiData.sakit,
            'Alpha': presensiData.alpha,
            'Pulang': presensiData.pulang,
        }]

        nilaiMadros.forEach(m => {
            exportData[0][`Nilai ${m.mapel?.nama || m.nama}`] = m.nilai_akhir
        })

        const columns = Object.keys(exportData[0])
        exportToCSV(exportData, columns, `laporan_akademik_${selectedSantri.nama.replace(/\s/g, '_')}`)
    }

    const currentSemesterObj = semester.find(s => s.id === filters.semester_id)

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Laporan Raport Santri
                    </h1>
                    <p className="page-subtitle">Pratinjau & cetak raport resmi santri</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                        disabled={!selectedSantri}
                    />
                    <button
                        className="btn btn-primary"
                        disabled={!selectedSantri}
                        onClick={() => window.open(`/raport/cetak/${filters.santri_id}/${filters.semester_id}`, '_blank')}
                    >
                        <Printer size={18} /> Cetak / Download Raport
                    </button>
                </div>
            </div>

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
                    <label className="form-label">Santri *</label>
                    <select
                        className="form-control"
                        value={filters.santri_id}
                        onChange={e => setFilters({ ...filters, santri_id: e.target.value })}
                    >
                        <option value="">Pilih Santri</option>
                        {santriList.map(s => (
                            <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>
                        ))}
                    </select>
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
                                musyrifName={selectedSantri?.musyrif_nama}
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
