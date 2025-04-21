import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Direct access for browser/client bundle (Next.js inlines these)
export const supabaseBrowserClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storageKey: "kanban-flow-auth",
    },
  }
)

// Helper for server-side/edge only
function getServerEnvVar(name: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).env && (globalThis as any).env[name]) {
    return (globalThis as any).env[name];
  }
  return '';
}

// Server (service role) Supabase client factory
export function supabaseAdminClient(): SupabaseClient<Database> {
  const serviceKey = getServerEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!serviceKey || !url) {
    console.error("Missing service role key or URL for admin client");
    throw new Error("Admin client requires SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(
    url,
    serviceKey,
    {
      auth: { persistSession: false }
    }
  );
}

// Deprecated dynamic environment helper and validation removed
