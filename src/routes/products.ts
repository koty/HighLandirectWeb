/**
 * Products API routes
 */

import { Router } from 'itty-router'
import { addCorsHeaders } from '../middleware/cors'
import { ApiError } from '../middleware/errorHandler'
import type { Env } from '../worker'

export const productsRoutes = Router()

// GET /api/products - 商品一覧取得
productsRoutes.get('/api/products', async (request: Request, env: Env) => {
  try {
    const query = `
      SELECT 
        ProductId, ProductCode, ProductName, ProductCategory,
        UnitPrice, TaxRate, Weight, Dimensions, IsFragile,
        IsDefault, IsActive, CreatedAt, UpdatedAt
      FROM ProductMaster
      WHERE IsActive = 1
      ORDER BY IsDefault DESC, ProductName ASC
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
    console.error('Products list error:', error)
    throw new ApiError('Failed to fetch products', 500)
  }
})