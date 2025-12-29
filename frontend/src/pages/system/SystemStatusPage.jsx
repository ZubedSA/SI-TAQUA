/**
 * System Status Page - Dashboard untuk monitoring, caching, backup, dan disaster recovery
 */

import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
    Activity, Database, Wifi, HardDrive, RefreshCw, Download,
    Upload, Trash2, AlertTriangle, CheckCircle, Clock, Server,
    Shield, Zap, AlertCircle, FileJson, Calendar, FileSpreadsheet,
    FileText, Briefcase, GraduationCap, DollarSign, Users
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate } from '../../lib/auditLog'
import healthMonitor, { HealthStatus } from '../../lib/healthMonitor'
import cacheManager from '../../lib/cacheManager'
import disasterRecovery from '../../lib/disasterRecovery'
import './SystemStatus.css'

const SystemStatusPage = () => {
    // -- STATES --
    const [health, setHealth] = useState(null)
    const [cacheStats, setCacheStats] = useState(null)
    const [backupInfo, setBackupInfo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [message, setMessage] = useState(null)

    // Backup & Restore States
    const [dbLoading, setDbLoading] = useState(false)
    const [dbBackupData, setDbBackupData] = useState(null)
    const [dbBackupInfo, setDbBackupInfo] = useState(null)
    const [restoreLoading, setRestoreLoading] = useState(false)
    const fileInputRef = useRef(null)

    // -- DEFINISI MODUL BACKUP --
    const MODULES = {
        PONDOK: {
            name: 'PONDOK',
            label: 'Data Pondok',
            tables: ['santri', 'guru', 'kelas', 'halaqoh']
        },
        AKADEMIK: {
            name: 'AKADEMIK',
            label: 'Data Akademik',
            tables: ['semester', 'mapel', 'hafalan', 'nilai', 'presensi', 'pencapaian_hafalan']
        },
        KEUANGAN: {
            name: 'KEUANGAN',
            label: 'Data Keuangan',
            tables: ['tagihan_santri', 'pembayaran_santri', 'kas_pemasukan', 'kas_pengeluaran', 'anggaran', 'realisasi_dana']
        },
        FULL: {
            name: 'FULL',
            label: 'Semua Data',
            tables: [
                'santri', 'guru', 'kelas', 'halaqoh',
                'semester', 'mapel', 'hafalan', 'nilai', 'presensi', 'pencapaian_hafalan',
                'tagihan_santri', 'pembayaran_santri', 'kas_pemasukan', 'kas_pengeluaran', 'anggaran', 'realisasi_dana',
                'user_profiles'
            ]
        }
    }

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
            setBackupInfo(disasterRecovery.getInfo())
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
        showMessage('Data berhasil dimuat ulang', 'success')
    }

    const showMessage = (text, type) => {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 4000)
    }

    // -- CACHE HANDLERS --
    const handleClearCache = () => {
        if (confirm('Hapus semua cache? Ini akan memperlambat loading sementara.')) {
            const cleared = cacheManager.clearAll()
            setCacheStats(cacheManager.stats())
            showMessage(`${cleared} cache items dihapus`, 'success')
        }
    }

    const handleClearExpiredCache = () => {
        const cleared = cacheManager.clearExpired()
        setCacheStats(cacheManager.stats())
        showMessage(`${cleared} cache expired dihapus`, 'success')
    }

    // -- LOCAL STORAGE BACKUP --
    const handleCreateLocalBackup = () => {
        disasterRecovery.createBackup()
        setBackupInfo(disasterRecovery.getInfo())
        showMessage('Backup lokal berhasil dibuat', 'success')
    }

    // -- CORE BACKUP LOGIC --

    /**
     * Mengambil data referensi untuk mode Readable (Laporan)
     * Mengubah ID menjadi Nama yang mudah dibaca.
     */
    const fetchReferences = async () => {
        const refs = {}
        const refTables = ['santri', 'guru', 'kelas', 'halaqoh', 'mapel', 'semester', 'anggaran']

        for (const table of refTables) {
            const { data } = await supabase.from(table).select('*')
            if (data) {
                refs[table] = data.reduce((acc, item) => {
                    // Tentukan field mana yang jadi label
                    let label = item.nama || item.name || item.judul || item.nama_anggaran
                    if (table === 'santri') label = `${item.nama} (${item.nis})`
                    acc[item.id] = label
                    return acc
                }, {})
            }
        }
        return refs
    }

    /**
     * Transformasi ID ke Nama untuk mode Laporan
     */
    const transformDataToReadable = (data, tableName, refs) => {
        if (!data || data.length === 0) return []

        return data.map(row => {
            const newRow = { ...row }

            // Hapus field internal sistem
            delete newRow.id
            delete newRow.created_at
            delete newRow.updated_at
            delete newRow.deleted_at
            delete newRow.audit_logs
            delete newRow.user_id

            // Transformasi ID -> Nama
            if (newRow.santri_id) {
                newRow['Nama Santri'] = refs.santri?.[newRow.santri_id] || 'DATA TIDAK DITEMUKAN'
                delete newRow.santri_id
            }
            if (newRow.guru_id) {
                newRow['Nama Guru'] = refs.guru?.[newRow.guru_id] || 'DATA TIDAK DITEMUKAN'
                delete newRow.guru_id
            }
            if (newRow.kelas_id) {
                newRow['Kelas'] = refs.kelas?.[newRow.kelas_id] || 'DATA TIDAK DITEMUKAN'
                delete newRow.kelas_id
            }
            if (newRow.halaqoh_id) {
                newRow['Halaqoh'] = refs.halaqoh?.[newRow.halaqoh_id] || 'DATA TIDAK DITEMUKAN'
                delete newRow.halaqoh_id
            }
            if (newRow.mapel_id) {
                newRow['Mata Pelajaran'] = refs.mapel?.[newRow.mapel_id] || 'DATA TIDAK DITEMUKAN'
                delete newRow.mapel_id
            }
            if (newRow.semester_id) {
                newRow['Semester'] = refs.semester?.[newRow.semester_id] || 'DATA TIDAK DITEMUKAN'
                delete newRow.semester_id
            }
            if (newRow.anggaran_id) {
                newRow['Anggaran'] = refs.anggaran?.[newRow.anggaran_id] || 'DATA TIDAK DITEMUKAN'
                delete newRow.anggaran_id
            }

            // Format Tanggal & Uang
            Object.keys(newRow).forEach(key => {
                if (key.includes('tanggal') || key.includes('date') || key.includes('waktu')) {
                    if (newRow[key]) newRow[key] = new Date(newRow[key]).toLocaleDateString('id-ID')
                }
                if (key.includes('total') || key.includes('jumlah') || key.includes('bayar') || key.includes('nominal')) {
                    if (typeof newRow[key] === 'number') {
                        newRow[key] = newRow[key].toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })
                    }
                }
            })

            return newRow
        })
    }

    /**
     * Handler Utama Modular Backup
     * @param {string} moduleKey - Key dari object MODULES (e.g., 'PONDOK', 'KEUANGAN')
     * @param {string} mode - 'RESTORE' (Raw) atau 'LAPORAN' (Readable)
     */
    const handleModularBackup = async (moduleKey, mode = 'RESTORE') => {
        const module = MODULES[moduleKey]
        if (!module) return

        setDbLoading(true)
        const typeLabel = mode === 'RESTORE' ? 'RESTORE (RAW)' : 'LAPORAN (READABLE)'
        showMessage(`Memproses Backup ${module.label} - Mode ${typeLabel}...`, 'info')

        const timestamp = new Date().toISOString().split('T')[0]
        const modeSuffix = mode === 'RESTORE' ? 'RESTORE' : 'LAPORAN'
        const filename = `BACKUP_${module.name}_${modeSuffix}_${timestamp}.xlsx`

        try {
            const workbook = XLSX.utils.book_new()
            let refs = {}

            // Jika mode laporan, ambil referensi dulu
            if (mode === 'LAPORAN') {
                refs = await fetchReferences()
            }

            let totalData = 0

            for (const table of module.tables) {
                const { data, error } = await supabase.from(table).select('*')

                if (error) {
                    console.error(`Gagal fetch ${table}:`, error)
                    continue
                }

                let finalData = data || []

                if (mode === 'LAPORAN') {
                    finalData = transformDataToReadable(finalData, table, refs)
                }

                const sheet = XLSX.utils.json_to_sheet(finalData)
                let sheetName = table.substring(0, 31).toUpperCase()
                if (mode === 'LAPORAN') sheetName = sheetName.replace(/_/g, ' ')

                XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
                totalData += finalData.length
            }

            // Download File
            XLSX.writeFile(workbook, filename)

            await logCreate('backup', `Backup ${module.name}`, `Mode: ${mode}, Records: ${totalData}`)
            showMessage(`✅ Berhasil! File ${filename} terunduh.`, 'success')

        } catch (err) {
            console.error(err)
            showMessage(`❌ Gagal: ${err.message}`, 'error')
        } finally {
            setDbLoading(false)
        }
    }

    // -- RESTORE HANDLER (JSON ONLY FOR SYSTEM) --
    // Restore tetap menggunakan JSON Full System untuk keamanan integritas referensi
    const handleSystemRestoreCheck = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result)
                if (!data.version || !data.tables) {
                    showMessage('File backup JSON tidak valid', 'error')
                    return
                }

                const tableNames = Object.keys(data.tables)
                if (!confirm(`⚠️ PERINGATAN: Restore akan MENGGANTI data sistem!\n\nTabel: ${tableNames.length}\nLanjutkan?`)) return

                await performRestore(data)

            } catch (err) {
                showMessage(`Error: ${err.message}`, 'error')
            }
        }
        reader.readAsText(file)
    }

    const performRestore = async (data) => {
        setRestoreLoading(true)
        showMessage('Proses restore berjalan...', 'info')
        try {
            // Urutan restore penting untuk Foreign Key
            const restoreOrder = [
                'semester', 'kelas', 'mapel', 'guru', 'santri', 'halaqoh', // Master
                'hafalan', 'nilai', 'presensi', // Transaksi Akademik
                'anggaran', 'kas_pemasukan', 'kas_pengeluaran', 'tagihan_santri', 'pembayaran_santri' // Transaksi Keuangan
            ]

            let count = 0
            for (const table of restoreOrder) {
                const records = data.tables[table]?.data
                if (records && records.length > 0) {
                    // Hapus data lama (kecuali default ID 0000...)
                    await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
                    // Insert data baru
                    const { error } = await supabase.from(table).upsert(records, { onConflict: 'id' })
                    if (!error) count += records.length
                }
            }

            showMessage(`✅ Restore Sukses! ${count} data dipulihkan.`, 'success')
            await logCreate('restore', 'System Restore', `Restored ${count} items`)
        } catch (err) {
            showMessage(`Gagal Restore: ${err.message}`, 'error')
        } finally {
            setRestoreLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // JSON Backup Handlers (Legacy / System Only)
    const handleJsonBackup = async () => {
        setDbLoading(true)
        try {
            const backup = { version: '1.0', createdAt: new Date(), tables: {} }
            for (const table of MODULES.FULL.tables) {
                const { data } = await supabase.from(table).select('*')
                backup.tables[table] = { data: data || [] }
            }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `SYSTEM_BACKUP_${new Date().toISOString().split('T')[0]}.json`
            a.click()
            showMessage('Backup JSON System Berhasil', 'success')
        } catch (err) {
            showMessage(err.message, 'error')
        } finally {
            setDbLoading(false)
        }
    }


    // -- RENDER HELPERS --
    const getStatusColor = (status) => {
        switch (status) {
            case HealthStatus.HEALTHY: return '#10b981'
            case HealthStatus.DEGRADED: return '#f59e0b'
            case HealthStatus.UNHEALTHY: return '#ef4444'
            default: return '#6b7280'
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case HealthStatus.HEALTHY: return <CheckCircle className="text-success" size={24} />
            case HealthStatus.DEGRADED: return <AlertTriangle className="text-warning" size={24} />
            case HealthStatus.UNHEALTHY: return <AlertCircle className="text-danger" size={24} />
            default: return <Activity size={24} />
        }
    }

    const summary = health ? {
        status: health.status,
        statusText: health.status === 'healthy' ? 'Sistem Sehat' : 'Sistem Bermasalah',
        lastCheck: new Date().toLocaleTimeString(), // Fallback time
        issues: [] // Simplified check
    } : null

    if (health && summary) {
        summary.lastCheck = health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()
        if (health.status !== 'healthy') {
            if (health.details?.database?.status !== 'healthy') summary.issues.push('Koneksi Database Bermasalah')
            if (!health.details?.network?.online) summary.issues.push('Koneksi Internet Terputus')
            if ((health.details?.storage?.percentage || 0) > 90) summary.issues.push('Penyimpanan Penuh')
        }
    }

    if (loading) return <div className="p-5 text-center"><RefreshCw className="spin mx-auto" /> Memuat...</div>

    return (
        <div className="system-status-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Server size={28} /> Status & Backup Sistem</h1>
                    <p className="page-subtitle">Monitoring kesehatan server dan pusat backup data</p>
                </div>
                <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={18} className={refreshing ? 'spin' : ''} /> Refresh
                </button>
            </div>

            {message && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'} mb-3`}>
                    {message.text}
                </div>
            )}

            {/* --- SECTION 1: HEALTH SYSTEM (ORIGINAL LAYOUT) --- */}
            <div className="status-section">
                <h2><Activity size={20} /> Kesehatan Sistem</h2>

                {summary && (
                    <div className="health-overview" style={{ borderColor: getStatusColor(summary.status) }}>
                        <div className="health-main">
                            {getStatusIcon(summary.status)}
                            <span className="health-text">{summary.statusText}</span>
                            <span className="health-time">Terakhir: {summary.lastCheck}</span>
                        </div>

                        {summary.issues.length > 0 && (
                            <div className="health-issues">
                                <strong>Masalah:</strong>
                                <ul>{summary.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
                            </div>
                        )}
                    </div>
                )}

                <div className="health-grid">
                    <div className="health-card">
                        <div className="health-card-icon"><Wifi size={24} /></div>
                        <div className="health-card-content">
                            <h4>Internet</h4>
                            <p className={health?.details?.network?.online ? 'text-success' : 'text-danger'}>
                                {health?.details?.network?.online ? 'Online' : 'Offline'}
                            </p>
                        </div>
                    </div>

                    <div className="health-card">
                        <div className="health-card-icon"><Database size={24} /></div>
                        <div className="health-card-content">
                            <h4>Database</h4>
                            <p style={{ color: getStatusColor(health?.details?.database?.status) }}>
                                {health?.details?.database?.status === HealthStatus.HEALTHY ? 'Terhubung' : 'Error'}
                            </p>
                            {health?.details?.database?.latency && <small>{health.details.database.latency}ms</small>}
                        </div>
                    </div>

                    <div className="health-card">
                        <div className="health-card-icon"><HardDrive size={24} /></div>
                        <div className="health-card-content">
                            <h4>Database Storage</h4>
                            <p style={{ color: getStatusColor(health?.details?.storage?.status) }}>
                                {health?.details?.storage?.totalRows || 0} data
                            </p>
                            <small className="text-muted">
                                ~{health?.details?.storage?.usedKB || 0} KB / 500 MB
                            </small>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${Math.min(health?.details?.storage?.percentage || 0, 100)}%`, backgroundColor: (health?.details?.storage?.percentage || 0) > 80 ? '#ef4444' : '#10b981' }} />
                            </div>
                        </div>
                    </div>

                    <div className="health-card">
                        <div className="health-card-icon"><Zap size={24} /></div>
                        <div className="health-card-content">
                            <h4>Memory</h4>
                            {health?.details?.memory?.usedMB ? (
                                <p>{health.details.memory.usedMB} MB ({health.details.memory.percentage}%)</p>
                            ) : <p className="text-muted">N/A</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 2: MODULAR BACKUP (NEW FEATURE) --- */}
            <div className="status-section">
                <h2><Database size={20} /> Pusat Backup Data (Modular)</h2>
                <p className="text-muted mb-4">Pilih jenis data yang ingin dibackup. Gunakan <strong>Restore (Raw)</strong> untuk backup sistem, dan <strong>Laporan</strong> untuk data yang mudah dibaca.</p>

                <div className="backup-modules-grid">
                    {/* MODUL PONDOK */}
                    <div className="backup-card">
                        <div className="card-icon " style={{ background: '#e0f2fe', color: '#0284c7' }}>
                            <Briefcase size={24} />
                        </div>
                        <h3>Data Pondok</h3>
                        <p>Santri, Guru, Kelas, Halaqoh</p>
                        <div className="btn-group-vertical">
                            <button className="btn btn-outline-primary btn-sm w-100 mb-2" onClick={() => handleModularBackup('PONDOK', 'RESTORE')} disabled={dbLoading}>
                                <Database size={14} /> Backup Restore (Raw)
                            </button>
                            <button className="btn btn-sm btn-primary w-100" onClick={() => handleModularBackup('PONDOK', 'LAPORAN')} disabled={dbLoading}>
                                <FileText size={14} /> Download Laporan
                            </button>
                        </div>
                    </div>

                    {/* MODUL AKADEMIK */}
                    <div className="backup-card">
                        <div className="card-icon" style={{ background: '#fce7f3', color: '#db2777' }}>
                            <GraduationCap size={24} />
                        </div>
                        <h3>Data Akademik</h3>
                        <p>Hafalan, Nilai, Presensi, Mapel</p>
                        <div className="btn-group-vertical">
                            <button className="btn btn-outline-primary btn-sm w-100 mb-2" onClick={() => handleModularBackup('AKADEMIK', 'RESTORE')} disabled={dbLoading}>
                                <Database size={14} /> Backup Restore (Raw)
                            </button>
                            <button className="btn btn-sm btn-primary w-100" onClick={() => handleModularBackup('AKADEMIK', 'LAPORAN')} disabled={dbLoading}>
                                <FileText size={14} /> Download Laporan
                            </button>
                        </div>
                    </div>

                    {/* MODUL KEUANGAN */}
                    <div className="backup-card">
                        <div className="card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                            <DollarSign size={24} />
                        </div>
                        <h3>Data Keuangan</h3>
                        <p>Tagihan, Pembayaran, Kas, Anggaran</p>
                        <div className="btn-group-vertical">
                            <button className="btn btn-outline-primary btn-sm w-100 mb-2" onClick={() => handleModularBackup('KEUANGAN', 'RESTORE')} disabled={dbLoading}>
                                <Database size={14} /> Backup Restore (Raw)
                            </button>
                            <button className="btn btn-sm btn-primary w-100" onClick={() => handleModularBackup('KEUANGAN', 'LAPORAN')} disabled={dbLoading}>
                                <FileText size={14} /> Download Laporan
                            </button>
                        </div>
                    </div>

                    {/* MODUL FULL SYSTEM */}
                    <div className="backup-card highlight">
                        <div className="card-icon" style={{ background: '#f3f4f6', color: '#1f2937' }}>
                            <HardDrive size={24} />
                        </div>
                        <h3>Semua Data</h3>
                        <p>Full System Backup</p>
                        <div className="btn-group-vertical">
                            <button className="btn btn-outline-dark btn-sm w-100 mb-2" onClick={() => handleModularBackup('FULL', 'RESTORE')} disabled={dbLoading}>
                                <Database size={14} /> Backup Lengkap (Raw)
                            </button>
                            <button className="btn btn-sm btn-dark w-100" onClick={() => handleModularBackup('FULL', 'LAPORAN')} disabled={dbLoading}>
                                <FileText size={14} /> Laporan Lengkap
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: LEGACY MAINTENANCE & CACHE --- */}
            <div className="status-section mt-4">
                <h2><Shield size={20} /> System Maintenance & Restore</h2>
                <div className="backup-grid-compact">
                    {/* JSON BACKUP */}
                    <div className="backup-action-card">
                        <div className="backup-action-icon blue"><FileJson size={28} /></div>
                        <div className="backup-action-content">
                            <h4>System Snapshot (JSON)</h4>
                            <p>Backup format JSON ringan untuk disaster recovery.</p>
                            <button className="btn btn-primary btn-sm" onClick={handleJsonBackup} disabled={dbLoading}>
                                <Download size={14} /> Download JSON
                            </button>
                        </div>
                    </div>

                    {/* RESTORE */}
                    <div className="backup-action-card">
                        <div className="backup-action-icon orange"><Upload size={28} /></div>
                        <div className="backup-action-content">
                            <h4>Restore Database</h4>
                            <p>Pulihkan sistem dari file JSON.</p>
                            <input type="file" ref={fileInputRef} accept=".json" onChange={handleSystemRestoreCheck} style={{ display: 'none' }} />
                            <button className="btn btn-warning btn-sm" onClick={() => fileInputRef.current?.click()} disabled={restoreLoading}>
                                {restoreLoading ? <RefreshCw className="spin" size={14} /> : <Upload size={14} />} Upload & Restore
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cache Management */}
            <div className="status-section">
                <h2><Zap size={20} /> Cache Performance</h2>

                <div className="cache-stats">
                    <div className="stat-item">
                        <span className="stat-value">{cacheStats?.activeItems || 0}</span>
                        <span className="stat-label">Cache Aktif</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{cacheStats?.expiredItems || 0}</span>
                        <span className="stat-label">Expired</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{cacheStats?.totalSizeKB || 0} KB</span>
                        <span className="stat-label">Ukuran</span>
                    </div>
                </div>

                <div className="cache-actions">
                    <button className="btn btn-secondary" onClick={handleClearExpiredCache}>
                        <Clock size={16} /> Hapus Expired
                    </button>
                    <button className="btn btn-danger" onClick={handleClearCache}>
                        <Trash2 size={16} /> Hapus Semua
                    </button>
                </div>
            </div>

        </div>
    )
}

export default SystemStatusPage
