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

            {/* Single Santri Header if only 1 */}
            {selectedSantri && santriList.length === 1 && (
                <div className="mb-2">
                    <SantriCard santri={selectedSantri} />
                </div>
            )}

            {/* Semester List */}
            {selectedSantri && (
                <Card title="Pilih Semester">
                    <div className="divide-y divide-gray-100">
                        {semesters.map(sem => (
                            <button
                                key={sem.id}
                                onClick={() => openRaport(sem.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sem.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{sem.nama} {sem.tahun_ajaran}</h4>
                                        <p className="text-xs text-gray-500">{sem.is_active ? 'Semester Aktif' : 'Arsip'}</p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-gray-400" />
                            </button>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}

export default RaportWaliPage
