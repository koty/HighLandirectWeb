import { Router } from 'itty-router'
import type { Env } from '../worker'

// 日本郵便 API 設定（環境変数から取得）
const getAPIConfig = (env: Env) => ({
  API_HOST: env.JAPANPOST_API_HOST,
  CLIENT_ID: env.JAPANPOST_CLIENT_ID,
  CLIENT_SECRET: env.JAPANPOST_CLIENT_SECRET,
  CLIENT_IP: env.JAPANPOST_CLIENT_IP || '127.0.0.1',
})

// トークン管理
let cachedToken: string | null = null
let tokenExpiresAt: number = 0

const isTokenValid = (): boolean => {
  return cachedToken !== null && Date.now() < tokenExpiresAt
}

const getAccessToken = async (env: Env): Promise<string> => {
  // 既存のトークンが有効な場合はそれを使用
  if (isTokenValid()) {
    return cachedToken!
  }

  const config = getAPIConfig(env)
  console.log('Environment variables:', {
    JAPANPOST_API_HOST: env.JAPANPOST_API_HOST,
    JAPANPOST_CLIENT_ID: env.JAPANPOST_CLIENT_ID,
    JAPANPOST_CLIENT_SECRET: env.JAPANPOST_CLIENT_SECRET ? '[PRESENT]' : '[MISSING]',
    JAPANPOST_CLIENT_IP: env.JAPANPOST_CLIENT_IP
  })
  const TOKEN_URL = `https://${config.API_HOST}/api/v1/j/token`

  const tokenRequest = {
    grant_type: 'client_credentials',
    client_id: config.CLIENT_ID,
    secret_key: config.CLIENT_SECRET,
  }
console.log(tokenRequest)
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': config.CLIENT_IP,
        'User-Agent': 'Mozilla/5.0 (compatible; node client)'
      },
      body: JSON.stringify(tokenRequest),
    })

    if (!response.ok) {
      throw new Error(`Token acquisition failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as any
    if (!data.token) {
      throw new Error('Access token not found in response')
    }

    // トークンをキャッシュ（デフォルト10分有効）
    cachedToken = data.token
    tokenExpiresAt = Date.now() + ((data.expires_in || 600) * 1000)
    
    return data.token
  } catch (error) {
    console.error('Token acquisition error:', error)
    throw error
  }
}

const router = Router({ base: '/api/postal' })

// 郵便番号検索エンドポイント
router.get('/search/:zipcode', async (request, env: Env) => {
  try {
    const zipcode = request.params?.zipcode
    if (!zipcode) {
      return new Response(JSON.stringify({ 
        error: 'Zipcode parameter is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 郵便番号の妥当性チェック
    const cleanedCode = zipcode.replace(/[^\d]/g, '')
    if (!/^\d{7}$/.test(cleanedCode)) {
      return new Response(JSON.stringify({ 
        error: '郵便番号は7桁の数字で入力してください' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 開発環境用モックデータ
    if (false) {
      // 実際の郵便番号に近いモックレスポンス
      const getMockAddress = (code: string) => {
        const mockData: Record<string, any> = {
          '1000001': { pref: '東京都', city: '千代田区', town: '千代田' },
          '1000005': { pref: '東京都', city: '千代田区', town: '丸の内' },
          '1000014': { pref: '東京都', city: '千代田区', town: '永田町' },
          '1050011': { pref: '東京都', city: '港区', town: '芝公園' },
          '1500043': { pref: '東京都', city: '渋谷区', town: '道玄坂' },
          '1600023': { pref: '東京都', city: '新宿区', town: '西新宿' },
          '5300001': { pref: '大阪府', city: '大阪市北区', town: '梅田' },
          '5300047': { pref: '大阪府', city: '大阪市北区', town: '西天満' },
          '5410041': { pref: '大阪府', city: '大阪市中央区', town: '北浜' },
          '4600002': { pref: '愛知県', city: '名古屋市中区', town: '丸の内' },
          '4600003': { pref: '愛知県', city: '名古屋市中区', town: '錦' },
          '4600008': { pref: '愛知県', city: '名古屋市中区', town: '栄' },
          '2310023': { pref: '神奈川県', city: '横浜市中区', town: '山下町' },
          '6020911': { pref: '京都府', city: '京都市上京区', town: '烏丸通' },
          '8120011': { pref: '福岡県', city: '福岡市博多区', town: '博多駅前' }
        }
        
        return mockData[code] || { pref: '東京都', city: '港区', town: '新橋' }
      }

      const addressInfo = getMockAddress(cleanedCode)
      const mockAddress = {
        dgacode: cleanedCode,
        zip_code: `${cleanedCode.slice(0, 3)}-${cleanedCode.slice(3)}`,
        pref_name: addressInfo.pref,
        city_name: addressInfo.city,
        town_name: addressInfo.town,
        street_name: '1丁目',
        building_name: '',
        pref_kana: 'カナ',
        city_kana: 'カナ',
        town_kana: 'カナ'
      }

      return new Response(JSON.stringify({
        success: true,
        data: mockAddress
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 本番環境では実際のAPIを呼び出し
    try {
      const accessToken = await getAccessToken(env)
      const config = getAPIConfig(env)
      const SEARCH_CODE_URL = `https://${config.API_HOST}/api/v1/searchcode/${cleanedCode}`
      const response = await fetch(SEARCH_CODE_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; node client)'
        },
      })
      if (!response.ok) {
        let errorMessage = `Japan Post API error: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json() as any
          if (errorData.error_description) {
            errorMessage = errorData.error_description
          }
        } catch {
          // JSON解析に失敗した場合はデフォルトメッセージを使用
        }
        
        return new Response(JSON.stringify({ 
          error: errorMessage 
        }), { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const data = await response.json()
      
      if (!data || !data.addresses || data.addresses.length === 0) {
        return new Response(JSON.stringify({ 
          error: '該当する住所が見つかりませんでした' 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const address = data.addresses[0]
      return new Response(JSON.stringify({
        success: true,
        data: address
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Japan Post API error:', error)
      return new Response(JSON.stringify({ 
        error: 'External API error' 
      }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    

  } catch (error) {
    console.error('Postal code search error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

export const postalRoutes = router