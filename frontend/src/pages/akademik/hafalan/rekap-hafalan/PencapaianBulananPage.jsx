import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Trophy, Users, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'
import '../input-hafalan/Hafalan.css'

const PencapaianBulananPage = () => {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState([])

    // AUTO-FILTER: Halaqoh adalah ATRIBUT AKUN, bukan input user
    const { halaqohIds, halaqohNames, isLoading: loadingHalaqoh, hasHalaqoh, isAdmin } = useUserHalaqoh()

    const [filters, setFilters] = useState({
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    const fetchData = async () => {
        if (!hasHalaqoh) return
        setLoading(true)

        try {
            let query = supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('status', 'Aktif')
                .order('nama')

            if (!isAdmin && halaqohIds.length > 0) {
                query = query.in('halaqoh_id', halaqohIds)
            } else if (!isAdmin && halaqohIds.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const { data: santriData } = await query
            setData(santriData || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!loadingHalaqoh && hasHalaqoh) fetchData()
    }, [halaqohIds, loadingHalaqoh, filters.bulan])

    if (loadingHalaqoh) {
        return <div className="loading-state"><RefreshCw className="spin" size={24} /> Memuat data...</div>
    }

    if (!hasHalaqoh) {
        return (
            <div className="hafalan-page">
                <div className="alert alert-warning" style={{ maxWidth: '600px', margin: '40px auto' }}>
                    <AlertCircle size={24} />
                    <div>
                        <strong>Akses Dibatasi</strong>
                        <p>Akun Anda belum terhubung dengan halaqoh. Hubungi admin.</p>
                    </div>
                </div>
            </div>
        )
    }

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
                {/* HALAQOH INFO - Read-only */}
                <input
                    type="text"
                    value={isAdmin ? 'Semua Halaqoh (Admin)' : (halaqohNames || 'Memuat...')}
                    disabled
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed', padding: '8px 16px', borderRadius: '6px' }}
                />

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
                        <p>Tidak ada data santri</p>
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
                    </div>
                )}
            </div>
        </div>
    )
}

export default PencapaianBulananPage
