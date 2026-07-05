import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Users,
    AlertTriangle,
    AlertCircle,
    Eye,
    Calendar,
    Clock,
    CheckCircle,
    TrendingUp,
    ChevronRight,
    RefreshCw
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import PageHeader from '../../../components/layout/PageHeader'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import EmptyState from '../../../components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card'

const SantriBermasalahPage = () => {
    const navigate = useNavigate()
    const [santri, setSantri] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSantriBermasalah()
    }, [])

    const fetchSantriBermasalah = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('santri_bermasalah')
                .select('*')
                .order('total_pelanggaran', { ascending: false })

            if (error) {
                console.error('Error fetching data:', error.message)
                setSantri([])
            } else {
                setSantri(data || [])
            }
        } catch (error) {
            console.error('Error:', error.message)
            setSantri([])
        } finally {
            setLoading(false)
        }
    }

    const getPriority = (item) => {
        if (item.pelanggaran_berat >= 2) return { label: 'Kritis', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: AlertTriangle }
        if (item.pelanggaran_berat >= 1) return { label: 'Tinggi', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertTriangle }
        if (item.total_pelanggaran >= 5) return { label: 'Sedang', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: AlertCircle }
        return { label: 'Rendah', color: 'bg-gray-50 text-gray-400 border-gray-100', icon: Clock }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Santri Bermasalah"
                description="Daftar santri yang memerlukan perhatian khusus berdasarkan riwayat pelanggaran"
                icon={Users}
                actions={
                    <Button variant="secondary" size="icon" onClick={fetchSantriBermasalah} className="rounded-xl">
                        <RefreshCw size={18} />
                    </Button>
                }
            />

            <div className="flex items-start gap-3 p-4 bg-primary-50 text-primary-700 rounded-2xl border border-primary-100/50 shadow-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-xs md:text-sm font-medium leading-relaxed italic">
                    Data santri bermasalah dihitung otomatis. 
                    Santri masuk daftar jika memiliki <span className="font-black">3+ pelanggaran dalam 7 hari terakhir</span> atau <span className="font-black">1+ pelanggaran berat dalam 6 bulan terakhir</span>.
                </p>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center">
                    <Spinner size="lg" />
                    <p className="text-gray-500 font-medium mt-4">Menganalisis data kedisiplinan...</p>
                </div>
            ) : santri.length === 0 ? (
                <Card className="p-12 text-center">
                    <EmptyState
                        icon={CheckCircle}
                        title="Alhamdulillah, Zero Case!"
                        message="Tidak ada santri yang memerlukan perhatian khusus saat ini. Semua dalam kondisi disiplin."
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {santri.map((item) => {
                        const priority = getPriority(item)
                        const PriorityIcon = priority.icon
                        return (
                            <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-gray-100">
                                <div className={`h-1.5 w-full ${priority.color.split(' ')[0]}`}></div>
                                <CardContent className="p-6 space-y-5">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-black text-gray-900 text-lg group-hover:text-primary-600 transition-colors leading-tight">
                                                {item.nama}
                                            </h3>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                NIS: {item.nis}
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${priority.color}`}>
                                            <PriorityIcon size={12} />
                                            {priority.label}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Total Kasus</span>
                                            <span className="text-xl font-black text-gray-900">{item.total_pelanggaran}</span>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
                                            <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter mb-1">Kasus Berat</span>
                                            <span className="text-xl font-black text-red-600">{item.pelanggaran_berat}</span>
                                        </div>
                                    </div>

                                    {/* Resolution Progress */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <span>Progres Pembinaan</span>
                                            <span className="text-primary-600">
                                                {Math.round(((item.kasus_selesai || 0) / item.total_pelanggaran) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                            <div 
                                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                                style={{ width: `${((item.kasus_selesai || 0) / item.total_pelanggaran) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 border-b border-gray-50 pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                Status Open
                                            </div>
                                            <span className="text-gray-900">{item.kasus_open}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 border-b border-gray-50 pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                Dalam Proses
                                            </div>
                                            <span className="text-gray-900">{item.kasus_proses}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                Sudah Selesai
                                            </div>
                                            <span className="text-gray-900">{item.kasus_selesai || 0}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-tight border border-emerald-100">
                                            {item.kelas_nama || '-'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-tight border border-indigo-100">
                                            {item.halaqoh_nama || '-'}
                                        </span>
                                    </div>

                                    <Link 
                                        to={`/santri/${item.id}`} 
                                        className="flex items-center justify-between w-full p-3 mt-4 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 group-hover:bg-primary-600 transition-colors"
                                    >
                                        Lihat Profil & Riwayat
                                        <ChevronRight size={14} />
                                    </Link>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default SantriBermasalahPage
