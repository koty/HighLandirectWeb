import type { PagesFunction, Env } from '../../../functions/types'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context
    const id = params.id as string

    if (!id || isNaN(Number(id))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid order ID'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const query = `
      SELECT 
        o.OrderId, o.OrderDate, o.ShipperId, o.ConsigneeId, o.ProductId, o.StoreId,
        o.Quantity, o.UnitPrice, o.TotalAmount, o.TrackingNumber, o.CreatedAt, o.UpdatedAt,
        sa.Name as ShipperName, ca.Name as ConsigneeName, pm.ProductName, st.StoreName
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      LEFT JOIN ProductMaster pm ON o.ProductId = pm.ProductId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE o.OrderId = ?
    `

    const result = await env.DB.prepare(query).bind(Number(id)).first()

    if (!result) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Order not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Get order error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const { params, env, request } = context
    const id = params.id as string

    if (!id || isNaN(Number(id))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid order ID'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await request.json() as any

    // Validate required fields
    if (!data.ShipperId || !data.ConsigneeId || !data.ProductId || !data.StoreId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const updateQuery = `
      UPDATE "Order"
      SET 
        OrderDate = ?,
        ShipperId = ?,
        ConsigneeId = ?,
        ProductId = ?,
        StoreId = ?,
        Quantity = ?,
        UnitPrice = ?,
        TotalAmount = ?,
        UpdatedAt = datetime('now')
      WHERE OrderId = ?
    `

    const result = await env.DB.prepare(updateQuery)
      .bind(
        data.OrderDate,
        data.ShipperId,
        data.ConsigneeId,
        data.ProductId,
        data.StoreId,
        data.Quantity || 1,
        data.UnitPrice || 0,
        data.TotalAmount || 0,
        Number(id)
      )
      .run()

    if (result.changes === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Order not found or not updated'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get updated order
    const getQuery = `
      SELECT 
        o.OrderId, o.OrderDate, o.ShipperId, o.ConsigneeId, o.ProductId, o.StoreId,
        o.Quantity, o.UnitPrice, o.TotalAmount, o.TrackingNumber, o.CreatedAt, o.UpdatedAt,
        sa.Name as ShipperName, ca.Name as ConsigneeName, pm.ProductName, st.StoreName
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Consignee c ON o.ConsigneeId = c.ConsigneeId
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      LEFT JOIN ProductMaster pm ON o.ProductId = pm.ProductId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE o.OrderId = ?
    `

    const updatedOrder = await env.DB.prepare(getQuery).bind(Number(id)).first()

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedOrder
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Update order error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context
    const id = params.id as string

    if (!id || isNaN(Number(id))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid order ID'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const deleteQuery = `DELETE FROM "Order" WHERE OrderId = ?`
    const result = await env.DB.prepare(deleteQuery).bind(Number(id)).run()

    if (result.changes === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Order not found'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order deleted successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Delete order error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}