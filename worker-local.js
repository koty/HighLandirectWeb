/**
 * Local development worker for HighLandirect API
 */

import { Router } from 'itty-router'

const router = Router()

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle CORS preflight requests
router.options('*', () => new Response(null, { headers: CORS_HEADERS }))

// Health check
router.get('/api/health', () => {
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'Local Development'
  }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
})

// Shippers API
router.get('/api/shippers', async (request, env) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const search = url.searchParams.get('search')
  
  // Get shippers from D1 database
  let query = `
    SELECT 
      s.ShipperId,
      s.AddressId,
      a.Name,
      a.Furigana,
      a.Keisho,
      a.PostalCD,
      a.PrefectureName,
      a.CityName,
      a.Address1,
      a.Address2,
      a.Phone,
      a.Fax,
      a.MailAddress,
      a.Memo,
      s.IsActive,
      s.CreatedAt,
      s.UpdatedAt
    FROM Shipper s
    LEFT JOIN Address a ON s.AddressId = a.AddressId
    WHERE s.IsActive = 1
  `
  
  const params = []
  
  if (search) {
    query += ` AND (a.Name LIKE ? OR a.Address1 LIKE ? OR a.Phone LIKE ?)`
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }
  
  query += ` ORDER BY s.CreatedAt DESC, a.Name ASC`
  
  const offset = (page - 1) * limit
  query += ` LIMIT ? OFFSET ?`
  params.push(limit, offset)
  
  const { results } = await env.DB.prepare(query).bind(...params).all()
  
  // Count total records
  const countQuery = `
    SELECT COUNT(*) as total
    FROM Shipper s
    LEFT JOIN Address a ON s.AddressId = a.AddressId
    WHERE s.IsActive = 1` + (search ? ` AND (a.Name LIKE ? OR a.Address1 LIKE ? OR a.Phone LIKE ?)` : '')
  
  const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
  const countResult = await env.DB.prepare(countQuery).bind(...countParams).first()
  const total = countResult?.total || 0
  
  return new Response(JSON.stringify({
    success: true,
    data: results || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
})

router.post('/api/shippers', async (request, env) => {
  const data = await request.json()
  
  try {
    // Create address first
    const addressQuery = `
      INSERT INTO Address (
        Name, Furigana, Keisho, PostalCD, PrefectureName, CityName,
        Address1, Address2, Phone, Fax, MailAddress, Memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const addressResult = await env.DB.prepare(addressQuery).bind(
      data.Name,
      data.Furigana || null,
      data.Keisho || null,
      data.PostalCD || null,
      data.PrefectureName || null,
      data.CityName || null,
      data.Address1 || null,
      data.Address2 || null,
      data.Phone || null,
      data.Fax || null,
      data.MailAddress || null,
      data.Memo || null
    ).run()
    
    const addressId = addressResult.meta.last_row_id
    
    // Create shipper
    const shipperQuery = `
      INSERT INTO Shipper (AddressId)
      VALUES (?)
    `
    
    const shipperResult = await env.DB.prepare(shipperQuery).bind(
      addressId
    ).run()
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        ShipperId: shipperResult.meta.last_row_id,
        AddressId: addressId,
        ...data
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Orders API - Updated for Order + OrderDetail structure
router.get('/api/orders', async (request, env) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const offset = (page - 1) * limit
  
  try {
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
      ORDER BY o.OrderDate DESC
      LIMIT ? OFFSET ?
    `

    const { results: orders } = await env.DB.prepare(ordersQuery).bind(limit, offset).all()
    
    // 各注文の明細を取得
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
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
        
        const { results: details } = await env.DB.prepare(detailsQuery).bind(order.OrderId).all()
        
        return {
          ...order,
          OrderDetails: details || []
        }
      })
    )

    // 総件数取得
    const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM "Order"').first()
    const total = countResult.total || 0
    
    return new Response(JSON.stringify({
      success: true,
      data: ordersWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

router.post('/api/orders', async (request, env) => {
  const data = await request.json()
  
  try {
    // バリデーション
    if (!data.OrderDate || !data.ShipperId || !data.StoreId || !data.OrderDetails || !Array.isArray(data.OrderDetails)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: OrderDate, ShipperId, StoreId, OrderDetails'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }

    if (data.OrderDetails.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'At least one order detail is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
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
    const detailPromises = data.OrderDetails.map((detail) => {
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
    
    return new Response(JSON.stringify({
      success: true,
      data: createdOrder
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    console.error('Create order error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Individual order routes - Updated for Order + OrderDetail structure
router.get('/api/orders/:id', async (request, env) => {
  const { id } = request.params
  
  try {
    // 注文ヘッダー取得
    const orderQuery = `
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
    
    const order = await env.DB.prepare(orderQuery).bind(id).first()
    
    if (!order) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }

    // 注文明細取得
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
    
    const { results: details } = await env.DB.prepare(detailsQuery).bind(id).all()
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        ...order,
        OrderDetails: details || []
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    console.error('Get order by id error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Update order - Simplified to match production (OrderDate, TrackingNumber only)
router.put('/api/orders/:id', async (request, env) => {
  const { id } = request.params
  
  try {
    if (!id || isNaN(Number(id))) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid order ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }

    const data = await request.json()

    // 注文ヘッダーの基本情報のみ更新可能（OrderDate, TrackingNumber）
    // 明細情報は別途明細管理APIで対応する設計
    const allowedFields = ['OrderDate', 'TrackingNumber']
    const updates = []
    const values = []
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(data[field])
      }
    })
    
    if (updates.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid fields to update'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }

    // UpdatedAtを追加
    updates.push('UpdatedAt = datetime(\'now\')')
    values.push(Number(id))

    const updateQuery = `
      UPDATE "Order"
      SET ${updates.join(', ')}
      WHERE OrderId = ?
    `

    const result = await env.DB.prepare(updateQuery).bind(...values).run()

    if (result.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order not found or not updated'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }

    // 更新された注文を取得（明細込み）
    const getOrderQuery = `
      SELECT 
        o.OrderId, o.OrderDate, o.ShipperId, o.StoreId,
        o.OrderTotal, o.ItemCount, o.TrackingNumber, o.CreatedAt, o.UpdatedAt,
        sa.Name as ShipperName, st.StoreName
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE o.OrderId = ?
    `

    const updatedOrder = await env.DB.prepare(getOrderQuery).bind(Number(id)).first()

    // 注文明細も取得
    const detailsQuery = `
      SELECT 
        od.OrderDetailId, od.OrderId, od.ConsigneeId, od.ProductId,
        od.Quantity, od.UnitPrice, od.LineTotal, od.CreatedAt, od.UpdatedAt,
        ca.Name as ConsigneeName, pm.ProductName
      FROM OrderDetail od
      LEFT JOIN Consignee c ON od.ConsigneeId = c.ConsigneeId
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      LEFT JOIN ProductMaster pm ON od.ProductId = pm.ProductId
      WHERE od.OrderId = ?
    `
    
    const { results: details } = await env.DB.prepare(detailsQuery).bind(Number(id)).all()

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...updatedOrder,
        OrderDetails: details || []
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Individual shipper routes
router.get('/api/shippers/:id', async (request, env) => {
  const { id } = request.params
  
  try {
    const query = `
      SELECT 
        s.ShipperId,
        s.AddressId,
        a.Name,
        a.Furigana,
        a.Keisho,
        a.PostalCD,
        a.PrefectureName,
        a.CityName,
        a.Address1,
        a.Address2,
        a.Phone,
        a.Fax,
        a.MailAddress,
        a.Memo,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
      FROM Shipper s
      LEFT JOIN Address a ON s.AddressId = a.AddressId
      WHERE s.ShipperId = ? AND s.IsActive = 1
    `
    
    const result = await env.DB.prepare(query).bind(id).first()
    
    if (!result) {
      return new Response(JSON.stringify({
        error: 'Shipper not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

router.put('/api/shippers/:id', async (request, env) => {
  const { id } = request.params
  const data = await request.json()
  
  try {
    // Get current shipper to find AddressId
    const getCurrentQuery = `
      SELECT AddressId FROM Shipper WHERE ShipperId = ? AND IsActive = 1
    `
    
    const currentResult = await env.DB.prepare(getCurrentQuery).bind(id).first()
    
    if (!currentResult) {
      return new Response(JSON.stringify({
        error: 'Shipper not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }
    
    const addressId = currentResult.AddressId
    
    // Update address information
    const updateAddressQuery = `
      UPDATE Address SET
        Name = ?,
        Furigana = ?,
        Keisho = ?,
        PostalCD = ?,
        PrefectureName = ?,
        CityName = ?,
        Address1 = ?,
        Address2 = ?,
        Phone = ?,
        Fax = ?,
        MailAddress = ?,
        Memo = ?,
        UpdatedAt = CURRENT_TIMESTAMP
      WHERE AddressId = ?
    `
    
    await env.DB.prepare(updateAddressQuery).bind(
      data.Name,
      data.Furigana || null,
      data.Keisho || null,
      data.PostalCD || null,
      data.PrefectureName || null,
      data.CityName || null,
      data.Address1 || null,
      data.Address2 || null,
      data.Phone || null,
      data.Fax || null,
      data.MailAddress || null,
      data.Memo || null,
      addressId
    ).run()
    
    // Update shipper information (only UpdatedAt since other fields were removed)
    const updateShipperQuery = `
      UPDATE Shipper SET
        UpdatedAt = CURRENT_TIMESTAMP
      WHERE ShipperId = ?
    `
    
    await env.DB.prepare(updateShipperQuery).bind(
      id
    ).run()
    
    // Return updated shipper
    const fetchUpdatedQuery = `
      SELECT 
        s.ShipperId,
        s.AddressId,
        a.Name,
        a.Furigana,
        a.Keisho,
        a.PostalCD,
        a.PrefectureName,
        a.CityName,
        a.Address1,
        a.Address2,
        a.Phone,
        a.Fax,
        a.MailAddress,
        a.Memo,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
      FROM Shipper s
      LEFT JOIN Address a ON s.AddressId = a.AddressId
      WHERE s.ShipperId = ?
    `
    
    const updatedShipper = await env.DB.prepare(fetchUpdatedQuery).bind(id).first()
    
    return new Response(JSON.stringify({
      success: true,
      data: updatedShipper
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Consignees API
router.get('/api/consignees', async (request, env) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const search = url.searchParams.get('search')
  
  let query = `
    SELECT 
      c.ConsigneeId,
      c.AddressId,
      a.Name,
      a.Furigana,
      a.Keisho,
      a.PostalCD,
      a.PrefectureName,
      a.CityName,
      a.Address1,
      a.Address2,
      a.Phone,
      a.Fax,
      a.MailAddress,
      a.Memo,
      c.IsActive,
      c.CreatedAt,
      c.UpdatedAt
    FROM Consignee c
    LEFT JOIN Address a ON c.AddressId = a.AddressId
    WHERE c.IsActive = 1
  `
  
  const params = []
  
  if (search) {
    query += ` AND (a.Name LIKE ? OR a.Address1 LIKE ? OR a.Phone LIKE ?)`
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }
  
  query += ` ORDER BY c.CreatedAt DESC, a.Name ASC`
  
  const offset = (page - 1) * limit
  query += ` LIMIT ? OFFSET ?`
  params.push(limit, offset)
  
  try {
    const { results } = await env.DB.prepare(query).bind(...params).all()
    
    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Consignee c
      LEFT JOIN Address a ON c.AddressId = a.AddressId
      WHERE c.IsActive = 1` + (search ? ` AND (a.Name LIKE ? OR a.Address1 LIKE ? OR a.Phone LIKE ?)` : '')
    
    const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first()
    const total = countResult?.total || 0
    
    return new Response(JSON.stringify({
      success: true,
      data: results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

router.post('/api/consignees', async (request, env) => {
  const data = await request.json()
  
  try {
    // Create address first
    const addressQuery = `
      INSERT INTO Address (
        Name, Furigana, Keisho, PostalCD, PrefectureName, CityName,
        Address1, Address2, Phone, Fax, MailAddress, Memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const addressResult = await env.DB.prepare(addressQuery).bind(
      data.Name,
      data.Furigana || null,
      data.Keisho || null,
      data.PostalCD || null,
      data.PrefectureName || null,
      data.CityName || null,
      data.Address1 || null,
      data.Address2 || null,
      data.Phone || null,
      data.Fax || null,
      data.MailAddress || null,
      data.Memo || null
    ).run()
    
    const addressId = addressResult.meta.last_row_id
    
    // Create consignee
    const consigneeQuery = `
      INSERT INTO Consignee (AddressId)
      VALUES (?)
    `
    
    const consigneeResult = await env.DB.prepare(consigneeQuery).bind(
      addressId
    ).run()
    
    const consigneeId = consigneeResult.meta.last_row_id
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        ConsigneeId: consigneeId,
        AddressId: addressId,
        ...data
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Individual consignee routes
router.get('/api/consignees/:id', async (request, env) => {
  const { id } = request.params
  
  try {
    const query = `
      SELECT 
        c.ConsigneeId,
        c.AddressId,
        a.Name,
        a.Furigana,
        a.Keisho,
        a.PostalCD,
        a.PrefectureName,
        a.CityName,
        a.Address1,
        a.Address2,
        a.Phone,
        a.Fax,
        a.MailAddress,
        a.Memo,
              c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
      FROM Consignee c
      LEFT JOIN Address a ON c.AddressId = a.AddressId
      WHERE c.ConsigneeId = ? AND c.IsActive = 1
    `
    
    const result = await env.DB.prepare(query).bind(id).first()
    
    if (!result) {
      return new Response(JSON.stringify({
        error: 'Consignee not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

router.put('/api/consignees/:id', async (request, env) => {
  const { id } = request.params
  const data = await request.json()
  
  try {
    // Get current consignee to find AddressId
    const getCurrentQuery = `
      SELECT AddressId FROM Consignee WHERE ConsigneeId = ? AND IsActive = 1
    `
    
    const currentResult = await env.DB.prepare(getCurrentQuery).bind(id).first()
    
    if (!currentResult) {
      return new Response(JSON.stringify({
        error: 'Consignee not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      })
    }
    
    const addressId = currentResult.AddressId
    
    // Update address information
    const updateAddressQuery = `
      UPDATE Address SET
        Name = ?,
        Furigana = ?,
        Keisho = ?,
        PostalCD = ?,
        PrefectureName = ?,
        CityName = ?,
        Address1 = ?,
        Address2 = ?,
        Phone = ?,
        Fax = ?,
        MailAddress = ?,
        Memo = ?,
        UpdatedAt = CURRENT_TIMESTAMP
      WHERE AddressId = ?
    `
    
    await env.DB.prepare(updateAddressQuery).bind(
      data.Name,
      data.Furigana || null,
      data.Keisho || null,
      data.PostalCD || null,
      data.PrefectureName || null,
      data.CityName || null,
      data.Address1 || null,
      data.Address2 || null,
      data.Phone || null,
      data.Fax || null,
      data.MailAddress || null,
      data.Memo || null,
      addressId
    ).run()
    
    // Update consignee information
    const updateConsigneeQuery = `
      UPDATE Consignee SET
        ConsigneeCode = ?,
        DeliveryInstructions = ?,
        PreferredDeliveryTime = ?,
        UpdatedAt = CURRENT_TIMESTAMP
      WHERE ConsigneeId = ?
    `
    
    await env.DB.prepare(updateConsigneeQuery).bind(
      data.ConsigneeCode || null,
      data.DeliveryInstructions || null,
      data.PreferredDeliveryTime || null,
      id
    ).run()
    
    // Return updated consignee
    const fetchUpdatedQuery = `
      SELECT 
        c.ConsigneeId,
        c.AddressId,
        a.Name,
        a.Furigana,
        a.Keisho,
        a.PostalCD,
        a.PrefectureName,
        a.CityName,
        a.Address1,
        a.Address2,
        a.Phone,
        a.Fax,
        a.MailAddress,
        a.Memo,
              c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
      FROM Consignee c
      LEFT JOIN Address a ON c.AddressId = a.AddressId
      WHERE c.ConsigneeId = ?
    `
    
    const updatedConsignee = await env.DB.prepare(fetchUpdatedQuery).bind(id).first()
    
    return new Response(JSON.stringify({
      success: true,
      data: updatedConsignee
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Products API
router.get('/api/products', async (request, env) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const search = url.searchParams.get('search')
  const category = url.searchParams.get('category')
  
  let query = `
    SELECT 
      ProductId,
      ProductName,
      UnitPrice,
      IsDefault,
      IsActive,
      CreatedAt,
      UpdatedAt
    FROM ProductMaster
    WHERE IsActive = 1
  `
  
  const params = []
  
  if (search) {
    query += ` AND ProductName LIKE ?`
    const searchTerm = `%${search}%`
    params.push(searchTerm)
  }
  
  // ProductCategory column removed
  
  query += ` ORDER BY IsDefault DESC, ProductName ASC`
  
  const offset = (page - 1) * limit
  query += ` LIMIT ? OFFSET ?`
  params.push(limit, offset)
  
  try {
    const { results } = await env.DB.prepare(query).bind(...params).all()
    
    // Count total records
    let countQuery = `SELECT COUNT(*) as total FROM ProductMaster WHERE IsActive = 1`
    const countParams = []
    
    if (search) {
      countQuery += ` AND (ProductName LIKE ? OR ProductCode LIKE ?)`
      const searchTerm = `%${search}%`
      countParams.push(searchTerm, searchTerm)
    }
    
    if (category && category !== 'all') {
      countQuery += ` AND ProductCategory = ?`
      countParams.push(category)
    }
    
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first()
    const total = countResult?.total || 0
    
    return new Response(JSON.stringify({
      success: true,
      data: results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Stores API
router.get('/api/stores', async (request, env) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const search = url.searchParams.get('search')
  const carrier = url.searchParams.get('carrier')
  
  let query = `
    SELECT 
      StoreId,
      StoreName,
      IsDefault,
      IsActive,
      CreatedAt,
      UpdatedAt
    FROM Store
    WHERE IsActive = 1
  `
  
  const params = []
  
  if (search) {
    query += ` AND StoreName LIKE ?`
    const searchTerm = `%${search}%`
    params.push(searchTerm)
  }
  
  // CarrierCode column removed
  
  query += ` ORDER BY IsDefault DESC, StoreName ASC`
  
  const offset = (page - 1) * limit
  query += ` LIMIT ? OFFSET ?`
  params.push(limit, offset)
  
  try {
    const { results } = await env.DB.prepare(query).bind(...params).all()
    
    // Count total records
    let countQuery = `SELECT COUNT(*) as total FROM Store WHERE IsActive = 1`
    const countParams = []
    
    if (search) {
      countQuery += ` AND (StoreName LIKE ? OR ServiceArea LIKE ?)`
      const searchTerm = `%${search}%`
      countParams.push(searchTerm, searchTerm)
    }
    
    if (carrier && carrier !== 'all') {
      countQuery += ` AND CarrierCode = ?`
      countParams.push(carrier)
    }
    
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first()
    const total = countResult?.total || 0
    
    return new Response(JSON.stringify({
      success: true,
      data: results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Postal code search API
router.get('/api/postal/search/:zipcode', async (request, env) => {
  const { zipcode } = request.params
  
  // Validate zipcode format (7 digits)
  if (!/^\d{7}$/.test(zipcode)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid zipcode format. Please provide 7 digits.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }

  try {
    // Get access token for Japan Post API
    const tokenResponse = await fetch(`https://${env.JAPANPOST_API_HOST}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.JAPANPOST_CLIENT_ID,
        client_secret: env.JAPANPOST_CLIENT_SECRET,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Search postal code
    const searchResponse = await fetch(`https://${env.JAPANPOST_API_HOST}/address/guide/v1/search?zipcode=${zipcode}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Forwarded-For': env.JAPANPOST_CLIENT_IP || '127.0.0.1',
      },
    })

    if (!searchResponse.ok) {
      throw new Error(`Postal search failed: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    
    // Convert to consistent format if needed
    let address
    if (searchData.addresses && searchData.addresses.length > 0) {
      address = searchData.addresses[0]
    } else {
      throw new Error('No addresses found in API response')
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: address,
      source: 'japan_post_api'
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })

  } catch (error) {
    console.error('Postal API error, using fallback:', error)
    
    // Mock data mapping for common postal codes
    const mockData = new Map([
      ['1000001', { pref: '東京都', city: '千代田区', town: '千代田' }],
      ['1000005', { pref: '東京都', city: '千代田区', town: '丸の内' }],
      ['1000014', { pref: '東京都', city: '千代田区', town: '永田町' }],
      ['1050011', { pref: '東京都', city: '港区', town: '芝公園' }],
      ['1500043', { pref: '東京都', city: '渋谷区', town: '道玄坂' }],
      ['1600023', { pref: '東京都', city: '新宿区', town: '西新宿' }],
      ['5300001', { pref: '大阪府', city: '大阪市北区', town: '梅田' }],
      ['5300047', { pref: '大阪府', city: '大阪市北区', town: '西天満' }],
      ['5410041', { pref: '大阪府', city: '大阪市中央区', town: '北浜' }],
      ['4600002', { pref: '愛知県', city: '名古屋市中区', town: '丸の内' }],
      ['4600003', { pref: '愛知県', city: '名古屋市中区', town: '錦' }],
      ['4600008', { pref: '愛知県', city: '名古屋市中区', town: '栄' }],
      ['2310023', { pref: '神奈川県', city: '横浜市中区', town: '山下町' }],
      ['6020911', { pref: '京都府', city: '京都市上京区', town: '烏丸通' }],
      ['8120011', { pref: '福岡県', city: '福岡市博多区', town: '博多駅前' }],
      ['3812204', { pref: '長野県', city: '長野市', town: '真島町真島' }]
    ])
    
    const addressInfo = mockData.get(zipcode) || { pref: '東京都', city: '港区', town: '新橋' }
    const mockAddress = {
      dgacode: zipcode,
      zip_code: `${zipcode.slice(0, 3)}-${zipcode.slice(3)}`,
      pref_name: addressInfo.pref,
      city_name: addressInfo.city,
      town_name: addressInfo.town,
      street_name: '1丁目',
      building_name: '',
      pref_kana: 'カナ',
      city_kana: 'カナ',
      town_kana: 'カナ'
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: mockAddress,
      source: 'mock_data',
      fallback_reason: error instanceof Error ? error.message : 'API error'
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })
  }
})

// Handle all other routes
router.all('*', () => new Response('Not Found', { status: 404 }))

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx)
  },
}