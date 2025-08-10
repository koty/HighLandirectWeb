import React, { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

import type { Order } from '@/types'
import { mockOrders } from '@/data/mockData'

const OrderList: React.FC = () => {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // フィルタリング処理
  const filteredOrders = mockOrders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.OrderStatus === statusFilter
    const matchesSearch = searchTerm === '' || 
      order.OrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.Shipper?.Address?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.Consignee?.Address?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  const getStatusColor = (status: Order['OrderStatus']) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'processing': return 'info'
      case 'completed': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getStatusText = (status: Order['OrderStatus']) => {
    switch (status) {
      case 'pending': return '受付'
      case 'processing': return '処理中'
      case 'completed': return '完了'
      case 'cancelled': return 'キャンセル'
      default: return '不明'
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'OrderNumber',
      headerName: '注文番号',
      width: 150,
    },
    {
      field: 'OrderDate',
      headerName: '注文日',
      width: 120,
      valueFormatter: (params) => dayjs(params.value).format('YYYY/MM/DD'),
    },
    {
      field: 'shipperName',
      headerName: '荷主',
      width: 200,
      valueGetter: (params) => params.row.Shipper?.Address?.Name || '',
    },
    {
      field: 'consigneeName',
      headerName: '送付先',
      width: 200,
      valueGetter: (params) => params.row.Consignee?.Address?.Name || '',
    },
    {
      field: 'TotalAmount',
      headerName: '金額',
      width: 100,
      valueFormatter: (params) => `¥${params.value?.toLocaleString() || 0}`,
    },
    {
      field: 'OrderStatus',
      headerName: 'ステータス',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={getStatusText(params.value)}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'TrackingNumber',
      headerName: '追跡番号',
      width: 150,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="編集"
          onClick={() => navigate(`/orders/${params.id}/edit`)}
        />,
        <GridActionsCellItem
          key="print"
          icon={<PrintIcon />}
          label="印刷"
          onClick={() => {
            // TODO: ヤマトB2 API連携
            console.log('印刷:', params.id)
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="削除"
          onClick={() => {
            // TODO: 削除確認ダイアログ
            console.log('削除:', params.id)
          }}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">注文管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/orders/new')}
        >
          新規注文
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="注文番号、荷主名、送付先名で検索"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="ステータス"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="pending">受付</MenuItem>
                <MenuItem value="processing">処理中</MenuItem>
                <MenuItem value="completed">完了</MenuItem>
                <MenuItem value="cancelled">キャンセル</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredOrders}
            columns={columns}
            getRowId={(row) => row.OrderId}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 25,
                },
              },
            }}
            pageSizeOptions={[25, 50, 100]}
            checkboxSelection
            disableRowSelectionOnClick
            sx={{
              border: 0,
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
            }}
          />
        </Box>
      </Card>
    </Box>
  )
}

export default OrderList