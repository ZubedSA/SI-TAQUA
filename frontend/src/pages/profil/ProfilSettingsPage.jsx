import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { User, Mail, Lock, Save, ArrowLeft, Eye, EyeOff, AtSign } from 'lucide-react'
import './ProfilSettings.css'

const ProfilSettingsPage = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()

    const [nama, setNama] = useState('')
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)

    const [loading, setLoading] = useState(false)
    const [loadingEmail, setLoadingEmail] = useState(false)
    const [loadingPassword, setLoadingPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (userProfile?.nama) setNama(userProfile.nama)
        if (userProfile?.username) setUsername(userProfile.username)
        if (user?.email) setEmail(user.email)
    }, [user, userProfile])

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            // Validasi username tidak boleh kosong
            if (!username.trim()) {
                throw new Error('Username tidak boleh kosong')
            }

            // Update nama dan username di user_profiles
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({
                    nama: nama,
                    username: username.toLowerCase().replace(/\s/g, ''),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)

            if (profileError) throw profileError

            setSuccess('Profil berhasil diperbarui!')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateEmail = async (e) => {
        e.preventDefault()
        setLoadingEmail(true)
        setError('')
        setSuccess('')

        try {
            if (!email.trim()) {
                throw new Error('Email tidak boleh kosong')
            }

            // [FIX] Gunakan RPC untuk SEMUA USER agar bisa update email "fake" tanpa konfirmasi
            // Ini untuk mengakomodasi kebutuhan development/testing user, termasuk self-update.
            // Fitur ini diaktifkan karena user mengalami masalah verifikasi email fake.

            const updatePayload = {
                target_user_id: user.id,
                new_email: email,
                new_username: userProfile?.username,     // Keep existing
                new_full_name: userProfile?.nama,        // Keep existing
                new_role: userProfile?.role,             // Keep existing
                new_roles: userProfile?.roles || [],     // Keep existing
                new_active_role: userProfile?.active_role, // Keep existing
                new_phone: userProfile?.phone || null    // Keep existing
            }

            console.log('🚀 Calling admin_update_user_email RPC from Profile (Self Update):', updatePayload)

            const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_update_user_email', updatePayload)

            if (rpcError) throw rpcError
            if (!rpcResult.success) throw new Error(rpcResult.message || 'Gagal update email via RPC')

            setSuccess('Email berhasil diperbarui (Instan & Terverifikasi)!')

        } catch (err) {
            console.error('Update email error:', err)
            setError(err.message)
        } finally {
            setLoadingEmail(false)
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        setLoadingPassword(true)
        setError('')
        setSuccess('')

        if (newPassword.length < 6) {
            setError('Password baru minimal 6 karakter')
            setLoadingPassword(false)
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Password baru dan konfirmasi tidak cocok')
            setLoadingPassword(false)
            return
        }

        try {
            // Update password via Supabase Auth Standard
            // Syarat: Trigger DB pada auth.users yang error harus sudah dihapus (hotfix trigger)
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (authError) throw authError

            // Update password_ref di user_profiles (optional log)
            await supabase
                .from('user_profiles')
                .update({ updated_at: new Date().toISOString() }) // Don't store plain password
                .eq('user_id', user.id)

            setSuccess('Password berhasil diubah!')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoadingPassword(false)
        }
    }

    return (
        <div className="profil-settings-page">
            <div className="page-header">
                <button className="btn btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    <span>Kembali</span>
                </button>
                <h1>Pengaturan Akun</h1>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="settings-grid">
                {/* Update Profile Form */}
                <div className="settings-card">
                    <div className="card-header">
                        <User size={24} />
                        <h3>Informasi Profil</h3>
                    </div>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label>Username</label>
                            <div className="input-with-icon">
                                <AtSign size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                    placeholder="Masukkan username"
                                />
                            </div>
                            <small>Username digunakan untuk login</small>
                        </div>
                        <div className="form-group">
                            <label>Nama Lengkap</label>
                            <input
                                type="text"
                                value={nama}
                                onChange={(e) => setNama(e.target.value)}
                                placeholder="Masukkan nama lengkap"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={18} />
                            <span>{loading ? 'Menyimpan...' : 'Simpan Profil'}</span>
                        </button>
                    </form>
                </div>

                {/* Update Email Form */}
                <div className="settings-card">
                    <div className="card-header">
                        <Mail size={24} />
                        <h3>Ubah Email</h3>
                    </div>
                    <form onSubmit={handleUpdateEmail}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Masukkan email baru"
                            />
                            <small>Email digunakan untuk autentikasi sistem</small>
                        </div>
                        <button type="submit" className="btn btn-secondary" disabled={loadingEmail}>
                            <Mail size={18} />
                            <span>{loadingEmail ? 'Menyimpan...' : 'Ubah Email'}</span>
                        </button>
                    </form>
                </div>

                {/* Update Password Form */}
                <div className="settings-card">
                    <div className="card-header">
                        <Lock size={24} />
                        <h3>Ubah Password</h3>
                    </div>
                    <form onSubmit={handleUpdatePassword}>
                        <div className="form-group">
                            <label>Password Baru</label>
                            <div className="password-input">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Masukkan password baru"
                                />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Konfirmasi Password Baru</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Ulangi password baru"
                            />
                        </div>
                        <button type="submit" className="btn btn-warning" disabled={loadingPassword}>
                            <Lock size={18} />
                            <span>{loadingPassword ? 'Mengubah...' : 'Ubah Password'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ProfilSettingsPage
