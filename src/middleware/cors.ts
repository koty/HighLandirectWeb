/**
 * CORS middleware for CloudFlare Workers
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 本番環境では適切なドメインを設定
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export function cors(request: Request): Response | undefined {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Add CORS headers to response (handled in each route)
  return undefined
}

export function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers)
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}