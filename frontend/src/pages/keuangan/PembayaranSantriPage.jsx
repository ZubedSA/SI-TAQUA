import { useState, useEffect, useRef } from 'react'
import { Search, CreditCard, Download, RefreshCw, MessageCircle, Printer, Check, User, AlertCircle, CheckCircle, ChevronDown, X, Layers, List, Edit2 } from 'lucide-react'
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

    // Search santri when typing
    useEffect(() => {
        if (searchSantri.length >= 2) {
            fetchSantri(searchSantri)
            setShowSantriDropdown(true)
        } else {
            setSantriList([])
        }
    }, [searchSantri])

    const fetchSantri = async (query) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, nama_wali, no_telp_wali, status, kelas:kelas_id(nama)')
                .or(`nama.ilike.%${query}%,nis.ilike.%${query}%`)
                .limit(10)
                .order('nama')

            if (error) {
                console.error('Supabase error:', error)
                throw error
            }
            setSantriList(data || [])
        } catch (err) {
            console.error('Error fetching santri:', err)
            showToast.error('Gagal mencari santri: ' + err.message)
            setSantriList([])
        } finally {
            setLoading(false)
        }
    }

    const fetchTagihanSantri = async (santriId) => {
        setLoadingTagihan(true)
        try {
            const [tagihanRes, pembayaranRes] = await Promise.all([
                supabase
                    .from('tagihan_santri')
                    .select('*, kategori:kategori_id(nama)')
                    .eq('santri_id', santriId)
                    .order('jatuh_tempo', { ascending: false }),
                supabase
                    .from('pembayaran_santri')
                    .select('id, tagihan_id, jumlah, tanggal, metode, keterangan, santri_id, bukti_url, created_at, tagihan:tagihan_id(id, jumlah, kategori:kategori_id(nama))')
                    .eq('santri_id', santriId)
                    .order('tanggal', { ascending: false })
                    .limit(20)
            ])

            if (tagihanRes.error) throw tagihanRes.error
            if (pembayaranRes.error) throw pembayaranRes.error

            setTagihanSantri(tagihanRes.data || [])
            setPembayaranHistory(pembayaranRes.data || [])
            setSelectedTagihanIds([]) // Reset selection
        } catch (err) {
            console.error('Error:', err.message)
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

    // Tagihan grouping logic
    const belumLunas = tagihanSantri.filter(t => t.status !== 'Lunas')
    const sudahLunas = tagihanSantri.filter(t => t.status === 'Lunas')
    const totalBelumLunas = belumLunas.reduce((sum, t) => sum + Number(t.jumlah), 0)

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

    // Get selected tagihan
    const selectedTagihan = tagihanSantri.filter(t => selectedTagihanIds.includes(t.id))
    const totalSelected = selectedTagihan.reduce((sum, t) => sum + Number(t.jumlah), 0)

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
            keterangan: selectedTagihan.map(t => t.kategori?.nama).join(', ')
        })
        setShowPaymentModal(true)
    }

    // Submit payment for selected tagihan
    // Modals State
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setSaveModal({ isOpen: true })
    }

    const executePayment = async () => {
        setSaving(true)
        console.log('[PembayaranSantri] Processing payment:', form)
        console.log('[PembayaranSantri] Mode:', mode)
        try {
            const jumlahBayar = parseFloat(form.jumlah)

            // Insert pembayaran for each selected tagihan (proportionally)
            for (const tagihan of selectedTagihan) {
                const proportion = Number(tagihan.jumlah) / totalSelected
                const amount = Math.round(jumlahBayar * proportion)

                await supabase.from('pembayaran_santri').insert([{
                    tagihan_id: tagihan.id,
                    santri_id: selectedSantri.id,
                    jumlah: amount,
                    tanggal: form.tanggal,
                    metode: form.metode,
                    keterangan: form.keterangan || '',
                    created_by: user?.id
                }])

                // Update status
                const newStatus = amount >= Number(tagihan.jumlah) ? 'Lunas' : 'Sebagian'
                await supabase.from('tagihan_santri').update({ status: newStatus }).eq('id', tagihan.id)
            }

            // Audit Log - CREATE (payment)
            await logCreate(
                'pembayaran_santri',
                selectedSantri?.nama,
                `Pembayaran santri: ${selectedSantri?.nama} - ${selectedTagihan.map(t => t.kategori?.nama).join(', ')} - Rp ${Number(jumlahBayar).toLocaleString('id-ID')} (${form.metode})`
            )

            setLastPayment({
                jumlah: jumlahBayar,
                tanggal: form.tanggal,
                metode: form.metode,
                items: selectedTagihan
            })

            setSaveModal({ isOpen: false })
            setShowPaymentModal(false)
            setShowSuccessModal(true)
            fetchTagihanSantri(selectedSantri.id)
            showToast.success('Pembayaran berhasil disimpan!')
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
                ...belumLunas.map(t => `• ${t.kategori?.nama}: Rp ${Number(t.jumlah).toLocaleString('id-ID')}`),
                { label: 'Total Tagihan', value: `Rp ${totalBelumLunas.toLocaleString('id-ID')}` }
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

        const message = createMessage({
            intro: `KONFIRMASI PEMBAYARAN`,
            data: [
                `Santri: *${selectedSantri.nama}*`,
                `Pembayaran telah kami terima untuk:`,
                ...lastPayment.items.map(t => `• ${t.kategori?.nama}`),
                { label: 'Total Nominal', value: `Rp ${Number(lastPayment.jumlah).toLocaleString('id-ID')}` },
                { label: 'Metode', value: lastPayment.metode },
                { label: 'Tanggal', value: formatDate(lastPayment.tanggal) }
            ]
        })

        sendWhatsApp(phone, message)
        showToast.success('WhatsApp konfirmasi siap dikirim')
    }

    // Print receipt
    const handlePrintKwitansi = () => {
        // Get periode from payment date
        // Use formatDate to respect mode for Month representation if desired, 
        // or just standard Hijri/Masehi string
        const periodeStr = formatDate(lastPayment.tanggal, { day: undefined, month: 'long', year: 'numeric' })

        generateKwitansiPDF({
            nomorKwitansi: `KW-${Date.now().toString().slice(-8)}`,
            tanggal: lastPayment.tanggal,
            namaSantri: selectedSantri?.nama,
            namaWali: selectedSantri?.nama_wali || '-',
            kategori: lastPayment.items.map(t => t.kategori?.nama).join(', '),
            periode: periodeStr,
            jumlah: lastPayment.jumlah,
            metode: lastPayment.metode,
            formattedTanggal: formatDate(lastPayment.tanggal),
            kasir: 'Bendahara PTQA'
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
                ...pembayaranHistory.map(p => `• ${formatDate(p.tanggal)}: ${p.tagihan?.kategori?.nama || '-'} (${Number(p.jumlah).toLocaleString('id-ID')})`),
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

        const message = createMessage({
            intro: `BUKTI PEMBAYARAN`,
            data: [
                `Santri: *${selectedSantri.nama}*`,
                { label: 'Tanggal', value: formatDate(pembayaran.tanggal) },
                { label: 'Kategori', value: pembayaran.tagihan?.kategori?.nama || '-' },
                { label: 'Jumlah', value: `Rp ${Number(pembayaran.jumlah).toLocaleString('id-ID')}` },
                { label: 'Metode', value: pembayaran.metode }
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
            columns: ['Tanggal', 'Kategori', 'Jumlah', 'Metode'],
            data: pembayaranHistory.map(p => [
                formatDate(p.tanggal),
                p.tagihan?.kategori?.nama || '-',
                `Rp ${Number(p.jumlah).toLocaleString('id-ID')}`,
                p.metode
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
        // Get periode from payment date
        const periodeStr = formatDate(pembayaran.tanggal, { day: undefined, month: 'long', year: 'numeric' })

        generateKwitansiPDF({
            nomorKwitansi: `KW-${pembayaran.id.slice(-8)}`,
            tanggal: pembayaran.tanggal,
            namaSantri: selectedSantri?.nama,
            namaWali: selectedSantri?.nama_wali || '-',
            kategori: pembayaran.tagihan?.kategori?.nama,
            periode: periodeStr,
            jumlah: pembayaran.jumlah,
            formattedTanggal: formatDate(pembayaran.tanggal),
            metode: pembayaran.metode,
            kasir: 'Bendahara PTQA'
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

            // Always update the tagihan amount to match the corrected payment
            // When correcting a payment, the tagihan amount should also be corrected
            const { error: updateTagihanError } = await supabase
                .from('tagihan_santri')
                .update({ jumlah: newAmount })
                .eq('id', tagihanId)

            if (updateTagihanError) throw updateTagihanError

            // Recalculate tagihan status
            // Get total payments for this tagihan
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
            } catch (auditErr) {
                console.warn('Audit log failed (non-critical):', auditErr)
            }

            // Refresh data
            await fetchTagihanSantri(selectedSantri.id)

            setEditSaveModal({ isOpen: false })
            setShowEditModal(false)
            setEditingPayment(null)
            showToast.success('Koreksi pembayaran berhasil disimpan!')
        } catch (err) {
            console.error('Error updating payment:', err)
            showToast.error('Gagal menyimpan koreksi: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <CreditCard className="title-icon green" /> Pembayaran Santri
                    </h1>
                    <p className="page-subtitle">Cari santri dan kelola pembayaran</p>
                </div>
            </div>

            {/* Santri Search */}
            <div className="santri-search-section">
                <div className="santri-search-container" ref={dropdownRef}>
                    {selectedSantri ? (
                        <div className="selected-santri-card">
                            <div className="selected-santri-avatar">{selectedSantri.nama.charAt(0)}</div>
                            <div className="selected-santri-info">
                                <strong>{selectedSantri.nama}</strong>
                                <span>{selectedSantri.nis} • {selectedSantri.kelas?.nama || '-'}</span>
                            </div>
                            <button className="btn-clear-santri" onClick={handleClearSantri}>
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="santri-search-input-wrapper">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Ketik nama atau NIS santri untuk mencari..."
                                value={searchSantri}
                                onChange={(e) => setSearchSantri(e.target.value)}
                                onFocus={() => searchSantri.length >= 2 && setShowSantriDropdown(true)}
                            />
                            {loading && <RefreshCw size={18} className="spin" />}
                        </div>
                    )}

                    {/* Dropdown Results */}
                    {showSantriDropdown && santriList.length > 0 && (
                        <div className="santri-dropdown">
                            {santriList.map(santri => (
                                <div
                                    key={santri.id}
                                    className="santri-dropdown-item"
                                    onClick={() => handleSelectSantri(santri)}
                                >
                                    <div className="santri-dropdown-avatar">{santri.nama.charAt(0)}</div>
                                    <div className="santri-dropdown-info">
                                        <strong>{santri.nama}</strong>
                                        <small>{santri.nis} • {santri.kelas?.nama || '-'}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showSantriDropdown && searchSantri.length >= 2 && santriList.length === 0 && !loading && (
                        <div className="santri-dropdown">
                            <div className="santri-dropdown-empty">Tidak ditemukan santri dengan "{searchSantri}"</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content when santri selected */}
            {selectedSantri && (
                <div className="pembayaran-content">
                    {loadingTagihan ? (
                        <Spinner className="py-8" label="Memuat data tagihan..." />
                    ) : (
                        <>
                            {/* Unpaid Section - Grouped */}
                            {belumLunas.length > 0 && (
                                <div className="tagihan-grouped-section">
                                    <div className="section-header-row">
                                        <h3 className="section-title red">
                                            <AlertCircle size={20} /> Tagihan Belum Lunas ({belumLunas.length})
                                        </h3>
                                        <div className="section-actions">
                                            <button className="btn btn-sm btn-outline" onClick={selectAllUnpaid}>
                                                <Layers size={16} /> Pilih Semua
                                            </button>
                                            <button className="btn btn-sm btn-wa" onClick={handleSendGroupedWA}>
                                                <MessageCircle size={16} /> Kirim WA Semua
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grouped-summary-card">
                                        <div className="grouped-total">
                                            <span>Total Belum Lunas</span>
                                            <strong>Rp {totalBelumLunas.toLocaleString('id-ID')}</strong>
                                        </div>
                                        {selectedTagihanIds.length > 0 && (
                                            <div className="grouped-selected">
                                                <span>Dipilih ({selectedTagihanIds.length})</span>
                                                <strong>Rp {totalSelected.toLocaleString('id-ID')}</strong>
                                            </div>
                                        )}
                                    </div>

                                    <div className="tagihan-checklist">
                                        {belumLunas.map(tagihan => (
                                            <div
                                                key={tagihan.id}
                                                className={`tagihan-check-item ${selectedTagihanIds.includes(tagihan.id) ? 'selected' : ''} ${isOverdue(tagihan.jatuh_tempo) ? 'overdue' : ''}`}
                                                onClick={() => toggleTagihanSelection(tagihan.id)}
                                            >
                                                <div className={`check-box ${selectedTagihanIds.includes(tagihan.id) ? 'checked' : ''}`}>
                                                    {selectedTagihanIds.includes(tagihan.id) && <Check size={14} />}
                                                </div>
                                                <div className="check-item-content">
                                                    <div className="check-item-main">
                                                        <span className="kategori-name">{tagihan.kategori?.nama}</span>
                                                        <span className="tagihan-amount">Rp {Number(tagihan.jumlah).toLocaleString('id-ID')}</span>
                                                    </div>
                                                    <div className="check-item-sub">
                                                        <span>Jatuh tempo: {formatDate(tagihan.jatuh_tempo)}</span>
                                                        {isOverdue(tagihan.jatuh_tempo) && <span className="overdue-label">Terlambat</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedTagihanIds.length > 0 && (
                                        <button className="btn btn-primary btn-pay-selected" onClick={handleOpenPayment}>
                                            <CreditCard size={18} /> Bayar {selectedTagihanIds.length} Tagihan (Rp {totalSelected.toLocaleString('id-ID')})
                                        </button>
                                    )}
                                </div>
                            )}

                            {belumLunas.length === 0 && (
                                <div className="all-paid-message">
                                    <CheckCircle size={48} />
                                    <p>Semua tagihan sudah lunas! 🎉</p>
                                </div>
                            )}

                            {/* Paid Section */}
                            {sudahLunas.length > 0 && (
                                <div className="tagihan-grouped-section lunas-section">
                                    <div className="section-header-row">
                                        <h3 className="section-title green">
                                            <CheckCircle size={20} /> Tagihan Lunas ({sudahLunas.length})
                                        </h3>
                                        <div className="section-actions">
                                            <button className="btn btn-sm btn-wa" onClick={handleSendLunasWAGlobal} title="Kirim WA Semua">
                                                <MessageCircle size={14} />
                                            </button>
                                            <button className="btn btn-sm btn-outline" onClick={handleDownloadLunasGlobal} title="Download PDF">
                                                <Download size={14} />
                                            </button>
                                            <div className="view-toggle">
                                                <button
                                                    className={`toggle-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                                                    onClick={() => setViewMode('grouped')}
                                                >
                                                    <Layers size={14} />
                                                </button>
                                                <button
                                                    className={`toggle-btn ${viewMode === 'individual' ? 'active' : ''}`}
                                                    onClick={() => setViewMode('individual')}
                                                >
                                                    <List size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {viewMode === 'grouped' ? (
                                        <div className="lunas-grouped">
                                            <div className="lunas-total-card">
                                                <span>Total Lunas</span>
                                                <strong>Rp {sudahLunas.reduce((sum, t) => sum + Number(t.jumlah), 0).toLocaleString('id-ID')}</strong>
                                            </div>
                                            <div className="lunas-categories">
                                                {sudahLunas.map(t => (
                                                    <span key={t.id} className="lunas-chip">{t.kategori?.nama}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="lunas-list">
                                            {sudahLunas.map(tagihan => (
                                                <div key={tagihan.id} className="lunas-item">
                                                    <span className="lunas-kategori">{tagihan.kategori?.nama}</span>
                                                    <span className="lunas-amount">Rp {Number(tagihan.jumlah).toLocaleString('id-ID')}</span>
                                                    <span className="lunas-badge">✓ Lunas</span>
                                                    <div className="lunas-item-actions">
                                                        <MobileActionMenu
                                                            actions={[
                                                                { icon: <MessageCircle size={16} />, label: 'Kirim WA', onClick: () => handleSendLunasWASingle(tagihan) },
                                                                { icon: <Printer size={16} />, label: 'Cetak', onClick: () => handlePrintLunasSingle(tagihan) }
                                                            ]}
                                                        >
                                                            <button className="btn-icon-xs" onClick={() => handleSendLunasWASingle(tagihan)} title="Kirim WA">
                                                                <MessageCircle size={14} />
                                                            </button>
                                                            <button className="btn-icon-xs" onClick={() => handlePrintLunasSingle(tagihan)} title="Cetak">
                                                                <Printer size={14} />
                                                            </button>
                                                        </MobileActionMenu>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment History */}
                            {pembayaranHistory.length > 0 && (
                                <div className="tagihan-grouped-section history-section">
                                    <div className="section-header-row">
                                        <h3 className="section-title blue">
                                            <CreditCard size={20} /> Riwayat Pembayaran ({pembayaranHistory.length})
                                        </h3>
                                        <div className="section-actions">
                                            <button className="btn btn-sm btn-wa" onClick={handleSendHistoryWAGlobal} title="Kirim WA Semua">
                                                <MessageCircle size={14} />
                                            </button>
                                            <button className="btn btn-sm btn-outline" onClick={handleDownloadHistoryGlobal} title="Download PDF">
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="history-list">
                                        {pembayaranHistory.map(p => (
                                            <div key={p.id} className="history-item">
                                                <div className="history-date">{formatDate(p.tanggal)}</div>
                                                <div className="history-info">
                                                    <span>{p.tagihan?.kategori?.nama || '-'}</span>
                                                    <strong className="green">Rp {Number(p.jumlah).toLocaleString('id-ID')}</strong>
                                                </div>
                                                <span className="history-method">{p.metode}</span>
                                                <div className="history-item-actions">
                                                    <MobileActionMenu
                                                        actions={[
                                                            { icon: <Edit2 size={16} />, label: 'Edit/Koreksi', onClick: () => handleOpenEditPayment(p) },
                                                            { icon: <MessageCircle size={16} />, label: 'Kirim WA', onClick: () => handleSendHistoryWASingle(p) },
                                                            { icon: <Printer size={16} />, label: 'Cetak Kwitansi', onClick: () => handlePrintHistorySingle(p) }
                                                        ]}
                                                    >
                                                        <button className="btn-icon-xs" onClick={() => handleOpenEditPayment(p)} title="Edit/Koreksi">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button className="btn-icon-xs" onClick={() => handleSendHistoryWASingle(p)} title="Kirim WA">
                                                            <MessageCircle size={14} />
                                                        </button>
                                                        <button className="btn-icon-xs" onClick={() => handlePrintHistorySingle(p)} title="Cetak Kwitansi">
                                                            <Printer size={14} />
                                                        </button>
                                                    </MobileActionMenu>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!selectedSantri && (
                <div className="select-santri-prompt">
                    <User size={64} />
                    <h3>Cari & Pilih Santri</h3>
                    <p>Ketik nama atau NIS santri di atas untuk melihat tagihan</p>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>💳 Bayar {selectedTagihanIds.length} Tagihan</h3>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="payment-info-card">
                                    <div className="payment-info-row">
                                        <span>Santri</span>
                                        <strong>{selectedSantri?.nama}</strong>
                                    </div>
                                    <div className="payment-info-row">
                                        <span>Tagihan</span>
                                        <strong>{selectedTagihan.map(t => t.kategori?.nama).join(', ')}</strong>
                                    </div>
                                    <div className="payment-info-row highlight">
                                        <span>Total</span>
                                        <strong>Rp {totalSelected.toLocaleString('id-ID')}</strong>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Jumlah Bayar (Rp) *</label>
                                        <input
                                            type="number"
                                            value={form.jumlah}
                                            onChange={e => setForm({ ...form, jumlah: e.target.value })}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="payment-info-row">
                                        <span>Tanggal Bayar</span>
                                        <div style={{ width: '200px' }}>
                                            <DateRangePicker
                                                singleDate
                                                startDate={form.tanggal}
                                                onChange={(date) => setForm({ ...form, tanggal: date })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Metode Pembayaran</label>
                                    <select value={form.metode} onChange={e => setForm({ ...form, metode: e.target.value })}>
                                        {metodeOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
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
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
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
                </div>
            )}

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executePayment}
                title="Konfirmasi Pembayaran"
                message={`Apakah Anda yakin ingin memproses pembayaran sebesar Rp ${Number(form.jumlah).toLocaleString('id-ID')}?`}
                confirmLabel="Bayar"
                variant="success"
            />

            {/* Edit Payment Modal */}
            {showEditModal && (
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
                </div>
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
