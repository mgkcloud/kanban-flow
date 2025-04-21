# Deploying Kanban Flow to Cloudflare Workers

This guide provides comprehensive instructions for deploying the Kanban Flow application to Cloudflare Workers using OpenNext and Next.js 15.

## Prerequisites

1. A Cloudflare account with Workers enabled (paid plan recommended for production)
2. Wrangler CLI v3.99+ (`npm install -g wrangler@latest`)
3. A Supabase project with required tables and RLS policies
4. Node.js 16.x or later

## Local Development Setup

1. Create a `.dev.vars` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXTJS_ENV=development
NODE_ENV=development
OPEN_NEXT_DEBUG=false
```

2. Start the development server:

```bash
npm run dev
```

## Resource Setup (Production)

### Create KV Namespace for Next.js Cache

```bash
wrangler kv:namespace create KV_CACHE
```

Take note of the KV namespace ID output and update it in your `wrangler.toml` file.

### Create R2 Bucket for Incremental Static Regeneration (ISR)

```bash
wrangler r2 bucket create kanban-flow-inc-cache
```

This bucket will store the incremental static regeneration (ISR) cache.

### Configure Environment Variables

Add production environment variables to Cloudflare using Wrangler:

```bash
# Public variables (client-accessible)
wrangler vars set NEXT_PUBLIC_SUPABASE_URL "your-supabase-url"
wrangler vars set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-supabase-anon-key"

# Secret variables (server-only)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put POSTGRES_URL
wrangler secret put POSTGRES_PRISMA_URL
wrangler secret put POSTGRES_URL_NON_POOLING
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put POSTGRES_USER
wrangler secret put POSTGRES_PASSWORD
wrangler secret put POSTGRES_DATABASE
wrangler secret put POSTGRES_HOST
```

## Build and Deploy

1. Build the application with OpenNext:

```bash
npm run build
```

2. Preview the build locally:

```bash
npm run preview
```

3. Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Configuration Files

### wrangler.toml

Key components of the wrangler.toml file:

```toml
name = "kanban-flow"
main = ".open-next/worker.js"
compatibility_date = "2025-04-20"
compatibility_flags = [ 
  "nodejs_compat", 
  "brotli_content_encoding"
]

# Bind KV namespace for cache
[[kv_namespaces]]
binding = "KV_CACHE"
id = "your-kv-namespace-id"

# Bind R2 bucket for ISR
[[r2_buckets]]
binding = "NEXT_INC_CACHE_R2_BUCKET"
bucket_name = "kanban-flow-inc-cache"

# Configure public environment variables
[vars]
NODE_ENV = "production"
NEXT_PUBLIC_SUPABASE_URL = "your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-supabase-anon-key"

# Add warm-up cron to reduce cold starts
[triggers]
crons = ["*/10 * * * *"]
```

### open-next.config.ts

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

## Security Best Practices

1. **Environment Variables**: Never commit sensitive credentials to your repository. Use Wrangler secrets for all sensitive data.

2. **CORS Configuration**: Configure Supabase for proper CORS:
   - Go to your Supabase dashboard → API → Settings
   - Add your Cloudflare Workers URL to the allowed origins

3. **Content Security Policy**: Configure CSP headers in your middleware:

```typescript
// middleware.ts
app.use((req, res, next) => {
  res.headers.set('Content-Security-Policy', "default-src 'self'; connect-src 'self' https://your-supabase-url");
  next();
});
```

4. **Outbound Request Allowlist**: Restrict outbound requests in wrangler.toml:

```toml
[outbound_allowlist]
hostnames = [
  "your-supabase-hostname.supabase.co",
  "aws-pooler.supabase.com"
]
```

## Configuring Supabase Auth

1. Go to your Supabase project dashboard → Authentication → URL Configuration
2. Set the Site URL to your Cloudflare Workers URL (e.g., `https://kanban-flow.workers.dev`)
3. Add the same URL to the Redirect URLs list
4. Ensure Row Level Security (RLS) policies are properly configured

## Performance Optimization

1. **Edge Caching**: Utilize the `Cache-Control` headers in `next.config.mjs` for optimal CDN caching:

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=600',
        },
      ],
    },
  ];
}
```

2. **Worker Size Limits**: Monitor your worker size (3MB limit on free plans, 15MB on paid plans)
   - Remove unused dependencies
   - Consider code splitting for large components
   - Use dynamic imports for less commonly used functionality

3. **Cold Start Optimization**: The cron trigger in `wrangler.toml` runs every 10 minutes to reduce cold starts

## Monitoring and Troubleshooting

1. **Logs**: View logs using Wrangler:

```bash
wrangler tail
```

2. **Common Issues**:

- **Headers already sent error**: Make sure your middleware doesn't modify headers after they've been sent
- **Environment variable undefined**: Check that all required variables are set in Cloudflare dashboard
- **CORS errors**: Verify Supabase CORS settings include your worker domain
- **Worker size limits**: If your worker exceeds size limits, reduce dependencies or upgrade to paid plan
- **R2 access errors**: Verify R2 bucket permissions are correctly set

## Updating Your Deployment

1. Make changes to your codebase
2. Rebuild and redeploy:

```bash
npm run build
npm run deploy
```

3. Verify your changes in production

For more information, refer to the [OpenNext Cloudflare documentation](https://github.com/opennextjs/cloudflare) and [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/).

## Troubleshooting

### CORS Issues

If you encounter CORS issues, make sure your Supabase project has the correct CORS configuration:

1. Go to your Supabase project dashboard
2. Navigate to API → Settings → API Settings
3. Add your Cloudflare Workers URL to the "Additional allowed CORS origins" list

### Worker Size Limits

If your worker exceeds the size limit (1MB for free accounts), consider:

- Removing unused dependencies
- Splitting your application into multiple workers
- Upgrading to a paid Cloudflare Workers plan

### Database Connection Issues

Ensure your RLS policies are correctly set up and that your service role key has the necessary permissions.

Let's update the auth callback route to be compatible with Cloudflare Workers:
