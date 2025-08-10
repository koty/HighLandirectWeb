import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box } from '@mui/material'

import Layout from '@/components/Layout/Layout'
import Dashboard from '@/pages/Dashboard'
import OrderList from '@/pages/Orders/OrderList'
import OrderForm from '@/pages/Orders/OrderForm'
import ShipperList from '@/pages/Shippers/ShipperList'
import ShipperForm from '@/pages/Shippers/ShipperForm'
import ConsigneeList from '@/pages/Consignees/ConsigneeList'
import ConsigneeForm from '@/pages/Consignees/ConsigneeForm'
import ProductList from '@/pages/Products/ProductList'
import StoreList from '@/pages/Stores/StoreList'

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          {/* 注文管理 */}
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/new" element={<OrderForm />} />
          <Route path="/orders/:id/edit" element={<OrderForm />} />
          
          {/* 荷主管理 */}
          <Route path="/shippers" element={<ShipperList />} />
          <Route path="/shippers/new" element={<ShipperForm />} />
          <Route path="/shippers/:id/edit" element={<ShipperForm />} />
          
          {/* 送付先管理 */}
          <Route path="/consignees" element={<ConsigneeList />} />
          <Route path="/consignees/new" element={<ConsigneeForm />} />
          <Route path="/consignees/:id/edit" element={<ConsigneeForm />} />
          
          {/* 商品管理 */}
          <Route path="/products" element={<ProductList />} />
          
          {/* 集配所管理 */}
          <Route path="/stores" element={<StoreList />} />
        </Routes>
      </Layout>
    </Box>
  )
}

export default App