import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, Search, Plus, UserPlus, GraduationCap } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../context/ToastContext'
import Spinner from '../../../components/ui/Spinner'

const OTALinking = () => {
    const navigate = useNavigate()
    const { id: otaId } = useParams()
    const showToast = useToast()

    const [loading, setLoading] = useState(true)
    const [otaName, setOtaName] = useState('')
    const [linkedSantri, setLinkedSantri] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResult, setSearchResult] = useState([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        fetchData()
    }, [otaId])

    const fetchData = async () => {
        try {
            // Get OTA Name
            const { data: ota } = await supabase.from('orang_tua_asuh').select('nama').eq('id', otaId).single()
            setOtaName(ota?.nama || 'OTA')

            // Get Linked Santri
            const { data: linked } = await supabase
                .from('ota_santri')
                .select(`
                    id,
                    created_at,
                    santri:santri_id (id, nama, nis, kelas:kelas_id(nama))
                `)
                .eq('ota_id', otaId)
                .order('created_at', { ascending: false })

            setLinkedSantri(linked || [])
        } catch (err) {
            showToast.error('Gagal memuat data: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!searchQuery.trim()) return

        setSearching(true)
        try {
            const { data } = await supabase
                .from('santri')
                .select('id, nama, nis, kelas:kelas_id(nama)')
                .ilike('nama', `%${searchQuery}%`)
                .limit(5)

            // Filter out already linked santri
            const linkedIds = linkedSantri.map(l => l.santri.id)
            const available = data?.filter(s => !linkedIds.includes(s.id)) || []

            setSearchResult(available)
        } catch (err) {
            console.error(err)
        } finally {
            setSearching(false)
        }
    }

    const handleLink = async (santriId) => {
        try {
            const { error } = await supabase
                .from('ota_santri')
                .insert([{ ota_id: otaId, santri_id: santriId }])

            if (error) throw error

            showToast.success('Santri berhasil ditambahkan')
            setSearchResult(prev => prev.filter(s => s.id !== santriId))
            fetchData() // Reload list
        } catch (err) {
            showToast.error('Gagal menghubungkan: ' + err.message)
        }
    }

    const handleUnlink = async (linkId, santriName) => {
        if (!window.confirm(`Hapus ${santriName} dari daftar asuh?`)) return

        try {
            const { error } = await supabase.from('ota_santri').delete().eq('id', linkId)
            if (error) throw error

            showToast.success('Santri dihapus dari daftar')
            fetchData()
        } catch (err) {
            showToast.error('Gagal menghapus: ' + err.message)
        }
    }

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <Spinner label="Memuat Data..." />
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 fade-in">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kelola Santri Binaan</h1>
                        <p className="text-gray-500 mt-1">
                            Mengelola hubungan santri untuk OTA <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">{otaName}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/ota')}
                        className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition shadow-sm"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Kembali
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Linked List (7 cols) */}
                    <div className="md:col-span-7 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <GraduationCap size={18} className="text-blue-600" />
                                    Santri Terhubung
                                    <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">{linkedSantri.length}</span>
                                </h3>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto">
                                {linkedSantri.length > 0 ? (
                                    <div className="space-y-3">
                                        {linkedSantri.map(item => (
                                            <div key={item.id} className="group flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all duration-200">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                        {item.santri.nama?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{item.santri.nama}</div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                            {item.santri.nis} • {item.santri.kelas?.nama || 'Tanpa Kelas'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnlink(item.id, item.santri.nama)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                    title="Hapus Koneksi"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                            <UserPlus size={32} className="text-gray-300" />
                                        </div>
                                        <p className="font-medium text-gray-500">Belum ada santri</p>
                                        <p className="text-sm">Gunakan panel di samping untuk menambahkan.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Search & Add (5 cols) */}
                    <div className="md:col-span-5 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit sticky top-6">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Plus size={18} className="text-green-600" />
                                Hubungkan Santri Baru
                            </h3>

                            <form onSubmit={handleSearch} className="mb-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ketik nama santri..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition shadow-sm bg-gray-50 focus:bg-white"
                                        value={searchQuery}
                                        onChange={e => {
                                            setSearchQuery(e.target.value)
                                            if (e.target.value === '') setSearchResult([])
                                        }}
                                    />
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                </div>
                                <p className="text-xs text-gray-400 mt-2 ml-1">Tekan Enter untuk mencari</p>
                            </form>

                            <div className="space-y-3">
                                {searching ? (
                                    <div className="text-center py-4 text-gray-500 text-sm">Mencari data...</div>
                                ) : searchResult.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Hasil Pencarian</p>
                                        {searchResult.map(santri => (
                                            <div key={santri.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/30 transition-all duration-200">
                                                <div>
                                                    <div className="font-medium text-gray-900">{santri.nama}</div>
                                                    <div className="text-xs text-gray-500">{santri.nis} • {santri.kelas?.nama}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleLink(santri.id)}
                                                    className="p-2 bg-green-100 text-green-700 hover:bg-green-600 hover:text-white rounded-lg transition shadow-sm"
                                                    title="Tambahkan"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery && (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        <p className="text-sm text-gray-500">
                                            {searchQuery.length < 3 ? 'Ketik minimal 3 huruf' : 'Tidak ditemukan santri dengan nama tersebut'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OTALinking
