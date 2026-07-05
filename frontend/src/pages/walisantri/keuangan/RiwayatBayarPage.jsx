import { useState, useEffect } from 'react'
import { 
    Receipt, Calendar, CheckCircle, Clock,
    Filter, CreditCard, Banknote, TrendingUp,
    FileText, Download, ChevronRight, CheckCircle2
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useCalendar } from '../../../context/CalendarContext'
import SantriCard from '../components/SantriCard'
import { exportToExcel, exportToCSV } from '../../../utils/exportUtils'
import PageHeader from '../../../components/layout/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'

/**
 * RiwayatBayarPage - Halaman untuk melihat riwayat pembayaran santri
 * Premium UI Upgrade
 */
const RiwayatBayarPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [pembayaranData, setPembayaranData] = useState([])
    const [filterBulan, setFilterBulan] = useState('')

    // Generate month options
    const getMonthOptions = () => {
        const options = []
        const now = new Date()
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            options.push({
                value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
            })
        }
        return options
    }

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

    // Fetch pembayaran data
    const fetchPembayaranData = async (santriId) => {
        if (!santriId) return

        try {
            let query = supabase
                .from('pembayaran_santri')
                .select(`
          *,
          tagihan:tagihan_id (
            jumlah,
            kategori:kategori_id (nama)
          )
        `)
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            // Filter by month
            if (filterBulan) {
                const [year, month] = filterBulan.split('-')
                const startDate = `${year}-${month}-01`
                const endDate = new Date(parseInt(year), parseInt(month), 0)
                    .toISOString().split('T')[0]

                query = query
                    .gte('tanggal', startDate)
                    .lte('tanggal', endDate)
            }

            const { data, error } = await query

            if (error) throw error
            setPembayaranData(data || [])

        } catch (error) {
            console.error('Error fetching pembayaran:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchPembayaranData(selectedSantri.id)
        }
    }, [selectedSantri, filterBulan])

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const { formatDate } = useCalendar()

    const getMetodeIcon = (metode) => {
        switch (metode) {
            case 'Transfer': return <CreditCard size={14} className="mr-1.5" />
            case 'QRIS': return <Receipt size={14} className="mr-1.5" />
            default: return <Banknote size={14} className="mr-1.5" />
        }
    }

    // Calculate total
    const totalPembayaran = pembayaranData.reduce((sum, p) => sum + parseFloat(p.jumlah), 0)

    const handleDownloadExcel = () => {
        const columns = ['Tanggal', 'Kategori', 'Metode', 'Jumlah', 'Santri']
        const exportData = pembayaranData.map(p => ({
            Tanggal: formatDate(p.tanggal),
            Kategori: p.tagihan?.kategori?.nama || 'Pembayaran',
            Metode: p.metode || 'Tunai',
            Jumlah: parseFloat(p.jumlah),
            Santri: selectedSantri?.nama || '-'
        }))
        exportToExcel(exportData, columns, 'riwayat_pembayaran')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <PageHeader
                title="Riwayat Pembayaran"
                description="Arsip lengkap transaksi pembayaran santri"
                icon={Receipt}
                backUrl="/wali/keuangan"
            />

            {/* Premium Santri Selector (Horizontal Scroll) */}
            {santriList.length > 1 && (
                <div className="space-y-3">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight px-2">Pilih Santri</h3>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4">
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

            {/* Filter & Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Filter Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                            <Filter size={24} />
                        </div>
                        <div>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Penyaringan</span>
                            <h4 className="font-black text-gray-900 uppercase leading-none">Filter Periode</h4>
                        </div>
                    </div>
                    <select
                        value={filterBulan}
                        onChange={(e) => setFilterBulan(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">📅 Semua Waktu</option>
                        {getMonthOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {pembayaranData.length > 0 && (
                        <button 
                            onClick={handleDownloadExcel}
                            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                        >
                            <Download size={16} />
                            Download Excel
                        </button>
                    )}
                </div>

                {/* Total Summary Card */}
                {pembayaranData.length > 0 && (
                    <div className="lg:col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full gap-6">
                            <div className="space-y-4">
                                <div className="p-3 w-fit rounded-2xl bg-white/20 backdrop-blur-md">
                                    <TrendingUp size={28} />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">
                                        Total {filterBulan ? 'Periode Ini' : 'Pembayaran'}
                                    </span>
                                    <h3 className="text-4xl font-black leading-none tracking-tight">
                                        {formatCurrency(totalPembayaran)}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-4">
                                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {pembayaranData.length} Transaksi
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Sistem Terverifikasi</span>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:block opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <Receipt size={120} strokeWidth={1} />
                            </div>
                        </div>
                        {/* Decoration */}
                        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    </div>
                )}
            </div>

            {/* Transaction List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Daftar Transaksi</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        {pembayaranData.length} Data ditemukan
                    </span>
                </div>

                {pembayaranData.length > 0 ? (
                    <div className="grid gap-4">
                        {pembayaranData.map(pembayaran => (
                            <div 
                                key={pembayaran.id} 
                                className="group bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 hover:shadow-2xl transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-[1.2rem] bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 size={28} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">
                                            {formatDate(pembayaran.tanggal)}
                                        </span>
                                        <h4 className="font-black text-slate-900 uppercase text-lg leading-tight truncate">
                                            {pembayaran.tagihan?.kategori?.nama || 'Pembayaran'}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                {getMetodeIcon(pembayaran.metode)}
                                                {pembayaran.metode || 'Tunai'}
                                            </span>
                                            {pembayaran.catatan && (
                                                <span className="text-[10px] font-medium text-slate-400 italic truncate max-w-[150px]">
                                                    "{pembayaran.catatan}"
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 border-slate-50 gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden">Jumlah</span>
                                    <div className="text-2xl font-black text-emerald-600 tracking-tight">
                                        {formatCurrency(pembayaran.jumlah)}
                                    </div>
                                    <div className="hidden md:flex items-center gap-1 text-emerald-400">
                                        <CheckCircle2 size={12} />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Berhasil</span>
                                    </div>
                                </div>

                                {/* Decoration */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/40 flex flex-col items-center text-center">
                        <div className="p-6 rounded-full bg-slate-50 text-slate-300 mb-6">
                            <Receipt size={64} strokeWidth={1} />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Belum Ada Transaksi</h4>
                        <p className="text-slate-500 text-sm mt-2 max-w-sm font-medium">
                            Riwayat pembayaran untuk {selectedSantri?.nama} belum tersedia atau tidak ditemukan untuk filter ini.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default RiwayatBayarPage
