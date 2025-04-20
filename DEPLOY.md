# Deploying Kanban Flow to Cloudflare Workers

This guide will walk you through deploying the Kanban Flow application to Cloudflare Workers using OpenNext.

## Prerequisites

1. A Cloudflare account with Workers enabled
2. Wrangler CLI installed (`npm install -g wrangler`)
3. A Supabase project set up with the required tables and RLS policies

## Setup Environment Variables

1. Create a `.dev.vars` file in the root of your project with your environment variables:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
\`\`\`

2. Add these same environment variables to your Cloudflare Workers environment:

\`\`\`bash
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
\`\`\`

## Create KV Namespace

Create a KV namespace for Next.js cache:

\`\`\`bash
wrangler kv:namespace create KV_CACHE
\`\`\`

Update the `wrangler.toml` file with the KV namespace ID from the output.

## Deploy

1. Build the application with OpenNext:

\`\`\`bash
npm run build:opennext
\`\`\`

2. Deploy to Cloudflare Workers:

\`\`\`bash
npm run deploy
\`\`\`

## Configure Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to Authentication → URL Configuration
3. Set the Site URL to your Cloudflare Workers URL (e.g., `https://kanban-flow.your-username.workers.dev`)
4. Add the same URL to the Redirect URLs list

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
\`\`\`

Let's update the auth callback route to be compatible with Cloudflare Workers:
