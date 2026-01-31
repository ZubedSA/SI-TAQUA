import { useState, useEffect } from 'react'
import { Users, RefreshCw, Download, Printer, BookMarked, FileText, Calendar } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import DownloadButton from '../../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../../utils/exportUtils'
import { useCalendar } from '../../../../../context/CalendarContext'
import DateDisplay from '../../../../../components/common/DateDisplay'
import '../../../../../pages/laporan/Laporan.css'

const LaporanAkademikSantriPage = () => {
    const { formatDate } = useCalendar()
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanData, setHafalanData] = useState([])
    const [nilaiTahfizh, setNilaiTahfizh] = useState(null)
    const [nilaiMadros, setNilaiMadros] = useState([])
    const [presensiData, setPresensiData] = useState({ pulang: 0, izin: 0, sakit: 0, alpha: 0 })
    const [filters, setFilters] = useState({
        semester_id: '',
        santri_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

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
            setSelectedSantri(selected)

            // --- 1. Fetch Hafalan Progress (Keep existing logic) ---
            const { data: hafalan } = await supabase
                .from('hafalan')
                .select('juz, juz_mulai, status, tanggal')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            const juzProgress = {}
            hafalan?.forEach(h => {
                const juz = h.juz_mulai || h.juz
                if (!juzProgress[juz] || h.status === 'Lancar') {
                    juzProgress[juz] = {
                        juz,
                        status: h.status,
                        tanggal: h.tanggal
                    }
                }
            })
            setHafalanData(Object.values(juzProgress).sort((a, b) => a.juz - b.juz))

            // --- 2. Fetch Madrosiyah Mapels (for Madrasah grades) ---
            const { data: allMapels } = await supabase
                .from('mapel')
                .select('*')
                .eq('kategori', 'Madrosiyah')
                .order('nama', { ascending: true })
            const expectedMapels = allMapels || []

            // --- 3. Fetch All Grades for Semester ---
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select(`
                    *,
                    mapel:mapel_id(nama, kode)
                `)
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)

            // --- 4. Process Logic (Same as CetakRaport) ---
            const typePriority = { 'semester': 4, 'uas': 3, 'uts': 2, 'harian': 1 }

            const getBestGrade = (grades) => {
                if (!grades || grades.length === 0) return null
                return grades.reduce((prev, current) => {
                    const prevP = typePriority[prev.jenis_ujian] || 0
                    const currP = typePriority[current.jenis_ujian] || 0
                    if (currP > prevP) return current
                    if (currP === prevP) {
                        return (current.nilai_akhir || 0) > (prev.nilai_akhir || 0) ? current : prev
                    }
                    return prev
                })
            }

            // A. Process Madrasah
            let madrasahList = expectedMapels.map(mapel => {
                const mapelGrades = nilaiData?.filter(n => n.mapel_id === mapel.id) || []
                const bestGrade = getBestGrade(mapelGrades)

                // Exclude if no grade found (User Request: Only show mapels with input)
                if (!bestGrade) return null

                // Exclude Tahfizh/Quran from Madrasah list
                if (mapel.nama.toLowerCase().includes('tahfizh') || mapel.nama.toLowerCase().includes('quran')) {
                    return null
                }

                // Format to match CetakRaport (RaportTemplate expects mapel.nama and nilai_akhir)
                return {
                    mapel: { nama: mapel.nama },
                    nilai_akhir: bestGrade.nilai_akhir,
                    predikat: getPredikat(bestGrade.nilai_akhir)
                }
            }).filter(Boolean)
            setNilaiMadros(madrasahList)

            // B. Process Tahfizh (Decomposition)
            const tahfizhRecords = nilaiData?.filter(n => {
                const isCatTahfizh = n.kategori === 'Tahfizhiyah'
                const isNameTahfizh = n.mapel?.nama?.toLowerCase().includes('tahfizh') || n.mapel?.nama?.toLowerCase().includes('quran')
                return isCatTahfizh || isNameTahfizh
            }) || []

            const bestTahfizhRecord = getBestGrade(tahfizhRecords)

            // Transform for UI - We need to supply 'nilaiTahfizh' state which expects an object or array?
            // Existing UI expects 'nilaiTahfizh' object with keys like nilai_hafalan. 
            // BUT we want to show rows. Let's change state structure.
            // For now, let's keep the single object structure if possible OR update state.
            // Let's update state to hold the 'rows' directly.

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

                // If empty but has mapel name
                if (tahfizhRows.length === 0 && bestTahfizhRecord.mapel?.nama) {
                    tahfizhRows.push({
                        mapel: { nama: bestTahfizhRecord.mapel.nama },
                        nilai_akhir: bestTahfizhRecord.nilai_akhir,
                        predikat: getPredikat(bestTahfizhRecord.nilai_akhir)
                    })
                }
            }
            setNilaiTahfizh(tahfizhRows.length > 0 ? tahfizhRows : null)

            // --- 5. Fetch Presensi data ---
            const { data: perilakuData } = await supabase
                .from('perilaku_semester')
                .select('*')
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)
                .single()

            if (perilakuData) {
                setPresensiData({
                    pulang: perilakuData.pulang ?? 0,
                    sakit: perilakuData.sakit ?? 0,
                    izin: perilakuData.izin ?? 0,
                    alpha: perilakuData.alpha ?? 0,
                    hadir: perilakuData.hadir ?? 0
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

    useEffect(() => {
        if (filters.santri_id && filters.semester_id) {
            fetchSantriReport(filters.santri_id)
        }
    }, [filters.santri_id, filters.semester_id])

    const getPredikat = (nilai) => {
        if (!nilai && nilai !== 0) return '-'
        if (nilai >= 90) return 'A'
        if (nilai >= 80) return 'B'
        if (nilai >= 70) return 'C'
        if (nilai >= 60) return 'D'
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
            'Nilai Tahfizh Avg': nilaiTahfizh?.nilai_akhir?.toFixed(1) || '-',
            // Calculate Madros Avg from displayed table if needed, or just list subjects?
            // For summary, maybe just list average of averages or leave strict detail to PDF.
            // Let's output Presensi:
            'Hadir': presensiData.hadir,
            'Izin': presensiData.izin,
            'Sakit': presensiData.sakit,
            'Alpha': presensiData.alpha,
        }]

        // Flatten Nilai Madros as columns? e.g. "Mapel X": 80
        nilaiMadros.forEach(m => {
            exportData[0][`Nilai ${m.mapel?.nama || m.nama}`] = m.nilai_akhir ?? m.rata_rata
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
            'Nilai Tahfizh Avg': nilaiTahfizh?.nilai_akhir?.toFixed(1) || '-',
            'Hadir': presensiData.hadir,
            'Izin': presensiData.izin,
            'Sakit': presensiData.sakit,
            'Alpha': presensiData.alpha,
        }]

        nilaiMadros.forEach(m => {
            exportData[0][`Nilai ${m.mapel?.nama || m.nama}`] = m.nilai_akhir ?? m.rata_rata
        })

        const columns = Object.keys(exportData[0])
        exportToCSV(exportData, columns, `laporan_akademik_${selectedSantri.nama.replace(/\s/g, '_')}`)
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Laporan Akademik Santri
                    </h1>
                    <p className="page-subtitle">Laporan lengkap per santri</p>
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

            <div className="card">
                {loading ? (
                    <div className="loading-state">
                        <RefreshCw className="spin" size={24} />
                        <span>Memuat data...</span>
                    </div>
                ) : !selectedSantri ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Pilih santri untuk melihat laporan akademik</p>
                    </div>
                ) : (
                    <div className="laporan-akademik-content">
                        {/* Santri Profile */}
                        <div className="santri-profile" style={{
                            padding: '24px',
                            background: 'var(--bg-light)',
                            borderRadius: '12px',
                            marginBottom: '24px'
                        }}>
                            <h2>{selectedSantri.nama}</h2>
                            <p>NIS: {selectedSantri.nis}</p>
                            <p>Kelas: {selectedSantri.kelas?.nama || '-'} | Halaqoh: {selectedSantri.halaqoh?.nama || '-'}</p>
                        </div>

                        <div className="laporan-sections" style={{ display: 'grid', gap: '24px' }}>
                            {/* Hafalan Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookMarked size={20} /> Progress Hafalan
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Juz</th>
                                            <th>Status</th>
                                            <th>Tanggal Terakhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hafalanData.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    Belum ada data hafalan
                                                </td>
                                            </tr>
                                        ) : (
                                            hafalanData.map((h, i) => (
                                                <tr key={i}>
                                                    <td>Juz {h.juz}</td>
                                                    <td>
                                                        <span className={`badge ${h.status === 'Lancar' ? 'badge-success' : h.status === 'Sedang' ? 'badge-warning' : 'badge-danger'}`}>
                                                            {h.status}
                                                        </span>
                                                    </td>
                                                    <td><DateDisplay date={h.tanggal} /></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Nilai Tahfizh Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={20} /> Nilai Tahfizhiyah (Semester)
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Komponen</th>
                                            <th style={{ textAlign: 'center' }}>Nilai</th>
                                            <th style={{ textAlign: 'center' }}>Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!nilaiTahfizh || nilaiTahfizh.length === 0) ? (
                                            <tr><td colSpan="3" className="text-center text-gray-500">Belum ada data nilai tahfizh</td></tr>
                                        ) : (
                                            nilaiTahfizh.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td>{row.mapel?.nama || row.komponen}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.nilai_akhir ?? row.nilai ?? '-'}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.predikat}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Nilai Madros Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={20} /> Nilai Madrosiyah
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mapel</th>
                                            <th style={{ textAlign: 'center' }}>Nilai Akhir</th>
                                            <th style={{ textAlign: 'center' }}>Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiMadros.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    Belum ada data nilai
                                                </td>
                                            </tr>
                                        ) : (
                                            nilaiMadros.map((m, i) => (
                                                <tr key={i}>
                                                    <td>{m.mapel?.nama || m.nama}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{m.nilai_akhir ?? m.rata_rata}</td>
                                                    <td style={{ textAlign: 'center' }}>{m.predikat}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Kehadiran Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={20} /> Kehadiran Semester Ini
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.pulang}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Pulang</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.izin}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Izin</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.sakit}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Sakit</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.alpha}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Alpha</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LaporanAkademikSantriPage
