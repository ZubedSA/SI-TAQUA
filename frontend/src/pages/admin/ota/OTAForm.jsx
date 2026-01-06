import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, RefreshCw, User, Mail, Phone, ShieldCheck, Tag, MapPin, HeartHandshake } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../context/ToastContext'
import Spinner from '../../../components/ui/Spinner'

const styles = {
    container: {
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
    },
    wrapper: {
        maxWidth: '800px',
        margin: '0 auto'
    },
    header: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        padding: '24px 28px',
        color: 'white',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        boxShadow: '0 10px 40px -10px rgba(79, 70, 229, 0.5)',
        marginBottom: '24px'
    },
    headerContent: {
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
    },
    headerInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    headerIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: '1.5rem',
        fontWeight: 700,
        margin: 0,
        color: 'white'
    },
    headerSubtitle: {
        fontSize: '0.9rem',
        color: 'rgba(255,255,255,0.85)',
        margin: '4px 0 0 0'
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 18px',
        borderRadius: '10px',
        fontWeight: 500,
        fontSize: '0.875rem',
        background: 'rgba(255,255,255,0.15)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    formCard: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    },
    topBar: {
        height: '4px',
        background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)'
    },
    formBody: {
        padding: '32px'
    },
    section: {
        marginBottom: '32px'
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: '2px solid #f1f5f9'
    },
    sectionIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionTitle: {
        fontSize: '0.95rem',
        fontWeight: 600,
        color: '#312e81',
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.03em'
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px'
    },
    formGroup: {
        marginBottom: '0'
    },
    formGroupFull: {
        gridColumn: '1 / -1'
    },
    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: '#475569',
        marginBottom: '8px'
    },
    required: {
        color: '#ef4444',
        marginLeft: '2px'
    },
    inputWrapper: {
        position: 'relative'
    },
    inputIcon: {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9ca3af',
        pointerEvents: 'none'
    },
    inputIconTextarea: {
        position: 'absolute',
        left: '14px',
        top: '14px',
        color: '#9ca3af',
        pointerEvents: 'none'
    },
    input: {
        width: '100%',
        padding: '12px 14px 12px 44px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s',
        background: '#fafafa'
    },
    inputNoIcon: {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s',
        background: '#fafafa'
    },
    select: {
        width: '100%',
        padding: '12px 14px 12px 44px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s',
        background: '#fafafa',
        cursor: 'pointer',
        appearance: 'none'
    },
    textarea: {
        width: '100%',
        padding: '12px 14px 12px 44px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s',
        background: '#fafafa',
        resize: 'none',
        minHeight: '100px'
    },
    helpText: {
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '6px'
    },
    footer: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        paddingTop: '24px',
        borderTop: '1px solid #f3f4f6',
        marginTop: '8px'
    },
    cancelBtn: {
        padding: '12px 24px',
        borderRadius: '10px',
        fontWeight: 500,
        fontSize: '0.9rem',
        background: 'white',
        color: '#4b5563',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    submitBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 28px',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '0.9rem',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
        transition: 'all 0.2s'
    },
    loadingCenter: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
    }
}

