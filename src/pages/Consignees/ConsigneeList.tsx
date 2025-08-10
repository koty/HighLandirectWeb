import React from 'react'
import { Box, Typography, Button, Card } from '@mui/material'
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'

import { mockConsignees } from '@/data/mockData'

const ConsigneeList: React.FC = () => {
  const navigate = useNavigate()

  const columns: GridColDef[] = [
    { field: 'ConsigneeCode', headerName: '送付先コード', width: 150 },
    { 
      field: 'name', 
      headerName: '送付先名', 
      width: 300,
      valueGetter: (params) => params.row.Address?.Name || ''
    },
    { 
      field: 'phone', 
      headerName: '電話番号', 
      width: 150,
      valueGetter: (params) => params.row.Address?.Phone || ''
    },
    { 
      field: 'prefecture', 
      headerName: '都道府県', 
      width: 120,
      valueGetter: (params) => params.row.Address?.PrefectureName || ''
    },
    { field: 'PreferredDeliveryTime', headerName: '希望時間', width: 120 },
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
          onClick={() => navigate(`/consignees/${params.id}/edit`)}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">送付先管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/consignees/new')}
        >
          新規送付先
        </Button>
      </Box>
      
      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={mockConsignees}
            columns={columns}
            getRowId={(row) => row.ConsigneeId}
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

export default ConsigneeList