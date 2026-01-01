import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Link as LinkIcon, User, Phone, Mail, Tag, HeartHandshake, Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../context/ToastContext'
import Spinner from '../../../components/ui/Spinner'

// Inline styles for consistent display
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
        padding: '12px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.2)',
        backdropFilter: 'blur(8px)'
    },
    headerTitle: {
        fontSize: '1.75rem',
        fontWeight: 700,
        margin: 0
    },
    headerSubtitle: {
        fontSize: '0.95rem',
        color: 'rgba(255,255,255,0.85)',
        margin: '4px 0 0 0'
    },
    headerActions: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    badge: {
        padding: '8px 16px',
        borderRadius: '12px',
        fontSize: '0.875rem',
        fontWeight: 500,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    addButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '12px',
        fontWeight: 600,
        background: 'white',
        color: '#059669',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'all 0.2s'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
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
    tableCard: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    tableHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #f3f4f6',
        background: 'linear-gradient(180deg, #f8fafc 0%, white 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
    },
    tableTitle: {
        fontSize: '1.125rem',
        fontWeight: 600,
        color: '#1f2937',
        margin: 0
    },
    tableSubtitle: {
        fontSize: '0.875rem',
        color: '#6b7280',
        margin: '4px 0 0 0'
    },
    searchBox: {
        position: 'relative',
        width: '320px'
    },
    searchIcon: {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9ca3af'
    },
    searchInput: {
        width: '100%',
        padding: '10px 16px 10px 44px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'all 0.2s'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '16px 24px',
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
        padding: '16px 24px',
        borderBottom: '1px solid #f3f4f6',
        verticalAlign: 'middle'
    },
    avatar: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: '0.875rem',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        boxShadow: '0 4px 8px rgba(16,185,129,0.25)'
    },
    nameLink: {
        fontWeight: 600,
        color: '#1f2937',
        cursor: 'pointer',
        transition: 'color 0.2s'
    },
    idText: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        marginTop: '2px'
    },
    contactRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.875rem',
        color: '#4b5563',
        marginBottom: '6px'
    },
    contactIcon: {
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    categoryBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        color: '#047857',
        border: '1px solid #a7f3d0'
    },
    santriCount: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: 600
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 500
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%'
    },
    actionsCell: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px'
    },
    actionBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
    },
    footer: {
        padding: '16px 24px',
        borderTop: '1px solid #f3f4f6',
        background: '#fafafa',
        fontSize: '0.875rem',
        color: '#6b7280'
    },
    emptyState: {
        padding: '64px 24px',
        textAlign: 'center'
    },
    emptyIcon: {
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px'
    }
}

