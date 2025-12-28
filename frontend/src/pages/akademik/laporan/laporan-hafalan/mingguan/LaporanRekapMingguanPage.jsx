import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, Download, Printer, Users } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import '../../../../../pages/laporan/Laporan.css'

const bulanOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
]

const LaporanRekapMingguanPage = () => {
    const [loading, setLoading] = useState(false)
    const [halaqoh, setHalaqoh] = useState([])
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        halaqoh_id: '',
        minggu: Math.ceil(new Date().getDate() / 7),
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    useEffect(() => {
        fetchHalaqoh()
    }, [])

    const fetchHalaqoh = async () => {
        const { data } = await supabase.from('halaqoh').select('id, nama').order('nama')
        if (data) setHalaqoh(data)
    }

    // Calculate week date range
    const getWeekRange = () => {
        const startDay = (filters.minggu - 1) * 7 + 1
        const endDay = Math.min(filters.minggu * 7, new Date(filters.tahun, filters.bulan, 0).getDate())
        const startDate = new Date(filters.tahun, filters.bulan - 1, startDay)
        const endDate = new Date(filters.tahun, filters.bulan - 1, endDay)
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        }
    }

    const fetchData = async () => {
        if (!filters.halaqoh_id) return
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
            const { start, end } = getWeekRange()

            // Get hafalan data for the week
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select('santri_id, jenis, ayat_mulai, ayat_selesai, status')
                .in('santri_id', santriIds)
                .gte('tanggal', start)
                .lte('tanggal', end)

            // Get presensi data for the week
            const { data: presensiData } = await supabase
                .from('presensi')
                .select('santri_id, status')
                .in('santri_id', santriIds)
                .gte('tanggal', start)
                .lte('tanggal', end)

            // Aggregate data per santri
            const aggregatedData = santriData.map(santri => {
                const hafalans = hafalanData?.filter(h => h.santri_id === santri.id) || []
                const presensis = presensiData?.filter(p => p.santri_id === santri.id) || []

                const setoran = hafalans.filter(h => h.jenis === 'Setoran')
                const murajaah = hafalans.filter(h => h.jenis === "Muroja'ah" || h.jenis === 'Murajaah')

                const totalAyatSetoran = setoran.reduce((sum, h) => sum + Math.max(0, (h.ayat_selesai || 0) - (h.ayat_mulai || 0) + 1), 0)
                const totalAyatMurajaah = murajaah.reduce((sum, h) => sum + Math.max(0, (h.ayat_selesai || 0) - (h.ayat_mulai || 0) + 1), 0)

                const hadir = presensis.filter(p => p.status === 'hadir').length
                const totalHari = presensis.length

                // Determine status based on performance
                let status = 'Belum Ada Data'
                if (hafalans.length > 0) {
                    const lancar = hafalans.filter(h => h.status === 'Lancar').length
                    const total = hafalans.length
                    const ratio = lancar / total
                    if (ratio >= 0.8) status = 'Sangat Baik'
                    else if (ratio >= 0.6) status = 'Baik'
                    else if (ratio >= 0.4) status = 'Cukup'
                    else status = 'Perlu Perhatian'
                }

                return {
                    ...santri,
                    setoran_count: setoran.length,
                    setoran_ayat: totalAyatSetoran,
                    murajaah_count: murajaah.length,
                    murajaah_ayat: totalAyatMurajaah,
                    total_ayat: totalAyatSetoran + totalAyatMurajaah,
                    kehadiran: totalHari > 0 ? `${hadir}/${totalHari}` : '-',
                    status
                }
            })

            setData(aggregatedData)
        } catch (err) {
            console.error('Error fetching data:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.halaqoh_id) fetchData()
    }, [filters.halaqoh_id, filters.minggu, filters.bulan, filters.tahun])

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Sangat Baik': return 'badge-success'
            case 'Baik': return 'badge-info'
            case 'Cukup': return 'badge-warning'
            case 'Perlu Perhatian': return 'badge-danger'
            default: return ''
        }
    }

    const generatePDF = () => {
        if (data.length === 0) return

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const selectedHalaqoh = halaqoh.find(h => h.id === filters.halaqoh_id)
        const { start, end } = getWeekRange()
        const bulanNama = new Date(filters.tahun, filters.bulan - 1).toLocaleDateString('id-ID', { month: 'long' })

        // Header
        doc.setFillColor(5, 150, 105)
        doc.rect(0, 0, pageWidth, 25, 'F')
        doc.setTextColor(255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('LAPORAN REKAP MINGGUAN', pageWidth / 2, 12, { align: 'center' })
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('PTQA Batuan - Si-Taqua', pageWidth / 2, 19, { align: 'center' })

        // Info
        doc.setTextColor(0)
        doc.setFontSize(10)
        doc.text(`Halaqoh: ${selectedHalaqoh?.nama || '-'}`, 14, 35)
        doc.text(`Periode: Minggu ${filters.minggu} - ${bulanNama} ${filters.tahun}`, 14, 42)
        doc.text(`Tanggal: ${new Date(start).toLocaleDateString('id-ID')} s/d ${new Date(end).toLocaleDateString('id-ID')}`, 14, 49)

        // Table
        autoTable(doc, {
            startY: 57,
            head: [['No', 'NIS', 'Nama', 'Setoran', 'Murajaah', 'Total Ayat', 'Kehadiran', 'Status']],
            body: data.map((s, i) => [
                i + 1,
                s.nis,
                s.nama,
                `${s.setoran_count}x (${s.setoran_ayat})`,
                `${s.murajaah_count}x (${s.murajaah_ayat})`,
                s.total_ayat,
                s.kehadiran,
                s.status
            ]),
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 20 },
                5: { halign: 'center' },
                6: { halign: 'center' }
            },
            margin: { left: 14, right: 14 }
        })

        // Footer
        const finalY = doc.previousAutoTable.finalY + 15
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.text(`Total: ${data.length} santri`, 14, finalY)
        doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} - Si-Taqua PTQA Batuan`, pageWidth / 2, finalY + 8, { align: 'center' })

        doc.save(`Rekap_Mingguan_${filters.tahun}_${filters.bulan}_Minggu${filters.minggu}.pdf`)
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Calendar className="title-icon blue" /> Laporan Rekap Mingguan
                    </h1>
                    <p className="page-subtitle">Rekap hafalan per minggu</p>
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

                <div className="form-group">
                    <label className="form-label">Minggu</label>
                    <select
                        className="form-control"
                        value={filters.minggu}
                        onChange={e => setFilters({ ...filters, minggu: parseInt(e.target.value) })}
                    >
                        <option value={1}>Minggu 1 (1-7)</option>
                        <option value={2}>Minggu 2 (8-14)</option>
                        <option value={3}>Minggu 3 (15-21)</option>
                        <option value={4}>Minggu 4 (22-28)</option>
                        <option value={5}>Minggu 5 (29+)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Bulan</label>
                    <select
                        className="form-control"
                        value={filters.bulan}
                        onChange={e => setFilters({ ...filters, bulan: parseInt(e.target.value) })}
                    >
                        {bulanOptions.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Tahun</label>
                    <input
                        type="number"
                        className="form-control"
                        value={filters.tahun}
                        onChange={e => setFilters({ ...filters, tahun: parseInt(e.target.value) })}
                    />
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
                        <p>Pilih halaqoh untuk melihat laporan</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th style={{ textAlign: 'center' }}>Setoran</th>
                                    <th style={{ textAlign: 'center' }}>Murajaah</th>
                                    <th style={{ textAlign: 'center' }}>Total Ayat</th>
                                    <th style={{ textAlign: 'center' }}>Kehadiran</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((s, i) => (
                                    <tr key={s.id}>
                                        <td>{i + 1}</td>
                                        <td>{s.nis}</td>
                                        <td>{s.nama}</td>
                                        <td style={{ textAlign: 'center' }}>{s.setoran_count}x ({s.setoran_ayat} ayat)</td>
                                        <td style={{ textAlign: 'center' }}>{s.murajaah_count}x ({s.murajaah_ayat} ayat)</td>
                                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{s.total_ayat}</td>
                                        <td style={{ textAlign: 'center' }}>{s.kehadiran}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${getStatusBadgeClass(s.status)}`}>{s.status}</span>
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

export default LaporanRekapMingguanPage
