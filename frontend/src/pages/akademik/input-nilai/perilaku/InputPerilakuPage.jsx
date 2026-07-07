import { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'
import ResponsiveTable from '../../../../components/ui/ResponsiveTable'
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
        kelas_id: '',
        halaqoh_id: ''
    })

    // AUTO-FILTER: Halaqoh berdasarkan akun
    const {
        halaqohList, // List of {id, nama} available for this user
        isAdmin,
        selectedHalaqohId,
        setSelectedHalaqohId
    } = useUserHalaqoh()

    useEffect(() => {
        fetchOptions()
    }, [])

    // Sync filters.halaqoh_id with hook's selectedHalaqohId
    useEffect(() => {
        setFilters(prev => ({ ...prev, halaqoh_id: selectedHalaqohId || '' }))
    }, [selectedHalaqohId])

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
        // Validation: Must have Semester AND (Kelas OR Halaqoh)
        if (!filters.semester_id || (!filters.kelas_id && !filters.halaqoh_id)) return

        setLoading(true)
        setError('')

        try {
            // 1. Fetch Santri
            let query = supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('status', 'Aktif')
                .order('nama')

            if (filters.kelas_id) {
                query = query.eq('kelas_id', filters.kelas_id)
            }
            if (filters.halaqoh_id) {
                query = query.eq('halaqoh_id', filters.halaqoh_id)
            }

            const { data: santriData, error: santriError } = await query

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
                        ketekunan: p?.ketekunan || 'Sangat Baik',
                        kedisiplinan: p?.kedisiplinan || 'Sangat Baik',
                        kebersihan: p?.kebersihan || 'Sangat Baik',
                        kerapian: p?.kerapian || 'Sangat Baik',

                        // Tahfizh Summary Fields
                        jumlah_hafalan: p?.jumlah_hafalan || '',
                        predikat_hafalan: p?.predikat_hafalan || 'Baik',
                        total_hafalan: p?.total_hafalan || '',

                        // Presensi Fields
                        sakit: p?.sakit ?? 0,
                        izin: p?.izin ?? 0,
                        alpha: p?.alpha ?? 0,
                        pulang: p?.pulang ?? 0,

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
        // Trigger fetch only if valid filters exist
        if (filters.semester_id && (filters.kelas_id || filters.halaqoh_id)) {
            fetchSantriAndData()
        }
    }, [filters.kelas_id, filters.semester_id, filters.halaqoh_id])

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
                // Prepare Perilaku Data - generate UUID if no existing id
                perilakuUpserts.push({
                    id: data.perilaku_id || crypto.randomUUID(),
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
                    alpha: parseInt(data.alpha) || 0,
                    pulang: parseInt(data.pulang) || 0
                })

                // Prepare Taujihad Data
                if (data.catatan) {
                    taujihadUpserts.push({
                        id: data.taujihad_id || crypto.randomUUID(),
                        santri_id: santriId,
                        semester_id: filters.semester_id,
                        catatan: data.catatan
                    })
                }
            }

            // Upsert with onConflict to handle existing records
            if (perilakuUpserts.length > 0) {
                const { error: pErr } = await supabase
                    .from('perilaku_semester')
                    .upsert(perilakuUpserts, {
                        onConflict: 'santri_id, semester_id',
                        ignoreDuplicates: false
                    })
                if (pErr) throw pErr
            }

            if (taujihadUpserts.length > 0) {
                const { error: tErr } = await supabase
                    .from('taujihad')
                    .upsert(taujihadUpserts, {
                        onConflict: 'santri_id, semester_id',
                        ignoreDuplicates: false
                    })
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

    const BehaviorOptions = ({ value, onChange }) => (
        <select className="form-control text-sm py-1 h-8" value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Pilih...</option>
            <option value="Sangat Baik">Sangat Baik</option>
            <option value="Baik">Baik</option>
            <option value="Cukup">Cukup</option>
            <option value="Kurang">Kurang</option>
            {/* Fallback for old data */}
            {!['Sangat Baik', 'Baik', 'Cukup', 'Kurang', ''].includes(value) && value && (
                <option value={value}>{value} (Lama)</option>
            )}
        </select>
    )

    const PredikatOptions = ({ value, onChange }) => (
        <select className="form-control text-sm py-1 h-8" value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Pilih...</option>
            <option value="Mumtaz">Mumtaz</option>
            <option value="Jayyid Jiddan">Jayyid Jiddan</option>
            <option value="Jayyid">Jayyid</option>
            <option value="Maqbul">Maqbul</option>
            {/* Fallback for old data */}
            {!['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', ''].includes(value) && value && (
                <option value={value}>{value} (Lama)</option>
            )}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
                        <label className="form-label">Kelas</label>
                        <select
                            className="form-control"
                            value={filters.kelas_id}
                            onChange={e => setFilters({ ...filters, kelas_id: e.target.value })}
                        >
                            <option value="">Semua Kelas</option>
                            {kelas.map(k => (
                                <option key={k.id} value={k.id}>{k.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Halaqoh</label>
                        <select
                            className="form-control"
                            value={selectedHalaqohId}
                            onChange={e => setSelectedHalaqohId(e.target.value)}
                            disabled={!isAdmin && halaqohList.length <= 1} // Disable if Musyrif only has 1 halaqoh
                        >
                            <option value="">Semua Halaqoh</option>
                            {halaqohList.map(h => (
                                <option key={h.id} value={h.id}>{h.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {(filters.kelas_id || filters.halaqoh_id) && filters.semester_id && (
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
                    <ResponsiveTable
                        columns={[
                            { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-10 sticky left-0 z-10 bg-white' },
                            { header: 'Nama Santri', accessor: 'nama', className: 'w-48 sticky left-10 z-10 bg-white font-medium', hideOnMobile: true },
                            
                            { header: 'Ketekunan', className: 'w-32', render: (row) => <BehaviorOptions value={formData[row.id]?.ketekunan} onChange={v => handleInputChange(row.id, 'ketekunan', v)} /> },
                            { header: 'Kedisiplinan', className: 'w-32', render: (row) => <BehaviorOptions value={formData[row.id]?.kedisiplinan} onChange={v => handleInputChange(row.id, 'kedisiplinan', v)} /> },
                            { header: 'Kebersihan', className: 'w-32', render: (row) => <BehaviorOptions value={formData[row.id]?.kebersihan} onChange={v => handleInputChange(row.id, 'kebersihan', v)} /> },
                            { header: 'Kerapian', className: 'w-32', render: (row) => <BehaviorOptions value={formData[row.id]?.kerapian} onChange={v => handleInputChange(row.id, 'kerapian', v)} /> },

                            { header: 'Hafalan (Juz)', className: 'w-40 border-l', render: (row) => <input type="text" className="form-control h-8 text-sm" placeholder="Contoh: 1 Juz" value={formData[row.id]?.jumlah_hafalan || ''} onChange={e => handleInputChange(row.id, 'jumlah_hafalan', e.target.value)} /> },
                            { header: 'Predikat', className: 'w-32', render: (row) => <PredikatOptions value={formData[row.id]?.predikat_hafalan} onChange={v => handleInputChange(row.id, 'predikat_hafalan', v)} /> },
                            { header: 'Total Hafalan', className: 'w-40', render: (row) => <input type="text" className="form-control h-8 text-sm" placeholder="Contoh: 3 Juz" value={formData[row.id]?.total_hafalan || ''} onChange={e => handleInputChange(row.id, 'total_hafalan', e.target.value)} /> },
                            
                            { header: 'Ketidakhadiran (S/I/A/P)', className: 'w-56 border-l text-center', render: (row) => (
                                <div className="flex gap-1 justify-center">
                                    <input type="number" min="0" className="form-control h-8 text-sm w-12 text-center" placeholder="S" title="Sakit" value={formData[row.id]?.sakit ?? ''} onChange={e => handleInputChange(row.id, 'sakit', e.target.value)} />
                                    <input type="number" min="0" className="form-control h-8 text-sm w-12 text-center" placeholder="I" title="Izin" value={formData[row.id]?.izin ?? ''} onChange={e => handleInputChange(row.id, 'izin', e.target.value)} />
                                    <input type="number" min="0" className="form-control h-8 text-sm w-12 text-center" placeholder="A" title="Alpha" value={formData[row.id]?.alpha ?? ''} onChange={e => handleInputChange(row.id, 'alpha', e.target.value)} />
                                    <input type="number" min="0" className="form-control h-8 text-sm w-12 text-center" placeholder="P" title="Pulang" value={formData[row.id]?.pulang ?? ''} onChange={e => handleInputChange(row.id, 'pulang', e.target.value)} />
                                </div>
                            ) },
                            
                            { header: 'Catatan Musyrif (Taujihat)', className: 'w-64 border-l', render: (row) => <textarea className="form-control text-sm min-h-[60px]" placeholder="Catatan untuk santri..." value={formData[row.id]?.catatan || ''} onChange={e => handleInputChange(row.id, 'catatan', e.target.value)} /> }
                        ]}
                        data={santri}
                        loading={loading}
                        emptyState={<div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">Tidak ada santri di kelas/halaqoh ini</div>}
                        mobileCardHeader={(row) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#0A2619]">{row.nama}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{row.nis}</span>
                            </div>
                        )}
                        mobileCardActions={() => null}
                        mobileCardContent={(row) => {
                            const d = formData[row.id] || {}
                            return (
                                <div className="flex flex-col gap-4 w-full mt-2 pt-2 border-t border-gray-100">
                                    {/* Perilaku */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Perilaku</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Ketekunan</label>
                                                <BehaviorOptions value={d.ketekunan} onChange={v => handleInputChange(row.id, 'ketekunan', v)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Kedisiplinan</label>
                                                <BehaviorOptions value={d.kedisiplinan} onChange={v => handleInputChange(row.id, 'kedisiplinan', v)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Kebersihan</label>
                                                <BehaviorOptions value={d.kebersihan} onChange={v => handleInputChange(row.id, 'kebersihan', v)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Kerapian</label>
                                                <BehaviorOptions value={d.kerapian} onChange={v => handleInputChange(row.id, 'kerapian', v)} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Tahfizh Summary */}
                                    <div className="border-t border-gray-50 pt-3">
                                        <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Tahfizh Summary</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="col-span-2">
                                                <label className="text-[10px] text-gray-500 mb-1 block">Hafalan (Juz)</label>
                                                <input type="text" className="form-control h-8 text-sm" placeholder="Contoh: 1 Juz" value={d.jumlah_hafalan || ''} onChange={e => handleInputChange(row.id, 'jumlah_hafalan', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Predikat</label>
                                                <PredikatOptions value={d.predikat_hafalan} onChange={v => handleInputChange(row.id, 'predikat_hafalan', v)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 mb-1 block">Total Hafalan</label>
                                                <input type="text" className="form-control h-8 text-sm" placeholder="Contoh: 3 Juz" value={d.total_hafalan || ''} onChange={e => handleInputChange(row.id, 'total_hafalan', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Presensi */}
                                    <div className="border-t border-gray-50 pt-3">
                                        <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Ketidakhadiran (S/I/A/P)</h4>
                                        <div className="flex gap-2">
                                            <input type="number" min="0" className="form-control h-8 text-sm flex-1 text-center" placeholder="S" title="Sakit" value={d.sakit ?? ''} onChange={e => handleInputChange(row.id, 'sakit', e.target.value)} />
                                            <input type="number" min="0" className="form-control h-8 text-sm flex-1 text-center" placeholder="I" title="Izin" value={d.izin ?? ''} onChange={e => handleInputChange(row.id, 'izin', e.target.value)} />
                                            <input type="number" min="0" className="form-control h-8 text-sm flex-1 text-center" placeholder="A" title="Alpha" value={d.alpha ?? ''} onChange={e => handleInputChange(row.id, 'alpha', e.target.value)} />
                                            <input type="number" min="0" className="form-control h-8 text-sm flex-1 text-center" placeholder="P" title="Pulang" value={d.pulang ?? ''} onChange={e => handleInputChange(row.id, 'pulang', e.target.value)} />
                                        </div>
                                    </div>
                                    {/* Taujihat */}
                                    <div className="border-t border-gray-50 pt-3">
                                        <h4 className="text-xs font-semibold text-[#0A2619] mb-2 uppercase">Catatan Musyrif (Taujihat)</h4>
                                        <textarea className="form-control text-sm min-h-[80px]" placeholder="Catatan untuk santri..." value={d.catatan || ''} onChange={e => handleInputChange(row.id, 'catatan', e.target.value)} />
                                    </div>
                                </div>
                            )
                        }}
                    />
                </div>
            )}
        </div>
    )
}

export default InputPerilakuPage
