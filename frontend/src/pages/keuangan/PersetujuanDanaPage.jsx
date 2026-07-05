import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Search, RefreshCw, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logUpdate } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { useToast } from '../../context/ToastContext'
import './Keuangan.css'

const PersetujuanDanaPage = () => {
    const { user, role, userProfile } = useAuth()
    const showToast = useToast()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [action, setAction] = useState('')
    const [form, setForm] = useState({
        jumlah_disetujui: '',
        catatan_persetujuan: ''
    })

    // Pengasuh can approve, Bendahara cannot (hidden)
    const activeRole = userProfile?.activeRole || role || 'guest'
    const canApprove = activeRole === 'admin' || activeRole === 'pengasuh'

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: result, error } = await supabase
                .from('anggaran')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setData(result || [])
        } catch {
            showToast.error('Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    const openApproval = (item, actionType) => {
        setSelectedItem(item)
        setAction(actionType)
        setForm({
            jumlah_disetujui: actionType === 'approve' ? item.jumlah_diajukan.toString() : '',
            catatan_persetujuan: ''
        })
        setShowModal(true)
    }

    // Modals State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false })
    const [processing, setProcessing] = useState(false)

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setConfirmModal({ isOpen: true })
    }

    const executeApproval = async () => {
        setProcessing(true)
        try {
            const payload = {
                status: action === 'approve' ? 'Disetujui' : 'Ditolak',
                jumlah_disetujui: action === 'approve' ? parseFloat(form.jumlah_disetujui) : 0,
                catatan_persetujuan: form.catatan_persetujuan,
                tanggal_persetujuan: new Date().toISOString().split('T')[0],
                disetujui_oleh: user?.id
            }

            const { error } = await supabase.from('anggaran').update(payload).eq('id', selectedItem.id)
            if (error) throw error

            // Audit Log - UPDATE (approval/rejection)
            await logUpdate(
                'anggaran',
                selectedItem.nama_program,
                `${action === 'approve' ? 'Setujui' : 'Tolak'} anggaran: ${selectedItem.nama_program} - Rp ${Number(action === 'approve' ? form.jumlah_disetujui : selectedItem.jumlah_diajukan).toLocaleString('id-ID')}`,
                { status: selectedItem.status, jumlah_disetujui: selectedItem.jumlah_disetujui },
                { status: payload.status, jumlah_disetujui: payload.jumlah_disetujui }
            )

            setConfirmModal({ isOpen: false })
            setShowModal(false)
            fetchData()

            if (action === 'approve') {
                showToast.success('Anggaran berhasil disetujui!')
            } else {
                showToast.error('Anggaran ditolak!')
            }
        } catch (err) {
            showToast.error('Error: ' + err.message)
        } finally {
            setProcessing(false)
        }
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Disetujui': return 'disetujui'
            case 'Ditolak': return 'ditolak'
            case 'Selesai': return 'lunas'
            default: return 'pending'
        }
    }

    const pendingCount = data.filter(d => d.status === 'Pending').length
    const approvedCount = data.filter(d => d.status === 'Disetujui').length
    const rejectedCount = data.filter(d => d.status === 'Ditolak').length

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <CheckCircle className="title-icon green" /> Persetujuan Dana
                    </h1>
                    <p className="page-subtitle">Setujui atau tolak pengajuan anggaran</p>
                </div>
            </div>

            <div className="summary-grid">
                <div className="summary-card yellow">
                    <div className="summary-content">
                        <span className="summary-label">Menunggu Persetujuan</span>
                        <span className="summary-value">{pendingCount}</span>
                    </div>
                    <Clock size={40} className="summary-icon" />
                </div>
                <div className="summary-card green">
                    <div className="summary-content">
                        <span className="summary-label">Disetujui</span>
                        <span className="summary-value">{approvedCount}</span>
                    </div>
                    <CheckCircle size={40} className="summary-icon" />
                </div>
                <div className="summary-card red">
                    <div className="summary-content">
                        <span className="summary-label">Ditolak</span>
                        <span className="summary-value">{rejectedCount}</span>
                    </div>
                    <XCircle size={40} className="summary-icon" />
                </div>
            </div>

            <div className="filters-bar">
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : data.length === 0 ? (
                    <div className="empty-state">Belum ada pengajuan</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="table-wrapper desktop-table-only">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>Program</th>
                                        <th>Jumlah Diajukan</th>
                                        <th>Tanggal</th>
                                        <th>Status</th>
                                        {canApprove && <th>Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, i) => (
                                        <tr key={item.id}>
                                            <td>{i + 1}</td>
                                            <td>
                                                <div className="cell-santri">
                                                    <strong>{item.nama_program}</strong>
                                                    <small>{item.deskripsi?.substring(0, 50) || '-'}</small>
                                                </div>
                                            </td>
                                            <td className="amount">Rp {Number(item.jumlah_diajukan).toLocaleString('id-ID')}</td>
                                            <td>{new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID')}</td>
                                            <td><span className={`status-badge ${getStatusClass(item.status)}`}>{item.status}</span></td>
                                            {canApprove && (
                                                <td>
                                                    <MobileActionMenu
                                                        actions={[
                                                            { label: 'Setujui', icon: <CheckCircle size={14} />, onClick: () => openApproval(item, 'approve') },
                                                            { label: 'Tolak', icon: <XCircle size={14} />, onClick: () => openApproval(item, 'reject'), danger: true }
                                                        ]}
                                                    >
                                                        <button
                                                            onClick={() => openApproval(item, 'approve')}
                                                            title="Setujui"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '6px',
                                                                background: '#dcfce7',
                                                                color: '#16a34a',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                marginRight: '4px'
                                                            }}
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openApproval(item, 'reject')}
                                                            title="Tolak"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '6px',
                                                                background: '#fee2e2',
                                                                color: '#dc2626',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </MobileActionMenu>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="mobile-card-only hidden mobile-card-list">
                            {data.map((item, i) => (
                                <div key={item.id} className="mobile-data-card">
                                    <div className="mobile-card-row">
                                        <div>
                                            <h4 className="mobile-card-title text-gray-900 font-bold">{item.nama_program}</h4>
                                            <div className="text-[10px] text-gray-500 mt-1">
                                                {new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="mobile-card-amount text-gray-900 font-bold">
                                                Rp {Number(item.jumlah_diajukan).toLocaleString('id-ID')}
                                            </div>
                                            <div className="mt-1">
                                                <span className={`status-badge ${getStatusClass(item.status)}`}>{item.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {item.deskripsi && (
                                        <p className="mobile-card-desc">{item.deskripsi}</p>
                                    )}

                                    {canApprove && item.status === 'Pending' && (
                                        <div className="mobile-card-row items-center pt-2 border-t border-gray-100 mt-1">
                                            <div className="mobile-card-meta">
                                                <span>No: {i + 1}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openApproval(item, 'approve')}
                                                    className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold transition-colors"
                                                >
                                                    Setujui
                                                </button>
                                                <button
                                                    onClick={() => openApproval(item, 'reject')}
                                                    className="px-3 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold transition-colors"
                                                >
                                                    Tolak
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {showModal && selectedItem && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{action === 'approve' ? '✅ Setujui Anggaran' : '❌ Tolak Anggaran'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="modal-body">
                                <div className="info-box">
                                    <p><strong>Program:</strong> {selectedItem.nama_program}</p>
                                    <p><strong>Jumlah Diajukan:</strong> Rp {Number(selectedItem.jumlah_diajukan).toLocaleString('id-ID')}</p>
                                    <p><strong>Deskripsi:</strong> {selectedItem.deskripsi || '-'}</p>
                                </div>

                                {action === 'approve' && (
                                    <div className="form-group">
                                        <label>Jumlah Disetujui (Rp) *</label>
                                        <input
                                            type="number"
                                            value={form.jumlah_disetujui}
                                            onChange={e => setForm({ ...form, jumlah_disetujui: e.target.value })}
                                            min="0"
                                            max={selectedItem.jumlah_diajukan}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Catatan {action === 'reject' ? '*' : ''}</label>
                                    <textarea
                                        value={form.catatan_persetujuan}
                                        onChange={e => setForm({ ...form, catatan_persetujuan: e.target.value })}
                                        placeholder={action === 'reject' ? 'Berikan alasan penolakan...' : 'Catatan tambahan...'}
                                        rows={3}
                                        required={action === 'reject'}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button
                                    type="submit"
                                    className={`btn ${action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                                >
                                    {action === 'approve' ? 'Setujui' : 'Tolak'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false })}
                onConfirm={executeApproval}
                title={action === 'approve' ? "Konfirmasi Persetujuan" : "Konfirmasi Penolakan"}
                message={action === 'approve'
                    ? `Apakah Anda yakin ingin menyetujui anggaran untuk program "${selectedItem?.nama_program}" sebesar Rp ${Number(form.jumlah_disetujui || 0).toLocaleString('id-ID')}?`
                    : `Apakah Anda yakin ingin menolak pengajuan anggaran "${selectedItem?.nama_program}"?`
                }
                confirmLabel={action === 'approve' ? "Ya, Setujui" : "Ya, Tolak"}
                variant={action === 'approve' ? 'success' : 'danger'}
                isLoading={processing}
            />
        </div>
    )
}

export default PersetujuanDanaPage
