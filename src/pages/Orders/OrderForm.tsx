import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs, { Dayjs } from 'dayjs'
import { useSnackbar } from 'notistack'
import DeleteIcon from '@mui/icons-material/Delete'

import type { OrderFormData, OrderDetail, Shipper, Consignee, Product, Store, Order } from '@/types'
import { mockShippers, mockConsignees, mockProducts, mockStores, mockOrders } from '@/data/mockData'

const schema = yup.object({
  OrderDate: yup.string().required('注文日は必須です'),
  ShipperId: yup.mixed<number | ''>().required('荷主を選択してください'),
  StoreId: yup.mixed<number | ''>().required('集配所を選択してください'),
  RequestedDeliveryDate: yup.string(),
  SpecialInstructions: yup.string(),
  OrderDetails: yup.array().of(
    yup.object({
      id: yup.string().required(),
      ConsigneeId: yup.number().required(),
      ProductId: yup.mixed<number | ''>().required('商品を選択してください'),
      Quantity: yup.number().min(1, '数量は1以上で入力してください').required('数量は必須です'),
    })
  ).min(1, '注文明細を少なくとも1件追加してください').required(),
})

const OrderForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(id)

  // モックデータを使用
  const [shippers] = useState<Shipper[]>(mockShippers)
  const [consignees] = useState<Consignee[]>(mockConsignees)
  const [products] = useState<Product[]>(mockProducts)
  const [stores] = useState<Store[]>(mockStores)
  const [shipperHistory, setShipperHistory] = useState<Order[]>([])

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OrderFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      OrderDate: dayjs().format('YYYY-MM-DD'),
      ShipperId: '',
      StoreId: '',
      RequestedDeliveryDate: '',
      SpecialInstructions: '',
      OrderDetails: [],
    },
  })

  const watchedShipperId = watch('ShipperId')
  const watchedOrderDetails = watch('OrderDetails')

  // 注文明細の管理関数
  const generateDetailId = () => `detail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 荷主選択時に送付履歴を取得
  useEffect(() => {
    if (watchedShipperId && typeof watchedShipperId === 'number') {
      // 選択された荷主の送付履歴を取得（新しい順）
      const history = mockOrders
        .filter(order => order.ShipperId === watchedShipperId)
        .sort((a, b) => new Date(b.OrderDate).getTime() - new Date(a.OrderDate).getTime())
      setShipperHistory(history)
    } else {
      setShipperHistory([])
    }
  }, [watchedShipperId])

  // 注文明細を追加する関数
  const addOrderDetail = (consignee: Consignee, order?: Order) => {
    const currentDetails = watch('OrderDetails') as OrderDetail[]
    
    // 既に同じ送付先の明細があるかチェック
    const existingDetail = currentDetails.find(detail => detail.ConsigneeId === consignee.ConsigneeId)
    if (existingDetail) {
      return // 既に存在する場合は追加しない
    }

    const newDetail: OrderDetail = {
      id: generateDetailId(),
      ConsigneeId: consignee.ConsigneeId,
      Consignee: consignee,
      ProductId: order?.ProductId || '',
      Product: order?.Product,
      Quantity: order?.Quantity || 1,
      UnitPrice: order?.UnitPrice,
      TotalAmount: order?.TotalAmount,
    }

    const updatedDetails = [...currentDetails, newDetail]
    setValue('OrderDetails', updatedDetails)
  }

  // 注文明細を削除する関数
  const removeOrderDetail = (detailId: string) => {
    const currentDetails = watch('OrderDetails') as OrderDetail[]
    const updatedDetails = currentDetails.filter(detail => detail.id !== detailId)
    setValue('OrderDetails', updatedDetails)
  }

  // 注文明細を更新する関数
  const updateOrderDetail = (detailId: string, updates: Partial<OrderDetail>) => {
    const currentDetails = watch('OrderDetails') as OrderDetail[]
    const updatedDetails = currentDetails.map(detail => 
      detail.id === detailId ? { ...detail, ...updates } : detail
    )
    setValue('OrderDetails', updatedDetails)
  }

  // 履歴から送付先を追加する関数（注文明細として追加）
  const addConsigneeFromHistory = (order: Order) => {
    if (order.Consignee) {
      addOrderDetail(order.Consignee, order)
    }
  }

  const onSubmit = async (data: OrderFormData) => {
    try {
      console.log('Submit data:', data)
      // TODO: API送信
      
      enqueueSnackbar(
        isEdit ? '注文を更新しました' : '注文を作成しました',
        { variant: 'success' }
      )
      navigate('/orders')
    } catch (error) {
      console.error('Error:', error)
      enqueueSnackbar('エラーが発生しました', { variant: 'error' })
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEdit ? '注文編集' : '新規注文'}
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="OrderDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="注文日"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(date: Dayjs | null) => {
                        field.onChange(date ? date.format('YYYY-MM-DD') : '')
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: Boolean(errors.OrderDate),
                          helperText: errors.OrderDate?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>


              <Grid item xs={12}>
                <Controller
                  name="ShipperId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      value={shippers.find(s => s.ShipperId === field.value) || null}
                      onChange={(_, shipper) => {
                        field.onChange(shipper?.ShipperId || '')
                      }}
                      options={shippers}
                      getOptionLabel={(option) => `${option.Address?.Name} (${option.ShipperCode})`}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="荷主"
                          error={Boolean(errors.ShipperId)}
                          helperText={errors.ShipperId?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  注文明細
                </Typography>
                {watchedOrderDetails.length > 0 ? (
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        注文明細 ({watchedOrderDetails.length}件)
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>送付先</TableCell>
                            <TableCell>商品</TableCell>
                            <TableCell>数量</TableCell>
                            <TableCell>単価</TableCell>
                            <TableCell>金額</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {watchedOrderDetails.map((detail) => (
                            <TableRow key={detail.id}>
                              <TableCell>
                                {detail.Consignee?.Address?.Name || '-'}
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                  {detail.Consignee?.ConsigneeCode}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  select
                                  size="small"
                                  value={detail.ProductId || ''}
                                  onChange={(e) => {
                                    const productId = Number(e.target.value)
                                    const product = products.find(p => p.ProductId === productId)
                                    updateOrderDetail(detail.id, {
                                      ProductId: productId,
                                      Product: product,
                                      UnitPrice: product?.UnitPrice,
                                    })
                                  }}
                                  sx={{ minWidth: 150 }}
                                >
                                  {products.map((product) => (
                                    <MenuItem key={product.ProductId} value={product.ProductId}>
                                      {product.ProductName}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={detail.Quantity}
                                  onChange={(e) => {
                                    const quantity = Number(e.target.value)
                                    updateOrderDetail(detail.id, {
                                      Quantity: quantity,
                                      TotalAmount: quantity * (detail.UnitPrice || 0),
                                    })
                                  }}
                                  inputProps={{ min: 1 }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell>
                                ¥{(detail.UnitPrice || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                ¥{((detail.Quantity || 0) * (detail.UnitPrice || 0)).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => removeOrderDetail(detail.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    注文明細がありません。下の履歴から選択するか、手動で追加してください。
                  </Typography>
                )}
                
                <Autocomplete
                  options={consignees}
                  getOptionLabel={(option) => `${option.Address?.Name} (${option.ConsigneeCode})`}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="送付先を追加"
                      helperText="送付先を選択すると注文明細が追加されます"
                    />
                  )}
                  onChange={(_, consignee) => {
                    if (consignee) {
                      addOrderDetail(consignee)
                    }
                  }}
                  value={null}
                />
                {errors.OrderDetails && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.OrderDetails.message}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="StoreId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="集配所"
                      error={Boolean(errors.StoreId)}
                      helperText={errors.StoreId?.message}
                    >
                      {stores.map((store) => (
                        <MenuItem key={store.StoreId} value={store.StoreId}>
                          {store.StoreName} - {store.ServiceArea}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="RequestedDeliveryDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="希望配送日"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(date: Dayjs | null) => {
                        field.onChange(date ? date.format('YYYY-MM-DD') : '')
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="SpecialInstructions"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="メモ"
                      multiline
                      rows={3}
                      placeholder="配送に関するメモがあれば記入してください"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/orders')}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit" variant="contained">
                    {isEdit ? '更新' : '作成'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* 荷主の送付履歴 */}
      {shipperHistory.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              選択荷主の送付履歴
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">選択</TableCell>
                    <TableCell>注文番号</TableCell>
                    <TableCell>注文日</TableCell>
                    <TableCell>送付先</TableCell>
                    <TableCell>商品</TableCell>
                    <TableCell>数量</TableCell>
                    <TableCell>金額</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shipperHistory.map((order) => (
                    <TableRow key={order.OrderId}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={watchedOrderDetails.some(detail => detail.ConsigneeId === order.ConsigneeId)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              addConsigneeFromHistory(order)
                            } else {
                              // 該当する明細を削除
                              const detailToRemove = watchedOrderDetails.find(detail => detail.ConsigneeId === order.ConsigneeId)
                              if (detailToRemove) {
                                removeOrderDetail(detailToRemove.id)
                              }
                            }
                          }}
                          disabled={!order.Consignee}
                        />
                      </TableCell>
                      <TableCell>{order.OrderNumber}</TableCell>
                      <TableCell>{order.OrderDate}</TableCell>
                      <TableCell>{order.Consignee?.Address?.Name || '-'}</TableCell>
                      <TableCell>{order.Product?.ProductName || '-'}</TableCell>
                      <TableCell>{order.Quantity}</TableCell>
                      <TableCell>¥{order.TotalAmount?.toLocaleString() || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default OrderForm