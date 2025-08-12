import React, { useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useSnackbar } from 'notistack'
import { useQuery, useQueryClient } from 'react-query'
import axios from 'axios'

import AddressForm from '@/components/AddressForm'
import type { ShipperFormData } from '@/types'

const schema = yup.object({
  Address: yup.object({
    Name: yup.string().required('氏名・会社名は必須です'),
    Furigana: yup.string(),
    PostalCD: yup.string().matches(/^\d{7}$/, '郵便番号は7桁の数字で入力してください'),
    PrefectureName: yup.string().required('都道府県を選択してください'),
    CityName: yup.string().required('市区町村は必須です'),
    Address1: yup.string().required('住所1は必須です'),
    Address2: yup.string(),
    Phone: yup.string().required('電話番号は必須です'),
    Fax: yup.string(),
    MailAddress: yup.string().email('正しいメールアドレスを入力してください'),
    Memo: yup.string(),
  }).required(),
  ShipperCode: yup.string(),
  ShipperType: yup.string().required('荷主種別を選択してください'),
  CreditLimit: yup.number().min(0, '与信限度額は0以上で入力してください'),
  PaymentTerms: yup.string(),
})

const shipperTypes = [
  { value: '法人', label: '法人' },
  { value: '個人事業主', label: '個人事業主' },
  { value: '個人', label: '個人' },
]

const paymentTerms = [
  { value: '即日払い', label: '即日払い' },
  { value: '月末締め翌月払い', label: '月末締め翌月払い' },
  { value: '15日締め当月末払い', label: '15日締め当月末払い' },
  { value: '月末締め翌々月払い', label: '月末締め翌々月払い' },
]

const ShipperForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  // Fetch shipper data for editing
  const { data: shipperData, isLoading: isLoadingShipper, error: shipperError } = useQuery(
    ['shipper', id],
    async () => {
      if (!id) return null
      const response = await axios.get(`/api/shippers/${id}`)
      return response.data.data
    },
    {
      enabled: isEdit,
      refetchOnWindowFocus: false
    }
  )

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ShipperFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      Address: {
        Name: '',
        Furigana: '',
        PostalCD: '',
        PrefectureName: '',
        CityName: '',
        Address1: '',
        Address2: '',
        Phone: '',
        Fax: '',
        MailAddress: '',
        Memo: '',
        IsActive: true,
      },
      ShipperCode: '',
      ShipperType: '',
      CreditLimit: 0,
      PaymentTerms: '',
      IsActive: true,
    },
  })

  // Load existing data when editing
  useEffect(() => {
    if (shipperData && isEdit) {
      console.log('Loading shipper data:', shipperData)
      reset({
        Address: {
          Name: shipperData.Name || '',
          Furigana: shipperData.Furigana || '',
          PostalCD: shipperData.PostalCD || '',
          PrefectureName: shipperData.PrefectureName || '',
          CityName: shipperData.CityName || '',
          Address1: shipperData.Address1 || '',
          Address2: shipperData.Address2 || '',
          Phone: shipperData.Phone || '',
          Fax: shipperData.Fax || '',
          MailAddress: shipperData.MailAddress || '',
          Memo: shipperData.Memo || '',
          IsActive: shipperData.IsActive === 1,
        },
        ShipperCode: shipperData.ShipperCode || '',
        ShipperType: shipperData.ShipperType || '',
        CreditLimit: shipperData.CreditLimit || 0,
        PaymentTerms: shipperData.PaymentTerms || '',
        IsActive: shipperData.IsActive === 1,
      })
    }
  }, [shipperData, isEdit, reset])

  const onSubmit = async (data: ShipperFormData) => {
    try {
      console.log('Submit data:', data)
      
      if (isEdit) {
        // PUT API for editing
        const response = await axios.put(`/api/shippers/${id}`, {
          Name: data.Address.Name,
          Furigana: data.Address.Furigana,
          Keisho: data.Address.Keisho,
          PostalCD: data.Address.PostalCD,
          PrefectureName: data.Address.PrefectureName,
          CityName: data.Address.CityName,
          Address1: data.Address.Address1,
          Address2: data.Address.Address2,
          Phone: data.Address.Phone,
          Fax: data.Address.Fax,
          MailAddress: data.Address.MailAddress,
          Memo: data.Address.Memo,
          ShipperCode: data.ShipperCode,
          ShipperType: data.ShipperType,
          CreditLimit: data.CreditLimit,
          PaymentTerms: data.PaymentTerms,
        })
        
        if (response.data.success) {
          enqueueSnackbar('荷主情報を更新しました', { variant: 'success' })
          // Invalidate cache to refresh data
          queryClient.invalidateQueries(['shippers'])
          queryClient.invalidateQueries(['shipper', id])
        } else {
          throw new Error(response.data.error || '更新に失敗しました')
        }
      } else {
        // POST API for creating new shipper
        const response = await axios.post('/api/shippers', {
          Name: data.Address.Name,
          Furigana: data.Address.Furigana,
          Keisho: data.Address.Keisho,
          PostalCD: data.Address.PostalCD,
          PrefectureName: data.Address.PrefectureName,
          CityName: data.Address.CityName,
          Address1: data.Address.Address1,
          Address2: data.Address.Address2,
          Phone: data.Address.Phone,
          Fax: data.Address.Fax,
          MailAddress: data.Address.MailAddress,
          Memo: data.Address.Memo,
          ShipperCode: data.ShipperCode,
          ShipperType: data.ShipperType,
          CreditLimit: data.CreditLimit,
          PaymentTerms: data.PaymentTerms,
        })
        
        if (response.data.success) {
          enqueueSnackbar('荷主を作成しました', { variant: 'success' })
          // Invalidate cache to refresh data
          queryClient.invalidateQueries(['shippers'])
        } else {
          throw new Error(response.data.error || '作成に失敗しました')
        }
      }
      
      navigate('/shippers')
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.error || error.message
        : 'エラーが発生しました'
      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  // Show loading when editing and fetching data
  if (isEdit && isLoadingShipper) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          荷主編集
        </Typography>
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      </Box>
    )
  }

  // Show error when failing to fetch shipper data
  if (isEdit && shipperError) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          荷主編集
        </Typography>
        <Alert severity="error">
          荷主データの取得に失敗しました: {shipperError instanceof Error ? shipperError.message : '不明なエラー'}
        </Alert>
        <Box mt={3}>
          <Button variant="outlined" onClick={() => navigate('/shippers')}>
            戻る
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEdit ? '荷主編集' : '新規荷主作成'}
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              {/* 荷主基本情報 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  荷主基本情報
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="ShipperCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="荷主コード"
                      placeholder="SHIP0001"
                      error={Boolean(errors.ShipperCode)}
                      helperText={errors.ShipperCode?.message || '空欄の場合は自動生成されます'}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="ShipperType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="荷主種別"
                      error={Boolean(errors.ShipperType)}
                      helperText={errors.ShipperType?.message}
                      required
                    >
                      <MenuItem value="">選択してください</MenuItem>
                      {shipperTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="CreditLimit"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="与信限度額"
                      type="number"
                      InputProps={{
                        startAdornment: <span>¥</span>,
                      }}
                      error={Boolean(errors.CreditLimit)}
                      helperText={errors.CreditLimit?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="PaymentTerms"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="支払条件"
                      error={Boolean(errors.PaymentTerms)}
                      helperText={errors.PaymentTerms?.message}
                    >
                      <MenuItem value="">選択してください</MenuItem>
                      {paymentTerms.map((term) => (
                        <MenuItem key={term.value} value={term.value}>
                          {term.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              {/* 住所情報 */}
              <Grid item xs={12} sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  住所情報
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12}>
                <AddressForm
                  control={control}
                  errors={errors}
                  namePrefix="Address"
                  required={true}
                  setValue={setValue}
                />
              </Grid>

              {/* アクションボタン */}
              <Grid item xs={12} sx={{ mt: 4 }}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/shippers')}
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

export default ShipperForm