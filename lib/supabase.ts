import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, validateEnv } from "./env"

// Validate environment variables
if (typeof window !== "undefined") {
  validateEnv()
}

// Regular client for read operations
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase environment variables")
  }

  supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storageKey: "kanban-flow-auth",
    },
  })

  return supabaseClient
}

// Admin client for write operations (bypasses RLS)
let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function getAdminClient() {
  if (adminClient) return adminClient

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase admin environment variables")
    // Fallback to regular client if service role key is not available
    return getSupabaseClient()
  }

  adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  return adminClient
}

// Browser-only client for auth operations
export const supabaseBrowserClient = typeof window !== "undefined" ? getSupabaseClient() : null
