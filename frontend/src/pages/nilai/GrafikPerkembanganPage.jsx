import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, Users, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Nilai.css'

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
                        <BarChart3 className="title-icon purple" /> Grafik Perkembangan
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
                            <table className="data-table" style={{ marginTop: '12px' }}>
                                <thead>
                                    <tr>
                                        <th>Semester</th>
                                        <th>Tahfizhiyah</th>
                                        <th>Madrosiyah</th>
                                        <th>Rata-rata</th>
                                        <th>Ranking</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {semester.slice(0, 4).map(s => (
                                        <tr key={s.id}>
                                            <td>{s.nama} {s.tahun_ajaran}</td>
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

export default GrafikPerkembanganPage
