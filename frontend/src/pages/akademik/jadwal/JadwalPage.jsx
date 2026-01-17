import { useState, useEffect } from 'react'
import { Plus, Calendar, Search, Trash2, Edit, Filter, Clock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useKelas, useMapel, useJadwal } from '../../../hooks/useAkademik'
import PageHeader from '../../../components/layout/PageHeader'
import Button from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import ConfirmationModal from '../../../components/ui/ConfirmationModal'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad']

const JadwalPage = () => {
    const { userProfile, hasRole } = useAuth()
    const showToast = useToast()
    const [selectedKelas, setSelectedKelas] = useState('')
    const [selectedTahun, setSelectedTahun] = useState('2024/2025') // Hardcoded default for now

    // Data hooks
    const { data: kelasList = [], isLoading: loadingKelas } = useKelas()
    const { data: mapelList = [] } = useMapel()
    const { data: jadwalList = [], isLoading: loadingJadwal, refetch: refetchJadwal } = useJadwal({
        kelas_id: selectedKelas,
        tahun_ajaran: selectedTahun
    })

    const [guruList, setGuruList] = useState([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editData, setEditData] = useState(null)
    const [formData, setFormData] = useState({
        hari: 'Senin',
        jam_ke: 1,
        jam_mulai: '07:00',
        jam_selesai: '08:00',
        mapel_id: '',
        guru_id: ''
    })
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
    const [deleting, setDeleting] = useState(false)

    // Can Edit Check
    const canEdit = hasRole('admin') || hasRole('kurikulum') // Assuming kurikulum role or just admin

    useEffect(() => {
        fetchGuru()
    }, [])

    const fetchGuru = async () => {
        const { data } = await supabase.from('guru').select('id, nama').order('nama')
        setGuruList(data || [])
    }

    const resetForm = () => {
        setFormData({
            hari: 'Senin',
            jam_ke: 1,
            jam_mulai: '07:00',
            jam_selesai: '08:00',
            mapel_id: '',
            guru_id: ''
        })
        setEditData(null)
    }

    const handleEdit = (item) => {
        setEditData(item)
        setFormData({
            hari: item.hari,
            jam_ke: item.jam_ke,
            jam_mulai: item.jam_mulai,
            jam_selesai: item.jam_selesai,
            mapel_id: item.mapel_id,
            guru_id: item.guru_id
        })
        setIsFormOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedKelas) {
            showToast.error('Pilih kelas terlebih dahulu')
            return
        }
        setSaving(true)
        try {
            const payload = {
                ...formData,
                kelas_id: selectedKelas,
                tahun_ajaran: selectedTahun
            }

            if (editData) {
                const { error } = await supabase.from('jadwal_pelajaran').update(payload).eq('id', editData.id)
                if (error) throw error
                showToast.success('Jadwal diperbarui')
            } else {
                const { error } = await supabase.from('jadwal_pelajaran').insert(payload)
                if (error) throw error
                showToast.success('Jadwal ditambahkan')
            }
            refetchJadwal()
            setIsFormOpen(false)
            resetForm()
        } catch (err) {
            showToast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const { error } = await supabase.from('jadwal_pelajaran').delete().eq('id', deleteModal.id)
            if (error) throw error
            showToast.success('Jadwal dihapus')
            refetchJadwal()
            setDeleteModal({ isOpen: false, id: null })
        } catch (err) {
            showToast.error(err.message)
        } finally {
            setDeleting(false)
        }
    }

    // Group jadwal by day
    const jadwalByDay = DAYS.reduce((acc, day) => {
        acc[day] = jadwalList.filter(j => j.hari === day)
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <PageHeader
                title="Jadwal Pelajaran"
                description="Manajemen jadwal pelajaran per kelas"
                icon={Calendar}
            />

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
                    <div className="w-full md:w-64 space-y-1">
                        <label className="text-sm font-medium text-gray-700">Kelas</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            value={selectedKelas}
                            onChange={e => setSelectedKelas(e.target.value)}
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-48 space-y-1">
                        <label className="text-sm font-medium text-gray-700">Tahun Ajaran</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={selectedTahun}
                            onChange={e => setSelectedTahun(e.target.value)}
                        >
                            <option value="2024/2025">2024/2025</option>
                            <option value="2025/2026">2025/2026</option>
                        </select>
                    </div>
                    {canEdit && selectedKelas && (
                        <div className="md:ml-auto">
                            <Button onClick={() => { resetForm(); setIsFormOpen(true) }}>
                                <Plus size={18} /> Tambah Jadwal
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {loadingJadwal ? (
                <Spinner label="Memuat jadwal..." />
            ) : !selectedKelas ? (
                <EmptyState
                    icon={Filter}
                    title="Pilih Kelas"
                    message="Silakan pilih kelas terlebih dahulu untuk melihat jadwal."
                />
            ) : jadwalList.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="Belum ada jadwal"
                    message="Belum ada jadwal pelajaran untuk kelas ini."
                    actionLabel={canEdit ? "Buat Jadwal" : null}
                    onAction={canEdit ? () => { resetForm(); setIsFormOpen(true) } : null}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {DAYS.map(day => {
                        const schedules = jadwalByDay[day]
                        if (schedules.length === 0) return null

                        return (
                            <Card key={day} className="overflow-hidden">
                                <div className="bg-primary-50 px-4 py-3 border-b border-primary-100 flex justify-between items-center">
                                    <h3 className="font-semibold text-primary-800">{day}</h3>
                                    <span className="text-xs font-medium bg-white text-primary-600 px-2 py-1 rounded-full border border-primary-200">
                                        {schedules.length} Mapel
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {schedules.map(item => (
                                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors group relative">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                                    <Clock size={14} />
                                                    {item.jam_mulai.slice(0, 5)} - {item.jam_selesai.slice(0, 5)}
                                                </div>
                                                <div className="text-xs text-gray-400">Jam ke-{item.jam_ke}</div>
                                            </div>
                                            <h4 className="font-semibold text-gray-900 mb-1">{item.mapel?.nama}</h4>
                                            <p className="text-sm text-gray-500">{item.guru?.nama || '-'}</p>

                                            {canEdit && (
                                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white shadow-sm border rounded-lg p-1">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, id: item.id })}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Form Modal (Simple Overlay) */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editData ? 'Edit Jadwal' : 'Tambah Jadwal'}
                            </h3>
                            <button className="text-gray-400 hover:text-gray-600" onClick={() => setIsFormOpen(false)}>
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Hari</label>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                            value={formData.hari}
                                            onChange={e => setFormData({ ...formData, hari: e.target.value })}
                                            required
                                        >
                                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Jam Ke</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="15"
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                            value={formData.jam_ke}
                                            onChange={e => setFormData({ ...formData, jam_ke: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
                                        <input
                                            type="time"
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                            value={formData.jam_mulai}
                                            onChange={e => setFormData({ ...formData, jam_mulai: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
                                        <input
                                            type="time"
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                            value={formData.jam_selesai}
                                            onChange={e => setFormData({ ...formData, jam_selesai: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                                    <select
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        value={formData.mapel_id}
                                        onChange={e => setFormData({ ...formData, mapel_id: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Pilih Mapel --</option>
                                        {mapelList.map(m => (
                                            <option key={m.id} value={m.id}>{m.nama} ({m.kode})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Guru Pengampu</label>
                                    <select
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        value={formData.guru_id}
                                        onChange={e => setFormData({ ...formData, guru_id: e.target.value })}
                                    >
                                        <option value="">-- Pilih Guru (Opsional) --</option>
                                        {guruList.map(g => (
                                            <option key={g.id} value={g.id}>{g.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl border-t">
                                <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Batal</Button>
                                <Button type="submit" disabled={saving} isLoading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                title="Hapus Jadwal"
                message="Apakah Anda yakin ingin menghapus jadwal ini?"
                confirmLabel="Hapus"
                variant="danger"
                isLoading={deleting}
            />
        </div>
    )
}

export default JadwalPage
