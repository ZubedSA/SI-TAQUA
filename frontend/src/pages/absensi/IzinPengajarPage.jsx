import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { 
    Calendar, Clock, UserCheck, FileText, ArrowLeft, 
    Plus, RefreshCw, CheckCircle, XCircle, Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

const IzinPengajarPage = () => {
    const navigate = useNavigate()
    const { user, userProfile } = useAuth()
    const showToast = useToast()
    
    const [guruId, setGuruId] = useState(null)
    const [activeTab, setActiveTab] = useState('izin') // 'izin' or 'pergantian'
    
    // Data State
    const [izinList, setIzinList] = useState([])
    const [pergantianList, setPergantianList] = useState([])
    const [jadwalList, setJadwalList] = useState([])
    const [guruList, setGuruList] = useState([])
    
    // Form State (Izin)
    const [showIzinForm, setShowIzinForm] = useState(false)
    const [izinForm, setIzinForm] = useState({
        tanggal_mulai: '',
        tanggal_selesai: '',
        jenis_izin: 'Sakit',
        keterangan: ''
    })
    
    // Form State (Pergantian)
    const [showPergantianForm, setShowPergantianForm] = useState(false)
    const [pergantianForm, setPergantianForm] = useState({
        jenis: 'Guru Pengganti',
        jadwal_asli_id: '',
        tanggal_absen: '',
        guru_pengganti_id: '',
        jadwal_tujuan_id: '',
        tanggal_pengganti: '',
        jam_ke_pengganti: '',
        jam_mulai_pengganti: '',
        jam_selesai_pengganti: '',
        alasan: ''
    })

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // State untuk jadwal guru pengganti
    const [selectedGuruJadwal, setSelectedGuruJadwal] = useState([])
    const [loadingGuruJadwal, setLoadingGuruJadwal] = useState(false)

    useEffect(() => {
        fetchInitialData()
    }, [user])

    useEffect(() => {
        const fetchJadwalPengganti = async () => {
            if (!pergantianForm.guru_pengganti_id) {
                setSelectedGuruJadwal([])
                return
            }
            setLoadingGuruJadwal(true)
            try {
                const { data } = await supabase
                    .from('jadwal_pelajaran')
                    .select('*, kelas(nama), mapel(nama), halaqoh(nama)')
                    .eq('guru_id', pergantianForm.guru_pengganti_id)
                    .order('hari')
                    .order('jam_ke')
                setSelectedGuruJadwal(data || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoadingGuruJadwal(false)
            }
        }
        fetchJadwalPengganti()
    }, [pergantianForm.guru_pengganti_id])

    const fetchInitialData = async () => {
        if (!user?.email) return
        setIsLoading(true)
        try {
            // Get Guru ID
            let currentGuruId = userProfile?.guru_id
            if (!currentGuruId) {
                const { data: gData } = await supabase.from('guru').select('id').eq('email', user.email).maybeSingle()
                if (gData) currentGuruId = gData.id
            }
            if (!currentGuruId) {
                showToast.error('Akses ditolak: Profil guru tidak ditemukan.')
                return
            }
            setGuruId(currentGuruId)

            // Fetch Reference Data
            const [jRes, gRes] = await Promise.all([
                supabase.from('jadwal_pelajaran').select('*, kelas(nama), mapel(nama)').eq('guru_id', currentGuruId),
                supabase.from('guru').select('id, nama').eq('status', 'Aktif').neq('id', currentGuruId)
            ])
            if (jRes.data) setJadwalList(jRes.data)
            if (gRes.data) setGuruList(gRes.data)

            // Fetch History Data
            await fetchHistory(currentGuruId)
            
        } catch (err) {
            console.error(err)
            showToast.error('Gagal memuat data')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchHistory = async (id) => {
        const [izinRes, gantiRes] = await Promise.all([
            supabase.from('izin_guru').select('*').eq('guru_id', id).order('created_at', { ascending: false }),
            supabase.from('pergantian_jadwal').select('*, jadwal_asli:jadwal_asli_id(hari, jam_ke, kelas(nama), mapel(nama)), guru_pengganti:guru_pengganti_id(nama)').eq('guru_pemohon_id', id).order('created_at', { ascending: false })
        ])
        if (izinRes.data) setIzinList(izinRes.data)
        if (gantiRes.data) setPergantianList(gantiRes.data)
    }

    const handleSubmitIzin = async (e) => {
        e.preventDefault()
        if (!guruId) return
        setIsSaving(true)
        try {
            const { error } = await supabase.from('izin_guru').insert({
                guru_id: guruId,
                ...izinForm
            })
            if (error) throw error
            
            showToast.success('Pengajuan izin berhasil dikirim')
            setShowIzinForm(false)
            setIzinForm({ tanggal_mulai: '', tanggal_selesai: '', jenis_izin: 'Sakit', keterangan: '' })
            fetchHistory(guruId)
        } catch (err) {
            showToast.error('Gagal mengajukan izin: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleSubmitPergantian = async (e) => {
        e.preventDefault()
        if (!guruId) return
        setIsSaving(true)
        try {
            const payload = {
                guru_pemohon_id: guruId,
                jenis: pergantianForm.jenis,
                jadwal_asli_id: pergantianForm.jadwal_asli_id,
                tanggal_absen: pergantianForm.tanggal_absen,
                alasan: pergantianForm.alasan,
                status: 'Menunggu'
            }

            if (pergantianForm.jenis === 'Guru Pengganti') {
                payload.guru_pengganti_id = pergantianForm.guru_pengganti_id
            } else if (pergantianForm.jenis === 'Ganti Jam') {
                payload.tanggal_pengganti = pergantianForm.tanggal_pengganti
                payload.jam_ke_pengganti = parseInt(pergantianForm.jam_ke_pengganti)
                payload.jam_mulai_pengganti = pergantianForm.jam_mulai_pengganti
                payload.jam_selesai_pengganti = pergantianForm.jam_selesai_pengganti
            } else if (pergantianForm.jenis === 'Tukar Jam') {
                payload.guru_pengganti_id = pergantianForm.guru_pengganti_id
                payload.jadwal_tujuan_id = pergantianForm.jadwal_tujuan_id
                payload.tanggal_pengganti = pergantianForm.tanggal_pengganti
                
                if (!payload.jadwal_tujuan_id) {
                    showToast.error('Pilih jadwal guru pengganti yang akan ditukar!')
                    setIsSaving(false)
                    return
                }
            }

            const { error } = await supabase.from('pergantian_jadwal').insert(payload)
            if (error) throw error

            showToast.success('Pengajuan pergantian jadwal berhasil dikirim')
            setShowPergantianForm(false)
            fetchHistory(guruId)
        } catch (err) {
            showToast.error('Gagal mengajukan pergantian: ' + err.message)
        } finally {
            setIsSaving(false)
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
        return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-emerald-500" size={32} /></div>
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-36 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button onClick={() => navigate('/absensi/home')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900">Pengajuan Izin & Jadwal</h1>
                        <p className="text-xs text-gray-500 font-medium">Manajemen ketidakhadiran pengajar</p>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="max-w-4xl mx-auto px-4 pb-4">
                    <div className="flex p-1.5 bg-gray-100/80 backdrop-blur-sm rounded-2xl">
                        <button 
                            onClick={() => setActiveTab('izin')}
                            className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'izin' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                        >
                            Izin Tidak Mengajar
                        </button>
                        <button 
                            onClick={() => setActiveTab('pergantian')}
                            className={`flex-1 py-3 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'pergantian' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                        >
                            Pergantian Jadwal
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                
                {/* === TAB IZIN === */}
                {activeTab === 'izin' && (
                    <div className="space-y-6">
                        {!showIzinForm ? (
                            <div className="flex justify-between items-center">
                                <h2 className="text-base font-bold text-gray-900">Riwayat Izin</h2>
                                <button 
                                    onClick={() => setShowIzinForm(true)}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
                                >
                                    <Plus size={16} /> Buat Pengajuan
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-base font-bold text-gray-900">Form Pengajuan Izin</h2>
                                    <button onClick={() => setShowIzinForm(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20}/></button>
                                </div>
                                <form onSubmit={handleSubmitIzin} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Mulai</label>
                                            <input type="date" required value={izinForm.tanggal_mulai} onChange={e => setIzinForm({...izinForm, tanggal_mulai: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Selesai</label>
                                            <input type="date" required value={izinForm.tanggal_selesai} onChange={e => setIzinForm({...izinForm, tanggal_selesai: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Izin</label>
                                        <select value={izinForm.jenis_izin} onChange={e => setIzinForm({...izinForm, jenis_izin: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                                            <option value="Sakit">Sakit</option>
                                            <option value="Izin">Izin (Keperluan Pribadi/Keluarga)</option>
                                            <option value="Dinas">Dinas Luar</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Keterangan / Alasan</label>
                                        <textarea required value={izinForm.keterangan} onChange={e => setIzinForm({...izinForm, keterangan: e.target.value})} rows="3" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"></textarea>
                                    </div>
                                    <div className="pt-2 flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowIzinForm(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
                                        <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isSaving ? 'Menyimpan...' : 'Kirim Pengajuan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {izinList.length === 0 ? (
                                <div className="text-center py-16 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-xl shadow-gray-200/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="w-24 h-24 mx-auto bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-500 relative z-10">
                                        <FileText size={48} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 mb-2 relative z-10">Belum Ada Riwayat</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest relative z-10">Daftar izin Anda masih kosong</p>
                                </div>
                            ) : (
                                izinList.map(item => (
                                    <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 hover:border-emerald-200 hover:shadow-emerald-500/10 transition-all flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                                        <div className="space-y-3 z-10">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-900 font-black text-[10px] border border-gray-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors uppercase tracking-widest">{item.jenis_izin}</div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                                <span className="text-xs font-bold text-gray-500 tracking-wide">{format(new Date(item.tanggal_mulai), 'dd MMM yyyy')} - {format(new Date(item.tanggal_selesai), 'dd MMM yyyy')}</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 leading-relaxed">{item.keterangan}</p>
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
                                        <div>{getStatusBadge(item.status)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* === TAB PERGANTIAN === */}
                {activeTab === 'pergantian' && (
                    <div className="space-y-6">
                        {!showPergantianForm ? (
                            <div className="flex justify-between items-center">
                                <h2 className="text-base font-bold text-gray-900">Riwayat Pergantian Jadwal</h2>
                                <button 
                                    onClick={() => setShowPergantianForm(true)}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
                                >
                                    <Plus size={16} /> Ajukan Pergantian
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-base font-bold text-gray-900">Form Pergantian Jadwal</h2>
                                    <button onClick={() => setShowPergantianForm(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20}/></button>
                                </div>
                                <form onSubmit={handleSubmitPergantian} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Jadwal yang Ditinggalkan</label>
                                        <select required value={pergantianForm.jadwal_asli_id} onChange={e => setPergantianForm({...pergantianForm, jadwal_asli_id: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                                            <option value="">-- Pilih Jadwal Anda --</option>
                                            {jadwalList.map(j => (
                                                <option key={j.id} value={j.id}>
                                                    {j.hari}, Jam Ke-{j.jam_ke} | Kelas {j.kelas?.nama} | {j.mapel?.nama || 'Halaqoh'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Absen</label>
                                            <input type="date" required value={pergantianForm.tanggal_absen} onChange={e => setPergantianForm({...pergantianForm, tanggal_absen: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Opsi Penanganan</label>
                                            <select value={pergantianForm.jenis} onChange={e => setPergantianForm({...pergantianForm, jenis: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                                                <option value="Guru Pengganti">Cari Guru Pengganti (Inval)</option>
                                                <option value="Ganti Jam">Ganti Jam (Make-up Class)</option>
                                                <option value="Tukar Jam">Tukar Jam (Swap)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {(pergantianForm.jenis === 'Guru Pengganti' || pergantianForm.jenis === 'Tukar Jam') && (
                                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                                            <label className="block text-xs font-bold text-indigo-900">
                                                {pergantianForm.jenis === 'Tukar Jam' ? 'Pilih Guru untuk Bertukar' : 'Pilih Guru Pengganti'}
                                            </label>
                                            <select required value={pergantianForm.guru_pengganti_id} onChange={e => setPergantianForm({...pergantianForm, guru_pengganti_id: e.target.value, jadwal_tujuan_id: ''})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none">
                                                <option value="">-- Pilih Guru --</option>
                                                {guruList.map(g => (
                                                    <option key={g.id} value={g.id}>{g.nama}</option>
                                                ))}
                                            </select>
                                            
                                            {/* Preview Jadwal Guru Pengganti */}
                                            {pergantianForm.guru_pengganti_id && (
                                                <div className="mt-3 bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                                                    <div className="px-3 py-2 bg-indigo-50/50 border-b border-indigo-100">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                                            {pergantianForm.jenis === 'Tukar Jam' ? 'Pilih Jadwal yang Akan Anda Ambil:' : 'Jadwal Mengajar Guru Terpilih:'}
                                                        </h4>
                                                    </div>
                                                    <div className="p-3">
                                                        {loadingGuruJadwal ? (
                                                            <div className="text-center py-4 text-xs font-bold text-gray-400">Memuat jadwal...</div>
                                                        ) : selectedGuruJadwal.length === 0 ? (
                                                            <div className="text-center py-4 text-xs font-bold text-gray-400 italic">Guru ini tidak memiliki jadwal terdaftar.</div>
                                                        ) : (
                                                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                                                {selectedGuruJadwal.map(jadwal => {
                                                                    const isSelected = pergantianForm.jadwal_tujuan_id === jadwal.id;
                                                                    return (
                                                                        <div 
                                                                            key={jadwal.id} 
                                                                            onClick={() => {
                                                                                if (pergantianForm.jenis === 'Tukar Jam') {
                                                                                    setPergantianForm({...pergantianForm, jadwal_tujuan_id: jadwal.id})
                                                                                }
                                                                            }}
                                                                            className={`flex justify-between items-center transition-colors p-2.5 rounded-lg border ${
                                                                                pergantianForm.jenis === 'Tukar Jam' ? 'cursor-pointer hover:bg-indigo-50/50' : ''
                                                                            } ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-[0_0_0_1px_rgba(99,102,241,1)]' : 'bg-gray-50 border-gray-100'}`}
                                                                        >
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {pergantianForm.jenis === 'Tukar Jam' && (
                                                                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                                                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                                                                        </div>
                                                                                    )}
                                                                                    <div className={`font-bold text-xs ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>
                                                                                        {jadwal.hari}, Jam Ke-{jadwal.jam_ke}
                                                                                    </div>
                                                                                </div>
                                                                                <div className={`text-[10px] font-medium mt-0.5 ${pergantianForm.jenis === 'Tukar Jam' ? 'ml-5' : ''} ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                                                                                    {jadwal.mapel?.nama || 'Halaqoh'} | {jadwal.kelas?.nama || jadwal.halaqoh?.nama}
                                                                                </div>
                                                                            </div>
                                                                            <div className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${isSelected ? 'bg-indigo-200/50 text-indigo-800' : 'bg-indigo-100/50 text-indigo-700'}`}>
                                                                                {jadwal.jam_mulai.slice(0,5)} - {jadwal.jam_selesai.slice(0,5)}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {pergantianForm.jenis === 'Tukar Jam' && pergantianForm.jadwal_tujuan_id && (
                                                <div className="mt-4 animate-fade-in">
                                                    <label className="block text-xs font-bold text-indigo-900 mb-1">Tanggal Anda Menggantikan</label>
                                                    <input 
                                                        type="date" 
                                                        required 
                                                        value={pergantianForm.tanggal_pengganti} 
                                                        onChange={e => setPergantianForm({...pergantianForm, tanggal_pengganti: e.target.value})} 
                                                        className="w-full border border-indigo-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                                    />
                                                    <p className="text-[10px] text-indigo-600 mt-1">Pilih tanggal aktual di mana Anda akan mengajar pada jadwal tersebut.</p>
                                                </div>
                                            )}
                                            
                                            <p className="text-[11px] text-indigo-600 font-medium">Sistem akan meminta persetujuan Admin terkait usulan {pergantianForm.jenis === 'Tukar Jam' ? 'tukar jadwal' : 'guru pengganti'} ini.</p>
                                        </div>
                                    )}

                                    {pergantianForm.jenis === 'Ganti Jam' && (
                                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-emerald-900 mb-1">Tanggal Pengganti</label>
                                                <input type="date" required value={pergantianForm.tanggal_pengganti} onChange={e => setPergantianForm({...pergantianForm, tanggal_pengganti: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-emerald-900 mb-1 uppercase">Jam Ke</label>
                                                    <input type="number" required min="1" max="15" value={pergantianForm.jam_ke_pengganti} onChange={e => setPergantianForm({...pergantianForm, jam_ke_pengganti: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center outline-none" placeholder="1"/>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-emerald-900 mb-1 uppercase">Mulai</label>
                                                    <input type="time" required value={pergantianForm.jam_mulai_pengganti} onChange={e => setPergantianForm({...pergantianForm, jam_mulai_pengganti: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-emerald-900 mb-1 uppercase">Selesai</label>
                                                    <input type="time" required value={pergantianForm.jam_selesai_pengganti} onChange={e => setPergantianForm({...pergantianForm, jam_selesai_pengganti: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Pesan / Alasan</label>
                                        <textarea required value={pergantianForm.alasan} onChange={e => setPergantianForm({...pergantianForm, alasan: e.target.value})} rows="2" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"></textarea>
                                    </div>
                                    <div className="pt-2 flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowPergantianForm(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Batal</button>
                                        <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isSaving ? 'Menyimpan...' : 'Kirim Usulan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {pergantianList.length === 0 ? (
                                <div className="text-center py-16 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-xl shadow-gray-200/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="w-24 h-24 mx-auto bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-500 relative z-10">
                                        <Calendar size={48} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-black text-gray-900 mb-2 relative z-10">Belum Ada Riwayat</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest relative z-10">Daftar usulan pergantian kosong</p>
                                </div>
                            ) : (
                                pergantianList.map(item => (
                                    <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 hover:border-indigo-200 hover:shadow-indigo-500/10 transition-all flex flex-col sm:flex-row gap-5 justify-between items-start group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
                                        <div className="space-y-4 z-10 w-full sm:w-auto flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl text-white ${item.jenis === 'Ganti Jam' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-500 shadow-indigo-200'} shadow-md`}>{item.jenis}</span>
                                                <span className="text-xs font-bold text-gray-500 tracking-wide">{format(new Date(item.tanggal_absen), 'dd MMM yyyy')}</span>
                                            </div>
                                            
                                            <div className="p-4 bg-gray-50/80 backdrop-blur-sm rounded-2xl border border-gray-100 space-y-2">
                                                <p className="text-xs text-gray-600"><span className="font-black text-gray-900 uppercase tracking-widest text-[10px] block mb-1">Jadwal Asli</span> {item.jadwal_asli?.hari}, Jam ke-{item.jadwal_asli?.jam_ke} | {item.jadwal_asli?.kelas?.nama} | <span className="font-bold">{item.jadwal_asli?.mapel?.nama || 'Halaqoh'}</span></p>
                                                
                                                {item.jenis === 'Guru Pengganti' && (
                                                    <p className="text-xs text-gray-600"><span className="font-black text-indigo-700 uppercase tracking-widest text-[10px] block mb-1">Guru Pengganti</span> <span className="font-bold">{item.guru_pengganti?.nama}</span></p>
                                                )}
                                                
                                                {item.jenis === 'Ganti Jam' && item.tanggal_pengganti && (
                                                    <p className="text-xs text-gray-600"><span className="font-black text-emerald-700 uppercase tracking-widest text-[10px] block mb-1">Waktu Ganti</span> <span className="font-bold">{format(new Date(item.tanggal_pengganti), 'dd MMM yyyy')}</span> (Jam ke-{item.jam_ke_pengganti}, {item.jam_mulai_pengganti} - {item.jam_selesai_pengganti})</p>
                                                )}
                                            </div>
                                            
                                            <p className="text-sm font-medium text-gray-700 leading-relaxed italic">"{item.alasan}"</p>

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
                                        <div className="self-end sm:self-start z-10">{getStatusBadge(item.status)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default IzinPengajarPage
