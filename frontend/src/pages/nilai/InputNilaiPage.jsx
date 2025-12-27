import { useState, useEffect } from 'react'
import { Save, RefreshCw, BookMarked, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Nilai.css'

const InputNilaiPage = () => {
    const [selectedMapel, setSelectedMapel] = useState('')
    const [selectedKelas, setSelectedKelas] = useState('')
    const [semester, setSemester] = useState('')
    const [nilai, setNilai] = useState({})
    const [santriList, setSantriList] = useState([])
    const [mapelList, setMapelList] = useState([])
    const [kelasList, setKelasList] = useState([])
    const [semesterList, setSemesterList] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [activeKategori, setActiveKategori] = useState('Semua')

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (selectedKelas && selectedMapel && semester) {
            fetchSantriAndNilai()
        }
    }, [selectedKelas, selectedMapel, semester])

    const fetchOptions = async () => {
        try {
            const [mapelRes, kelasRes, semesterRes] = await Promise.all([
                supabase.from('mapel').select('id, kode, nama, kategori').order('nama'),
                supabase.from('kelas').select('id, nama').order('nama'),
                supabase.from('semester').select('id, nama, tahun_ajaran, is_active').order('is_active', { ascending: false })
            ])
            setMapelList(mapelRes.data || [])
            setKelasList(kelasRes.data || [])
            setSemesterList(semesterRes.data || [])

            const activeSem = semesterRes.data?.find(s => s.is_active)
            if (activeSem) setSemester(activeSem.id)
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const filteredMapel = mapelList.filter(m =>
        activeKategori === 'Semua' || m.kategori === activeKategori
    )

    const fetchSantriAndNilai = async () => {
        setLoading(true)
        try {
            const { data: santriData, error: santriErr } = await supabase
                .from('santri')
                .select('id, nis, nama')
                .eq('kelas_id', selectedKelas)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriErr) throw santriErr
            setSantriList(santriData || [])

            const { data: nilaiData, error: nilaiErr } = await supabase
                .from('nilai')
                .select('*')
                .eq('mapel_id', selectedMapel)
                .eq('semester_id', semester)
                .in('santri_id', santriData.map(s => s.id))

            if (nilaiErr) throw nilaiErr

            const nilaiMap = {}
            nilaiData?.forEach(n => {
                nilaiMap[n.santri_id] = {
                    id: n.id,
                    nilai: n.nilai_akhir || ''
                }
            })
            setNilai(nilaiMap)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleNilaiChange = (santriId, value) => {
        setNilai(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                nilai: value === '' ? '' : parseFloat(value) || 0
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
                    mapel_id: selectedMapel,
                    semester_id: semester,
                    nilai_akhir: parseFloat(data.nilai) || 0
                }

                if (data.id) {
                    const { error } = await supabase.from('nilai').update(payload).eq('id', data.id)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('nilai').insert([payload])
                    if (error) throw error
                }
            }

            setSuccess('Nilai berhasil disimpan!')
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
                    <h1 className="page-title">Input Nilai Santri</h1>
                    <p className="page-subtitle">Masukkan nilai santri per mata pelajaran</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            {/* Kategori Filter */}
            <div className="kategori-filter mb-3">
                <button
                    className={`btn ${activeKategori === 'Semua' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setActiveKategori('Semua'); setSelectedMapel('') }}
                >
                    Semua Mapel
                </button>
                <button
                    className={`btn ${activeKategori === 'Tahfizhiyah' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setActiveKategori('Tahfizhiyah'); setSelectedMapel('') }}
                >
                    <BookMarked size={16} /> Tahfizhiyah
                </button>
                <button
                    className={`btn ${activeKategori === 'Madrosiyah' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setActiveKategori('Madrosiyah'); setSelectedMapel('') }}
                >
                    <GraduationCap size={16} /> Madrosiyah
                </button>
            </div>

            <div className="filter-section">
                <div className="form-group">
                    <label className="form-label">Kelas *</label>
                    <select className="form-control" value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}>
                        <option value="">Pilih Kelas</option>
                        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Mata Pelajaran *</label>
                    <select className="form-control" value={selectedMapel} onChange={e => setSelectedMapel(e.target.value)}>
                        <option value="">Pilih Mapel</option>
                        {filteredMapel.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.nama} {m.kategori ? `(${m.kategori})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Semester *</label>
                    <select className="form-control" value={semester} onChange={e => setSemester(e.target.value)}>
                        <option value="">Pilih Semester</option>
                        {semesterList.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.nama} {s.tahun_ajaran} {s.is_active ? '(Aktif)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedKelas && selectedMapel && semester && (
                <div className="table-container">
                    <div className="table-header">
                        <h3 className="table-title">Daftar Santri ({santriList.length})</h3>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving || santriList.length === 0}>
                            {saving ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Nilai</>}
                        </button>
                    </div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>NIS</th>
                                <th>Nama Santri</th>
                                <th style={{ textAlign: 'center' }}>Nilai</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="text-center"><RefreshCw size={20} className="spin" /> Loading...</td></tr>
                            ) : santriList.length === 0 ? (
                                <tr><td colSpan="4" className="text-center">Tidak ada santri di kelas ini</td></tr>
                            ) : (
                                santriList.map((santri, idx) => (
                                    <tr key={santri.id}>
                                        <td>{idx + 1}</td>
                                        <td>{santri.nis}</td>
                                        <td className="name-cell">{santri.nama}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                className="nilai-input"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                value={nilai[santri.id]?.nilai ?? ''}
                                                onChange={e => handleNilaiChange(santri.id, e.target.value)}
                                            />
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

export default InputNilaiPage

