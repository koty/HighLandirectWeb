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
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs, { Dayjs } from 'dayjs'
import { useSnackbar } from 'notistack'

import type { OrderFormData, Shipper, Consignee, Product, Store } from '@/types'
import { mockShippers, mockConsignees, mockProducts, mockStores } from '@/data/mockData'

const schema = yup.object({
  OrderDate: yup.string().required('注文日は必須です'),
  ShipperId: yup.number().required('荷主を選択してください'),
  ConsigneeId: yup.number().required('送付先を選択してください'),
  ProductId: yup.number().required('商品を選択してください'),
  StoreId: yup.number().required('集配所を選択してください'),
  Quantity: yup.number().min(1, '数量は1以上で入力してください').required('数量は必須です'),
  RequestedDeliveryDate: yup.string(),
  SpecialInstructions: yup.string(),
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
      ConsigneeId: '',
      ProductId: '',
      StoreId: '',
      Quantity: 1,
      RequestedDeliveryDate: '',
      SpecialInstructions: '',
    },
  })

  const watchedProductId = watch('ProductId')

  // 商品選択時に単価を自動設定
  useEffect(() => {
    if (watchedProductId) {
      const selectedProduct = products.find(p => p.ProductId === watchedProductId)
      if (selectedProduct) {
        // TODO: 単価の自動計算をここで行う
      }
    }
  }, [watchedProductId, products])

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

              <Grid item xs={12} md={6}>
                <Controller
                  name="Quantity"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="数量"
                      type="number"
                      error={Boolean(errors.Quantity)}
                      helperText={errors.Quantity?.message}
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
                <Controller
                  name="ConsigneeId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      value={consignees.find(c => c.ConsigneeId === field.value) || null}
                      onChange={(_, consignee) => {
                        field.onChange(consignee?.ConsigneeId || '')
                      }}
                      options={consignees}
                      getOptionLabel={(option) => `${option.Address?.Name} (${option.ConsigneeCode})`}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="送付先"
                          error={Boolean(errors.ConsigneeId)}
                          helperText={errors.ConsigneeId?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="ProductId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="商品"
                      error={Boolean(errors.ProductId)}
                      helperText={errors.ProductId?.message}
                    >
                      {products.map((product) => (
                        <MenuItem key={product.ProductId} value={product.ProductId}>
                          {product.ProductName} (¥{product.UnitPrice.toLocaleString()})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
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
                      label="特別指示"
                      multiline
                      rows={3}
                      placeholder="配送に関する特別な指示があれば記入してください"
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
    </Box>
  )
}

export default OrderForm