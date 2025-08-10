import React from 'react'
import { Box, Typography, Card, Chip } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'

import { mockStores } from '@/data/mockData'

const StoreList: React.FC = () => {
  const columns: GridColDef[] = [
    { field: 'StoreCode', headerName: '集配所コード', width: 150 },
    { field: 'StoreName', headerName: '集配所名', width: 300 },
    { field: 'CarrierName', headerName: '配送業者', width: 150 },
    { field: 'ServiceArea', headerName: 'サービスエリア', width: 250 },
    { field: 'CutoffTime', headerName: '集荷締切', width: 100 },
    { field: 'ContactPhone', headerName: '連絡先', width: 150 },
    {
      field: 'IsDefault',
      headerName: 'デフォルト',
      width: 120,
      renderCell: (params) => params.value ? <Chip label="デフォルト" size="small" color="primary" /> : null
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>集配所管理</Typography>
      
      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={mockStores}
            columns={columns}
            getRowId={(row) => row.StoreId}
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

export default StoreList