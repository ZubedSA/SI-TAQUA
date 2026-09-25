import React, { useState, useRef, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { 
    X, Printer, Download, ChevronLeft, ChevronRight, User, 
    ShieldCheck, Layers, Loader2, FileDown, FileText, CheckCircle2,
    ZoomIn, ZoomOut, Maximize2
} from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Standard CR80 Card Dimensions:
 * 85.60 mm x 53.98 mm (Ratio: 1.58577)
 * Design Canvas: 430px x 271.2px
 */
export const CARD_WIDTH = 430
export const CARD_HEIGHT = 271.2

/**
 * KtsBadge - Canvas-based Pill Badge for KTS
 * Menjamin 100% presisi posisi teks & pill, bebas bug pergeseran baseline font html2canvas
 */
const KtsBadge = () => {
    const canvasRef = useRef(null)

    const drawBadge = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = 3
        const w = 54
        const h = 30
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, w, h)

        // 1. Pill Putih Bersih
        const pillW = 42
        const pillH = 17
        const pillX = (w - pillW) / 2
        const pillY = 1
        const r = pillH / 2

        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(pillX, pillY, pillW, pillH, r)
        } else {
            ctx.arc(pillX + r, pillY + r, r, Math.PI / 2, (3 * Math.PI) / 2)
            ctx.arc(pillX + pillW - r, pillY + r, r, (3 * Math.PI) / 2, Math.PI / 2)
            ctx.closePath()
        }
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        // 2. Teks "KTS" di Dalam Pill (Presisi Optical Middle)
        ctx.fillStyle = '#065f46' // emerald-800
        ctx.font = '900 10.5px Arial, Helvetica, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // Optical center: koreksi -0.5px untuk huruf kapital agar seimbang simetris
        ctx.fillText('KTS', w / 2, pillY + (pillH / 2) - 0.5)

        // 3. Teks "KARTU SANTRI" di Bawah Pill
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 6.5px Arial, Helvetica, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('KARTU SANTRI', w / 2, pillY + pillH + 6)
    }

    useEffect(() => {
        drawBadge()
        if (document.fonts) {
            document.fonts.ready.then(() => {
                drawBadge()
            })
        }
    }, [])

    return (
        <canvas 
            ref={canvasRef} 
            style={{ width: '54px', height: '30px', display: 'block' }}
        />
    )
}

/**
 * KartuSantriCardInner - Desain Resmi, Bersih, Presisi CR80
 * Edisi Hijau Muda Terang & Putih Bersih
 */
