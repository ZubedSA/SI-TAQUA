import { useState, useEffect } from 'react'
import { Book, Award, Calendar, FileText, ArrowLeft, RefreshCw, Download, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import './WaliSantri.css'

const WaliSantriPage = () => {
    const showToast = useToast()
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
                .select('id, nis, nama, kelas:kelas_id(nama)')
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
                .select('mapel:mapel_id(nama, kategori), nilai_tugas, nilai_uts, nilai_uas, nilai_akhir')
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
                .select('*, kelas:kelas_id(nama, wali_kelas:wali_kelas_id(nama)), halaqoh:halaqoh_id(nama, musyrif:musyrif_id(nama))')
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
                .select('mapel:mapel_id(nama, kategori), nilai_akhir')
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
            case 'Mutqin': return <span className="wali-badge hadir">Mutqin</span>
            case 'Lancar': return <span className="wali-badge izin">Lancar</span>
            case 'Perbaikan': return <span className="wali-badge sakit">Perbaikan</span>
            default: return <span className="wali-badge">{status}</span>
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
        { id: 'hafalan', title: 'Laporan Hafalan', desc: 'Lihat riwayat setoran dan muroja\'ah', icon: Book },
        { id: 'nilai', title: 'Laporan Nilai', desc: 'Lihat nilai akademik per semester', icon: Award },
        { id: 'presensi', title: 'Laporan Presensi', desc: 'Lihat rekap kehadiran santri', icon: Calendar },
        { id: 'raport', title: 'Laporan Raport', desc: 'Lihat raport lengkap semester', icon: FileText }
    ]

    return (
        <div className="wali-santri-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Menu Wali Santri</h1>
                    <p className="page-subtitle">Portal informasi akademik dan kegiatan santri</p>
                </div>
            </div>

            {/* Menu Grid */}
            {!activeMenu && (
                <div className="wali-menu-grid">
                    {menuItems.map(item => (
                        <div
                            key={item.id}
                            className="wali-menu-card"
                            onClick={() => handleMenuClick(item.id)}
                        >
                            <div className={`wali-menu-icon ${item.id}`}>
                                <item.icon size={28} />
                            </div>
                            <div className="wali-menu-content">
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ==================== LAPORAN HAFALAN ==================== */}
            {activeMenu === 'hafalan' && (
                <div className="wali-report-section">
                    <div className="wali-report-header">
                        <h2><Book size={22} /> Laporan Hafalan</h2>
                        <button className="btn-back" onClick={handleBack}><ArrowLeft size={16} /> Kembali</button>
                    </div>

                    <div className="wali-filter-bar">
                        <div className="wali-filter-group">
                            <label>Santri</label>
                            <select value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                <option value="">-- Pilih Santri --</option>
                                {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                            </select>
                        </div>
                        <div className="wali-filter-group">
                            <label>Dari Tanggal</label>
                            <input type="date" value={dateRange.dari} onChange={(e) => setDateRange({ ...dateRange, dari: e.target.value })} />
                        </div>
                        <div className="wali-filter-group">
                            <label>Sampai Tanggal</label>
                            <input type="date" value={dateRange.sampai} onChange={(e) => setDateRange({ ...dateRange, sampai: e.target.value })} />
                        </div>
                        <div className="wali-filter-group" style={{ alignSelf: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={fetchHafalan} disabled={loading}>
                                {loading ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />} Tampilkan
                            </button>
                        </div>
                    </div>

                    {hafalanData.length > 0 ? (
                        <>
                            <div className="wali-summary-cards">
                                <div className="wali-summary-card success">
                                    <div className="value">{hafalanData.filter(h => h.status === 'Mutqin').length}</div>
                                    <div className="label">Mutqin</div>
                                </div>
                                <div className="wali-summary-card info">
                                    <div className="value">{hafalanData.filter(h => h.status === 'Lancar').length}</div>
                                    <div className="label">Lancar</div>
                                </div>
                                <div className="wali-summary-card warning">
                                    <div className="value">{hafalanData.filter(h => h.status === 'Perbaikan').length}</div>
                                    <div className="label">Perbaikan</div>
                                </div>
                                <div className="wali-summary-card">
                                    <div className="value">{hafalanData.length}</div>
                                    <div className="label">Total Setoran</div>
                                </div>
                            </div>

                            <div className="table-wrapper">
                                <table className="wali-data-table">
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Tanggal</th>
                                            <th>Juz</th>
                                            <th>Surat</th>
                                            <th>Ayat</th>
                                            <th>Jenis</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hafalanData.map((h, i) => (
                                            <tr key={h.id}>
                                                <td>{i + 1}</td>
                                                <td>{new Date(h.tanggal).toLocaleDateString('id-ID')}</td>
                                                <td>Juz {h.juz_mulai || h.juz || '-'}{(h.juz_selesai && h.juz_selesai !== h.juz_mulai) ? ` - ${h.juz_selesai}` : ''}</td>
                                                <td>{h.surah_mulai || h.surah || '-'}{(h.surah_selesai && h.surah_selesai !== h.surah_mulai) ? ` s/d ${h.surah_selesai}` : ''}</td>
                                                <td>{h.ayat_mulai || 1} - {h.ayat_selesai || 1}</td>
                                                <td>{h.jenis || 'Setoran'}</td>
                                                <td>{getStatusBadge(h.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="wali-empty-state">
                            <Book size={48} />
                            <p>Pilih santri dan klik Tampilkan untuk melihat data hafalan</p>
                        </div>
                    )}
                </div>
            )}

            {/* ==================== LAPORAN NILAI ==================== */}
            {activeMenu === 'nilai' && (
                <div className="wali-report-section">
                    <div className="wali-report-header">
                        <h2><Award size={22} /> Laporan Nilai</h2>
                        <button className="btn-back" onClick={handleBack}><ArrowLeft size={16} /> Kembali</button>
                    </div>

                    <div className="wali-filter-bar">
                        <div className="wali-filter-group">
                            <label>Santri</label>
                            <select value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                <option value="">-- Pilih Santri --</option>
                                {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                            </select>
                        </div>
                        <div className="wali-filter-group">
                            <label>Semester</label>
                            <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                                <option value="">-- Pilih Semester --</option>
                                {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} - {s.tahun_ajaran}</option>)}
                            </select>
                        </div>
                        <div className="wali-filter-group" style={{ alignSelf: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={fetchNilai} disabled={loading}>
                                {loading ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />} Tampilkan
                            </button>
                        </div>
                    </div>

                    {nilaiData.length > 0 ? (
                        <>
                            <div className="wali-summary-cards">
                                <div className="wali-summary-card success">
                                    <div className="value">{(nilaiData.reduce((s, n) => s + (n.nilai_akhir || 0), 0) / nilaiData.length).toFixed(1)}</div>
                                    <div className="label">Rata-rata</div>
                                </div>
                                <div className="wali-summary-card info">
                                    <div className="value">{nilaiData.length}</div>
                                    <div className="label">Mata Pelajaran</div>
                                </div>
                            </div>

                            <div className="table-wrapper">
                                <table className="wali-data-table">
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Mata Pelajaran</th>
                                            <th>Kategori</th>
                                            <th>Tugas</th>
                                            <th>UTS</th>
                                            <th>UAS</th>
                                            <th>Nilai Akhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiData.map((n, i) => (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{n.mapel?.nama}</td>
                                                <td>{n.mapel?.kategori}</td>
                                                <td>{n.nilai_tugas || '-'}</td>
                                                <td>{n.nilai_uts || '-'}</td>
                                                <td>{n.nilai_uas || '-'}</td>
                                                <td><strong>{n.nilai_akhir?.toFixed(0) || '-'}</strong></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="wali-empty-state">
                            <Award size={48} />
                            <p>Pilih santri dan semester untuk melihat data nilai</p>
                        </div>
                    )}
                </div>
            )}

            {/* ==================== LAPORAN PRESENSI ==================== */}
            {activeMenu === 'presensi' && (
                <div className="wali-report-section">
                    <div className="wali-report-header">
                        <h2><Calendar size={22} /> Laporan Presensi</h2>
                        <button className="btn-back" onClick={handleBack}><ArrowLeft size={16} /> Kembali</button>
                    </div>

                    <div className="wali-filter-bar">
                        <div className="wali-filter-group">
                            <label>Santri</label>
                            <select value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                <option value="">-- Pilih Santri --</option>
                                {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                            </select>
                        </div>
                        <div className="wali-filter-group">
                            <label>Dari Tanggal</label>
                            <input type="date" value={dateRange.dari} onChange={(e) => setDateRange({ ...dateRange, dari: e.target.value })} />
                        </div>
                        <div className="wali-filter-group">
                            <label>Sampai Tanggal</label>
                            <input type="date" value={dateRange.sampai} onChange={(e) => setDateRange({ ...dateRange, sampai: e.target.value })} />
                        </div>
                        <div className="wali-filter-group" style={{ alignSelf: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={fetchPresensi} disabled={loading}>
                                {loading ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />} Tampilkan
                            </button>
                        </div>
                    </div>

                    {presensiData.length > 0 ? (
                        <>
                            <div className="wali-summary-cards">
                                <div className="wali-summary-card success">
                                    <div className="value">{getPresensiStats().hadir}</div>
                                    <div className="label">Hadir</div>
                                </div>
                                <div className="wali-summary-card info">
                                    <div className="value">{getPresensiStats().izin}</div>
                                    <div className="label">Izin</div>
                                </div>
                                <div className="wali-summary-card warning">
                                    <div className="value">{getPresensiStats().sakit}</div>
                                    <div className="label">Sakit</div>
                                </div>
                                <div className="wali-summary-card danger">
                                    <div className="value">{getPresensiStats().alpha}</div>
                                    <div className="label">Alpha</div>
                                </div>
                            </div>

                            <div className="table-wrapper">
                                <table className="wali-data-table">
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Tanggal</th>
                                            <th>Hari</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {presensiData.map((p, i) => {
                                            const date = new Date(p.tanggal)
                                            const hari = date.toLocaleDateString('id-ID', { weekday: 'long' })
                                            return (
                                                <tr key={p.id}>
                                                    <td>{i + 1}</td>
                                                    <td>{date.toLocaleDateString('id-ID')}</td>
                                                    <td>{hari}</td>
                                                    <td><span className={`wali-badge ${p.status}`}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="wali-empty-state">
                            <Calendar size={48} />
                            <p>Pilih santri dan klik Tampilkan untuk melihat data presensi</p>
                        </div>
                    )}
                </div>
            )}

            {/* ==================== LAPORAN RAPORT ==================== */}
            {activeMenu === 'raport' && (
                <div className="wali-report-section">
                    <div className="wali-report-header">
                        <h2><FileText size={22} /> Laporan Raport</h2>
                        <button className="btn-back" onClick={handleBack}><ArrowLeft size={16} /> Kembali</button>
                    </div>

                    <div className="wali-filter-bar">
                        <div className="wali-filter-group">
                            <label>Santri</label>
                            <select value={selectedSantri} onChange={(e) => setSelectedSantri(e.target.value)}>
                                <option value="">-- Pilih Santri --</option>
                                {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                            </select>
                        </div>
                        <div className="wali-filter-group">
                            <label>Semester</label>
                            <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                                <option value="">-- Pilih Semester --</option>
                                {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} - {s.tahun_ajaran}</option>)}
                            </select>
                        </div>
                        <div className="wali-filter-group" style={{ alignSelf: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={fetchRaport} disabled={loading}>
                                {loading ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />} Lihat Raport
                            </button>
                        </div>
                    </div>

                    {raportData ? (
                        <div className="raport-preview-content">
                            {/* Biodata */}
                            <div className="wali-summary-cards mb-4">
                                <div className="wali-summary-card">
                                    <div className="label">Nama</div>
                                    <div className="value" style={{ fontSize: '1rem' }}>{raportData.santri?.nama}</div>
                                </div>
                                <div className="wali-summary-card">
                                    <div className="label">Kelas</div>
                                    <div className="value" style={{ fontSize: '1rem' }}>{raportData.santri?.kelas?.nama || '-'}</div>
                                </div>
                                <div className="wali-summary-card">
                                    <div className="label">Semester</div>
                                    <div className="value" style={{ fontSize: '1rem' }}>{raportData.semester?.nama}</div>
                                </div>
                                <div className="wali-summary-card success">
                                    <div className="label">Rata-rata Nilai</div>
                                    <div className="value">{raportData.stats.rataRata.toFixed(1)}</div>
                                </div>
                            </div>

                            {/* Nilai */}
                            <h4 style={{ marginBottom: '12px', color: 'var(--text-dark)' }}>📚 Nilai Akademik</h4>
                            <div className="table-wrapper mb-4">
                                <table className="wali-data-table">
                                    <thead>
                                        <tr>
                                            <th>No</th>
                                            <th>Mata Pelajaran</th>
                                            <th>Nilai</th>
                                            <th>Predikat</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {raportData.nilai.map((n, i) => {
                                            const nilai = n.nilai_akhir || 0
                                            const predikat = nilai >= 90 ? 'A' : nilai >= 80 ? 'B' : nilai >= 70 ? 'C' : 'D'
                                            return (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td>{n.mapel?.nama}</td>
                                                    <td><strong>{nilai.toFixed(0)}</strong></td>
                                                    <td><span className={`wali-badge ${predikat === 'A' ? 'hadir' : predikat === 'B' ? 'izin' : 'sakit'}`}>{predikat}</span></td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pencapaian Hafalan & Perilaku */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                <div>
                                    <h4 style={{ marginBottom: '12px', color: 'var(--text-dark)' }}>📖 Pencapaian Tahfizh</h4>
                                    <div className="wali-summary-card" style={{ textAlign: 'left', padding: '16px' }}>
                                        <p><strong>Jumlah Hafalan:</strong> {raportData.hafalan.jumlahHafalan}</p>
                                        <p><strong>Predikat:</strong> {raportData.hafalan.predikat}</p>
                                        <p><strong>Total Hafalan:</strong> {raportData.hafalan.totalHafalan}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ marginBottom: '12px', color: 'var(--text-dark)' }}>🧑‍🎓 Perilaku</h4>
                                    <div className="wali-summary-card" style={{ textAlign: 'left', padding: '16px' }}>
                                        <p><strong>Ketekunan:</strong> {raportData.perilaku.ketekunan}</p>
                                        <p><strong>Kedisiplinan:</strong> {raportData.perilaku.kedisiplinan}</p>
                                        <p><strong>Kebersihan:</strong> {raportData.perilaku.kebersihan}</p>
                                        <p><strong>Kerapian:</strong> {raportData.perilaku.kerapian}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="wali-empty-state">
                            <FileText size={48} />
                            <p>Pilih santri dan semester untuk melihat raport</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default WaliSantriPage
