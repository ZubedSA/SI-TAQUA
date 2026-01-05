import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, RefreshCw, Activity, User, Database, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import FormInput from '../../components/ui/FormInput';

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
        return <div className="p-8 text-center text-red-500 font-bold">Akses ditolak.</div>;
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

    const getActionBadge = (action) => {
        switch (action) {
            case 'INSERT': return <Badge variant="success">INSERT</Badge>;
            case 'UPDATE': return <Badge variant="info">UPDATE</Badge>;
            case 'DELETE': return <Badge variant="danger">DELETE</Badge>;
            case 'LOGIN': return <Badge variant="primary">LOGIN</Badge>;
            default: return <Badge variant="neutral">{action}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Audit Log"
                description="Rekam jejak aktivitas dan perubahan data dalam sistem."
                icon={ClipboardList}
                actions={
                    <Button variant="secondary" onClick={fetchLogs}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
                    </Button>
                }
            />

            <Card className="border-gray-200">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari aktivitas, tabel, atau user..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                    </div>

                    <select
                        className="w-full md:w-48 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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

                <div className="overflow-x-auto">
                    {loading ? (
                        <Spinner className="py-12" label="Memuat data log..." />
                    ) : filteredLogs.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title="Tidak ditemukan log aktivitas"
                            message="Tidak ada data log yang cocok dengan filter pencarian Anda."
                        />
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Waktu</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Aksi</th>
                                    <th className="px-6 py-4">Tabel</th>
                                    <th className="px-6 py-4">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">
                                                    {new Date(log.created_at).toLocaleDateString('id-ID')}
                                                </span>
                                                <span className="text-xs">
                                                    {new Date(log.created_at).toLocaleTimeString('id-ID')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                                                    {(log.user?.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{log.user?.username || 'System'}</span>
                                                    <span className="text-xs text-gray-500">{log.user?.full_name || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                                                <Database size={12} />
                                                {log.table_name || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-md truncate" title={log.description}>
                                            {log.description || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                    <span>Menampilkan 100 aktivitas terbaru</span>
                    <span className="flex items-center gap-1">
                        <Activity size={12} /> Data dimuat dari tabel audit_log
                    </span>
                </div>
            </Card>
        </div>
    );
};

export default AuditLogPage;
