import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    // Directory untuk test files
    testDir: './e2e',

    // Timeout per test
    timeout: 30000,

    // Expect timeout
    expect: {
        timeout: 5000
    },

    // Run tests in files in parallel
    fullyParallel: true,

    // Fail build on CI if you left test.only in the code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Workers - paralel execution
    workers: process.env.CI ? 1 : undefined,

    // Reporter configuration
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list']
    ],

    // Shared settings for all projects
    use: {
        // Base URL untuk testing
        baseURL: 'http://localhost:5173',

        // Collect trace on first retry
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'on-first-retry',

        // Viewport default
        viewport: { width: 1280, height: 720 },

        // Action timeout
        actionTimeout: 10000,

        // Navigation timeout
        navigationTimeout: 15000
    },

    // Projects - Browser configurations
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment untuk test mobile
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
    ],

    // Web server untuk local development
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    },
})
