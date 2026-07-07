import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Trophy, Users, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'
import SmartMonthYearFilter from '../../../../components/common/SmartMonthYearFilter'
import { useCalendar } from '../../../../context/CalendarContext'
import ResponsiveTable from '../../../../components/ui/ResponsiveTable'
import '../input-hafalan/Hafalan.css'

const PencapaianMingguanPage = () => {
    const { mode } = useCalendar()
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
        console.log('[PencapaianMingguan] Fetch triggered:', filters)
        console.log('[PencapaianMingguan] Calendar Mode:', mode)
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
                        Pencapaian Hafalan Mingguan
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

                <SmartMonthYearFilter
                    filters={filters}
                    onFilterChange={(newFilters) => {
                        console.log('[PencapaianMingguan] Filter changed:', newFilters)
                        setFilters(newFilters)
                    }}
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
                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                            { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                            { header: 'Target (Ayat)', render: () => '-', className: 'text-center' },
                            { header: 'Tercapai', render: () => '-', className: 'text-center' },
                            { header: 'Persentase', render: () => '-', className: 'text-center' },
                            { header: 'Status', render: () => <span className="badge badge-pending">Belum Ada Data</span>, className: 'text-center' }
                        ]}
                        data={data}
                        loading={loading}
                        emptyState={<div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Tidak ada data santri</div>}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={(row) => (
                            <div className="flex flex-col gap-2 w-full mt-2 pt-2 border-t border-gray-100">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500">Target (Ayat)</span>
                                        <span className="font-medium">-</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500">Tercapai</span>
                                        <span className="font-medium">-</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500">Persentase</span>
                                        <span className="font-medium">-</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500">Status</span>
                                        <span className="badge badge-pending w-fit text-xs px-2 py-0.5">Belum Ada Data</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    )
}

export default PencapaianMingguanPage
