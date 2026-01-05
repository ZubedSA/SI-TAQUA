import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ShieldAlert, AlertTriangle, RefreshCw, Eye, Slash, CheckCircle, Search, Trash2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import PageHeader from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
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

    const filteredAccounts = accounts.filter(acc => {
        if (filter === 'ALL') return true
        if (filter === 'HIGH') return acc.risk_score >= 50
        if (filter === 'MEDIUM') return acc.risk_score >= 20 && acc.risk_score < 50
        return true
    })

    const getRiskBadge = (score) => {
        if (score >= 50) return <Badge variant="danger">{score}% - Tinggi</Badge>
        if (score >= 20) return <Badge variant="warning">{score}% - Sedang</Badge>
        return <Badge variant="success">{score}% - Rendah</Badge>
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Deteksi Akun Mencurigakan"
                description="Pantau aktivitas login dan perilaku user yang terdeteksi anomali."
                icon={ShieldAlert}
                actions={
                    <Button variant="secondary" onClick={fetchSuspiciousAccounts}>
                        <RefreshCw size={18} /> Refresh
                    </Button>
                }
            />

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={filter === 'ALL' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('ALL')}
                >
                    Semua ({accounts.length})
                </Button>
                <Button
                    variant={filter === 'HIGH' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('HIGH')}
                    className={filter === 'HIGH' ? 'bg-red-600 border-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}
                >
                    <AlertTriangle size={14} className="mr-1" />
                    Risiko Tinggi ({accounts.filter(a => a.risk_score >= 50).length})
                </Button>
            </div>

            <Card className="overflow-hidden border-gray-200">
                <div className="overflow-x-auto">
                    {loading ? (
                        <Spinner className="py-12" label="Memuat data keamanan..." />
                    ) : filteredAccounts.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle}
                            title={filter === 'ALL' ? "Semua Aman" : "Tidak ada data"}
                            message={filter === 'ALL' ? "Tidak ada akun yang terdeteksi mencurigakan saat ini." : "Tidak ada akun dengan kriteria filter tersebut."}
                        />
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Risk Score</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Alasan Deteksi</th>
                                    <th className="px-6 py-4">Terakhir Aktif</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredAccounts.map(account => (
                                    <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{account.user_profiles?.nama || 'No Name'}</span>
                                                <span className="text-xs text-gray-500 font-mono">{account.user_profiles?.email || 'Email Unknown'}</span>
                                                <Badge variant="neutral" className="w-fit mt-1 text-[10px] py-0">{account.user_profiles?.role}</Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRiskBadge(account.risk_score)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-700 capitalize">{account.status}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {account.reasons?.map((r, idx) => (
                                                    <div key={idx} className="text-gray-600 text-xs flex items-center gap-1.5">
                                                        <span className="w-1 h-1 rounded-full bg-red-500 shrink-0"></span>
                                                        {r}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(account.last_activity).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Desktop Actions */}
                                            <div className="hidden md:flex items-center justify-end gap-2">
                                                <button
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                                                    onClick={() => handleResetStatus(account.id)}
                                                    title="Mark as Safe"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                                    onClick={() => alert('Fitur Suspend manual akan segera hadir.')}
                                                    title="Suspend Account"
                                                >
                                                    <Slash size={18} />
                                                </button>
                                            </div>

                                            {/* Mobile Actions */}
                                            <div className="md:hidden flex justify-end">
                                                <MobileActionMenu
                                                    actions={[
                                                        {
                                                            icon: <CheckCircle size={16} />,
                                                            label: 'Mark as Safe',
                                                            onClick: () => handleResetStatus(account.id)
                                                        },
                                                        {
                                                            icon: <Slash size={16} />,
                                                            label: 'Suspend Account',
                                                            danger: true,
                                                            onClick: () => alert('Fitur Suspend manual akan segera hadir.')
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    )
}

export default SuspiciousAccountsPage
