-- パフォーマンス改善のための追加インデックス
-- HighLandirect Web版 

-- Address検索パフォーマンス向上
CREATE INDEX IF NOT EXISTS idx_address_phone ON Address(Phone);
CREATE INDEX IF NOT EXISTS idx_address_prefecture ON Address(PrefectureName);
CREATE INDEX IF NOT EXISTS idx_address_city ON Address(CityName);
CREATE INDEX IF NOT EXISTS idx_address_active ON Address(IsActive);

-- Shipper JOINクエリ最適化
CREATE INDEX IF NOT EXISTS idx_shipper_address ON Shipper(AddressId);
CREATE INDEX IF NOT EXISTS idx_shipper_active ON Shipper(IsActive);
CREATE INDEX IF NOT EXISTS idx_shipper_type ON Shipper(ShipperType);

-- Consignee JOINクエリ最適化
CREATE INDEX IF NOT EXISTS idx_consignee_address ON Consignee(AddressId);
CREATE INDEX IF NOT EXISTS idx_consignee_active ON Consignee(IsActive);

-- ProductMaster検索最適化
CREATE INDEX IF NOT EXISTS idx_product_category ON ProductMaster(ProductCategory);
CREATE INDEX IF NOT EXISTS idx_product_active ON ProductMaster(IsActive);
CREATE INDEX IF NOT EXISTS idx_product_default ON ProductMaster(IsDefault);

-- Store検索最適化
CREATE INDEX IF NOT EXISTS idx_store_carrier ON Store(CarrierCode);
CREATE INDEX IF NOT EXISTS idx_store_active ON Store(IsActive);
CREATE INDEX IF NOT EXISTS idx_store_default ON Store(IsDefault);

-- Order複合クエリ最適化
CREATE INDEX IF NOT EXISTS idx_order_shipper ON "Order"(ShipperId);
CREATE INDEX IF NOT EXISTS idx_order_consignee ON "Order"(ConsigneeId);
CREATE INDEX IF NOT EXISTS idx_order_product ON "Order"(ProductId);
CREATE INDEX IF NOT EXISTS idx_order_store ON "Order"(StoreId);
CREATE INDEX IF NOT EXISTS idx_order_created ON "Order"(CreatedAt);

-- 複合インデックス（検索とソートの最適化）
CREATE INDEX IF NOT EXISTS idx_order_shipper_date ON "Order"(ShipperId, OrderDate DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_date ON "Order"(OrderStatus, OrderDate DESC);
CREATE INDEX IF NOT EXISTS idx_address_name_active ON Address(Name, IsActive);

-- OrderHistory検索最適化
CREATE INDEX IF NOT EXISTS idx_order_history_order ON OrderHistory(OrderId);
CREATE INDEX IF NOT EXISTS idx_order_history_date ON OrderHistory(ChangedAt);

-- 全文検索風の検索パフォーマンス向上（LIKE検索対応）
-- 注意：SQLiteでは部分文字列検索のインデックス効果は限定的だが、
-- 前方一致（prefix）には効果的
CREATE INDEX IF NOT EXISTS idx_address_name_prefix ON Address(Name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_product_name_prefix ON ProductMaster(ProductName COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_store_name_prefix ON Store(StoreName COLLATE NOCASE);