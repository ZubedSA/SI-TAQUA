import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Download, Printer, Users } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import { generateLaporanPDF } from '../../../../../utils/pdfGenerator'
import '../../../../../pages/laporan/Laporan.css'

const LaporanUjianSemesterPage = () => {
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, halRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('halaqoh').select('id, nama').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (halRes.data) setHalaqoh(halRes.data)
    }

    const fetchData = async () => {
        if (!filters.halaqoh_id || !filters.semester_id) return
        setLoading(true)

        try {
            // Get santri in this halaqoh
            const { data: santriData } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', filters.halaqoh_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (!santriData || santriData.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const santriIds = santriData.map(s => s.id)

            // Get nilai data for this semester and jenis_ujian = semester
            const { data: nilaiData } = await supabase
                .from('nilai')
                .select('*')
                .in('santri_id', santriIds)
                .eq('semester_id', filters.semester_id)
                .eq('jenis_ujian', 'semester')
                .eq('kategori', 'Tahfizhiyah')

            // Map nilai to santri
            const result = santriData.map(santri => {
                const nilai = nilaiData?.find(n => n.santri_id === santri.id)
                const hafalan = nilai?.nilai_hafalan || 0
                const murajaah = nilai?.nilai_murajaah || 0
                const tajwid = nilai?.nilai_tajwid || 0
                const kelancaran = nilai?.nilai_kelancaran || 0
                const rataRata = nilai ? ((hafalan + murajaah + tajwid + kelancaran) / 4) : 0

                let predikat = '-'
                if (nilai) {
                    if (rataRata >= 90) predikat = 'A (Mumtaz)'
                    else if (rataRata >= 80) predikat = 'B (Jayyid Jiddan)'
                    else if (rataRata >= 70) predikat = 'C (Jayyid)'
                    else if (rataRata >= 60) predikat = 'D (Maqbul)'
                    else predikat = 'E (Rasib)'
                }

                return {
                    ...santri,
                    hafalan: nilai ? hafalan : '-',
                    murajaah: nilai ? murajaah : '-',
                    tajwid: nilai ? tajwid : '-',
                    kelancaran: nilai ? kelancaran : '-',
                    rata_rata: nilai ? rataRata.toFixed(1) : '-',
                    predikat
                }
            })

            setData(result)
        } catch (err) {
            console.error('Error fetching data:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.halaqoh_id && filters.semester_id) fetchData()
    }, [filters.halaqoh_id, filters.semester_id])

    const getPredikatBadgeClass = (predikat) => {
        if (predikat.startsWith('A')) return 'badge-success'
        if (predikat.startsWith('B')) return 'badge-info'
        if (predikat.startsWith('C')) return 'badge-warning'
        if (predikat.startsWith('D')) return 'badge-warning'
        if (predikat.startsWith('E')) return 'badge-danger'
        return ''
    }

    const generatePDF = async () => {
        if (data.length === 0) return

        const selectedHalaqoh = halaqoh.find(h => h.id === filters.halaqoh_id)
        const currentSem = semester.find(s => s.id === filters.semester_id)

        await generateLaporanPDF({
            title: 'LAPORAN UJIAN SEMESTER TAHFIZHIYAH',
            subtitle: 'Laporan Hasil Ujian Semester Tahfizh',
            additionalInfo: [
                { label: 'Halaqoh', value: selectedHalaqoh?.nama || '-' },
                { label: 'Semester', value: `${currentSem?.nama || '-'} - ${currentSem?.tahun_ajaran || '-'}` }
            ],
            columns: ['NIS', 'Nama', 'Hafalan', 'Murajaah', 'Tajwid', 'Kelancaran', 'Rata-rata', 'Predikat'],
            data: data.map(s => [
                s.nis,
                s.nama,
                s.hafalan,
                s.murajaah,
                s.tajwid,
                s.kelancaran,
                s.rata_rata,
                s.predikat
            ]),
            filename: `Ujian_Semester_${currentSem?.nama?.replace(/\s/g, '_') || 'Laporan'}`,
            totalLabel: 'Total Santri',
            totalValue: `${data.length} Santri`
        })
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <FileText className="title-icon blue" /> Laporan Ujian Semester
                    </h1>
                    <p className="page-subtitle">Laporan hasil ujian semester - Tahfizhiyah</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" disabled={data.length === 0} onClick={generatePDF}>
                        <Download size={18} /> Download PDF
                    </button>
                    <button className="btn btn-outline" disabled={data.length === 0} onClick={() => window.print()}>
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>

            <div className="filter-section">
                <div className="form-group">
                    <label className="form-label">Semester *</label>
                    <select
                        className="form-control"
                        value={filters.semester_id}
                        onChange={e => setFilters({ ...filters, semester_id: e.target.value })}
                    >
                        <option value="">Pilih Semester</option>
                        {semester.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nama} - {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Halaqoh *</label>
                    <select
                        className="form-control"
                        value={filters.halaqoh_id}
                        onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                    >
                        <option value="">Pilih Halaqoh</option>
                        {halaqoh.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                        ))}
                    </select>
                </div>
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
                        <p>Pilih semester dan halaqoh untuk melihat laporan</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th style={{ textAlign: 'center' }}>Hafalan Baru</th>
                                    <th style={{ textAlign: 'center' }}>Murajaah</th>
                                    <th style={{ textAlign: 'center' }}>Tajwid</th>
                                    <th style={{ textAlign: 'center' }}>Kelancaran</th>
                                    <th style={{ textAlign: 'center' }}>Rata-rata</th>
                                    <th style={{ textAlign: 'center' }}>Predikat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((s, i) => (
                                    <tr key={s.id}>
                                        <td>{i + 1}</td>
                                        <td>{s.nis}</td>
                                        <td>{s.nama}</td>
                                        <td style={{ textAlign: 'center' }}>{s.hafalan}</td>
                                        <td style={{ textAlign: 'center' }}>{s.murajaah}</td>
                                        <td style={{ textAlign: 'center' }}>{s.tajwid}</td>
                                        <td style={{ textAlign: 'center' }}>{s.kelancaran}</td>
                                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{s.rata_rata}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${getPredikatBadgeClass(s.predikat)}`}>{s.predikat}</span>
                                        </td>
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

export default LaporanUjianSemesterPage
