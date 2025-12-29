import { useState, useEffect } from 'react'
import { Users, RefreshCw, Download, Printer, BookMarked, FileText, Calendar } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import '../../../../../pages/laporan/Laporan.css'

const LaporanAkademikSantriPage = () => {
    const [loading, setLoading] = useState(false)
    const [semester, setSemester] = useState([])
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanData, setHafalanData] = useState([])
    const [nilaiTahfizh, setNilaiTahfizh] = useState(null)
    const [nilaiMadros, setNilaiMadros] = useState([])
    const [presensiData, setPresensiData] = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0 })
    const [filters, setFilters] = useState({
        semester_id: '',
        santri_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, santriRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('santri').select('id, nama, nis, kelas:kelas_id(nama), halaqoh:halaqoh_id(nama)').eq('status', 'Aktif').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (santriRes.data) setSantriList(santriRes.data)
    }

    const fetchSantriReport = async (santriId) => {
        if (!santriId || !filters.semester_id) return
        setLoading(true)

        try {
            const selected = santriList.find(s => s.id === santriId)
            setSelectedSantri(selected)

            // Fetch Hafalan Progress - group by juz
            const { data: hafalan } = await supabase
                .from('hafalan')
                .select('juz, juz_mulai, status, tanggal')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            // Aggregate hafalan by juz
            const juzProgress = {}
            hafalan?.forEach(h => {
                const juz = h.juz_mulai || h.juz
                if (!juzProgress[juz] || h.status === 'Lancar') {
                    juzProgress[juz] = {
                        juz,
                        status: h.status,
                        tanggal: h.tanggal
                    }
                }
            })
            setHafalanData(Object.values(juzProgress).sort((a, b) => a.juz - b.juz))

            // Fetch Nilai Tahfizh for semester
            const { data: tahfizhData } = await supabase
                .from('nilai')
                .select('*')
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)
                .eq('kategori', 'Tahfizhiyah')
                .eq('jenis_ujian', 'semester')
                .single()

            setNilaiTahfizh(tahfizhData)

            // Fetch Nilai Madros for semester
            const { data: madrosData } = await supabase
                .from('nilai')
                .select(`
                    id, jenis_ujian, nilai_akhir,
                    mapel:mapel_id(id, nama)
                `)
                .eq('santri_id', santriId)
                .eq('semester_id', filters.semester_id)
                .eq('kategori', 'Madrosiyah')

            // Group by mapel
            const mapelNilai = {}
            madrosData?.forEach(n => {
                if (!n.mapel) return
                const key = n.mapel.id
                if (!mapelNilai[key]) {
                    mapelNilai[key] = { nama: n.mapel.nama, harian: '-', uts: '-', uas: '-' }
                }
                if (n.jenis_ujian === 'harian') mapelNilai[key].harian = n.nilai_akhir
                if (n.jenis_ujian === 'uts') mapelNilai[key].uts = n.nilai_akhir
                if (n.jenis_ujian === 'uas') mapelNilai[key].uas = n.nilai_akhir
            })

            // Calculate average for each mapel
            const madrosResult = Object.values(mapelNilai).map(m => {
                const values = [m.harian, m.uts, m.uas].filter(v => v !== '-').map(Number)
                const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '-'
                return { ...m, rata_rata: avg }
            })
            setNilaiMadros(madrosResult)

            // Fetch Presensi for semester
            const currentSem = semester.find(s => s.id === filters.semester_id)
            if (currentSem) {
                const { data: presensi } = await supabase
                    .from('presensi')
                    .select('status')
                    .eq('santri_id', santriId)
                    .gte('tanggal', currentSem.tanggal_mulai)
                    .lte('tanggal', currentSem.tanggal_selesai)

                const counts = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
                presensi?.forEach(p => {
                    if (counts[p.status] !== undefined) counts[p.status]++
                })
                setPresensiData(counts)
            }

        } catch (err) {
            console.error('Error fetching report:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.santri_id && filters.semester_id) {
            fetchSantriReport(filters.santri_id)
        }
    }, [filters.santri_id, filters.semester_id])

    const getPredikat = (nilai) => {
        if (!nilai && nilai !== 0) return '-'
        if (nilai >= 90) return 'A'
        if (nilai >= 80) return 'B'
        if (nilai >= 70) return 'C'
        if (nilai >= 60) return 'D'
        return 'E'
    }

    const generatePDF = async () => {
        if (!selectedSantri) return

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        let y = 15

        // ========== HEADER WITH LOGO ==========
        const logoSize = 25
        const logoX = 14
        let headerTextX = 45

        try {
            const logoImg = new Image()
            logoImg.src = '/logo-pondok.png'
            await new Promise((resolve) => {
                logoImg.onload = resolve
                logoImg.onerror = resolve
                setTimeout(resolve, 1000)
            })
            doc.addImage(logoImg, 'PNG', logoX, y, logoSize, logoSize)
        } catch (e) {
            console.warn('Logo loading failed', e)
        }

        // Header Text
        doc.setTextColor(0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('YAYASAN ABDULLAH DEWI HASANAH', headerTextX, y + 6)

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('PONDOK PESANTREN TAHFIZH QUR\'AN AL-USYMUNI BATUAN', headerTextX, y + 13)

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep', headerTextX, y + 19)

        // Line separator
        y += 32
        doc.setDrawColor(5, 150, 105)
        doc.setLineWidth(1)
        doc.line(14, y, pageWidth - 14, y)
        doc.setLineWidth(0.5)

        y += 10

        // Title
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(5, 150, 105)
        doc.text('LAPORAN AKADEMIK SANTRI', pageWidth / 2, y, { align: 'center' })

        y += 10
        doc.setTextColor(0)

        // Biodata Santri
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('DATA SANTRI', 14, y)
        y += 8
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const currentSem = semester.find(s => s.id === filters.semester_id)
        const bioData = [
            ['Nama', selectedSantri.nama],
            ['NIS', selectedSantri.nis],
            ['Kelas', selectedSantri.kelas?.nama || '-'],
            ['Halaqoh', selectedSantri.halaqoh?.nama || '-'],
            ['Semester', currentSem ? `${currentSem.nama} - ${currentSem.tahun_ajaran}` : '-']
        ]
        bioData.forEach(item => {
            doc.text(`${item[0]}: ${item[1]}`, 14, y)
            y += 6
        })

        y += 5

        // Hafalan Progress
        if (hafalanData.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('PROGRESS HAFALAN', 14, y)
            y += 3
            autoTable(doc, {
                startY: y,
                head: [['Juz', 'Status', 'Tanggal']],
                body: hafalanData.map(h => [
                    `Juz ${h.juz}`,
                    h.status,
                    new Date(h.tanggal).toLocaleDateString('id-ID')
                ]),
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            })
            y = doc.previousAutoTable.finalY + 10
        }

        // Nilai Tahfizh
        if (nilaiTahfizh) {
            doc.setFont('helvetica', 'bold')
            doc.text('NILAI TAHFIZHIYAH', 14, y)
            y += 3
            autoTable(doc, {
                startY: y,
                head: [['Komponen', 'Nilai', 'Predikat']],
                body: [
                    ['Hafalan Baru', nilaiTahfizh.nilai_hafalan || '-', getPredikat(nilaiTahfizh.nilai_hafalan)],
                    ['Murajaah', nilaiTahfizh.nilai_murajaah || '-', getPredikat(nilaiTahfizh.nilai_murajaah)],
                    ['Tajwid', nilaiTahfizh.nilai_tajwid || '-', getPredikat(nilaiTahfizh.nilai_tajwid)],
                    ['Kelancaran', nilaiTahfizh.nilai_kelancaran || '-', getPredikat(nilaiTahfizh.nilai_kelancaran)],
                    ['Rata-rata', nilaiTahfizh.nilai_akhir?.toFixed(1) || '-', getPredikat(nilaiTahfizh.nilai_akhir)]
                ],
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 100 }
            })
            y = doc.previousAutoTable.finalY + 10
        }

        // Nilai Madros
        if (nilaiMadros.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('NILAI MADROSIYAH', 14, y)
            y += 3
            autoTable(doc, {
                startY: y,
                head: [['Mapel', 'Harian', 'UTS', 'UAS', 'Rata-rata']],
                body: nilaiMadros.map(m => [m.nama, m.harian, m.uts, m.uas, m.rata_rata]),
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105] },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            })
            y = doc.previousAutoTable.finalY + 10
        }

        // Kehadiran
        doc.setFont('helvetica', 'bold')
        doc.text('KEHADIRAN SEMESTER INI', 14, y)
        y += 3
        autoTable(doc, {
            startY: y,
            head: [['Hadir', 'Izin', 'Sakit', 'Alpha']],
            body: [[presensiData.hadir, presensiData.izin, presensiData.sakit, presensiData.alpha]],
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] },
            styles: { fontSize: 9, halign: 'center' },
            margin: { left: 14, right: 100 }
        })

        // Footer
        const finalY = doc.previousAutoTable.finalY + 15
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} - Si-Taqua PTQA Batuan`, pageWidth / 2, finalY, { align: 'center' })

        doc.save(`Laporan_Akademik_${selectedSantri.nama.replace(/\s/g, '_')}.pdf`)
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Users className="title-icon purple" /> Laporan Akademik Santri
                    </h1>
                    <p className="page-subtitle">Laporan lengkap per santri</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" disabled={!selectedSantri} onClick={generatePDF}>
                        <Download size={18} /> Download PDF
                    </button>
                    <button className="btn btn-outline" disabled={!selectedSantri} onClick={() => window.print()}>
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
                    <label className="form-label">Santri *</label>
                    <select
                        className="form-control"
                        value={filters.santri_id}
                        onChange={e => setFilters({ ...filters, santri_id: e.target.value })}
                    >
                        <option value="">Pilih Santri</option>
                        {santriList.map(s => (
                            <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>
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
                ) : !selectedSantri ? (
                    <div className="empty-state">
                        <Users size={48} />
                        <p>Pilih santri untuk melihat laporan akademik</p>
                    </div>
                ) : (
                    <div className="laporan-akademik-content">
                        {/* Santri Profile */}
                        <div className="santri-profile" style={{
                            padding: '24px',
                            background: 'var(--bg-light)',
                            borderRadius: '12px',
                            marginBottom: '24px'
                        }}>
                            <h2>{selectedSantri.nama}</h2>
                            <p>NIS: {selectedSantri.nis}</p>
                            <p>Kelas: {selectedSantri.kelas?.nama || '-'} | Halaqoh: {selectedSantri.halaqoh?.nama || '-'}</p>
                        </div>

                        <div className="laporan-sections" style={{ display: 'grid', gap: '24px' }}>
                            {/* Hafalan Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BookMarked size={20} /> Progress Hafalan
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Juz</th>
                                            <th>Status</th>
                                            <th>Tanggal Terakhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hafalanData.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    Belum ada data hafalan
                                                </td>
                                            </tr>
                                        ) : (
                                            hafalanData.map((h, i) => (
                                                <tr key={i}>
                                                    <td>Juz {h.juz}</td>
                                                    <td>
                                                        <span className={`badge ${h.status === 'Lancar' ? 'badge-success' : h.status === 'Sedang' ? 'badge-warning' : 'badge-danger'}`}>
                                                            {h.status}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(h.tanggal).toLocaleDateString('id-ID')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Nilai Tahfizh Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={20} /> Nilai Tahfizhiyah (Semester)
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Komponen</th>
                                            <th style={{ textAlign: 'center' }}>Nilai</th>
                                            <th style={{ textAlign: 'center' }}>Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Hafalan Baru</td>
                                            <td style={{ textAlign: 'center' }}>{nilaiTahfizh?.nilai_hafalan || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{getPredikat(nilaiTahfizh?.nilai_hafalan)}</td>
                                        </tr>
                                        <tr>
                                            <td>Murajaah</td>
                                            <td style={{ textAlign: 'center' }}>{nilaiTahfizh?.nilai_murajaah || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{getPredikat(nilaiTahfizh?.nilai_murajaah)}</td>
                                        </tr>
                                        <tr>
                                            <td>Tajwid</td>
                                            <td style={{ textAlign: 'center' }}>{nilaiTahfizh?.nilai_tajwid || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{getPredikat(nilaiTahfizh?.nilai_tajwid)}</td>
                                        </tr>
                                        <tr>
                                            <td>Kelancaran</td>
                                            <td style={{ textAlign: 'center' }}>{nilaiTahfizh?.nilai_kelancaran || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{getPredikat(nilaiTahfizh?.nilai_kelancaran)}</td>
                                        </tr>
                                        {nilaiTahfizh && (
                                            <tr style={{ fontWeight: '600', background: 'var(--bg-light)' }}>
                                                <td>Rata-rata</td>
                                                <td style={{ textAlign: 'center' }}>{nilaiTahfizh.nilai_akhir?.toFixed(1) || '-'}</td>
                                                <td style={{ textAlign: 'center' }}>{getPredikat(nilaiTahfizh.nilai_akhir)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Nilai Madros Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={20} /> Nilai Madrosiyah
                                </h3>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mapel</th>
                                            <th style={{ textAlign: 'center' }}>Harian</th>
                                            <th style={{ textAlign: 'center' }}>UTS</th>
                                            <th style={{ textAlign: 'center' }}>UAS</th>
                                            <th style={{ textAlign: 'center' }}>Rata-rata</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiMadros.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    Belum ada data nilai
                                                </td>
                                            </tr>
                                        ) : (
                                            nilaiMadros.map((m, i) => (
                                                <tr key={i}>
                                                    <td>{m.nama}</td>
                                                    <td style={{ textAlign: 'center' }}>{m.harian}</td>
                                                    <td style={{ textAlign: 'center' }}>{m.uts}</td>
                                                    <td style={{ textAlign: 'center' }}>{m.uas}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{m.rata_rata}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Kehadiran Section */}
                            <div className="section">
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={20} /> Kehadiran Semester Ini
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.hadir}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Hadir</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.izin}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Izin</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.sakit}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Sakit</div>
                                    </div>
                                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: '8px', textAlign: 'center', color: 'white' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '700' }}>{presensiData.alpha}</div>
                                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Alpha</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LaporanAkademikSantriPage
