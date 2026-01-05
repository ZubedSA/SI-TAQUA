
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, RefreshCw, FileText, BarChart3, CheckCircle, Clock, AlertCircle, Filter, Calendar, MessageCircle, Trophy, Save, Printer, Download, MoreVertical, Send, Eye, EyeOff } from 'lucide-react'
import DeleteConfirmationModal from '../../../../components/ui/DeleteConfirmationModal'
import { supabase } from '../../../../lib/supabase'
import { logDelete } from '../../../../lib/auditLog'
import MobileActionMenu from '../../../../components/ui/MobileActionMenu'
import DownloadButton from '../../../../components/ui/DownloadButton'
import PageHeader from '../../../../components/layout/PageHeader'
import Badge from '../../../../components/ui/Badge'
import Spinner from '../../../../components/ui/Spinner'
import EmptyState from '../../../../components/ui/EmptyState'
import { exportToExcel, exportToCSV } from '../../../../utils/exportUtils'
import { generateLaporanPDF } from '../../../../utils/pdfGenerator'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'
import DateRangePicker from '../../../../components/ui/DateRangePicker'
import { useCalendar } from '../../../../context/CalendarContext'


const HafalanList = () => {
    const { mode } = useCalendar()
    // Read initial tab from URL param
    const [searchParams] = useSearchParams()
    const initialTab = searchParams.get('tab') || 'list'

    // AUTO-FILTER: Halaqoh berdasarkan akun
    const {
        halaqohIds,
        halaqohNames,
        halaqohList,
        musyrifInfo,
        isLoading: loadingHalaqoh,
        hasHalaqoh,
        isAdmin,
        selectedHalaqohId,
        setSelectedHalaqohId
    } = useUserHalaqoh()

    const [hafalan, setHafalan] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedHafalan, setSelectedHafalan] = useState(null)
    const [activeTab, setActiveTab] = useState(initialTab) // 'list' or 'rekap'
    const [activeFilter, setActiveFilter] = useState('Semua')
    const [stats, setStats] = useState({ total: 0, lancar: 0, sedang: 0, lemah: 0, bacaNazhor: 0 })

    // Date filter for Input Hafalan tab
    const [dateFilter, setDateFilter] = useState({ dari: '', sampai: '' })

    // Rekap filters
    // halaqohList is now from hook
    const [rekapFilters, setRekapFilters] = useState({
        tanggalMulai: '',
        tanggalSelesai: '',
        halaqoh_id: '',
        santri_nama: ''
    })
    const [rekapData, setRekapData] = useState([])
    const [rekapStats, setRekapStats] = useState({ totalData: 0, lancar: 0, sedang: 0, lemah: 0, bacaNazhor: 0 })

    // Pencapaian state
    const [semesterList, setSemesterList] = useState([])
    const [santriList, setSantriList] = useState([])
    const [pencapaianSubTab, setPencapaianSubTab] = useState('input') // 'input' or 'laporan'
    const [pencapaianKategori, setPencapaianKategori] = useState('semester') // 'semester', 'mingguan', 'bulanan'
    const [pencapaianSemester, setPencapaianSemester] = useState('')
    const [pencapaianBulan, setPencapaianBulan] = useState('')
    const [pencapaianHalaqoh, setPencapaianHalaqoh] = useState('')
    const [pencapaianTanggal, setPencapaianTanggal] = useState({ dari: '', sampai: '' })
    const [pencapaianSearch, setPencapaianSearch] = useState('')
    // Single data storage with period-based keys: { "semester_1": {...}, "bulanan_01": {...}, "mingguan_2024-01-01_2024-01-07": {...} }
    const [pencapaianAllData, setPencapaianAllData] = useState({})
    const [savingPencapaian, setSavingPencapaian] = useState(false)

    // Get current period key based on kategori and filter values
    const getCurrentPeriodKey = () => {
        if (pencapaianKategori === 'semester' && pencapaianSemester) {
            return `semester_${pencapaianSemester} `
        } else if (pencapaianKategori === 'bulanan' && pencapaianBulan) {
            return `bulanan_${pencapaianBulan} `
        } else if (pencapaianKategori === 'mingguan' && pencapaianTanggal.dari && pencapaianTanggal.sampai) {
            return `mingguan_${pencapaianTanggal.dari}_${pencapaianTanggal.sampai} `
        }
        return null
    }

    // Get current pencapaian data based on current period key
    const getCurrentPencapaianData = () => {
        const periodKey = getCurrentPeriodKey()
        if (periodKey && pencapaianAllData[periodKey]) {
            return pencapaianAllData[periodKey]
        }
        return {}
    }

    // Set current pencapaian data for current period key
    const setCurrentPencapaianData = (data) => {
        const periodKey = getCurrentPeriodKey()
        if (periodKey) {
            setPencapaianAllData(prev => ({
                ...prev,
                [periodKey]: data
            }))
        }
    }

    useEffect(() => {
        fetchHafalan()
        // fetchHalaqoh() // Handled by hook
        fetchSemester()
        fetchSantriList()
    }, [])

    // Sync activeTab with URL when navigating via sidebar
    useEffect(() => {
        const urlTab = searchParams.get('tab') || 'list'
        if (activeTab !== urlTab) {
            setActiveTab(urlTab)
        }
    }, [searchParams])

    // Auto-fetch pencapaian data when period filter changes
    useEffect(() => {
        if (activeTab === 'pencapaian') {
            const periodKey = getCurrentPeriodKey()
            if (periodKey && !pencapaianAllData[periodKey]) {
                fetchPencapaianByPeriod()
            }
        }
    }, [activeTab, pencapaianKategori, pencapaianSemester, pencapaianBulan, pencapaianTanggal.dari, pencapaianTanggal.sampai])

    const fetchSemester = async () => {
        try {
            const { data } = await supabase.from('semester').select('id, nama, tahun_ajaran, is_active').order('is_active', { ascending: false })
            setSemesterList(data || [])
            const activeSem = data?.find(s => s.is_active)
            if (activeSem) setPencapaianSemester(activeSem.id)
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchSantriList = async () => {
        try {
            // Fetch santri with kelas
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nis, nama, halaqoh_id, kelas_id')
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError

            // Fetch kelas data
            const { data: kelasData } = await supabase
                .from('kelas')
                .select('id, nama')

            // Fetch halaqoh with musyrif (handled by hook for main filter, but we need raw map for santri details)
            const { data: halaqohData } = await supabase
                .from('halaqoh')
                .select('id, nama, musyrif_id')

            // Fetch guru/musyrif data
            const { data: guruData } = await supabase
                .from('guru')
                .select('id, nama')

            // Create lookup maps
            const kelasMap = {}
            kelasData?.forEach(k => { kelasMap[k.id] = k.nama })

            const guruMap = {}
            guruData?.forEach(g => { guruMap[g.id] = g.nama })

            const halaqohMap = {}
            halaqohData?.forEach(h => {
                halaqohMap[h.id] = {
                    nama: h.nama,
                    musyrif_nama: guruMap[h.musyrif_id] || '-'
                }
            })

            // Map santri with all related data
            const mappedSantri = santriData?.map(s => ({
                ...s,
                kelas: kelasMap[s.kelas_id] || '-',
                halaqoh_nama: halaqohMap[s.halaqoh_id]?.nama || '-',
                musyrif_nama: halaqohMap[s.halaqoh_id]?.musyrif_nama || '-'
            })) || []

            setSantriList(mappedSantri)
        } catch (err) {
            console.error('Error fetching santri:', err.message)
        }
    }


    const handlePencapaianChange = (santriId, field, value) => {
        const periodKey = getCurrentPeriodKey()
        if (!periodKey) return

        setPencapaianAllData(prev => ({
            ...prev,
            [periodKey]: {
                ...(prev[periodKey] || {}),
                [santriId]: {
                    ...(prev[periodKey]?.[santriId] || { jumlah_hafalan: '', predikat: 'Baik', total_hafalan: '' }),
                    [field]: value
                }
            }
        }))
    }

    const savePencapaian = async () => {
        // Validasi berdasarkan kategori
        if (pencapaianKategori === 'semester' && !pencapaianSemester) return alert('Pilih semester terlebih dahulu')
        if (pencapaianKategori === 'mingguan' && (!pencapaianTanggal.dari || !pencapaianTanggal.sampai)) return alert('Pilih rentang tanggal terlebih dahulu')
        if (pencapaianKategori === 'bulanan' && !pencapaianBulan) return alert('Pilih bulan terlebih dahulu')

        setSavingPencapaian(true)
        try {
            const currentData = getCurrentPencapaianData()
            const periodKey = getCurrentPeriodKey()

            // Delete existing data for this periode
            await supabase.from('pencapaian_hafalan').delete().eq('periode', periodKey)

            const insertData = Object.entries(currentData)
                .filter(([_, v]) => v.jumlah_hafalan || v.total_hafalan)
                .map(([santriId, v]) => ({
                    santri_id: santriId,
                    semester_id: pencapaianKategori === 'semester' ? pencapaianSemester : null,
                    kategori: pencapaianKategori,
                    periode: periodKey,
                    bulan: pencapaianKategori === 'bulanan' ? pencapaianBulan : null,
                    tanggal_dari: pencapaianKategori === 'mingguan' ? pencapaianTanggal.dari : null,
                    tanggal_sampai: pencapaianKategori === 'mingguan' ? pencapaianTanggal.sampai : null,
                    jumlah_hafalan: v.jumlah_hafalan,
                    predikat: v.predikat,
                    total_hafalan: v.total_hafalan
                }))

            if (insertData.length > 0) {
                const { error } = await supabase.from('pencapaian_hafalan').insert(insertData)
                if (error) throw error
            }
            alert('Pencapaian hafalan berhasil disimpan!')
        } catch (err) {
            console.error('Error:', err.message)
            alert('Gagal menyimpan: ' + err.message)
        } finally {
            setSavingPencapaian(false)
        }
    }

    // Fetch pencapaian data based on current period
    const fetchPencapaianByPeriod = async () => {
        const periodKey = getCurrentPeriodKey()
        if (!periodKey) return

        try {
            const { data, error } = await supabase
                .from('pencapaian_hafalan')
                .select('santri_id, jumlah_hafalan, predikat, total_hafalan')
                .eq('periode', periodKey)

            if (error) throw error

            const pencapaianMap = {}
            data?.forEach(p => {
                pencapaianMap[p.santri_id] = {
                    jumlah_hafalan: p.jumlah_hafalan || '',
                    predikat: p.predikat || 'Baik',
                    total_hafalan: p.total_hafalan || ''
                }
            })

            // Save to state
            setPencapaianAllData(prev => ({
                ...prev,
                [periodKey]: pencapaianMap
            }))
        } catch (err) {
            console.error('Error fetching pencapaian:', err.message)
        }
    }

    const fetchHafalan = async () => {
        console.log('[HafalanList] Fetch triggered')
        console.log('[HafalanList] Mode:', mode)
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('hafalan')
                .select(`
    *,
    santri: santri_id(nama, nama_wali, no_telp_wali, kelas: kelas_id(nama), halaqoh: halaqoh_id(id, nama, musyrif: musyrif_id(nama))),
        penguji: penguji_id(nama)
                `)
                .order('tanggal', { ascending: false })

            if (error) throw error

            const mapped = data.map(h => ({
                ...h,
                santri_nama: h.santri?.nama || '-',
                nama_wali: h.santri?.nama_wali || '-',
                no_telp_wali: h.santri?.no_telp_wali || '',
                kelas_nama: h.santri?.kelas?.nama || '-',
                halaqoh_id: h.santri?.halaqoh?.id || null,
                halaqoh_nama: h.santri?.halaqoh?.nama || '-',
                // Penguji: gunakan penguji jika ada, fallback ke musyrif halaqoh
                penguji_nama: h.penguji?.nama || h.santri?.halaqoh?.musyrif?.nama || '-'
            }))

            setHafalan(mapped)
            calculateStats(mapped)
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (data) => {
        const total = data.length
        const lancar = data.filter(h => h.status === 'Lancar').length
        const sedang = data.filter(h => h.status === 'Sedang').length
        const lemah = data.filter(h => h.status === 'Lemah').length
        const bacaNazhor = data.filter(h => h.status === 'Baca Nazhor').length
        setStats({ total, lancar, sedang, lemah, bacaNazhor })
    }

    const handleDelete = async () => {
        if (!selectedHafalan) return
        try {
            const { error } = await supabase.from('hafalan').delete().eq('id', selectedHafalan.id)
            if (error) throw error
            await logDelete('hafalan', selectedHafalan.santri_nama, `Hapus hafalan: ${selectedHafalan.santri_nama} - ${selectedHafalan.surah_mulai || selectedHafalan.surah} `)
            setHafalan(hafalan.filter(h => h.id !== selectedHafalan.id))
            setShowDeleteModal(false)
            setSelectedHafalan(null)
            fetchHafalan()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    // Filter for Input Hafalan tab
    const filteredHafalan = hafalan.filter(h => {
        const matchSearch = h.santri_nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.surah?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.surah_mulai?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchFilter = activeFilter === 'Semua' || h.jenis === activeFilter

        // Date filter
        let matchDate = true
        if (dateFilter.dari) {
            matchDate = matchDate && h.tanggal >= dateFilter.dari
        }
        if (dateFilter.sampai) {
            matchDate = matchDate && h.tanggal <= dateFilter.sampai
        }

        // Halaqoh filter - Updated for RBAC Dropdown
        let matchHalaqoh = true
        if (selectedHalaqohId) {
            matchHalaqoh = h.halaqoh_id === selectedHalaqohId
            // Check deep relation fallback if halaqoh_id is null on root but exists in santri object? 
            // usage of h.halaqoh_id comes from fetchHafalan mapping: halaqoh_id: h.santri?.halaqoh?.id
        } else if (!isAdmin && halaqohIds.length > 0) {
            matchHalaqoh = halaqohIds.includes(h.halaqoh_id)
        }

        return matchSearch && matchFilter && matchDate && matchHalaqoh
    })

    // Fungsi kirim WhatsApp
    const sendWhatsApp = (item) => {
        // Gunakan nomor dari database, atau minta input jika tidak ada
        let phone = item.no_telp_wali || ''

        // Format nomor (hapus karakter non-digit, tambah 62 jika perlu)
        phone = phone.replace(/\D/g, '')
        if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1)
        }

        // Jika tidak ada nomor, minta input manual
        if (!phone) {
            phone = prompt(`Nomor telepon wali ${item.nama_wali || 'santri'} tidak tersedia.\n\nMasukkan nomor WhatsApp(contoh: 6281234567890): `)
            if (!phone) return
            phone = phone.replace(/\D/g, '')
            if (phone.startsWith('0')) {
                phone = '62' + phone.substring(1)
            }
        }

        const juzDisplay = (item.juz_mulai || item.juz || '-') + ((item.juz_selesai && item.juz_selesai !== item.juz_mulai) ? ` - ${item.juz_selesai} ` : '')
        const surahDisplay = (item.surah_mulai || item.surah || '-') + ((item.surah_selesai && item.surah_selesai !== item.surah_mulai) ? ` s / d ${item.surah_selesai} ` : '')

        const message = `Assalamu'alaikum Wr. Wb.

    * LAPORAN HAFALAN SANTRI *
━━━━━━━━━━━━━━━━━━━━

Kepada Yth.Bapak / Ibu * ${item.nama_wali || 'Wali Santri'}*

📌 * Nama Santri:* ${item.santri_nama}
📅 * Tanggal:* ${item.tanggal}
📖 * Jenis:* ${item.jenis || 'Setoran'}

* Detail Hafalan:*
• Juz: ${juzDisplay}
• Surah: ${surahDisplay}
• Ayat: ${item.ayat_mulai || 1} - ${item.ayat_selesai || 1}
• Kadar: ${item.kadar_setoran || '-'}

* Status:* ${item.status}
* Penguji:* ${item.penguji_nama || '-'}

${item.catatan ? `*Catatan:* ${item.catatan}` : ''}

Demikian laporan hafalan ananda.Jazakumullah khairan.

_PTQA Batuan_`

        const encoded = encodeURIComponent(message)
        window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
    }

    // Fungsi kirim massal (looping)
    // Fungsi kirim massal (looping)
    const sendAllWhatsApp = () => {
        // Debugging logs
        console.log('Button clicked. Data length:', rekapData.length)

        if (!rekapData || rekapData.length === 0) {
            alert('Tidak ada data rekap untuk dikirim. Silakan filter data terlebih dahulu.')
            return
        }

        const message = `Akan mengirim laporan ke ${rekapData.length} wali santri.\n\nSistem akan membuka tab WhatsApp Web satu per satu setiap 2 detik.\n\nKlik OK untuk melanjutkan.`

        if (!window.confirm(message)) return

        // Feedback visual
        const statusDiv = document.createElement('div')
        statusDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:15px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);'
        statusDiv.innerHTML = `Mengirim pesan massal... (0/${rekapData.length})`
        document.body.appendChild(statusDiv)

        rekapData.forEach((item, index) => {
            setTimeout(() => {
                try {
                    sendWhatsApp(item)
                    statusDiv.innerHTML = `Mengirim pesan massal... (${index + 1}/${rekapData.length})`

                    if (index === rekapData.length - 1) {
                        setTimeout(() => {
                            statusDiv.innerHTML = '✅ Pengiriman Selesai'
                            setTimeout(() => statusDiv.remove(), 3000)
                        }, 1000)
                    }
                } catch (e) {
                    console.error('Error sending:', e)
                }
            }, index * 2000 + 500) // Delay awal 500ms
        })
    }

    // Filter for Rekap Hafalan tab
    const applyRekapFilter = () => {
        let filtered = [...hafalan]

        // Filter by date range
        if (rekapFilters.tanggalMulai) {
            filtered = filtered.filter(h => h.tanggal >= rekapFilters.tanggalMulai)
        }
        if (rekapFilters.tanggalSelesai) {
            filtered = filtered.filter(h => h.tanggal <= rekapFilters.tanggalSelesai)
        }

        // Filter by halaqoh
        if (rekapFilters.halaqoh_id) {
            filtered = filtered.filter(h => h.halaqoh_id === rekapFilters.halaqoh_id)
        }

        // Filter by santri name
        if (rekapFilters.santri_nama) {
            filtered = filtered.filter(h =>
                h.santri_nama?.toLowerCase().includes(rekapFilters.santri_nama.toLowerCase())
            )
        }

        setRekapData(filtered)

        // Calculate rekap stats dengan status baru
        const totalData = filtered.length
        const lancar = filtered.filter(h => h.status === 'Lancar').length
        const sedang = filtered.filter(h => h.status === 'Sedang').length
        const lemah = filtered.filter(h => h.status === 'Lemah').length
        const bacaNazhor = filtered.filter(h => h.status === 'Baca Nazhor').length
        // Jenis stats
        const setoran = filtered.filter(h => h.jenis === 'Setoran').length
        const murojaah = filtered.filter(h => h.jenis === "Muroja'ah").length
        const ziyadahUlang = filtered.filter(h => h.jenis === 'Ziyadah Ulang').length

        setRekapStats({ totalData, lancar, sedang, lemah, bacaNazhor, setoran, murojaah, ziyadahUlang })
    }

    // Fungsi Print Rekap
    const handlePrint = () => {
        const printContent = document.getElementById('rekap-print-area')
        if (!printContent) return

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <html>
                <head>
                    <title>Rekap Hafalan - PTQA Batuan</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { text-align: center; color: #2c3e50; margin-bottom: 10px; }
                        .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #2c3e50; color: white; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                        .stat-item { padding: 10px; background: #f0f0f0; border-radius: 5px; }
                        .stat-label { font-size: 12px; color: #666; }
                        .stat-value { font-size: 18px; font-weight: bold; }
                        .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #666; }
                    </style>
                </head>
                <body>
                    <h1>📖 REKAP HAFALAN SANTRI</h1>
                    <p class="subtitle">PTQA Batuan - Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <div class="stats">
                        <div class="stat-item"><span class="stat-label">Total Data</span><br/><span class="stat-value">${rekapData.length}</span></div>
                        <div class="stat-item"><span class="stat-label">Lancar</span><br/><span class="stat-value">${rekapStats.lancar}</span></div>
                        <div class="stat-item"><span class="stat-label">Sedang</span><br/><span class="stat-value">${rekapStats.sedang}</span></div>
                        <div class="stat-item"><span class="stat-label">Lemah</span><br/><span class="stat-value">${rekapStats.lemah}</span></div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Tanggal</th>
                                <th>Nama Santri</th>
                                <th>Halaqoh</th>
                                <th>Jenis</th>
                                <th>Hafalan</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rekapData.map((h, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${h.tanggal}</td>
                                    <td>${h.santri_nama}</td>
                                    <td>${h.halaqoh_nama || '-'}</td>
                                    <td>${h.jenis}</td>
                                    <td>${h.surah_mulai || h.surah || '-'} (${h.ayat_mulai}-${h.ayat_selesai})</td>
                                    <td>${h.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p class="footer">Dokumen ini digenerate secara otomatis dari Sistem Akademik PTQA Batuan</p>
                </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 250)
    }

    // Fungsi Download PDF via Standard Generator
    const handleDownloadPDF = async () => {
        if (!rekapData || rekapData.length === 0) return

        await generateLaporanPDF({
            title: 'REKAP HAFALAN SANTRI',
            subtitle: `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            orientation: 'landscape',
            columns: ['No', 'Tanggal', 'Nama Santri', 'Halaqoh', 'Jenis', 'Hafalan', 'Status'],
            data: rekapData.map((h, i) => [
                i + 1,
                h.tanggal,
                h.santri_nama,
                h.halaqoh_nama || '-',
                h.jenis,
                `${h.surah_mulai || h.surah || '-'} (${h.ayat_mulai}-${h.ayat_selesai})`,
                h.status
            ]),
            filename: `Rekap_Hafalan_${new Date().toISOString().split('T')[0]}`
        })
    }

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Nama Santri', 'Halaqoh', 'Jenis', 'Hafalan', 'Status']
        const exportData = rekapData.map(h => ({
            Tanggal: h.tanggal,
            'Nama Santri': h.santri_nama,
            Halaqoh: h.halaqoh_nama || '-',
            Jenis: h.jenis,
            Hafalan: `${h.surah_mulai || h.surah || '-'} (${h.ayat_mulai}-${h.ayat_selesai})`,
            Status: h.status
        }))
        exportToExcel(exportData, columns, 'rekap_hafalan')
    }

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Nama Santri', 'Halaqoh', 'Jenis', 'Hafalan', 'Status']
        const exportData = rekapData.map(h => ({
            Tanggal: h.tanggal,
            'Nama Santri': h.santri_nama,
            Halaqoh: h.halaqoh_nama || '-',
            Jenis: h.jenis,
            Hafalan: `${h.surah_mulai || h.surah || '-'} (${h.ayat_mulai}-${h.ayat_selesai})`,
            Status: h.status
        }))
        exportToCSV(exportData, columns, 'rekap_hafalan')
    }

    useEffect(() => {
        if (activeTab === 'rekap') {
            applyRekapFilter()
        }
    }, [activeTab, rekapFilters, hafalan])

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Lancar': return 'badge-success'
            case 'Sedang': return 'badge-info'
            case 'Lemah': return 'badge-warning'
            case 'Baca Nazhor': return 'badge-error'
            // Legacy support
            case 'Mutqin': return 'badge-success'
            case 'Perlu Perbaikan':
            case 'Proses': return 'badge-warning'
            default: return 'badge-secondary'
        }
    }

    const getJenisBadge = (jenis) => {
        switch (jenis) {
            case 'Setoran': return 'badge-info'
            case "Muroja'ah": return 'badge-warning'
            case 'Ziyadah Ulang': return 'badge-success'
            default: return 'badge-secondary'
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={activeTab === 'pencapaian' ? 'Pencapaian Hafalan' : activeTab === 'rekap' ? 'Rekap Hafalan' : 'Input Hafalan'}
                description={
                    activeTab === 'pencapaian' ? 'Monitoring pencapaian hafalan santri' :
                        activeTab === 'rekap' ? 'Lihat rekap hafalan santri dengan filter' :
                            "Kelola setoran dan muroja'ah hafalan santri"
                }
            />

            {/* ==================== INPUT HAFALAN TAB ==================== */}
            {activeTab === 'list' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Filter Tabs */}
                            <div className="flex p-1 bg-gray-100 rounded-xl w-full md:w-auto overflow-x-auto">
                                {['Semua', 'Setoran', "Muroja'ah", 'Ziyadah Ulang'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeFilter === filter
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                            }`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>

                            {/* Add Button */}
                            <Link
                                to="/hafalan/create?jenis=Setoran"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm w-full md:w-auto"
                            >
                                <Plus size={18} />
                                <span>Data Hafalan</span>
                            </Link>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-col md:flex-row gap-3 pt-2 items-start md:items-center">
                            <div className="w-full md:w-auto">
                                <DateRangePicker
                                    startDate={dateFilter.dari}
                                    endDate={dateFilter.sampai}
                                    onChange={(start, end) => setDateFilter({ dari: start, sampai: end })}
                                />
                            </div>

                            <div className="w-full md:w-auto px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 truncate min-w-[200px]">
                                {isAdmin ? 'Semua Halaqoh (Admin)' : (halaqohNames || 'Memuat...')}
                            </div>

                            {/* Search */}
                            <div className="relative w-full md:w-64 md:ml-auto">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari santri..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 whitespace-nowrap">Tanggal</th>
                                    <th className="px-6 py-3">Nama Santri</th>
                                    <th className="px-6 py-3">Kelas</th>
                                    <th className="px-6 py-3">Hafalan</th>
                                    <th className="px-6 py-3">Jenis</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Penguji</th>
                                    <th className="px-6 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="8"><Spinner className="py-12" label="Memuat data hafalan..." /></td></tr>
                                ) : filteredHafalan.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-8">
                                            <EmptyState
                                                icon={FileText}
                                                title="Belum ada data hafalan"
                                                message={searchTerm ? `Tidak ditemukan data untuk pencarian "${searchTerm}"` : "Belum ada data hafalan yang tercatat."}
                                                actionLabel="Catat Hafalan"
                                                onAction={() => window.location.href = '/hafalan/create?jenis=Setoran'}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHafalan.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{item.santri_nama}</td>
                                            <td className="px-6 py-4 text-gray-600">{item.kelas_nama}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">Juz {item.juz_mulai || item.juz || '-'}{(item.juz_selesai && item.juz_selesai !== item.juz_mulai) ? ` - ${item.juz_selesai}` : ''}</span>
                                                    <span className="text-gray-600">{item.surah_mulai || item.surah || '-'}{(item.surah_selesai && item.surah_selesai !== item.surah_mulai) ? ` s/d ${item.surah_selesai}` : ''}</span>
                                                    <span className="text-xs text-gray-500">Ayat {item.ayat_mulai || 1}-{item.ayat_selesai || 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={
                                                    item.jenis === 'Setoran' ? 'info' :
                                                        item.jenis === "Muroja'ah" ? 'warning' :
                                                            item.jenis === 'Ziyadah Ulang' ? 'success' : 'default'
                                                }>
                                                    {item.jenis || 'Setoran'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={
                                                    ['Lancar', 'Mutqin'].includes(item.status) ? 'success' :
                                                        ['Sedang', 'Proses'].includes(item.status) ? 'info' :
                                                            ['Lemah', 'Perlu Perbaikan'].includes(item.status) ? 'warning' : 'error'
                                                }>
                                                    {item.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{item.penguji_nama}</td>
                                            <td className="px-6 py-4 text-right">
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <MessageCircle size={16} />, label: 'WhatsApp', onClick: () => sendWhatsApp(item) },
                                                        { icon: <Edit size={16} />, label: 'Edit', path: `/hafalan/${item.id}/edit` },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedHafalan(item); setShowDeleteModal(true) }, danger: true }
                                                    ]}
                                                >
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Kirim WhatsApp"
                                                            onClick={() => sendWhatsApp(item)}
                                                        >
                                                            <MessageCircle size={18} />
                                                        </button>
                                                        <Link
                                                            to={`/hafalan/${item.id}/edit`}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={18} />
                                                        </Link>
                                                        <button
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus"
                                                            onClick={() => { setSelectedHafalan(item); setShowDeleteModal(true) }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </MobileActionMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ==================== REKAP HAFALAN TAB ==================== */}
            {activeTab === 'rekap' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" id="rekap-print-area">
                    <div className="p-4 border-b border-gray-200 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-lg font-semibold text-gray-900">Data Rekap ({rekapData.length} record)</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                    onClick={handlePrint}
                                >
                                    <Printer size={16} /> Print
                                </button>
                                <DownloadButton
                                    onDownloadPDF={handleDownloadPDF}
                                    onDownloadExcel={handleDownloadExcel}
                                    onDownloadCSV={handleDownloadCSV}
                                />
                                <button
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={sendAllWhatsApp}
                                    disabled={rekapData.length === 0}
                                    title="Kirim massal ke semua data rekap"
                                >
                                    <Send size={16} /> Kirim WA ({rekapData.length})
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 pt-2 items-start md:items-center">
                            <div className="flex-1 min-w-[300px]">
                                <DateRangePicker
                                    startDate={rekapFilters.tanggalMulai}
                                    endDate={rekapFilters.tanggalSelesai}
                                    onChange={(start, end) => setRekapFilters({ ...rekapFilters, tanggalMulai: start, tanggalSelesai: end })}
                                />
                            </div>

                            <select
                                className="w-full md:w-auto px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                value={rekapFilters.halaqoh_id}
                                onChange={(e) => setRekapFilters({ ...rekapFilters, halaqoh_id: e.target.value })}
                            >
                                <option value="">Semua Halaqoh</option>
                                {halaqohList.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                            </select>

                            {(rekapFilters.tanggalMulai || rekapFilters.tanggalSelesai || rekapFilters.halaqoh_id || rekapFilters.santri_nama) && (
                                <button
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    onClick={() => setRekapFilters({ tanggalMulai: '', tanggalSelesai: '', halaqoh_id: '', santri_nama: '' })}
                                >
                                    <RefreshCw size={18} />
                                </button>
                            )}

                            {/* Search */}
                            <div className="relative w-full md:w-64 md:ml-auto">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari santri..."
                                    value={rekapFilters.santri_nama}
                                    onChange={(e) => setRekapFilters({ ...rekapFilters, santri_nama: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 w-16">No</th>
                                    <th className="px-6 py-3 whitespace-nowrap">Tanggal</th>
                                    <th className="px-6 py-3">Nama Santri</th>
                                    <th className="px-6 py-3">Halaqoh</th>
                                    <th className="px-6 py-3">Hafalan</th>
                                    <th className="px-6 py-3">Jenis</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Penguji</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="8"><Spinner className="py-12" label="Memuat data rekap..." /></td></tr>
                                ) : rekapData.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-8">
                                            <EmptyState
                                                icon={FileText}
                                                title="Tidak ada data"
                                                message="Sesuaikan filter untuk melihat data rekap."
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    rekapData.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.tanggal}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{item.santri_nama}</td>
                                            <td className="px-6 py-4 text-gray-600">{item.halaqoh_nama}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">Juz {item.juz_mulai || item.juz || '-'}{(item.juz_selesai && item.juz_selesai !== item.juz_mulai) ? ` - ${item.juz_selesai}` : ''}</span>
                                                    <span className="text-gray-600">{item.surah_mulai || item.surah || '-'}{(item.surah_selesai && item.surah_selesai !== item.surah_mulai) ? ` s/d ${item.surah_selesai}` : ''}</span>
                                                    <span className="text-xs text-gray-500">Ayat {item.ayat_mulai || 1}-{item.ayat_selesai || 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={
                                                    item.jenis === 'Setoran' ? 'info' :
                                                        item.jenis === "Muroja'ah" ? 'warning' :
                                                            item.jenis === 'Ziyadah Ulang' ? 'success' : 'default'
                                                }>
                                                    {item.jenis || 'Setoran'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={
                                                    ['Lancar', 'Mutqin'].includes(item.status) ? 'success' :
                                                        ['Sedang', 'Proses'].includes(item.status) ? 'info' :
                                                            ['Lemah', 'Perlu Perbaikan'].includes(item.status) ? 'warning' : 'error'
                                                }>
                                                    {item.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{item.penguji_nama}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ==================== PENCAPAIAN TAB ==================== */}
            {activeTab === 'pencapaian' && (
                <div className="space-y-4">
                    {/* Sub-Tab Navigation */}
                    <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-fit">
                        <button
                            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${pencapaianSubTab === 'input'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setPencapaianSubTab('input')}
                        >
                            📝 Input Pencapaian
                        </button>
                        <button
                            className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${pencapaianSubTab === 'laporan'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setPencapaianSubTab('laporan')}
                        >
                            📊 Laporan Pencapaian
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 space-y-4">
                            {/* Filter Bar */}
                            <div className="flex flex-col md:flex-row gap-3 items-start md:items-end flex-wrap">
                                <div className="w-full md:w-48">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
                                    <select
                                        value={pencapaianKategori}
                                        onChange={(e) => setPencapaianKategori(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    >
                                        <option value="semester">Semester</option>
                                        <option value="mingguan">Mingguan</option>
                                        <option value="bulanan">Bulanan</option>
                                    </select>
                                </div>

                                {pencapaianKategori === 'semester' && (
                                    <div className="w-full md:w-64">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Semester</label>
                                        <select
                                            value={pencapaianSemester}
                                            onChange={(e) => setPencapaianSemester(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        >
                                            <option value="">-- Pilih Semester --</option>
                                            {semesterList.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.nama} - {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {pencapaianKategori === 'mingguan' && (
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 h-[42px]">
                                        <input
                                            type="date"
                                            value={pencapaianTanggal.dari}
                                            onChange={(e) => setPencapaianTanggal(prev => ({ ...prev, dari: e.target.value }))}
                                            className="bg-transparent border-none p-0 text-sm focus:ring-0 text-gray-700 w-32"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="date"
                                            value={pencapaianTanggal.sampai}
                                            onChange={(e) => setPencapaianTanggal(prev => ({ ...prev, sampai: e.target.value }))}
                                            className="bg-transparent border-none p-0 text-sm focus:ring-0 text-gray-700 w-32"
                                        />
                                    </div>
                                )}

                                {pencapaianKategori === 'bulanan' && (
                                    <div className="w-full md:w-48">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Bulan</label>
                                        <select
                                            value={pencapaianBulan}
                                            onChange={(e) => setPencapaianBulan(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        >
                                            <option value="">-- Pilih Bulan --</option>
                                            <option value="01">Januari</option>
                                            <option value="02">Februari</option>
                                            <option value="03">Maret</option>
                                            <option value="04">April</option>
                                            <option value="05">Mei</option>
                                            <option value="06">Juni</option>
                                            <option value="07">Juli</option>
                                            <option value="08">Agustus</option>
                                            <option value="09">September</option>
                                            <option value="10">Oktober</option>
                                            <option value="11">November</option>
                                            <option value="12">Desember</option>
                                        </select>
                                    </div>
                                )}

                                <div className="w-full md:w-48">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Halaqoh</label>
                                    <select
                                        value={pencapaianHalaqoh}
                                        onChange={(e) => setPencapaianHalaqoh(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    >
                                        <option value="">Semua Halaqoh</option>
                                        {halaqohList.map(h => (
                                            <option key={h.id} value={h.id}>
                                                {h.nama} {h.musyrif ? `(${h.musyrif.nama})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="w-full md:w-64">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Cari Santri</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Ketik nama santri..."
                                            value={pencapaianSearch}
                                            onChange={(e) => setPencapaianSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Actions based on subtab */}
                                {pencapaianSubTab === 'input' && (
                                    <button
                                        className="mt-auto ml-auto md:ml-0 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
                                        onClick={savePencapaian}
                                        disabled={savingPencapaian}
                                    >
                                        {savingPencapaian ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                        <span>{savingPencapaian ? 'Menyimpan...' : 'Simpan'}</span>
                                    </button>
                                )}

                                {pencapaianSubTab === 'laporan' && (
                                    <div className="mt-auto ml-auto md:ml-0 flex items-center gap-2">
                                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200" onClick={() => window.print()} title="Print">
                                            <Printer size={20} />
                                        </button>
                                        <button
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                                            onClick={() => {
                                                /* Existing download logic reused */
                                                const selectedHalaqoh = halaqohList.find(h => String(h.id) === String(pencapaianHalaqoh))
                                                const halaqohInfo = selectedHalaqoh
                                                    ? `<p><strong>Halaqoh:</strong> ${selectedHalaqoh.nama} ${selectedHalaqoh.musyrif ? `| <strong>Musyrif:</strong> ${selectedHalaqoh.musyrif.nama}` : ''}</p>`
                                                    : '<p><strong>Halaqoh:</strong> Semua Halaqoh</p>'

                                                let periodInfo = ''
                                                if (pencapaianKategori === 'semester') {
                                                    const sem = semesterList.find(s => String(s.id) === String(pencapaianSemester))
                                                    periodInfo = sem ? `<p><strong>Periode:</strong> ${sem.nama} - ${sem.tahun_ajaran}</p>` : ''
                                                } else if (pencapaianKategori === 'bulanan') {
                                                    const bulanNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
                                                    periodInfo = pencapaianBulan ? `<p><strong>Periode:</strong> Bulan ${bulanNames[parseInt(pencapaianBulan) - 1]}</p>` : ''
                                                } else if (pencapaianKategori === 'mingguan') {
                                                    periodInfo = `<p><strong>Periode:</strong> ${pencapaianTanggal.dari} s/d ${pencapaianTanggal.sampai}</p>`
                                                }

                                                const filteredSantri = santriList.filter(s =>
                                                    s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) &&
                                                    (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh))
                                                )

                                                const tableRows = filteredSantri.map((santri, index) => {
                                                    const data = getCurrentPencapaianData()[santri.id] || {}
                                                    return `
                                                    <tr>
                                                        <td>${index + 1}</td>
                                                        <td>${santri.nama}</td>
                                                        <td>${santri.kelas}</td>
                                                        <td>${santri.halaqoh_nama}</td>
                                                        <td>${santri.musyrif_nama}</td>
                                                        <td>${data.jumlah_hafalan || '-'}</td>
                                                        <td>${data.predikat || 'Belum dinilai'}</td>
                                                        <td>${data.total_hafalan || '-'}</td>
                                                    </tr>
                                                `
                                                }).join('')

                                                const htmlContent = `
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <meta charset="utf-8">
                                                    <title>Laporan Pencapaian Hafalan</title>
                                                    <style>
                                                        body { font-family: Arial, sans-serif; padding: 20px; }
                                                        h1 { text-align: center; margin-bottom: 10px; color: #059669; }
                                                        .info { margin-bottom: 20px; }
                                                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                                        th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 12px; }
                                                        th { background-color: #059669; color: white; }
                                                        tr:nth-child(even) { background-color: #f9f9f9; }
                                                        .footer { margin-top: 20px; text-align: right; font-size: 12px; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <h1>LAPORAN PENCAPAIAN HAFALAN</h1>
                                                    <h2 style="text-align: center; margin-top: 0;">PTQA Batuan</h2>
                                                    <div class="info">
                                                        ${halaqohInfo}
                                                        ${periodInfo}
                                                        <p><strong>Total Santri:</strong> ${filteredSantri.length}</p>
                                                    </div>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>No</th>
                                                                <th>Nama Santri</th>
                                                                <th>Kelas</th>
                                                                <th>Halaqoh</th>
                                                                <th>Musyrif</th>
                                                                <th>Jumlah Hafalan</th>
                                                                <th>Predikat</th>
                                                                <th>Total Hafalan</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${tableRows}
                                                        </tbody>
                                                    </table>
                                                    <div class="footer">
                                                        <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                </body>
                                                </html>
                                            `
                                                const blob = new Blob([htmlContent], { type: 'text/html' })
                                                const url = URL.createObjectURL(blob)
                                                const a = document.createElement('a')
                                                a.href = url
                                                a.download = `Laporan_Pencapaian_Hafalan_${new Date().toISOString().split('T')[0]}.html`
                                                document.body.appendChild(a)
                                                a.click()
                                                document.body.removeChild(a)
                                                URL.revokeObjectURL(url)
                                            }}
                                        >
                                            <Download size={16} /> Download
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 w-16">No</th>
                                        <th className="px-6 py-3">Nama Santri</th>
                                        <th className="px-6 py-3">Kelas</th>
                                        {pencapaianSubTab === 'input' ? (
                                            <>
                                                <th className="px-6 py-3 w-48">Jumlah Hafalan (Semester)</th>
                                                <th className="px-6 py-3 w-40">Predikat</th>
                                                <th className="px-6 py-3 w-48">Total Hafalan (Keseluruhan)</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-6 py-3">Halaqoh</th>
                                                <th className="px-6 py-3">Musyrif</th>
                                                <th className="px-6 py-3">Jumlah Hafalan</th>
                                                <th className="px-6 py-3">Predikat</th>
                                                <th className="px-6 py-3">Total Hafalan</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {santriList.filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh))).length === 0 ? (
                                        <tr><td colSpan={pencapaianSubTab === 'input' ? 6 : 8} className="p-8 text-center text-gray-500">Tidak ada data santri yang sesuai filter</td></tr>
                                    ) : (
                                        santriList
                                            .filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh)))
                                            .map((santri, index) => (
                                                <tr key={santri.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">{santri.nama}</td>
                                                    <td className="px-6 py-4 text-gray-600">{santri.kelas}</td>

                                                    {pencapaianSubTab === 'input' ? (
                                                        <>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Contoh: 3 Juz"
                                                                    value={getCurrentPencapaianData()[santri.id]?.jumlah_hafalan || ''}
                                                                    onChange={(e) => handlePencapaianChange(santri.id, 'jumlah_hafalan', e.target.value)}
                                                                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <select
                                                                    value={getCurrentPencapaianData()[santri.id]?.predikat || 'Baik'}
                                                                    onChange={(e) => handlePencapaianChange(santri.id, 'predikat', e.target.value)}
                                                                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                                                >
                                                                    <option value="Sangat Baik">Sangat Baik</option>
                                                                    <option value="Baik">Baik</option>
                                                                    <option value="Cukup">Cukup</option>
                                                                    <option value="Kurang">Kurang</option>
                                                                    <option value="Buruk">Buruk</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Contoh: 10 Juz"
                                                                    value={getCurrentPencapaianData()[santri.id]?.total_hafalan || ''}
                                                                    onChange={(e) => handlePencapaianChange(santri.id, 'total_hafalan', e.target.value)}
                                                                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                                                />
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-6 py-4 text-gray-600">{santri.halaqoh_nama}</td>
                                                            <td className="px-6 py-4 text-gray-600">{santri.musyrif_nama}</td>
                                                            <td className="px-6 py-4 text-gray-900">{getCurrentPencapaianData()[santri.id]?.jumlah_hafalan || '-'}</td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant={
                                                                    getCurrentPencapaianData()[santri.id]?.predikat === 'Sangat Baik' ? 'success' :
                                                                        getCurrentPencapaianData()[santri.id]?.predikat === 'Baik' ? 'info' :
                                                                            getCurrentPencapaianData()[santri.id]?.predikat === 'Kurang' ? 'warning' :
                                                                                getCurrentPencapaianData()[santri.id]?.predikat === 'Buruk' ? 'error' : 'default'
                                                                }>
                                                                    {getCurrentPencapaianData()[santri.id]?.predikat || 'Belum dinilai'}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-900">{getCurrentPencapaianData()[santri.id]?.total_hafalan || '-'}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                itemName="data hafalan ini"
                message="Apakah Anda yakin ingin menghapus data hafalan ini?"
            />
        </div >
    )
}

export default HafalanList

