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
      s.ShipperCode,
      s.ShipperType,
      s.ContractStartDate,
      s.ContractEndDate,
      s.CreditLimit,
      s.PaymentTerms,
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
      INSERT INTO Shipper (AddressId, ShipperCode, ShipperType, CreditLimit, PaymentTerms)
      VALUES (?, ?, ?, ?, ?)
    `
    
    const shipperResult = await env.DB.prepare(shipperQuery).bind(
      addressId,
      data.ShipperCode || null,
      data.ShipperType || null,
      data.CreditLimit || null,
      data.PaymentTerms || null
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

// Orders API
router.get('/api/orders', async (request, env) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const search = url.searchParams.get('search')
  const status = url.searchParams.get('status')
  const shipperId = url.searchParams.get('shipperId')
  
  let query = `
    SELECT 
      o.OrderId,
      o.OrderNumber,
      o.OrderDate,
      o.ShipperId,
      o.ConsigneeId,
      o.ProductId,
      o.StoreId,
      o.Quantity,
      o.UnitPrice,
      o.TotalAmount,
      o.OrderStatus,
      o.RequestedDeliveryDate,
      o.ActualDeliveryDate,
      o.TrackingNumber,
      o.SpecialInstructions,
      o.CreatedAt,
      o.UpdatedAt,
      sa.Name as ShipperName,
      ca.Name as ConsigneeName,
      p.ProductName,
      st.StoreName
    FROM "Order" o
    LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
    LEFT JOIN Address sa ON s.AddressId = sa.AddressId
    LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId  
    LEFT JOIN Address ca ON c.AddressId = ca.AddressId
    LEFT JOIN ProductMaster p ON o.ProductId = p.ProductId
    LEFT JOIN Store st ON o.StoreId = st.StoreId
    WHERE 1=1
  `
  
  const params = []
  
  if (search) {
    query += ` AND (o.OrderNumber LIKE ? OR sa.Name LIKE ? OR ca.Name LIKE ?)`
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }
  
  if (status && status !== 'all') {
    query += ` AND o.OrderStatus = ?`
    params.push(status)
  }
  
  if (shipperId) {
    query += ` AND o.ShipperId = ?`
    params.push(parseInt(shipperId))
  }
  
  query += ` ORDER BY o.CreatedAt DESC`
  
  const offset = (page - 1) * limit
  query += ` LIMIT ? OFFSET ?`
  params.push(limit, offset)
  
  try {
    const { results } = await env.DB.prepare(query).bind(...params).all()
    
    // Count total records
    let countQuery = `
      SELECT COUNT(*) as total
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      WHERE 1=1
    `
    
    const countParams = []
    
    if (search) {
      countQuery += ` AND (o.OrderNumber LIKE ? OR sa.Name LIKE ? OR ca.Name LIKE ?)`
      const searchTerm = `%${search}%`
      countParams.push(searchTerm, searchTerm, searchTerm)
    }
    
    if (status && status !== 'all') {
      countQuery += ` AND o.OrderStatus = ?`
      countParams.push(status)
    }
    
    if (shipperId) {
      countQuery += ` AND o.ShipperId = ?`
      countParams.push(parseInt(shipperId))
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

router.post('/api/orders', async (request, env) => {
  const data = await request.json()
  
  try {
    // Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
    
    const query = `
      INSERT INTO "Order" (
        OrderNumber, OrderDate, ShipperId, ConsigneeId, ProductId, StoreId,
        Quantity, UnitPrice, TotalAmount, OrderStatus, RequestedDeliveryDate, SpecialInstructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const result = await env.DB.prepare(query).bind(
      orderNumber,
      data.OrderDate || new Date().toISOString().split('T')[0],
      data.ShipperId,
      data.ConsigneeId,
      data.ProductId,
      data.StoreId,
      data.Quantity || 1,
      data.UnitPrice || 0,
      data.TotalAmount || 0,
      data.OrderStatus || '受付',
      data.DeliveryDate || null,
      data.SpecialInstructions || null
    ).run()
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        OrderId: result.meta.last_row_id,
        OrderNumber: orderNumber,
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
      c.ConsigneeCode,
      c.DeliveryInstructions,
      c.AccessInfo,
      c.PreferredDeliveryTime,
      c.SpecialHandling,
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
      ProductCode,
      ProductName,
      ProductCategory,
      UnitPrice,
      TaxRate,
      Weight,
      Dimensions,
      IsFragile,
      IsDefault,
      IsActive,
      CreatedAt,
      UpdatedAt
    FROM ProductMaster
    WHERE IsActive = 1
  `
  
  const params = []
  
  if (search) {
    query += ` AND (ProductName LIKE ? OR ProductCode LIKE ?)`
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm)
  }
  
  if (category && category !== 'all') {
    query += ` AND ProductCategory = ?`
    params.push(category)
  }
  
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
      StoreCode,
      StoreName,
      CarrierCode,
      CarrierName,
      RegionCode,
      ContactPhone,
      ServiceArea,
      CutoffTime,
      IsDefault,
      IsActive,
      CreatedAt,
      UpdatedAt
    FROM Store
    WHERE IsActive = 1
  `
  
  const params = []
  
  if (search) {
    query += ` AND (StoreName LIKE ? OR ServiceArea LIKE ?)`
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm)
  }
  
  if (carrier && carrier !== 'all') {
    query += ` AND CarrierCode = ?`
    params.push(carrier)
  }
  
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
    
    return new Response(JSON.stringify({
      success: true,
      data: searchData
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    })

  } catch (error) {
    console.error('Postal API error:', error)
    
    // Return mock data as fallback
    return new Response(JSON.stringify({
      success: true,
      data: {
        result: [{
          zipcode: zipcode,
          prefecture_name: '栃木県',
          city_name: '那須郡那珂川町',
          address_name: '和見'
        }]
      }
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