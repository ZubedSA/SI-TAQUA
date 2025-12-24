/**
 * System Status Page - Dashboard untuk monitoring, caching, backup, dan disaster recovery
 */

import { useState, useEffect, useRef } from 'react'
import {
    Activity, Database, Wifi, HardDrive, RefreshCw, Download,
    Upload, Trash2, AlertTriangle, CheckCircle, Clock, Server,
    Shield, Zap, AlertCircle, FileJson, Calendar
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate } from '../../lib/auditLog'
import healthMonitor, { HealthStatus } from '../../lib/healthMonitor'
import cacheManager from '../../lib/cacheManager'
import disasterRecovery from '../../lib/disasterRecovery'
import './SystemStatus.css'

const SystemStatusPage = () => {
    const [health, setHealth] = useState(null)
    const [cacheStats, setCacheStats] = useState(null)
    const [backupInfo, setBackupInfo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [message, setMessage] = useState(null)

    // Database Backup State
    const [dbLoading, setDbLoading] = useState(false)
    const [dbBackupData, setDbBackupData] = useState(null)
    const [dbBackupInfo, setDbBackupInfo] = useState(null)
    const [restoreLoading, setRestoreLoading] = useState(false)
    const fileInputRef = useRef(null)

    // Tables to backup
    const tables = [
        'santri', 'guru', 'kelas', 'halaqoh', 'mapel', 'semester',
        'hafalan', 'nilai', 'presensi', 'pencapaian_hafalan', 'user_profiles'
    ]

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

    const handleCreateBackup = () => {
        disasterRecovery.createBackup()
        setBackupInfo(disasterRecovery.getInfo())
        showMessage('Backup lokal berhasil dibuat', 'success')
    }

    const handleExportBackup = () => {
        disasterRecovery.exportFile()
        showMessage('File backup diunduh', 'success')
    }

    const handleImportBackup = (e) => {
        const file = e.target.files[0]
        if (!file) return

        disasterRecovery.importFile(file)
            .then(() => {
                setBackupInfo(disasterRecovery.getInfo())
                showMessage('Backup berhasil diimpor', 'success')
            })
            .catch(err => {
                showMessage('Gagal impor: ' + err.message, 'error')
            })
    }

    // DATABASE BACKUP FUNCTIONS
    const handleDatabaseBackup = async () => {
        setDbLoading(true)
        setDbBackupData(null)

        try {
            const backup = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                app: 'PTQA Akademik',
                tables: {}
            }

            let totalRecords = 0

            for (const table of tables) {
                try {
                    const { data, error } = await supabase.from(table).select('*')
                    if (error) {
                        backup.tables[table] = { error: error.message, data: [] }
                    } else {
                        backup.tables[table] = { count: data?.length || 0, data: data || [] }
                        totalRecords += data?.length || 0
                    }
                } catch (err) {
                    backup.tables[table] = { error: err.message, data: [] }
                }
            }

            setDbBackupData(backup)
            setDbBackupInfo({ createdAt: backup.createdAt, totalRecords, tableCount: tables.length })
            await logCreate('backup', 'Backup Database', `Backup: ${totalRecords} records dari ${tables.length} tabel`)
            showMessage(`Backup berhasil! ${totalRecords} data dari ${tables.length} tabel siap didownload.`, 'success')
        } catch (error) {
            showMessage(`Gagal backup: ${error.message}`, 'error')
        } finally {
            setDbLoading(false)
        }
    }

    const handleDatabaseDownload = () => {
        if (!dbBackupData) {
            showMessage('Belum ada backup. Klik "Backup Database" terlebih dahulu.', 'error')
            return
        }

        const dataStr = JSON.stringify(dbBackupData, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `backup_ptqa_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        showMessage('File backup berhasil didownload!', 'success')
    }

    const handleDatabaseRestore = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result)
                if (!data.version || !data.tables || !data.createdAt) {
                    showMessage('File backup tidak valid', 'error')
                    return
                }

                const tableNames = Object.keys(data.tables)
                const totalRecords = tableNames.reduce((sum, t) => sum + (data.tables[t]?.count || 0), 0)

                if (!confirm(`⚠️ PERINGATAN: Restore akan MENGGANTI data!\n\nFile: ${new Date(data.createdAt).toLocaleString('id-ID')}\nTabel: ${tableNames.length}\nData: ${totalRecords}\n\nLanjutkan?`)) return

                await performRestore(data)
            } catch (err) {
                showMessage(`Gagal membaca file: ${err.message}`, 'error')
            }
        }
        reader.readAsText(file)
    }

    const performRestore = async (data) => {
        setRestoreLoading(true)
        showMessage('Proses restore sedang berjalan...', 'success')

        try {
            const restoreOrder = ['semester', 'kelas', 'halaqoh', 'mapel', 'guru', 'santri', 'hafalan', 'nilai', 'presensi', 'pencapaian_hafalan']
            let restoredTables = 0, restoredRecords = 0

            for (const table of restoreOrder) {
                if (data.tables[table]?.data?.length > 0) {
                    const records = data.tables[table].data
                    await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
                    const { error } = await supabase.from(table).upsert(records, { onConflict: 'id' })
                    if (!error) {
                        restoredTables++
                        restoredRecords += records.length
                    }
                }
            }

            await logCreate('restore', 'Restore Database', `Restore: ${restoredRecords} records ke ${restoredTables} tabel`)
            showMessage(`Restore berhasil! ${restoredRecords} data ke ${restoredTables} tabel.`, 'success')
        } catch (error) {
            showMessage(`Gagal restore: ${error.message}`, 'error')
        } finally {
            setRestoreLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const showMessage = (text, type) => {
        setMessage({ text, type })
        setTimeout(() => setMessage(null), 4000)
    }

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
            case HealthStatus.HEALTHY: return <CheckCircle size={20} style={{ color: '#10b981' }} />
            case HealthStatus.DEGRADED: return <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            case HealthStatus.UNHEALTHY: return <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            default: return <Activity size={20} style={{ color: '#6b7280' }} />
        }
    }

    const summary = health ? healthMonitor.getSummary() : null

    if (loading) {
        return (
            <div className="system-status-page">
                <div className="text-center py-4">
                    <RefreshCw size={24} className="spin" /> Memuat status sistem...
                </div>
            </div>
        )
    }

    return (
        <div className="system-status-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Server size={28} /> Status Sistem</h1>
                    <p className="page-subtitle">Monitoring, backup, dan pengelolaan sistem</p>
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

            {/* Health Overview */}
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
                            <h4>Storage</h4>
                            <p>{health?.details?.storage?.usedKB || 0} KB</p>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${health?.details?.storage?.percentage || 0}%`, backgroundColor: (health?.details?.storage?.percentage || 0) > 80 ? '#ef4444' : '#10b981' }} />
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

            {/* DATABASE BACKUP SECTION */}
            <div className="status-section">
                <h2><Database size={20} /> Backup Database</h2>

                <div className="backup-grid-compact">
                    <div className="backup-action-card">
                        <div className="backup-action-icon blue"><HardDrive size={28} /></div>
                        <div className="backup-action-content">
                            <h4>Backup Sekarang</h4>
                            <p>Export semua data ke JSON</p>
                            <button className="btn btn-primary btn-sm" onClick={handleDatabaseBackup} disabled={dbLoading}>
                                {dbLoading ? <><RefreshCw size={16} className="spin" /> Memproses...</> : <><Database size={16} /> Backup</>}
                            </button>
                        </div>
                    </div>

                    <div className="backup-action-card">
                        <div className="backup-action-icon green"><Download size={28} /></div>
                        <div className="backup-action-content">
                            <h4>Download Backup</h4>
                            {dbBackupInfo ? (
                                <>
                                    <p>{dbBackupInfo.totalRecords} records • {dbBackupInfo.tableCount} tabel</p>
                                    <button className="btn btn-success btn-sm" onClick={handleDatabaseDownload}>
                                        <Download size={16} /> Download
                                    </button>
                                </>
                            ) : <p className="text-muted">Belum ada backup</p>}
                        </div>
                    </div>

                    <div className="backup-action-card">
                        <div className="backup-action-icon orange"><Upload size={28} /></div>
                        <div className="backup-action-content">
                            <h4>Restore Backup</h4>
                            <p>Pulihkan dari file JSON</p>
                            <input type="file" ref={fileInputRef} accept=".json" onChange={handleDatabaseRestore} style={{ display: 'none' }} />
                            <button className="btn btn-warning btn-sm" onClick={() => fileInputRef.current?.click()} disabled={restoreLoading}>
                                {restoreLoading ? <><RefreshCw size={16} className="spin" /> Restoring...</> : <><Upload size={16} /> Restore</>}
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

            {/* Disaster Recovery */}
            <div className="status-section">
                <h2><Shield size={20} /> Disaster Recovery (Lokal)</h2>

                <div className="backup-info-row">
                    <div className="backup-status">
                        <CheckCircle size={20} style={{ color: backupInfo?.hasBackup ? '#10b981' : '#6b7280' }} />
                        <span>{backupInfo?.hasBackup ? 'Backup tersedia' : 'Belum ada'}</span>
                    </div>
                    <div className="backup-status">
                        <Clock size={20} />
                        <span>Terakhir: {backupInfo?.lastBackupTime}</span>
                    </div>
                </div>

                <div className="backup-actions">
                    <button className="btn btn-primary" onClick={handleCreateBackup}>
                        <Shield size={16} /> Backup Lokal
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportBackup}>
                        <Download size={16} /> Export
                    </button>
                    <label className="btn btn-secondary">
                        <Upload size={16} /> Import
                        <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
                    </label>
                </div>
            </div>
        </div>
    )
}

export default SystemStatusPage
