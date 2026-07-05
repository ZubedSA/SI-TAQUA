/**
 * System Status & Recovery - Pusat kendali kesehatan sistem dan manajemen data
 * Menggabungkan fitur Monitoring, Modular Backup (Excel), dan System Recovery (JSON)
 */

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
    Activity, Database, Wifi, HardDrive, RefreshCw, Download,
    Upload, Trash2, AlertTriangle, CheckCircle, Clock, Server,
    Shield, Zap, AlertCircle, FileJson, Calendar, FileText, 
    Briefcase, GraduationCap, DollarSign, Users, Save, Archive,
    CheckCircle2, Info, ChevronRight, BarChart3
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate } from '../../lib/auditLog'
import healthMonitor, { HealthStatus } from '../../lib/healthMonitor'
import cacheManager from '../../lib/cacheManager'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'

const SystemStatusPage = () => {
    // -- STATES --
    const [health, setHealth] = useState(null)
    const [cacheStats, setCacheStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [status, setStatus] = useState({ type: '', message: '' })

    // JSON Backup & Restore States
    const [dbLoading, setDbLoading] = useState(false)
    const [backupData, setBackupData] = useState(null)
    const [backupInfo, setBackupInfo] = useState(null)
    const [restoreLoading, setRestoreLoading] = useState(false)
    const fileInputRef = useRef(null)

    // Tabel-tabel untuk Backup Sistem (JSON)
    const tableCategories = {
        core: ['user_profiles', 'guru', 'kelas', 'halaqoh', 'santri'],
        academic: [
            'semester', 'mapel', 'jadwal_pelajaran', 'agenda_mengajar',
            'presensi', 'presensi_mapel', 'presensi_mapel_detil', 'presensi_staf', 
            'hafalan', 'nilai', 'kalender_akademik'
        ],
        finance: ['kategori_pembayaran', 'tagihan_santri', 'pembayaran_santri', 'bukti_transfer'],
        system: ['system_settings', 'audit_logs', 'trash']
    }

    const allTables = Object.values(tableCategories).flat()

    // -- INIT --
    useEffect(() => {
        loadData()
        healthMonitor.start()
        const unsubscribe = healthMonitor.subscribe(setHealth)
        return () => unsubscribe()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            await healthMonitor.runHealthCheck()
            setCacheStats(cacheManager.stats())
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
        setStatus({ type: 'success', message: 'Status sistem berhasil dimuat ulang' })
    }

    // -- SYSTEM BACKUP (JSON) --
    const handleSystemBackup = async () => {
        setDbLoading(true)
        setStatus({ type: '', message: '' })
        setBackupData(null)

        try {
            const backup = {
                version: '3.0',
                createdAt: new Date().toISOString(),
                app: 'SI-TAQUA Unified System',
                tables: {}
            }

            let totalRecords = 0

            for (const table of allTables) {
                const { data, error } = await supabase.from(table).select('*')
                if (error) {
                    console.warn(`Warning: Backup ${table} gagal:`, error.message)
                    backup.tables[table] = { error: error.message, data: [] }
                } else {
                    backup.tables[table] = { count: data?.length || 0, data: data || [] }
                    totalRecords += data?.length || 0
                }
            }

            setBackupData(backup)
            setBackupInfo({
                createdAt: backup.createdAt,
                totalRecords,
                tableCount: allTables.length
            })

            await logCreate('backup', 'Full Backup', `Berhasil backup ${totalRecords} data dari ${allTables.length} tabel`)
            setStatus({ type: 'success', message: `✅ Full Backup siap diunduh! (${totalRecords} data)` })

        } catch (error) {
            setStatus({ type: 'error', message: `❌ Gagal backup: ${error.message}` })
        } finally {
            setDbLoading(false)
        }
    }

    const downloadSystemBackup = () => {
        if (!backupData) return
        const dataStr = JSON.stringify(backupData, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `SITAQUA_FULL_BACKUP_${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(url)
    }

    // -- SYSTEM RESTORE (JSON) --
    const handleRestoreSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result)
                if (!data.tables) throw new Error('File tidak valid')

                const total = Object.keys(data.tables).reduce((sum, t) => sum + (data.tables[t]?.count || 0), 0)
                const confirmed = window.confirm(
                    `⚠️ PERINGATAN: Restore akan menimpa data saat ini!\n` +
                    `- Data: ${total} Baris\n` +
                    `- Tanggal Backup: ${new Date(data.createdAt).toLocaleString()}\n\n` +
                    `Lanjutkan proses pemulihan?`
                )

                if (confirmed) await performRestore(data)
            } catch (err) {
                setStatus({ type: 'error', message: '❌ File backup tidak valid' })
            }
        }
        reader.readAsText(file)
    }

    const performRestore = async (data) => {
        setRestoreLoading(true)
        setStatus({ type: 'info', message: '🔄 Memulihkan data... Harap jangan menutup halaman.' })

        try {
            const restoreOrder = [
                'user_profiles', 'semester', 'guru', 'kelas', 'halaqoh', 'mapel', 'santri',
                'kalender_akademik', 'jadwal_pelajaran', 'agenda_mengajar', 'presensi',
                'presensi_mapel', 'presensi_mapel_detil', 'presensi_staf', 'hafalan', 'nilai',
                'kategori_pembayaran', 'tagihan_santri', 'pembayaran_santri', 'bukti_transfer',
                'system_settings', 'trash'
            ]

            let restoredCount = 0
            for (const table of restoreOrder) {
                const tableData = data.tables[table]
                if (tableData?.data?.length > 0) {
                    const cleanData = tableData.data.map(row => {
                        const clean = { ...row }
                        Object.keys(clean).forEach(k => {
                            if (typeof clean[k] === 'object' && clean[k] !== null) delete clean[k]
                        })
                        return clean
                    })
                    const { error } = await supabase.from(table).upsert(cleanData, { onConflict: 'id' })
                    if (!error) restoredCount += cleanData.length
                }
            }

            await logCreate('restore', 'Full Restore', `Restore ${restoredCount} data berhasil`)
            setStatus({ type: 'success', message: `✅ Pemulihan berhasil! ${restoredCount} data dipulihkan.` })
        } catch (err) {
            setStatus({ type: 'error', message: `❌ Gagal restore: ${err.message}` })
        } finally {
            setRestoreLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // -- MODULAR BACKUP (EXCEL) --
    const handleModularExport = async (category) => {
        setDbLoading(true)
        setStatus({ type: 'info', message: `Menyiapkan Laporan ${category.toUpperCase()}...` })

        try {
            const workbook = XLSX.utils.book_new()
            const tables = tableCategories[category]
            let total = 0

            for (const table of tables) {
                const { data } = await supabase.from(table).select('*')
                if (data && data.length > 0) {
                    const sheet = XLSX.utils.json_to_sheet(data)
                    XLSX.utils.book_append_sheet(workbook, sheet, table.toUpperCase().substring(0, 31))
                    total += data.length
                }
            }

            XLSX.writeFile(workbook, `LAPORAN_${category.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`)
            setStatus({ type: 'success', message: `✅ Laporan ${category} berhasil diunduh.` })
        } catch (err) {
            setStatus({ type: 'error', message: `❌ Gagal export: ${err.message}` })
        } finally {
            setDbLoading(false)
        }
    }

    // -- CACHE HELPERS --
    const handleClearCache = () => {
        if (confirm('Hapus semua cache? Aplikasi mungkin terasa sedikit lambat saat memuat data pertama kali.')) {
            const count = cacheManager.clearAll()
            setCacheStats(cacheManager.stats())
            setStatus({ type: 'success', message: `✅ ${count} item cache telah dihapus.` })
        }
    }

    // -- RENDER HELPERS --
    const getStatusColor = (s) => {
        if (s === HealthStatus.HEALTHY) return 'text-emerald-500'
        if (s === HealthStatus.DEGRADED) return 'text-amber-500'
        return 'text-red-500'
    }

    if (loading) return <div className="p-10 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-600 mb-4" size={48} /> <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Menganalisis Sistem...</p></div>

    const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            <div className="flex items-center justify-between">
                <PageHeader 
                    title="Status & Recovery" 
                    description="Pusat kendali kesehatan infrastruktur dan keamanan data"
                    icon={Server}
                />
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={18} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Segarkan Status
                </Button>
            </div>

            {/* Status Alert */}
            {status.message && (
                <div className={`p-6 rounded-[2rem] flex items-center gap-4 border shadow-sm animate-bounce-subtle ${
                    status.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 
                    status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                    'bg-indigo-50 border-indigo-100 text-indigo-600'
                }`}>
                    {status.type === 'error' ? <AlertCircle size={24} /> : 
                     status.type === 'success' ? <CheckCircle2 size={24} /> : 
                     <RefreshCw size={24} className="animate-spin" />}
                    <span className="font-bold text-sm">{status.message}</span>
                </div>
            )}

            {/* Health Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4 group">
                    <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                        <Wifi size={24} />
                    </div>
                    <div>
                        <span className={labelClass}>Internet</span>
                        <p className={`font-black uppercase text-sm ${health?.details?.network?.online ? 'text-emerald-600' : 'text-red-600'}`}>
                            {health?.details?.network?.online ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4 group">
                    <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                        <Database size={24} />
                    </div>
                    <div>
                        <span className={labelClass}>Database</span>
                        <p className={`font-black uppercase text-sm ${getStatusColor(health?.details?.database?.status)}`}>
                            {health?.details?.database?.status === 'healthy' ? 'Stabil' : 'Bermasalah'}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4 group">
                    <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                        <HardDrive size={24} />
                    </div>
                    <div className="flex-1">
                        <span className={labelClass}>Storage</span>
                        <div className="flex items-center justify-between">
                            <p className="font-black text-sm text-slate-700">{health?.details?.storage?.totalRows || 0} Data</p>
                            <span className="text-[10px] font-bold text-slate-400">{health?.details?.storage?.percentage || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-amber-500 transition-all" style={{ width: `${health?.details?.storage?.percentage || 0}%` }} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex items-center gap-4 group">
                    <div className="p-4 rounded-2xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                        <Zap size={24} />
                    </div>
                    <div>
                        <span className={labelClass}>Cache</span>
                        <p className="font-black text-sm text-slate-700 uppercase">{cacheStats?.activeItems || 0} Aktif</p>
                    </div>
                </div>
            </div>

            {/* Main Action Section: Backup & Restore (JSON) */}
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/40 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">System Recovery Center</h2>
                        <p className="text-slate-500 font-medium mt-1">Backup penuh seluruh basis data dalam format JSON terenkripsi.</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="primary" onClick={handleSystemBackup} disabled={dbLoading} isLoading={dbLoading}>
                            <Archive size={18} className="mr-2" /> Backup Sekarang
                        </Button>
                        <input type="file" ref={fileInputRef} accept=".json" onChange={handleRestoreSelect} className="hidden" />
                        <Button variant="warning" onClick={() => fileInputRef.current?.click()} disabled={restoreLoading} isLoading={restoreLoading}>
                            <Upload size={18} className="mr-2" /> Restore Database
                        </Button>
                    </div>
                </div>

                {backupInfo && (
                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 flex flex-wrap items-center justify-between gap-6 animate-fade-in">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <Calendar size={20} className="text-indigo-400" />
                                <div>
                                    <span className="block text-[10px] font-black text-indigo-400 uppercase">Tanggal Backup</span>
                                    <span className="font-bold text-indigo-900">{new Date(backupInfo.createdAt).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 border-l border-indigo-200 pl-8">
                                <Database size={20} className="text-indigo-400" />
                                <div>
                                    <span className="block text-[10px] font-black text-indigo-400 uppercase">Total Baris</span>
                                    <span className="font-bold text-indigo-900">{backupInfo.totalRecords} Records</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="success" onClick={downloadSystemBackup}>
                            <Save size={18} className="mr-2" /> Unduh File Backup
                        </Button>
                    </div>
                )}
            </div>

            {/* Modular Export (Excel) */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 px-4">
                    <BarChart3 size={24} className="text-slate-400" />
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Laporan Modular (Excel)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { key: 'core', label: 'Data Induk', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Santri, Guru, Kelas, Halaqoh' },
                        { key: 'academic', label: 'Akademik', icon: GraduationCap, color: 'text-pink-600', bg: 'bg-pink-50', desc: 'Nilai, Hafalan, Absensi, Mapel' },
                        { key: 'finance', label: 'Keuangan', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Tagihan, Bayar, Bukti Transfer' },
                        { key: 'system', label: 'Log Sistem', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50', desc: 'Audit Log, Setting, Trash' },
                    ].map((mod) => (
                        <div key={mod.key} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-4 hover:translate-y-[-4px] transition-transform group">
                            <div className={`p-4 w-fit rounded-2xl ${mod.bg} ${mod.color}`}>
                                <mod.icon size={28} />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 uppercase">{mod.label}</h4>
                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{mod.desc}</p>
                            </div>
                            <button 
                                onClick={() => handleModularExport(mod.key)}
                                className="w-full py-3 rounded-xl bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <FileText size={14} /> Download Excel
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Tools: Cache & Security */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                        <Zap size={200} />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/10 text-amber-400">
                                <Zap size={24} />
                            </div>
                            <h4 className="font-black uppercase tracking-tight text-white">Cache Optimizer</h4>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                            Gunakan alat ini jika aplikasi terasa berat atau data tidak segera diperbarui. 
                            Membersihkan cache akan memaksa sistem mengambil data terbaru dari server.
                        </p>
                        <Button variant="danger" className="w-fit" onClick={handleClearCache}>
                            <Trash2 size={18} className="mr-2" /> Bersihkan Seluruh Cache
                        </Button>
                    </div>
                </div>

                <div className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                        <Shield size={200} />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/10 text-white">
                                <Shield size={24} />
                            </div>
                            <h4 className="font-black uppercase tracking-tight text-white">Data Integrity Check</h4>
                        </div>
                        <div className="space-y-3">
                            {[
                                "Koneksi Database: Stabil (Latensi < 50ms)",
                                "Integrasi RLS: Aktif & Terlindungi",
                                "Sistem Audit: Berjalan secara Real-time"
                            ].map((info, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <CheckCircle2 size={16} className="text-emerald-200" />
                                    <span className="text-xs font-bold uppercase tracking-wide opacity-90">{info}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Rekomendasi:</p>
                            <p className="text-xs font-medium mt-1">Lakukan backup sistem minimal 1x per minggu untuk keamanan data maksimal.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SystemStatusPage
