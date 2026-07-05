// @ts-check
import { test, expect } from '@playwright/test'

/**
 * E2E Test: Error Handling (Simplified)
 */

// GANTI DENGAN CREDENTIALS YANG VALID
// GANTI DENGAN CREDENTIALS YANG VALID
const CREDENTIALS = {
    username: process.env.VITE_TEST_EMAIL || 'admin',
    password: process.env.VITE_TEST_PASSWORD || 'admin123'
}

test.describe('Login Error Handling', () => {
    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('domcontentloaded')

        // Wrong credentials
        await page.locator('.input-group input').first().fill('wronguser')
        await page.locator('.password-field input').fill('wrongpass')
        await page.locator('button.btn-primary').click()

        // Error should appear
        await expect(page.locator('.alert.error')).toBeVisible({ timeout: 10000 })
    })
})

test.describe('Empty Search Results', () => {
    test('should handle empty search gracefully', async ({ page }) => {
        // Login
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        // Go to santri and search nonsense
        await page.goto('/santri')
        await page.waitForLoadState('networkidle')

        const searchInput = page.locator('.search-input')
        if (await searchInput.isVisible()) {
            await searchInput.fill('xyznonexistent12345')
            await page.waitForTimeout(500)

            // Page still functional
            await expect(page.locator('.table-container, .santri-page')).toBeVisible()
        }
    })
})

test.describe('Modal Handling', () => {
    test('should open and close kelas modal', async ({ page }) => {
        // Login
        await page.goto('/login')
        await page.locator('.input-group input').first().fill(CREDENTIALS.username)
        await page.locator('.password-field input').fill(CREDENTIALS.password)
        await page.locator('button.btn-primary').click()
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })

        // Go to kelas
        await page.goto('/kelas')
        await page.waitForLoadState('networkidle')

        // Open modal
        const addButton = page.locator('button:has-text("Tambah")')
        if (await addButton.isVisible()) {
            await addButton.click()
            await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 })

            // Close modal
            const closeButton = page.locator('.modal-close, button:has-text("Batal")').first()
            await closeButton.click()

            // Modal closed
            await expect(page.locator('.modal-overlay.active')).not.toBeVisible({ timeout: 3000 })
        }
    })
})

test.describe('Responsive Design', () => {
    test('login page works on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto('/login')

        await expect(page.locator('.login-card')).toBeVisible()
    })
})
