import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, RefreshCw, Calendar, User, Activity, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import './AdminPages.css';

const AuditLogPage = () => {
    const { isAdmin } = usePermissions();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        table: '',
        user: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_log')
                .select(`
                    *,
                    user:user_id(username, full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (filters.table) {
                query = query.eq('table_name', filters.table);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin()) {
        return <div className="p-8 text-center">Akses ditolak.</div>;
    }

    const filteredLogs = logs.filter(log => {
        const searchTerm = filters.search.toLowerCase();
        return (
            log.action?.toLowerCase().includes(searchTerm) ||
            log.table_name?.toLowerCase().includes(searchTerm) ||
            log.description?.toLowerCase().includes(searchTerm) ||
            log.user?.username?.toLowerCase().includes(searchTerm)
        );
    });

    const getActionColor = (action) => {
        switch (action) {
            case 'INSERT': return 'bg-green-100 text-green-700';
            case 'UPDATE': return 'bg-blue-100 text-blue-700';
            case 'DELETE': return 'bg-red-100 text-red-700';
            case 'LOGIN': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <h1>
                        <ClipboardList className="text-blue-600" /> Audit Log
                    </h1>
                    <p>Rekam jejak aktivitas dan perubahan data dalam sistem.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="btn btn-secondary flex items-center gap-2"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="admin-filters">
                <div className="search-input-wrapper">
                    <Search className="icon" size={18} />
                    <input
                        type="text"
                        placeholder="Cari aktivitas, tabel, atau user..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <select
                    className="admin-select"
                    value={filters.table}
                    onChange={(e) => setFilters({ ...filters, table: e.target.value })}
                >
                    <option value="">Semua Tabel</option>
                    <option value="santri">Santri</option>
                    <option value="kas_pemasukan">Kas Pemasukan</option>
                    <option value="kas_pengeluaran">Kas Pengeluaran</option>
                    <option value="tagihan_santri">Tagihan</option>
                </select>
            </div>

            <div className="table-container">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>User</th>
                                <th>Aksi</th>
                                <th>Tabel</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-400 italic">
                                        Memuat data log...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-400">
                                        Tidak ditemukan log aktivitas.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            <div className="log-time">
                                                <span className="date">
                                                    {new Date(log.created_at).toLocaleDateString('id-ID')}
                                                </span>
                                                <span className="time">
                                                    {new Date(log.created_at).toLocaleTimeString('id-ID')}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="log-user">
                                                <div className="user-avatar">
                                                    {(log.user?.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="user-details">
                                                    <span className="username">{log.user?.username || 'System'}</span>
                                                    <span className="fullname">{log.user?.full_name || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`log-action ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="log-table-name">
                                                {log.table_name || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <p className="log-description" title={log.description}>
                                                {log.description || '-'}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-gray-400 p-2">
                <p>Menampilkan 100 aktivitas terbaru</p>
                <div className="flex items-center gap-1">
                    <Activity size={12} /> Data dimuat dari tabel audit_log
                </div>
            </div>
        </div>
    );
};

export default AuditLogPage;
