/**
 * Stores API routes
 */

import { Router } from 'itty-router'
import { addCorsHeaders } from '../middleware/cors'
import { ApiError } from '../middleware/errorHandler'
import type { Env } from '../worker'

export const storesRoutes = Router()

// GET /api/stores - 集配所一覧取得
storesRoutes.get('/api/stores', async (request: Request, env: Env) => {
  try {
    const query = `
      SELECT 
        StoreId, StoreCode, StoreName, CarrierCode, CarrierName,
        RegionCode, ContactPhone, ServiceArea, CutoffTime,
        IsDefault, IsActive, CreatedAt, UpdatedAt
      FROM Store
      WHERE IsActive = 1
      ORDER BY IsDefault DESC, StoreName ASC
    `

    const { results } = await env.DB.prepare(query).all()

    const response = {
      success: true,
      data: results
    }

    return addCorsHeaders(new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    }))

  } catch (error) {
    console.error('Stores list error:', error)
    throw new ApiError('Failed to fetch stores', 500)
  }
})