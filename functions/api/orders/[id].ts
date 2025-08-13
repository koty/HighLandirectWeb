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

    // 注文ヘッダー取得
    const orderQuery = `
      SELECT 
        o.OrderId, o.OrderDate, o.ShipperId, o.StoreId,
        o.OrderTotal, o.ItemCount, o.TrackingNumber, o.CreatedAt, o.UpdatedAt,
        sa.Name as ShipperName, st.StoreName
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE o.OrderId = ?
    `

    const order = await env.DB.prepare(orderQuery).bind(Number(id)).first()
    
    if (!order) {
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

    // 注文明細取得
    const detailsQuery = `
      SELECT 
        od.OrderDetailId, od.OrderId, od.ConsigneeId, od.ProductId,
        od.Quantity, od.UnitPrice, od.LineTotal, od.CreatedAt, od.UpdatedAt,
        ca.Name as ConsigneeName, pm.ProductName
      FROM OrderDetail od
      LEFT JOIN Consignee c ON od.ConsigneeId = c.ConsigneeId
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      LEFT JOIN ProductMaster pm ON od.ProductId = pm.ProductId
      WHERE od.OrderId = ?
    `

    const detailsResult = await env.DB.prepare(detailsQuery).bind(Number(id)).all()
    
    const result = {
      ...order,
      OrderDetails: detailsResult.results || []
    }

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

    // 注文ヘッダーの基本情報のみ更新可能（OrderDate, TrackingNumber）
    // 明細情報は別途明細管理APIで対応する設計
    const allowedFields = ['OrderDate', 'TrackingNumber']
    const updates = []
    const values = []
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(data[field])
      }
    })
    
    if (updates.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid fields to update'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // UpdatedAtを追加
    updates.push('UpdatedAt = datetime(\'now\')')
    values.push(Number(id))

    const updateQuery = `
      UPDATE "Order"
      SET ${updates.join(', ')}
      WHERE OrderId = ?
    `

    const result = await env.DB.prepare(updateQuery).bind(...values).run()

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

    // 更新された注文を取得（明細込み）
    const getOrderQuery = `
      SELECT 
        o.OrderId, o.OrderDate, o.ShipperId, o.StoreId,
        o.OrderTotal, o.ItemCount, o.TrackingNumber, o.CreatedAt, o.UpdatedAt,
        sa.Name as ShipperName, st.StoreName
      FROM "Order" o
      LEFT JOIN Shipper s ON o.ShipperId = s.ShipperId
      LEFT JOIN Address sa ON s.AddressId = sa.AddressId
      LEFT JOIN Store st ON o.StoreId = st.StoreId
      WHERE o.OrderId = ?
    `

    const updatedOrder = await env.DB.prepare(getOrderQuery).bind(Number(id)).first()
    
    // 明細も取得
    const detailsQuery = `
      SELECT 
        od.OrderDetailId, od.OrderId, od.ConsigneeId, od.ProductId,
        od.Quantity, od.UnitPrice, od.LineTotal, od.CreatedAt, od.UpdatedAt,
        ca.Name as ConsigneeName, pm.ProductName
      FROM OrderDetail od
      LEFT JOIN Consignee c ON od.ConsigneeId = c.ConsigneeId
      LEFT JOIN Address ca ON c.AddressId = ca.AddressId
      LEFT JOIN ProductMaster pm ON od.ProductId = pm.ProductId
      WHERE od.OrderId = ?
    `

    const detailsResult = await env.DB.prepare(detailsQuery).bind(Number(id)).all()
    
    const finalOrder = {
      ...updatedOrder,
      OrderDetails: detailsResult.results || []
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: finalOrder
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