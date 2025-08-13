-- HighLandirect Web版 初期データ (CloudFlare D1対応)

-- 住所データ
INSERT INTO Address (AddressId, Name, Furigana, PostalCD, PrefectureName, CityName, Address1, Phone, IsActive) VALUES
(1, '東京商事株式会社', 'トウキョウショウジカブシキガイシャ', '1000001', '東京都', '千代田区', '千代田1-1-1', '03-1234-5678', 1),
(2, '大阪工業株式会社', 'オオサカコウギョウカブシキガイシャ', '5300001', '大阪府', '大阪市北区', '梅田1-1-1', '06-1234-5678', 1),
(3, '名古屋商会', 'ナゴヤショウカイ', '4600002', '愛知県', '名古屋市中区', '丸の内1-1-1', '052-123-4567', 1),
(4, '山田太郎', 'ヤマダタロウ', '1050011', '東京都', '港区', '芝公園1-1-1', '03-9876-5432', 1),
(5, '田中花子', 'タナカハナコ', '2310023', '神奈川県', '横浜市中区', '山下町1-1-1', '045-123-4567', 1);

-- 荷主データ
INSERT INTO Shipper (ShipperId, AddressId, IsActive) VALUES
(1, 1, 1),
(2, 2, 1),
(3, 3, 1);

-- 送付先データ
INSERT INTO Consignee (ConsigneeId, AddressId, IsActive) VALUES
(1, 4, 1),
(2, 5, 1),
(3, 2, 1);

-- 商品データ
INSERT INTO ProductMaster (ProductId, ProductName, UnitPrice, IsDefault, IsActive) VALUES
(1, 'りんご 5kg', 2500, 1, 1),
(2, 'りんご 10kg', 4500, 0, 1),
(3, '桃 5kg', 3500, 0, 1),
(4, '桃 10kg', 6500, 0, 1);

-- 集配所データ
INSERT INTO Store (StoreId, StoreName, IsDefault, IsActive) VALUES
(1, '東京主管支店', 1, 1),
(2, '大阪主管支店', 0, 1),
(3, '名古屋主管支店', 0, 1);

-- 注文データ（ヘッダー）
INSERT INTO "Order" (OrderId, OrderDate, ShipperId, StoreId, OrderTotal, ItemCount) VALUES
(1, '2024-01-15', 1, 1, 9000, 2),
(2, '2024-01-16', 2, 2, 13000, 2),
(3, '2024-01-17', 3, 3, 3500, 1);

-- 注文明細データ
INSERT INTO OrderDetail (OrderDetailId, OrderId, ConsigneeId, ProductId, Quantity, UnitPrice, LineTotal) VALUES
-- 注文1: 東京商事から山田太郎へ複数商品
(1, 1, 1, 1, 1, 2500, 2500),  -- りんご 5kg × 1
(2, 1, 1, 3, 2, 3250, 6500),  -- 桃 5kg × 2 (少し割引)
-- 注文2: 大阪工業から大阪工業（自社）へ
(3, 2, 3, 4, 2, 6500, 13000), -- 桃 10kg × 2
-- 注文3: 名古屋商会から山田太郎へ
(4, 3, 1, 3, 1, 3500, 3500);  -- 桃 5kg × 1