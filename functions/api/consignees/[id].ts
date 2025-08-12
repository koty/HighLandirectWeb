import { EventContext, Env } from '../../types';

interface Consignee {
  ConsigneeId: number;
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
  ConsigneeCode?: string;
  DeliveryInstruction?: string;
  PreferredDeliveryTime?: string;
  IsActive: number;
  CreatedAt: string;
  UpdatedAt: string;
}

// GET /api/consignees/:id - Get consignee by ID
export async function onRequestGet(context: EventContext<Env>): Promise<Response> {
  const { params, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const consigneeId = params.id as string;

    if (!consigneeId) {
      return new Response(JSON.stringify({
        error: 'Consignee ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    console.log('Fetching consignee by ID:', consigneeId);

    // Query for single consignee with address information
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
        c.ConsigneeCode,
        c.DeliveryInstructions,
        c.PreferredDeliveryTime,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
      FROM Consignee c
      LEFT JOIN Address a ON c.AddressId = a.AddressId
      WHERE c.ConsigneeId = ? AND c.IsActive = 1
    `;

    const result = await env.DB.prepare(query).bind(consigneeId).first();

    if (!result) {
      return new Response(JSON.stringify({
        error: 'Consignee not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    console.log('Found consignee:', result);

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
    console.error('Error fetching consignee by ID:', error);
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

// PUT /api/consignees/:id - Update consignee by ID
export async function onRequestPut(context: EventContext<Env>): Promise<Response> {
  const { params, request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const consigneeId = params.id as string;
    const data = await request.json();

    if (!consigneeId) {
      return new Response(JSON.stringify({
        error: 'Consignee ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    console.log('Updating consignee:', { consigneeId, data });

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

    // First, get the current consignee to find AddressId
    const getCurrentQuery = `
      SELECT AddressId FROM Consignee WHERE ConsigneeId = ? AND IsActive = 1
    `;
    
    const currentResult = await env.DB.prepare(getCurrentQuery).bind(consigneeId).first();
    
    if (!currentResult) {
      return new Response(JSON.stringify({
        error: 'Consignee not found'
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

    // Update consignee information
    const updateConsigneeQuery = `
      UPDATE Consignee SET
        ConsigneeCode = ?,
        DeliveryInstructions = ?,
        PreferredDeliveryTime = ?,
        UpdatedAt = CURRENT_TIMESTAMP
      WHERE ConsigneeId = ?
    `;

    const consigneeResult = await env.DB.prepare(updateConsigneeQuery).bind(
      data.ConsigneeCode || null,
      data.DeliveryInstructions || null,
      data.PreferredDeliveryTime || null,
      consigneeId
    ).run();

    if (!consigneeResult.success) {
      throw new Error(`Failed to update consignee: ${consigneeResult.error}`);
    }

    console.log('Updated consignee:', { consigneeId, addressId });

    // Return the updated consignee data
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
        c.ConsigneeCode,
        c.DeliveryInstructions,
        c.PreferredDeliveryTime,
        c.IsActive,
        c.CreatedAt,
        c.UpdatedAt
      FROM Consignee c
      LEFT JOIN Address a ON c.AddressId = a.AddressId
      WHERE c.ConsigneeId = ?
    `;

    const updatedConsignee = await env.DB.prepare(fetchUpdatedQuery).bind(consigneeId).first();

    return new Response(JSON.stringify({
      success: true,
      data: updatedConsignee
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error updating consignee:', error);
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