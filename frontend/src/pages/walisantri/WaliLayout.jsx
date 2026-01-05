import { Outlet } from 'react-router-dom'
import { useLayoutEffect } from 'react'
import WaliNavbar from './components/WaliNavbar'
// import './WaliPortal.css' // REMOVED

/**
 * WaliLayout - Layout khusus untuk Portal Wali Santri
 * Tidak menggunakan sidebar admin, hanya navbar sederhana
 * Dark mode dinonaktifkan secara permanen
 */
const WaliLayout = () => {
    // Force light mode di seluruh halaman wali santri
    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light')
        // Simpan preference agar konsisten
        localStorage.setItem('ptqa-theme', 'light')
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <WaliNavbar />
            <main className="max-w-[1200px] mx-auto p-4 md:p-6 lg:p-8 animate-fade-in">
                <Outlet />
            </main>
        </div>
    )
}

export default WaliLayout
