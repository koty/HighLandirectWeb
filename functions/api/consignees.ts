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
    
    const offset = (page - 1) * limit;

    console.log('Fetching consignees from D1:', { page, limit, search });

    // Build search condition
    let searchCondition = '1 = 1';
    let searchParams = [];

    if (search) {
      searchCondition = `(a.Name LIKE ? OR a.Address1 LIKE ? OR a.Phone LIKE ?)`;
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm, searchTerm];
    }

    // Query for consignees with address information
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
      WHERE ${searchCondition} AND c.IsActive = 1
      ORDER BY c.CreatedAt DESC, a.Name ASC
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
      FROM Consignee c
      LEFT JOIN Address a ON c.AddressId = a.AddressId
      WHERE ${searchCondition} AND c.IsActive = 1
    `;
    
    const countResult = await env.DB.prepare(countQuery).bind(...searchParams).first();
    const total = countResult?.total || 0;

    console.log('Consignees query result:', result.results?.length, 'rows, total:', total);

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
    console.error('Error fetching consignees:', error);
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
    
    console.log('Creating new consignee:', data);

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

    // Create consignee record
    const consigneeQuery = `
      INSERT INTO Consignee (AddressId) 
      VALUES (?)
    `;

    const consigneeResult = await env.DB.prepare(consigneeQuery).bind(
      addressId
    ).run();

    if (!consigneeResult.success) {
      throw new Error(`Failed to create consignee: ${consigneeResult.error}`);
    }

    const consigneeId = consigneeResult.meta.last_row_id;

    console.log('Created consignee:', { consigneeId, addressId });

    return new Response(JSON.stringify({
      success: true,
      data: {
        ConsigneeId: consigneeId,
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
    console.error('Error creating consignee:', error);
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