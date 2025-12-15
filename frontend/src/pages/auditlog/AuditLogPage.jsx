import { useState, useEffect } from 'react'
import { Search, RefreshCw, Eye, RotateCcw, Plus, Edit2, FileInput } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './AuditLog.css'

const AuditLogPage = () => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterAction, setFilterAction] = useState('')
    const [filterDate, setFilterDate] = useState('')

    useEffect(() => {
        fetchLogs()
    }, [])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error
            setLogs(data || [])
        } catch (err) {
            console.error('Error:', err.message)
            setLogs([])
        } finally {
            setLoading(false)
        }
    }

    const resetFilters = () => {
        setFilterAction('')
        setFilterDate('')
        setSearchTerm('')
    }

    const filteredLogs = logs.filter(log => {
        const matchSearch = !searchTerm ||
            log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.table_name?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchAction = !filterAction || log.action === filterAction
        const matchDate = !filterDate || log.created_at?.startsWith(filterDate)
        return matchSearch && matchAction && matchDate
    })

    const getActionBadge = (action) => {
        switch (action) {
            case 'CREATE': return { icon: Plus, class: 'badge-tambah', text: 'Tambah' }
            case 'INPUT': return { icon: FileInput, class: 'badge-input', text: 'Input' }
            case 'UPDATE': return { icon: Edit2, class: 'badge-ubah', text: 'Ubah' }
            case 'DELETE': return { icon: null, class: 'badge-hapus', text: 'Hapus' }
            default: return { icon: null, class: 'badge-default', text: action }
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        return date.toLocaleString('sv-SE').replace('T', ' ').slice(0, 19)
    }

    return (
        <div className="audit-log-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Log</h1>
                    <p className="page-subtitle">Riwayat perubahan data dan aktivitas pengguna</p>
                </div>
            </div>

            <div className="audit-card">
                {/* Filters */}
                <div className="audit-filters">
                    <div className="filter-group">
                        <label className="filter-label">Filter Aksi</label>
                        <select
                            className="form-control"
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value)}
                        >
                            <option value="">Semua</option>
                            <option value="CREATE">Tambah</option>
                            <option value="INPUT">Input</option>
                            <option value="UPDATE">Ubah</option>
                            <option value="DELETE">Hapus</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label className="filter-label">Filter Tanggal</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group filter-actions">
                        <button className="btn btn-secondary" onClick={resetFilters}>
                            <RotateCcw size={16} /> Reset Filter
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="audit-search">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Cari aktivitas..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* Table */}
                <div className="table-container">
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>User</th>
                                <th>Aksi</th>
                                <th>Tabel</th>
                                <th>Deskripsi</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center">
                                        <RefreshCw size={20} className="spin" /> Loading...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted">
                                        Belum ada log aktivitas
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => {
                                    const badge = getActionBadge(log.action)
                                    return (
                                        <tr key={log.id}>
                                            <td className="td-waktu">{formatDate(log.created_at)}</td>
                                            <td>{log.user_email || 'System'}</td>
                                            <td>
                                                <span className={`action-badge ${badge.class}`}>
                                                    {badge.icon && <badge.icon size={12} />}
                                                    {badge.text}
                                                </span>
                                            </td>
                                            <td className="td-tabel">{log.table_name}</td>
                                            <td className="td-deskripsi">{log.description || log.record_name || '-'}</td>
                                            <td className="td-actions">
                                                <button className="btn-icon" title="Lihat Detail">
                                                    <Eye size={16} />
                                                </button>
                                                {log.action === 'UPDATE' && (
                                                    <button className="btn-icon" title="Restore">
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default AuditLogPage
