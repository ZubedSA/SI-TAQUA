/**
 * Cache Manager - Client-side caching system
 * Untuk mempercepat loading data dengan menyimpan di localStorage
 */

const CACHE_PREFIX = 'ptqa_cache_'
const CACHE_EXPIRY_PREFIX = 'ptqa_expiry_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 menit default

/**
 * Simpan data ke cache
 * @param {string} key - Unique key untuk data
 * @param {any} data - Data yang akan disimpan
 * @param {number} ttl - Time to live dalam milliseconds (default 5 menit)
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
    try {
        const cacheKey = CACHE_PREFIX + key
        const expiryKey = CACHE_EXPIRY_PREFIX + key
        const expiryTime = Date.now() + ttl

        localStorage.setItem(cacheKey, JSON.stringify(data))
        localStorage.setItem(expiryKey, expiryTime.toString())

        console.log(`[Cache] Saved: ${key}, expires in ${ttl / 1000}s`)
        return true
    } catch (error) {
        console.warn('[Cache] Failed to save:', error.message)
        return false
    }
}

/**
 * Ambil data dari cache
 * @param {string} key - Key data yang dicari
 * @returns {any|null} - Data atau null jika expired/tidak ada
 */
export const getCache = (key) => {
    try {
        const cacheKey = CACHE_PREFIX + key
        const expiryKey = CACHE_EXPIRY_PREFIX + key

        const expiryTime = localStorage.getItem(expiryKey)

        // Cek apakah expired
        if (!expiryTime || Date.now() > parseInt(expiryTime)) {
            // Hapus cache yang expired
            removeCache(key)
            return null
        }

        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            console.log(`[Cache] Hit: ${key}`)
            return JSON.parse(cached)
        }

        return null
    } catch (error) {
        console.warn('[Cache] Failed to get:', error.message)
        return null
    }
}

/**
 * Hapus cache tertentu
 */
export const removeCache = (key) => {
    try {
        localStorage.removeItem(CACHE_PREFIX + key)
        localStorage.removeItem(CACHE_EXPIRY_PREFIX + key)
    } catch (error) {
        console.warn('[Cache] Failed to remove:', error.message)
    }
}

/**
 * Bersihkan semua cache yang expired
 */
export const clearExpiredCache = () => {
    try {
        const keys = Object.keys(localStorage)
        let cleared = 0

        keys.forEach(key => {
            if (key.startsWith(CACHE_EXPIRY_PREFIX)) {
                const expiryTime = parseInt(localStorage.getItem(key))
                if (Date.now() > expiryTime) {
                    const dataKey = key.replace(CACHE_EXPIRY_PREFIX, '')
                    removeCache(dataKey)
                    cleared++
                }
            }
        })

        if (cleared > 0) {
            console.log(`[Cache] Cleared ${cleared} expired items`)
        }
        return cleared
    } catch (error) {
        console.warn('[Cache] Failed to clear expired:', error.message)
        return 0
    }
}

/**
 * Bersihkan semua cache PTQA
 */
export const clearAllCache = () => {
    try {
        const keys = Object.keys(localStorage)
        let cleared = 0

        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)) {
                localStorage.removeItem(key)
                cleared++
            }
        })

        console.log(`[Cache] Cleared all ${cleared} cache items`)
        return cleared
    } catch (error) {
        console.warn('[Cache] Failed to clear all:', error.message)
        return 0
    }
}

/**
 * Dapatkan statistik cache
 */
export const getCacheStats = () => {
    try {
        const keys = Object.keys(localStorage)
        let totalItems = 0
        let totalSize = 0
        let expiredItems = 0

        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                totalItems++
                const value = localStorage.getItem(key)
                totalSize += value ? value.length : 0
            }

            if (key.startsWith(CACHE_EXPIRY_PREFIX)) {
                const expiryTime = parseInt(localStorage.getItem(key))
                if (Date.now() > expiryTime) {
                    expiredItems++
                }
            }
        })

        return {
            totalItems,
            expiredItems,
            activeItems: totalItems - expiredItems,
            totalSizeKB: Math.round(totalSize / 1024 * 100) / 100
        }
    } catch (error) {
        return { totalItems: 0, expiredItems: 0, activeItems: 0, totalSizeKB: 0 }
    }
}

/**
 * Wrapper untuk fetch dengan caching
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function yang return data
 * @param {number} ttl - Cache duration
 */
export const fetchWithCache = async (key, fetchFn, ttl = DEFAULT_TTL) => {
    // Coba ambil dari cache dulu
    const cached = getCache(key)
    if (cached !== null) {
        return cached
    }

    // Kalau tidak ada, fetch data baru
    const data = await fetchFn()

    // Simpan ke cache
    if (data) {
        setCache(key, data, ttl)
    }

    return data
}

// Auto cleanup expired cache setiap 5 menit
if (typeof window !== 'undefined') {
    setInterval(clearExpiredCache, 5 * 60 * 1000)
}

export default {
    set: setCache,
    get: getCache,
    remove: removeCache,
    clearExpired: clearExpiredCache,
    clearAll: clearAllCache,
    stats: getCacheStats,
    fetchWithCache
}
