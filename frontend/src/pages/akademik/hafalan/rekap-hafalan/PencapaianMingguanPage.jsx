import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Trophy, Users, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'
import '../input-hafalan/Hafalan.css'

const PencapaianMingguanPage = () => {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState([])

    // AUTO-FILTER: Halaqoh adalah ATRIBUT AKUN, bukan input user
    const {
        halaqohIds,
        halaqohNames,
        halaqohList,
        isLoading: loadingHalaqoh,
        hasHalaqoh,
        isAdmin,
        selectedHalaqohId,
        setSelectedHalaqohId
    } = useUserHalaqoh()

    const [filters, setFilters] = useState({
        minggu: 1,
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    const fetchData = async () => {
        if (!hasHalaqoh && !isAdmin) return
        setLoading(true)

        try {
            let query = supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('status', 'Aktif')
                .order('nama')

            // Filter: Gunakan selectedHalaqohId jika ada
            if (selectedHalaqohId) {
                query = query.eq('halaqoh_id', selectedHalaqohId)
            } else if (!isAdmin && halaqohIds.length > 0) {
                // Fallback
                query = query.in('halaqoh_id', halaqohIds)
            } else if (!isAdmin && halaqohIds.length === 0) {
                // No access
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
        if (!loadingHalaqoh) fetchData()
    }, [selectedHalaqohId, halaqohIds, loadingHalaqoh, filters.minggu, filters.bulan])

    if (loadingHalaqoh) {
        return <div className="loading-state"><RefreshCw className="spin" size={24} /> Memuat data...</div>
    }

    if (!hasHalaqoh && !isAdmin) {
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
                        <Trophy className="title-icon green" /> Pencapaian Hafalan Mingguan
                    </h1>
                    <p className="page-subtitle">Rekap pencapaian hafalan per minggu</p>
                </div>
            </div>

            <div className="filters-bar">
                {/* HALAQOH FILTER */}
                {halaqohList.length > 1 || isAdmin ? (
                    <select
                        value={selectedHalaqohId}
                        onChange={(e) => setSelectedHalaqohId(e.target.value)}
                        style={{ padding: '8px 16px', borderRadius: '6px', minWidth: '200px' }}
                    >
                        {/* Default option handled by hook or generic "Semua" for Admin? 
                             Let's enforce selection for simplicity unless Admin specifically wants "All". 
                             Hook defaults to first. If logic allows "All" (null ID), we add option here.
                             Existing fetch logic supports specific ID only if selectedHalaqohId is set. 
                             Let's stick to simple selection for now. */}
                        {isAdmin && <option value="">Semua Halaqoh</option>}
                        {halaqohList.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={halaqohNames || 'Memuat...'}
                        disabled
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed', padding: '8px 16px', borderRadius: '6px' }}
                    />
                )}

                <select
                    value={filters.minggu}
                    onChange={e => setFilters({ ...filters, minggu: parseInt(e.target.value) })}
                >
                    <option value={1}>Minggu 1</option>
                    <option value={2}>Minggu 2</option>
                    <option value={3}>Minggu 3</option>
                    <option value={4}>Minggu 4</option>
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
                                        <th>Target (Ayat)</th>
                                        <th>Tercapai</th>
                                        <th>Persentase</th>
                                        <th>Status</th>
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
                                            <td><span className="badge badge-pending">Belum Ada Data</span></td>
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

export default PencapaianMingguanPage
