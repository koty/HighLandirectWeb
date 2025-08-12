// データベース型定義

export interface Address {
  AddressId: number;
  Furigana?: string;
  Name: string;
  Keisho?: string;
  CityName?: string;
  PostalCD?: string;
  PrefectureCD?: string;
  PrefectureName?: string;
  RegionCD?: string;
  RegionName?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  Address4?: string;
  Phone?: string;
  Fax?: string;
  Phone2?: string;
  MailAddress?: string;
  Memo?: string;
  CreatedAt: string;
  UpdatedAt: string;
  IsActive: boolean;
}

export interface Shipper {
  ShipperId: number;
  AddressId: number;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  Address?: Address;
}

export interface Consignee {
  ConsigneeId: number;
  AddressId: number;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  Address?: Address;
}

export interface Product {
  ProductId: number;
  ProductName: string;
  UnitPrice: number;
  IsDefault: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Store {
  StoreId: number;
  StoreName?: string;
  IsDefault: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Order {
  OrderId: number;
  OrderDate: string;
  ShipperId: number;
  ConsigneeId: number;
  ProductId: number;
  StoreId: number;
  Quantity: number;
  UnitPrice?: number;
  TotalAmount?: number;
  TrackingNumber?: string;
  CreatedAt: string;
  UpdatedAt: string;
  Shipper?: Shipper;
  Consignee?: Consignee;
  Product?: Product;
  Store?: Store;
}

export interface OrderHistory {
  OrderHistoryId: number;
  OrderId: number;
  ChangedAt: string;
}

export interface ReportMemo {
  ReportMemoId: number;
  MemoName?: string;
  MemoContent?: string;
  IsDefault: boolean;
}

// API Response 型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// フォーム型定義
// 注文明細（送付先ごとの商品・数量情報）
export interface OrderDetail {
  id: string; // フォーム内で一意のID
  ConsigneeId: number;
  Consignee?: Consignee;
  ProductId: number | '';
  Product?: Product;
  Quantity: number;
  UnitPrice?: number;
  TotalAmount?: number;
}

export interface OrderFormData {
  OrderDate: string;
  ShipperId: number | '';
  StoreId: number | '';
  OrderDetails: OrderDetail[]; // 注文明細配列
}

// 旧OrderItem型は削除（OrderDetailに統合）

export interface AddressFormData {
  Furigana?: string;
  Name: string;
  Keisho?: string;
  PostalCD?: string;
  PrefectureName?: string;
  CityName?: string;
  Address1?: string;
  Address2?: string;
  Address3?: string;
  Address4?: string;
  Phone?: string;
  Fax?: string;
  Phone2?: string;
  MailAddress?: string;
  Memo?: string;
}

export interface ShipperFormData {
  Address: AddressFormData & { IsActive: boolean };
  IsActive: boolean;
}

export interface ConsigneeFormData {
  Address: AddressFormData & { IsActive: boolean };
  IsActive: boolean;
}

// 日本郵便 郵便番号・デジタルアドレス API 関連の型定義

// OAuth トークンレスポンス
export interface JapanPostTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

// OAuth トークンリクエスト
export interface JapanPostTokenRequest {
  grant_type: 'client_credentials';
  client_id: string;
  secret_key: string;
}

// 住所情報
export interface JapanPostAddress {
  dgacode?: string;      // デジタルアドレスコード
  zip_code: string;      // 郵便番号（ハイフン付き）
  pref_name: string;     // 都道府県名
  city_name: string;     // 市区町村名
  town_name?: string;    // 町域名
  street_name?: string;  // 街区・番地
  building_name?: string; // 建物名
  pref_kana?: string;    // 都道府県名カナ
  city_kana?: string;    // 市区町村名カナ
  town_kana?: string;    // 町域名カナ
}

// API レスポンス
export interface JapanPostSearchResponse {
  page: number;
  limit: number;
  count: number;
  searchtype: string;
  addresses: JapanPostAddress[];
}

// エラーレスポンス
export interface JapanPostErrorResponse {
  error: string;
  error_description?: string;
}