// CloudFlare Pages Function: Orders API

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Mock data (same as frontend)
const mockOrders = [
  {
    OrderID: 1,
    OrderNumber: "ORD-2024-001",
    OrderDate: "2024-01-15",
    ShipperName: "東京商事株式会社",
    ConsigneeName: "山田太郎",
    OrderStatus: "完了",
    TotalAmount: 12500,
    ProductName: "宅急便60サイズ",
    Quantity: 1
  },
  {
    OrderID: 2,
    OrderNumber: "ORD-2024-002", 
    OrderDate: "2024-01-16",
    ShipperName: "大阪工業株式会社",
    ConsigneeName: "大阪工業株式会社",
    OrderStatus: "受付",
    TotalAmount: 15800,
    ProductName: "クール宅急便",
    Quantity: 2
  },
  {
    OrderID: 3,
    OrderNumber: "ORD-2024-003",
    OrderDate: "2024-01-17", 
    ShipperName: "名古屋商会",
    ConsigneeName: "山田太郎",
    OrderStatus: "完了",
    TotalAmount: 18200,
    ProductName: "宅急便100サイズ", 
    Quantity: 1
  }
];

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (request.method === 'GET') {
      // Parse query parameters
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const status = url.searchParams.get('status');

      let filteredOrders = mockOrders;
      
      // Filter by status
      if (status && status !== 'all') {
        filteredOrders = mockOrders.filter(order => order.OrderStatus === status);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

      const response = {
        success: true,
        data: paginatedOrders,
        pagination: {
          page,
          limit,
          total: filteredOrders.length,
          totalPages: Math.ceil(filteredOrders.length / limit)
        }
      };

      return new Response(JSON.stringify(response), { 
        headers: CORS_HEADERS 
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      
      // Create new order (mock)
      const newOrder = {
        OrderID: mockOrders.length + 1,
        OrderNumber: `ORD-2024-${String(mockOrders.length + 1).padStart(3, '0')}`,
        OrderDate: new Date().toISOString().split('T')[0],
        ...body,
        OrderStatus: "受付"
      };

      const response = {
        success: true,
        data: newOrder
      };

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