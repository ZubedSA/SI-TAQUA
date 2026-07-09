import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { CheckCircle, XCircle, Info, RefreshCw, Filter, Calendar } from 'lucide-react'
import { format } from 'date-fns'

const KelolaIzinPage = () => {
    const { isAdmin, isAdminAbsensi, isAdminAkademik } = useAuth()
    const showToast = useToast()
    
    const [activeTab, setActiveTab] = useState('izin') // 'izin' or 'pergantian'
    const [izinList, setIzinList] = useState([])
    const [pergantianList, setPergantianList] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)

    // Modal state for Rejection Note
    const [showModal, setShowModal] = useState(false)
    const [modalData, setModalData] = useState(null) // { id, type, action: 'Disetujui' | 'Ditolak' }
    const [adminNote, setAdminNote] = useState('')

    useEffect(() => {
        if (isAdmin() || isAdminAbsensi() || isAdminAkademik()) {
            fetchData()
        } else {
            showToast.error('Akses ditolak.')
            setIsLoading(false)
        }
    }, [])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [izinRes, gantiRes] = await Promise.all([
                supabase.from('izin_guru').select('*, guru:guru_id(nama)').order('created_at', { ascending: false }),
                supabase.from('pergantian_jadwal').select('*, guru_pemohon:guru_pemohon_id(nama), jadwal_asli:jadwal_asli_id(hari, jam_ke, kelas(nama), mapel(nama)), guru_pengganti:guru_pengganti_id(nama)').order('created_at', { ascending: false })
            ])
            
            if (izinRes.error) throw izinRes.error
            if (gantiRes.error) throw gantiRes.error
            
            setIzinList(izinRes.data || [])
            setPergantianList(gantiRes.data || [])
        } catch (err) {
            console.error(err)
            showToast.error('Gagal memuat data')
        } finally {
            setIsLoading(false)
        }
    }

    const openActionModal = (id, type, action) => {
        setModalData({ id, type, action })
        setAdminNote('')
        setShowModal(true)
    }

    const handleAction = async () => {
        if (!modalData) return
        setProcessingId(modalData.id)
        setShowModal(false)
        
        try {
            const tableName = modalData.type === 'izin' ? 'izin_guru' : 'pergantian_jadwal'
            const payload = {
                status: modalData.action,
                catatan_admin: adminNote || null
            }

            const { error } = await supabase.from(tableName).update(payload).eq('id', modalData.id)
            if (error) throw error

            showToast.success(`Pengajuan berhasil ${modalData.action.toLowerCase()}`)
            fetchData()
        } catch (err) {
            showToast.error(`Gagal memproses: ${err.message}`)
        } finally {
            setProcessingId(null)
            setModalData(null)
            setAdminNote('')
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Disetujui': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">Disetujui</span>
            case 'Ditolak': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">Ditolak</span>
            default: return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">{status}</span>
        }
    }

    if (isLoading) {
        return <div className="min-h-[500px] flex items-center justify-center"><RefreshCw className="animate-spin text-emerald-500" size={32} /></div>
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-36 font-sans">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Kelola Izin & Jadwal Pengajar</h1>
                    <p className="text-sm text-gray-500 font-medium">Persetujuan pengajuan izin, ganti jam, dan guru pengganti.</p>
                </div>
                <button onClick={fetchData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-4">
                <div className="flex p-1.5 bg-gray-100/80 backdrop-blur-sm rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('izin')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'izin' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        Persetujuan Izin ({izinList.filter(i => i.status === 'Menunggu').length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('pergantian')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'pergantian' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        Persetujuan Pergantian ({pergantianList.filter(p => p.status === 'Menunggu').length})
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6">
                    {/* TAB IZIN */}
                    {activeTab === 'izin' && (
                        <div className="space-y-4">
                            {izinList.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">Tidak ada pengajuan izin.</p>
                            ) : (
                                izinList.map(item => (
                                    <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center group hover:border-emerald-200 transition-all">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-black text-gray-900 text-lg">{item.guru?.nama}</h3>
                                                {getStatusBadge(item.status)}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-gray-50 text-gray-700 font-black text-[10px] uppercase tracking-widest rounded-xl border border-gray-100">{item.jenis_izin}</span>
                                                <span className="text-xs font-bold text-gray-500 tracking-wide">{format(new Date(item.tanggal_mulai), 'dd MMM yyyy')} - {format(new Date(item.tanggal_selesai), 'dd MMM yyyy')}</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 leading-relaxed italic">"{item.keterangan}"</p>
                                            {item.catatan_admin && (
                                                <div className="mt-2 bg-amber-50/80 backdrop-blur-sm p-3 rounded-2xl border border-amber-100 flex items-start gap-3">
                                                    <Info size={16} className="text-amber-500 mt-0.5 shrink-0"/> 
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-800/60 block mb-0.5">Catatan Admin</span>
                                                        <span className="text-xs font-bold text-amber-900">{item.catatan_admin}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {item.status === 'Menunggu' && (
                                            <div className="flex gap-2">
                                                <button 
                                                    disabled={processingId === item.id}
                                                    onClick={() => openActionModal(item.id, 'izin', 'Ditolak')}
                                                    className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                                >
                                                    Tolak
                                                </button>
                                                <button 
                                                    disabled={processingId === item.id}
                                                    onClick={() => openActionModal(item.id, 'izin', 'Disetujui')}
                                                    className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                                                >
                                                    Setujui
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* TAB PERGANTIAN */}
                    {activeTab === 'pergantian' && (
                        <div className="space-y-4">
                            {pergantianList.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">Tidak ada usulan pergantian jadwal.</p>
                            ) : (
                                pergantianList.map(item => (
                                    <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col md:flex-row gap-6 justify-between items-start group hover:border-indigo-200 transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                                        <div className="space-y-4 flex-1 z-10 w-full md:w-auto">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-black text-gray-900 text-lg">{item.guru_pemohon?.nama}</h3>
                                                <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl text-white shadow-md ${item.jenis === 'Ganti Jam' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-500 shadow-indigo-200'}`}>{item.jenis}</span>
                                                {getStatusBadge(item.status)}
                                            </div>
                                            
                                            <div className="text-sm p-5 bg-gray-50/80 backdrop-blur-sm rounded-2xl border border-gray-100 space-y-3">
                                                <div className="flex items-center gap-3 text-gray-600">
                                                    <Calendar size={18} className="text-gray-400 shrink-0" />
                                                    <p className="text-xs">
                                                        <span className="font-black text-gray-900 uppercase tracking-widest text-[10px] block mb-1">Jadwal Asli ({format(new Date(item.tanggal_absen), 'dd MMM yyyy')})</span>
                                                        {item.jadwal_asli?.hari}, Jam ke-{item.jadwal_asli?.jam_ke} | {item.jadwal_asli?.kelas?.nama} | <span className="font-bold">{item.jadwal_asli?.mapel?.nama || 'Halaqoh'}</span>
                                                    </p>
                                                </div>
                                                
                                                {item.jenis === 'Guru Pengganti' && (
                                                    <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100 mt-2">
                                                        <span className="font-black text-[10px] uppercase tracking-widest">Usulan Pengganti:</span> <span className="font-bold text-sm">{item.guru_pengganti?.nama}</span>
                                                    </div>
                                                )}
                                                
                                                {item.jenis === 'Ganti Jam' && item.tanggal_pengganti && (
                                                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100 mt-2">
                                                        <span className="font-black text-[10px] uppercase tracking-widest">Ganti Pada:</span> <span className="font-bold text-sm">{format(new Date(item.tanggal_pengganti), 'dd MMM yyyy')}</span> (Jam ke-{item.jam_ke_pengganti}, {item.jam_mulai_pengganti} - {item.jam_selesai_pengganti})
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <p className="text-sm italic text-gray-700 leading-relaxed font-medium">"{item.alasan}"</p>
                                            {item.catatan_admin && (
                                                <div className="mt-2 bg-amber-50/80 backdrop-blur-sm p-3 rounded-2xl border border-amber-100 flex items-start gap-3">
                                                    <Info size={16} className="text-amber-500 mt-0.5 shrink-0"/> 
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-800/60 block mb-0.5">Catatan Admin</span>
                                                        <span className="text-xs font-bold text-amber-900">{item.catatan_admin}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {item.status === 'Menunggu' && (
                                            <div className="flex gap-2 shrink-0 z-10 self-end md:self-start mt-4 md:mt-0">
                                                <button 
                                                    disabled={processingId === item.id}
                                                    onClick={() => openActionModal(item.id, 'pergantian', 'Ditolak')}
                                                    className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 hover:scale-105 rounded-xl transition-all"
                                                >
                                                    Tolak
                                                </button>
                                                <button 
                                                    disabled={processingId === item.id}
                                                    onClick={() => openActionModal(item.id, 'pergantian', 'Disetujui')}
                                                    className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 hover:scale-105 rounded-xl transition-all shadow-md shadow-emerald-200"
                                                >
                                                    Setujui
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Konfirmasi */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
                        <div className={`p-6 border-b ${modalData.action === 'Disetujui' ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
                            <h3 className={`text-xl font-black ${modalData.action === 'Disetujui' ? 'text-emerald-800' : 'text-red-800'}`}>
                                Konfirmasi {modalData.action}
                            </h3>
                            <p className={`text-sm mt-1 ${modalData.action === 'Disetujui' ? 'text-emerald-600' : 'text-red-600'}`}>
                                Anda akan {modalData.action.toLowerCase()} pengajuan ini.
                            </p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tambahkan Catatan (Opsional)</label>
                            <textarea 
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                                rows="3"
                                placeholder="Tulis pesan untuk guru..."
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                            ></textarea>
                            
                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleAction}
                                    className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold transition-colors ${modalData.action === 'Disetujui' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    Konfirmasi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default KelolaIzinPage
