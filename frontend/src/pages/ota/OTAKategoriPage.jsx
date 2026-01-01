import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, X } from 'lucide-react'
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
        backdropFilter: 'blur(8px)',
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
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'all 0.2s'
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    },
    cardHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        background: 'linear-gradient(180deg, #f8fafc 0%, white 100%)'
    },
    cardTitle: {
        fontSize: '1.125rem',
        fontWeight: 600,
        color: '#1f2937',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    searchBox: {
        position: 'relative',
        minWidth: '250px'
    },
    searchInput: {
        width: '100%',
        padding: '10px 14px 10px 40px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'all 0.2s'
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
        background: 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)',
        borderBottom: '2px solid #e5e7eb'
    },
    td: {
        padding: '16px 20px',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '0.875rem',
        color: '#374151'
    },
    categoryIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
    },
    actionBtn: {
        padding: '8px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
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
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    modalHeader: {
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white',
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
    formGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: '#374151',
        marginBottom: '8px'
    },
    input: {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s'
    },
    emptyState: {
        padding: '80px 24px',
        textAlign: 'center'
    },
    emptyIcon: {
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px'
    }
}

const OTAKategoriPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState([])
    const [search, setSearch] = useState('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [formData, setFormData] = useState({ nama: '', keterangan: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('ota_kategori')
                .select('*')
                .order('nama')

            if (error) throw error
            setData(data || [])
        } catch (err) {
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const openAdd = () => {
        setEditItem(null)
        setFormData({ nama: '', keterangan: '' })
        setShowModal(true)
    }

    const openEdit = (item) => {
        setEditItem(item)
        setFormData({ nama: item.nama, keterangan: item.keterangan || '' })
        setShowModal(true)
    }

    const handleSubmit = async () => {
        if (!formData.nama.trim()) {
            showToast.error('Nama kategori harus diisi')
            return
        }

        setSaving(true)
        try {
            if (editItem) {
                const { error } = await supabase
                    .from('ota_kategori')
                    .update({ nama: formData.nama.trim(), keterangan: formData.keterangan.trim() })
                    .eq('id', editItem.id)
                if (error) throw error
                showToast.success('Kategori berhasil diperbarui')
            } else {
                const { error } = await supabase
                    .from('ota_kategori')
                    .insert([{ nama: formData.nama.trim(), keterangan: formData.keterangan.trim() }])
                if (error) throw error
                showToast.success('Kategori berhasil ditambahkan')
            }
            setShowModal(false)
            fetchData()
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (item) => {
        if (!window.confirm(`Hapus kategori "${item.nama}"?`)) return

        try {
            const { error } = await supabase
                .from('ota_kategori')
                .delete()
                .eq('id', item.id)
            if (error) throw error
            showToast.success('Kategori berhasil dihapus')
            fetchData()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const filteredData = data.filter(item =>
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        (item.keterangan || '').toLowerCase().includes(search.toLowerCase())
    )

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Spinner label="Memuat data kategori..." />
                </div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', transform: 'translate(30%, -50%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', transform: 'translate(-30%, 50%)' }} />

                <div style={styles.headerContent}>
                    <div style={styles.headerInfo}>
                        <div style={styles.headerIcon}>
                            <Tag size={26} />
                        </div>
                        <div>
                            <h1 style={styles.headerTitle}>Kategori OTA</h1>
                            <p style={styles.headerSubtitle}>Kelola master data kategori Orang Tua Asuh</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={styles.badge}>
                            <Tag size={16} />
                            {data.length} Kategori
                        </div>
                        <button
                            style={styles.addBtn}
                            onClick={openAdd}
                            onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                        >
                            <Plus size={18} /> Tambah Kategori
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>
                        <span style={{ width: '4px', height: '20px', background: 'linear-gradient(180deg, #10b981, #059669)', borderRadius: '2px' }}></span>
                        Daftar Kategori
                    </h2>
                    <div style={styles.searchBox}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Cari kategori..."
                            style={styles.searchInput}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={e => e.target.style.borderColor = '#10b981'}
                            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                        />
                    </div>
                </div>

                {/* Table */}
                {filteredData.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, width: '60px' }}>No</th>
                                    <th style={styles.th}>Nama Kategori</th>
                                    <th style={styles.th}>Keterangan</th>
                                    <th style={{ ...styles.th, width: '120px', textAlign: 'center' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        style={{ transition: 'background 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ ...styles.td, fontWeight: 500, color: '#9ca3af' }}>{idx + 1}</td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={styles.categoryIcon}>
                                                    <Tag size={16} />
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#1f2937' }}>{item.nama}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...styles.td, color: '#6b7280' }}>
                                            {item.keterangan || <span style={{ fontStyle: 'italic', color: '#9ca3af' }}>-</span>}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    style={{ ...styles.actionBtn, background: '#fef3c7', color: '#d97706' }}
                                                    onClick={() => openEdit(item)}
                                                    title="Edit"
                                                    onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    style={{ ...styles.actionBtn, background: '#fee2e2', color: '#dc2626' }}
                                                    onClick={() => handleDelete(item)}
                                                    title="Hapus"
                                                    onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
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
                        <div style={styles.emptyIcon}>
                            <Tag size={36} color="#9ca3af" />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 8px' }}>
                            {search ? 'Kategori tidak ditemukan' : 'Belum ada kategori'}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                            {search ? 'Coba kata kunci lain' : 'Klik "Tambah Kategori" untuk membuat kategori baru'}
                        </p>
                    </div>
                )}

                {/* Footer */}
                {filteredData.length > 0 && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', fontSize: '0.875rem', color: '#6b7280' }}>
                        Menampilkan {filteredData.length} dari {data.length} kategori
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={styles.modal} onClick={() => setShowModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                                {editItem ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                            </h2>
                            <button
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white', display: 'flex' }}
                                onClick={() => setShowModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Nama Kategori <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    style={styles.input}
                                    placeholder="Masukkan nama kategori"
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    onFocus={e => e.target.style.borderColor = '#10b981'}
                                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Keterangan</label>
                                <textarea
                                    style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
                                    placeholder="Keterangan tambahan (opsional)"
                                    value={formData.keterangan}
                                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                    onFocus={e => e.target.style.borderColor = '#10b981'}
                                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                />
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 500 }}
                                onClick={() => setShowModal(false)}
                            >
                                Batal
                            </button>
                            <button
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                                onClick={handleSubmit}
                                disabled={saving}
                            >
                                {saving ? 'Menyimpan...' : (editItem ? 'Simpan Perubahan' : 'Tambah Kategori')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default OTAKategoriPage
