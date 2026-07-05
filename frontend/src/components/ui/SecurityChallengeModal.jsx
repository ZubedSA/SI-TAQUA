import { useState } from 'react'
import { ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react'
import './SecurityChallengeModal.css'

const SecurityChallengeModal = ({ isOpen, onVerify, error }) => {
    const [answer, setAnswer] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!answer.trim()) return

        setLoading(true)
        // Simulate a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 600))
        await onVerify(answer)
        setLoading(false)
    }

    return (
        <div className="security-challenge-overlay">
            <div className="security-challenge-modal">
                <div className="challenge-icon">
                    <ShieldAlert size={32} />
                </div>

                <h3 className="challenge-title">Verifikasi Keamanan</h3>
                <p className="challenge-desc">
                    Kami mendeteksi aktivitas login dari perangkat baru atau yang tidak biasa.
                    Untuk melanjutkan, silakan ketik kata kunci verifikasi di bawah ini:
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="challenge-input-group">
                        <label>Ketik: <strong>bismillah</strong></label>
                        <input
                            type="text"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            className={`challenge-input ${error ? 'error' : ''}`}
                            placeholder="bismillah"
                            autoFocus
                            autoComplete="off"
                        />
                        {error && (
                            <div className="challenge-error">
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="challenge-actions">
                        <button
                            type="submit"
                            className="btn-verify"
                            disabled={!answer || loading}
                        >
                            {loading ? 'Memverifikasi...' : 'Verifikasi & Lanjut'}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SecurityChallengeModal
