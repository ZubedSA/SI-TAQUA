import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    AlertTriangle,
    Save,
    ArrowLeft,
    User,
    Calendar,
    MapPin,
    FileText,
    Users
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

const PelanggaranForm = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { userProfile } = useAuth()
    const isEdit = Boolean(id)

    const [formData, setFormData] = useState({
        santri_id: '',
        tanggal: new Date().toISOString().split('T')[0],
        tingkat: 1,
        jenis: '',
        deskripsi: '',
        lokasi: '',
        saksi: '',
        status: 'OPEN'
    })
    const [santriList, setSantriList] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetchingData, setFetchingData] = useState(isEdit)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        fetchSantriList()
        if (isEdit) {
            fetchPelanggaran()
        }
    }, [id])

    const fetchSantriList = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, kelas:kelas_id(nama)')
                .eq('status', 'Aktif')
                .order('nama')

            if (error) throw error
            setSantriList(data || [])
        } catch (error) {
            console.error('Error fetching santri:', error.message)
        }
    }

    const fetchPelanggaran = async () => {
        setFetchingData(true)
        try {
            const { data, error } = await supabase
                .from('pelanggaran')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            if (data) {
                setFormData({
                    santri_id: data.santri_id,
                    tanggal: data.tanggal,
                    tingkat: data.tingkat,
                    jenis: data.jenis,
                    deskripsi: data.deskripsi || '',
                    lokasi: data.lokasi || '',
                    saksi: data.saksi || '',
                    status: data.status
                })
            }
        } catch (error) {
            console.error('Error fetching pelanggaran:', error.message)
            alert('Data tidak ditemukan')
            navigate('/pengurus/pelanggaran')
        } finally {
            setFetchingData(false)
        }
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.santri_id) newErrors.santri_id = 'Pilih santri'
        if (!formData.tanggal) newErrors.tanggal = 'Tanggal wajib diisi'
        if (!formData.jenis) newErrors.jenis = 'Jenis pelanggaran wajib diisi'
        if (!formData.tingkat) newErrors.tingkat = 'Tingkat wajib dipilih'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        try {
            const payload = {
                ...formData,
                pelapor_id: userProfile?.id
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('pelanggaran')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('pelanggaran')
                    .insert([payload])
                if (error) throw error
            }

            navigate('/pengurus/pelanggaran')
        } catch (error) {
            console.error('Error saving:', error.message)
            alert('Gagal menyimpan: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const tingkatOptions = [
        { value: 1, label: 'Ringan - Teguran Lisan' },
        { value: 2, label: 'Sedang - Peringatan Tertulis' },
        { value: 3, label: 'Berat - Panggilan Wali' },
        { value: 4, label: 'Sangat Berat - Skorsing/Pembinaan Khusus' }
    ]

    const jenisOptions = [
        'Terlambat',
        'Bolos',
        'Tidak mengikuti kegiatan',
        'Berbicara kasar',
        'Berkelahi',
        'Merusak fasilitas',
        'Membawa barang terlarang',
        'Melanggar tata tertib',
        'Lainnya'
    ]

    if (fetchingData) {
        return (
            <div className="form-page loading">
                <div className="spinner"></div>
                <p>Memuat data...</p>
            </div>
        )
    }

    return (
        <div className="form-page">
            <div className="form-header">
                <button className="back-btn" onClick={() => navigate('/pengurus/pelanggaran')}>
                    <ArrowLeft size={20} />
                    Kembali
                </button>
                <h1>
                    <AlertTriangle size={28} />
                    {isEdit ? 'Edit Pelanggaran' : 'Catat Pelanggaran Baru'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="form-container">
                <div className="form-card">
                    <h2><User size={20} /> Data Santri</h2>

                    <div className="form-group">
                        <label>Santri *</label>
                        <select
                            value={formData.santri_id}
                            onChange={(e) => setFormData({ ...formData, santri_id: e.target.value })}
                            className={errors.santri_id ? 'error' : ''}
                        >
                            <option value="">-- Pilih Santri --</option>
                            {santriList.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.nama} ({s.nis}) - {s.kelas?.nama || '-'}
                                </option>
                            ))}
                        </select>
                        {errors.santri_id && <span className="error-text">{errors.santri_id}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label><Calendar size={16} /> Tanggal *</label>
                            <input
                                type="date"
                                value={formData.tanggal}
                                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                                className={errors.tanggal ? 'error' : ''}
                            />
                            {errors.tanggal && <span className="error-text">{errors.tanggal}</span>}
                        </div>

                        <div className="form-group">
                            <label><MapPin size={16} /> Lokasi Kejadian</label>
                            <input
                                type="text"
                                placeholder="Contoh: Masjid, Asrama, Kelas..."
                                value={formData.lokasi}
                                onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-card">
                    <h2><AlertTriangle size={20} /> Detail Pelanggaran</h2>

                    <div className="form-group">
                        <label>Jenis Pelanggaran *</label>
                        <select
                            value={formData.jenis}
                            onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                            className={errors.jenis ? 'error' : ''}
                        >
                            <option value="">-- Pilih Jenis --</option>
                            {jenisOptions.map((j) => (
                                <option key={j} value={j}>{j}</option>
                            ))}
                        </select>
                        {errors.jenis && <span className="error-text">{errors.jenis}</span>}
                    </div>

                    <div className="form-group">
                        <label>Tingkat Pelanggaran *</label>
                        <div className="tingkat-options">
                            {tingkatOptions.map((opt) => (
                                <label key={opt.value} className={`tingkat-option ${formData.tingkat === opt.value ? 'selected' : ''} tingkat-${opt.value}`}>
                                    <input
                                        type="radio"
                                        name="tingkat"
                                        value={opt.value}
                                        checked={formData.tingkat === opt.value}
                                        onChange={() => setFormData({ ...formData, tingkat: opt.value })}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label><FileText size={16} /> Deskripsi</label>
                        <textarea
                            rows="3"
                            placeholder="Jelaskan kronologi kejadian..."
                            value={formData.deskripsi}
                            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label><Users size={16} /> Saksi</label>
                        <input
                            type="text"
                            placeholder="Nama saksi jika ada..."
                            value={formData.saksi}
                            onChange={(e) => setFormData({ ...formData, saksi: e.target.value })}
                        />
                    </div>

                    {isEdit && (
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="OPEN">Open</option>
                                <option value="PROSES">Proses</option>
                                <option value="SELESAI">Selesai</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => navigate('/pengurus/pelanggaran')}>
                        Batal
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Pelanggaran'}
                    </button>
                </div>
            </form>

            <style>{`
                .form-page {
                    padding: 1.5rem;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .form-page.loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 50vh;
                    color: var(--text-muted);
                }
                .form-header {
                    margin-bottom: 1.5rem;
                }
                .back-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    margin-bottom: 1rem;
                    padding: 0;
                }
                .back-btn:hover {
                    color: var(--text-primary);
                }
                .form-header h1 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.5rem;
                    margin: 0;
                }
                .form-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .form-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1.5rem;
                }
                .form-card h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.1rem;
                    margin: 0 0 1rem 0;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--border-color);
                }
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                .form-group input,
                .form-group select,
                .form-group textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 0.9rem;
                    background: var(--card-bg);
                    color: var(--text-primary);
                }
                .form-group input:focus,
                .form-group select:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }
                .form-group input.error,
                .form-group select.error {
                    border-color: #ea4335;
                }
                .error-text {
                    color: #ea4335;
                    font-size: 0.8rem;
                    margin-top: 0.25rem;
                }
                .tingkat-options {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .tingkat-option {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    border: 2px solid var(--border-color);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tingkat-option input {
                    width: auto;
                    margin-right: 0.75rem;
                }
                .tingkat-option.selected {
                    border-color: var(--color-primary);
                    background: rgba(66, 133, 244, 0.1);
                }
                .tingkat-option.tingkat-1.selected { border-color: #34a853; background: rgba(52, 168, 83, 0.1); }
                .tingkat-option.tingkat-2.selected { border-color: #fbbc04; background: rgba(251, 188, 4, 0.1); }
                .tingkat-option.tingkat-3.selected { border-color: #ea4335; background: rgba(234, 67, 53, 0.1); }
                .tingkat-option.tingkat-4.selected { border-color: #9c27b0; background: rgba(156, 39, 176, 0.1); }
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }
                .btn-secondary {
                    padding: 0.75rem 1.5rem;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    color: var(--text-primary);
                }
                .btn-primary {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    cursor: pointer;
                }
                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                @media (max-width: 768px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}

export default PelanggaranForm
