import { useState, useEffect } from 'react'
import { Calendar, Check, X, Clock, ChevronLeft, ChevronRight, RefreshCw, Save, Users, Heart, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Presensi.css'

const PERILAKU_KATEGORI = ['Ketekunan', 'Kedisiplinan', 'Kebersihan', 'Kerapian']
const PERILAKU_NILAI = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Buruk']

const PresensiPage = () => {
    const [activeTab, setActiveTab] = useState('presensi')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [santriList, setSantriList] = useState([])
    const [presensi, setPresensi] = useState({})
    const [perilaku, setPerilaku] = useState({})
    const [taujihad, setTaujihad] = useState({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [semesterList, setSemesterList] = useState([])
    const [selectedSemester, setSelectedSemester] = useState('')
    const [searchSantri, setSearchSantri] = useState('')

    useEffect(() => {
        fetchSantri()
        fetchSemester()
    }, [])

    useEffect(() => {
        if (santriList.length > 0) {
            if (activeTab === 'presensi') {
                fetchPresensi()
            } else if (activeTab === 'perilaku' && selectedSemester) {
                fetchPerilaku()
            } else if (activeTab === 'taujihad' && selectedSemester) {
                fetchTaujihad()
            }
        }
    }, [selectedDate, santriList, activeTab, selectedSemester])

    const fetchSantri = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nis, nama, kelas:kelas_id(nama)')
                .eq('status', 'Aktif')
                .order('nama')

            if (error) throw error

            setSantriList(data.map(s => ({
                ...s,
                kelas: s.kelas?.nama || '-'
            })))
        } catch (err) {
            console.error('Error:', err.message)
            setError(err.message)
        }
    }

    const fetchSemester = async () => {
        try {
            const { data } = await supabase
                .from('semester')
                .select('id, nama, tahun_ajaran, is_active')
                .order('is_active', { ascending: false })
            setSemesterList(data || [])
            // Set default to active semester
            const activeSem = data?.find(s => s.is_active)
            if (activeSem) setSelectedSemester(activeSem.id)
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchPresensi = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('presensi')
                .select('santri_id, status')
                .eq('tanggal', selectedDate)

            if (error) throw error

            const presensiMap = {}
            santriList.forEach(s => {
                presensiMap[s.id] = 'hadir'
            })
            data?.forEach(p => {
                presensiMap[p.santri_id] = p.status
            })
            setPresensi(presensiMap)
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchPerilaku = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('perilaku')
                .select('santri_id, ketekunan, kedisiplinan, kebersihan, kerapian')
                .eq('semester_id', selectedSemester)

            if (error) throw error

            const perilakuMap = {}
            santriList.forEach(s => {
                perilakuMap[s.id] = {
                    ketekunan: 'Baik',
                    kedisiplinan: 'Baik',
                    kebersihan: 'Baik',
                    kerapian: 'Baik'
                }
            })
            data?.forEach(p => {
                perilakuMap[p.santri_id] = {
                    ketekunan: p.ketekunan || 'Baik',
                    kedisiplinan: p.kedisiplinan || 'Baik',
                    kebersihan: p.kebersihan || 'Baik',
                    kerapian: p.kerapian || 'Baik'
                }
            })
            setPerilaku(perilakuMap)
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchTaujihad = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('taujihad')
                .select('santri_id, catatan')
                .eq('semester_id', selectedSemester)

            if (error) throw error

            const taujihadMap = {}
            santriList.forEach(s => {
                taujihadMap[s.id] = ''
            })
            data?.forEach(t => {
                taujihadMap[t.santri_id] = t.catatan || ''
            })
            setTaujihad(taujihadMap)
        } catch (err) {
            console.error('Error:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = (santriId, status) => {
        setPresensi(prev => ({
            ...prev,
            [santriId]: status
        }))
    }

    const handlePerilakuChange = (santriId, kategori, nilai) => {
        setPerilaku(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [kategori.toLowerCase()]: nilai
            }
        }))
    }

    const handleTaujihadChange = (santriId, catatan) => {
        setTaujihad(prev => ({
            ...prev,
            [santriId]: catatan
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')
        try {
            if (activeTab === 'presensi') {
                await supabase.from('presensi').delete().eq('tanggal', selectedDate)
                const presensiData = Object.entries(presensi).map(([santriId, status]) => ({
                    santri_id: santriId,
                    tanggal: selectedDate,
                    status
                }))
                const { error } = await supabase.from('presensi').insert(presensiData)
                if (error) throw error
                setSuccess('Presensi berhasil disimpan!')
            } else if (activeTab === 'perilaku') {
                // Save perilaku
                await supabase.from('perilaku').delete().eq('semester_id', selectedSemester)
                const perilakuData = Object.entries(perilaku).map(([santriId, values]) => ({
                    santri_id: santriId,
                    semester_id: selectedSemester,
                    ketekunan: values.ketekunan,
                    kedisiplinan: values.kedisiplinan,
                    kebersihan: values.kebersihan,
                    kerapian: values.kerapian
                }))
                const { error } = await supabase.from('perilaku').insert(perilakuData)
                if (error) throw error
                setSuccess('Perilaku santri berhasil disimpan!')
            } else if (activeTab === 'taujihad') {
                // Save taujihad - only save non-empty catatan
                const taujihadData = Object.entries(taujihad)
                    .filter(([_, catatan]) => catatan && catatan.trim() !== '')
                    .map(([santriId, catatan]) => ({
                        santri_id: santriId,
                        semester_id: selectedSemester,
                        catatan: catatan.trim()
                    }))

                // Delete existing and insert new
                await supabase.from('taujihad').delete().eq('semester_id', selectedSemester)
                if (taujihadData.length > 0) {
                    const { error } = await supabase.from('taujihad').insert(taujihadData)
                    if (error) throw error
                }
                setSuccess('Catatan taujihad berhasil disimpan!')
            }
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('Error:', err.message)
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'hadir': return <Check size={16} />
            case 'izin': return <Clock size={16} />
            case 'sakit': return <Clock size={16} />
            case 'alpha': return <X size={16} />
            default: return null
        }
    }

    const getNilaiColor = (nilai) => {
        switch (nilai) {
            case 'Sangat Baik': return 'success'
            case 'Baik': return 'info'
            case 'Cukup': return 'warning'
            case 'Kurang': return 'orange'
            case 'Buruk': return 'danger'
            default: return ''
        }
    }

    const summary = {
        hadir: Object.values(presensi).filter(s => s === 'hadir').length,
        izin: Object.values(presensi).filter(s => s === 'izin').length,
        sakit: Object.values(presensi).filter(s => s === 'sakit').length,
        alpha: Object.values(presensi).filter(s => s === 'alpha').length
    }

    return (
        <div className="presensi-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Pembinaan Santri</h1>
                    <p className="page-subtitle">Kelola presensi, perilaku, dan taujihad santri</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation pembinaan-tabs mb-4">
                <button
                    className={`tab-btn ${activeTab === 'presensi' ? 'active' : ''}`}
                    onClick={() => setActiveTab('presensi')}
                >
                    <Calendar size={18} />
                    <span>Presensi</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'perilaku' ? 'active' : ''}`}
                    onClick={() => setActiveTab('perilaku')}
                >
                    <Heart size={18} />
                    <span>Perilaku</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'taujihad' ? 'active' : ''}`}
                    onClick={() => setActiveTab('taujihad')}
                >
                    <BookOpen size={18} />
                    <span>Taujihad</span>
                </button>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            {/* PRESENSI TAB */}
            {activeTab === 'presensi' && (
                <>
                    {/* Date Selector */}
                    <div className="date-selector">
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                            const d = new Date(selectedDate)
                            d.setDate(d.getDate() - 1)
                            setSelectedDate(d.toISOString().split('T')[0])
                        }}>
                            <ChevronLeft size={18} />
                        </button>
                        <div className="date-input-wrapper">
                            <Calendar size={18} />
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-input" />
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                            const d = new Date(selectedDate)
                            d.setDate(d.getDate() + 1)
                            setSelectedDate(d.toISOString().split('T')[0])
                        }}>
                            <ChevronRight size={18} />
                        </button>
                    </div>



                    {/* Summary */}
                    <div className="presensi-summary">
                        <div className="summary-item hadir"><span className="summary-count">{summary.hadir}</span><span className="summary-label">Hadir</span></div>
                        <div className="summary-item izin"><span className="summary-count">{summary.izin}</span><span className="summary-label">Izin</span></div>
                        <div className="summary-item sakit"><span className="summary-count">{summary.sakit}</span><span className="summary-label">Sakit</span></div>
                        <div className="summary-item alpha"><span className="summary-count">{summary.alpha}</span><span className="summary-label">Alpha</span></div>
                    </div>

                    {/* Presensi Table */}
                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Daftar Santri ({santriList.length})</h3>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Presensi</>}
                            </button>
                        </div>

                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>NIS</th>
                                        <th>Nama</th>
                                        <th>Kelas</th>
                                        <th>Status Kehadiran</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                    ) : santriList.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center">Tidak ada data santri</td></tr>
                                    ) : (
                                        santriList.map((santri, index) => (
                                            <tr key={santri.id}>
                                                <td>{index + 1}</td>
                                                <td>{santri.nis}</td>
                                                <td className="name-cell">{santri.nama}</td>
                                                <td>{santri.kelas}</td>
                                                <td>
                                                    <div className="status-buttons">
                                                        {['hadir', 'izin', 'sakit', 'alpha'].map((status) => (
                                                            <button
                                                                key={status}
                                                                className={`status-btn ${status} ${presensi[santri.id] === status ? 'active' : ''}`}
                                                                onClick={() => handleStatusChange(santri.id, status)}
                                                            >
                                                                {getStatusIcon(status)}
                                                                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                                                            </button>
                                                        ))}
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

            {/* PERILAKU TAB */}
            {activeTab === 'perilaku' && (
                <>
                    {/* Filter Bar */}
                    <div className="filter-bar mb-4">
                        <div className="filter-group">
                            <label>Semester</label>
                            <select
                                value={selectedSemester}
                                onChange={(e) => setSelectedSemester(e.target.value)}
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
                                value={searchSantri}
                                onChange={(e) => setSearchSantri(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="filter-group filter-action">
                            <button className="btn btn-primary btn-save" onClick={handleSave} disabled={saving || !selectedSemester}>
                                {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                                <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Perilaku Table */}
                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Penilaian Perilaku ({santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase())).length} santri)</h3>
                        </div>

                        <div className="table-wrapper">
                            <table className="table perilaku-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Nama Santri</th>
                                        <th>Kelas</th>
                                        {PERILAKU_KATEGORI.map(k => (
                                            <th key={k}>{k}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={3 + PERILAKU_KATEGORI.length} className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                    ) : !selectedSemester ? (
                                        <tr><td colSpan={3 + PERILAKU_KATEGORI.length} className="text-center">Pilih semester terlebih dahulu</td></tr>
                                    ) : santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase())).length === 0 ? (
                                        <tr><td colSpan={3 + PERILAKU_KATEGORI.length} className="text-center">Tidak ada data santri</td></tr>
                                    ) : (
                                        santriList
                                            .filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase()))
                                            .map((santri, index) => (
                                                <tr key={santri.id}>
                                                    <td>{index + 1}</td>
                                                    <td className="name-cell">{santri.nama}</td>
                                                    <td>{santri.kelas}</td>
                                                    {PERILAKU_KATEGORI.map(kategori => (
                                                        <td key={kategori}>
                                                            <select
                                                                value={perilaku[santri.id]?.[kategori.toLowerCase()] || 'Baik'}
                                                                onChange={(e) => handlePerilakuChange(santri.id, kategori, e.target.value)}
                                                                className={`perilaku-select ${getNilaiColor(perilaku[santri.id]?.[kategori.toLowerCase()])}`}
                                                            >
                                                                {PERILAKU_NILAI.map(nilai => (
                                                                    <option key={nilai} value={nilai}>{nilai}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* TAUJIHAD TAB */}
            {activeTab === 'taujihad' && (
                <>
                    {/* Semester Selector */}
                    <div className="filter-bar mb-4">
                        <div className="filter-group">
                            <label>Semester</label>
                            <select
                                className="form-select"
                                value={selectedSemester}
                                onChange={(e) => setSelectedSemester(e.target.value)}
                            >
                                <option value="">Pilih Semester</option>
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
                                className="form-input"
                                placeholder="Ketik nama santri..."
                                value={searchSantri}
                                onChange={(e) => setSearchSantri(e.target.value)}
                            />
                        </div>
                        <div className="filter-group filter-action">
                            <button
                                className="btn btn-primary btn-save"
                                onClick={handleSave}
                                disabled={saving || !selectedSemester}
                            >
                                <Save size={18} />
                                {saving ? 'Menyimpan...' : 'Simpan Taujihad'}
                            </button>
                        </div>
                    </div>

                    {!selectedSemester ? (
                        <div className="card">
                            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                                <h4 style={{ marginBottom: '8px', color: 'var(--text-dark)' }}>Pilih Semester</h4>
                                <p style={{ color: 'var(--text-muted)' }}>
                                    Silakan pilih semester terlebih dahulu untuk melihat dan menginput catatan taujihad.
                                </p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="card">
                            <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
                                <RefreshCw size={32} className="spinning" style={{ color: 'var(--primary-green)' }} />
                                <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Memuat data...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📖 Catatan Taujihad ({santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase())).length} santri)</h3>
                            </div>
                            <div className="card-body">
                                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                                    Tulis catatan/pesan pembinaan untuk setiap santri. Catatan ini akan muncul di laporan raport.
                                </p>
                                <div className="taujihad-list">
                                    {santriList
                                        .filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase()))
                                        .map(santri => (
                                            <div key={santri.id} className="taujihad-item">
                                                <div className="taujihad-santri-info">
                                                    <span className="santri-name">{santri.nama}</span>
                                                    <span className="santri-class">{santri.kelas}</span>
                                                </div>
                                                <textarea
                                                    className="taujihad-input"
                                                    placeholder="Tulis catatan taujihad untuk santri ini..."
                                                    value={taujihad[santri.id] || ''}
                                                    onChange={(e) => handleTaujihadChange(santri.id, e.target.value)}
                                                    rows={2}
                                                />
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default PresensiPage

