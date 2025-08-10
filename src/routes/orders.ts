/**
 * Orders API routes
 */

import { Router } from 'itty-router'
import { addCorsHeaders } from '../middleware/cors'
import { ApiError } from '../middleware/errorHandler'
import type { Env } from '../worker'

export const ordersRoutes = Router()

// GET /api/orders - 注文一覧取得
ordersRoutes.get('/api/orders', async (request: Request, env: Env) => {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '25')
    const status = url.searchParams.get('status')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    const offset = (page - 1) * limit

    // クエリ構築
    let query = `
      SELECT 
        o.*,
        s.ShipperCode,
        sa.Name as ShipperName,
        sa.PostalCD as ShipperPostalCD,
        sa.PrefectureName as ShipperPrefecture,
        sa.CityName as ShipperCity,
        sa.Address1 as ShipperAddress1,
        sa.Phone as ShipperPhone,
        c.ConsigneeCode,
        ca.Name as ConsigneeName,
        ca.PostalCD as ConsigneePostalCD,
        ca.PrefectureName as ConsigneePrefecture,
        ca.CityName as ConsigneeCity,
        ca.Address1 as ConsigneeAddress1,
        ca.Phone as ConsigneePhone,
        p.ProductName,
        p.ProductCode,
        p.UnitPrice as ProductUnitPrice,
        st.StoreName,
        st.StoreCode
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId  
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      LEFT JOIN ProductMaster p ON o.ProductId = p.ProductId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (status && status !== 'all') {
      query += ` AND o.OrderStatus = ?${paramIndex++}`
      params.push(status)
    }

    if (startDate) {
      query += ` AND DATE(o.OrderDate) >= ?${paramIndex++}`
      params.push(startDate)
    }

    if (endDate) {
      query += ` AND DATE(o.OrderDate) <= ?${paramIndex++}`
      params.push(endDate)
    }

    // 総件数取得
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered`
    const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ total: number }>()
    const total = countResult?.total || 0

    // データ取得
    query += ` ORDER BY o.OrderDate DESC LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`
    params.push(limit, offset)

    const { results } = await env.DB.prepare(query).bind(...params).all()

    // データ変換
    const orders = results.map((row: any) => ({
      OrderId: row.OrderId,
      OrderNumber: row.OrderNumber,
      OrderDate: row.OrderDate,
      ShipperId: row.ShipperId,
      ConsigneeId: row.ConsigneeId,
      ProductId: row.ProductId,
      StoreId: row.StoreId,
      Quantity: row.Quantity,
      UnitPrice: row.UnitPrice,
      TotalAmount: row.TotalAmount,
      OrderStatus: row.OrderStatus,
      RequestedDeliveryDate: row.RequestedDeliveryDate,
      ActualDeliveryDate: row.ActualDeliveryDate,
      TrackingNumber: row.TrackingNumber,
      SpecialInstructions: row.SpecialInstructions,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt,
      Shipper: {
        ShipperId: row.ShipperId,
        ShipperCode: row.ShipperCode,
        Address: {
          Name: row.ShipperName,
          PostalCD: row.ShipperPostalCD,
          PrefectureName: row.ShipperPrefecture,
          CityName: row.ShipperCity,
          Address1: row.ShipperAddress1,
          Phone: row.ShipperPhone,
        }
      },
      Consignee: {
        ConsigneeId: row.ConsigneeId,
        ConsigneeCode: row.ConsigneeCode,
        Address: {
          Name: row.ConsigneeName,
          PostalCD: row.ConsigneePostalCD,
          PrefectureName: row.ConsigneePrefecture,
          CityName: row.ConsigneeCity,
          Address1: row.ConsigneeAddress1,
          Phone: row.ConsigneePhone,
        }
      },
      Product: {
        ProductId: row.ProductId,
        ProductCode: row.ProductCode,
        ProductName: row.ProductName,
        UnitPrice: row.ProductUnitPrice,
      },
      Store: {
        StoreId: row.StoreId,
        StoreCode: row.StoreCode,
        StoreName: row.StoreName,
      }
    }))

    const response = {
      data: orders,
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
    console.error('Orders list error:', error)
    throw new ApiError('Failed to fetch orders', 500)
  }
})

