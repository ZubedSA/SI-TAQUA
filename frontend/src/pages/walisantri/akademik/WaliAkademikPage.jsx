import React from 'react'
import { 
    BookOpen, 
    Heart, 
    Calendar, 
    Award, 
    ChevronRight,
    TrendingUp,
    CheckCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../../components/layout/PageHeader'

/**
 * WaliAkademikPage - Menu utama untuk kategori Akademik di Portal Wali
 * Memberikan navigasi ke Hafalan, Evaluasi, dan Kehadiran
 */
const WaliAkademikPage = () => {
    const navigate = useNavigate()

    const menus = [
        {
            title: "Hafalan Al-Qur'an",
            description: "Pantau progress setoran harian dan muroja'ah santri secara real-time.",
            icon: BookOpen,
            path: "/wali/akademik/hafalan",
            color: "from-emerald-500 to-teal-600",
            lightColor: "bg-emerald-50 text-emerald-600",
            stats: "Update Harian"
        },
        {
            title: "Evaluasi & Nilai",
            description: "Lihat hasil ujian syahri, semester, serta catatan akhlak dan perilaku.",
            icon: Award,
            path: "/wali/akademik/evaluasi",
            color: "from-indigo-500 to-purple-600",
            lightColor: "bg-indigo-50 text-indigo-600",
            stats: "Rekap Nilai"
        },
        {
            title: "Kehadiran Santri",
            description: "Cek riwayat absensi harian dan persentase kehadiran di pondok.",
            icon: Calendar,
            path: "/wali/akademik/kehadiran",
            color: "from-blue-500 to-cyan-600",
            lightColor: "bg-blue-50 text-blue-600",
            stats: "Absensi"
        }
    ]

    return (
        <div className="space-y-8 animate-fade-in">
            <PageHeader
                title="Akademik Santri"
                description="Pusat informasi perkembangan pendidikan dan hafalan"
                icon={TrendingUp}
                backUrl="/wali/beranda"
            />

            <div className="grid gap-6">
                {menus.map((menu, idx) => (
                    <button
                        key={idx}
                        onClick={() => navigate(menu.path)}
                        className="group relative flex flex-col md:flex-row items-center gap-6 p-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-gray-300/50 transition-all duration-300 text-left active:scale-[0.98]"
                    >
                        {/* Icon Container */}
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[1.8rem] bg-gradient-to-br ${menu.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500 shrink-0`}>
                            <menu.icon size={32} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    {menu.title}
                                </h3>
                                <span className={`w-fit mx-auto md:mx-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${menu.lightColor}`}>
                                    {menu.stats}
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                {menu.description}
                            </p>
                        </div>

                        {/* Arrow */}
                        <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-50 items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                            <ChevronRight size={24} />
                        </div>

                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-gray-100 transition-colors"></div>
                    </button>
                ))}
            </div>

            {/* Quick Summary / Info Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="flex items-center gap-2 justify-center md:justify-start text-emerald-400 mb-2">
                            <CheckCircle2 size={20} />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Sistem Terintegrasi</span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight">Pantau Perkembangan Secara Akurat</h4>
                        <p className="text-slate-400 text-sm font-medium">Data diperbarui secara harian oleh Guru dan Musyrif halaqoh.</p>
                    </div>
                    <div className="px-8 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                        <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Status Sistem</span>
                        <span className="text-emerald-400 font-black">TERKONEKSI</span>
                    </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]"></div>
            </div>
        </div>
    )
}

export default WaliAkademikPage
