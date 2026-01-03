import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Trophy, Users, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useUserHalaqoh } from '../../hooks/features/useUserHalaqoh'
import './Hafalan.css'

const PencapaianBulananPage = () => {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState([])

    // Gunakan hook untuk halaqoh yang difilter berdasarkan user
    const { halaqohList, isLoading: loadingHalaqoh, hasHalaqoh, isSingleHalaqoh, selectedHalaqoh, setSelectedHalaqoh } = useUserHalaqoh()

    const [filters, setFilters] = useState({
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    const fetchData = async () => {
        if (!selectedHalaqoh) return
        setLoading(true)
        const { data: santriData } = await supabase
            .from('santri')
            .select('id, nama, nis')
            .eq('halaqoh_id', selectedHalaqoh)
            .eq('status', 'Aktif')
            .order('nama')
        if (santriData) setData(santriData)
        setLoading(false)
    }

    useEffect(() => {
        if (selectedHalaqoh) fetchData()
    }, [selectedHalaqoh, filters.bulan])

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
                {loadingHalaqoh ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} className="spin" /> Memuat halaqoh...
                    </div>
                ) : !hasHalaqoh ? (
                    <div className="alert alert-warning">
                        <AlertCircle size={16} />
                        <span>Akun Anda belum terhubung dengan halaqoh. Hubungi admin.</span>
                    </div>
                ) : (
                    <select
                        value={selectedHalaqoh}
                        onChange={e => setSelectedHalaqoh(e.target.value)}
                        disabled={isSingleHalaqoh}
                    >
                        {!isSingleHalaqoh && <option value="">Pilih Halaqoh</option>}
                        {halaqohList.map(h => (
                            <option key={h.id} value={h.id}>{h.nama_halaqoh || h.nama}</option>
                        ))}
                    </select>
                )}

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
