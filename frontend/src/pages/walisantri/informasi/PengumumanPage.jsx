import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, Bell, Calendar, Tag, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
import Badge from '../../../components/ui/Badge'
// import '../WaliPortal.css' // REMOVED

/**
 * PengumumanPage - Halaman untuk melihat pengumuman pondok
 * Refactored to use Global Layout System (Phase 2)
 */
const PengumumanPage = () => {
    const [loading, setLoading] = useState(true)
    const [pengumumanData, setPengumumanData] = useState([])
    const [filterKategori, setFilterKategori] = useState('semua')
    const [expandedId, setExpandedId] = useState(null)

    // Fetch pengumuman
    const fetchPengumuman = async () => {
        try {
            let query = supabase
                .from('pengumuman')
                .select('*')
                .eq('is_active', true)
                .order('prioritas', { ascending: false })
                .order('tanggal_publish', { ascending: false })

            if (filterKategori !== 'semua') {
                query = query.eq('kategori', filterKategori)
            }

            const { data, error } = await query

            if (error) throw error
            setPengumumanData(data || [])

        } catch (error) {
            console.error('Error fetching pengumuman:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPengumuman()
    }, [filterKategori])

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const getKategoriColor = (kategori) => {
        const colors = {
            'Umum': 'gray',
            'Akademik': 'blue',
            'Keuangan': 'emerald',
            'Kegiatan': 'purple',
            'Libur': 'amber',
            'Ujian': 'red'
        }
        return colors[kategori] || 'gray'
    }

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    // List categories for filter chips
    const categories = ['semua', 'Umum', 'Akademik', 'Keuangan', 'Kegiatan', 'Libur', 'Ujian']

    return (
        <div className="space-y-6">
            <PageHeader
                title="Informasi & Pengumuman"
                description="Berita terbaru dari pondok pesantren"
                icon={Bell}
                backUrl="/wali/beranda"
            />

            {/* Filter Kategori */}
            <div className="flex flex-wrap gap-2 pb-2">
                {categories.map(kat => (
                    <button
                        key={kat}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filterKategori === kat
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        onClick={() => setFilterKategori(kat)}
                    >
                        {kat === 'semua' ? 'Semua' : kat}
                    </button>
                ))}
            </div>

            {/* Pengumuman List */}
            <div>
                {pengumumanData.length > 0 ? (
                    <div className="space-y-4">
                        {pengumumanData.map(pengumuman => (
                            <div
                                key={pengumuman.id}
                                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${pengumuman.prioritas > 5
                                    ? 'border-l-4 border-l-red-500 border-gray-200 shadow-sm'
                                    : 'border-gray-200 shadow-sm hover:shadow-md'
                                    }`}
                            >
                                <div
                                    className="p-5 cursor-pointer"
                                    onClick={() => toggleExpand(pengumuman.id)}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge variant={getKategoriColor(pengumuman.kategori)}>
                                            <Tag size={12} className="mr-1" />
                                            {pengumuman.kategori}
                                        </Badge>
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Calendar size={12} />
                                            {formatDate(pengumuman.tanggal_publish)}
                                        </span>
                                        {pengumuman.prioritas > 5 && (
                                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                Penting
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className="text-lg font-semibold text-gray-800 leading-tight">
                                            {pengumuman.judul}
                                        </h3>
                                        <button className="text-gray-400 hover:text-primary-600 transition-colors shrink-0 mt-1">
                                            {expandedId === pengumuman.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>

                                    {!expandedId && (
                                        <p className="mt-2 text-sm text-gray-500 line-clamp-1">
                                            {pengumuman.isi.split('\n')[0]}
                                        </p>
                                    )}
                                </div>

                                <div
                                    className={`transition-all duration-300 ease-in-out ${expandedId === pengumuman.id
                                        ? 'max-h-[1000px] opacity-100'
                                        : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <div className="px-5 pb-5 pt-0 border-t border-gray-100 mt-2">
                                        <div className="pt-4 text-gray-700 text-sm leading-relaxed space-y-3">
                                            {pengumuman.isi.split('\n').map((paragraph, idx) => (
                                                paragraph.trim() && <p key={idx}>{paragraph}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Bell}
                        title="Belum Ada Pengumuman"
                        description="Tidak ada pengumuman untuk kategori ini."
                    />
                )}
            </div>
        </div>
    )
}

export default PengumumanPage
