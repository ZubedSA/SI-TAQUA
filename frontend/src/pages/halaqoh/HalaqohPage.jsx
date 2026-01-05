import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, RefreshCw, Users, Circle, MoreVertical, X, Check, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FormInput from '../../components/ui/FormInput'

const HalaqohPage = () => {
    const { isAdmin, isMusyrif } = useAuth()
    const showToast = useToast()

    const [guruList, setGuruList] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    const [halaqohList, setHalaqohList] = useState([])
    const [loading, setLoading] = useState(true)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [formData, setFormData] = useState({ nama: '', musyrif_id: '' })
    const [saving, setSaving] = useState(false)

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteItem, setDeleteItem] = useState(null)

    useEffect(() => {
        fetchHalaqoh()
        fetchGuru()
    }, [])

    const fetchHalaqoh = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('halaqoh')
                .select(`
                    id,
                    nama,
                    musyrif_id,
                    guru:guru!musyrif_id (nama)
                `)
                .order('nama')

            if (error) throw error
            setHalaqohList(data || [])
        } catch (error) {
            console.error('Error loading halaqoh:', error)
            showToast.error('Gagal memuat data halaqoh: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchGuru = async () => {
        try {
            const { data: guruData, error: guruError } = await supabase
                .from('guru')
                .select('id, nama')
                .order('nama')

            if (guruError) throw guruError
            setGuruList(guruData || [])
        } catch (err) {
            console.error('Error fetching guru:', err)
        }
    }

    const openAdd = () => {
        setEditItem(null)
        setFormData({ nama: '', musyrif_id: '' })
        setShowModal(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setFormData({ nama: item.nama, musyrif_id: item.musyrif_id || '' })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditItem(null)
        setFormData({ nama: '', musyrif_id: '' })
    }

    // Save Confirmation State
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const handleFormSubmit = (e) => {
        e.preventDefault()
        if (!formData.nama.trim()) {
            showToast.error('Nama halaqoh wajib diisi')
            return
        }
        setSaveModal({ isOpen: true })
    }

    const executeSave = async () => {
        setSaving(true)
        try {
            const payload = {
                nama: formData.nama.trim(),
                musyrif_id: formData.musyrif_id || null
            }

            if (editItem) {
                const { error } = await supabase
                    .from('halaqoh')
                    .update(payload)
                    .eq('id', editItem.id)
                if (error) throw error
                showToast.success('Halaqoh berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('halaqoh')
                    .insert([payload])
                if (error) throw error
                showToast.success('Halaqoh berhasil ditambahkan')
            }

            closeModal()
            fetchHalaqoh()
            setSaveModal({ isOpen: false })
        } catch (err) {
            console.error('Error saving:', err)
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const openDelete = (item) => {
        setDeleteItem(item)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!deleteItem) return

        try {
            const { error } = await supabase
                .from('halaqoh')
                .delete()
                .eq('id', deleteItem.id)

            if (error) throw error
            showToast.success('Halaqoh berhasil dihapus')
            setShowDeleteModal(false)
            setDeleteItem(null)
            fetchHalaqoh()
        } catch (err) {
            console.error('Error deleting:', err)
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    // Detail Member Modal State
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedHalaqoh, setSelectedHalaqoh] = useState(null)
    const [members, setMembers] = useState([])
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [availableSantri, setAvailableSantri] = useState([])
    const [selectedSantriToAdd, setSelectedSantriToAdd] = useState('')
    const [searchSantriTerm, setSearchSantriTerm] = useState('')

    const openDetail = async (halaqoh) => {
        setSelectedHalaqoh(halaqoh)
        setShowDetailModal(true)
        setMembers([]) // Clear previous
        fetchMembers(halaqoh.id)
    }

    const fetchMembers = async (halaqohId) => {
        if (!halaqohId) return
        setLoadingMembers(true)
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, kelas_id, kelas:kelas!kelas_id(nama)')
                .eq('halaqoh_id', halaqohId)
                .order('nama')

            if (error) throw error
            setMembers(data || [])
        } catch (err) {
            console.error('Error fetching members:', err)
            showToast.error('Gagal memuat anggota: ' + err.message)
        } finally {
            setLoadingMembers(false)
        }
    }

    const searchAvailableSantri = async (term) => {
        if (!term || term.length < 3) return
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, halaqoh_id, halaqoh:halaqoh!halaqoh_id(nama)')
                .ilike('nama', `%${term}%`)
                .ilike('status', 'Aktif')
                .limit(10)

            if (error) throw error
            setAvailableSantri(data || [])
        } catch (err) {
            console.error('Error searching santri:', err)
        }
    }

    // Member Confirmation States
    const [memberModal, setMemberModal] = useState({
        isOpen: false,
        type: null, // 'add' or 'remove'
        santriId: null
    })

    const confirmAddMember = () => {
        if (!selectedSantriToAdd || !selectedHalaqoh) {
            showToast.error('Silakan pilih santri terlebih dahulu')
            return
        }
        setMemberModal({ isOpen: true, type: 'add', santriId: selectedSantriToAdd })
    }

    const confirmRemoveMember = (santriId) => {
        setMemberModal({ isOpen: true, type: 'remove', santriId })
    }

    const executeAddMember = async () => {
        try {
            const { error } = await supabase
                .from('santri')
                .update({ halaqoh_id: selectedHalaqoh.id })
                .eq('id', memberModal.santriId)

            if (error) throw error

            showToast.success('Santri berhasil ditambahkan ke halaqoh')
            setSelectedSantriToAdd('')
            setSearchSantriTerm('')
            setAvailableSantri([])
            fetchMembers(selectedHalaqoh.id)
            setMemberModal({ isOpen: false, type: null, santriId: null })
        } catch (err) {
            console.error('Error adding member:', err)
            showToast.error('Gagal menambah anggota: ' + err.message)
        }
    }

    const executeRemoveMember = async () => {
        try {
            const { error } = await supabase
                .from('santri')
                .update({ halaqoh_id: null })
                .eq('id', memberModal.santriId)

            if (error) throw error

            showToast.success('Santri berhasil dikeluarkan dari halaqoh')
            fetchMembers(selectedHalaqoh.id)
            setMemberModal({ isOpen: false, type: null, santriId: null })
        } catch (err) {
            console.error('Error removing member:', err)
            showToast.error('Gagal mengeluarkan anggota: ' + err.message)
        }
    }

    // Effect for bouncing search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchSantriTerm) {
                searchAvailableSantri(searchSantriTerm)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchSantriTerm])


    const filteredData = halaqohList.filter(item =>
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.guru?.nama?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return <Spinner className="py-12" label="Memuat data halaqoh..." />
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Data Halaqoh"
                description="Kelola data halaqoh tahfidz dan anggotanya"
                icon={Circle}
                actions={
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={fetchHalaqoh}>
                            <RefreshCw size={18} />
                        </Button>
                        {isAdmin() && (
                            <Button onClick={openAdd}>
                                <Plus size={18} /> Tambah Halaqoh
                            </Button>
                        )}
                    </div>
                }
            />

            <Card className="border-gray-200">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">Daftar Halaqoh</h2>
                    <div className="relative w-full md:w-64">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari halaqoh..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {filteredData.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 w-16 text-center">No</th>
                                    <th className="px-6 py-3">Nama Halaqoh</th>
                                    <th className="px-6 py-3">Guru Pengajar</th>
                                    <th className="px-6 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-center text-gray-500">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-primary-100">
                                                    {item.nama?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{item.nama}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.guru?.nama ? (
                                                <Badge variant="info">{item.guru.nama}</Badge>
                                            ) : (
                                                <Badge variant="warning">Belum ditentukan</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Desktop Actions */}
                                            <div className="hidden md:flex items-center justify-end gap-2">
                                                <button
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    onClick={() => openDetail(item)}
                                                    title="Detail Anggota"
                                                >
                                                    <Users size={18} />
                                                </button>
                                                {isAdmin() && (
                                                    <>
                                                        <button
                                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                            onClick={() => openEdit(item)}
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            onClick={() => openDelete(item)}
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {/* Mobile Actions */}
                                            <div className="md:hidden flex justify-end">
                                                <MobileActionMenu
                                                    actions={[
                                                        {
                                                            icon: <Users size={16} />,
                                                            label: 'Anggota',
                                                            onClick: () => openDetail(item)
                                                        },
                                                        isAdmin() && {
                                                            icon: <Edit2 size={16} />,
                                                            label: 'Edit',
                                                            onClick: () => openEdit(item)
                                                        },
                                                        isAdmin() && {
                                                            icon: <Trash2 size={16} />,
                                                            label: 'Hapus',
                                                            danger: true,
                                                            onClick: () => openDelete(item)
                                                        }
                                                    ].filter(Boolean)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState
                            icon={Circle}
                            title="Tidak ada halaqoh"
                            message="Belum ada data halaqoh yang ditambahkan. Silakan tambahkan halaqoh baru."
                        />
                    )}
                </div>
            </Card>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{editItem ? 'Edit Halaqoh' : 'Tambah Halaqoh'}</h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={closeModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4">
                                <FormInput
                                    label="Nama Halaqoh"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    placeholder="Contoh: Halaqoh A, Halaqoh B"
                                    required
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Guru Pengajar</label>
                                    <select
                                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        value={formData.musyrif_id}
                                        onChange={(e) => setFormData({ ...formData, musyrif_id: e.target.value })}
                                    >
                                        <option value="">Pilih Guru (opsional)</option>
                                        {guruList.map(guru => (
                                            <option key={guru.id} value={guru.id}>{guru.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={closeModal}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={saving} isLoading={saving}>
                                    {saving ? 'Menyimpan...' : (editItem ? 'Simpan Perubahan' : 'Tambah')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                itemName={deleteItem?.nama}
            />

            {/* Detail Members Modal */}
            {showDetailModal && selectedHalaqoh && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Users size={20} className="text-primary-600" />
                                    Anggota Halaqoh: {selectedHalaqoh.nama}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Pengajar: {selectedHalaqoh.guru?.nama || 'Belum ditentukan'}</p>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowDetailModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-hidden flex flex-col h-full bg-gray-50">
                            {/* Add Member Section */}
                            <div className="bg-white rounded-lg border border-primary-200 p-4 mb-4 shadow-sm">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Plus size={16} className="text-primary-500" /> Tambah Anggota Baru
                                </h4>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            {selectedSantriToAdd ? <Check size={18} className="text-green-500" /> : <Search size={18} />}
                                        </div>
                                        <input
                                            type="text"
                                            className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${selectedSantriToAdd
                                                    ? 'bg-green-50 border-green-500 text-green-700'
                                                    : 'bg-white border-gray-200 focus:border-primary-500'
                                                }`}
                                            placeholder="Ketik nama santri..."
                                            value={searchSantriTerm}
                                            onChange={(e) => {
                                                setSearchSantriTerm(e.target.value)
                                                setSelectedSantriToAdd('') // Reset selection on typing
                                            }}
                                        />

                                        {/* Dropdown Results */}
                                        {searchSantriTerm && !selectedSantriToAdd && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {availableSantri.length > 0 ? (
                                                    availableSantri.map(s => (
                                                        <div
                                                            key={s.id}
                                                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                                                            onClick={() => {
                                                                setSelectedSantriToAdd(s.id)
                                                                setSearchSantriTerm(s.nama)
                                                                setAvailableSantri([])
                                                            }}
                                                        >
                                                            <div className="font-medium text-gray-900">{s.nama} <span className="text-gray-400 text-xs">({s.nis})</span></div>
                                                            {s.halaqoh && (
                                                                <div className="text-xs text-amber-600 bg-amber-50 inline-block px-1.5 py-0.5 rounded mt-0.5">
                                                                    Dari: {s.halaqoh.nama}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-center text-sm text-gray-500">
                                                        {searchSantriTerm.length < 3 ? 'Ketik minimal 3 karakter...' : 'Tidak ada santri ditemukan.'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={confirmAddMember}
                                        disabled={!selectedSantriToAdd}
                                        className="shrink-0"
                                    >
                                        <Plus size={18} /> Tambah
                                    </Button>
                                </div>
                                {selectedSantriToAdd && (
                                    <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                        <Check size={12} /> Santri terpilih. Klik tombol Tambah untuk menyimpan.
                                    </p>
                                )}
                            </div>

                            {/* Members List Table */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col shadow-sm">
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0">
                                            <tr>
                                                <th className="px-5 py-3 w-12 text-center">No</th>
                                                <th className="px-5 py-3">NIS</th>
                                                <th className="px-5 py-3">Nama Santri</th>
                                                <th className="px-5 py-3">Kelas</th>
                                                <th className="px-5 py-3 text-center w-16">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loadingMembers ? (
                                                <tr><td colSpan="5" className="text-center py-12 text-gray-500">Memuat data anggota...</td></tr>
                                            ) : members.length === 0 ? (
                                                <tr><td colSpan="5" className="text-center py-12 text-gray-500">Belum ada anggota di halaqoh ini.</td></tr>
                                            ) : (
                                                members.map((m, idx) => (
                                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-5 py-3 text-center text-gray-500">{idx + 1}</td>
                                                        <td className="px-5 py-3 font-mono text-gray-600">{m.nis}</td>
                                                        <td className="px-5 py-3 font-medium text-gray-900">{m.nama}</td>
                                                        <td className="px-5 py-3 text-gray-600">{m.kelas?.nama || '-'}</td>
                                                        <td className="px-5 py-3 text-center">
                                                            <button
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Keluarkan dari halaqoh"
                                                                onClick={() => confirmRemoveMember(m.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end shrink-0">
                            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                                Tutup
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeSave}
                title={editItem ? "Konfirmasi Edit" : "Konfirmasi Tambah"}
                message={editItem ? 'Apakah Anda yakin ingin menyimpan perubahan data halaqoh ini?' : 'Apakah Anda yakin ingin menambahkan halaqoh baru ini?'}
                confirmLabel={editItem ? "Simpan Perubahan" : "Tambah Halaqoh"}
                variant="primary"
                isLoading={saving}
            />

            <ConfirmationModal
                isOpen={memberModal.isOpen}
                onClose={() => setMemberModal({ ...memberModal, isOpen: false })}
                onConfirm={memberModal.type === 'add' ? executeAddMember : executeRemoveMember}
                title={memberModal.type === 'add' ? "Konfirmasi Tambah Anggota" : "Konfirmasi Hapus Anggota"}
                message={memberModal.type === 'add' ? "Apakah Anda yakin ingin menambahkan santri ini ke halaqoh?" : "Apakah Anda yakin ingin mengeluarkan santri ini dari halaqoh?"}
                confirmLabel={memberModal.type === 'add' ? "Tambah" : "Keluarkan"}
                variant={memberModal.type === 'add' ? "success" : "danger"}
            />
        </div>
    )
}

export default HalaqohPage
