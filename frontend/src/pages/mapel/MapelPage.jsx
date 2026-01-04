import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, BookOpen, Search, RefreshCw, BookMarked, GraduationCap, MoreVertical } from 'lucide-react'
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
import './Mapel.css'

const MapelPage = () => {
    const { activeRole, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
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

    const countByKategori = (kat) => mapelList.filter(m => m.kategori === kat).length

    return (
        <div className="mapel-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Mata Pelajaran</h1>
                    <p className="page-subtitle">Kelola daftar mata pelajaran</p>
                </div>
                <div className="header-actions">
                    <DownloadButton
                        onDownloadPDF={handleDownloadPDF}
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                    {canEdit && (
                        <button className="btn btn-primary" onClick={() => { setEditData(null); setFormData({ kode: '', nama: '', deskripsi: '', kategori: 'Madrosiyah' }); setShowModal(true) }}>
                            <Plus size={18} /> Tambah Mapel
                        </button>
                    )}
                </div>
            </div>



            <div className="table-container">
                <div className="table-header">
                    <h3 className="table-title">Daftar Mapel ({filteredMapel.length})</h3>
                    <div className="table-controls">
                        <button
                            className={`btn btn-sm ${activeKategori === 'Semua' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveKategori('Semua')}
                        >
                            Semua
                        </button>
                        <button
                            className={`btn btn-sm ${activeKategori === 'Tahfizhiyah' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveKategori('Tahfizhiyah')}
                            title="Tahfizhiyah"
                        >
                            <BookMarked size={16} /> <span className="hide-mobile">Tahfizhiyah</span>
                        </button>
                        <button
                            className={`btn btn-sm ${activeKategori === 'Madrosiyah' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setActiveKategori('Madrosiyah')}
                            title="Madrosiyah"
                        >
                            <GraduationCap size={16} /> <span className="hide-mobile">Madrosiyah</span>
                        </button>
                        <div className="table-search">
                            <Search size={18} className="search-icon" />
                            <input type="text" placeholder="Cari mapel..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" />
                        </div>
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Nama Mapel</th>
                                <th>Kategori</th>
                                <th>Deskripsi</th>
                                {canEdit && <th>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={canEdit ? 5 : 4}><Spinner className="py-8" label="Memuat data mapel..." /></td></tr>
                            ) : filteredMapel.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 5 : 4}>
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
                                    <tr key={mapel.id}>
                                        <td><span className="badge badge-info">{mapel.kode}</span></td>
                                        <td className="name-cell"><BookOpen size={16} className="text-muted" /> {mapel.nama}</td>
                                        <td>
                                            <span className={`badge ${mapel.kategori === 'Tahfizhiyah' ? 'badge-success' : 'badge-warning'}`}>
                                                {mapel.kategori || 'Madrosiyah'}
                                            </span>
                                        </td>
                                        <td className="text-muted">{mapel.deskripsi || '-'}</td>
                                        {canEdit && (
                                            <td>
                                                <MobileActionMenu
                                                    actions={[
                                                        { icon: <Edit size={16} />, label: 'Edit', onClick: () => handleEdit(mapel) },
                                                        { icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => confirmDelete(mapel), danger: true }
                                                    ]}
                                                >
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => handleEdit(mapel)}
                                                        title="Edit"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: '#fef3c7',
                                                            color: '#d97706',
                                                            cursor: 'pointer',
                                                            marginRight: '4px'
                                                        }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-icon-danger"
                                                        onClick={() => confirmDelete(mapel)}
                                                        title="Hapus"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            background: '#fee2e2',
                                                            color: '#ef4444',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </MobileActionMenu>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editData ? 'Edit Mapel' : 'Tambah Mapel'}</h3>
                            <button className="modal-close" onClick={() => { setShowModal(false); setEditData(null) }}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Kode Mapel *</label>
                                    <input type="text" className="form-control" value={formData.kode} onChange={e => setFormData({ ...formData, kode: e.target.value.toUpperCase() })} maxLength={5} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nama Mapel *</label>
                                    <input type="text" className="form-control" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kategori *</label>
                                    <select className="form-control" value={formData.kategori} onChange={e => setFormData({ ...formData, kategori: e.target.value })}>
                                        <option value="Tahfizhiyah">Tahfizhiyah (Hafalan/Quran)</option>
                                        <option value="Madrosiyah">Madrosiyah (Formal/Umum)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Deskripsi</label>
                                    <textarea className="form-control" rows={3} value={formData.deskripsi || ''} onChange={e => setFormData({ ...formData, deskripsi: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <><RefreshCw size={16} className="spin" /> Menyimpan...</> : 'Simpan'}
                                </button>
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
