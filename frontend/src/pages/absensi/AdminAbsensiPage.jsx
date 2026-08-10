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
    ClipboardList
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

    const activeTab = searchParams.get('tab') || 'rekap'
    const setActiveTab = (tab) => setSearchParams({ tab })

    const hasAccess = isAdmin() || isAdminAbsensi()
    const [presensiStaf, setPresensiStaf] = useState([])
    const [izinGuruList, setIzinGuruList] = useState([])
    const [loading, setLoading] = useState(false)
    const [presensiData, setPresensiData] = useState([])
    
    // Filters
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
    
    // Default to start of month for reports
    const getStartOfMonth = () => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    }
    const [filterStartDate, setFilterStartDate] = useState(getStartOfMonth())
    const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedSantriId, setSelectedSantriId] = useState(null)
    const [selectedGuruId, setSelectedGuruId] = useState(null)
    const [editingSession, setEditingSession] = useState(null)
    const [manualKeterangan, setManualKeterangan] = useState('')
    const [manualStatus, setManualStatus] = useState('Hadir')
    const [allJadwal, setAllJadwal] = useState([])
    const [filterType, setFilterType] = useState('Semua') // 'Semua', 'Madrosah', 'Quraniyah'
    const [filterKelasId, setFilterKelasId] = useState('')
    const [filterHalaqohId, setFilterHalaqohId] = useState('')
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
            tableHeaders = [["No", "Nama Pengajar", "Email", "Hadir", "Izin", "Alpha", "Score Kehadiran (%)"]];
            tableRows = aggregatedStaf.map((item, index) => {
                const total = item.Hadir + item.Izin + item.Alpha;
                const score = total > 0 ? Math.round(((item.Hadir + item.Izin) / total) * 100) : 0;
                return [
                    index + 1,
                    item.nama,
                    item.email || '-',
                    item.Hadir,
                    item.Izin,
                    item.Alpha,
                    `${score}%`
                ];
            });
            columnStyles = {
                0: { cellWidth: 10, halign: 'center' },
                1: { fontStyle: 'bold' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 15, halign: 'center' },
                6: { cellWidth: 35, halign: 'center' }
            };
        } else {
            tableHeaders = [["No", "Nama Santri", "NIS", "Kategori", "Kelas / Halaqoh", "Hadir", "Terlambat", "Sakit", "Izin", "Alpha"]];
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
                item.Alpha
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
                9: { cellWidth: 12, halign: 'center' }
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
                "Alpha": item.Alpha
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
                { wch: 10 }   // Alpha
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
        const [jadwalRes, halaqohRes, guruRes, musyrifHalaqohRes] = await Promise.all([
            supabase.from('jadwal_pelajaran').select('*'),
            supabase.from('halaqoh').select('id, musyrif_id'),
            supabase.from('guru').select('id, status'),
            supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id')
        ])
        
        const rawJadwal = jadwalRes.data || []
        const halaqohMap = (halaqohRes.data || []).reduce((acc, h) => ({...acc, [h.id]: h}), {})
        const guruMap = (guruRes.data || []).reduce((acc, g) => ({...acc, [g.id]: g}), {})
        const mhData = musyrifHalaqohRes.data || []
        
        const halaqohToMusyrifs = {}
        mhData.forEach(mh => {
            if (!halaqohToMusyrifs[mh.halaqoh_id]) halaqohToMusyrifs[mh.halaqoh_id] = []
            halaqohToMusyrifs[mh.halaqoh_id].push(mh.user_id)
        })
        
        const fixedJadwal = []
        
        rawJadwal.forEach(j => {
            if (j.tipe === 'HALAQOH' && j.referensi_id) {
                const musyrifs = halaqohToMusyrifs[j.referensi_id] || []
                
                if (musyrifs.length > 0) {
                    musyrifs.forEach(uid => {
                        const guruData = guruMap[uid]
                        if (guruData && guruData.status === 'Aktif') {
                            fixedJadwal.push({ ...j, guru_id: uid })
                        }
                    })
                } else {
                    const h = halaqohMap[j.referensi_id]
                    if (h && h.musyrif_id) {
                        const guruData = guruMap[h.musyrif_id]
                        if (guruData && guruData.status === 'Aktif') {
                            fixedJadwal.push({ ...j, guru_id: h.musyrif_id })
                        }
                    } else {
                        fixedJadwal.push({ ...j, guru_id: null })
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
                fixedJadwal.push({ ...j, guru_id: resolvedGuruId })
            }
        })
        
        setAllJadwal(fixedJadwal)
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
    }, [activeTab, filterDate, filterStartDate, filterEndDate, filterType, filterKelasId, filterHalaqohId])

    const fetchPresensiStaf = async () => {
        if (activeTab === 'laporan') {
            if (!filterStartDate || !filterEndDate) return
            if (filterStartDate > filterEndDate) return
        } else {
            if (!filterDate) return
        }

        setLoading(true)
        try {
            let query = supabase
                .from('presensi_staf')
                .select('*, guru:guru!staf_id(nama, email)')
            
            let queryIzin = supabase
                .from('izin_guru')
                .select('*')
                .eq('status', 'Disetujui')

            if (activeTab === 'laporan') {
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

            if (resPresensi.error) throw resPresensi.error
            if (resIzin.error) throw resIzin.error

            setPresensiStaf(resPresensi.data || [])
            setIzinGuruList(resIzin.data || [])
        } catch (err) {
            console.error('Error fetching presensi staf:', err)
            // If table doesn't exist, we don't want to break the whole page
            setPresensiStaf([])
            setIzinGuruList([])
        } finally {
            setLoading(false)
        }
    }

    const handleSaveManualStatus = async () => {
        if (!editingSession || !manualKeterangan) return

        try {
            if (manualStatus === 'Hadir') {
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
            } else {
                const { error } = await supabase
                    .from('izin_guru')
                    .insert({
                        guru_id: selectedGuruId,
                        tanggal_mulai: editingSession.tanggal,
                        tanggal_selesai: editingSession.tanggal,
                        jenis_izin: manualStatus,
                        keterangan: manualKeterangan,
                        status: 'Disetujui',
                        catatan_admin: 'Diinput manual oleh Admin dari Rincian Kehadiran'
                    })

                if (error) throw error
            }

            showToast.success(`Status berhasil diubah menjadi ${manualStatus}`)
            setEditingSession(null)
            setManualKeterangan('')
            setManualStatus('Hadir')
            fetchPresensiStaf()
            fetchData() // Refresh jadwal/izin juga
        } catch (err) {
            console.error('Error manual adjustment:', err)
            showToast.error('Gagal mengubah status')
        }
    }

    const fetchPresensi = async () => {
        const isRange = activeTab === 'laporan'
        if (isRange) {
            if (!filterStartDate || !filterEndDate) return
            if (filterStartDate > filterEndDate) return
        } else {
            if (!filterDate) return
        }

        setLoading(true)
        try {
            let query = supabase
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

    // 1. Filter data mentah menjadi data yang siap ditampilkan di Rekap & Laporan
    const filteredPresensi = React.useMemo(() => {
        return presensiData.filter(p => {
            const isQuraniyah = p.keterangan?.includes('[Quraniyah]') || (p.santri?.halaqoh && !p.santri?.kelas)
            const matchesType = 
                filterType === 'Semua' || 
                (filterType === 'Madrosah' && !isQuraniyah) || 
                (filterType === 'Quraniyah' && isQuraniyah)
            
            if (!matchesType) return false

            if (filterType === 'Madrosah' && filterKelasId) {
                const sKelasId = p.santri?.kelas_id || p.santri?.kelas?.id
                if (sKelasId !== filterKelasId) return false
            }

            if (filterType === 'Quraniyah' && filterHalaqohId) {
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

    // 2. Agregasi data dari filteredPresensi untuk Laporan
    const aggregatedSantri = React.useMemo(() => {
        const map = {}
        filteredPresensi.forEach(p => {
            const isQuraniyah = p.keterangan?.includes('[Quraniyah]') || (p.santri?.halaqoh && !p.santri?.kelas)
            const key = filterType === 'Semua' 
                ? `${p.santri_id}_${isQuraniyah ? 'quraniyah' : 'madrosah'}`
                : p.santri_id

            if (!map[key]) {
                map[key] = {
                    id: p.santri_id,
                    key,
                    nama: p.santri?.nama,
                    nis: p.santri?.nis,
                    isQuraniyah,
                    grup: isQuraniyah ? (p.santri?.halaqoh?.nama || 'Halaqoh') : (p.santri?.kelas?.nama || 'Kelas'),
                    kategoriLabel: isQuraniyah ? "Qur'aniyah (Halaqoh)" : "Madrosah (Kelas)",
                    Hadir: 0,
                    Terlambat: 0,
                    Sakit: 0,
                    Izin: 0,
                    Alpha: 0
                }
            }
            // Logika Case-Insensitive untuk status (Aman terhadap HADIR, Hadir, terlambat, telat, alpha, alpa, dll)
            const s = (p.status || '').toLowerCase()
            if (s === 'hadir') map[key].Hadir++
            else if (s === 'terlambat' || s === 'telat') map[key].Terlambat++
            else if (s === 'sakit') map[key].Sakit++
            else if (s === 'izin' || s === 'pulang') map[key].Izin++
            else if (['alpha', 'alpa', 'alfa'].includes(s)) map[key].Alpha++
        })
        return Object.values(map)
    }, [filteredPresensi, filterType])

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
        const allGuruIds = [...new Set(relevantJadwal.map(j => j.guru_id))]
        allGuruIds.forEach(gid => {
            const guru = guruList.find(g => g.id === gid)
            stafSummary[gid] = {
                id: gid,
                nama: guru?.nama || 'Unknown',
                email: guru?.email || '-',
                Hadir: 0,
                Izin: 0,
                Alpha: 0,
                BelumAbsen: 0,
                totalSelesai: 0,
                details: []
            }
        })

        // 3. Iterasi setiap hari dan bandingkan dengan jadwal
        dates.forEach(date => {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
            const dayName = dayMap[date.getDay()]

            const jadwalHariIni = relevantJadwal.filter(j => j.hari === dayName)
            
            jadwalHariIni.forEach(j => {
                if (!stafSummary[j.guru_id]) return

                // Cek apakah ada scan untuk jadwal ini
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
                    stafSummary[j.guru_id].totalSelesai++
                    stafSummary[j.guru_id].details.push({
                        tanggal: dateStr,
                        jam_ke: j.jam_ke,
                        tipe: j.tipe,
                        referensi_id: j.referensi_id,
                        status: 'Hadir'
                    })
                } else {
                    // Jika tidak scan, cek izin
                    const hasIzin = izinGuruList.some(izin => {
                        return izin.guru_id === j.guru_id && 
                               izin.tanggal_mulai <= dateStr && 
                               izin.tanggal_selesai >= dateStr
                    })

                    if (hasIzin) {
                        stafSummary[j.guru_id].Izin++
                        stafSummary[j.guru_id].totalSelesai++
                        stafSummary[j.guru_id].details.push({
                            tanggal: dateStr,
                            jam_ke: j.jam_ke,
                            tipe: j.tipe,
                            referensi_id: j.referensi_id,
                            status: 'Izin'
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
    }, [presensiStaf, allJadwal, filterStartDate, filterEndDate, guruList, izinGuruList, filterType])

    // Logika untuk Kehadiran Staf Harian (Daftar seluruh jadwal hari ini + status kehadirannya)
    const dailyStaffAttendance = React.useMemo(() => {
        if (!allJadwal.length) return []
        
        const dateObj = new Date(filterDate)
        const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        const dayName = dayMap[dateObj.getDay()]
        
        // 1. Ambil jadwal hari ini
        const jadwalHariIni = allJadwal.filter(j => j.hari === dayName).map(j => {
            const guru = guruList.find(g => g.id === j.guru_id)
            
            // Cari scan yang cocok
            const scan = presensiStaf.find(p => {
                const isSameGuru = p.staf_id === j.guru_id
                if (!isSameGuru) return false
                if (Number(p.jam_ke) === Number(j.jam_ke)) return true
                if (p.waktu_scan && j.jam_mulai && j.jam_selesai) {
                    const scanTime = new Date(p.waktu_scan)
                    const scanMinutes = scanTime.getHours() * 60 + scanTime.getMinutes()
                    const [hM, mM] = j.jam_mulai.split(':').map(Number)
                    const [hS, mS] = j.jam_selesai.split(':').map(Number)
                    return scanMinutes >= (hM * 60 + mM - 30) && scanMinutes <= (hS * 60 + mS + 30)
                }
                return false
            })

            // Cek Izin
            const isIzin = izinGuruList.some(izin => izin.guru_id === j.guru_id)

            let status = 'Belum Absen'
            if (scan) {
                status = 'Hadir'
            } else if (isIzin) {
                status = 'Izin'
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
                referensi_id: j.referensi_id,
                waktu_scan: scan ? scan.waktu_scan : null,
                jam_ke: j.jam_ke,
                jam_mulai: j.jam_mulai,
                jam_selesai: j.jam_selesai,
                status
            }
        })

        // 2. Tambahkan jika ada scan yang diluar jadwal reguler (misal: guru pengganti/badal)
        const presensiLuarJadwal = presensiStaf.filter(p => !jadwalHariIni.some(j => j.guru?.id === p.staf_id && j.jam_ke === p.jam_ke)).map(p => {
            return {
                id: p.id,
                guru: p.guru || { nama: 'Unknown', email: '-' },
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
    }, [allJadwal, filterDate, guruList, presensiStaf, izinGuruList])

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
                    <div className="flex gap-2">
                        {activeTab === 'laporan' && (
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
                                    onChange={(e) => {
                                        setFilterType(e.target.value)
                                        setFilterKelasId('')
                                        setFilterHalaqohId('')
                                    }}
                                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm bg-gray-50/30 appearance-none"
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
                                        className="w-full px-4 py-3.5 rounded-2xl border border-emerald-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm bg-emerald-50/30 text-emerald-900 appearance-none"
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
                                        className="w-full px-4 py-3.5 rounded-2xl border border-blue-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-sm bg-blue-50/30 text-blue-900 appearance-none"
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
                                        } else if (row.status === 'Izin') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 font-black text-[10px] uppercase tracking-widest border border-amber-100 shadow-sm shadow-amber-100/50">
                                                    <ClipboardList size={12} />
                                                    Izin
                                                </div>
                                            )
                                        } else if (row.status === 'Belum Absen') {
                                            return (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-500 font-black text-[10px] uppercase tracking-widest border border-gray-200 shadow-sm shadow-gray-100/50">
                                                    <Clock size={12} />
                                                    Belum Absen
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
                                        row.status === 'Izin' ? 'text-amber-500' : 
                                        row.status === 'Belum Absen' ? 'text-gray-400' : 'text-red-500'
                                    }`}>
                                        {row.status === 'Hadir' ? <CheckCircle2 size={16} /> :
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
            ) : activeTab === 'laporan' ? (
                <div className="space-y-8 animate-slide-up">
                    <Card variant="premium" className="p-6 md:p-8 space-y-6">
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

                        {/* Kategori Filter Bar inside Laporan Card */}
                        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kategori Absensi</label>
                                <select 
                                    value={filterType}
                                    onChange={(e) => {
                                        setFilterType(e.target.value)
                                        setFilterKelasId('')
                                        setFilterHalaqohId('')
                                    }}
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-xs bg-gray-50/30 appearance-none"
                                >
                                    <option value="Semua">Semua Kategori (Madrosah & Qur'aniyah)</option>
                                    <option value="Madrosah">Madrosah (Kelas)</option>
                                    <option value="Quraniyah">Qur'aniyah (Halaqoh)</option>
                                </select>
                            </div>

                            {filterType === 'Madrosah' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Filter Kelas</label>
                                    <select 
                                        value={filterKelasId}
                                        onChange={(e) => setFilterKelasId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-emerald-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-xs bg-emerald-50/40 text-emerald-900 appearance-none"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {kelasList.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {filterType === 'Quraniyah' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Filter Halaqoh</label>
                                    <select 
                                        value={filterHalaqohId}
                                        onChange={(e) => setFilterHalaqohId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-blue-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-xs bg-blue-50/40 text-blue-900 appearance-none"
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
                                                 <div className="grid grid-cols-4 gap-2">
                                                     <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
                                                         <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Hadir</div>
                                                         <div className="text-sm font-black text-emerald-600">{row.Hadir}</div>
                                                     </div>
                                                     <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 text-center">
                                                         <div className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">Izin</div>
                                                         <div className="text-sm font-black text-amber-600">{row.Izin}</div>
                                                     </div>
                                                     <div className="bg-red-50 p-2 rounded-xl border border-red-100 text-center">
                                                         <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Alpha</div>
                                                         <div className="text-sm font-black text-red-600">{row.Alpha}</div>
                                                     </div>
                                                     <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 text-center">
                                                         <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Score</div>
                                                         <div className="text-sm font-black text-indigo-600">{score}%</div>
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
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {[
                                    { label: 'Hadir', status: 'hadir', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                                    { label: 'Terlambat', status: 'terlambat', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
                                    { label: 'Sakit', status: 'sakit', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
                                    { label: 'Izin', status: 'izin', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                                    { label: 'Alpha', status: 'alpha', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
                                ].map(stat => {
                                    const count = filteredPresensi.filter(p => {
                                        const s = (p.status || '').toLowerCase()
                                        return s === stat.status || (stat.status === 'alpha' && ['alpa', 'alfa'].includes(s)) || (stat.status === 'terlambat' && ['terlambat', 'telat'].includes(s))
                                    }).length
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
                                                                    title="Ubah Status Kehadiran"
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
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan / Alasan</label>
                                            <textarea 
                                                value={manualKeterangan}
                                                onChange={(e) => setManualKeterangan(e.target.value)}
                                                placeholder={manualStatus === 'Hadir' ? "Contoh: Lupa scan, HP tertinggal..." : "Alasan izin/sakit..."}
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
                                            onClick={handleSaveManualStatus}
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