const OTAList = () => {
    const navigate = useNavigate()
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [otas, setOtas] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [hoveredRow, setHoveredRow] = useState(null)

    useEffect(() => {
        fetchOtas()
    }, [])

    const fetchOtas = async () => {
        try {
            const { data, error } = await supabase
                .from('orang_tua_asuh')
                .select(`
                    *,
                    kategori:kategori_id(id, nama),
                    ota_santri (
                        count
                    )
                `)
                .order('nama', { ascending: true })

            if (error) throw error
            setOtas(data || [])
        } catch (err) {
            showToast.error('Gagal memuat data OTA: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id, nama) => {
        if (!window.confirm(`Yakin ingin menonaktifkan OTA ${nama}?`)) return

        try {
            const { error } = await supabase
                .from('orang_tua_asuh')
                .update({ status: false })
                .eq('id', id)

            if (error) throw error
            showToast.success('OTA berhasil dinonaktifkan')
            fetchOtas()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const filteredOtas = otas.filter(ota =>
        ota.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ota.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const activeCount = otas.filter(o => o.status).length
    const totalSantri = otas.reduce((sum, o) => sum + (o.ota_santri?.[0]?.count || 0), 0)

    if (loading) {
        return (
            <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Spinner label="Memuat Data Orang Tua Asuh..." />
            </div>
        )
    }

    return (
        <div style={styles.container}>
            {/* HEADER */}
            <div style={styles.header}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', transform: 'translate(30%, -50%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '150px', height: '150px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', transform: 'translate(-30%, 50%)' }} />

                <div style={styles.headerContent}>
                    <div style={styles.headerInfo}>
                        <div style={styles.headerIcon}>
                            <HeartHandshake size={28} />
                        </div>
                        <div>
                            <h1 style={styles.headerTitle}>Data Orang Tua Asuh</h1>
                            <p style={styles.headerSubtitle}>Kelola profil donatur dan relasi santri binaan</p>
                        </div>
                    </div>
                    <div style={styles.headerActions}>
                        <div style={styles.badge}>
                            <Users size={16} />
                            {activeCount} OTA Aktif
                        </div>
                        <button
                            style={styles.addButton}
                            onClick={() => navigate('/admin/ota/create')}
                            onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                        >
                            <Plus size={18} /> Tambah OTA Baru
                        </button>
                    </div>
                </div>
            </div>

            {/* STATS GRID */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <div style={styles.statLabel}>Total OTA</div>
                        <div style={styles.statValue}>{otas.length}</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <User size={22} />
                    </div>
                    <div>
                        <div style={styles.statLabel}>OTA Aktif</div>
                        <div style={styles.statValue}>{activeCount}</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                        <HeartHandshake size={22} />
                    </div>
                    <div>
                        <div style={styles.statLabel}>Santri Binaan</div>
                        <div style={styles.statValue}>{totalSantri}</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <Tag size={22} />
                    </div>
                    <div>
                        <div style={styles.statLabel}>Non-Aktif</div>
                        <div style={styles.statValue}>{otas.length - activeCount}</div>
                    </div>
                </div>
            </div>

            {/* TABLE CARD */}
            <div style={styles.tableCard}>
                {/* Table Header */}
                <div style={styles.tableHeader}>
                    <div>
                        <h2 style={styles.tableTitle}>Daftar Orang Tua Asuh</h2>
                        <p style={styles.tableSubtitle}>{filteredOtas.length} data ditemukan</p>
                    </div>
                    <div style={styles.searchBox}>
                        <Search size={18} style={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Cari nama, email, atau no hp..."
                            style={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={(e) => e.target.style.borderColor = '#10b981'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Profil OTA</th>
                                <th style={styles.th}>Kontak</th>
                                <th style={styles.th}>Kategori</th>
                                <th style={styles.th}>Binaan</th>
                                <th style={styles.th}>Status</th>
                                <th style={{ ...styles.th, textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOtas.length > 0 ? (
                                filteredOtas.map((ota, idx) => (
                                    <tr
                                        key={ota.id}
                                        style={{
                                            background: hoveredRow === ota.id
                                                ? 'linear-gradient(90deg, rgba(16,185,129,0.04) 0%, rgba(16,185,129,0.08) 50%, rgba(16,185,129,0.04) 100%)'
                                                : idx % 2 === 0 ? '#ffffff' : '#fafafa'
                                        }}
                                        onMouseEnter={() => setHoveredRow(ota.id)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                    >
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={styles.avatar}>
                                                    {ota.nama?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div
                                                        style={styles.nameLink}
                                                        onClick={() => navigate(`/admin/ota/${ota.id}`)}
                                                        onMouseEnter={e => e.target.style.color = '#10b981'}
                                                        onMouseLeave={e => e.target.style.color = '#1f2937'}
                                                    >
                                                        {ota.nama}
                                                    </div>
                                                    <div style={styles.idText}>ID: {ota.id.slice(0, 8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.contactRow}>
                                                <div style={styles.contactIcon}>
                                                    <Mail size={12} color="#6b7280" />
                                                </div>
                                                {ota.email || '-'}
                                            </div>
                                            <div style={{ ...styles.contactRow, marginBottom: 0 }}>
                                                <div style={styles.contactIcon}>
                                                    <Phone size={12} color="#6b7280" />
                                                </div>
                                                {ota.no_hp || '-'}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            {ota.kategori ? (
                                                <span style={styles.categoryBadge}>
                                                    <Tag size={12} />
                                                    {ota.kategori.nama}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#9ca3af', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                                    Belum dikategorikan
                                                </span>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.santriCount,
                                                background: ota.ota_santri?.[0]?.count > 0
                                                    ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                                                    : '#f3f4f6',
                                                color: ota.ota_santri?.[0]?.count > 0 ? '#1d4ed8' : '#6b7280',
                                                border: ota.ota_santri?.[0]?.count > 0 ? '1px solid #bfdbfe' : '1px solid #e5e7eb'
                                            }}>
                                                <User size={12} />
                                                {ota.ota_santri?.[0]?.count || 0} Santri
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                background: ota.status
                                                    ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                                                    : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                                color: ota.status ? '#047857' : '#dc2626',
                                                border: ota.status ? '1px solid #a7f3d0' : '1px solid #fecaca'
                                            }}>
                                                <span style={{
                                                    ...styles.statusDot,
                                                    background: ota.status ? '#10b981' : '#ef4444',
                                                    animation: ota.status ? 'pulse 2s infinite' : 'none'
                                                }} />
                                                {ota.status ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'right' }}>
                                            <div style={styles.actionsCell}>
                                                <button
                                                    title="Hubungkan Santri"
                                                    style={{ ...styles.actionBtn, background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', color: '#0284c7' }}
                                                    onClick={() => navigate(`/admin/ota/${ota.id}/link`)}
                                                    onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                                >
                                                    <LinkIcon size={16} />
                                                </button>
                                                <button
                                                    title="Edit Profil"
                                                    style={{ ...styles.actionBtn, background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}
                                                    onClick={() => navigate(`/admin/ota/${ota.id}/edit`)}
                                                    onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    title={ota.status ? "Nonaktifkan" : "Aktifkan"}
                                                    style={{ ...styles.actionBtn, background: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#dc2626' }}
                                                    onClick={() => handleDelete(ota.id, ota.nama)}
                                                    onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={styles.emptyState}>
                                        <div style={styles.emptyIcon}>
                                            <User size={36} color="#9ca3af" />
                                        </div>
                                        <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 8px' }}>
                                            Tidak ada data ditemukan
                                        </p>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 16px' }}>
                                            Coba kata kunci lain atau tambah OTA baru.
                                        </p>
                                        <button
                                            style={{ ...styles.addButton, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
                                            onClick={() => navigate('/admin/ota/create')}
                                        >
                                            <Plus size={16} /> Tambah OTA
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {filteredOtas.length > 0 && (
                    <div style={styles.footer}>
                        Menampilkan <strong>{filteredOtas.length}</strong> dari <strong>{otas.length}</strong> data
                    </div>
                )}
            </div>

            {/* Pulse Animation CSS */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    )
}

export default OTAList
