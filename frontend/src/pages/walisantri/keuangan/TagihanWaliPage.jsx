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
                <div className="flex overflow-x-auto gap-4 pb-2">
                    {santriList.map(santri => (
                        <div key={santri.id} className="min-w-[300px]">
                            <SantriCard
                                santri={santri}
                                selected={selectedSantri?.id === santri.id}
                                onClick={() => setSelectedSantri(santri)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Total Tunggakan Card */}
            <div className={`p-6 rounded-xl border flex items-center gap-6 ${totalTunggakan > 0
                ? 'bg-gradient-to-r from-red-50 to-white border-red-100'
                : 'bg-gradient-to-r from-emerald-50 to-white border-emerald-100'
                }`}>
                <div className={`p-4 rounded-xl ${totalTunggakan > 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {totalTunggakan > 0 ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                        {totalTunggakan > 0 ? 'Total Tunggakan' : 'Status Pembayaran'}
                    </p>
                    <p className={`text-3xl font-bold ${totalTunggakan > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {totalTunggakan > 0 ? formatCurrency(totalTunggakan) : 'Lunas'}
                    </p>
                </div>
                {totalTunggakan > 0 && (
                    <Link to="/wali/keuangan/upload">
                        <Button>
                            <CreditCard size={18} className="mr-2" />
                            Konfirmasi Bayar
                        </Button>
                    </Link>
                )}
            </div>

            {/* Main Content */}
            <Card>
                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 pt-6">
                    <nav className="flex gap-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('belum')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'belum'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Belum Lunas ({tagihanBelumLunas.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('lunas')}
                            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'lunas'
                                ? 'border-primary-600 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Sudah Lunas ({tagihanLunas.length})
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {/* Actions */}
                    {(tagihanBelumLunas.length > 0 || tagihanLunas.length > 0) && (
                        <div className="flex justify-end mb-6">
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
                                        <div key={tagihan.id} className={`p-4 rounded-xl border ${isOverdue(tagihan.jatuh_tempo) ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Wallet size={16} className="text-gray-400" />
                                                    <span className="font-semibold text-gray-900">{tagihan.kategori?.nama || 'Pembayaran'}</span>
                                                </div>
                                                {isOverdue(tagihan.jatuh_tempo) && (
                                                    <Badge variant="danger">Jatuh Tempo</Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(tagihan.jumlah)}</p>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Calendar size={14} />
                                                        <span>Jatuh tempo: {formatDate(tagihan.jatuh_tempo)}</span>
                                                    </div>
                                                </div>
                                                {/* Optional: Action button per item if needed */}
                                            </div>
                                            {tagihan.keterangan && (
                                                <p className="mt-3 text-sm text-gray-500 border-t border-gray-200/50 pt-2">
                                                    {tagihan.keterangan}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={CheckCircle}
                                    title="Tidak Ada Tunggakan"
                                    description="Semua tagihan sudah lunas. Terima kasih! 🎉"
                                />
                            )}
                        </>
                    )}

                    {activeTab === 'lunas' && (
                        <>
                            {tagihanLunas.length > 0 ? (
                                <div className="space-y-4">
                                    {tagihanLunas.map(tagihan => (
                                        <div key={tagihan.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 opacity-75 hover:opacity-100 transition-opacity">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Wallet size={16} className="text-gray-400" />
                                                    <span className="font-semibold text-gray-900">{tagihan.kategori?.nama || 'Pembayaran'}</span>
                                                </div>
                                                <Badge variant="success" icon={CheckCircle}>Lunas</Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xl font-bold text-green-600">{formatCurrency(tagihan.jumlah)}</p>
                                                <p className="text-xs text-gray-400">
                                                    Dibayar pada: {formatDate(tagihan.updated_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Wallet}
                                    title="Belum Ada Riwayat"
                                    description="Belum ada pembayaran yang tercatat."
                                />
                            )}
                        </>
                    )}
                </div>
            </Card>

            {/* Quick Links Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/wali/keuangan/riwayat" className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100">
                            <Clock size={20} />
                        </div>
                        <span className="font-medium text-gray-900">Riwayat Pembayaran Lengkap</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600" />
                </Link>
                <Link to="/wali/keuangan/upload" className="p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-primary-600 rounded-lg group-hover:bg-primary-100">
                            <CreditCard size={20} />
                        </div>
                        <span className="font-medium text-gray-900">Konfirmasi Pembayaran Baru</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600" />
                </Link>
            </div>
        </div>
    )
}

export default TagihanWaliPage
