import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, ChevronLeft, ChevronRight, Calendar, Trash2, Edit2, X, Clock, MapPin } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabase'
import { useKalenderAkademik } from '../../../hooks/useAkademik'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import ConfirmationModal from '../../../components/ui/ConfirmationModal'
import PageHeader from '../../../components/layout/PageHeader'

const EVENT_TYPES = [
    { id: 'Libur', label: 'Libur', color: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' },
    { id: 'Ujian', label: 'Ujian', color: 'bg-orange-50 text-orange-700 border-orange-100', dot: 'bg-orange-500' },
    { id: 'Kegiatan', label: 'Kegiatan', color: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
    { id: 'Rapat', label: 'Rapat', color: 'bg-purple-50 text-purple-700 border-purple-100', dot: 'bg-purple-500' },
    { id: 'Lainnya', label: 'Lainnya', color: 'bg-gray-50 text-gray-700 border-gray-100', dot: 'bg-gray-500' }
]

const KalenderAkademikPage = () => {
    const { user, isAdmin, isAdminAkademik, hasRole } = useAuth()
    const canEdit = isAdmin() || isAdminAkademik() || hasRole('guru')
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
        jenis: 'Kegiatan',
        cakupan: 'Semua'
    })
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null })

    const parseCakupan = (item) => {
        if (!item) return 'Semua'
        if (item.cakupan) return item.cakupan
        const match = (item.deskripsi || '').match(/\[Cakupan:\s*(Semua|Madrosah|Quraniyah)\]/i)
        return match ? match[1] : 'Semua'
    }

    const cleanDeskripsi = (deskripsi) => {
        return (deskripsi || '').replace(/\[Cakupan:\s*(Semua|Madrosah|Quraniyah)\]\s*/i, '').trim()
    }

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

    const formatDate = (d) => {
        if (!d) return ''
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // Events for current month cells (Menggunakan tanggal lokal agar tidak bergeser zona waktu)
    const getEventsForDay = (day) => {
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const dStr = String(day).padStart(2, '0')
        const dateStr = `${year}-${month}-${dStr}`
        return events.filter(e => {
            return dateStr >= e.tanggal_mulai && dateStr <= e.tanggal_selesai
        })
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            let finalDeskripsi = form.deskripsi || ''
            finalDeskripsi = cleanDeskripsi(finalDeskripsi)
            if (form.jenis === 'Libur') {
                finalDeskripsi = `[Cakupan: ${form.cakupan || 'Semua'}] ${finalDeskripsi}`.trim()
            }

            const payload = {
                judul: form.judul,
                deskripsi: finalDeskripsi,
                tanggal_mulai: form.tanggal_mulai,
                tanggal_selesai: form.tanggal_selesai,
                jenis: form.jenis,
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
            jenis: 'Kegiatan',
            cakupan: 'Semua'
        })
        setEditItem(null)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setForm({
            judul: item.judul,
            deskripsi: cleanDeskripsi(item.deskripsi),
            tanggal_mulai: item.tanggal_mulai,
            tanggal_selesai: item.tanggal_selesai,
            jenis: item.jenis,
            cakupan: parseCakupan(item)
        })
        setShowModal(true)
    }

    const [selectedDay, setSelectedDay] = useState(new Date().getDate())

    // Update selected day when month changes to avoid out of bounds (optional but good UX)
    useMemo(() => {
        setSelectedDay(1)
    }, [currentDate.getMonth()])

    // Hijri Date Helper
    const getHijriDate = (date) => {
        try {
            const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
            const parts = formatter.formatToParts(date)
            const day = parts.find(p => p.type === 'day')?.value
            const month = parts.find(p => p.type === 'month')?.value
            const year = parts.find(p => p.type === 'year')?.value
            return { day, month, year, full: `${day} ${month} ${year} H` }
        } catch (e) {
            return { day: '', month: '', year: '', full: '' }
        }
    }

    // ========== MOBILE COMPACT VIEW ==========
    const renderMobileListView = () => {
        const daysInMonth = getDaysInMonth(currentDate)
        const firstDay = getFirstDayOfMonth(currentDate)

        const blanks = Array(firstDay).fill(null)
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        const totalSlots = [...blanks, ...days]

        const selectedDateEvents = getEventsForDay(selectedDay)
        const selectedDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay)
        const selectedHijri = getHijriDate(selectedDateObj)

        return (
            <div className="flex flex-col gap-4">
                {/* 1. COMPACT GRID (CALENDAR) */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {['A', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-bold text-gray-400">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                        {totalSlots.map((day, i) => {
                            if (!day) return <div key={`blank-${i}`}></div>

                            const dayEvents = getEventsForDay(day)
                            const hasEvents = dayEvents.length > 0
                            const isSelected = day === selectedDay
                            const isToday = day === new Date().getDate() &&
                                currentDate.getMonth() === new Date().getMonth() &&
                                currentDate.getFullYear() === new Date().getFullYear()

                            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                            const hijri = getHijriDate(dateObj)

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`
                                        relative flex flex-col items-center justify-start py-1 rounded-lg transition-all h-10
                                        ${isSelected ? 'bg-primary-600 text-white shadow-md scale-105 z-10' : 'hover:bg-gray-50 text-gray-700'}
                                        ${isToday && !isSelected ? 'ring-1 ring-primary-500 text-primary-700 font-bold' : ''}
                                    `}
                                >
                                    <span className="text-xs leading-none font-semibold">{day}</span>
                                    {/* Hijri Date (Small) */}
                                    <span className={`text-[8px] leading-tight mt-0.5 ${isSelected ? 'text-primary-100' : 'text-gray-400 font-normal'}`}>
                                        {hijri.day}
                                    </span>

                                    {/* Dots for events */}
                                    <div className="flex gap-0.5 mt-auto mb-0.5">
                                        {hasEvents && (
                                            <>
                                                {dayEvents.slice(0, 3).map((ev, idx) => {
                                                    const typeConfig = EVENT_TYPES.find(t => t.id === ev.jenis) || EVENT_TYPES[4]
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : typeConfig.dot.replace('bg-', 'bg-')}`}
                                                        />
                                                    )
                                                })}
                                            </>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 2. DETAIL LIST (SELECTED DAY) */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Agenda</span>
                            <div className="flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-2">
                                <span className="text-sm font-bold text-gray-900">
                                    {selectedDateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </span>
                                <span className="text-xs text-primary-600 font-medium italic">
                                    {selectedHijri.full}
                                </span>
                            </div>
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    resetForm();
                                    const year = currentDate.getFullYear();
                                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                    const dStr = String(selectedDay).padStart(2, '0');
                                    const dateStr = `${year}-${month}-${dStr}`;
                                    setForm(prev => ({ ...prev, tanggal_mulai: dateStr, tanggal_selesai: dateStr, jenis: 'Libur' }));
                                    setShowModal(true);
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full text-primary-600 shadow-sm active:scale-95"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>

                    <div className="p-3 divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                        {selectedDateEvents.length === 0 ? (
                            <div className="py-8 text-center text-gray-400">
                                <p className="text-sm">Tidak ada agenda</p>
                            </div>
                        ) : (
                            selectedDateEvents.map(ev => {
                                const typeConfig = EVENT_TYPES.find(t => t.id === ev.jenis) || EVENT_TYPES[4]
                                return (
                                    <div
                                        key={ev.id}
                                        onClick={() => canEdit && openEdit(ev)}
                                        className={`py-3 first:pt-0 last:pb-0 flex gap-3 ${canEdit ? 'active:bg-gray-50 transition-colors cursor-pointer' : ''}`}
                                    >
                                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${typeConfig.dot}`}></div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 text-sm">{ev.judul}</h4>
                                            {ev.deskripsi && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cleanDeskripsi(ev.deskripsi)}</p>}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                <span className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                    {typeConfig.label}
                                                </span>
                                                {ev.jenis === 'Libur' && (
                                                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md">
                                                        Cakupan: {parseCakupan(ev)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ========== RENDER CALENDAR ==========
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate)
        const firstDay = getFirstDayOfMonth(currentDate) // 0 (Sun) - 6 (Sat)

        const blanks = Array(firstDay).fill(null)
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        const totalSlots = [...blanks, ...days]

        // Ensure grid fills correctly (min 5 rows usually)
        // Adjust grid-cols-7 border logic

        return (
            <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
                    {['AHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'].map((d, i) => (
                        <div key={d} className={`py-3 text-center text-xs font-semibold text-gray-500 tracking-wider ${i !== 6 ? 'border-r border-gray-100' : ''}`}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b border-gray-200">
                    {totalSlots.map((day, i) => {
                        if (!day) return <div key={`blank-${i}`} className="bg-white min-h-[120px]"></div>

                        const dayEvents = getEventsForDay(day)
                        const todayDate = new Date()
                        const isToday = day === todayDate.getDate() &&
                            currentDate.getMonth() === todayDate.getMonth() &&
                            currentDate.getFullYear() === todayDate.getFullYear()

                        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                        const hijri = getHijriDate(dateObj)

                        return (
                            <div
                                key={day}
                                className={`bg-white min-h-[120px] p-2 hover:bg-gray-50 transition-colors flex flex-col gap-1 relative group`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`
                                            w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                                            ${isToday ? 'bg-primary-600 text-white shadow-md' : 'text-gray-700'}
                                        `}>
                                            {day}
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium mt-0.5">{hijri.day} {hijri.month}</span>
                                    </div>

                                    {canEdit && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                resetForm();
                                                const year = currentDate.getFullYear();
                                                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                                const dStr = String(day).padStart(2, '0');
                                                const dateStr = `${year}-${month}-${dStr}`;
                                                setForm(prev => ({ ...prev, tanggal_mulai: dateStr, tanggal_selesai: dateStr }));
                                                setShowModal(true);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary-600 transition-opacity p-1 rounded hover:bg-gray-100"
                                            title="Tambah Agenda"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] hide-scrollbar">
                                    {dayEvents.map(ev => {
                                        const typeConfig = EVENT_TYPES.find(t => t.id === ev.jenis) || EVENT_TYPES[4]
                                        return (
                                            <button
                                                key={ev.id}
                                                onClick={(e) => { e.stopPropagation(); if (canEdit) openEdit(ev); }}
                                                className={`
                                                    text-left text-xs px-2 py-1 rounded-[4px] border truncate w-full
                                                    transition-all duration-200 flex items-center gap-1.5
                                                    ${typeConfig.color}
                                                    ${canEdit ? 'hover:brightness-95 cursor-pointer' : 'cursor-default'}
                                                `}
                                                title={`${ev.judul} (${ev.jenis})`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeConfig.dot}`}></span>
                                                <span className="truncate font-medium">{ev.judul}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4 md:space-y-6">
            <PageHeader
                title="Kalender Akademik"
                subtitle="Jadwal kegiatan santri dan agenda pesantren"
                icon={Calendar}
            >
                {canEdit && (
                    <button onClick={() => { resetForm(); setShowModal(true) }} className="btn btn-primary flex items-center gap-2 shadow-sm text-sm md:text-base">
                        <Plus size={18} />
                        <span>Agenda Baru</span>
                    </button>
                )}
            </PageHeader>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="px-4 py-4 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100">
                    <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </h2>
                            <p className="text-sm font-medium text-primary-600 mt-0.5">
                                {(() => {
                                    const start = getHijriDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
                                    const end = getHijriDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))
                                    if (start.year === end.year) {
                                        return start.month === end.month
                                            ? `${start.month} ${start.year} H`
                                            : `${start.month} - ${end.month} ${start.year} H`
                                    }
                                    return `${start.month} ${start.year} - ${end.month} ${end.year} H`
                                })()}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-50 rounded-md text-gray-500 hover:text-gray-900 transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="w-px h-5 bg-gray-200 mx-1"></div>
                                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-50 rounded-md text-gray-500 hover:text-gray-900 transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="md:hidden bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                Today
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row gap-3 md:items-center">
                        {/* Legend Chips - Mobile scrollable */}
                        <div className="flex flex-nowrap overflow-x-auto pb-2 md:pb-0 gap-2 hide-scrollbar">
                            {EVENT_TYPES.map(t => (
                                <div key={t.id} className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-100 bg-white shadow-sm">
                                    <span className={`w-2 h-2 rounded-full ${t.dot}`}></span>
                                    <span className="text-xs font-medium text-gray-600">{t.label}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="hidden md:block bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Hari Ini
                        </button>
                    </div>
                </div>

                {/* Calendar View */}
                <div className="bg-gray-50/50 p-4 md:p-6 min-h-[400px]">
                    {isLoading ? (
                        <div className="h-96 flex items-center justify-center bg-white rounded-lg border border-gray-200">
                            <Spinner label="Memuat kalender..." />
                        </div>
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="hidden lg:block">
                                {renderCalendar()}
                            </div>
                            {/* Mobile View */}
                            <div className="lg:hidden">
                                {renderMobileListView()}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Form using Portal & Sticky Action Footer (Mobile-Ready) */}
            {showModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                        onClick={() => setShowModal(false)}
                    />

                    {/* Modal Box / Bottom Sheet */}
                    <div 
                        className="relative w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* 1. Header (Sticky Top) */}
                        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                                    {editItem ? <Edit2 size={18} /> : <Plus size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                        {editItem ? 'Edit Agenda' : 'Tambah Agenda'}
                                    </h3>
                                    <p className="text-[11px] text-gray-400 font-medium">Kalender Akademik Pondok</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 2. Form Body (Scrollable) */}
                        <form id="modal-agenda-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Judul Agenda <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.judul}
                                    onChange={e => setForm({ ...form, judul: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all text-sm text-gray-900 placeholder:text-gray-400 bg-white"
                                    placeholder="Contoh: Libur Awal Ramadhan / Ujian Semester"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Mulai</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={form.tanggal_mulai}
                                            onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })}
                                            className="w-full pl-9 pr-2.5 py-2 sm:py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all bg-white text-xs sm:text-sm font-medium"
                                            required
                                        />
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Selesai</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={form.tanggal_selesai}
                                            onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })}
                                            className="w-full pl-9 pr-2.5 py-2 sm:py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all bg-white text-xs sm:text-sm font-medium"
                                            required
                                        />
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Jenis Kategori</label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                                    {EVENT_TYPES.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setForm({ ...form, jenis: t.id })}
                                            className={`
                                                flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer
                                                ${form.jenis === t.id
                                                    ? `${t.color} ring-2 ring-primary-500 shadow-sm scale-[1.02]`
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${t.dot} shrink-0`}></span>
                                            <span>{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.jenis === 'Libur' && (
                                <div className="bg-red-50/70 p-3.5 sm:p-4 rounded-2xl border border-red-100 space-y-2.5 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-black text-red-900 uppercase tracking-wider">Cakupan Libur</label>
                                        <span className="text-[10px] font-bold text-red-600 bg-red-100/70 px-2 py-0.5 rounded-md">Aturan Absensi</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'Semua', label: 'Semua Libur' },
                                            { id: 'Madrosah', label: 'Madrasah Saja' },
                                            { id: 'Quraniyah', label: 'Halaqoh Saja' }
                                        ].map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setForm({ ...form, cakupan: c.id })}
                                                className={`py-2 px-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                                                    (form.cakupan || 'Semua') === c.id
                                                        ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-200 scale-[1.02]'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-red-50/50'
                                                }`}
                                            >
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-red-700 font-medium leading-relaxed bg-white/80 p-2.5 rounded-xl border border-red-100">
                                        {(form.cakupan || 'Semua') === 'Semua' && '🏖️ Madrasah & Halaqoh libur penuh. Seluruh jadwal di rentang tanggal ini bebas absen (tidak kena Alpha).'}
                                        {(form.cakupan || 'Semua') === 'Madrosah' && '🏫 Hanya Madrasah yang libur (KBM kelas bebas absen). Musyrif & Santri Halaqoh Qur\'aniyah tetap wajib hadir absen.'}
                                        {(form.cakupan || 'Semua') === 'Quraniyah' && '📖 Hanya Halaqoh Qur\'an yang libur (bebas absen). KBM kelas Madrasah tetap berjalan normal dan wajib diabsen.'}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">Deskripsi (Opsional)</label>
                                <textarea
                                    value={form.deskripsi}
                                    onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 resize-none bg-white"
                                    rows={2}
                                    placeholder="Tambahkan catatan atau detail kegiatan..."
                                ></textarea>
                            </div>
                        </form>

                        {/* 3. Footer Actions (STICKY AT BOTTOM - ALWAYS VISIBLE ON MOBILE & DESKTOP!) */}
                        <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[max(1rem,env(safe-area-inset-bottom,16px))]">
                            {editItem ? (
                                <button
                                    type="button"
                                    onClick={() => setDeleteModal({ isOpen: true, item: editItem })}
                                    className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs font-bold shrink-0"
                                    title="Hapus Agenda"
                                >
                                    <Trash2 size={16} />
                                    <span className="hidden sm:inline">Hapus</span>
                                </button>
                            ) : <div />}

                            <div className="flex items-center gap-2.5 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 bg-white"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    form="modal-agenda-form"
                                    className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <Spinner size={16} />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <span>{editItem ? 'Simpan Perubahan' : 'Simpan Agenda'}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDelete}
                title="Hapus Agenda"
                message="Apakah Anda yakin ingin menghapus agenda kegiatan ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Ya, Hapus Agenda"
                variant="danger"
            />
        </div>
    )
}

export default KalenderAkademikPage
