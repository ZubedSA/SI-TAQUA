import { useState, useEffect } from 'react'
import { Save, RefreshCw, BookOpen } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import '../../../../../pages/nilai/Nilai.css'

const MadrosUASPage = () => {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [semester, setSemester] = useState([])
    const [kelas, setKelas] = useState([])
    const [mapel, setMapel] = useState([])
    const [santri, setSantri] = useState([])
    const [nilai, setNilai] = useState({})
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [filters, setFilters] = useState({
        semester_id: '',
        kelas_id: '',
        mapel_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, kelRes, mapRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('kelas').select('id, nama').order('nama'),
            supabase.from('mapel').select('id, nama, kategori').eq('kategori', 'Madrosiyah').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (kelRes.data) setKelas(kelRes.data)
        if (mapRes.data) setMapel(mapRes.data)
    }

    const fetchSantriAndNilai = async () => {
        if (!filters.kelas_id || !filters.mapel_id || !filters.semester_id) return
        setLoading(true)
        setError('')

        try {
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('kelas_id', filters.kelas_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError
            setSantri(santriData || [])

            if (santriData && santriData.length > 0) {
                const { data: nilaiData, error: nilaiError } = await supabase
                    .from('nilai')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .eq('mapel_id', filters.mapel_id)
                    .eq('jenis_ujian', 'uas')
                    .in('santri_id', santriData.map(s => s.id))

                if (nilaiError) throw nilaiError

                const nilaiMap = {}
                nilaiData?.forEach(n => {
                    nilaiMap[n.santri_id] = {
                        id: n.id,
                        nilai: n.nilai_akhir || '',
                        catatan: n.catatan || ''
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
        if (filters.kelas_id && filters.mapel_id && filters.semester_id) {
            fetchSantriAndNilai()
        }
    }, [filters.kelas_id, filters.mapel_id, filters.semester_id])

    const handleNilaiChange = (santriId, field, value) => {
        setNilai(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [field]: field === 'nilai' ? (value === '' ? '' : parseFloat(value) || 0) : value
            }
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            for (const [santriId, data] of Object.entries(nilai)) {
                if (!data.nilai && data.nilai !== 0) continue

                const payload = {
                    santri_id: santriId,
                    semester_id: filters.semester_id,
                    mapel_id: filters.mapel_id,
                    jenis_ujian: 'uas',
                    kategori: 'Madrosiyah',
                    nilai_akhir: parseFloat(data.nilai) || 0,
                    catatan: data.catatan || ''
                }

                if (data.id) {
                    const { error } = await supabase.from('nilai').update(payload).eq('id', data.id)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('nilai').insert([payload])
                    if (error) throw error
                }
            }

            setSuccess('✅ Nilai UAS berhasil disimpan!')
            setTimeout(() => setSuccess(''), 3000)
            fetchSantriAndNilai()
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Input Nilai UAS
                    </h1>
                    <p className="page-subtitle">Madrosiyah - Ujian Akhir Semester</p>
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
                    <label className="form-label">Kelas *</label>
                    <select
                        className="form-control"
                        value={filters.kelas_id}
                        onChange={e => setFilters({ ...filters, kelas_id: e.target.value })}
                    >
                        <option value="">Pilih Kelas</option>
                        {kelas.map(k => (
                            <option key={k.id} value={k.id}>{k.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Mata Pelajaran *</label>
                    <select
                        className="form-control"
                        value={filters.mapel_id}
                        onChange={e => setFilters({ ...filters, mapel_id: e.target.value })}
                    >
                        <option value="">Pilih Mapel</option>
                        {mapel.map(m => (
                            <option key={m.id} value={m.id}>{m.nama}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filters.kelas_id && filters.mapel_id && filters.semester_id && (
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

                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th style={{ textAlign: 'center' }}>Nilai UAS</th>
                                    <th>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                                ) : santri.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center">Tidak ada santri di kelas ini</td></tr>
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
                                                    value={nilai[s.id]?.nilai ?? ''}
                                                    onChange={e => handleNilaiChange(s.id, 'nilai', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Keterangan..."
                                                    value={nilai[s.id]?.catatan ?? ''}
                                                    onChange={e => handleNilaiChange(s.id, 'catatan', e.target.value)}
                                                    style={{ minWidth: '150px' }}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MadrosUASPage
