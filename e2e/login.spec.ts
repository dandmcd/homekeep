import { test, expect } from '@playwright/test';
import 'dotenv/config';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // Note: Adjust this match based on your actual app title document.title
    await expect(page).toHaveTitle(/HomeKeep|React Native Web/i);
});

test('can log in with test user', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL || 'homekeep.test.user.v2@gmail.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    // Enable debug logging
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    page.on('requestfailed', request => console.log(`FAILED REQUEST: ${request.url()} - ${request.failure()?.errorText}`));

    await page.goto('/');

    // Wait for load
    // Depending on your auth state handling, you might see a login screen or home screen.
    // This test assumes we start at a login screen or can get to one.

    // Example locators - ADJUST THESE TO MATCH YOUR UI
    // We use reliable accessible locators where possible.

    // Check if we are already logged in?
    // For now, let's assume clean state or having to click 'Sign In'

    // Check for the specific login screen text
    const loginHeader = page.getByText('Sign in to manage your home');
    if (await loginHeader.isVisible()) {
        console.log('On landing/login page');

        // Fill credentials
        await page.getByPlaceholder(/Email/i).fill(email);
        await page.getByPlaceholder(/Password/i).fill(password);

        // Click Sign In
        await page.getByRole('button', { name: 'Sign In', exact: true }).click();

        // Verification: Expect to see Home Screen content
        // "Focus for Today" is a reliable static text on the home screen
        await expect(page.getByText('Focus for Today')).toBeVisible({ timeout: 15000 });
    } else {
        console.log('Might be already logged in or on a different screen');
        // Just verify we are in the app
        await expect(page.getByText('Focus for Today')).toBeVisible();
    }
});
