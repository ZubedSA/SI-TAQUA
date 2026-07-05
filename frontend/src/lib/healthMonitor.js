/**
 * Health Monitor - System health checking
 * Untuk memantau status web dan server
 */

import { supabase } from './supabase'

// Health check interval (30 detik)
const HEALTH_CHECK_INTERVAL = 30 * 1000

// Status enum
export const HealthStatus = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy',
    UNKNOWN: 'unknown'
}

// Store untuk health status
let currentHealth = {
    status: HealthStatus.UNKNOWN,
    lastCheck: null,
    details: {}
}

let healthListeners = []

/**
 * Cek koneksi ke Supabase
 */
export const checkSupabaseConnection = async () => {
    const start = Date.now()

    try {
        // Simple query untuk test koneksi
        const { error } = await supabase
            .from('semester')
            .select('id')
            .limit(1)

        const latency = Date.now() - start

        return {
            status: error ? HealthStatus.UNHEALTHY : HealthStatus.HEALTHY,
            latency,
            error: error?.message || null
        }
    } catch (error) {
        return {
            status: HealthStatus.UNHEALTHY,
            latency: Date.now() - start,
            error: error.message
        }
    }
}

/**
 * Cek status auth
 */
export const checkAuthHealth = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession()

        return {
            status: error ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
            hasSession: !!session,
            error: error?.message || null
        }
    } catch (error) {
        return {
            status: HealthStatus.UNHEALTHY,
            hasSession: false,
            error: error.message
        }
    }
}

/**
 * Cek memory usage (browser)
 */
export const checkMemoryUsage = () => {
    try {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize
            const total = performance.memory.jsHeapSizeLimit
            const percentage = Math.round((used / total) * 100)

            return {
                status: percentage > 90 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
                usedMB: Math.round(used / 1024 / 1024),
                totalMB: Math.round(total / 1024 / 1024),
                percentage
            }
        }

        return {
            status: HealthStatus.UNKNOWN,
            message: 'Memory API not available'
        }
    } catch {
        return { status: HealthStatus.UNKNOWN }
    }
}

/**
 * Cek Supabase database usage (estimated by row counts)
 */
export const checkStorageUsage = async () => {
    try {
        // Query row counts from main tables
        const tables = ['santri', 'guru', 'hafalan', 'nilai', 'presensi', 'kelas', 'mapel', 'halaqoh']
        let totalRows = 0
        let tableStats = {}

        for (const table of tables) {
            try {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true })

                if (!error && count !== null) {
                    tableStats[table] = count
                    totalRows += count
                }
            } catch {
                tableStats[table] = 0
            }
        }

        // Estimate storage (rough estimate: ~1KB per row average)
        const estimatedKB = Math.round(totalRows * 1)
        // Supabase free tier: 500MB database limit
        const limitKB = 500 * 1024
        const percentage = Math.round((estimatedKB / limitKB) * 100)

        return {
            status: percentage > 80 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
            usedKB: estimatedKB,
            limitKB,
            percentage,
            totalRows,
            tableStats,
            source: 'supabase'
        }
    } catch (error) {
        console.error('Storage check error:', error)
        return {
            status: HealthStatus.UNKNOWN,
            error: error.message,
            source: 'supabase'
        }
    }
}

/**
 * Cek network status
 */
export const checkNetworkStatus = () => {
    return {
        status: navigator.onLine ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        online: navigator.onLine,
        type: navigator.connection?.effectiveType || 'unknown',
        downlink: navigator.connection?.downlink || 0
    }
}

/**
 * Run full health check
 */
