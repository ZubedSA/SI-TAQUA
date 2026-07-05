import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Calendar, Search, Trash2, Edit, Filter, Clock, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useKelas, useHalaqoh, useMapel, useJadwal, useTahunAjaran } from '../../../hooks/useAkademik'
import PageHeader from '../../../components/layout/PageHeader'
import Button from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import ConfirmationModal from '../../../components/ui/ConfirmationModal'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad']

const JadwalPage = () => {
    const { userProfile, hasRole, isAdminAkademik } = useAuth()
    const showToast = useToast()
    const { data: tahunAjaranList = [] } = useTahunAjaran()
    const [selectedKelas, setSelectedKelas] = useState('')
    const [selectedHalaqoh, setSelectedHalaqoh] = useState('')
    const [selectedTahun, setSelectedTahun] = useState('')
    const [selectedType, setSelectedType] = useState('MADROSAH') // 'MADROSAH' or 'HALAQOH'

    useEffect(() => {
        if (tahunAjaranList.length > 0 && !selectedTahun) {
            setSelectedTahun(tahunAjaranList[0])
        }
    }, [tahunAjaranList, selectedTahun])

    // Data hooks
    const { data: kelasList = [] } = useKelas()
    const { data: halaqohList = [] } = useHalaqoh()
    const { data: mapelList = [] } = useMapel()
    const { data: jadwalList = [], isLoading: loadingJadwal, refetch: refetchJadwal } = useJadwal({
        kelas_id: selectedType === 'MADROSAH' ? selectedKelas : null,
        halaqoh_id: selectedType === 'HALAQOH' ? selectedHalaqoh : null,
        tahun_ajaran: selectedTahun,
        tipe: selectedType
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
        guru_id: '',
        tipe: 'MADROSAH'
    })
    const [saving, setSaving] = useState(false)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null })
    const [deleting, setDeleting] = useState(false)

    // Can Edit Check
    const canEdit = hasRole('admin') || isAdminAkademik() || hasRole('kurikulum') // Assuming kurikulum role or just admin

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
            guru_id: '',
            tipe: selectedType
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
            guru_id: item.guru_id,
            tipe: item.tipe || 'MADROSAH'
        })
        setIsFormOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (selectedType === 'MADROSAH' && !selectedKelas) {
            showToast.error('Pilih kelas terlebih dahulu')
            return
        }
        if (selectedType === 'HALAQOH' && !selectedHalaqoh) {
            showToast.error('Pilih halaqoh terlebih dahulu')
            return
        }
        setSaving(true)
        try {
            const payload = {
                ...formData,
                kelas_id: selectedType === 'MADROSAH' ? selectedKelas : null,
                halaqoh_id: selectedType === 'HALAQOH' ? selectedHalaqoh : null,
                tahun_ajaran: selectedTahun,
                tipe: selectedType,
                guru_id: formData.guru_id || null, 
                mapel_id: formData.mapel_id || null 
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
            // 1. Coba atur jadwal_id menjadi null pada presensi_mapel untuk mengamankan histori jurnal/absensi
            const { error: updateError } = await supabase
                .from('presensi_mapel')
                .update({ jadwal_id: null })
                .eq('jadwal_id', deleteModal.id)

            // Jika update gagal (kolom jadwal_id dikonfigurasi NOT NULL di DB),
            // maka lakukan cascading delete berantai (hapus presensi_mapel_detil lalu presensi_mapel)
            if (updateError) {
                console.warn('Gagal men-null-kan jadwal_id, melakukan penghapusan berantai:', updateError)
                
                // Cari data presensi_mapel terkait
                const { data: relatedJurnal } = await supabase
                    .from('presensi_mapel')
                    .select('id')
                    .eq('jadwal_id', deleteModal.id)

                if (relatedJurnal && relatedJurnal.length > 0) {
                    const jurnalIds = relatedJurnal.map(rj => rj.id)
                    
                    // Hapus detail kehadiran siswa
                    await supabase
                        .from('presensi_mapel_detil')
                        .delete()
                        .in('presensi_mapel_id', jurnalIds)
                        
                    // Hapus data induk presensi_mapel
                    await supabase
                        .from('presensi_mapel')
                        .delete()
                        .eq('jadwal_id', deleteModal.id)
                }
            }

            // 2. Hapus jadwal pelajaran utama
            const { error } = await supabase.from('jadwal_pelajaran').delete().eq('id', deleteModal.id)
            if (error) throw error

            showToast.success('Jadwal berhasil dihapus')
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

            {/* Type Selector Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => { setSelectedType('MADROSAH'); setSelectedKelas(''); setSelectedHalaqoh(''); }}
                    className={`px-6 py-2 rounded-xl font-bold transition-all ${selectedType === 'MADROSAH' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
                >
                    Madrosah
                </button>
                <button
                    onClick={() => { setSelectedType('HALAQOH'); setSelectedKelas(''); setSelectedHalaqoh(''); }}
                    className={`px-6 py-2 rounded-xl font-bold transition-all ${selectedType === 'HALAQOH' ? 'bg-primary-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
                >
                    Halaqoh
                </button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
                    {selectedType === 'MADROSAH' ? (
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
                    ) : (
                        <div className="w-full md:w-64 space-y-1">
                            <label className="text-sm font-medium text-gray-700">Halaqoh</label>
                            <select
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                value={selectedHalaqoh}
                                onChange={e => setSelectedHalaqoh(e.target.value)}
                            >
                                <option value="">-- Pilih Halaqoh --</option>
                                {halaqohList.map(h => (
                                    <option key={h.id} value={h.id}>{h.nama}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="w-full md:w-48 space-y-1">
                        <label className="text-sm font-medium text-gray-700">Tahun Ajaran</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            value={selectedTahun}
                            onChange={e => setSelectedTahun(e.target.value)}
                        >
                            {tahunAjaranList.map(tahun => (
                                <option key={tahun} value={tahun}>{tahun}</option>
                            ))}
                        </select>
                    </div>
                    {canEdit && (selectedKelas || selectedHalaqoh) && (
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
            ) : !(selectedKelas || selectedHalaqoh) ? (
                <EmptyState
                    icon={Filter}
                    title={selectedType === 'MADROSAH' ? "Pilih Kelas" : "Pilih Halaqoh"}
                    message={`Silakan pilih ${selectedType.toLowerCase()} terlebih dahulu untuk melihat jadwal.`}
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
                                            <h4 className="font-semibold text-gray-900 mb-1">
                                                {item.tipe === 'HALAQOH' ? `Halaqoh Jam Ke-${item.jam_ke}` : (item.mapel?.nama || '-')}
                                            </h4>
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
            {isFormOpen && createPortal(
                <div className="modal-overlay visible opacity-100" style={{ zIndex: 99999 }}>
                    <div className="modal-box w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editData ? 'Edit Jadwal' : 'Tambah Jadwal'}
                            </h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setIsFormOpen(false)}>
                                <X size={20} />
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
                                            max={selectedType === 'HALAQOH' ? 3 : 15}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {selectedType === 'MADROSAH' ? 'Mata Pelajaran' : 'Nama Kegiatan (Opsional)'}
                                    </label>
                                    <select
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        value={formData.mapel_id}
                                        onChange={e => setFormData({ ...formData, mapel_id: e.target.value })}
                                        required={selectedType === 'MADROSAH'}
                                    >
                                        <option value="">{selectedType === 'MADROSAH' ? '-- Pilih Mapel --' : '-- Tanpa Mapel Specific --'}</option>
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
                </div>,
                document.body
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
