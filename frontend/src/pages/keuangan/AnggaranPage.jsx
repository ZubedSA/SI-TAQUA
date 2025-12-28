import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, PiggyBank, Download, RefreshCw, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateLaporanPDF } from '../../utils/pdfGenerator'
import { logCreate, logUpdate, logDelete } from '../../lib/auditLog'
import MobileActionMenu from '../../components/ui/MobileActionMenu'
import './Keuangan.css'

const AnggaranPage = () => {
    const { user, isAdmin, isBendahara, userProfile, hasRole } = useAuth()
    // Multiple checks - admin dan bendahara bisa CRUD
    const adminCheck = isAdmin() || userProfile?.role === 'admin' || hasRole('admin')
    const bendaharaCheck = isBendahara() || userProfile?.role === 'bendahara' || hasRole('bendahara')
    const canEditKas = adminCheck || bendaharaCheck
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editItem, setEditItem] = useState(null)
    const [filters, setFilters] = useState({ search: '', status: '' })
    const [form, setForm] = useState({
        nama_program: '',
        deskripsi: '',
        jumlah_diajukan: '',
        tanggal_pengajuan: new Date().toISOString().split('T')[0]
    })

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

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                nama_program: form.nama_program,
                deskripsi: form.deskripsi,
                jumlah_diajukan: parseFloat(form.jumlah_diajukan),
                tanggal_pengajuan: form.tanggal_pengajuan,
                status: 'Pending',
                created_by: user?.id
            }

            if (editItem) {
                const { error } = await supabase.from('anggaran').update(payload).eq('id', editItem.id)
                if (error) throw error

                // Audit Log - UPDATE
                await logUpdate(
                    'anggaran',
                    payload.nama_program,
                    `Update anggaran: ${payload.nama_program} - Rp ${Number(payload.jumlah_diajukan).toLocaleString('id-ID')}`,
                    { nama_program: editItem.nama_program, jumlah: editItem.jumlah_diajukan },
                    { nama_program: payload.nama_program, jumlah: payload.jumlah_diajukan }
                )
            } else {
                const { error } = await supabase.from('anggaran').insert([payload])
                if (error) throw error

                // Audit Log - CREATE
                await logCreate(
                    'anggaran',
                    payload.nama_program,
                    `Ajukan anggaran baru: ${payload.nama_program} - Rp ${Number(payload.jumlah_diajukan).toLocaleString('id-ID')}`
                )
            }

            setShowModal(false)
            resetForm()
            fetchData()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Yakin hapus anggaran ini?')) return
        try {
            const itemToDelete = data.find(d => d.id === id)

            const { error } = await supabase.from('anggaran').delete().eq('id', id)
            if (error) throw error

            // Audit Log - DELETE
            if (itemToDelete) {
                await logDelete(
                    'anggaran',
                    itemToDelete.nama_program,
                    `Hapus anggaran: ${itemToDelete.nama_program} - Rp ${Number(itemToDelete.jumlah_diajukan).toLocaleString('id-ID')}`
                )
            }

            fetchData()
        } catch (err) {
            alert('Error: ' + err.message)
        }
    }

    const resetForm = () => {
        setForm({
            nama_program: '',
            deskripsi: '',
            jumlah_diajukan: '',
            tanggal_pengajuan: new Date().toISOString().split('T')[0]
        })
        setEditItem(null)
    }

    const openEdit = (item) => {
        if (item.status !== 'Pending') {
            alert('Hanya anggaran dengan status Pending yang dapat diedit')
            return
        }
        setEditItem(item)
        setForm({
            nama_program: item.nama_program,
            deskripsi: item.deskripsi || '',
            jumlah_diajukan: item.jumlah_diajukan.toString(),
            tanggal_pengajuan: item.tanggal_pengajuan
        })
        setShowModal(true)
    }

    const handleDownloadPDF = () => {
        generateLaporanPDF({
            title: 'Laporan Pengajuan Anggaran',
            columns: ['Program', 'Jumlah Diajukan', 'Tanggal', 'Status'],
            data: filteredData.map(d => [
                d.nama_program,
                `Rp ${Number(d.jumlah_diajukan).toLocaleString('id-ID')}`,
                new Date(d.tanggal_pengajuan).toLocaleDateString('id-ID'),
                d.status
            ]),
            filename: 'laporan_anggaran',
            showTotal: true,
            totalLabel: 'Total Diajukan',
            totalValue: filteredData.reduce((sum, d) => sum + Number(d.jumlah_diajukan), 0)
        })
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Disetujui': return 'disetujui'
            case 'Ditolak': return 'ditolak'
            case 'Selesai': return 'lunas'
            default: return 'pending'
        }
    }

    const filteredData = data.filter(d => {
        const matchSearch = d.nama_program.toLowerCase().includes(filters.search.toLowerCase())
        const matchStatus = !filters.status || d.status === filters.status
        return matchSearch && matchStatus
    })

    const totalDiajukan = filteredData.reduce((sum, d) => sum + Number(d.jumlah_diajukan), 0)

    return (
        <div className="keuangan-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <PiggyBank className="title-icon blue" /> Pengajuan Anggaran
                    </h1>
                    <p className="page-subtitle">Ajukan anggaran untuk program pesantren</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleDownloadPDF}>
                        <Download size={18} /> Download PDF
                    </button>
                    {canEditKas && (
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true) }}>
                            <Plus size={18} /> Ajukan Anggaran
                        </button>
                    )}
                </div>
            </div>

            <div className="summary-card blue">
                <div className="summary-content">
                    <span className="summary-label">Total Dana Diajukan</span>
                    <span className="summary-value">Rp {totalDiajukan.toLocaleString('id-ID')}</span>
                </div>
                <PiggyBank size={40} className="summary-icon" />
            </div>

            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari program..."
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">Semua Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Ditolak">Ditolak</option>
                    <option value="Selesai">Selesai</option>
                </select>
                <button className="btn btn-icon" onClick={fetchData}><RefreshCw size={18} /></button>
            </div>

            <div className="data-card">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : filteredData.length === 0 ? (
                    <div className="empty-state">Belum ada pengajuan anggaran</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Program</th>
                                <th>Jumlah Diajukan</th>
                                <th>Disetujui</th>
                                <th>Tanggal</th>
                                <th>Status</th>
                                {canEditKas && <th>Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item, i) => (
                                <tr key={item.id}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <div className="cell-santri">
                                            <strong>{item.nama_program}</strong>
                                            <small>{item.deskripsi?.substring(0, 50) || '-'}</small>
                                        </div>
                                    </td>
                                    <td className="amount">Rp {Number(item.jumlah_diajukan).toLocaleString('id-ID')}</td>
                                    <td className="amount green">
                                        {item.jumlah_disetujui ? `Rp ${Number(item.jumlah_disetujui).toLocaleString('id-ID')}` : '-'}
                                    </td>
                                    <td>{new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID')}</td>
                                    <td><span className={`status-badge ${getStatusClass(item.status)}`}>{item.status}</span></td>
                                    {canEditKas && (
                                        <td>
                                            <div className="action-buttons" style={{ display: 'flex', gap: '4px' }}>
                                                <MobileActionMenu
                                                    actions={[
                                                        { label: 'Edit', icon: <Edit2 size={14} />, onClick: () => openEdit(item) },
                                                        { label: 'Hapus', icon: <Trash2 size={14} />, onClick: () => handleDelete(item.id), danger: true },
                                                        { label: 'Detail', icon: <Eye size={14} />, onClick: () => { } }
                                                    ]}
                                                >
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        title="Edit"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#fef3c7',
                                                            color: '#d97706',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Hapus"
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
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button
                                                        title="Detail"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            background: '#dbeafe',
                                                            color: '#2563eb',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </MobileActionMenu>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editItem ? 'Edit Anggaran' : 'Ajukan Anggaran Baru'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nama Program *</label>
                                    <input
                                        type="text"
                                        value={form.nama_program}
                                        onChange={e => setForm({ ...form, nama_program: e.target.value })}
                                        placeholder="Contoh: Renovasi Asrama"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Deskripsi</label>
                                    <textarea
                                        value={form.deskripsi}
                                        onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                                        placeholder="Jelaskan detail program..."
                                        rows={3}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Jumlah Dana (Rp) *</label>
                                        <input
                                            type="number"
                                            value={form.jumlah_diajukan}
                                            onChange={e => setForm({ ...form, jumlah_diajukan: e.target.value })}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Tanggal Pengajuan</label>
                                        <input
                                            type="date"
                                            value={form.tanggal_pengajuan}
                                            onChange={e => setForm({ ...form, tanggal_pengajuan: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn btn-primary">{editItem ? 'Simpan' : 'Ajukan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AnggaranPage
