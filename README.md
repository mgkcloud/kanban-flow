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

---

For more details, see the official OpenNext and Cloudflare documentation. 