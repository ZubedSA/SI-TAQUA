import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { User, Mail, Lock, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import './ProfilSettings.css'

const ProfilSettingsPage = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()

    const [nama, setNama] = useState('')
    const [email, setEmail] = useState('')
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (userProfile?.nama) setNama(userProfile.nama)
        if (user?.email) setEmail(user.email)
    }, [user, userProfile])

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            // Update nama di user_profiles
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({ nama: nama, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)

            if (profileError) throw profileError

            setSuccess('Profil berhasil diperbarui!')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        if (newPassword.length < 6) {
            setError('Password baru minimal 6 karakter')
            setLoading(false)
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Password baru dan konfirmasi tidak cocok')
            setLoading(false)
            return
        }

        try {
            // Update password via backend API
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
            const response = await fetch(`${backendUrl}/api/users/update-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    newPassword: newPassword
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Gagal mengubah password')
            }

            // Update password_ref
            await supabase
                .from('user_profiles')
                .update({ password_ref: newPassword, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)

            setSuccess('Password berhasil diubah! Silakan login ulang dengan password baru.')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
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
                            <label>Nama Lengkap</label>
                            <input
                                type="text"
                                value={nama}
                                onChange={(e) => setNama(e.target.value)}
                                placeholder="Masukkan nama lengkap"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <div className="input-with-icon">
                                <Mail size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="disabled"
                                />
                            </div>
                            <small>Email tidak dapat diubah</small>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={18} />
                            <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
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
                        <button type="submit" className="btn btn-warning" disabled={loading}>
                            <Lock size={18} />
                            <span>{loading ? 'Mengubah...' : 'Ubah Password'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ProfilSettingsPage
