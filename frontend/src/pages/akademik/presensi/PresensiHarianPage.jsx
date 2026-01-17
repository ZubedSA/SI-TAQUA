import { useState, useEffect } from 'react'
import { Calendar, Save, CheckSquare, Search, Filter, UserX, UserCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { useKelas, usePresensiHarian } from '../../../hooks/useAkademik'
import PageHeader from '../../../components/layout/PageHeader'
import Button from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import Badge from '../../../components/ui/Badge'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const STATUS_OPTIONS = [
    { value: 'hadir', label: 'Hadir', color: 'bg-green-100 text-green-700' },
    { value: 'sakit', label: 'Sakit', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'izin', label: 'Izin', color: 'bg-blue-100 text-blue-700' },
    { value: 'alpha', label: 'Alpha', color: 'bg-red-100 text-red-700' },
]

const PresensiHarianPage = () => {
    const showToast = useToast()
    const [selectedKelas, setSelectedKelas] = useState('')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    // Data hooks
    const { data: kelasList = [] } = useKelas()

    // Local state for attendance data
    const [attendanceMap, setAttendanceMap] = useState({}) // { santriId: { status, keterangan, id } }
    const [santriList, setSantriList] = useState([])
    const [loadingData, setLoadingData] = useState(false)
    const [saving, setSaving] = useState(false)

    // Fetch santri and existing attendance when filters change
    useEffect(() => {
        if (selectedKelas && selectedDate) {
            loadData()
        } else {
            setSantriList([])
            setAttendanceMap({})
        }
    }, [selectedKelas, selectedDate])

    const loadData = async () => {
        setLoadingData(true)
        try {
            // 1. Fetch Santri
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('kelas_id', selectedKelas)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError

            // 2. Fetch Existing Presensi
            const { data: presensiData, error: presensiError } = await supabase
                .from('presensi')
                .select('*')
                .eq('tanggal', selectedDate)
                .in('santri_id', santriData.map(s => s.id))

            if (presensiError) throw presensiError

            setSantriList(santriData || [])

            // Map existing presensi
            const initialMap = {}
            // Default all to 'hadir' if not exists, or empty?
            // Usually easier if we default to 'hadir' visually but don't save unless changed? 
            // Better: default visually to 'hadir' for new entries.

            santriData.forEach(s => {
                const existing = presensiData.find(p => p.santri_id === s.id)
                if (existing) {
                    initialMap[s.id] = {
                        status: existing.status,
                        keterangan: existing.keterangan || '',
                        id: existing.id // store ID for update
                    }
                } else {
                    initialMap[s.id] = { status: 'hadir', keterangan: '' }
                }
            })
            setAttendanceMap(initialMap)

        } catch (err) {
            console.error(err)
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoadingData(false)
        }
    }

    const handleStatusChange = (santriId, newStatus) => {
        setAttendanceMap(prev => ({
            ...prev,
            [santriId]: { ...prev[santriId], status: newStatus }
        }))
    }

    const handleKeteranganChange = (santriId, newKet) => {
        setAttendanceMap(prev => ({
            ...prev,
            [santriId]: { ...prev[santriId], keterangan: newKet }
        }))
    }

    const markAll = (status) => {
        const newMap = { ...attendanceMap }
        santriList.forEach(s => {
            newMap[s.id] = { ...newMap[s.id], status }
        })
        setAttendanceMap(newMap)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const upsertData = santriList.map(s => ({
                santri_id: s.id,
                tanggal: selectedDate,
                status: attendanceMap[s.id]?.status || 'hadir',
                keterangan: attendanceMap[s.id]?.keterangan || ''
                // id is not needed if we use ON CONFLICT(santri_id, tanggal) 
                // but supabase doesn't support complex upsert without explicit conflict cols easily in JS client sometimes without 'onConflict' param
            }))

            const { error } = await supabase
                .from('presensi')
                .upsert(upsertData, { onConflict: 'santri_id, tanggal' })

            if (error) throw error

            showToast.success('Data presensi berhasil disimpan')
            loadData() // Reload to get IDs and confirm
        } catch (err) {
            console.error(err)
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Presensi Harian Santri"
                description="Input data kehadiran harian santri"
                icon={UserCheck}
                actions={
                    selectedKelas && (
                        <Button onClick={handleSave} disabled={saving || santriList.length === 0} isLoading={saving}>
                            <Save size={18} /> Simpan Presensi
                        </Button>
                    )
                }
            />

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-64 space-y-1">
                        <label className="text-sm font-medium text-gray-700">Tanggal</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                    </div>
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
                </div>
            </Card>

            {/* Content */}
            {!selectedKelas ? (
                <EmptyState
                    icon={Filter}
                    title="Pilih Kelas"
                    message="Silakan pilih kelas terlebih dahulu untuk melakukan presensi."
                />
            ) : loadingData ? (
                <Spinner label="Memuat data santri..." />
            ) : santriList.length === 0 ? (
                <EmptyState
                    icon={UserX}
                    title="Tidak ada santri"
                    message="Tidak ditemukan data santri aktif di kelas ini."
                />
            ) : (
                <Card className="overflow-hidden">
                    {/* Toolbar */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap gap-2 items-center justify-between">
                        <div className="text-sm font-medium text-gray-700">
                            {santriList.length} Santri
                        </div>
                        <div className="flex gap-2">
                            <span className="text-xs text-gray-500 uppercase overflow-visible self-center mr-2">Set Semua:</span>
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => markAll(opt.value)}
                                    className={`px-3 py-1 text-xs rounded-full border transition-all hover:opacity-80
                                        ${opt.value === 'hadir' ? 'bg-green-50 border-green-200 text-green-700' :
                                            opt.value === 'sakit' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                opt.value === 'izin' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                    'bg-red-50 border-red-200 text-red-700'}
                                    `}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 w-12">No</th>
                                    <th className="px-6 py-3">Nama Santri</th>
                                    <th className="px-6 py-3 text-center">Status Kehadiran</th>
                                    <th className="px-6 py-3">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {santriList.map((santri, index) => {
                                    const current = attendanceMap[santri.id] || { status: 'hadir', keterangan: '' }
                                    return (
                                        <tr key={santri.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {santri.nama}
                                                <div className="text-xs text-gray-400 font-mono">{santri.nis}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-1">
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <label
                                                            key={opt.value}
                                                            className={`
                                                                cursor-pointer px-3 py-1.5 rounded-md border text-xs font-medium transition-all
                                                                flex items-center gap-1
                                                                ${current.status === opt.value
                                                                    ? `${opt.color} border-transparent ring-1 ring-offset-1 ring-primary-500/30`
                                                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                                }
                                                            `}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`status-${santri.id}`}
                                                                value={opt.value}
                                                                checked={current.status === opt.value}
                                                                onChange={() => handleStatusChange(santri.id, opt.value)}
                                                                className="sr-only"
                                                            />
                                                            {opt.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    placeholder="Keterangan (opsional)"
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-primary-500 transition-colors"
                                                    value={current.keterangan}
                                                    onChange={e => handleKeteranganChange(santri.id, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}

export default PresensiHarianPage
