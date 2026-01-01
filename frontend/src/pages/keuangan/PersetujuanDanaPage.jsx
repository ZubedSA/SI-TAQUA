import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Search, RefreshCw, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logUpdate } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
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
        } catch (err) {
            console.error('Error:', err.message)
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

    const handleSubmit = async (e) => {
        e.preventDefault()
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

            setShowModal(false)
            fetchData()

            if (action === 'approve') {
                showToast.success('Anggaran berhasil disetujui!')
            } else {
                showToast.error('Anggaran ditolak!')
            }
        } catch (err) {
            showToast.error('Error: ' + err.message)
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

            <div className="data-card">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : data.length === 0 ? (
                    <div className="empty-state">Belum ada pengajuan</div>
                ) : (
                    <table className="data-table">
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
                )}
            </div>

            {showModal && selectedItem && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{action === 'approve' ? '✅ Setujui Anggaran' : '❌ Tolak Anggaran'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
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
        </div>
    )
}

export default PersetujuanDanaPage
