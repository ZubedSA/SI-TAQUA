import { useState, useEffect } from 'react'
import { Save, RefreshCw, BookMarked, Calendar } from 'lucide-react'
import { supabase } from '../../../../../lib/supabase'
import ResponsiveTable from '../../../../../components/ui/ResponsiveTable'
import '../../../shared/styles/Nilai.css'

const TahfizhSemesterPage = () => {
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
        halaqoh_id: ''
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
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', filters.halaqoh_id)
                .eq('status', 'Aktif')
                .order('nama')

            if (santriError) throw santriError
            setSantri(santriData || [])

            if (santriData && santriData.length > 0) {
                const { data: nilaiData, error: nilaiError } = await supabase
                    .from('nilai')
                    .select('*')
                    .eq('semester_id', filters.semester_id)
                    .eq('jenis_ujian', 'semester')
                    .eq('kategori', 'Tahfizhiyah')
                    .in('santri_id', santriData.map(s => s.id))

                if (nilaiError) throw nilaiError

                const nilaiMap = {}
                nilaiData?.forEach(n => {
                    nilaiMap[n.santri_id] = {
                        id: n.id,
                        hafalan_baru: n.nilai_hafalan || '',
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
    }, [filters.halaqoh_id, filters.semester_id])

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
        const hb = parseFloat(data.hafalan_baru) || 0
        const t = parseFloat(data.tajwid) || 0
        const k = parseFloat(data.kelancaran) || 0
        if (hb === 0 && t === 0 && k === 0) return '-'
        return ((hb + t + k) / 3).toFixed(1)
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            for (const [santriId, data] of Object.entries(nilai)) {
                if (!data.hafalan_baru && !data.tajwid && !data.kelancaran) continue

                const hb = parseFloat(data.hafalan_baru) || 0
                const t = parseFloat(data.tajwid) || 0
                const k = parseFloat(data.kelancaran) || 0

                const payload = {
                    santri_id: santriId,
                    semester_id: filters.semester_id,
                    jenis_ujian: 'semester',
                    kategori: 'Tahfizhiyah',
                    nilai_hafalan: hb,
                    nilai_tajwid: t,
                    nilai_kelancaran: k,
                    nilai_akhir: (hb + t + k) / 3
                }

                if (data.id) {
                    const { error } = await supabase.from('nilai').update(payload).eq('id', data.id)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('nilai').insert([payload])
                    if (error) throw error
                }
            }

            setSuccess('✅ Nilai berhasil disimpan!')
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
                        Input Nilai Ujian Semester
                    </h1>
                    <p className="page-subtitle">Tahfizhiyah - Ujian Semester</p>
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

                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                            { header: 'NIS', accessor: 'nis', hideOnMobile: true },
                            { header: 'Nama Santri', accessor: 'nama', className: 'font-medium text-gray-900' },
                            {
                                header: 'Hafalan',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        value={nilai[row.id]?.hafalan_baru ?? ''}
                                        onChange={e => handleNilaiChange(row.id, 'hafalan_baru', e.target.value)}
                                    />
                                )
                            },
                            {
                                header: 'Tajwid',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        value={nilai[row.id]?.tajwid ?? ''}
                                        onChange={e => handleNilaiChange(row.id, 'tajwid', e.target.value)}
                                    />
                                )
                            },
                            {
                                header: 'Kelancaran',
                                className: 'text-center',
                                render: (row) => (
                                    <input
                                        type="number"
                                        className="nilai-input"
                                        min="0"
                                        max="100"
                                        placeholder="0-100"
                                        value={nilai[row.id]?.kelancaran ?? ''}
                                        onChange={e => handleNilaiChange(row.id, 'kelancaran', e.target.value)}
                                    />
                                )
                            },
                            { header: 'Rata-rata', render: (row) => calculateRataRata(row.id), className: 'text-center font-semibold' }
                        ]}
                        data={santri}
                        loading={loading}
                        emptyState={<div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Tidak ada santri di halaqoh ini</div>}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={(row) => (
                            <div className="flex flex-col gap-3 w-full mt-2 pt-2 border-t border-gray-100">
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Hafalan</label>
                                        <input
                                            type="number"
                                            className="form-control text-sm px-2 py-1"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={nilai[row.id]?.hafalan_baru ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'hafalan_baru', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Tajwid</label>
                                        <input
                                            type="number"
                                            className="form-control text-sm px-2 py-1"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={nilai[row.id]?.tajwid ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'tajwid', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Kelancaran</label>
                                        <input
                                            type="number"
                                            className="form-control text-sm px-2 py-1"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={nilai[row.id]?.kelancaran ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'kelancaran', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between border-t border-gray-50 pt-2 mt-1">
                                    <span className="text-gray-500 font-medium text-sm">Rata-rata:</span>
                                    <span className="font-bold text-gray-900">{calculateRataRata(row.id)}</span>
                                </div>
                            </div>
                        )}
                    />
                </div>
            )}
        </div>
    )
}

export default TahfizhSemesterPage