// GET /api/orders/:id - 注文詳細取得
ordersRoutes.get('/api/orders/:id', async (request: Request, env: Env) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()

    if (!id || isNaN(Number(id))) {
      throw new ApiError('Invalid order ID', 400)
    }

    const query = `
      SELECT 
        o.*,
        s.ShipperCode, sa.Name as ShipperName, sa.PostalCD as ShipperPostalCD,
        sa.PrefectureName as ShipperPrefecture, sa.CityName as ShipperCity,
        sa.Address1 as ShipperAddress1, sa.Phone as ShipperPhone,
        c.ConsigneeCode, ca.Name as ConsigneeName, ca.PostalCD as ConsigneePostalCD,
        ca.PrefectureName as ConsigneePrefecture, ca.CityName as ConsigneeCity,
        ca.Address1 as ConsigneeAddress1, ca.Phone as ConsigneePhone,
        p.ProductName, p.ProductCode, p.UnitPrice as ProductUnitPrice,
        st.StoreName, st.StoreCode
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      LEFT JOIN ProductMaster p ON o.ProductId = p.ProductId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE o.OrderId = ?1
    `

    const result = await env.DB.prepare(query).bind(id).first()

    if (!result) {
      throw new ApiError('Order not found', 404)
    }

    const order = {
      // 変換ロジックは上記と同様
      success: true,
      data: result,
    }

    return addCorsHeaders(new Response(JSON.stringify(order), {
      headers: { 'Content-Type': 'application/json' }
    }))

  } catch (error) {
    console.error('Order detail error:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to fetch order', 500)
  }
})

// POST /api/orders - 注文作成
ordersRoutes.post('/api/orders', async (request: Request, env: Env) => {
  try {
    const data = await request.json() as any

    // バリデーション
    if (!data.OrderDate || !data.ShipperId || !data.ConsigneeId || !data.ProductId || !data.StoreId) {
      throw new ApiError('Required fields are missing', 400)
    }

    // 注文番号の生成
    const orderNumberResult = await env.DB.prepare(`
      SELECT MAX(OrderId) as maxId FROM "Order"
    `).first<{ maxId: number }>()

    const nextId = (orderNumberResult?.maxId || 0) + 1
    const orderNumber = `ORD${nextId.toString().padStart(8, '0')}`

    // 商品情報から単価を取得
    const productResult = await env.DB.prepare(`
      SELECT UnitPrice FROM ProductMaster WHERE ProductId = ?1
    `).bind(data.ProductId).first<{ UnitPrice: number }>()

    const unitPrice = productResult?.UnitPrice || 0
    const totalAmount = unitPrice * (data.Quantity || 1)

    const insertQuery = `
      INSERT INTO "Order" (
        OrderNumber, OrderDate, ShipperId, ConsigneeId, ProductId, StoreId,
        Quantity, UnitPrice, TotalAmount, OrderStatus,
        RequestedDeliveryDate, SpecialInstructions, CreatedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const result = await env.DB.prepare(insertQuery).bind(
      orderNumber,
      data.OrderDate,
      data.ShipperId,
      data.ConsigneeId,
      data.ProductId,
      data.StoreId,
      data.Quantity || 1,
      unitPrice,
      totalAmount,
      'pending',
      data.RequestedDeliveryDate || null,
      data.SpecialInstructions || null,
      'web-user'
    ).run()

    if (!result.success) {
      throw new ApiError('Failed to create order', 500)
    }

    const response = {
      success: true,
      data: {
        OrderId: result.meta.last_row_id,
        OrderNumber: orderNumber,
        message: 'Order created successfully'
      }
    }

    return addCorsHeaders(new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    }))

  } catch (error) {
    console.error('Order creation error:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to create order', 500)
  }
})

// PUT /api/orders/:id - 注文更新
ordersRoutes.put('/api/orders/:id', async (request: Request, env: Env) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/')[3] // /api/orders/:id
    const data = await request.json() as any

    if (!id || isNaN(Number(id))) {
      throw new ApiError('Invalid order ID', 400)
    }

    // 既存注文の確認
    const existingOrder = await env.DB.prepare(`
      SELECT OrderId FROM "Order" WHERE OrderId = ?1
    `).bind(id).first()

    if (!existingOrder) {
      throw new ApiError('Order not found', 404)
    }

    const updateQuery = `
      UPDATE "Order" SET
        OrderDate = COALESCE(?, OrderDate),
        ShipperId = COALESCE(?, ShipperId),
        ConsigneeId = COALESCE(?, ConsigneeId),
        ProductId = COALESCE(?, ProductId),
        StoreId = COALESCE(?, StoreId),
        Quantity = COALESCE(?, Quantity),
        RequestedDeliveryDate = COALESCE(?, RequestedDeliveryDate),
        SpecialInstructions = COALESCE(?, SpecialInstructions),
        UpdatedAt = CURRENT_TIMESTAMP,
        UpdatedBy = ?
      WHERE OrderId = ?
    `

    const result = await env.DB.prepare(updateQuery).bind(
      data.OrderDate,
      data.ShipperId,
      data.ConsigneeId,
      data.ProductId,
      data.StoreId,
      data.Quantity,
      data.RequestedDeliveryDate,
      data.SpecialInstructions,
      'web-user',
      id
    ).run()

    if (!result.success) {
      throw new ApiError('Failed to update order', 500)
    }

    const response = {
      success: true,
      message: 'Order updated successfully'
    }

    return addCorsHeaders(new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    }))

  } catch (error) {
    console.error('Order update error:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to update order', 500)
  }
})