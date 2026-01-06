import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw, Check, MessageCircle, Eye, AlertCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { logCreate, logUpdate } from '../../../../lib/auditLog'
import { useUserHalaqoh } from '../../../../hooks/features/useUserHalaqoh'
import ConfirmationModal from '../../../../components/ui/ConfirmationModal'
import DateRangePicker from '../../../../components/ui/DateRangePicker'
import { createMessage, sendWhatsApp } from '../../../../utils/whatsapp'
import { useCalendar } from '../../../../context/CalendarContext'
import { useToast } from '../../../../context/ToastContext'
import './Hafalan.css'

const HafalanForm = () => {
    const { formatDate } = useCalendar()
    const showToast = useToast()
    const navigate = useNavigate()
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const isEdit = Boolean(id)

    // Ambil jenis dari URL query param (jika ada)
    const jenisFromUrl = searchParams.get('jenis') || 'Hafalan Baru'

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [santriList, setSantriList] = useState([])
    const [guruList, setGuruList] = useState([])
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [recentHafalan, setRecentHafalan] = useState([])

    // AUTO-FILTER: Halaqoh adalah ATRIBUT AKUN, bukan input user
    const {
        halaqohIds,
        halaqohNames,
        halaqohList,
        musyrifInfo,
        isLoading: loadingHalaqoh,
        hasHalaqoh,
        isAdmin,
        selectedHalaqohId,
        setSelectedHalaqohId
    } = useUserHalaqoh()

    const [formData, setFormData] = useState({
        santri_id: '',
        juz_mulai: 30,
        surah_mulai: '',
        ayat_mulai: 1,
        juz_selesai: 30,
        surah_selesai: '',
        ayat_selesai: 1,
        jenis: jenisFromUrl,
        status: 'Lancar',
        kadar_setoran: '1 Halaman',
        tanggal: new Date().toISOString().split('T')[0],
        penguji_id: '',
        catatan: ''
    })

    // Fetch santri - Filtered based on SELECTED halaqoh
    const fetchSantri = async () => {
        try {
            if (!hasHalaqoh && !isAdmin) {
                setSantriList([])
                return
            }

            let query = supabase
                .from('santri')
                .select('id, nis, nama, nama_wali, no_telp_wali, halaqoh_id')
                .eq('status', 'Aktif')
                .order('nama')

            // FILTER: Gunakan selectedHalaqohId jika ada
            if (selectedHalaqohId) {
                query = query.eq('halaqoh_id', selectedHalaqohId)
            } else if (!isAdmin && halaqohIds.length > 0) {
                // Fallback if no selection but restricted (shouldn't happen with new logic)
                query = query.in('halaqoh_id', halaqohIds)
            }

            const { data } = await query
            setSantriList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchGuru = async () => {
        try {
            const { data } = await supabase.from('guru').select('id, nama').order('nama')
            setGuruList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    const fetchRecentHafalan = async () => {
        try {
            const today = new Date().toISOString().split('T')[0]
            let query = supabase
                .from('hafalan')
                .select(`
                    id, tanggal, juz_mulai, surah_mulai, ayat_mulai, 
                    juz_selesai, surah_selesai, ayat_selesai, jenis, status, catatan,
                    santri:santri_id (id, nama, nis, no_telp_wali, nama_wali, halaqoh_id),
                    penguji:penguji_id (id, nama)
                `)
                .eq('tanggal', today)
                .order('created_at', { ascending: false })
                .limit(20)

            // Filter by SELECTED halaqoh
            if (selectedHalaqohId) {
                query = query.eq('santri.halaqoh_id', selectedHalaqohId)
                // Note: filtering deep relation inside 'select' is tricky in supabase-js depending on version.
                // It's safer to filter client-side or use complex filter syntax.
                // Let's stick to client-side filtering for reliability as per existing pattern
            }

            const { data } = await query

            // Client-side Filter
            let filtered = data || []
            if (selectedHalaqohId) {
                filtered = filtered.filter(h => h.santri?.halaqoh_id === selectedHalaqohId)
            } else if (!isAdmin && halaqohIds.length > 0) {
                filtered = filtered.filter(h => halaqohIds.includes(h.santri?.halaqoh_id))
            }

            setRecentHafalan(filtered)
        } catch (err) {
            console.error('Error fetching recent hafalan:', err.message)
        }
    }

    const fetchHafalan = async () => {
        setFetching(true)
        try {
            const { data, error } = await supabase
                .from('hafalan')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            setFormData({
                santri_id: data.santri_id || '',
                juz_mulai: data.juz_mulai || data.juz || 30,
                surah_mulai: data.surah_mulai || data.surah || '',
                ayat_mulai: data.ayat_mulai || 1,
                juz_selesai: data.juz_selesai || data.juz || 30,
                surah_selesai: data.surah_selesai || data.surah || '',
                ayat_selesai: data.ayat_selesai || 1,
                jenis: data.jenis || 'Setoran',
                status: data.status || 'Lancar',
                tanggal: data.tanggal || new Date().toISOString().split('T')[0],
                penguji_id: data.penguji_id || '',
                catatan: data.catatan || ''
            })
        } catch (err) {
            setError('Gagal memuat data: ' + err.message)
        } finally {
            setFetching(false)
        }
    }

    // Re-fetch data when selectedHalaqohId changes
    useEffect(() => {
        if (!loadingHalaqoh) {
            fetchSantri()
            fetchGuru()
            fetchRecentHafalan()
            // if (isEdit) fetchHafalan() // fetchHafalan params usually fixed, but santri filtering affects form? No, edit mode loads specific ID.
        }
    }, [selectedHalaqohId, loadingHalaqoh, id])

    // Initial load for edit
    useEffect(() => {
        if (isEdit) fetchHafalan()
    }, [isEdit])


    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // WA Confirmation State
    const [waModal, setWaModal] = useState({ isOpen: false, santri: null, data: null })

    const handleCloseWaModal = () => {
        setWaModal({ isOpen: false, santri: null, data: null })
        resetForm()
    }

    const resetForm = () => {
        setFormData(prev => ({
            santri_id: '',
            juz_mulai: prev.juz_mulai,
            surah_mulai: '',
            ayat_mulai: 1,
            juz_selesai: prev.juz_selesai,
            surah_selesai: '',
            ayat_selesai: 1,
            jenis: prev.jenis,
            status: 'Lancar',
            kadar_setoran: '1 Halaman',
            tanggal: new Date().toISOString().split('T')[0],
            penguji_id: prev.penguji_id,
            catatan: ''
        }))
        setTimeout(() => setSuccess(''), 3000)
    }

    const handleSendWA = () => {
        const { santri, data } = waModal
        try {
            if (santri) {
                let phone = santri.no_telp_wali || ''

                if (!phone) {
                    showToast.error('Nomor WhatsApp wali tidak tersedia. Mohon update data santri.')
                    handleCloseWaModal()
                    return
                }

                const message = createMessage({
                    intro: `LAPORAN HAFALAN SANTRI`,
                    data: [
                        `Kepada Yth. *${santri.nama_wali || 'Wali Santri'}*`,
                        { label: 'Nama', value: santri.nama },
                        { label: 'Tanggal', value: formatDate(data.tanggal) },
                        { label: 'Jenis', value: data.jenis },
                        { label: 'Kadar', value: data.kadar_setoran },
                        { label: 'Musyrif', value: musyrifInfo?.nama || '-' },
                        `--- Detail Hafalan ---`,
                        { label: 'Mulai', value: `Juz ${data.juz_mulai}, ${data.surah_mulai} ayat ${data.ayat_mulai}` },
                        { label: 'Selesai', value: `Juz ${data.juz_selesai}, ${data.surah_selesai} ayat ${data.ayat_selesai}` },
                        { label: 'Status', value: data.status },
                        data.catatan ? { label: 'Catatan', value: data.catatan } : null
                    ],
                    closing: "Jazakumullah khairan."
                })

                sendWhatsApp(phone, message)
                showToast.success('WhatsApp terbuka!')
            }
        } catch (waError) {
            console.error('WhatsApp error:', waError)
        }
        handleCloseWaModal()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const payload = {
                santri_id: formData.santri_id,
                juz_mulai: parseInt(formData.juz_mulai),
                surah_mulai: formData.surah_mulai,
                ayat_mulai: parseInt(formData.ayat_mulai),
                juz_selesai: parseInt(formData.juz_selesai),
                surah_selesai: formData.surah_selesai,
                ayat_selesai: parseInt(formData.ayat_selesai),
                juz: parseInt(formData.juz_mulai),
                surah: formData.surah_mulai,
                jenis: formData.jenis,
                status: formData.status,
                tanggal: formData.tanggal,
                penguji_id: formData.penguji_id || null,
                catatan: formData.catatan,
                kadar_setoran: formData.kadar_setoran // Ensure this is included for WA
            }

            if (isEdit) {
                const { error } = await supabase.from('hafalan').update(payload).eq('id', id)
                if (error) throw error
                const santri = santriList.find(s => s.id === formData.santri_id)
                await logUpdate('hafalan', santri?.nama || 'Santri', `Edit hafalan: ${santri?.nama} - ${formData.surah_mulai}`)
                setSuccess('Data hafalan berhasil diupdate!')
                setTimeout(() => navigate('/hafalan'), 1500)
            } else {
                const { error } = await supabase.from('hafalan').insert([payload])
                if (error) throw error

                const santriForLog = santriList.find(s => s.id === formData.santri_id)
                await logCreate('hafalan', santriForLog?.nama || 'Santri', `Tambah hafalan: ${santriForLog?.nama} - ${formData.surah_mulai}`)

                await fetchRecentHafalan()

                // Trigger WA Modal instead of window.confirm
                setWaModal({
                    isOpen: true,
                    santri: santriForLog,
                    data: payload
                })

                // Note: resetForm is called in handleCloseWaModal
                return
            }
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching || loadingHalaqoh) {
        return <div className="text-center py-4"><RefreshCw size={24} className="spin" /> Loading...</div>
    }

    // Block access if no halaqoh linked
    if (!hasHalaqoh && !isAdmin) {
        return (
            <div className="hafalan-form-page">
                <div className="alert alert-warning" style={{ maxWidth: '600px', margin: '40px auto' }}>
                    <AlertCircle size={24} />
                    <div>
                        <strong>Akses Dibatasi</strong>
                        <p>Akun Anda belum terhubung dengan halaqoh. Hubungi admin untuk menghubungkan akun dengan halaqoh.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="hafalan-form-page">
            <div className="page-header">
                <div>
                    <button className="btn btn-secondary btn-sm mb-2" onClick={() => navigate('/hafalan')}>
                        <ArrowLeft size={16} /> Kembali
                    </button>
                    <h1 className="page-title">{isEdit ? 'Edit Hafalan' : "Input Setoran/Muroja'ah"}</h1>
                    <p className="page-subtitle">{isEdit ? 'Update data hafalan' : 'Catat progress hafalan santri'}</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-section">
                    <h3 className="form-section-title">Data Hafalan</h3>
                    <div className="form-grid">
                        {/* HALAQOH FILTER */}
                        {halaqohList.length > 1 || isAdmin ? (
                            <div className="form-group">
                                <label className="form-label">Halaqoh (Filter)</label>
                                <select
                                    className="form-control"
                                    value={selectedHalaqohId}
                                    onChange={(e) => setSelectedHalaqohId(e.target.value)}
                                >
                                    {halaqohList.map(h => (
                                        <option key={h.id} value={h.id}>
                                            {h.nama}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Halaqoh</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={halaqohNames || 'Memuat...'}
                                    disabled
                                    readOnly
                                    style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed' }}
                                />
                            </div>
                        )}

                        {/* MUSYRIF/PENGUJI - Auto-filled dari data halaqoh */}
                        <div className="form-group">
                            <label className="form-label">Musyrif/Penguji</label>
                            <input
                                type="text"
                                className="form-control"
                                value={isAdmin ? '-' : (musyrifInfo?.nama || 'Memuat...')}
                                disabled
                                readOnly
                                style={{ backgroundColor: '#f5f5f5', color: '#333', cursor: 'not-allowed' }}
                            />
                            <small className="form-hint">
                                Otomatis dari data halaqoh
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Santri *</label>
                            <select name="santri_id" className="form-control" value={formData.santri_id} onChange={handleChange} required>
                                <option value="">Pilih Santri</option>
                                {santriList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                            </select>
                            <small className="form-hint">{santriList.length} santri tersedia</small>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Jenis Setoran *</label>
                            <select name="jenis" className="form-control" value={formData.jenis} onChange={handleChange}>
                                <option value="Hafalan Baru">Hafalan Baru</option>
                                <option value="Murojaah">Murojaah</option>
                                <option value="Ziyadah Ulang">Ziyadah Ulang</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tanggal *</label>
                            <DateRangePicker
                                startDate={formData.tanggal}
                                onChange={(date) => setFormData(prev => ({ ...prev, tanggal: date }))}
                                singleDate={true}
                            />
                        </div>
                    </div>

                    <h4 className="form-subsection-title">📖 Mulai</h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Juz *</label>
                            <select name="juz_mulai" className="form-control" value={formData.juz_mulai} onChange={handleChange}>
                                {[...Array(30)].map((_, i) => <option key={i + 1} value={i + 1}>Juz {i + 1}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Surah *</label>
                            <input type="text" name="surah_mulai" className="form-control" placeholder="An-Naba" value={formData.surah_mulai} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ayat *</label>
                            <input type="number" name="ayat_mulai" className="form-control" min="1" value={formData.ayat_mulai} onChange={handleChange} required />
                        </div>
                    </div>

                    <h4 className="form-subsection-title">✅ Selesai</h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Juz *</label>
                            <select name="juz_selesai" className="form-control" value={formData.juz_selesai} onChange={handleChange}>
                                {[...Array(30)].map((_, i) => <option key={i + 1} value={i + 1}>Juz {i + 1}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Surah *</label>
                            <input type="text" name="surah_selesai" className="form-control" placeholder="An-Naba" value={formData.surah_selesai} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ayat *</label>
                            <input type="number" name="ayat_selesai" className="form-control" min="1" value={formData.ayat_selesai} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Status *</label>
                            <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                                <option value="Lancar">Lancar</option>
                                <option value="Sedang">Sedang</option>
                                <option value="Lemah">Lemah</option>
                                <option value="Baca Nazhor">Baca Nazhor</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kadar Setoran</label>
                            <select name="kadar_setoran" className="form-control" value={formData.kadar_setoran} onChange={handleChange}>
                                <option value="Setengah Halaman">½ Halaman</option>
                                <option value="1 Halaman">1 Halaman</option>
                                <option value="2 Halaman">2 Halaman</option>
                                <option value="3 Halaman">3 Halaman</option>
                                <option value="4 Halaman">4 Halaman</option>
                                <option value="5 Halaman">5 Halaman</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Catatan</label>
                        <textarea name="catatan" className="form-control" rows={2} value={formData.catatan} onChange={handleChange} placeholder="Catatan tambahan..." />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/hafalan')}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <><RefreshCw size={18} className="spin" /> Menyimpan...</> : <><Save size={18} /> Simpan</>}
                    </button>
                </div>
            </form>

            {/* Recent hafalan today */}
            {!isEdit && recentHafalan.length > 0 && (
                <div className="recent-hafalan-section" style={{ marginTop: '32px' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={20} className="text-success" /> Hafalan Hari Ini ({recentHafalan.length})
                    </h3>
                    <div className="card">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Nama Santri</th>
                                        <th>Juz/Surah</th>
                                        <th>Jenis</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentHafalan.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>{index + 1}</td>
                                            <td>{item.santri?.nama || '-'}</td>
                                            <td>Juz {item.juz_mulai} - {item.surah_mulai}</td>
                                            <td><span className={`badge ${item.jenis === 'Setoran' ? 'badge-success' : 'badge-info'}`}>{item.jenis}</span></td>
                                            <td><span className={`badge ${item.status === 'Lancar' ? 'badge-success' : item.status === 'Sedang' ? 'badge-warning' : 'badge-danger'}`}>{item.status}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn btn-sm btn-outline" onClick={() => navigate(`/hafalan/edit/${item.id}`)} title="Edit">
                                                        <Eye size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Recent hafalan today logic is above */}

            <ConfirmationModal
                isOpen={waModal.isOpen}
                onClose={handleCloseWaModal}
                onConfirm={handleSendWA}
                title="Kirim WhatsApp?"
                message="Data hafalan berhasil disimpan! Kirim laporan ke WhatsApp wali santri?"
                confirmLabel="Kirim WhatsApp"
                variant="success"
                cancelLabel="Tutup"
            />
        </div>
    )
}

export default HafalanForm
