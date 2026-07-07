import { useState, useEffect } from 'react'
import { Search, Users, Plus, Trash2, Filter, CheckCircle, XCircle, ToggleLeft, ToggleRight, GraduationCap, Calendar, MoreVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/ui/Spinner'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import './OTASantriPage.css'

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
        if (showModal) {
            document.body.classList.add('modal-open')
        } else {
            document.body.classList.remove('modal-open')
        }
        return () => document.body.classList.remove('modal-open')
    }, [showModal])

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
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, nis, status')
                .order('nama')

            if (error) {
                console.error('Error fetching santri:', error)
                return
            }

            const activeSantri = (data || []).filter(s =>
                s.status === 'aktif' || s.status === 'Aktif' || s.status === true
            )
            setAllSantri(activeSantri)
        } catch (err) {
            console.error('fetchAllSantri error:', err)
            setAllSantri([])
        }
    }

    const availableSantri = allSantri.filter(s =>
        !data.some(d => d.santri_id === s.id)
    )

    // Save/Add Confirmation State
    const [saveModal, setSaveModal] = useState({ isOpen: false })

    const confirmAddPenerima = () => {
        if (!selectedSantri) {
            showToast.error('Pilih santri terlebih dahulu')
            return
        }
        setSaveModal({ isOpen: true })
    }

    const executeAddPenerima = async () => {
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
            setSaveModal({ isOpen: false })
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

    // Delete Confirmation State
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        id: null
    })

    const openDeleteModal = (id) => {
        setDeleteModal({ isOpen: true, id })
    }

    const handleDelete = async () => {
        const id = deleteModal.id
        if (!id) return

        try {
            const { error } = await supabase
                .from('santri_penerima_ota')
                .delete()
                .eq('id', id)
            if (error) throw error
            showToast.success('Data berhasil dihapus')
            fetchData()
            setDeleteModal({ isOpen: false, id: null })
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    const filteredData = data.filter(item => {
        const matchSearch = (item.santri?.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.santri?.nis || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchStatus = filterStatus === 'all' || item.status === filterStatus
        return matchSearch && matchStatus
    })

    const activeCount = data.filter(d => d.status === 'aktif').length
    const inactiveCount = data.filter(d => d.status === 'nonaktif').length

    return (
        <div className="ota-container ota-santri-page">
            {/* Header */}
            <div className="ota-page-header">
                <div className="ota-header-bg-1" />
                <div className="ota-header-bg-2" />

                <div className="ota-header-content">
                    <div className="ota-header-info">
                        <div className="ota-header-icon">
                            <Users size={26} />
                        </div>
                        <div className="ota-header-title">
                            <h1>Data Santri OTA</h1>
                            <p>Manajemen penerima dana Pool Orang Tua Asuh</p>
                        </div>
                    </div>
                    <div className="ota-header-actions">
                        <div className="ota-badge">
                            <CheckCircle size={16} /> {activeCount} Aktif
                        </div>
                        <button className="ota-refresh-btn" onClick={fetchData}>
                            <Filter size={16} /> Refresh
                        </button>
                    </div>
                </div>

                <button className="ota-add-btn" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Tambah Penerima
                </button>
            </div>


            {/* Stats Grid */}
            <div className="ota-stats-grid">
                <div className="ota-stat-card">
                    <div className="ota-stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="ota-stat-label">Total Penerima</div>
                        <div className="ota-stat-value" style={{ color: '#10b981' }}>{data.length}</div>
                    </div>
                </div>
                <div className="ota-stat-card">
                    <div className="ota-stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div className="ota-stat-label">Penerima Aktif</div>
                        <div className="ota-stat-value" style={{ color: '#2563eb' }}>{activeCount}</div>
                    </div>
                </div>
                <div className="ota-stat-card">
                    <div className="ota-stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <XCircle size={24} />
                    </div>
                    <div>
                        <div className="ota-stat-label">Non-Aktif</div>
                        <div className="ota-stat-value" style={{ color: '#d97706' }}>{inactiveCount}</div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="ota-main-card">
                {/* Filter Bar */}
                <div className="ota-filter-bar">
                    <div className="ota-search-box">
                        <Search size={18} className="ota-search-icon" />
                        <input
                            type="text"
                            placeholder="Cari nama santri..."
                            className="ota-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                        <select className="ota-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">Semua Status</option>
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Non-Aktif</option>
                        </select>
                        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                            {filteredData.length} data
                        </span>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Spinner label="Memuat data..." />
                    </div>
                ) : filteredData.length > 0 ? (
                    <>
                        <div className="table-container no-print">
                            <ResponsiveTable
                                columns={[
                                    {
                                        header: 'Santri',
                                        render: (row) => (
                                            <div className="ota-user-cell">
                                                <div className="ota-avatar" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                                    {row.santri?.nama?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="ota-user-info">
                                                    <div>{row.santri?.nama}</div>
                                                    <div className="ota-user-details">
                                                        <span>NIS: {row.santri?.nis}</span>
                                                        {row.santri?.kelas?.nama && <span>• {row.santri.kelas.nama}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                        className: 'ota-td'
                                    },
                                    {
                                        header: 'Status',
                                        render: (row) => (
                                            <span className={`ota-status-badge ${row.status === 'aktif' ? 'ota-status-active' : 'ota-status-inactive'}`}>
                                                {row.status === 'aktif' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                {row.status === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        ),
                                        className: 'ota-td'
                                    },
                                    {
                                        header: 'Tanggal Mulai',
                                        render: (row) => row.tanggal_mulai ? new Date(row.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
                                        className: 'ota-td',
                                        hideOnMobile: true
                                    },
                                    {
                                        header: 'Tanggal Selesai',
                                        render: (row) => row.tanggal_selesai ? new Date(row.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
                                        className: 'ota-td',
                                        hideOnMobile: true
                                    },
                                    {
                                        header: 'Aksi',
                                        render: (row) => (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className={`ota-action-btn ota-btn-toggle ${row.status === 'aktif' ? 'active' : 'inactive'}`}
                                                    onClick={() => handleToggleStatus(row)}
                                                    title={row.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {row.status === 'aktif' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                </button>
                                                <button
                                                    className="ota-action-btn ota-btn-delete"
                                                    onClick={() => openDeleteModal(row.id)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ),
                                        className: 'ota-td',
                                        style: { textAlign: 'center' },
                                        hideOnMobile: false
                                    }
                                ]}
                                data={filteredData}
                                loading={loading}
                                mobileCardHeader={(row) => (
                                    <div className="ota-mobile-header" style={{ width: '100%' }}>
                                        <div className="ota-user-cell">
                                            <div className="ota-avatar" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                                {row.santri?.nama?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="ota-user-info">
                                                <div>{row.santri?.nama}</div>
                                                <div className="ota-user-details">
                                                    NIS: {row.santri?.nis}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`ota-status-badge ${row.status === 'aktif' ? 'ota-status-active' : 'ota-status-inactive'}`}>
                                            {row.status === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </div>
                                )}
                                mobileCardContent={(row) => (
                                    <div className="w-full mt-3">
                                        <div style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <Calendar size={14} />
                                            Mulai: {row.tanggal_mulai ? new Date(row.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                        </div>
                                        <div className="ota-mobile-footer" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="ota-action-btn ota-btn-delete"
                                                onClick={() => openDeleteModal(row.id)}
                                            >
                                                <Trash2 size={16} /> Hapus
                                            </button>
                                            <button
                                                className={`ota-action-btn ota-btn-toggle ${row.status === 'aktif' ? '' : 'inactive'}`}
                                                style={{ background: 'none', border: '1px solid #e2e8f0' }}
                                                onClick={() => handleToggleStatus(row)}
                                            >
                                                {row.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    </>
                ) : (
                    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#94a3b8' }}>
                            <Users size={40} />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Belum ada data</h3>
                        <p style={{ color: '#64748b' }}>Belum ada santri yang ditambahkan ke daftar penerima.</p>
                    </div>
                )}
            </div>

            {/* Modal Styles are mostly structural, can keep inline for now or move to CSS if desired. 
                For speed/stability, let's keep modal basic styles inline or add minimal classes. 
                I will skip refactoring modal completely to save tokens/risk, as user asked for visual fix on the main page. 
                But I should ensure the modal works. I'll just keep the modal code relatively same but clean it up.
            */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-5">Tambah Penerima OTA</h2>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>Pilih Santri</label>
                            <select
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }}
                                value={selectedSantri}
                                onChange={(e) => setSelectedSantri(e.target.value)}
                            >
                                <option value="">-- Pilih Santri --</option>
                                {availableSantri.map(s => (
                                    <option key={s.id} value={s.id}>{s.nama}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>Tanggal Mulai</label>
                            <input
                                type="date"
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }}
                                value={tanggalMulai}
                                onChange={e => setTanggalMulai(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl bg-slate-100 font-semibold hover:bg-slate-200 transition-colors">Batal</button>
                            <button onClick={confirmAddPenerima} disabled={saving} className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                onConfirm={handleDelete}
                itemName="Santri ini"
                title="Hapus Penerima OTA"
                message="Yakin ingin menghapus santri ini dari daftar penerima OTA? Data santri tidak akan terhapus dari sistem, hanya status penerimanya."
            />

            <ConfirmationModal
                isOpen={saveModal.isOpen}
                onClose={() => setSaveModal({ isOpen: false })}
                onConfirm={executeAddPenerima}
                title="Konfirmasi Tambah"
                message="Apakah Anda yakin ingin menambahkan santri ini sebagai penerima OTA?"
                confirmLabel="Tambah Santri"
                variant="success"
                isLoading={saving}
            />
        </div >
    )
}

export default OTASantriPage
