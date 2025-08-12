import React, { useState } from 'react'
import {
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { Controller, Control, FieldErrors } from 'react-hook-form'
import { useSnackbar } from 'notistack'

import { 
  searchAddressByPostalCode, 
  mapAddressToFormFields, 
  validatePostalCode 
} from '@/utils/postalCodeApi'
import { generateNameFurigana } from '@/utils/furigana'

interface AddressFormProps {
  control: Control<any>
  errors: FieldErrors<any>
  namePrefix?: string
  required?: boolean
  setValue?: any // 型を緩く設定
}

// 都道府県一覧
const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

const AddressForm: React.FC<AddressFormProps> = ({ 
  control, 
  errors, 
  namePrefix = '', 
  required = true,
  setValue
}) => {
  const [isSearching, setIsSearching] = useState(false)
  const [isFuriganaGenerating, setIsFuriganaGenerating] = useState(false)
  const { enqueueSnackbar } = useSnackbar()
  const getFieldName = (field: string) => namePrefix ? `${namePrefix}.${field}` : field
  const getFieldError = (field: string) => {
    const fieldName = getFieldName(field)
    const error = fieldName.includes('.') 
      ? fieldName.split('.').reduce((obj: any, key: string) => obj?.[key], errors)
      : errors[field]
    return error
  }

  const getErrorMessage = (field: string) => {
    const error = getFieldError(field)
    if (error && typeof error === 'object' && 'message' in error) {
      return error.message as string
    }
    return ''
  }

  // ふりがな自動生成機能
  const handleNameChange = async (name: string, field: any) => {
    field.onChange(name)
    
    if (!setValue || !name || name.trim().length === 0) {
      return
    }

    setIsFuriganaGenerating(true)
    try {
      const furigana = await generateNameFurigana(name.trim())
      if (furigana) {
        setValue(getFieldName('Furigana'), furigana)
      }
    } catch (error) {
      console.error('Furigana generation failed:', error)
      // エラーは表示しない（ユーザーが手動で入力できるため）
    } finally {
      setIsFuriganaGenerating(false)
    }
  }

  // 郵便番号検索機能
  const handlePostalCodeSearch = async (postalCode: string) => {
    if (!setValue) {
      console.warn('setValue function not provided')
      return
    }

    // 郵便番号の妥当性チェック
    if (!validatePostalCode(postalCode)) {
      if (postalCode.replace(/[^\d]/g, '').length > 0) {
        enqueueSnackbar('郵便番号は7桁の数字で入力してください', { variant: 'warning' })
      }
      return
    }

    setIsSearching(true)
    try {
      const address = await searchAddressByPostalCode(postalCode)
      if (!address) {
        throw new Error('住所データが取得できませんでした')
      }
      const formFields = mapAddressToFormFields(address)

      // フォームに住所を自動入力
      setValue(getFieldName('PrefectureName'), formFields.PrefectureName)
      setValue(getFieldName('CityName'), formFields.CityName)
      setValue(getFieldName('Address1'), formFields.Address1)
      setValue(getFieldName('Address2'), formFields.Address2)

      enqueueSnackbar('住所を自動入力しました', { variant: 'success' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '住所の取得に失敗しました'
      enqueueSnackbar(errorMessage, { variant: 'error' })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name={getFieldName('Name')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="氏名・会社名"
              error={Boolean(getFieldError('Name'))}
              helperText={getErrorMessage('Name')}
              required={required}
              onChange={(e) => handleNameChange(e.target.value, field)}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name={getFieldName('Furigana')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="フリガナ"
              error={Boolean(getFieldError('Furigana'))}
              helperText={getErrorMessage('Furigana') || '氏名・会社名を入力すると自動生成されます'}
              InputProps={{
                endAdornment: isFuriganaGenerating ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : undefined,
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name={getFieldName('PostalCD')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="郵便番号"
              placeholder="1234567"
              error={Boolean(getFieldError('PostalCD'))}
              helperText={getErrorMessage('PostalCD') || '7桁入力後、検索ボタンで住所を自動入力'}
              inputProps={{ maxLength: 8 }} // ハイフン入力も考慮
              onChange={(e) => {
                const value = e.target.value
                field.onChange(value)
                
                // 7桁入力されたら自動検索
                if (validatePostalCode(value)) {
                  handlePostalCodeSearch(value)
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handlePostalCodeSearch(field.value)}
                      disabled={isSearching}
                      size="small"
                      title="住所を検索"
                    >
                      {isSearching ? (
                        <CircularProgress size={20} />
                      ) : (
                        <SearchIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name={getFieldName('PrefectureName')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="都道府県"
              error={Boolean(getFieldError('PrefectureName'))}
              helperText={getErrorMessage('PrefectureName')}
              required={required}
            >
              <MenuItem value="">選択してください</MenuItem>
              {prefectures.map((prefecture) => (
                <MenuItem key={prefecture} value={prefecture}>
                  {prefecture}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name={getFieldName('CityName')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="市区町村"
              error={Boolean(getFieldError('CityName'))}
              helperText={getErrorMessage('CityName')}
              required={required}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={8}>
        <Controller
          name={getFieldName('Address1')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="住所1（番地・建物名）"
              error={Boolean(getFieldError('Address1'))}
              helperText={getErrorMessage('Address1')}
              required={required}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Controller
          name={getFieldName('Address2')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="住所2（部屋番号等）"
              error={Boolean(getFieldError('Address2'))}
              helperText={getErrorMessage('Address2')}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name={getFieldName('Phone')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="電話番号"
              placeholder="03-1234-5678"
              error={Boolean(getFieldError('Phone'))}
              helperText={getErrorMessage('Phone')}
              required={required}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Controller
          name={getFieldName('Fax')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="FAX番号"
              placeholder="03-1234-5679"
              error={Boolean(getFieldError('Fax'))}
              helperText={getErrorMessage('Fax')}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name={getFieldName('MailAddress')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="メールアドレス"
              type="email"
              placeholder="example@company.co.jp"
              error={Boolean(getFieldError('MailAddress'))}
              helperText={getErrorMessage('MailAddress')}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name={getFieldName('Memo')}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="メモ"
              multiline
              rows={3}
              placeholder="その他の情報やメモがあれば記入してください"
              error={Boolean(getFieldError('Memo'))}
              helperText={getErrorMessage('Memo')}
            />
          )}
        />
      </Grid>
    </Grid>
  )
}

export default AddressForm