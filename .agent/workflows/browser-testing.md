---
description: How to perform browser testing with authenticated user
---

# Browser Testing Workflow

When testing the app in the browser, use the test account credentials.

## Test Credentials

```
Email: homekeep.test.user.v2@gmail.com
Password: password123
```

These are also configured in `.env.example` as:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

## Testing Steps

// turbo
1. Ensure the dev server is running: `npm run web`

2. Navigate to `http://localhost:8081` in the browser

3. If not logged in, sign in using the test credentials:
   - Click "Sign in with Email" or similar
   - Enter email: `homekeep.test.user.v2@gmail.com`
   - Enter password: `password123`
   - Submit the form

4. Wait for the home screen to load fully

5. Proceed with the specific feature testing

## Notes

- The test user has pre-configured tasks and household data
- When automating with browser_subagent, always log in first if the session is not active
- Check for login screens before attempting to interact with app features
