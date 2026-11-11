import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Sparkles, CheckCircle2, MessageSquare, Heart, Bookmark, Link, BookOpen, Home } from 'lucide-react'

const GerbangPijar = () => {
    const navigate = useNavigate()

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1)
        } else {
            navigate('/absensi/home')
        }
    }

    const steps = [
        {
            id: 1,
            title: 'Ucapan Salam',
            desc: 'Memulai dengan salam yang sempurna untuk membawa keberkahan dan ketenangan kelas.',
            icon: <MessageSquare className="text-emerald-500" />,
            bg: 'bg-emerald-50'
        },
        {
            id: 2,
            title: 'Menanyakan Kabar',
            desc: 'Membangun kedekatan emosional dan spiritual (Rabitah) dengan setiap santri.',
            icon: <Heart className="text-rose-500" />,
            bg: 'bg-rose-50'
        },
        {
            id: 3,
            title: 'Menata Niat',
            desc: 'نَوَيْتُ التَّعَلُّمَ لِإِعْلَاءِ كَلِمَةِ اللهِ',
            arabic: 'نَوَيْتُ التَّعَلُّمَ وَالتَّعْلِيْمَ لِإِعْلَاءِ كَلِمَةِ اللهِ',
            meaning: 'Saya berniat belajar dan mengajar semata-mata untuk meninggikan kalimat Allah.',
            icon: <Bookmark className="text-amber-500" />,
            bg: 'bg-amber-50'
        },
        {
            id: 4,
            title: 'Sambung Sanad',
            desc: 'Tawassul dan hadiah Fatihah kepada Baginda Rasulullah SAW, Para Sahabat, Ulama Masyayikh, Muassis pondok, dan kedua orang tua kita.',
            icon: <Link className="text-blue-500" />,
            bg: 'bg-blue-50'
        },
        {
            id: 5,
            title: 'Doa Mulai Pelajaran',
            desc: 'Memohon kemudahan, pemahaman yang mendalam, dan keberkahan ilmu yang akan dipelajari bersama.',
            icon: <BookOpen className="text-violet-500" />,
            bg: 'bg-violet-50'
        }
    ]

    return (
        <div className="max-w-2xl mx-auto pb-24">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex items-center justify-between mb-6">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200/80 text-gray-700 hover:text-emerald-700 hover:border-emerald-200 shadow-sm transition-all active:scale-95 text-xs font-bold cursor-pointer"
                >
                    <ChevronLeft size={18} />
                    <span>Kembali</span>
                </button>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                    <Sparkles size={13} className="text-emerald-600 animate-spin-slow" />
                    <span>Protokol Pengajaran</span>
                </div>
            </div>

            {/* Hero / Intro Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 to-teal-700 p-6 md:p-8 text-white mb-8 shadow-xl shadow-emerald-600/20">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={18} className="text-emerald-200" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100">Adab & Protokol KBM</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight text-white">Gerbang Pijar</h1>
                    <p className="text-emerald-50/90 text-xs md:text-sm leading-relaxed font-medium">
                        Ikuti 5 langkah adab berikut untuk memastikan keberkahan, sambung sanad, dan kesiapan spiritual santri sebelum mentransfer ilmu.
                    </p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-28 h-28 bg-teal-400/20 rounded-full blur-2xl translate-y-8 -translate-x-8"></div>
            </div>

            {/* Steps List */}
            <div className="space-y-4">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className="group relative overflow-hidden bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                        <div className="flex items-start gap-4 md:gap-5">
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${step.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300`}>
                                {step.icon}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Langkah {step.id}</span>
                                    <CheckCircle2 size={18} className="text-gray-200 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">{step.title}</h3>

                                {step.arabic ? (
                                    <div className="py-4 px-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/60 my-2 shadow-inner">
                                        <p className="text-lg sm:text-xl md:text-2xl text-emerald-900 text-center leading-relaxed font-arabic" dir="rtl">
                                            {step.arabic}
                                        </p>
                                        <p className="text-[11px] text-emerald-700 italic mt-2.5 text-center font-medium">"{step.meaning}"</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-xs md:text-sm font-medium leading-relaxed">
                                        {step.desc}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/absensi/home')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                    <Home size={16} />
                    <span>Ke Beranda</span>
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/absensi/agenda')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-gray-900/10 cursor-pointer"
                >
                    <span>Lanjut ke Agenda Absensi</span>
                    <CheckCircle2 size={18} />
                </button>
            </div>
        </div>
    )
}

export default GerbangPijar
