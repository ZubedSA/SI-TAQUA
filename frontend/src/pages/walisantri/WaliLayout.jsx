import { Outlet } from 'react-router-dom'
import WaliNavbar from './components/WaliNavbar'
import './WaliPortal.css'

/**
 * WaliLayout - Layout khusus untuk Portal Wali Santri
 * Tidak menggunakan sidebar admin, hanya navbar sederhana
 */
const WaliLayout = () => {
    return (
        <div className="wali-layout">
            <main className="wali-main">
                <Outlet />
            </main>
            <WaliNavbar />
        </div>
    )
}

export default WaliLayout
