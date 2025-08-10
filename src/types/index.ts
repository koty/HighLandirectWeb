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
  ShipperCode?: string;
  ShipperType?: string;
  ContractStartDate?: string;
  ContractEndDate?: string;
  CreditLimit?: number;
  PaymentTerms?: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  Address?: Address;
}

export interface Consignee {
  ConsigneeId: number;
  AddressId: number;
  ConsigneeCode?: string;
  DeliveryInstructions?: string;
  AccessInfo?: string;
  PreferredDeliveryTime?: string;
  SpecialHandling?: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  Address?: Address;
}

export interface Product {
  ProductId: number;
  ProductCode?: string;
  ProductName: string;
  ProductCategory?: string;
  UnitPrice: number;
  TaxRate: number;
  Weight?: number;
  Dimensions?: string;
  IsFragile: boolean;
  IsDefault: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Store {
  StoreId: number;
  StoreCode?: string;
  StoreName?: string;
  CarrierCode?: string;
  CarrierName?: string;
  RegionCode?: string;
  ContactPhone?: string;
  ServiceArea?: string;
  CutoffTime?: string;
  IsDefault: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Order {
  OrderId: number;
  OrderNumber?: string;
  OrderDate: string;
  ShipperId: number;
  ConsigneeId: number;
  ProductId: number;
  StoreId: number;
  Quantity: number;
  UnitPrice?: number;
  TotalAmount?: number;
  OrderStatus: 'pending' | 'processing' | 'completed' | 'cancelled';
  RequestedDeliveryDate?: string;
  ActualDeliveryDate?: string;
  TrackingNumber?: string;
  SpecialInstructions?: string;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy?: string;
  UpdatedBy?: string;
  Shipper?: Shipper;
  Consignee?: Consignee;
  Product?: Product;
  Store?: Store;
}

export interface OrderHistory {
  OrderHistoryId: number;
  OrderId: number;
  StatusChange?: string;
  PreviousStatus?: string;
  NewStatus?: string;
  Notes?: string;
  ChangedAt: string;
  ChangedBy?: string;
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
export interface OrderFormData {
  OrderDate: string;
  ShipperId: number | '';
  ConsigneeId: number | '';
  ProductId: number | '';
  StoreId: number | '';
  Quantity: number;
  RequestedDeliveryDate?: string;
  SpecialInstructions?: string;
}

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

export interface ShipperFormData extends AddressFormData {
  ShipperCode?: string;
  ShipperType?: string;
  ContractStartDate?: string;
  ContractEndDate?: string;
  CreditLimit?: number;
  PaymentTerms?: string;
}

export interface ConsigneeFormData extends AddressFormData {
  ConsigneeCode?: string;
  DeliveryInstructions?: string;
  AccessInfo?: string;
  PreferredDeliveryTime?: string;
  SpecialHandling?: string;
}