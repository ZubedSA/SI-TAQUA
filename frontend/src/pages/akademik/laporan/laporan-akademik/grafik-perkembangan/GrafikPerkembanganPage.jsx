import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, Users, Calendar } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import ResponsiveTable from '../../../../../components/ui/ResponsiveTable'
import '../../../shared/styles/Nilai.css'

const GrafikPerkembanganPage = () => {
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [santri, setSantri] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [filters, setFilters] = useState({
        santri_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, santriRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('santri').select('id, nama, nis').eq('status', 'Aktif').order('nama')
        ])
        if (semRes.data) setSemester(semRes.data)
        if (santriRes.data) setSantri(santriRes.data)
    }

    const handleSelectSantri = (santriId) => {
        const selected = santri.find(s => s.id === santriId)
        setSelectedSantri(selected)
        setFilters({ ...filters, santri_id: santriId })
    }

    return (
        <div className="nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Grafik Perkembangan
                    </h1>
                    <p className="page-subtitle">Grafik perkembangan nilai santri</p>
                </div>
            </div>

            <div className="filters-bar">
                <select
                    value={filters.santri_id}
                    onChange={e => handleSelectSantri(e.target.value)}
                >
                    <option value="">Pilih Santri</option>
                    {santri.map(s => (
                        <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>
                    ))}
                </select>
            </div>

            <div className="card">
                {!selectedSantri ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Pilih santri untuk melihat grafik perkembangan</p>
                    </div>
                ) : (
                    <div>
                        <div className="santri-info-card" style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-light)', borderRadius: '12px' }}>
                            <h3>{selectedSantri.nama}</h3>
                            <p>NIS: {selectedSantri.nis}</p>
                        </div>

                        <div className="chart-placeholder" style={{
                            height: '400px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-light)',
                            borderRadius: '12px',
                            border: '2px dashed var(--border-color)'
                        }}>
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                <BarChart3 size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <p>Grafik Perkembangan Nilai</p>
                                <small>Fitur visualisasi grafik akan segera tersedia</small>
                            </div>
                        </div>

                        <div className="rekap-table" style={{ marginTop: '24px' }}>
                            <h4>Rekap Nilai Per Semester</h4>
                            <ResponsiveTable
                                columns={[
                                    { header: 'Semester', render: (row) => `${row.nama} ${row.tahun_ajaran}`, className: 'font-medium' },
                                    { header: 'Tahfizhiyah', render: () => '-', className: 'text-center' },
                                    { header: 'Madrosiyah', render: () => '-', className: 'text-center' },
                                    { header: 'Rata-rata', render: () => '-', className: 'text-center' },
                                    { header: 'Ranking', render: () => '-', className: 'text-center' }
                                ]}
                                data={semester.slice(0, 4)}
                                emptyState={<div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Belum ada data semester</div>}
                                mobileCardHeader={(row) => <span className="font-bold text-[#0A2619]">{row.nama} {row.tahun_ajaran}</span>}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default GrafikPerkembanganPage
