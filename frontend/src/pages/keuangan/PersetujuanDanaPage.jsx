import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Search, RefreshCw, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logUpdate } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { useToast } from '../../context/ToastContext'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
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
                        <ResponsiveTable
                            columns={[
                                { header: 'No', hideOnMobile: true, render: (_, i) => i + 1, className: 'w-16' },
                                { 
                                    header: 'Program', 
                                    hideOnMobile: true,
                                    render: (row) => (
                                        <div className="flex flex-col">
                                            <strong className="text-gray-900">{row.nama_program}</strong>
                                            <span className="text-xs text-gray-500">{row.deskripsi?.substring(0, 50) || '-'}</span>
                                        </div>
                                    )
                                },
                                { 
                                    header: 'Jumlah Diajukan', 
                                    render: (row) => <span className="font-mono font-medium text-gray-700">Rp {Number(row.jumlah_diajukan).toLocaleString('id-ID')}</span>
                                },
                                { header: 'Tanggal', render: (row) => new Date(row.tanggal_pengajuan).toLocaleDateString('id-ID') },
                                { 
                                    header: 'Status', 
                                    render: (row) => <span className={`status-badge ${getStatusClass(row.status)}`}>{row.status}</span>
                                },
                                ...(canApprove ? [{
                                    header: 'Aksi',
                                    hideOnMobile: true,
                                    className: 'text-right',
                                    render: (row) => row.status === 'Pending' ? (
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openApproval(row, 'approve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Setujui"><CheckCircle size={16} /></button>
                                            <button onClick={() => openApproval(row, 'reject')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Tolak"><XCircle size={16} /></button>
                                        </div>
                                    ) : null
                                }] : [])
                            ]}
                            data={data}
                            mobileCardHeader={(row) => (
                                <div className="flex flex-col">
                                    <span className="font-bold text-[#0A2619]">{row.nama_program}</span>
                                    <span className="text-[10px] text-gray-500 mt-0.5">{new Date(row.tanggal_pengajuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            )}
                            mobileCardActions={(row) => canApprove && row.status === 'Pending' ? (
                                <>
                                    <button onClick={() => openApproval(row, 'approve')} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-xs font-bold transition-colors flex items-center gap-1"><CheckCircle size={14}/> Setujui</button>
                                    <button onClick={() => openApproval(row, 'reject')} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-bold transition-colors flex items-center gap-1"><XCircle size={14}/> Tolak</button>
                                </>
                            ) : null}
                        />
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
