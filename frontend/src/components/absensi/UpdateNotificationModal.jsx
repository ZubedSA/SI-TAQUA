import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Rocket, FileText, CalendarRange, CheckCircle2, ChevronRight, BellRing } from 'lucide-react'

const UpdateNotificationModal = ({ isOpen, onClose }) => {
    const [countdown, setCountdown] = useState(10)
    const [canClose, setCanClose] = useState(false)

    useEffect(() => {
        if (isOpen && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prev) => prev - 1)
            }, 1000)
            return () => clearInterval(timer)
        } else if (isOpen && countdown === 0) {
            setCanClose(true)
        }
    }, [isOpen, countdown])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"></div>
            
            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                
                {/* Header Pattern & Title */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Rocket size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 bg-indigo-500/30 text-indigo-100 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/50">
                                Sistem Update v2.0
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                            Fitur Baru Telah Hadir!
                        </h2>
                        <p className="text-indigo-100/80 text-sm mt-2 font-medium">
                            Untuk meningkatkan fleksibilitas dan kerapian administrasi, kami meluncurkan fitur baru untuk Staf Pengajar.
                        </p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Fitur Izin */}
                    <div className="flex gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-100 group hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
                            <FileText size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-base mb-1">Pengajuan Izin Mengajar</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Anda kini dapat mengajukan izin tidak mengajar langsung melalui portal. Cukup buka halaman <strong className="text-gray-900">Kelola Izin & Jadwal</strong>, isi formulir, dan tunggu persetujuan dari Admin. Status kehadiran Anda akan otomatis tercatat sebagai "Izin".
                            </p>
                        </div>
                    </div>

                    {/* Fitur Tukar Jadwal */}
                    <div className="flex gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-100 group hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
                            <CalendarRange size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-base mb-1">Pengajuan Tukar Jadwal</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Berhalangan hadir tapi tidak ingin jam kosong? Gunakan fitur <strong className="text-gray-900">Tukar Jadwal</strong> untuk meminta staf lain menggantikan jam Anda, atau mencari pengganti untuk kelas tertentu.
                            </p>
                        </div>
                    </div>

                    {/* Catatan Penting */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <BellRing size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-gray-500 font-medium italic">
                            Mohon ajukan izin atau tukar jadwal jauh-jauh hari sebelum jam mengajar Anda agar Admin dapat memprosesnya tepat waktu. Fitur ini dapat diakses pada navigasi bawah atau sidebar.
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-gray-100 bg-white shrink-0">
                    <button
                        disabled={!canClose}
                        onClick={onClose}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300
                            ${canClose 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98]' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }
                        `}
                    >
                        {canClose ? (
                            <>
                                Mengerti & Lanjutkan <ChevronRight size={18} />
                            </>
                        ) : (
                            <>
                                Lanjutkan dalam {countdown} detik...
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
                        Pemberitahuan Wajib Baca
                    </p>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default UpdateNotificationModal
