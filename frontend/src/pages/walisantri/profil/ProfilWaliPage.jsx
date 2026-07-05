import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, User, Phone, Mail, Save, Loader,
    GraduationCap, BookOpen, LogOut, Shield, Lock, Key, Eye, EyeOff
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useCalendar } from '../../../context/CalendarContext'
import { useToast } from '../../../context/ToastContext'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'
// import '../WaliPortal.css' // REMOVED

/**
 * ProfilWaliPage - Halaman profil wali santri
 * Refactored to use Global Layout System (Phase 2)
 */
const ProfilWaliPage = () => {
    const { user, signOut } = useAuth()
    const showToast = useToast()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [santriList, setSantriList] = useState([])

    // Form state
    const [formData, setFormData] = useState({
        nama: '',
        phone: '',
        email: ''
    })

    // Password change state
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })
    const [changingPassword, setChangingPassword] = useState(false)

    // Fetch data
    const fetchData = async () => {
        try {
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (profileError && profileError.code !== 'PGRST116') throw profileError

            if (profile) {
                setFormData({
                    nama: profile.nama || '',
                    phone: profile.phone || '',
                    email: profile.email || user.email || ''
                })
            }

            // Fetch santri
            const { data: santri, error: santriError } = await supabase
                .from('santri')
                .select(`
          *,
          kelas:kelas_id (nama),
          halaqoh:halaqoh_id (nama)
        `)
                .eq('wali_id', user.id)
                .order('nama')

            if (santriError) throw santriError
            setSantriList(santri || [])

        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    phone: formData.phone,
                    email: formData.email
                })
                .eq('user_id', user.id)

            if (error) throw error

            showToast.success('Profil berhasil diperbarui!')

        } catch (error) {
            console.error('Error updating profile:', error)
            showToast.error('Gagal memperbarui profil: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handlePasswordChange = async (e) => {
        e.preventDefault()

        // Validation
        if (passwordData.newPassword.length < 6) {
            showToast.error('Password baru minimal 6 karakter')
            return
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast.error('Konfirmasi password tidak cocok')
            return
        }

        setChangingPassword(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            })

            if (error) throw error

            showToast.success('Password berhasil diubah!')
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            setShowPasswordForm(false)

        } catch (error) {
            console.error('Error changing password:', error)
            showToast.error('Gagal mengubah password: ' + error.message)
        } finally {
            setChangingPassword(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const { formatDate } = useCalendar()

    return (
        <div className="space-y-6 pb-20">
            {/* Header Profil Premium */}
            <div className="relative -mx-4 -mt-6 mb-8 pt-10 pb-20 px-6 rounded-b-[4rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 overflow-hidden shadow-2xl">
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center mb-4 shadow-xl">
                        <User size={48} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight text-center leading-none mb-1">
                        {formData.nama}
                    </h2>
                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest opacity-80">
                        Wali Santri Pondok Pesantren
                    </p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Kolom 1: Profil & Keamanan */}
                <div className="lg:col-span-1 space-y-8 -mt-12 relative z-20">
                    {/* Data Pribadi */}
                    <div className="glass-card p-6 bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <User size={20} />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Data Pribadi</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                                <div className="px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-500 font-bold text-sm">
                                    {formData.nama}
                                </div>
                                <p className="mt-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-1.5 ml-1">
                                    <Shield size={10} />
                                    Hanya Admin yang dapat merubah nama
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nomor WhatsApp</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Phone size={16} />
                                    </div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-sm"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Alamat Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-sm"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                                )}
                                {saving ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                            </button>
                        </form>
                    </div>

                    {/* Keamanan */}
                    <div className="glass-card p-6 bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                <Lock size={20} />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Keamanan</h3>
                        </div>

                        <div className="space-y-4">
                            {!showPasswordForm ? (
                                <button
                                    onClick={() => setShowPasswordForm(true)}
                                    className="w-full flex items-center gap-4 p-4 bg-gray-50/50 hover:bg-indigo-50/50 border border-gray-100 rounded-[1.5rem] transition-all text-left group"
                                >
                                    <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Key size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-gray-900 uppercase text-xs tracking-widest">Ganti Password</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Demi keamanan akun Anda</p>
                                    </div>
                                </button>
                            ) : (
                                <form onSubmit={handlePasswordChange} className="space-y-4 p-5 bg-indigo-50/30 rounded-[1.5rem] border border-indigo-100">
                                    <div>
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 ml-1">Password Baru</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.new ? 'text' : 'password'}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className="w-full px-4 py-2.5 pr-11 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-indigo-100 font-bold text-sm transition-all"
                                                placeholder="Minimal 6 karakter"
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-indigo-600"
                                            >
                                                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5 ml-1">Ulangi Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.confirm ? 'text' : 'password'}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="w-full px-4 py-2.5 pr-11 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-indigo-100 font-bold text-sm transition-all"
                                                placeholder="Konfirmasi password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-indigo-600"
                                            >
                                                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowPasswordForm(false)
                                                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                            }}
                                            className="flex-1 px-4 py-2.5 bg-white text-gray-500 rounded-xl hover:bg-gray-100 font-black uppercase text-[10px] tracking-widest transition-all"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={changingPassword}
                                            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50"
                                        >
                                            {changingPassword ? '...' : 'Ganti'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            <button
                                onClick={async () => {
                                    try {
                                        await signOut()
                                        navigate('/login')
                                    } catch (error) {
                                        console.error('Logout error:', error)
                                        showToast.error('Gagal keluar: ' + error.message)
                                    }
                                }}
                                className="w-full flex items-center gap-4 p-4 bg-gray-50/50 hover:bg-rose-50/50 border border-gray-100 rounded-[1.5rem] transition-all text-left group"
                            >
                                <div className="p-3 bg-white text-gray-400 group-hover:bg-rose-600 group-hover:text-white rounded-2xl shadow-sm border border-gray-100 transition-all">
                                    <LogOut size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-gray-900 uppercase text-xs tracking-widest group-hover:text-rose-600 transition-colors">Logout / Keluar</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Akhiri sesi login sekarang</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Kolom 2: Data Santri */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Data Santri Terhubung</h3>
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black tracking-widest border border-indigo-100 uppercase">
                            {santriList.length} Santri
                        </div>
                    </div>

                    {santriList.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {santriList.map(santri => (
                                <div key={santri.id} className="glass-card bg-white/75 backdrop-blur-md border border-white/50 rounded-[3rem] p-8 shadow-xl relative overflow-hidden group transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="relative mb-6">
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-1 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                                <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden">
                                                    {santri.foto_url ? (
                                                        <img src={santri.foto_url} alt={santri.nama} className="w-full h-full object-cover rounded-full" />
                                                    ) : (
                                                        <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                                                            <User size={40} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${santri.status === 'Aktif' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                {santri.status === 'Aktif' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>}
                                            </div>
                                        </div>

                                        <div className="text-center mb-6">
                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-1 group-hover:text-indigo-600 transition-colors">{santri.nama}</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NIS: {santri.nis}</p>
                                        </div>

                                        <div className="w-full grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50 text-center">
                                                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Kelas</span>
                                                <span className="text-[10px] font-black text-gray-900 uppercase">{santri.kelas?.nama || '-'}</span>
                                            </div>
                                            <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50 text-center">
                                                <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Halaqoh</span>
                                                <span className="text-[10px] font-black text-gray-900 uppercase truncate px-1">{santri.halaqoh?.nama || '-'}</span>
                                            </div>
                                        </div>

                                        <Link
                                            to={`/wali/akademik/halaqoh`}
                                            className="w-full py-3 bg-white text-indigo-600 border-2 border-indigo-50 hover:bg-indigo-600 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all text-center shadow-sm"
                                        >
                                            Detail Akademik
                                        </Link>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-100/40 transition-colors"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={GraduationCap}
                            title="Belum Ada Santri"
                            description="Akun Anda belum terhubung dengan data santri manapun."
                        />
                    )}

                    <div className="p-6 bg-indigo-600/5 border border-indigo-100 rounded-[2rem] relative overflow-hidden">
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-1">Informasi Pusat Bantuan</h5>
                                <p className="text-gray-700 text-xs font-medium leading-relaxed">
                                    Data santri ditampilkan berdasarkan relasi wali murid. Jika ada kesalahan data atau santri yang belum muncul, silakan hubungi bagian <span className="font-black text-indigo-600">Administrasi Pondok Pesantren</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfilWaliPage
