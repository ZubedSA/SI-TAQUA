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
 * Cek localStorage usage
 */
export const checkStorageUsage = () => {
    try {
        let totalSize = 0

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage.getItem(key).length * 2 // UTF-16
            }
        }

        const usedKB = Math.round(totalSize / 1024)
        const limitKB = 5 * 1024 // 5MB typical limit
        const percentage = Math.round((usedKB / limitKB) * 100)

        return {
            status: percentage > 80 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
            usedKB,
            limitKB,
            percentage
        }
    } catch {
        return { status: HealthStatus.UNKNOWN }
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

    // Storage
    checks.storage = checkStorageUsage()

    // Memory
    checks.memory = checkMemoryUsage()

    // Supabase (only if online)
    if (navigator.onLine) {
        checks.database = await checkSupabaseConnection()
        checks.auth = await checkAuthHealth()
    } else {
        checks.database = { status: HealthStatus.UNKNOWN, error: 'Offline' }
        checks.auth = { status: HealthStatus.UNKNOWN, error: 'Offline' }
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
        issues.push(`Storage hampir penuh (${details.storage.percentage}%)`)
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
