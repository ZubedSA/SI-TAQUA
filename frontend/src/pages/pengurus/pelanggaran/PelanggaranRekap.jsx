import { useState, useEffect } from 'react'
import {
    FileText,
    Calendar,
    Search,
    Filter,
    Download,
    Eye,
    User,
    Users,
    AlertTriangle,
    X,
    CheckCircle,
    ChevronRight,
    RefreshCw,
    TrendingUp,
    ShieldAlert,
    Shield,
    BookOpen,
    Clock,
    AlertCircle,
    MessageCircle
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { createMessage, sendWhatsApp } from '../../../utils/whatsapp'
import PageHeader from '../../../components/layout/PageHeader'
import { Card, CardContent } from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import ConfirmationModal from '../../../components/ui/ConfirmationModal'
import FormInput from '../../../components/ui/FormInput'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import Badge from '../../../components/ui/Badge'
import ResponsiveTable from '../../../components/ui/ResponsiveTable'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const getWeekRangeString = (dateStr) => {
    const parts = dateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = date.getDay();
    const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDateShort = (d) => {
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };
    return `${formatDateShort(monday)} - ${formatDateShort(sunday)} ${sunday.getFullYear()}`;
};

const getWeekKey = (dateStr) => {
    const parts = dateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = date.getDay();
    const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diffToMonday));

    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
};

const calculateSanksiAndTingkat = (points) => {
    if (points <= 0) return { tingkat: 'Aman', sanksi: 'Tidak ada sanksi', color: 'emerald' };
    if (points >= 1 && points <= 3) {
        return {
            tingkat: 'Ringan',
            sanksi: `Menghafalkan mufrodat ${15 * points} (15 per kelipatan)`,
            color: 'emerald'
        };
    }
    if (points >= 4 && points <= 6) {
        return {
            tingkat: 'Sedang',
            sanksi: "Menulis istighfar 500 kali didepan dhalem pengasuh setelah sholat jum'at dan memakai rompi",
            color: 'amber'
        };
    }
    if (points >= 7 && points <= 9) {
        return {
            tingkat: 'Berat',
            sanksi: "Meminta surat pernyataan kepada pengasuh dan botak abri",
            color: 'red'
        };
    }
    return {
        tingkat: 'Sangat Berat',
        sanksi: "Botak bersih dan membuat surat pernyataan kepada pengasuh kemudian dikabari kepada wali secara online / whatsapp",
        color: 'purple'
    };
};

const groupViolationsByWeek = (violations) => {
    const weeks = {};
    (violations || []).forEach(v => {
        const weekKey = getWeekKey(v.tanggal);
        const weekStr = getWeekRangeString(v.tanggal);
        if (!weeks[weekKey]) {
            weeks[weekKey] = {
                key: weekKey,
                label: weekStr,
                points: 0,
                violations: []
            };
        }
        weeks[weekKey].points += v.poin || 0;
        weeks[weekKey].violations.push(v);
    });
    return Object.values(weeks).sort((a, b) => b.key.localeCompare(a.key));
};

