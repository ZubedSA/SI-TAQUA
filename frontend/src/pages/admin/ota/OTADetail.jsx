import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, Wallet, CreditCard, ArrowUpRight, Calendar, Users, Link as LinkIcon, Lock, Unlock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import { useToast } from '../../../context/ToastContext'

const OTADetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const showToast = useToast()
    const [loading, setLoading] = useState(true)
    const [ota, setOta] = useState(null)
    const [stats, setStats] = useState({ santriCount: 0, totalDonasi: 0, totalPengeluaran: 0, saldo: 0 })
    const [santriList, setSantriList] = useState([])
    const [transactions, setTransactions] = useState([])

    // Linking State
    const [availableUsers, setAvailableUsers] = useState([])
    const [selectedUserId, setSelectedUserId] = useState('')
    const [linkedUserEmail, setLinkedUserEmail] = useState('')
    const [linking, setLinking] = useState(false)

    useEffect(() => {
        fetchDetail()
    }, [id])

    const fetchDetail = async () => {
        try {
            // 1. Fetch Profile
            const { data: profile, error: profileError } = await supabase
                .from('orang_tua_asuh')
                .select('*')
                .eq('id', id)
                .single()

            if (profileError) throw profileError
            setOta(profile)

            // 2. Fetch Helper Data (Santri, Pemasukan, Pengeluaran)
            const [santriRes, pemasukanRes, pengeluaranRes] = await Promise.all([
                supabase.from('ota_santri').select('*, santri:santri_id(nama, nis, kelas:kelas_id(nama))').eq('ota_id', id),
                supabase.from('ota_pemasukan').select('*').eq('ota_id', id).order('created_at', { ascending: false }),
                supabase.from('ota_pengeluaran').select('*').eq('ota_id', id).order('created_at', { ascending: false })
            ])

            setSantriList(santriRes.data || [])

            // Calculate Stats
            const totalDonasi = pemasukanRes.data?.reduce((sum, item) => sum + Number(item.jumlah), 0) || 0
            const totalPengeluaran = pengeluaranRes.data?.reduce((sum, item) => sum + Number(item.jumlah), 0) || 0

            setStats({
                santriCount: santriRes.data?.length || 0,
                totalDonasi,
                totalPengeluaran,
                saldo: totalDonasi - totalPengeluaran
            })

            // Combine transactions for "Riwayat Pembayaran" (Donasi) info
            setTransactions(pemasukanRes.data || [])

            // 3. Check Linking Status
            if (profile.user_id) {
                // If linked, fetch email of that user
                // Note: user_profiles usually mimics auth.users. If email is not in user_profiles, we might not get it easily.
                // Assuming user_profiles has email or we query View. 
                // Let's query user_profiles.
                const { data: userProfile } = await supabase
                    .from('user_profiles')
                    .select('email, nama')
                    .eq('user_id', profile.user_id)
                    .single()

                setLinkedUserEmail(userProfile?.email || 'Email tidak ditemukan')
            } else {
                // If not linked, fetch available candidates
                fetchAvailableUsers()
            }

        } catch (error) {
            console.error('Error fetching details:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAvailableUsers = async () => {
        try {
            // Get all 'ota' users from user_profiles
            // Note: Postgres array check for role: role @> ARRAY['ota']::text[] OR role = 'ota' depends on schema.
            // Based on previous code, role is likely JSONB or Text. 
            // In UsersPage line 55: roles: ['guru']. It implies JSONB or Array.
            // Let's assume user_profiles has `role` column which is text or check constraint style?
            // "update_roles_ota.sql": check (role in (... 'ota'))
            // So role is a single string column usually, or array.
            // Let's try select * from user_profiles. Then filter in JS for safety if we don't know exact query syntax for array.

            const { data: allProfiles } = await supabase
                .from('user_profiles')
                .select('user_id, email, nama, roles')

            // Filter 1: Must have 'ota' role
            // Handling both string 'ota' and arrow/json ['ota']
            const otaCandidates = allProfiles?.filter(p => {
                const roles = p.roles || []
                return roles.includes('ota') || p.role === 'ota'
            }) || []

            // Filter 2: Must NOT be linked to ANY other orang_tua_asuh
            // We need list of TAKEN user_ids
            const { data: takenotas } = await supabase.from('orang_tua_asuh').select('user_id').not('user_id', 'is', null)
            const takenIds = takenotas?.map(t => t.user_id) || []

            const available = otaCandidates.filter(u => !takenIds.includes(u.user_id))
            setAvailableUsers(available)

        } catch (err) {
            console.error(err)
        }
    }

    const handleLinkUser = async () => {
        if (!selectedUserId) return
        setLinking(true)
        try {
            const { error } = await supabase
                .from('orang_tua_asuh')
                .update({ user_id: selectedUserId })
                .eq('id', id)

            if (error) throw error

            showToast.success('Akun berhasil dihubungkan')
            fetchDetail() // Reload
        } catch (err) {
            showToast.error('Gagal menghubungkan: ' + err.message)
        } finally {
            setLinking(false)
        }
    }

    const handleUnlinkUser = async () => {
        if (!window.confirm('Yakin ingin memutuskan hubungan akun ini? OTA tidak akan bisa login ke dashboard.')) return
        setLinking(true)
        try {
            const { error } = await supabase
                .from('orang_tua_asuh')
                .update({ user_id: null })
                .eq('id', id)

            if (error) throw error

            showToast.success('Akun diputus')
            setLinkedUserEmail('')
            fetchDetail() // Reload
        } catch (err) {
            showToast.error('Gagal memutus: ' + err.message)
        } finally {
            setLinking(false)
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Spinner label="Memuat Detail OTA..." /></div>

    if (!ota) return <div className="p-8 text-center">Data tidak ditemukan</div>

    return (
        <div className="p-6 space-y-6 fade-in bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Detail Orang Tua Asuh</h1>
                    <p className="text-gray-500">Monitoring lengkap profil dan aktivitas donasi</p>
                </div>
                <button
                    onClick={() => navigate('/admin/ota')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition"
                >
                    <ArrowLeft size={18} /> Kembali
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Profile & Linking */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-3xl mb-4">
                                {ota.nama?.substring(0, 2).toUpperCase()}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{ota.nama}</h2>
                            <p className="text-sm text-gray-500 mb-4">ID: {ota.id.substring(0, 8)}...</p>

                            <div className="w-full space-y-3 text-left">
                                <div className="flex items-center gap-3 text-gray-600 p-2 bg-gray-50 rounded-lg">
                                    <Mail size={16} /> <span className="text-sm">{ota.email || '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 p-2 bg-gray-50 rounded-lg">
                                    <Phone size={16} /> <span className="text-sm">{ota.no_hp || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between p-2">
                                    <span className="text-sm text-gray-500">Status Akun</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ota.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {ota.status ? 'Aktif' : 'Non-Aktif'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/admin/ota/${ota.id}/edit`)}
                                className="w-full mt-6 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
                            >
                                Edit Profil Detail
                            </button>
                        </div>
                    </div>

                    {/* Account Linking Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <LinkIcon size={18} className="text-blue-500" />
                            Koneksi Akun Login
                        </h3>

                        {ota.user_id ? (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-white rounded-full text-blue-600">
                                        <Lock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-semibold uppercase">Terhubung dengan</p>
                                        <p className="text-sm font-medium text-gray-900">{linkedUserEmail}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleUnlinkUser}
                                    disabled={linking}
                                    className="w-full py-2 bg-white text-red-600 border border-red-100 rounded-lg text-xs font-medium hover:bg-red-50 transition"
                                >
                                    Putuskan Koneksi
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Profil ini belum memiliki akses login. Hubungkan dengan akun User yang memiliki role <code className="bg-gray-100 px-1 rounded text-xs text-gray-700">ota</code>.
                                </p>

                                {availableUsers.length > 0 ? (
                                    <div className="space-y-2">
                                        <select
                                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                        >
                                            <option value="">-- Pilih Akun User --</option>
                                            {availableUsers.map(u => (
                                                <option key={u.user_id} value={u.user_id}>
                                                    {u.email} ({u.nama})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleLinkUser}
                                            disabled={!selectedUserId || linking}
                                            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                        >
                                            <LinkIcon size={14} /> Hubungkan Akun
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
                                        <p className="text-xs text-gray-500">Tidak ada user 'ota' yang tersedia (semua sudah terhubung).</p>
                                        <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => navigate('/users')}>
                                            + Buat User Baru
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Stats & Data */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <p className="text-gray-500 text-xs font-medium uppercase">Santri</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.santriCount}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <p className="text-gray-500 text-xs font-medium uppercase">Donasi</p>
                            <p className="text-xl font-bold text-green-600 mt-1 truncate">Rp {stats.totalDonasi.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <p className="text-gray-500 text-xs font-medium uppercase">Disalurkan</p>
                            <p className="text-xl font-bold text-orange-600 mt-1 truncate">Rp {stats.totalPengeluaran.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <p className="text-gray-500 text-xs font-medium uppercase">Saldo</p>
                            <p className="text-xl font-bold text-purple-600 mt-1 truncate">Rp {stats.saldo.toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    {/* Linked Santri */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Users size={18} /> Santri Binaan
                            </h3>
                            <button
                                onClick={() => navigate(`/admin/ota/${ota.id}/link`)}
                                className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 text-gray-600 font-medium transition shadow-sm"
                            >
                                Kelola Santri
                            </button>
                        </div>
                        <div className="p-0">
                            {santriList.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="p-3 text-left pl-6">Nama Santri</th>
                                            <th className="p-3 text-left">Kelas</th>
                                            <th className="p-3 text-right pr-6">NIS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {santriList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                <td className="p-3 pl-6 font-medium text-gray-900">{item.santri?.nama}</td>
                                                <td className="p-3 text-gray-500">{item.santri?.kelas?.nama}</td>
                                                <td className="p-3 pr-6 text-right text-gray-400 font-mono text-xs">{item.santri?.nis}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8">
                                    <EmptyState message="Belum ada santri terhubung" icon={Users} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Donations */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Wallet size={18} /> Riwayat Donasi (Terbaru)
                            </h3>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {transactions.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3 text-left pl-6">Tanggal</th>
                                            <th className="p-3 text-right">Jumlah</th>
                                            <th className="p-3 text-left pr-6">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map((tx, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                <td className="p-3 pl-6 text-gray-600">
                                                    {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="p-3 text-right font-medium text-green-600">
                                                    Rp {Number(tx.jumlah).toLocaleString('id-ID')}
                                                </td>
                                                <td className="p-3 pr-6 text-gray-500 truncate max-w-[150px]">
                                                    {tx.keterangan || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8">
                                    <EmptyState message="Belum ada data donasi" icon={Wallet} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OTADetail
