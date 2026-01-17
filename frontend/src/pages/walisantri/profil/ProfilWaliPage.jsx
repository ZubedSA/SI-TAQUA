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
        <div className="space-y-6">
            <PageHeader
                title="Profil Saya"
                description="Kelola data pibadi dan informasi santri"
                icon={User}
                backUrl="/wali/beranda"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profil Wali Form */}
                <div className="lg:col-span-1 space-y-6">
                    <Card title="Data Wali Santri" icon={User}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Nama (Read Only) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={formData.nama}
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                                    disabled
                                />
                                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                    <Shield size={10} />
                                    Nama tidak dapat diubah
                                </p>
                            </div>

                            {/* No HP */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>

                            <Button type="submit" isLoading={saving} className="w-full">
                                <Save size={18} className="mr-2" />
                                Simpan Perubahan
                            </Button>
                        </form>
                    </Card>

                    {/* Keamanan Akun */}
                    <Card title="Keamanan Akun" icon={Lock}>
                        <div className="space-y-4">
                            {/* Ubah Password */}
                            {!showPasswordForm ? (
                                <button
                                    onClick={() => setShowPasswordForm(true)}
                                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-left"
                                >
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Key size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">Ubah Password</p>
                                        <p className="text-xs text-gray-500">Ganti password login Anda</p>
                                    </div>
                                </button>
                            ) : (
                                <form onSubmit={handlePasswordChange} className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.new ? 'text' : 'password'}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                placeholder="Minimal 6 karakter"
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.confirm ? 'text' : 'password'}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                placeholder="Ulangi password baru"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
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
                                            className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={changingPassword}
                                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {changingPassword && (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            )}
                                            {changingPassword ? 'Menyimpan...' : 'Simpan Password'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Keluar Akun */}
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
                                className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition-colors text-left group"
                            >
                                <div className="p-2 bg-gray-100 group-hover:bg-red-100 text-gray-600 group-hover:text-red-600 rounded-lg transition-colors">
                                    <LogOut size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">Keluar Akun</p>
                                    <p className="text-xs text-gray-500">Akhiri sesi login Anda</p>
                                </div>
                            </button>
                        </div>
                    </Card>
                </div>

                {/* Data Santri List */}
                <div className="lg:col-span-2">
                    <Card title={`Data Santri Terhubung (${santriList.length})`} icon={GraduationCap}>
                        {santriList.length > 0 ? (
                            <div className="space-y-4">
                                {santriList.map(santri => (
                                    <div key={santri.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 hover:shadow-md transition-shadow">
                                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                            {/* Avatar */}
                                            <div className="flex-shrink-0">
                                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                                    {santri.foto_url ? (
                                                        <img src={santri.foto_url} alt={santri.nama} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={32} className="text-gray-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 w-full">
                                                <div className="flex flex-col md:flex-row justify-between md:items-start mb-4 gap-2">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900">{santri.nama}</h3>
                                                        <p className="text-sm text-gray-500">NIS: <span className="font-mono font-medium text-gray-700">{santri.nis}</span></p>
                                                    </div>
                                                    <Badge variant={santri.status === 'Aktif' ? 'success' : 'danger'}>
                                                        {santri.status}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Kelas</p>
                                                        <p className="text-sm font-medium text-gray-900">{santri.kelas?.nama || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Halaqoh</p>
                                                        <p className="text-sm font-medium text-gray-900">{santri.halaqoh?.nama || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Jenis Kelamin</p>
                                                        <p className="text-sm font-medium text-gray-900">{santri.jenis_kelamin}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">TTL</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {santri.tempat_lahir}, {santri.tanggal_lahir ? formatDate(santri.tanggal_lahir) : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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

                        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                            <BookOpen size={20} className="shrink-0 mt-0.5" />
                            <p>
                                Data santri ditampilkan berdasarkan relasi wali murid. Jika ada kesalahan data atau santri yang belum muncul, silakan hubungi bagian administrasi pondok.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default ProfilWaliPage
