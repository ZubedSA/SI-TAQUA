import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, MessageCircle, Send, Clock, CheckCircle,
    Eye, ChevronRight, Plus
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { useCalendar } from '../../../context/CalendarContext'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'
// import '../WaliPortal.css' // REMOVED

/**
 * InboxPesanPage - Halaman untuk melihat pesan wali ke pondok
 * Refactored to use Global Layout System (Phase 2)
 */
const InboxPesanPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [pesanData, setPesanData] = useState([])
    const [selectedPesan, setSelectedPesan] = useState(null)
    const [filterStatus, setFilterStatus] = useState('semua')

    // Fetch pesan
    const fetchPesan = async () => {
        try {
            let query = supabase
                .from('pesan_wali')
                .select('*')
                .eq('wali_id', user.id)
                .order('created_at', { ascending: false })

            if (filterStatus !== 'semua') {
                query = query.eq('status', filterStatus)
            }

            const { data, error } = await query

            if (error) throw error
            setPesanData(data || [])

        } catch (error) {
            console.error('Error fetching pesan:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchPesan()
        }
    }, [user, filterStatus])

    const { formatDate } = useCalendar()
    // Using standard formatDate for consistency. 
    // Relative time logic removed to ensure standardized Hijri/Masehi display per user request.

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Terkirim': return 'default'
            case 'Dibaca': return 'primary'
            case 'Diproses': return 'warning'
            case 'Dibalas':
            case 'Selesai': return 'success'
            default: return 'default'
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Dibaca': return <Eye size={12} className="mr-1" />
            case 'Diproses': return <Clock size={12} className="mr-1" />
            case 'Dibalas':
            case 'Selesai': return <CheckCircle size={12} className="mr-1" />
            default: return <Send size={12} className="mr-1" />
        }
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
                title="Pesan & Konsultasi"
                description="Komunikasi langsung dengan pengurus pondok"
                icon={MessageCircle}
                backUrl="/wali/beranda"
                actions={
                    <Link to="/wali/pesan/kirim">
                        <Button>
                            <Plus size={18} className="mr-2" />
                            Tulis Pesan
                        </Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] min-h-[500px]">
                {/* Conversations List */}
                <Card className={`lg:col-span-1 flex flex-col h-full ${selectedPesan ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-100 space-y-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {[
                                { value: 'semua', label: 'Semua' },
                                { value: 'Terkirim', label: 'Terkirim' },
                                { value: 'Dibalas', label: 'Dibalas' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${filterStatus === opt.value
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    onClick={() => setFilterStatus(opt.value)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {pesanData.length > 0 ? (
                            <div className="space-y-2">
                                {pesanData.map(pesan => (
                                    <div
                                        key={pesan.id}
                                        onClick={() => setSelectedPesan(pesan)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedPesan?.id === pesan.id
                                            ? 'bg-primary-50 border-primary-200'
                                            : 'bg-white border-transparent hover:bg-gray-50'
                                            } ${pesan.balasan ? 'border-l-4 border-l-emerald-500' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm font-semibold truncate ${selectedPesan?.id === pesan.id ? 'text-primary-900' : 'text-gray-900'}`}>
                                                {pesan.judul}
                                            </h4>
                                            <span className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(pesan.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                                            {pesan.isi}
                                        </p>
                                        <Badge variant={getStatusVariant(pesan.status)} size="sm">
                                            {getStatusIcon(pesan.status)}
                                            {pesan.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={MessageCircle}
                                title="Belum Ada Pesan"
                                description="Kotak masuk Anda masih kosong."
                                compact
                            />
                        )}
                    </div>
                </Card>

                {/* Message Detail */}
                <Card className={`lg:col-span-2 flex flex-col h-full overflow-hidden ${!selectedPesan ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedPesan ? (
                        <>
                            {/* Detail Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                                <button
                                    className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
                                    onClick={() => setSelectedPesan(null)}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedPesan.judul}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatDate(selectedPesan.created_at, {
                                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <Badge variant={getStatusVariant(selectedPesan.status)}>
                                    {selectedPesan.status}
                                </Badge>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 space-y-6">
                                {/* User Message */}
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] space-y-1">
                                        <div className="bg-primary-600 text-white p-4 rounded-2xl rounded-tr-sm shadow-sm">
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedPesan.isi}</p>
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-right">Anda</p>
                                    </div>
                                </div>

                                {/* Reply */}
                                {selectedPesan.balasan ? (
                                    <div className="flex justify-start">
                                        <div className="max-w-[80%] space-y-1">
                                            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-sm shadow-sm relative">
                                                <p className="text-xs font-bold text-primary-600 mb-2">Balasan dari Pondok</p>
                                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedPesan.balasan}</p>
                                            </div>
                                            <p className="text-[10px] text-gray-400">
                                                {selectedPesan.dibalas_pada && formatDate(selectedPesan.dibalas_pada, {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center py-8">
                                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                                            Menunggu balasan dari admin...
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <MessageCircle size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Pilih Pesan</h3>
                            <p className="max-w-xs mx-auto mt-2 text-sm">
                                Pilih salah satu pesan dari daftar di samping untuk melihat detail atau balasan.
                            </p>
                            <Link to="/wali/pesan/kirim" className="mt-6">
                                <Button>
                                    <Plus size={16} className="mr-2" />
                                    Tulis Pesan Baru
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}

export default InboxPesanPage
