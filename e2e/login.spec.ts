import { test, expect } from '@playwright/test';
import 'dotenv/config';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect the document title to match the app
    // Expo sets this based on the current screen (e.g., 'Login' for login screen)
    await expect(page).toHaveTitle(/HomeKeep|Login|React Native Web/i);
});

test('can log in with test user', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || 'homekeep.test.user.v2@gmail.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    // Log browser console/errors for debugging (visible in test output)
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    await page.goto('/');

    // Wait for load
    // Depending on your auth state handling, you might see a login screen or home screen.
    // This test assumes we start at a login screen or can get to one.

    // Example locators - ADJUST THESE TO MATCH YOUR UI
    // We use reliable accessible locators where possible.

    // Check if we are already logged in?
    // For now, let's assume clean state or having to click 'Sign In'

    // Wait for the page to fully load and check which screen we're on
    // Use waitFor with a short timeout to give the page time to render
    const loginHeader = page.getByText('Sign in to manage your home');
    try {
        await loginHeader.waitFor({ state: 'visible', timeout: 5000 });

        // Fill credentials
        await page.getByPlaceholder(/enter email/i).fill(email);
        await page.getByPlaceholder(/enter password/i).fill(password);

        // Click Sign In
        await page.getByRole('button', { name: 'Sign In', exact: true }).click();

        // Verification: Expect to see Home Screen content
        // "Focus for Today" is a reliable static text on the home screen
        await expect(page.getByText('Focus for Today')).toBeVisible({ timeout: 15000 });
    } catch {
        // Just verify we are in the app
        await expect(page.getByText('Focus for Today')).toBeVisible({ timeout: 15000 });
    }
});
