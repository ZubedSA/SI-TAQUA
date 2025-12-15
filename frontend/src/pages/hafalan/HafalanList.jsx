import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, RefreshCw, FileText, BarChart3, CheckCircle, Clock, AlertCircle, Filter, Calendar, MessageCircle, Trophy, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Hafalan.css'

const HafalanList = () => {
    const [hafalan, setHafalan] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedHafalan, setSelectedHafalan] = useState(null)
    const [activeTab, setActiveTab] = useState('list') // 'list', 'rekap', or 'pencapaian'
    const [activeFilter, setActiveFilter] = useState('Semua')
    const [stats, setStats] = useState({ total: 0, mutqin: 0, lancar: 0, perbaikan: 0 })

    // Date filter for Input Hafalan tab
    const [dateFilter, setDateFilter] = useState({ dari: '', sampai: '' })

    // Rekap filters
    const [halaqohList, setHalaqohList] = useState([])
    const [rekapFilters, setRekapFilters] = useState({
        tanggalMulai: '',
        tanggalSelesai: '',
        halaqoh_id: '',
        santri_nama: ''
    })
    const [rekapData, setRekapData] = useState([])
    const [rekapStats, setRekapStats] = useState({ totalSetoran: 0, lancar: 0, mutqin: 0, perbaikan: 0 })

    // Pencapaian state
    const [semesterList, setSemesterList] = useState([])
    const [santriList, setSantriList] = useState([])
    const [pencapaianSemester, setPencapaianSemester] = useState('')
    const [pencapaianSearch, setPencapaianSearch] = useState('')
    const [pencapaianData, setPencapaianData] = useState({})
    const [savingPencapaian, setSavingPencapaian] = useState(false)

    useEffect(() => {
        fetchHafalan()
        fetchHalaqoh()
        fetchSemester()
        fetchSantriList()
    }, [])

    useEffect(() => {
        if (activeTab === 'pencapaian' && pencapaianSemester) {
            fetchPencapaian()
        }
    }, [activeTab, pencapaianSemester])

    const fetchSemester = async () => {
        try {
            const { data } = await supabase.from('semester').select('id, nama, tahun_ajaran, is_active').order('is_active', { ascending: false })
            setSemesterList(data || [])
            const activeSem = data?.find(s => s.is_active)
            if (activeSem) setPencapaianSemester(activeSem.id)
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchSantriList = async () => {
        try {
            const { data } = await supabase.from('santri').select('id, nis, nama, kelas:kelas_id(nama)').eq('status', 'Aktif').order('nama')
            setSantriList(data?.map(s => ({ ...s, kelas: s.kelas?.nama || '-' })) || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchPencapaian = async () => {
        try {
            const { data } = await supabase.from('pencapaian_hafalan').select('santri_id, jumlah_hafalan, predikat, total_hafalan').eq('semester_id', pencapaianSemester)
            const pencapaianMap = {}
            santriList.forEach(s => {
                pencapaianMap[s.id] = { jumlah_hafalan: '', predikat: 'Baik', total_hafalan: '' }
            })
            data?.forEach(p => {
                pencapaianMap[p.santri_id] = {
                    jumlah_hafalan: p.jumlah_hafalan || '',
                    predikat: p.predikat || 'Baik',
                    total_hafalan: p.total_hafalan || ''
                }
            })
            setPencapaianData(pencapaianMap)
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const handlePencapaianChange = (santriId, field, value) => {
        setPencapaianData(prev => ({
            ...prev,
            [santriId]: { ...prev[santriId], [field]: value }
        }))
    }

    const savePencapaian = async () => {
        if (!pencapaianSemester) return alert('Pilih semester terlebih dahulu')
        setSavingPencapaian(true)
        try {
            await supabase.from('pencapaian_hafalan').delete().eq('semester_id', pencapaianSemester)
            const insertData = Object.entries(pencapaianData)
                .filter(([_, v]) => v.jumlah_hafalan || v.total_hafalan)
                .map(([santriId, v]) => ({
                    santri_id: santriId,
                    semester_id: pencapaianSemester,
                    jumlah_hafalan: v.jumlah_hafalan,
                    predikat: v.predikat,
                    total_hafalan: v.total_hafalan
                }))
            if (insertData.length > 0) {
                const { error } = await supabase.from('pencapaian_hafalan').insert(insertData)
                if (error) throw error
            }
            alert('Pencapaian hafalan berhasil disimpan!')
        } catch (err) {
            console.error('Error:', err.message)
            alert('Gagal menyimpan: ' + err.message)
        } finally {
            setSavingPencapaian(false)
        }
    }

    const fetchHalaqoh = async () => {
        try {
            const { data } = await supabase.from('halaqoh').select('id, nama').order('nama')
            setHalaqohList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchHafalan = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('hafalan')
                .select(`
                    *,
                    santri:santri_id(nama, nama_wali, no_telp_wali, kelas:kelas_id(nama), halaqoh:halaqoh_id(id, nama)),
                    penguji:penguji_id(nama)
                `)
                .order('tanggal', { ascending: false })

            if (error) throw error

            const mapped = data.map(h => ({
                ...h,
                santri_nama: h.santri?.nama || '-',
                nama_wali: h.santri?.nama_wali || '-',
                no_telp_wali: h.santri?.no_telp_wali || '',
                kelas_nama: h.santri?.kelas?.nama || '-',
                halaqoh_id: h.santri?.halaqoh?.id || null,
                halaqoh_nama: h.santri?.halaqoh?.nama || '-',
                penguji_nama: h.penguji?.nama || '-'
            }))

            setHafalan(mapped)
            calculateStats(mapped)
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const calculateStats = (data) => {
        const total = data.length
        const mutqin = data.filter(h => h.status === 'Mutqin').length
        const lancar = data.filter(h => h.status === 'Lancar').length
        const perbaikan = data.filter(h => h.status === 'Perlu Perbaikan' || h.status === 'Proses').length
        setStats({ total, mutqin, lancar, perbaikan })
    }

    const handleDelete = async () => {
        if (!selectedHafalan) return
        try {
            const { error } = await supabase.from('hafalan').delete().eq('id', selectedHafalan.id)
            if (error) throw error
            setHafalan(hafalan.filter(h => h.id !== selectedHafalan.id))
            setShowDeleteModal(false)
            setSelectedHafalan(null)
            fetchHafalan()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    // Filter for Input Hafalan tab
    const filteredHafalan = hafalan.filter(h => {
        const matchSearch = h.santri_nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.surah?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchFilter = activeFilter === 'Semua' || h.jenis === activeFilter

        // Date filter
        let matchDate = true
        if (dateFilter.dari) {
            matchDate = matchDate && h.tanggal >= dateFilter.dari
        }
        if (dateFilter.sampai) {
            matchDate = matchDate && h.tanggal <= dateFilter.sampai
        }

        return matchSearch && matchFilter && matchDate
    })

    // Fungsi kirim WhatsApp
    const sendWhatsApp = (item) => {
        // Gunakan nomor dari database, atau minta input jika tidak ada
        let phone = item.no_telp_wali || ''

        // Format nomor (hapus karakter non-digit, tambah 62 jika perlu)
        phone = phone.replace(/\D/g, '')
        if (phone.startsWith('0')) {
            phone = '62' + phone.substring(1)
        }

        // Jika tidak ada nomor, minta input manual
        if (!phone) {
            phone = prompt(`Nomor telepon wali ${item.nama_wali || 'santri'} tidak tersedia.\n\nMasukkan nomor WhatsApp (contoh: 6281234567890):`)
            if (!phone) return
            phone = phone.replace(/\D/g, '')
            if (phone.startsWith('0')) {
                phone = '62' + phone.substring(1)
            }
        }

        const message = `Assalamu'alaikum Wr. Wb.

*LAPORAN HAFALAN SANTRI*
━━━━━━━━━━━━━━━━━━━━

Kepada Yth. Bapak/Ibu *${item.nama_wali || 'Wali Santri'}*

📌 *Nama Santri:* ${item.santri_nama}
📅 *Tanggal:* ${item.tanggal}
📖 *Jenis:* ${item.jenis || 'Setoran'}

*Detail Hafalan:*
• Juz: ${item.juz}
• Surah: ${item.surah}
• Ayat: ${item.ayat_mulai} - ${item.ayat_selesai}

*Status:* ${item.status}
*Penguji:* ${item.penguji_nama || '-'}

${item.catatan ? `*Catatan:* ${item.catatan}` : ''}

Demikian laporan hafalan ananda. Jazakumullah khairan.

_PTQA Batuan_`

        const encoded = encodeURIComponent(message)
        window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
    }

    // Filter for Rekap Hafalan tab
    const applyRekapFilter = () => {
        let filtered = [...hafalan]

        // Filter by date range
        if (rekapFilters.tanggalMulai) {
            filtered = filtered.filter(h => h.tanggal >= rekapFilters.tanggalMulai)
        }
        if (rekapFilters.tanggalSelesai) {
            filtered = filtered.filter(h => h.tanggal <= rekapFilters.tanggalSelesai)
        }

        // Filter by halaqoh
        if (rekapFilters.halaqoh_id) {
            filtered = filtered.filter(h => h.halaqoh_id === rekapFilters.halaqoh_id)
        }

        // Filter by santri name
        if (rekapFilters.santri_nama) {
            filtered = filtered.filter(h =>
                h.santri_nama?.toLowerCase().includes(rekapFilters.santri_nama.toLowerCase())
            )
        }

        setRekapData(filtered)

        // Calculate rekap stats
        const totalSetoran = filtered.filter(h => h.jenis === 'Setoran').length
        const lancar = filtered.filter(h => h.status === 'Lancar').length
        const mutqin = filtered.filter(h => h.status === 'Mutqin').length
        const perbaikan = filtered.filter(h => h.status === 'Perlu Perbaikan' || h.status === 'Proses').length
        setRekapStats({ totalSetoran, lancar, mutqin, perbaikan })
    }

    useEffect(() => {
        if (activeTab === 'rekap') {
            applyRekapFilter()
        }
    }, [activeTab, rekapFilters, hafalan])

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Mutqin': return 'badge-success'
            case 'Lancar': return 'badge-info'
            case 'Perlu Perbaikan':
            case 'Proses': return 'badge-warning'
            default: return 'badge-error'
        }
    }

    const getJenisBadge = (jenis) => {
        return jenis === 'Setoran' ? 'badge-info' : 'badge-warning'
    }

    return (
        <div className="hafalan-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Hafalan Tahfizh</h1>
                    <p className="page-subtitle">Kelola setoran dan muroja'ah hafalan santri</p>
                </div>
            </div>

            {/* Top Tabs */}
            <div className="hafalan-tabs">
                <button
                    className={`hafalan-tab ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    <FileText size={16} /> Input Hafalan
                </button>
                <button
                    className={`hafalan-tab ${activeTab === 'rekap' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rekap')}
                >
                    <BarChart3 size={16} /> Rekap Hafalan
                </button>
                <button
                    className={`hafalan-tab ${activeTab === 'pencapaian' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pencapaian')}
                >
                    <Trophy size={16} /> Pencapaian
                </button>
            </div>

            {/* ==================== INPUT HAFALAN TAB ==================== */}
            {activeTab === 'list' && (
                <>
                    {/* Mini Dashboard Stats */}
                    <div className="hafalan-stats">
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Total</span>
                                <FileText size={18} className="stat-icon" />
                            </div>
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-bar stat-bar-total"></div>
                        </div>
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Mutqin</span>
                                <CheckCircle size={18} className="stat-icon text-success" />
                            </div>
                            <div className="stat-value text-success">{stats.mutqin}</div>
                            <div className="stat-bar stat-bar-mutqin" style={{ width: stats.total ? `${(stats.mutqin / stats.total) * 100}%` : '0%' }}></div>
                        </div>
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Lancar</span>
                                <Clock size={18} className="stat-icon text-info" />
                            </div>
                            <div className="stat-value text-info">{stats.lancar}</div>
                            <div className="stat-bar stat-bar-lancar" style={{ width: stats.total ? `${(stats.lancar / stats.total) * 100}%` : '0%' }}></div>
                        </div>
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Perlu Perbaikan</span>
                                <AlertCircle size={18} className="stat-icon text-error" />
                            </div>
                            <div className="stat-value text-error">{stats.perbaikan}</div>
                            <div className="stat-bar stat-bar-perbaikan" style={{ width: stats.total ? `${(stats.perbaikan / stats.total) * 100}%` : '0%' }}></div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="hafalan-filter-tabs">
                        <button className={`filter-tab ${activeFilter === 'Semua' ? 'active' : ''}`} onClick={() => setActiveFilter('Semua')}>Semua</button>
                        <button className={`filter-tab ${activeFilter === 'Setoran' ? 'active' : ''}`} onClick={() => setActiveFilter('Setoran')}>Setoran</button>
                        <button className={`filter-tab ${activeFilter === "Muroja'ah" ? 'active' : ''}`} onClick={() => setActiveFilter("Muroja'ah")}>Muroja'ah</button>
                    </div>

                    {/* Date Filter */}
                    <div className="date-filter-row">
                        <div className="date-filter-group">
                            <label><Calendar size={14} /> Dari Tanggal</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateFilter.dari}
                                onChange={(e) => setDateFilter({ ...dateFilter, dari: e.target.value })}
                            />
                        </div>
                        <div className="date-filter-group">
                            <label><Calendar size={14} /> Sampai Tanggal</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateFilter.sampai}
                                onChange={(e) => setDateFilter({ ...dateFilter, sampai: e.target.value })}
                            />
                        </div>
                        {(dateFilter.dari || dateFilter.sampai) && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter({ dari: '', sampai: '' })}>
                                <RefreshCw size={14} /> Reset
                            </button>
                        )}
                    </div>

                    {/* Search and Add Button */}
                    <div className="hafalan-toolbar">
                        <div className="table-search">
                            <Search size={18} className="search-icon" />
                            <input type="text" placeholder="Cari nama santri..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                        </div>
                        <Link to="/hafalan/create" className="btn btn-primary">
                            <Plus size={18} /> Input Setoran
                        </Link>
                    </div>

                    {/* Table */}
                    <div className="table-container">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Nama Santri</th>
                                        <th>Kelas</th>
                                        <th>Hafalan</th>
                                        <th>Jenis</th>
                                        <th>Status</th>
                                        <th>Penguji</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="8" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                    ) : filteredHafalan.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center">Tidak ada data hafalan</td></tr>
                                    ) : (
                                        filteredHafalan.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.tanggal}</td>
                                                <td className="name-cell">{item.santri_nama}</td>
                                                <td>{item.kelas_nama}</td>
                                                <td>
                                                    <div className="hafalan-info">
                                                        <strong>Juz {item.juz} - {item.surah}</strong>
                                                        <span className="text-muted">Ayat {item.ayat_mulai}-{item.ayat_selesai}</span>
                                                    </div>
                                                </td>
                                                <td><span className={`badge ${getJenisBadge(item.jenis)}`}>{item.jenis || 'Setoran'}</span></td>
                                                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                                <td>{item.penguji_nama}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="btn-icon btn-icon-success" title="Kirim WhatsApp" onClick={() => sendWhatsApp(item)}><MessageCircle size={16} /></button>
                                                        <Link to={`/hafalan/${item.id}/edit`} className="btn-icon" title="Edit"><Edit size={16} /></Link>
                                                        <button className="btn-icon btn-icon-danger" title="Hapus" onClick={() => { setSelectedHafalan(item); setShowDeleteModal(true) }}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ==================== REKAP HAFALAN TAB ==================== */}
            {activeTab === 'rekap' && (
                <>
                    {/* Rekap Filters */}
                    <div className="rekap-filters">
                        <div className="filter-group">
                            <label className="filter-label"><Calendar size={14} /> Dari Tanggal</label>
                            <input
                                type="date"
                                className="form-control"
                                value={rekapFilters.tanggalMulai}
                                onChange={(e) => setRekapFilters({ ...rekapFilters, tanggalMulai: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label"><Calendar size={14} /> Sampai Tanggal</label>
                            <input
                                type="date"
                                className="form-control"
                                value={rekapFilters.tanggalSelesai}
                                onChange={(e) => setRekapFilters({ ...rekapFilters, tanggalSelesai: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label"><Filter size={14} /> Halaqoh</label>
                            <select
                                className="form-control"
                                value={rekapFilters.halaqoh_id}
                                onChange={(e) => setRekapFilters({ ...rekapFilters, halaqoh_id: e.target.value })}
                            >
                                <option value="">Semua Halaqoh</option>
                                {halaqohList.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="filter-label"><Search size={14} /> Nama Santri</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Cari nama..."
                                value={rekapFilters.santri_nama}
                                onChange={(e) => setRekapFilters({ ...rekapFilters, santri_nama: e.target.value })}
                            />
                        </div>
                        <div className="filter-group filter-actions">
                            <button className="btn btn-secondary" onClick={() => setRekapFilters({ tanggalMulai: '', tanggalSelesai: '', halaqoh_id: '', santri_nama: '' })}>
                                <RefreshCw size={14} /> Reset
                            </button>
                        </div>
                    </div>

                    {/* Rekap Mini Dashboard */}
                    <div className="hafalan-stats">
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Total Setoran</span>
                                <FileText size={18} className="stat-icon text-primary" />
                            </div>
                            <div className="stat-value">{rekapStats.totalSetoran}</div>
                            <div className="stat-bar stat-bar-total"></div>
                        </div>
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Lancar</span>
                                <Clock size={18} className="stat-icon text-info" />
                            </div>
                            <div className="stat-value text-info">{rekapStats.lancar}</div>
                            <div className="stat-bar stat-bar-lancar" style={{ width: rekapData.length ? `${(rekapStats.lancar / rekapData.length) * 100}%` : '0%' }}></div>
                        </div>
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Mutqin</span>
                                <CheckCircle size={18} className="stat-icon text-success" />
                            </div>
                            <div className="stat-value text-success">{rekapStats.mutqin}</div>
                            <div className="stat-bar stat-bar-mutqin" style={{ width: rekapData.length ? `${(rekapStats.mutqin / rekapData.length) * 100}%` : '0%' }}></div>
                        </div>
                        <div className="hafalan-stat-card">
                            <div className="stat-header">
                                <span className="stat-label">Perlu Perbaikan</span>
                                <AlertCircle size={18} className="stat-icon text-error" />
                            </div>
                            <div className="stat-value text-error">{rekapStats.perbaikan}</div>
                            <div className="stat-bar stat-bar-perbaikan" style={{ width: rekapData.length ? `${(rekapStats.perbaikan / rekapData.length) * 100}%` : '0%' }}></div>
                        </div>
                    </div>

                    {/* Rekap Table */}
                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Data Rekap ({rekapData.length} record)</h3>
                        </div>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Tanggal</th>
                                        <th>Nama Santri</th>
                                        <th>Halaqoh</th>
                                        <th>Hafalan</th>
                                        <th>Jenis</th>
                                        <th>Status</th>
                                        <th>Penguji</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="8" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                    ) : rekapData.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center">Tidak ada data. Sesuaikan filter.</td></tr>
                                    ) : (
                                        rekapData.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td>{idx + 1}</td>
                                                <td>{item.tanggal}</td>
                                                <td className="name-cell">{item.santri_nama}</td>
                                                <td>{item.halaqoh_nama}</td>
                                                <td>
                                                    <div className="hafalan-info">
                                                        <strong>Juz {item.juz} - {item.surah}</strong>
                                                        <span className="text-muted">Ayat {item.ayat_mulai}-{item.ayat_selesai}</span>
                                                    </div>
                                                </td>
                                                <td><span className={`badge ${getJenisBadge(item.jenis)}`}>{item.jenis || 'Setoran'}</span></td>
                                                <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                                <td>{item.penguji_nama}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ==================== PENCAPAIAN TAB ==================== */}
            {activeTab === 'pencapaian' && (
                <>
                    {/* Filter Bar */}
                    <div className="filter-bar mb-4">
                        <div className="filter-group">
                            <label>Semester</label>
                            <select
                                value={pencapaianSemester}
                                onChange={(e) => setPencapaianSemester(e.target.value)}
                                className="form-select"
                            >
                                <option value="">-- Pilih Semester --</option>
                                {semesterList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nama} - {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Cari Santri</label>
                            <input
                                type="text"
                                placeholder="Ketik nama santri..."
                                value={pencapaianSearch}
                                onChange={(e) => setPencapaianSearch(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="filter-group filter-action">
                            <button className="btn btn-primary btn-save" onClick={savePencapaian} disabled={savingPencapaian || !pencapaianSemester}>
                                {savingPencapaian ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                                <span>{savingPencapaian ? 'Menyimpan...' : 'Simpan'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Pencapaian Table */}
                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title"><Trophy size={20} /> Pencapaian Hafalan Semester ({santriList.filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase())).length} santri)</h3>
                        </div>

                        <div className="table-wrapper">
                            <table className="table pencapaian-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Nama Santri</th>
                                        <th>Kelas</th>
                                        <th>Jumlah Hafalan (Semester)</th>
                                        <th>Predikat</th>
                                        <th>Total Hafalan (Keseluruhan)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!pencapaianSemester ? (
                                        <tr><td colSpan="6" className="text-center">Pilih semester terlebih dahulu</td></tr>
                                    ) : santriList.filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase())).length === 0 ? (
                                        <tr><td colSpan="6" className="text-center">Tidak ada data santri</td></tr>
                                    ) : (
                                        santriList
                                            .filter(s => s.nama.toLowerCase().includes(pencapaianSearch.toLowerCase()))
                                            .map((santri, index) => (
                                                <tr key={santri.id}>
                                                    <td>{index + 1}</td>
                                                    <td className="name-cell">{santri.nama}</td>
                                                    <td>{santri.kelas}</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            placeholder="Contoh: 3 Juz"
                                                            value={pencapaianData[santri.id]?.jumlah_hafalan || ''}
                                                            onChange={(e) => handlePencapaianChange(santri.id, 'jumlah_hafalan', e.target.value)}
                                                            className="form-input-sm"
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={pencapaianData[santri.id]?.predikat || 'Baik'}
                                                            onChange={(e) => handlePencapaianChange(santri.id, 'predikat', e.target.value)}
                                                            className="form-select-sm"
                                                        >
                                                            <option value="Sangat Baik">Sangat Baik</option>
                                                            <option value="Baik">Baik</option>
                                                            <option value="Cukup">Cukup</option>
                                                            <option value="Kurang">Kurang</option>
                                                            <option value="Buruk">Buruk</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            placeholder="Contoh: 10 Juz"
                                                            value={pencapaianData[santri.id]?.total_hafalan || ''}
                                                            onChange={(e) => handlePencapaianChange(santri.id, 'total_hafalan', e.target.value)}
                                                            className="form-input-sm"
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Konfirmasi Hapus</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Apakah Anda yakin ingin menghapus data hafalan ini?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Batal</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default HafalanList
