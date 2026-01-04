import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ShieldAlert, AlertTriangle, RefreshCw, Eye, Slash, CheckCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import './SuspiciousAccountsPage.css'

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
            // Join with user_profiles manually via JS since simple foreign key join might be complex with RLS on profiles ??
            // OR use view. Let's try direct join query
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
                .delete() // Simply remove from suspicious list or set score to 0
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

    return (
        <div className="suspicious-page">
            <div className="page-header">
                <div className="header-title">
                    <h1><ShieldAlert size={28} className="text-red-600" /> Deteksi Akun Mencurigakan</h1>
                    <p>Pantau aktivitas login dan perilaku user yang terdeteksi anomali.</p>
                </div>
                <button className="btn-primary" onClick={fetchSuspiciousAccounts}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div className="risk-filters">
                <button
                    className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilter('ALL')}
                >
                    Semua ({accounts.length})
                </button>
                <button
                    className={`filter-btn ${filter === 'HIGH' ? 'active' : ''}`}
                    onClick={() => setFilter('HIGH')}
                >
                    Risiko Tinggi ({accounts.filter(a => a.risk_score >= 50).length})
                </button>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data keamanan...</p>
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={48} className="text-green-500 mb-2" />
                        <h3>Semua Aman</h3>
                        <p>Tidak ada akun yang terdeteksi mencurigakan saat ini.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Risk Score</th>
                                    <th>Status</th>
                                    <th>Alasan Deteksi</th>
                                    <th>Terakhir Aktif</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAccounts.map(account => (
                                    <tr key={account.id}>
                                        <td>
                                            <div className="user-info-cell">
                                                <span className="user-email">
                                                    {account.user_profiles?.email || 'Email Unknown'}
                                                </span>
                                                <span className="user-id">{account.user_profiles?.nama || 'No Name'}</span>
                                                <span className="user-role-badge">{account.user_profiles?.role}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`risk-badge ${account.risk_score >= 50 ? 'risk-high' :
                                                account.risk_score >= 20 ? 'risk-medium' : 'risk-low'
                                                }`}>
                                                {account.risk_score}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className="status-text">{account.status}</span>
                                        </td>
                                        <td>
                                            <div className="reasons-list">
                                                {account.reasons?.map((r, idx) => (
                                                    <span key={idx} className="reason-item">{r}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            {new Date(account.last_activity).toLocaleString('id-ID')}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon"
                                                    title="Reset Status (Mark as Safe)"
                                                    onClick={() => handleResetStatus(account.id)}
                                                >
                                                    <CheckCircle size={18} className="text-green-600" />
                                                </button>
                                                <button
                                                    className="btn-icon danger"
                                                    title="Suspend Account (Not Impl)"
                                                    onClick={() => alert('Fitur Suspend manual akan segera hadir.')}
                                                >
                                                    <Slash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SuspiciousAccountsPage
