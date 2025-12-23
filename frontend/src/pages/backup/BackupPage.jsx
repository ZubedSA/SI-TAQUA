import { useState, useRef } from 'react'
import { Database, Download, Upload, RefreshCw, CheckCircle, AlertCircle, Clock, HardDrive, FileJson, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logCreate } from '../../lib/auditLog'
import './Backup.css'

const BackupPage = () => {
    const [loading, setLoading] = useState(false)
    const [backupData, setBackupData] = useState(null)
    const [backupInfo, setBackupInfo] = useState(null)
    const [status, setStatus] = useState({ type: '', message: '' })
    const [restoreLoading, setRestoreLoading] = useState(false)
    const fileInputRef = useRef(null)

    // Tables to backup
    const tables = [
        'santri',
        'guru',
        'kelas',
        'halaqoh',
        'mapel',
        'semester',
        'hafalan',
        'nilai',
        'presensi',
        'pencapaian_hafalan',
        'user_profiles'
    ]

    // Backup all tables
    const handleBackup = async () => {
        setLoading(true)
        setStatus({ type: '', message: '' })
        setBackupData(null)

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
                    const { data, error } = await supabase
                        .from(table)
                        .select('*')

                    if (error) {
                        console.warn(`Warning: Could not backup ${table}:`, error.message)
                        backup.tables[table] = { error: error.message, data: [] }
                    } else {
                        backup.tables[table] = { count: data?.length || 0, data: data || [] }
                        totalRecords += data?.length || 0
                    }
                } catch (err) {
                    console.warn(`Error backing up ${table}:`, err.message)
                    backup.tables[table] = { error: err.message, data: [] }
                }
            }

            setBackupData(backup)
            setBackupInfo({
                createdAt: backup.createdAt,
                totalRecords,
                tableCount: tables.length
            })

            await logCreate('backup', 'Backup Database', `Backup database berhasil: ${totalRecords} records dari ${tables.length} tabel`)

            setStatus({
                type: 'success',
                message: `✅ Backup berhasil! ${totalRecords} data dari ${tables.length} tabel siap didownload.`
            })

        } catch (error) {
            setStatus({
                type: 'error',
                message: `❌ Gagal melakukan backup: ${error.message}`
            })
        } finally {
            setLoading(false)
        }
    }

    // Download backup as JSON
    const handleDownload = () => {
        if (!backupData) {
            setStatus({ type: 'error', message: 'Belum ada data backup. Klik "Backup Sekarang" terlebih dahulu.' })
            return
        }

        const dataStr = JSON.stringify(backupData, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = `backup_ptqa_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setStatus({
            type: 'success',
            message: '✅ File backup berhasil didownload!'
        })
    }

    // Handle file selection for restore
    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result)

                // Validate backup file
                if (!data.version || !data.tables || !data.createdAt) {
                    setStatus({
                        type: 'error',
                        message: '❌ File backup tidak valid. Pastikan file dari sistem PTQA.'
                    })
                    return
                }

                // Confirm restore
                const tableNames = Object.keys(data.tables)
                const totalRecords = tableNames.reduce((sum, t) => sum + (data.tables[t]?.count || 0), 0)

                const confirmed = window.confirm(
                    `⚠️ PERINGATAN: Restore akan MENGGANTI data yang ada!\n\n` +
                    `File backup:\n` +
                    `- Tanggal: ${new Date(data.createdAt).toLocaleString('id-ID')}\n` +
                    `- Tabel: ${tableNames.length}\n` +
                    `- Total Data: ${totalRecords}\n\n` +
                    `Lanjutkan restore?`
                )

                if (!confirmed) {
                    setStatus({ type: '', message: '' })
                    return
                }

                await performRestore(data)

            } catch (err) {
                setStatus({
                    type: 'error',
                    message: `❌ Gagal membaca file: ${err.message}`
                })
            }
        }
        reader.readAsText(file)
    }

    // Perform actual restore
    const performRestore = async (data) => {
        setRestoreLoading(true)
        setStatus({ type: 'info', message: '🔄 Proses restore sedang berjalan...' })

        try {
            let restoredTables = 0
            let restoredRecords = 0

            // Restore order matters for foreign keys
            const restoreOrder = [
                'semester',
                'kelas',
                'halaqoh',
                'mapel',
                'guru',
                'santri',
                'hafalan',
                'nilai',
                'presensi',
                'pencapaian_hafalan'
            ]

            for (const table of restoreOrder) {
                if (data.tables[table] && data.tables[table].data && data.tables[table].data.length > 0) {
                    const records = data.tables[table].data

                    // Clear existing data first
                    const { error: deleteError } = await supabase
                        .from(table)
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

                    if (deleteError) {
                        console.warn(`Warning: Could not clear ${table}:`, deleteError.message)
                    }

                    // Insert backup data
                    const { error: insertError } = await supabase
                        .from(table)
                        .upsert(records, { onConflict: 'id' })

                    if (insertError) {
                        console.warn(`Warning: Could not restore ${table}:`, insertError.message)
                    } else {
                        restoredTables++
                        restoredRecords += records.length
                    }
                }
            }

            await logCreate('restore', 'Restore Database', `Restore database berhasil: ${restoredRecords} records ke ${restoredTables} tabel`)

            setStatus({
                type: 'success',
                message: `✅ Restore berhasil! ${restoredRecords} data ke ${restoredTables} tabel.`
            })

        } catch (error) {
            setStatus({
                type: 'error',
                message: `❌ Gagal restore: ${error.message}`
            })
        } finally {
            setRestoreLoading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="backup-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Database size={28} /> Backup Data
                    </h1>
                    <p className="page-subtitle">Backup dan restore data sistem akademik</p>
                </div>
            </div>

            {/* Status Alert */}
            {status.message && (
                <div className={`alert alert-${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : 'info'} mb-4`}>
                    {status.type === 'error' ? <AlertCircle size={18} /> : status.type === 'success' ? <CheckCircle size={18} /> : <Clock size={18} />}
                    <span>{status.message}</span>
                </div>
            )}

            <div className="backup-grid">
                {/* Backup Card */}
                <div className="backup-card">
                    <div className="backup-card-header blue">
                        <HardDrive size={24} />
                        <h3>Backup Sekarang</h3>
                    </div>
                    <div className="backup-card-body">
                        <p>Export semua data dari database ke format JSON.</p>
                        <ul className="backup-list">
                            <li>Data Santri & Guru</li>
                            <li>Kelas, Halaqoh, Mapel</li>
                            <li>Hafalan & Nilai</li>
                            <li>Presensi & Pencapaian</li>
                        </ul>
                        <button
                            className="btn btn-primary btn-block"
                            onClick={handleBackup}
                            disabled={loading}
                        >
                            {loading ? (
                                <><RefreshCw size={18} className="spin" /> Memproses...</>
                            ) : (
                                <><Database size={18} /> Backup Sekarang</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Download Card */}
                <div className="backup-card">
                    <div className="backup-card-header green">
                        <Download size={24} />
                        <h3>Download Backup</h3>
                    </div>
                    <div className="backup-card-body">
                        {backupInfo ? (
                            <>
                                <div className="backup-info">
                                    <div className="info-item">
                                        <Calendar size={16} />
                                        <span>{new Date(backupInfo.createdAt).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="info-item">
                                        <FileJson size={16} />
                                        <span>{backupInfo.totalRecords} records</span>
                                    </div>
                                    <div className="info-item">
                                        <Database size={16} />
                                        <span>{backupInfo.tableCount} tabel</span>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-success btn-block"
                                    onClick={handleDownload}
                                >
                                    <Download size={18} /> Download File
                                </button>
                            </>
                        ) : (
                            <div className="no-backup">
                                <FileJson size={48} />
                                <p>Belum ada backup</p>
                                <small>Klik "Backup Sekarang" untuk membuat backup baru</small>
                            </div>
                        )}
                    </div>
                </div>

                {/* Restore Card */}
                <div className="backup-card">
                    <div className="backup-card-header orange">
                        <Upload size={24} />
                        <h3>Restore Backup</h3>
                    </div>
                    <div className="backup-card-body">
                        <p>Pulihkan data dari file backup JSON.</p>
                        <div className="alert alert-warning mb-3">
                            <AlertCircle size={16} />
                            <small>Restore akan mengganti data yang ada!</small>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".json"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="btn btn-warning btn-block"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={restoreLoading}
                        >
                            {restoreLoading ? (
                                <><RefreshCw size={18} className="spin" /> Restoring...</>
                            ) : (
                                <><Upload size={18} /> Pilih File Backup</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Backup Tips */}
            <div className="backup-tips">
                <h4>💡 Tips Backup</h4>
                <ul>
                    <li>Lakukan backup secara berkala (mingguan atau bulanan)</li>
                    <li>Simpan file backup di lokasi yang aman (cloud/external drive)</li>
                    <li>Beri nama file dengan tanggal agar mudah diidentifikasi</li>
                    <li>Test restore pada environment terpisah sebelum di production</li>
                </ul>
            </div>
        </div>
    )
}

export default BackupPage
