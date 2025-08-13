import React, { useState } from 'react'
import { Box, Typography, Card, Chip, TextField, CircularProgress, Alert } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useQuery } from 'react-query'
import axios from 'axios'

// Store type is no longer needed as individual import

const StoreList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Fetch stores from API
  const { data, isLoading, error } = useQuery(
    ['stores', page + 1, pageSize, searchTerm],
    async () => {
      const response = await axios.get('/api/stores', {
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
    { field: 'StoreName', headerName: '集配所名', width: 300 },
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
        <Typography variant="h4" mb={3}>集配所管理</Typography>
        <Alert severity="error">
          データの取得に失敗しました: {error instanceof Error ? error.message : '不明なエラー'}
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>集配所管理</Typography>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="集配所名、サービスエリアで検索..."
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
            getRowId={(row) => row.StoreId}
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

export default StoreList