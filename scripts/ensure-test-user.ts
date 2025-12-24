import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Use new Secret Key (starts with sb_secret_)
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'homekeep.test.user.v2@gmail.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

async function main() {
    if (!SUPABASE_URL) {
        console.error('Error: EXPO_PUBLIC_SUPABASE_URL is required.');
        process.exit(1);
    }

    // Use secret key if available (preferred for creating verified users)
    // Otherwise fall back to publishable key
    const supabaseKey = SECRET_KEY || PUBLISHABLE_KEY;
    if (!supabaseKey) {
        console.error('Error: No Supabase key found (SUPABASE_SECRET_KEY or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, supabaseKey);

    console.log(`Checking for test user: ${TEST_EMAIL}...`);

    // 1. Try to sign in to see if user exists
    // We intentionally skip the early exit to FORCE update the password
    // This ensures that if the local env was messed up, we reset it to a known good state.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (!signInError && signInData.user) {
        console.log('User exists. Ensuring password is up to date...');
    }

    // 2. If login failed, user might not exist OR authentication failed.
    // Note: standard signIn doesn't tell us if user exists or not specifically for security, 
    // but if we are admin we can check.

    if (SECRET_KEY) {
        // Admin path
        console.log('Using Secret Key to manage user...');

        // List users to check if email exists (signIn might fail due to bad password)
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Failed to list users:', listError);
            process.exit(1);
        }

        const existingUser = users.find(u => u.email === TEST_EMAIL);

        if (existingUser) {
            console.log('User exists but login failed. Updating password...');
            const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                password: TEST_PASSWORD,
                email_confirm: true // Ensure confirmed
            });

            if (updateError) {
                console.error('Failed to update user password:', updateError);
                process.exit(1);
            }
            console.log('✅ User password updated and verified.');
        } else {
            console.log('Creating new verified user...');
            const { error: createError } = await supabase.auth.admin.createUser({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                email_confirm: true
            });
            if (createError) {
                console.error('Failed to create user:', createError);
                process.exit(1);
            }
            console.log('✅ Verified test user created.');
        }

    } else {
        // Public client path
        console.log('⚠️ SUPABASE_SECRET_KEY not found. Using Public Client.');
        console.log('Attempting to sign up...');

        const { data, error: signUpError } = await supabase.auth.signUp({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });

        if (signUpError) {
            console.error('Sign up failed JSON:', JSON.stringify(signUpError, null, 2));
            // Common error: User already registered.
            process.exit(1);
        }

        if (data.session) {
            console.log('✅ Test user created and logged in (session active).');
        } else if (data.user) {
            console.log('✅ Test user created.');
            console.warn('⚠️ User may require email verification. Check your Supabase Dashboard "Authentication" -> "Providers" -> "Email" settings.');
            console.warn('   If "Confirm Email" is ON, you must verify this user manually in the dashboard.');
        }
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
