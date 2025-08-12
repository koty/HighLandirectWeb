import { EventContext, Env } from '../../types';

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
  ShipperCode?: string;
  ShipperType?: string;
  ContractStartDate?: string;
  ContractEndDate?: string;
  CreditLimit?: number;
  PaymentTerms?: string;
  IsActive: number;
  CreatedAt: string;
  UpdatedAt: string;
}

// GET /api/shippers/:id - Get shipper by ID
export async function onRequestGet(context: EventContext<Env>): Promise<Response> {
  const { params, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const shipperId = params.id as string;

    if (!shipperId) {
      return new Response(JSON.stringify({
        error: 'Shipper ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    console.log('Fetching shipper by ID:', shipperId);

    // Query for single shipper with address information
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
      WHERE s.ShipperId = ? AND s.IsActive = 1
    `;

    const result = await env.DB.prepare(query).bind(shipperId).first();

    if (!result) {
      return new Response(JSON.stringify({
        error: 'Shipper not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    console.log('Found shipper:', result);

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error fetching shipper by ID:', error);
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

// PUT /api/shippers/:id - Update shipper by ID
export async function onRequestPut(context: EventContext<Env>): Promise<Response> {
  const { params, request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const shipperId = params.id as string;
    const data = await request.json();

    if (!shipperId) {
      return new Response(JSON.stringify({
        error: 'Shipper ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    console.log('Updating shipper:', { shipperId, data });

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

    // First, get the current shipper to find AddressId
    const getCurrentQuery = `
      SELECT AddressId FROM Shipper WHERE ShipperId = ? AND IsActive = 1
    `;
    
    const currentResult = await env.DB.prepare(getCurrentQuery).bind(shipperId).first();
    
    if (!currentResult) {
      return new Response(JSON.stringify({
        error: 'Shipper not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const addressId = currentResult.AddressId;

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
    `;

    const addressResult = await env.DB.prepare(updateAddressQuery).bind(
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
    ).run();

    if (!addressResult.success) {
      throw new Error(`Failed to update address: ${addressResult.error}`);
    }

    // Update shipper information
    const updateShipperQuery = `
      UPDATE Shipper SET
        ShipperCode = ?,
        ShipperType = ?,
        ContractStartDate = ?,
        CreditLimit = ?,
        PaymentTerms = ?,
        UpdatedAt = CURRENT_TIMESTAMP
      WHERE ShipperId = ?
    `;

    const shipperResult = await env.DB.prepare(updateShipperQuery).bind(
      data.ShipperCode || null,
      data.ShipperType || null,
      data.ContractStartDate || null,
      data.CreditLimit || null,
      data.PaymentTerms || null,
      shipperId
    ).run();

    if (!shipperResult.success) {
      throw new Error(`Failed to update shipper: ${shipperResult.error}`);
    }

    console.log('Updated shipper:', { shipperId, addressId });

    // Return the updated shipper data
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
      WHERE s.ShipperId = ?
    `;

    const updatedShipper = await env.DB.prepare(fetchUpdatedQuery).bind(shipperId).first();

    return new Response(JSON.stringify({
      success: true,
      data: updatedShipper
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error updating shipper:', error);
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

export async function onRequestOptions(context: EventContext<Env>): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}