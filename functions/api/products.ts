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
    const category = url.searchParams.get('category') || '';
    const activeOnly = url.searchParams.get('activeOnly') !== 'false'; // default true
    
    const offset = (page - 1) * limit;

    console.log('Fetching products from D1:', { page, limit, search, category, activeOnly });

    // Build where conditions
    let whereConditions = [];
    let searchParams = [];

    if (activeOnly) {
      whereConditions.push('IsActive = 1');
    }

    if (search) {
      whereConditions.push('(ProductName LIKE ? OR ProductCode LIKE ?)');
      const searchTerm = `%${search}%`;
      searchParams.push(searchTerm, searchTerm);
    }

    if (category) {
      whereConditions.push('ProductCategory = ?');
      searchParams.push(category);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query for products
    const query = `
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
      ${whereClause}
      ORDER BY IsDefault DESC, ProductName ASC
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
      FROM ProductMaster
      ${whereClause}
    `;
    
    const countResult = await env.DB.prepare(countQuery).bind(...searchParams).first();
    const total = countResult?.total || 0;

    // Get product categories for filtering
    const categoriesQuery = `
      SELECT DISTINCT ProductCategory
      FROM ProductMaster
      WHERE IsActive = 1 AND ProductCategory IS NOT NULL
      ORDER BY ProductCategory ASC
    `;
    
    const categoriesResult = await env.DB.prepare(categoriesQuery).all();
    const categories = categoriesResult.results?.map(row => row.ProductCategory) || [];

    console.log('Products query result:', result.results?.length, 'rows, total:', total);

    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      categories
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
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
    
    console.log('Creating new product:', data);

    // Validate required fields
    if (!data.ProductName || !data.UnitPrice) {
      return new Response(JSON.stringify({
        error: 'ProductName and UnitPrice are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Create product record
    const query = `
      INSERT INTO ProductMaster (
        ProductCode, ProductName, ProductCategory, UnitPrice, TaxRate,
        Weight, Dimensions, IsFragile, IsDefault, IsActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await env.DB.prepare(query).bind(
      data.ProductCode || null,
      data.ProductName,
      data.ProductCategory || null,
      data.UnitPrice,
      data.TaxRate || 0.1,
      data.Weight || null,
      data.Dimensions || null,
      data.IsFragile ? 1 : 0,
      data.IsDefault ? 1 : 0,
      data.IsActive !== undefined ? (data.IsActive ? 1 : 0) : 1
    ).run();

    if (!result.success) {
      throw new Error(`Failed to create product: ${result.error}`);
    }

    const productId = result.meta.last_row_id;

    console.log('Created product:', { productId });

    return new Response(JSON.stringify({
      success: true,
      data: {
        ProductId: productId,
        ...data
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error creating product:', error);
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