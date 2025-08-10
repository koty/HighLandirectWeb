/**
 * Consignees API routes
 */

import { Router } from 'itty-router'
import { addCorsHeaders } from '../middleware/cors'
import { ApiError } from '../middleware/errorHandler'
import type { Env } from '../worker'

export const consigneesRoutes = Router()

// GET /api/consignees - 送付先一覧取得
consigneesRoutes.get('/api/consignees', async (request: Request, env: Env) => {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '25')
    const search = url.searchParams.get('search')

    const offset = (page - 1) * limit

    let query = `
      SELECT 
        c.*,
        a.Name, a.Furigana, a.PostalCD, a.PrefectureName, 
        a.CityName, a.Address1, a.Phone, a.MailAddress
      FROM Consignee c
      LEFT JOIN Address a ON c.AddressId = a.AddressId
      WHERE c.IsActive = 1
    `

    const params: any[] = []
    let paramIndex = 1

    if (search) {
      query += ` AND (a.Name LIKE ?${paramIndex} OR c.ConsigneeCode LIKE ?${paramIndex})`
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

    const consignees = results.map((row: any) => ({
      ConsigneeId: row.ConsigneeId,
      AddressId: row.AddressId,
      ConsigneeCode: row.ConsigneeCode,
      DeliveryInstructions: row.DeliveryInstructions,
      AccessInfo: row.AccessInfo,
      PreferredDeliveryTime: row.PreferredDeliveryTime,
      SpecialHandling: row.SpecialHandling,
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
      data: consignees,
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
    console.error('Consignees list error:', error)
    throw new ApiError('Failed to fetch consignees', 500)
  }
})