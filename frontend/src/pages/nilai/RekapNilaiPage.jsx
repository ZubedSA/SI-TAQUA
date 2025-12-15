import { useState, useEffect } from 'react'
import { Download, Printer, Search, RefreshCw, Users, TrendingUp, Award, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Nilai.css'

const RekapNilaiPage = () => {
    const [nilaiList, setNilaiList] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedKelas, setSelectedKelas] = useState('')
    const [selectedMapel, setSelectedMapel] = useState('')
    const [semester, setSemester] = useState('')
    const [kelasList, setKelasList] = useState([])
    const [semesterList, setSemesterList] = useState([])
    const [mapelList, setMapelList] = useState([])
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState({ totalSantri: 0, rataRata: 0, nilaiTertinggi: 0, nilaiTerendah: 0 })

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (semester) {
            fetchNilai()
        }
    }, [selectedKelas, selectedMapel, semester])

    const fetchOptions = async () => {
        try {
            const [kelasRes, semesterRes, mapelRes] = await Promise.all([
                supabase.from('kelas').select('id, nama').order('nama'),
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
                    santri:santri_id(id, nis, nama, kelas:kelas_id(id, nama)),
                    mapel:mapel_id(kode, nama)
                `)
                .eq('semester_id', semester)

            // Filter by mapel if selected
            if (selectedMapel) {
                query = query.eq('mapel_id', selectedMapel)
            }

            const { data, error } = await query
            if (error) throw error

            // Process data
            let result = data?.map(n => ({
                id: n.id,
                santri_id: n.santri?.id,
                nis: n.santri?.nis || '-',
                nama: n.santri?.nama || '-',
                kelas: n.santri?.kelas?.nama || '-',
                kelas_id: n.santri?.kelas?.id,
                mapel: n.mapel?.nama || '-',
                mapel_kode: n.mapel?.kode || '-',
                nilai: n.nilai_akhir || 0
            })) || []

            // Filter by kelas if selected
            if (selectedKelas) {
                result = result.filter(r => r.kelas_id === selectedKelas)
            }

            // Sort by nilai descending
            result.sort((a, b) => b.nilai - a.nilai)

            setNilaiList(result)

            // Calculate stats
            const totalSantri = result.length
            const rataRata = result.length > 0 ? result.reduce((sum, r) => sum + r.nilai, 0) / result.length : 0
            const nilaiTertinggi = result.length > 0 ? Math.max(...result.map(r => r.nilai)) : 0
            const nilaiTerendah = result.length > 0 ? Math.min(...result.map(r => r.nilai)) : 0

            setStats({ totalSantri, rataRata, nilaiTertinggi, nilaiTerendah })
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

    const getGrade = (nilai) => {
        if (nilai >= 90) return { grade: 'A', color: 'badge-success' }
        if (nilai >= 80) return { grade: 'B', color: 'badge-info' }
        if (nilai >= 70) return { grade: 'C', color: 'badge-warning' }
        return { grade: 'D', color: 'badge-error' }
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="rekap-nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Rekap Nilai</h1>
                    <p className="page-subtitle">Lihat rekap nilai seluruh santri</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={handlePrint}><Printer size={18} /> Cetak</button>
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
                    <label className="form-label">Mata Pelajaran</label>
                    <select className="form-control" value={selectedMapel} onChange={e => setSelectedMapel(e.target.value)}>
                        <option value="">Semua Mapel</option>
                        {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
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
                        <span className="stat-label">Total Data</span>
                    </div>
                </div>
                <div className="nilai-stat-card">
                    <div className="stat-icon-wrapper green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.rataRata.toFixed(1)}</span>
                        <span className="stat-label">Rata-rata</span>
                    </div>
                </div>
                <div className="nilai-stat-card">
                    <div className="stat-icon-wrapper gold">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.nilaiTertinggi.toFixed(0)}</span>
                        <span className="stat-label">Tertinggi</span>
                    </div>
                </div>
                <div className="nilai-stat-card">
                    <div className="stat-icon-wrapper purple">
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.nilaiTerendah.toFixed(0)}</span>
                        <span className="stat-label">Terendah</span>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Rekap Nilai ({filteredNilai.length} data)</h3>
                    <button className="btn btn-sm btn-secondary" onClick={fetchNilai}><RefreshCw size={14} /> Refresh</button>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>NIS</th>
                                <th>Nama Santri</th>
                                <th>Kelas</th>
                                <th>Mata Pelajaran</th>
                                <th style={{ textAlign: 'center' }}>Nilai</th>
                                <th style={{ textAlign: 'center' }}>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                            ) : filteredNilai.length === 0 ? (
                                <tr><td colSpan="7" className="text-center">Belum ada data nilai</td></tr>
                            ) : (
                                filteredNilai.map((item, idx) => {
                                    const { grade, color } = getGrade(item.nilai)
                                    return (
                                        <tr key={item.id}>
                                            <td>{idx + 1}</td>
                                            <td>{item.nis}</td>
                                            <td className="name-cell">{item.nama}</td>
                                            <td>{item.kelas}</td>
                                            <td>{item.mapel}</td>
                                            <td style={{ textAlign: 'center' }}><strong>{item.nilai.toFixed(0)}</strong></td>
                                            <td style={{ textAlign: 'center' }}><span className={`badge ${color}`}>{grade}</span></td>
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

