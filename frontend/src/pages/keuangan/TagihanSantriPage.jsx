import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Receipt, RefreshCw, MessageCircle, AlertCircle, Calendar, Users, DollarSign, Filter, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../hooks/usePermissions'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { sendWhatsApp, templateTagihanSantri } from '../../utils/whatsapp'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { useTagihanSantri } from '../../hooks/features/useTagihanSantri'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import PageHeader from '../../components/layout/PageHeader'
import StatsCard from '../../components/ui/StatsCard'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FormInput from '../../components/ui/FormInput'
import './Keuangan.css'

const TagihanSantriPage = () => {
    const { user } = useAuth()
    const { canCreate, canUpdate, canDelete } = usePermissions()
    const showToast = useToast()
    const [santriList, setSantriList] = useState([])
    const [angkatanList, setAngkatanList] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filters, setFilters] = useState({ search: '', status: '', kategori: '' })

    const [loading, setLoading] = useState(true)
    const [kategoriList, setKategoriList] = useState([])

    // Performance Update: Use Cached Hook
    const { data: rawData = [], isLoading: loadingMain, error, refetch } = useTagihanSantri(filters)

    useEffect(() => {
        setLoading(loadingMain)
    }, [loadingMain])

    useEffect(() => {
        fetchKategori()
        fetchSantriOptions()
    }, [])

    // Error Handling
    useEffect(() => {
        if (error) {
            console.error('Error loading tagihan:', error)
            showToast.error('Gagal memuat data tagihan') // Generic error for safety
        }
    }, [error])

    // Client-side filtering for Search (efficient for <2000 items)
    const data = useMemo(() => {
        // Fix for 400 Error: Join client-side instead of server-side
        const enrichedData = rawData.map(item => ({
            ...item,
            santri: santriList.find(s => s.id === item.santri_id) || {},
            kategori: kategoriList.find(k => k.id === item.kategori_id) || {}
        }))

        let result = enrichedData
        if (filters.search) {
            const term = filters.search.toLowerCase()
            result = result.filter(item =>
                item.santri?.nama?.toLowerCase().includes(term) ||
                item.santri?.nis?.toLowerCase().includes(term)
            )
        }
        return result
    }, [rawData, filters.search, santriList, kategoriList])

    const fetchKategori = async () => {
        try {
            const { data, error } = await supabase
                .from('kategori_pembayaran')
                .select('*')
                .eq('tipe', 'pembayaran')
                .eq('is_active', true)
                .order('nama')
            if (error) throw error
            setKategoriList(data || [])
        } catch (error) {
            console.error('Error loading kategori:', error)
        }
    }

    const fetchSantriOptions = async () => {
        // Keep manual fetch for Santri list used in Modal (could be hook too but separate)
        const [santriRes] = await Promise.all([
            supabase.from('santri').select('id, nama, nis, no_telp_wali, angkatan_id').eq('status', 'Aktif').order('nama')
        ])
        const santris = santriRes.data || []
        setSantriList(santris)

        // Fetch angkatan data
        const angkatanIds = [...new Set(santris.map(s => s.angkatan_id).filter(Boolean))]
        if (angkatanIds.length > 0) {
            const { data: angkatanData } = await supabase
                .from('angkatan')
                .select('id, nama')
                .in('id', angkatanIds)
                .order('nama')
            setAngkatanList(angkatanData || [])
        } else {
            setAngkatanList([])
        }
    }

    // Modals State
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null })
    const [saveModal, setSaveModal] = useState({ isOpen: false })
    const [saving, setSaving] = useState(false)
    const [isBulkMode, setIsBulkMode] = useState(true)

    const [form, setForm] = useState({
        angkatan_id: '',
        santri_id: '',
        kategori_id: '',
        jumlah: '',
        jatuh_tempo_bulan: new Date().toISOString().slice(0, 7),
        keterangan: ''
    })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        // Validation for bulk mode
        if (!editItem && !form.angkatan_id) {
            alert('Pilih angkatan terlebih dahulu')
            return
        }
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            // Calculate Due Date: 10th of the selected month
            const dueDate = `${form.jatuh_tempo_bulan}-10`
            const kategori = kategoriList.find(k => k.id === form.kategori_id)

            const basePayload = {
                kategori_id: form.kategori_id,
                jumlah: parseFloat(form.jumlah),
                jatuh_tempo: dueDate,
                keterangan: form.keterangan || '',
                created_by: user?.id
            }

            if (editItem) {
                // Update Single
                const { error } = await supabase.from('tagihan_santri').update(basePayload).eq('id', editItem.id)
                if (error) throw error

                // Audit Log - UPDATE
                await logUpdate(
                    'tagihan_santri',
                    editItem.santri?.nama || 'Unknown',
                    `Update tagihan santri: ${editItem.santri?.nama} - ${kategori?.nama} - Rp ${Number(basePayload.jumlah).toLocaleString('id-ID')}`,
                    { jumlah: editItem.jumlah, kategori: editItem.kategori?.nama },
                    { jumlah: basePayload.jumlah, kategori: kategori?.nama }
                )
                showToast.success('Tagihan berhasil diperbarui')
            } else {
                // Bulk Insert by angkatan
                const targetSantris = santriList.filter(s => s.angkatan_id === form.angkatan_id)
                const angkatan = angkatanList.find(a => a.id === form.angkatan_id)

                if (targetSantris.length === 0) {
                    showToast.error('Tidak ada santri pada angkatan yang dipilih')
                    return
                }

                // Prepare bulk data
                const bulkData = targetSantris.map(s => ({
                    ...basePayload,
                    santri_id: s.id
                }))

                const { error } = await supabase.from('tagihan_santri').insert(bulkData)
                if (error) throw error

                // Audit Log - CREATE (bulk)
                await logCreate(
                    'tagihan_santri',
                    `Bulk - ${angkatan?.nama}`,
                    `Buat tagihan massal: ${targetSantris.length} santri - ${kategori?.nama} - Rp ${Number(basePayload.jumlah).toLocaleString('id-ID')}`
                )

                showToast.success(`Berhasil membuat tagihan untuk ${targetSantris.length} santri`)
            }

            setSaveModal({ isOpen: false })
            setShowModal(false)
            resetForm()
            await refetch()
        } catch (err) {
            showToast.error('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = (item) => {
        setDeleteModal({ isOpen: true, item })
    }

    const handleDelete = async () => {
        const itemToDelete = deleteModal.item
        if (!itemToDelete) return

        try {
            const { error } = await supabase.from('tagihan_santri').delete().eq('id', itemToDelete.id)
            if (error) throw error

            // Audit Log - DELETE
            await logDelete(
                'tagihan_santri',
                itemToDelete.santri?.nama || 'Unknown',
                `Hapus tagihan: ${itemToDelete.santri?.nama} - ${itemToDelete.kategori?.nama} - Rp ${Number(itemToDelete.jumlah).toLocaleString('id-ID')}`
            )

            await refetch()
            showToast.success('Tagihan berhasil dihapus')
            setDeleteModal({ isOpen: false, item: null })
        } catch (err) {
            showToast.error('Error: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            angkatan_id: '',
            santri_id: '',
            kategori_id: '',
            jumlah: '',
            jatuh_tempo_bulan: new Date().toISOString().slice(0, 7),
            keterangan: ''
        })
        setEditItem(null)
        setIsBulkMode(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            angkatan_id: '',
            santri_id: item.santri_id,
            kategori_id: item.kategori_id,
            jumlah: item.jumlah.toString(),
            jatuh_tempo_bulan: item.jatuh_tempo.slice(0, 7),
            keterangan: item.keterangan || ''
        })
        setIsBulkMode(false)
        setShowModal(true)
    }

    const handleKategoriChange = (kategoriId) => {
        const kat = kategoriList.find(k => k.id === kategoriId)
        setForm({
            ...form,
            kategori_id: kategoriId,
            jumlah: kat?.nominal_default?.toString() || form.jumlah
        })
    }

    const handleSendWhatsApp = (item) => {
        const phone = item.santri?.no_telp_wali
        if (!phone) {
            alert('Nomor WhatsApp wali tidak tersedia')
            return
        }

        const message = templateTagihanSantri({
            namaSantri: item.santri?.nama,
            kategori: item.kategori?.nama,
            jumlah: item.jumlah,
            jatuhTempo: item.jatuh_tempo
        })

        sendWhatsApp(phone, message)
    }

    const filteredData = data.filter(d => {
        const matchSearch = d.santri?.nama?.toLowerCase().includes(filters.search.toLowerCase()) ||
            d.santri?.nis?.includes(filters.search)
        const matchStatus = !filters.status || d.status === filters.status
        const matchKategori = !filters.kategori || d.kategori_id === filters.kategori
        return matchSearch && matchStatus && matchKategori
    })

    const handleDownloadExcel = () => {
        const columns = ['Santri', 'NIS', 'Kategori', 'Jumlah', 'Periode', 'Status']
        const exportData = filteredData.map(d => ({
            Santri: d.santri?.nama || '-',
            NIS: d.santri?.nis || '-',
            Kategori: d.kategori?.nama || '-',
            Jumlah: Number(d.jumlah),
            Periode: new Date(d.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            Status: d.status
        }))
        exportToExcel(exportData, columns, 'laporan_tagihan_santri')
    }

    const handleDownloadCSV = () => {
        const columns = ['Santri', 'NIS', 'Kategori', 'Jumlah', 'Periode', 'Status']
        const exportData = filteredData.map(d => ({
            Santri: d.santri?.nama || '-',
            NIS: d.santri?.nis || '-',
            Kategori: d.kategori?.nama || '-',
            Jumlah: Number(d.jumlah),
            Periode: new Date(d.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
            Status: d.status
        }))
        exportToCSV(exportData, columns, 'laporan_tagihan_santri')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Tagihan Santri',
            columns: ['Santri', 'NIS', 'Kategori', 'Jumlah', 'Periode', 'Status'],
            data: filteredData.map(d => [
                d.santri?.nama || '-',
                d.santri?.nis || '-',
                d.kategori?.nama || '-',
                `Rp ${Number(d.jumlah).toLocaleString('id-ID')}`,
                new Date(d.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                d.status
            ]),
            filename: 'laporan_tagihan_santri',
            showTotal: true,
            totalLabel: 'Total Tagihan',
            totalValue: filteredData.reduce((sum, d) => sum + Number(d.jumlah), 0)
        })
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Lunas': return 'success'
            case 'Sebagian': return 'warning'
            default: return 'error'
        }
    }

    const isOverdue = (jatuhTempo) => {
        return new Date(jatuhTempo) < new Date()
    }

    const totalTagihan = filteredData.reduce((sum, d) => sum + Number(d.jumlah), 0)
    const belumLunas = filteredData.filter(d => d.status !== 'Lunas').length

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Receipt className="title-icon" style={{ color: '#6366f1' }} /> Tagihan Santri
                    </h1>
                    <p className="page-subtitle">Kelola tagihan pembayaran santri</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canCreate('tagihan') && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Buat Tagihan
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="summary-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <div className="summary-content">
                        <span className="summary-label">Total Tagihan</span>
                        <span className="summary-value">Rp {totalTagihan.toLocaleString('id-ID')}</span>
                    </div>
                    <DollarSign size={40} className="summary-icon" />
                </div>
                <div className="summary-card red">
                    <div className="summary-content">
                        <span className="summary-label">Tagihan Belum Lunas</span>
                        <span className="summary-value">{belumLunas} Item</span>
                    </div>
                    <AlertCircle size={40} className="summary-icon" />
                </div>
            </div>

            <div className="filters-bar" style={{ marginBottom: '1.5rem' }}>
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari santri..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <select
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                >
                    <option value="">Semua Status</option>
                    <option value="Belum Lunas">Belum Lunas</option>
                    <option value="Sebagian">Sebagian</option>
                    <option value="Lunas">Lunas</option>
                </select>
                <select
                    value={filters.kategori}
                    onChange={e => setFilters({ ...filters, kategori: e.target.value })}
                >
                    <option value="">Semua Kategori</option>
                    {kategoriList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                <button className="btn btn-icon" onClick={refetch}><RefreshCw size={18} /></button>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari santri..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                value={filters.search}
                                onChange={e => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <select
                                className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white appearance-none cursor-pointer"
                                value={filters.status}
                                onChange={e => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">Semua Status</option>
                                <option value="Belum Lunas">Belum Lunas</option>
                                <option value="Sebagian">Sebagian</option>
                                <option value="Lunas">Lunas</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                        <div className="relative">
                            <select
                                className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white appearance-none cursor-pointer"
                                value={filters.kategori}
                                onChange={e => setFilters({ ...filters, kategori: e.target.value })}
                            >
                                <option value="">Semua Kategori</option>
                                {kategoriList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={refetch} icon={RefreshCw} title="Refresh Data" />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium text-center w-12">No</th>
                                <th className="px-6 py-4 font-medium">Santri</th>
                                <th className="px-6 py-4 font-medium">Kategori</th>
                                <th className="px-6 py-4 font-medium">Jumlah</th>
                                <th className="px-6 py-4 font-medium">Periode</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="h-5 w-5 animate-spin" /> Loading data...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        Belum ada tagihan
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item, i) => (
                                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isOverdue(item.jatuh_tempo) && item.status !== 'Lunas' ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4 text-center text-gray-500">{i + 1}</td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{item.santri?.nama}</div>
                                                <div className="text-xs text-gray-500">{item.santri?.nis} • {item.santri?.kelas?.nama || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="neutral">{item.kategori?.nama || '-'}</Badge>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-gray-700">
                                            Rp {Number(item.jumlah).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-700">{new Date(item.jatuh_tempo).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                                                {isOverdue(item.jatuh_tempo) && item.status !== 'Lunas' && (
                                                    <span className="text-[10px] text-red-600 font-bold">Terlambat</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={getStatusClass(item.status)}>{item.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <MobileActionMenu
                                                actions={[
                                                    { icon: <MessageCircle size={16} />, label: 'WhatsApp', onClick: () => handleSendWhatsApp(item) },
                                                    ...(canUpdate('tagihan') ? [{ icon: <Edit2 size={16} />, label: 'Edit', onClick: () => openEdit(item) }] : []),
                                                    ...(canDelete('tagihan') ? [{ icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => confirmDelete(item), danger: true }] : [])
                                                ]}
                                            >
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleSendWhatsApp(item)} title="Kirim WhatsApp">
                                                    <MessageCircle size={16} />
                                                </Button>
                                                {canUpdate('tagihan') && (
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(item)} title="Edit">
                                                        <Edit2 size={16} />
                                                    </Button>
                                                )}
                                                {canDelete('tagihan') && (
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => confirmDelete(item)} title="Hapus">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </MobileActionMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">{editItem ? 'Edit Tagihan' : 'Buat Tagihan (Per Angkatan)'}</h3>
                            <Button size="sm" variant="ghost" onClick={() => setShowModal(false)} icon={RefreshCw} className="hidden" /> {/* Dummy hidden for layout if needed */}
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4">
                                {!editItem && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Pilih Angkatan <span className="text-red-500">*</span></label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                                            value={form.angkatan_id}
                                            onChange={e => setForm({ ...form, angkatan_id: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Pilih Angkatan --</option>
                                            {angkatanList.map(ang => (
                                                <option key={ang.id} value={ang.id}>{ang.nama}</option>
                                            ))}
                                        </select>
                                        {angkatanList.length === 0 && (
                                            <p className="text-xs text-red-500">Belum ada data angkatan di santri</p>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Kategori <span className="text-red-500">*</span></label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                                            value={form.kategori_id}
                                            onChange={e => handleKategoriChange(e.target.value)}
                                            required
                                        >
                                            <option value="">Pilih Kategori</option>
                                            {kategoriList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                                        </select>
                                    </div>
                                    <FormInput
                                        label="Jumlah (Rp)"
                                        type="number"
                                        value={form.jumlah}
                                        onChange={e => setForm({ ...form, jumlah: e.target.value })}
                                        required
                                        min="0"
                                    />
                                </div>

                                <FormInput
                                    label="Periode (Bulan & Tahun)"
                                    type="month"
                                    value={form.jatuh_tempo_bulan}
                                    onChange={e => setForm({ ...form, jatuh_tempo_bulan: e.target.value })}
                                    required
                                />

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Keterangan</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all custom-scrollbar"
                                        value={form.keterangan}
                                        onChange={e => setForm({ ...form, keterangan: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                                <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Batal</Button>
                                <Button type="submit" loading={saving}>
                                    {editItem ? 'Simpan' : 'Buat Tagihan Massal'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                itemName={deleteModal.item?.santri?.nama ? `${deleteModal.item.kategori?.nama} - ${deleteModal.item.santri.nama}` : 'Tagihan ini'}
                message={`Yakin ingin menghapus tagihan ini?`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Simpan Perubahan" : "Konfirmasi Buat Tagihan"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan tagihan ini?' : `Apakah Anda yakin ingin membuat tagihan massal untuk angkatan terpilih?`}
                confirmLabel={editItem ? "Simpan" : "Buat Tagihan"}
                variant="success"
                isLoading={saving}
            />
        </div>
    )
}

export default TagihanSantriPage