export const runHealthCheck = async () => {
    const checks = {}

    // Network
    checks.network = checkNetworkStatus()

    // Memory
    checks.memory = checkMemoryUsage()

    // Supabase (only if online)
    if (navigator.onLine) {
        checks.database = await checkSupabaseConnection()
        checks.auth = await checkAuthHealth()
        // Storage now queries Supabase
        checks.storage = await checkStorageUsage()
    } else {
        checks.database = { status: HealthStatus.UNKNOWN, error: 'Offline' }
        checks.auth = { status: HealthStatus.UNKNOWN, error: 'Offline' }
        checks.storage = { status: HealthStatus.UNKNOWN, error: 'Offline', usedKB: 0, percentage: 0 }
    }

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status)

    let overallStatus = HealthStatus.HEALTHY
    if (statuses.includes(HealthStatus.UNHEALTHY)) {
        overallStatus = HealthStatus.UNHEALTHY
    } else if (statuses.includes(HealthStatus.DEGRADED)) {
        overallStatus = HealthStatus.DEGRADED
    } else if (statuses.every(s => s === HealthStatus.UNKNOWN)) {
        overallStatus = HealthStatus.UNKNOWN
    }

    currentHealth = {
        status: overallStatus,
        lastCheck: new Date().toISOString(),
        details: checks
    }

    // Notify listeners
    healthListeners.forEach(fn => fn(currentHealth))

    console.log('[Health Monitor]', overallStatus, checks)

    return currentHealth
}

/**
 * Get current health status
 */
export const getHealthStatus = () => currentHealth

/**
 * Subscribe to health changes
 */
export const subscribeToHealth = (callback) => {
    healthListeners.push(callback)

    // Return unsubscribe function
    return () => {
        healthListeners = healthListeners.filter(fn => fn !== callback)
    }
}

/**
 * Get health summary for display
 */
export const getHealthSummary = () => {
    const { status, lastCheck, details } = currentHealth

    const issues = []

    if (details.network?.status === HealthStatus.UNHEALTHY) {
        issues.push('Tidak ada koneksi internet')
    }
    if (details.database?.status === HealthStatus.UNHEALTHY) {
        issues.push('Database tidak dapat diakses')
    }
    if (details.storage?.percentage > 80) {
        issues.push(`Database hampir penuh (${details.storage.percentage}% - ${details.storage.totalRows} data)`)
    }
    if (details.memory?.percentage > 90) {
        issues.push('Memory usage tinggi')
    }

    return {
        status,
        statusText: {
            [HealthStatus.HEALTHY]: '✅ Sistem Sehat',
            [HealthStatus.DEGRADED]: '⚠️ Performa Menurun',
            [HealthStatus.UNHEALTHY]: '❌ Ada Masalah',
            [HealthStatus.UNKNOWN]: '❓ Status Tidak Diketahui'
        }[status],
        lastCheck: lastCheck ? new Date(lastCheck).toLocaleTimeString() : 'Belum dicek',
        issues,
        details
    }
}

// Auto health check setiap 30 detik
let healthCheckInterval = null

export const startHealthMonitoring = () => {
    if (healthCheckInterval) return

    // Initial check
    runHealthCheck()

    // Periodic checks
    healthCheckInterval = setInterval(runHealthCheck, HEALTH_CHECK_INTERVAL)

    // Listen to online/offline events
    window.addEventListener('online', runHealthCheck)
    window.addEventListener('offline', runHealthCheck)

    console.log('[Health Monitor] Started')
}

export const stopHealthMonitoring = () => {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval)
        healthCheckInterval = null
    }

    window.removeEventListener('online', runHealthCheck)
    window.removeEventListener('offline', runHealthCheck)

    console.log('[Health Monitor] Stopped')
}

export default {
    HealthStatus,
    runHealthCheck,
    getStatus: getHealthStatus,
    getSummary: getHealthSummary,
    subscribe: subscribeToHealth,
    start: startHealthMonitoring,
    stop: stopHealthMonitoring,
    checkNetwork: checkNetworkStatus,
    checkDatabase: checkSupabaseConnection,
    checkAuth: checkAuthHealth,
    checkStorage: checkStorageUsage,
    checkMemory: checkMemoryUsage
}
