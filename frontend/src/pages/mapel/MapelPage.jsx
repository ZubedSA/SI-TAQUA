import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit, Trash2, BookOpen, Search, RefreshCw, BookMarked, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useMapel } from '../../hooks/useAkademik'
import { useQueryClient } from '@tanstack/react-query'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { generateLaporanPDF } from '../../utils/pdfGenerator'

import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import PageHeader from '../../components/layout/PageHeader'
import StatsCard from '../../components/ui/StatsCard'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FormInput from '../../components/ui/FormInput'

const MapelPage = () => {
    const { activeRole, isAdmin, isAdminAkademik, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || isAdminAkademik() || userProfile?.role === 'admin' || hasRole('admin')
    const canEdit = adminCheck
    const queryClient = useQueryClient()
    const { data: mapelData = [], isLoading: loading, refetch: fetchMapel } = useMapel()
    
    // Use the data from hook
    const mapelList = mapelData
    
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' })
    const [saving, setSaving] = useState(false)
    const [activeKategori, setActiveKategori] = useState('Semua')
    const [mapelToDelete, setMapelToDelete] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const filteredMapel = mapelList.filter(m => {
        const matchSearch = m.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.kode?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchKategori = activeKategori === 'Semua' || m.kategori === activeKategori
        return matchSearch && matchKategori
    })

    // Save Confirmation State
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            if (editData) {
                const { error } = await supabase.from('mapel').update(formData).eq('id', editData.id)
                if (error) throw error
                await logUpdate('mapel', formData.nama, `Edit mapel: ${formData.nama} (${formData.kode})`)
                showToast.success('Mapel berhasil diperbarui')
            } else {
                const { error } = await supabase.from('mapel').insert([formData])
                if (error) throw error
                await logCreate('mapel', formData.nama, `Tambah mapel baru: ${formData.nama} (${formData.kode})`)
                showToast.success('Mapel baru berhasil ditambahkan')
            }
            queryClient.invalidateQueries(['mapel'])
            fetchMapel()
            setShowModal(false)
            setEditData(null)
            setFormData({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' })
            setSaveModal({ isOpen: false })
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (mapel) => {
        setEditData(mapel)
        setFormData({ ...mapel, kategori: mapel.kategori || 'Madrosiyah' })
        setShowModal(true)
    }

    const confirmDelete = (mapel) => {
        setMapelToDelete(mapel)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!mapelToDelete) return
        try {
            const { error } = await supabase.from('mapel').delete().eq('id', mapelToDelete.id)
            if (error) throw error
            await logDelete('mapel', mapelToDelete.nama, `Hapus mapel: ${mapelToDelete.nama} (${mapelToDelete.kode})`)
            queryClient.invalidateQueries(['mapel'])
            fetchMapel()
            showToast.success('Mapel berhasil dihapus')
            setShowDeleteModal(false)
            setMapelToDelete(null)
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const handleDownloadExcel = () => {
        const columns = ['Kode', 'Nama Mapel', 'Kategori', 'Deskripsi']
        const exportData = filteredMapel.map(m => ({
            Kode: m.kode,
            'Nama Mapel': m.nama,
            Kategori: m.kategori || 'Madrosiyah',
            Deskripsi: m.deskripsi || '-'
        }))
        exportToExcel(exportData, columns, 'data_mapel')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Kode', 'Nama Mapel', 'Kategori', 'Deskripsi']
        const exportData = filteredMapel.map(m => ({
            Kode: m.kode,
            'Nama Mapel': m.nama,
            Kategori: m.kategori || 'Madrosiyah',
            Deskripsi: m.deskripsi || '-'
        }))
        exportToCSV(exportData, columns, 'data_mapel')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Data Mata Pelajaran',
            columns: ['Kode', 'Nama Mapel', 'Kategori', 'Deskripsi'],
            data: filteredMapel.map(m => [
                m.kode,
                m.nama,
                m.kategori || 'Madrosiyah',
                m.deskripsi || '-'
            ]),
            filename: 'data_mapel'
        })
        showToast.success('PDF berhasil didownload')
    }

    const stats = {
        total: mapelList.length,
        tahfizhiyah: mapelList.filter(m => m.kategori === 'Tahfizhiyah').length,
        madrosiyah: mapelList.filter(m => m.kategori === 'Madrosiyah').length
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Mata Pelajaran"
                description="Kelola daftar mata pelajaran sekolah"
                icon={BookOpen}
                actions={
                    <div className="flex gap-2">
                        <DownloadButton
                            onDownloadPDF={handleDownloadPDF}
                            onDownloadExcel={handleDownloadExcel}
                            onDownloadCSV={handleDownloadCSV}
                        />
                        {canEdit && (
                            <Button onClick={() => { setEditData(null); setFormData({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' }); setShowModal(true) }}>
                                <Plus size={18} /> Tambah Mapel
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard title="Total Mapel" value={stats.total} icon={BookOpen} color="primary" />
                <StatsCard title="Tahfizhiyah" value={stats.tahfizhiyah} icon={BookMarked} color="green" />
                <StatsCard title="Madrosiyah" value={stats.madrosiyah} icon={GraduationCap} color="orange" />
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-white">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                            {[
                                { id: 'Semua', label: 'Semua', icon: BookOpen, color: 'text-gray-600', bg: 'bg-white' },
                                { id: 'Tahfizhiyah', label: 'Tahfizhiyah', icon: BookMarked, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { id: 'Madrosiyah', label: 'Madrosiyah', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' }
                            ].map((tab) => {
                                const isActive = activeKategori === tab.id
                                const count = tab.id === 'Semua' ? mapelList.length : mapelList.filter(m => m.kategori === tab.id).length
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveKategori(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                                            ${isActive 
                                                ? `${tab.bg} ${tab.color} shadow-sm border border-white` 
                                                : 'text-gray-400 hover:text-gray-600'}
                                        `}
                                    >
                                        <tab.icon size={14} />
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-lg text-[10px] border ${isActive ? 'bg-white border-transparent shadow-sm' : 'bg-gray-200/50 border-transparent text-gray-400'}`}>
                                            {count}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari mapel..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="secondary" size="icon" onClick={() => fetchMapel()} className="rounded-xl shadow-sm border-gray-100 shrink-0">
                                <RefreshCw size={18} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5">Kode & Mata Pelajaran</th>
                                <th className="px-8 py-5">Kategori</th>
                                <th className="px-8 py-5">Deskripsi</th>
                                {canEdit && <th className="px-8 py-5 text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={canEdit ? 4 : 3} className="px-8 py-20 text-center"><Spinner label="Menyelaraskan kurikulum..." /></td></tr>
                            ) : filteredMapel.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 4 : 3} className="px-8 py-20">
                                        <EmptyState
                                            icon={BookOpen}
                                            title="Data tidak ditemukan"
                                            message={searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}"` : "Belum ada mata pelajaran yang terdaftar."}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredMapel.map(mapel => (
                                    <tr key={mapel.id} className="hover:bg-gray-50/50 transition-all cursor-pointer group border-b border-gray-50 last:border-0" onClick={() => canEdit && handleEdit(mapel)}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-mono text-[10px] font-black border border-gray-200 uppercase">
                                                    {mapel.kode}
                                                </div>
                                                <div className="font-black text-gray-900 group-hover:text-primary-600 transition-colors leading-tight">{mapel.nama}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight border ${mapel.kategori === 'Tahfizhiyah' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {mapel.kategori || 'Madrosiyah'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-xs text-gray-500 max-w-xs truncate font-medium">
                                            {mapel.deskripsi || '-'}
                                        </td>
                                        {canEdit && (
                                            <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2 transition-all">
                                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-amber-600 hover:bg-amber-50 rounded-xl" onClick={() => handleEdit(mapel)} title="Edit">
                                                        <Edit size={18} />
                                                    </Button>
                                                    <button onClick={() => confirmDelete(mapel)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Hapus">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    <div className="divide-y divide-gray-50">
                        {loading ? (
                            <div className="py-20 text-center"><Spinner label="Memuat..." /></div>
                        ) : filteredMapel.length === 0 ? (
                            <div className="p-12"><EmptyState icon={BookOpen} title="Tidak ditemukan" /></div>
                        ) : (
                            filteredMapel.map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => canEdit && handleEdit(item)}
                                    className="p-6 space-y-4 active:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="font-black text-gray-900 text-base leading-tight">{item.nama}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">Kode: {item.kode}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${item.kategori === 'Tahfizhiyah' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {item.kategori}
                                        </span>
                                    </div>

                                    {item.deskripsi && (
                                        <div className="text-[11px] text-gray-500 font-medium leading-relaxed italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            {item.deskripsi}
                                        </div>
                                    )}

                                    {canEdit && (
                                        <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => handleEdit(item)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-100"
                                            >
                                                <Edit size={14} /> Edit Mapel
                                            </button>
                                            <button 
                                                onClick={() => confirmDelete(item)}
                                                className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Card>

            {showModal && createPortal(
                <div className="modal-overlay visible opacity-100">
                    <div className="modal-box w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">{editData ? 'Edit Mapel' : 'Tambah Mapel'}</h3>
                            <button onClick={() => { setShowModal(false); setEditData(null) }} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4">
                                <FormInput
                                    label="Kode Mapel"
                                    value={formData.kode}
                                    onChange={e => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                                    maxLength={5}
                                    required
                                    placeholder="CTH01"
                                    className="font-mono uppercase"
                                />
                                <FormInput
                                    label="Nama Mapel"
                                    value={formData.nama}
                                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                    required
                                    placeholder="Contoh: Matematika"
                                />
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Kategori <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                                        value={formData.kategori}
                                        onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                                    >
                                        <option value="Tahfizhiyah">Tahfizhiyah (Hafalan/Quran)</option>
                                        <option value="Madrosiyah">Madrosiyah (Formal/Umum)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Deskripsi</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all custom-scrollbar"
                                        rows={3}
                                        value={formData.deskripsi || ''}
                                        onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                                <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Batal</Button>
                                <Button type="submit" loading={saving}>
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                itemName={`${mapelToDelete?.kode} - ${mapelToDelete?.nama}`}
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editData ? "Konfirmasi Edit" : "Konfirmasi Tambah"}
                message={editData ? 'Apakah Anda yakin ingin menyimpan perubahan data mapel ini?' : 'Apakah Anda yakin ingin menambahkan mapel baru ini?'}
                confirmLabel={editData ? "Simpan Perubahan" : "Tambah Mapel"}
                variant="success"
                isLoading={saving}
            />
        </div>
    )
}

export default MapelPage
