// CloudFlare Pages Function: Health check
import { EventContext, Env, CORS_HEADERS } from '../types';

export async function onRequest(context: EventContext<Env>): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'CloudFlare Pages Functions'
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}