import { EventContext, Env, CORS_HEADERS } from '../types';

interface Shipper {
  ShipperId: number;
  AddressId: number;
  Name: string;
  Furigana?: string;
  Keisho?: string;
  PostalCD?: string;
  PrefectureName?: string;
  CityName?: string;
  Address1?: string;
  Address2?: string;
  Phone?: string;
  Fax?: string;
  MailAddress?: string;
  Memo?: string;
  IsActive: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export async function onRequestGet(context: EventContext<Env>): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const search = url.searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;

    console.log('Fetching shippers from D1:', { page, limit, search });

    // Build search condition
    let searchCondition = '1 = 1';
    let searchParams = [];

    if (search) {
      searchCondition = `(a.Name LIKE ? OR a.Address1 LIKE ? OR a.Phone LIKE ?)`;
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    }

    // Query for shippers with address information
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
      WHERE ${searchCondition} AND s.IsActive = 1
      ORDER BY s.CreatedAt DESC, a.Name ASC
      LIMIT ? OFFSET ?
    `;

    const params = [...searchParams, limit, offset];
    console.log('SQL Query:', query, 'Params:', params);

    const result = await env.DB.prepare(query).bind(...params).all();

    if (!result.success) {
      throw new Error(`Database query failed: ${result.error}`);
    }

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Shipper s
      LEFT JOIN Address a ON s.AddressId = a.AddressId
      WHERE ${searchCondition} AND s.IsActive = 1
    `;
    
    const countResult = await env.DB.prepare(countQuery).bind(...searchParams).first();
    const total = countResult?.total || 0;

    console.log('Shippers query result:', result.results?.length, 'rows, total:', total);

    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error fetching shippers:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const data = await request.json();
    
    console.log('Creating new shipper:', data);

    // Validate required fields
    if (!data.Name) {
      return new Response(JSON.stringify({
        error: 'Name is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Start transaction by creating address first
    const addressQuery = `
      INSERT INTO Address (
        Name, Furigana, Keisho, PostalCD, PrefectureName, CityName,
        Address1, Address2, Phone, Fax, MailAddress, Memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

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
    ).run();

    if (!addressResult.success) {
      throw new Error(`Failed to create address: ${addressResult.error}`);
    }

    const addressId = addressResult.meta.last_row_id;

    // Create shipper record
    const shipperQuery = `
      INSERT INTO Shipper (AddressId) 
      VALUES (?)
    `;

    const shipperResult = await env.DB.prepare(shipperQuery).bind(
      addressId
    ).run();

    if (!shipperResult.success) {
      throw new Error(`Failed to create shipper: ${shipperResult.error}`);
    }

    const shipperId = shipperResult.meta.last_row_id;

    console.log('Created shipper:', { shipperId, addressId });

    return new Response(JSON.stringify({
      success: true,
      data: {
        ShipperId: shipperId,
        AddressId: addressId,
        ...data
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error creating shipper:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}