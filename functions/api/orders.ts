// CloudFlare Pages Function: Orders API with Order + OrderDetail structure
import type { PagesFunction, Env } from '../types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 200, headers: corsHeaders })
}

// GET: 注文一覧取得（Order + OrderDetail JOIN）
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context
    const url = new URL(request.url)
    
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const shipperId = url.searchParams.get('shipperId')
    const offset = (page - 1) * limit

    // クエリパラメータとバインド値を準備
    const params: (string | number)[] = []
    let whereClause = ''
    
    if (shipperId) {
      whereClause = 'WHERE o.ShipperId = ?'
      params.push(Number(shipperId))
    }

    // 注文ヘッダー一覧を取得
    const ordersQuery = `
      SELECT 
        o.OrderId,
        o.OrderDate,
        o.ShipperId,
        o.StoreId,
        o.OrderTotal,
        o.ItemCount,
        o.TrackingNumber,
        o.CreatedAt,
        o.UpdatedAt,
        sa.Name as ShipperName,
        st.StoreName
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      ${whereClause}
      ORDER BY o.OrderDate DESC
      LIMIT ? OFFSET ?
    `

    params.push(limit, offset)
    const ordersResult = await env.DB.prepare(ordersQuery).bind(...params).all()
    const orders = ordersResult.results || []

    // 各注文の明細を取得
    const ordersWithDetails = await Promise.all(
      orders.map(async (order: any) => {
        const detailsQuery = `
          SELECT 
            od.OrderDetailId,
            od.OrderId,
            od.ConsigneeId,
            od.ProductId,
            od.Quantity,
            od.UnitPrice,
            od.LineTotal,
            od.CreatedAt,
            od.UpdatedAt,
            ca.Name as ConsigneeName,
            pm.ProductName
          FROM OrderDetail od
          LEFT JOIN Consignee c ON od.ConsigneeId = c.ConsigneeId
          LEFT JOIN Address ca ON c.AddressId = ca.AddressId
          LEFT JOIN ProductMaster pm ON od.ProductId = pm.ProductId
          WHERE od.OrderId = ?
        `
        
        const detailsResult = await env.DB.prepare(detailsQuery).bind(order.OrderId).all()
        
        return {
          ...order,
          OrderDetails: detailsResult.results || []
        }
      })
    )

    // 総件数取得
    let countQuery = 'SELECT COUNT(*) as total FROM "Order"'
    const countParams: (string | number)[] = []
    
    if (shipperId) {
      countQuery += ' WHERE ShipperId = ?'
      countParams.push(Number(shipperId))
    }
    
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first()
    const total = countResult.total || 0

    return new Response(
      JSON.stringify({
        success: true,
        data: ordersWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get orders error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

// POST: 新規注文作成（Order + OrderDetail をトランザクション処理）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context
    const data = await request.json() as any

    // バリデーション
    if (!data.OrderDate || !data.ShipperId || !data.StoreId || !data.OrderDetails || !Array.isArray(data.OrderDetails)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: OrderDate, ShipperId, StoreId, OrderDetails'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (data.OrderDetails.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'At least one order detail is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 注文合計計算
    let orderTotal = 0
    let itemCount = 0
    for (const detail of data.OrderDetails) {
      const lineTotal = (detail.Quantity || 0) * (detail.UnitPrice || 0)
      orderTotal += lineTotal
      itemCount += detail.Quantity || 0
    }

    // 注文ヘッダー作成
    const orderQuery = `
      INSERT INTO "Order" (
        OrderDate, ShipperId, StoreId, OrderTotal, ItemCount
      ) VALUES (?, ?, ?, ?, ?)
    `

    const orderResult = await env.DB.prepare(orderQuery)
      .bind(data.OrderDate, data.ShipperId, data.StoreId, orderTotal, itemCount)
      .run()

    const orderId = orderResult.meta.last_row_id

    // 注文明細作成（並行処理）
    const detailPromises = data.OrderDetails.map((detail: any) => {
      const lineTotal = (detail.Quantity || 0) * (detail.UnitPrice || 0)
      const detailQuery = `
        INSERT INTO OrderDetail (
          OrderId, ConsigneeId, ProductId, Quantity, UnitPrice, LineTotal
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
      return env.DB.prepare(detailQuery)
        .bind(orderId, detail.ConsigneeId, detail.ProductId, detail.Quantity, detail.UnitPrice, lineTotal)
        .run()
    })

    await Promise.all(detailPromises)

    // 作成された注文を取得して返す
    const createdOrderQuery = `
      SELECT 
        o.OrderId,
        o.OrderDate,
        o.ShipperId,
        o.StoreId,
        o.OrderTotal,
        o.ItemCount,
        o.TrackingNumber,
        o.CreatedAt,
        o.UpdatedAt,
        sa.Name as ShipperName,
        st.StoreName
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE o.OrderId = ?
    `

    const createdOrder = await env.DB.prepare(createdOrderQuery).bind(orderId).first()

    return new Response(
      JSON.stringify({
        success: true,
        data: createdOrder
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Create order error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}