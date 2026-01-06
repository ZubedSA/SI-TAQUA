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

    const [metadata, setMetadata] = useState({
        actions: [],
        modules: [],
        tables: []
    });

    useEffect(() => {
        fetchLogs();
        fetchMetadata();
    }, [filters]); // Re-fetch logs when filters change

    const fetchMetadata = async () => {
        try {
            // Try RPC first (best performance)
            const { data, error } = await supabase.rpc('get_audit_metadata');

            if (!error && data && data.length > 0) {
                setMetadata({
                    actions: data[0].actions || [],
                    modules: data[0].modules || [],
                    tables: data[0].tables || []
                });
            } else {
                // Fallback: manual extraction (if RPC not yet applied)
                // Note: limit to 1000 to avoid heavy query
                const { data: rawData } = await supabase
                    .from('audit_logs')
                    .select('action, module, target_table')
                    .order('timestamp', { ascending: false })
                    .limit(500);

                if (rawData) {
                    const actions = [...new Set(rawData.map(i => i.action))].filter(Boolean).sort();
                    const modules = [...new Set(rawData.map(i => i.module))].filter(Boolean).sort();
                    const tables = [...new Set(rawData.map(i => i.target_table))].filter(Boolean).sort();
                    setMetadata({ actions, modules, tables });
                }
            }
        } catch (e) {
            console.error('Metadata fetch error', e);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs') // New table
                .select(`
                    *,
                    user:user_id(username, nama, role)
                `)
                .order('timestamp', { ascending: false }) // timestamp column
                .limit(100);

            if (filters.table) {
                query = query.eq('target_table', filters.table);
            }
            if (filters.action) {
                query = query.eq('action', filters.action);
            }
            if (filters.module) {
                query = query.eq('module', filters.module);
            }
            if (filters.search) {
                // Search is handled client-side in this version or could be OR logic here
                // Keeping existing client-side filtering logic for complex text search,
                // but db filtering is better. For now adhering to existing pattern.
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
        if (!searchTerm) return true;
        return (
            log.action?.toLowerCase().includes(searchTerm) ||
            log.module?.toLowerCase().includes(searchTerm) ||
            log.target_table?.toLowerCase().includes(searchTerm) ||
            log.user?.username?.toLowerCase().includes(searchTerm) ||
            JSON.stringify(log.meta_data || {}).toLowerCase().includes(searchTerm)
        );
    });

    const getActionBadge = (action) => {
        // Normalize action
        const act = action?.toUpperCase() || 'UNKNOWN';
        if (act.includes('CREATE') || act.includes('INSERT')) return <Badge variant="success">{act}</Badge>;
        if (act.includes('UPDATE')) return <Badge variant="warning">{act}</Badge>;
        if (act === 'DELETE') return <Badge variant="danger">{act}</Badge>;
        if (act === 'LOGIN') return <Badge variant="primary">{act}</Badge>;
        if (act === 'LOGOUT') return <Badge variant="neutral">{act}</Badge>;
        if (act.includes('ERROR') || act.includes('FAIL')) return <Badge variant="danger" className="bg-red-900 text-white">{act}</Badge>;
        if (act === 'PAGE_VIEW') return <Badge variant="neutral" className="bg-gray-100 text-gray-600">VIEW</Badge>;
        if (act === 'ROLE_SWITCH') return <Badge variant="info">ROLE</Badge>;
        return <Badge variant="neutral">{act}</Badge>;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Audit Log System"
                description="Monitor keamanan dan aktivitas user secara real-time."
                icon={ClipboardList}
                actions={
                    <Button variant="secondary" onClick={() => { fetchLogs(); fetchMetadata(); }}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
                    </Button>
                }
            />

            <Card className="border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
                    {/* Search Bar */}
                    <div className="relative w-full xl:w-72">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                    </div>

                    {/* Dynamic Filters */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 sm:pb-0">

                        {/* 1. Action Filter (Dynamic) */}
                        <div className="relative group w-full sm:w-40">
                            <select
                                className="w-full appearance-none px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer font-medium text-gray-700"
                                value={filters.action || ''}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            >
                                <option value="">Semua Aktivitas</option>
                                {metadata.actions.map(act => (
                                    <option key={act} value={act}>{act}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <Activity size={14} />
                            </div>
                        </div>

                        {/* 2. Module Filter (Dynamic) */}
                        <div className="relative w-full sm:w-40">
                            <select
                                className="w-full appearance-none px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer text-gray-600"
                                value={filters.module || ''}
                                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                            >
                                <option value="">Semua Modul</option>
                                {metadata.modules.map(mod => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Table Filter (Dynamic) */}
                        <div className="relative w-full sm:w-44">
                            <select
                                className="w-full appearance-none px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer text-gray-600"
                                value={filters.table || ''}
                                onChange={(e) => setFilters({ ...filters, table: e.target.value })}
                            >
                                <option value="">Semua Tabel</option>
                                {metadata.tables.map(tbl => (
                                    <option key={tbl} value={tbl}>{tbl}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <Database size={12} />
                            </div>
                        </div>

                    </div>
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
                                    <th className="px-6 py-4">Context (Module/Table)</th>
                                    <th className="px-6 py-4">Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">
                                                    {new Date(log.timestamp).toLocaleDateString('id-ID')}
                                                </span>
                                                <span className="text-xs">
                                                    {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                                                    {(log.user?.username || 'S')[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{log.user?.username || 'System'}</span>
                                                    <span className="text-xs text-gray-500">{log.user?.role || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {log.module && (
                                                    <span className="text-xs font-bold text-gray-500 tracking-wider">
                                                        {log.module}
                                                    </span>
                                                )}
                                                {log.target_table && (
                                                    <div className="flex items-center gap-1.5 text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                                                        <Database size={10} />
                                                        {log.target_table}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                                            {log.meta_data ? (
                                                <div className="max-w-xs truncate" title={JSON.stringify(log.meta_data, null, 2)}>
                                                    {JSON.stringify(log.meta_data)}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
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
