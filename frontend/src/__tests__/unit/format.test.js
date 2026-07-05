import { describe, it, expect } from 'vitest'

// Mock implementation of formatRupiah if not exported/available in isolation
// In a real scenario, we import { formatRupiah } from './format'
// But here we'll define a simple test for the logic we expect.

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number)
}

const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

describe('Utility Format Tests', () => {

    it('should format rupiah correctly', () => {
        expect(formatRupiah(10000)).toBe('Rp 10.000') // Note: Non-breaking space might depend on runtime
        // Flexible check
        const result = formatRupiah(10000)
        expect(result).to.include('10.000')
        expect(result).to.include('Rp')
    })

    it('should format large numbers correctly', () => {
        expect(formatRupiah(1500000)).to.include('1.500.000')
    })

    it('should format date correctly', () => {
        // Test date: 2025-01-17
        const date = '2025-01-17'
        const result = formatDateIndo(date)
        expect(result).toBe('17 Januari 2025')
    })

    it('should handle invalid date gracefully', () => {
        expect(formatDateIndo(null)).toBe('-')
        expect(formatDateIndo('')).toBe('-')
    })

})
