import React from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
} from '@mui/material'
import {
  Assignment as OrderIcon,
  Business as ShipperIcon,
  LocationOn as ConsigneeIcon,
  TrendingUp as TrendIcon,
  AttachMoney as RevenueIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

import { mockDashboardStats, mockOrders } from '@/data/mockData'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const stats = mockDashboardStats

  // 最近の注文（最新5件）
  const recentOrders = mockOrders
    .sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime())
    .slice(0, 5)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'processing': return 'info'
      case 'completed': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '受付'
      case 'processing': return '処理中'
      case 'completed': return '完了'
      case 'cancelled': return 'キャンセル'
      default: return '不明'
    }
  }

  const StatCard: React.FC<{
    title: string
    value: number
    icon: React.ReactNode
    color: string
    isPrice?: boolean
  }> = ({ title, value, icon, color, isPrice = false }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {isPrice ? `¥${value.toLocaleString()}` : value.toLocaleString()}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: '50%',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon as React.ReactElement, {
              sx: { color, fontSize: 40 }
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ダッシュボード
      </Typography>
      
      <Grid container spacing={3}>
        {/* 統計カード */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="総注文数"
            value={stats.totalOrders}
            icon={<OrderIcon />}
            color="#1976d2"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="本日の注文"
            value={stats.todayOrders}
            icon={<TrendIcon />}
            color="#2e7d32"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="荷主数"
            value={stats.totalShippers}
            icon={<ShipperIcon />}
            color="#ed6c02"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="送付先数"
            value={stats.totalConsignees}
            icon={<ConsigneeIcon />}
            color="#9c27b0"
          />
        </Grid>

        {/* 売上統計 */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="月間売上"
            value={stats.totalRevenue}
            icon={<RevenueIcon />}
            color="#2e7d32"
            isPrice={true}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="処理中"
            value={stats.processingOrders}
            icon={<TrendIcon />}
            color="#ed6c02"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="完了済み"
            value={stats.completedOrders}
            icon={<OrderIcon />}
            color="#2e7d32"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="キャンセル"
            value={stats.cancelledOrders}
            icon={<OrderIcon />}
            color="#d32f2f"
          />
        </Grid>

        {/* 最近の注文 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                最近の注文
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => navigate('/orders')}
              >
                全て見る
              </Button>
            </Box>
            <List>
              {recentOrders.map((order) => (
                <ListItem key={order.OrderId} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">
                          注文ID: {order.OrderId}
                        </Typography>
                        <Chip
                          label="完了"
                          color="success"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          荷主: {order.Shipper?.Address?.Name} → 送付先: {order.Consignee?.Address?.Name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {dayjs(order.OrderDate).format('YYYY/MM/DD')} - ¥{order.TotalAmount?.toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* クイックアクション */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              クイックアクション
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/orders/new')}
                fullWidth
              >
                新規注文作成
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/shippers')}
                fullWidth
              >
                荷主管理
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/consignees')}
                fullWidth
              >
                送付先管理
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/products')}
                fullWidth
              >
                商品管理
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard