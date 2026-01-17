import { useState, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Calendar, Trash2, Edit2, X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabase'
import { useKalenderAkademik } from '../../../hooks/useAkademik'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import ConfirmationModal from '../../../components/ui/ConfirmationModal'
import PageHeader from '../../../components/layout/PageHeader'

const EVENT_TYPES = [
    { id: 'Libur', label: 'Libur', color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'Ujian', label: 'Ujian', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'Kegiatan', label: 'Kegiatan', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'Rapat', label: 'Rapat', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'Lainnya', label: 'Lainnya', color: 'bg-gray-100 text-gray-700 border-gray-200' }
]

const KalenderAkademikPage = () => {
    const { user, isAdmin, hasRole } = useAuth()
    const canEdit = isAdmin() || hasRole('guru')
    const showToast = useToast()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [filters, setFilters] = useState({ tahun: new Date().getFullYear() })
    const { data: events = [], isLoading, refetch } = useKalenderAkademik(filters)

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [form, setForm] = useState({
        judul: '',
        deskripsi: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        jenis: 'Kegiatan'
    })
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null })

    // Calendar Helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month, 1).getDay() // 0 = Sunday
    }

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const formatDate = (d) => d.toISOString().split('T')[0]

    // Events for current month cells
    const getEventsForDay = (day) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0]
        return events.filter(e => {
            return dateStr >= e.tanggal_mulai && dateStr <= e.tanggal_selesai
        })
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                ...form,
                created_by: user?.id
            }

            if (editItem) {
                const { error } = await supabase.from('kalender_akademik').update(payload).eq('id', editItem.id)
                if (error) throw error
                showToast.success('Agenda berhasil diperbarui')
            } else {
                const { error } = await supabase.from('kalender_akademik').insert([payload])
                if (error) throw error
                showToast.success('Agenda baru berhasil ditambahkan')
            }
            setShowModal(false)
            resetForm()
            refetch()
        } catch (err) {
            console.error(err)
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.item) return
        try {
            const { error } = await supabase.from('kalender_akademik').delete().eq('id', deleteModal.item.id)
            if (error) throw error
            showToast.success('Agenda dihapus')
            setDeleteModal({ isOpen: false, item: null })
            refetch()
        } catch (err) {
            console.error(err)
            showToast.error('Gagal menghapus')
        }
    }

    const resetForm = () => {
        setForm({
            judul: '',
            deskripsi: '',
            tanggal_mulai: formatDate(new Date()),
            tanggal_selesai: formatDate(new Date()),
            jenis: 'Kegiatan'
        })
        setEditItem(null)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            judul: item.judul,
            deskripsi: item.deskripsi || '',
            tanggal_mulai: item.tanggal_mulai,
            tanggal_selesai: item.tanggal_selesai,
            jenis: item.jenis
        })
        setShowModal(true)
    }

    // Calendar Grid
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate)
        const firstDay = getFirstDayOfMonth(currentDate) // 0 (Sun) - 6 (Sat)
        // Adjust for Monday start if needed, but standard US/Intl uses Sun=0. Let's create empty slots.

        const blanks = Array(firstDay).fill(null)
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        const totalSlots = [...blanks, ...days]

        return (
            <div className="grid grid-cols-7 gap-1 lg:gap-2">
                {['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => (
                    <div key={d} className="p-2 text-center font-semibold text-gray-500 text-sm bg-gray-50 rounded-lg">
                        {d}
                    </div>
                ))}
                {totalSlots.map((day, i) => {
                    if (!day) return <div key={`blank-${i}`} className="h-24 lg:h-32 bg-gray-50/30 rounded-lg border border-transparent"></div>

                    const dayEvents = getEventsForDay(day)
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()

                    return (
                        <div key={day} className={`h-24 lg:h-32 p-1 lg:p-2 border rounded-lg bg-white hover:border-primary-300 transition-colors overflow-y-auto ${isToday ? 'border-primary-500 ring-1 ring-primary-200' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}`}>
                                    {day}
                                </span>
                                {canEdit && (
                                    <button
                                        onClick={() => {
                                            resetForm()
                                            // Set form date to this day
                                            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 8).toISOString().split('T')[0] // local time safeish
                                            setForm(prev => ({ ...prev, tanggal_mulai: dateStr, tanggal_selesai: dateStr }))
                                            setShowModal(true)
                                        }}
                                        className="text-gray-300 hover:text-primary-600 p-0.5"
                                    >
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1">
                                {dayEvents.map(ev => {
                                    const typeConfig = EVENT_TYPES.find(t => t.id === ev.jenis) || EVENT_TYPES[4]
                                    return (
                                        <div
                                            key={ev.id}
                                            onClick={() => canEdit && openEdit(ev)}
                                            className={`text-xs p-1 rounded border cursor-pointer truncate ${typeConfig.color} ${canEdit ? 'hover:opacity-80' : ''}`}
                                            title={`${ev.judul} (${ev.jenis})`}
                                        >
                                            {ev.judul}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="p-6">
            <PageHeader
                icon={Calendar}
                title="Kalender Akademik"
                subtitle="Agenda kegiatan, hari libur, dan jadwal ujian pesantren"
            >
                {canEdit && (
                    <button onClick={() => { resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2">
                        <Plus size={18} /> Tambah Agenda
                    </button>
                )}
            </PageHeader>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Calendar Toolbar */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex bg-white rounded-lg border border-gray-300 p-0.5">
                            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={20} /></button>
                            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                    >
                        Hari Ini
                    </button>
                </div>

                {/* Legend */}
                <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-gray-200 bg-white">
                    {EVENT_TYPES.map(t => (
                        <div key={t.id} className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${t.color}`}>
                            <span className="w-1.5 h-1.5 bg-current rounded-full opacity-50"></span>
                            {t.label}
                        </div>
                    ))}
                </div>

                {/* Calendar View */}
                <div className="p-4">
                    {isLoading ? <Spinner label="Memuat kalender..." /> : renderCalendar()}
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">{editItem ? 'Edit Agenda' : 'Agenda Baru'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Agenda</label>
                                <input
                                    type="text"
                                    value={form.judul}
                                    onChange={e => setForm({ ...form, judul: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
                                    <input
                                        type="date"
                                        value={form.tanggal_mulai}
                                        onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
                                    <input
                                        type="date"
                                        value={form.tanggal_selesai}
                                        onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Agenda</label>
                                <select
                                    value={form.jenis}
                                    onChange={e => setForm({ ...form, jenis: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                                <textarea
                                    value={form.deskripsi}
                                    onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    rows={3}
                                ></textarea>
                            </div>

                            <div className="flex gap-3 pt-2">
                                {editItem && (
                                    <button
                                        type="button"
                                        onClick={() => setDeleteModal({ isOpen: true, item: editItem })}
                                        className="btn btn-outline-danger flex-1"
                                    >
                                        Hapus
                                    </button>
                                )}
                                <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
                                    {saving ? 'Menyimpan...' : 'Simpan Agenda'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                title="Hapus Agenda"
                message="Apakah Anda yakin ingin menghapus agenda ini?"
                confirmLabel="Hapus"
                variant="danger"
            />
        </div>
    )
}

export default KalenderAkademikPage
