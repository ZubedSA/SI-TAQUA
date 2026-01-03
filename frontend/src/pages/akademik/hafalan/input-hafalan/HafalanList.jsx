
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, RefreshCw, FileText, BarChart3, CheckCircle, Clock, AlertCircle, Filter, Calendar, MessageCircle, Trophy, Save, Printer, Download, MoreVertical, Send, Eye, EyeOff } from 'lucide-react'
import DeleteConfirmationModal from '../../../../components/ui/DeleteConfirmationModal'
import { supabase } from '../../../../lib/supabase'
import { logDelete } from '../../../../lib/auditLog'
import MobileActionMenu from '../../../../components/ui/MobileActionMenu'
import DownloadButton from '../../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../../utils/exportUtils'
import { generateLaporanPDF } from '../../../../utils/pdfGenerator'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'

import '../../../santri/Santri.css'


const HafalanList = () => {
    // Read initial tab from URL param
    const [searchParams] = useSearchParams()
    const initialTab = searchParams.get('tab') || 'list'

    // AUTO-FILTER: Halaqoh berdasarkan akun
    const {
        halaqohIds,
        halaqohNames,
        musyrifInfo,
        isLoading: loadingHalaqoh,
        hasHalaqoh,
        isAdmin
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
    const [halaqohList, setHalaqohList] = useState([])
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
        fetchHalaqoh()
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

            // Fetch halaqoh with musyrif
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

    const fetchHalaqoh = async () => {
        try {
            const { data } = await supabase.from('halaqoh').select('id, nama').order('nama')
            setHalaqohList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchHafalan = async () => {
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

        // Halaqoh filter - AUTO-FILTER berdasarkan akun (bukan manual dropdown)
        let matchHalaqoh = true
        if (!isAdmin && halaqohIds.length > 0) {
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
        <div className="santri-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {activeTab === 'list' && 'Input Hafalan'}
                        {activeTab === 'rekap' && 'Rekap Hafalan'}
                        {activeTab === 'pencapaian' && 'Pencapaian Hafalan'}
                    </h1>
                    <p className="page-subtitle">
                        {activeTab === 'list' && "Kelola setoran dan muroja'ah hafalan santri"}
                        {activeTab === 'rekap' && "Lihat rekap hafalan santri dengan filter"}
                        {activeTab === 'pencapaian' && "Monitoring pencapaian hafalan santri"}
                    </p>
                </div>
            </div>

            {/* ==================== INPUT HAFALAN TAB ==================== */}
            {activeTab === 'list' && (
                <div className="table-container">
                    <div className="table-header" style={{ flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            {/* Filter Tabs */}
                            <div className="hafalan-filter-tabs" style={{ margin: 0 }}>
                                <button className={`filter-tab ${activeFilter === 'Semua' ? 'active' : ''}`} onClick={() => setActiveFilter('Semua')}>Semua</button>
                                <button className={`filter-tab ${activeFilter === 'Setoran' ? 'active' : ''}`} onClick={() => setActiveFilter('Setoran')}>Setoran</button>
                                <button className={`filter-tab ${activeFilter === "Muroja'ah" ? 'active' : ''}`} onClick={() => setActiveFilter("Muroja'ah")}>Muroja'ah</button>
                                <button className={`filter-tab ${activeFilter === 'Ziyadah Ulang' ? 'active' : ''}`} onClick={() => setActiveFilter('Ziyadah Ulang')}>Ziyadah Ulang</button>
                            </div>

                            {/* Add Button */}
                            <Link to="/hafalan/create?jenis=Setoran" className="btn btn-primary">
                                <Plus size={16} /> Data Hafalan
                            </Link>
                        </div>

                        {/* Filters Row */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                            {/* Date Filter */}
                            <div className="date-filter-group">
                                <input
                                    type="date"
                                    className="form-control"
                                    value={dateFilter.dari}
                                    onChange={(e) => setDateFilter({ ...dateFilter, dari: e.target.value })}
                                />
                            </div>
                            <span className="text-muted">-</span>
                            <div className="date-filter-group">
                                <input
                                    type="date"
                                    className="form-control"
                                    value={dateFilter.sampai}
                                    onChange={(e) => setDateFilter({ ...dateFilter, sampai: e.target.value })}
                                />
                            </div>

                            {/* Halaqoh Filter - Auto untuk non-admin */}
                            <div className="filter-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    value={isAdmin ? 'Semua Halaqoh (Admin)' : (halaqohNames || 'Memuat...')}
                                    disabled
                                    readOnly
                                    style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed', minWidth: '180px' }}
                                />
                            </div>

                            {(dateFilter.dari || dateFilter.sampai) && (
                                <button className="btn btn-secondary btn-sm" onClick={() => { setDateFilter({ dari: '', sampai: '' }) }}>
                                    <RefreshCw size={14} /> Reset
                                </button>
                            )}

                            {/* Search */}
                            <div className="table-search" style={{ marginLeft: 'auto' }}>
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Cari santri..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Nama Santri</th>
                                    <th>Kelas</th>
                                    <th>Hafalan</th>
                                    <th>Jenis</th>
                                    <th>Status</th>
                                    <th>Penguji</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                ) : filteredHafalan.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center">Tidak ada data hafalan</td></tr>
                                ) : (
                                    filteredHafalan.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.tanggal}</td>
                                            <td className="name-cell">{item.santri_nama}</td>
                                            <td>{item.kelas_nama}</td>
                                            <td>
                                                <div className="hafalan-info">
                                                    <strong>Juz {item.juz_mulai || item.juz || '-'}{(item.juz_selesai && item.juz_selesai !== item.juz_mulai) ? ` - ${item.juz_selesai}` : ''}</strong>
                                                    <span>{item.surah_mulai || item.surah || '-'}{(item.surah_selesai && item.surah_selesai !== item.surah_mulai) ? ` s/d ${item.surah_selesai}` : ''}</span>
                                                    <span className="text-muted">Ayat {item.ayat_mulai || 1}-{item.ayat_selesai || 1}</span>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${getJenisBadge(item.jenis)}`}>{item.jenis || 'Setoran'}</span></td>
                                            <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                            <td>{item.penguji_nama}</td>
                                            <td>
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <MessageCircle size={16} />, label: 'WhatsApp', onClick: () => sendWhatsApp(item) },
                                                        { icon: <Edit size={16} />, label: 'Edit', path: `/hafalan/${item.id}/edit` },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => { setSelectedHafalan(item); setShowDeleteModal(true) }, danger: true }
                                                    ]}
                                                >
                                                    <button className="btn-icon btn-icon-success" title="Kirim WhatsApp" onClick={() => sendWhatsApp(item)}><MessageCircle size={16} /></button>
                                                    <Link to={`/hafalan/${item.id}/edit`} className="btn-icon" title="Edit"><Edit size={16} /></Link>
                                                    <button className="btn-icon btn-icon-danger" title="Hapus" onClick={() => { setSelectedHafalan(item); setShowDeleteModal(true) }}><Trash2 size={16} /></button>
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
            {
                activeTab === 'rekap' && (
                    <>
                        <div className="table-container" id="rekap-print-area">
                            <div className="table-header" style={{ flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                    <h3 className="table-title">Data Rekap ({rekapData.length} record)</h3>
                                    <div className="table-actions" style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-outline" onClick={handlePrint}>
                                            <Printer size={18} /> Print
                                        </button>
                                        <DownloadButton
                                            onDownloadPDF={handleDownloadPDF}
                                            onDownloadExcel={handleDownloadExcel}
                                            onDownloadCSV={handleDownloadCSV}
                                        />
                                        <button
                                            className="btn btn-success"
                                            onClick={sendAllWhatsApp}
                                            disabled={rekapData.length === 0}
                                            title="Kirim massal ke semua data rekap"
                                        >
                                            <Send size={14} /> Kirim Semua WA
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                                    <div className="date-filter-group">
                                        <label style={{ fontSize: '0.8rem', marginRight: '6px' }}>Dari</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={rekapFilters.tanggalMulai}
                                            onChange={(e) => setRekapFilters({ ...rekapFilters, tanggalMulai: e.target.value })}
                                        />
                                    </div>
                                    <div className="date-filter-group">
                                        <label style={{ fontSize: '0.8rem', marginRight: '6px' }}>Sampai</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={rekapFilters.tanggalSelesai}
                                            onChange={(e) => setRekapFilters({ ...rekapFilters, tanggalSelesai: e.target.value })}
                                        />
                                    </div>

                                    <div className="filter-group">
                                        <select
                                            className="form-control"
                                            value={rekapFilters.halaqoh_id}
                                            onChange={(e) => setRekapFilters({ ...rekapFilters, halaqoh_id: e.target.value })}
                                        >
                                            <option value="">Semua Halaqoh</option>
                                            {halaqohList.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                                        </select>
                                    </div>

                                    {(rekapFilters.tanggalMulai || rekapFilters.tanggalSelesai || rekapFilters.halaqoh_id || rekapFilters.santri_nama) && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => setRekapFilters({ tanggalMulai: '', tanggalSelesai: '', halaqoh_id: '', santri_nama: '' })}>
                                            <RefreshCw size={14} /> Reset
                                        </button>
                                    )}

                                    <div className="table-search" style={{ marginLeft: 'auto' }}>
                                        <Search size={18} className="search-icon" />
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Cari nama..."
                                            value={rekapFilters.santri_nama}
                                            onChange={(e) => setRekapFilters({ ...rekapFilters, santri_nama: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Tanggal</th>
                                            <th>Nama Santri</th>
                                            <th>Halaqoh</th>
                                            <th>Hafalan</th>
                                            <th>Jenis</th>
                                            <th>Status</th>
                                            <th>Penguji</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="8" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                        ) : rekapData.length === 0 ? (
                                            <tr><td colSpan="8" className="text-center">Tidak ada data. Sesuaikan filter.</td></tr>
                                        ) : (
                                            rekapData.map((item, idx) => (
                                                <tr key={item.id}>
                                                    <td>{idx + 1}</td>
                                                    <td>{item.tanggal}</td>
                                                    <td className="name-cell">{item.santri_nama}</td>
                                                    <td>{item.halaqoh_nama}</td>
                                                    <td>
                                                        <div className="hafalan-info">
                                                            <strong>Juz {item.juz_mulai || item.juz || '-'}{(item.juz_selesai && item.juz_selesai !== item.juz_mulai) ? ` - ${item.juz_selesai}` : ''}</strong>
                                                            <span>{item.surah_mulai || item.surah || '-'}{(item.surah_selesai && item.surah_selesai !== item.surah_mulai) ? ` s/d ${item.surah_selesai}` : ''}</span>
                                                            <span className="text-muted">Ayat {item.ayat_mulai || 1}-{item.ayat_selesai || 1}</span>
                                                        </div>
                                                    </td>
                                                    <td><span className={`badge ${getJenisBadge(item.jenis)}`}>{item.jenis || 'Setoran'}</span></td>
                                                    <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                                    <td>{item.penguji_nama}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )
            }

            {/* ==================== PENCAPAIAN TAB ==================== */}
            {
                activeTab === 'pencapaian' && (
                    <>
                        {/* Sub-Tab Buttons */}
                        <div className="pencapaian-subtabs mb-4" style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className={`btn ${pencapaianSubTab === 'input' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setPencapaianSubTab('input')}
                            >
                                📝 Input Pencapaian
                            </button>
                            <button
                                className={`btn ${pencapaianSubTab === 'laporan' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setPencapaianSubTab('laporan')}
                            >
                                📊 Laporan Pencapaian
                            </button>
                        </div>

                        {/* ==================== INPUT PENCAPAIAN SUB-TAB ==================== */}
                        {pencapaianSubTab === 'input' && (
                            <>
                                {/* Filter Bar */}
                                <div className="filter-bar mb-4">
                                    <div className="filter-group">
                                        <label>Kategori</label>
                                        <select
                                            value={pencapaianKategori}
                                            onChange={(e) => setPencapaianKategori(e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="semester">Semester</option>
                                            <option value="mingguan">Mingguan</option>
                                            <option value="bulanan">Bulanan</option>
                                        </select>
                                    </div>

                                    {/* Conditional: Semester */}
                                    {pencapaianKategori === 'semester' && (
                                        <div className="filter-group">
                                            <label>Pilih Semester</label>
                                            <select
                                                value={pencapaianSemester}
                                                onChange={(e) => setPencapaianSemester(e.target.value)}
                                                className="form-select"
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

                                    {/* Conditional: Mingguan - Date Range */}
                                    {pencapaianKategori === 'mingguan' && (
                                        <>
                                            <div className="filter-group">
                                                <label>Dari Tanggal</label>
                                                <input
                                                    type="date"
                                                    value={pencapaianTanggal.dari}
                                                    onChange={(e) => setPencapaianTanggal(prev => ({ ...prev, dari: e.target.value }))}
                                                    className="form-input"
                                                />
                                            </div>
                                            <div className="filter-group">
                                                <label>Sampai Tanggal</label>
                                                <input
                                                    type="date"
                                                    value={pencapaianTanggal.sampai}
                                                    onChange={(e) => setPencapaianTanggal(prev => ({ ...prev, sampai: e.target.value }))}
                                                    className="form-input"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Conditional: Bulanan - Month List */}
                                    {pencapaianKategori === 'bulanan' && (
                                        <div className="filter-group">
                                            <label>Pilih Bulan</label>
                                            <select
                                                value={pencapaianBulan}
                                                onChange={(e) => setPencapaianBulan(e.target.value)}
                                                className="form-select"
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

                                    <div className="filter-group">
                                        <label>Halaqoh</label>
                                        <select
                                            value={pencapaianHalaqoh}
                                            onChange={(e) => setPencapaianHalaqoh(e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="">Semua Halaqoh</option>
                                            {halaqohList.map(h => (
                                                <option key={h.id} value={h.id}>
                                                    {h.nama} {h.musyrif ? `(${h.musyrif.nama})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filter-group">
                                        <label>Cari Santri</label>
                                        <input
                                            type="text"
                                            placeholder="Ketik nama santri..."
                                            value={pencapaianSearch}
                                            onChange={(e) => setPencapaianSearch(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="filter-group filter-action">
                                        <button className="btn btn-primary btn-save" onClick={savePencapaian} disabled={savingPencapaian}>
                                            {savingPencapaian ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                                            <span>{savingPencapaian ? 'Menyimpan...' : 'Simpan'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Pencapaian Table */}
                                <div className="table-container">
                                    <div className="table-header">
                                        <h3 className="table-title"><Trophy size={20} /> Pencapaian Hafalan ({santriList.filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh))).length} santri)</h3>
                                    </div>

                                    <div className="table-wrapper">
                                        <table className="table pencapaian-table">
                                            <thead>
                                                <tr>
                                                    <th>No</th>
                                                    <th>Nama Santri</th>
                                                    <th>Kelas</th>
                                                    <th>Jumlah Hafalan (Semester)</th>
                                                    <th>Predikat</th>
                                                    <th>Total Hafalan (Keseluruhan)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {santriList.filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh))).length === 0 ? (
                                                    <tr><td colSpan="6" className="text-center">Tidak ada data santri</td></tr>
                                                ) : (
                                                    santriList
                                                        .filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh)))
                                                        .map((santri, index) => (
                                                            <tr key={santri.id}>
                                                                <td>{index + 1}</td>
                                                                <td className="name-cell">{santri.nama}</td>
                                                                <td>{santri.kelas}</td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Contoh: 3 Juz"
                                                                        value={getCurrentPencapaianData()[santri.id]?.jumlah_hafalan || ''}
                                                                        onChange={(e) => handlePencapaianChange(santri.id, 'jumlah_hafalan', e.target.value)}
                                                                        className="form-input-sm"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <select
                                                                        value={getCurrentPencapaianData()[santri.id]?.predikat || 'Baik'}
                                                                        onChange={(e) => handlePencapaianChange(santri.id, 'predikat', e.target.value)}
                                                                        className="form-select-sm"
                                                                    >
                                                                        <option value="Sangat Baik">Sangat Baik</option>
                                                                        <option value="Baik">Baik</option>
                                                                        <option value="Cukup">Cukup</option>
                                                                        <option value="Kurang">Kurang</option>
                                                                        <option value="Buruk">Buruk</option>
                                                                    </select>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Contoh: 10 Juz"
                                                                        value={getCurrentPencapaianData()[santri.id]?.total_hafalan || ''}
                                                                        onChange={(e) => handlePencapaianChange(santri.id, 'total_hafalan', e.target.value)}
                                                                        className="form-input-sm"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ==================== LAPORAN PENCAPAIAN SUB-TAB ==================== */}
                        {pencapaianSubTab === 'laporan' && (
                            <>
                                {/* Filter Bar for Laporan */}
                                <div className="filter-bar mb-4">
                                    <div className="filter-group">
                                        <label>Kategori</label>
                                        <select
                                            value={pencapaianKategori}
                                            onChange={(e) => setPencapaianKategori(e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="semester">Semester</option>
                                            <option value="mingguan">Mingguan</option>
                                            <option value="bulanan">Bulanan</option>
                                        </select>
                                    </div>

                                    {pencapaianKategori === 'semester' && (
                                        <div className="filter-group">
                                            <label>Pilih Semester</label>
                                            <select
                                                value={pencapaianSemester}
                                                onChange={(e) => setPencapaianSemester(e.target.value)}
                                                className="form-select"
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
                                        <>
                                            <div className="filter-group">
                                                <label>Dari Tanggal</label>
                                                <input
                                                    type="date"
                                                    value={pencapaianTanggal.dari}
                                                    onChange={(e) => setPencapaianTanggal(prev => ({ ...prev, dari: e.target.value }))}
                                                    className="form-input"
                                                />
                                            </div>
                                            <div className="filter-group">
                                                <label>Sampai Tanggal</label>
                                                <input
                                                    type="date"
                                                    value={pencapaianTanggal.sampai}
                                                    onChange={(e) => setPencapaianTanggal(prev => ({ ...prev, sampai: e.target.value }))}
                                                    className="form-input"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {pencapaianKategori === 'bulanan' && (
                                        <div className="filter-group">
                                            <label>Pilih Bulan</label>
                                            <select
                                                value={pencapaianBulan}
                                                onChange={(e) => setPencapaianBulan(e.target.value)}
                                                className="form-select"
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

                                    <div className="filter-group">
                                        <label>Halaqoh</label>
                                        <select
                                            value={pencapaianHalaqoh}
                                            onChange={(e) => setPencapaianHalaqoh(e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="">Semua Halaqoh</option>
                                            {halaqohList.map(h => (
                                                <option key={h.id} value={h.id}>
                                                    {h.nama} {h.musyrif ? `(${h.musyrif.nama})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="filter-group">
                                        <label>Cari Santri</label>
                                        <input
                                            type="text"
                                            placeholder="Ketik nama santri..."
                                            value={pencapaianSearch}
                                            onChange={(e) => setPencapaianSearch(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="rekap-actions mb-3" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => window.print()}
                                    >
                                        <Printer size={16} /> Print
                                    </button>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => {
                                            // Get selected halaqoh info
                                            const selectedHalaqoh = halaqohList.find(h => String(h.id) === String(pencapaianHalaqoh))
                                            const halaqohInfo = selectedHalaqoh
                                                ? `<p><strong>Halaqoh:</strong> ${selectedHalaqoh.nama} ${selectedHalaqoh.musyrif ? `| <strong>Musyrif:</strong> ${selectedHalaqoh.musyrif.nama}` : ''}</p>`
                                                : '<p><strong>Halaqoh:</strong> Semua Halaqoh</p>'

                                            // Get period info
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

                                            // Generate table rows
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
                                                <title>Laporan Pencapaian Hafalan - PTQA Batuan</title>
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

                                            // Create Blob and download
                                            const blob = new Blob([htmlContent], { type: 'text/html' })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = `Laporan_Pencapaian_Hafalan_${new Date().toISOString().split('T')[0]}.html`
                                            document.body.appendChild(a)
                                            a.click()
                                            document.body.removeChild(a)
                                            URL.revokeObjectURL(url)

                                            alert('File HTML berhasil didownload! Buka file dan gunakan Print > Save as PDF untuk konversi ke PDF.')
                                        }}
                                    >
                                        <Download size={16} /> Download PDF
                                    </button>
                                </div>

                                {/* Laporan Table */}
                                <div className="table-container">
                                    <div className="table-header">
                                        <h3 className="table-title"><Trophy size={20} /> Laporan Pencapaian Hafalan ({santriList.filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh))).length} santri)</h3>
                                    </div>

                                    <div className="table-wrapper">
                                        <table className="table laporan-pencapaian-table">
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
                                                {santriList.filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh))).length === 0 ? (
                                                    <tr><td colSpan="8" className="text-center">Tidak ada data</td></tr>
                                                ) : (
                                                    santriList
                                                        .filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()) && (pencapaianHalaqoh === '' || String(s.halaqoh_id) === String(pencapaianHalaqoh)))
                                                        .map((santri, index) => (
                                                            <tr key={santri.id}>
                                                                <td>{index + 1}</td>
                                                                <td className="name-cell">{santri.nama}</td>
                                                                <td>{santri.kelas}</td>
                                                                <td>{santri.halaqoh_nama}</td>
                                                                <td>{santri.musyrif_nama}</td>
                                                                <td>{getCurrentPencapaianData()[santri.id]?.jumlah_hafalan || '-'}</td>
                                                                <td>
                                                                    <span className={`badge badge-${getCurrentPencapaianData()[santri.id]?.predikat === 'Sangat Baik' ? 'success' : getCurrentPencapaianData()[santri.id]?.predikat === 'Baik' ? 'info' : 'warning'}`}>
                                                                        {getCurrentPencapaianData()[santri.id]?.predikat || 'Belum dinilai'}
                                                                    </span>
                                                                </td>
                                                                <td>{getCurrentPencapaianData()[santri.id]?.total_hafalan || '-'}</td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )
            }

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

