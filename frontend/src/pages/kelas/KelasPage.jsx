import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, RefreshCw, Eye, X, UserPlus, Check, Search, GraduationCap, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import DownloadButton from '../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../utils/exportUtils'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

const KelasPage = () => {
    const { activeRole, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    const showToast = useToast()

    // Multiple checks for role detection - Guru hanya read-only di Data Pondok
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEdit = adminCheck
    const [kelasList, setKelasList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showSantriModal, setShowSantriModal] = useState(false)
    const [showAddSantriModal, setShowAddSantriModal] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({ nama: '', wali_kelas_id: '' })
    const [guruList, setGuruList] = useState([])
    const [saving, setSaving] = useState(false)
    const [selectedKelas, setSelectedKelas] = useState(null)
    const [kelasToDelete, setKelasToDelete] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [santriList, setSantriList] = useState([])
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [santriCounts, setSantriCounts] = useState({})
    const [availableSantri, setAvailableSantri] = useState([])
    const [selectedSantriIds, setSelectedSantriIds] = useState([])
    const [savingSantri, setSavingSantri] = useState(false)
    const [searchSantri, setSearchSantri] = useState('')
    const [currentSemesterId, setCurrentSemesterId] = useState(null)

    useEffect(() => {
        fetchCurrentSemester()
    }, [])

    const fetchCurrentSemester = async () => {
        const { data } = await supabase.from('semester').select('id').eq('is_active', true).single()
        if (data) setCurrentSemesterId(data.id)
    }

    useEffect(() => {
        fetchKelas()
        fetchGuru()
    }, [])

    const fetchKelas = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('kelas')
                .select('*, wali_kelas:guru!wali_kelas_id(nama)')
                .order('nama')

            if (error) throw error
            setKelasList(data || [])

            // Fetch santri count per kelas
            const counts = {}
            for (const kelas of data || []) {
                const { count } = await supabase.from('santri').select('*', { count: 'exact', head: true }).eq('kelas_id', kelas.id)
                counts[kelas.id] = count || 0
            }
            setSantriCounts(counts)
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat data kelas: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchGuru = async () => {
        try {
            const { data } = await supabase.from('guru').select('id, nama').order('nama')
            setGuruList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchSantriByKelas = async (kelas) => {
        setSelectedKelas(kelas)
        setShowSantriModal(true)
        setLoadingSantri(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, jenis_kelamin, status')
                .eq('kelas_id', kelas.id)
                .order('nama')
            if (error) throw error
            setSantriList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat santri: ' + err.message)
        } finally {
            setLoadingSantri(false)
        }
    }

    const fetchAvailableSantri = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, jenis_kelamin, kelas_id')
                .eq('status', 'Aktif')
                .order('nama')
            if (error) throw error
            setAvailableSantri(data || [])
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat data santri: ' + err.message)
        }
    }

    const openAddSantriModal = async (kelas) => {
        setSelectedKelas(kelas)
        setSelectedSantriIds([])
        setSearchSantri('')
        setShowAddSantriModal(true)
        await fetchAvailableSantri()
    }

    const toggleSantriSelection = (santriId) => {
        setSelectedSantriIds(prev => prev.includes(santriId) ? prev.filter(id => id !== santriId) : [...prev, santriId])
    }

    // Confirmation States
    const [saveModal, setSaveModal] = useState({ isOpen: false, type: 'save_kelas' })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setSaveModal({ isOpen: true, type: 'save_kelas' })
    }

    const handleConfirmAddSantri = () => {
        if (selectedSantriIds.length === 0) return
        setSaveModal({ isOpen: true, type: 'add_santri' })
    }

    const executeAddSantriToKelas = async () => {
        setSavingSantri(true)
        try {
            const { error } = await supabase.from('santri').update({ kelas_id: selectedKelas.id }).in('id', selectedSantriIds)
            if (error) throw error
            fetchKelas()
            fetchSantriByKelas(selectedKelas)
            setShowAddSantriModal(false)
            setSelectedSantriIds([])
            showToast.success(`${selectedSantriIds.length} santri berhasil ditambahkan`)
            setSaveModal({ isOpen: false, type: 'save_kelas' })
        } catch (err) {
            showToast.error('Gagal menambahkan santri: ' + err.message)
        } finally {
            setSavingSantri(false)
        }
    }

    // Delete Santri Confirmation State
    const [removeSantriModal, setRemoveSantriModal] = useState({
        isOpen: false,
        santriId: null
    })

    const confirmRemoveSantri = (santriId) => {
        setRemoveSantriModal({ isOpen: true, santriId })
    }

    const handleRemoveSantriFromKelas = async () => {
        const santriId = removeSantriModal.santriId
        if (!santriId) return

        try {
            const { error } = await supabase.from('santri').update({ kelas_id: null }).eq('id', santriId)
            if (error) throw error
            fetchKelas()
            fetchSantriByKelas(selectedKelas)
            showToast.success('Santri berhasil dihapus dari kelas')
            setRemoveSantriModal({ isOpen: false, santriId: null })
        } catch (err) {
            showToast.error('Gagal menghapus santri: ' + err.message)
        }
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            const payload = { nama: formData.nama, wali_kelas_id: formData.wali_kelas_id || null }
            if (editData) {
                const { error } = await supabase.from('kelas').update(payload).eq('id', editData.id)
                if (error) throw error
                await logUpdate('kelas', formData.nama, `Edit kelas: ${formData.nama}`)
                showToast.success('Data kelas berhasil diperbarui')
            } else {
                const { error } = await supabase.from('kelas').insert([payload])
                if (error) throw error
                await logCreate('kelas', formData.nama, `Tambah kelas baru: ${formData.nama}`)
                showToast.success('Kelas baru berhasil ditambahkan')
            }
            fetchKelas()
            setShowModal(false)
            setEditData(null)
            setFormData({ nama: '', wali_kelas_id: '' })
            setSaveModal({ isOpen: false, type: 'save_kelas' })
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (kelas) => {
        setEditData(kelas)
        setFormData({ nama: kelas.nama, wali_kelas_id: kelas.wali_kelas_id || '' })
        setShowModal(true)
    }

    const confirmDelete = (kelas) => {
        setKelasToDelete(kelas)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!kelasToDelete) return
        try {
            const { error } = await supabase.from('kelas').delete().eq('id', kelasToDelete.id)
            if (error) throw error
            await logDelete('kelas', kelasToDelete.nama, `Hapus kelas: ${kelasToDelete.nama}`)
            setKelasList(kelasList.filter(k => k.id !== kelasToDelete.id))
            showToast.success('Kelas berhasil dihapus')
            setShowDeleteModal(false)
            setKelasToDelete(null)
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const handleDownloadExcel = () => {
        const columns = ['Nama Kelas', 'Wali Kelas', 'Jumlah Santri']
        const exportData = kelasList.map(k => ({
            'Nama Kelas': k.nama,
            'Wali Kelas': k.wali_kelas?.nama || '-',
            'Jumlah Santri': santriCounts[k.id] || 0
        }))
        exportToExcel(exportData, columns, 'data_kelas')
        showToast.success('Export Excel berhasil')
    }

    const handleDownloadCSV = () => {
        const columns = ['Nama Kelas', 'Wali Kelas', 'Jumlah Santri']
        const exportData = kelasList.map(k => ({
            'Nama Kelas': k.nama,
            'Wali Kelas': k.wali_kelas?.nama || '-',
            'Jumlah Santri': santriCounts[k.id] || 0
        }))
        exportToCSV(exportData, columns, 'data_kelas')
        showToast.success('Export CSV berhasil')
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Data Kelas',
            columns: ['Nama Kelas', 'Wali Kelas', 'Jumlah Santri'],
            data: kelasList.map(k => [
                k.nama,
                k.wali_kelas?.nama || '-',
                santriCounts[k.id] || 0
            ]),
            filename: 'data_kelas'
        })
        showToast.success('PDF berhasil didownload')
    }

    const filteredAvailableSantri = availableSantri.filter(s =>
        s.nama.toLowerCase().includes(searchSantri.toLowerCase()) ||
        (s.nis && s.nis.toLowerCase().includes(searchSantri.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="Manajemen Kelas"
                description="Kelola data kelas dan wali kelas"
                icon={GraduationCap}
                actions={
                    <div className="flex gap-2">
                        <DownloadButton
                            onDownloadPDF={handleDownloadPDF}
                            onDownloadExcel={handleDownloadExcel}
                            onDownloadCSV={handleDownloadCSV}
                        />
                        {canEdit && (
                            <Button onClick={() => { setEditData(null); setFormData({ nama: '', wali_kelas_id: '' }); setShowModal(true) }}>
                                <Plus size={18} /> Tambah Kelas
                            </Button>
                        )}
                    </div>
                }
            />

            {loading ? (
                <Spinner className="py-12" label="Memuat data kelas..." />
            ) : kelasList.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Belum ada data kelas"
                    message="Silakan buat kelas baru untuk mulai mengelola santri."
                    actionLabel={canEdit ? "Buat Kelas Baru" : null}
                    onAction={canEdit ? () => { setEditData(null); setFormData({ nama: '', wali_kelas_id: '' }); setShowModal(true) } : null}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {kelasList.map(kelas => (
                        <Card
                            key={kelas.id}
                            className="hover:shadow-md transition-shadow cursor-pointer border-gray-200"
                            onClick={() => fetchSantriByKelas(kelas)}
                        >
                            <div className="p-5 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                        <GraduationCap size={24} />
                                    </div>
                                    {canEdit && (
                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                onClick={() => handleEdit(kelas)}
                                                title="Edit Kelas"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                onClick={() => confirmDelete(kelas)}
                                                title="Hapus Kelas"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{kelas.nama}</h3>
                                <p className="text-sm text-gray-500 mb-6">Wali: {kelas.wali_kelas?.nama || '-'}</p>

                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Users size={16} />
                                        <span>{santriCounts[kelas.id] || 0} Santri</span>
                                    </div>
                                    {canEdit && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); openAddSantriModal(kelas); }}
                                            className="!px-3 !py-1"
                                        >
                                            <Plus size={14} /> Santri
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Santri Modal - Lihat Daftar Santri */}
            {showSantriModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Users size={20} className="text-primary-600" />
                                Santri Kelas {selectedKelas?.nama}
                            </h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowSantriModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-0 overflow-auto">
                            {loadingSantri ? (
                                <Spinner className="py-12" label="Memuat data santri..." />
                            ) : santriList.length === 0 ? (
                                <div className="text-center py-12 px-6">
                                    <div className="bg-gray-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                        <Users size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 mb-4">Belum ada santri di kelas ini.</p>
                                    {canEdit && (
                                        <Button onClick={() => openAddSantriModal(selectedKelas)}>
                                            <UserPlus size={18} /> Tambah Santri
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">NIS</th>
                                            <th className="px-6 py-3">Nama</th>
                                            <th className="px-6 py-3">L/P</th>
                                            <th className="px-6 py-3">Status</th>
                                            {canEdit && <th className="px-6 py-3 text-right">Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {santriList.map(s => (
                                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 font-mono text-gray-600">{s.nis || '-'}</td>
                                                <td className="px-6 py-3 font-medium text-gray-900">{s.nama}</td>
                                                <td className="px-6 py-3 text-gray-600">{s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                                <td className="px-6 py-3">
                                                    <Badge variant={s.status === 'Aktif' ? 'success' : 'warning'}>
                                                        {s.status}
                                                    </Badge>
                                                </td>
                                                {canEdit && (
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {currentSemesterId && (
                                                                <a
                                                                    href={`/raport/cetak/${s.id}/${currentSemesterId}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                    title="Cetak Raport"
                                                                >
                                                                    <Printer size={16} />
                                                                </a>
                                                            )}
                                                            <button
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Hapus dari kelas"
                                                                onClick={() => confirmRemoveSantri(s.id)}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                            {canEdit && (
                                <Button onClick={() => openAddSantriModal(selectedKelas)}>
                                    <UserPlus size={18} /> Tambah Santri
                                </Button>
                            )}
                            <Button variant="secondary" onClick={() => setShowSantriModal(false)}>
                                Tutup
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Santri Modal - Pilih Santri untuk Ditambahkan */}
            {showAddSantriModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <UserPlus size={20} className="text-primary-600" />
                                Tambah Santri ke {selectedKelas?.nama}
                            </h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowAddSantriModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-hidden flex flex-col h-full">
                            <div className="relative mb-4">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    placeholder="Cari nama atau NIS santri..."
                                    value={searchSantri}
                                    onChange={e => setSearchSantri(e.target.value)}
                                />
                            </div>

                            {selectedSantriIds.length > 0 && (
                                <div className="mb-4 p-3 bg-primary-50 text-primary-700 rounded-lg text-sm flex items-center gap-2 border border-primary-200">
                                    <Check size={16} /> <strong>{selectedSantriIds.length}</strong> santri dipilih
                                </div>
                            )}

                            <div className="overflow-y-auto flex-1 border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 w-10"></th>
                                            <th className="px-4 py-2">NIS</th>
                                            <th className="px-4 py-2">Nama</th>
                                            <th className="px-4 py-2">Kelas Saat Ini</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredAvailableSantri.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center py-8 text-gray-500">Tidak ada santri ditemukan</td></tr>
                                        ) : (
                                            filteredAvailableSantri.map(s => {
                                                const currentKelas = kelasList.find(k => k.id === s.kelas_id)
                                                const isSelected = selectedSantriIds.includes(s.id)
                                                return (
                                                    <tr
                                                        key={s.id}
                                                        onClick={() => toggleSantriSelection(s.id)}
                                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <td className="px-4 py-2">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white'}`}>
                                                                {isSelected && <Check size={12} className="text-white" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 font-mono text-gray-600">{s.nis || '-'}</td>
                                                        <td className="px-4 py-2 font-medium text-gray-900">{s.nama}</td>
                                                        <td className="px-4 py-2 text-gray-500">{currentKelas?.nama || <span className="text-gray-400 italic">Belum ada</span>}</td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                            <Button variant="secondary" onClick={() => setShowAddSantriModal(false)}>
                                Batal
                            </Button>
                            <Button
                                onClick={handleConfirmAddSantri}
                                disabled={savingSantri || selectedSantriIds.length === 0}
                                isLoading={savingSantri}
                            >
                                {savingSantri ? 'Menyimpan...' : `Tambahkan ${selectedSantriIds.length} Santri`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{editData ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => { setShowModal(false); setEditData(null) }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kelas *</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder="Contoh: 7A, 8B, 9C, 10 IPA 1"
                                        value={formData.nama}
                                        onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                        required
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Masukkan nama kelas beserta tingkatnya</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Wali Kelas</label>
                                    <select
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        value={formData.wali_kelas_id}
                                        onChange={e => setFormData({ ...formData, wali_kelas_id: e.target.value })}
                                    >
                                        <option value="">Pilih Wali Kelas</option>
                                        {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
                                <Button type="submit" disabled={saving} isLoading={saving}>
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
                itemName={kelasToDelete?.nama}
                message={`Apakah Anda yakin ingin menghapus kelas ${kelasToDelete?.nama}? Semua data santri dalam kelas ini akan kehilangan relasi kelas (tidak terhapus).`}
            />

            <ConfirmationModal
                isOpen={removeSantriModal.isOpen}
                onClose={() => setRemoveSantriModal({ isOpen: false, santriId: null })}
                onConfirm={handleRemoveSantriFromKelas}
                title="Hapus Santri dari Kelas"
                message="Apakah Anda yakin ingin menghapus santri ini dari kelas?"
                confirmLabel="Hapus"
                variant="danger"
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ ...saveModal, isOpen: false })}
                onConfirm={saveModal.type === 'add_santri' ? executeAddSantriToKelas : executeSave}
                title={saveModal.type === 'add_santri' ? "Konfirmasi Tambah Santri" : (editData ? "Konfirmasi Edit" : "Konfirmasi Tambah")}
                message={saveModal.type === 'add_santri'
                    ? `Apakah Anda yakin ingin menambahkan ${selectedSantriIds.length} santri ke kelas ini?`
                    : (editData ? 'Apakah Anda yakin ingin menyimpan perubahan data kelas ini?' : 'Apakah Anda yakin ingin menambahkan kelas baru ini?')}
                confirmLabel={saveModal.type === 'add_santri' ? "Tambahkan" : (editData ? "Simpan Perubahan" : "Buat Kelas")}
                variant="success"
                isLoading={saving || savingSantri}
            />
        </div>
    )
}

export default KelasPage
