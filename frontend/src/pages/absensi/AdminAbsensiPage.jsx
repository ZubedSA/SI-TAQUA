import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { 
    Users, 
    QrCode, 
    Calendar, 
    Filter, 
    Download, 
    Printer, 
    Search, 
    RefreshCw, 
    BookOpen, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    Clock,
    UserCheck,
    FileText,
    Eye,
    X,
    Edit2,
    ArrowLeft
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKelas, useHalaqoh, useJurnal, useMapel } from '../../hooks/useAkademik'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const AdminAbsensiPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const isStandalone = location.pathname.startsWith('/absensi')
    const { isAdmin, isAdminAbsensi, signOut } = useAuth()
    const showToast = useToast()
    const { data: kelasList = [] } = useKelas()
    const { data: halaqohList = [] } = useHalaqoh()
    const { data: mapelList = [] } = useMapel()

    const activeTab = searchParams.get('tab') || 'rekap'
    const setActiveTab = (tab) => setSearchParams({ tab })

    const hasAccess = isAdmin() || isAdminAbsensi()
    const [presensiStaf, setPresensiStaf] = useState([])
    const [loading, setLoading] = useState(false)
    const [presensiData, setPresensiData] = useState([])
    
    // Filters
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
    const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0])
    const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedSantriId, setSelectedSantriId] = useState(null)
    const [selectedGuruId, setSelectedGuruId] = useState(null)
    const [editingSession, setEditingSession] = useState(null)
    const [manualKeterangan, setManualKeterangan] = useState('')
    const [allJadwal, setAllJadwal] = useState([])
    const [filterType, setFilterType] = useState('Semua') // 'Semua', 'Madrosah', 'Quraniyah'
    const [searchTerm, setSearchTerm] = useState('')
    const [filterGuru, setFilterGuru] = useState('')

    const [guruList, setGuruList] = useState([])

    // Data for Jurnal Tab
    const { data: agendaList = [], isLoading: loadingAgenda } = useJurnal({
        tanggal: filterDate,
        guru_id: filterGuru || null
    })

    // QR Management State
    const [selectedQR, setSelectedQR] = useState(null)
    const printRef = useRef(null)
    const [laporanSubTab, setLaporanSubTab] = useState('staf') // 'staf' atau 'santri'
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)

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

        const isStaf = laporanSubTab === 'staf';
        const title = isStaf 
            ? `Laporan Kehadiran Staf Periode ${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`
            : `Laporan Kehadiran Santri Periode ${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`;
        
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(title, 14, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        const datePrinted = `Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        doc.text(datePrinted, 14, 21);

        let tableHeaders, tableRows, columnStyles;

        if (isStaf) {
            tableHeaders = [["No", "Nama Pengajar", "Email", "Hadir", "Alpha", "Score Kehadiran (%)"]];
            tableRows = aggregatedStaf.map((item, index) => {
                const total = item.Hadir + item.Alpha;
                const score = total > 0 ? Math.round((item.Hadir / total) * 100) : 0;
                return [
                    index + 1,
                    item.nama,
                    item.email || '-',
                    item.Hadir,
                    item.Alpha,
                    `${score}%`
                ];
            });
            columnStyles = {
                0: { cellWidth: 12, halign: 'center' },
                1: { fontStyle: 'bold' },
                3: { cellWidth: 24, halign: 'center' },
                4: { cellWidth: 24, halign: 'center' },
                5: { cellWidth: 40, halign: 'center' }
            };
        } else {
            tableHeaders = [["No", "Nama Santri", "NIS", "Kelas / Halaqoh", "Hadir", "Sakit", "Izin", "Alpha"]];
            tableRows = aggregatedSantri.map((item, index) => [
                index + 1,
                item.nama,
                item.nis || '-',
                item.grup || '-',
                item.Hadir,
                item.Sakit,
                item.Izin,
                item.Alpha
            ]);
            columnStyles = {
                0: { cellWidth: 12, halign: 'center' },
                1: { fontStyle: 'bold' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 20, halign: 'center' },
                7: { cellWidth: 20, halign: 'center' }
            };
        }

        autoTable(doc, {
            head: tableHeaders,
            body: tableRows,
            startY: 26,
            theme: 'striped',
            headStyles: {
                fillColor: isStaf ? [79, 70, 229] : [16, 185, 129], // Indigo 600 or Emerald 500
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left'
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [51, 65, 85] // Slate-700
            },
            columnStyles: columnStyles,
            styles: {
                overflow: 'linebreak',
                cellPadding: 4
            }
        });

        doc.save(`Laporan_Kehadiran_${isStaf ? 'Staf' : 'Santri'}_${filterStartDate}_sd_${filterEndDate}.pdf`);
    };

    const exportToExcel = () => {
        const isStaf = laporanSubTab === 'staf';
        let dataToExport, maxWidths, sheetName;

        if (isStaf) {
            sheetName = "Laporan Kehadiran Staf";
            dataToExport = aggregatedStaf.map((item, index) => {
                const total = item.Hadir + item.Alpha;
                const score = total > 0 ? Math.round((item.Hadir / total) * 100) : 0;
                return {
                    "No": index + 1,
                    "Nama Pengajar": item.nama,
                    "Email": item.email || '-',
                    "Hadir": item.Hadir,
                    "Alpha": item.Alpha,
                    "Score Kehadiran": `${score}%`
                };
            });
            maxWidths = [
                { wch: 6 },   // No
                { wch: 30 },  // Nama
                { wch: 25 },  // Email
                { wch: 10 },  // Hadir
                { wch: 10 },  // Alpha
                { wch: 18 }   // Score
            ];
        } else {
            sheetName = "Laporan Kehadiran Santri";
            dataToExport = aggregatedSantri.map((item, index) => ({
                "No": index + 1,
                "Nama Santri": item.nama,
                "NIS": item.nis || '-',
                "Kelas / Halaqoh": item.grup || '-',
                "Hadir": item.Hadir,
                "Sakit": item.Sakit,
                "Izin": item.Izin,
                "Alpha": item.Alpha
            }));
            maxWidths = [
                { wch: 6 },   // No
                { wch: 30 },  // Nama
                { wch: 15 },  // NIS
                { wch: 20 },  // Kelas/Halaqoh
                { wch: 10 },  // Hadir
                { wch: 10 },  // Sakit
                { wch: 10 },  // Izin
                { wch: 10 }   // Alpha
            ];
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        worksheet['!cols'] = maxWidths;

        XLSX.writeFile(workbook, `Laporan_Kehadiran_${isStaf ? 'Staf' : 'Santri'}_${filterStartDate}_sd_${filterEndDate}.xlsx`);
    };

    const exportToWord = () => {
        const isStaf = laporanSubTab === 'staf';
        const title = isStaf 
            ? `Laporan Kehadiran Staf Periode ${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`
            : `Laporan Kehadiran Santri Periode ${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`;
        
        let tableHeaderHtml = '';
        let tableBodyHtml = '';

        if (isStaf) {
            tableHeaderHtml = `
                <tr>
                    <th>No</th>
                    <th>Nama Pengajar</th>
                    <th>Email</th>
                    <th>Hadir</th>
                    <th>Alpha</th>
                    <th>Score Kehadiran</th>
                </tr>
            `;
            aggregatedStaf.forEach((item, index) => {
                const total = item.Hadir + item.Alpha;
                const score = total > 0 ? Math.round((item.Hadir / total) * 100) : 0;
                tableBodyHtml += `
                    <tr>
                        <td class="center">${index + 1}</td>
                        <td><b>${item.nama}</b></td>
                        <td>${item.email || '-'}</td>
                        <td class="center">${item.Hadir}</td>
                        <td class="center">${item.Alpha}</td>
                        <td class="center">${score}%</td>
                    </tr>
                `;
            });
        } else {
            tableHeaderHtml = `
                <tr>
                    <th>No</th>
                    <th>Nama Santri</th>
                    <th>NIS</th>
                    <th>Kelas / Halaqoh</th>
                    <th>Hadir</th>
                    <th>Sakit</th>
                    <th>Izin</th>
                    <th>Alpha</th>
                </tr>
            `;
            aggregatedSantri.forEach((item, index) => {
                tableBodyHtml += `
                    <tr>
                        <td class="center">${index + 1}</td>
                        <td><b>${item.nama}</b></td>
                        <td>${item.nis || '-'}</td>
                        <td>${item.grup || '-'}</td>
                        <td class="center">${item.Hadir}</td>
                        <td class="center">${item.Sakit}</td>
                        <td class="center">${item.Izin}</td>
                        <td class="center">${item.Alpha}</td>
                    </tr>
                `;
            });
        }

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
                        ${tableHeaderHtml}
                    </thead>
                    <tbody>
                        ${tableBodyHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Laporan_Kehadiran_${isStaf ? 'Staf' : 'Santri'}_${filterStartDate}_sd_${filterEndDate}.doc`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchGuru()
        fetchAllJadwal()
    }, [])

    const fetchAllJadwal = async () => {
        const { data } = await supabase.from('jadwal_pelajaran').select('*')
        setAllJadwal(data || [])
    }

    const fetchGuru = async () => {
        const { data } = await supabase.from('guru').select('id, nama').order('nama')
        setGuruList(data || [])
    }

    useEffect(() => {
        if (activeTab === 'rekap' || activeTab === 'laporan') {
            fetchPresensi()
        }
        if (activeTab === 'staf' || activeTab === 'laporan') {
            fetchPresensiStaf()
        }
    }, [activeTab, filterDate, filterStartDate, filterEndDate, filterType])

    const fetchPresensiStaf = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('presensi_staf')
                .select('*, guru:guru!staf_id(nama, email)')
            
            if (activeTab === 'laporan') {
                query = query.gte('tanggal', filterStartDate).lte('tanggal', filterEndDate)
            } else {
                query = query.eq('tanggal', filterDate)
            }

            const { data, error } = await query.order('waktu_scan', { ascending: false })

            if (error) throw error
            setPresensiStaf(data || [])
        } catch (err) {
            console.error('Error fetching presensi staf:', err)
            // If table doesn't exist, we don't want to break the whole page
            setPresensiStaf([])
        } finally {
            setLoading(false)
        }
    }

    const handleSaveManualHadir = async () => {
        if (!editingSession || !manualKeterangan) return

        try {
            const { error } = await supabase
                .from('presensi_staf')
                .insert({
                    staf_id: selectedGuruId,
                    tanggal: editingSession.tanggal,
                    tipe: editingSession.tipe,
                    referensi_id: editingSession.referensi_id,
                    jam_ke: editingSession.jam_ke,
                    waktu_scan: new Date().toISOString()
                })

            if (error) throw error

            showToast.success('Status berhasil diubah menjadi Hadir')
            setEditingSession(null)
            setManualKeterangan('')
            fetchPresensiStaf()
        } catch (err) {
            console.error('Error manual adjustment:', err)
            showToast.error('Gagal mengubah status')
        }
    }

    const fetchPresensi = async () => {
        setLoading(true)
        try {
            // Jika tab laporan, gunakan range
            const isRange = activeTab === 'laporan'

            let query = supabase
                .from('presensi')
                .select(`
                    *,
                    santri:santri!santri_id(
                        id, 
                        nama, 
                        nis, 
                        kelas:kelas!kelas_id(nama),
                        halaqoh:halaqoh!halaqoh_id(nama)
                    )
                `)

            if (isRange) {
                query = query.gte('tanggal', filterStartDate).lte('tanggal', filterEndDate)
            } else {
                query = query.eq('tanggal', filterDate)
            }

            query = query.order('created_at', { ascending: false })

            const { data, error } = await query
            if (error) throw error
            setPresensiData(data || [])
        } catch (err) {
            console.error('Error fetching presensi:', err)
            showToast.error('Gagal memuat data presensi')
        } finally {
            setLoading(false)
        }
    }

    // 1. Filter data mentah menjadi data yang siap ditampilkan di Rekap
    const filteredPresensi = React.useMemo(() => {
        return presensiData.filter(p => {
            const isQuraniyah = p.keterangan?.includes('[Quraniyah]') || (p.santri?.halaqoh && !p.santri?.kelas)
            const matchesType = 
                filterType === 'Semua' || 
                (filterType === 'Madrosah' && !isQuraniyah) || 
                (filterType === 'Quraniyah' && isQuraniyah)
            
            if (!matchesType) return false

            const searchLower = searchTerm.toLowerCase()
            return (
                (p.santri?.nama || '').toLowerCase().includes(searchLower) ||
                (p.santri?.nis || '').toLowerCase().includes(searchLower)
            )
        })
    }, [presensiData, filterType, searchTerm])

    // 2. Agregasi data dari filteredPresensi untuk Laporan
    const aggregatedSantri = React.useMemo(() => {
        const map = {}
        filteredPresensi.forEach(p => {
            const isQuraniyah = p.keterangan?.includes('[Quraniyah]') || (p.santri?.halaqoh && !p.santri?.kelas)
            const id = p.santri_id
            if (!map[id]) {
                map[id] = {
                    id,
                    nama: p.santri?.nama,
                    nis: p.santri?.nis,
                    grup: isQuraniyah ? p.santri?.halaqoh?.nama : p.santri?.kelas?.nama,
                    Hadir: 0,
                    Sakit: 0,
                    Izin: 0,
                    Alpha: 0
                }
            }
            // Logika Case-Insensitive untuk status (Aman terhadap HADIR, Hadir, alpha, alpa, dll)
            const s = (p.status || '').toLowerCase()
            if (s === 'hadir') map[id].Hadir++
            else if (s === 'sakit') map[id].Sakit++
            else if (s === 'izin' || s === 'pulang') map[id].Izin++
            else if (['alpha', 'alpa', 'alfa'].includes(s)) map[id].Alpha++
        })
        return Object.values(map)
    }, [filteredPresensi])

    // Logika Agregasi untuk Laporan Staf (Cross-Check dengan Jadwal)
    const aggregatedStaf = React.useMemo(() => {
        if (!allJadwal.length) return []

        const stafSummary = {}
        
        // 1. Dapatkan daftar tanggal dalam rentang
        const start = new Date(filterStartDate)
        const end = new Date(filterEndDate)
        const dates = []
        let curr = new Date(start)
        while (curr <= end) {
            dates.push(new Date(curr))
            curr.setDate(curr.getDate() + 1)
        }

        // 2. Untuk setiap staf di jadwal, inisialisasi rekap
        const allGuruIds = [...new Set(allJadwal.map(j => j.guru_id))]
        allGuruIds.forEach(gid => {
            const guru = guruList.find(g => g.id === gid)
            stafSummary[gid] = {
                id: gid,
                nama: guru?.nama || 'Unknown',
                email: guru?.email || '-',
                Hadir: 0,
                Alpha: 0,
                details: []
            }
        })

        // 3. Iterasi setiap hari dan bandingkan dengan jadwal
        dates.forEach(date => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
            const dayName = dayMap[date.getDay()]

            const jadwalHariIni = allJadwal.filter(j => j.hari === dayName)
            
            jadwalHariIni.forEach(j => {
                if (!stafSummary[j.guru_id]) return

                // Cek apakah ada scan untuk jadwal ini (berdasarkan Guru, Tanggal, dan Jam Ke/Waktu)
                const hasScan = presensiStaf.some(p => {
                    const isSameGuru = p.staf_id === j.guru_id
                    const isSameDate = p.tanggal === dateStr
                    
                    if (!isSameGuru || !isSameDate) return false

                    // 1. Cek kecocokan jam_ke (Utama)
                    if (Number(p.jam_ke) === Number(j.jam_ke)) return true

                    // 2. Fallback: Cek apakah waktu scan masuk dalam rentang jam pelajaran (Toleransi 30 Menit)
                    if (p.waktu_scan && j.jam_mulai && j.jam_selesai) {
                        const scanTime = new Date(p.waktu_scan)
                        const scanMinutes = scanTime.getHours() * 60 + scanTime.getMinutes()
                        
                        const [hM, mM] = j.jam_mulai.split(':').map(Number)
                        const [hS, mS] = j.jam_selesai.split(':').map(Number)
                        
                        const startLimit = hM * 60 + mM - 30
                        const endLimit = hS * 60 + mS + 30
                        
                        return scanMinutes >= startLimit && scanMinutes <= endLimit
                    }

                    return false
                })

                if (hasScan) {
                    stafSummary[j.guru_id].Hadir++
                    stafSummary[j.guru_id].details.push({
                        tanggal: dateStr,
                        jam_ke: j.jam_ke,
                        tipe: j.tipe,
                        referensi_id: j.referensi_id,
                        status: 'Hadir'
                    })
                } else {
                    stafSummary[j.guru_id].Alpha++
                    stafSummary[j.guru_id].details.push({
                        tanggal: dateStr,
                        jam_ke: j.jam_ke,
                        tipe: j.tipe,
                        referensi_id: j.referensi_id,
                        status: 'Alpha'
                    })
                }
            })
        })

        return Object.values(stafSummary).sort((a, b) => b.Alpha - a.Alpha)
    }, [presensiStaf, allJadwal, filterStartDate, filterEndDate, guruList])

    const handlePrintQR = () => {
        window.print()
    }


    const stats = React.useMemo(() => {
        const santriHadir = presensiData.filter(p => (p.status || '').toLowerCase() === 'hadir').length
        const stafHadir = presensiStaf.length
        const jurnalTerisi = agendaList.filter(a => a.jurnal).length
        const totalAgenda = agendaList.length

        return [
            { label: 'Santri Hadir', value: santriHadir, icon: Users, color: 'emerald' },
            { label: 'Staf Hadir', value: stafHadir, icon: UserCheck, color: 'blue' },
            { label: 'Jurnal Kelas', value: `${jurnalTerisi}/${totalAgenda}`, icon: BookOpen, color: 'amber' },
            { label: 'Total Scan', value: presensiData.length + presensiStaf.length, icon: QrCode, color: 'indigo' }
        ]
    }, [presensiData, presensiStaf, agendaList])

    return (
        <div className={`relative space-y-8 animate-fade-in pb-20 ${isStandalone ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8' : ''}`}>
            <PageHeader 
                title={
                    activeTab === 'rekap' ? 'Rekap Santri' :
                    activeTab === 'staf' ? 'Kehadiran Staf' :
                    activeTab === 'jurnal' ? 'Agenda Mengajar' :
                    activeTab === 'laporan' ? 'Laporan Kehadiran' :
                    activeTab === 'qr' ? 'Manajemen QR Code' :
                    'Admin Absensi'
                }
                description={
                    activeTab === 'rekap' ? 'Rekapitulasi data kehadiran santri' :
                    activeTab === 'staf' ? 'Monitoring kehadiran staf pengajar' :
                    activeTab === 'jurnal' ? 'Jurnal dan agenda mengajar hari ini' :
                    activeTab === 'laporan' ? 'Laporan kehadiran santri per periode' :
                    activeTab === 'qr' ? 'Kelola dan cetak kode QR kelas & halaqoh' :
                    'Pusat rekapitulasi kehadiran'
                }
                icon={
                    activeTab === 'rekap' ? Users :
                    activeTab === 'staf' ? UserCheck :
                    activeTab === 'jurnal' ? Calendar :
                    activeTab === 'laporan' ? FileText :
                    activeTab === 'qr' ? QrCode :
                    Users
                }
                actions={
                    activeTab === 'laporan' && (
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
                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            Unduh PDF
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowDownloadDropdown(false);
                                                exportToExcel();
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            Unduh Excel (.xlsx)
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowDownloadDropdown(false);
                                                exportToWord();
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            Unduh Word (.doc)
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                }
            />

            {/* Quick Stats Row - Premium Siohioma Style */}
            {activeTab !== 'qr' && activeTab !== 'laporan' && (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 mt-6">
                    {stats.map((stat, i) => (
                        <div key={i} className={`bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:border-${stat.color}-300 transition-all duration-300 relative overflow-hidden`}>
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500`}></div>
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 bg-${stat.color}-100 text-${stat.color}-600 rounded-2xl`}>
                                    <stat.icon size={24} />
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-500 font-medium mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                    {stat.value}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}



            {activeTab === 'rekap' ? (
                <div className="space-y-8 animate-slide-up">
                    <Card variant="premium" className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                    <input 
                                        type="date" 
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm bg-gray-50/30"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipe Absensi</label>
                                <select 
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm bg-gray-50/30 appearance-none"
                                >
                                    <option value="Semua">Semua Tipe</option>
                                    <option value="Madrosah">Madrosah (Kelas)</option>
                                    <option value="Quraniyah">Qur'aniyah (Halaqoh)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cari Santri</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Nama atau NIS..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm bg-gray-50/30"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card variant="premium" className="overflow-hidden p-0 border-none shadow-2xl">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50">
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                        <th className="px-8 py-6">Waktu</th>
                                        <th className="px-8 py-6">Santri</th>
                                        <th className="px-8 py-6">Grup</th>
                                        <th className="px-8 py-6 text-center">Status</th>
                                        <th className="px-8 py-6">Keterangan</th>
                                        <th className="px-8 py-6">Operator</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan="6" className="px-8 py-20 text-center"><Spinner label="Syncing Attendance Data..." /></td></tr>
                                    ) : filteredPresensi.length === 0 ? (
                                        <tr><td colSpan="6" className="px-8 py-20"><EmptyState icon={Calendar} title="No Data Found" message="Belum ada catatan presensi untuk kriteria ini." /></td></tr>
                                    ) : (
                                        filteredPresensi.map((p, index) => {
                                            const isQuraniyah = p.keterangan?.includes('[Quraniyah]')
                                            return (
                                                <tr key={`${p.id}-${index}`} className="hover:bg-gray-50/80 transition-all group">
                                                    <td className="px-8 py-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-white shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                                                                <Clock size={16} />
                                                            </div>
                                                            <span className="font-black text-gray-900">{new Date(p.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="font-black text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">{p.santri?.nama}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.santri?.nis}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/50 w-fit">
                                                            {isQuraniyah ? <Users size={12} className="text-blue-500" /> : <BookOpen size={12} className="text-emerald-500" />}
                                                            <span className="text-xs font-black text-gray-600 uppercase tracking-tighter">
                                                                {isQuraniyah ? (p.santri?.halaqoh?.nama || '-') : (p.santri?.kelas?.nama || '-')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <Badge variant={
                                                            (p.status || '').toLowerCase() === 'hadir' ? 'success' :
                                                            (p.status || '').toLowerCase() === 'sakit' ? 'warning' :
                                                            (p.status || '').toLowerCase() === 'izin' ? 'info' : 
                                                            (p.status || '').toLowerCase() === 'pulang' ? 'neutral' : 'danger'
                                                        } className="px-4 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                                            {p.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-6 text-gray-500 text-xs font-medium italic max-w-[200px] truncate">
                                                        {p.keterangan?.replace('[Quraniyah] ', '') || '-'}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-lg shadow-slate-200">
                                                                {p.nama_pengabsen?.charAt(0) || '?'}
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.nama_pengabsen || '-'}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="md:hidden">
                            <div className="grid grid-cols-2 bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Santri</div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {loading ? (
                                    <div className="px-8 py-10 text-center"><Spinner label="Syncing..." /></div>
                                ) : filteredPresensi.length === 0 ? (
                                    <div className="px-8 py-10"><EmptyState icon={Calendar} title="No Data Found" /></div>
                                ) : (
                                    filteredPresensi.map((p, index) => {
                                        const isQuraniyah = p.keterangan?.includes('[Quraniyah]')
                                        return (
                                            <div key={`${p.id}-${index}`} className="grid grid-cols-2 gap-4 px-6 py-6 items-center hover:bg-gray-50/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-emerald-500">
                                                        <Clock size={16} />
                                                    </div>
                                                    <span className="font-black text-gray-900 text-sm">
                                                        {new Date(p.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-black text-gray-900 text-sm leading-tight">{p.santri?.nama}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.santri?.nis}</div>
                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                        <Badge variant={
                                                            (p.status || '').toLowerCase() === 'hadir' ? 'success' :
                                                            (p.status || '').toLowerCase() === 'sakit' ? 'warning' :
                                                            (p.status || '').toLowerCase() === 'izin' ? 'info' : 
                                                            (p.status || '').toLowerCase() === 'pulang' ? 'neutral' : 'danger'
                                                        } className="px-2 py-0.5 rounded-lg font-black uppercase text-[8px] tracking-widest">
                                                            {p.status}
                                                        </Badge>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                                            {isQuraniyah ? (p.santri?.halaqoh?.nama || '-') : (p.santri?.kelas?.nama || '-')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            ) : activeTab === 'staf' ? (
                <div className="space-y-8 animate-slide-up">
                    <Card variant="premium" className="p-8">
                        <div className="max-w-xs space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter Tanggal</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                                <input 
                                    type="date" 
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-sm bg-gray-50/30"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card variant="premium" className="overflow-hidden p-0 border-none shadow-2xl">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50">
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                        <th className="px-8 py-6">Waktu Scan</th>
                                        <th className="px-8 py-6">Staf Pengajar</th>
                                        <th className="px-8 py-6">Kategori</th>
                                        <th className="px-8 py-6">Lokasi / Grup</th>
                                        <th className="px-8 py-6 text-center">Status Kehadiran</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-8 py-20 text-center"><Spinner label="Fetching Staff Records..." /></td></tr>
                                    ) : presensiStaf.length === 0 ? (
                                        <tr><td colSpan="5" className="px-8 py-20"><EmptyState icon={Clock} title="No Check-ins Today" message="Belum ada pengajar yang melakukan scan QR hari ini." /></td></tr>
                                    ) : (
                                        presensiStaf.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50/80 transition-all group">
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-white shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                                            <Clock size={16} />
                                                        </div>
                                                        <span className="font-black text-gray-900">{new Date(p.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{p.guru?.nama}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.guru?.email}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Badge variant={p.tipe === 'QURANIYAH' ? 'info' : 'success'} className="px-4 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                                        {p.tipe}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 font-black text-gray-600 uppercase tracking-tighter text-xs">
                                                        {p.tipe === 'MADROSAH' 
                                                            ? (kelasList.find(k => k.id === p.referensi_id)?.nama || 'Kelas')
                                                            : (halaqohList.find(h => h.id === p.referensi_id)?.nama || 'Halaqoh')
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest border border-emerald-100">
                                                        <CheckCircle2 size={12} />
                                                        Terverifikasi QR
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="md:hidden">
                            <div className="grid grid-cols-2 bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu Scan</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Staf Pengajar</div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {loading ? (
                                    <div className="px-8 py-10 text-center"><Spinner label="Fetching..." /></div>
                                ) : presensiStaf.length === 0 ? (
                                    <div className="px-8 py-10"><EmptyState icon={Clock} title="No Check-ins" /></div>
                                ) : (
                                    presensiStaf.map((p) => (
                                        <div key={p.id} className="grid grid-cols-2 gap-4 px-6 py-6 items-center hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-blue-500">
                                                    <Clock size={16} />
                                                </div>
                                                <span className="font-black text-gray-900 text-sm">
                                                    {new Date(p.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="font-black text-gray-900 text-sm leading-tight">{p.guru?.nama}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{p.guru?.email}</div>
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    <Badge variant={p.tipe === 'QURANIYAH' ? 'info' : 'success'} className="px-2 py-0.5 rounded-lg font-black uppercase text-[8px] tracking-widest">
                                                        {p.tipe}
                                                    </Badge>
                                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">
                                                        {p.tipe === 'MADROSAH' 
                                                            ? (kelasList.find(k => k.id === p.referensi_id)?.nama || 'Kelas')
                                                            : (halaqohList.find(h => h.id === p.referensi_id)?.nama || 'Halaqoh')
                                                        }
                                                    </span>
                                                </div>
                                                <div className="pt-1">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[8px] uppercase tracking-widest border border-emerald-100">
                                                        <CheckCircle2 size={10} />
                                                        Terverifikasi
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            ) : activeTab === 'jurnal' ? (
                <div className="space-y-8 animate-slide-up">
                    <Card variant="premium" className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal</label>
                                <input 
                                    type="date" 
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none font-bold text-sm bg-gray-50/30"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter Pengajar</label>
                                <select 
                                    value={filterGuru}
                                    onChange={(e) => setFilterGuru(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none font-bold text-sm bg-gray-50/30 appearance-none"
                                >
                                    <option value="">Semua Pengajar</option>
                                    {guruList.map(g => (
                                        <option key={g.id} value={g.id}>{g.nama}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card variant="premium" className="overflow-hidden p-0 border-none shadow-2xl">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50">
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                        <th className="px-8 py-6">Jadwal & Waktu</th>
                                        <th className="px-8 py-6">Staf Pengajar</th>
                                        <th className="px-8 py-6">Mata Pelajaran</th>
                                        <th className="px-8 py-6">Grup</th>
                                        <th className="px-8 py-6">Status Log</th>
                                        <th className="px-8 py-6 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingAgenda ? (
                                        <tr><td colSpan="6" className="px-8 py-20 text-center"><Spinner label="Syncing Class Logs..." /></td></tr>
                                    ) : agendaList.length === 0 ? (
                                        <tr><td colSpan="6" className="px-8 py-20"><EmptyState icon={BookOpen} title="No Active Classes" message="Tidak ada jadwal mengajar terdaftar untuk kriteria ini." /></td></tr>
                                    ) : (
                                        agendaList.map((j) => (
                                            <tr key={j.id} className="hover:bg-gray-50/80 transition-all group">
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-fit uppercase tracking-tighter">
                                                            Jam Ke-{j.jam_ke}
                                                        </div>
                                                        <div className="text-gray-900 font-black text-sm ml-1 uppercase">
                                                            {j.jam_mulai.slice(0, 5)} — {j.jam_selesai.slice(0, 5)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="font-black text-gray-900 text-sm group-hover:text-amber-600 transition-colors">{j.guru?.nama || '-'}</div>
                                                </td>
                                                <td className="px-8 py-6 font-bold text-gray-600">
                                                    {j.mapel?.nama || (j.tipe === 'HALAQOH' ? 'Halaqoh' : '-')}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/50 w-fit">
                                                        {j.tipe === 'HALAQOH' ? <Users size={12} className="text-blue-500" /> : <BookOpen size={12} className="text-emerald-500" />}
                                                        <span className="text-xs font-black text-gray-600 uppercase tracking-tighter">
                                                            {j.tipe === 'HALAQOH' ? (j.halaqoh?.nama || 'Halaqoh') : (j.kelas?.nama || 'Kelas')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {j.jurnal ? (
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest border border-emerald-100">
                                                            <CheckCircle2 size={12} />
                                                            Terisi
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 font-black text-[10px] uppercase tracking-widest border border-amber-100">
                                                            <AlertTriangle size={12} />
                                                            Kosong
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <button 
                                                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg
                                                            ${j.jurnal 
                                                                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                                                                : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600'}
                                                        `}
                                                        onClick={() => navigate(`/absensi/agenda?jadwal_id=${j.id}&tanggal=${filterDate}`)}
                                                    >
                                                        {j.jurnal ? 'Update Jurnal' : 'Input Absensi'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List View */}
                        <div className="md:hidden">
                            <div className="grid grid-cols-2 bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jadwal</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pengajar & Mapel</div>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {loadingAgenda ? (
                                    <div className="px-8 py-10 text-center"><Spinner label="Syncing..." /></div>
                                ) : agendaList.length === 0 ? (
                                    <div className="px-8 py-10"><EmptyState icon={BookOpen} title="No Active Classes" /></div>
                                ) : (
                                    agendaList.map((j) => (
                                        <div key={j.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition-colors">
                                            <div className="grid grid-cols-2 gap-4 items-start">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg w-fit uppercase tracking-tighter">
                                                        Jam Ke-{j.jam_ke}
                                                    </div>
                                                    <div className="text-gray-900 font-black text-sm">
                                                        {j.jam_mulai.slice(0, 5)} — {j.jam_selesai.slice(0, 5)}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-black text-gray-900 text-sm leading-tight">{j.guru?.nama || '-'}</div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                        {j.mapel?.nama || (j.tipe === 'HALAQOH' ? 'Halaqoh' : '-')}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                                            {j.tipe === 'HALAQOH' ? <Users size={10} className="text-blue-500" /> : <BookOpen size={10} className="text-emerald-500" />}
                                                            {j.tipe === 'HALAQOH' ? (j.halaqoh?.nama || 'Halaqoh') : (j.kelas?.nama || 'Kelas')}
                                                        </div>
                                                        {j.jurnal ? (
                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[8px] uppercase tracking-widest border border-emerald-100">
                                                                <CheckCircle2 size={10} />
                                                                Terisi
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 font-black text-[8px] uppercase tracking-widest border border-amber-100">
                                                                <AlertTriangle size={10} />
                                                                Kosong
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                className={`w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg
                                                    ${j.jurnal 
                                                        ? 'bg-slate-100 text-slate-500' 
                                                        : 'bg-amber-500 text-white shadow-amber-200'}
                                                `}
                                                onClick={() => navigate(`/absensi/agenda?jadwal_id=${j.id}&tanggal=${filterDate}`)}
                                            >
                                                {j.jurnal ? 'Update Jurnal' : 'Input Absensi'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            ) : activeTab === 'laporan' ? (
                <div className="space-y-8 animate-slide-up">
                    <Card variant="premium" className="p-6 md:p-8">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 md:gap-8">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight italic">Periodical Analysis</h3>
                                <p className="text-[10px] md:text-sm text-gray-400 font-bold uppercase tracking-widest">Rekapitulasi kehadiran lintas periode</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 md:p-3 bg-gray-100/50 rounded-[2rem] border border-gray-100">
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-gray-100 flex-1">
                                    <Calendar size={18} className="text-emerald-500 shrink-0" />
                                    <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-black text-gray-700 outline-none w-full" />
                                </div>
                                <div className="text-gray-400 font-black uppercase text-[10px] tracking-widest px-2 text-center">s/d</div>
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-gray-100 flex-1">
                                    <Calendar size={18} className="text-emerald-500 shrink-0" />
                                    <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-black text-gray-700 outline-none w-full" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="flex p-2 bg-gray-100 rounded-[2rem] w-fit border border-gray-100 shadow-inner">
                        <button 
                            onClick={() => setLaporanSubTab('staf')}
                            className={`px-10 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${laporanSubTab === 'staf' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Staff Analysis
                        </button>
                        <button 
                            onClick={() => setLaporanSubTab('santri')}
                            className={`px-10 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${laporanSubTab === 'santri' ? 'bg-white text-emerald-600 shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Santri Analysis
                        </button>
                    </div>

                    {laporanSubTab === 'staf' ? (
                        <div className="space-y-6 animate-slide-up">
                             <Card variant="premium" className="overflow-hidden p-0 border-none shadow-2xl">
                                 {/* Desktop Table View */}
                                 <div className="hidden md:block overflow-x-auto">
                                     <table className="w-full text-sm text-left">
                                         <thead className="bg-indigo-50/30">
                                             <tr className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-50">
                                                 <th className="px-8 py-6">Nama Pengajar</th>
                                                 <th className="px-8 py-6 text-center text-emerald-600">Hadir</th>
                                                 <th className="px-8 py-6 text-center text-red-600">Alpha</th>
                                                 <th className="px-8 py-6 text-center">Score</th>
                                                 <th className="px-8 py-6 text-right">Details</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-50">
                                             {aggregatedStaf.length === 0 ? (
                                                 <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400 italic font-medium">Tidak ada data scan staf pada periode ini</td></tr>
                                             ) : (
                                                 aggregatedStaf.map((s) => {
                                                     const total = s.Hadir + s.Alpha
                                                     const score = total > 0 ? Math.round((s.Hadir / total) * 100) : 0
                                                     return (
                                                         <tr key={s.id} className="hover:bg-indigo-50/20 transition-all group">
                                                             <td className="px-8 py-6">
                                                                 <div className="flex items-center gap-4">
                                                                     <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                                                                         {s.nama?.charAt(0)}
                                                                     </div>
                                                                     <div>
                                                                         <div className="font-black text-gray-900">{s.nama}</div>
                                                                         <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Staff Member</div>
                                                                     </div>
                                                                 </div>
                                                             </td>
                                                             <td className="px-8 py-6 text-center">
                                                                 <span className="font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100">{s.Hadir}</span>
                                                             </td>
                                                             <td className="px-8 py-6 text-center">
                                                                 <span className="font-black text-red-600 bg-red-50 px-4 py-1.5 rounded-xl border border-red-100">{s.Alpha}</span>
                                                             </td>
                                                             <td className="px-8 py-6 text-center">
                                                                 <div className="flex items-center justify-center gap-3">
                                                                     <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                         <div className="h-full bg-indigo-500" style={{ width: `${score}%` }}></div>
                                                                     </div>
                                                                     <span className="text-xs font-black text-indigo-600">{score}%</span>
                                                                 </div>
                                                             </td>
                                                             <td className="px-8 py-6 text-right">
                                                                 <button 
                                                                     onClick={() => setSelectedGuruId(s.id)}
                                                                     className="p-3 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                                                                 >
                                                                     <Eye size={16} />
                                                                 </button>
                                                             </td>
                                                         </tr>
                                                     )
                                                 })
                                             )}
                                         </tbody>
                                     </table>
                                 </div>

                                 {/* Mobile List View */}
                                 <div className="md:hidden">
                                     <div className="grid grid-cols-2 bg-indigo-50/30 border-b border-indigo-50 px-6 py-4">
                                         <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Staff</div>
                                         <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-right">Metrics</div>
                                     </div>
                                     <div className="divide-y divide-gray-50">
                                         {aggregatedStaf.length === 0 ? (
                                             <div className="px-8 py-10 text-center text-gray-400 italic">No records</div>
                                         ) : (
                                             aggregatedStaf.map((s) => {
                                                 const total = s.Hadir + s.Alpha
                                                 const score = total > 0 ? Math.round((s.Hadir / total) * 100) : 0
                                                 return (
                                                     <div key={s.id} className="p-6 space-y-4 hover:bg-indigo-50/10 transition-colors">
                                                         <div className="flex items-center justify-between">
                                                             <div className="flex items-center gap-3">
                                                                 <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                                                                     {s.nama?.charAt(0)}
                                                                 </div>
                                                                 <div className="font-black text-gray-900 text-sm leading-tight">{s.nama}</div>
                                                             </div>
                                                             <button 
                                                                 onClick={() => setSelectedGuruId(s.id)}
                                                                 className="p-2.5 rounded-xl bg-slate-900 text-white shadow-lg active:scale-90"
                                                             >
                                                                 <Eye size={14} />
                                                             </button>
                                                         </div>
                                                         <div className="grid grid-cols-3 gap-2">
                                                             <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
                                                                 <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Hadir</div>
                                                                 <div className="text-sm font-black text-emerald-600">{s.Hadir}</div>
                                                             </div>
                                                             <div className="bg-red-50 p-2 rounded-xl border border-red-100 text-center">
                                                                 <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Alpha</div>
                                                                 <div className="text-sm font-black text-red-600">{s.Alpha}</div>
                                                             </div>
                                                             <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 text-center">
                                                                 <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Score</div>
                                                                 <div className="text-sm font-black text-indigo-600">{score}%</div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 )
                                             })
                                         )}
                                     </div>
                                 </div>
                             </Card>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-slide-up">
                            {/* Stats Cards Row for Santri */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Hadir', status: 'hadir', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                                    { label: 'Izin', status: 'izin', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                                    { label: 'Sakit', status: 'sakit', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
                                    { label: 'Alpha', status: 'alpha', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
                                ].map(stat => {
                                    const count = filteredPresensi.filter(p => {
                                        const s = (p.status || '').toLowerCase()
                                        return s === stat.status || (stat.status === 'alpha' && ['alpa', 'alfa'].includes(s))
                                    }).length
                                    return (
                                        <div key={stat.status} className={`${stat.bg} p-6 rounded-[2.5rem] border border-white shadow-sm flex flex-col items-center justify-center gap-2 group hover:translate-y-[-4px] transition-all duration-300`}>
                                            <div className={`w-2 h-2 rounded-full ${stat.color} animate-pulse`}></div>
                                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{count}</div>
                                            <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${stat.text}`}>{stat.label}</div>
                                        </div>
                                    )
                                })}
                            </div>
                            
                            <Card className="p-8 bg-slate-900 text-white border-none rounded-[2.5rem] overflow-hidden relative group max-w-md shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Total Participation</p>
                                        <h5 className="text-4xl font-black tracking-tighter">
                                            {filteredPresensi.length > 0 
                                                ? Math.round((filteredPresensi.filter(p => (p.status || '').toLowerCase() === 'hadir').length / filteredPresensi.length) * 100) 
                                                : 0}%
                                        </h5>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                                        <p className="text-xl font-black text-white italic">{filteredPresensi.length} <span className="text-[10px] text-slate-500 uppercase not-italic">Logs</span></p>
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                            </Card>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                    <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs">Detailed Student Metrics</h4>
                                </div>
                                 <Card variant="premium" className="overflow-hidden p-0 border-none shadow-2xl">
                                     {/* Desktop Table View */}
                                     <div className="hidden md:block overflow-x-auto">
                                         <table className="w-full text-sm text-left">
                                             <thead className="bg-gray-50/50">
                                                 <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                                     <th className="px-8 py-6">Student Profil</th>
                                                     <th className="px-8 py-6">Group / Class</th>
                                                     <th className="px-8 py-6 text-center text-emerald-600">Hadir</th>
                                                     <th className="px-8 py-6 text-center text-amber-600">Sakit</th>
                                                     <th className="px-8 py-6 text-center text-blue-600">Izin</th>
                                                     <th className="px-8 py-6 text-center text-red-600">Alpha</th>
                                                     <th className="px-8 py-6 text-right">Action</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-gray-50">
                                                 {aggregatedSantri.length === 0 ? (
                                                     <tr><td colSpan="7" className="px-8 py-20 text-center text-gray-400 italic font-medium">No record found for selected period</td></tr>
                                                 ) : (
                                                     aggregatedSantri.map((s) => (
                                                         <tr key={s.id} className="hover:bg-emerald-50/10 transition-all group">
                                                             <td className="px-8 py-6">
                                                                 <div className="font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{s.nama}</div>
                                                                 <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.nis}</div>
                                                             </td>
                                                             <td className="px-8 py-6">
                                                                 <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest">{s.grup || '-'}</span>
                                                             </td>
                                                             <td className="px-8 py-6 text-center">
                                                                 <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs ${s.Hadir > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-300'}`}>
                                                                     {s.Hadir}
                                                                 </span>
                                                             </td>
                                                             <td className="px-8 py-6 text-center">
                                                                 <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs ${s.Sakit > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-300'}`}>
                                                                     {s.Sakit}
                                                                 </span>
                                                             </td>
                                                             <td className="px-8 py-6 text-center">
                                                                 <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs ${s.Izin > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-300'}`}>
                                                                     {s.Izin}
                                                                 </span>
                                                             </td>
                                                             <td className="px-8 py-6 text-center">
                                                                 <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs ${s.Alpha > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-300'}`}>
                                                                     {s.Alpha}
                                                                 </span>
                                                             </td>
                                                             <td className="px-8 py-6 text-right">
                                                                 <button 
                                                                     onClick={() => setSelectedSantriId(s.id)}
                                                                     className="p-3 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                                                                 >
                                                                     <Eye size={16} />
                                                                 </button>
                                                             </td>
                                                         </tr>
                                                     ))
                                                 )}
                                             </tbody>
                                         </table>
                                     </div>

                                     {/* Mobile List View */}
                                     <div className="md:hidden">
                                         <div className="grid grid-cols-2 bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                                             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</div>
                                             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Attendance</div>
                                         </div>
                                         <div className="divide-y divide-gray-50">
                                             {aggregatedSantri.length === 0 ? (
                                                 <div className="px-8 py-10 text-center text-gray-400 italic">No records</div>
                                             ) : (
                                                 aggregatedSantri.map((s) => (
                                                     <div key={s.id} className="p-6 space-y-4 hover:bg-emerald-50/10 transition-colors">
                                                         <div className="flex items-center justify-between">
                                                             <div>
                                                                 <div className="font-black text-gray-900 text-sm leading-tight">{s.nama}</div>
                                                                 <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{s.nis}</div>
                                                                 <div className="mt-2">
                                                                     <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[8px] font-black uppercase tracking-widest">{s.grup || '-'}</span>
                                                                 </div>
                                                             </div>
                                                             <button 
                                                                 onClick={() => setSelectedSantriId(s.id)}
                                                                 className="p-2.5 rounded-xl bg-slate-900 text-white shadow-lg active:scale-90"
                                                             >
                                                                 <Eye size={14} />
                                                             </button>
                                                         </div>
                                                         <div className="grid grid-cols-4 gap-2">
                                                             <div className={`${s.Hadir > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'} p-2 rounded-xl border text-center`}>
                                                                 <div className={`text-[8px] font-black ${s.Hadir > 0 ? 'text-emerald-400' : 'text-gray-300'} uppercase tracking-widest mb-1`}>H</div>
                                                                 <div className={`text-xs font-black ${s.Hadir > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{s.Hadir}</div>
                                                             </div>
                                                             <div className={`${s.Sakit > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'} p-2 rounded-xl border text-center`}>
                                                                 <div className={`text-[8px] font-black ${s.Sakit > 0 ? 'text-amber-400' : 'text-gray-300'} uppercase tracking-widest mb-1`}>S</div>
                                                                 <div className={`text-xs font-black ${s.Sakit > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{s.Sakit}</div>
                                                             </div>
                                                             <div className={`${s.Izin > 0 ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'} p-2 rounded-xl border text-center`}>
                                                                 <div className={`text-[8px] font-black ${s.Izin > 0 ? 'text-blue-400' : 'text-gray-300'} uppercase tracking-widest mb-1`}>I</div>
                                                                 <div className={`text-xs font-black ${s.Izin > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{s.Izin}</div>
                                                             </div>
                                                             <div className={`${s.Alpha > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} p-2 rounded-xl border text-center`}>
                                                                 <div className={`text-[8px] font-black ${s.Alpha > 0 ? 'text-red-400' : 'text-gray-300'} uppercase tracking-widest mb-1`}>A</div>
                                                                 <div className={`text-xs font-black ${s.Alpha > 0 ? 'text-red-600' : 'text-gray-300'}`}>{s.Alpha}</div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 ))
                                             )}
                                         </div>
                                     </div>
                                 </Card>
                            </div>
                        </div>
                    )}
                </div>

            ) : (
                <div className="space-y-8 no-print">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Section Kelas */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2 px-2">
                                <BookOpen size={20} />
                                QR Code Kelas (Madrosah)
                            </h3>
                            <div className="grid gap-3">
                                {kelasList.map(k => (
                                    <div key={k.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                                        <div>
                                            <div className="font-bold text-gray-900">{k.nama}</div>
                                            <div className="text-xs text-gray-400">UUID: {k.id.split('-')[0]}...</div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            icon={QrCode}
                                            onClick={() => setSelectedQR({ type: 'MADROSAH', name: k.nama, id: k.id })}
                                        >
                                            Generasi QR
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section Halaqoh */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2 px-2">
                                <Users size={20} />
                                QR Code Halaqoh (Qur'aniyah)
                            </h3>
                            <div className="grid gap-3">
                                {halaqohList.map(h => (
                                    <div key={h.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                                        <div>
                                            <div className="font-bold text-gray-900">{h.nama}</div>
                                            <div className="text-xs text-gray-400">UUID: {h.id.split('-')[0]}...</div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            icon={QrCode}
                                            onClick={() => setSelectedQR({ type: 'QURANIYAH', name: h.nama, id: h.id })}
                                        >
                                            Generasi QR
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* QR Modal / Display */}
                    {selectedQR && createPortal(
                        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm">
                            <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up border-8 border-white p-2">
                                <div className="p-8 text-center space-y-6">
                                    <div className="flex items-center justify-between">
                                        <Badge variant={selectedQR.type === 'MADROSAH' ? 'success' : 'info'}>
                                            DATA PORTAL {selectedQR.type}
                                        </Badge>
                                        <button onClick={() => setSelectedQR(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    
                                    <div id="qr-printable" className="bg-white p-4 rounded-3xl border border-gray-100 inline-block shadow-inner">
                                        <QRCodeSVG 
                                            value={`SITAQUA_ABSENSI_${selectedQR.type}_${selectedQR.id}`} 
                                            size={200}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedQR.name}</h2>
                                        <p className="text-gray-400 text-sm font-medium">Scan untuk memulai absensi</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <Button variant="secondary" onClick={() => setSelectedQR(null)}>Tutup</Button>
                                        <Button onClick={handlePrintQR} icon={Printer}>Cetak</Button>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
            )}

            {/* Print Specific styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body * { visibility: hidden; }
                    #qr-printable, #qr-printable * { 
                        visibility: visible; 
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                    }
                    #qr-printable {
                        display: block !important;
                        scale: 2;
                    }
                }
            `}</style>

            {/* Rincian Terperinci (Portal Rendering) */}
            {selectedSantriId && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-scale-up">
                        <div className="flex-none bg-white border-b border-gray-100">
                            <div className="p-6 md:p-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-200">
                                        {aggregatedSantri.find(s => s.id === selectedSantriId)?.nama?.charAt(0) || 'S'}
                                    </div>
                                    <div>
                                        <h5 className="font-black text-xl text-gray-900 tracking-tight">Rincian Kehadiran</h5>
                                        <p className="text-[10px] md:text-xs text-emerald-600 font-bold uppercase tracking-widest">{aggregatedSantri.find(s => s.id === selectedSantriId)?.nama}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedSantriId(null)} 
                                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8">
                            <div className="space-y-3">
                                {presensiData
                                    .filter(p => p.santri_id === selectedSantriId)
                                    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || b.jam_ke - a.jam_ke)
                                    .map((p, idx) => (
                                        <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-emerald-200 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="bg-gray-50 px-4 py-2.5 rounded-2xl text-center min-w-[90px] border border-gray-100">
                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                                        {new Date(p.tanggal).toLocaleDateString('id-ID', { weekday: 'long' })}
                                                    </div>
                                                    <div className="text-base font-black text-gray-800">
                                                        {new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                        <Clock size={14} className="text-emerald-500" />
                                                        Jam Ke-{p.jam_ke}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">
                                                        {p.keterangan || 'Madrosah'}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={p.status === 'Hadir' ? 'success' : p.status === 'Sakit' ? 'warning' : p.status === 'Izin' ? 'info' : 'danger'}>
                                                {p.status}
                                            </Badge>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Rincian Kehadiran Staf */}
            {/* Modal Rincian Kehadiran Staf (Portal Rendering) */}
            {selectedGuruId && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-scale-up">
                        <div className="flex-none bg-white border-b border-gray-100">
                            <div className="p-6 md:p-8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
                                        {aggregatedStaf.find(s => s.id === selectedGuruId)?.nama?.charAt(0) || 'G'}
                                    </div>
                                    <div>
                                        <h5 className="font-black text-xl text-gray-900 tracking-tight">Rincian Scan QR Staf</h5>
                                        <p className="text-[10px] md:text-xs text-indigo-600 font-bold uppercase tracking-widest">{aggregatedStaf.find(s => s.id === selectedGuruId)?.nama}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedGuruId(null)} 
                                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8">
                            <div className="space-y-3">
                                    {(aggregatedStaf.find(s => s.id === selectedGuruId)?.details || [])
                                        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || b.jam_ke - a.jam_ke)
                                        .map((p, idx) => (
                                            <div key={idx} className="bg-white p-4 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-indigo-200 transition-all group">
                                                <div className="grid grid-cols-[auto,1fr] gap-4 md:gap-6 items-center">
                                                    <div className="bg-gray-50 px-3 py-2 md:px-4 md:py-2.5 rounded-2xl text-center min-w-[80px] md:min-w-[90px] border border-gray-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                        <div className="text-[8px] md:text-[10px] font-black text-gray-400 group-hover:text-indigo-400 uppercase tracking-tighter">
                                                            {new Date(p.tanggal).toLocaleDateString('id-ID', { weekday: 'long' })}
                                                        </div>
                                                        <div className="text-sm md:text-base font-black text-gray-800 group-hover:text-indigo-600">
                                                            {new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                                <Clock size={14} className="text-indigo-500" />
                                                                Jam Pelajaran Ke-{p.jam_ke}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 font-bold italic bg-gray-50 px-2 py-0.5 rounded-lg inline-block border border-gray-100">
                                                                {p.tipe} - {p.referensi_id ? (kelasList.find(k => k.id === p.referensi_id)?.nama || halaqohList.find(h => h.id === p.referensi_id)?.nama || 'Lokasi Terdaftar') : 'Scan QR'}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={p.status === 'Hadir' ? 'success' : 'danger'} className="px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                                                                {p.status}
                                                            </Badge>
                                                            {p.status === 'Alpha' && (
                                                                <button 
                                                                    onClick={() => setEditingSession(p)}
                                                                    className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                                                                    title="Ubah jadi Hadir"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                    {/* Manual Adjustment Modal (Portal) */}
                    {editingSession && createPortal(
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditingSession(null)}></div>
                            <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                                <div className="bg-indigo-600 p-6 text-white text-center">
                                    <h3 className="text-xl font-black">Ubah Status Kehadiran</h3>
                                    <p className="text-xs text-indigo-100 mt-1 uppercase tracking-widest font-bold">
                                        {new Date(editingSession.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} • Jam Ke-{editingSession.jam_ke}
                                    </p>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan / Alasan</label>
                                        <textarea 
                                            value={manualKeterangan}
                                            onChange={(e) => setManualKeterangan(e.target.value)}
                                            placeholder="Contoh: Hadir manual, HP tertinggal / gangguan jaringan"
                                            className="w-full rounded-2xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[100px] p-4 bg-gray-50 transition-all"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => setEditingSession(null)}
                                            className="flex-1 px-6 py-3.5 rounded-2xl border border-gray-100 font-black text-xs text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-widest"
                                        >
                                            Batal
                                        </button>
                                        <button 
                                            onClick={handleSaveManualHadir}
                                            disabled={!manualKeterangan}
                                            className="flex-1 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all uppercase tracking-widest"
                                        >
                                            Simpan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>,
                document.body
            )}
        </div>
    )
}

export default AdminAbsensiPage
