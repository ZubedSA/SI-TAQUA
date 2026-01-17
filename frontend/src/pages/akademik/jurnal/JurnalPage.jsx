import { useState, useEffect } from 'react'
import { Calendar, BookOpen, CheckCircle, Circle, ArrowRight, Save, UserCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useJurnal } from '../../../hooks/useAkademik'
import PageHeader from '../../../components/layout/PageHeader'
import { Card } from '../../../components/ui/Card'
import Spinner from '../../../components/ui/Spinner' // Assuming Spinner component exists
import EmptyState from '../../../components/ui/EmptyState'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge' // Assuming Badge component exists
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const STATUS_OPTIONS = [
    { value: 'Hadir', label: 'Hadir', color: 'bg-green-100 text-green-700' },
    { value: 'Sakit', label: 'Sakit', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'Izin', label: 'Izin', color: 'bg-blue-100 text-blue-700' },
    { value: 'Alfa', label: 'Alpha', color: 'bg-red-100 text-red-700' },
    { value: 'Terlambat', label: 'Terlambat', color: 'bg-orange-100 text-orange-700' },
]

const JurnalPage = () => {
    const { user, hasRole } = useAuth() // user object from supabase auth
    const showToast = useToast()
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [guruId, setGuruId] = useState(null)
    const [loadingGuru, setLoadingGuru] = useState(true)

    // Form State
    const [selectedJadwal, setSelectedJadwal] = useState(null) // If set, modal is open
    const [formData, setFormData] = useState({ materi: '', catatan: '', status: 'Terlaksana' })
    const [santriList, setSantriList] = useState([])
    const [attendanceMap, setAttendanceMap] = useState({})
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [saving, setSaving] = useState(false)

    // Determine current Guru ID
    useEffect(() => {
        const fetchGuruId = async () => {
            if (!user?.email) {
                setLoadingGuru(false)
                return
            }
            // Try to find guru by email
            const { data } = await supabase.from('guru').select('id').eq('email', user.email).single()
            if (data) setGuruId(data.id)
            setLoadingGuru(false)
        }

        // If admin, we might not want to filter by Guru automatically, or let them switch?
        // For simplicity, if Admin doesn't map to a Guru, they see all. 
        // If Admin IS a Guru, they see theirs but maybe can clear filter. 
        // Let's just try to fetch for now.
        fetchGuruId()
    }, [user])

    const isAdmin = hasRole('admin')

    const { data: jurnalList = [], isLoading: loadingJurnal, refetch: refetchJurnal } = useJurnal({
        tanggal: selectedDate,
        guru_id: isAdmin ? null : guruId // If Admin, show all. If Guru, show theirs.
    })

    const openJurnalForm = async (jadwalItem) => {
        setSelectedJadwal(jadwalItem)
        setFormData({
            materi: jadwalItem.jurnal?.materi || '',
            catatan: jadwalItem.jurnal?.catatan || '',
            status: jadwalItem.jurnal?.status || 'Terlaksana'
        })
        setLoadingSantri(true)

        try {
            // 1. Fetch Santri
            const { data: sData } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('kelas_id', jadwalItem.kelas_id)
                .eq('status', 'Aktif')
                .order('nama')

            setSantriList(sData || [])

            // 2. If Jurnal exists, fetch details
            const initialMap = {}
            if (jadwalItem.jurnal) {
                const { data: detilData } = await supabase
                    .from('presensi_mapel_detil')
                    .select('*')
                    .eq('presensi_mapel_id', jadwalItem.jurnal.id)

                sData?.forEach(s => {
                    const existing = detilData?.find(d => d.santri_id === s.id)
                    initialMap[s.id] = {
                        status: existing?.status || 'Hadir',
                        keterangan: existing?.keterangan || ''
                    }
                })
            } else {
                // New Jurnal, default all Hadir
                sData?.forEach(s => {
                    initialMap[s.id] = { status: 'Hadir', keterangan: '' }
                })
            }
            setAttendanceMap(initialMap)

        } catch (err) {
            console.error(err)
            showToast.error('Gagal memuat data santri')
        } finally {
            setLoadingSantri(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            // 1. Upsert Header (presensi_mapel)
            const headerPayload = {
                jadwal_id: selectedJadwal.id,
                kelas_id: selectedJadwal.kelas_id,
                guru_id: selectedJadwal.guru_id,
                mapel_id: selectedJadwal.mapel_id,
                tanggal: selectedDate,
                materi: formData.materi,
                catatan: formData.catatan,
                status: formData.status,
                created_by: user.id
            }

            // We need ID for detail upsert. If update, we have it. If insert, we need returned ID.
            if (selectedJadwal.jurnal?.id) {
                headerPayload.id = selectedJadwal.jurnal.id
            }

            const { data: headerData, error: headerError } = await supabase
                .from('presensi_mapel')
                .upsert(headerPayload)
                .select()
                .single()

            if (headerError) throw headerError

            const jurnalId = headerData.id

            // 2. Upsert Details (presensi_mapel_detil)
            // Need to handle updates properly.
            // Simplified: Delete existing details for this header and re-insert, OR upsert if we track IDs.
            // Since we didn't trackDetail IDs in attendanceMap, easier to Delete All + Insert All (Transaction-like)
            // But Supabase doesn't support transactions easily in client.
            // Better: Upsert with Conflict on (presensi_mapel_id, santri_id)? We didn't add that constraint yet.
            // Let's use Delete + Insert strategy for details to avoid ghosts, or just Insert.

            // First, delete old details to be clean (or we can just overwrite if we had unique constraint)
            // Safe bet: Delete details for this ID first.
            await supabase.from('presensi_mapel_detil').delete().eq('presensi_mapel_id', jurnalId)

            const detailsPayload = santriList.map(s => ({
                presensi_mapel_id: jurnalId,
                santri_id: s.id,
                status: attendanceMap[s.id].status,
                keterangan: attendanceMap[s.id].keterangan
            }))

            if (detailsPayload.length > 0) {
                const { error: detilError } = await supabase.from('presensi_mapel_detil').insert(detailsPayload)
                if (detilError) throw detilError
            }

            showToast.success('Jurnal berhasil disimpan')
            setSelectedJadwal(null)
            refetchJurnal()

        } catch (err) {
            console.error(err)
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const markAll = (status) => {
        const newMap = { ...attendanceMap }
        santriList.forEach(s => {
            newMap[s.id] = { ...newMap[s.id], status }
        })
        setAttendanceMap(newMap)
    }

    const handleStatusChange = (santriId, newStatus) => {
        setAttendanceMap(prev => ({
            ...prev,
            [santriId]: { ...prev[santriId], status: newStatus }
        }))
    }

    if (loadingGuru) return <Spinner className="py-12" />

    // Form Modal UI
    const renderFormModal = () => {
        if (!selectedJadwal) return null
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Input Jurnal & Presensi</h3>
                            <p className="text-sm text-gray-500">
                                {selectedJadwal.mapel.nama} - {selectedJadwal.kelas.nama} ({selectedJadwal.jam_mulai.slice(0, 5)} - {selectedJadwal.jam_selesai.slice(0, 5)})
                            </p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelectedJadwal(null)}>
                            &times;
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Header Jurnal */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Materi Pembelajaran</label>
                                        <textarea
                                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                            rows="3"
                                            placeholder="Contoh: Bab 1 - Thaharah"
                                            value={formData.materi}
                                            onChange={e => setFormData({ ...formData, materi: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status Pertemuan</label>
                                        <select
                                            className="w-full p-2 border border-gray-300 rounded-lg"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Terlaksana">Terlaksana</option>
                                            <option value="Kosong">Kosong (Guru Berhalangan)</option>
                                            <option value="Libur">Libur</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Tambahan</label>
                                    <textarea
                                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                        rows="3"
                                        placeholder="Catatan kelas, PR, dll..."
                                        value={formData.catatan}
                                        onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Attendance List */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <UserCheck size={18} /> Kehadiran Siswa
                                    </h4>
                                    <div className="flex gap-1 text-xs">
                                        {STATUS_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => markAll(opt.value)}
                                                className={`px-2 py-1 rounded border transition-opacity hover:opacity-80 ${opt.color.replace('text-', 'border-')}`}
                                            >
                                                All {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {loadingSantri ? (
                                    <Spinner label="Memuat siswa..." />
                                ) : (
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Nama</th>
                                                    <th className="px-4 py-2 text-center">Status</th>
                                                    <th className="px-4 py-2">Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {santriList.map(s => {
                                                    const sStatus = attendanceMap[s.id]?.status || 'Hadir'
                                                    return (
                                                        <tr key={s.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 font-medium">{s.nama}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <select
                                                                    className={`p-1 rounded border text-xs font-semibold
                                                                        ${STATUS_OPTIONS.find(o => o.value === sStatus)?.color || 'bg-gray-100'}
                                                                    `}
                                                                    value={sStatus}
                                                                    onChange={e => handleStatusChange(s.id, e.target.value)}
                                                                >
                                                                    {STATUS_OPTIONS.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="text"
                                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                                                                    placeholder="..."
                                                                    value={attendanceMap[s.id]?.keterangan || ''}
                                                                    onChange={e => {
                                                                        setAttendanceMap(prev => ({
                                                                            ...prev,
                                                                            [s.id]: { ...prev[s.id], keterangan: e.target.value }
                                                                        }))
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                            <Button type="button" variant="secondary" onClick={() => setSelectedJadwal(null)}>Batal</Button>
                            <Button type="submit" disabled={saving} isLoading={saving}>Simpan Jurnal</Button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Agenda Mengajar"
                description={`Jadwal dan Jurnal Mengajar Harian - ${format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: localeId })}`}
                icon={BookOpen}
            />

            {/* Date Filter */}
            <Card className="p-4 flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                    <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                </div>
                {/* Admin can see Guru Filter here if needed, but skipped for brevity */}
            </Card>

            {loadingJurnal ? (
                <Spinner label="Memuat jadwal..." />
            ) : jurnalList.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="Tidak ada jadwal"
                    message="Tidak ada jadwal mengajar pada tanggal ini."
                />
            ) : (
                <div className="grid gap-4">
                    {jurnalList.map(jadwal => (
                        <Card key={jadwal.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row">
                                {/* Left Time Column */}
                                <div className="bg-primary-50 p-6 flex flex-col justify-center items-center text-primary-800 w-full md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-primary-100">
                                    <span className="text-xl font-bold">{jadwal.jam_mulai.slice(0, 5)}</span>
                                    <span className="text-sm opacity-75">s/d</span>
                                    <span className="text-xl font-bold">{jadwal.jam_selesai.slice(0, 5)}</span>
                                    <span className="mt-2 text-xs font-medium bg-white px-2 py-1 rounded-full border border-primary-200">
                                        Jam ke-{jadwal.jam_ke}
                                    </span>
                                </div>

                                {/* Main Content */}
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{jadwal.mapel.nama}</h3>
                                            <p className="text-gray-500">{jadwal.kelas.nama} &bull; {jadwal.guru?.nama || 'Guru belum diassign'}</p>
                                        </div>
                                        {jadwal.jurnal ? (
                                            <Badge variant="success" className="flex items-center gap-1">
                                                <CheckCircle size={14} /> Terisi
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning" className="flex items-center gap-1">
                                                <Circle size={14} /> Belum Diisi
                                            </Badge>
                                        )}
                                    </div>

                                    {jadwal.jurnal && (
                                        <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600 border border-gray-100">
                                            <span className="font-semibold text-gray-700">Materi:</span> {jadwal.jurnal.materi}
                                            {jadwal.jurnal.catatan && (
                                                <div className="mt-1">
                                                    <span className="font-semibold text-gray-700">Catatan:</span> {jadwal.jurnal.catatan}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <Button
                                            variant={jadwal.jurnal ? "secondary" : "primary"}
                                            onClick={() => openJurnalForm(jadwal)}
                                            className="flex items-center gap-2"
                                        >
                                            {jadwal.jurnal ? (
                                                <>Edit Jurnal</>
                                            ) : (
                                                <>Isi Jurnal <ArrowRight size={16} /></>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {renderFormModal()}
        </div>
    )
}

export default JurnalPage
