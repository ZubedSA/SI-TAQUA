// @ts-check
import { test, expect } from '@playwright/test'

/**
 * E2E Test: CRUD Operations (Simplified)
 * Tests yang tidak memerlukan login ke halaman protected
 */

// =============================================
// GANTI CREDENTIALS INI SESUAI DATABASE ANDA!
// =============================================
const CREDENTIALS = {
    username: 'admin',     // Username valid di database
    password: 'admin123'   // Password valid
}

test.describe('Login Flow', () => {
    test('should login and access santri page', async ({ page }) => {
        // 1. Ke halaman login
        await page.goto('/login')
        await page.waitForLoadState('domcontentloaded')

        // 2. Isi form login
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)

        // 3. Submit
        await page.locator('button.btn-primary').click()

        // 4. Tunggu keluar dari login page
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        // 5. Navigate ke santri
        await page.goto('/santri')
        await page.waitForLoadState('networkidle')

        // 6. Verify page loaded
        await expect(page.locator('.page-title, .santri-page')).toBeVisible({ timeout: 10000 })
    })

    test('should login and access guru page', async ({ page }) => {
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        await page.goto('/guru')
        await page.waitForLoadState('networkidle')
        await expect(page.locator('.page-title, .guru-page')).toBeVisible({ timeout: 10000 })
    })

    test('should login and access kelas page', async ({ page }) => {
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        await page.goto('/kelas')
        await page.waitForLoadState('networkidle')
        await expect(page.locator('.page-title, .kelas-page')).toBeVisible({ timeout: 10000 })
    })

    test('should login and access hafalan page', async ({ page }) => {
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        await page.goto('/hafalan')
        await page.waitForLoadState('networkidle')
        await expect(page.locator('.page-title, .hafalan-page')).toBeVisible({ timeout: 10000 })
    })

    test('should login and access mapel page', async ({ page }) => {
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        await page.goto('/mapel')
        await page.waitForLoadState('networkidle')
        await expect(page.locator('.page-title, .mapel-page')).toBeVisible({ timeout: 10000 })
    })
})

test.describe('Search Functionality', () => {
    test('should search in santri page', async ({ page }) => {
        // Login
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        // Go to santri
        await page.goto('/santri')
        await page.waitForLoadState('networkidle')

        // Search
        const searchInput = page.locator('.search-input')
        if (await searchInput.isVisible()) {
            await searchInput.fill('test')
            await page.waitForTimeout(500)
            await expect(page.locator('.table-container')).toBeVisible()
        }
    })
})
