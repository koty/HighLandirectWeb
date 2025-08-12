import React, { useState, useEffect } from 'react'
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
  CircularProgress,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

import type { Order } from '@/types'
import { api } from '@/api/client'

const OrderList: React.FC = () => {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // API呼び出し
  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      console.log('Fetching orders with params:', params) // デバッグログ
      const response = await api.orders.list(params)
      
      console.log('API Response:', response) // デバッグログ
      
      if (response.success) {
        setOrders(response.data)
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            totalPages: response.pagination.totalPages
          }))
        }
      } else {
        setError('データの取得に失敗しました')
      }
    } catch (error) {
      console.error('Orders API Error:', error) // デバッグログ
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込みと依存値変更時の再読み込み
  useEffect(() => {
    fetchOrders()
  }, [statusFilter, pagination.page, pagination.limit])

  // フィルタリング処理（クライアントサイド検索用）
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = searchTerm === '' || 
      order.Shipper?.Address?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.Consignee?.Address?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const columns: GridColDef[] = [
    {
      field: 'OrderDate',
      headerName: '注文日',
      width: 120,
      valueFormatter: (params) => dayjs(params.value).format('YYYY/MM/DD'),
    },
    {
      field: 'ShipperName',
      headerName: '荷主',
      width: 200,
      valueGetter: (params) => params.row.Shipper?.Address?.Name || '',
    },
    {
      field: 'ConsigneeName',
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
                <MenuItem value="受付">受付</MenuItem>
                <MenuItem value="処理中">処理中</MenuItem>
                <MenuItem value="完了">完了</MenuItem>
                <MenuItem value="キャンセル">キャンセル</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Box p={2}>
              <Typography color="error">{error}</Typography>
              <Button onClick={fetchOrders}>再読み込み</Button>
            </Box>
          )}
          {!loading && !error && (
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
          )}
        </Box>
      </Card>
    </Box>
  )
}

export default OrderList