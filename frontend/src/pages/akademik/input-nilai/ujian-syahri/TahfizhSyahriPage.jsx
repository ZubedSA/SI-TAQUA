import { useState, useEffect } from 'react'
import { Save, RefreshCw, BookMarked, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'
import SmartMonthYearFilter from '../../../../components/common/SmartMonthYearFilter'
import { useCalendar } from '../../../../context/CalendarContext'
import ResponsiveTable from '../../../../components/ui/ResponsiveTable'
import '../../shared/styles/Nilai.css'

const TahfizhSyahriPage = () => {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [semester, setSemester] = useState([])
    const [guruList, setGuruList] = useState([])
    const [santri, setSantri] = useState([])
    const [nilai, setNilai] = useState({})
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    // Gunakan hook untuk halaqoh yang difilter berdasarkan user
    const {
        halaqohList,
        halaqohIds,
        musyrifInfo,
        isLoading: loadingHalaqoh,
        hasHalaqoh,
        isAdmin: isUserAdmin
    } = useUserHalaqoh()

    const [selectedHalaqoh, setSelectedHalaqoh] = useState('')

    // Auto-select halaqoh jika hanya satu (non-admin)
    useEffect(() => {
        if (!isUserAdmin && halaqohList.length === 1 && !selectedHalaqoh) {
            setSelectedHalaqoh(halaqohList[0].id)
        }
    }, [isUserAdmin, halaqohList, selectedHalaqoh])

    const [filters, setFilters] = useState({
        semester_id: '',
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear()
    })

    const { mode } = useCalendar()

    useEffect(() => {
        console.log('[TahfizhSyahri] Mode changed:', mode)
    }, [mode])

    useEffect(() => {
        fetchOptions()
    }, [])

    const fetchOptions = async () => {
        const [semRes, guruRes] = await Promise.all([
            supabase.from('semester').select('*').order('tahun_ajaran', { ascending: false }),
            supabase.from('guru').select('id, nama').order('nama')
        ])
        if (semRes.data) {
            setSemester(semRes.data)
            const active = semRes.data.find(s => s.is_active)
            if (active) setFilters(prev => ({ ...prev, semester_id: active.id }))
        }
        if (guruRes.data) setGuruList(guruRes.data)
    }

    const fetchSantriAndNilai = async () => {
        console.log('[TahfizhSyahri] Fetch triggered:', filters)
        if (!selectedHalaqoh || !filters.semester_id) return
        setLoading(true)
        setError('')

        try {
            // Fetch santri berdasarkan halaqoh
            const { data: santriData, error: santriError } = await supabase
                .from('santri')
                .select('id, nama, nis')
                .eq('halaqoh_id', selectedHalaqoh)
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

                // Get default penguji from halaqoh musyrif
                const currentHalaqoh = halaqohList.find(h => h.id === selectedHalaqoh)
                // Use musyrifInfo if available (from hook), otherwise from halaqoh list if joined, otherwise empty
                const defaultPenguji = musyrifInfo?.id || currentHalaqoh?.musyrif_id || ''

                // Map nilai ke state
                const nilaiMap = {}
                santriData.forEach(s => {
                    const existingNilai = nilaiData?.find(n => n.santri_id === s.id)
                    nilaiMap[s.id] = {
                        id: existingNilai?.id || null,
                        hafalan: existingNilai?.nilai_hafalan || '',
                        tajwid: existingNilai?.nilai_tajwid || '',
                        tilawah: existingNilai?.nilai_kelancaran || '',
                        jumlah_hafalan: existingNilai?.jumlah_hafalan || '',
                        jumlah_hafalan_halaman: existingNilai?.jumlah_hafalan_halaman || '',
                        penguji_id: existingNilai?.penguji_id || defaultPenguji
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
        if (selectedHalaqoh && filters.semester_id) {
            fetchSantriAndNilai()
        }
    }, [selectedHalaqoh, filters.semester_id, filters.bulan, filters.tahun])

    const handleNilaiChange = (santriId, field, value) => {
        setNilai(prev => ({
            ...prev,
            [santriId]: {
                ...prev[santriId],
                [field]: field === 'penguji_id' ? value : (value === '' ? '' : parseFloat(value) || 0)
            }
        }))
    }

    const calculateRataRata = (santriId) => {
        const data = nilai[santriId]
        if (!data) return '-'
        const h = parseFloat(data.hafalan) || 0
        const t = parseFloat(data.tajwid) || 0
        const k = parseFloat(data.tilawah) || 0
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
                if (!data.hafalan && !data.tajwid && !data.tilawah) continue

                const payload = {
                    santri_id: santriId,
                    semester_id: filters.semester_id,
                    jenis_ujian: 'syahri',
                    kategori: 'Tahfizhiyah',
                    bulan: filters.bulan,
                    tahun: filters.tahun,
                    nilai_hafalan: parseFloat(data.hafalan) || 0,
                    nilai_tajwid: parseFloat(data.tajwid) || 0,
                    nilai_kelancaran: parseFloat(data.tilawah) || 0,
                    nilai_akhir: ((parseFloat(data.hafalan) || 0) + (parseFloat(data.tajwid) || 0) + (parseFloat(data.tilawah) || 0)) / 3,
                    jumlah_hafalan: parseInt(data.jumlah_hafalan) || 0,
                    jumlah_hafalan_halaman: parseInt(data.jumlah_hafalan_halaman) || 0,
                    penguji_id: data.penguji_id || null
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

    return (
        <div className="nilai-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Input Nilai Ujian Syahri
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
                    {loadingHalaqoh ? (
                        <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={16} className="spin" /> Memuat halaqoh...
                        </div>
                    ) : !hasHalaqoh && !isUserAdmin ? (
                        <div className="alert alert-warning" style={{ margin: 0 }}>
                            <AlertCircle size={16} />
                            <span>Akun Anda belum terhubung dengan halaqoh. Hubungi admin.</span>
                        </div>
                    ) : (!isUserAdmin && halaqohList.length === 1) ? (
                        <input
                            type="text"
                            className="form-control"
                            value={halaqohList[0]?.nama || (halaqohList[0]?.nama_halaqoh || '')}
                            disabled
                            readOnly
                            style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed' }}
                        />
                    ) : (
                        <select
                            className="form-control"
                            value={selectedHalaqoh}
                            onChange={e => setSelectedHalaqoh(e.target.value)}
                        >
                            <option value="">Pilih Halaqoh</option>
                            {halaqohList.map(h => (
                                <option key={h.id} value={h.id}>{h.nama || h.nama_halaqoh}</option>
                            ))}
                        </select>
                    )}
                </div>

                <SmartMonthYearFilter
                    filters={filters}
                    onFilterChange={setFilters}
                />
            </div>

            {
                selectedHalaqoh && filters.semester_id && (
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
                                            value={nilai[row.id]?.hafalan ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'hafalan', e.target.value)}
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
                                    header: 'Tilawah', 
                                    className: 'text-center',
                                    render: (row) => (
                                        <input
                                            type="number"
                                            className="nilai-input"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={nilai[row.id]?.tilawah ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'tilawah', e.target.value)}
                                        />
                                    )
                                },
                                { header: 'Rata-rata', render: (row) => calculateRataRata(row.id), className: 'text-center font-semibold' },
                                { 
                                    header: 'Jml Hafalan (Juz)', 
                                    className: 'text-center',
                                    render: (row) => (
                                        <input
                                            type="number"
                                            className="nilai-input"
                                            min="0"
                                            max="30"
                                            placeholder="Juz"
                                            value={nilai[row.id]?.jumlah_hafalan ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'jumlah_hafalan', e.target.value)}
                                        />
                                    )
                                },
                                { 
                                    header: 'Jml Hafalan (Hal)', 
                                    className: 'text-center',
                                    render: (row) => (
                                        <input
                                            type="number"
                                            className="nilai-input"
                                            min="0"
                                            max="20"
                                            placeholder="Hal"
                                            value={nilai[row.id]?.jumlah_hafalan_halaman ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'jumlah_hafalan_halaman', e.target.value)}
                                        />
                                    )
                                },
                                { 
                                    header: 'Penguji', 
                                    className: 'text-center min-w-[150px]',
                                    render: (row) => (
                                        <select
                                            className="form-control"
                                            style={{ minWidth: '140px', padding: '6px 8px', fontSize: '0.85rem' }}
                                            value={nilai[row.id]?.penguji_id ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'penguji_id', e.target.value)}
                                        >
                                            <option value="">Pilih Penguji</option>
                                            {guruList.map(g => (
                                                <option key={g.id} value={g.id}>{g.nama}</option>
                                            ))}
                                        </select>
                                    )
                                }
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
                                                value={nilai[row.id]?.hafalan ?? ''}
                                                onChange={e => handleNilaiChange(row.id, 'hafalan', e.target.value)}
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
                                            <label className="text-xs text-gray-500 mb-1 block">Tilawah</label>
                                            <input
                                                type="number"
                                                className="form-control text-sm px-2 py-1"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                value={nilai[row.id]?.tilawah ?? ''}
                                                onChange={e => handleNilaiChange(row.id, 'tilawah', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Jml Hafalan (Juz)</label>
                                            <input
                                                type="number"
                                                className="form-control text-sm px-2 py-1"
                                                min="0"
                                                max="30"
                                                placeholder="Juz"
                                                value={nilai[row.id]?.jumlah_hafalan ?? ''}
                                                onChange={e => handleNilaiChange(row.id, 'jumlah_hafalan', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Jml Hafalan (Hal)</label>
                                            <input
                                                type="number"
                                                className="form-control text-sm px-2 py-1"
                                                min="0"
                                                max="20"
                                                placeholder="Hal"
                                                value={nilai[row.id]?.jumlah_hafalan_halaman ?? ''}
                                                onChange={e => handleNilaiChange(row.id, 'jumlah_hafalan_halaman', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-1">
                                        <label className="text-xs text-gray-500 mb-1 block">Penguji</label>
                                        <select
                                            className="form-control text-sm px-2 py-1"
                                            value={nilai[row.id]?.penguji_id ?? ''}
                                            onChange={e => handleNilaiChange(row.id, 'penguji_id', e.target.value)}
                                        >
                                            <option value="">Pilih Penguji</option>
                                            {guruList.map(g => (
                                                <option key={g.id} value={g.id}>{g.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-50 pt-2 mt-1">
                                        <span className="text-gray-500 font-medium text-sm">Rata-rata:</span>
                                        <span className="font-bold text-gray-900">{calculateRataRata(row.id)}</span>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                )
            }
        </div >
    )
}

export default TahfizhSyahriPage
