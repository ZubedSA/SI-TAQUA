import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, CreditCard, Download, RefreshCw, MessageCircle, Printer, Check, User, AlertCircle, CheckCircle, ChevronDown, X, Layers, List, Edit2, Calendar } from 'lucide-react'
import DateRangePicker from '../../components/ui/DateRangePicker'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { generateLaporanPDF, generateKwitansiPDF } from '../../utils/pdfGenerator'
import { sendWhatsApp, createMessage } from '../../utils/whatsapp'
import { logCreate, logUpdate } from '../../lib/auditLog'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { useCalendar } from '../../context/CalendarContext'
import PageHeader from '../../components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import './Keuangan.css'

const PembayaranSantriPage = () => {
    const { user } = useAuth()
    const { formatDate, mode } = useCalendar()
    const showToast = useToast()
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [tagihanSantri, setTagihanSantri] = useState([])
    const [pembayaranHistory, setPembayaranHistory] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingTagihan, setLoadingTagihan] = useState(false)
    const [searchSantri, setSearchSantri] = useState('')
    const [showSantriDropdown, setShowSantriDropdown] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [selectedTagihanIds, setSelectedTagihanIds] = useState([])
    const [lastPayment, setLastPayment] = useState(null)
    const [viewMode, setViewMode] = useState('grouped') // 'grouped' or 'individual'
    const dropdownRef = useRef(null)
    const [form, setForm] = useState({
        jumlah: '',
        tanggal: new Date().toISOString().split('T')[0],
        metode: 'Tunai',
        keterangan: ''
    })
    const [saving, setSaving] = useState(false)

    // Edit Payment State
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingPayment, setEditingPayment] = useState(null)
    const [editForm, setEditForm] = useState({
        jumlah: '',
        tanggal: '',
        metode: 'Tunai',
        keterangan: ''
    })
    const [editSaveModal, setEditSaveModal] = useState({ isOpen: false })

    const metodeOptions = ['Tunai', 'Transfer', 'QRIS', 'Lainnya']

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowSantriDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Search santri when typing (with debounce)
    useEffect(() => {
        const query = searchSantri.trim()
        if (query.length >= 2) {
            setShowSantriDropdown(true)
            const timer = setTimeout(() => {
                fetchSantri(query)
            }, 250)
            return () => clearTimeout(timer)
        } else {
            setSantriList([])
            setShowSantriDropdown(false)
        }
    }, [searchSantri])

    const fetchSantri = async (query) => {
        const cleanQuery = query.trim()
        if (!cleanQuery) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, nama_wali, no_telp_wali, status, kelas:kelas_id(nama)')
                .or(`nama.ilike.%${cleanQuery}%,nis.ilike.%${cleanQuery}%`)
                .limit(10)
                .order('nama')

            if (error) {
                throw error
            }
            setSantriList(data || [])
            setShowSantriDropdown(true)
        } catch (err) {
            showToast.error('Gagal mencari santri: ' + err.message)
            setSantriList([])
        } finally {
            setLoading(false)
        }
    }

    const fetchTagihanSantri = async (santriId) => {
        setLoadingTagihan(true)
        try {
            const [tagihanRes, pembayaranRes, allPaymentsRes] = await Promise.all([
                supabase
                    .from('tagihan_santri')
                    .select('*, kategori:kategori_id(nama)')
                    .eq('santri_id', santriId)
                    .order('jatuh_tempo', { ascending: false }),
                supabase
                    .from('pembayaran_santri')
                    .select('id, tagihan_id, jumlah, tanggal, metode, keterangan, santri_id, bukti_url, created_at, tagihan:tagihan_id(id, jumlah, jatuh_tempo, keterangan, kategori:kategori_id(nama))')
                    .eq('santri_id', santriId)
                    .order('tanggal', { ascending: false })
                    .limit(50),
                supabase
                    .from('pembayaran_santri')
                    .select('tagihan_id, jumlah')
                    .eq('santri_id', santriId)
            ])

            if (tagihanRes.error) throw tagihanRes.error
            if (pembayaranRes.error) throw pembayaranRes.error
            if (allPaymentsRes.error) throw allPaymentsRes.error

            // Hitung akumulasi pembayaran per tagihan secara akurat
            const paymentsMap = {}
            ;(allPaymentsRes.data || []).forEach(p => {
                if (p.tagihan_id) {
                    paymentsMap[p.tagihan_id] = (paymentsMap[p.tagihan_id] || 0) + Number(p.jumlah || 0)
                }
            })

            const enriched = (tagihanRes.data || []).map(t => {
                const nominalTagihan = Number(t.jumlah || 0)
                const terbayar = paymentsMap[t.id] !== undefined ? paymentsMap[t.id] : (t.status === 'Lunas' ? nominalTagihan : 0)
                const sisa = Math.max(0, nominalTagihan - terbayar)
                const isLunas = t.status === 'Lunas' || sisa <= 0
                const isSebagian = !isLunas && terbayar > 0
                const persenTerbayar = nominalTagihan > 0 ? Math.min(100, Math.round((terbayar / nominalTagihan) * 100)) : 0

                return {
                    ...t,
                    nominal_tagihan: nominalTagihan,
                    terbayar: terbayar,
                    sisa: sisa,
                    isLunas: isLunas,
                    isSebagian: isSebagian,
                    persen_terbayar: persenTerbayar
                }
            })

            setTagihanSantri(enriched)
            setPembayaranHistory(pembayaranRes.data || [])
            setSelectedTagihanIds([]) // Reset selection
        } catch (err) {
            showToast.error('Gagal memuat data tagihan: ' + err.message)
        } finally {
            setLoadingTagihan(false)
        }
    }

    const handleSelectSantri = (santri) => {
        setSelectedSantri(santri)
        setSearchSantri('')
        setShowSantriDropdown(false)
        fetchTagihanSantri(santri.id)
    }

    const handleClearSantri = () => {
        setSelectedSantri(null)
        setTagihanSantri([])
        setPembayaranHistory([])
        setSearchSantri('')
    }

    // Tagihan grouping logic (memperhitungkan cicilan dan sisa tagihan)
    const belumLunas = tagihanSantri.filter(t => !t.isLunas)
    const sudahLunas = tagihanSantri.filter(t => t.isLunas)
    const totalBelumLunas = belumLunas.reduce((sum, t) => sum + t.sisa, 0)

    // Toggle tagihan selection
    const toggleTagihanSelection = (id) => {
        setSelectedTagihanIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    // Select all unpaid
    const selectAllUnpaid = () => {
        setSelectedTagihanIds(belumLunas.map(t => t.id))
    }

    // Get selected tagihan (berdasarkan sisa tagihan)
    const selectedTagihan = tagihanSantri.filter(t => selectedTagihanIds.includes(t.id))
    const totalSelected = selectedTagihan.reduce((sum, t) => sum + t.sisa, 0)

    // Helper untuk membersihkan keterangan agar tidak dobel nama kategori
    const formatKeteranganRiwayat = (keterangan, kategoriNama) => {
        if (!keterangan) return null
        let str = keterangan.trim()
        if (!str) return null

        const isCicilan = str.toLowerCase().includes('cicilan') || str.toLowerCase().includes('sebagian')

        // Bersihkan nama kategori dari teks keterangan
        let clean = str
            .replace(new RegExp(`^${kategoriNama}\\s*`, 'i'), '')
            .replace(/\(pelunasan tagihan\)/gi, '')
            .replace(/\(pembayaran sebagian \(cicilan\)\)/gi, '')
            .replace(/pembayaran sebagian \(cicilan\)/gi, '')
            .replace(/pelunasan tagihan/gi, '')
            .trim()

        clean = clean.replace(/^[,\s\-•()]+|[,\s\-•()]+$/g, '').trim()

        // Jika hanya berisi daftar nama kategori (contoh: "SPP BULANAN, UANG MAKAN")
        const kategoriKeywords = ['spp', 'uang makan', 'infaq', 'gedung', 'seragam', 'pendaftaran', 'bulanan']
        const words = clean.toLowerCase().split(/[,\s]+/).filter(Boolean)
        const onlyCategories = words.length > 0 && words.every(w => kategoriKeywords.some(k => k.includes(w) || w.includes(k)))

        const customNote = onlyCategories ? '' : clean

        return {
            isCicilan,
            customNote
        }
    }

    // Open payment modal
    const handleOpenPayment = () => {
        if (selectedTagihanIds.length === 0) {
            showToast.error('Pilih tagihan yang akan dibayar')
            return
        }
        setForm({
            jumlah: totalSelected.toString(),
            tanggal: new Date().toISOString().split('T')[0],
            metode: 'Tunai',
            keterangan: ''
        })
        setShowPaymentModal(true)
    }

    // Submit payment for selected tagihan
    // Modals State
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        const jumlahBayar = parseFloat(form.jumlah)
        if (isNaN(jumlahBayar) || jumlahBayar <= 0) {
            showToast.error('Nominal pembayaran harus lebih dari 0')
            return
        }
        if (jumlahBayar > totalSelected) {
            showToast.error(`Nominal pembayaran melebihi sisa tagihan (Maksimal Rp ${totalSelected.toLocaleString('id-ID')})`)
            return
        }
        setSaveModal({ isOpen: true })
    }

    const executePayment = async () => {
        setSaving(true)
        try {
            const jumlahBayar = parseFloat(form.jumlah)
            let remainingToDistribute = jumlahBayar

            // Alokasi pembayaran secara waterfall (berdasarkan sisa tagihan per item)
            for (const tagihan of selectedTagihan) {
                if (remainingToDistribute <= 0) break

                const amountForThis = Math.min(remainingToDistribute, tagihan.sisa)
                remainingToDistribute -= amountForThis

                const isCicilanThis = amountForThis < tagihan.sisa
                const userNote = form.keterangan?.trim()
                let itemKeterangan = ''
                if (userNote) {
                    itemKeterangan = isCicilanThis ? `${userNote} (Cicilan)` : userNote
                } else if (isCicilanThis) {
                    itemKeterangan = 'Cicilan'
                }

                // 1. Catat ke tabel pembayaran_santri
                const { error: insertError } = await supabase.from('pembayaran_santri').insert([{
                    tagihan_id: tagihan.id,
                    santri_id: selectedSantri.id,
                    jumlah: amountForThis,
                    tanggal: form.tanggal,
                    metode: form.metode,
                    keterangan: itemKeterangan || null,
                    created_by: user?.id
                }])
                if (insertError) throw insertError

                // 2. Hitung status baru secara kumulatif
                const newTotalPaid = tagihan.terbayar + amountForThis
                const newStatus = newTotalPaid >= tagihan.nominal_tagihan ? 'Lunas' : 'Sebagian'

                const { error: updateError } = await supabase.from('tagihan_santri').update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                }).eq('id', tagihan.id)
                if (updateError) throw updateError
            }

            // Audit Log - CREATE (payment)
            const isPartialGlobal = jumlahBayar < totalSelected
            const logType = isPartialGlobal ? ' [Cicilan/Sebagian]' : ' [Pelunasan]'
            await logCreate(
                'pembayaran_santri',
                selectedSantri?.nama,
                `Pembayaran santri: ${selectedSantri?.nama} - ${selectedTagihan.map(t => t.kategori?.nama).join(', ')} - Rp ${Number(jumlahBayar).toLocaleString('id-ID')} (${form.metode})${logType}`
            )

            setLastPayment({
                jumlah: jumlahBayar,
                tanggal: form.tanggal,
                metode: form.metode,
                items: selectedTagihan,
                isPartial: isPartialGlobal,
                sisaSetelahBayar: Math.max(0, totalSelected - jumlahBayar)
            })

            setSaveModal({ isOpen: false })
            setShowPaymentModal(false)
            setShowSuccessModal(true)
            await fetchTagihanSantri(selectedSantri.id)
            showToast.success(isPartialGlobal ? 'Pembayaran cicilan berhasil disimpan!' : 'Pembayaran pelunasan berhasil disimpan!')
        } catch (err) {
            showToast.error('Gagal memproses pembayaran: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    // Send WhatsApp for all unpaid (grouped)
    const handleSendGroupedWA = () => {
        const phone = selectedSantri?.no_telp_wali
        if (!phone) {
            showToast.error('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const message = createMessage({
            intro: `TAGIHAN SANTRI`,
            data: [
                `Santri: *${selectedSantri.nama}* (${selectedSantri.nis})`,
                `Berikut daftar tagihan yang harus dibayar:`,
                ...belumLunas.map(t => t.isSebagian 
                    ? `• ${t.kategori?.nama}: Sisa Rp ${Number(t.sisa).toLocaleString('id-ID')} (dari Total Rp ${Number(t.nominal_tagihan).toLocaleString('id-ID')})`
                    : `• ${t.kategori?.nama}: Rp ${Number(t.nominal_tagihan).toLocaleString('id-ID')}`
                ),
                { label: 'Total Belum Lunas', value: `Rp ${totalBelumLunas.toLocaleString('id-ID')}` }
            ],
            closing: "Mohon untuk segera melakukan pembayaran."
        })

        sendWhatsApp(phone, message)
        showToast.success('WhatsApp siap dikirim')
    }

    // Send confirmation WhatsApp
    const handleSendKonfirmasiWA = () => {
        const phone = selectedSantri?.no_telp_wali
        if (!phone) {
            showToast.error('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const isPartial = lastPayment?.isPartial
        const sisa = lastPayment?.sisaSetelahBayar || 0

        const message = createMessage({
            intro: isPartial ? `KONFIRMASI PEMBAYARAN CICILAN / ANGSURAN` : `KONFIRMASI PEMBAYARAN LUNAS`,
            data: [
                `Santri: *${selectedSantri.nama}*`,
                `Pembayaran telah kami terima untuk:`,
                ...lastPayment.items.map(t => `• ${t.kategori?.nama}`),
                { label: 'Jumlah Dibayar', value: `Rp ${Number(lastPayment.jumlah).toLocaleString('id-ID')}` },
                { label: 'Metode', value: lastPayment.metode },
                { label: 'Tanggal', value: formatDate(lastPayment.tanggal) },
                { label: 'Status Tagihan', value: isPartial ? `SEBAGIAN (Sisa Rp ${Number(sisa).toLocaleString('id-ID')})` : 'LUNAS ✅' }
            ],
            closing: isPartial
                ? `Mohon untuk melunasi sisa tagihan sebesar Rp ${Number(sisa).toLocaleString('id-ID')} sebelum jatuh tempo. Jazakumullah khairan.`
                : "Jazakumullah khairan katsiran atas pembayarannya."
        })

        sendWhatsApp(phone, message)
        showToast.success('WhatsApp konfirmasi siap dikirim')
    }

    // Print receipt
    const handlePrintKwitansi = () => {
        const isPartial = lastPayment?.isPartial
        const sisa = lastPayment?.sisaSetelahBayar || 0
        const periodeStr = formatDate(lastPayment.tanggal, { day: undefined, month: 'long', year: 'numeric' })

        generateKwitansiPDF({
            nomorKwitansi: `KW-${Date.now().toString().slice(-8)}`,
            tanggal: lastPayment.tanggal,
            namaSantri: selectedSantri?.nama,
            namaWali: selectedSantri?.nama_wali || '-',
            kategori: `${lastPayment.items.map(t => t.kategori?.nama).join(', ')}${isPartial ? ' (Cicilan / Sebagian)' : ''}`,
            periode: periodeStr,
            jumlah: lastPayment.jumlah,
            metode: lastPayment.metode,
            formattedTanggal: formatDate(lastPayment.tanggal),
            kasir: 'Bendahara PTQA',
            status: isPartial ? 'SEBAGIAN / CICILAN' : 'LUNAS',
            sisaTagihan: isPartial ? sisa : 0,
            keterangan: isPartial ? `Sisa tagihan: Rp ${Number(sisa).toLocaleString('id-ID')}` : 'Lunas'
        })
        showToast.success('Kwitansi berhasil dicetak')
    }

    // ======= LUNAS SECTION HANDLERS =======

    // Send WA for all lunas (global)
    const handleSendLunasWAGlobal = () => {
        const phone = selectedSantri?.no_telp_wali
        if (!phone) {
            showToast.error('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const message = createMessage({
            intro: `STATUS LUNAS`,
            data: [
                `Santri: *${selectedSantri.nama}* (${selectedSantri.nis})`,
                `Konfirmasi tagihan yang SUDAH LUNAS:`,
                ...sudahLunas.map(t => `✅ ${t.kategori?.nama} (Rp ${Number(t.jumlah).toLocaleString('id-ID')})`),
                { label: 'Total Lunas', value: `Rp ${sudahLunas.reduce((sum, t) => sum + Number(t.jumlah), 0).toLocaleString('id-ID')}` }
            ]
        })

        sendWhatsApp(phone, message)
        showToast.success('WhatsApp konfirmasi lunas siap dikirim')
    }

    // Send WA for single lunas item
    const handleSendLunasWASingle = (tagihan) => {
        const phone = selectedSantri?.no_telp_wali
        if (!phone) {
            showToast.error('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const message = createMessage({
            intro: `KONFIRMASI LUNAS`,
            data: [
                `Santri: *${selectedSantri.nama}*`,
                { label: 'Item', value: tagihan.kategori?.nama },
                { label: 'Nominal', value: `Rp ${Number(tagihan.jumlah).toLocaleString('id-ID')}` },
                { label: 'Status', value: 'LUNAS ✅' }
            ]
        })

        sendWhatsApp(phone, message)
        showToast.success('WhatsApp konfirmasi lunas siap dikirim')
    }

    // Download PDF for all lunas
    const handleDownloadLunasGlobal = () => {
        generateLaporanPDF({
            title: `Rekap Tagihan Lunas - ${selectedSantri?.nama}`,
            subtitle: `NIS: ${selectedSantri?.nis} | Kelas: ${selectedSantri?.kelas?.nama || '-'}`,
            columns: ['Kategori', 'Jumlah', 'Status'],
            data: sudahLunas.map(t => [
                t.kategori?.nama || '-',
                `Rp ${Number(t.jumlah).toLocaleString('id-ID')}`,
                'Lunas'
            ]),
            filename: `rekap_lunas_${selectedSantri?.nis}`,
            showTotal: true,
            totalLabel: 'Total Lunas',
            totalValue: sudahLunas.reduce((sum, t) => sum + Number(t.jumlah), 0),
            printedAt: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        })
        showToast.success('Laporan lunas berhasil didownload')
    }

    // Print kwitansi for single lunas
    const handlePrintLunasSingle = (tagihan) => {
        // Get periode from jatuh_tempo
        const periodeStr = formatDate(tagihan.jatuh_tempo, { day: undefined, month: 'long', year: 'numeric' }) // Still depends on mode, but usually periode is Masehi? "Desember 2024". useCalendar formatDate handles full string.
        // Actually for Periode string like "Desember 2024", formatDate returns full date.
        // Let's stick to Masehi for Periode grouping label if database is monthly based?
        // But the code used `toLocaleDateString`.
        // Let's us `formatDate` for consistency if we want Dual Mode.
        // But `periode` in Kwitansi usually "Bulan X".
        // Let's keep `periodeStr` as matches the mode.

        generateKwitansiPDF({
            nomorKwitansi: `KW-${tagihan.id.slice(-8)}`,
            tanggal: new Date().toISOString().split('T')[0],
            namaSantri: selectedSantri?.nama,
            namaWali: selectedSantri?.nama_wali || '-',
            kategori: tagihan.kategori?.nama,
            periode: periodeStr,
            jumlah: tagihan.jumlah,
            formattedTanggal: formatDate(new Date()),
            metode: 'Tunai',
            kasir: 'Bendahara PTQA'
        })
        showToast.success('Kwitansi berhasil dicetak')
    }

    // ======= HISTORY SECTION HANDLERS =======

    // Send WA for all history (global)
    const handleSendHistoryWAGlobal = () => {
        const phone = selectedSantri?.no_telp_wali
        if (!phone) {
            showToast.error('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const message = createMessage({
            intro: `RIWAYAT PEMBAYARAN`,
            data: [
                `Santri: *${selectedSantri.nama}* (${selectedSantri.nis})`,
                `Berikut riwayat pembayaran yang tercatat:`,
                ...pembayaranHistory.map(p => {
                    const periodeStr = p.tagihan?.jatuh_tempo ? ` (Periode ${formatDate(p.tagihan.jatuh_tempo, { month: 'long', year: 'numeric' })})` : ''
                    return `• ${formatDate(p.tanggal)}: ${p.tagihan?.kategori?.nama || '-'}${periodeStr} - Rp ${Number(p.jumlah).toLocaleString('id-ID')}`
                }),
                { label: 'Total Tercatat', value: `Rp ${pembayaranHistory.reduce((sum, p) => sum + Number(p.jumlah), 0).toLocaleString('id-ID')}` }
            ]
        })

        sendWhatsApp(phone, message)
        showToast.success('WhatsApp riwayat siap dikirim')
    }

    // Send WA for single history item
    const handleSendHistoryWASingle = (pembayaran) => {
        const phone = selectedSantri?.no_telp_wali
        if (!phone) {
            showToast.error('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const periodeTagihan = pembayaran.tagihan?.jatuh_tempo ? formatDate(pembayaran.tagihan.jatuh_tempo, { month: 'long', year: 'numeric' }) : '-'

        const message = createMessage({
            intro: `BUKTI PEMBAYARAN`,
            data: [
                `Santri: *${selectedSantri.nama}*`,
                { label: 'Tanggal Bayar', value: formatDate(pembayaran.tanggal) },
                { label: 'Kategori', value: pembayaran.tagihan?.kategori?.nama || '-' },
                { label: 'Periode Tagihan', value: periodeTagihan },
                { label: 'Jumlah', value: `Rp ${Number(pembayaran.jumlah).toLocaleString('id-ID')}` },
                { label: 'Metode', value: pembayaran.metode },
                ...(pembayaran.keterangan ? [{ label: 'Keterangan', value: pembayaran.keterangan }] : [])
            ]
        })

        sendWhatsApp(phone, message)
        showToast.success('WhatsApp riwayat siap dikirim')
    }

    // Download PDF for all history
    const handleDownloadHistoryGlobal = () => {
        generateLaporanPDF({
            title: `Riwayat Pembayaran - ${selectedSantri?.nama}`,
            subtitle: `NIS: ${selectedSantri?.nis} | Kelas: ${selectedSantri?.kelas?.nama || '-'}`,
            columns: ['Tanggal Bayar', 'Kategori', 'Periode', 'Jumlah', 'Metode', 'Keterangan'],
            data: pembayaranHistory.map(p => [
                formatDate(p.tanggal),
                p.tagihan?.kategori?.nama || '-',
                p.tagihan?.jatuh_tempo ? formatDate(p.tagihan.jatuh_tempo, { month: 'long', year: 'numeric' }) : '-',
                `Rp ${Number(p.jumlah).toLocaleString('id-ID')}`,
                p.metode || 'Tunai',
                p.keterangan || '-'
            ]),
            filename: `riwayat_pembayaran_${selectedSantri?.nis}`,
            showTotal: true,
            totalLabel: 'Total Pembayaran',
            totalValue: pembayaranHistory.reduce((sum, p) => sum + Number(p.jumlah), 0),
            printedAt: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        })
        showToast.success('Laporan riwayat berhasil didownload')
    }

    // Print kwitansi for single history
    const handlePrintHistorySingle = (pembayaran) => {
        // Ambil data tagihan terkait dari daftar tagihanSantri
        const tagihan = tagihanSantri.find(t => t.id === pembayaran.tagihan_id)
        const isPartial = tagihan ? tagihan.isSebagian : (pembayaran.keterangan?.toLowerCase().includes('cicilan') || pembayaran.keterangan?.toLowerCase().includes('sebagian'))
        const sisa = tagihan?.sisa || 0

        // Get periode from tagihan's jatuh_tempo if available, else from payment date
        const targetDate = pembayaran.tagihan?.jatuh_tempo || pembayaran.tanggal
        const periodeStr = formatDate(targetDate, { day: undefined, month: 'long', year: 'numeric' })

        generateKwitansiPDF({
            nomorKwitansi: `KW-${pembayaran.id.slice(-8)}`,
            tanggal: pembayaran.tanggal,
            namaSantri: selectedSantri?.nama,
            namaWali: selectedSantri?.nama_wali || '-',
            kategori: `${pembayaran.tagihan?.kategori?.nama || '-'}${isPartial ? ' (Cicilan / Sebagian)' : ''}`,
            periode: periodeStr,
            jumlah: pembayaran.jumlah,
            formattedTanggal: formatDate(pembayaran.tanggal),
            metode: pembayaran.metode,
            kasir: 'Bendahara PTQA',
            status: isPartial ? 'SEBAGIAN / CICILAN' : 'LUNAS',
            sisaTagihan: isPartial ? sisa : 0,
            keterangan: pembayaran.keterangan || (isPartial ? `Sisa tagihan: Rp ${Number(sisa).toLocaleString('id-ID')}` : 'Lunas')
        })
        showToast.success('Kwitansi berhasil dicetak')
    }

    const isOverdue = (jatuhTempo) => new Date(jatuhTempo) < new Date()

    // Open edit modal for payment correction
    const handleOpenEditPayment = (payment) => {
        setEditingPayment(payment)
        setEditForm({
            jumlah: payment.jumlah.toString(),
            tanggal: payment.tanggal,
            metode: payment.metode || 'Tunai',
            keterangan: payment.keterangan || ''
        })
        setShowEditModal(true)
    }

    // Handle edit payment form submit
    const handleEditFormSubmit = (e) => {
        e.preventDefault()
        setEditSaveModal({ isOpen: true })
    }

    // Execute payment edit/correction
    const executeEditPayment = async () => {
        setSaving(true)
        try {
            const oldAmount = Number(editingPayment.jumlah)
            const newAmount = parseFloat(editForm.jumlah)
            const tagihanId = editingPayment.tagihan_id

            // Safety check for tagihan_id
            if (!tagihanId) {
                throw new Error('Data tagihan tidak ditemukan. Silakan refresh halaman dan coba lagi.')
            }

            // Update pembayaran record
            const { error: updateError } = await supabase
                .from('pembayaran_santri')
                .update({
                    jumlah: newAmount,
                    tanggal: editForm.tanggal,
                    metode: editForm.metode,
                    keterangan: editForm.keterangan
                })
                .eq('id', editingPayment.id)

            if (updateError) throw updateError

            // Recalculate tagihan status based on all payments
            const { data: allPayments, error: payError } = await supabase
                .from('pembayaran_santri')
                .select('jumlah')
                .eq('tagihan_id', tagihanId)

            if (payError) throw payError

            // Get tagihan details
            const { data: tagihan, error: tagError } = await supabase
                .from('tagihan_santri')
                .select('jumlah')
                .eq('id', tagihanId)
                .single()

            if (tagError) throw tagError

            const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.jumlah), 0)
            const tagihanAmount = Number(tagihan.jumlah)

            // Determine new status
            let newStatus = 'Belum Lunas'
            if (totalPaid >= tagihanAmount) {
                newStatus = 'Lunas'
            } else if (totalPaid > 0) {
                newStatus = 'Sebagian'
            }

            // Update tagihan status
            const { error: statusError } = await supabase
                .from('tagihan_santri')
                .update({ status: newStatus })
                .eq('id', tagihanId)

            if (statusError) throw statusError

            // Audit Log - UPDATE (non-blocking)
            try {
                await logUpdate(
                    'pembayaran_santri',
                    selectedSantri?.nama || 'Unknown',
                    `Koreksi pembayaran: ${selectedSantri?.nama} - ${editingPayment.tagihan?.kategori?.nama} - Rp ${oldAmount.toLocaleString('id-ID')} → Rp ${newAmount.toLocaleString('id-ID')}`,
                    { jumlah: oldAmount, tanggal: editingPayment.tanggal, metode: editingPayment.metode },
                    { jumlah: newAmount, tanggal: editForm.tanggal, metode: editForm.metode }
                )
            } catch {
                // Audit log failed - non-critical, silently ignore
            }

            // Refresh data
            await fetchTagihanSantri(selectedSantri.id)

            setEditSaveModal({ isOpen: false })
            setShowEditModal(false)
            setEditingPayment(null)
            showToast.success('Koreksi pembayaran berhasil disimpan!')
        } catch (err) {
            showToast.error('Gagal menyimpan koreksi: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="keuangan-page space-y-6">
            <PageHeader
                title="Pembayaran Santri"
                description="Cari santri dan kelola pembayaran tagihan serta cicilan"
                actions={
                    selectedSantri && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchTagihanSantri(selectedSantri.id)}
                            disabled={loadingTagihan}
                        >
                            <RefreshCw size={14} className={loadingTagihan ? 'animate-spin' : ''} />
                            Refresh Data
                        </Button>
                    )
                }
            />

            {/* Santri Search / Profil Card */}
            {selectedSantri ? (
                <Card className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-emerald-200 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
                                {selectedSantri.nama.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate tracking-tight">
                                        {selectedSantri.nama}
                                    </h2>
                                    {selectedSantri.status && (
                                        <Badge variant={selectedSantri.status === 'Aktif' ? 'success' : 'danger'}>
                                            {selectedSantri.status}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 truncate">
                                    NIS: <span className="font-mono font-semibold">{selectedSantri.nis}</span> • Kelas: {selectedSantri.kelas?.nama || '-'} {selectedSantri.halaqoh?.nama ? `• Halaqoh: ${selectedSantri.halaqoh.nama}` : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClearSantri}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all active:scale-95 shrink-0"
                            title="Ganti Santri"
                        >
                            <X size={15} />
                            <span className="hidden sm:inline">Ganti Santri</span>
                        </button>
                    </div>
                </Card>
            ) : (
                <Card className="p-4 sm:p-6 overflow-visible relative z-30">
                    <div className="relative max-w-2xl mx-auto" ref={dropdownRef}>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            Pencarian Data Santri
                        </label>
                        <div className="relative">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-10 py-3 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400 font-medium"
                                placeholder="Ketik nama atau NIS santri untuk mencari..."
                                value={searchSantri}
                                onChange={(e) => setSearchSantri(e.target.value)}
                                onFocus={() => {
                                    if (searchSantri.trim().length >= 2) {
                                        setShowSantriDropdown(true)
                                        if (santriList.length === 0 && !loading) {
                                            fetchSantri(searchSantri.trim())
                                        }
                                    }
                                }}
                            />
                            {loading && (
                                <RefreshCw size={16} className="animate-spin text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                            )}
                            {searchSantri && !loading && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchSantri(''); setSantriList([]); setShowSantriDropdown(false); }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {showSantriDropdown && (searchSantri.trim().length >= 2) && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto z-50 divide-y divide-gray-100">
                                {loading && santriList.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                                        <RefreshCw size={16} className="animate-spin text-emerald-600" />
                                        <span>Mencari santri...</span>
                                    </div>
                                ) : santriList.length > 0 ? (
                                    santriList.map(santri => (
                                        <div
                                            key={santri.id}
                                            className="p-3.5 flex items-center justify-between hover:bg-emerald-50/70 cursor-pointer transition-colors"
                                            onClick={() => handleSelectSantri(santri)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-200">
                                                    {santri.nama?.charAt(0) || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm truncate">{santri.nama}</div>
                                                    <div className="text-xs text-gray-500 font-medium truncate">
                                                        NIS: <span className="font-mono">{santri.nis}</span> • Kelas: {santri.kelas?.nama || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            {santri.status && (
                                                <Badge variant={santri.status === 'Aktif' ? 'success' : 'danger'}>
                                                    {santri.status}
                                                </Badge>
                                            )}
                                        </div>
                                    ))
                                ) : !loading ? (
                                    <div className="p-6 text-center text-gray-500 text-sm">
                                        Tidak ditemukan santri dengan nama atau NIS "{searchSantri}"
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Content when santri selected */}
            {selectedSantri && (
                <div className="space-y-6">
                    {loadingTagihan ? (
                        <div className="py-12 flex justify-center">
                            <Spinner label="Memuat data tagihan & pembayaran santri..." />
                        </div>
                    ) : (
                        <>
                            {/* Unpaid Section */}
                            {belumLunas.length > 0 && (
                                <Card>
                                    <CardHeader
                                        actions={
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={selectAllUnpaid}
                                                    className="flex-1 sm:flex-initial"
                                                >
                                                    <Layers size={14} />
                                                    Pilih Semua
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={handleSendGroupedWA}
                                                    className="flex-1 sm:flex-initial !bg-[#25D366] hover:!bg-[#1ebd59] !text-white !border-none !shadow-sm"
                                                >
                                                    <MessageCircle size={14} />
                                                    Kirim WA Semua
                                                </Button>
                                            </div>
                                        }
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                                <AlertCircle size={18} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-rose-700">Tagihan Belum Lunas</CardTitle>
                                                <CardDescription>{belumLunas.length} tagihan aktif</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-100 flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">Total Belum Lunas</span>
                                                    <span className="text-xl sm:text-2xl font-black font-mono text-rose-700 mt-1 block">
                                                        Rp {totalBelumLunas.toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0">
                                                    <AlertCircle size={20} />
                                                </div>
                                            </div>

                                            {selectedTagihanIds.length > 0 && (
                                                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                                                            Dipilih ({selectedTagihanIds.length} Tagihan)
                                                        </span>
                                                        <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800 mt-1 block">
                                                            Rp {totalSelected.toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                        <Check size={20} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Checklist Items */}
                                        <div className="space-y-2.5">
                                            {belumLunas.map(tagihan => {
                                                const isSelected = selectedTagihanIds.includes(tagihan.id)
                                                const overdue = isOverdue(tagihan.jatuh_tempo)
                                                return (
                                                    <div
                                                        key={tagihan.id}
                                                        onClick={() => toggleTagihanSelection(tagihan.id)}
                                                        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                                                            isSelected
                                                                ? 'bg-emerald-50/40 border-emerald-500 shadow-sm'
                                                                : overdue
                                                                ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
                                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                                            isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                                                        }`}>
                                                            {isSelected && <Check size={13} strokeWidth={3} />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-sm sm:text-base text-gray-900">{tagihan.kategori?.nama}</span>
                                                                    {tagihan.jatuh_tempo && (
                                                                        <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                                                            Periode: {formatDate(tagihan.jatuh_tempo, { month: 'long', year: 'numeric' })}
                                                                        </span>
                                                                    )}
                                                                    {tagihan.isSebagian && (
                                                                        <span className="text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                                                            Dicicil {tagihan.persen_terbayar}%
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="text-left sm:text-right">
                                                                    {tagihan.isSebagian ? (
                                                                        <div>
                                                                            <span className="text-sm sm:text-base font-black font-mono text-amber-700">
                                                                                Sisa: Rp {tagihan.sisa.toLocaleString('id-ID')}
                                                                            </span>
                                                                            <span className="text-[11px] text-gray-500 font-medium block">
                                                                                Total: Rp {tagihan.nominal_tagihan.toLocaleString('id-ID')}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-sm sm:text-base font-black font-mono text-gray-900">
                                                                            Rp {Number(tagihan.jumlah).toLocaleString('id-ID')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                                                                <span>Jatuh tempo: {formatDate(tagihan.jatuh_tempo)}</span>
                                                                {tagihan.isSebagian && (
                                                                    <span>• Terbayar: Rp {tagihan.terbayar.toLocaleString('id-ID')}</span>
                                                                )}
                                                                {overdue && (
                                                                    <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] uppercase">
                                                                        Terlambat
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {tagihan.isSebagian && (
                                                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                                                                    <div
                                                                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                                                                        style={{ width: `${tagihan.persen_terbayar}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {selectedTagihanIds.length > 0 && (
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                onClick={handleOpenPayment}
                                                className="w-full !rounded-xl !py-3.5 sm:!py-4 text-sm font-bold shadow-lg"
                                            >
                                                <CreditCard size={18} />
                                                Bayar {selectedTagihanIds.length} Tagihan Terpilih (Rp {totalSelected.toLocaleString('id-ID')})
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {belumLunas.length === 0 && (
                                <Card className="p-8 text-center bg-emerald-50/40 border-emerald-200">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-900">Semua Tagihan Sudah Lunas</h3>
                                    <p className="text-sm text-emerald-700 mt-1">Santri ini tidak memiliki tunggakan tagihan aktif.</p>
                                </Card>
                            )}

                            {/* Paid Section */}
                            {sudahLunas.length > 0 && (
                                <Card>
                                    <CardHeader
                                        actions={
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                                    onClick={handleSendLunasWAGlobal}
                                                    title="Kirim WA Semua Tagihan Lunas"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button
                                                    className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    onClick={handleDownloadLunasGlobal}
                                                    title="Download PDF Tagihan Lunas"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg ml-1">
                                                    <button
                                                        className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'grouped' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'text-gray-500'}`}
                                                        onClick={() => setViewMode('grouped')}
                                                        title="Tampilan Grup"
                                                    >
                                                        <Layers size={14} />
                                                    </button>
                                                    <button
                                                        className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'individual' ? 'bg-white shadow-sm text-gray-900 font-bold' : 'text-gray-500'}`}
                                                        onClick={() => setViewMode('individual')}
                                                        title="Tampilan Rinci"
                                                    >
                                                        <List size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        }
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                <CheckCircle size={18} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-emerald-800">Tagihan Lunas</CardTitle>
                                                <CardDescription>{sudahLunas.length} tagihan telah terselesaikan</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white mb-4 flex items-center justify-between shadow-sm">
                                            <div>
                                                <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider block">Total Lunas</span>
                                                <span className="text-xl sm:text-2xl font-black font-mono mt-1 block">
                                                    Rp {sudahLunas.reduce((sum, t) => sum + Number(t.jumlah), 0).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-200 flex items-center justify-center shrink-0">
                                                <CheckCircle size={22} />
                                            </div>
                                        </div>

                                        {viewMode === 'grouped' ? (
                                            <div className="flex flex-wrap gap-2">
                                                {sudahLunas.map(t => (
                                                    <span
                                                        key={t.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold"
                                                    >
                                                        <Check size={12} className="text-emerald-600" />
                                                        {t.kategori?.nama} {t.jatuh_tempo ? `(${formatDate(t.jatuh_tempo, { month: 'short', year: 'numeric' })})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {sudahLunas.map(tagihan => (
                                                    <div key={tagihan.id} className="p-3 sm:p-3.5 bg-gray-50/60 border border-gray-100 rounded-xl flex items-center justify-between gap-3">
                                                        <div>
                                                            <div className="font-bold text-sm text-gray-900">{tagihan.kategori?.nama}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {tagihan.jatuh_tempo ? `Periode: ${formatDate(tagihan.jatuh_tempo, { month: 'long', year: 'numeric' })}` : ''}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono font-bold text-sm text-gray-800">
                                                                Rp {Number(tagihan.jumlah).toLocaleString('id-ID')}
                                                            </span>
                                                            <Badge variant="success">Lunas</Badge>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                    onClick={() => handleSendLunasWASingle(tagihan)}
                                                                    title="Kirim WA"
                                                                >
                                                                    <MessageCircle size={15} />
                                                                </button>
                                                                <button
                                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    onClick={() => handlePrintLunasSingle(tagihan)}
                                                                    title="Cetak Kwitansi"
                                                                >
                                                                    <Printer size={15} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Payment History */}
                            {pembayaranHistory.length > 0 && (
                                <Card>
                                    <CardHeader
                                        actions={
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                                    onClick={handleSendHistoryWAGlobal}
                                                    title="Kirim WA Semua Riwayat"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button
                                                    className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    onClick={handleDownloadHistoryGlobal}
                                                    title="Download PDF Riwayat"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        }
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <CreditCard size={18} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-blue-900">Riwayat Pembayaran</CardTitle>
                                                <CardDescription>{pembayaranHistory.length} transaksi tercatat</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2.5">
                                        {pembayaranHistory.map(p => {
                                            const periodeTagihan = p.tagihan?.jatuh_tempo
                                                ? formatDate(p.tagihan.jatuh_tempo, { month: 'long', year: 'numeric' })
                                                : null
                                            const noteInfo = formatKeteranganRiwayat(p.keterangan, p.tagihan?.kategori?.nama)
                                            return (
                                                <div
                                                    key={p.id}
                                                    className="p-3.5 sm:p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                                                >
                                                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 flex flex-col items-center justify-center shrink-0">
                                                            <Calendar size={13} className="text-gray-400" />
                                                            <span className="text-[10px] font-bold text-gray-700 mt-0.5">
                                                                {new Date(p.tanggal).getDate()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-sm sm:text-base text-gray-900">
                                                                    {p.tagihan?.kategori?.nama || '-'}
                                                                </span>
                                                                {periodeTagihan && (
                                                                    <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                                                        Periode: {periodeTagihan}
                                                                    </span>
                                                                )}
                                                                <Badge variant="neutral">{p.metode || 'Tunai'}</Badge>
                                                            </div>

                                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                                                                <span>Tgl Bayar: {formatDate(p.tanggal)}</span>
                                                                {noteInfo?.customNote && (
                                                                    <span className="italic text-gray-600 font-medium">
                                                                        • {noteInfo.customNote}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                                        <div className="text-left sm:text-right">
                                                            <div className="flex items-center gap-1.5 sm:justify-end">
                                                                <span className="text-base sm:text-lg font-black font-mono text-emerald-600">
                                                                    Rp {Number(p.jumlah).toLocaleString('id-ID')}
                                                                </span>
                                                                {noteInfo?.isCicilan && (
                                                                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                                                                        Cicilan
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                className="p-1.5 sm:p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                onClick={() => handleOpenEditPayment(p)}
                                                                title="Edit/Koreksi"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button
                                                                className="p-1.5 sm:p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                onClick={() => handleSendHistoryWASingle(p)}
                                                                title="Kirim WA"
                                                            >
                                                                <MessageCircle size={15} />
                                                            </button>
                                                            <button
                                                                className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                onClick={() => handlePrintHistorySingle(p)}
                                                                title="Cetak Kwitansi"
                                                            >
                                                                <Printer size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!selectedSantri && (
                <EmptyState
                    icon={User}
                    title="Cari & Pilih Santri"
                    message="Ketik nama atau NIS santri pada kolom pencarian di atas untuk melihat rincian tagihan dan melakukan pembayaran."
                />
            )}

            {/* Payment Modal */}
            {showPaymentModal && typeof document !== 'undefined' && createPortal(
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>💳 Bayar {selectedTagihanIds.length} Tagihan</h3>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="payment-info-card" style={{ padding: '12px 16px', marginBottom: '14px' }}>
                                    <div className="payment-info-row" style={{ padding: '6px 0' }}>
                                        <span>Santri</span>
                                        <strong>{selectedSantri?.nama}</strong>
                                    </div>
                                    <div className="payment-info-row" style={{ padding: '6px 0' }}>
                                        <span>Tagihan</span>
                                        <strong>{selectedTagihan.map(t => t.kategori?.nama).join(', ')}</strong>
                                    </div>
                                    <div className="payment-info-row highlight" style={{ marginTop: '6px', padding: '8px 12px' }}>
                                        <span>Total Sisa Tagihan</span>
                                        <strong>Rp {totalSelected.toLocaleString('id-ID')}</strong>
                                    </div>
                                </div>

                                <div className="form-row" style={{ gap: '14px', alignItems: 'flex-start' }}>
                                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ margin: 0 }}>Jumlah Bayar (Rp) *</label>
                                            {Number(form.jumlah) !== totalSelected && (
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, jumlah: String(totalSelected) })}
                                                    style={{ background: 'none', border: 'none', color: '#059669', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                >
                                                    Bayar Lunas Sisa (Rp {totalSelected.toLocaleString('id-ID')})
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            value={form.jumlah}
                                            onChange={e => setForm({ ...form, jumlah: e.target.value })}
                                            min="1"
                                            max={totalSelected}
                                            required
                                            placeholder="Masukkan nominal bayar..."
                                        />
                                        {Number(form.jumlah) > 0 && (
                                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                                {Number(form.jumlah) === totalSelected ? (
                                                    <div style={{ color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #a7f3d0' }}>
                                                        <CheckCircle size={14} /> <span><strong>Pelunasan Penuh:</strong> Tagihan terpilih akan lunas.</span>
                                                    </div>
                                                ) : Number(form.jumlah) < totalSelected ? (
                                                    <div style={{ color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #fde68a' }}>
                                                        <AlertCircle size={14} /> <span><strong>Pembayaran Cicilan:</strong> Sisa tagihan nantinya Rp {(totalSelected - Number(form.jumlah)).toLocaleString('id-ID')}.</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #fecaca' }}>
                                                        <AlertCircle size={14} /> <span><strong>Melebihi Tagihan:</strong> Maksimal pembayaran adalah Rp {totalSelected.toLocaleString('id-ID')}.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group" style={{ width: '180px', margin: 0 }}>
                                        <label style={{ marginBottom: '6px' }}>Tanggal Bayar</label>
                                        <DateRangePicker
                                            singleDate
                                            startDate={form.tanggal}
                                            onChange={(date) => setForm({ ...form, tanggal: date })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Metode Pembayaran</label>
                                    <select value={form.metode} onChange={e => setForm({ ...form, metode: e.target.value })}>
                                        {metodeOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Keterangan (Opsional)</label>
                                    <input
                                        type="text"
                                        value={form.keterangan || ''}
                                        onChange={e => setForm({ ...form, keterangan: e.target.value })}
                                        placeholder="Catatan tambahan, contoh: Angsuran 1 / Titipan wali"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><RefreshCw size={14} className="spin" /> Memproses...</> : <><Check size={18} /> Bayar Sekarang</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Success Modal */}
            {showSuccessModal && typeof document !== 'undefined' && createPortal(
                <div className="modal-overlay active">
                    <div className="modal modal-sm">
                        <div className="modal-header">
                            <h3 className="green"><CheckCircle size={24} /> Pembayaran Berhasil</h3>
                        </div>
                        <div className="modal-body">
                            <p style={{ textAlign: 'center' }}>Pembayaran telah disimpan.</p>
                            <div className="success-actions">
                                <button className="btn btn-outline btn-block" onClick={handleSendKonfirmasiWA}>
                                    <MessageCircle size={16} /> Kirim Konfirmasi WA
                                </button>
                                <button className="btn btn-outline btn-block" onClick={handlePrintKwitansi}>
                                    <Printer size={16} /> Cetak Kwitansi
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary btn-block" onClick={() => setShowSuccessModal(false)}>Tutup</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executePayment}
                title={Number(form.jumlah) < totalSelected ? "Konfirmasi Pembayaran Cicilan" : "Konfirmasi Pelunasan Tagihan"}
                message={`Apakah Anda yakin ingin memproses pembayaran sebesar Rp ${Number(form.jumlah).toLocaleString('id-ID')}${Number(form.jumlah) < totalSelected ? ` (Cicilan/Sebagian - Sisa Rp ${(totalSelected - Number(form.jumlah)).toLocaleString('id-ID')})` : ' (Lunas)'}?`}
                confirmLabel="Bayar"
                variant={Number(form.jumlah) < totalSelected ? "warning" : "success"}
            />

            {/* Edit Payment Modal */}
            {showEditModal && typeof document !== 'undefined' && createPortal(
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>✏️ Koreksi Pembayaran</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleEditFormSubmit}>
                            <div className="modal-body">
                                <div className="payment-info-card" style={{ marginBottom: '1rem', background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                                    <div className="payment-info-row">
                                        <span>Santri</span>
                                        <strong>{selectedSantri?.nama}</strong>
                                    </div>
                                    <div className="payment-info-row">
                                        <span>Kategori</span>
                                        <strong>{editingPayment?.tagihan?.kategori?.nama || '-'}</strong>
                                    </div>
                                    <div className="payment-info-row" style={{ color: '#6b7280' }}>
                                        <span>Nominal Sebelumnya</span>
                                        <strong>Rp {Number(editingPayment?.jumlah || 0).toLocaleString('id-ID')}</strong>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Jumlah Bayar Baru (Rp) *</label>
                                    <input
                                        type="number"
                                        value={editForm.jumlah}
                                        onChange={e => setEditForm({ ...editForm, jumlah: e.target.value })}
                                        min="0"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tanggal Bayar</label>
                                    <div style={{ width: '100%' }}>
                                        <DateRangePicker
                                            singleDate
                                            startDate={editForm.tanggal}
                                            onChange={(date) => setEditForm({ ...editForm, tanggal: date })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Metode Pembayaran</label>
                                    <select value={editForm.metode} onChange={e => setEditForm({ ...editForm, metode: e.target.value })}>
                                        {metodeOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Keterangan</label>
                                    <textarea
                                        value={editForm.keterangan}
                                        onChange={e => setEditForm({ ...editForm, keterangan: e.target.value })}
                                        rows={2}
                                        placeholder="Alasan koreksi (opsional)"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><RefreshCw size={14} className="spin" /> Menyimpan...</> : <><Check size={18} /> Simpan Koreksi</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmationModal
                isOpen={editSaveModal.isOpen}
                onClose={() => setEditSaveModal({ isOpen: false })}
                onConfirm={executeEditPayment}
                title="Konfirmasi Koreksi Pembayaran"
                message={`Apakah Anda yakin ingin mengubah pembayaran dari Rp ${Number(editingPayment?.jumlah || 0).toLocaleString('id-ID')} menjadi Rp ${Number(editForm.jumlah || 0).toLocaleString('id-ID')}? Status tagihan akan dihitung ulang secara otomatis.`}
                confirmLabel="Simpan Koreksi"
                variant="warning"
            />
        </div>
    )
}

export default PembayaranSantriPage
