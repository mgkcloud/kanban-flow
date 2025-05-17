# Kanban Flow (Next.js + OpenNext + Cloudflare)

This project is a Next.js application deployed to Cloudflare Workers using the OpenNext adapter. It follows 2025 best practices for configuration, deployment, and local development.

## Environment Variables

- Use `.env` for base environment variables.
- Use `.env.development` for development-specific variables.
- Example:
  - `NEXT_PUBLIC_SAMPLE_VAR=base-value` in `.env`
  - `NEXT_PUBLIC_SAMPLE_VAR=dev-value` in `.env.development`
- Do **not** commit secrets to these files.

## Scripts

| Script             | Description                                                      |
|-------------------|------------------------------------------------------------------|
| build             | Build the Next.js app                                             |
| dev               | Run Next.js development server                                    |
| wrangler:preview  | Preview the app locally in the Cloudflare Workers runtime         |
| wrangler:deploy   | Deploy the app to Cloudflare Workers                              |
| wrangler:types    | Generate Cloudflare environment type definitions                  |
| lint              | Run Next.js linting                                               |
| test              | Run Jest tests                                                    |

## Local Development

- Use `npm run dev` for rapid local development with Next.js.
- Use `npm run wrangler:preview` to test in the Cloudflare Workers runtime.
- Use `.dev.vars` to set `NEXTJS_ENV=development` for local Worker runs.

## Deployment

- Use `npm run build` to build the Next.js app.
- Use `npm run wrangler:deploy` to deploy to Cloudflare Workers.

## Clerk Session Best Practices

- **Session Duration:**
  - In the Clerk dashboard, set the session expiration to the maximum allowed (e.g., 30, 60, or 90 days) for long-lived, seamless user sessions.
  - Enable "persistent sessions" or "remember me" if available.
- **Single vs. Multi-Session Mode:**
  - By default, Clerk uses single-session mode (one session per user per browser). If you want to allow multiple sessions (e.g., different users in different tabs), enable multi-session mode in the Clerk dashboard.
- **App Logic:**
  - The app will never attempt to sign in or sign up if a session already exists. Users are redirected to the dashboard if already signed in.

For more details, see the official OpenNext and Cloudflare documentation.

## Development Clerk Bypass

For automated testing or local development without Clerk, set the following environment variables in `.env.development`:

```
NEXT_PUBLIC_BYPASS_CLERK=true
NEXT_PUBLIC_DEV_USER_EMAIL=will@feistyagency.com
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

This bypasses Clerk authentication and uses the provided Supabase service role key to authenticate requests.
