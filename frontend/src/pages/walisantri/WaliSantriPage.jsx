import { useState, useEffect } from 'react'
import { Book, Award, Calendar, FileText, ArrowLeft, RefreshCw, Eye, CheckCircle, Clock, AlertCircle, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { useCalendar } from '../../context/CalendarContext'
import PageHeader from '../../components/layout/PageHeader'
import DateDisplay from '../../components/common/DateDisplay'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import DateRangePicker from '../../components/ui/DateRangePicker'

const WaliSantriPage = () => {
    const showToast = useToast()
    const { formatDate } = useCalendar()
    const [activeMenu, setActiveMenu] = useState(null)
    const [loading, setLoading] = useState(false)

    // Filter states
    const [santriList, setSantriList] = useState([])
    const [semesterList, setSemesterList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState('')
    const [selectedSemester, setSelectedSemester] = useState('')
    const [dateRange, setDateRange] = useState({ dari: '', sampai: '' })

    // Data states
    const [hafalanData, setHafalanData] = useState([])
    const [nilaiData, setNilaiData] = useState([])
    const [presensiData, setPresensiData] = useState([])
    const [raportData, setRaportData] = useState(null)

    useEffect(() => {
        fetchSantri()
        fetchSemester()
    }, [])

    const fetchSantri = async () => {
        try {
            const { data } = await supabase
                .from('santri')
                .select('id, nis, nama, kelas:kelas!kelas_id(nama)')
                .eq('status', 'Aktif')
                .order('nama')
            setSantriList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchSemester = async () => {
        try {
            const { data } = await supabase
                .from('semester')
                .select('id, nama, tahun_ajaran, is_active')
                .order('is_active', { ascending: false })
            setSemesterList(data || [])
            const activeSem = data?.find(s => s.is_active)
            if (activeSem) setSelectedSemester(activeSem.id)
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    // ==================== HAFALAN ====================
    const fetchHafalan = async () => {
        if (!selectedSantri) return showToast.error('Pilih santri terlebih dahulu')
        setLoading(true)
        try {
            let query = supabase
                .from('hafalan')
                .select('id, tanggal, juz, surah, juz_mulai, juz_selesai, surah_mulai, surah_selesai, ayat_mulai, ayat_selesai, jenis, status, kadar_setoran, catatan')
                .eq('santri_id', selectedSantri)
                .order('tanggal', { ascending: false })

            if (dateRange.dari) query = query.gte('tanggal', dateRange.dari)
            if (dateRange.sampai) query = query.lte('tanggal', dateRange.sampai)

            const { data, error } = await query
            if (error) throw error
            setHafalanData(data || [])
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat data hafalan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // ==================== NILAI ====================
    const fetchNilai = async () => {
        if (!selectedSantri || !selectedSemester) return showToast.error('Pilih santri dan semester')
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('nilai')
                .select('mapel:mapel!mapel_id(nama, kategori), nilai_tugas, nilai_uts, nilai_uas, nilai_akhir')
                .eq('santri_id', selectedSantri)
                .eq('semester_id', selectedSemester)
            if (error) throw error
            setNilaiData(data || [])
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // ==================== PRESENSI ====================
    const fetchPresensi = async () => {
        if (!selectedSantri) return showToast.error('Pilih santri terlebih dahulu')
        setLoading(true)
        try {
            let query = supabase
                .from('presensi')
                .select('id, tanggal, status')
                .eq('santri_id', selectedSantri)
                .order('tanggal', { ascending: false })

            if (dateRange.dari) query = query.gte('tanggal', dateRange.dari)
            if (dateRange.sampai) query = query.lte('tanggal', dateRange.sampai)

            const { data, error } = await query
            if (error) throw error
            setPresensiData(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    // ==================== RAPORT ====================
    const fetchRaport = async () => {
        if (!selectedSantri || !selectedSemester) return showToast.error('Pilih santri dan semester')
        setLoading(true)
        try {
            // Fetch santri
            const { data: santriData } = await supabase
                .from('santri')
                .select('*, kelas:kelas!kelas_id(nama, wali_kelas:guru!wali_kelas_id(nama)), halaqoh:halaqoh!halaqoh_id(nama, musyrif:guru!musyrif_id(nama))')
                .eq('id', selectedSantri)
                .single()

            // Fetch semester
            const { data: semesterData } = await supabase
                .from('semester')
                .select('*')
                .eq('id', selectedSemester)
                .single()

            // Fetch nilai
            const { data: nilaiList } = await supabase
                .from('nilai')
                .select('mapel:mapel!mapel_id(nama, kategori), nilai_akhir')
                .eq('santri_id', selectedSantri)
                .eq('semester_id', selectedSemester)

            // Fetch hafalan
            const { data: hafalanList } = await supabase
                .from('hafalan')
                .select('juz, status')
                .eq('santri_id', selectedSantri)
                .eq('status', 'Mutqin')

            // Fetch perilaku
            const { data: perilakuData } = await supabase
                .from('perilaku')
                .select('ketekunan, kedisiplinan, kebersihan, kerapian')
                .eq('santri_id', selectedSantri)
                .eq('semester_id', selectedSemester)
                .single()

            // Fetch pencapaian hafalan
            const { data: pencapaianData } = await supabase
                .from('pencapaian_hafalan')
                .select('jumlah_hafalan, predikat, total_hafalan')
                .eq('santri_id', selectedSantri)
                .eq('semester_id', selectedSemester)
                .single()

            const totalNilai = (nilaiList || []).reduce((sum, n) => sum + (n.nilai_akhir || 0), 0)
            const rataRata = nilaiList?.length > 0 ? totalNilai / nilaiList.length : 0
            const juzMutqin = [...new Set(hafalanList?.map(h => h.juz) || [])].length

            setRaportData({
                santri: santriData,
                semester: semesterData,
                nilai: nilaiList || [],
                hafalan: {
                    juzMutqin,
                    totalSetoran: hafalanList?.length || 0,
                    jumlahHafalan: pencapaianData?.jumlah_hafalan || `${juzMutqin} Juz`,
                    predikat: pencapaianData?.predikat || 'Baik',
                    totalHafalan: pencapaianData?.total_hafalan || '-'
                },
                perilaku: perilakuData || { ketekunan: 'Baik', kedisiplinan: 'Baik', kebersihan: 'Baik', kerapian: 'Baik' },
                stats: { rataRata, totalMapel: nilaiList?.length || 0 }
            })
        } catch (err) {
            console.error('Error:', err.message)
            showToast.error('Gagal memuat data raport')
        } finally {
            setLoading(false)
        }
    }

    const handleMenuClick = (menu) => {
        setActiveMenu(menu)
        // Reset data
        setHafalanData([])
        setNilaiData([])
        setPresensiData([])
        setRaportData(null)
    }

    const handleBack = () => {
        setActiveMenu(null)
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Mutqin': return <Badge variant="success">Mutqin</Badge>
            case 'Lancar': return <Badge variant="info">Lancar</Badge>
            case 'Perbaikan': return <Badge variant="warning">Perbaikan</Badge>
            case 'hadir': return <Badge variant="success">Hadir</Badge>
            case 'izin': return <Badge variant="info">Izin</Badge>
            case 'sakit': return <Badge variant="warning">Sakit</Badge>
            case 'alpha': return <Badge variant="danger">Alpha</Badge>
            default: return <Badge variant="neutral">{status}</Badge>
        }
    }

    const getPresensiStats = () => {
        return {
            hadir: presensiData.filter(p => p.status === 'hadir').length,
            izin: presensiData.filter(p => p.status === 'izin').length,
            sakit: presensiData.filter(p => p.status === 'sakit').length,
            alpha: presensiData.filter(p => p.status === 'alpha').length
        }
    }

    const menuItems = [
        { id: 'hafalan', title: 'Laporan Hafalan', desc: 'Lihat riwayat setoran dan muroja\'ah', icon: Book, color: 'bg-emerald-100 text-emerald-600' },
        { id: 'nilai', title: 'Laporan Nilai', desc: 'Lihat nilai akademik per semester', icon: Award, color: 'bg-blue-100 text-blue-600' },
        { id: 'presensi', title: 'Laporan Presensi', desc: 'Lihat rekap kehadiran santri', icon: Calendar, color: 'bg-amber-100 text-amber-600' },
        { id: 'raport', title: 'Laporan Raport', desc: 'Lihat raport lengkap semester', icon: FileText, color: 'bg-violet-100 text-violet-600' }
    ]

    const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
    const labelClass = "block text-sm font-medium text-gray-700 mb-1"

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Menu Wali Santri"
                description="Portal informasi akademik dan kegiatan santri"
                icon={Book}
            />

            {/* Menu Grid */}
            {!activeMenu && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {menuItems.map(item => (
                        <Card
                            key={item.id}
                            className="cursor-pointer hover:-translate-y-1 transition-transform border-gray-200 hover:shadow-md"
                            onClick={() => handleMenuClick(item.id)}
                        >
                            <div className="p-6 text-center flex flex-col items-center">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${item.color}`}>
                                    <item.icon size={28} />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-gray-500 text-sm">{item.desc}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* ==================== LAPORAN HAFALAN ==================== */}
            {activeMenu === 'hafalan' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Book size={22} className="text-emerald-600" /> Laporan Hafalan</h2>
                        <Button variant="secondary" onClick={handleBack}><ArrowLeft size={16} /> Kembali</Button>
                    </div>

                    <Card className="p-4 border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className={labelClass}>Santri</label>
                                <select className={inputClass} value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                    <option value="">-- Pilih Santri --</option>
                                    {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Periode</label>
                                <DateRangePicker
                                    startDate={dateRange.dari}
                                    endDate={dateRange.sampai}
                                    onChange={(start, end) => setDateRange({ ...dateRange, dari: start, sampai: end })}
                                    className="w-full"
                                />
                            </div>
                            <Button onClick={fetchHafalan} disabled={loading} isLoading={loading}>
                                <RefreshCw size={16} /> Tampilkan
                            </Button>
                        </div>
                    </Card>

                    {hafalanData.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-emerald-700">{hafalanData.filter(h => h.status === 'Mutqin').length}</div>
                                    <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Mutqin</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-blue-700">{hafalanData.filter(h => h.status === 'Lancar').length}</div>
                                    <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Lancar</div>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-amber-700">{hafalanData.filter(h => h.status === 'Perbaikan').length}</div>
                                    <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Perbaikan</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-gray-700">{hafalanData.length}</div>
                                    <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Total Setoran</div>
                                </div>
                            </div>

                            <Card className="overflow-hidden border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 w-12 text-center">No</th>
                                                <th className="px-6 py-4">Tanggal</th>
                                                <th className="px-6 py-4">Juz</th>
                                                <th className="px-6 py-4">Surat</th>
                                                <th className="px-6 py-4">Ayat</th>
                                                <th className="px-6 py-4">Jenis</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {hafalanData.map((h, i) => (
                                                <tr key={h.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-center">{i + 1}</td>
                                                    <td className="px-6 py-4"><DateDisplay date={h.tanggal} /></td>
                                                    <td className="px-6 py-4">Juz {h.juz_mulai || h.juz || '-'}{(h.juz_selesai && h.juz_selesai !== h.juz_mulai) ? ` - ${h.juz_selesai}` : ''}</td>
                                                    <td className="px-6 py-4">{h.surah_mulai || h.surah || '-'}{(h.surah_selesai && h.surah_selesai !== h.surah_mulai) ? ` s/d ${h.surah_selesai}` : ''}</td>
                                                    <td className="px-6 py-4">{h.ayat_mulai || 1} - {h.ayat_selesai || 1}</td>
                                                    <td className="px-6 py-4 text-gray-500">{h.jenis || 'Setoran'}</td>
                                                    <td className="px-6 py-4">{getStatusBadge(h.status)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    ) : (
                        <EmptyState
                            icon={Book}
                            title="Belum ada data hafalan"
                            message="Pilih santri dan klik Tampilkan untuk melihat data hafalan"
                        />
                    )}
                </div>
            )}

            {/* ==================== LAPORAN NILAI ==================== */}
            {activeMenu === 'nilai' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Award size={22} className="text-blue-600" /> Laporan Nilai</h2>
                        <Button variant="secondary" onClick={handleBack}><ArrowLeft size={16} /> Kembali</Button>
                    </div>

                    <Card className="p-4 border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className={labelClass}>Santri</label>
                                <select className={inputClass} value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                    <option value="">-- Pilih Santri --</option>
                                    {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Semester</label>
                                <select className={inputClass} value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                                    <option value="">-- Pilih Semester --</option>
                                    {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} - {s.tahun_ajaran}</option>)}
                                </select>
                            </div>
                            <Button onClick={fetchNilai} disabled={loading} isLoading={loading}>
                                <RefreshCw size={16} /> Tampilkan
                            </Button>
                        </div>
                    </Card>

                    {nilaiData.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-indigo-700">{(nilaiData.reduce((s, n) => s + (n.nilai_akhir || 0), 0) / nilaiData.length).toFixed(1)}</div>
                                    <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Rata-rata</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-gray-700">{nilaiData.length}</div>
                                    <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Mata Pelajaran</div>
                                </div>
                            </div>

                            <Card className="overflow-hidden border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 w-12 text-center">No</th>
                                                <th className="px-6 py-4">Mata Pelajaran</th>
                                                <th className="px-6 py-4">Kategori</th>
                                                <th className="px-6 py-4 text-center">Tugas</th>
                                                <th className="px-6 py-4 text-center">UTS</th>
                                                <th className="px-6 py-4 text-center">UAS</th>
                                                <th className="px-6 py-4 text-center">Nilai Akhir</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {nilaiData.map((n, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-center">{i + 1}</td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">{n.mapel?.nama}</td>
                                                    <td className="px-6 py-4 text-gray-500">{n.mapel?.kategori}</td>
                                                    <td className="px-6 py-4 text-center">{n.nilai_tugas || '-'}</td>
                                                    <td className="px-6 py-4 text-center">{n.nilai_uts || '-'}</td>
                                                    <td className="px-6 py-4 text-center">{n.nilai_uas || '-'}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-primary-600">{n.nilai_akhir?.toFixed(0) || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    ) : (
                        <EmptyState
                            icon={Award}
                            title="Belum ada data nilai"
                            message="Pilih santri dan semester untuk melihat data nilai"
                        />
                    )}
                </div>
            )}

            {/* ==================== LAPORAN PRESENSI ==================== */}
            {activeMenu === 'presensi' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Calendar size={22} className="text-amber-600" /> Laporan Presensi</h2>
                        <Button variant="secondary" onClick={handleBack}><ArrowLeft size={16} /> Kembali</Button>
                    </div>

                    <Card className="p-4 border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className={labelClass}>Santri</label>
                                <select className={inputClass} value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                    <option value="">-- Pilih Santri --</option>
                                    {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Periode</label>
                                <DateRangePicker
                                    startDate={dateRange.dari}
                                    endDate={dateRange.sampai}
                                    onChange={(start, end) => setDateRange({ ...dateRange, dari: start, sampai: end })}
                                    className="w-full"
                                />
                            </div>
                            <Button onClick={fetchPresensi} disabled={loading} isLoading={loading}>
                                <RefreshCw size={16} /> Tampilkan
                            </Button>
                        </div>
                    </Card>

                    {presensiData.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-green-700">{getPresensiStats().hadir}</div>
                                    <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Hadir</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-blue-700">{getPresensiStats().izin}</div>
                                    <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Izin</div>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-amber-700">{getPresensiStats().sakit}</div>
                                    <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Sakit</div>
                                </div>
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-red-700">{getPresensiStats().alpha}</div>
                                    <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Alpha</div>
                                </div>
                            </div>

                            <Card className="overflow-hidden border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 w-12 text-center">No</th>
                                                <th className="px-6 py-4">Tanggal</th>
                                                <th className="px-6 py-4">Hari</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {presensiData.map((p, i) => {
                                                const date = new Date(p.tanggal)
                                                const hari = date.toLocaleDateString('id-ID', { weekday: 'long' })
                                                return (
                                                    <tr key={p.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 text-center">{i + 1}</td>
                                                        <td className="px-6 py-4"><DateDisplay date={p.tanggal} /></td>
                                                        <td className="px-6 py-4">{hari}</td>
                                                        <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    ) : (
                        <EmptyState
                            icon={Calendar}
                            title="Belum ada data presensi"
                            message="Pilih santri dan klik Tampilkan untuk melihat data presensi"
                        />
                    )}
                </div>
            )}

            {/* ==================== LAPORAN RAPORT ==================== */}
            {activeMenu === 'raport' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2"><FileText size={22} className="text-violet-600" /> Laporan Raport</h2>
                        <Button variant="secondary" onClick={handleBack}><ArrowLeft size={16} /> Kembali</Button>
                    </div>

                    <Card className="p-4 border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className={labelClass}>Santri</label>
                                <select className={inputClass} value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                    <option value="">-- Pilih Santri --</option>
                                    {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Semester</label>
                                <select className={inputClass} value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                                    <option value="">-- Pilih Semester --</option>
                                    {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} - {s.tahun_ajaran}</option>)}
                                </select>
                            </div>
                            <Button onClick={fetchRaport} disabled={loading} isLoading={loading}>
                                <RefreshCw size={16} /> Lihat Raport
                            </Button>
                        </div>
                    </Card>

                    {raportData ? (
                        <Card className="p-6 border-gray-200">
                            {/* Biodata */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Nama</div>
                                    <div className="font-semibold text-gray-900">{raportData.santri?.nama}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Kelas</div>
                                    <div className="font-semibold text-gray-900">{raportData.santri?.kelas?.nama || '-'}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Semester</div>
                                    <div className="font-semibold text-gray-900">{raportData.semester?.nama}</div>
                                </div>
                                <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                                    <div className="text-xs text-primary-600 uppercase tracking-wider font-semibold mb-1">Rata-rata Nilai</div>
                                    <div className="font-bold text-primary-700 text-lg">{raportData.stats.rataRata.toFixed(1)}</div>
                                </div>
                            </div>

                            {/* Nilai */}
                            <h4 className="flex items-center gap-2 font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                                <Award size={18} className="text-blue-600" /> Nilai Akademik
                            </h4>
                            <div className="overflow-x-auto mb-8 rounded-lg border border-gray-200">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-medium">
                                        <tr>
                                            <th className="px-4 py-3 w-10 text-center">No</th>
                                            <th className="px-4 py-3">Mata Pelajaran</th>
                                            <th className="px-4 py-3 text-center">Nilai</th>
                                            <th className="px-4 py-3 text-center">Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {raportData.nilai.map((n, i) => {
                                            const nilai = n.nilai_akhir || 0
                                            const predikat = nilai >= 90 ? 'A' : nilai >= 80 ? 'B' : nilai >= 70 ? 'C' : 'D'
                                            return (
                                                <tr key={i}>
                                                    <td className="px-4 py-3 text-center">{i + 1}</td>
                                                    <td className="px-4 py-3">{n.mapel?.nama}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-gray-900">{nilai.toFixed(0)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant={predikat === 'A' ? 'success' : predikat === 'B' ? 'info' : 'warning'}>{predikat}</Badge>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pencapaian Hafalan & Perilaku */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="flex items-center gap-2 font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                                        <Book size={18} className="text-emerald-600" /> Pencapaian Tahfizh
                                    </h4>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-gray-600">Jumlah Hafalan</span>
                                            <span className="font-semibold text-gray-900">{raportData.hafalan.jumlahHafalan}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-gray-600">Predikat</span>
                                            <span className="font-semibold text-gray-900">{raportData.hafalan.predikat}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Hafalan</span>
                                            <span className="font-semibold text-gray-900">{raportData.hafalan.totalHafalan}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="flex items-center gap-2 font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                                        <User size={18} className="text-amber-600" /> Perilaku
                                    </h4>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-gray-600">Ketekunan</span>
                                            <span className="font-semibold text-gray-900">{raportData.perilaku.ketekunan}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-gray-600">Kedisiplinan</span>
                                            <span className="font-semibold text-gray-900">{raportData.perilaku.kedisiplinan}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-gray-600">Kebersihan</span>
                                            <span className="font-semibold text-gray-900">{raportData.perilaku.kebersihan}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Kerapian</span>
                                            <span className="font-semibold text-gray-900">{raportData.perilaku.kerapian}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <EmptyState
                            icon={FileText}
                            title="Belum ada data raport"
                            message="Pilih santri dan semester untuk melihat raport"
                        />
                    )}
                </div>
            )}
        </div>
    )
}

export default WaliSantriPage
