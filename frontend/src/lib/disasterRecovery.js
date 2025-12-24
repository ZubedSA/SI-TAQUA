/**
 * Disaster Recovery - Auto backup dan restore system
 * Untuk memastikan data penting tersimpan dan bisa dipulihkan
 */

const BACKUP_KEY = 'ptqa_disaster_backup'
const BACKUP_TIMESTAMP_KEY = 'ptqa_last_backup'
const AUTO_BACKUP_INTERVAL = 10 * 60 * 1000 // Auto backup setiap 10 menit

/**
 * Data yang harus di-backup untuk disaster recovery
 */
const CRITICAL_DATA_KEYS = [
    'ptqa-theme',
    'sb-access-token',
    'sb-refresh-token'
]

/**
 * Simpan backup critical data
 */
export const createLocalBackup = (additionalData = {}) => {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            theme: localStorage.getItem('ptqa-theme'),
            userData: additionalData,
            appState: {}
        }

        // Collect all PTQA related data
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('ptqa_') || key.startsWith('sb-')) {
                backup.appState[key] = localStorage.getItem(key)
            }
        })

        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
        localStorage.setItem(BACKUP_TIMESTAMP_KEY, Date.now().toString())

        console.log('[Disaster Recovery] Local backup created:', new Date().toLocaleString())
        return backup
    } catch (error) {
        console.error('[Disaster Recovery] Backup failed:', error)
        return null
    }
}

/**
 * Restore dari local backup
 */
export const restoreFromLocalBackup = () => {
    try {
        const backup = localStorage.getItem(BACKUP_KEY)
        if (!backup) {
            console.warn('[Disaster Recovery] No backup found')
            return null
        }

        const data = JSON.parse(backup)

        // Restore app state
        if (data.appState) {
            Object.entries(data.appState).forEach(([key, value]) => {
                if (value) localStorage.setItem(key, value)
            })
        }

        // Restore theme
        if (data.theme) {
            localStorage.setItem('ptqa-theme', data.theme)
            document.documentElement.setAttribute('data-theme', data.theme)
        }

        console.log('[Disaster Recovery] Restored from backup:', data.timestamp)
        return data
    } catch (error) {
        console.error('[Disaster Recovery] Restore failed:', error)
        return null
    }
}

/**
 * Export backup sebagai file JSON
 */
export const exportBackupFile = () => {
    try {
        const backup = createLocalBackup()
        if (!backup) return false

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        const date = new Date().toISOString().split('T')[0]
        link.href = url
        link.download = `ptqa_backup_${date}.json`
        link.click()

        URL.revokeObjectURL(url)
        console.log('[Disaster Recovery] Backup file exported')
        return true
    } catch (error) {
        console.error('[Disaster Recovery] Export failed:', error)
        return false
    }
}

/**
 * Import backup dari file JSON
 */
export const importBackupFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result)

                // Validate backup
                if (!backup.version || !backup.timestamp) {
                    throw new Error('Invalid backup file')
                }

                // Save to localStorage
                localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))

                // Restore it
                const restored = restoreFromLocalBackup()
                resolve(restored)
            } catch (error) {
                reject(error)
            }
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
    })
}

/**
 * Cek kapan terakhir backup
 */
export const getLastBackupTime = () => {
    try {
        const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY)
        if (!timestamp) return null

        return new Date(parseInt(timestamp))
    } catch {
        return null
    }
}

/**
 * Cek apakah perlu backup (lebih dari 10 menit sejak terakhir)
 */
export const needsBackup = () => {
    const lastBackup = getLastBackupTime()
    if (!lastBackup) return true

    return Date.now() - lastBackup.getTime() > AUTO_BACKUP_INTERVAL
}

/**
 * Auto backup jika sudah waktunya
 */
export const autoBackupIfNeeded = (userData = {}) => {
    if (needsBackup()) {
        createLocalBackup(userData)
        return true
    }
    return false
}

/**
 * Dapatkan info backup
 */
export const getBackupInfo = () => {
    try {
        const backup = localStorage.getItem(BACKUP_KEY)
        const lastBackup = getLastBackupTime()

        return {
            hasBackup: !!backup,
            lastBackupTime: lastBackup ? lastBackup.toLocaleString() : 'Belum pernah',
            backupAge: lastBackup ? Math.round((Date.now() - lastBackup.getTime()) / 60000) + ' menit' : 'N/A',
            needsBackup: needsBackup()
        }
    } catch {
        return {
            hasBackup: false,
            lastBackupTime: 'Error',
            backupAge: 'N/A',
            needsBackup: true
        }
    }
}

// Auto backup setiap 10 menit jika window tersedia
if (typeof window !== 'undefined') {
    setInterval(() => {
        autoBackupIfNeeded()
    }, AUTO_BACKUP_INTERVAL)
}

export default {
    createBackup: createLocalBackup,
    restore: restoreFromLocalBackup,
    exportFile: exportBackupFile,
    importFile: importBackupFile,
    getLastBackupTime,
    needsBackup,
    autoBackup: autoBackupIfNeeded,
    getInfo: getBackupInfo
}
