import { useState, useEffect, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, UserPlus, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { translateError } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import SecurityChallengeModal from '../../components/ui/SecurityChallengeModal'
import logoFile from '../../assets/Logo_PTQA_075759.png'
import './Login.css'

const Login = () => {
    const navigate = useNavigate()
    const { signIn, signUp } = useAuth()

    // Force light mode on login page - PERMANEN, tidak restore
    useLayoutEffect(() => {
        // Set light mode langsung
        document.documentElement.setAttribute('data-theme', 'light')
        // Hapus saved theme untuk mencegah flash dark mode
        localStorage.setItem('ptqa-theme', 'light')
    }, [])

    const [emailOrPhone, setEmailOrPhone] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [showChallenge, setShowChallenge] = useState(false)
    const [challengeError, setChallengeError] = useState('')
    const [tempUserId, setTempUserId] = useState(null)
    const [blockedUntil, setBlockedUntil] = useState(null)
    const [blockedMessage, setBlockedMessage] = useState('')

    // Check restrictions on load/email change
    const checkRestriction = async () => {
        if (!emailOrPhone || !emailOrPhone.includes('@')) return

        try {
            const { data, error } = await supabase.rpc('check_login_restriction', {
                p_email: emailOrPhone
            })

            if (data?.restricted) {
                setBlockedUntil(Date.now() + (data.remaining_seconds * 1000))
                setBlockedMessage(data.message)
                setError(data.message)
            } else {
                setBlockedUntil(null)
                setBlockedMessage('')
            }
        } catch (err) {
            console.error('Restriction check failed:', err)
        }
    }

    const handleChallengeVerify = async (answer) => {
        setChallengeError('')
        try {
            const { data, error } = await supabase.rpc('verify_security_challenge', {
                p_user_id: tempUserId,
                p_answer: answer
            })

            if (error) throw error

            if (data.success) {
                setShowChallenge(false)
                // Proceed to dashboard logic manually since signIn was half-done
                // But signIn actually returns session, so we need to know where to go.
                // Re-running signIn might trigger challenge again? 
                // No, challenge log success allows next login? 
                // Actually, the best way: if challenge success, just redirect.
                // Because we are already authenticated by signIn internally before challenge intercept?
                // Wait, if signIn succeeds, we get session. So we are logged in.

                // Fetch role to redirect
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('user_id', tempUserId)
                    .single()

                const role = profile?.role || 'guest'
                if (role === 'wali') navigate('/wali-santri')
                else navigate('/')

            } else {
                setChallengeError(data.message || 'Jawaban salah.')
            }
        } catch (err) {
            setChallengeError('Gagal verifikasi: ' + err.message)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setChallengeError('')

        if (blockedUntil && Date.now() < blockedUntil) {
            setError(blockedMessage)
            return
        }

        setLoading(true)

        try {
            if (!emailOrPhone) throw new Error('Username harus diisi')
            if (!password) throw new Error('Password harus diisi')

            // 1. Attempt Login
            const loginResult = await signIn(emailOrPhone, password)
            const userId = loginResult.user.id

            // 2. Log Success
            await supabase.rpc('log_login_activity', {
                p_email: loginResult.user.email,
                p_status: 'SUCCESS',
                p_ip: 'unknown', // Client side can't get IP easily without edge function
                p_user_agent: navigator.userAgent,
                p_device_id: localStorage.getItem('ptqa_device_id')
            })

            // 3. Security Challenge Check (Client Side Heuristic)
            // If device ID is missing, trigger challenge
            const deviceId = localStorage.getItem('ptqa_device_id')
            if (!deviceId) {
                // New device detected!
                setTempUserId(userId)
                setShowChallenge(true)

                // Generate new device ID
                const newDeviceId = crypto.randomUUID()
                localStorage.setItem('ptqa_device_id', newDeviceId)
                setLoading(false)
                return // Stop redirect until challenge verified
            }

            // Normal Redirect
            if (loginResult.role === 'wali') {
                navigate('/wali-santri')
            } else {
                navigate('/')
            }

        } catch (err) {
            console.error('Login error:', err)
            const translatedMsg = translateError(err)
            setError(translatedMsg)

            // Log Failure
            try {
                let targetEmail = emailOrPhone
                // Resolve if username
                if (!targetEmail.includes('@')) {
                    const { data } = await supabase.rpc('get_email_by_username', { p_username: targetEmail })
                    if (data) targetEmail = data
                }

                if (targetEmail && targetEmail.includes('@')) {
                    const { data } = await supabase.rpc('log_login_activity', {
                        p_email: targetEmail,
                        p_status: 'FAILED',
                        p_ip: 'unknown',
                        p_user_agent: navigator.userAgent
                    })

                    // Check if blocked
                    if (data?.blocked) {
                        setBlockedUntil(Date.now() + (data.cooldown_seconds * 1000))
                        setBlockedMessage(data.reason + '. ' + Math.ceil(data.cooldown_seconds / 60) + ' menit.')
                        setError(translatedMsg + ' (Akun dibatasi sementara)')
                    }
                }
            } catch (logErr) {
                console.error('Logging failed:', logErr)
            }
        } finally {
            if (!showChallenge) setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Header with Logo */}
                <div className="login-header">
                    <img src={logoFile} alt="Logo PTQA Batuan" className="login-logo" />
                    <p className="system-title">Sistem Informasi PTQA Batuan</p>
                </div>

                {/* Alerts */}
                {error && <div className="alert error">{error}</div>}


                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="Masukkan username"
                            value={emailOrPhone}
                            onChange={(e) => setEmailOrPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="password-field">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? <RefreshCw size={18} className="spin" /> : <LogIn size={18} />}
                        <span>{loading ? 'Memproses...' : 'Masuk'}</span>
                    </button>
                </form>

                {/* Footer - Copyright only now since registration is disabled */}
            </div>

            {/* Copyright */}
            <p className="copyright">© 2025 PTQA Batuan. All rights reserved.</p>

            <SecurityChallengeModal
                isOpen={showChallenge}
                onVerify={handleChallengeVerify}
                error={challengeError}
            />
        </div>
    )
}

export default Login

