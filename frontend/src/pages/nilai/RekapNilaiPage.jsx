import { useState, useEffect } from 'react'
import { Download, Printer, Search, RefreshCw, Users, TrendingUp, Award, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Nilai.css'

const RekapNilaiPage = () => {
    const [nilaiList, setNilaiList] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedKelas, setSelectedKelas] = useState('')
    const [semester, setSemester] = useState('')
    const [kelasList, setKelasList] = useState([])
    const [semesterList, setSemesterList] = useState([])
    const [mapelList, setMapelList] = useState([])
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState({ totalSantri: 0, rataRata: 0, nilaiTertinggi: 0, totalMapel: 0 })

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (semester) {
            fetchNilai()
        }
    }, [selectedKelas, semester])

    const fetchOptions = async () => {
        try {
            const [kelasRes, semesterRes, mapelRes] = await Promise.all([
                supabase.from('kelas').select('id, nama').order('tingkat').order('nama'),
                supabase.from('semester').select('id, nama, tahun_ajaran, is_active').order('is_active', { ascending: false }),
                supabase.from('mapel').select('id, kode, nama').order('nama')
            ])
            setKelasList(kelasRes.data || [])
            setSemesterList(semesterRes.data || [])
            setMapelList(mapelRes.data || [])

            const activeSem = semesterRes.data?.find(s => s.is_active)
            if (activeSem) setSemester(activeSem.id)
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchNilai = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('nilai')
                .select(`
          *,
          santri:santri_id(id, nis, nama, kelas:kelas_id(nama)),
          mapel:mapel_id(kode, nama)
        `)
                .eq('semester_id', semester)

            const { data, error } = await query
            if (error) throw error

            // Group by santri
            const santriMap = {}
            const mapelUsed = new Set()

            data?.forEach(n => {
                const santriId = n.santri?.id
                if (!santriId) return

                // Filter by kelas if selected
                if (selectedKelas && n.santri?.kelas?.nama) {
                    const kelasData = kelasList.find(k => k.id === selectedKelas)
                    if (kelasData && n.santri.kelas.nama !== kelasData.nama) return
                }

                if (!santriMap[santriId]) {
                    santriMap[santriId] = {
                        id: santriId,
                        nis: n.santri.nis,
                        nama: n.santri.nama,
                        kelas: n.santri.kelas?.nama || '-',
                        nilai: {},
                        total: 0,
                        count: 0
                    }
                }
                santriMap[santriId].nilai[n.mapel?.kode] = n.nilai_akhir
                santriMap[santriId].total += n.nilai_akhir || 0
                santriMap[santriId].count++
                if (n.mapel?.kode) mapelUsed.add(n.mapel.kode)
            })

            // Calculate averages
            const result = Object.values(santriMap).map(s => ({
                ...s,
                avg: s.count > 0 ? (s.total / s.count) : 0
            }))

            // Sort by average descending
            result.sort((a, b) => b.avg - a.avg)

            setNilaiList(result)

            // Calculate stats
            const totalSantri = result.length
            const rataRata = result.length > 0 ? result.reduce((sum, r) => sum + r.avg, 0) / result.length : 0
            const nilaiTertinggi = result.length > 0 ? Math.max(...result.map(r => r.avg)) : 0
            const totalMapel = mapelUsed.size

            setStats({ totalSantri, rataRata, nilaiTertinggi, totalMapel })
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredNilai = nilaiList.filter(n =>
        n.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.nis?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getGrade = (avg) => {
        if (avg >= 90) return { grade: 'A', color: 'badge-success' }
        if (avg >= 80) return { grade: 'B', color: 'badge-info' }
        if (avg >= 70) return { grade: 'C', color: 'badge-warning' }
        return { grade: 'D', color: 'badge-error' }
    }

    // Get top 4 mapel for display
    const displayMapel = mapelList.slice(0, 4)

    return (
        <div className="rekap-nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Rekap Nilai</h1>
                    <p className="page-subtitle">Lihat rekap nilai seluruh santri</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary"><Printer size={18} /> Cetak</button>
                    <button className="btn btn-primary"><Download size={18} /> Export</button>
                </div>
            </div>

            <div className="filter-section">
                <div className="form-group">
                    <label className="form-label">Kelas</label>
                    <select className="form-control" value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}>
                        <option value="">Semua Kelas</option>
                        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select className="form-control" value={semester} onChange={e => setSemester(e.target.value)}>
                        <option value="">Pilih Semester</option>
                        {semesterList.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nama} {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Cari Santri</label>
                    <input type="text" className="form-control" placeholder="Nama/NIS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Mini Dashboard */}
            <div className="nilai-stats">
                <div className="nilai-stat-card">
                    <div className="stat-icon-wrapper blue">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalSantri}</span>
                        <span className="stat-label">Total Santri</span>
                    </div>
                </div>
                <div className="nilai-stat-card">
                    <div className="stat-icon-wrapper green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.rataRata.toFixed(1)}</span>
                        <span className="stat-label">Rata-rata Nilai</span>
                    </div>
                </div>
                <div className="nilai-stat-card">
                    <div className="stat-icon-wrapper gold">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.nilaiTertinggi.toFixed(1)}</span>
                        <span className="stat-label">Nilai Tertinggi</span>
                    </div>
                </div>
                <div className="nilai-stat-card">
                    <div className="stat-icon-wrapper purple">
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalMapel}</span>
                        <span className="stat-label">Mata Pelajaran</span>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Rekap Nilai ({filteredNilai.length} santri)</h3>
                    <button className="btn btn-sm btn-secondary" onClick={fetchNilai}><RefreshCw size={14} /> Refresh</button>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>NIS</th>
                                <th>Nama</th>
                                <th>Kelas</th>
                                {displayMapel.map(m => <th key={m.id}>{m.kode}</th>)}
                                <th>Rata-rata</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8 + displayMapel.length} className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                            ) : filteredNilai.length === 0 ? (
                                <tr><td colSpan={8 + displayMapel.length} className="text-center">Belum ada data nilai</td></tr>
                            ) : (
                                filteredNilai.map((item, idx) => {
                                    const { grade, color } = getGrade(item.avg)
                                    return (
                                        <tr key={item.id}>
                                            <td><span className="rank-badge">{idx + 1}</span></td>
                                            <td>{item.nis}</td>
                                            <td className="name-cell">{item.nama}</td>
                                            <td>{item.kelas}</td>
                                            {displayMapel.map(m => (
                                                <td key={m.id}>{item.nilai[m.kode]?.toFixed(0) || '-'}</td>
                                            ))}
                                            <td><strong>{item.avg.toFixed(2)}</strong></td>
                                            <td><span className={`badge ${color}`}>{grade}</span></td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default RekapNilaiPage
