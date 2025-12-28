import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Trophy, Users } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import '../input-hafalan/Hafalan.css'

const PencapaianBulananPage = () => {
    const [loading, setLoading] = useState(false)
    const [halaqoh, setHalaqoh] = useState([])
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        halaqoh_id: '',
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    useEffect(() => {
        fetchHalaqoh()
    }, [])

    const fetchHalaqoh = async () => {
        const { data } = await supabase.from('halaqoh').select('*').order('nama_halaqoh')
        if (data) setHalaqoh(data)
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
    }, [filters.halaqoh_id, filters.bulan])

    return (
        <div className="hafalan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Trophy className="title-icon blue" /> Pencapaian Hafalan Bulanan
                    </h1>
                    <p className="page-subtitle">Rekap pencapaian hafalan per bulan</p>
                </div>
            </div>

            <div className="filters-bar">
                <select
                    value={filters.halaqoh_id}
                    onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                >
                    <option value="">Pilih Halaqoh</option>
                    {halaqoh.map(h => (
                        <option key={h.id} value={h.id}>{h.nama_halaqoh}</option>
                    ))}
                </select>

                <select
                    value={filters.bulan}
                    onChange={e => setFilters({ ...filters, bulan: parseInt(e.target.value) })}
                >
                    {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                            {new Date(2024, i).toLocaleDateString('id-ID', { month: 'long' })}
                        </option>
                    ))}
                </select>

                <input
                    type="number"
                    value={filters.tahun}
                    onChange={e => setFilters({ ...filters, tahun: parseInt(e.target.value) })}
                    min="2020"
                    max="2030"
                    style={{ width: '100px' }}
                />
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
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th>Target Bulanan</th>
                                    <th>Tercapai</th>
                                    <th>Persentase</th>
                                    <th>Trend</th>
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PencapaianBulananPage
