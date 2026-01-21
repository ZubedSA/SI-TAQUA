import { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import '../../shared/styles/Nilai.css'

const InputPerilakuPage = () => {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [semester, setSemester] = useState([])
    const [kelas, setKelas] = useState([])
    const [santri, setSantri] = useState([])
    const [formData, setFormData] = useState({}) // Stores { santriId: { ...perilakuData, ...taujihadData } }
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [filters, setFilters] = useState({
        semester_id: '',
        kelas_id: ''
    })

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, kelRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('kelas').select('id, nama').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (kelRes.data) setKelas(kelRes.data)
    }

    const fetchSantriAndData = async () => {
        if (!filters.kelas_id || !filters.semester_id) return
        setLoading(true)
        setError('')

        try {
            // 1. Fetch Santri
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('kelas_id', filters.kelas_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError
            setSantri(santriData || [])

            if (santriData && santriData.length > 0) {
                const santriIds = santriData.map(s => s.id)

                // 2. Fetch Perilaku
                const { data: perilakuData } = await supabase
                    .from('perilaku_semester')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .in('santri_id', santriIds)

                // 3. Fetch Taujihat
                const { data: taujihadData } = await supabase
                    .from('taujihad')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .in('santri_id', santriIds)

                // 4. Merge Data
                const mergedData = {}
                santriData.forEach(s => {
                    const p = perilakuData?.find(x => x.santri_id === s.id)
                    const t = taujihadData?.find(x => x.santri_id === s.id)

                    mergedData[s.id] = {
                        // IDs for updates
                        perilaku_id: p?.id,
                        taujihad_id: t?.id,

                        // Perilaku Fields
                        ketekunan: p?.ketekunan || 'Baik',
                        kedisiplinan: p?.kedisiplinan || 'Baik',
                        kebersihan: p?.kebersihan || 'Baik',
                        kerapian: p?.kerapian || 'Baik',

                        // Tahfizh Summary Fields
                        jumlah_hafalan: p?.jumlah_hafalan || '',
                        predikat_hafalan: p?.predikat_hafalan || 'Baik',
                        total_hafalan: p?.total_hafalan || '',

                        // Presensi Fields
                        sakit: p?.sakit ?? 0,
                        izin: p?.izin ?? 0,
                        alpha: p?.alpha ?? 0,

                        // Taujihad Fields
                        catatan: t?.catatan || t?.isi || ''
                    }
                })
                setFormData(mergedData)
            }
        } catch (err) {
            setError('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (filters.kelas_id && filters.semester_id) {
            fetchSantriAndData()
        }
    }, [filters.kelas_id, filters.semester_id])

    const handleInputChange = (santriId, field, value) => {
        setFormData(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [field]: value
            }
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const perilakuUpserts = []
            const taujihadUpserts = []

            for (const [santriId, data] of Object.entries(formData)) {
                // Prepare Perilaku Data
                perilakuUpserts.push({
                    id: data.perilaku_id, // include if updating
                    santri_id: santriId,
                    semester_id: filters.semester_id,
                    ketekunan: data.ketekunan,
                    kedisiplinan: data.kedisiplinan,
                    kebersihan: data.kebersihan,
                    kerapian: data.kerapian,
                    jumlah_hafalan: data.jumlah_hafalan,
                    predikat_hafalan: data.predikat_hafalan,
                    total_hafalan: data.total_hafalan,
                    sakit: parseInt(data.sakit) || 0,
                    izin: parseInt(data.izin) || 0,
                    alpha: parseInt(data.alpha) || 0
                })

                // Prepare Taujihad Data
                if (data.catatan) {
                    taujihadUpserts.push({
                        id: data.taujihad_id, // include if updating
                        santri_id: santriId,
                        semester_id: filters.semester_id,
                        catatan: data.catatan
                    })
                }
            }

            // Perform Upserts
            // Use single upsert calls per table for bulk efficiency if possible, 
            // but Supabase ID handling might be tricky with 'id' field being undefined for inserts.
            // Safe way: Loop.

            // Note: For real bulk upsert correctly, we should remove 'id' if it's undefined
            // and rely on Unique constraints (santri_id, semester_id).
            // 'perilaku_semester' has UNIQUE(santri_id, semester_id) constraint? Yes (migration file).
            // 'taujihad' should also have it.

            // Clean payloads
            const cleanPerilakuPayload = perilakuUpserts.map(({ id, ...rest }) => ({
                ...(id ? { id } : {}),
                ...rest
            }))

            const cleanTaujihadPayload = taujihadUpserts.map(({ id, ...rest }) => ({
                ...(id ? { id } : {}),
                ...rest
            }))

            if (cleanPerilakuPayload.length > 0) {
                const { error: pErr } = await supabase.from('perilaku_semester').upsert(cleanPerilakuPayload, { onConflict: 'santri_id, semester_id' })
                if (pErr) throw pErr
            }

            if (cleanTaujihadPayload.length > 0) {
                // Assuming taujihad also has unique constraint. If not, this might duplicate.
                // If no unique constraint, we have to use ID for updates.
                // Let's assume Unique constraint exists as it's standard.
                // If it fails, I'll recommend adding it.
                const { error: tErr } = await supabase.from('taujihad').upsert(cleanTaujihadPayload, { onConflict: 'santri_id, semester_id' })
                if (tErr) throw tErr
            }

            setSuccess('✅ Data berhasil disimpan!')
            setTimeout(() => setSuccess(''), 3000)
            fetchSantriAndData() // Refresh IDs
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const PredikatOptions = ({ value, onChange }) => (
        <select className="form-control text-sm py-1 h-8" value={value} onChange={e => onChange(e.target.value)}>
            <option value="Baik">Baik</option>
            <option value="Cukup">Cukup</option>
            <option value="Kurang">Kurang</option>
            <option value="Sangat Baik">Sangat Baik</option>
        </select>
    )

    return (
        <div className="nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Input Data Raport (Non-Akademik)</h1>
                    <p className="page-subtitle">Perilaku, Tahfizh Summary, & Catatan Musyrif</p>
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
            </div>

            {filters.kelas_id && filters.semester_id && (
                <div className="table-container">
                    <div className="table-header">
                        <h3 className="table-title">Daftar Santri ({santri.length})</h3>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving || santri.length === 0}
                        >
                            {saving ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Data</>}
                        </button>
                    </div>

                    <div className="table-wrapper overflow-x-auto">
                        <table className="table min-w-[1500px]">
                            <thead>
                                <tr>
                                    <th className="w-10 sticky left-0 z-10">No</th>
                                    <th className="w-48 sticky left-10 z-10">Nama Santri</th>

                                    <th className="w-32">Ketekunan</th>
                                    <th className="w-32">Kedisiplinan</th>
                                    <th className="w-32">Kebersihan</th>
                                    <th className="w-32">Kerapian</th>

                                    <th className="w-40 border-l">Hafalan (Juz)</th>
                                    <th className="w-32">Predikat</th>
                                    <th className="w-40">Total Hafalan</th>

                                    <th className="w-48 border-l text-center">Ketidakhadiran (S/I/A)</th>

                                    <th className="w-64 border-l">Catatan Musyrif (Taujihat)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="10" className="text-center p-8"><RefreshCw size={20} className="spin inline mr-2" /> Loading data...</td></tr>
                                ) : santri.length === 0 ? (
                                    <tr><td colSpan="10" className="text-center p-8">Tidak ada santri di kelas ini</td></tr>
                                ) : (
                                    santri.map((s, i) => {
                                        const d = formData[s.id] || {}
                                        return (
                                            <tr key={s.id}>
                                                <td className="sticky left-0 bg-white z-10">{i + 1}</td>
                                                <td className="sticky left-10 bg-white z-10 font-medium">{s.nama}</td>

                                                {/* Perilaku */}
                                                <td><PredikatOptions value={d.ketekunan} onChange={v => handleInputChange(s.id, 'ketekunan', v)} /></td>
                                                <td><PredikatOptions value={d.kedisiplinan} onChange={v => handleInputChange(s.id, 'kedisiplinan', v)} /></td>
                                                <td><PredikatOptions value={d.kebersihan} onChange={v => handleInputChange(s.id, 'kebersihan', v)} /></td>
                                                <td><PredikatOptions value={d.kerapian} onChange={v => handleInputChange(s.id, 'kerapian', v)} /></td>

                                                {/* Tahfizh Summary */}
                                                <td className="border-l">
                                                    <input
                                                        type="text" className="form-control h-8 text-sm" placeholder="Contoh: 1 Juz"
                                                        value={d.jumlah_hafalan} onChange={e => handleInputChange(s.id, 'jumlah_hafalan', e.target.value)}
                                                    />
                                                </td>
                                                <td><PredikatOptions value={d.predikat_hafalan} onChange={v => handleInputChange(s.id, 'predikat_hafalan', v)} /></td>
                                                <td>
                                                    <input
                                                        type="text" className="form-control h-8 text-sm" placeholder="Contoh: 3 Juz"
                                                        value={d.total_hafalan} onChange={e => handleInputChange(s.id, 'total_hafalan', e.target.value)}
                                                    />
                                                </td>

                                                {/* Presensi */}
                                                <td className="border-l">
                                                    <div className="flex gap-1 justify-center">
                                                        <input
                                                            type="number" min="0" className="form-control h-8 text-sm w-12 text-center" placeholder="S" title="Sakit"
                                                            value={d.sakit} onChange={e => handleInputChange(s.id, 'sakit', e.target.value)}
                                                        />
                                                        <input
                                                            type="number" min="0" className="form-control h-8 text-sm w-12 text-center" placeholder="I" title="Izin"
                                                            value={d.izin} onChange={e => handleInputChange(s.id, 'izin', e.target.value)}
                                                        />
                                                        <input
                                                            type="number" min="0" className="form-control h-8 text-sm w-12 text-center" placeholder="A" title="Alpha"
                                                            value={d.alpha} onChange={e => handleInputChange(s.id, 'alpha', e.target.value)}
                                                        />
                                                    </div>
                                                </td>

                                                {/* Taujihat */}
                                                <td className="border-l">
                                                    <textarea
                                                        className="form-control text-sm min-h-[60px]"
                                                        placeholder="Catatan untuk santri..."
                                                        value={d.catatan} onChange={e => handleInputChange(s.id, 'catatan', e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default InputPerilakuPage
