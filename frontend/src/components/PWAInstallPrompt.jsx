import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Info } from 'lucide-react';

const PWAInstallPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode
        const checkStandalone = () => {
            return (
                window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone ||
                document.referrer.includes('android-app://')
            );
        };

        setIsStandalone(checkStandalone());

        // Detect iOS
        const detectIOS = () => {
            return (
                ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
                (navigator.userAgent.includes("Mac") && "ontouchend" in document)
            );
        };

        setIsIOS(detectIOS());

        // Listen for beforeinstallprompt event (non-iOS)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show prompt if not standalone and not dismissed recently
            const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
            const now = new Date().getTime();

            // Show again if dismissed more than 7 days ago
            if (!checkStandalone() && (!lastDismissed || now - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000)) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS, we don't have beforeinstallprompt, so we check conditions manually
        if (detectIOS() && !checkStandalone()) {
            const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
            const now = new Date().getTime();
            if (!lastDismissed || now - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000) {
                // Delay long enough for the user to see the page
                const timer = setTimeout(() => setShowPrompt(true), 3000);
                return () => clearTimeout(timer);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', new Date().getTime().toString());
    };

    if (!showPrompt || isStandalone) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 max-w-md w-full relative overflow-hidden group">
                {/* Background Accent */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500"></div>

                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all z-10"
                >
                    <X size={18} />
                </button>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                        {isIOS ? <Smartphone size={24} /> : <Download size={24} />}
                    </div>

                    <div className="flex-1 pr-6">
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1">
                            Instal Aplikasi SI-TAQUA
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
                            Akses cepat dan mudah langsung dari layar utama perangkat Anda.
                        </p>

                        {isIOS ? (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    <Info size={14} className="text-primary" />
                                    Cara Instal di iOS:
                                </div>
                                <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-1 ml-4 list-decimal">
                                    <li>Klik tombol <span className="font-bold">Bagikan</span> (ikon kotak panah ke atas)</li>
                                    <li>Scroll ke bawah dan pilih <span className="font-bold text-slate-700 dark:text-slate-200">"Tambah ke Layar Utama"</span></li>
                                </ol>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleInstallClick}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] text-sm"
                                >
                                    Instal Sekarang
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] text-sm"
                                >
                                    Nanti Saja
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
