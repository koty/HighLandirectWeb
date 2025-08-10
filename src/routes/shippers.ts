/**
 * Shippers API routes
 */

import { Router } from 'itty-router'
import { addCorsHeaders } from '../middleware/cors'
import { ApiError } from '../middleware/errorHandler'
import type { Env } from '../worker'

export const shippersRoutes = Router()

// GET /api/shippers - 荷主一覧取得
shippersRoutes.get('/api/shippers', async (request: Request, env: Env) => {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '25')
    const search = url.searchParams.get('search')

    const offset = (page - 1) * limit

    let query = `
      SELECT 
        s.*,
        a.Name, a.Furigana, a.PostalCD, a.PrefectureName, 
        a.CityName, a.Address1, a.Phone, a.MailAddress
      FROM Shipper s
      LEFT JOIN Address a ON s.AddressId = a.AddressId
      WHERE s.IsActive = 1
    `

    const params: any[] = []
    let paramIndex = 1

    if (search) {
      query += ` AND (a.Name LIKE ?${paramIndex} OR s.ShipperCode LIKE ?${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    // 総件数取得
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`
    const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ total: number }>()
    const total = countResult?.total || 0

    // データ取得
    query += ` ORDER BY a.Name LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`
    params.push(limit, offset)

    const { results } = await env.DB.prepare(query).bind(...params).all()

    const shippers = results.map((row: any) => ({
      ShipperId: row.ShipperId,
      AddressId: row.AddressId,
      ShipperCode: row.ShipperCode,
      ShipperType: row.ShipperType,
      CreditLimit: row.CreditLimit,
      PaymentTerms: row.PaymentTerms,
      IsActive: row.IsActive,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt,
      Address: {
        AddressId: row.AddressId,
        Name: row.Name,
        Furigana: row.Furigana,
        PostalCD: row.PostalCD,
        PrefectureName: row.PrefectureName,
        CityName: row.CityName,
        Address1: row.Address1,
        Phone: row.Phone,
        MailAddress: row.MailAddress,
      }
    }))

    const response = {
      data: shippers,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }

    return addCorsHeaders(new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    }))

  } catch (error) {
    console.error('Shippers list error:', error)
    throw new ApiError('Failed to fetch shippers', 500)
  }
})

// GET /api/shippers/:id - 荷主詳細取得
shippersRoutes.get('/api/shippers/:id', async (request: Request, env: Env) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()

    if (!id || isNaN(Number(id))) {
      throw new ApiError('Invalid shipper ID', 400)
    }

    const query = `
      SELECT 
        s.*,
        a.Name, a.Furigana, a.PostalCD, a.PrefectureName, 
        a.CityName, a.Address1, a.Phone, a.MailAddress
      FROM Shipper s
      LEFT JOIN Address a ON s.AddressId = a.AddressId
      WHERE s.ShipperId = ?1
    `

    const result = await env.DB.prepare(query).bind(id).first()

    if (!result) {
      throw new ApiError('Shipper not found', 404)
    }

    const shipper = {
      success: true,
      data: {
        ShipperId: result.ShipperId,
        ShipperCode: result.ShipperCode,
        ShipperType: result.ShipperType,
        Address: {
          Name: result.Name,
          Furigana: result.Furigana,
          PostalCD: result.PostalCD,
          PrefectureName: result.PrefectureName,
          CityName: result.CityName,
          Address1: result.Address1,
          Phone: result.Phone,
          MailAddress: result.MailAddress,
        }
      }
    }

    return addCorsHeaders(new Response(JSON.stringify(shipper), {
      headers: { 'Content-Type': 'application/json' }
    }))

  } catch (error) {
    console.error('Shipper detail error:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to fetch shipper', 500)
  }
})