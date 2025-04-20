// Helper function to get environment variables in a Cloudflare Workers-compatible way
export function getEnv(key: string, defaultValue = ""): string {
  // For Cloudflare Workers
  if (typeof process === "undefined") {
    return (globalThis as any).process?.env?.[key] || defaultValue
  }

  // For Node.js
  return process.env[key] || defaultValue
}

// Supabase environment variables
export const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL")
export const SUPABASE_ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
export const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY")

// Validate required environment variables
export function validateEnv() {
  const required = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: SUPABASE_URL },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: SUPABASE_ANON_KEY },
  ]

  const missing = required.filter(({ value }) => !value)

  if (missing.length > 0) {
    const missingKeys = missing.map(({ key }) => key).join(", ")
    throw new Error(`Missing required environment variables: ${missingKeys}`)
  }
}
