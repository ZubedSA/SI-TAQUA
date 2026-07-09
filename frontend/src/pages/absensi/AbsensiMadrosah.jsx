import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw, CheckCircle2, Search, Calendar, Users, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useKelas } from '../../hooks/useAkademik'
import { sendPushNotification } from '../../utils/pushNotification'
import { sendWhatsAppViaFonnte, templateAbsensiWali } from '../../utils/whatsapp'

const STATUS_OPTIONS = [
    { value: 'Hadir', label: 'Hadir', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'Sakit', label: 'Sakit', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'Izin', label: 'Izin', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'Alfa', label: 'Alpha', color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'Pulang', label: 'Pulang', color: 'bg-purple-50 text-purple-700 border-purple-200' },
]

const AbsensiMadrosah = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, userProfile, hasRole } = useAuth()
    const showToast = useToast()
    const isAllowed = hasRole(['guru', 'admin'])
    const { data: kelasList = [], isLoading: loadingKelas } = useKelas()

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedKelasId, setSelectedKelasId] = useState('')
    const [santriList, setSantriList] = useState([])
    const [attendanceMap, setAttendanceMap] = useState({})
    const [loadingSantri, setLoadingSantri] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Auto-select from URL
    useEffect(() => {
        const id = searchParams.get('id')
        if (id && !selectedKelasId) {
            setSelectedKelasId(id)
        }
    }, [searchParams])

    // Fetch santri when Kelas changes
    useEffect(() => {
        if (!selectedKelasId) {
            setSantriList([])
            return
        }
        fetchAttendanceData()
    }, [selectedKelasId, selectedDate])

    const fetchAttendanceData = async () => {
        setLoadingSantri(true)
        try {
            // 1. Fetch Santri in this class
            const { data: sData, error: sError } = await supabase
                .from('santri')
                .select('id, nama, nis, no_telp_wali, nama_wali')
                .eq('kelas_id', selectedKelasId)
                .eq('status', 'Aktif')
                .order('nama')

            if (sError) throw sError
            setSantriList(sData || [])

            // 2. Fetch existing attendance for this date (Specifically Madrosah: jam_ke 1 and no [Quraniyah] tag)
            const { data: aData, error: aError } = await supabase
                .from('presensi')
                .select('*')
                .eq('tanggal', selectedDate)
                .eq('jam_ke', 1)
                .not('keterangan', 'ilike', '%[Quraniyah]%')
                .in('santri_id', sData.map(s => s.id))

            if (aError) throw aError

            const initialMap = {}
            sData.forEach(s => {
                const existing = aData?.find(a => a.santri_id === s.id)
                initialMap[s.id] = {
                    status: existing?.status || '',
                    keterangan: existing?.keterangan || ''
                }
            })
            setAttendanceMap(initialMap)

        } catch (err) {
            console.error(err)
            showToast.error('Gagal memuat data santri')
        } finally {
            setLoadingSantri(false)
        }
    }

    const handleSave = async () => {
        if (!selectedKelasId) return

        const hasEmptyStatus = santriList.some(s => !attendanceMap[s.id]?.status)
        if (hasEmptyStatus) {
            showToast.error('Mohon lengkapi status kehadiran untuk seluruh santri')
            return
        }

        setSaving(true)
        try {
            const payloads = santriList.map(s => ({
                santri_id: s.id,
                tanggal: selectedDate,
                jam_ke: 1,
                status: attendanceMap[s.id].status,
                keterangan: attendanceMap[s.id].keterangan,
                nama_pengabsen: userProfile?.nama || user?.user_metadata?.nama || user?.email || 'Sistem'
            }))

            // Use upsert with conflict resolution on (santri_id, tanggal) 
            // OR Delete and Insert. Since we don't know constraints, we'll try upsert.
            // In SITAQUA, 'presensi' usually has no composite unique constraint on (santri_id, tanggal) 
            // by default in some versions unless defined. 
            // Let's use the safer delete-then-insert pattern if needed, but upsert is cleaner.
            
            // 1. Hapus data presensi santri ini di tanggal dan JAM yang sama agar tidak bentrok
            await supabase.from('presensi')
                .delete()
                .eq('tanggal', selectedDate)
                .eq('jam_ke', 1)
                .in('santri_id', santriList.map(s => s.id))

            // 2. Simpan data baru
            const { error: saveError } = await supabase
                .from('presensi')
                .insert(payloads)

            if (saveError) throw saveError

            showToast.success('Absensi Madrosah berhasil disimpan')

            // === Push Notification: Kirim ke wali santri yang alpha ===
            try {
                const alphaSantri = santriList.filter(s => {
                    const st = (attendanceMap[s.id]?.status || '').toLowerCase()
                    return ['alfa', 'alpha', 'alpa'].includes(st)
                })
                if (alphaSantri.length > 0) {
                    const kelasNama = kelasList.find(k => k.id === selectedKelasId)?.nama || 'Kelas'

                    const { data: santriWithWali } = await supabase
                        .from('santri')
                        .select('id, nama, wali_id')
                        .in('id', alphaSantri.map(s => s.id))
                        .not('wali_id', 'is', null)

                    if (santriWithWali && santriWithWali.length > 0) {
                        for (const santri of santriWithWali) {
                            sendPushNotification({
                                type: 'santri_alpha',
                                target_user_ids: [santri.wali_id],
                                title: `${santri.nama} Tidak Hadir`,
                                body: `Ananda ${santri.nama} tercatat tidak hadir (Alpha) pada Madrosah ${kelasNama}, ${selectedDate}`,
                                url: '/wali'
                            }).catch(() => {})
                        }
                    }
                }
            } catch (notifErr) {
                console.warn('[Push] Notification warning:', notifErr.message)
            }

            // === WhatsApp Notification via Fonnte (Absent Students) ===
            try {
                const absentSantri = santriList.filter(s => {
                    const st = attendanceMap[s.id]?.status || 'Hadir'
                    return st !== 'Hadir'
                })
                
                if (absentSantri.length > 0) {
                    const kelasNama = kelasList.find(k => k.id === selectedKelasId)?.nama || 'Kelas'
                    const formattedDateStr = formatDate(selectedDate)
                    
                    for (const santri of absentSantri) {
                        if (santri.no_telp_wali) {
                            const msg = templateAbsensiWali({
                                namaSantri: santri.nama,
                                namaWali: santri.nama_wali,
                                status: attendanceMap[santri.id].status,
                                tanggal: formattedDateStr,
                                sesi: `Madrosah (${kelasNama})`,
                                keterangan: attendanceMap[santri.id].keterangan
                            })
                            sendWhatsAppViaFonnte(santri.no_telp_wali, msg).catch(err => {
                                console.error('Gagal kirim WA Fonnte:', err)
                            })
                        }
                    }
                }
            } catch (waErr) {
                console.warn('[WA] Fonnte error:', waErr.message)
            }
        } catch (err) {
            console.error(err)
            showToast.error('Gagal menyimpan absensi')
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

    const filteredSantri = santriList.filter(s => 
        s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.nis.includes(searchTerm)
    )

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-emerald-200/50 text-center max-w-md border border-emerald-100">
                    <div className="bg-red-50 p-6 rounded-3xl inline-block mb-6 text-red-500">
                        <Users size={48} className="opacity-50" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Terbatas</h2>
                    <p className="text-gray-500 mb-8">Maaf, halaman ini hanya dapat diakses oleh akun dengan role Guru atau Administrator.</p>
                    <button 
                        onClick={() => navigate('/absensi/home')}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                        <ArrowLeft size={18} />
                        <span>Kembali ke Portal</span>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Bar */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between gap-2">
                    <button 
                        onClick={() => navigate('/absensi/home')}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-700 transition-colors font-black text-[10px] uppercase tracking-wider shrink-0"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden xs:inline">Kembali</span>
                    </button>
                    <h1 className="font-black text-gray-900 text-sm md:text-lg truncate px-2">Madrosah</h1>
                    <button 
                        onClick={handleSave}
                        disabled={saving || !selectedKelasId}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 md:px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50 shrink-0"
                    >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>Simpan</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-6">
                
                {/* Filters */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Calendar size={16} className="text-emerald-600" />
                            Tanggal Absensi
                        </label>
                        <input 
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none bg-gray-50/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Filter size={16} className="text-emerald-600" />
                            Pilih Kelas
                        </label>
                        <select 
                            value={selectedKelasId}
                            onChange={(e) => setSelectedKelasId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none bg-gray-50/50"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Search & Actions */}
                {selectedKelasId && (
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full sm:w-auto flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Cari nama santri..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none bg-white shadow-sm"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={() => markAll('Hadir')}
                                className="flex-1 sm:flex-none px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold text-xs hover:bg-green-100 transition-all"
                            >
                                Set Semua Hadir
                            </button>
                        </div>
                    </div>
                )}

                {/* Santri List */}
                {loadingSantri ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                        <RefreshCw size={40} className="animate-spin text-emerald-600" />
                        <p className="font-medium">Memuat data santri...</p>
                    </div>
                ) : !selectedKelasId ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <Users size={64} className="opacity-20" />
                        <p className="text-lg font-medium">Silakan pilih kelas terlebih dahulu</p>
                    </div>
                ) : filteredSantri.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-3xl border border-gray-100">
                        <p className="text-gray-500">Tidak ada santri ditemukan.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredSantri.map(s => {
                            const current = attendanceMap[s.id] || { status: 'Hadir', keterangan: '' }
                            return (
                                <div key={s.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-5 md:items-center justify-between group hover:border-emerald-200 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 group-hover:text-emerald-700 transition-colors truncate">{s.nama}</h3>
                                        <p className="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase mt-0.5">{s.nis}</p>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                                        {STATUS_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setAttendanceMap(prev => ({
                                                        ...prev,
                                                        [s.id]: { ...prev[s.id], status: opt.value }
                                                    }))
                                                }}
                                                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all ${
                                                    current.status === opt.value 
                                                    ? `${opt.color} shadow-md scale-105 border-transparent` 
                                                    : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
 
                                    <div className="w-full md:w-40">
                                        <input 
                                            type="text"
                                            placeholder="Catatan..."
                                            value={current.keterangan}
                                            onChange={(e) => {
                                                setAttendanceMap(prev => ({
                                                    ...prev,
                                                    [s.id]: { ...prev[s.id], keterangan: e.target.value }
                                                }))
                                            }}
                                            className="w-full text-[10px] font-bold px-4 py-3 rounded-xl border border-gray-100 focus:border-emerald-200 bg-gray-50/30 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                
                {/* Extra padding at bottom for mobile */}
                <div className="h-20" />
            </main>
        </div>
    )
}

export default AbsensiMadrosah
