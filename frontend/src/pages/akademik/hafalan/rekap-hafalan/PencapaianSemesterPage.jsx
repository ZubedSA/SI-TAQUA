import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Trophy, Users } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import '../input-hafalan/Hafalan.css'

const PencapaianSemesterPage = () => {
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, halRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('halaqoh').select('id, nama').order('nama')
        ])
        if (semRes.data) setSemester(semRes.data)
        if (halRes.data) setHalaqoh(halRes.data)
    }

    const fetchData = async () => {
        if (!filters.halaqoh_id) return
        setLoading(true)
        const { data: santriData } = await supabase
            .from('santri')
            .select('id, nama, nis')
            .eq('halaqoh_id', filters.halaqoh_id)
            .eq('status', 'Aktif')
            .order('nama')
        if (santriData) setData(santriData)
        setLoading(false)
    }

    useEffect(() => {
        if (filters.halaqoh_id) fetchData()
    }, [filters.halaqoh_id, filters.semester_id])

    return (
        <div className="hafalan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Pencapaian Hafalan Semester
                    </h1>
                    <p className="page-subtitle">Rekap pencapaian hafalan per semester</p>
                </div>
            </div>

            <div className="filters-bar">
                <select
                    value={filters.semester_id}
                    onChange={e => setFilters({ ...filters, semester_id: e.target.value })}
                >
                    <option value="">Pilih Semester</option>
                    {semester.map(s => (
                        <option key={s.id} value={s.id}>{s.nama} - {s.tahun_ajaran}</option>
                    ))}
                </select>

                <select
                    value={filters.halaqoh_id}
                    onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                >
                    <option value="">Pilih Halaqoh</option>
                    {halaqoh.map(h => (
                        <option key={h.id} value={h.id}>{h.nama}</option>
                    ))}
                </select>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading-state">
                        <RefreshCw className="spin" size={24} />
                        <span>Memuat data...</span>
                    </div>
                ) : data.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Pilih halaqoh untuk melihat pencapaian santri</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>NIS</th>
                                        <th>Nama Santri</th>
                                        <th>Target Semester</th>
                                        <th>Hafalan Baru</th>
                                        <th>Murajaah</th>
                                        <th>Total Juz</th>
                                        <th>Persentase</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((s, i) => (
                                        <tr key={s.id}>
                                            <td>{i + 1}</td>
                                            <td>{s.nis}</td>
                                            <td>{s.nama}</td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td>-</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PencapaianSemesterPage
