import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
    ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, 
    User, Calendar, MapPin, Award, BookOpen, Layers, 
    Clock, ExternalLink, RefreshCw, Sparkles, Building2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const VerifikasiSantriPage = () => {
    const { nis } = useParams()
    const [santri, setSantri] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [verifiedTime, setVerifiedTime] = useState('')

    useEffect(() => {
        // Set timestamp saat verifikasi dibuka
        const now = new Date()
        setVerifiedTime(
            now.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }) + ' WIB'
        )
    }, [])

    useEffect(() => {
        const fetchSantriVerification = async () => {
            if (!nis) {
                setError('Nomor Induk Santri (NIS) tidak valid atau tidak disertakan.')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)

                // 1. Coba panggil RPC khusus verifikasi publik (bila sudah dieksekusi di database)
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('get_santri_verifikasi', { p_nis: String(nis).trim() })

                if (rpcData && !rpcError) {
                    setSantri(rpcData)
                    setLoading(false)
                    return
                }

                // 2. Fallback: Query langsung ke tabel santri
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nis)
                let query = supabase
                    .from('santri')
                    .select(`
                        id, nis, nama, status, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, foto_url,
                        kelas:kelas!kelas_id(nama),
                        halaqoh:halaqoh!halaqoh_id(nama),
                        angkatan:angkatan!angkatan_id(nama)
                    `)

                if (isUuid) {
                    query = query.or(`id.eq.${nis},nis.eq.${nis}`)
                } else {
                    query = query.eq('nis', nis)
                }

                const { data: directData, error: directError } = await query.maybeSingle()

                if (directError) {
                    throw directError
                }

                if (!directData) {
                    setError(`Data santri dengan NIS/ID "${nis}" tidak ditemukan dalam sistem resmi pangkalan data pondok.`)
                } else {
                    setSantri(directData)
                }
            } catch (err) {
                console.error('Error fetching verification:', err)
                setError('Terjadi kendala saat memverifikasi data. Pastikan perangkat terhubung dengan internet.')
            } finally {
                setLoading(false)
            }
        }

        fetchSantriVerification()
    }, [nis])

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return dateStr
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        } catch {
            return dateStr
        }
    }

    const ttl = santri ? [santri.tempat_lahir, formatDate(santri.tanggal_lahir)].filter(Boolean).join(', ') || '-' : '-'

    return (
        <div className="min-h-screen bg-slate-900 text-gray-800 flex flex-col justify-between relative overflow-x-hidden">
            {/* Background Texture & Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div 
                    className="absolute inset-0 opacity-10 bg-cover bg-center"
                    style={{ backgroundImage: "url('/bg-islamic.jpg')" }}
                />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px]" />
            </div>

            {/* HEADER INSTITUSI */}
            <header className="relative z-10 w-full border-b border-white/10 bg-slate-900/80 backdrop-blur-md py-4 px-4 sm:px-6">
                <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md flex items-center justify-center shrink-0 border border-emerald-400">
                            <img 
                                src="/logo-pondok.png" 
                                alt="Logo Pondok" 
                                className="w-full h-full object-contain"
                                onError={(e) => { e.target.style.display = 'none' }}
                            />
                        </div>
                        <div>
                            <div className="text-[10px] sm:text-xs font-semibold uppercase text-emerald-400 tracking-wider">
                                Yayasan Abdullah Dewi Hasanah
                            </div>
                            <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-tight">
                                PP. TAHFIZH QUR'AN AL-USYMUNI BATUAN
                            </h1>
                        </div>
                    </div>

                    <Link 
                        to="/"
                        className="text-xs font-medium text-emerald-300 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
                    >
                        <ArrowLeft size={14} />
                        <span className="hidden sm:inline">Portal SI-TAQUA</span>
                    </Link>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
                <div className="w-full max-w-xl">
                    {/* LOADING STATE */}
                    {loading && (
                        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 sm:p-12 text-center shadow-2xl border border-white/20">
                            <div className="w-16 h-16 mx-auto mb-4 relative flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                                <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-1">
                                Memverifikasi Data Santri...
                            </h2>
                            <p className="text-xs text-gray-500">
                                Menghubungkan ke Pangkalan Data Resmi SI-TAQUA
                            </p>
                        </div>
                    )}

                    {/* ERROR / NOT FOUND STATE */}
                    {!loading && error && (
                        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-rose-100">
                            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
                                <AlertTriangle size={32} />
                            </div>
                            <div className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full mb-3">
                                VERIFIKASI TIDAK TERDAFTAR
                            </div>
                            <h2 className="text-lg font-extrabold text-gray-900 mb-2">
                                Data Tidak Ditemukan
                            </h2>
                            <p className="text-sm text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
                                {error}
                            </p>

                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left text-xs text-amber-800 mb-6">
                                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                                    <ShieldCheck size={16} /> Catatan Keamanan:
                                </div>
                                Pastikan kode QR dipindai dari fisik <strong>Kartu Tanda Santri (KTS)</strong> resmi yang diterbitkan oleh Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan.
                            </div>

                            <Link 
                                to="/"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                            >
                                <ArrowLeft size={16} /> Kembali ke Beranda SI-TAQUA
                            </Link>
                        </div>
                    )}

                    {/* SUCCESS / VERIFIED STATE */}
                    {!loading && santri && (
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30">
                            {/* VERIFIED BANNER */}
                            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 text-white px-5 py-3.5 flex items-center justify-between shadow-md">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-xs">
                                        <ShieldCheck size={20} className="text-amber-300" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100 flex items-center gap-1">
                                            <Sparkles size={11} className="text-amber-300" /> RESMI & TERVALIDASI
                                        </div>
                                        <div className="text-xs sm:text-sm font-black leading-tight">
                                            DOKUMEN IDENTITAS DIGITAL SANTRI
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white text-emerald-800 px-3 py-1 rounded-full text-[11px] font-black tracking-wide shadow-sm flex items-center gap-1.5 shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>{santri.status || 'Aktif'}</span>
                                </div>
                            </div>

                            {/* BODY DOSSIER */}
                            <div className="p-5 sm:p-7">
                                {/* PROFILE HEADER SECTION */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-gray-100">
                                    {/* Pas Foto Santri */}
                                    <div className="shrink-0 relative">
                                        <div className="w-28 h-36 rounded-2xl overflow-hidden bg-gray-50 border-3 border-emerald-500 shadow-md relative flex items-center justify-center">
                                            {santri.foto_url ? (
                                                <img 
                                                    src={santri.foto_url} 
                                                    alt={santri.nama} 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                                    <User size={48} className="text-gray-300 mb-1" />
                                                    <span className="text-[9px] font-bold text-gray-400">PAS FOTO</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Verified Small Badge Icon */}
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full shadow-md border-2 border-white">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    </div>

                                    {/* Identitas Pokok */}
                                    <div className="flex-1 text-center sm:text-left">
                                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1.5">
                                            <Award size={12} /> Santri PTQA Batuan
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                                            {santri.nama || '-'}
                                        </h2>
                                        <div className="text-sm font-bold text-gray-600 mt-1 flex items-center justify-center sm:justify-start gap-2">
                                            <span>NIS:</span>
                                            <span className="font-mono text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md font-extrabold tracking-wider">
                                                {santri.nis || '-'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2 flex items-center justify-center sm:justify-start gap-1">
                                            <Building2 size={13} className="text-emerald-600" />
                                            <span>Pondok Pesantren Tahfizh Qur'an Al-Usymuni</span>
                                        </div>
                                    </div>
                                </div>

                                {/* TABEL BIODATA LENGKAP */}
                                <div className="mt-5 space-y-2.5 text-xs sm:text-sm">
                                    <div className="grid grid-cols-[110px_10px_1fr] sm:grid-cols-[130px_12px_1fr] items-baseline py-1 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Jenis Kelamin</span>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <span className="font-semibold text-gray-800">
                                            {santri.jenis_kelamin === 'L' ? 'Laki-laki' : santri.jenis_kelamin === 'P' ? 'Perempuan' : (santri.jenis_kelamin || '-')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[110px_10px_1fr] sm:grid-cols-[130px_12px_1fr] items-baseline py-1 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Tempat, Tgl Lahir</span>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <span className="font-semibold text-gray-800">
                                            {ttl}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[110px_10px_1fr] sm:grid-cols-[130px_12px_1fr] items-start py-1 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Alamat Asal</span>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <span className="font-semibold text-gray-800 leading-relaxed">
                                            {santri.alamat || '-'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[110px_10px_1fr] sm:grid-cols-[130px_12px_1fr] items-baseline py-1 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Kelas / Jenjang</span>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <span className="font-bold text-gray-900">
                                            {santri.kelas?.nama || '-'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[110px_10px_1fr] sm:grid-cols-[130px_12px_1fr] items-baseline py-1 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Halaqoh Tahfizh</span>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <span className="font-bold text-emerald-800">
                                            {santri.halaqoh?.nama || '-'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[110px_10px_1fr] sm:grid-cols-[130px_12px_1fr] items-baseline py-1 border-b border-gray-50">
                                        <span className="text-gray-500 font-medium">Angkatan</span>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <span className="font-semibold text-gray-800">
                                            {santri.angkatan?.nama || '-'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[110px_10px_1fr] sm:grid-cols-[130px_12px_1fr] items-baseline py-1">
                                        <span className="text-gray-500 font-medium">Masa Berlaku</span>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <span className="font-bold text-emerald-700">
                                            Selama Menjadi Santri Aktif
                                        </span>
                                    </div>
                                </div>

                                {/* AUDIT & TIMESTAMPS INFO BOX */}
                                <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-gray-200/80 flex items-start gap-3">
                                    <Clock size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <div className="text-[11px] leading-relaxed text-gray-600">
                                        <div>
                                            Diverifikasi secara real-time pada: <strong>{verifiedTime}</strong>
                                        </div>
                                        <div className="text-gray-400 mt-0.5">
                                            Integritas data dijamin oleh Sistem Informasi SI-TAQUA Batuan Sumenep.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER ACTION */}
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                                <span className="text-center sm:text-left">
                                    © {new Date().getFullYear()} PP. Tahfizh Qur'an Al-Usymuni Batuan
                                </span>
                                <Link 
                                    to="/"
                                    className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                                >
                                    Portal Resmi SI-TAQUA <ExternalLink size={13} />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* SIMPLE FOOTER */}
            <footer className="relative z-10 w-full text-center py-4 text-[11px] text-gray-400">
                Pondok Pesantren Tahfizh Qur'an Al-Usymuni • Batuan, Sumenep, Madura
            </footer>
        </div>
    )
}

export default VerifikasiSantriPage
