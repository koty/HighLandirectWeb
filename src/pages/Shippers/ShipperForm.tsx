import React, { useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
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
    PrefectureName: yup.string(),
    CityName: yup.string(),
    Address1: yup.string(),
    Address2: yup.string(),
    Phone: yup.string(),
    Fax: yup.string(),
    MailAddress: yup.string().email('正しいメールアドレスを入力してください'),
    Memo: yup.string(),
    IsActive: yup.boolean().required(),
  }).required(),
  IsActive: yup.boolean().required(),
})


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