const PelanggaranRekap = () => {
    // State for filtering
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('')

    // Data states
    const [rekapData, setRekapData] = useState([])
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState({
        totalPoin: 0,
        totalKasus: 0,
        totalSantri: 0
    })

    // Detail Modal states
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [details, setDetails] = useState([])
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [showRulesModal, setShowRulesModal] = useState(false)
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)

    // WhatsApp Send Confirmation Modal states
    const [whatsappConfirm, setWhatsappConfirm] = useState({
        isOpen: false,
        santri: null,
        violations: null,
        namaWali: '',
        phoneStr: '',
        message: ''
    })

    const handleExecuteSendWhatsApp = () => {
        sendWhatsApp(whatsappConfirm.phoneStr, whatsappConfirm.message)
        setWhatsappConfirm(prev => ({ ...prev, isOpen: false }))
    }

    useEffect(() => {
        fetchRekap()
    }, [dateRange, filterStatus])

    const fetchRekap = async () => {
        setLoading(true)
        try {
            // Fetch all violations in range
            const { data, error } = await supabase
                .from('pelanggaran')
                .select(`
                    id,
                    poin,
                    tanggal,
                    status,
                    jenis,
                    deskripsi,
                    santri:santri_id (
                        id,
                        nama,
                        nis,
                        nama_wali,
                        no_telp_wali,
                        kelas:kelas_id (nama)
                    )
                `)
                .gte('tanggal', dateRange.start)
                .lte('tanggal', dateRange.end)

            if (error) throw error

            // Aggregate data by Santri
            const aggregation = data.reduce((acc, curr) => {
                let santriObj = curr.santri
                if (Array.isArray(santriObj)) {
                    santriObj = santriObj[0]
                }
                const sId = santriObj?.id
                if (!sId) return acc

                if (filterStatus && curr.status !== filterStatus) {
                    return acc
                }

                if (!acc[sId]) {
                    acc[sId] = {
                        id: sId,
                        nama: santriObj.nama,
                        nis: santriObj.nis,
                        nama_wali: santriObj.nama_wali,
                        no_telp_wali: santriObj.no_telp_wali,
                        kelas: santriObj.kelas?.nama || '-',
                        totalPoin: 0,
                        totalKasus: 0,
                        lastViolation: curr.tanggal,
                        allViolations: []
                    }
                }

                acc[sId].totalPoin += curr.poin || 0
                acc[sId].totalKasus += 1
                acc[sId].allViolations.push(curr)
                if (new Date(curr.tanggal) > new Date(acc[sId].lastViolation)) {
                    acc[sId].lastViolation = curr.tanggal
                }

                return acc
            }, {})

            const aggregatedArray = Object.values(aggregation).map(s => {
                const weeks = groupViolationsByWeek(s.allViolations);
                const activeWeek = weeks[0] || { points: 0, label: '-' };
                const { tingkat, sanksi, color } = calculateSanksiAndTingkat(activeWeek.points);
                return {
                    ...s,
                    weeks,
                    activeWeek,
                    tingkat,
                    sanksi,
                    color
                };
            }).sort((a, b) => b.totalPoin - a.totalPoin);

            setRekapData(aggregatedArray)

            // Calculate overall stats
            const totalPoin = data.reduce((sum, item) => sum + (item.poin || 0), 0)
            setStats({
                totalPoin,
                totalKasus: data.length,
                totalSantri: aggregatedArray.length
            })

        } catch (error) {
            console.error('Error fetching rekap:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchDetails = async (santri) => {
        setSelectedSantri(santri)
        setLoadingDetails(true)
        try {
            const { data, error } = await supabase
                .from('pelanggaran')
                .select('*')
                .eq('santri_id', santri.id)
                .gte('tanggal', dateRange.start)
                .lte('tanggal', dateRange.end)
                .order('tanggal', { ascending: false })

            if (error) throw error
            setDetails(data || [])
        } catch (error) {
            console.error('Error fetching details:', error.message)
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleUpdateStatus = async (violationId, newStatus) => {
        try {
            const { error } = await supabase
                .from('pelanggaran')
                .update({ status: newStatus })
                .eq('id', violationId)

            if (error) throw error

            // Update local details state to immediately reflect the change
            setDetails(prev => prev.map(v => v.id === violationId ? { ...v, status: newStatus } : v))

            // Refetch rekap to ensure the overall stats and main table are updated
            fetchRekap()
        } catch (err) {
            console.error('Error updating status:', err.message)
            alert('Gagal memperbarui status: ' + err.message)
        }
    }

    const handleBulkUpdateStatus = async (santriId, newStatus) => {
        try {
            const { error } = await supabase
                .from('pelanggaran')
                .update({ status: newStatus })
                .eq('santri_id', santriId)
                .gte('tanggal', dateRange.start)
                .lte('tanggal', dateRange.end)

            if (error) throw error

            // Update local details state
            setDetails(prev => prev.map(v => ({ ...v, status: newStatus })))

            // Refetch rekap
            fetchRekap()
        } catch (err) {
            console.error('Error bulk updating status:', err.message)
            alert('Gagal memperbarui status masal: ' + err.message)
        }
    }

    const getStudentStatus = (item) => {
        if (filterStatus) return filterStatus
        if (!item.allViolations || item.allViolations.length === 0) return 'OPEN'
        const statuses = [...new Set(item.allViolations.map(v => v.status || 'OPEN'))]
        if (statuses.length === 1) return statuses[0]
        return 'MIX'
    }

    const getStatusBadge = (status) => {
        const badges = {
            'OPEN': { icon: AlertCircle, color: 'bg-red-50 text-red-600 border-red-100', text: 'Open' },
            'PROSES': { icon: Clock, color: 'bg-amber-50 text-amber-600 border-amber-100', text: 'Proses' },
            'SELESAI': { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', text: 'Selesai' }
        }
        const badge = badges[status] || badges['OPEN']
        const Icon = badge.icon
        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${badge.color}`}>
                <Icon size={12} />
                {badge.text}
            </span>
        )
    }

    const handleSendWhatsApp = async (santri, violationsInPeriod) => {
        console.log("DEBUG: handleSendWhatsApp called with santri:", santri, "violations:", violationsInPeriod)

        let noTelpWali = santri.no_telp_wali
        let namaWali = santri.nama_wali

        // Fallback: if no_telp_wali is missing, try querying the santri table directly using santri.id
        if (!noTelpWali && santri.id) {
            console.log("DEBUG: no_telp_wali not found on object, fetching fallback from santri table for ID:", santri.id)
            try {
                const { data: freshSantri, error } = await supabase
                    .from('santri')
                    .select('nama_wali, no_telp_wali')
                    .eq('id', santri.id)
                    .single()

                if (!error && freshSantri) {
                    console.log("DEBUG: fallback fetch successful:", freshSantri)
                    noTelpWali = freshSantri.no_telp_wali
                    namaWali = freshSantri.nama_wali
                } else {
                    console.error("DEBUG: fallback fetch failed or empty:", error)
                }
            } catch (err) {
                console.error("DEBUG: Exception in fallback fetch:", err)
            }
        }

        // Final validation
        if (!noTelpWali) {
            alert(`Gagal mengirim laporan: Nomor WhatsApp wali santri tidak ditemukan di sistem untuk santri "${santri.nama}".\n\nDetail Object: ${JSON.stringify(santri)}`)
            return
        }

        // Clean & validate telephone number string
        const phoneStr = String(noTelpWali).trim()
        const cleanPhone = phoneStr.replace(/\D/g, '')
        if (!cleanPhone || cleanPhone.length < 5) {
            alert(`Gagal mengirim laporan: Nomor WhatsApp wali "${phoneStr}" tidak valid. Silakan perbarui data santri di menu Data Santri.`)
            return
        }

        const dateRangeStr = `${formatDate(dateRange.start)} s.d ${formatDate(dateRange.end)}`

        // Sum total points of violations in period
        const totalPoin = violationsInPeriod.reduce((sum, v) => sum + (v.poin || 0), 0)

        // Group the violations by week or list them
        const { tingkat, sanksi } = calculateSanksiAndTingkat(totalPoin)

        // Build list of violation descriptions
        const listPelanggaran = violationsInPeriod.map(v =>
            `- ${formatDate(v.tanggal)}: ${v.jenis || 'Pelanggaran'} (${v.poin} Poin)${v.deskripsi ? ` - "${v.deskripsi}"` : ''}`
        )

        const message = createMessage({
            intro: `LAPORAN KEDISIPLINAN SANTRI`,
            data: [
                `Kepada Yth. Wali Santri dari *${santri.nama}*`,
                `Kami ingin melaporkan catatan kedisiplinan ananda selama periode *${dateRangeStr}*:`,
                { label: 'Nama Santri', value: santri.nama },
                { label: 'Kelas', value: santri.kelas || '-' },
                { label: 'Total Poin Pelanggaran', value: `${totalPoin} Poin` },
                { label: 'Tingkat Kedisiplinan', value: tingkat },
                { label: 'Sanksi yang Harus Dijalankan', value: sanksi },
                `\n*Rincian Pelanggaran:*`,
                ...listPelanggaran
            ],
            closing: "Terima kasih atas perhatiannya. Jazakumullah Khairan"
        })

        // Open Confirmation Modal instead of native window.confirm
        setWhatsappConfirm({
            isOpen: true,
            santri,
            violations: violationsInPeriod,
            namaWali: namaWali || 'Bapak/Ibu',
            phoneStr,
            message
        })
    }

    const filteredData = rekapData.filter(item =>
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nis.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (dateStr) => {
        const options = { day: 'numeric', month: 'short', year: 'numeric' }
        return new Date(dateStr).toLocaleDateString('id-ID', options)
    }

    const exportToPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const title = `Rekap Pelanggaran Santri Periode ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;

        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(title, 14, 15);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        const datePrinted = `Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        doc.text(datePrinted, 14, 21);

        const tableHeaders = [["No", "Nama Santri", "NIS", "Kelas", "Total Kasus", "Total Poin", "Tingkat (Poin Minggu Ini)", "Sanksi Berjalan"]];
        const tableRows = filteredData.map((item, index) => [
            index + 1,
            item.nama,
            item.nis || '-',
            item.kelas || '-',
            item.totalKasus,
            item.totalPoin,
            `${item.tingkat} (${item.activeWeek.points} Pts)`,
            item.sanksi
        ]);

        autoTable(doc, {
            head: tableHeaders,
            body: tableRows,
            startY: 26,
            theme: 'striped',
            headStyles: {
                fillColor: [16, 185, 129], // Emerald 500
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [51, 65, 85] // Slate-700
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { fontStyle: 'bold' },
                4: { cellWidth: 24, halign: 'center' },
                5: { cellWidth: 24, halign: 'center' },
                6: { cellWidth: 45 }
            },
            styles: {
                overflow: 'linebreak',
                cellPadding: 4
            }
        });

        doc.save(`Rekap_Pelanggaran_${dateRange.start}_sd_${dateRange.end}.pdf`);
    };

    const exportToExcel = () => {
        const dataToExport = filteredData.map((item, index) => ({
            "No": index + 1,
            "Nama Santri": item.nama,
            "NIS": item.nis || '-',
            "Kelas": item.kelas || '-',
            "Total Kasus": item.totalKasus,
            "Total Poin": item.totalPoin,
            "Tingkat Kedisiplinan": `${item.tingkat} (${item.activeWeek.points} Pts)`,
            "Sanksi Berjalan": item.sanksi
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Pelanggaran");

        const maxWidths = [
            { wch: 6 },   // No
            { wch: 30 },  // Nama
            { wch: 15 },  // NIS
            { wch: 10 },  // Kelas
            { wch: 12 },  // Total Kasus
            { wch: 12 },  // Total Poin
            { wch: 25 },  // Tingkat
            { wch: 60 }   // Sanksi
        ];
        worksheet['!cols'] = maxWidths;

        XLSX.writeFile(workbook, `Rekap_Pelanggaran_${dateRange.start}_sd_${dateRange.end}.xlsx`);
    };

    const exportToWord = () => {
        const title = `Rekap Pelanggaran Santri Periode ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
        let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; }
                    h2 { text-align: center; margin-bottom: 5px; color: #111827; }
                    p.subtitle { text-align: center; margin-top: 0; color: #6b7280; font-size: 14px; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; }
                    th { background-color: #f9fafb; font-weight: bold; color: #374151; }
                    .center { text-align: center; }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                <p class="subtitle">Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Santri</th>
                            <th>NIS</th>
                            <th>Kelas</th>
                            <th>Total Kasus</th>
                            <th>Total Poin</th>
                            <th>Tingkat (Poin Minggu Ini)</th>
                            <th>Sanksi Berjalan</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredData.forEach((item, index) => {
            html += `
                <tr>
                    <td class="center">${index + 1}</td>
                    <td><b>${item.nama}</b></td>
                    <td>${item.nis || '-'}</td>
                    <td>${item.kelas || '-'}</td>
                    <td class="center">${item.totalKasus}</td>
                    <td class="center">${item.totalPoin}</td>
                    <td>${item.tingkat} (${item.activeWeek.points} Pts)</td>
                    <td>${item.sanksi}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Rekap_Pelanggaran_${dateRange.start}_sd_${dateRange.end}.doc`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-10">
            <PageHeader
                title="Rekap Pelanggaran"
                description="Analisis dan statistik kedisiplinan santri dalam periode tertentu"
                icon={FileText}
                actions={
                    <div className="relative">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                            className="rounded-xl flex items-center gap-2"
                        >
                            <Download size={18} />
                            <span>Unduh Laporan</span>
                        </Button>

                        {showDownloadDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDownloadDropdown(false)}></div>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <button
                                        onClick={() => {
                                            setShowDownloadDropdown(false);
                                            exportToPDF();
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        Unduh PDF
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDownloadDropdown(false);
                                            exportToExcel();
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        Unduh Excel (.xlsx)
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDownloadDropdown(false);
                                            exportToWord();
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        Unduh Word (.doc)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                }
            />

            {/* Filters Section */}
            <Card className="border-gray-100 shadow-sm overflow-visible no-print">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                            <FormInput
                                label="Dari Tanggal"
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                icon={Calendar}
                            />
                            <FormInput
                                label="Sampai Tanggal"
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                icon={Calendar}
                            />
                        </div>
                        <div className="relative w-full lg:w-80">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cari Santri</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Nama atau NIS..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                        <Button onClick={fetchRekap} disabled={loading} className="rounded-xl h-[45px] px-6">
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Filter size={18} />}
                            <span className="ml-2">Terapkan</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Total Poin</p>
                        <h4 className="text-2xl font-black text-gray-900 leading-none">{stats.totalPoin} <span className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Pts</span></h4>
                    </div>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Total Kasus</p>
                        <h4 className="text-2xl font-black text-gray-900 leading-none">{stats.totalKasus} <span className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Kasus</span></h4>
                    </div>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <User size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Santri Terlibat</p>
                        <h4 className="text-2xl font-black text-gray-900 leading-none">{stats.totalSantri} <span className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Santri</span></h4>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <Card className="border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <FileText size={16} className="text-primary-600" />
                        <span>Data Hasil Analisis</span>
                    </div>
                    {/* Tabs for Status */}
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                        {[
                            { id: '', label: 'Semua', color: 'text-gray-600', bg: 'bg-white' },
                            { id: 'OPEN', label: 'Open', color: 'text-red-600', bg: 'bg-red-50' },
                            { id: 'PROSES', label: 'Proses', color: 'text-amber-600', bg: 'bg-amber-50' },
                            { id: 'SELESAI', label: 'Selesai', color: 'text-emerald-600', bg: 'bg-emerald-50' }
                        ].map((tab) => {
                            const isActive = filterStatus === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setFilterStatus(tab.id)
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                                        ${isActive
                                            ? `${tab.bg} ${tab.color} shadow-sm border border-white`
                                            : 'text-gray-400 hover:text-gray-600'}
                                    `}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Responsive Table View */}
                <div className="no-print">
                    <ResponsiveTable
                        columns={[
                            { 
                                header: 'Peringkat', 
                                render: (row, index) => (
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${index < 3 ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-gray-100 text-gray-500'}`}>
                                        {index + 1}
                                    </div>
                                ), 
                                className: 'px-8 py-5 w-16',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Santri', 
                                render: (row) => (
                                    <>
                                        <div className="font-black text-gray-900 group-hover:text-primary-600 transition-colors leading-tight">
                                            {row.nama}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            NIS: {row.nis} • {row.kelas}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            {getStatusBadge(getStudentStatus(row))}
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                {getStudentStatus(row) === 'SELESAI'
                                                    ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
                                                    : formatDate(row.lastViolation)}
                                            </span>
                                        </div>
                                    </>
                                ), 
                                className: 'px-8 py-5'
                            },
                            { 
                                header: 'Total Kasus', 
                                render: (row) => (
                                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-black">
                                        {row.totalKasus}
                                    </span>
                                ), 
                                className: 'px-8 py-5 text-center',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Total Poin', 
                                render: (row) => (
                                    <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-black border border-red-100">
                                        {row.totalPoin}
                                    </span>
                                ), 
                                className: 'px-8 py-5 text-center',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Tingkat & Sanksi Mingguan', 
                                render: (row) => (
                                    <div className="flex flex-col gap-1 max-w-xs">
                                        <span className={`w-fit px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-${row.color}-50 text-${row.color}-600 border border-${row.color}-100`}>
                                            {row.tingkat} ({row.activeWeek.points} Pts)
                                        </span>
                                        <span className="text-xs text-gray-500 font-bold truncate leading-snug" title={row.sanksi}>
                                            {row.sanksi}
                                        </span>
                                    </div>
                                ), 
                                className: 'px-8 py-5',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Aksi', 
                                render: (row) => (
                                    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            value={getStudentStatus(row)}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value;
                                                if (newStatus === 'MIX') return;
                                                await handleBulkUpdateStatus(row.id, newStatus);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer transition-all
                                                ${getStudentStatus(row) === 'SELESAI' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50' :
                                                    getStudentStatus(row) === 'PROSES' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50' :
                                                        getStudentStatus(row) === 'OPEN' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100/50' :
                                                            'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}
                                            `}
                                            style={{ minWidth: '110px' }}
                                        >
                                            <option value="MIX" disabled className="bg-white text-gray-400">Status...</option>
                                            <option value="OPEN" className="bg-white text-red-600 font-bold">Open</option>
                                            <option value="PROSES" className="bg-white text-amber-600 font-bold">Proses</option>
                                            <option value="SELESAI" className="bg-white text-emerald-600 font-bold">Selesai</option>
                                        </select>
                                        <button
                                            onClick={() => handleSendWhatsApp(row, row.allViolations)}
                                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100 flex items-center justify-center shrink-0"
                                            title="Kirim Laporan WhatsApp"
                                        >
                                            <MessageCircle size={14} />
                                        </button>
                                        <div
                                            onClick={() => fetchDetails(row)}
                                            className="flex items-center gap-1 text-primary-600 font-bold text-xs uppercase tracking-widest hover:text-primary-700 transition-colors cursor-pointer shrink-0"
                                        >
                                            Rincian <ChevronRight size={14} />
                                        </div>
                                    </div>
                                ), 
                                className: 'px-8 py-5 text-right',
                                hideOnMobile: false
                            }
                        ]}
                        data={filteredData}
                        loading={loading}
                        onRowClick={(row) => fetchDetails(row)}
                        emptyState={
                            <EmptyState icon={CheckCircle} title="Tidak Ada Data" message="Tidak ada catatan pelanggaran dalam periode ini." />
                        }
                        mobileCardHeader={(row, index) => (
                            <div className="flex items-start gap-3 w-full">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${index < 3 ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-gray-100 text-gray-500'}`}>
                                    {index + 1}
                                </div>
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="font-black text-gray-900 text-base leading-tight truncate">{row.nama}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        NIS: {row.nis} • {row.kelas}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                        {getStatusBadge(getStudentStatus(row))}
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                            {getStudentStatus(row) === 'SELESAI'
                                                ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
                                                : formatDate(row.lastViolation)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        mobileCardContent={(row) => (
                            <div className="w-full mt-4 space-y-3">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="text-center py-1">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Kasus</div>
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-black">
                                            {row.totalKasus} Kasus
                                        </span>
                                    </div>
                                    <div className="text-center py-1 border-l border-gray-200">
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Poin</div>
                                        <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-black border border-red-100">
                                            {row.totalPoin} PTS
                                        </span>
                                    </div>
                                </div>

                                {/* Sanction Banner */}
                                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-${row.color}-50 text-${row.color}-600 border border-${row.color}-100`}>
                                            {row.tingkat}
                                        </span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Sanksi Mingguan:</span>
                                    </div>
                                    <p className="text-xs text-gray-600 font-bold leading-relaxed">{row.sanksi}</p>
                                </div>

                                {/* Action Row */}
                                <div className="flex items-center justify-between gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Status:</span>
                                        <select
                                            value={getStudentStatus(row)}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value;
                                                if (newStatus === 'MIX') return;
                                                await handleBulkUpdateStatus(row.id, newStatus);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer transition-all
                                                ${getStudentStatus(row) === 'SELESAI' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50' :
                                                    getStudentStatus(row) === 'PROSES' ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50' :
                                                        getStudentStatus(row) === 'OPEN' ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100/50' :
                                                            'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}
                                            `}
                                            style={{ minWidth: '110px' }}
                                        >
                                            <option value="MIX" disabled className="bg-white text-gray-400">Status...</option>
                                            <option value="OPEN" className="bg-white text-red-600 font-bold">Open</option>
                                            <option value="PROSES" className="bg-white text-amber-600 font-bold">Proses</option>
                                            <option value="SELESAI" className="bg-white text-emerald-600 font-bold">Selesai</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSendWhatsApp(row, row.allViolations)}
                                            className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center"
                                            title="WhatsApp Wali"
                                        >
                                            <MessageCircle size={16} />
                                        </button>
                                        <button
                                            onClick={() => fetchDetails(row)}
                                            className="inline-flex items-center gap-1 text-primary-600 font-black text-xs uppercase tracking-widest hover:text-primary-700 transition-colors"
                                        >
                                            Rincian <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                </div>
            </Card>

            {/* Bottom Actions / Reference */}
            <div className="flex justify-center pt-4 no-print">
                <Button
                    variant="secondary"
                    onClick={() => setShowRulesModal(true)}
                    className="rounded-xl border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-200 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 px-5 py-2.5"
                >
                    <BookOpen size={14} />
                    Lihat Ketentuan Poin & Sanksi
                </Button>
            </div>

            {/* Detail Modal Overly */}
            {selectedSantri && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedSantri(null)}></div>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] overflow-hidden relative shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex items-start justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 leading-tight mb-1">{selectedSantri.nama}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Rincian Pelanggaran Periode Rekap</p>
                            </div>
                            <button
                                onClick={() => setSelectedSantri(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
                            {/* Bulk Update Section */}
                            {!loadingDetails && details.length > 0 && (
                                <div className="mt-6 p-5 bg-primary-50 rounded-2xl border border-primary-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h5 className="text-xs font-black text-primary-800 uppercase tracking-wider">Ubah Status Semua Pelanggaran Terfilter</h5>
                                        <p className="text-[11px] text-primary-600 font-medium">Ubah status seluruh {details.length} pelanggaran terfilter di bawah ini sekaligus.</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {['OPEN', 'PROSES', 'SELESAI'].map((st) => (
                                            <button
                                                key={st}
                                                onClick={() => handleBulkUpdateStatus(selectedSantri.id, st)}
                                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm hover:scale-105 active:scale-95
                                                    ${st === 'OPEN' ? 'border-red-200 text-red-600 bg-white hover:bg-red-50' :
                                                        st === 'PROSES' ? 'border-amber-200 text-amber-600 bg-white hover:bg-amber-50' :
                                                            'border-emerald-200 text-emerald-600 bg-white hover:bg-emerald-50'}
                                                `}
                                            >
                                                {st === 'OPEN' ? 'Open' : st === 'PROSES' ? 'Proses' : 'Selesai'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-8 mt-6">
                                {loadingDetails ? (
                                    <div className="py-20 flex flex-col items-center"><Spinner label="Memuat rincian..." /></div>
                                ) : details.length === 0 ? (
                                    <EmptyState icon={CheckCircle} title="Alhamdulillah" message="Tidak ada rincian data." />
                                ) : (
                                    groupViolationsByWeek(details).map((weekData) => {
                                        const { tingkat, sanksi, color } = calculateSanksiAndTingkat(weekData.points);
                                        return (
                                            <div key={weekData.key} className="space-y-4">
                                                {/* Week Header Banner */}
                                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider">
                                                            <Calendar size={14} className="text-primary-600" />
                                                            {weekData.label}
                                                        </div>
                                                        <div className="text-sm font-bold text-gray-800">
                                                            Total Akumulasi: <span className="text-red-600 font-black">{weekData.points} Poin</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 items-start md:items-end">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-${color}-50 text-${color}-600 border border-${color}-100`}>
                                                            Tingkat {tingkat}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-500 italic max-w-sm text-left md:text-right leading-snug">
                                                            Sanksi: {sanksi}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Incidents in this Week */}
                                                <div className="space-y-3 pl-4">
                                                    {weekData.violations.map((violation) => (
                                                        <div key={violation.id} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-100 last:before:hidden">
                                                            <div className="absolute left-[-3px] top-2 w-2 h-2 rounded-full bg-gray-300 border-2 border-white shadow-sm"></div>
                                                            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2.5 hover:shadow-md transition-shadow">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                        {formatDate(violation.tanggal)}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <select
                                                                            value={violation.status || 'OPEN'}
                                                                            onChange={(e) => handleUpdateStatus(violation.id, e.target.value)}
                                                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none
                                                                                ${violation.status === 'SELESAI' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                                    violation.status === 'PROSES' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                                        'bg-red-50 text-red-600 border-red-100'}
                                                                            `}
                                                                            style={{ minWidth: '110px' }}
                                                                        >
                                                                            <option value="OPEN" className="bg-white text-red-600 font-bold">Open</option>
                                                                            <option value="PROSES" className="bg-white text-amber-600 font-bold">Proses</option>
                                                                            <option value="SELESAI" className="bg-white text-emerald-600 font-bold">Selesai</option>
                                                                        </select>
                                                                        <div className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[9px] font-black border border-red-100">
                                                                            +{violation.poin} Pts
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <h6 className="text-sm font-bold text-gray-800">{violation.jenis}</h6>
                                                                {violation.deskripsi && (
                                                                    <p className="text-xs text-gray-500 leading-relaxed italic">"{violation.deskripsi}"</p>
                                                                )}
                                                                <div className="flex items-center gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-50">
                                                                    <div className="flex items-center gap-1"><MapPin size={10} /> {violation.lokasi || '-'}</div>
                                                                    <div className="flex items-center gap-1"><Users size={10} /> Saksi: {violation.saksi || '-'}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                            <Button
                                variant="success"
                                onClick={() => handleSendWhatsApp(selectedSantri, details)}
                                className="rounded-xl flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                            >
                                <MessageCircle size={16} />
                                <span>Kirim Laporan WA</span>
                            </Button>
                            <Button variant="secondary" onClick={() => setSelectedSantri(null)} className="rounded-xl">Tutup Rincian</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules Modal Overlay */}
            {showRulesModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowRulesModal(false)}></div>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden relative shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex items-start justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 leading-tight mb-1">Ketentuan Poin & Sanksi Mingguan</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Acuan Akumulasi Kedisiplinan Santri</p>
                            </div>
                            <button
                                onClick={() => setShowRulesModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <p className="text-xs text-gray-500 font-bold leading-relaxed bg-gray-50 rounded-xl border border-gray-100 p-4">
                                Sanksi dihitung secara otomatis berdasarkan akumulasi total poin pelanggaran yang diterima santri dalam periode satu minggu.
                            </p>                             <div className="space-y-4">
                                {/* Rule 1 */}
                                <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100/50 space-y-3">
                                    <span className="inline-flex px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        Ringan
                                    </span>
                                    <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Poin 1 - 3</h5>
                                        <p className="text-sm font-bold text-gray-800 leading-relaxed">
                                            Menghafalkan mufrodat 15 (per kelipatan)
                                        </p>
                                    </div>
                                </div>

                                {/* Rule 2 */}
                                <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-100/50 space-y-3">
                                    <span className="inline-flex px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                                        Sedang
                                    </span>
                                    <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Poin 4 - 6</h5>
                                        <p className="text-sm font-bold text-gray-800 leading-relaxed">
                                            Menulis istighfar 500 kali didepan dhalem pengasuh setelah sholat Jum'at dan memakai rompi
                                        </p>
                                    </div>
                                </div>

                                {/* Rule 3 */}
                                <div className="p-5 rounded-2xl bg-red-50/40 border border-red-100/50 space-y-3">
                                    <span className="inline-flex px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">
                                        Berat
                                    </span>
                                    <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Poin 7 - 9</h5>
                                        <p className="text-sm font-bold text-gray-800 leading-relaxed">
                                            Meminta surat pernyataan kepada pengasuh dan botak abri
                                        </p>
                                    </div>
                                </div>

                                {/* Rule 4 */}
                                <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-100/50 space-y-3">
                                    <span className="inline-flex px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100">
                                        Sangat Berat
                                    </span>
                                    <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Poin 10+</h5>
                                        <p className="text-sm font-bold text-gray-800 leading-relaxed">
                                            Botak bersih dan membuat surat pernyataan kepada pengasuh kemudian dikabari kepada wali secara online / whatsapp
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <Button variant="secondary" onClick={() => setShowRulesModal(false)} className="rounded-xl">Tutup</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Send Confirmation Modal */}
            <ConfirmationModal
                isOpen={whatsappConfirm.isOpen}
                onClose={() => setWhatsappConfirm(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleExecuteSendWhatsApp}
                title="Kirim Laporan WhatsApp"
                message={`Kirim laporan kedisiplinan ${whatsappConfirm.santri?.nama || ''} kepada wali santri (${whatsappConfirm.namaWali}) via WhatsApp?`}
                description="Tindakan ini akan membuka WhatsApp Web / Aplikasi dengan pesan laporan yang sudah terformat otomatis."
                confirmLabel="Ya, Kirim WA"
                cancelLabel="Batal"
                variant="success"
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                @media print {
                    aside, nav, header, .sidebar, .navbar, .no-print, button, .rounded-xl.border-gray-200 {
                        display: none !important;
                    }
                    body, html, main, #root {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }
                    table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                    }
                    th, td {
                        border: 1px solid #e2e8f0 !important;
                        padding: 8px 12px !important;
                        font-size: 11px !important;
                    }
                    th {
                        background-color: #f8fafc !important;
                        color: #0f172a !important;
                        font-weight: bold !important;
                    }
                }
            `}</style>
        </div>
    )
}

// Inline Icon Components for easier access
const MapPin = ({ size, className }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>

export default PelanggaranRekap
