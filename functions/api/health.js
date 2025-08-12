// CloudFlare Pages Function: Health check
export async function onRequest(context) {
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'CloudFlare Pages Functions'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}