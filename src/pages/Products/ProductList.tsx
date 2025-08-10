import React from 'react'
import { Box, Typography, Card, Chip } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'

import { mockProducts } from '@/data/mockData'

const ProductList: React.FC = () => {
  const columns: GridColDef[] = [
    { field: 'ProductCode', headerName: '商品コード', width: 150 },
    { field: 'ProductName', headerName: '商品名', width: 250 },
    { field: 'ProductCategory', headerName: 'カテゴリ', width: 150 },
    { 
      field: 'UnitPrice', 
      headerName: '単価', 
      width: 120,
      valueFormatter: (params) => `¥${params.value?.toLocaleString() || 0}`
    },
    { field: 'Weight', headerName: '重量(kg)', width: 100 },
    { field: 'Dimensions', headerName: 'サイズ', width: 150 },
    { 
      field: 'IsFragile', 
      headerName: '破損注意', 
      width: 100,
      renderCell: (params) => params.value ? <Chip label="注意" size="small" color="warning" /> : null
    },
    {
      field: 'IsDefault',
      headerName: 'デフォルト',
      width: 120,
      renderCell: (params) => params.value ? <Chip label="デフォルト" size="small" color="primary" /> : null
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>商品管理</Typography>
      
      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={mockProducts}
            columns={columns}
            getRowId={(row) => row.ProductId}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 25,
                },
              },
            }}
            pageSizeOptions={[25, 50, 100]}
            sx={{ border: 0 }}
          />
        </Box>
      </Card>
    </Box>
  )
}

export default ProductList