import { useState, useEffect } from 'react'
import { Save, RefreshCw, BookMarked, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Nilai.css'

const TahfizhSyahriPage = () => {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [semester, setSemester] = useState([])
    const [halaqoh, setHalaqoh] = useState([])
    const [santri, setSantri] = useState([])
    const [nilai, setNilai] = useState({})
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [filters, setFilters] = useState({
        semester_id: '',
        halaqoh_id: '',
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, halRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('halaqoh').select('id, nama').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (halRes.data) setHalaqoh(halRes.data)
    }

    const fetchSantriAndNilai = async () => {
        if (!filters.halaqoh_id || !filters.semester_id) return
        setLoading(true)
        setError('')

        try {
            // Fetch santri berdasarkan halaqoh
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', filters.halaqoh_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError
            setSantri(santriData || [])

            // Fetch existing nilai untuk periode ini
            if (santriData && santriData.length > 0) {
                const { data: nilaiData, error: nilaiError } = await supabase
                    .from('nilai')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .eq('jenis_ujian', 'syahri')
                    .eq('bulan', filters.bulan)
                    .eq('tahun', filters.tahun)
                    .in('santri_id', santriData.map(s => s.id))

                if (nilaiError) throw nilaiError

                // Map nilai ke state
                const nilaiMap = {}
                nilaiData?.forEach(n => {
                    nilaiMap[n.santri_id] = {
                        id: n.id,
                        hafalan: n.nilai_hafalan || '',
                        tajwid: n.nilai_tajwid || '',
                        kelancaran: n.nilai_kelancaran || ''
                    }
                })
                setNilai(nilaiMap)
            }
        } catch (err) {
            setError('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.halaqoh_id && filters.semester_id) {
            fetchSantriAndNilai()
        }
    }, [filters.halaqoh_id, filters.semester_id, filters.bulan, filters.tahun])

    const handleNilaiChange = (santriId, field, value) => {
        setNilai(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [field]: value === '' ? '' : parseFloat(value) || 0
            }
        }))
    }

    const calculateRataRata = (santriId) => {
        const data = nilai[santriId]
        if (!data) return '-'
        const h = parseFloat(data.hafalan) || 0
        const t = parseFloat(data.tajwid) || 0
        const k = parseFloat(data.kelancaran) || 0
        if (h === 0 && t === 0 && k === 0) return '-'
        return ((h + t + k) / 3).toFixed(1)
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            for (const [santriId, data] of Object.entries(nilai)) {
                // Skip jika tidak ada nilai yang diisi
                if (!data.hafalan && !data.tajwid && !data.kelancaran) continue

                const payload = {
                    santri_id: santriId,
                    semester_id: filters.semester_id,
                    jenis_ujian: 'syahri',
                    kategori: 'Tahfizhiyah',
                    bulan: filters.bulan,
                    tahun: filters.tahun,
                    nilai_hafalan: parseFloat(data.hafalan) || 0,
                    nilai_tajwid: parseFloat(data.tajwid) || 0,
                    nilai_kelancaran: parseFloat(data.kelancaran) || 0,
                    nilai_akhir: ((parseFloat(data.hafalan) || 0) + (parseFloat(data.tajwid) || 0) + (parseFloat(data.kelancaran) || 0)) / 3
                }

                if (data.id) {
                    // Update existing
                    const { error } = await supabase.from('nilai').update(payload).eq('id', data.id)
                    if (error) throw error
                } else {
                    // Insert new
                    const { error } = await supabase.from('nilai').insert([payload])
                    if (error) throw error
                }
            }

            setSuccess('✅ Nilai berhasil disimpan!')
            setTimeout(() => setSuccess(''), 3000)
            fetchSantriAndNilai() // Refresh data
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const bulanOptions = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
        { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
    ]

    return (
        <div className="nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <BookMarked className="title-icon green" /> Input Nilai Ujian Syahri
                    </h1>
                    <p className="page-subtitle">Tahfizhiyah - Ujian Bulanan</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            <div className="filter-section">
                <div className="form-group">
                    <label className="form-label">Semester *</label>
                    <select
                        className="form-control"
                        value={filters.semester_id}
                        onChange={e => setFilters({ ...filters, semester_id: e.target.value })}
                    >
                        <option value="">Pilih Semester</option>
                        {semester.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nama} - {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Halaqoh *</label>
                    <select
                        className="form-control"
                        value={filters.halaqoh_id}
                        onChange={e => setFilters({ ...filters, halaqoh_id: e.target.value })}
                    >
                        <option value="">Pilih Halaqoh</option>
                        {halaqoh.map(h => (
                            <option key={h.id} value={h.id}>{h.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Bulan *</label>
                    <select
                        className="form-control"
                        value={filters.bulan}
                        onChange={e => setFilters({ ...filters, bulan: parseInt(e.target.value) })}
                    >
                        {bulanOptions.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Tahun *</label>
                    <input
                        type="number"
                        className="form-control"
                        value={filters.tahun}
                        onChange={e => setFilters({ ...filters, tahun: parseInt(e.target.value) })}
                        min="2020"
                        max="2030"
                    />
                </div>
            </div>

            {filters.halaqoh_id && filters.semester_id && (
                <div className="table-container">
                    <div className="table-header">
                        <h3 className="table-title">Daftar Santri ({santri.length})</h3>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving || santri.length === 0}
                        >
                            {saving ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Nilai</>}
                        </button>
                    </div>

                    <table className="table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>NIS</th>
                                <th>Nama Santri</th>
                                <th style={{ textAlign: 'center' }}>Hafalan</th>
                                <th style={{ textAlign: 'center' }}>Tajwid</th>
                                <th style={{ textAlign: 'center' }}>Kelancaran</th>
                                <th style={{ textAlign: 'center' }}>Rata-rata</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                            ) : santri.length === 0 ? (
                                <tr><td colSpan="7" className="text-center">Tidak ada santri di halaqoh ini</td></tr>
                            ) : (
                                santri.map((s, i) => (
                                    <tr key={s.id}>
                                        <td>{i + 1}</td>
                                        <td>{s.nis}</td>
                                        <td className="name-cell">{s.nama}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                className="nilai-input"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                value={nilai[s.id]?.hafalan ?? ''}
                                                onChange={e => handleNilaiChange(s.id, 'hafalan', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                className="nilai-input"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                value={nilai[s.id]?.tajwid ?? ''}
                                                onChange={e => handleNilaiChange(s.id, 'tajwid', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                className="nilai-input"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                value={nilai[s.id]?.kelancaran ?? ''}
                                                onChange={e => handleNilaiChange(s.id, 'kelancaran', e.target.value)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                            {calculateRataRata(s.id)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default TahfizhSyahriPage
