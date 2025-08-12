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