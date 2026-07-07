import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, RefreshCw, Activity, User, Database, Clock, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import PageHeader from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import StatsCard from '../../components/ui/StatsCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import ResponsiveTable from '../../components/ui/ResponsiveTable';
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
        <div className="space-y-8 animate-fade-in">
            <PageHeader
                title="System Audit Logs"
                description="Monitor jejak digital dan aktivitas operasional secara real-time"
                icon={ClipboardList}
                actions={
                    <Button variant="outline" onClick={() => { fetchLogs(); fetchMetadata(); }} disabled={loading}>
                        <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> 
                        Refresh Logs
                    </Button>
                }
            />

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard title="Total Aktivitas" value={logs.length} icon={Activity} color="blue" />
                <StatsCard title="Modul Aktif" value={metadata.modules.length} icon={Database} color="emerald" />
                <StatsCard title="User Terlibat" value={[...new Set(logs.map(l => l.user_id))].length} icon={User} color="purple" />
                <StatsCard title="Update Terakhir" value={logs[0] ? new Date(logs[0].timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} icon={Clock} color="orange" />
            </div>

            <Card variant="premium" className="overflow-hidden border-none shadow-2xl">
                {/* Unified Filter Bar */}
                <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div className="relative flex-1 max-w-xl group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Cari aksi, modul, tabel, atau username..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <select
                                className="pl-6 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all appearance-none font-medium text-sm min-w-[160px]"
                                value={filters.action || ''}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            >
                                <option value="">Semua Aksi</option>
                                {metadata.actions.map(act => (
                                    <option key={act} value={act}>{act}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>

                        <div className="relative group">
                            <select
                                className="pl-6 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all appearance-none font-medium text-sm min-w-[160px]"
                                value={filters.module || ''}
                                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                            >
                                <option value="">Semua Modul</option>
                                {metadata.modules.map(mod => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>

                        <div className="relative group">
                            <select
                                className="pl-6 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all appearance-none font-medium text-sm min-w-[160px]"
                                value={filters.table || ''}
                                onChange={(e) => setFilters({ ...filters, table: e.target.value })}
                            >
                                <option value="">Semua Tabel</option>
                                {metadata.tables.map(tbl => (
                                    <option key={tbl} value={tbl}>{tbl}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center">
                            <RefreshCw className="animate-spin mx-auto text-indigo-600 mb-4" size={48} />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sinkronisasi Audit Logs...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="py-20">
                            <EmptyState
                                icon={ClipboardList}
                                title="Log Kosong"
                                message="Tidak ditemukan data aktivitas yang sesuai dengan filter Anda."
                            />
                        </div>
                    ) : (
                        <ResponsiveTable
                            columns={[
                                { 
                                    header: 'Waktu & Tanggal', 
                                    render: (row) => (
                                        <>
                                            <div className="text-sm font-bold text-gray-900">{new Date(row.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {new Date(row.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </>
                                    ),
                                    className: 'px-8 py-6',
                                    hideOnMobile: true
                                },
                                { 
                                    header: 'Aktor (User)', 
                                    render: (row) => (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs group-hover:scale-110 transition-transform">
                                                {(row.user?.username || 'S')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 text-sm">{row.user?.username || 'System'}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{row.user?.role || 'AUTO'}</div>
                                            </div>
                                        </div>
                                    ),
                                    className: 'px-8 py-6',
                                    hideOnMobile: true
                                },
                                { 
                                    header: 'Aksi & Status', 
                                    render: (row) => getActionBadge(row.action),
                                    className: 'px-8 py-6',
                                    hideOnMobile: true
                                },
                                { 
                                    header: 'Konteks Modul', 
                                    render: (row) => (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                {row.module || 'SYSTEM'}
                                            </span>
                                            {row.target_table && (
                                                <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg w-fit border border-slate-100">
                                                    <Database size={12} className="text-slate-300" />
                                                    {row.target_table}
                                                </div>
                                            )}
                                        </div>
                                    ),
                                    className: 'px-8 py-6',
                                    hideOnMobile: true
                                },
                                { 
                                    header: 'Detail Metadata', 
                                    render: (row) => (
                                        row.meta_data ? (
                                            <div className="max-w-xs truncate font-mono text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200" title={JSON.stringify(row.meta_data, null, 2)}>
                                                {JSON.stringify(row.meta_data)}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )
                                    ),
                                    className: 'px-8 py-6',
                                    hideOnMobile: true
                                }
                            ]}
                            data={filteredLogs}
                            loading={loading}
                            emptyState={
                                <div className="py-20">
                                    <EmptyState
                                        icon={ClipboardList}
                                        title="Log Kosong"
                                        message="Tidak ditemukan data aktivitas yang sesuai dengan filter Anda."
                                    />
                                </div>
                            }
                            mobileCardHeader={(row) => (
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs shadow-sm">
                                        {(row.user?.username || 'S')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-black text-gray-900 text-sm">{row.user?.username || 'System'}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{row.user?.role || 'AUTO'}</div>
                                    </div>
                                </div>
                            )}
                            mobileCardContent={(row) => (
                                <div className="flex flex-col gap-3 w-full mt-2">
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        {getActionBadge(row.action)}
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-gray-900">{new Date(row.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {new Date(row.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">
                                            {row.module || 'SYSTEM'}
                                        </span>
                                        {row.target_table && (
                                            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                <Database size={10} className="text-slate-400" />
                                                {row.target_table}
                                            </div>
                                        )}
                                    </div>
                                    {row.meta_data && (
                                        <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200 overflow-x-auto whitespace-pre">
                                            {JSON.stringify(row.meta_data, null, 2)}
                                        </div>
                                    )}
                                </div>
                            )}
                        />
                    )}
                </div>
                <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Activity size={16} className="text-emerald-400" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">Menampilkan 100 aktivitas terbaru</span>
                    </div>
                    <span className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">SITAQUA Audit Engine v2.0</span>
                </div>
            </Card>
        </div>
    );
};

export default AuditLogPage;
