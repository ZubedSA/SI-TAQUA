import { Link } from 'react-router-dom'
import { FileText, BookOpen, Wallet, ChevronRight } from 'lucide-react'
import HelperPageHeader from '../../../components/layout/PageHeader'

const LaporanWaliPage = () => {
    const menus = [
        {
            title: 'Laporan Hafalan',
            description: 'Riwayat setoran dan perkembangan hafalan',
            icon: BookOpen,
            color: 'bg-emerald-100 text-emerald-600',
            path: '/wali/laporan/hafalan'
        },
        {
            title: 'Laporan Pembayaran',
            description: 'Riwayat tagihan dan status pembayaran',
            icon: Wallet,
            color: 'bg-blue-100 text-blue-600',
            path: '/wali/laporan/pembayaran'
        },
        {
            title: 'Raport Akademik',
            description: 'Nilai ujian dan perilaku santri',
            icon: FileText,
            color: 'bg-amber-100 text-amber-600',
            path: '/wali/laporan/raport'
        }
    ]

    return (
        <div className="space-y-6">
            <HelperPageHeader
                title="Laporan & Hasil Belajar"
                description="Pantau perkembangan akademik santri"
                icon={FileText}
                backUrl="/wali/beranda"
            />

            <div className="grid gap-4">
                {menus.map((menu, idx) => (
                    <Link
                        key={idx}
                        to={menu.path}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${menu.color}`}>
                                <menu.icon size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                                    {menu.title}
                                </h3>
                                <p className="text-sm text-gray-500 line-clamp-1">
                                    {menu.description}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-primary-500" size={20} />
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default LaporanWaliPage
