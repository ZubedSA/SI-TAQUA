import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, BookOpen, Search, RefreshCw, BookMarked, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
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
    const { activeRole, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const canEdit = adminCheck
    const [mapelList, setMapelList] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' })
    const [saving, setSaving] = useState(false)
    const [activeKategori, setActiveKategori] = useState('Semua')
    const [mapelToDelete, setMapelToDelete] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    useEffect(() => {
        fetchMapel()
    }, [])

    const fetchMapel = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('mapel').select('*').order('nama')
            if (error) throw error
            setMapelList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat mapel: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

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
            setMapelList(mapelList.filter(m => m.id !== mapelToDelete.id))
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
                            <Button onClick={() => { setEditData(null); setFormData({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' }); setShowModal(true) }} icon={Plus}>
                                Tambah Mapel
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
                <div className="p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <Button
                            variant={activeKategori === 'Semua' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setActiveKategori('Semua')}
                        >
                            Semua
                        </Button>
                        <Button
                            variant={activeKategori === 'Tahfizhiyah' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setActiveKategori('Tahfizhiyah')}
                            icon={BookMarked}
                        >
                            Tahfizhiyah
                        </Button>
                        <Button
                            variant={activeKategori === 'Madrosiyah' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setActiveKategori('Madrosiyah')}
                            icon={GraduationCap}
                        >
                            Madrosiyah
                        </Button>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari mapel..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Kode</th>
                                <th className="px-6 py-4 font-medium">Nama Mapel</th>
                                <th className="px-6 py-4 font-medium">Kategori</th>
                                <th className="px-6 py-4 font-medium">Deskripsi</th>
                                {canEdit && <th className="px-6 py-4 font-medium text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={canEdit ? 5 : 4} className="px-6 py-12"><Spinner label="Memuat data mapel..." /></td></tr>
                            ) : filteredMapel.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 5 : 4} className="px-6 py-12">
                                        <EmptyState
                                            icon={BookOpen}
                                            title="Belum ada mata pelajaran"
                                            message={searchTerm ? `Tidak ditemukan mapel untuk "${searchTerm}"` : "Belum ada mata pelajaran yang terdaftar."}
                                            actionLabel={canEdit && !searchTerm ? "Tambah Mapel" : null}
                                            onAction={canEdit && !searchTerm ? () => { setEditData(null); setFormData({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' }); setShowModal(true) } : null}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredMapel.map(mapel => (
                                    <tr key={mapel.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Badge variant="info" className="font-mono">{mapel.kode}</Badge>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {mapel.nama}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={mapel.kategori === 'Tahfizhiyah' ? 'success' : 'warning'}>
                                                {mapel.kategori || 'Madrosiyah'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={mapel.deskripsi}>
                                            {mapel.deskripsi || '-'}
                                        </td>
                                        {canEdit && (
                                            <td className="px-6 py-4 text-right">
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <Edit size={16} />, label: 'Edit', onClick: () => handleEdit(mapel) },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => confirmDelete(mapel), danger: true }
                                                    ]}
                                                >
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleEdit(mapel)} title="Edit">
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => confirmDelete(mapel)} title="Hapus">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </MobileActionMenu>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95">
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
                </div>
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