export const KartuSantriCardInner = ({ santri, side = 'front', isExport = false }) => {
    if (!santri) return null

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

    const ttl = [santri.tempat_lahir, formatDate(santri.tanggal_lahir)].filter(Boolean).join(', ') || '-'
    const baseUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : ''
    const qrValue = `${baseUrl}/verifikasi/santri/${santri.nis || santri.id || 'VALID'}`

    // Header Hijau Muda Terang & Segar
    const brightGreenHeaderStyle = {
        background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 55%, #4ade80 100%)'
    }

    // ==========================================
    // 1. TAMPAK DEPAN (FRONT) - CR80 100% IDENTIK
    // ==========================================
    if (side === 'front') {
        return (
            <div 
                className="kartu-santri-card kartu-santri-front relative select-none shrink-0 flex flex-col justify-between overflow-hidden bg-white text-gray-800 rounded-2xl border border-gray-200"
                style={{
                    width: `${CARD_WIDTH}px`,
                    height: `${CARD_HEIGHT}px`,
                    boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(34, 197, 94, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                    fontFamily: "Arial, Helvetica, sans-serif"
                }}
            >
                {/* Watermark Logo Pondok Halus */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
                    <img 
                        src="/logo-pondok.png" 
                        alt="Watermark Logo" 
                        crossOrigin="anonymous"
                        className="w-40 h-40 object-contain filter grayscale"
                        onError={(e) => { e.target.style.display = 'none' }}
                    />
                </div>

                {/* HEADER RESMI KARTU (HIJAU MUDA TERANG & KOP PUTIH TAJAM) */}
                <div 
                    className="relative z-10 px-3.5 py-2 text-white border-b-2 border-amber-300 shadow-xs shrink-0"
                    style={brightGreenHeaderStyle}
                >
                    <div className="flex items-center justify-between gap-2.5">
                        {/* Logo Pondok */}
                        <div className="w-10 h-10 shrink-0 rounded-full bg-white p-0.5 shadow-sm flex items-center justify-center">
                            <img 
                                src="/logo-pondok.png" 
                                alt="Logo Pondok" 
                                crossOrigin="anonymous"
                                className="w-full h-full object-contain"
                                onError={(e) => { e.target.style.display = 'none' }}
                            />
                        </div>

                        {/* Teks Kop Institusi Resmi */}
                        <div className="flex-1 text-center">
                            <div className="text-[7.5px] uppercase text-emerald-100 font-bold tracking-wide leading-none">
                                Yayasan Abdullah Dewi Hasanah
                            </div>
                            <div className="text-[12px] font-black text-white uppercase tracking-tight leading-tight my-0.5">
                                PP. TAHFIZH QUR'AN AL-USYMUNI BATUAN
                            </div>
                            <div className="text-[7px] text-emerald-50 font-normal leading-none opacity-95">
                                Jl. Raya Lenteng Ds. Batuan Barat, Sumenep, Madura
                            </div>
                        </div>

                        {/* Label KTS Resmi (Presisi Canvas Anti-Anjlok) */}
                        <div className="shrink-0 flex items-center justify-center">
                            <KtsBadge />
                        </div>
                    </div>
                </div>

                {/* BODY KARTU: PAS FOTO & DATA BIODATA LENGKAP 6 FIELD */}
                <div className="relative z-10 px-4 py-1.5 flex items-center gap-3.5 flex-1 min-h-0">
                    {/* Kolom Kiri: Pas Foto Santri */}
                    <div className="shrink-0 flex flex-col items-center justify-center">
                        <div className="w-[76px] h-[94px] rounded-lg overflow-hidden bg-gray-50 border-2 border-emerald-500 shadow-xs relative flex items-center justify-center">
                            {santri.foto_url ? (
                                <img 
                                    src={santri.foto_url} 
                                    alt={santri.nama || 'Foto Santri'} 
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                    <User size={30} className="text-gray-300 mb-0.5" />
                                    <span className="text-[6.5px] font-bold text-gray-500">PAS FOTO</span>
                                </div>
                            )}
                        </div>

                        {/* Status Teks Bersih */}
                        <div className="mt-1 flex items-center gap-1 text-[7.5px] font-bold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{santri.status || 'Aktif'}</span>
                        </div>
                    </div>

                    {/* Kolom Kanan: 6 Field Biodata Tabular (Anti-Clipping / Tanpa Truncate Potong Bawah) */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1 text-gray-800">
                        <div className="grid grid-cols-[72px_8px_1fr] items-baseline py-0.5 text-[9px] leading-normal">
                            <span className="font-semibold text-gray-500">NIS</span>
                            <span className="font-semibold text-gray-400 text-center">:</span>
                            <span className="font-bold text-gray-900 text-[10px] tracking-wide">
                                {santri.nis || '-'}
                            </span>
                        </div>
                        <div className="grid grid-cols-[72px_8px_1fr] items-baseline py-0.5 text-[9px] leading-normal">
                            <span className="font-semibold text-gray-500">Nama</span>
                            <span className="font-semibold text-gray-400 text-center">:</span>
                            <span className="font-bold text-gray-900 uppercase text-[10px] leading-tight" title={santri.nama}>
                                {santri.nama || '-'}
                            </span>
                        </div>
                        <div className="grid grid-cols-[72px_8px_1fr] items-baseline py-0.5 text-[9px] leading-normal">
                            <span className="font-semibold text-gray-500">Jenis Kelamin</span>
                            <span className="font-semibold text-gray-400 text-center">:</span>
                            <span className="font-medium text-gray-800">
                                {santri.jenis_kelamin === 'L' ? 'Laki-laki' : santri.jenis_kelamin === 'P' ? 'Perempuan' : (santri.jenis_kelamin || santri.jk || '-')}
                            </span>
                        </div>
                        <div className="grid grid-cols-[72px_8px_1fr] items-baseline py-0.5 text-[9px] leading-normal">
                            <span className="font-semibold text-gray-500">TTL</span>
                            <span className="font-semibold text-gray-400 text-center">:</span>
                            <span className="font-medium text-gray-800" title={ttl}>
                                {ttl}
                            </span>
                        </div>
                        <div className="grid grid-cols-[72px_8px_1fr] items-start py-0.5 text-[9px] leading-normal">
                            <span className="font-semibold text-gray-500">Alamat</span>
                            <span className="font-semibold text-gray-400 text-center">:</span>
                            <span className="font-medium text-gray-800 leading-tight" title={santri.alamat}>
                                {santri.alamat || '-'}
                            </span>
                        </div>
                        <div className="grid grid-cols-[72px_8px_1fr] items-baseline py-0.5 text-[9px] leading-normal">
                            <span className="font-semibold text-gray-500">Masa Berlaku</span>
                            <span className="font-semibold text-gray-400 text-center">:</span>
                            <span className="font-bold text-emerald-700">
                                Selama Menjadi Santri
                            </span>
                        </div>
                    </div>
                </div>

                {/* FOOTER KARTU RESMI: QR CODE CANVAS PRESISI TINGGI */}
                <div className="relative z-10 bg-gray-50/95 px-3.5 py-1.5 border-t border-gray-200 flex items-center justify-between shrink-0">
                    {/* Kolom Kiri: QR Code dalam Wadah Presisi Bersih */}
                    <div className="flex items-center gap-2">
                        <div 
                            className={`w-[34px] h-[34px] bg-white p-0.5 rounded border border-gray-300 shadow-2xs flex items-center justify-center shrink-0 ${!isExport ? 'cursor-pointer hover:border-emerald-500 transition-colors' : ''}`}
                            onClick={(e) => {
                                if (!isExport) {
                                    e.stopPropagation()
                                    window.open(`/verifikasi/santri/${santri.nis || santri.id}`, '_blank')
                                }
                            }}
                            title={!isExport ? 'Klik untuk uji coba buka halaman verifikasi digital santri' : undefined}
                        >
                            <QRCodeCanvas 
                                value={qrValue}
                                size={30}
                                level="L"
                                includeMargin={false}
                            />
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="text-[7.5px] font-bold text-gray-700 uppercase leading-none">
                                Verifikasi Digital SI-TAQUA
                            </div>
                            <div className="text-[6.5px] text-gray-500 font-normal leading-tight mt-0.5">
                                Scan untuk validasi & presensi santri
                            </div>
                        </div>
                    </div>

                    {/* Kolom Kanan: Identitas Dokumen Resmi */}
                    <div className="text-right flex flex-col justify-center">
                        <div className="text-[7.5px] font-bold text-emerald-800 uppercase leading-none">
                            PP. TAHFIZH QUR'AN AL-USYMUNI BATUAN
                        </div>
                        <div className="text-[6.5px] text-gray-500 font-normal leading-tight mt-0.5">
                            Dokumen Identitas Resmi
                        </div>
                    </div>
                </div>

                {/* Garis Aksen Bawah (Hijau Muda Segar) */}
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 shrink-0" />
            </div>
        )
    }

    // ==========================================
    // 2. TAMPAK BELAKANG (BACK) - JANJI SANTRI
    // ==========================================
    return (
        <div 
            className="kartu-santri-card kartu-santri-back relative select-none shrink-0 flex flex-col justify-between overflow-hidden bg-white text-gray-800 rounded-2xl border border-gray-200"
            style={{
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(34, 197, 94, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                fontFamily: "Arial, Helvetica, sans-serif"
            }}
        >
            {/* Watermark Logo di Belakang */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                <img 
                    src="/logo-pondok.png" 
                    alt="Watermark Logo" 
                    crossOrigin="anonymous"
                    className="w-40 h-40 object-contain filter grayscale"
                    onError={(e) => { e.target.style.display = 'none' }}
                />
            </div>

            {/* HEADER RESMI BELAKANG (HIJAU MUDA TERANG) */}
            <div 
                className="relative z-10 px-4 py-2 text-center text-white border-b-2 border-amber-300 shadow-xs shrink-0"
                style={brightGreenHeaderStyle}
            >
                <div className="text-[10.5px] font-black uppercase text-white tracking-wide leading-tight">
                    JANJI SANTRI PTQA BATUAN
                </div>
                <div className="text-[7.5px] text-emerald-100 font-medium mt-0.5 leading-none">
                    Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan Sumenep
                </div>
            </div>

            {/* ISI JANJI SANTRI RESMI: 5 BUTIR BERSIH & PROPORSIONAL */}
            <div className="relative z-10 px-6 py-2.5 flex-1 flex flex-col justify-center space-y-2 text-[9.5px] text-gray-800 leading-snug">
                <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[8px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
                    <span className="font-medium leading-snug">Taat kepada Allah dan Rasul-Nya</span>
                </div>
                <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[8px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">2</span>
                    <span className="font-medium leading-snug">Berbakti kepada orang tua dan guru</span>
                </div>
                <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[8px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">3</span>
                    <span className="font-medium leading-snug">Mengamalkan trilogi santri : Taqwallah, Berakhlaqul Karimah, Berilmu Amaliyah & Beramal Ilmiyah.</span>
                </div>
                <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[8px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">4</span>
                    <span className="font-medium leading-snug">Mentaati semua peraturan & kebijakan pondok</span>
                </div>
                <div className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[8px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">5</span>
                    <span className="font-medium leading-snug">Menjaga nama baik pondok</span>
                </div>
            </div>

            {/* FOOTER BELAKANG: ALAMAT & KOLOM TTD RESMI PENGASUH */}
            <div className="relative z-10 bg-gray-50/95 px-5 py-2 border-t border-gray-200 flex items-end justify-between shrink-0">
                <div className="max-w-[58%]">
                    <div className="text-[7.5px] font-bold text-gray-800 uppercase">Sekretariat Pesantren:</div>
                    <div className="text-[7px] text-gray-600 leading-snug mt-0.5">
                        Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep, Jawa Timur
                    </div>
                </div>

                <div className="text-center shrink-0">
                    <div className="text-[7.5px] text-gray-500 font-medium leading-none">Pengasuh PTQA Batuan,</div>
                    <div className="h-6 flex items-center justify-center my-0.5">
                        {/* Space for signature */}
                    </div>
                    <div className="text-[8px] font-bold border-t border-gray-300 pt-0.5 text-gray-800 leading-none">
                        KH. Miftahul Arifin, Lc.
                    </div>
                </div>
            </div>

            {/* Garis Aksen Bawah (Hijau Muda Segar) */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 shrink-0" />
        </div>
    )
}

/**
 * ScaledCardWrapper - Pembungkus Responsif Tanpa Distorsi
 * Memastikan tampilan pada layar handphone/laptop selalu 100% presisi dan utuh
 */
const ScaledCardWrapper = ({ children, scale = 1 }) => {
    if (scale >= 0.99) {
        return (
            <div className="flex justify-center items-center">
                {children}
            </div>
        )
    }

    return (
        <div 
            style={{ 
                width: `${CARD_WIDTH * scale}px`, 
                height: `${CARD_HEIGHT * scale}px`,
                position: 'relative',
                overflow: 'visible',
                flexShrink: 0
            }}
            className="flex justify-center items-center"
        >
            <div 
                style={{ 
                    width: `${CARD_WIDTH}px`, 
                    height: `${CARD_HEIGHT}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {children}
            </div>
        </div>
    )
}

/**
 * KartuSantriView - Wrapper Tampilan Multi-Side untuk Pratinjau
 */
export const KartuSantriView = ({ santri, side = 'both', isExport = false, scale = 1 }) => {
    if (!santri) return null

    if (side === 'front') {
        return (
            <ScaledCardWrapper scale={scale}>
                <KartuSantriCardInner santri={santri} side="front" isExport={isExport} />
            </ScaledCardWrapper>
        )
    }

    if (side === 'back') {
        return (
            <ScaledCardWrapper scale={scale}>
                <KartuSantriCardInner santri={santri} side="back" isExport={isExport} />
            </ScaledCardWrapper>
        )
    }

    return (
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 w-full">
            <ScaledCardWrapper scale={scale}>
                <KartuSantriCardInner santri={santri} side="front" isExport={isExport} />
            </ScaledCardWrapper>
            <ScaledCardWrapper scale={scale}>
                <KartuSantriCardInner santri={santri} side="back" isExport={isExport} />
            </ScaledCardWrapper>
        </div>
    )
}

/**
 * KartuSantriModal - Modal popup interaktif lengkap dengan fungsi Cetak, PDF Presisi, dan Navigasi Massal
 */
const KartuSantriModal = ({
    isOpen,
    onClose,
    santri,
    santriList = [],
    currentIndex = 0,
    onNavigateIndex
}) => {
    const [viewMode, setViewMode] = useState('both') // 'front' | 'back' | 'both'
    const [isBulkPrint, setIsBulkPrint] = useState(false)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [pdfProgress, setPdfProgress] = useState('')
    const [downloadFormat, setDownloadFormat] = useState('cr80') // 'cr80' | 'a4'
    const [previewScale, setPreviewScale] = useState(1)

    const printAreaRef = useRef(null)
    const hiddenExportRef = useRef(null)

    // Calculate dynamic scaling for responsive preview on mobile and desktop
    useEffect(() => {
        if (!isOpen) return

        const updateScale = () => {
            if (!printAreaRef.current) return
            const containerWidth = printAreaRef.current.clientWidth || 800
            const availableWidth = Math.max(280, containerWidth - 32)

            if (viewMode === 'both') {
                // If container is wide enough for side-by-side (>= 920px)
                if (containerWidth >= 920) {
                    const s = Math.min(1, availableWidth / (CARD_WIDTH * 2 + 24))
                    setPreviewScale(Math.max(0.45, s))
                } else {
                    // Stacked vertically: scale to single card width
                    const s = Math.min(1, availableWidth / CARD_WIDTH)
                    setPreviewScale(Math.max(0.45, s))
                }
            } else {
                // Single card view
                const s = Math.min(1, availableWidth / CARD_WIDTH)
                setPreviewScale(Math.max(0.45, s))
            }
        }

        updateScale()
        const timer = setTimeout(updateScale, 50)
        window.addEventListener('resize', updateScale)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updateScale)
        }
    }, [isOpen, viewMode, isBulkPrint])

    if (!isOpen || (!santri && santriList.length === 0)) return null

    const currentSantri = santri || santriList[currentIndex] || {}
    const hasMultiple = santriList.length > 1

    const handlePrev = () => {
        if (onNavigateIndex && currentIndex > 0) {
            onNavigateIndex(currentIndex - 1)
        }
    }

    const handleNext = () => {
        if (onNavigateIndex && currentIndex < santriList.length - 1) {
            onNavigateIndex(currentIndex + 1)
        }
    }

    // Print Handler
    const handlePrint = () => {
        window.print()
    }

    // Export PDF 100% Identik Menggunakan Stage Render Standar CR80
    const handleDownloadPDF = async (selectedFormat = downloadFormat) => {
        try {
            setIsGeneratingPdf(true)
            setPdfProgress('Menyiapkan dokumen PDF...')

            // Tunggu render stage aktif di-paint dengan font dan canvas lengkap
            await new Promise(resolve => setTimeout(resolve, 150))

            const frontEl = hiddenExportRef.current?.querySelector('#kts-export-front')
            const backEl = hiddenExportRef.current?.querySelector('#kts-export-back')

            if (!frontEl && !backEl) {
                throw new Error('Elemen kartu untuk ekspor tidak ditemukan.')
            }

            const captureOptions = {
                scale: 3, // 300+ DPI razor sharp
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 1280
            }

            if (selectedFormat === 'a4') {
                // ==========================================
                // FORMAT A4 SIAP CETAK (CROP MARKS & INSTRUKSI)
                // ==========================================
                setPdfProgress('Merender lembar cetak A4...')
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                })

                const a4Width = 210
                const a4Height = 297

                // Header Dokumen A4 (Posisi aman agar tidak terpotong tepi printer)
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(14)
                doc.setTextColor(22, 101, 52)
                doc.text('KARTU TANDA SANTRI (KTS)', a4Width / 2, 26, { align: 'center' })

                doc.setFont('helvetica', 'normal')
                doc.setFontSize(9)
                doc.setTextColor(75, 85, 99)
                doc.text("Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan Sumenep", a4Width / 2, 32, { align: 'center' })
                doc.text(`Santri: ${currentSantri.nama || '-'} • NIS: ${currentSantri.nis || '-'}`, a4Width / 2, 37, { align: 'center' })

                // Garis Pembatas
                doc.setDrawColor(209, 213, 219)
                doc.setLineWidth(0.3)
                doc.line(20, 42, a4Width - 20, 42)

                const cardW = 85.6
                const cardH = 54
                const gap = 8
                const startX = (a4Width - (cardW * 2 + gap)) / 2
                const startY = 52

                // Render Front
                let frontImg = null
                if (frontEl) {
                    setPdfProgress('Merender tampak depan...')
                    const canvasFront = await html2canvas(frontEl, captureOptions)
                    frontImg = canvasFront.toDataURL('image/png')
                }

                // Render Back
                let backImg = null
                if (backEl) {
                    setPdfProgress('Merender tampak belakang...')
                    const canvasBack = await html2canvas(backEl, captureOptions)
                    backImg = canvasBack.toDataURL('image/png')
                }

                // Label Sisi
                doc.setFontSize(8)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(55, 65, 81)
                doc.text('TAMPAK DEPAN', startX + cardW / 2, startY - 3, { align: 'center' })
                doc.text('TAMPAK BELAKANG', startX + cardW + gap + cardW / 2, startY - 3, { align: 'center' })

                if (frontImg) {
                    doc.addImage(frontImg, 'PNG', startX, startY, cardW, cardH, undefined, 'FAST')
                    doc.setDrawColor(180, 185, 195)
                    doc.setLineDashPattern([2, 2], 0)
                    doc.roundedRect(startX, startY, cardW, cardH, 2.5, 2.5)
                }

                if (backImg) {
                    doc.addImage(backImg, 'PNG', startX + cardW + gap, startY, cardW, cardH, undefined, 'FAST')
                    doc.setDrawColor(180, 185, 195)
                    doc.setLineDashPattern([2, 2], 0)
                    doc.roundedRect(startX + cardW + gap, startY, cardW, cardH, 2.5, 2.5)
                }

                // Petunjuk Cetak & Laminasi
                doc.setLineDashPattern([], 0)
                const infoY = startY + cardH + 16
                doc.setFillColor(243, 244, 246)
                doc.roundedRect(startX, infoY, cardW * 2 + gap, 36, 3, 3, 'F')
                
                doc.setFontSize(8.5)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(31, 41, 55)
                doc.text('Petunjuk Cetak & Pembuatan Kartu:', startX + 6, infoY + 7.5)

                doc.setFontSize(7.5)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(75, 85, 99)
                doc.text('1. Cetak menggunakan kertas tebal (Art Paper 230-310 gsm / Photo Paper / Kertas PVC Card A4).', startX + 6, infoY + 13.5)
                doc.text('2. Pastikan skala cetak printer diatur ke 100% (Actual Size / Do Not Scale) agar ukuran pas CR80 (85.6 x 54 mm).', startX + 6, infoY + 18.5)
                doc.text('3. Gunting mengikuti garis putus-putus di sekitar kartu.', startX + 6, infoY + 23.5)
                doc.text('4. Rekatkan sisi depan dan belakang secara presisi, lalu masukkan ke dalam pouch laminating panas.', startX + 6, infoY + 28.5)

                // Footer A4
                doc.setFontSize(7)
                doc.setTextColor(156, 163, 175)
                doc.text(`Dicetak melalui Sistem Informasi PPTQ Al-Usymuni (SI-TAQUA) • ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, a4Width / 2, a4Height - 12, { align: 'center' })

                const cleanName = (currentSantri.nama || 'santri').replace(/[^a-zA-Z0-9_\-]/g, '_')
                doc.save(`KTS_A4_SiapCetak_${currentSantri.nis || cleanName}.pdf`)

            } else {
                // ==========================================
                // FORMAT STANDAR CR80 (85.6mm x 54mm)
                // ==========================================
                const doc = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: [54, 85.6]
                })

                const pageWidth = doc.internal.pageSize.getWidth()   // 85.6mm
                const pageHeight = doc.internal.pageSize.getHeight() // 54.0mm

                let addedPages = 0

                // 1. Ekspor Tampak Depan
                if (frontEl && (viewMode === 'front' || viewMode === 'both')) {
                    setPdfProgress('Merender tampak depan kartu...')
                    const canvas = await html2canvas(frontEl, captureOptions)
                    const imgData = canvas.toDataURL('image/png')
                    doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
                    addedPages++
                }

                // 2. Ekspor Tampak Belakang
                if (backEl && (viewMode === 'back' || viewMode === 'both')) {
                    if (addedPages > 0) {
                        doc.addPage([pageWidth, pageHeight], 'landscape')
                    }
                    setPdfProgress('Merender tampak belakang kartu...')
                    const canvas = await html2canvas(backEl, captureOptions)
                    const imgData = canvas.toDataURL('image/png')
                    doc.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
                    addedPages++
                }

                if (addedPages > 0) {
                    const cleanName = (currentSantri.nama || 'santri').replace(/[^a-zA-Z0-9_\-]/g, '_')
                    doc.save(`KTS_CR80_${currentSantri.nis || cleanName}.pdf`)
                }
            }
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert('Terjadi kendala saat download PDF: ' + err.message)
        } finally {
            setIsGeneratingPdf(false)
            setPdfProgress('')
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full border border-gray-100 overflow-hidden flex flex-col max-h-[94vh]">
                
                {/* Modal Header */}
                <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs border border-emerald-300 shrink-0">
                            <ShieldCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-gray-900 text-base sm:text-lg leading-tight flex items-center gap-2">
                                <span className="truncate">Kartu Tanda Santri (KTS)</span>
                                {currentSantri.status && (
                                    <Badge variant={currentSantri.status === 'Aktif' ? 'success' : 'default'} className="hidden sm:inline-flex text-[10px]">
                                        {currentSantri.status}
                                    </Badge>
                                )}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate mt-0.5">
                                {currentSantri.nama} • NIS: <span className="font-bold text-emerald-800">{currentSantri.nis || '-'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Multiple Santri Navigation */}
                        {hasMultiple && !isBulkPrint && (
                            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 text-xs font-bold text-gray-600">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="p-1 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                    title="Santri Sebelumnya"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="px-1.5 text-[11px]">
                                    {currentIndex + 1}/{santriList.length}
                                </span>
                                <button
                                    onClick={handleNext}
                                    disabled={currentIndex === santriList.length - 1}
                                    className="p-1 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                    title="Santri Selanjutnya"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}

                        <button 
                            onClick={onClose}
                            className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Subheader Toolbar */}
                <div className="no-print px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-50/90 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-xs overflow-x-auto max-w-full">
                        <button
                            onClick={() => { setViewMode('both'); setIsBulkPrint(false) }}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'both' && !isBulkPrint ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Dua Sisi
                        </button>
                        <button
                            onClick={() => { setViewMode('front'); setIsBulkPrint(false) }}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'front' && !isBulkPrint ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Depan
                        </button>
                        <button
                            onClick={() => { setViewMode('back'); setIsBulkPrint(false) }}
                            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'back' && !isBulkPrint ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Belakang
                        </button>

                        {hasMultiple && (
                            <button
                                onClick={() => setIsBulkPrint(!isBulkPrint)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${isBulkPrint ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
                            >
                                <Layers size={13} />
                                Semua ({santriList.length})
                            </button>
                        )}
                    </div>

                    {/* Actions: Download Options & Print */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                        {/* Format Switcher */}
                        <div className="flex items-center bg-gray-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                            <button
                                onClick={() => setDownloadFormat('cr80')}
                                className={`px-2 py-1 rounded-lg transition-all ${downloadFormat === 'cr80' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                                title="Format Kartu CR80 (85.6 x 54 mm)"
                            >
                                Kartu CR80
                            </button>
                            <button
                                onClick={() => setDownloadFormat('a4')}
                                className={`px-2 py-1 rounded-lg transition-all ${downloadFormat === 'a4' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
                                title="Format Kertas A4 Siap Cetak & Laminasi"
                            >
                                Kertas A4
                            </button>
                        </div>

                        {/* Download PDF Button */}
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => handleDownloadPDF(downloadFormat)}
                            disabled={isGeneratingPdf}
                            className="rounded-xl font-bold border-gray-200 text-xs py-1.5 px-3 min-h-[34px]"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <Loader2 size={14} className="animate-spin text-emerald-600" />
                                    <span className="hidden sm:inline">{pdfProgress || 'Memproses PDF...'}</span>
                                    <span className="sm:hidden">PDF...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={14} />
                                    <span>Simpan PDF</span>
                                </>
                            )}
                        </Button>

                        {/* Direct Print Button */}
                        <Button 
                            size="sm" 
                            onClick={handlePrint}
                            className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 text-white text-xs py-1.5 px-3 min-h-[34px]"
                        >
                            <Printer size={14} />
                            <span className="hidden sm:inline">Cetak</span>
                        </Button>
                    </div>
                </div>

                {/* Printable & Interactive Preview Area */}
                <div 
                    ref={printAreaRef}
                    id="kartu-santri-print-area" 
                    className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-gray-100/70"
                >
                    {isBulkPrint ? (
                        /* Bulk Print Mode: Grid of cards for A4 paper */
                        <div className="w-full space-y-6">
                            <div className="no-print p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                                Mode Cetak Massal aktif. Menampilkan kartu santri sebanyak <strong>{santriList.length} santri</strong>. Klik "Cetak" untuk mencetak langsung ke kertas A4.
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto justify-items-center">
                                {santriList.map((s, idx) => (
                                    <div key={s.id || idx} className="page-break-inside-avoid flex flex-col items-center gap-3">
                                        <KartuSantriView santri={s} side="front" scale={Math.min(1, previewScale)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Single Santri View with dynamic scaling */
                        <div className="w-full flex items-center justify-center">
                            <KartuSantriView 
                                santri={currentSantri} 
                                side={viewMode} 
                                scale={previewScale}
                            />
                        </div>
                    )}
                </div>

                {/* Modal Info Footer */}
                <div className="no-print px-4 sm:px-6 py-2.5 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
                    <span className="flex items-center gap-2 text-[11px] sm:text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>Desain Resmi CR80 (85.6mm × 54mm) • Hasil PDF 100% Identik & Presisi</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-gray-400">
                        Scan QR Code menggunakan kamera SI-TAQUA untuk absensi santri
                    </span>
                </div>
            </div>

            {/* DEDICATED PDF EXPORT STAGE (DIRERENDER DI VIEWPORT AKTIF TEPAT SAAT GENERATE, TANPA KELIPING & TANPA OFFSET) */}
            <div 
                id="kts-export-container"
                ref={hiddenExportRef}
                className="pointer-events-none select-none"
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    zIndex: -1,
                    opacity: isGeneratingPdf ? 1 : 0,
                    visibility: isGeneratingPdf ? 'visible' : 'hidden',
                    transform: isGeneratingPdf ? 'none' : 'translateY(-200vh)'
                }}
                aria-hidden="true"
            >
                <div id="kts-export-front" style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px`, backgroundColor: '#ffffff' }}>
                    <KartuSantriCardInner santri={currentSantri} side="front" isExport={true} />
                </div>
                <div id="kts-export-back" style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px`, backgroundColor: '#ffffff', marginTop: '20px' }}>
                    <KartuSantriCardInner santri={currentSantri} side="back" isExport={true} />
                </div>
            </div>

            {/* Custom Print Styles */}
            <style>{`
                @media print {
                    /* Sembunyikan elemen luar */
                    body * {
                        visibility: hidden;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Tampilkan kartu santri */
                    #kartu-santri-print-area, #kartu-santri-print-area * {
                        visibility: visible !important;
                    }
                    #kartu-santri-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 10mm;
                        background: white !important;
                    }
                    .kartu-santri-card {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-shadow: none !important;
                        border: 1px solid #16a34a !important;
                        page-break-inside: avoid;
                        margin-bottom: 8mm;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                }
            `}</style>
        </div>
    )
}

export default KartuSantriModal
