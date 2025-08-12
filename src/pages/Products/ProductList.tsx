import React, { useState } from 'react'
import { Box, Typography, Card, Chip, TextField, CircularProgress, Alert } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useQuery } from 'react-query'
import axios from 'axios'

import { ProductMaster } from '@/types'

const ProductList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Fetch products from API
  const { data, isLoading, error } = useQuery(
    ['products', page + 1, pageSize, searchTerm],
    async () => {
      const response = await axios.get('/api/products', {
        params: {
          page: page + 1,
          limit: pageSize,
          search: searchTerm || undefined
        }
      })
      return response.data
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false
    }
  )

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

  if (error) {
    return (
      <Box>
        <Typography variant="h4" mb={3}>商品管理</Typography>
        <Alert severity="error">
          データの取得に失敗しました: {error instanceof Error ? error.message : '不明なエラー'}
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>商品管理</Typography>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="商品名、商品コードで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
      </Box>
      
      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={data?.data || []}
            columns={columns}
            getRowId={(row) => row.ProductId}
            loading={isLoading}
            pagination
            paginationMode="server"
            rowCount={data?.pagination?.total || 0}
            paginationModel={{
              page,
              pageSize,
            }}
            onPaginationModelChange={(model) => {
              setPage(model.page)
              setPageSize(model.pageSize)
            }}
            pageSizeOptions={[25, 50, 100]}
            sx={{ border: 0 }}
            components={{
              LoadingOverlay: () => (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <CircularProgress />
                </Box>
              )
            }}
          />
        </Box>
      </Card>
    </Box>
  )
}

export default ProductList