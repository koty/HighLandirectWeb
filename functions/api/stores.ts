export async function onRequestGet(context) {
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
    const carrier = url.searchParams.get('carrier') || '';
    const activeOnly = url.searchParams.get('activeOnly') !== 'false'; // default true
    
    const offset = (page - 1) * limit;

    console.log('Fetching stores from D1:', { page, limit, search, carrier, activeOnly });

    // Build where conditions
    let whereConditions = [];
    let searchParams = [];

    if (activeOnly) {
      whereConditions.push('IsActive = 1');
    }

    if (search) {
      whereConditions.push('StoreName LIKE ?');
      const searchTerm = `%${search}%`;
      searchParams.push(searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query for stores
    const query = `
      SELECT 
        StoreId,
        StoreName,
        IsDefault,
        IsActive,
        CreatedAt,
        UpdatedAt
      FROM Store
      ${whereClause}
      ORDER BY IsDefault DESC, StoreName ASC
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
      FROM Store
      ${whereClause}
    `;
    
    const countResult = await env.DB.prepare(countQuery).bind(...searchParams).first();
    const total = countResult?.total || 0;

    // No carriers since CarrierCode and CarrierName columns were removed
    const carriers = [];

    console.log('Stores query result:', result.results?.length, 'rows, total:', total);

    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      carriers
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error fetching stores:', error);
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
    
    console.log('Creating new store:', data);

    // Validate required fields
    if (!data.StoreName) {
      return new Response(JSON.stringify({
        error: 'StoreName is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Create store record
    const query = `
      INSERT INTO Store (
        StoreName, IsDefault, IsActive
      ) VALUES (?, ?, ?)
    `;

    const result = await env.DB.prepare(query).bind(
      data.StoreName,
      data.IsDefault ? 1 : 0,
      data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1
    ).run();

    if (!result.success) {
      throw new Error(`Failed to create store: ${result.error}`);
    }

    const storeId = result.meta.last_row_id;

    console.log('Created store:', { storeId });

    return new Response(JSON.stringify({
      success: true,
      data: {
        StoreId: storeId,
        ...data
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error creating store:', error);
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