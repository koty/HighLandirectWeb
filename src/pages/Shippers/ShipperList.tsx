import React, { useState } from 'react'
import { Box, Typography, Button, Card, TextField, CircularProgress, Alert } from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Search as SearchIcon } from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import axios from 'axios'

// Shipper type is no longer needed as individual import

const ShipperList: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Fetch shippers from API
  const { data, isLoading, error } = useQuery(
    ['shippers', page + 1, pageSize, searchTerm],
    async () => {
      const response = await axios.get('/api/shippers', {
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
    { field: 'ShipperCode', headerName: '荷主コード', width: 150 },
    { field: 'Name', headerName: '荷主名', width: 300 },
    { field: 'Phone', headerName: '電話番号', width: 150 },
    { field: 'PrefectureName', headerName: '都道府県', width: 120 },
    { field: 'ShipperType', headerName: '種別', width: 120 },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="編集"
          onClick={() => navigate(`/shippers/${params.id}/edit`)}
        />,
      ],
    },
  ]

  if (error) {
    return (
      <Box>
        <Typography variant="h4" mb={3}>荷主管理</Typography>
        <Alert severity="error">
          データの取得に失敗しました: {error instanceof Error ? error.message : '不明なエラー'}
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">荷主管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/shippers/new')}
        >
          新規荷主
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="荷主名、住所、電話番号で検索..."
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
            getRowId={(row) => row.ShipperId}
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

export default ShipperList