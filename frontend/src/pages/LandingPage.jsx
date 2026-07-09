import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    BookOpen,
    ShieldCheck,
    GraduationCap,
    ArrowRight,
    LayoutDashboard,
    CheckCircle2,
    Heart,
    UserCheck,
    Download,
    Smartphone,
    Monitor
} from 'lucide-react';
import logoFile from '../assets/Logo_PTQA_075759.png';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isIOS, setIsIOS] = React.useState(false);
    const [isStandalone, setIsStandalone] = React.useState(false);

    useEffect(() => {
        if (!loading && user) {
            navigate('/home', { replace: true });
        }

        // Detect if app is already installed/standalone
        const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        setIsStandalone(checkStandalone);

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        // Listen for PWA install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [user, loading, navigate]);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else if (isIOS) {
            alert('Untuk menginstal di iPhone/iPad:\n1. Klik ikon "Share" di bawah (kotak dengan panah atas)\n2. Gulir ke bawah dan pilih "Add to Home Screen" atau "Tambahkan ke Layar Utama"');
        } else {
            alert('Aplikasi dapat diinstal melalui menu browser Anda (titik tiga > Instal Aplikasi)');
        }
    };

    // AOS-like animation effect
    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '50px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, observerOptions);

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            const animatedElements = document.querySelectorAll('.animate-on-scroll');
            animatedElements.forEach(el => observer.observe(el));

            // Second fallback: if still not visible after 500ms, force it
            setTimeout(() => {
                document.querySelectorAll('.animate-on-scroll:not(.is-visible)').forEach(el => {
                    el.classList.add('is-visible');
                });
            }, 500);
        }, 50);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, []);

    const trilogiSantri = [
        {
            title: "Taqwallah",
            icon: <ShieldCheck className="w-12 h-12 text-emerald-600" />,
            description: "Membentuk pribadi yang senantiasa bertaqwa kepada Allah SWT dalam setiap keadaan.",
            color: "from-emerald-50 to-green-100"
        },
        {
            title: "Berakhlakul Karimah",
            icon: <Heart className="w-12 h-12 text-rose-600" />,
            description: "Menanamkan adab dan akhlaq mulia sebagai cerminan dari penghafal Al-Qur'an.",
            color: "from-rose-50 to-pink-100"
        },
        {
            title: "Berilmu Amaliyah & Beramal Ilmiyah",
            icon: <GraduationCap className="w-12 h-12 text-blue-600" />,
            description: "Ilmu yang dipelajari diamalkan, dan amalan yang dilakukan berlandaskan ilmu yang benar.",
            color: "from-blue-50 to-indigo-100"
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A2619]"></div>
            </div>
        );
    }

    return (
        <div className="landing-container min-h-screen bg-white selection:bg-emerald-100 selection:text-emerald-900">
            {/* Header / Navbar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logoFile} alt="Logo PTQA" className="h-12 w-auto" width="48" height="48" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">SI-TAQUA</h1>
                            <p className="text-xs text-[#0A2619] font-black tracking-wider">PTQA AL-USYMUNI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/absensi/login')}
                            className="flex items-center justify-center gap-2 text-[#0A2619] hover:text-white p-2.5 md:px-4 md:py-2 rounded-full font-bold transition-all border border-[#0A2619]/20 hover:bg-[#0A2619] active:scale-90"
                            title="Portal Absensi"
                        >
                            <UserCheck size={20} />
                            <span className="hidden lg:inline">Portal Absensi</span>
                        </button>

                        <button
                            onClick={() => navigate(user ? '/home' : '/login')}
                            className="flex items-center justify-center gap-2 bg-[#0A2619] hover:bg-[#143d2a] text-[#BCF32F] p-2.5 md:px-6 md:py-2.5 rounded-full font-bold transition-all shadow-lg hover:shadow-[#0A2619]/20 active:scale-95"
                        >
                            {user ? (
                                <>
                                    <LayoutDashboard size={20} />
                                    <span className="hidden md:inline">Dashboard</span>
                                </>
                            ) : (
                                <>
                                    <span className="md:hidden">Masuk</span>
                                    <span className="hidden md:inline">Masuk ke Sistem</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-block px-4 py-1.5 mb-6 bg-[#BCF32F]/20 text-[#0A2619] rounded-full text-sm font-black uppercase tracking-widest">
                        Selamat Datang di Portal Resmi
                    </div>
                    <h2 className="text-[32px] sm:text-4xl md:text-7xl font-black text-slate-900 mb-6 md:mb-8 tracking-tighter leading-[1.15] md:leading-[1.05]">
                        Sistem Informasi <br />
                        Tahfizh Al-Qur'an <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A2619] to-[#143d2a] block mt-1 md:mt-2">
                            Al-Usymuni Batuan
                        </span>
                    </h2>
                    <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-500 mb-12 font-medium leading-relaxed">
                        Manajemen pendidikan terpadu untuk efisiensi, <br className="hidden md:block" /> 
                        transparansi, dan akselerasi kualitas penghafal Al-Qur'an.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 bg-[#0A2619] text-[#BCF32F] rounded-2xl font-bold text-lg shadow-xl shadow-[#0A2619]/20 hover:bg-[#143d2a] hover:shadow-2xl hover:shadow-[#0A2619]/40 transition-all hover:-translate-y-1"
                        >
                            Masuk Sekarang
                        </button>
                        {!isStandalone && (
                            <button
                                onClick={handleInstallClick}
                                className="px-8 py-4 bg-white text-[#0A2619] border-2 border-[#0A2619] rounded-2xl font-bold text-lg hover:bg-[#BCF32F]/10 transition-all hover:-translate-y-1 flex items-center gap-3 shadow-lg shadow-[#0A2619]/10"
                            >
                                <Download size={22} className="animate-bounce" />
                                Download Aplikasi
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/absensi/login')}
                            className="px-8 py-4 bg-white text-[#0A2619] border border-[#0A2619]/20 rounded-2xl font-bold text-lg hover:bg-[#0A2619]/5 transition-all hover:-translate-y-1"
                        >
                            Portal Absensi
                        </button>
                    </div>
                </div>
            </section>

            {/* Trilogi Santri Section */}
            <section id="trilogi" className="py-24 bg-gray-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16 animate-on-scroll fade-up">
                        <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Trilogi Santri</h3>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Tiga pilar utama yang menjadi pondasi pembentukan karakter setiap santri di Pondok Pesantren Tahfizh Qur'an Al-Usymuni.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {trilogiSantri.map((item, idx) => (
                            <div
                                key={idx}
                                className={`bg-gradient-to-br ${item.color} p-8 rounded-3xl border border-white shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 animate-on-scroll fade-up delay-${(idx + 1) * 100}`}
                            >
                                <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-sm">
                                    {item.icon}
                                </div>
                                <h4 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Purpose Section */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div className="animate-on-scroll fade-left">
                        <div className="inline-block p-3 bg-[#0A2619]/10 rounded-2xl mb-6 text-[#0A2619]">
                            <BookOpen size={32} />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            Mengapa <span className="text-[#0A2619]">SI-TAQUA?</span>
                        </h3>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            Aplikasi SI-TAQUA hadir sebagai jembatan komunikasi antara Pesantren dan Orang Tua Santri. Kami percaya transparansi adalah kunci keberhasilan pendidikan.
                        </p>

                        <ul className="space-y-4">
                            {[
                                "Pantau progres hafalan santri setiap hari",
                                "Update nilai akademik dan laporan raport",
                                "Informasi pengumuman pesantren secara instan",
                                "Kemudahan administrasi dan riwayat pembayaran"
                            ].map((text, i) => (
                                <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                                    <CheckCircle2 className="text-[#0A2619] shrink-0" size={24} />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative animate-on-scroll fade-right">
                        <div className="absolute -inset-4 bg-[#BCF32F] rounded-[3rem] rotate-3 opacity-20"></div>
                        <div className="relative bg-[#0A2619] rounded-[2.5rem] p-10 text-white shadow-2xl overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-[#BCF32F]/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="relative z-10">
                                <p className="text-[#BCF32F] font-black mb-4 uppercase tracking-widest text-sm">Quote Pengasuh</p>
                                <blockquote className="text-2xl font-medium italic mb-8 leading-snug">
                                    "Pesantren adalah tempat menanam, dan orang tua adalah air yang menyiram. Dengan SI-TAQUA, mari kita bersama melihat bibit-bibit surga ini tumbuh."
                                </blockquote>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#BCF32F] rounded-full flex items-center justify-center font-bold text-[#0A2619]">MA</div>
                                    <div>
                                        <p className="font-bold">KH. Miftahul Arifin, Lc.</p>
                                        <p className="text-white/60 text-sm">Pengasuh PTQA Al-Usymuni</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-gray-900 text-gray-400 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
                        <div className="flex items-center gap-4">
                            <img src={logoFile} alt="Logo" className="h-10 grayscale brightness-200" width="40" height="40" loading="lazy" />
                            <div className="text-left">
                                <p className="text-white font-bold">PTQA AL-USYMUNI</p>
                                <p className="text-xs">Batuan, Sumenep, Madura</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-[#BCF32F] transition-colors">Tentang Kami</a>
                            <a href="#" className="hover:text-[#BCF32F] transition-colors">Hubungi Kami</a>
                            <a href="#" className="hover:text-[#BCF32F] transition-colors">Kebijakan Privasi</a>
                        </div>
                    </div>
                    <div className="text-center pt-8 border-t border-gray-800 text-sm space-y-2">
                        <p>© 2026 SI-TAQUA PTQA Batuan. Seluruh Hak Cipta Dilindungi.</p>
                        <p className="text-xs font-black text-[#0A2619] bg-[#BCF32F] inline-block px-2 py-1 rounded tracking-widest uppercase">Developed with full solemnity by Zubed S.A.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
