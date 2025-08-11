import React from 'react'
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
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useSnackbar } from 'notistack'

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
  const isEdit = Boolean(id)

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
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

  const onSubmit = async (data: ShipperFormData) => {
    try {
      console.log('Submit data:', data)
      // TODO: API送信
      
      enqueueSnackbar(
        isEdit ? '荷主情報を更新しました' : '荷主を作成しました',
        { variant: 'success' }
      )
      navigate('/shippers')
    } catch (error) {
      console.error('Error:', error)
      enqueueSnackbar('エラーが発生しました', { variant: 'error' })
    }
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