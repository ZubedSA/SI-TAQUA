import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronLeft, Wallet, Calendar, AlertCircle, CheckCircle,
    Clock, CreditCard, ChevronRight, Download
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useCalendar } from '../../../context/CalendarContext'
import SantriCard from '../components/SantriCard'
import DownloadButton from '../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../utils/exportUtils'

import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'

/**
 * TagihanWaliPage - Halaman untuk melihat tagihan santri
 * Refactored to use Global Layout System (Phase 2)
 */
const TagihanWaliPage = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [tagihanBelumLunas, setTagihanBelumLunas] = useState([])
    const [tagihanLunas, setTagihanLunas] = useState([])
    const [activeTab, setActiveTab] = useState('belum')
    const [totalTunggakan, setTotalTunggakan] = useState(0)

    // Fetch santri list
    const fetchSantriList = async () => {
        try {
            const { data, error } = await supabase
                .from('santri')
                .select(`
          *,
          kelas:kelas_id (nama),
          halaqoh:halaqoh_id (nama)
        `)
                .eq('wali_id', user.id)
                .order('nama')

            if (error) throw error

            setSantriList(data || [])
            if (data && data.length > 0) {
                setSelectedSantri(data[0])
            }
        } catch (error) {
            console.error('Error fetching santri:', error)
        }
    }

    // Fetch tagihan data
    const fetchTagihanData = async (santriId) => {
        if (!santriId) return

        try {
            // Fetch tagihan belum lunas
            const { data: belumLunas, error: errBelum } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama)')
                .eq('santri_id', santriId)
                .neq('status', 'Lunas')
                .order('jatuh_tempo')

            if (errBelum) throw errBelum
            setTagihanBelumLunas(belumLunas || [])

            // Calculate total tunggakan
            const total = (belumLunas || []).reduce((sum, t) => sum + parseFloat(t.jumlah), 0)
            setTotalTunggakan(total)

            // Fetch tagihan lunas (limit 20)
            const { data: lunas, error: errLunas } = await supabase
                .from('tagihan_santri')
                .select('*, kategori:kategori_id (nama)')
                .eq('santri_id', santriId)
                .eq('status', 'Lunas')
                .order('updated_at', { ascending: false })
                .limit(20)

            if (errLunas) throw errLunas
            setTagihanLunas(lunas || [])

        } catch (error) {
            console.error('Error fetching tagihan:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchTagihanData(selectedSantri.id)
        }
    }, [selectedSantri])

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const { formatDate } = useCalendar()

    const isOverdue = (jatuhTempo) => {
        return new Date(jatuhTempo) < new Date()
    }

    const handleDownloadExcel = () => {
        const dataToExport = activeTab === 'belum' ? tagihanBelumLunas : tagihanLunas
        const statusLabel = activeTab === 'belum' ? 'Belum_Lunas' : 'Lunas'
        const columns = ['Kategori', 'Jumlah', 'Jatuh Tempo', 'Keterangan', 'Status']

        const exportData = dataToExport.map(t => ({
            Kategori: t.kategori?.nama || 'Tagihan',
            Jumlah: parseFloat(t.jumlah),
            'Jatuh Tempo': formatDate(t.jatuh_tempo),
            Keterangan: t.keterangan || '-',
            Status: activeTab === 'belum' && isOverdue(t.jatuh_tempo) ? 'Jatuh Tempo' : (activeTab === 'belum' ? 'Belum Lunas' : 'Lunas')
        }))

        exportToExcel(exportData, columns, `tagihan_${statusLabel}_${selectedSantri?.nama || 'santri'}`)
    }

    const handleDownloadCSV = () => {
        const dataToExport = activeTab === 'belum' ? tagihanBelumLunas : tagihanLunas
        const statusLabel = activeTab === 'belum' ? 'Belum_Lunas' : 'Lunas'
        const columns = ['Kategori', 'Jumlah', 'Jatuh Tempo', 'Keterangan', 'Status']

        const exportData = dataToExport.map(t => ({
            Kategori: t.kategori?.nama || 'Tagihan',
            Jumlah: parseFloat(t.jumlah),
            'Jatuh Tempo': formatDate(t.jatuh_tempo),
            Keterangan: t.keterangan || '-',
            Status: activeTab === 'belum' && isOverdue(t.jatuh_tempo) ? 'Jatuh Tempo' : (activeTab === 'belum' ? 'Belum Lunas' : 'Lunas')
        }))

        exportToCSV(exportData, columns, `tagihan_${statusLabel}_${selectedSantri?.nama || 'santri'}`)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Tagihan & Pembayaran"
                description="Daftar tagihan dan riwayat pembayaran santri"
                icon={Wallet}
                backUrl="/wali/beranda"
            />

            {/* Santri Selector */}
            {santriList.length > 1 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pilih Santri</h3>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4 mask-linear-fade">
                        {santriList.map(santri => (
                            <div key={santri.id} className="min-w-[280px]">
                                <SantriCard
                                    santri={santri}
                                    selected={selectedSantri?.id === santri.id}
                                    onClick={() => setSelectedSantri(santri)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Premium Total Tunggakan Card */}
            <div className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-300 shadow-xl ${totalTunggakan > 0
                ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-400/30'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400/30'
                }`}>
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
                        {totalTunggakan > 0 ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                            {totalTunggakan > 0 ? 'Total Tunggakan Aktif' : 'Status Administrasi'}
                        </p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                            {totalTunggakan > 0 ? formatCurrency(totalTunggakan) : 'LUNAS'}
                        </h2>
                        {totalTunggakan === 0 && (
                            <p className="text-sm font-medium opacity-90">Terima kasih atas kedisiplinan Anda. Jazakumullah khair. ✨</p>
                        )}
                    </div>
                    {totalTunggakan > 0 && (
                        <Link to="/wali/keuangan/upload" className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto px-6 py-4 bg-white text-rose-600 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-rose-50 transition-all active:scale-95 shadow-lg">
                                <span className="flex items-center justify-center gap-2">
                                    <CreditCard size={18} />
                                    Bayar Sekarang
                                </span>
                            </button>
                        </Link>
                    )}
                </div>
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>
            </div>

            {/* Main Content - Premium Tabs */}
            <div className="space-y-6">
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 mask-linear-fade">
                    <button
                        onClick={() => setActiveTab('belum')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shrink-0 ${activeTab === 'belum'
                            ? 'bg-rose-600 text-white scale-105 z-10 shadow-rose-200'
                            : 'bg-white/70 backdrop-blur-md text-slate-500 hover:bg-white border border-white/60'
                            }`}
                    >
                        <AlertCircle size={18} />
                        Belum Lunas ({tagihanBelumLunas.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('lunas')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shrink-0 ${activeTab === 'lunas'
                            ? 'bg-emerald-600 text-white scale-105 z-10 shadow-emerald-200'
                            : 'bg-white/70 backdrop-blur-md text-slate-500 hover:bg-white border border-white/60'
                            }`}
                    >
                        <CheckCircle size={18} />
                        Sudah Lunas ({tagihanLunas.length})
                    </button>
                </div>

                <div className="glass-card rounded-[3rem] border border-white/50 shadow-2xl p-8">
                    {/* Actions */}
                    {(tagihanBelumLunas.length > 0 || tagihanLunas.length > 0) && (
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100/50">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Rincian Tagihan</h3>
                            <DownloadButton
                                onDownloadExcel={handleDownloadExcel}
                                onDownloadCSV={handleDownloadCSV}
                            />
                        </div>
                    )}

                    {activeTab === 'belum' && (
                        <>
                            {tagihanBelumLunas.length > 0 ? (
                                <div className="space-y-4">
                                    {tagihanBelumLunas.map(tagihan => (
                                        <div key={tagihan.id} className={`p-6 rounded-[2rem] border transition-all hover:scale-[1.01] group ${isOverdue(tagihan.jatuh_tempo) ? 'bg-rose-50/50 border-rose-100 shadow-rose-100/20' : 'bg-slate-50/50 border-slate-100 shadow-slate-100/20'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-3 rounded-2xl shadow-inner ${isOverdue(tagihan.jatuh_tempo) ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        <Wallet size={20} />
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kategori Tagihan</span>
                                                        <span className="font-black text-slate-900 uppercase tracking-tight">{tagihan.kategori?.nama || 'Pembayaran'}</span>
                                                    </div>
                                                </div>
                                                {isOverdue(tagihan.jatuh_tempo) && (
                                                    <Badge variant="danger" className="font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">Jatuh Tempo</Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-4xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">{formatCurrency(tagihan.jumlah)}</p>
                                                    <div className="flex flex-wrap gap-4 mt-2">
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                                            <Calendar size={14} />
                                                            <span>Bulan: {formatDate(tagihan.jatuh_tempo, { month: 'long', year: 'numeric' })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <Clock size={14} />
                                                            <span>Tempo: {formatDate(tagihan.jatuh_tempo)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link to="/wali/keuangan/upload" className="shrink-0">
                                                    <button className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg">
                                                        Konfirmasi
                                                    </button>
                                                </Link>
                                            </div>
                                            {tagihan.keterangan && (
                                                <p className="mt-4 text-xs font-medium text-slate-500 italic border-t border-slate-100 pt-3">
                                                    "{tagihan.keterangan}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={CheckCircle}
                                    title="Semua Lunas"
                                    message="Semua tagihan sudah lunas. Terima kasih! 🎉"
                                />
                            )}
                        </>
                    )}

                    {activeTab === 'lunas' && (
                        <>
                            {tagihanLunas.length > 0 ? (
                                <div className="space-y-4">
                                    {tagihanLunas.map(tagihan => (
                                        <div key={tagihan.id} className="p-6 rounded-[2rem] bg-slate-50/30 border border-slate-100 opacity-80 hover:opacity-100 transition-all hover:bg-white">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                                        <CheckCircle size={20} />
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Pembayaran</span>
                                                        <span className="font-black text-slate-900 uppercase tracking-tight">{tagihan.kategori?.nama || 'Pembayaran'}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="success" className="font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">Lunas</Badge>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(tagihan.jumlah)}</p>
                                                <div className="flex flex-wrap gap-4 pt-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        <span>Bulan: {formatDate(tagihan.jatuh_tempo, { month: 'long', year: 'numeric' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                        <Clock size={12} />
                                                        <span>Lunas Pada: {formatDate(tagihan.updated_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Wallet}
                                    title="Belum Ada Riwayat"
                                    message="Belum ada pembayaran yang tercatat."
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Quick Links Footer - Premium Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/wali/keuangan/riwayat" className="glass-card p-6 rounded-[2.5rem] border border-white/50 flex items-center justify-between hover:bg-white transition-all group shadow-xl hover:scale-[1.02]">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <Clock size={24} />
                        </div>
                        <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Arsip Pembayaran</span>
                            <span className="font-black text-slate-900 uppercase tracking-tight">Riwayat Lengkap</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:rotate-45">
                        <ChevronRight size={20} />
                    </div>
                </Link>
                <Link to="/wali/keuangan/upload" className="glass-card p-6 rounded-[2.5rem] border border-white/50 flex items-center justify-between hover:bg-white transition-all group shadow-xl hover:scale-[1.02]">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Verifikasi Dana</span>
                            <span className="font-black text-slate-900 uppercase tracking-tight">Konfirmasi Bayar</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:rotate-45">
                        <ChevronRight size={20} />
                    </div>
                </Link>
            </div>
        </div>
    )
}

export default TagihanWaliPage
