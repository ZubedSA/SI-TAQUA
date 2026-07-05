import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Download, Calendar } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

import '../shared/styles/Nilai.css'

const RekapSyahriPage = () => {
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: '',
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, halRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('halaqoh').select('*').order('nama')
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
    }, [filters.halaqoh_id, filters.bulan])

    const bulanOptions = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
        { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
    ]

    return (
        <div className="nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FileText className="title-icon green" /> Rekap Nilai Syahri
                    </h1>
                    <p className="page-subtitle">Rekap nilai ujian bulanan (Syahri)</p>
                </div>
                <button className="btn btn-outline" disabled={data.length === 0}>
                    <Download size={18} /> Export PDF
                </button>
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

                <select
                    value={filters.bulan}
                    onChange={e => setFilters({ ...filters, bulan: parseInt(e.target.value) })}
                >
                    {bulanOptions.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
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
                        <Calendar size={48} />
                        <p>Pilih halaqoh untuk melihat rekap nilai</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th>Hafalan</th>
                                    <th>Tajwid</th>
                                    <th>Kelancaran</th>
                                    <th>Rata-rata</th>
                                    <th>Predikat</th>
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
                )}
            </div>
        </div>
    )
}

export default RekapSyahriPage
