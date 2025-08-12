/**
 * CloudFlare Workers API for HighLandirect Web
 * D1 Database integration
 */

import { Router } from 'itty-router'
import { cors } from './middleware/cors'
import { errorHandler } from './middleware/errorHandler'
import { ordersRoutes } from './routes/orders'
import { shippersRoutes } from './routes/shippers'
import { consigneesRoutes } from './routes/consignees'
import { productsRoutes } from './routes/products'
import { storesRoutes } from './routes/stores'
import { postalRoutes } from './routes/postal'

export interface Env {
  DB: any // D1Database
  ENVIRONMENT: string
  JAPANPOST_API_HOST: string
  JAPANPOST_CLIENT_ID: string
  JAPANPOST_CLIENT_SECRET: string
  JAPANPOST_CLIENT_IP: string
}

const router = Router()

// CORS middleware
router.all('*', cors)

// Health check
router.get('/api/health', () => {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// API Routes
router.all('/api/orders/*', ordersRoutes.handle)
router.all('/api/shippers/*', shippersRoutes.handle)
router.all('/api/consignees/*', consigneesRoutes.handle)
router.all('/api/products/*', productsRoutes.handle)
router.all('/api/stores/*', storesRoutes.handle)
router.all('/api/postal/*', postalRoutes.handle)

// Fallback for unmatched routes
router.all('*', () => new Response('Not Found', { status: 404 }))

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    try {
      return await router.handle(request, env, ctx)
    } catch (error) {
      return errorHandler(error)
    }
  },
}