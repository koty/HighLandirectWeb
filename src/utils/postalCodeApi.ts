import type { JapanPostAddress } from '@/types'

// API エンドポイント（自分たちのバックエンドを使用）
const POSTAL_API_BASE = '/api/postal'

// 郵便番号のフォーマット（ハイフンを削除）
export const formatPostalCode = (postalCode: string): string => {
  return postalCode.replace(/[^\d]/g, '')
}

// 郵便番号の表示用フォーマット（123-4567 形式）
export const formatPostalCodeDisplay = (postalCode: string): string => {
  const cleaned = formatPostalCode(postalCode)
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  }
  return postalCode
}

// 郵便番号の妥当性チェック
export const validatePostalCode = (postalCode: string): boolean => {
  const cleaned = formatPostalCode(postalCode)
  return /^\d{7}$/.test(cleaned)
}

// 内部APIレスポンス型
interface PostalApiResponse {
  success: boolean
  data?: JapanPostAddress
  error?: string
}

// 郵便番号から住所を検索する関数
export const searchAddressByPostalCode = async (
  postalCode: string
): Promise<JapanPostAddress | null> => {
  // 郵便番号の妥当性チェック
  if (!validatePostalCode(postalCode)) {
    throw new Error('郵便番号は7桁の数字で入力してください')
  }

  const cleanedCode = formatPostalCode(postalCode)

  try {
    const response = await fetch(`${POSTAL_API_BASE}/search/${cleanedCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json() as PostalApiResponse
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as PostalApiResponse
    
    if (!data.success || !data.data) {
      throw new Error(data.error || '該当する住所が見つかりませんでした')
    }

    return data.data
  } catch (error) {
    console.error('郵便番号検索エラー:', error)
    throw error
  }
}

// 住所データをフォームフィールドにマッピング
export const mapAddressToFormFields = (address: JapanPostAddress) => {
  // 町域名と街区・番地を結合して住所1とする
  const address1Parts = [
    address.town_name || '',
    address.street_name || ''
  ].filter(part => part.trim().length > 0)
  
  return {
    PrefectureName: address.pref_name,
    CityName: address.city_name,
    Address1: address1Parts.join(' '),
    // 建物名は住所2に設定
    Address2: address.building_name || '',
  }
}