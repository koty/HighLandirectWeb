// CloudFlare Pages Function: Postal Code Search API with Japan Post API integration
import { EventContext, Env, CORS_HEADERS } from '../../../types';

// Japan Post API configuration
interface PostalAPIConfig {
  API_HOST: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  CLIENT_IP: string;
}

// Token management
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

const isTokenValid = (): boolean => {
  return cachedToken !== null && Date.now() < tokenExpiresAt;
};

const getAPIConfig = (env: Env): PostalAPIConfig => ({
  API_HOST: env.JAPANPOST_API_HOST || 'api.da.pf.japanpost.jp',
  CLIENT_ID: env.JAPANPOST_CLIENT_ID || '',
  CLIENT_SECRET: env.JAPANPOST_CLIENT_SECRET || '',
  CLIENT_IP: env.JAPANPOST_CLIENT_IP || '127.0.0.1',
});

const getAccessToken = async (env: Env): Promise<string> => {
  // Return cached token if valid
  if (isTokenValid()) {
    return cachedToken!;
  }

  const config = getAPIConfig(env);
  console.log('Japan Post API Config:', {
    API_HOST: config.API_HOST,
    CLIENT_ID: config.CLIENT_ID ? '[SET]' : '[NOT_SET]',
    CLIENT_SECRET: config.CLIENT_SECRET ? '[SET]' : '[NOT_SET]',
    CLIENT_IP: config.CLIENT_IP
  });
  
  const TOKEN_URL = `https://${config.API_HOST}/api/v1/j/token`;

  const tokenRequest = {
    grant_type: 'client_credentials',
    client_id: config.CLIENT_ID,
    secret_key: config.CLIENT_SECRET,
  };

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': config.CLIENT_IP,
        'User-Agent': 'Mozilla/5.0 (compatible; node client)'
      },
      body: JSON.stringify(tokenRequest),
    });

    if (!response.ok) {
      throw new Error(`Token acquisition failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    if (!data.token) {
      throw new Error('Access token not found in response');
    }

    // Cache token (default 10 minutes)
    cachedToken = data.token;
    tokenExpiresAt = Date.now() + ((data.expires_in || 600) * 1000);
    
    return data.token;
  } catch (error) {
    console.error('Token acquisition error:', error);
    throw error;
  }
};

// Mock data for development/fallback
const getMockAddress = (zipcode: string) => {
  const mockData = new Map([
    ['1000001', { pref: '東京都', city: '千代田区', town: '千代田' }],
    ['1000005', { pref: '東京都', city: '千代田区', town: '丸の内' }],
    ['1000014', { pref: '東京都', city: '千代田区', town: '永田町' }],
    ['1050011', { pref: '東京都', city: '港区', town: '芝公園' }],
    ['1500043', { pref: '東京都', city: '渋谷区', town: '道玄坂' }],
    ['1600023', { pref: '東京都', city: '新宿区', town: '西新宿' }],
    ['5300001', { pref: '大阪府', city: '大阪市北区', town: '梅田' }],
    ['5300047', { pref: '大阪府', city: '大阪市北区', town: '西天満' }],
    ['5410041', { pref: '大阪府', city: '大阪市中央区', town: '北浜' }],
    ['4600002', { pref: '愛知県', city: '名古屋市中区', town: '丸の内' }],
    ['4600003', { pref: '愛知県', city: '名古屋市中区', town: '錦' }],
    ['4600008', { pref: '愛知県', city: '名古屋市中区', town: '栄' }],
    ['2310023', { pref: '神奈川県', city: '横浜市中区', town: '山下町' }],
    ['6020911', { pref: '京都府', city: '京都市上京区', town: '烏丸通' }],
    ['8120011', { pref: '福岡県', city: '福岡市博多区', town: '博多駅前' }]
  ]);
  
  return mockData.get(zipcode) || { pref: '東京都', city: '港区', town: '新橋' };
};

export async function onRequest(context: EventContext<Env>): Promise<Response> {
  const { request, params } = context;
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const zipcode = params.zipcode as string;
    
    if (!zipcode) {
      return new Response(JSON.stringify({ 
        error: 'Zipcode parameter is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // Validate zipcode format
    const cleanedCode = zipcode.replace(/[^\d]/g, '');
    if (!/^\d{7}$/.test(cleanedCode)) {
      return new Response(JSON.stringify({ 
        error: '郵便番号は7桁の数字で入力してください' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    console.log('Postal search request for zipcode:', cleanedCode);

    // Try Japan Post API first, fallback to mock data on error
    try {
      const accessToken = await getAccessToken(context.env);
      const config = getAPIConfig(context.env);
      const SEARCH_CODE_URL = `https://${config.API_HOST}/api/v1/searchcode/${cleanedCode}`;
      
      console.log('Calling Japan Post API:', SEARCH_CODE_URL);
      
      const response = await fetch(SEARCH_CODE_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; node client)'
        },
      });

      if (!response.ok) {
        let errorMessage = `Japan Post API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json() as any;
          if (errorData.error_description) {
            errorMessage = errorData.error_description;
          }
        } catch {
          // JSON parsing failed, use default message
        }
        
        console.log('Japan Post API error, falling back to mock data:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Japan Post API response:', data);
      
      if (!data || !data.addresses || data.addresses.length === 0) {
        console.log('No addresses found, falling back to mock data');
        throw new Error('No addresses found');
      }

      const address = data.addresses[0];
      return new Response(JSON.stringify({
        success: true,
        data: address,
        source: 'japan_post_api'
      }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
      
    } catch (apiError) {
      console.error('Japan Post API error, using fallback:', apiError);
      
      // Fallback to mock data if API fails
      const addressInfo = getMockAddress(cleanedCode);
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
      };

      return new Response(JSON.stringify({
        success: true,
        data: mockAddress,
        source: 'mock_data',
        fallback_reason: apiError instanceof Error ? apiError.message : 'API error'
      }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

  } catch (error) {
    console.error('Postal code search error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}