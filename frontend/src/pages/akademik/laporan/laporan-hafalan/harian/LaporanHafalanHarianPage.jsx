import { useState, useEffect } from 'react'
import { BookMarked, RefreshCw, MessageCircle, Users, Send, Download, Printer } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import '../../../../../pages/laporan/Laporan.css'

const LaporanHafalanHarianPage = () => {
    const [loading, setLoading] = useState(false)
    const [halaqoh, setHalaqoh] = useState([])
    const [data, setData] = useState([])
    const [filters, setFilters] = useState({
        halaqoh_id: '',
        tanggal: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchHalaqoh()
    }, [])

    const fetchHalaqoh = async () => {
        const { data } = await supabase.from('halaqoh').select('id, nama').order('nama')
        if (data) setHalaqoh(data)
    }

    const fetchData = async () => {
        if (!filters.halaqoh_id) return
        setLoading(true)

        try {
            // First get santri in this halaqoh
            const { data: santriData } = await supabase
                .from('santri')
                .select('id')
                .eq('halaqoh_id', filters.halaqoh_id)
                .eq('status', 'Aktif')

            if (!santriData || santriData.length === 0) {
                setData([])
                setLoading(false)
                return
            }

            const santriIds = santriData.map(s => s.id)

            // Fetch hafalan data for this date and these santri
            const { data: hafalanData } = await supabase
                .from('hafalan')
                .select(`
                    id, tanggal, juz, juz_mulai, surah, surah_mulai, surah_selesai, 
                    ayat_mulai, ayat_selesai, jenis, status, catatan,
                    santri:santri_id (id, nama, nis, no_telp_wali, nama_wali)
                `)
                .in('santri_id', santriIds)
                .eq('tanggal', filters.tanggal)
                .order('created_at', { ascending: false })

            setData(hafalanData || [])
        } catch (err) {
            console.error('Error fetching data:', err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.halaqoh_id) fetchData()
    }, [filters.halaqoh_id, filters.tanggal])

    const sendWhatsApp = (item) => {
        const santri = item.santri
        if (!santri?.no_telp_wali) {
            alert('Nomor WA wali tidak tersedia')
            return
        }

        let phone = santri.no_telp_wali.replace(/\D/g, '')
        if (phone.startsWith('0')) phone = '62' + phone.substring(1)

        const message = `Assalamu'alaikum Wr. Wb.

*LAPORAN HAFALAN HARIAN*
━━━━━━━━━━━━━━━━━━━━

Kepada Yth. Bapak/Ibu *${santri.nama_wali || 'Wali Santri'}*

📌 *Nama Santri:* ${santri.nama}
📅 *Tanggal:* ${new Date(item.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

📖 *Detail Hafalan:*
• Juz: ${item.juz_mulai || item.juz}
• Surah: ${item.surah_mulai || item.surah}
• Ayat: ${item.ayat_mulai} - ${item.ayat_selesai}
• Jenis: ${item.jenis}
• Status: ${item.status}
${item.catatan ? `• Catatan: ${item.catatan}` : ''}

Demikian laporan hafalan ananda. Jazakumullah khairan.

_PTQA Batuan - Si-Taqua_`

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const sendAllWhatsApp = () => {
        if (data.length === 0) return
        if (!window.confirm(`Kirim laporan ke ${data.length} wali santri?`)) return

        data.forEach((item, index) => {
            setTimeout(() => sendWhatsApp(item), index * 2000)
        })
    }

    const generatePDF = () => {
        if (data.length === 0) return

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const selectedHalaqoh = halaqoh.find(h => h.id === filters.halaqoh_id)

        // Header
        doc.setFillColor(5, 150, 105)
        doc.rect(0, 0, pageWidth, 25, 'F')
        doc.setTextColor(255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('LAPORAN HAFALAN HARIAN', pageWidth / 2, 12, { align: 'center' })
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('PTQA Batuan - Si-Taqua', pageWidth / 2, 19, { align: 'center' })

        // Info
        doc.setTextColor(0)
        doc.setFontSize(10)
        doc.text(`Halaqoh: ${selectedHalaqoh?.nama || '-'}`, 14, 35)
        doc.text(`Tanggal: ${new Date(filters.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 42)

        // Table
        autoTable(doc, {
            startY: 50,
            head: [['No', 'Santri', 'Juz/Surah', 'Ayat', 'Jenis', 'Status']],
            body: data.map((item, i) => [
                i + 1,
                item.santri?.nama || '-',
                `Juz ${item.juz_mulai || item.juz} - ${item.surah_mulai || item.surah}`,
                `${item.ayat_mulai} - ${item.ayat_selesai}`,
                item.jenis,
                item.status
            ]),
            theme: 'grid',
            headStyles: { fillColor: [5, 150, 105] },
            styles: { fontSize: 9 },
            margin: { left: 14, right: 14 }
        })

        // Footer
        const finalY = doc.previousAutoTable.finalY + 15
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.text(`Total: ${data.length} santri`, 14, finalY)
        doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')} - Si-Taqua PTQA Batuan`, pageWidth / 2, finalY + 8, { align: 'center' })

        doc.save(`Hafalan_Harian_${filters.tanggal}.pdf`)
    }

    return (
        <div className="laporan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <BookMarked className="title-icon green" /> Laporan Hafalan Harian
                    </h1>
                    <p className="page-subtitle">Kirim laporan hafalan harian via WhatsApp</p>
                </div>
                <div className="header-actions">
                    {data.length > 0 && (
                        <>
                            <button className="btn btn-primary" onClick={generatePDF}>
                                <Download size={18} /> Download PDF
                            </button>
                            <button className="btn btn-success" onClick={sendAllWhatsApp}>
                                <Send size={18} /> Kirim Semua WA
                            </button>
                        </>
                    )}
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
                    <label className="form-label">Tanggal Filter *</label>
                    <input
                        type="date"
                        className="form-control"
                        value={filters.tanggal}
                        onChange={e => setFilters({ ...filters, tanggal: e.target.value })}
                    />
                </div>

                <div className="form-group" style={{ alignSelf: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={fetchData} disabled={!filters.halaqoh_id}>
                        <RefreshCw size={18} /> Refresh
                    </button>
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
                        <p>
                            {filters.halaqoh_id
                                ? 'Tidak ada data hafalan untuk tanggal ini'
                                : 'Pilih halaqoh dan tanggal untuk melihat laporan'}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Santri</th>
                                    <th>Juz/Surah</th>
                                    <th>Ayat</th>
                                    <th>Jenis</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item, i) => (
                                    <tr key={item.id}>
                                        <td>{i + 1}</td>
                                        <td>{item.santri?.nama || '-'}</td>
                                        <td>Juz {item.juz_mulai || item.juz} - {item.surah_mulai || item.surah}</td>
                                        <td>{item.ayat_mulai} - {item.ayat_selesai}</td>
                                        <td><span className={`badge ${item.jenis === 'Setoran' ? 'badge-success' : 'badge-info'}`}>{item.jenis}</span></td>
                                        <td><span className={`badge ${item.status === 'Lancar' ? 'badge-success' : item.status === 'Sedang' ? 'badge-warning' : 'badge-danger'}`}>{item.status}</span></td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => sendWhatsApp(item)}
                                                title="Kirim ke WhatsApp Wali"
                                            >
                                                <MessageCircle size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    )
}

export default LaporanHafalanHarianPage
