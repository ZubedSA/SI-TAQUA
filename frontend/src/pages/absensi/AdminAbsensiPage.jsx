import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
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
    ArrowLeft,
    ClipboardList,
    AlertCircle,
    Briefcase,
    LayoutDashboard,
    TrendingUp,
    CheckSquare,
    ArrowRight,
    Sparkles,
    ChevronRight,
    Palmtree,
    CalendarX
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKelas, useHalaqoh, useJurnal, useMapel } from '../../hooks/useAkademik'
import PageHeader from '../../components/layout/PageHeader'
import { Card, CardHeader, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import { QRCodeSVG } from 'qrcode.react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { calculateAutoPresensi, getResolvedAttendance, findStaffScan, isStaffScanMatch, isBeforeScheduleActive, getLocalDateStr, getActiveHolidayForSchedule, isHolidayActiveOnDate, parseHolidayScope } from '../../utils/attendanceHelper'

const AdminAbsensiPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const searchParams = new URLSearchParams(location.search)
    const setSearchParams = (params) => {
        const newParams = new URLSearchParams(params)
        navigate({ search: newParams.toString() })
    }
    const isStandalone = location.pathname.startsWith('/absensi')
    const { isAdmin, isAdminAbsensi, signOut } = useAuth()
    const showToast = useToast()
    const { data: kelasList = [] } = useKelas()
    const { data: halaqohList = [] } = useHalaqoh()
    const { data: mapelList = [] } = useMapel()

    const rawTab = searchParams.get('tab') || 'dashboard'
    const rawSub = searchParams.get('sub')

    // Resolving Main Tab: 'dashboard' | 'kehadiran' | 'agenda'
    let mainTab = 'dashboard'
    if (['kehadiran', 'rekap', 'staf', 'laporan'].includes(rawTab)) {
        mainTab = 'kehadiran'
    } else if (['agenda', 'jurnal', 'qr'].includes(rawTab)) {
        mainTab = 'agenda'
    } else if (rawTab === 'dashboard') {
        mainTab = 'dashboard'
    }

    // Resolving Sub-tab for Kehadiran: 'santri' | 'staf' | 'laporan'
    const subKehadiran = rawSub || (rawTab === 'staf' ? 'staf' : rawTab === 'laporan' ? 'laporan' : 'santri')

    // Resolving Sub-tab for Agenda: 'jurnal' | 'qr'
    const subAgenda = rawSub || (rawTab === 'qr' ? 'qr' : 'jurnal')

    const isDashboard = mainTab === 'dashboard'
    const isRekap = mainTab === 'kehadiran' && subKehadiran === 'santri'
    const isStaf = mainTab === 'kehadiran' && subKehadiran === 'staf'
    const isLaporan = mainTab === 'kehadiran' && subKehadiran === 'laporan'
    const isJurnal = mainTab === 'agenda' && subAgenda === 'jurnal'
    const isQr = mainTab === 'agenda' && subAgenda === 'qr'

    const handleSwitchMainTab = (newMain) => {
        if (newMain === 'dashboard') {
            setSearchParams({ tab: 'dashboard' })
        } else if (newMain === 'kehadiran') {
            setSearchParams({ tab: 'kehadiran', sub: subKehadiran })
        } else if (newMain === 'agenda') {
            setSearchParams({ tab: 'agenda', sub: subAgenda })
        }
    }

    const handleSwitchSubKehadiran = (newSub) => {
        setSearchParams({ tab: 'kehadiran', sub: newSub })
    }

    const handleSwitchSubAgenda = (newSub) => {
        setSearchParams({ tab: 'agenda', sub: newSub })
    }

    const [pendingIzinList, setPendingIzinList] = useState([])
    const [pendingIzinCount, setPendingIzinCount] = useState(0)
    const [pendingGantiCount, setPendingGantiCount] = useState(0)

    const [holidayList, setHolidayList] = useState([])
    const [showHolidayModal, setShowHolidayModal] = useState(false)
    const [holidayForm, setHolidayForm] = useState({
        judul: '',
        tanggal_mulai: getLocalDateStr(new Date()),
        tanggal_selesai: getLocalDateStr(new Date()),
        cakupan: 'Semua',
        deskripsi: ''
    })
    const [isSavingHoliday, setIsSavingHoliday] = useState(false)

    const hasAccess = isAdmin() || isAdminAbsensi()
    const [presensiStaf, setPresensiStaf] = useState([])
    const [izinGuruList, setIzinGuruList] = useState([])
    const [loading, setLoading] = useState(false)
    const [presensiData, setPresensiData] = useState([])
    
    // Filters (Gunakan tanggal lokal agar tidak mundur 1 hari pada jam dini hari)
    const [filterDate, setFilterDate] = useState(getLocalDateStr(new Date()))
    
    // Default to start of month for reports
    const getStartOfMonth = () => {
        const d = new Date()
        return getLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
    }
    const [filterStartDate, setFilterStartDate] = useState(getStartOfMonth())
    const [filterEndDate, setFilterEndDate] = useState(getLocalDateStr(new Date()))
    const [selectedSantriId, setSelectedSantriId] = useState(null)
    const [selectedGuruId, setSelectedGuruId] = useState(null)
    const [editingSession, setEditingSession] = useState(null)
    const [manualKeterangan, setManualKeterangan] = useState('')
    const [manualStatus, setManualStatus] = useState('Hadir')
    const [isSavingManual, setIsSavingManual] = useState(false)
    const [allJadwal, setAllJadwal] = useState([])
    const [filterType, setFilterType] = useState('Semua') // 'Semua', 'Madrosah', 'Quraniyah'
    const [filterKelasId, setFilterKelasId] = useState('')
    const [filterHalaqohId, setFilterHalaqohId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [filterGuru, setFilterGuru] = useState('')

    const [guruList, setGuruList] = useState([])
    const [semesterList, setSemesterList] = useState([])
    const [selectedSemesterId, setSelectedSemesterId] = useState('')
    const [perilakuSemesterData, setPerilakuSemesterData] = useState([])
    const [semesterPresensiData, setSemesterPresensiData] = useState([]) // presensi untuk rentang penuh semester
    const [santriList, setSantriList] = useState([])

    useEffect(() => {
        const fetchSemesters = async () => {
            try {
                const { data } = await supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false })
                const sList = data || []
                setSemesterList(sList)
                const activeSem = sList.find(s => s.is_active)
                if (activeSem) {
                    setSelectedSemesterId(activeSem.id)
                    if (activeSem.tanggal_mulai && activeSem.tanggal_selesai) {
                        setFilterStartDate(activeSem.tanggal_mulai)
                        const tObj = new Date()
                        const todayStr = `${tObj.getFullYear()}-${String(tObj.getMonth() + 1).padStart(2, '0')}-${String(tObj.getDate()).padStart(2, '0')}`
                        setFilterEndDate(activeSem.tanggal_selesai > todayStr ? todayStr : activeSem.tanggal_selesai)
                    }
                } else if (sList.length > 0) {
                    setSelectedSemesterId(sList[0].id)
                }
            } catch (err) {
                console.error('Error fetching semester list:', err)
            }
        }
        fetchSemesters()
    }, [])

    // Fetch presensi untuk RENTANG PENUH SEMESTER — sama persis dengan InputPerilakuPage
    // Fetch presensi untuk RENTANG PENUH SEMESTER — sama persis dengan InputPerilakuPage
    // Digunakan sebagai auto-fallback di aggregatedSantri agar data cocok
    useEffect(() => {
        const fetchSemesterPresensi = async () => {
            if (!selectedSemesterId || semesterList.length === 0) return
            const semObj = semesterList.find(s => String(s.id) === String(selectedSemesterId))
            try {
                let allData = []
                let page = 0
                const pageSize = 1000
                let hasMore = true

                while (hasMore) {
                    let q = supabase
                        .from('presensi')
                        .select('santri_id, status, keterangan, tanggal')
                        .range(page * pageSize, (page + 1) * pageSize - 1)

                    if (semObj?.tanggal_mulai && semObj?.tanggal_selesai) {
                        q = q.gte('tanggal', semObj.tanggal_mulai).lte('tanggal', semObj.tanggal_selesai)
                    }

                    const { data, error } = await q
                    if (error) throw error
                    if (data && data.length > 0) {
                        allData = [...allData, ...data]
                        if (data.length < pageSize) {
                            hasMore = false
                        } else {
                            page++
                        }
                    } else {
                        hasMore = false
                    }
                }
                setSemesterPresensiData(allData)
            } catch (err) {
                console.error('Error fetching semester presensi:', err)
            }
        }
        fetchSemesterPresensi()
    }, [selectedSemesterId, semesterList])

    const handleSemesterChange = (semId) => {
        setSelectedSemesterId(semId)
        const sem = semesterList.find(s => s.id === semId)
        if (sem && sem.tanggal_mulai && sem.tanggal_selesai) {
            setFilterStartDate(sem.tanggal_mulai)
            const tObj = new Date()
            const todayStr = `${tObj.getFullYear()}-${String(tObj.getMonth() + 1).padStart(2, '0')}-${String(tObj.getDate()).padStart(2, '0')}`
            setFilterEndDate(sem.tanggal_selesai > todayStr ? todayStr : sem.tanggal_selesai)
        }
    }

    // Data for Jurnal Tab
    const { data: agendaList = [], isLoading: loadingAgenda } = useJurnal({
        tanggal: filterDate,
        guru_id: filterGuru || null
    })

    // QR Management State
    const [selectedQR, setSelectedQR] = useState(null)
    const printRef = useRef(null)
    const startDateRef = useRef(null)
    const endDateRef = useRef(null)
    const [laporanSubTab, setLaporanSubTab] = useState('staf') // 'staf' atau 'santri'
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)

    const formatDate = (dateStr) => {
        const options = { day: 'numeric', month: 'short', year: 'numeric' }
        return new Date(dateStr).toLocaleDateString('id-ID', options)
    }

    const getCategoryLabel = () => {
        if (filterType === 'Madrosah') {
            const kName = filterKelasId ? kelasList.find(k => k.id === filterKelasId)?.nama : 'Semua Kelas'
            return `Madrosah (${kName || 'Kelas'})`
        }
        if (filterType === 'Quraniyah') {
            const hName = filterHalaqohId ? halaqohList.find(h => h.id === filterHalaqohId)?.nama : 'Semua Halaqoh'
            return `Qur'aniyah (${hName || 'Halaqoh'})`
        }
        return 'Semua Kategori'
    }

    const exportToPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const isStaf = laporanSubTab === 'staf';
        const categoryTitle = getCategoryLabel();
        const title = isStaf 
            ? `Laporan Kehadiran Staf - ${categoryTitle} [${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}]`
            : `Laporan Kehadiran Santri - ${categoryTitle} [${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}]`;
        
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(title, 14, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        const datePrinted = `Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        doc.text(datePrinted, 14, 21);

        let tableHeaders, tableRows, columnStyles;

        if (isStaf) {
            tableHeaders = [["No", "Nama Pengajar", "Email", "Hadir", "Izin", "Libur", "Alpha", "Score Kehadiran (%)"]];
            tableRows = aggregatedStaf.map((item, index) => {
                const total = item.Hadir + item.Izin + item.Alpha;
                const score = total > 0 ? Math.round(((item.Hadir + item.Izin) / total) * 100) : 0;
                return [
                    index + 1,
                    item.nama,
                    item.email || '-',
                    item.Hadir,
                    item.Izin,
                    item.Libur || 0,
                    item.Alpha,
                    `${score}%`
                ];
            });
            columnStyles = {
                0: { cellWidth: 10, halign: 'center' },
                1: { fontStyle: 'bold' },
                3: { cellWidth: 14, halign: 'center' },
                4: { cellWidth: 14, halign: 'center' },
                5: { cellWidth: 14, halign: 'center' },
                6: { cellWidth: 14, halign: 'center' },
                7: { cellWidth: 32, halign: 'center' }
            };
        } else {
            tableHeaders = [["No", "Nama Santri", "NIS", "Kategori", "Kelas / Halaqoh", "Hadir", "Terlambat", "Sakit", "Izin", "Alpha", "Pulang"]];
            tableRows = aggregatedSantri.map((item, index) => [
                index + 1,
                item.nama,
                item.nis || '-',
                item.kategoriLabel || '-',
                item.grup || '-',
                item.Hadir,
                item.Terlambat || 0,
                item.Sakit,
                item.Izin,
                item.Alpha,
                item.Pulang || 0
            ]);
            columnStyles = {
                0: { cellWidth: 8, halign: 'center' },
                1: { fontStyle: 'bold' },
                3: { cellWidth: 22 },
                4: { cellWidth: 22 },
                5: { cellWidth: 12, halign: 'center' },
                6: { cellWidth: 14, halign: 'center' },
                7: { cellWidth: 12, halign: 'center' },
                8: { cellWidth: 12, halign: 'center' },
                9: { cellWidth: 12, halign: 'center' },
                10: { cellWidth: 12, halign: 'center' }
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

        doc.save(`Laporan_Kehadiran_${isStaf ? 'Staf' : 'Santri'}_${filterType}_${filterStartDate}_sd_${filterEndDate}.pdf`);
    };

    const exportToExcel = () => {
        const isStaf = laporanSubTab === 'staf';
        let dataToExport, maxWidths, sheetName;

        if (isStaf) {
            sheetName = `Staf ${filterType}`;
            dataToExport = aggregatedStaf.map((item, index) => {
                const total = item.Hadir + item.Izin + item.Alpha;
                const score = total > 0 ? Math.round(((item.Hadir + item.Izin) / total) * 100) : 0;
                return {
                    "No": index + 1,
                    "Nama Pengajar": item.nama,
                    "Email": item.email || '-',
                    "Hadir": item.Hadir,
                    "Izin": item.Izin,
                    "Libur": item.Libur || 0,
                    "Alpha": item.Alpha,
                    "Score Kehadiran": `${score}%`
                };
            });
            maxWidths = [
                { wch: 6 },   // No
                { wch: 30 },  // Nama
                { wch: 25 },  // Email
                { wch: 10 },  // Hadir
                { wch: 10 },  // Izin
                { wch: 10 },  // Libur
                { wch: 10 },  // Alpha
                { wch: 18 }   // Score
            ];
        } else {
            sheetName = `Santri ${filterType}`;
            dataToExport = aggregatedSantri.map((item, index) => ({
                "No": index + 1,
                "Nama Santri": item.nama,
                "NIS": item.nis || '-',
                "Kategori": item.kategoriLabel || '-',
                "Kelas / Halaqoh": item.grup || '-',
                "Hadir": item.Hadir,
                "Terlambat": item.Terlambat || 0,
                "Sakit": item.Sakit,
                "Izin": item.Izin,
                "Alpha": item.Alpha,
                "Pulang": item.Pulang || 0
            }));
            maxWidths = [
                { wch: 6 },   // No
                { wch: 30 },  // Nama
                { wch: 15 },  // NIS
                { wch: 18 },  // Kategori
                { wch: 20 },  // Kelas/Halaqoh
                { wch: 10 },  // Hadir
                { wch: 10 },  // Terlambat
                { wch: 10 },  // Sakit
                { wch: 10 },  // Izin
                { wch: 10 },  // Alpha
                { wch: 10 }   // Pulang
            ];
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        worksheet['!cols'] = maxWidths;

        XLSX.writeFile(workbook, `Laporan_Kehadiran_${isStaf ? 'Staf' : 'Santri'}_${filterType}_${filterStartDate}_sd_${filterEndDate}.xlsx`);
    };

    const exportToWord = () => {
        const isStaf = laporanSubTab === 'staf';
        const categoryTitle = getCategoryLabel();
        const title = isStaf 
            ? `Laporan Kehadiran Staf - ${categoryTitle} Periode ${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`
            : `Laporan Kehadiran Santri - ${categoryTitle} Periode ${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}`;
        
        let tableHeaderHtml = '';
        let tableBodyHtml = '';

        if (isStaf) {
            tableHeaderHtml = `
                <tr>
                    <th>No</th>
                    <th>Nama Pengajar</th>
                    <th>Email</th>
                    <th>Hadir</th>
                    <th>Izin</th>
                    <th>Libur</th>
                    <th>Alpha</th>
                    <th>Score Kehadiran</th>
                </tr>
            `;
            aggregatedStaf.forEach((item, index) => {
                const total = item.Hadir + item.Izin + item.Alpha;
                const score = total > 0 ? Math.round(((item.Hadir + item.Izin) / total) * 100) : 0;
                tableBodyHtml += `
                    <tr>
                        <td class="center">${index + 1}</td>
                        <td><b>${item.nama}</b></td>
                        <td>${item.email || '-'}</td>
                        <td class="center">${item.Hadir}</td>
                        <td class="center">${item.Izin}</td>
                        <td class="center">${item.Libur || 0}</td>
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
                    <th>Kategori</th>
                    <th>Kelas / Halaqoh</th>
                    <th>Hadir</th>
                    <th>Terlambat</th>
                    <th>Sakit</th>
                    <th>Izin</th>
                    <th>Alpha</th>
                    <th>Pulang</th>
                </tr>
            `;
            aggregatedSantri.forEach((item, index) => {
                tableBodyHtml += `
                    <tr>
                        <td class="center">${index + 1}</td>
                        <td><b>${item.nama}</b></td>
                        <td>${item.nis || '-'}</td>
                        <td>${item.kategoriLabel || '-'}</td>
                        <td>${item.grup || '-'}</td>
                        <td class="center">${item.Hadir}</td>
                        <td class="center">${item.Terlambat || 0}</td>
                        <td class="center">${item.Sakit}</td>
                        <td class="center">${item.Izin}</td>
                        <td class="center">${item.Alpha}</td>
                        <td class="center">${item.Pulang || 0}</td>
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
                    body { font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif; }
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
        const [jadwalRes, halaqohRes, guruRes, musyrifHalaqohRes, profilesRes] = await Promise.all([
            supabase.from('jadwal_pelajaran').select('*'),
            supabase.from('halaqoh').select('id, nama, musyrif_id'),
            supabase.from('guru').select('id, nama, email, user_id, status, created_at'),
            supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id'),
            supabase.from('user_profiles').select('user_id, nama, email, guru_id')
        ])
        
        const rawJadwal = jadwalRes.data || []
        const halaqohMap = (halaqohRes.data || []).reduce((acc, h) => ({...acc, [h.id]: h}), {})
        const guruMap = (guruRes.data || []).reduce((acc, g) => ({...acc, [g.id]: g}), {})
        const guruList = guruRes.data || []
        const profilesList = profilesRes.data || []
        const mhData = musyrifHalaqohRes.data || []

        // Helper untuk menyelesaikan user_id auth atau referensi ke guru.id
        const resolveToGuruId = (targetId) => {
            if (!targetId) return null
            const cleanId = String(targetId).toLowerCase()
            // 1. Jika sudah merupakan guru.id langsung
            if (guruMap[targetId]) return targetId
            // 2. Berdasarkan guru.user_id
            const byUserId = guruList.find(g => g.user_id && String(g.user_id).toLowerCase() === cleanId)
            if (byUserId) return byUserId.id
            // 3. Berdasarkan user_profiles.guru_id
            const prof = profilesList.find(p => p.user_id && String(p.user_id).toLowerCase() === cleanId)
            if (prof?.guru_id && guruMap[prof.guru_id]) return prof.guru_id
            // 4. Berdasarkan kecocokan email
            if (prof?.email) {
                const byEmail = guruList.find(g => g.email && g.email.toLowerCase() === prof.email.toLowerCase())
                if (byEmail) return byEmail.id
            }
            return null
        }
        
        const halaqohToMusyrifs = {}
        mhData.forEach(mh => {
            if (!halaqohToMusyrifs[mh.halaqoh_id]) halaqohToMusyrifs[mh.halaqoh_id] = []
            const resolvedGid = resolveToGuruId(mh.user_id)
            if (resolvedGid) {
                halaqohToMusyrifs[mh.halaqoh_id].push(resolvedGid)
            }
        })
        
        const fixedJadwal = []
        
        rawJadwal.forEach(j => {
            const isHalaqoh = j.tipe === 'HALAQOH' || Boolean(j.halaqoh_id)
            const targetHalaqohId = j.halaqoh_id || j.referensi_id

            if (isHalaqoh && targetHalaqohId) {
                const musyrifGids = halaqohToMusyrifs[targetHalaqohId] || []
                
                if (musyrifGids.length > 0) {
                    musyrifGids.forEach(gid => {
                        const guruData = guruMap[gid]
                        if (guruData && guruData.status === 'Aktif') {
                            fixedJadwal.push({
                                ...j,
                                guru_id: gid,
                                tipe: 'HALAQOH',
                                referensi_id: targetHalaqohId
                            })
                        }
                    })
                } else {
                    const h = halaqohMap[targetHalaqohId]
                    const directMusyrifId = resolveToGuruId(h?.musyrif_id) || h?.musyrif_id
                    if (directMusyrifId && guruMap[directMusyrifId]?.status === 'Aktif') {
                        fixedJadwal.push({
                            ...j,
                            guru_id: directMusyrifId,
                            tipe: 'HALAQOH',
                            referensi_id: targetHalaqohId
                        })
                    } else if (j.guru_id && guruMap[j.guru_id]?.status === 'Aktif') {
                        fixedJadwal.push({
                            ...j,
                            tipe: 'HALAQOH',
                            referensi_id: targetHalaqohId
                        })
                    } else {
                        fixedJadwal.push({
                            ...j,
                            guru_id: null,
                            tipe: 'HALAQOH',
                            referensi_id: targetHalaqohId
                        })
                    }
                }
            } else {
                let resolvedGuruId = j.guru_id;
                if (resolvedGuruId) {
                    const guruData = guruMap[resolvedGuruId]
                    if (guruData && guruData.status !== 'Aktif') {
                        resolvedGuruId = null;
                    }
                }
                fixedJadwal.push({
                    ...j,
                    tipe: j.tipe || 'MADROSAH',
                    referensi_id: j.referensi_id || j.kelas_id,
                    guru_id: resolvedGuruId
                })
            }
        })
        
        setAllJadwal(fixedJadwal)
    }

    const fetchGuru = async () => {
        const { data } = await supabase.from('guru').select('id, nama, email, created_at').order('nama')
        setGuruList(data || [])
    }

    const fetchPendingPermits = async () => {
        try {
            const [resIzin, resGanti] = await Promise.all([
                supabase.from('izin_guru').select('id, jenis_izin, tanggal_mulai, tanggal_selesai, created_at, guru:guru_id(nama)').eq('status', 'Diajukan').order('created_at', { ascending: false }).limit(5),
                supabase.from('pergantian_jadwal').select('id, tanggal_absen, created_at, guru_pemohon:guru_pemohon_id(nama), guru_pengganti:guru_pengganti_id(nama)').eq('status', 'Diajukan').order('created_at', { ascending: false }).limit(5)
            ])
            if (!resIzin.error && resIzin.data) {
                setPendingIzinList(resIzin.data)
                setPendingIzinCount(resIzin.data.length)
            }
            if (!resGanti.error && resGanti.data) {
                setPendingGantiCount(resGanti.data.length)
            }
        } catch (err) {
            console.warn('Warning fetching pending permits:', err)
        }
    }

    const fetchHolidays = async () => {
        try {
            const { data, error } = await supabase
                .from('kalender_akademik')
                .select('*')
                .or('jenis.eq.Libur,judul.ilike.%libur%')
                .order('tanggal_mulai', { ascending: false })
            if (!error && data) {
                setHolidayList(data)
            }
        } catch (err) {
            console.warn('Warning fetching kalender_akademik holidays:', err)
        }
    }

    useEffect(() => {
        fetchPendingPermits()
        fetchHolidays()
    }, [filterDate, filterStartDate, filterEndDate, mainTab, subKehadiran, selectedSemesterId])

    const handleSaveHoliday = async (e) => {
        if (e) e.preventDefault()
        if (!holidayForm.judul || !holidayForm.tanggal_mulai || !holidayForm.tanggal_selesai) {
            showToast.error('Mohon lengkapi judul dan rentang tanggal libur')
            return
        }
        if (holidayForm.tanggal_mulai > holidayForm.tanggal_selesai) {
            showToast.error('Tanggal mulai tidak boleh melebihi tanggal selesai')
            return
        }

        setIsSavingHoliday(true)
        try {
            let finalDesc = (holidayForm.deskripsi || '').replace(/\[Cakupan:\s*(Semua|Madrosah|Quraniyah)\]\s*/i, '').trim()
            finalDesc = `[Cakupan: ${holidayForm.cakupan || 'Semua'}] ${finalDesc}`.trim()

            const payload = {
                judul: holidayForm.judul,
                deskripsi: finalDesc,
                tanggal_mulai: holidayForm.tanggal_mulai,
                tanggal_selesai: holidayForm.tanggal_selesai,
                jenis: 'Libur'
            }

            const { error } = await supabase.from('kalender_akademik').insert([payload])
            if (error) throw error

            showToast.success('Hari libur berhasil disimpan dan diterapkan')
            setShowHolidayModal(false)
            setHolidayForm({
                judul: '',
                tanggal_mulai: filterDate || getLocalDateStr(new Date()),
                tanggal_selesai: filterDate || getLocalDateStr(new Date()),
                cakupan: 'Semua',
                deskripsi: ''
            })
            fetchHolidays()
        } catch (err) {
            console.error('Error saving holiday:', err)
            showToast.error('Gagal menyimpan hari libur: ' + err.message)
        } finally {
            setIsSavingHoliday(false)
        }
    }

    const handleDeleteHoliday = async (id) => {
        try {
            const { error } = await supabase.from('kalender_akademik').delete().eq('id', id)
            if (error) throw error
            showToast.success('Hari libur berhasil dihapus')
            fetchHolidays()
        } catch (err) {
            console.error('Error deleting holiday:', err)
            showToast.error('Gagal menghapus hari libur: ' + err.message)
        }
    }

    useEffect(() => {
        if (isDashboard || isRekap || isLaporan) {
            fetchPresensi()
        }
        if (isDashboard || isStaf || isLaporan) {
            fetchPresensiStaf()
        }
    }, [mainTab, subKehadiran, subAgenda, filterDate, filterStartDate, filterEndDate, filterType, filterKelasId, filterHalaqohId, selectedSemesterId])

    const fetchPresensiStaf = async () => {
        if (isLaporan) {
            if (!filterStartDate || !filterEndDate) return
            if (filterStartDate > filterEndDate) return
        } else {
            if (!filterDate) return
        }

        setLoading(true)
        try {
            let query = supabase
                .from('presensi_staf')
                .select('*')
            
            let queryIzin = supabase
                .from('izin_guru')
                .select('*')
                .eq('status', 'Disetujui')
                .order('created_at', { ascending: false })

            if (isLaporan) {
                query = query.gte('tanggal', filterStartDate).lte('tanggal', filterEndDate)
                queryIzin = queryIzin.lte('tanggal_mulai', filterEndDate).gte('tanggal_selesai', filterStartDate)
            } else {
                query = query.eq('tanggal', filterDate)
                queryIzin = queryIzin.lte('tanggal_mulai', filterDate).gte('tanggal_selesai', filterDate)
            }

            const [resPresensi, resIzin] = await Promise.all([
                query.order('waktu_scan', { ascending: false }),
                queryIzin
            ])

            if (resPresensi.error) console.warn('Warning fetching presensi_staf:', resPresensi.error)
            if (resIzin.error) console.warn('Warning fetching izin_guru:', resIzin.error)

            const rawStaf = resPresensi.data || []
            // Kehadiran staf HANYA diambil dari presensi_staf (scan QR asli atau penyesuaian manual Admin),
            // TIDAK otomatis hadir hanya karena daftar hadir/jurnal santri diisi.
            setPresensiStaf(rawStaf)
            setIzinGuruList(resIzin.data || [])
        } catch (err) {
            console.error('Error fetching presensi staf:', err)
            setPresensiStaf([])
            setIzinGuruList([])
        } finally {
            setLoading(false)
        }
    }

    const handleSaveManualStatus = async () => {
        if (!editingSession || !selectedGuruId || isSavingManual) return
        setIsSavingManual(true)

        const finalKeterangan = (manualKeterangan || '').trim() || (manualStatus === 'Hadir' ? 'Penyesuaian Hadir Manual oleh Admin' : manualStatus === 'Alpha' ? 'Direset ke Alpha oleh Admin' : `Izin ${manualStatus} disetujui Admin`)

        try {
            // 1. Bersihkan presensi_staf scan untuk sesi tanggal dan jam tersebut (jika ada)
            let delPresensiQuery = supabase
                .from('presensi_staf')
                .delete()
                .eq('staf_id', selectedGuruId)
                .eq('tanggal', editingSession.tanggal)

            if (editingSession.jam_ke) {
                delPresensiQuery = delPresensiQuery.eq('jam_ke', editingSession.jam_ke)
            }
            if (editingSession.referensi_id) {
                delPresensiQuery = delPresensiQuery.eq('referensi_id', editingSession.referensi_id)
            }
            await delPresensiQuery

            // 2. Bersihkan atau selaraskan izin_guru yang bertanggal sama agar tidak ada duplikasi data
            await supabase
                .from('izin_guru')
                .delete()
                .eq('guru_id', selectedGuruId)
                .eq('tanggal_mulai', editingSession.tanggal)
                .eq('tanggal_selesai', editingSession.tanggal)

            // 3. Terapkan status baru sesuai pilihan Admin
            if (manualStatus === 'Hadir') {
                const { error: insErr } = await supabase
                    .from('presensi_staf')
                    .insert({
                        staf_id: selectedGuruId,
                        tanggal: editingSession.tanggal,
                        tipe: editingSession.tipe,
                        referensi_id: editingSession.referensi_id,
                        jam_ke: editingSession.jam_ke,
                        waktu_scan: new Date().toISOString()
                    })
                if (insErr) throw insErr
            } else if (manualStatus === 'Alpha') {
                // Untuk Alpha, penghapusan presensi_staf dan izin_guru di atas sudah mengembalikan status ke Alpha default.
            } else {
                // Status Sakit / Izin / Dinas
                const { error: izinErr } = await supabase
                    .from('izin_guru')
                    .insert({
                        guru_id: selectedGuruId,
                        tanggal_mulai: editingSession.tanggal,
                        tanggal_selesai: editingSession.tanggal,
                        jenis_izin: manualStatus,
                        keterangan: finalKeterangan,
                        status: 'Disetujui',
                        catatan_admin: 'Diinput manual oleh Admin dari Rincian Kehadiran'
                    })
                if (izinErr) throw izinErr
            }

            // 4. Refetch data terbaru secara aman
            try {
                await Promise.all([
                    fetchPresensiStaf(),
                    fetchAllJadwal()
                ])
            } catch (refetchErr) {
                console.warn('Peringatan saat menyegarkan data:', refetchErr)
            }

            showToast.success(`Status berhasil diubah menjadi ${manualStatus === 'Alpha' ? 'Alpha / Default' : manualStatus}`)
            setEditingSession(null)
            setManualKeterangan('')
            setManualStatus('Hadir')
        } catch (err) {
            console.error('Error manual adjustment:', err)
            showToast.error(`Gagal mengubah status: ${err.message || 'Terjadi kesalahan sistem'}`)
        } finally {
            setIsSavingManual(false)
        }
    }

    const fetchPresensi = async () => {
        const isRange = isLaporan
        if (isRange) {
            if (!filterStartDate || !filterEndDate) return
            if (filterStartDate > filterEndDate) return
        } else {
            if (!filterDate) return
        }

        setLoading(true)
        try {
            let presensiPromise = supabase
                .from('presensi')
                .select(`
                    *,
                    santri:santri_id(
                        id, 
                        nama, 
                        nis, 
                        kelas_id,
                        halaqoh_id,
                        kelas:kelas_id(id, nama),
                        halaqoh:halaqoh_id(id, nama)
                    )
                `)

            if (isRange) {
                presensiPromise = presensiPromise.gte('tanggal', filterStartDate).lte('tanggal', filterEndDate)
            } else {
                presensiPromise = presensiPromise.eq('tanggal', filterDate)
            }

            presensiPromise = presensiPromise.order('created_at', { ascending: false })

            let perilakuPromise = supabase
                .from('perilaku_semester')
                .select('*')

            if (selectedSemesterId) {
                perilakuPromise = perilakuPromise.eq('semester_id', selectedSemesterId)
            }

            const santriPromise = supabase
                .from('santri')
                .select('id, nama, nis, kelas_id, halaqoh_id, kelas:kelas_id(id, nama), halaqoh:halaqoh_id(id, nama)')
                .eq('status', 'Aktif')
                .order('nama')

            console.log('[fetchPresensi] Fetching dengan semId:', selectedSemesterId, '| range:', filterStartDate, '-', filterEndDate)

            const [resPresensi, resPerilaku, resSantri] = await Promise.all([
                presensiPromise,
                perilakuPromise,
                santriPromise
            ])

            if (resPresensi.error) throw resPresensi.error

            console.log('[fetchPresensi] RESULT perilaku_semester rows:', resPerilaku.data?.length, '| santri rows:', resSantri.data?.length)

            setPresensiData(resPresensi.data || [])
            setPerilakuSemesterData(resPerilaku.data || [])
            if (resSantri.data) setSantriList(resSantri.data)
        } catch (err) {
            console.error('Error fetching presensi:', err)
            showToast.error('Gagal memuat data presensi')
        } finally {
            setLoading(false)
        }
    }

    // 1. Filter data mentah menjadi data yang siap ditampilkan di Rekap & Laporan
    const filteredPresensi = React.useMemo(() => {
        return presensiData.filter(p => {
            const isQuraniyah = (p.keterangan || '').toLowerCase().includes('[quraniyah]')
            const matchesType = 
                filterType === 'Semua' || 
                (filterType === 'Madrosah' && !isQuraniyah) || 
                (filterType === 'Quraniyah' && isQuraniyah)
            
            if (!matchesType) return false

            if (filterKelasId) {
                const sKelasId = p.santri?.kelas_id || p.santri?.kelas?.id
                if (sKelasId !== filterKelasId) return false
            }

            if (filterHalaqohId) {
                const sHalaqohId = p.santri?.halaqoh_id || p.santri?.halaqoh?.id
                if (sHalaqohId !== filterHalaqohId) return false
            }

            const searchLower = searchTerm.toLowerCase()
            return (
                (p.santri?.nama || '').toLowerCase().includes(searchLower) ||
                (p.santri?.nis || '').toLowerCase().includes(searchLower)
            )
        })
    }, [presensiData, filterType, filterKelasId, filterHalaqohId, searchTerm])

    // 2. Laporan Santri: baca dari perilaku_semester, fallback ke auto presensi semester penuh
    // PERSIS SAMA dengan logika InputPerilakuPage — menggunakan getResolvedAttendance
    const aggregatedSantri = React.useMemo(() => {
        const activeSantri = santriList

        const santriIds = activeSantri.map(s => s.id)
        // Auto counts dari presensi SEMESTER PENUH — sama persis dengan InputPerilakuPage
        const autoCounts = calculateAutoPresensi(semesterPresensiData, santriIds)

        const result = []
        const currentSemObj = semesterList.find(s => String(s.id) === String(selectedSemesterId))
            || semesterList.find(s => s.is_active)
            || semesterList[0]

        activeSantri.forEach(s => {
            // Filter nama/NIS
            const searchLower = searchTerm.toLowerCase()
            if (searchTerm && !(s.nama || '').toLowerCase().includes(searchLower) && !(s.nis || '').toLowerCase().includes(searchLower)) {
                return
            }

            // Filter Kelas
            if (filterKelasId) {
                const sKelasId = String(s.kelas_id || s.kelas?.id || '')
                if (sKelasId !== String(filterKelasId)) return
            }

            // Filter Halaqoh
            if (filterHalaqohId) {
                const sHalaqohId = String(s.halaqoh_id || s.halaqoh?.id || '')
                if (sHalaqohId !== String(filterHalaqohId)) return
            }

            // Cari row perilaku_semester (sama dengan Input Perilaku)
            const pSaved = perilakuSemesterData.find(x =>
                String(x.santri_id) === String(s.id) &&
                (!currentSemObj?.id || String(x.semester_id) === String(currentSemObj.id))
            )

            // Auto counts dari presensi semester penuh — fallback jika perilaku_semester null
            const autoObj = autoCounts[s.id] || { madrosah: {}, quraniyah: {} }

            // getResolvedAttendance menangani null dengan benar — sama dengan InputPerilakuPage
            const resolved = getResolvedAttendance(pSaved, autoObj)

            // A. Madrosah (Kelas)
            if (filterType === 'Semua' || filterType === 'Madrosah') {
                result.push({
                    id: s.id,
                    key: `${s.id}_madrosah`,
                    nama: s.nama,
                    nis: s.nis,
                    isQuraniyah: false,
                    grup: s.kelas?.nama || 'Kelas',
                    kategoriLabel: "Madrosah (Kelas)",
                    Hadir: resolved.madrosah.hadir,
                    Terlambat: resolved.madrosah.terlambat,
                    Sakit: resolved.madrosah.sakit,
                    Izin: resolved.madrosah.izin,
                    Alpha: resolved.madrosah.alpha,
                    Pulang: resolved.madrosah.pulang
                })
            }

            // B. Quraniyah (Halaqoh)
            if (filterType === 'Semua' || filterType === 'Quraniyah') {
                result.push({
                    id: s.id,
                    key: `${s.id}_quraniyah`,
                    nama: s.nama,
                    nis: s.nis,
                    isQuraniyah: true,
                    grup: s.halaqoh?.nama || 'Halaqoh',
                    kategoriLabel: "Qur'aniyah (Halaqoh)",
                    Hadir: resolved.quraniyah.hadir,
                    Terlambat: resolved.quraniyah.terlambat,
                    Sakit: resolved.quraniyah.sakit,
                    Izin: resolved.quraniyah.izin,
                    Alpha: resolved.quraniyah.alpha,
                    Pulang: resolved.quraniyah.pulang
                })
            }
        })

        return result
    }, [santriList, semesterPresensiData, perilakuSemesterData, filterType, filterKelasId, filterHalaqohId, searchTerm, selectedSemesterId, semesterList])

    // Logika Agregasi untuk Laporan Staf (Cross-Check dengan Jadwal dan Izin)
    const aggregatedStaf = React.useMemo(() => {
        if (!allJadwal.length) return []

        const relevantJadwal = allJadwal.filter(j => {
            if (filterType === 'Madrosah') return j.tipe === 'MADROSAH'
            if (filterType === 'Quraniyah') return j.tipe === 'HALAQOH' || j.tipe === 'QURANIYAH'
            return true
        })

        if (!relevantJadwal.length) return []

        const stafSummary = {}
        
        // 1. Dapatkan daftar tanggal dalam rentang (maksimal sampai hari ini)
        const start = new Date(filterStartDate)
        const end = new Date(filterEndDate)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        const effectiveEnd = end > today ? today : end

        const dates = []
        let curr = new Date(start)
        while (curr <= effectiveEnd) {
            dates.push(new Date(curr))
            curr.setDate(curr.getDate() + 1)
        }

        // 2. Untuk setiap staf di jadwal, inisialisasi rekap
        const allGuruIds = [...new Set(relevantJadwal.map(j => j.guru_id))]
        allGuruIds.forEach(gid => {
            const guru = guruList.find(g => g.id === gid)
            stafSummary[gid] = {
                id: gid,
                nama: guru?.nama || 'Unknown',
                email: guru?.email || '-',
                Hadir: 0,
                Izin: 0,
                Libur: 0,
                Alpha: 0,
                BelumAbsen: 0,
                totalSelesai: 0,
                details: []
            }
        })

        // 3. Kumpulkan tanggal awal aktivitas presensi untuk setiap guru dalam rentang laporan
        // Memastikan guru/musyrif yang baru aktif/mengajar pada tanggal tertentu tidak dicatat Alpha di masa lampau
        const guruEarliestActivity = {}
        presensiStaf.forEach(p => {
            if (p.staf_id && p.tanggal) {
                if (!guruEarliestActivity[p.staf_id] || p.tanggal < guruEarliestActivity[p.staf_id]) {
                    guruEarliestActivity[p.staf_id] = p.tanggal
                }
            }
        })
        izinGuruList.forEach(i => {
            if (i.guru_id && i.tanggal_mulai) {
                if (!guruEarliestActivity[i.guru_id] || i.tanggal_mulai < guruEarliestActivity[i.guru_id]) {
                    guruEarliestActivity[i.guru_id] = i.tanggal_mulai
                }
            }
        })
        const allActDates = Object.values(guruEarliestActivity).filter(Boolean).sort()
        const systemMinActivityDate = allActDates.length > 0 ? allActDates[0] : null

        // 4. Iterasi setiap hari dan bandingkan dengan jadwal
        dates.forEach(date => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
            const dayName = dayMap[date.getDay()]

            const jadwalHariIni = relevantJadwal.filter(j => j.hari === dayName)
            const dayScans = presensiStaf.filter(p => p.tanggal === dateStr)
            const matchedScanIds = new Set()
            
            jadwalHariIni.forEach(j => {
                if (!stafSummary[j.guru_id]) return

                // Cek apakah ada scan untuk jadwal ini menggunakan helper terpadu
                const scan = findStaffScan(
                    dayScans.filter(p => !matchedScanIds.has(p.id)),
                    j,
                    dateStr
                )

                if (scan) {
                    matchedScanIds.add(scan.id)
                    stafSummary[j.guru_id].Hadir++
                    stafSummary[j.guru_id].totalSelesai++
                    stafSummary[j.guru_id].details.push({
                        tanggal: dateStr,
                        jam_ke: j.jam_ke,
                        tipe: j.tipe,
                        referensi_id: j.referensi_id,
                        waktu_scan: scan.waktu_scan,
                        status: 'Hadir'
                    })
                } else {
                    // Cek apakah tanggal ini libur untuk tipe jadwal ini (Madrasah / Halaqoh / Semua)
                    const holidayMatch = getActiveHolidayForSchedule(dateStr, j.tipe, holidayList)
                    if (holidayMatch) {
                        stafSummary[j.guru_id].Libur++
                        stafSummary[j.guru_id].details.push({
                            tanggal: dateStr,
                            jam_ke: j.jam_ke,
                            tipe: j.tipe,
                            referensi_id: j.referensi_id,
                            status: 'Libur',
                            keterangan: `${holidayMatch.judul || 'Libur'} (Cakupan: ${holidayMatch.scope})`
                        })
                        return // Hari Libur: Jangan hitung Alpha!
                    }

                    // Cek apakah guru atau jadwal sudah aktif pada tanggal ini
                    // Mencegah guru baru tercatat Alpha sebelum tanggal pendaftaran/jadwal dibuat/aktivitas pertama dimulai
                    const guru = guruList.find(g => g.id === j.guru_id)
                    const guruFirstActivity = guruEarliestActivity[j.guru_id] || systemMinActivityDate
                    if (isBeforeScheduleActive(dateStr, guru?.created_at, j.created_at, guruFirstActivity)) {
                        return
                    }

                    // Jika tidak scan, cek izin
                    const matchedIzin = izinGuruList.find(izin => {
                        return izin.guru_id === j.guru_id && 
                               izin.tanggal_mulai <= dateStr && 
                               izin.tanggal_selesai >= dateStr
                    })

                    if (matchedIzin) {
                        const jenis = matchedIzin.jenis_izin || 'Izin'
                        stafSummary[j.guru_id].Izin++
                        stafSummary[j.guru_id].totalSelesai++
                        stafSummary[j.guru_id].details.push({
                            tanggal: dateStr,
                            jam_ke: j.jam_ke,
                            tipe: j.tipe,
                            referensi_id: j.referensi_id,
                            status: jenis,
                            keterangan: matchedIzin.keterangan
                        })
                    } else {
                        // Cek waktu, jika belum lewat batas, status Belum Absen
                        const now = new Date()
                        const classDate = new Date(date)
                        if (j.jam_selesai) {
                            const [h, m] = j.jam_selesai.split(':').map(Number)
                            classDate.setHours(h, m, 0, 0)
                        } else {
                            classDate.setHours(23, 59, 59, 999)
                        }
                        
                        if (now > classDate) {
                            stafSummary[j.guru_id].Alpha++
                            stafSummary[j.guru_id].totalSelesai++
                            stafSummary[j.guru_id].details.push({
                                tanggal: dateStr,
                                jam_ke: j.jam_ke,
                                tipe: j.tipe,
                                referensi_id: j.referensi_id,
                                status: 'Alpha'
                            })
                        } else {
                            stafSummary[j.guru_id].BelumAbsen++
                            stafSummary[j.guru_id].details.push({
                                tanggal: dateStr,
                                jam_ke: j.jam_ke,
                                tipe: j.tipe,
                                referensi_id: j.referensi_id,
                                status: 'Belum Absen'
                            })
                        }
                    }
                }
            })
        })

        return Object.values(stafSummary).sort((a, b) => b.Alpha - a.Alpha)
    }, [presensiStaf, allJadwal, filterStartDate, filterEndDate, guruList, izinGuruList, filterType, holidayList])

    // Logika untuk Kehadiran Staf Harian (Daftar seluruh jadwal hari ini + status kehadirannya)
    const dailyStaffAttendance = React.useMemo(() => {
        if (!allJadwal.length && !presensiStaf.length) return []
        
        const dateObj = new Date(filterDate)
        const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        const dayName = dayMap[dateObj.getDay()]
        const dateStr = filterDate

        const dayScans = presensiStaf.filter(p => p.tanggal === dateStr)
        const matchedScanIds = new Set()
        
        // 1. Ambil jadwal hari ini
        const jadwalHariIni = allJadwal.filter(j => {
            if (j.hari !== dayName) return false
            const guru = guruList.find(g => g.id === j.guru_id)
            const hasScan = dayScans.some(p => p.staf_id === j.guru_id)
            if (!hasScan && isBeforeScheduleActive(dateStr, guru?.created_at, j.created_at)) {
                return false
            }
            return true
        }).map(j => {
            const guru = guruList.find(g => g.id === j.guru_id)
            
            // Cari scan yang cocok menggunakan helper terpadu
            const scan = findStaffScan(
                dayScans.filter(p => !matchedScanIds.has(p.id)),
                j,
                dateStr
            )

            if (scan) {
                matchedScanIds.add(scan.id)
            }

            // Cek Izin
            const matchedIzin = izinGuruList.find(izin => 
                izin.guru_id === j.guru_id &&
                izin.tanggal_mulai <= dateStr &&
                izin.tanggal_selesai >= dateStr
            )

            // Cek apakah jadwal ini libur pada tanggal ini
            const holidayMatch = getActiveHolidayForSchedule(dateStr, j.tipe, holidayList)

            let status = 'Belum Absen'
            let statusKeterangan = ''
            if (scan) {
                status = 'Hadir'
            } else if (matchedIzin) {
                status = matchedIzin.jenis_izin || 'Izin'
                statusKeterangan = matchedIzin.keterangan || ''
            } else if (holidayMatch) {
                status = 'Libur'
                statusKeterangan = `${holidayMatch.judul || 'Libur'} (Cakupan: ${holidayMatch.scope})`
            } else {
                const now = new Date()
                const classDate = new Date(dateObj)
                if (j.jam_selesai) {
                    const [h, m] = j.jam_selesai.split(':').map(Number)
                    classDate.setHours(h, m, 0, 0)
                } else {
                    classDate.setHours(23, 59, 59, 999)
                }
                if (now > classDate) {
                    status = 'Alpha'
                }
            }

            return {
                id: j.id,
                guru: guru || { nama: 'Unknown', email: '-' },
                tipe: j.tipe,
                referensi_id: j.referensi_id || j.kelas_id || j.halaqoh_id,
                waktu_scan: scan ? scan.waktu_scan : null,
                jam_ke: j.jam_ke,
                jam_mulai: j.jam_mulai,
                jam_selesai: j.jam_selesai,
                status,
                keterangan: statusKeterangan
            }
        })

        // 2. Tambahkan jika ada scan yang diluar jadwal reguler (misal: guru pengganti/badal)
        const presensiLuarJadwal = dayScans.filter(p => !matchedScanIds.has(p.id)).map(p => {
            return {
                id: p.id,
                guru: p.guru || guruList.find(g => g.id === p.staf_id) || { nama: 'Unknown', email: '-' },
                tipe: p.tipe,
                referensi_id: p.referensi_id,
                waktu_scan: p.waktu_scan,
                jam_ke: p.jam_ke,
                jam_mulai: null,
                jam_selesai: null,
                status: 'Hadir',
                is_tambahan: true
            }
        })

        const combined = [...jadwalHariIni, ...presensiLuarJadwal]
        
        // Sort by Waktu Scan (jika ada), lalu by Jam Ke
        return combined.sort((a, b) => {
            if (a.jam_ke !== b.jam_ke) return Number(a.jam_ke) - Number(b.jam_ke)
            return (a.guru?.nama || '').localeCompare(b.guru?.nama || '')
        })
    }, [allJadwal, filterDate, guruList, presensiStaf, izinGuruList, holidayList])

    const handlePrintQR = () => {
        window.print()
    }

    const activeDateHolidays = React.useMemo(() => {
        if (!holidayList.length || !filterDate) return []
        return holidayList.filter(h => isHolidayActiveOnDate(filterDate, h))
    }, [holidayList, filterDate])


    const dashboardSantriStats = React.useMemo(() => {
        const totalSantri = santriList.length || 0
        const hadir = presensiData.filter(p => (p.status || '').toLowerCase() === 'hadir').length
        const sakit = presensiData.filter(p => (p.status || '').toLowerCase() === 'sakit').length
        const izin = presensiData.filter(p => (p.status || '').toLowerCase() === 'izin').length
        const alpha = presensiData.filter(p => ['alpha', 'alfa', 'alpa'].includes((p.status || '').toLowerCase())).length
        const pulang = presensiData.filter(p => (p.status || '').toLowerCase() === 'pulang').length
        const terlambat = presensiData.filter(p => ['terlambat', 'telat'].includes((p.status || '').toLowerCase())).length
        const totalTercatat = hadir + sakit + izin + alpha + pulang + terlambat
        const persenHadir = totalTercatat > 0 ? Math.round((hadir / totalTercatat) * 100) : 0

        return { totalSantri, hadir, sakit, izin, alpha, pulang, terlambat, totalTercatat, persenHadir }
    }, [presensiData, santriList])

    const dashboardStafStats = React.useMemo(() => {
        const totalJadwal = dailyStaffAttendance.length || 0
        const hadir = dailyStaffAttendance.filter(j => j.status === 'Hadir').length
        const izin = dailyStaffAttendance.filter(j => ['Izin', 'Sakit', 'Dinas'].includes(j.status)).length
        const belumAbsen = dailyStaffAttendance.filter(j => j.status === 'Belum Absen').length
        const alpha = dailyStaffAttendance.filter(j => j.status === 'Alpha').length
        const persenHadir = totalJadwal > 0 ? Math.round((hadir / totalJadwal) * 100) : 0

        return { totalJadwal, hadir, izin, belumAbsen, alpha, persenHadir }
    }, [dailyStaffAttendance])

    const dashboardAgendaStats = React.useMemo(() => {
        const totalAgenda = agendaList.length || 0
        const terisi = agendaList.filter(a => a.jurnal).length
        const persenTerisi = totalAgenda > 0 ? Math.round((terisi / totalAgenda) * 100) : 0
        return { totalAgenda, terisi, persenTerisi }
    }, [agendaList])

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
        <div className={`relative space-y-6 md:space-y-8 animate-fade-in pb-20 ${isStandalone ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8' : ''}`}>
            <PageHeader 
                title={
                    isDashboard ? 'Dashboard Presensi' :
                    isRekap ? 'Kehadiran Santri' :
                    isStaf ? 'Kehadiran Staf & Guru' :
                    isLaporan ? 'Laporan Kehadiran Periode' :
                    isJurnal ? 'Agenda Mengajar' :
                    isQr ? 'Manajemen QR Code' :
                    'Admin Absensi'
                }
                description={
                    isDashboard ? 'Pusat monitoring dan analisis kehadiran harian pondok' :
                    isRekap ? 'Rekapitulasi data kehadiran santri madrasah & halaqoh hari ini' :
                    isStaf ? 'Monitoring kehadiran dan scan QR staf pengajar hari ini' :
                    isLaporan ? 'Rekapitulasi dan analisis kehadiran per periode semester' :
                    isJurnal ? 'Jurnal dan agenda mengajar kelas & halaqoh hari ini' :
                    isQr ? 'Kelola dan cetak kode QR kelas & halaqoh' :
                    'Pusat rekapitulasi kehadiran'
                }
                icon={
                    isDashboard ? LayoutDashboard :
                    isRekap ? Users :
                    isStaf ? UserCheck :
                    isLaporan ? FileText :
                    isJurnal ? Calendar :
                    isQr ? QrCode :
                    Users
                }
                actions={
                    <div className="flex items-center gap-2">
                        {isDashboard && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    fetchPresensi()
                                    fetchPresensiStaf()
                                    fetchAllJadwal()
                                    fetchPendingPermits()
                                }}
                                className="rounded-xl flex items-center gap-2"
                                disabled={loading}
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Segarkan Data</span>
                            </Button>
                        )}
                        {isLaporan && (
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
                    )}
                </div>
            }
            />

            {/* Sub-menu Navigation for KEHADIRAN (Santri vs Staf vs Laporan) */}
            {mainTab === 'kehadiran' && (
                <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/60 w-fit max-w-full overflow-x-auto scrollbar-none shadow-sm">
                    <button 
                        type="button"
                        onClick={() => handleSwitchSubKehadiran('santri')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                            subKehadiran === 'santri' 
                                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-[1.02]' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        <Users size={15} />
                        <span>Kehadiran Santri</span>
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleSwitchSubKehadiran('staf')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                            subKehadiran === 'staf' 
                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100 scale-[1.02]' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        <UserCheck size={15} />
                        <span>Kehadiran Staf &amp; Guru</span>
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleSwitchSubKehadiran('laporan')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                            subKehadiran === 'laporan' 
                                ? 'bg-white text-purple-700 shadow-sm border border-purple-100 scale-[1.02]' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        <FileText size={15} />
                        <span>Laporan Periode</span>
                    </button>
                </div>
            )}

            {/* Sub-menu Navigation for AGENDA (Jurnal vs QR Code) */}
            {mainTab === 'agenda' && (
                <div className="flex items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/60 w-fit max-w-full overflow-x-auto scrollbar-none shadow-sm">
                    <button 
                        type="button"
                        onClick={() => handleSwitchSubAgenda('jurnal')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                            subAgenda === 'jurnal' 
                                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100 scale-[1.02]' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        <Calendar size={15} />
                        <span>Agenda Mengajar</span>
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleSwitchSubAgenda('qr')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                            subAgenda === 'qr' 
                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100 scale-[1.02]' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                        }`}
                    >
                        <QrCode size={15} />
                        <span>Manajemen QR Code</span>
                    </button>
                </div>
            )}

            {/* Quick Stats Row - displayed on Kehadiran (Santri/Staf) and Agenda (Jurnal) */}
            {(isRekap || isStaf || isJurnal) && (
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

            {isDashboard ? (
                /* DASHBOARD VIEW */
                <div className="space-y-8 animate-fade-in">
                    {/* 1. Hero Welcome & Quick Date Banner */}
                    <div className="bg-gradient-to-br from-[#0A2619] via-[#0E3523] to-[#144730] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-[#143d2a]">
                        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-[#BCF32F]/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-3 py-1 bg-[#BCF32F]/20 text-[#BCF32F] border border-[#BCF32F]/30 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <Sparkles size={12} />
                                        {semesterList.find(s => s.id === selectedSemesterId)?.nama ? `Semester ${semesterList.find(s => s.id === selectedSemesterId)?.nama} (${semesterList.find(s => s.id === selectedSemesterId)?.tahun_ajaran})` : 'Semester Aktif'}
                                    </span>
                                    <span className="px-3 py-1 bg-white/10 text-emerald-200 border border-white/10 rounded-xl text-[10px] font-bold tracking-wide flex items-center gap-1.5">
                                        <Clock size={12} />
                                        {new Date(filterDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                                    Dashboard Monitoring Presensi
                                </h2>
                                <p className="text-emerald-100/80 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
                                    Pantau tingkat kehadiran santri, monitoring jadwal scan QR pengajar, dan verifikasi permohonan izin secara terpusat dan real-time.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/20 p-2.5 rounded-2xl border border-white/10 backdrop-blur-sm self-start lg:self-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHolidayForm({
                                            judul: '',
                                            tanggal_mulai: filterDate || getLocalDateStr(new Date()),
                                            tanggal_selesai: filterDate || getLocalDateStr(new Date()),
                                            cakupan: 'Semua',
                                            deskripsi: ''
                                        })
                                        setShowHolidayModal(true)
                                    }}
                                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-[#BCF32F] border border-[#BCF32F]/40 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
                                >
                                    <span>🏖️</span>
                                    <span>Atur Libur</span>
                                </button>
                                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/10">
                                    <Calendar size={16} className="text-[#BCF32F]" />
                                    <input 
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="bg-transparent border-none text-white text-xs font-bold outline-none cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                                {filterDate !== getLocalDateStr(new Date()) && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterDate(getLocalDateStr(new Date()))}
                                        className="px-3 py-2 bg-[#BCF32F] text-[#0A2619] rounded-xl text-xs font-black hover:bg-[#d0ff42] transition-all cursor-pointer whitespace-nowrap active:scale-95"
                                    >
                                        Hari Ini
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Holiday Alert Banner (Dashboard) */}
                    {activeDateHolidays.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10 border-2 border-amber-300/80 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-slide-up">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shrink-0 shadow-sm border border-amber-200">
                                    🏖️
                                </div>
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest bg-amber-200/60 px-2 py-0.5 rounded-md">
                                            AGENDA LIBUR AKTIF
                                        </span>
                                        {activeDateHolidays.map((h, i) => {
                                            const scope = parseHolidayScope(h)
                                            return (
                                                <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">
                                                    Cakupan: {scope}
                                                </span>
                                            )
                                        })}
                                    </div>
                                    <h4 className="text-sm md:text-base font-black text-gray-900">
                                        {activeDateHolidays.map(h => h.judul).join(' & ')}
                                    </h4>
                                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                                        Sistem secara otomatis menonaktifkan sanksi alpha pada jadwal pelajaran yang masuk dalam cakupan libur hari ini.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHolidayModal(true)}
                                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer shadow-md shadow-amber-600/20 active:scale-95"
                            >
                                Kelola Hari Libur
                            </button>
                        </div>
                    )}

                    {/* 2. Top 4 Executive KPI Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {/* Card 1: Santri */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between hover:border-emerald-200 transition-all group">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                                        <Users size={22} />
                                    </div>
                                    <span className="text-2xl font-black text-emerald-600">
                                        {dashboardSantriStats.persenHadir}%
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Kehadiran Santri</div>
                                    <div className="text-xl font-black text-gray-900 mt-1">
                                        {dashboardSantriStats.hadir} <span className="text-xs font-bold text-gray-400">/ {dashboardSantriStats.totalTercatat || dashboardSantriStats.totalSantri} Santri</span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${dashboardSantriStats.persenHadir}%` }}
                                    ></div>
                                </div>
                                {/* Pill Breakdown */}
                                <div className="grid grid-cols-4 gap-1 pt-1 text-center">
                                    <div className="bg-emerald-50 py-1 rounded-lg border border-emerald-100">
                                        <div className="text-[8px] font-black text-emerald-500 uppercase">Hadir</div>
                                        <div className="text-xs font-black text-emerald-700">{dashboardSantriStats.hadir}</div>
                                    </div>
                                    <div className="bg-amber-50 py-1 rounded-lg border border-amber-100">
                                        <div className="text-[8px] font-black text-amber-500 uppercase">Sakit</div>
                                        <div className="text-xs font-black text-amber-700">{dashboardSantriStats.sakit}</div>
                                    </div>
                                    <div className="bg-blue-50 py-1 rounded-lg border border-blue-100">
                                        <div className="text-[8px] font-black text-blue-500 uppercase">Izin</div>
                                        <div className="text-xs font-black text-blue-700">{dashboardSantriStats.izin}</div>
                                    </div>
                                    <div className="bg-red-50 py-1 rounded-lg border border-red-100">
                                        <div className="text-[8px] font-black text-red-500 uppercase">Alpha</div>
                                        <div className="text-xs font-black text-red-700">{dashboardSantriStats.alpha}</div>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSwitchSubKehadiran('santri')}
                                className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 font-bold text-xs transition-all flex items-center justify-between cursor-pointer border border-gray-100 hover:border-emerald-200"
                            >
                                <span>Buka Rekap Santri</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>

                        {/* Card 2: Guru / Staf */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between hover:border-indigo-200 transition-all group">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                                        <UserCheck size={22} />
                                    </div>
                                    <span className="text-2xl font-black text-indigo-600">
                                        {dashboardStafStats.persenHadir}%
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Presensi Guru &amp; Staf</div>
                                    <div className="text-xl font-black text-gray-900 mt-1">
                                        {dashboardStafStats.hadir} <span className="text-xs font-bold text-gray-400">/ {dashboardStafStats.totalJadwal} Sesi Terjadwal</span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${dashboardStafStats.persenHadir}%` }}
                                    ></div>
                                </div>
                                {/* Pill Breakdown */}
                                <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                                    <div className="bg-emerald-50 py-1 rounded-lg border border-emerald-100">
                                        <div className="text-[8px] font-black text-emerald-500 uppercase">Hadir</div>
                                        <div className="text-xs font-black text-emerald-700">{dashboardStafStats.hadir}</div>
                                    </div>
                                    <div className="bg-amber-50 py-1 rounded-lg border border-amber-100">
                                        <div className="text-[8px] font-black text-amber-500 uppercase">Izin/Dinas</div>
                                        <div className="text-xs font-black text-amber-700">{dashboardStafStats.izin}</div>
                                    </div>
                                    <div className="bg-rose-50 py-1 rounded-lg border border-rose-100">
                                        <div className="text-[8px] font-black text-rose-500 uppercase">Belum Absen</div>
                                        <div className="text-xs font-black text-rose-700">{dashboardStafStats.belumAbsen}</div>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSwitchSubKehadiran('staf')}
                                className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 font-bold text-xs transition-all flex items-center justify-between cursor-pointer border border-gray-100 hover:border-indigo-200"
                            >
                                <span>Monitoring Staf</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>

                        {/* Card 3: Pending Approvals */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between hover:border-amber-200 transition-all group">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                                        <ClipboardList size={22} />
                                    </div>
                                    {(pendingIzinCount + pendingGantiCount) > 0 ? (
                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-xl border border-amber-200 animate-pulse">
                                            Menunggu
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-xl border border-emerald-200">
                                            Selesai
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Izin &amp; Tukar Jadwal</div>
                                    <div className="text-xl font-black text-gray-900 mt-1">
                                        {pendingIzinCount + pendingGantiCount} <span className="text-xs font-bold text-gray-400">Berkas Perlu Verifikasi</span>
                                    </div>
                                </div>
                                <div className="text-xs font-medium text-gray-500 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                    {(pendingIzinCount + pendingGantiCount) > 0 ? (
                                        <div className="space-y-1">
                                            <div className="text-amber-800 font-bold">• {pendingIzinCount} Pengajuan Izin Guru</div>
                                            <div className="text-amber-800 font-bold">• {pendingGantiCount} Pengajuan Tukar Jam</div>
                                        </div>
                                    ) : (
                                        <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                                            <CheckCircle2 size={14} />
                                            Semua permohonan telah ditinjau
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/absensi/admin-izin')}
                                className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-amber-50 text-gray-600 hover:text-amber-700 font-bold text-xs transition-all flex items-center justify-between cursor-pointer border border-gray-100 hover:border-amber-200"
                            >
                                <span>Buka Kelola Izin</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>

                        {/* Card 4: Agenda & Jurnal Kelas */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 flex flex-col justify-between hover:border-purple-200 transition-all group">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                                        <BookOpen size={22} />
                                    </div>
                                    <span className="text-2xl font-black text-purple-600">
                                        {dashboardAgendaStats.persenTerisi}%
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Jurnal Kelas Hari Ini</div>
                                    <div className="text-xl font-black text-gray-900 mt-1">
                                        {dashboardAgendaStats.terisi} <span className="text-xs font-bold text-gray-400">/ {dashboardAgendaStats.totalAgenda} Jurnal Terisi</span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${dashboardAgendaStats.persenTerisi}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs font-medium text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                                    {dashboardAgendaStats.totalAgenda - dashboardAgendaStats.terisi > 0 ? (
                                        <span className="text-purple-700 font-bold">{dashboardAgendaStats.totalAgenda - dashboardAgendaStats.terisi} Jurnal belum diisi pengajar</span>
                                    ) : (
                                        <span className="text-emerald-700 font-bold">Seluruh jurnal kelas telah terisi</span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSwitchSubAgenda('jurnal')}
                                className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-purple-50 text-gray-600 hover:text-purple-700 font-bold text-xs transition-all flex items-center justify-between cursor-pointer border border-gray-100 hover:border-purple-200"
                            >
                                <span>Buka Agenda Mengajar</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* 3. Quick Action Grid (6 Menu Pintasan) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Pusat Navigasi Cepat</h3>
                                <p className="text-xs text-gray-400 font-bold">Akses seluruh modul absensi dengan satu klik</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                            <button
                                type="button"
                                onClick={() => handleSwitchSubKehadiran('santri')}
                                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-xs sm:text-sm group-hover:text-emerald-600 transition-colors">Presensi Santri</div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">Madrasah &amp; Halaqoh</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchSubKehadiran('staf')}
                                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                                    <UserCheck size={20} />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors">Presensi Staf</div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">Scan &amp; Status Guru</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchSubKehadiran('laporan')}
                                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-xs sm:text-sm group-hover:text-purple-600 transition-colors">Laporan Periode</div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">Rekap &amp; Unduh Berkas</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchSubAgenda('jurnal')}
                                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-amber-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-xs sm:text-sm group-hover:text-amber-600 transition-colors">Agenda Mengajar</div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">Jurnal Harian Sesi</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchSubAgenda('qr')}
                                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                                    <QrCode size={20} />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">Cetak QR Code</div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">Kartu Kelas &amp; Halaqoh</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/absensi/admin-izin')}
                                className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-rose-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-95"
                            >
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform relative">
                                    <ClipboardList size={20} />
                                    {(pendingIzinCount + pendingGantiCount) > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                                    )}
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-xs sm:text-sm group-hover:text-rose-600 transition-colors">Kelola Izin</div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">Verifikasi Izin Pengajar</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* 4. Live Activity Panel (2 Kolom) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Kolom 1: Status Pengajar Hari Ini (2 span) */}
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-base">Monitoring Presensi Pengajar Hari Ini</h4>
                                        <p className="text-[11px] text-gray-400 font-medium">Daftar jadwal dan status scan QR pengajar</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSwitchSubKehadiran('staf')}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Lihat Semua</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>

                            {dailyStaffAttendance.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 text-xs italic font-medium">
                                    Tidak ada jadwal mengajar pada tanggal ini.
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                                    {dailyStaffAttendance.slice(0, 7).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-indigo-50/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                                                    {item.guru?.nama?.charAt(0) || 'G'}
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900 text-xs leading-tight">{item.guru?.nama}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                                                        Jam Ke-{item.jam_ke} • {item.tipe === 'MADROSAH' ? (kelasList.find(k => k.id === item.referensi_id)?.nama || 'Kelas') : (halaqohList.find(h => h.id === item.referensi_id)?.nama || 'Halaqoh')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.waktu_scan && (
                                                    <span className="text-[10px] text-gray-400 font-bold hidden sm:inline">
                                                        {new Date(item.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                                <Badge
                                                    variant={
                                                        item.status === 'Hadir' ? 'success' :
                                                        item.status === 'Libur' ? 'purple' :
                                                        ['Sakit', 'Izin', 'Dinas'].includes(item.status) ? 'warning' :
                                                        item.status === 'Belum Absen' ? 'neutral' : 'danger'
                                                    }
                                                    className="text-[9px] font-black uppercase px-2.5 py-1"
                                                >
                                                    {item.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Kolom 2: Permohonan Izin Menunggu & Fast Actions */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 p-6 space-y-4 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 text-base">Permohonan Izin</h4>
                                            <p className="text-[11px] text-gray-400 font-medium">Menunggu persetujuan</p>
                                        </div>
                                    </div>
                                </div>

                                {pendingIzinList.length === 0 ? (
                                    <div className="py-10 text-center space-y-2">
                                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div className="font-black text-gray-800 text-xs">Semua Izin Telah Diverifikasi</div>
                                        <p className="text-[10px] text-gray-400">Tidak ada pengajuan izin yang tertunda saat ini.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {pendingIzinList.map((p, idx) => (
                                            <div key={idx} className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100/80 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-gray-900 text-xs">{p.guru?.nama || 'Guru'}</span>
                                                    <span className="px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-lg text-[9px] font-black uppercase">{p.jenis_izin}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-medium">
                                                    {p.tanggal_mulai === p.tanggal_selesai ? p.tanggal_mulai : `${p.tanggal_mulai} s/d ${p.tanggal_selesai}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={() => navigate('/absensi/admin-izin')}
                                variant="primary"
                                className="w-full justify-center rounded-2xl py-3 font-black text-xs uppercase tracking-widest mt-4"
                            >
                                Buka Kelola Izin
                            </Button>
                        </div>
                    </div>
                </div>
            ) : isRekap ? (
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
                                    onChange={(e) => {
                                        setFilterType(e.target.value)
                                        setFilterKelasId('')
                                        setFilterHalaqohId('')
                                    }}
                                    className="w-full px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-xs md:text-sm bg-gray-50/30 appearance-none cursor-pointer"
                                >
                                    <option value="Semua">Semua Tipe</option>
                                    <option value="Madrosah">Madrosah (Kelas)</option>
                                    <option value="Quraniyah">Qur'aniyah (Halaqoh)</option>
                                </select>
                            </div>
                            {filterType === 'Madrosah' ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Filter Kelas</label>
                                    <select 
                                        value={filterKelasId}
                                        onChange={(e) => setFilterKelasId(e.target.value)}
                                        className="w-full px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl border border-emerald-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-xs md:text-sm bg-emerald-50/30 text-emerald-900 appearance-none cursor-pointer"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {kelasList.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : filterType === 'Quraniyah' ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Filter Halaqoh</label>
                                    <select 
                                        value={filterHalaqohId}
                                        onChange={(e) => setFilterHalaqohId(e.target.value)}
                                        className="w-full px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl border border-blue-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-xs md:text-sm bg-blue-50/30 text-blue-900 appearance-none cursor-pointer"
                                    >
                                        <option value="">Semua Halaqoh</option>
                                        {halaqohList.map(h => (
                                            <option key={h.id} value={h.id}>{h.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : null}
                            <div className={`${filterType === 'Semua' ? 'md:col-span-2' : 'md:col-span-1'} space-y-2`}>
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
                        <ResponsiveTable
                            columns={[
                                { 
                                    header: 'Waktu', 
                                    render: (row) => (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white shadow-sm text-emerald-500 group-hover:scale-110 transition-transform">
                                                <Clock size={16} />
                                            </div>
                                            <span className="font-black text-gray-900">{new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ), 
                                    className: 'px-8 py-6 whitespace-nowrap', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Santri', 
                                    render: (row) => (
                                        <>
                                            <div className="font-black text-gray-900 text-sm group-hover:text-emerald-600 transition-colors">{row.santri?.nama}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.santri?.nis}</div>
                                        </>
                                    ), 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Grup', 
                                    render: (row) => {
                                        const isQuraniyah = row.keterangan?.includes('[Quraniyah]')
                                        return (
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/50 w-fit">
                                                {isQuraniyah ? <Users size={12} className="text-blue-500" /> : <BookOpen size={12} className="text-emerald-500" />}
                                                <span className="text-xs font-black text-gray-600 uppercase tracking-tighter">
                                                    {isQuraniyah ? (row.santri?.halaqoh?.nama || '-') : (row.santri?.kelas?.nama || '-')}
                                                </span>
                                            </div>
                                        )
                                    }, 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Status', 
                                    render: (row) => (
                                        <Badge variant={
                                            (row.status || '').toLowerCase() === 'hadir' ? 'success' :
                                            (row.status || '').toLowerCase() === 'sakit' ? 'warning' :
                                            (row.status || '').toLowerCase() === 'izin' ? 'info' : 
                                            (row.status || '').toLowerCase() === 'pulang' ? 'neutral' : 'danger'
                                        } className="px-4 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                            {row.status}
                                        </Badge>
                                    ), 
                                    className: 'px-8 py-6 text-center', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Keterangan', 
                                    render: (row) => <span className="text-gray-500 text-xs font-medium italic max-w-[200px] truncate">{row.keterangan?.replace('[Quraniyah] ', '') || '-'}</span>, 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Operator', 
                                    render: (row) => (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-lg shadow-slate-200">
                                                {row.nama_pengabsen?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.nama_pengabsen || '-'}</span>
                                        </div>
                                    ), 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                }
                            ]}
                            data={filteredPresensi}
                            loading={loading}
                            emptyState={<div className="px-8 py-20"><EmptyState icon={Calendar} title="No Data Found" message="Belum ada catatan presensi untuk kriteria ini." /></div>}
                            mobileCardHeader={(row) => (
                                <div className="flex items-center gap-3 w-full">
                                    <div className="p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 text-emerald-500 shrink-0">
                                        <Clock size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div className="font-black text-gray-900 text-sm leading-tight">{row.santri?.nama}</div>
                                            <span className="font-black text-gray-900 text-sm">
                                                {new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.santri?.nis}</div>
                                    </div>
                                </div>
                            )}
                            mobileCardContent={(row) => {
                                const isQuraniyah = row.keterangan?.includes('[Quraniyah]')
                                return (
                                    <div className="flex flex-col gap-2 w-full mt-2 pt-2 border-t border-gray-50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 text-xs">Grup</span>
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                                                {isQuraniyah ? (row.santri?.halaqoh?.nama || '-') : (row.santri?.kelas?.nama || '-')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 text-xs">Status</span>
                                            <Badge variant={
                                                (row.status || '').toLowerCase() === 'hadir' ? 'success' :
                                                (row.status || '').toLowerCase() === 'sakit' ? 'warning' :
                                                (row.status || '').toLowerCase() === 'izin' ? 'info' : 
                                                (row.status || '').toLowerCase() === 'pulang' ? 'neutral' : 'danger'
                                            } className="px-2 py-0.5 rounded-lg font-black uppercase text-[9px] tracking-widest">
                                                {row.status}
                                            </Badge>
                                        </div>
                                        {row.keterangan && row.keterangan !== '[Quraniyah] ' && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500 text-xs">Ket</span>
                                                <span className="text-xs italic text-gray-600">{row.keterangan.replace('[Quraniyah] ', '')}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            }}
                        />
                    </Card>
                </div>
            ) : isStaf ? (
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
                        <ResponsiveTable
                            columns={[
                                { 
                                    header: 'Jadwal & Waktu', 
                                    render: (row) => (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-tighter border border-blue-100">
                                                    Jam {row.jam_ke}
                                                </div>
                                                {(row.jam_mulai && row.jam_selesai) && (
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                                        {row.jam_mulai.slice(0, 5)} - {row.jam_selesai.slice(0, 5)}
                                                    </div>
                                                )}
                                            </div>
                                            {row.waktu_scan ? (
                                                <div className="flex items-center gap-1.5 mt-0.5 text-emerald-600 font-bold text-xs">
                                                    <Clock size={12} />
                                                    {new Date(row.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 mt-0.5 text-gray-400 font-bold text-xs">
                                                    <Clock size={12} />
                                                    -
                                                </div>
                                            )}
                                        </div>
                                    ), 
                                    className: 'px-8 py-4 whitespace-nowrap', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Staf Pengajar', 
                                    render: (row) => (
                                        <>
                                            <div className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                                                {row.guru?.nama}
                                                {row.is_tambahan && (
                                                    <span className="ml-2 text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md border border-purple-100 uppercase tracking-widest">Tambahan</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.guru?.email}</div>
                                        </>
                                    ), 
                                    className: 'px-8 py-4', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Grup / Lokasi', 
                                    render: (row) => (
                                        <div className="flex items-center gap-2 font-black text-gray-600 uppercase tracking-tighter text-xs">
                                            {row.tipe === 'MADROSAH' 
                                                ? (kelasList.find(k => k.id === row.referensi_id)?.nama || 'Kelas')
                                                : (halaqohList.find(h => h.id === row.referensi_id)?.nama || 'Halaqoh')
                                            }
                                        </div>
                                    ), 
                                    className: 'px-8 py-4', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Status Kehadiran', 
                                    render: (row) => {
                                        if (row.status === 'Hadir') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-100/50">
                                                    <CheckCircle2 size={12} />
                                                    Hadir
                                                </div>
                                            )
                                        } else if (row.status === 'Sakit') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-black text-[10px] uppercase tracking-widest border border-amber-200 shadow-sm shadow-amber-100/50">
                                                    <AlertCircle size={12} />
                                                    Sakit
                                                </div>
                                            )
                                        } else if (row.status === 'Izin') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-widest border border-blue-200 shadow-sm shadow-blue-100/50">
                                                    <ClipboardList size={12} />
                                                    Izin
                                                </div>
                                            )
                                        } else if (row.status === 'Dinas') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase tracking-widest border border-indigo-200 shadow-sm shadow-indigo-100/50">
                                                    <Briefcase size={12} />
                                                    Dinas
                                                </div>
                                            )
                                        } else if (row.status === 'Belum Absen') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-500 font-black text-[10px] uppercase tracking-widest border border-gray-200 shadow-sm shadow-gray-100/50">
                                                    <Clock size={12} />
                                                    Belum Absen
                                                </div>
                                            )
                                        } else if (row.status === 'Libur') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 font-black text-[10px] uppercase tracking-widest border border-purple-200 shadow-sm shadow-purple-100/50" title={row.keterangan}>
                                                    <span>🏖️</span>
                                                    <span>Libur</span>
                                                </div>
                                            )
                                        } else {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest border border-red-100 shadow-sm shadow-red-100/50">
                                                    <XCircle size={12} />
                                                    Alfa
                                                </div>
                                            )
                                        }
                                    }, 
                                    className: 'px-8 py-4 text-center', 
                                    hideOnMobile: true 
                                }
                            ]}
                            data={dailyStaffAttendance}
                            loading={loading}
                            emptyState={<div className="px-8 py-20"><EmptyState icon={Clock} title="Tidak Ada Jadwal" message="Belum ada jadwal mengajar atau scan QR di hari ini." /></div>}
                            mobileCardHeader={(row) => (
                                <div className="flex items-center gap-3 w-full">
                                    <div className={`p-2.5 rounded-xl bg-white shadow-sm border border-gray-100 shrink-0 ${
                                        row.status === 'Hadir' ? 'text-emerald-500' :
                                        row.status === 'Libur' ? 'text-purple-500' :
                                        row.status === 'Izin' ? 'text-amber-500' : 
                                        row.status === 'Belum Absen' ? 'text-gray-400' : 'text-red-500'
                                    }`}>
                                        {row.status === 'Hadir' ? <CheckCircle2 size={16} /> :
                                         row.status === 'Libur' ? <span className="text-sm">🏖️</span> :
                                         row.status === 'Izin' ? <ClipboardList size={16} /> : 
                                         row.status === 'Belum Absen' ? <Clock size={16} /> : <XCircle size={16} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div className="font-black text-gray-900 text-sm leading-tight truncate">
                                                {row.guru?.nama}
                                            </div>
                                            <span className={`font-black text-sm shrink-0 ml-2 ${
                                                row.status === 'Hadir' ? 'text-emerald-600' :
                                                row.status === 'Libur' ? 'text-purple-600' :
                                                row.status === 'Izin' ? 'text-amber-600' : 
                                                row.status === 'Belum Absen' ? 'text-gray-500' : 'text-red-600'
                                            }`}>
                                                {row.status}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex justify-between items-center mt-0.5">
                                            <span className="truncate">{row.guru?.email}</span>
                                            {row.waktu_scan && (
                                                <span className="text-gray-500 shrink-0 bg-gray-50 px-1.5 py-0.5 rounded ml-2 border border-gray-100">
                                                    {new Date(row.waktu_scan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            mobileCardContent={(row) => (
                                <div className="flex flex-col gap-2 w-full mt-2 pt-2 border-t border-gray-50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Jadwal</span>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant={row.tipe === 'QURANIYAH' ? 'info' : 'success'} className="px-2 py-0.5 rounded-lg font-black uppercase text-[8px] tracking-widest">
                                                {row.tipe}
                                            </Badge>
                                            <span className="text-[9px] font-black text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">Jam {row.jam_ke}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Grup / Lokasi</span>
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">
                                            {row.tipe === 'MADROSAH' 
                                                ? (kelasList.find(k => k.id === row.referensi_id)?.nama || 'Kelas')
                                                : (halaqohList.find(h => h.id === row.referensi_id)?.nama || 'Halaqoh')
                                            }
                                        </span>
                                    </div>
                                </div>
                            )}
                        />
                    </Card>
                </div>
            ) : isJurnal ? (
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
                                    className="w-full px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl border border-gray-100 focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none font-bold text-xs md:text-sm bg-gray-50/30 appearance-none cursor-pointer"
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
                        <ResponsiveTable
                            columns={[
                                { 
                                    header: 'Jadwal & Waktu', 
                                    render: (row) => (
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-fit uppercase tracking-tighter">
                                                Jam Ke-{row.jam_ke}
                                            </div>
                                            <div className="text-gray-900 font-black text-sm ml-1 uppercase">
                                                {row.jam_mulai.slice(0, 5)} — {row.jam_selesai.slice(0, 5)}
                                            </div>
                                        </div>
                                    ), 
                                    className: 'px-8 py-6 whitespace-nowrap', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Staf Pengajar', 
                                    render: (row) => <div className="font-black text-gray-900 text-sm group-hover:text-amber-600 transition-colors">{row.guru?.nama || '-'}</div>, 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Mata Pelajaran', 
                                    render: (row) => <span className="font-bold text-gray-600">{row.mapel?.nama || (row.tipe === 'HALAQOH' ? 'Halaqoh' : '-')}</span>, 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Grup', 
                                    render: (row) => (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/50 w-fit">
                                            {row.tipe === 'HALAQOH' ? <Users size={12} className="text-blue-500" /> : <BookOpen size={12} className="text-emerald-500" />}
                                            <span className="text-xs font-black text-gray-600 uppercase tracking-tighter">
                                                {row.tipe === 'HALAQOH' ? (row.halaqoh?.nama || 'Halaqoh') : (row.kelas?.nama || 'Kelas')}
                                            </span>
                                        </div>
                                    ), 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Status Log', 
                                    render: (row) => (
                                        row.jurnal ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest border border-emerald-100">
                                                <CheckCircle2 size={12} />
                                                Terisi
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 font-black text-[10px] uppercase tracking-widest border border-amber-100">
                                                <AlertTriangle size={12} />
                                                Kosong
                                            </div>
                                        )
                                    ), 
                                    className: 'px-8 py-6', 
                                    hideOnMobile: true 
                                },
                                { 
                                    header: 'Aksi', 
                                    render: (row) => (
                                        <button 
                                            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg w-full md:w-auto
                                                ${row.jurnal 
                                                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                                                    : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600'}
                                            `}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/absensi/agenda?jadwal_id=${row.id}&tanggal=${filterDate}`); }}
                                        >
                                            {row.jurnal ? 'Update Jurnal' : 'Input Absensi'}
                                        </button>
                                    ), 
                                    className: 'px-8 py-6 text-center', 
                                    hideOnMobile: false 
                                }
                            ]}
                            data={agendaList}
                            loading={loadingAgenda}
                            emptyState={<div className="px-8 py-20"><EmptyState icon={BookOpen} title="No Active Classes" message="Tidak ada jadwal mengajar terdaftar untuk kriteria ini." /></div>}
                            mobileCardHeader={(row) => (
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg w-fit uppercase tracking-tighter">
                                        Jam Ke-{row.jam_ke}
                                    </div>
                                    <div className="text-gray-900 font-black text-sm uppercase">
                                        {row.jam_mulai.slice(0, 5)} — {row.jam_selesai.slice(0, 5)}
                                    </div>
                                </div>
                            )}
                            mobileCardContent={(row) => (
                                <div className="flex flex-col gap-2 w-full mt-2 pt-2 border-t border-gray-50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Pengajar</span>
                                        <span className="font-black text-gray-900 text-sm leading-tight">{row.guru?.nama || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Mata Pelajaran</span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                            {row.mapel?.nama || (row.tipe === 'HALAQOH' ? 'Halaqoh' : '-')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Grup</span>
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                            {row.tipe === 'HALAQOH' ? <Users size={10} className="text-blue-500" /> : <BookOpen size={10} className="text-emerald-500" />}
                                            {row.tipe === 'HALAQOH' ? (row.halaqoh?.nama || 'Halaqoh') : (row.kelas?.nama || 'Kelas')}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Status</span>
                                        {row.jurnal ? (
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
                            )}
                            mobileCardPrimaryAction={(row) => (
                                <button 
                                    className={`w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all
                                        ${row.jurnal 
                                            ? 'bg-slate-100 text-slate-500 active:scale-95' 
                                            : 'bg-amber-500 text-white shadow-lg shadow-amber-200 active:scale-95'}
                                    `}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/absensi/agenda?jadwal_id=${row.id}&tanggal=${filterDate}`); }}
                                >
                                    {row.jurnal ? 'Update Jurnal' : 'Input Absensi'}
                                </button>
                            )}
                        />
                    </Card>
                </div>
            ) : isLaporan ? (
                <div className="space-y-8 animate-slide-up">
                    <Card variant="premium" className="p-6 md:p-8 space-y-6">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 md:gap-8">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight italic">Periodical Analysis</h3>
                                <p className="text-[10px] md:text-sm text-gray-400 font-bold uppercase tracking-widest">Rekapitulasi kehadiran lintas periode</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 md:p-3 bg-gray-100/50 rounded-[2rem] border border-gray-100">
                                <div 
                                    onClick={() => {
                                        if (startDateRef.current?.showPicker) {
                                            startDateRef.current.showPicker()
                                        } else {
                                            startDateRef.current?.focus()
                                        }
                                    }}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-300 transition-all flex-1 cursor-pointer"
                                >
                                    <Calendar size={18} className="text-emerald-500 shrink-0" />
                                    <input 
                                        ref={startDateRef}
                                        type="date" 
                                        value={filterStartDate} 
                                        onChange={(e) => setFilterStartDate(e.target.value)} 
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (e.target.showPicker) e.target.showPicker()
                                        }}
                                        className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-black text-gray-700 outline-none w-full cursor-pointer" 
                                    />
                                </div>
                                <div className="text-gray-400 font-black uppercase text-[10px] tracking-widest px-2 text-center">s/d</div>
                                <div 
                                    onClick={() => {
                                        if (endDateRef.current?.showPicker) {
                                            endDateRef.current.showPicker()
                                        } else {
                                            endDateRef.current?.focus()
                                        }
                                    }}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-emerald-300 transition-all flex-1 cursor-pointer"
                                >
                                    <Calendar size={18} className="text-emerald-500 shrink-0" />
                                    <input 
                                        ref={endDateRef}
                                        type="date" 
                                        value={filterEndDate} 
                                        onChange={(e) => setFilterEndDate(e.target.value)} 
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (e.target.showPicker) e.target.showPicker()
                                        }}
                                        className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-black text-gray-700 outline-none w-full cursor-pointer" 
                                    />
                                </div>
                            </div>
                        {laporanSubTab === 'santri' && (
                            <div className="flex items-start gap-3 p-4 bg-blue-50/80 border border-blue-100 rounded-2xl text-xs text-blue-700 font-bold">
                                <span className="text-blue-400 mt-0.5 shrink-0">ℹ️</span>
                                <span>
                                    Rekap ketidakhadiran santri (Sakit / Izin / Alpha / Pulang) diambil dari data yang telah disimpan oleh Guru &amp; Musyrif sesuai <b>semester yang dipilih</b> — identik dengan data di halaman <b>Input Perilaku &amp; Catatan</b>.
                                </span>
                            </div>
                        )}
                        </div>

                        {/* Kategori & Semester Filter Bar inside Laporan Card */}
                        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Preset Periode Semester</label>
                                <select 
                                    value={selectedSemesterId}
                                    onChange={(e) => handleSemesterChange(e.target.value)}
                                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl border border-emerald-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-xs bg-emerald-50/40 text-emerald-900 appearance-none cursor-pointer"
                                >
                                    <option value="">Rentang Kustom (Manual)</option>
                                    {semesterList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.nama} ({s.tahun_ajaran}) {s.is_active ? '— Semester Aktif' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kategori Absensi</label>
                                <select 
                                    value={filterType}
                                    onChange={(e) => {
                                        setFilterType(e.target.value)
                                        setFilterKelasId('')
                                        setFilterHalaqohId('')
                                    }}
                                    className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-xs bg-gray-50/30 appearance-none cursor-pointer"
                                >
                                    <option value="Semua">Semua Kategori (Madrosah & Qur'aniyah)</option>
                                    <option value="Madrosah">Madrosah (Kelas)</option>
                                    <option value="Quraniyah">Qur'aniyah (Halaqoh)</option>
                                </select>
                            </div>

                            {(filterType === 'Semua' || filterType === 'Madrosah') && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Filter Kelas</label>
                                    <select 
                                        value={filterKelasId}
                                        onChange={(e) => setFilterKelasId(e.target.value)}
                                        className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl border border-emerald-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-xs bg-emerald-50/40 text-emerald-900 appearance-none cursor-pointer"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {kelasList.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(filterType === 'Semua' || filterType === 'Quraniyah') && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Filter Halaqoh</label>
                                    <select 
                                        value={filterHalaqohId}
                                        onChange={(e) => setFilterHalaqohId(e.target.value)}
                                        className="w-full px-3 py-2 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl border border-blue-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-xs bg-blue-50/40 text-blue-900 appearance-none cursor-pointer"
                                    >
                                        <option value="">Semua Halaqoh</option>
                                        {halaqohList.map(h => (
                                            <option key={h.id} value={h.id}>{h.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                                 <ResponsiveTable
                                     columns={[
                                         { 
                                             header: 'Nama Pengajar', 
                                             render: (row) => (
                                                 <div className="flex items-center gap-4">
                                                     <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
                                                         {row.nama?.charAt(0)}
                                                     </div>
                                                     <div>
                                                         <div className="font-black text-gray-900">{row.nama}</div>
                                                         <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Staff Member</div>
                                                     </div>
                                                 </div>
                                             ), 
                                             className: 'px-8 py-6', 
                                             hideOnMobile: true 
                                         },
                                         { 
                                             header: 'Hadir', 
                                             render: (row) => <span className="font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100">{row.Hadir}</span>, 
                                             className: 'px-8 py-6 text-center text-emerald-600', 
                                             hideOnMobile: true 
                                         },
                                         { 
                                             header: 'Izin', 
                                             render: (row) => <span className="font-black text-amber-600 bg-amber-50 px-4 py-1.5 rounded-xl border border-amber-100">{row.Izin}</span>, 
                                             className: 'px-8 py-6 text-center text-amber-600', 
                                             hideOnMobile: true 
                                         },
                                         { 
                                             header: 'Libur', 
                                             render: (row) => <span className="font-black text-teal-700 bg-teal-50 px-4 py-1.5 rounded-xl border border-teal-200">{row.Libur || 0}</span>, 
                                             className: 'px-8 py-6 text-center text-teal-700', 
                                             hideOnMobile: true 
                                         },
                                         { 
                                             header: 'Alpha', 
                                             render: (row) => <span className="font-black text-red-600 bg-red-50 px-4 py-1.5 rounded-xl border border-red-100">{row.Alpha}</span>, 
                                             className: 'px-8 py-6 text-center text-red-600', 
                                             hideOnMobile: true 
                                         },
                                         { 
                                             header: 'Score', 
                                                 render: (row) => {
                                                     const total = row.totalSelesai || 0
                                                     const score = total > 0 ? Math.round(((row.Hadir + row.Izin) / total) * 100) : 0
                                                 return (
                                                     <div className="flex items-center justify-center gap-3">
                                                         <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                             <div className="h-full bg-indigo-500" style={{ width: `${score}%` }}></div>
                                                         </div>
                                                         <span className="text-xs font-black text-indigo-600">{score}%</span>
                                                     </div>
                                                 )
                                             }, 
                                             className: 'px-8 py-6 text-center', 
                                             hideOnMobile: true 
                                         },
                                         { 
                                             header: 'Details', 
                                             render: (row) => (
                                                 <button 
                                                     onClick={(e) => { e.stopPropagation(); setSelectedGuruId(row.id); }}
                                                     className="p-3 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-lg active:scale-95 w-full md:w-auto flex justify-center"
                                                 >
                                                     <Eye size={16} />
                                                 </button>
                                             ), 
                                             className: 'px-8 py-6 text-right', 
                                             hideOnMobile: false 
                                         }
                                     ]}
                                     data={aggregatedStaf}
                                     loading={false}
                                     emptyState={<div className="px-8 py-20 text-center text-gray-400 italic font-medium">Tidak ada data scan staf pada periode ini</div>}
                                     mobileCardHeader={(row) => (
                                         <div className="flex items-center gap-3 w-full">
                                             <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                                                 {row.nama?.charAt(0)}
                                             </div>
                                             <div className="flex-1">
                                                 <div className="font-black text-gray-900 text-sm leading-tight">{row.nama}</div>
                                                 <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Staff Member</div>
                                             </div>
                                         </div>
                                     )}
                                     mobileCardContent={(row) => {
                                         const total = row.totalSelesai || 0
                                         const score = total > 0 ? Math.round(((row.Hadir + row.Izin) / total) * 100) : 0
                                         return (
                                             <div className="flex flex-col gap-2 w-full mt-2 pt-2 border-t border-gray-50">
                                                 <div className="grid grid-cols-5 gap-1.5">
                                                     <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
                                                         <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Hadir</div>
                                                         <div className="text-xs sm:text-sm font-black text-emerald-600">{row.Hadir}</div>
                                                     </div>
                                                     <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 text-center">
                                                         <div className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">Izin</div>
                                                         <div className="text-xs sm:text-sm font-black text-amber-600">{row.Izin}</div>
                                                     </div>
                                                     <div className="bg-teal-50 p-2 rounded-xl border border-teal-200 text-center">
                                                         <div className="text-[8px] font-black text-teal-500 uppercase tracking-widest mb-1">Libur</div>
                                                         <div className="text-xs sm:text-sm font-black text-teal-700">{row.Libur || 0}</div>
                                                     </div>
                                                     <div className="bg-red-50 p-2 rounded-xl border border-red-100 text-center">
                                                         <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Alpha</div>
                                                         <div className="text-xs sm:text-sm font-black text-red-600">{row.Alpha}</div>
                                                     </div>
                                                     <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 text-center">
                                                         <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Score</div>
                                                         <div className="text-xs sm:text-sm font-black text-indigo-600">{score}%</div>
                                                     </div>
                                                 </div>
                                             </div>
                                         )
                                     }}
                                     mobileCardPrimaryAction={(row) => (
                                         <button 
                                             onClick={(e) => { e.stopPropagation(); setSelectedGuruId(row.id); }}
                                             className="w-full py-3 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-lg active:scale-95 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                         >
                                             <Eye size={14} /> Lihat Detail
                                         </button>
                                     )}
                                 />
                             </Card>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-slide-up">
                            {/* Stats Cards Row for Santri */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    { label: 'Hadir', status: 'hadir', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                                    { label: 'Terlambat', status: 'terlambat', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
                                    { label: 'Sakit', status: 'sakit', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
                                    { label: 'Izin', status: 'izin', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                                    { label: 'Alpha', status: 'alpha', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
                                    { label: 'Pulang', status: 'pulang', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
                                ].map(stat => {
                                    const count = aggregatedSantri.reduce((sum, item) => {
                                        if (stat.status === 'hadir') return sum + (item.Hadir || 0)
                                        if (stat.status === 'terlambat') return sum + (item.Terlambat || 0)
                                        if (stat.status === 'sakit') return sum + (item.Sakit || 0)
                                        if (stat.status === 'izin') return sum + (item.Izin || 0)
                                        if (stat.status === 'alpha') return sum + (item.Alpha || 0)
                                        if (stat.status === 'pulang') return sum + (item.Pulang || 0)
                                        return sum
                                    }, 0)
                                    return (
                                        <div key={stat.status} className={`${stat.bg} p-5 rounded-[2rem] border border-white shadow-sm flex flex-col items-center justify-center gap-1.5 group hover:translate-y-[-4px] transition-all duration-300`}>
                                            <div className={`w-2 h-2 rounded-full ${stat.color} animate-pulse`}></div>
                                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{count}</div>
                                            <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${stat.text}`}>{stat.label}</div>
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
                                                ? Math.round((filteredPresensi.filter(p => ['hadir', 'terlambat', 'telat'].includes((p.status || '').toLowerCase())).length / filteredPresensi.length) * 100) 
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
                                     <ResponsiveTable
                                         columns={[
                                             { 
                                                 header: 'Student Profil', 
                                                 render: (row) => (
                                                     <>
                                                         <div className="font-black text-gray-900 group-hover:text-emerald-600 transition-colors">{row.nama}</div>
                                                         <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{row.nis}</div>
                                                     </>
                                                 ), 
                                                 className: 'px-6 py-6', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Kategori & Grup', 
                                                 render: (row) => (
                                                     <div className="flex items-center gap-2">
                                                         <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                                             row.isQuraniyah 
                                                                 ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                                                 : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                         }`}>
                                                             {row.isQuraniyah ? <Users size={12} /> : <BookOpen size={12} />}
                                                             {row.kategoriLabel}: {row.grup || '-'}
                                                         </span>
                                                     </div>
                                                 ), 
                                                 className: 'px-6 py-6', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Hadir', 
                                                 render: (row) => (
                                                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl font-black text-xs ${row.Hadir > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-300'}`}>
                                                         {row.Hadir}
                                                     </span>
                                                 ), 
                                                 className: 'px-4 py-6 text-center text-emerald-600', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Terlambat', 
                                                 render: (row) => (
                                                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl font-black text-xs ${row.Terlambat > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-50 text-gray-300'}`}>
                                                         {row.Terlambat}
                                                     </span>
                                                 ), 
                                                 className: 'px-4 py-6 text-center text-orange-600', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Sakit', 
                                                 render: (row) => (
                                                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl font-black text-xs ${row.Sakit > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-300'}`}>
                                                         {row.Sakit}
                                                     </span>
                                                 ), 
                                                 className: 'px-4 py-6 text-center text-amber-600', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Izin', 
                                                 render: (row) => (
                                                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl font-black text-xs ${row.Izin > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-300'}`}>
                                                         {row.Izin}
                                                     </span>
                                                 ), 
                                                 className: 'px-4 py-6 text-center text-blue-600', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Alpha', 
                                                 render: (row) => (
                                                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl font-black text-xs ${row.Alpha > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-300'}`}>
                                                         {row.Alpha}
                                                     </span>
                                                 ), 
                                                 className: 'px-4 py-6 text-center text-red-600', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Pulang', 
                                                 render: (row) => (
                                                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl font-black text-xs ${row.Pulang > 0 ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-gray-50 text-gray-300'}`}>
                                                         {row.Pulang || 0}
                                                     </span>
                                                 ), 
                                                 className: 'px-4 py-6 text-center text-purple-600', 
                                                 hideOnMobile: true 
                                             },
                                             { 
                                                 header: 'Action', 
                                                 render: (row) => (
                                                     <button 
                                                         onClick={(e) => { e.stopPropagation(); setSelectedSantriId(row.id); }}
                                                         className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 transition-all shadow-lg active:scale-95 w-full md:w-auto flex justify-center"
                                                     >
                                                         <Eye size={16} />
                                                     </button>
                                                 ), 
                                                 className: 'px-6 py-6 text-right', 
                                                 hideOnMobile: false 
                                             }
                                         ]}
                                         data={aggregatedSantri}
                                         keyField="key"
                                         loading={false}
                                         emptyState={<div className="px-8 py-20 text-center text-gray-400 italic font-medium">No record found for selected period</div>}
                                         mobileCardHeader={(row) => (
                                             <div className="flex-1 w-full">
                                                 <div className="font-black text-gray-900 text-sm leading-tight">{row.nama}</div>
                                                 <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{row.nis}</div>
                                                 <div className="mt-2">
                                                     <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${
                                                         row.isQuraniyah ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                     }`}>
                                                         {row.kategoriLabel}: {row.grup || '-'}
                                                     </span>
                                                 </div>
                                             </div>
                                         )}
                                         mobileCardContent={(row) => (
                                             <div className="flex flex-col gap-2 w-full mt-4 pt-4 border-t border-gray-50">
                                                 <div className="grid grid-cols-5 gap-1.5">
                                                     <div className={`${row.Hadir > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'} p-1.5 rounded-xl border text-center`}>
                                                         <div className={`text-[8px] font-black ${row.Hadir > 0 ? 'text-emerald-400' : 'text-gray-300'} uppercase tracking-widest mb-0.5`}>H</div>
                                                         <div className={`text-xs font-black ${row.Hadir > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{row.Hadir}</div>
                                                     </div>
                                                     <div className={`${row.Terlambat > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'} p-1.5 rounded-xl border text-center`}>
                                                         <div className={`text-[8px] font-black ${row.Terlambat > 0 ? 'text-orange-400' : 'text-gray-300'} uppercase tracking-widest mb-0.5`}>T</div>
                                                         <div className={`text-xs font-black ${row.Terlambat > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{row.Terlambat}</div>
                                                     </div>
                                                     <div className={`${row.Sakit > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'} p-1.5 rounded-xl border text-center`}>
                                                         <div className={`text-[8px] font-black ${row.Sakit > 0 ? 'text-amber-400' : 'text-gray-300'} uppercase tracking-widest mb-0.5`}>S</div>
                                                         <div className={`text-xs font-black ${row.Sakit > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{row.Sakit}</div>
                                                     </div>
                                                     <div className={`${row.Izin > 0 ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'} p-1.5 rounded-xl border text-center`}>
                                                         <div className={`text-[8px] font-black ${row.Izin > 0 ? 'text-blue-400' : 'text-gray-300'} uppercase tracking-widest mb-0.5`}>I</div>
                                                         <div className={`text-xs font-black ${row.Izin > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{row.Izin}</div>
                                                     </div>
                                                     <div className={`${row.Alpha > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} p-1.5 rounded-xl border text-center`}>
                                                         <div className={`text-[8px] font-black ${row.Alpha > 0 ? 'text-red-400' : 'text-gray-300'} uppercase tracking-widest mb-0.5`}>A</div>
                                                         <div className={`text-xs font-black ${row.Alpha > 0 ? 'text-red-600' : 'text-gray-300'}`}>{row.Alpha}</div>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}
                                         mobileCardPrimaryAction={(row) => (
                                             <button 
                                                 onClick={(e) => { e.stopPropagation(); setSelectedSantriId(row.id); }}
                                                 className="w-full py-3 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 transition-all shadow-lg active:scale-95 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                             >
                                                 <Eye size={14} /> Lihat Detail
                                             </button>
                                         )}
                                     />
                                 </Card>
                            </div>
                        </div>
                    )}
                </div>

            ) : isQr ? (
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
            ) : null}

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
                                        .slice()
                                        .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || Number(b.jam_ke || 0) - Number(a.jam_ke || 0))
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
                                                            {p.keterangan && (
                                                                <span className="hidden sm:inline-block text-[10px] text-teal-700 font-bold bg-teal-50/80 px-2.5 py-0.5 rounded-lg border border-teal-200 max-w-[220px] truncate" title={p.keterangan}>
                                                                    {p.keterangan}
                                                                </span>
                                                            )}
                                                            <Badge 
                                                                variant={
                                                                    p.status === 'Hadir' ? 'success' : 
                                                                    p.status === 'Sakit' ? 'warning' : 
                                                                    p.status === 'Izin' ? 'info' : 
                                                                    p.status === 'Dinas' ? 'primary' : 
                                                                    p.status === 'Libur' ? 'neutral' :
                                                                    p.status === 'Belum Absen' ? 'neutral' : 'danger'
                                                                } 
                                                                className={
                                                                    p.status === 'Libur'
                                                                        ? "px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-teal-50 text-teal-700 border border-teal-200"
                                                                        : "px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                                                                }
                                                            >
                                                                {p.status}
                                                            </Badge>
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingSession(p)
                                                                    setManualStatus(p.status === 'Alpha' || p.status === 'Belum Absen' ? 'Hadir' : p.status)
                                                                    setManualKeterangan('')
                                                                }}
                                                                className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                                                                title="Ubah Status Kehadiran / Aksi"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                    {/* Manual Adjustment Modal (Portal) */}
                    {editingSession && createPortal(
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditingSession(null)}></div>
                            <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                                <div className="bg-indigo-600 p-6 text-white text-center">
                                    <h3 className="text-xl font-black">Ubah Status Kehadiran</h3>
                                    <p className="text-xs text-indigo-100 mt-1 uppercase tracking-widest font-bold">
                                        {new Date(editingSession.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} • Jam Ke-{editingSession.jam_ke}
                                    </p>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ubah Status Menjadi</label>
                                            <select 
                                                value={manualStatus}
                                                onChange={(e) => setManualStatus(e.target.value)}
                                                className="w-full rounded-2xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm p-4 bg-gray-50 transition-all font-bold text-indigo-700 outline-none"
                                            >
                                                <option value="Hadir">Hadir (Manual)</option>
                                                <option value="Sakit">Sakit</option>
                                                <option value="Izin">Izin</option>
                                                <option value="Dinas">Dinas</option>
                                                <option value="Alpha">Alpha / Reset (Hapus Penyesuaian)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan / Alasan (Opsional)</label>
                                            <textarea 
                                                value={manualKeterangan}
                                                onChange={(e) => setManualKeterangan(e.target.value)}
                                                placeholder={manualStatus === 'Hadir' ? "Opsional: Lupa scan, HP tertinggal..." : manualStatus === 'Alpha' ? "Reset penyesuaian..." : "Alasan izin/sakit..."}
                                                className="w-full rounded-2xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[100px] p-4 bg-gray-50 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => { setEditingSession(null); setManualStatus('Hadir'); setManualKeterangan(''); }}
                                            className="flex-1 px-6 py-3.5 rounded-2xl border border-gray-100 font-black text-xs text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-widest"
                                        >
                                            Batal
                                        </button>
                                        <button 
                                            disabled={isSavingManual}
                                            onClick={handleSaveManualStatus}
                                            className="flex-1 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all uppercase tracking-widest active:scale-95 cursor-pointer disabled:opacity-50"
                                        >
                                            {isSavingManual ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Holiday Modal (Portal) */}
                    {showHolidayModal && createPortal(
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowHolidayModal(false)}></div>
                            <div className="relative bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up my-auto max-h-[90vh] flex flex-col">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 text-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">
                                            🏖️
                                        </div>
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-black">Pengaturan Hari Libur Absensi</h3>
                                            <p className="text-xs text-emerald-100/80 font-medium">
                                                Jadwalkan rentang libur & sesuaikan cakupan (Semua, Madrasah, atau Halaqoh)
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowHolidayModal(false)}
                                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Body with scroll */}
                                <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                                    {/* Form Tambah Libur */}
                                    <form onSubmit={handleSaveHoliday} className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                                            <Sparkles size={16} className="text-emerald-600" />
                                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                                Tambah Agenda Libur Baru
                                            </h4>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                                Nama Agenda / Judul Libur <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={holidayForm.judul}
                                                onChange={(e) => setHolidayForm(prev => ({ ...prev, judul: e.target.value }))}
                                                placeholder="Contoh: Libur Awal Ramadhan 1448 H / Libur Maulid"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm font-bold bg-white outline-none"
                                            />
                                        </div>

                                        {/* Rentang Tanggal */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                                    Tanggal Mulai <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={holidayForm.tanggal_mulai}
                                                    onChange={(e) => setHolidayForm(prev => ({ ...prev, tanggal_mulai: e.target.value }))}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs font-bold bg-white outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                                    Tanggal Selesai <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={holidayForm.tanggal_selesai}
                                                    onChange={(e) => setHolidayForm(prev => ({ ...prev, tanggal_selesai: e.target.value }))}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs font-bold bg-white outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Cakupan Libur (Pills) */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                                Cakupan Libur <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { id: 'Semua', label: 'Semua (Total)', desc: 'Madrasah & Halaqoh' },
                                                    { id: 'Madrosah', label: 'Hanya Madrasah', desc: 'Halaqoh tetap aktif' },
                                                    { id: 'Quraniyah', label: 'Hanya Halaqoh', desc: 'Madrasah tetap aktif' }
                                                ].map(sc => (
                                                    <button
                                                        key={sc.id}
                                                        type="button"
                                                        onClick={() => setHolidayForm(prev => ({ ...prev, cakupan: sc.id }))}
                                                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                                            holidayForm.cakupan === sc.id
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        <div className="text-xs font-black leading-tight">{sc.label}</div>
                                                        <div className={`text-[9px] mt-0.5 leading-tight ${holidayForm.cakupan === sc.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                                                            {sc.desc}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Keterangan */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                                Keterangan Tambahan (Opsional)
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={holidayForm.deskripsi}
                                                onChange={(e) => setHolidayForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                                                placeholder="Contoh: Berdasarkan surat edaran pimpinan pondok..."
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-xs bg-white outline-none"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSavingHoliday}
                                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isSavingHoliday ? 'Menyimpan Libur...' : '💾 Simpan Hari Libur'}
                                        </button>
                                    </form>

                                    {/* List Hari Libur Terdaftar */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                                Daftar Hari Libur Terdaftar ({holidayList.length})
                                            </h4>
                                        </div>

                                        {holidayList.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                Belum ada agenda libur terdaftar di kalender akademik.
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                {holidayList.map((h) => {
                                                    const scope = parseHolidayScope(h)
                                                    const isRange = h.tanggal_mulai !== h.tanggal_selesai
                                                    return (
                                                        <div key={h.id} className="p-3.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-3 hover:border-gray-300 transition-all shadow-sm">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-xs text-gray-900">{h.judul}</span>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                                                        scope === 'Semua' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                        scope === 'Madrosah' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                                    }`}>
                                                                        {scope}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                                                                    <Calendar size={12} className="text-emerald-500" />
                                                                    <span>
                                                                        {new Date(h.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                        {isRange && ` s/d ${new Date(h.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (window.confirm(`Hapus libur "${h.judul}"?`)) {
                                                                        handleDeleteHoliday(h.id)
                                                                    }
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                                title="Hapus Libur"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
        </div>
    )
}

export default AdminAbsensiPage