const OTAForm = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const showToast = useToast()
    const isEdit = Boolean(id)

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(isEdit)
    const [kategoriList, setKategoriList] = useState([])
    const [formData, setFormData] = useState({
        nama: '',
        email: '',
        no_hp: '',
        alamat: '',
        kategori_id: '',
        status: true
    })

    useEffect(() => {
        fetchKategori()
        if (isEdit) fetchData()
    }, [id])

    const fetchKategori = async () => {
        try {
            const { data, error } = await supabase
                .from('ota_kategori')
                .select('id, nama')
                .order('nama')
            if (!error) setKategoriList(data || [])
        } catch (err) {
            console.error('Error fetching kategori:', err)
        }
    }

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('orang_tua_asuh')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setFormData({
                nama: data.nama || '',
                email: data.email || '',
                no_hp: data.no_hp || '',
                alamat: data.alamat || '',
                kategori_id: data.kategori_id || '',
                status: data.status
            })
        } catch (err) {
            showToast.error('Gagal memuat data: ' + err.message)
            navigate('/admin/ota')
        } finally {
            setFetching(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                nama: formData.nama,
                email: formData.email,
                no_hp: formData.no_hp,
                alamat: formData.alamat || null,
                kategori_id: formData.kategori_id || null,
                status: formData.status
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('orang_tua_asuh')
                    .update(payload)
                    .eq('id', id)
                if (error) throw error
                showToast.success('Data OTA berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('orang_tua_asuh')
                    .insert([payload])
                if (error) throw error
                showToast.success('Orang Tua Asuh baru berhasil ditambahkan')
            }
            navigate('/admin/ota')
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleInputFocus = (e) => {
        e.target.style.borderColor = '#6366f1'
        e.target.style.background = '#ffffff'
        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.25)'
    }

    const handleInputBlur = (e) => {
        e.target.style.borderColor = '#e5e7eb'
        e.target.style.background = '#fafafa'
        e.target.style.boxShadow = 'none'
    }

    if (fetching) {
        return (
            <div style={{ ...styles.container, ...styles.loadingCenter }}>
                <Spinner label="Memuat data..." />
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <div style={styles.wrapper}>
                {/* HEADER */}
                <div style={styles.header}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', transform: 'translate(30%, -50%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', transform: 'translate(-30%, 50%)' }} />

                    <div style={styles.headerContent}>
                        <div style={styles.headerInfo}>
                            <div style={styles.headerIcon}>
                                <HeartHandshake size={26} />
                            </div>
                            <div>
                                <h1 style={styles.headerTitle}>
                                    {isEdit ? 'Edit Profil OTA' : 'Registrasi OTA Baru'}
                                </h1>
                                <p style={styles.headerSubtitle}>
                                    {isEdit ? 'Perbarui informasi orang tua asuh' : 'Tambahkan data orang tua asuh baru ke sistem'}
                                </p>
                            </div>
                        </div>
                        <button
                            style={styles.backButton}
                            onClick={() => navigate('/admin/ota')}
                            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.25)'}
                            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
                        >
                            <ArrowLeft size={18} /> Kembali
                        </button>
                    </div>
                </div>

                {/* FORM CARD */}
                <div style={styles.formCard}>
                    <div style={styles.topBar} />

                    <form onSubmit={handleSubmit} style={styles.formBody}>
                        {/* Section: Informasi Pribadi */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <div style={{ ...styles.sectionIcon, background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}>
                                    <User size={18} color="#059669" />
                                </div>
                                <h3 style={styles.sectionTitle}>Informasi Pribadi</h3>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Nama Lengkap <span style={styles.required}>*</span>
                                </label>
                                <div style={styles.inputWrapper}>
                                    <User size={18} style={styles.inputIcon} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: H. Abdullah"
                                        style={styles.input}
                                        value={formData.nama}
                                        onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                        onFocus={handleInputFocus}
                                        onBlur={handleInputBlur}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Kontak & Akun */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <div style={{ ...styles.sectionIcon, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>
                                    <Mail size={18} color="#2563eb" />
                                </div>
                                <h3 style={styles.sectionTitle}>Kontak & Akun</h3>
                            </div>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Alamat Email</label>
                                    <div style={styles.inputWrapper}>
                                        <Mail size={18} style={styles.inputIcon} />
                                        <input
                                            type="email"
                                            placeholder="email@contoh.com"
                                            style={styles.input}
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                        />
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>No. WhatsApp / Telepon</label>
                                    <div style={styles.inputWrapper}>
                                        <Phone size={18} style={styles.inputIcon} />
                                        <input
                                            type="text"
                                            placeholder="08xxxxxxxxxx"
                                            style={styles.input}
                                            value={formData.no_hp}
                                            onChange={e => setFormData({ ...formData, no_hp: e.target.value })}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                        />
                                    </div>
                                    <p style={styles.helpText}>Format: 08xxxxxxxxxx atau 628xxxxxxxxxx</p>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Kategori OTA</label>
                                    <div style={styles.inputWrapper}>
                                        <Tag size={18} style={styles.inputIcon} />
                                        <select
                                            style={styles.select}
                                            value={formData.kategori_id}
                                            onChange={e => setFormData({ ...formData, kategori_id: e.target.value })}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                        >
                                            <option value="">-- Pilih Kategori --</option>
                                            {kategoriList.map(k => (
                                                <option key={k.id} value={k.id}>{k.nama}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Status Keaktifan</label>
                                    <div style={styles.inputWrapper}>
                                        <ShieldCheck size={18} style={styles.inputIcon} />
                                        <select
                                            style={styles.select}
                                            value={formData.status.toString()}
                                            onChange={e => setFormData({ ...formData, status: e.target.value === 'true' })}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                        >
                                            <option value="true">✓ Aktif</option>
                                            <option value="false">✗ Non-Aktif</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ ...styles.formGroup, ...styles.formGroupFull }}>
                                    <label style={styles.label}>Alamat Lengkap</label>
                                    <div style={styles.inputWrapper}>
                                        <MapPin size={18} style={styles.inputIconTextarea} />
                                        <textarea
                                            placeholder="Alamat lengkap OTA (opsional)"
                                            style={styles.textarea}
                                            value={formData.alamat}
                                            onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={styles.footer}>
                            <button
                                type="button"
                                style={styles.cancelBtn}
                                onClick={() => navigate('/admin/ota')}
                                onMouseEnter={e => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db' }}
                                onMouseLeave={e => { e.target.style.background = 'white'; e.target.style.borderColor = '#e5e7eb' }}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                                onMouseEnter={e => { if (!loading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)' } }}
                                onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                            >
                                {loading ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                                {isEdit ? 'Simpan Perubahan' : 'Simpan Data Baru'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

export default OTAForm
