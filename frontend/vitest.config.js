import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        // Environment untuk React testing
        environment: 'jsdom',

        // Setup file untuk @testing-library/jest-dom
        setupFiles: ['./src/__tests__/setup.js'],

        // Include pattern untuk test files
        include: ['src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],

        // Exclude E2E tests (handled by Playwright)
        exclude: ['node_modules', 'dist', 'e2e'],

        // Global test APIs (describe, it, expect)
        globals: true,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                'src/__tests__/',
                'e2e/',
                '**/*.d.ts',
                'vite.config.js',
                'vitest.config.js',
                'playwright.config.js'
            ]
        },

        // Mock timers untuk testing
        mockReset: true,
        restoreMocks: true,

        // Timeout untuk async tests
        testTimeout: 10000
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    }
})
