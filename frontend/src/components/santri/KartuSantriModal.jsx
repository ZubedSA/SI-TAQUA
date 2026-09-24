import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer, Download, ChevronLeft, ChevronRight, User, ShieldCheck, Sparkles, Layers, CheckCircle2, Loader2 } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * KartuSantriView - Desain Resmi, Bersih, Profesional & Elegan
 * Edisi Hijau Muda Terang & Putih Bersih (Tanpa Border Teks yang Mengganggu)
 */
export const KartuSantriView = ({ santri, side = 'both' }) => {
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
    const qrValue = `SITAQUA_SANTRI_${santri.nis || santri.id}`

    // Header Hijau Muda Terang & Segar
    const brightGreenHeaderStyle = {
        background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 55%, #4ade80 100%)'
    }

    // ==========================================
    // 1. TAMPAK DEPAN (FRONT) - RESMI, BERSIH, BEBAS BORDER TEKS
    // ==========================================
    const renderFront = () => (
        <div 
            className="kartu-santri-card kartu-santri-front relative w-full max-w-[430px] aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white text-gray-800 select-none shrink-0 flex flex-col justify-between"
            style={{
                boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
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
                className="relative z-10 px-4 py-2.5 text-white border-b-2 border-amber-300 shadow-xs"
                style={brightGreenHeaderStyle}
            >
                <div className="flex items-center justify-between gap-3">
                    {/* Logo Pondok */}
                    <div className="w-11 h-11 shrink-0 rounded-full bg-white p-1 shadow-sm flex items-center justify-center">
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
                        <div className="text-[8px] uppercase text-emerald-100 font-bold leading-none">
                            Yayasan Abdullah Dewi Hasanah
                        </div>
                        <div className="text-[12.5px] font-black text-white uppercase leading-snug my-0.5">
                            PPTQ AL-USYMUNI BATUAN
                        </div>
                        <div className="text-[7.5px] text-emerald-50 font-normal leading-none opacity-95">
                            Jl. Raya Lenteng Ds. Batuan Barat, Sumenep, Madura
                        </div>
                    </div>

                    {/* Label KTS Resmi (Pill Rapi Terpusat, Anti Distorsi) */}
                    <div className="shrink-0 flex flex-col items-end justify-center">
                        <div className="bg-white text-emerald-800 font-black text-[9.5px] px-2.5 py-0.5 rounded-full leading-normal text-center shadow-xs">
                            KTS
                        </div>
                        <div className="text-[7px] text-white font-semibold mt-0.5 text-center">
                            KARTU SANTRI
                        </div>
                    </div>
                </div>
            </div>

            {/* BODY KARTU: PAS FOTO & DATA BIODATA RESMI (BEBAS BORDER/KOTAK) */}
            <div className="relative z-10 px-4 py-2 flex items-center gap-3.5 my-auto">
                {/* Kolom Kiri: Pas Foto Santri */}
                <div className="shrink-0 flex flex-col items-center">
                    <div className="w-[78px] h-[98px] rounded-lg overflow-hidden bg-gray-50 border-2 border-emerald-500 shadow-xs relative flex items-center justify-center">
                        {santri.foto_url ? (
                            <img 
                                src={santri.foto_url} 
                                alt={santri.nama} 
                                crossOrigin="anonymous"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                <User size={34} className="text-gray-300 mb-1" />
                                <span className="text-[7px] font-bold text-gray-500">PAS FOTO</span>
                            </div>
                        )}
                    </div>

                    {/* Status Teks Bersih */}
                    <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{santri.status || 'Aktif'}</span>
                    </div>
                </div>

                {/* Kolom Kanan: Detail Biodata Tabular Bersih (Font Resmi Proporsional & Rapi) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1 text-[9px] text-gray-800">
                    <div className="grid grid-cols-[62px_8px_1fr] items-center">
                        <span className="font-semibold text-gray-500">NIS</span>
                        <span className="font-semibold text-gray-400 text-center">:</span>
                        <span className="font-bold text-gray-900 text-[10px]">
                            {santri.nis || '-'}
                        </span>
                    </div>
                    <div className="grid grid-cols-[62px_8px_1fr] items-center">
                        <span className="font-semibold text-gray-500">Nama</span>
                        <span className="font-semibold text-gray-400 text-center">:</span>
                        <span className="font-bold text-gray-900 uppercase text-[10px]">
                            {santri.nama || '-'}
                        </span>
                    </div>
                    <div className="grid grid-cols-[62px_8px_1fr] items-center">
                        <span className="font-semibold text-gray-500">Kelas</span>
                        <span className="font-semibold text-gray-400 text-center">:</span>
                        <span className="font-medium text-gray-800">{santri.kelas || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[62px_8px_1fr] items-center">
                        <span className="font-semibold text-gray-500">Halaqoh</span>
                        <span className="font-semibold text-gray-400 text-center">:</span>
                        <span className="font-medium text-gray-800">{santri.halaqoh || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[62px_8px_1fr] items-center">
                        <span className="font-semibold text-gray-500">Angkatan</span>
                        <span className="font-semibold text-gray-400 text-center">:</span>
                        <span className="font-medium text-gray-800">{santri.angkatan || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[62px_8px_1fr] items-center">
                        <span className="font-semibold text-gray-500">TTL</span>
                        <span className="font-semibold text-gray-400 text-center">:</span>
                        <span className="font-medium text-gray-800">{ttl}</span>
                    </div>
                    <div className="grid grid-cols-[62px_8px_1fr] items-center">
                        <span className="font-semibold text-gray-500">Masa Berlaku</span>
                        <span className="font-semibold text-gray-400 text-center">:</span>
                        <span className="font-semibold text-emerald-700">
                            Selama Menjadi Santri
                        </span>
                    </div>
                </div>
            </div>

            {/* FOOTER KARTU RESMI: QR CODE DENGAN PRESISI TINGGI (BERSIH & RAPI) */}
            <div className="relative z-10 bg-gray-50/90 px-4 py-1.5 border-t border-gray-150 flex items-center justify-between">
                {/* Kolom Kiri: QR Code dalam Wadah Presisi Bersih */}
                <div className="flex items-center gap-2.5">
                    <div className="w-[38px] h-[38px] bg-white p-0.5 rounded border border-gray-300 shadow-2xs flex items-center justify-center shrink-0">
                        <QRCodeSVG 
                            value={qrValue}
                            size={32}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="text-[8px] font-bold text-gray-700 uppercase">
                            Verifikasi Digital SI-TAQUA
                        </div>
                        <div className="text-[7px] text-gray-500 font-normal">
                            Scan untuk validasi & presensi santri
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Identitas Dokumen Resmi */}
                <div className="text-right flex flex-col justify-center">
                    <div className="text-[7.5px] font-bold text-emerald-800 uppercase">
                        PPTQ AL-USYMUNI BATUAN
                    </div>
                    <div className="text-[7px] text-gray-500">
                        Dokumen Identitas Resmi
                    </div>
                </div>
            </div>

            {/* Garis Aksen Bawah (Hijau Muda Segar) */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400" />
        </div>
    )

    // ==========================================
    // 2. TAMPAK BELAKANG (BACK) - RESMI, BERSIH, BEBAS BORDER TEKS
    // ==========================================
    const renderBack = () => (
        <div 
            className="kartu-santri-card kartu-santri-back relative w-full max-w-[430px] aspect-[1.586/1] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white text-gray-800 select-none shrink-0 flex flex-col justify-between"
            style={{
                boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                fontFamily: "Arial, Helvetica, sans-serif"
            }}
        >
            {/* Watermark Logo di Belakang */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                <img 
                    src="/logo-pondok.png" 
                    alt="Watermark Logo" 
                    crossOrigin="anonymous"
                    className="w-44 h-44 object-contain filter grayscale"
                    onError={(e) => { e.target.style.display = 'none' }}
                />
            </div>

            {/* HEADER RESMI BELAKANG (HIJAU MUDA TERANG) */}
            <div 
                className="relative z-10 px-4 py-2 text-center text-white border-b-2 border-amber-300 shadow-xs"
                style={brightGreenHeaderStyle}
            >
                <div className="text-[10px] font-black uppercase text-white">
                    TATA TERTIB & KETENTUAN KARTU SANTRI
                </div>
                <div className="text-[7.5px] text-emerald-100 font-medium mt-0.5">
                    Pondok Pesantren Tahfizh Qur'an Al-Usymuni Batuan Sumenep
                </div>
            </div>

            {/* ISI TATA TERTIB RESMI (LIST BERSIH TANPA KOTAK BORDER) */}
            <div className="relative z-10 px-6 py-2.5 space-y-1.5 text-[8.5px] text-gray-700 leading-snug my-auto">
                <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0">1.</span>
                    <span>Kartu Tanda Santri (KTS) ini merupakan bukti identitas sah santri PPTQ Al-Usymuni Batuan.</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0">2.</span>
                    <span>Wajib dibawa pada kegiatan madrosah, tahfizh Al-Qur'an, dan presensi harian.</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0">3.</span>
                    <span>Kartu ini tidak boleh dipindahtangankan atau disalahgunakan oleh pihak lain.</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0">4.</span>
                    <span>Bagi yang menemukan kartu ini harap segera mengembalikan ke Kantor Sekretariat Pondok.</span>
                </div>
            </div>

            {/* FOOTER BELAKANG: ALAMAT & KOLOM TTD RESMI PENGASUH */}
            <div className="relative z-10 bg-gray-50/90 px-5 py-2 border-t border-gray-150 flex items-end justify-between">
                <div className="max-w-[60%]">
                    <div className="text-[7.5px] font-bold text-gray-800 uppercase">Sekretariat Pesantren:</div>
                    <div className="text-[7px] text-gray-600 leading-snug">
                        Jl. Raya Lenteng Ds. Batuan Barat RT 002 RW 004, Kec. Batuan, Kab. Sumenep, Jawa Timur
                    </div>
                    <div className="text-[6.5px] text-gray-400 font-medium mt-0.5">
                        NIS: {santri.nis || '-'}
                    </div>
                </div>

                <div className="text-center shrink-0">
                    <div className="text-[7.5px] text-gray-500 font-medium">Pengasuh Pesantren,</div>
                    <div className="h-6 flex items-center justify-center">
                        <span className="text-gray-800 text-[10.5px] font-bold">
                            Pimpinan PPTQ
                        </span>
                    </div>
                    <div className="text-[7.5px] font-bold border-t border-gray-300 pt-0.5 text-gray-800">
                        PPTQ Al-Usymuni
                    </div>
                </div>
            </div>

            {/* Garis Aksen Bawah (Hijau Muda Segar) */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400" />
        </div>
    )

    if (side === 'front') return renderFront()
    if (side === 'back') return renderBack()

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full">
            {renderFront()}
            {renderBack()}
        </div>
    )
}

/**
 * KartuSantriModal - Modal popup interaktif lengkap dengan fungsi Cetak, PDF, dan Navigasi Massal
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
    const printAreaRef = useRef(null)
    const hiddenExportRef = useRef(null)

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

    // Export PDF Persis Tampilan Web (100% Identik Menggunakan html2canvas)
    const handleDownloadPDF = async () => {
        try {
            setIsGeneratingPdf(true)
            
            // Utamakan kartu yang aktif di layar untuk hasil 100% presisi identik
            const visibleFront = printAreaRef.current?.querySelector('.kartu-santri-front')
            const visibleBack = printAreaRef.current?.querySelector('.kartu-santri-back')
            const offscreenFront = hiddenExportRef.current?.querySelector('.kartu-santri-front')
            const offscreenBack = hiddenExportRef.current?.querySelector('.kartu-santri-back')

            const frontEl = visibleFront || offscreenFront
            const backEl = visibleBack || offscreenBack

            if (!frontEl && !backEl) return

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 54] // Ukuran standar CR80 kartu (85.6mm x 54mm)
            })

            const captureOptions = {
                scale: 3, // Resolusi 3x (300+ DPI)
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            }

            let addedPages = 0

            // 1. Ekspor Tampak Depan jika viewMode 'front' atau 'both'
            if (frontEl && (viewMode === 'front' || viewMode === 'both')) {
                const canvas = await html2canvas(frontEl, captureOptions)
                const imgData = canvas.toDataURL('image/png')
                doc.addImage(imgData, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST')
                addedPages++
            }

            // 2. Ekspor Tampak Belakang jika viewMode 'back' atau 'both'
            if (backEl && (viewMode === 'back' || viewMode === 'both')) {
                if (addedPages > 0) {
                    doc.addPage([85.6, 54], 'landscape')
                }
                const canvas = await html2canvas(backEl, captureOptions)
                const imgData = canvas.toDataURL('image/png')
                doc.addImage(imgData, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST')
                addedPages++
            }

            // Fallback jika belum terdeteksi spesifik
            if (addedPages === 0) {
                const anyCard = targetContainer.querySelector('.kartu-santri-card')
                if (anyCard) {
                    const canvas = await html2canvas(anyCard, captureOptions)
                    const imgData = canvas.toDataURL('image/png')
                    doc.addImage(imgData, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST')
                    addedPages++
                }
            }

            if (addedPages > 0) {
                const filename = `Kartu_Santri_${currentSantri.nis || 'santri'}.pdf`
                doc.save(filename)
            }
        } catch (err) {
            console.error('Error generating PDF via html2canvas:', err)
            window.print()
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Modal Header */}
                <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs border border-emerald-300">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-lg leading-tight flex items-center gap-2">
                                Kartu Tanda Santri (KTS)
                                {currentSantri.status && (
                                    <Badge variant={currentSantri.status === 'Aktif' ? 'success' : 'default'} size="sm">
                                        {currentSantri.status}
                                    </Badge>
                                )}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                {currentSantri.nama} • NIS: <span className="font-bold text-emerald-800">{currentSantri.nis}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Multiple Santri Navigation */}
                        {hasMultiple && !isBulkPrint && (
                            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 text-xs font-bold text-gray-600 mr-2">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="p-1 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                    title="Santri Sebelumnya"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="px-2">
                                    {currentIndex + 1} / {santriList.length}
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
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Subheader Toolbar */}
                <div className="no-print px-6 py-3 bg-gray-50/90 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    {/* View mode toggle */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                        <button
                            onClick={() => { setViewMode('both'); setIsBulkPrint(false) }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'both' && !isBulkPrint ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Dua Sisi (Depan & Belakang)
                        </button>
                        <button
                            onClick={() => { setViewMode('front'); setIsBulkPrint(false) }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'front' && !isBulkPrint ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Tampak Depan
                        </button>
                        <button
                            onClick={() => { setViewMode('back'); setIsBulkPrint(false) }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'back' && !isBulkPrint ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Tampak Belakang
                        </button>

                        {hasMultiple && (
                            <button
                                onClick={() => setIsBulkPrint(!isBulkPrint)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isBulkPrint ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
                            >
                                <Layers size={14} />
                                Cetak Semua ({santriList.length})
                            </button>
                        )}
                    </div>

                    {/* Actions: Print & Download */}
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf}
                            className="rounded-xl font-bold border-gray-200"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <Loader2 size={15} className="animate-spin text-emerald-600" />
                                    <span>Memproses PDF...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={15} />
                                    <span>Simpan PDF</span>
                                </>
                            )}
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handlePrint}
                            className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 text-white"
                        >
                            <Printer size={15} /> Cetak Kartu
                        </Button>
                    </div>
                </div>

                {/* Printable Content Area */}
                <div 
                    ref={printAreaRef}
                    id="kartu-santri-print-area" 
                    className="p-6 md:p-8 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-gray-100/70"
                >
                    {isBulkPrint ? (
                        /* Bulk Print Mode: Grid of cards for A4 paper */
                        <div className="w-full space-y-8">
                            <div className="no-print p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                                Mode Cetak Massal aktif. Menampilkan kartu santri sebanyak <strong>{santriList.length} santri</strong>. Klik "Cetak Kartu" untuk langsung mencetak semuanya.
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                                {santriList.map((s, idx) => (
                                    <div key={s.id || idx} className="page-break-inside-avoid flex flex-col items-center gap-3">
                                        <KartuSantriView santri={s} side="front" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Single Santri View */
                        <div className="w-full flex items-center justify-center">
                            <KartuSantriView santri={currentSantri} side={viewMode} />
                        </div>
                    )}
                </div>

                {/* Card Quick Info Footer */}
                <div className="no-print px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Desain Resmi: Edisi Putih & Header Hijau Muda Terang (Standar Resmi CR80: 85.6mm × 54mm)
                    </span>
                    <span className="text-[11px] text-gray-400">
                        Scan QR Code menggunakan kamera SI-TAQUA untuk absensi cepat
                    </span>
                </div>
            </div>

            {/* Wadah Ekspor PDF Offscreen (Presisi Standar 430px, Tetap di Viewport untuk Font Rasterization Penuh) */}
            <div 
                ref={hiddenExportRef}
                className="fixed top-0 left-0 pointer-events-none flex flex-col gap-4 opacity-0 -z-50"
                style={{ width: '430px' }}
                aria-hidden="true"
            >
                <KartuSantriView santri={currentSantri} side="both" />
            </div>

            {/* Custom Print Styles */}
            <style>{`
                @media print {
                    /* Sembunyikan semua elemen aplikasi */
                    body * {
                        visibility: hidden;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Tampilkan hanya area kartu santri */
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
                        color-adjust: exact !important;
                        box-shadow: none !important;
                        border: 1px solid #22c55e !important;
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
