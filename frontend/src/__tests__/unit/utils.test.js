/**
 * Unit Test: Utility Functions
 * Menguji helper functions yang digunakan di aplikasi
 */

import { describe, it, expect, vi } from 'vitest'

// ============================================
// Utility Functions
// ============================================

/**
 * Format tanggal ke format Indonesia
 */
const formatDateID = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

/**
 * Format currency ke Rupiah
 */
const formatRupiah = (number) => {
    if (typeof number !== 'number' || isNaN(number)) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number)
}

/**
 * Truncate text dengan ellipsis
 */
const truncateText = (text, maxLength = 50) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
}

/**
 * Capitalize first letter
 */
const capitalizeFirst = (text) => {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Generate initials from name
 */
const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Sort array by property
 */
const sortByProperty = (array, property, direction = 'asc') => {
    if (!Array.isArray(array)) return []
    return [...array].sort((a, b) => {
        const valA = (a[property] || '').toString().toLowerCase()
        const valB = (b[property] || '').toString().toLowerCase()
        const comparison = valA.localeCompare(valB)
        return direction === 'desc' ? -comparison : comparison
    })
}

/**
 * Filter array by search term
 */
const filterBySearch = (array, searchTerm, properties) => {
    if (!Array.isArray(array)) return []
    if (!searchTerm) return array

    const term = searchTerm.toLowerCase()
    return array.filter(item =>
        properties.some(prop =>
            (item[prop] || '').toString().toLowerCase().includes(term)
        )
    )
}

/**
 * Debounce function
 */
const debounce = (fn, delay) => {
    let timeoutId
    return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

/**
 * Calculate age from birth date
 */
const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    if (isNaN(birth.getTime())) return null

    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
}

// ============================================
// Unit Tests
// ============================================

describe('formatDateID', () => {
    it('should return formatted date in Indonesian', () => {
        const result = formatDateID('2024-12-24')
        expect(result).toContain('Desember')
        expect(result).toContain('2024')
    })

    it('should return "-" for empty date', () => {
        expect(formatDateID('')).toBe('-')
        expect(formatDateID(null)).toBe('-')
        expect(formatDateID(undefined)).toBe('-')
    })

    it('should return "-" for invalid date', () => {
        expect(formatDateID('invalid-date')).toBe('-')
        expect(formatDateID('not a date')).toBe('-')
    })
})

describe('formatRupiah', () => {
    it('should format number to Rupiah currency', () => {
        const result = formatRupiah(1000000)
        expect(result).toContain('Rp')
        expect(result).toContain('1.000.000')
    })

    it('should return Rp 0 for invalid input', () => {
        expect(formatRupiah(null)).toBe('Rp 0')
        expect(formatRupiah('invalid')).toBe('Rp 0')
        expect(formatRupiah(NaN)).toBe('Rp 0')
    })

    it('should handle zero', () => {
        const result = formatRupiah(0)
        expect(result).toContain('0')
    })
})

describe('truncateText', () => {
    it('should truncate text longer than maxLength', () => {
        const longText = 'This is a very long text that should be truncated'
        const result = truncateText(longText, 20)
        expect(result.length).toBeLessThanOrEqual(23) // 20 + '...'
        expect(result).toContain('...')
    })

    it('should not truncate text shorter than maxLength', () => {
        const shortText = 'Short text'
        const result = truncateText(shortText, 50)
        expect(result).toBe(shortText)
    })

    it('should return empty string for empty input', () => {
        expect(truncateText('')).toBe('')
        expect(truncateText(null)).toBe('')
    })
})

describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
        expect(capitalizeFirst('hello')).toBe('Hello')
        expect(capitalizeFirst('WORLD')).toBe('World')
    })

    it('should handle empty input', () => {
        expect(capitalizeFirst('')).toBe('')
        expect(capitalizeFirst(null)).toBe('')
    })
})

describe('getInitials', () => {
    it('should return initials from full name', () => {
        expect(getInitials('Ahmad Fauzi')).toBe('AF')
        expect(getInitials('Muhammad Ali Ibrahim')).toBe('MI')
    })

    it('should return single initial for single name', () => {
        expect(getInitials('Ahmad')).toBe('A')
    })

    it('should return ? for empty name', () => {
        expect(getInitials('')).toBe('?')
        expect(getInitials(null)).toBe('?')
    })
})

describe('sortByProperty', () => {
    const data = [
        { nama: 'Candra', usia: 25 },
        { nama: 'Ahmad', usia: 30 },
        { nama: 'Budi', usia: 20 }
    ]

    it('should sort ascending by default', () => {
        const result = sortByProperty(data, 'nama', 'asc')
        expect(result[0].nama).toBe('Ahmad')
        expect(result[1].nama).toBe('Budi')
        expect(result[2].nama).toBe('Candra')
    })

    it('should sort descending when specified', () => {
        const result = sortByProperty(data, 'nama', 'desc')
        expect(result[0].nama).toBe('Candra')
        expect(result[2].nama).toBe('Ahmad')
    })

    it('should return empty array for invalid input', () => {
        expect(sortByProperty(null, 'nama')).toEqual([])
        expect(sortByProperty('not array', 'nama')).toEqual([])
    })
})

describe('filterBySearch', () => {
    const data = [
        { nama: 'Ahmad Fauzi', email: 'ahmad@test.com' },
        { nama: 'Budi Santoso', email: 'budi@test.com' },
        { nama: 'Candra Wijaya', email: 'candra@test.com' }
    ]

    it('should filter by search term', () => {
        const result = filterBySearch(data, 'ahmad', ['nama', 'email'])
        expect(result).toHaveLength(1)
        expect(result[0].nama).toBe('Ahmad Fauzi')
    })

    it('should be case insensitive', () => {
        const result = filterBySearch(data, 'BUDI', ['nama'])
        expect(result).toHaveLength(1)
    })

    it('should return all items when searchTerm is empty', () => {
        const result = filterBySearch(data, '', ['nama'])
        expect(result).toHaveLength(3)
    })
})

describe('calculateAge', () => {
    it('should calculate age from birth date', () => {
        // Test with fixed date to avoid flaky tests
        const birthDate = '2000-01-01'
        const age = calculateAge(birthDate)
        expect(age).toBeGreaterThanOrEqual(23) // As of 2024
        expect(age).toBeLessThanOrEqual(25)
    })

    it('should return null for invalid date', () => {
        expect(calculateAge('')).toBeNull()
        expect(calculateAge(null)).toBeNull()
        expect(calculateAge('invalid')).toBeNull()
    })
})

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should debounce function calls', () => {
        const mockFn = vi.fn()
        const debouncedFn = debounce(mockFn, 300)

        // Call multiple times
        debouncedFn()
        debouncedFn()
        debouncedFn()

        // Should not be called yet
        expect(mockFn).not.toHaveBeenCalled()

        // Fast-forward time
        vi.advanceTimersByTime(300)

        // Should be called once
        expect(mockFn).toHaveBeenCalledTimes(1)
    })
})
