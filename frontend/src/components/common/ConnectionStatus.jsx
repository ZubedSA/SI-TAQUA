import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { supabase, checkConnection } from '../../lib/supabase'
import './ConnectionStatus.css'

const ConnectionStatus = () => {
    const [status, setStatus] = useState({ checking: true, connected: false, error: null })

    const check = async () => {
        setStatus({ checking: true, connected: false, error: null })
        const result = await checkConnection()
        setStatus({ checking: false, ...result })
    }

    useEffect(() => {
        check()
    }, [])

    if (status.checking) {
        return (
            <div className="connection-status checking">
                <RefreshCw size={16} className="spin" />
                <span>Memeriksa koneksi...</span>
            </div>
        )
    }

    return (
        <div className={`connection-status ${status.connected ? 'connected' : 'disconnected'}`}>
            {status.connected ? (
                <>
                    <Wifi size={16} />
                    <span>Terhubung ke Supabase</span>
                </>
            ) : (
                <>
                    <WifiOff size={16} />
                    <span>Gagal koneksi: {status.error}</span>
                    <button className="retry-btn" onClick={check}>
                        <RefreshCw size={14} />
                    </button>
                </>
            )}
        </div>
    )
}

export default ConnectionStatus
