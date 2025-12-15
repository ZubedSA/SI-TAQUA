import { useState, useEffect } from 'react'
import { Download, FileText, Users, BookMarked, CalendarCheck, RefreshCw, Eye, Printer, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import './Laporan.css'

const laporanTypes = [
    { id: 'santri', icon: Users, title: 'Laporan Santri', desc: 'Data lengkap seluruh santri', color: 'green' },
    { id: 'guru', icon: Users, title: 'Laporan Guru', desc: 'Data pengajar dan wali kelas', color: 'yellow' },
    { id: 'hafalan', icon: BookMarked, title: 'Laporan Hafalan', desc: 'Progress hafalan per santri', color: 'teal' },
    { id: 'presensi', icon: CalendarCheck, title: 'Laporan Presensi', desc: 'Rekap kehadiran bulanan', color: 'olive' },
    { id: 'nilai', icon: FileText, title: 'Laporan Nilai', desc: 'Rekap nilai per semester', color: 'green' },
]

const LaporanPage = () => {
    const [selectedType, setSelectedType] = useState(null)
    const [filters, setFilters] = useState({ kelas: '', semester: '', bulan: '' })
    const [kelasList, setKelasList] = useState([])
    const [semesterList, setSemesterList] = useState([])
    const [generating, setGenerating] = useState(false)
    const [success, setSuccess] = useState('')
    const [showPreview, setShowPreview] = useState(false)
    const [previewData, setPreviewData] = useState({ columns: [], rows: [], title: '', total: 0 })
    const [loadingPreview, setLoadingPreview] = useState(false)

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        try {
            const [kelasRes, semesterRes] = await Promise.all([
                supabase.from('kelas').select('id, nama').order('nama'),
                supabase.from('semester').select('id, nama, tahun_ajaran, is_active').order('is_active', { ascending: false })
            ])
            setKelasList(kelasRes.data || [])
            setSemesterList(semesterRes.data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchPreviewData = async () => {
        setLoadingPreview(true)
        try {
            let tableData = []
            let columns = []
            const reportTitle = laporanTypes.find(l => l.id === selectedType)?.title || 'Laporan'

            if (selectedType === 'santri') {
                let query = supabase.from('santri').select('nis, nama, jenis_kelamin, kelas:kelas_id(nama), status').order('nama')
                if (filters.kelas) query = query.eq('kelas_id', filters.kelas)
                const { data } = await query
                columns = ['No', 'NIS', 'Nama', 'L/P', 'Kelas', 'Status']
                tableData = data?.map((s, i) => ({
                    no: i + 1,
                    nis: s.nis,
                    nama: s.nama,
                    jk: s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
                    kelas: s.kelas?.nama || '-',
                    status: s.status
                })) || []
            } else if (selectedType === 'guru') {
                const { data } = await supabase.from('guru').select('nip, nama, jenis_kelamin, jabatan, no_telp, status').order('nama')
                columns = ['No', 'NIP', 'Nama', 'L/P', 'Jabatan', 'Telepon', 'Status']
                tableData = data?.map((g, i) => ({
                    no: i + 1,
                    nip: g.nip || '-',
                    nama: g.nama,
                    jk: g.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
                    jabatan: g.jabatan,
                    telepon: g.no_telp || '-',
                    status: g.status
                })) || []
            } else if (selectedType === 'hafalan') {
                const { data } = await supabase.from('hafalan').select('santri:santri_id(nama), juz, surah, ayat_mulai, ayat_selesai, jenis, status, tanggal').order('tanggal', { ascending: false }).limit(50)
                columns = ['No', 'Santri', 'Juz', 'Surah', 'Ayat', 'Jenis', 'Status', 'Tanggal']
                tableData = data?.map((h, i) => ({
                    no: i + 1,
                    santri: h.santri?.nama || '-',
                    juz: h.juz,
                    surah: h.surah,
                    ayat: `${h.ayat_mulai}-${h.ayat_selesai}`,
                    jenis: h.jenis || 'Setoran',
                    status: h.status,
                    tanggal: new Date(h.tanggal).toLocaleDateString('id-ID')
                })) || []
            } else if (selectedType === 'presensi') {
                const { data } = await supabase.from('presensi').select('santri:santri_id(nama), tanggal, status, keterangan').order('tanggal', { ascending: false }).limit(50)
                columns = ['No', 'Santri', 'Tanggal', 'Status', 'Keterangan']
                tableData = data?.map((p, i) => ({
                    no: i + 1,
                    santri: p.santri?.nama || '-',
                    tanggal: new Date(p.tanggal).toLocaleDateString('id-ID'),
                    status: p.status,
                    keterangan: p.keterangan || '-'
                })) || []
            } else if (selectedType === 'nilai') {
                let query = supabase.from('nilai').select('santri:santri_id(nama), mapel:mapel_id(nama), nilai_tugas, nilai_uts, nilai_uas, nilai_akhir').order('santri_id')
                if (filters.semester) query = query.eq('semester_id', filters.semester)
                const { data } = await query
                columns = ['No', 'Santri', 'Mapel', 'Tugas', 'UTS', 'UAS', 'Akhir']
                tableData = data?.map((n, i) => ({
                    no: i + 1,
                    santri: n.santri?.nama || '-',
                    mapel: n.mapel?.nama || '-',
                    tugas: n.nilai_tugas?.toFixed(0) || '-',
                    uts: n.nilai_uts?.toFixed(0) || '-',
                    uas: n.nilai_uas?.toFixed(0) || '-',
                    akhir: n.nilai_akhir?.toFixed(1) || '-'
                })) || []
            }

            setPreviewData({ columns, rows: tableData, title: reportTitle, total: tableData.length })
            setShowPreview(true)
        } catch (err) {
            console.error('Error:', err.message)
            alert('Gagal memuat preview: ' + err.message)
        } finally {
            setLoadingPreview(false)
        }
    }

    const generatePDF = async () => {
        setGenerating(true)
        setSuccess('')

        try {
            const doc = new jsPDF()
            const pageWidth = doc.internal.pageSize.getWidth()

            // Header
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('PTQA BATUAN', pageWidth / 2, 20, { align: 'center' })
            doc.setFontSize(12)
            doc.setFont('helvetica', 'normal')
            doc.text('Sistem Akademik Pondok Pesantren', pageWidth / 2, 28, { align: 'center' })
            doc.line(14, 32, pageWidth - 14, 32)

            // Title
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text(previewData.title.toUpperCase(), pageWidth / 2, 42, { align: 'center' })

            // Date
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 50)

            // Generate table
            const tableBody = previewData.rows.map(row => Object.values(row))
            doc.autoTable({
                startY: 55,
                head: [previewData.columns],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [5, 150, 105], textColor: 255 },
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 }
            })

            // Footer
            const finalY = doc.lastAutoTable.finalY + 15
            doc.setFontSize(9)
            doc.text(`Total: ${previewData.total} data`, 14, finalY)
            doc.text('Dicetak oleh Sistem Akademik PTQA Batuan', pageWidth / 2, finalY + 10, { align: 'center' })

            // Save
            doc.save(`${previewData.title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
            setSuccess('PDF berhasil di-download!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert('Gagal generate PDF: ' + err.message)
        } finally {
            setGenerating(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Laporan</h1>
                    <p className="page-subtitle">Generate dan download laporan dalam format PDF</p>
                </div>
            </div>

            {success && <div className="alert alert-success mb-3">{success}</div>}

            <div className="laporan-grid">
                {laporanTypes.map(laporan => (
                    <div
                        key={laporan.id}
                        className={`laporan-card ${selectedType === laporan.id ? 'selected' : ''}`}
                        onClick={() => setSelectedType(laporan.id)}
                    >
                        <div className={`laporan-icon ${laporan.color}`}>
                            <laporan.icon size={28} />
                        </div>
                        <div className="laporan-content">
                            <h3>{laporan.title}</h3>
                            <p>{laporan.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {selectedType && (
                <div className="generate-section">
                    <h3>Filter Laporan</h3>
                    <div className="filter-grid">
                        {(selectedType === 'santri' || selectedType === 'nilai') && (
                            <div className="form-group">
                                <label className="form-label">Kelas</label>
                                <select className="form-control" value={filters.kelas} onChange={e => setFilters({ ...filters, kelas: e.target.value })}>
                                    <option value="">Semua Kelas</option>
                                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                </select>
                            </div>
                        )}
                        {selectedType === 'nilai' && (
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select className="form-control" value={filters.semester} onChange={e => setFilters({ ...filters, semester: e.target.value })}>
                                    <option value="">Semua</option>
                                    {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} {s.tahun_ajaran}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="generate-actions">
                        <button className="btn btn-secondary" onClick={fetchPreviewData} disabled={loadingPreview}>
                            {loadingPreview ? <><RefreshCw size={18} className="spin" /> Memuat...</> : <><Eye size={18} /> Preview Laporan</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="modal-overlay active">
                    <div className="modal preview-modal">
                        <div className="modal-header">
                            <h3 className="modal-title"><FileText size={20} /> Preview: {previewData.title}</h3>
                            <button className="modal-close" onClick={() => setShowPreview(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Preview Header */}
                            <div className="preview-header">
                                <div className="preview-logo">
                                    <h2>PTQA BATUAN</h2>
                                    <p>Sistem Akademik Pondok Pesantren</p>
                                </div>
                                <div className="preview-info">
                                    <p><strong>Laporan:</strong> {previewData.title}</p>
                                    <p><strong>Tanggal:</strong> {new Date().toLocaleDateString('id-ID')}</p>
                                    <p><strong>Total Data:</strong> {previewData.total}</p>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="preview-table-wrapper">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            {previewData.columns.map((col, i) => <th key={i}>{col}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.rows.length === 0 ? (
                                            <tr><td colSpan={previewData.columns.length} className="text-center">Tidak ada data</td></tr>
                                        ) : (
                                            previewData.rows.map((row, i) => (
                                                <tr key={i}>
                                                    {Object.values(row).map((val, j) => <td key={j}>{val}</td>)}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Preview Footer */}
                            <div className="preview-footer">
                                <p>Total: {previewData.total} data</p>
                                <p className="text-muted">Dicetak oleh Sistem Akademik PTQA Batuan</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>
                                <X size={16} /> Tutup
                            </button>
                            <button className="btn btn-secondary" onClick={handlePrint}>
                                <Printer size={16} /> Print
                            </button>
                            <button className="btn btn-primary" onClick={generatePDF} disabled={generating}>
                                {generating ? <><RefreshCw size={16} className="spin" /> Generating...</> : <><Download size={16} /> Download PDF</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LaporanPage
