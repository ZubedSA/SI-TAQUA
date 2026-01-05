import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Receipt, Calendar, CheckCircle, Clock,
    Filter, CreditCard, Banknote
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import DownloadButton from '../../../components/ui/DownloadButton'
import { exportToExcel, exportToCSV } from '../../../utils/exportUtils'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'
// import '../WaliPortal.css' // REMOVED

/**
 * RiwayatBayarPage - Halaman untuk melihat riwayat pembayaran santri
 * Refactored to use Global Layout System (Phase 2)
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

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const getMetodeIcon = (metode) => {
        switch (metode) {
            case 'Transfer': return <CreditCard size={14} className="mr-1" />
            case 'QRIS': return <Receipt size={14} className="mr-1" />
            default: return <Banknote size={14} className="mr-1" />
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

    const handleDownloadCSV = () => {
        const columns = ['Tanggal', 'Kategori', 'Metode', 'Jumlah', 'Santri']
        const exportData = pembayaranData.map(p => ({
            Tanggal: formatDate(p.tanggal),
            Kategori: p.tagihan?.kategori?.nama || 'Pembayaran',
            Metode: p.metode || 'Tunai',
            Jumlah: parseFloat(p.jumlah),
            Santri: selectedSantri?.nama || '-'
        }))
        exportToCSV(exportData, columns, 'riwayat_pembayaran')
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
            <PageHeader
                title="Riwayat Pembayaran"
                description="Arsip lengkap transaksi pembayaran santri"
                icon={Receipt}
                backUrl="/wali/keuangan"
            />

            {/* Santri Selector */}
            {santriList.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {santriList.map(santri => (
                        <SantriCard
                            key={santri.id}
                            santri={santri}
                            selected={selectedSantri?.id === santri.id}
                            onClick={() => setSelectedSantri(santri)}
                        />
                    ))}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter size={18} className="text-gray-400" />
                    </div>
                    <select
                        value={filterBulan}
                        onChange={(e) => setFilterBulan(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 appearance-none"
                    >
                        <option value="">Semua Waktu</option>
                        {getMonthOptions().map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {pembayaranData.length > 0 && (
                    <DownloadButton
                        onDownloadExcel={handleDownloadExcel}
                        onDownloadCSV={handleDownloadCSV}
                    />
                )}
            </div>

            {/* Total Summary */}
            {pembayaranData.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                        <Receipt size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-emerald-800 opacity-80">Total {filterBulan ? 'Bulan Ini' : 'Pembayaran'}</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPembayaran)}</p>
                    </div>
                    <div className="ml-auto px-3 py-1 bg-white/60 rounded-full text-xs font-medium text-emerald-800">
                        {pembayaranData.length} transaksi
                    </div>
                </div>
            )}

            {/* Pembayaran List */}
            <Card>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">Daftar Transaksi</h3>
                    </div>

                    {pembayaranData.length > 0 ? (
                        <div className="space-y-3">
                            {pembayaranData.map(pembayaran => (
                                <div key={pembayaran.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {pembayaran.tagihan?.kategori?.nama || 'Pembayaran'}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDate(pembayaran.tanggal)}
                                                </span>
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-200 rounded text-gray-700">
                                                    {getMetodeIcon(pembayaran.metode)}
                                                    {pembayaran.metode || 'Tunai'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right w-full sm:w-auto pl-14 sm:pl-0">
                                        <div className="font-bold text-lg text-emerald-600">
                                            {formatCurrency(pembayaran.jumlah)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Receipt}
                            title="Belum Ada Pembayaran"
                            description="Belum ada riwayat pembayaran yang tercatat untuk periode ini."
                        />
                    )}
                </div>
            </Card>
        </div>
    )
}

export default RiwayatBayarPage
