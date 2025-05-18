import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Factory for browser client with Clerk session token
export function createClerkSupabaseClient(sessionToken: string | null): SupabaseClient<Database> {
  return createJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
      },
    }
  )
}

// Helper for server-side/edge only
function getServerEnvVar(name: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { env?: Record<string, string> }).env && (globalThis as unknown as { env?: Record<string, string> }).env[name]) {
    return (globalThis as unknown as { env?: Record<string, string> }).env[name];
  }
  return '';
}

// Server (service role) Supabase client factory - uses base client
export function supabaseAdminClient(): SupabaseClient<Database> {
  const serviceKey =
    getServerEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!serviceKey || !url) {
    console.error('Missing service role key or URL for admin client');
    throw new Error('Admin client requires SUPABASE_SERVICE_ROLE_KEY');
  }
  return createJsClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// Deprecated dynamic environment helper and validation removed
