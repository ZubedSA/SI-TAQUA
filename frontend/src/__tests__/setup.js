/**
 * Vitest Setup File
 * Konfigurasi global untuk testing dengan React Testing Library
 */

// Import jest-dom matchers untuk DOM assertions
import '@testing-library/jest-dom'

// Mock untuk window.matchMedia (dibutuhkan untuk responsive testing)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock untuk window.scrollTo
Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
})

// Mock untuk ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

// Mock untuk IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}))

// Cleanup setelah setiap test
afterEach(() => {
    vi.clearAllMocks()
})

// Console warning/error filter untuk test cleaner output
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
    console.error = (...args) => {
        // Filter React act() warnings in tests
        if (typeof args[0] === 'string' && args[0].includes('act(')) {
            return
        }
        originalError.apply(console, args)
    }

    console.warn = (...args) => {
        // Filter known warnings
        if (typeof args[0] === 'string' && args[0].includes('React Router')) {
            return
        }
        originalWarn.apply(console, args)
    }
})

afterAll(() => {
    console.error = originalError
    console.warn = originalWarn
})
