/**
 * Environment variable utilities for Next.js on Cloudflare Workers
 * Handles both Edge and Node.js runtimes safely
 */

/**
 * Gets an environment variable with Cloudflare Workers compatibility
 * Works in both development and production environments
 */
export function getEnv(key: string, defaultValue = ""): string {
  // For Cloudflare Workers (Edge runtime)
  if (typeof process === "undefined" || !process.env) {
    // Access env from Cloudflare Workers context
    return (globalThis as unknown as { process?: { env?: Record<string, string> }; env?: Record<string, string> }).process?.env?.[key] || 
           // Fallback to global env binding in Workers
           (globalThis as unknown as { env?: Record<string, string> }).env?.[key] || 
           defaultValue;
  }

  // For Node.js runtime (development and SSR)
  return process.env[key] || defaultValue;
}

/**
 * Determines if the current environment is development
 */
export function isDevelopment(): boolean {
  return getEnv("NODE_ENV") === "development" || getEnv("NEXTJS_ENV") === "development";
}

/**
 * Determines if the current environment is production
 */
export function isProduction(): boolean {
  return getEnv("NODE_ENV") === "production";
}
