import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    BookOpen, Calendar, User, ChevronLeft, Search,
    CheckCircle, Clock, RotateCcw, Filter
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SantriCard from '../components/SantriCard'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import EmptyState from '../../../components/ui/EmptyState'
// import '../WaliPortal.css' // REMOVED

/**
 * HafalanWaliPage - Halaman untuk melihat riwayat hafalan santri
 * Read-only - wali hanya bisa melihat, tidak bisa mengedit
 * Refactored to use Global Layout System (Phase 2)
 */
const HafalanWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [hafalanData, setHafalanData] = useState([])
    const [filterJenis, setFilterJenis] = useState('semua')
    const [searchSurah, setSearchSurah] = useState('')

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

    // Fetch hafalan data
    const fetchHafalanData = async (santriId) => {
        if (!santriId) return

        try {
            let query = supabase
                .from('hafalan')
                .select('*, guru:penguji_id (nama)')
                .eq('santri_id', santriId)
                .order('tanggal', { ascending: false })

            if (filterJenis !== 'semua') {
                query = query.eq('jenis', filterJenis)
            }

            const { data, error } = await query

            if (error) throw error
            setHafalanData(data || [])
        } catch (error) {
            console.error('Error fetching hafalan:', error)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSantriList().finally(() => setLoading(false))
        }
    }, [user])

    useEffect(() => {
        if (selectedSantri) {
            fetchHafalanData(selectedSantri.id)
        }
    }, [selectedSantri, filterJenis])

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Mutqin':
                return <CheckCircle size={16} className="text-emerald-500" />
            case 'Proses':
                return <Clock size={16} className="text-amber-500" />
            default:
                return <RotateCcw size={16} className="text-blue-500" />
        }
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Mutqin':
                return 'bg-emerald-100 text-emerald-700'
            case 'Proses':
                return 'bg-amber-100 text-amber-700'
            default:
                return 'bg-blue-100 text-blue-700'
        }
    }

    // Filter by search
    const filteredHafalan = hafalanData.filter(h =>
        searchSurah === '' ||
        h.surah?.toLowerCase().includes(searchSurah.toLowerCase())
    )

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
                title="Hafalan Al-Qur'an"
                description="Riwayat setoran hafalan santri"
                icon={BookOpen}
                backUrl="/wali/beranda"
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

            {/* Selected Santri Info (if only 1) */}
            {selectedSantri && santriList.length === 1 && (
                <div className="mb-4">
                    <SantriCard santri={selectedSantri} />
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Cari surat..."
                        value={searchSurah}
                        onChange={(e) => setSearchSurah(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        value={filterJenis}
                        onChange={(e) => setFilterJenis(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value="semua">Semua Jenis</option>
                        <option value="Setoran">Setoran</option>
                        <option value="Muroja'ah">Muroja'ah</option>
                        <option value="Ziyadah Ulang">Ziyadah Ulang</option>
                    </select>
                </div>
            </div>

            {/* Hafalan List */}
            <Card>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">
                    Riwayat Hafalan ({filteredHafalan.length})
                </h3>

                {filteredHafalan.length > 0 ? (
                    <div className="space-y-3">
                        {filteredHafalan.map(hafalan => (
                            <div key={hafalan.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Calendar size={14} />
                                        {formatDate(hafalan.tanggal)}
                                    </div>
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(hafalan.status)}`}>
                                        {getStatusIcon(hafalan.status)}
                                        {hafalan.status}
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <h4 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-1">
                                        <BookOpen size={16} className="text-primary-600" />
                                        {hafalan.surah}
                                    </h4>
                                    <p className="text-sm text-gray-600 pl-6">
                                        Juz {hafalan.juz} • Ayat {hafalan.ayat_mulai || 1} - {hafalan.ayat_selesai || 'selesai'}
                                    </p>
                                    {hafalan.jenis && (
                                        <span className="inline-block mt-2 ml-6 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-md font-medium">
                                            {hafalan.jenis}
                                        </span>
                                    )}
                                </div>

                                {hafalan.catatan && (
                                    <div className="mt-3 ml-6 p-3 bg-white rounded-lg border border-gray-100 text-sm text-gray-600 italic">
                                        "{hafalan.catatan}"
                                    </div>
                                )}

                                <div className="mt-3 ml-6 flex items-center gap-2 text-xs text-gray-500">
                                    <User size={14} />
                                    <span>Penguji: {hafalan.guru?.nama || '-'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={BookOpen}
                        title="Belum Ada Data Hafalan"
                        description="Data hafalan santri belum tersedia atau belum diinput oleh guru."
                    />
                )}
            </Card>
        </div>
    )
}

export default HafalanWaliPage
