import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './Hafalan.css'

const HafalanForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const isEdit = Boolean(id)

    // Ambil jenis dari URL query param (jika ada)
    const jenisFromUrl = searchParams.get('jenis') || 'Setoran'

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [santriList, setSantriList] = useState([])
    const [guruList, setGuruList] = useState([])
    const [halaqohList, setHalaqohList] = useState([])
    const [selectedHalaqoh, setSelectedHalaqoh] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [formData, setFormData] = useState({
        santri_id: '',
        // Input Mulai (Juz-Surah-Ayat)
        juz_mulai: 30,
        surah_mulai: '',
        ayat_mulai: 1,
        // Input Selesai (Juz-Surah-Ayat)
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

    useEffect(() => {
        fetchHalaqoh()
        fetchSantri()
        fetchGuru()
        if (isEdit) {
            fetchHafalan()
        }
    }, [id])

    // Fetch daftar halaqoh dengan musyrif
    const fetchHalaqoh = async () => {
        try {
            const { data } = await supabase
                .from('halaqoh')
                .select('id, nama, musyrif_id, musyrif:musyrif_id(id, nama)')
                .order('nama')
            setHalaqohList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    // Fetch santri dengan halaqoh_id untuk filter
    const fetchSantri = async () => {
        try {
            const { data } = await supabase
                .from('santri')
                .select('id, nis, nama, nama_wali, no_telp_wali, halaqoh_id')
                .eq('status', 'Aktif')
                .order('nama')
            setSantriList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
        }
    }

    // Handle perubahan halaqoh - auto set musyrif dan reset santri
    const handleHalaqohChange = (halaqohId) => {
        setSelectedHalaqoh(halaqohId)
        setFormData(prev => ({ ...prev, santri_id: '' })) // Reset santri selection

        // Auto set musyrif berdasarkan halaqoh yang dipilih
        if (halaqohId) {
            const halaqoh = halaqohList.find(h => h.id === halaqohId)
            if (halaqoh && halaqoh.musyrif_id) {
                setFormData(prev => ({ ...prev, penguji_id: halaqoh.musyrif_id }))
            }
        }
    }

    // Filter santri berdasarkan halaqoh yang dipilih
    const filteredSantriList = selectedHalaqoh
        ? santriList.filter(s => s.halaqoh_id === selectedHalaqoh)
        : santriList


    const fetchGuru = async () => {
        try {
            const { data } = await supabase
                .from('guru')
                .select('id, nama')
                .order('nama')
            setGuruList(data || [])
        } catch (err) {
            console.error('Error:', err.message)
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

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const payload = {
                santri_id: formData.santri_id,
                // Kolom baru (Mulai-Selesai)
                juz_mulai: parseInt(formData.juz_mulai),
                surah_mulai: formData.surah_mulai,
                ayat_mulai: parseInt(formData.ayat_mulai),
                juz_selesai: parseInt(formData.juz_selesai),
                surah_selesai: formData.surah_selesai,
                ayat_selesai: parseInt(formData.ayat_selesai),
                // Kolom lama (backward compatibility) - pakai nilai dari Mulai
                juz: parseInt(formData.juz_mulai),
                surah: formData.surah_mulai,
                // Kolom lainnya
                jenis: formData.jenis,
                status: formData.status,
                tanggal: formData.tanggal,
                penguji_id: formData.penguji_id || null,
                catatan: formData.catatan
            }

            if (isEdit) {
                const { error } = await supabase.from('hafalan').update(payload).eq('id', id)
                if (error) throw error
                setSuccess('Data hafalan berhasil diupdate!')
                setTimeout(() => navigate('/hafalan'), 1500)
            } else {
                const { error } = await supabase.from('hafalan').insert([payload])
                if (error) throw error

                // Data berhasil disimpan - tampilkan sukses dulu
                setSuccess('Data hafalan berhasil disimpan!')

                // Konfirmasi kirim WhatsApp dengan try-catch
                try {
                    const santri = santriList.find(s => s.id === formData.santri_id)
                    const halaqoh = halaqohList.find(h => h.id === selectedHalaqoh)
                    const musyrif = halaqoh?.musyrif?.nama || '-'

                    const sendWA = window.confirm('✅ Data hafalan berhasil disimpan!\n\nKirim laporan ke WhatsApp wali santri?')

                    if (sendWA && santri) {
                        // Gunakan nomor dari database
                        let phone = santri?.no_telp_wali || ''
                        phone = phone.replace(/\D/g, '')
                        if (phone.startsWith('0')) {
                            phone = '62' + phone.substring(1)
                        }

                        // Jika tidak ada, minta input manual
                        if (!phone) {
                            phone = window.prompt(`Nomor telepon wali ${santri?.nama_wali || 'santri'} tidak tersedia.\n\nMasukkan nomor WhatsApp (contoh: 6281234567890):`)
                            if (phone) {
                                phone = phone.replace(/\D/g, '')
                                if (phone.startsWith('0')) {
                                    phone = '62' + phone.substring(1)
                                }
                            }
                        }

                        if (phone) {
                            const message = `Assalamu'alaikum Wr. Wb.

*LAPORAN HAFALAN SANTRI*
━━━━━━━━━━━━━━━━━━━━

Kepada Yth. Bapak/Ibu *${santri?.nama_wali || 'Wali Santri'}*

📌 *Nama Santri:* ${santri?.nama || '-'}
📅 *Tanggal:* ${formData.tanggal}
📖 *Jenis Hafalan:* ${formData.jenis}

*Detail Hafalan:*
• Mulai: Juz ${formData.juz_mulai}, ${formData.surah_mulai} ayat ${formData.ayat_mulai}
• Selesai: Juz ${formData.juz_selesai}, ${formData.surah_selesai} ayat ${formData.ayat_selesai}

*Status:* ${formData.status}
*Musyrif:* ${musyrif}

${formData.catatan ? `*Catatan:* ${formData.catatan}` : ''}

Demikian laporan hafalan ananda. Jazakumullah khairan.

_PTQA Batuan_`

                            const encoded = encodeURIComponent(message)
                            window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank')
                        }
                    }
                } catch (waError) {
                    console.error('WhatsApp error:', waError)
                    // Tidak throw error, data sudah tersimpan
                }

                setTimeout(() => navigate('/hafalan'), 1000)
                return
            }
        } catch (err) {
            setError('Gagal menyimpan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return <div className="text-center py-4"><RefreshCw size={24} className="spin" /> Loading...</div>
    }

    return (
        <div className="hafalan-form-page">
            <div className="page-header">
                <div>
                    <button className="btn btn-secondary btn-sm mb-2" onClick={() => navigate('/hafalan')}>
                        <ArrowLeft size={16} /> Kembali
                    </button>
                    <h1 className="page-title">{isEdit ? 'Edit Hafalan' : 'Input Setoran/Muroja\'ah'}</h1>
                    <p className="page-subtitle">{isEdit ? 'Update data hafalan' : 'Catat progress hafalan santri'}</p>
                </div>
            </div>

            {error && <div className="alert alert-error mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            <form onSubmit={handleSubmit} className="form-card">
                <div className="form-section">
                    <h3 className="form-section-title">Data Hafalan</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Halaqoh *</label>
                            <select className="form-control" value={selectedHalaqoh} onChange={(e) => handleHalaqohChange(e.target.value)} required>
                                <option value="">Pilih Halaqoh</option>
                                {halaqohList.map(h => <option key={h.id} value={h.id}>{h.nama} {h.musyrif?.nama ? `(${h.musyrif.nama})` : ''}</option>)}
                            </select>
                            <small className="form-hint">Pilih halaqoh terlebih dahulu untuk memfilter santri</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Santri *</label>
                            <select name="santri_id" className="form-control" value={formData.santri_id} onChange={handleChange} required disabled={!selectedHalaqoh}>
                                <option value="">{selectedHalaqoh ? 'Pilih Santri' : 'Pilih halaqoh dulu'}</option>
                                {filteredSantriList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
                            </select>
                            {selectedHalaqoh && <small className="form-hint">{filteredSantriList.length} santri tersedia</small>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Jenis Setoran *</label>
                            <select name="jenis" className="form-control" value={formData.jenis} onChange={handleChange}>
                                <option value="Setoran">Setoran (Hafalan Baru)</option>
                                <option value="Muroja'ah">Muroja'ah (Mengulang)</option>
                                <option value="Ziyadah Ulang">Ziyadah Ulang</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tanggal *</label>
                            <input type="date" name="tanggal" className="form-control" value={formData.tanggal} onChange={handleChange} required />
                        </div>
                    </div>

                    {/* Input Mulai */}
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

                    {/* Input Selesai */}
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

                    {/* Status dan Musyrif */}
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
                            <label className="form-label">Kadar Setoran *</label>
                            <select name="kadar_setoran" className="form-control" value={formData.kadar_setoran} onChange={handleChange}>
                                <option value="Setengah Halaman">½ Halaman</option>
                                <option value="1 Halaman">1 Halaman</option>
                                <option value="2 Halaman">2 Halaman</option>
                                <option value="3 Halaman">3 Halaman</option>
                                <option value="4 Halaman">4 Halaman</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Musyrif Halaqoh</label>
                            <input
                                type="text"
                                className="form-control"
                                value={selectedHalaqoh ? (halaqohList.find(h => h.id === selectedHalaqoh)?.musyrif?.nama || 'Tidak ada musyrif') : 'Pilih halaqoh'}
                                disabled
                                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                            />
                            <small className="form-hint">Otomatis dari halaqoh yang dipilih</small>
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
        </div>
    )
}

export default HafalanForm
