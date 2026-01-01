import { useState, useEffect } from 'react'
import { Search, Users, Link as LinkIcon, Unlink, Filter, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import './OTA.css'

/**
 * OTA Santri Page - Data Santri Penerima
 * View active santri and their OTA connections
 */
const OTASantriPage = () => {
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [otaList, setOtaList] = useState([])
    const [kelasList, setKelasList] = useState([])
    const [connections, setConnections] = useState([])

    const [search, setSearch] = useState('')
    const [filterKelas, setFilterKelas] = useState('all')
    const [filterStatus, setFilterStatus] = useState('connected') // 'all', 'connected', 'unconnected'

    const [showLinkModal, setShowLinkModal] = useState(false)
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [selectedOta, setSelectedOta] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        setLoading(true)
        try {
            // Fetch santri aktif
            const { data: santri, error: santriErr } = await supabase
                .from('santri')
                .select('id, nis, nama, jenis_kelamin, kelas_id, status, kelas:kelas_id(id, nama)')
                .in('status', ['Aktif'])
                .order('nama')

            if (santriErr) throw santriErr

            // Fetch OTA aktif
            const { data: ota, error: otaErr } = await supabase
                .from('orang_tua_asuh')
                .select('id, nama, no_hp')
                .eq('status', true)
                .order('nama')

            if (otaErr) throw otaErr

            // Fetch existing connections
            const { data: links, error: linksErr } = await supabase
                .from('ota_santri')
                .select('id, ota_id, santri_id, ota:ota_id(nama), santri:santri_id(nama)')

            if (linksErr) throw linksErr

            // Fetch kelas for filter
            const { data: kelas, error: kelasErr } = await supabase
                .from('kelas')
                .select('id, nama')
                .order('nama')

            if (kelasErr) throw kelasErr

            setSantriList(santri || [])
            setOtaList(ota || [])
            setConnections(links || [])
            setKelasList(kelas || [])
        } catch (err) {
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // Build santri data with connection info
    const enrichedSantri = santriList.map(s => {
        const conn = connections.find(c => c.santri_id === s.id)
        return {
            ...s,
            connection: conn || null,
            otaNama: conn?.ota?.nama || null
        }
    })

    // Filter santri
    const filteredSantri = enrichedSantri.filter(s => {
        const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase()) ||
            s.nis.toLowerCase().includes(search.toLowerCase())
        const matchKelas = filterKelas === 'all' || s.kelas_id === filterKelas
        const matchStatus = filterStatus === 'all' ||
            (filterStatus === 'connected' && s.connection) ||
            (filterStatus === 'unconnected' && !s.connection)
        return matchSearch && matchKelas && matchStatus
    })

    // Stats
    const totalSantri = santriList.length
    const connectedCount = enrichedSantri.filter(s => s.connection).length
    const unconnectedCount = totalSantri - connectedCount

    const openLinkModal = (santri) => {
        setSelectedSantri(santri)
        setSelectedOta(santri.connection?.ota_id || '')
        setShowLinkModal(true)
    }

    const handleLink = async () => {
        if (!selectedSantri) return

        setSaving(true)
        try {
            // If already connected, remove old connection first
            if (selectedSantri.connection) {
                await supabase
                    .from('ota_santri')
                    .delete()
                    .eq('id', selectedSantri.connection.id)
            }

            // If new OTA selected, create connection
            if (selectedOta) {
                const { error } = await supabase
                    .from('ota_santri')
                    .insert([{
                        ota_id: selectedOta,
                        santri_id: selectedSantri.id
                    }])

                if (error) throw error
                showToast.success('Santri berhasil dihubungkan dengan OTA')
            } else {
                showToast.success('Koneksi OTA berhasil dilepas')
            }

            setShowLinkModal(false)
            fetchAllData()
        } catch (err) {
            showToast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleUnlink = async (santri) => {
        if (!santri.connection) return
        if (!confirm(`Lepas hubungan santri "${santri.nama}" dengan OTA "${santri.otaNama}"?`)) return

        try {
            const { error } = await supabase
                .from('ota_santri')
                .delete()
                .eq('id', santri.connection.id)

            if (error) throw error
            showToast.success('Koneksi berhasil dilepas')
            fetchAllData()
        } catch (err) {
            showToast.error('Gagal melepas koneksi: ' + err.message)
        }
    }

    if (loading) {
        return (
            <div className="ota-container">
                <div className="ota-loading">
                    <Spinner label="Memuat data santri..." />
                </div>
            </div>
        )
    }

    return (
        <div className="ota-container">
            {/* Header */}
            <div className="ota-header">
                <div>
                    <h1>Data Santri Penerima</h1>
                    <p>Kelola hubungan santri dengan Orang Tua Asuh</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="ota-summary-grid">
                <div className="ota-summary-card">
                    <div className="ota-summary-icon blue">
                        <Users size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Total Santri Aktif</h3>
                        <p>{totalSantri}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon green">
                        <LinkIcon size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Terhubung OTA</h3>
                        <p>{connectedCount}</p>
                    </div>
                </div>
                <div className="ota-summary-card">
                    <div className="ota-summary-icon orange">
                        <Unlink size={24} />
                    </div>
                    <div className="ota-summary-content">
                        <h3>Belum Terhubung</h3>
                        <p>{unconnectedCount}</p>
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="ota-card">
                <div className="ota-card-header">
                    <h2>Daftar Santri</h2>
                </div>

                <div className="ota-card-body">
                    {/* Filters */}
                    <div className="ota-filters">
                        <div className="ota-search">
                            <Search size={18} className="ota-search-icon" />
                            <input
                                type="text"
                                placeholder="Cari nama atau NIS..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="ota-filter-group">
                            <Filter size={16} />
                            <select
                                value={filterKelas}
                                onChange={(e) => setFilterKelas(e.target.value)}
                            >
                                <option value="all">Semua Kelas</option>
                                {kelasList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama}</option>
                                ))}
                            </select>
                        </div>

                        <div className="ota-filter-group">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">Semua Status</option>
                                <option value="connected">Terhubung OTA</option>
                                <option value="unconnected">Belum Terhubung</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="ota-table-container">
                    {filteredSantri.length > 0 ? (
                        <table className="ota-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>NIS</th>
                                    <th>Nama Santri</th>
                                    <th>Kelas</th>
                                    <th>OTA Terhubung</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSantri.map((santri, idx) => (
                                    <tr key={santri.id}>
                                        <td>{idx + 1}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.813rem' }}>{santri.nis}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <GraduationCap size={16} style={{ color: '#3b82f6' }} />
                                                <span style={{ fontWeight: 500 }}>{santri.nama}</span>
                                            </div>
                                        </td>
                                        <td>{santri.kelas?.nama || '-'}</td>
                                        <td>
                                            {santri.connection ? (
                                                <span className="ota-badge ota-badge-success">
                                                    {santri.otaNama}
                                                </span>
                                            ) : (
                                                <span className="ota-badge ota-badge-warning">
                                                    Belum terhubung
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="ota-action-buttons desktop">
                                                <button
                                                    className="ota-action-btn link"
                                                    onClick={() => openLinkModal(santri)}
                                                    title={santri.connection ? 'Ubah OTA' : 'Hubungkan OTA'}
                                                >
                                                    <LinkIcon size={16} />
                                                </button>
                                                {santri.connection && (
                                                    <button
                                                        className="ota-action-btn delete"
                                                        onClick={() => handleUnlink(santri)}
                                                        title="Lepas Koneksi"
                                                    >
                                                        <Unlink size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            {/* Mobile Menu */}
                                            <MobileActionMenu
                                                santri={santri}
                                                onLink={() => openLinkModal(santri)}
                                                onUnlink={() => handleUnlink(santri)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="ota-empty">
                            <EmptyState
                                icon={Users}
                                message={search || filterKelas !== 'all' ? 'Tidak ada santri yang cocok' : 'Belum ada data santri'}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Link Modal */}
            {showLinkModal && selectedSantri && (
                <div className="ota-modal-overlay" onClick={() => setShowLinkModal(false)}>
                    <div className="ota-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ota-modal-header">
                            <h2>Hubungkan Santri ke OTA</h2>
                            <button className="ota-modal-close" onClick={() => setShowLinkModal(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="ota-modal-body">
                            <div className="ota-form-group">
                                <label className="ota-form-label">Santri</label>
                                <input
                                    type="text"
                                    className="ota-form-input"
                                    value={`${selectedSantri.nama} (${selectedSantri.nis})`}
                                    disabled
                                />
                            </div>
                            <div className="ota-form-group">
                                <label className="ota-form-label">Pilih OTA</label>
                                <select
                                    className="ota-form-select"
                                    value={selectedOta}
                                    onChange={(e) => setSelectedOta(e.target.value)}
                                >
                                    <option value="">-- Tidak Ada (Lepas Koneksi) --</option>
                                    {otaList.map(ota => (
                                        <option key={ota.id} value={ota.id}>
                                            {ota.nama} {ota.no_hp ? `(${ota.no_hp})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="ota-modal-footer">
                            <button
                                className="ota-btn ota-btn-secondary"
                                onClick={() => setShowLinkModal(false)}
                            >
                                Batal
                            </button>
                            <button
                                className="ota-btn ota-btn-primary"
                                onClick={handleLink}
                                disabled={saving}
                            >
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Mobile Action Menu
const MobileActionMenu = ({ santri, onLink, onUnlink }) => {
    const [open, setOpen] = useState(false)

    return (
        <div className="ota-mobile-menu">
            <button className="ota-mobile-menu-trigger" onClick={() => setOpen(!open)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="19" r="1" />
                </svg>
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
                    <div className="ota-mobile-menu-dropdown">
                        <button className="ota-mobile-menu-item" onClick={() => { onLink(); setOpen(false) }}>
                            <LinkIcon size={16} />
                            {santri.connection ? 'Ubah OTA' : 'Hubungkan OTA'}
                        </button>
                        {santri.connection && (
                            <button className="ota-mobile-menu-item danger" onClick={() => { onUnlink(); setOpen(false) }}>
                                <Unlink size={16} />
                                Lepas Koneksi
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default OTASantriPage
