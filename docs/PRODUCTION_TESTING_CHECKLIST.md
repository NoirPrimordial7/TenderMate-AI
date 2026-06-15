# Production Testing Checklist

Use these checks after each production deployment.

- Open frontend live URL: https://tender-mate-ai.vercel.app
- Open backend health URL: https://tendermate-ai-backend.onrender.com/health
- Signup a new user.
- Login with that user.
- Confirm dashboard requires login.
- Confirm history requires login.
- Confirm logout clears access and returns the user to login.
- Call a protected API without a token and confirm it returns `401 Unauthorized`.
- Call `GET https://tendermate-ai-backend.onrender.com/api/v1/auth/me` with `Authorization: Bearer <token>` and confirm it returns user data.
- Confirm Supabase `app_users` contains the new user.
- Confirm there are no frontend console CORS errors.
- Confirm no secrets are committed.
