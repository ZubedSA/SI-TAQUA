import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Download, Calendar } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import ResponsiveTable from '../../../components/ui/ResponsiveTable'
import '../shared/styles/Nilai.css'

const RekapSemesterPage = () => {
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [kelas, setKelas] = useState([])
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: '',
        kelas_id: '',
        jenis: 'tahfizh' // 'tahfizh' or 'madros'
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, halRes, kelRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('halaqoh').select('*').order('nama'),
            supabase.from('kelas').select('*').order('nama_kelas')
        ])
        if (semRes.data) setSemester(semRes.data)
        if (halRes.data) setHalaqoh(halRes.data)
        if (kelRes.data) setKelas(kelRes.data)
    }

    const fetchData = async () => {
        setLoading(true)
        let query = supabase
            .from('santri')
            .select('id, nama, nis')
            .eq('status', 'Aktif')
            .order('nama')

        if (filters.jenis === 'tahfizh' && filters.halaqoh_id) {
            query = query.eq('halaqoh_id', filters.halaqoh_id)
        } else if (filters.jenis === 'madros' && filters.kelas_id) {
            query = query.eq('kelas_id', filters.kelas_id)
        } else {
            setData([])
            setLoading(false)
            return
        }

        const { data: santriData } = await query
        if (santriData) setData(santriData)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [filters.halaqoh_id, filters.kelas_id, filters.jenis])

    return (
        <div className="nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FileText className="title-icon blue" /> Rekap Nilai Semester
                    </h1>
                    <p className="page-subtitle">Rekap nilai ujian semester</p>
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
                    value={filters.jenis}
                    onChange={e => setFilters({ ...filters, jenis: e.target.value })}
                >
                    <option value="tahfizh">Tahfizhiyah</option>
                    <option value="madros">Madrosiyah</option>
                </select>

                {filters.jenis === 'tahfizh' ? (
                    <select
                        value={filters.halaqoh_id}
                        onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                    >
                        <option value="">Pilih Halaqoh</option>
                        {halaqoh.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                        ))}
                    </select>
                ) : (
                    <select
                        value={filters.kelas_id}
                        onChange={e => setFilters({ ...filters, kelas_id: e.target.value })}
                    >
                        <option value="">Pilih Kelas</option>
                        {kelas.map(k => (
                            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                        ))}
                    </select>
                )}
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
                        <p>Pilih filter untuk melihat rekap nilai</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                            { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                            { header: 'UTS', render: () => '-' },
                            { header: 'UAS', render: () => '-' },
                            { header: 'Rata-rata', render: () => '-' },
                            { header: 'Predikat', render: () => '-' }
                        ]}
                        data={data}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={() => (
                            <div className="flex flex-col gap-1 w-full text-xs mt-2 pt-2 border-t border-gray-100">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">UTS:</span>
                                    <span className="font-semibold">-</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">UAS:</span>
                                    <span className="font-semibold">-</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-50 pt-1 mt-0.5">
                                    <span className="text-gray-500 font-medium">Rata-rata:</span>
                                    <span className="font-bold">-</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Predikat:</span>
                                    <span className="font-semibold">-</span>
                                </div>
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    )
}

export default RekapSemesterPage
