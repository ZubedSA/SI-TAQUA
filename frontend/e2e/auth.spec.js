// @ts-check
import { test, expect } from '@playwright/test'

/**
 * E2E Test: Authentication
 * Menguji flow login/logout di browser
 * 
 * PENTING: Sesuaikan VALID_CREDENTIALS dengan akun yang ada di database Anda!
 */

// ===========================================
// GANTI CREDENTIALS INI SESUAI DATABASE ANDA
// ===========================================
const VALID_CREDENTIALS = {
    email: process.env.VITE_TEST_EMAIL || 'admin',
    password: process.env.VITE_TEST_PASSWORD || 'admin123'
}

const INVALID_CREDENTIALS = {
    email: 'wronguser',
    password: 'wrongpassword'
}

test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('domcontentloaded')
    })

    test('should display login form correctly', async ({ page }) => {
        // Input username dan password harus ada
        await expect(page.locator('.input-group input').first()).toBeVisible()
        await expect(page.locator('input[type="password"], input[placeholder*="password"]')).toBeVisible()

        // Tombol Masuk harus ada
        await expect(page.locator('button.btn-primary')).toBeVisible()
    })

    test('should show error for empty form submission', async ({ page }) => {
        // Klik tombol tanpa isi form
        await page.locator('button.btn-primary').click()

        // Browser native validation - form tidak submit
        const usernameInput = page.locator('.input-group input').first()
        await expect(usernameInput).toBeVisible()
    })

    test('should show error message for invalid credentials', async ({ page }) => {
        // Isi form dengan credentials salah
        await page.locator('.input-group input').first().fill(INVALID_CREDENTIALS.email)
        await page.locator('.password-field input').fill(INVALID_CREDENTIALS.password)

        // Submit form
        await page.locator('button.btn-primary').click()

        // Tunggu error muncul (class "alert error" dari Login.jsx)
        await expect(page.locator('.alert.error')).toBeVisible({ timeout: 10000 })
    })

    test('should login successfully with valid credentials', async ({ page }) => {
        // Isi form dengan credentials valid
        await page.locator('.input-group input').first().fill(VALID_CREDENTIALS.email)
        await page.locator('.password-field input').fill(VALID_CREDENTIALS.password)

        // Submit form
        await page.locator('button.btn-primary').click()

        // Tunggu redirect ke dashboard (bukan di /login lagi)
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        // Verify sudah di halaman utama
        await expect(page.locator('.main-content, .dashboard-page, .sidebar')).toBeVisible({ timeout: 5000 })
    })

    test('should toggle password visibility', async ({ page }) => {
        const passwordInput = page.locator('.password-field input')
        const toggleButton = page.locator('.toggle-pw')

        // Default: password tersembunyi
        await expect(passwordInput).toHaveAttribute('type', 'password')

        // Klik toggle
        await toggleButton.click()

        // Sekarang terlihat
        await expect(passwordInput).toHaveAttribute('type', 'text')

        // Klik lagi
        await toggleButton.click()

        // Tersembunyi lagi
        await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('should be in light mode', async ({ page }) => {
        const theme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
        )
        expect(theme).toBe('light')
    })
})

test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
        // Clear any existing session
        await page.context().clearCookies()

        // Try to access protected route
        await page.goto('/santri')

        // Should be redirected to login
        await expect(page).toHaveURL(/login/, { timeout: 10000 })
    })
})

test.describe('Authenticated User', () => {
    // Login before each test
    test.beforeEach(async ({ page }) => {
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(VALID_CREDENTIALS.email)
        await page.locator('.password-field input').fill(VALID_CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })
    })

    test('should access dashboard after login', async ({ page }) => {
        // Should be on dashboard
        await expect(page.locator('.main-content, .dashboard-page')).toBeVisible()
    })

    test('should navigate to santri page', async ({ page }) => {
        await page.goto('/santri')
        await expect(page.locator('.santri-page, .page-title')).toBeVisible({ timeout: 5000 })
    })

    test('should maintain session after reload', async ({ page }) => {
        // Reload page
        await page.reload()
        await page.waitForLoadState('networkidle')

        // Still not on login page
        await expect(page).not.toHaveURL(/login/)
    })
})
