import { useEffect, useRef, useState } from 'react'

/**
 * VersionChecker
 * 
 * Component ini secara diam-diam mengecek apakah ada versi baru aplikasi yang tersedia.
 * Jika file /version.json di server memiliki timestamp yang berbeda dengan yang ada di browser,
 * maka aplikasi dianggap usang dan akan melakukan refresh otomatis (hanya jika user aktif).
 */
const VersionChecker = ({
    checkInterval = 60 * 1000, // Cek setiap 1 menit (default)
    autoRefresh = true
}) => {
    const [isLatest, setIsLatest] = useState(true)
    const currentVersion = useRef(null)
    const lastCheck = useRef(Date.now())

    // Helper untuk mengambil versi dari server
    const fetchVersion = async () => {
        try {
            // Tambahkan timestamp query param untuk menghindari cache browser pada request ini
            const res = await fetch(`/version.json?t=${Date.now()}`)
            if (!res.ok) return null
            const data = await res.json()
            return data.version
        } catch (error) {
            console.warn('[VersionChecker] Failed to check version:', error)
            return null
        }
    }

    // Fungsi refresh halaman
    const refreshApp = () => {
        console.log('[VersionChecker] New version detected! Refreshing...')
        if ('caches' in window) {
            // Bersihkan semua cache storage jika ada (Service Worker)
            caches.keys().then((names) => {
                names.forEach((name) => {
                    caches.delete(name)
                })
            })
        }
        window.location.reload(true) // Hard reload
    }

    useEffect(() => {
        // Initial check: simpan versi saat ini saat pertama kali load
        const init = async () => {
            const version = await fetchVersion()
            if (version) {
                currentVersion.current = version
                console.log('[VersionChecker] Initial version:', version)
            }
        }
        init()

        // Interval check
        const intervalId = setInterval(async () => {
            // Throttle check: jangan cek terlalu sering jika tab tidak aktif (browser throttling)
            // Tapi kita ingin cek saat aktif.
            if (document.hidden) return

            // Cek versi
            const newVersion = await fetchVersion()

            // Jika belum punya versi awal (ini check pertama kali), set saja
            if (!currentVersion.current && newVersion) {
                currentVersion.current = newVersion
                return
            }

            // Jika versi berbeda dan valid
            if (currentVersion.current && newVersion && newVersion !== currentVersion.current) {
                setIsLatest(false)
                if (autoRefresh) {
                    refreshApp()
                }
            }
        }, checkInterval)

        // Event listener untuk saat tab menjadi focus/aktif kembali
        const onVisibilityChange = async () => {
            if (!document.hidden && currentVersion.current) {
                const now = Date.now()
                // Cek hanya jika sudah lebih dari 10 detik sejak cek terakhir untuk hindari spam
                if (now - lastCheck.current > 10000) {
                    lastCheck.current = now
                    const newVersion = await fetchVersion()
                    if (newVersion && newVersion !== currentVersion.current) {
                        setIsLatest(false)
                        refreshApp()
                    }
                }
            }
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('focus', onVisibilityChange)

        return () => {
            clearInterval(intervalId)
            document.removeEventListener('visibilitychange', onVisibilityChange)
            window.removeEventListener('focus', onVisibilityChange)
        }
    }, [checkInterval, autoRefresh])

    // Render nothing (invisible component)
    return null
}

export default VersionChecker
