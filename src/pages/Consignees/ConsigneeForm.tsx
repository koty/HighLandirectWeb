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
import axios from 'axios'

import AddressForm from '@/components/AddressForm'
import type { ConsigneeFormData } from '@/types'

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
  ConsigneeCode: yup.string(),
  DeliveryInstructions: yup.string(),
  AccessInfo: yup.string(),
  PreferredDeliveryTime: yup.string(),
  SpecialHandling: yup.string(),
})

const deliveryTimes = [
  { value: '指定なし', label: '指定なし' },
  { value: '午前中', label: '午前中 (8:00-12:00)' },
  { value: '12-14時', label: '12:00-14:00' },
  { value: '14-16時', label: '14:00-16:00' },
  { value: '16-18時', label: '16:00-18:00' },
  { value: '18-20時', label: '18:00-20:00' },
  { value: '19-21時', label: '19:00-21:00' },
]

const ConsigneeForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { enqueueSnackbar } = useSnackbar()
  const isEdit = Boolean(id)

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ConsigneeFormData>({
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
      ConsigneeCode: '',
      DeliveryInstructions: '',
      AccessInfo: '',
      PreferredDeliveryTime: '指定なし',
      SpecialHandling: '',
      IsActive: true,
    },
  })

  const onSubmit = async (data: ConsigneeFormData) => {
    try {
      console.log('Submit data:', data)
      
      if (isEdit) {
        // TODO: PUT API for editing
        enqueueSnackbar('送付先情報を更新しました', { variant: 'success' })
      } else {
        // POST API for creating new consignee
        const response = await axios.post('/api/consignees', {
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
          ConsigneeCode: data.ConsigneeCode,
          DeliveryInstructions: data.DeliveryInstructions,
          AccessInfo: data.AccessInfo,
          PreferredDeliveryTime: data.PreferredDeliveryTime,
          SpecialHandling: data.SpecialHandling,
        })
        
        if (response.data.success) {
          enqueueSnackbar('送付先を作成しました', { variant: 'success' })
        } else {
          throw new Error(response.data.error || '作成に失敗しました')
        }
      }
      
      navigate('/consignees')
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.error || error.message
        : 'エラーが発生しました'
      enqueueSnackbar(errorMessage, { variant: 'error' })
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEdit ? '送付先編集' : '新規送付先作成'}
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              {/* 送付先基本情報 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  送付先基本情報
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="ConsigneeCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="送付先コード"
                      placeholder="CONS0001"
                      error={Boolean(errors.ConsigneeCode)}
                      helperText={errors.ConsigneeCode?.message || '空欄の場合は自動生成されます'}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="PreferredDeliveryTime"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="希望配送時間"
                      error={Boolean(errors.PreferredDeliveryTime)}
                      helperText={errors.PreferredDeliveryTime?.message}
                    >
                      {deliveryTimes.map((time) => (
                        <MenuItem key={time.value} value={time.value}>
                          {time.label}
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

              {/* 配送情報 */}
              <Grid item xs={12} sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  配送情報
                </Typography>
                <Divider sx={{ mb: 3 }} />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="DeliveryInstructions"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="配送指示"
                      multiline
                      rows={3}
                      placeholder="不在時は宅配ボックスに投函など"
                      error={Boolean(errors.DeliveryInstructions)}
                      helperText={errors.DeliveryInstructions?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="AccessInfo"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="アクセス情報"
                      multiline
                      rows={2}
                      placeholder="建物への入り方、駐車場の位置など"
                      error={Boolean(errors.AccessInfo)}
                      helperText={errors.AccessInfo?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="SpecialHandling"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="特別取扱い"
                      multiline
                      rows={2}
                      placeholder="破損注意、冷凍・冷蔵配送など"
                      error={Boolean(errors.SpecialHandling)}
                      helperText={errors.SpecialHandling?.message}
                    />
                  )}
                />
              </Grid>

              {/* アクションボタン */}
              <Grid item xs={12} sx={{ mt: 4 }}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/consignees')}
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

export default ConsigneeForm