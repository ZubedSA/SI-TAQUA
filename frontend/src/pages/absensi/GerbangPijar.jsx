import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Sparkles, CheckCircle2, MessageSquare, Heart, Bookmark, Link, BookOpen } from 'lucide-react'

const GerbangPijar = () => {
    const navigate = useNavigate()

    const steps = [
        {
            id: 1,
            title: 'Ucapan Salam',
            desc: 'Memulai dengan salam yang sempurna untuk membawa keberkahan.',
            icon: <MessageSquare className="text-emerald-500" />,
            bg: 'bg-emerald-50'
        },
        {
            id: 2,
            title: 'Menanyakan Kabar',
            desc: 'Membangun kedekatan emosional (Rabitah) dengan santri.',
            icon: <Heart className="text-rose-500" />,
            bg: 'bg-rose-50'
        },
        {
            id: 3,
            title: 'Menata Niat',
            desc: 'نَوَيْتُ التَّعَلُّمَ لِإِعْلَاءِ كَلِمَةِ اللهِ',
            arabic: 'نَوَيْتُ التَّعَلُّمَ لِإِعْلَاءِ كَلِمَةِ اللهِ',
            meaning: 'Saya berniat belajar untuk meninggikan kalimat Allah.',
            icon: <Bookmark className="text-amber-500" />,
            bg: 'bg-amber-50'
        },
        {
            id: 4,
            title: 'Sambung Sanad',
            desc: 'Tawassul kepada Rasulullah SAW, Masyayikh, Muassis, dan kedua orang tua kita.',
            icon: <Link className="text-blue-500" />,
            bg: 'bg-blue-50'
        },
        {
            id: 5,
            title: 'Doa Mulai Pelajaran',
            desc: 'Memohon kemudahan dan keberkahan ilmu yang akan dipelajari.',
            icon: <BookOpen className="text-violet-500" />,
            bg: 'bg-violet-50'
        }
    ]

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md bg-white/80">
                <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-lg font-black text-gray-900 tracking-tight">Gerbang Pijar</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 py-8">
                {/* Intro Card */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 to-teal-600 p-8 text-white mb-8 shadow-xl shadow-emerald-500/20">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={20} className="text-emerald-200" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Adab & Protokol</span>
                        </div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight text-white">Memulai Pelajaran</h2>
                        <p className="text-emerald-50/90 text-sm leading-relaxed font-medium">
                            Ikuti langkah-langkah berikut untuk memastikan keberkahan dan kesiapan spiritual sebelum mentransfer ilmu.
                        </p>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-400/20 rounded-full blur-2xl translate-y-8 -translate-x-8"></div>
                </div>

                {/* Steps List */}
                <div className="space-y-4">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className="group relative overflow-hidden bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <div className="flex items-start gap-6">
                                <div className={`w-14 h-14 rounded-2xl ${step.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-500`}>
                                    {step.icon}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Langkah {step.id}</span>
                                        <CheckCircle2 size={18} className="text-gray-200 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{step.title}</h3>

                                    {step.arabic ? (
                                        <div className="py-4 px-4 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50 my-2 shadow-inner">
                                            <p className="text-xl sm:text-2xl md:text-3xl text-emerald-900 text-center leading-relaxed font-arabic" dir="rtl">
                                                {step.arabic}
                                            </p>
                                            <p className="text-[10px] sm:text-[11px] text-emerald-600/70 italic mt-3 text-center font-medium">"{step.meaning}"</p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                            {step.desc}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Action */}
                <div className="mt-12 text-center">
                    <button
                        onClick={() => navigate('/absensi/agenda')}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-gray-900/10"
                    >
                        <span>Lanjut ke Absensi</span>
                        <CheckCircle2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default GerbangPijar
