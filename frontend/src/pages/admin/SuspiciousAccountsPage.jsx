import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ShieldAlert, AlertTriangle, RefreshCw, Eye, Slash, CheckCircle, ShieldCheck } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import StatsCard from '../../components/ui/StatsCard'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import MobileActionMenu from '../../components/ui/MobileActionMenu'

const SuspiciousAccountsPage = () => {
    const showToast = useToast()
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL') // ALL, HIGH, MEDIUM

    useEffect(() => {
        fetchSuspiciousAccounts()
    }, [])

    const fetchSuspiciousAccounts = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('suspicious_accounts')
                .select(`
                    *,
                    user_profiles:user_id (nama, email, role)
                `)
                .order('last_activity', { ascending: false })

            if (error) throw error
            setAccounts(data || [])
        } catch (error) {
            console.error('Error fetching suspicious accounts:', error)
            showToast?.error('Gagal memuat data akun berisiko')
        } finally {
            setLoading(false)
        }
    }

    const handleResetStatus = async (accountId) => {
        if (!confirm('Reset status risiko akun ini menjadi aman?')) return

        try {
            const { error } = await supabase
                .from('suspicious_accounts')
                .delete()
                .eq('id', accountId)

            if (error) throw error

            showToast?.success('Status akun berhasil direset')
            fetchSuspiciousAccounts()
        } catch (error) {
            console.error('Reset error:', error)
            showToast?.error('Gagal reset: ' + error.message)
        }
    }

    const handleSuspendAccount = (accountId) => {
        alert('Fitur Suspend manual akan segera hadir.')
    }

    const filteredAccounts = accounts.filter(acc => {
        if (filter === 'ALL') return true
        if (filter === 'HIGH') return acc.risk_score >= 50
        if (filter === 'MEDIUM') return acc.risk_score >= 20 && acc.risk_score < 50
        return true
    })

    return (
        <div className="space-y-8 animate-fade-in">
            <PageHeader
                title="Security Watch"
                description="Analisis aktivitas login dan deteksi anomali perilaku akun"
                icon={ShieldAlert}
                actions={
                    <Button variant="outline" onClick={fetchSuspiciousAccounts} disabled={loading}>
                        <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> 
                        Refresh Status
                    </Button>
                }
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6">
                <StatsCard title="Total Anomali" value={accounts.length} icon={AlertTriangle} color="blue" />
                <StatsCard title="Risiko Tinggi" value={accounts.filter(a => a.risk_score >= 50).length} icon={Slash} color="red" />
                <StatsCard title="Dalam Pemantauan" value={accounts.filter(a => a.risk_score < 50).length} icon={Eye} color="orange" />
            </div>

            <div className="flex flex-wrap gap-3 px-2">
                {[
                    { id: 'ALL', label: 'Semua Laporan', count: accounts.length, icon: ShieldAlert, color: 'indigo' },
                    { id: 'HIGH', label: 'Prioritas Tinggi', count: accounts.filter(a => a.risk_score >= 50).length, icon: AlertTriangle, color: 'red' },
                    { id: 'MEDIUM', label: 'Risiko Sedang', count: accounts.filter(a => a.risk_score >= 20 && a.risk_score < 50).length, icon: Eye, color: 'orange' },
                ].map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => setFilter(btn.id)}
                        className={`px-6 py-3 rounded-2xl flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest
                            ${filter === btn.id 
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105' 
                                : 'bg-white text-slate-400 hover:bg-gray-50 border border-gray-100'}
                        `}
                    >
                        <btn.icon size={16} />
                        {btn.label}
                        <span className={`ml-2 px-2 py-0.5 rounded-lg text-[9px] ${filter === btn.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {btn.count}
                        </span>
                    </button>
                ))}
            </div>

            <Card variant="premium" className="overflow-hidden border-none shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <ResponsiveTable
                        columns={[
                            { 
                                header: 'Identitas Akun', 
                                render: (row) => (
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                                            {row.user_profiles?.nama?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 text-base">{row.user_profiles?.nama || 'Unknown User'}</div>
                                            <div className="text-xs font-medium text-gray-400">{row.user_profiles?.email || '-'}</div>
                                            <Badge variant="neutral" className="mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-400 border-none">
                                                {row.user_profiles?.role}
                                            </Badge>
                                        </div>
                                    </div>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Skor Risiko', 
                                render: (row) => (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all ${row.risk_score >= 50 ? 'bg-red-500' : row.risk_score >= 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${row.risk_score}%` }}
                                            />
                                        </div>
                                        <span className={`text-sm font-black ${row.risk_score >= 50 ? 'text-red-600' : row.risk_score >= 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {row.risk_score}%
                                        </span>
                                    </div>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Anomali Terdeteksi', 
                                render: (row) => (
                                    <div className="flex flex-col gap-2">
                                        {row.reasons?.map((r, idx) => (
                                            <div key={idx} className="text-slate-600 text-xs font-bold flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-pulse"></div>
                                                {r}
                                            </div>
                                        ))}
                                    </div>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Waktu Kejadian', 
                                render: (row) => (
                                    <>
                                        <div className="text-sm font-bold text-gray-700">{new Date(row.last_activity).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {new Date(row.last_activity).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </>
                                ),
                                className: 'px-8 py-6',
                                hideOnMobile: true
                            },
                            { 
                                header: 'Tindakan', 
                                className: 'px-8 py-6 text-right',
                                render: (row) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100/50"
                                            onClick={(e) => { e.stopPropagation(); handleResetStatus(row.id); }}
                                            title="Mark as Safe"
                                        >
                                            <ShieldCheck size={18} />
                                        </button>
                                        <button
                                            className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white transition-all shadow-sm border border-slate-100/50"
                                            onClick={(e) => { e.stopPropagation(); handleSuspendAccount(row.id); }}
                                            title="Suspend Account"
                                        >
                                            <ShieldAlert size={18} />
                                        </button>
                                    </div>
                                ) 
                            }
                        ]}
                        data={filteredAccounts}
                        loading={loading}
                        emptyState={
                            <div className="py-20">
                                <EmptyState
                                    icon={CheckCircle}
                                    title={filter === 'ALL' ? "Sistem Aman" : "Data Tidak Ditemukan"}
                                    message={filter === 'ALL' ? "Tidak ada aktivitas mencurigakan yang terdeteksi saat ini." : "Tidak ada akun dengan kriteria filter tersebut."}
                                />
                            </div>
                        }
                        mobileCardHeader={(row) => (
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-lg shadow-sm">
                                    {row.user_profiles?.nama?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-base">{row.user_profiles?.nama || 'Unknown User'}</div>
                                    <div className="text-xs font-medium text-gray-400">{row.user_profiles?.email || '-'}</div>
                                </div>
                            </div>
                        )}
                        mobileCardActions={(row) => (
                            <MobileActionMenu
                                actions={[
                                    { icon: <ShieldCheck size={16} />, label: 'Mark as Safe', onClick: () => handleResetStatus(row.id) },
                                    { icon: <ShieldAlert size={16} />, label: 'Suspend Account', onClick: () => handleSuspendAccount(row.id) }
                                ]}
                            />
                        )}
                        mobileCardContent={(row) => (
                            <div className="flex flex-col gap-3 w-full mt-1">
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500">Skor Risiko</span>
                                    <span className={`text-sm font-black ${row.risk_score >= 50 ? 'text-red-600' : row.risk_score >= 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {row.risk_score}%
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-2">
                                    <div className="text-xs font-semibold text-gray-500 mb-1">Anomali Terdeteksi:</div>
                                    {row.reasons?.map((r, idx) => (
                                        <div key={idx} className="text-slate-600 text-xs font-bold flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-pulse"></div>
                                            {r}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    />
                </div>
            </Card>
        </div>
    )
}

export default SuspiciousAccountsPage
