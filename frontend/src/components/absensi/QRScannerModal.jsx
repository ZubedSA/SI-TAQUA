import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react'

const QRScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
    const [scannerError, setScannerError] = useState(null)
    const [isInitializing, setIsInitializing] = useState(false)
    const html5QrCodeRef = useRef(null)
    const scannerId = "qr-reader-element"

    useEffect(() => {
        if (isOpen) {
            setIsInitializing(true)
            setScannerError(null)

            // Delay slightly to ensure element is in DOM
            const timer = setTimeout(async () => {
                try {
                    const html5QrCode = new Html5Qrcode(scannerId);
                    html5QrCodeRef.current = html5QrCode;

                    const config = { 
                        fps: 10, 
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    };

                    // Start scanning with back camera (environment)
                    await html5QrCode.start(
                        { facingMode: "environment" }, 
                        config, 
                        (decodedText) => {
                            // Success callback
                            stopScanner().then(() => {
                                onScanSuccess(decodedText);
                            });
                        },
                        (errorMessage) => {
                            // This is called for every frame where no QR is found
                            // We don't want to show errors for this
                        }
                    );
                    
                    setIsInitializing(false)
                } catch (err) {
                    console.error("QR Scanner start error:", err);
                    setScannerError("Gagal mengakses kamera. Pastikan izin kamera diberikan dan Anda menggunakan koneksi aman (HTTPS).");
                    setIsInitializing(false)
                }
            }, 500);

            return () => {
                clearTimeout(timer);
                stopScanner();
            };
        }
    }, [isOpen]);

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                await html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn("Error stopping scanner:", err);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-up relative">
                
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Pindai QR Absensi</h3>
                            <p className="text-xs text-gray-400 font-medium">Gunakan kamera belakang</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="p-6">
                    <div 
                        className="relative overflow-hidden rounded-[2rem] border-4 border-emerald-50 bg-gray-900 aspect-square flex items-center justify-center"
                    >
                        <div id={scannerId} className="w-full h-full"></div>
                        
                        {isInitializing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-white">
                                <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                                <p className="text-sm font-medium">Menyiapkan Kamera...</p>
                            </div>
                        )}

                        {scannerError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-20 text-white p-8 text-center">
                                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                                <p className="text-sm font-medium mb-6">{scannerError}</p>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="bg-emerald-600 px-6 py-2 rounded-full font-bold text-sm"
                                >
                                    Muat Ulang Halaman
                                </button>
                            </div>
                        )}

                        {/* Scanner Overlay Frame */}
                        {!isInitializing && !scannerError && (
                            <div className="absolute inset-0 pointer-events-none z-10">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-500/50 rounded-3xl"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-[20px] border-gray-900/60"></div>
                                {/* Scanning Line */}
                                <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-64 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[280px] mx-auto">
                        Dekatkan kamera ke Kode QR Kelas atau Halaqoh. Pastikan pencahayaan cukup untuk hasil terbaik.
                    </p>
                </div>

                <style>{`
                    @keyframes scan {
                        0%, 100% { top: 25%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        50% { top: 75%; }
                    }
                    .animate-scan {
                        animation: scan 3s linear infinite;
                    }
                    #${scannerId} video {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        border-radius: 1.5rem;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default QRScannerModal;
