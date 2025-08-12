// CloudFlare Pages Function: Orders API with D1 Database

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Database query helpers
async function getOrders(env, { page = 1, limit = 10, status = null } = {}) {
  let query = `
    SELECT 
      o.OrderId as OrderID,
      o.OrderNumber,
      o.OrderDate,
      o.OrderStatus,
      o.TotalAmount,
      o.Quantity,
      sa.Name as ShipperName,
      ca.Name as ConsigneeName,
      pm.ProductName
    FROM "Order" o
    LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
    LEFT JOIN Address sa ON s.AddressId = sa.AddressId
    LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId
    LEFT JOIN Address ca ON c.AddressId = ca.AddressId
    LEFT JOIN ProductMaster pm ON o.ProductId = pm.ProductId
    WHERE 1 = 1
  `;

  const params = [];
  
  if (status) {
    query += ` AND o.OrderStatus = ?`;
    params.push(status);
  }

  query += ` ORDER BY o.OrderDate DESC`;
  
  // Add pagination
  const offset = (page - 1) * limit;
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  console.log('SQL Query:', query, 'Params:', params);
  
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return results;
}

async function getOrdersCount(env, { status = null } = {}) {
  let query = `SELECT COUNT(*) as total FROM "Order" WHERE 1 = 1`;
  const params = [];
  
  if (status) {
    query += ` AND OrderStatus = ?`;
    params.push(status);
  }

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return results[0]?.total || 0;
}

async function createOrder(env, orderData) {
  const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  
  const query = `
    INSERT INTO "Order" (
      OrderNumber, OrderDate, ShipperId, ConsigneeId, ProductId, StoreId,
      Quantity, UnitPrice, TotalAmount, OrderStatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    orderNumber,
    new Date().toISOString().split('T')[0],
    orderData.ShipperId || 1,
    orderData.ConsigneeId || 1,
    orderData.ProductId || 1,
    orderData.StoreId || 1,
    orderData.Quantity || 1,
    orderData.UnitPrice || 1000,
    orderData.TotalAmount || 1000,
    '受付'
  ];

  await env.DB.prepare(query).bind(...params).run();
  
  // Return the created order
  const selectQuery = `
    SELECT 
      o.OrderId as OrderID,
      o.OrderNumber,
      o.OrderDate,
      o.OrderStatus,
      o.TotalAmount,
      o.Quantity,
      sa.Name as ShipperName,
      ca.Name as ConsigneeName,
      pm.ProductName
    FROM "Order" o
    LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
    LEFT JOIN Address sa ON s.AddressId = sa.AddressId
    LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId
    LEFT JOIN Address ca ON c.AddressId = ca.AddressId
    LEFT JOIN ProductMaster pm ON o.ProductId = pm.ProductId
    WHERE o.OrderNumber = ?
  `;

  const { results } = await env.DB.prepare(selectQuery).bind(orderNumber).all();
  return results[0];
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Check if database is available
  if (!env.DB) {
    console.error('Database not available, falling back to mock data');
    return new Response(JSON.stringify({
      error: 'Database not configured'
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }

  try {
    if (request.method === 'GET') {
      // Parse query parameters
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const status = url.searchParams.get('status');

      console.log('Fetching orders from D1:', { page, limit, status });

      // Get orders from database
      const orders = await getOrders(env, { 
        page, 
        limit, 
        status: (status && status !== 'all') ? status : null 
      });

      // Get total count for pagination
      const total = await getOrdersCount(env, { 
        status: (status && status !== 'all') ? status : null 
      });

      const response = {
        success: true,
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      console.log('D1 Response:', { orderCount: orders.length, total });

      return new Response(JSON.stringify(response), { 
        headers: CORS_HEADERS 
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      
      console.log('Creating new order:', body);

      // Create new order in database
      const newOrder = await createOrder(env, body);

      const response = {
        success: true,
        data: newOrder
      };

      console.log('Created order:', newOrder);

      return new Response(JSON.stringify(response), { 
        headers: CORS_HEADERS 
      });
    }

    // Method not allowed
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: CORS_HEADERS
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}