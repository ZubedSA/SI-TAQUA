import { useState, useEffect } from 'react'
import { Search, Users, Plus, Trash2, Filter, CheckCircle, XCircle, ToggleLeft, ToggleRight, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'

const styles = {
    container: {
        padding: '24px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
    },
    header: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
        boxShadow: '0 10px 40px -10px rgba(16, 185, 129, 0.5)',
        marginBottom: '24px'
    },
    headerContent: {
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: '1.5rem',
        fontWeight: 700,
        margin: 0
    },
    headerSubtitle: {
        fontSize: '0.9rem',
        color: 'rgba(255,255,255,0.85)',
        margin: '4px 0 0 0'
    },
    badge: {
        padding: '8px 16px',
        borderRadius: '10px',
        fontSize: '0.875rem',
        fontWeight: 500,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    addBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        borderRadius: '12px',
        fontWeight: 600,
        background: 'white',
        color: '#059669',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
    },
    statCard: {
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    statIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
    },
    statLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px'
    },
    statValue: {
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#1f2937'
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    },
    filterBar: {
        padding: '20px 24px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
    },
    searchBox: {
        position: 'relative',
        flex: 1,
        minWidth: '200px',
        maxWidth: '320px'
    },
    searchInput: {
        width: '100%',
        padding: '10px 14px 10px 40px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.875rem',
        outline: 'none'
    },
    select: {
        padding: '10px 14px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.875rem',
        background: 'white',
        cursor: 'pointer'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '14px 20px',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
    },
    td: {
        padding: '16px 20px',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '0.875rem'
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize: '0.8rem'
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 500
    },
    toggleBtn: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.8rem',
        fontWeight: 500,
        transition: 'all 0.2s'
    },
    modal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modalContent: {
        background: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
    },
    modalHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalBody: {
        padding: '24px'
    },
    modalFooter: {
        padding: '16px 24px',
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
    },
    emptyState: {
        padding: '80px 24px',
        textAlign: 'center'
    }
}

const OTASantriPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState([])
    const [allSantri, setAllSantri] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [selectedSantri, setSelectedSantri] = useState('')
    const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
        fetchAllSantri()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('santri_penerima_ota')
                .select(`
                    *,
                    santri:santri_id(id, nama, nis, kelas:kelas_id(nama))
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setData(data || [])
        } catch (err) {
            console.log('Info: santri_penerima_ota table may not exist yet')
            setData([])
        } finally {
            setLoading(false)
        }
    }

    const fetchAllSantri = async () => {
        try {
            // Fetch all santri (try without status filter first for debugging)
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, status')
                .order('nama')

            if (error) {
                console.error('Error fetching santri:', error)
                return
            }

            console.log('All santri fetched:', data?.length, 'records')

            // Filter active santri (status could be 'aktif' or true or 'Aktif')
            const activeSantri = (data || []).filter(s =>
                s.status === 'aktif' || s.status === 'Aktif' || s.status === true
            )

            console.log('Active santri:', activeSantri.length, 'records')
            setAllSantri(activeSantri)
        } catch (err) {
            console.error('fetchAllSantri error:', err)
            setAllSantri([])
        }
    }

    // Get santri yang belum menjadi penerima
    const availableSantri = allSantri.filter(s =>
        !data.some(d => d.santri_id === s.id)
    )

    const handleAddPenerima = async () => {
        if (!selectedSantri) {
            showToast.error('Pilih santri terlebih dahulu')
            return
        }

        setSaving(true)
        try {
            const { error } = await supabase
                .from('santri_penerima_ota')
                .insert([{
                    santri_id: selectedSantri,
                    status: 'aktif',
                    tanggal_mulai: tanggalMulai
                }])

            if (error) throw error
            showToast.success('Santri berhasil ditambahkan sebagai penerima OTA')
            setShowModal(false)
            setSelectedSantri('')
            fetchData()
        } catch (err) {
            showToast.error('Gagal menambahkan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleToggleStatus = async (item) => {
        const newStatus = item.status === 'aktif' ? 'nonaktif' : 'aktif'
        const updateData = { status: newStatus }

        if (newStatus === 'nonaktif') {
            updateData.tanggal_selesai = new Date().toISOString().split('T')[0]
        } else {
            updateData.tanggal_selesai = null
        }

        try {
            const { error } = await supabase
                .from('santri_penerima_ota')
                .update(updateData)
                .eq('id', item.id)

            if (error) throw error
            showToast.success(`Status diubah menjadi ${newStatus}`)
            fetchData()
        } catch (err) {
            showToast.error('Gagal mengubah status: ' + err.message)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus santri dari daftar penerima?')) return

        try {
            const { error } = await supabase
                .from('santri_penerima_ota')
                .delete()
                .eq('id', id)
            if (error) throw error
            showToast.success('Data berhasil dihapus')
            fetchData()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    // Filter data
    const filteredData = data.filter(item => {
        const matchSearch = (item.santri?.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.santri?.nis || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchStatus = filterStatus === 'all' || item.status === filterStatus
        return matchSearch && matchStatus
    })

    const activeCount = data.filter(d => d.status === 'aktif').length
    const inactiveCount = data.filter(d => d.status === 'nonaktif').length

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', transform: 'translate(30%, -50%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', transform: 'translate(-30%, 50%)' }} />

                <div style={styles.headerContent}>
                    <div style={styles.headerInfo}>
                        <div style={styles.headerIcon}>
                            <Users size={26} />
                        </div>
                        <div>
                            <h1 style={styles.headerTitle}>Data Santri Penerima OTA</h1>
                            <p style={styles.headerSubtitle}>Daftar santri yang menerima dana dari Pool OTA</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={styles.badge}>
                            <CheckCircle size={16} />
                            {activeCount} Aktif
                        </div>
                        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
                            <Plus size={18} /> Tambah Penerima
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <div style={styles.statLabel}>Total Penerima</div>
                        <div style={styles.statValue}>{data.length}</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <div style={styles.statLabel}>Penerima Aktif</div>
                        <div style={styles.statValue}>{activeCount}</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <XCircle size={22} />
                    </div>
                    <div>
                        <div style={styles.statLabel}>Non-Aktif</div>
                        <div style={styles.statValue}>{inactiveCount}</div>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div style={styles.card}>
                {/* Filter Bar */}
                <div style={styles.filterBar}>
                    <div style={styles.searchBox}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Cari nama atau NIS..."
                            style={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} color="#6b7280" />
                        <select style={styles.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">Semua Status</option>
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Non-Aktif</option>
                        </select>
                    </div>

                    <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#6b7280' }}>
                        {filteredData.length} data
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Spinner label="Memuat data..." />
                    </div>
                ) : filteredData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Santri</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Tanggal Mulai</th>
                                    <th style={styles.th}>Tanggal Selesai</th>
                                    <th style={{ ...styles.th, textAlign: 'center' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item) => (
                                    <tr key={item.id}>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ ...styles.avatar, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                                    {item.santri?.nama?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{item.santri?.nama}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                        NIS: {item.santri?.nis} • {item.santri?.kelas?.nama || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                background: item.status === 'aktif' ? '#d1fae5' : '#fee2e2',
                                                color: item.status === 'aktif' ? '#047857' : '#dc2626'
                                            }}>
                                                {item.status === 'aktif' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                {item.status === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            {item.tanggal_mulai ? new Date(item.tanggal_mulai).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                        <td style={styles.td}>
                                            {item.tanggal_selesai ? new Date(item.tanggal_selesai).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    style={{
                                                        ...styles.toggleBtn,
                                                        background: item.status === 'aktif' ? '#fef3c7' : '#d1fae5',
                                                        color: item.status === 'aktif' ? '#b45309' : '#047857'
                                                    }}
                                                    onClick={() => handleToggleStatus(item)}
                                                    title={item.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {item.status === 'aktif' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                    {item.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                                </button>
                                                <button
                                                    style={{ padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#dc2626' }}
                                                    onClick={() => handleDelete(item.id)}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Users size={36} color="#9ca3af" />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 8px' }}>
                            Belum ada santri penerima OTA
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                            Klik "Tambah Penerima" untuk menandai santri sebagai penerima dana OTA.
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '8px' }}>
                            Pastikan SQL migration sudah dijalankan di Supabase.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Tambah Penerima */}
            {showModal && (
                <div style={styles.modal} onClick={() => setShowModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                                Tambah Santri Penerima OTA
                            </h2>
                            <button
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#6b7280' }}
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                    Pilih Santri <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '0.9rem' }}
                                    value={selectedSantri}
                                    onChange={(e) => setSelectedSantri(e.target.value)}
                                >
                                    <option value="">-- Pilih Santri ({allSantri.length} tersedia) --</option>
                                    {availableSantri.map(s => (
                                        <option key={s.id} value={s.id}>{s.nama} (NIS: {s.nis})</option>
                                    ))}
                                </select>
                                {allSantri.length === 0 && (
                                    <p style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '8px' }}>
                                        ⚠️ Tidak ada data santri. Pastikan ada santri aktif di database dan RLS mengizinkan akses.
                                    </p>
                                )}
                                {allSantri.length > 0 && availableSantri.length === 0 && (
                                    <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '8px' }}>
                                        Semua santri aktif sudah terdaftar sebagai penerima.
                                    </p>
                                )}
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                                    Tanggal Mulai Menerima
                                </label>
                                <input
                                    type="date"
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '0.9rem' }}
                                    value={tanggalMulai}
                                    onChange={(e) => setTanggalMulai(e.target.value)}
                                />
                            </div>

                            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <CheckCircle size={20} color="#16a34a" style={{ marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem' }}>Info:</div>
                                        <p style={{ fontSize: '0.8rem', color: '#166534', margin: '4px 0 0' }}>
                                            Santri yang ditambahkan akan menerima dana dari Pool OTA bersama.
                                            Dana tidak terikat ke donatur tertentu.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}
                                onClick={() => setShowModal(false)}
                            >
                                Batal
                            </button>
                            <button
                                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                                onClick={handleAddPenerima}
                                disabled={saving || !selectedSantri}
                            >
                                {saving ? 'Menyimpan...' : 'Tambah Penerima'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OTASantriPage
