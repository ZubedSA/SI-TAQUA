import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Calendar, CheckCircle, RefreshCw, Edit, Trash2, Clock, Shield, Sparkles, AlertCircle, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/layout/PageHeader'
import StatsCard from '../../components/ui/StatsCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import './Semester.css'

const SemesterPage = () => {
    const { isAdmin, isAdminAkademik, userProfile, hasRole } = useAuth()
    const canEdit = isAdmin() || isAdminAkademik() || userProfile?.role === 'admin' || hasRole('admin')
    const showToast = useToast()

    const [semesterList, setSemesterList] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [currentId, setCurrentId] = useState(null)
    const [formData, setFormData] = useState({ nama: 'Ganjil', tahun_ajaran: '', tanggal_mulai: '', tanggal_selesai: '' })
    
    // Confirmation Modals
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedDeleteId, setSelectedDeleteId] = useState(null)
    
    const [activateModal, setActivateModal] = useState({ isOpen: false, sem: null })
    const [deactivateModal, setDeactivateModal] = useState({ isOpen: false, sem: null })

    useEffect(() => {
        fetchSemester()
    }, [])

    const fetchSemester = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('semester')
                .select('*')
                .order('is_active', { ascending: false })
                .order('tahun_ajaran', { ascending: false })

            if (error) throw error
            setSemesterList(data || [])
        } catch (err) {
            console.error('Error fetching semester:', err.message)
            showToast.error('Gagal memuat data semester: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({ nama: 'Ganjil', tahun_ajaran: '', tanggal_mulai: '', tanggal_selesai: '' })
        setEditMode(false)
        setCurrentId(null)
    }

    const openAddModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (sem) => {
        setFormData({
            nama: sem.nama,
            tahun_ajaran: sem.tahun_ajaran,
            tanggal_mulai: sem.tanggal_mulai || '',
            tanggal_selesai: sem.tanggal_selesai || ''
        })
        setCurrentId(sem.id)
        setEditMode(true)
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.tahun_ajaran) {
            showToast.error('Tahun ajaran wajib diisi')
            return
        }

        setSaving(true)
        try {
            if (editMode) {
                const { error } = await supabase
                    .from('semester')
                    .update(formData)
                    .eq('id', currentId)
                if (error) throw error
                showToast.success('Data semester berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('semester')
                    .insert([{ ...formData, is_active: false }])
                if (error) throw error
                showToast.success('Semester baru berhasil ditambahkan')
            }
            fetchSemester()
            setShowModal(false)
            resetForm()
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmActivate = async () => {
        if (!activateModal.sem) return
        const targetId = activateModal.sem.id
        setSaving(true)
        try {
            // Nonaktifkan semua semester terlebih dahulu
            await supabase.from('semester').update({ is_active: false }).eq('is_active', true)

            // Aktifkan semester terpilih
            const { error } = await supabase.from('semester').update({ is_active: true }).eq('id', targetId)
            if (error) throw error

            showToast.success(`Semester ${activateModal.sem.nama} (${activateModal.sem.tahun_ajaran}) berhasil diaktifkan`)
            fetchSemester()
            setActivateModal({ isOpen: false, sem: null })
        } catch (err) {
            showToast.error('Gagal mengaktifkan semester: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmDeactivate = async () => {
        if (!deactivateModal.sem) return
        const targetId = deactivateModal.sem.id
        setSaving(true)
        try {
            const { error } = await supabase.from('semester').update({ is_active: false }).eq('id', targetId)
            if (error) throw error

            showToast.success(`Semester ${deactivateModal.sem.nama} telah dinonaktifkan`)
            fetchSemester()
            setDeactivateModal({ isOpen: false, sem: null })
        } catch (err) {
            showToast.error('Gagal menonaktifkan semester: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = (id) => {
        setSelectedDeleteId(id)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!selectedDeleteId) return
        try {
            const { error } = await supabase.from('semester').delete().eq('id', selectedDeleteId)
            if (error) throw error
            fetchSemester()
            setShowDeleteModal(false)
            setSelectedDeleteId(null)
            showToast.success('Data semester berhasil dihapus')
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const initData = async () => {
        if (!confirm('Ini akan menambahkan data semester default (Ganjil & Genap). Lanjutkan?')) return
        setLoading(true)
        try {
            const currentYear = new Date().getFullYear()
            const { error } = await supabase.from('semester').insert([
                { nama: 'Ganjil', tahun_ajaran: `${currentYear}/${currentYear + 1}`, tanggal_mulai: `${currentYear}-07-15`, tanggal_selesai: `${currentYear}-12-20`, is_active: true },
                { nama: 'Genap', tahun_ajaran: `${currentYear}/${currentYear + 1}`, tanggal_mulai: `${currentYear + 1}-01-05`, tanggal_selesai: `${currentYear + 1}-06-20`, is_active: false }
            ])
            if (error) throw error
            fetchSemester()
            showToast.success('Data semester default berhasil digenerate')
        } catch (err) {
            showToast.error('Gagal meng-generate data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const activeSem = semesterList.find(s => s.is_active)

    return (
        <div className="space-y-6 pb-12">
            {/* PAGE HEADER */}
            <PageHeader
                title="Manajemen Semester"
                description="Kelola periode semester, rentang tanggal aktif, dan tahun ajaran SI-TAQUA"
                actions={
                    <div className="flex items-center gap-2">
                        {semesterList.length === 0 && canEdit && (
                            <Button variant="outline" size="sm" onClick={initData}>
                                <Sparkles size={16} className="mr-1.5" /> Generate Default
                            </Button>
                        )}
                        {canEdit && (
                            <Button variant="primary" onClick={openAddModal}>
                                <Plus size={18} className="mr-1.5" /> Tambah Semester
                            </Button>
                        )}
                    </div>
                }
            />

            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    title="Total Semester"
                    value={semesterList.length}
                    icon={Calendar}
                    color="primary"
                />
                <StatsCard
                    title="Semester Aktif"
                    value={activeSem ? `Semester ${activeSem.nama}` : 'Belum Ada'}
                    trendLabel={activeSem ? activeSem.tahun_ajaran : ''}
                    icon={CheckCircle}
                    color="green"
                />
                <StatsCard
                    title="Rentang Tanggal Aktif"
                    value={activeSem?.tanggal_mulai ? `${formatDate(activeSem.tanggal_mulai)}` : '-'}
                    trendLabel={activeSem?.tanggal_selesai ? `s/d ${formatDate(activeSem.tanggal_selesai)}` : 'Tanggal belum diatur'}
                    icon={Clock}
                    color="blue"
                />
            </div>

            {/* MAIN CONTENT AREA */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-xs">
                    <RefreshCw size={32} className="spin text-emerald-600 mb-3" />
                    <p className="text-sm font-semibold text-gray-600">Memuat data semester...</p>
                </div>
            ) : semesterList.length === 0 ? (
                <Card className="p-12 text-center flex flex-col items-center justify-center">
                    <Calendar size={48} className="text-gray-300 mb-3" />
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Belum Ada Data Semester</h3>
                    <p className="text-xs text-gray-500 max-w-md mb-4">
                        Silakan tambahkan periode semester baru atau tekan tombol di bawah untuk membuat data default.
                    </p>
                    {canEdit && (
                        <Button variant="primary" onClick={initData}>
                            <Sparkles size={16} className="mr-1.5" /> Generate Data Default
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {semesterList.map(sem => {
                        const isCurrentActive = Boolean(sem.is_active)
                        return (
                            <div
                                key={sem.id}
                                className={`relative rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between ${
                                    isCurrentActive
                                        ? 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10'
                                        : 'bg-white border border-gray-200/90 hover:border-gray-300 shadow-xs hover:shadow-md'
                                }`}
                            >
                                {/* HEADER CARD */}
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                                Tahun Ajaran {sem.tahun_ajaran}
                                            </span>
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                                Semester {sem.nama}
                                            </h3>
                                        </div>

                                        <Badge variant={isCurrentActive ? 'success' : 'neutral'}>
                                            {isCurrentActive ? (
                                                <span className="flex items-center gap-1 font-bold">
                                                    <CheckCircle size={12} /> Semester Aktif
                                                </span>
                                            ) : (
                                                'Tidak Aktif'
                                            )}
                                        </Badge>
                                    </div>

                                    {/* DATES DISPLAY BOX */}
                                    <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 space-y-2.5 mb-6">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                                <Calendar size={14} className="text-emerald-600" /> Tanggal Mulai:
                                            </span>
                                            <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                {formatDate(sem.tanggal_mulai)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                                <Clock size={14} className="text-emerald-600" /> Tanggal Selesai:
                                            </span>
                                            <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                {formatDate(sem.tanggal_selesai)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* CARD ACTIONS */}
                                {canEdit && (
                                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                                        {isCurrentActive ? (
                                            <button
                                                type="button"
                                                onClick={() => setDeactivateModal({ isOpen: true, sem })}
                                                className="w-full py-2 px-3 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <span>Nonaktifkan Semester Ini</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setActivateModal({ isOpen: true, sem })}
                                                className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckCircle size={15} />
                                                <span>Set Sebagai Semester Aktif</span>
                                            </button>
                                        )}

                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(sem)}
                                                className="py-1.5 px-3 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Edit size={13} className="text-gray-500" /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => confirmDelete(sem.id)}
                                                className="py-1.5 px-3 text-xs font-semibold text-red-600 bg-red-50/50 hover:bg-red-50 border border-red-200/60 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Trash2 size={13} className="text-red-500" /> Hapus
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ADD / EDIT MODAL PORTAL */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
                        {/* MODAL HEADER */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">
                                        {editMode ? 'Edit Data Semester' : 'Tambah Semester Baru'}
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        {editMode ? 'Perbarui informasi rentang semester' : 'Buat periode semester dan tahun ajaran baru'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* MODAL FORM */}
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Nama Semester *</label>
                                    <select
                                        className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-2.5 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all cursor-pointer"
                                        value={formData.nama}
                                        onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                        required
                                    >
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                        <option value="Semester Antara">Semester Antara</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Tahun Ajaran *</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-2.5 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all"
                                        placeholder="Contoh: 2026/2027"
                                        value={formData.tahun_ajaran}
                                        onChange={e => setFormData({ ...formData, tahun_ajaran: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-700">Tanggal Mulai</label>
                                        <input
                                            type="date"
                                            className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-2.5 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all"
                                            value={formData.tanggal_mulai}
                                            onChange={e => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-700">Tanggal Selesai</label>
                                        <input
                                            type="date"
                                            className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl px-3 py-2.5 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition-all"
                                            value={formData.tanggal_selesai}
                                            onChange={e => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* MODAL FOOTER */}
                            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowModal(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    disabled={saving}
                                >
                                    {saving ? <><RefreshCw size={14} className="spin mr-1.5" /> Menyimpan...</> : 'Simpan Data'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* CONFIRMATION MODALS */}
            <ConfirmationModal
                isOpen={activateModal.isOpen}
                onClose={() => setActivateModal({ isOpen: false, sem: null })}
                onConfirm={handleConfirmActivate}
                title="Aktifkan Semester Ini?"
                message={`Anda akan mengaktifkan Semester ${activateModal.sem?.nama} (${activateModal.sem?.tahun_ajaran}) sebagai semester akademik aktif utama.`}
                description="Hanya 1 semester yang dapat aktif secara bersamaan. Semester aktif sebelumnya akan otomatis dinonaktifkan."
                confirmLabel="Ya, Aktifkan Semester"
                variant="success"
                isLoading={saving}
            />

            <ConfirmationModal
                isOpen={deactivateModal.isOpen}
                onClose={() => setDeactivateModal({ isOpen: false, sem: null })}
                onConfirm={handleConfirmDeactivate}
                title="Nonaktifkan Semester Ini?"
                message={`Anda yakin ingin menonaktifkan Semester ${deactivateModal.sem?.nama}?`}
                description="Setelah dinonaktifkan, tidak ada semester yang ditandai aktif hingga Anda menentukan semester aktif baru."
                confirmLabel="Ya, Nonaktifkan"
                variant="warning"
                isLoading={saving}
            />

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Hapus Data Semester"
                message="Perhatian: Menghapus data semester ini dapat memengaruhi riwayat nilai dan laporan akademik terkait. Apakah Anda yakin ingin menghapus data semester ini?"
            />
        </div>
    )
}

export default SemesterPage
