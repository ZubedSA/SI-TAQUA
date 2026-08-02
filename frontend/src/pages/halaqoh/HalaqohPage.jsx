import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Edit2, Trash2, RefreshCw, Users, Circle, MoreVertical, X, Check, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import FormInput from '../../components/ui/FormInput'
import { useHalaqohList } from '../../hooks/features/useHalaqohList'

const HalaqohPage = () => {
    const { isAdmin, isAdminAkademik, userProfile, hasRole } = useAuth()
    const canEdit = isAdmin() || isAdminAkademik() || userProfile?.role === 'admin' || hasRole('admin')

    const showToast = useToast()

    const { data: queryData, isLoading: loading, refetch: fetchHalaqoh } = useHalaqohList()
    const halaqohList = queryData?.halaqohList || []
    const musyrifList = queryData?.musyrifList || []
    const guruList = queryData?.guruList || []
    const [searchTerm, setSearchTerm] = useState('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [formData, setFormData] = useState({ nama: '', musyrif_id: '' })
    const [saving, setSaving] = useState(false)

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteItem, setDeleteItem] = useState(null)

    const openAdd = (e) => {
        if (e) e.stopPropagation();
        setEditItem(null)
        setFormData({ nama: '', musyrif_id: '', musyrif_ids: [] })
        setShowModal(true)
    }

    const openEdit = (item, e) => {
        if (e) e.stopPropagation();
        setEditItem(item)
        setFormData({
            nama: item.nama,
            musyrif_id: item.musyrif_id || '',
            musyrif_ids: item.musyrifs ? item.musyrifs.map(m => m.user_id) : []
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditItem(null)
        setFormData({ nama: '', musyrif_id: '', musyrif_ids: [] })
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
            // Find corresponding guru_id for the first selected musyrif for legacy compatibility
            let firstLegacyMusyrifId = null;
            if (formData.musyrif_ids && formData.musyrif_ids.length > 0) {
                const firstUserObj = musyrifList.find(m => m.user_id === formData.musyrif_ids[0]);
                if (firstUserObj) {
                    const matchedGuru = guruList.find(g => g.email === firstUserObj.email);
                    if (matchedGuru) {
                        firstLegacyMusyrifId = matchedGuru.id;
                    }
                }
            }

            const payload = {
                nama: formData.nama.trim(),
                musyrif_id: firstLegacyMusyrifId
            }

            let halaqohId = editItem?.id;

            if (editItem) {
                const { error } = await supabase
                    .from('halaqoh')
                    .update(payload)
                    .eq('id', editItem.id)
                if (error) throw error
                showToast.success('Halaqoh berhasil diperbarui')
            } else {
                const { data, error } = await supabase
                    .from('halaqoh')
                    .insert([payload])
                    .select('id')
                    .single()
                if (error) throw error
                halaqohId = data.id;
                showToast.success('Halaqoh berhasil ditambahkan')
            }

            // Sync musyrif_halaqoh assignments
            // 1. Delete legacy assignments for this halaqoh
            const { error: resetError } = await supabase
                .from('musyrif_halaqoh')
                .delete()
                .eq('halaqoh_id', halaqohId)

            if (resetError) throw resetError

            // 2. Insert new assignments
            if (formData.musyrif_ids && formData.musyrif_ids.length > 0) {
                const links = formData.musyrif_ids.map(uid => ({
                    halaqoh_id: halaqohId,
                    user_id: uid
                }))
                const { error: linkError } = await supabase
                    .from('musyrif_halaqoh')
                    .insert(links)
                if (linkError) throw linkError
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

    const openDelete = (item, e) => {
        if (e) e.stopPropagation();
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

    const openDetail = async (halaqoh, e) => {
        if (e) e.stopPropagation();
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
                .eq('status', 'Aktif')
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
            const { data, error } = await supabase
                .from('santri')
                .update({ halaqoh_id: selectedHalaqoh.id })
                .eq('id', memberModal.santriId)
                .select()

            if (error) throw error
            if (!data || data.length === 0) {
                throw new Error('Gagal update: Data tidak ditemukan atau Anda tidak memiliki akses.')
            }

            showToast.success('Santri berhasil ditambahkan ke halaqoh')
            setSelectedSantriToAdd('')
            setSearchSantriTerm('')
            setAvailableSantri([])
            await fetchMembers(selectedHalaqoh.id)
            setMemberModal({ isOpen: false, type: null, santriId: null })
        } catch (err) {
            console.error('Error adding member:', err)
            showToast.error('Gagal menambah anggota: ' + err.message)
        }
    }

    const executeRemoveMember = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .update({ halaqoh_id: null })
                .eq('id', memberModal.santriId)
                .select()

            if (error) throw error
            if (!data || data.length === 0) {
                throw new Error('Gagal update: Data tidak ditemukan atau Anda tidak memiliki akses.')
            }

            showToast.success('Santri berhasil dikeluarkan dari halaqoh')
            await fetchMembers(selectedHalaqoh.id)
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


    const filteredData = halaqohList.filter(item => {
        const matchesNama = (item.nama?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesGuru = (item.guru?.nama?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesMusyrifs = item.musyrifs?.some(m => (m.nama?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
        return matchesNama || matchesGuru || matchesMusyrifs;
    })

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
                        {canEdit && (
                            <button 
                                type="button" 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                                onClick={openAdd}
                            >
                                <Plus size={18} /> Tambah Halaqoh
                            </button>
                        )}
                    </div>
                }
            />

            {loading ? (
                <Spinner className="py-12" label="Memuat data halaqoh..." />
            ) : (
                <Card className="border-gray-200">
                    <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-50 rounded-xl">
                                <Users size={20} className="text-primary-600" />
                            </div>
                            <div className="text-base font-bold text-gray-900">Daftar Halaqoh ({filteredData.length})</div>
                        </div>
                        <div className="w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Cari halaqoh..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <ResponsiveTable
                        columns={[
                            { 
                                header: 'Informasi Halaqoh', 
                                render: (row) => (
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary-100 group-hover:scale-110 transition-transform">
                                            {row.nama?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 leading-tight">{row.nama}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Tahfidz Quraniyah</div>
                                        </div>
                                    </div>
                                ),
                                className: 'px-8 py-5',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Guru Pengajar / Musyrif', 
                                render: (row) => (
                                    row.musyrifs && row.musyrifs.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1"></div>
                                            {row.musyrifs.map(m => (
                                                <span key={m.user_id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black text-primary-700 bg-primary-50 border border-primary-100 uppercase tracking-tight">
                                                    {m.nama}
                                                </span>
                                            ))}
                                        </div>
                                    ) : row.guru?.nama ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{row.guru.nama}</span>
                                        </div>
                                    ) : (
                                        <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                            Belum ditentukan
                                        </span>
                                    )
                                ),
                                className: 'px-8 py-5',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Aksi', 
                                className: 'px-8 py-5 text-right',
                                render: (row) => (
                                    <div className="flex items-center justify-end gap-2 transition-all">
                                        <button
                                            type="button"
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100"
                                            onClick={(e) => { e.stopPropagation(); openDetail(row, e); }}
                                            title="Detail Anggota"
                                        >
                                            <Users size={18} />
                                        </button>
                                        {canEdit && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100"
                                                    onClick={(e) => { e.stopPropagation(); openEdit(row, e); }}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100"
                                                    onClick={(e) => { e.stopPropagation(); openDelete(row, e); }}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) 
                            }
                        ]}
                        data={filteredData}
                        loading={false}
                        emptyState={
                            <EmptyState icon={Circle} title="Tidak ada halaqoh" />
                        }
                        mobileCardHeader={(row) => (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-primary-100 shrink-0">
                                    {row.nama?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="font-black text-gray-900 text-base leading-tight">{row.nama}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tahfidz Quraniyah</div>
                                </div>
                            </div>
                        )}
                        mobileCardActions={(row) => {
                            const actions = [
                                { icon: <Users size={16} />, label: 'Anggota', onClick: () => openDetail(row) }
                            ];
                            if (canEdit) {
                                actions.push({ icon: <Edit2 size={16} />, label: 'Edit', onClick: () => openEdit(row) });
                                actions.push({ icon: <Trash2 size={16} />, label: 'Hapus', onClick: () => openDelete(row), danger: true });
                            }
                            return <MobileActionMenu actions={actions} />;
                        }}
                        mobileCardContent={(row) => (
                            <div className="flex flex-wrap gap-2 pt-1 w-full mt-1">
                                <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 w-full">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter shrink-0">Musyrif:</span>
                                    {row.musyrifs && row.musyrifs.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {row.musyrifs.map(m => (
                                                <span key={m.user_id} className="text-[10px] font-black text-primary-700 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded-lg">
                                                    {m.nama}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black text-gray-700">{row.guru?.nama || 'Belum ditentukan'}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    />
                </Card>
            )}

            {/* Modals rendered directly in the component tree */}
            {/* Add/Edit Modal */}
            {showModal && createPortal(
                <div className="modal-overlay visible opacity-100" style={{ zIndex: 999999, display: 'flex', visibility: 'visible', opacity: 1 }}>
                    <div className="modal-box w-full max-w-md">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Musyrif (Dapat lebih dari satu)</label>
                                    <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-white">
                                        {musyrifList.length > 0 ? (
                                            musyrifList.map(musyrif => {
                                                const isChecked = formData.musyrif_ids?.includes(musyrif.user_id);
                                                return (
                                                    <label key={musyrif.user_id} className="flex items-center gap-3 p-1.5 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 transition-all"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                let updatedIds;
                                                                if (isChecked) {
                                                                    updatedIds = formData.musyrif_ids.filter(id => id !== musyrif.user_id);
                                                                } else {
                                                                    updatedIds = [...formData.musyrif_ids, musyrif.user_id];
                                                                }
                                                                setFormData({ ...formData, musyrif_ids: updatedIds });
                                                            }}
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">{musyrif.nama}</span>
                                                    </label>
                                                )
                                            })
                                        ) : (
                                            <div className="text-sm text-gray-500 text-center py-4">Tidak ada musyrif tersedia</div>
                                        )}
                                    </div>
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
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                itemName={deleteItem?.nama}
            />

            {/* Detail Members Modal */}
            {showDetailModal && selectedHalaqoh && createPortal(
                <div className="modal-overlay visible opacity-100" style={{ zIndex: 999999, display: 'flex', visibility: 'visible', opacity: 1 }}>
                    <div className="modal-box w-full max-w-3xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Users size={20} className="text-primary-600" />
                                    Anggota Halaqoh: {selectedHalaqoh.nama}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Pengajar: {
                                        selectedHalaqoh.musyrifs && selectedHalaqoh.musyrifs.length > 0 
                                            ? selectedHalaqoh.musyrifs.map(m => m.nama).join(', ')
                                            : (selectedHalaqoh.guru?.nama || 'Belum ditentukan')
                                    }
                                </p>
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
                                <ResponsiveTable
                                    columns={[
                                        { header: 'NIS', accessor: 'nis', className: 'px-5 py-3 font-mono text-gray-600', hideOnMobile: true },
                                        { header: 'Nama Santri', accessor: 'nama', className: 'px-5 py-3 font-medium text-gray-900', hideOnMobile: true },
                                        { header: 'Kelas', render: (row) => row.kelas?.nama || '-', className: 'px-5 py-3 text-gray-600', hideOnMobile: true },
                                        { 
                                            header: 'Aksi', 
                                            className: 'px-5 py-3 text-center w-16',
                                            render: (row) => (
                                                <button
                                                    type="button"
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Keluarkan dari halaqoh"
                                                    onClick={(e) => { e.stopPropagation(); confirmRemoveMember(row.id); }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) 
                                        }
                                    ]}
                                    data={members}
                                    loading={loadingMembers}
                                    loadingComponent={<div className="text-center py-12 text-gray-500">Memuat data anggota...</div>}
                                    emptyState={<div className="text-center py-12 text-gray-500">Belum ada anggota di halaqoh ini.</div>}
                                    mobileCardHeader={(row) => (
                                        <div className="font-medium text-gray-900">{row.nama}</div>
                                    )}
                                    mobileCardActions={(row) => (
                                        <button
                                            type="button"
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Keluarkan dari halaqoh"
                                            onClick={(e) => { e.stopPropagation(); confirmRemoveMember(row.id); }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    mobileCardContent={(row) => (
                                        <div className="flex flex-col gap-1 text-sm text-gray-600 mt-1">
                                            <div><span className="font-medium">NIS:</span> {row.nis}</div>
                                            <div><span className="font-medium">Kelas:</span> {row.kelas?.nama || '-'}</div>
                                        </div>
                                    )}
                                />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end shrink-0">
                            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                                Tutup
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
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
