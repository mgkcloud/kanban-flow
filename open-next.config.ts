// open-next.config.ts file for OpenNext with Cloudflare Workers
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// Configure OpenNext for Cloudflare Workers
export default defineCloudflareConfig({
  // Use R2 for incremental cache (required for ISR)
  incrementalCache: r2IncrementalCache,
});
