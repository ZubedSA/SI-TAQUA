import { useState, useEffect } from 'react'
import { FileText, Calendar, ChevronRight, User } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/layout/PageHeader'
import Card from '../../../components/ui/Card'
import SantriCard from '../components/SantriCard'

const RaportWaliPage = () => {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [santriList, setSantriList] = useState([])
    const [selectedSantri, setSelectedSantri] = useState(null)
    const [semesters, setSemesters] = useState([])

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user])

    const fetchData = async () => {
        try {
            // 1. Fetch Santri
            const { data: santri, error: santriError } = await supabase
                .from('santri')
                .select(`*, kelas:kelas_id(nama), halaqoh:halaqoh_id(nama)`)
                .eq('wali_id', user.id)
                .order('nama')

            if (santriError) throw santriError
            setSantriList(santri || [])
            if (santri?.length > 0) setSelectedSantri(santri[0])

            // 2. Fetch Semesters
            const { data: sem, error: semError } = await supabase
                .from('semester')
                .select('*')
                .order('tahun_ajaran', { ascending: false })

            if (semError) throw semError
            setSemesters(sem || [])

        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const openRaport = (semesterId) => {
        if (!selectedSantri) return
        window.open(`/raport/cetak/${selectedSantri.id}/${semesterId}`, '_blank')
    }

    if (loading) return <div className="p-8 text-center">Memuat data...</div>

    return (
        <div className="space-y-6">
            <PageHeader
                title="Raport Akademik"
                description="Lihat dan cetak raport hasil belajar santri"
                icon={FileText}
                backUrl="/wali/laporan"
            />

            {/* Premium Santri Selector (Horizontal Scroll) */}
            {santriList.length > 1 && (
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
            )}

            {/* Single Santri Header if only 1 */}
            {selectedSantri && santriList.length === 1 && (
                <div className="mb-2">
                    <SantriCard santri={selectedSantri} />
                </div>
            )}

            {/* Semester List with Premium Cards */}
            {selectedSantri && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">E-Raport Semester</h3>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 italic">
                            Siap Cetak PDF
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {semesters.map(sem => (
                            <button
                                key={sem.id}
                                onClick={() => openRaport(sem.id)}
                                className="glass-card flex items-center justify-between p-6 bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white/50 shadow-xl group transition-all hover:scale-[1.01] active:scale-[0.98] text-left overflow-hidden relative"
                            >
                                <div className="relative z-10 flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${sem.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                        <Calendar size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-gray-900 uppercase leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                                            {sem.nama}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sem.tahun_ajaran}</span>
                                            {sem.is_active && (
                                                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg tracking-widest shadow-sm shadow-emerald-200">Aktif</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="relative z-10 flex flex-col items-end gap-1">
                                    <div className="p-2 rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                        <FileText size={20} />
                                    </div>
                                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Buka Raport</span>
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default RaportWaliPage
