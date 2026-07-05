/**
 * Unit Test: Form Validation
 * Menguji fungsi validasi form yang umum digunakan
 */

import { describe, it, expect, vi } from 'vitest'

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Validasi email format
 */
const validateEmail = (email) => {
    if (!email) return { valid: false, message: 'Email wajib diisi' }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Format email tidak valid' }
    }
    return { valid: true, message: '' }
}

/**
 * Validasi password
 */
const validatePassword = (password) => {
    if (!password) return { valid: false, message: 'Password wajib diisi' }
    if (password.length < 6) {
        return { valid: false, message: 'Password minimal 6 karakter' }
    }
    return { valid: true, message: '' }
}

/**
 * Validasi required field
 */
const validateRequired = (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return { valid: false, message: `${fieldName} wajib diisi` }
    }
    return { valid: true, message: '' }
}

/**
 * Validasi nomor telepon Indonesia
 */
const validatePhone = (phone) => {
    if (!phone) return { valid: true, message: '' } // Optional
    const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
        return { valid: false, message: 'Format nomor telepon tidak valid' }
    }
    return { valid: true, message: '' }
}

/**
 * Validasi NIS/NIP (hanya angka)
 */
const validateNIS = (nis) => {
    if (!nis) return { valid: false, message: 'NIS wajib diisi' }
    if (!/^\d+$/.test(nis)) {
        return { valid: false, message: 'NIS hanya boleh berisi angka' }
    }
    return { valid: true, message: '' }
}

// ============================================
// Unit Tests
// ============================================

describe('Email Validation', () => {
    it('should return invalid for empty email', () => {
        const result = validateEmail('')
        expect(result.valid).toBe(false)
        expect(result.message).toBe('Email wajib diisi')
    })

    it('should return invalid for null email', () => {
        const result = validateEmail(null)
        expect(result.valid).toBe(false)
    })

    it('should return invalid for malformed email', () => {
        const invalidEmails = [
            'test',
            'test@',
            '@domain.com',
            'test@domain',
            'test.domain.com',
            'test@@domain.com'
        ]

        invalidEmails.forEach(email => {
            const result = validateEmail(email)
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Format email tidak valid')
        })
    })

    it('should return valid for correct email format', () => {
        const validEmails = [
            'test@example.com',
            'user.name@domain.co.id',
            'admin@ptqa.sch.id',
            'user+tag@gmail.com'
        ]

        validEmails.forEach(email => {
            const result = validateEmail(email)
            expect(result.valid).toBe(true)
            expect(result.message).toBe('')
        })
    })
})

describe('Password Validation', () => {
    it('should return invalid for empty password', () => {
        const result = validatePassword('')
        expect(result.valid).toBe(false)
        expect(result.message).toBe('Password wajib diisi')
    })

    it('should return invalid for password less than 6 characters', () => {
        const shortPasswords = ['12345', 'abc', '1']

        shortPasswords.forEach(password => {
            const result = validatePassword(password)
            expect(result.valid).toBe(false)
            expect(result.message).toBe('Password minimal 6 karakter')
        })
    })

    it('should return valid for password with 6 or more characters', () => {
        const validPasswords = ['123456', 'password123', 'SecurePass!@#']

        validPasswords.forEach(password => {
            const result = validatePassword(password)
            expect(result.valid).toBe(true)
        })
    })
})

describe('Required Field Validation', () => {
    it('should return invalid for empty string', () => {
        const result = validateRequired('', 'Nama')
        expect(result.valid).toBe(false)
        expect(result.message).toBe('Nama wajib diisi')
    })

    it('should return invalid for whitespace only', () => {
        const result = validateRequired('   ', 'Alamat')
        expect(result.valid).toBe(false)
        expect(result.message).toBe('Alamat wajib diisi')
    })

    it('should return invalid for null/undefined', () => {
        expect(validateRequired(null, 'Field').valid).toBe(false)
        expect(validateRequired(undefined, 'Field').valid).toBe(false)
    })

    it('should return valid for non-empty value', () => {
        const result = validateRequired('Ahmad', 'Nama')
        expect(result.valid).toBe(true)
    })
})

describe('Phone Validation', () => {
    it('should return valid for empty phone (optional)', () => {
        const result = validatePhone('')
        expect(result.valid).toBe(true)
    })

    it('should return valid for correct Indonesian phone formats', () => {
        const validPhones = [
            '081234567890',
            '6281234567890',
            '+6281234567890',
            '0812-3456-7890'
        ]

        validPhones.forEach(phone => {
            const result = validatePhone(phone)
            expect(result.valid).toBe(true)
        })
    })

    it('should return invalid for wrong phone format', () => {
        const invalidPhones = [
            '1234567',        // Too short
            'abcdefghijk',    // Not numbers
            '+11234567890'    // Not Indonesian
        ]

        invalidPhones.forEach(phone => {
            const result = validatePhone(phone)
            expect(result.valid).toBe(false)
        })
    })
})

describe('NIS/NIP Validation', () => {
    it('should return invalid for empty NIS', () => {
        const result = validateNIS('')
        expect(result.valid).toBe(false)
        expect(result.message).toBe('NIS wajib diisi')
    })

    it('should return invalid for NIS with letters', () => {
        const result = validateNIS('123ABC')
        expect(result.valid).toBe(false)
        expect(result.message).toBe('NIS hanya boleh berisi angka')
    })

    it('should return valid for numeric NIS', () => {
        const result = validateNIS('12345678')
        expect(result.valid).toBe(true)
    })
})
