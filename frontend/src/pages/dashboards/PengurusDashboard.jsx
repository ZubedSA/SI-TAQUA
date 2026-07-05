import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Users,
    AlertTriangle,
    AlertCircle,
    Bell,
    FileText,
    Newspaper,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Shield,
    UserCog,
    Calendar,
    ClipboardList,
    ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './PengurusDashboard.css'

/**
 * Dashboard Pengurus - Pusat pembinaan dan pengawasan santri
 * Fokus: Pelanggaran, Santri Bermasalah, Pengumuman, Buletin
 */
const PengurusDashboard = () => {
    const [stats, setStats] = useState({
        totalPelanggaran: 0,
        kasusOpen: 0,
        kasusProses: 0,
        kasusSelesai: 0,
        santriBermasalah: 0,
        pengumumanAktif: 0,
        buletinBulanIni: 0
    })
    const [recentPelanggaran, setRecentPelanggaran] = useState([])
    const [loading, setLoading] = useState(true)
    const [greeting, setGreeting] = useState('')

    const updateGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 4 && hour < 11) setGreeting('Selamat Pagi')
        else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang')
        else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore')
        else setGreeting('Selamat Malam')
    }

    useEffect(() => {
        fetchStats()
        fetchRecentPelanggaran()
        updateGreeting()
        const interval = setInterval(updateGreeting, 60000)
        
        return () => clearInterval(interval)
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            console.log('[PengurusDashboard] Fetching pelanggaran...')
            
            // Simple query: fetch all pelanggaran
            const { data: allData, error: allError } = await supabase
                .from('pelanggaran')
                .select('status')

            console.log('[PengurusDashboard] Query result:', { allData, allError })

            let totalCount = 0
            let openCount = 0
            let prosesCount = 0
            let selesaiCount = 0

            if (allData && Array.isArray(allData)) {
                totalCount = allData.length
                allData.forEach(item => {
                    if (item.status === 'OPEN') openCount++
                    else if (item.status === 'PROSES') prosesCount++
                    else if (item.status === 'SELESAI') selesaiCount++
                })
            }

            console.log('[PengurusDashboard] Counts:', { totalCount, openCount, prosesCount, selesaiCount })

            // Fetch santri bermasalah
            const { data: santriBermasalahData, error: santriError } = await supabase
                .from('santri_bermasalah')
                .select('id')
            
            const santriBermasalahCount = santriBermasalahData?.length || 0
            console.log('[PengurusDashboard] Santri bermasalah:', santriBermasalahCount)

            // Fetch pengumuman aktif
            const today = new Date().toISOString().split('T')[0]
            const { data: pengumumanData, error: pengumumanError } = await supabase
                .from('pengumuman_internal')
                .select('id')
                .eq('is_archived', false)
                .lte('mulai_tampil', today)

            const pengumumanCount = pengumumanData?.length || 0
            console.log('[PengurusDashboard] Pengumuman:', pengumumanCount)

            // Fetch buletin bulan ini
            const currentMonth = new Date().getMonth() + 1
            const currentYear = new Date().getFullYear()
            const { data: buletinData, error: buletinError } = await supabase
                .from('buletin_pondok')
                .select('id')
                .eq('bulan', currentMonth)
                .eq('tahun', currentYear)

            const buletinCount = buletinData?.length || 0
            console.log('[PengurusDashboard] Buletin:', buletinCount)

            setStats({
                totalPelanggaran: totalCount,
                kasusOpen: openCount,
                kasusProses: prosesCount,
                kasusSelesai: selesaiCount,
                santriBermasalah: santriBermasalahCount,
                pengumumanAktif: pengumumanCount,
                buletinBulanIni: buletinCount
            })
        } catch (error) {
            console.error('[PengurusDashboard] Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchRecentPelanggaran = async () => {
        try {
            const { data, error } = await supabase
                .from('pelanggaran')
                .select(`
                    id,
                    tanggal,
                    jenis,
                    tingkat,
                    status,
                    poin,
                    santri:santri_id (
                        id,
                        nama,
                        nis
                    )
                `)
                .order('tanggal', { ascending: false })
                .limit(5)

            console.log('[PengurusDashboard] Recent pelanggaran:', { 
                data, 
                error,
                count: data?.length 
            })

            if (error) {
                console.log('Error fetching recent pelanggaran:', error.message)
                setRecentPelanggaran([])
                return
            }

            setRecentPelanggaran(data || [])
        } catch (error) {
            console.log('Error fetching recent pelanggaran:', error.message)
            setRecentPelanggaran([])
        }
    }

    const getTingkatLabel = (tingkat) => {
        const labels = {
            1: { text: 'Ringan', class: 'bg-green-100 text-green-700' },
            2: { text: 'Sedang', class: 'bg-yellow-100 text-yellow-700' },
            3: { text: 'Berat', class: 'bg-red-100 text-red-700' },
            4: { text: 'Sangat Berat', class: 'bg-purple-100 text-purple-700' }
        }
        return labels[tingkat] || { text: 'Unknown', class: 'bg-gray-100 text-gray-700' }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'OPEN': return <AlertCircle size={16} className="text-red-500" />
            case 'PROSES': return <Clock size={16} className="text-yellow-500" />
            case 'SELESAI': return <CheckCircle size={16} className="text-green-500" />
            default: return <XCircle size={16} className="text-gray-400" />
        }
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <div className="pengurus-dashboard" data-dashboard="pengurus">
            {/* Welcome Header */}
            <div className="dashboard-welcome pengurus">
                <div className="welcome-content">
                    <h1>👋 {greeting}!</h1>
                    <p>Dashboard Pengurus PTQA Batuan</p>
                </div>
                <div className="welcome-badge">
                    <UserCog size={20} />
                    <span>Pengurus</span>
                </div>
            </div>

            {/* Quick Stats - Premium Siohioma */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 mt-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:border-red-300 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className="p-2 md:p-3 bg-red-100 text-red-600 rounded-xl md:rounded-2xl">
                            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-500 font-medium mb-1 text-xs md:text-sm">Total Pelanggaran</p>
                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {loading ? '...' : stats.totalPelanggaran}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:border-orange-300 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className="p-2 md:p-3 bg-orange-100 text-orange-600 rounded-xl md:rounded-2xl">
                            <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-500 font-medium mb-1 text-xs md:text-sm">Kasus Open</p>
                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {loading ? '...' : stats.kasusOpen}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:border-blue-300 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className="p-2 md:p-3 bg-blue-100 text-blue-600 rounded-xl md:rounded-2xl">
                            <Clock className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-500 font-medium mb-1 text-xs md:text-sm">Dalam Proses</p>
                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {loading ? '...' : stats.kasusProses}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between group hover:border-emerald-300 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className="p-2 md:p-3 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-2xl">
                            <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-gray-500 font-medium mb-1 text-xs md:text-sm">Selesai</p>
                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            {loading ? '...' : stats.kasusSelesai}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4 group hover:border-purple-300 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shrink-0">
                        <Users size={24} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-gray-900">{loading ? '...' : stats.santriBermasalah}</h4>
                        <p className="text-sm text-gray-500 font-medium">Santri Bermasalah</p>
                    </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4 group hover:border-sky-300 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="p-3 bg-sky-100 text-sky-600 rounded-xl shrink-0">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-gray-900">{loading ? '...' : stats.pengumumanAktif}</h4>
                        <p className="text-sm text-gray-500 font-medium">Pengumuman Aktif</p>
                    </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4 group hover:border-indigo-300 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                        <Newspaper size={24} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-gray-900">{loading ? '...' : stats.buletinBulanIni}</h4>
                        <p className="text-sm text-gray-500 font-medium">Buletin Bulan Ini</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Pelanggaran */}
                <div className="lg:col-span-2 pengurus-card">
                    <div className="card-header">
                        <h3><AlertTriangle size={20} /> Pelanggaran Terbaru</h3>
                        <Link to="/pengurus/pelanggaran" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors">
                            Lihat Semua <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="card-body">
                        {recentPelanggaran.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <CheckCircle size={32} />
                                </div>
                                <p>Belum ada pelanggaran tercatat</p>
                            </div>
                        ) : (
                            <div className="pelanggaran-list">
                                {recentPelanggaran.map((item) => (
                                    <div key={item.id} className="pelanggaran-item">
                                        <div className="pelanggaran-status">
                                            {getStatusIcon(item.status)}
                                        </div>
                                        <div className="pelanggaran-info">
                                            <p className="pelanggaran-nama">{item.santri?.nama || 'Unknown'}</p>
                                            <p className="pelanggaran-jenis">{item.jenis}</p>
                                        </div>
                                        <div className="pelanggaran-meta">
                                            <span className={`pelanggaran-badge ${getTingkatLabel(item.tingkat).class}`}>
                                                {getTingkatLabel(item.tingkat).text}
                                            </span>
                                            <p className="pelanggaran-poin">{item.poin || 0} Poin</p>
                                            <p className="pelanggaran-tanggal">{formatDate(item.tanggal)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions & Summary */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="pengurus-card">
                        <div className="card-header">
                            <h3><ClipboardList size={20} /> Aksi Cepat</h3>
                        </div>
                        <div className="quick-actions">
                            <Link to="/pengurus/pelanggaran/create" className="quick-action-btn danger">
                                <AlertTriangle size={20} />
                                <span>Catat Pelanggaran</span>
                            </Link>
                            <Link to="/pengurus/santri-bermasalah" className="quick-action-btn warning">
                                <Users size={20} />
                                <span>Santri Bermasalah</span>
                            </Link>
                            <Link to="/pengurus/pengumuman" className="quick-action-btn info">
                                <Bell size={20} />
                                <span>Buat Pengumuman</span>
                            </Link>
                            <Link to="/pengurus/buletin" className="quick-action-btn success">
                                <Newspaper size={20} />
                                <span>Upload Buletin</span>
                            </Link>
                            <Link to="/pengurus/informasi" className="quick-action-btn purple">
                                <FileText size={20} />
                                <span>Info Pondok</span>
                            </Link>
                            <Link to="/pengurus/arsip" className="quick-action-btn gray">
                                <Shield size={20} />
                                <span>Lihat Arsip</span>
                            </Link>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="pengurus-card">
                        <div className="card-header">
                            <h3><TrendingUp size={20} /> Ringkasan</h3>
                            <span className="summary-badge">
                                <Calendar size={12} /> Bulan Ini
                            </span>
                        </div>
                        <div className="summary-list">
                            <div className="summary-item danger">
                                <div className="summary-icon">
                                    <AlertTriangle size={18} />
                                </div>
                                <div className="summary-info">
                                    <span className="summary-value">{stats.kasusOpen + stats.kasusProses}</span>
                                    <span className="summary-label">Perlu Ditangani</span>
                                </div>
                            </div>

                            <div className="summary-item success">
                                <div className="summary-icon">
                                    <CheckCircle size={18} />
                                </div>
                                <div className="summary-info">
                                    <span className="summary-value">{stats.kasusSelesai}</span>
                                    <span className="summary-label">Terselesaikan</span>
                                </div>
                            </div>

                            <div className="summary-item info">
                                <div className="summary-icon">
                                    <Shield size={18} />
                                </div>
                                <div className="summary-info">
                                    <span className="summary-value">
                                        {stats.totalPelanggaran > 0
                                            ? Math.round((stats.kasusSelesai / stats.totalPelanggaran) * 100)
                                            : 100}%
                                    </span>
                                    <span className="summary-label">Rate Penyelesaian</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PengurusDashboard
