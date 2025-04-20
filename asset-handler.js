// asset-handler.js - Middleware for handling static asset requests
export async function handleAssetRequest(request, env) {
  // Check if this is a request for a static asset
  const url = new URL(request.url);
  
  // Detect if this is a request for Next.js static assets
  if (url.pathname.startsWith('/_next/static/')) {
    try {
      // Try to fetch the asset from Cloudflare's asset binding
      const assetResponse = await env.ASSETS.fetch(request.clone());
      
      // If asset is found, return it
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
      
      console.error(`Static asset not found: ${url.pathname}`);
      
      // Add cache control headers to prevent future 404s for this asset
      return new Response(`Asset not found: ${url.pathname}`, {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } catch (error) {
      console.error(`Error serving static asset: ${error.message}`);
      return new Response(`Error serving asset: ${error.message}`, { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
  }
  
  // Not a static asset request, continue normal processing
  return null;
} 