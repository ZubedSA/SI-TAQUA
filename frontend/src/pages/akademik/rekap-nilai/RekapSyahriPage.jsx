import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Download, Calendar } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import ResponsiveTable from '../../../components/ui/ResponsiveTable'

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
                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                            { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                            { header: 'Hafalan', render: () => '-' },
                            { header: 'Tajwid', render: () => '-' },
                            { header: 'Kelancaran', render: () => '-' },
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
                                    <span className="text-gray-500">Hafalan:</span>
                                    <span className="font-semibold">-</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tajwid:</span>
                                    <span className="font-semibold">-</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Kelancaran:</span>
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

export default RekapSyahriPage
