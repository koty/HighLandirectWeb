-- HighLandirect Web版 初期データ (CloudFlare D1対応)

-- 住所データ
INSERT INTO Address (AddressId, Name, Furigana, PostalCD, PrefectureName, CityName, Address1, Phone, IsActive) VALUES
(1, '東京商事株式会社', 'トウキョウショウジカブシキガイシャ', '1000001', '東京都', '千代田区', '千代田1-1-1', '03-1234-5678', 1),
(2, '大阪工業株式会社', 'オオサカコウギョウカブシキガイシャ', '5300001', '大阪府', '大阪市北区', '梅田1-1-1', '06-1234-5678', 1),
(3, '名古屋商会', 'ナゴヤショウカイ', '4600002', '愛知県', '名古屋市中区', '丸の内1-1-1', '052-123-4567', 1),
(4, '山田太郎', 'ヤマダタロウ', '1050011', '東京都', '港区', '芝公園1-1-1', '03-9876-5432', 1),
(5, '田中花子', 'タナカハナコ', '2310023', '神奈川県', '横浜市中区', '山下町1-1-1', '045-123-4567', 1);

-- 荷主データ
INSERT INTO Shipper (ShipperId, AddressId, ShipperCode, ShipperType, CreditLimit, PaymentTerms, IsActive) VALUES
(1, 1, 'SHP001', '法人', 1000000, '月末締め翌月末払い', 1),
(2, 2, 'SHP002', '法人', 500000, '月末締め翌月末払い', 1),
(3, 3, 'SHP003', '法人', 300000, '現金払い', 1);

-- 送付先データ
INSERT INTO Consignee (ConsigneeId, AddressId, ConsigneeCode, DeliveryInstructions, PreferredDeliveryTime, IsActive) VALUES
(1, 4, 'CNS001', '午前中希望', '午前', 1),
(2, 5, 'CNS002', '在宅確認後配送', '夜間', 1),
(3, 2, 'CNS003', '法人配送・受付まで', '指定なし', 1);

-- 商品データ
INSERT INTO ProductMaster (ProductId, ProductCode, ProductName, ProductCategory, UnitPrice, Weight, IsFragile, IsDefault, IsActive) VALUES
(1, 'PRD001', '宅急便60サイズ', '宅急便', 930, 2.0, 0, 1, 1),
(2, 'PRD002', '宅急便80サイズ', '宅急便', 1200, 5.0, 0, 0, 1),
(3, 'PRD003', '宅急便100サイズ', '宅急便', 1500, 10.0, 0, 0, 1),
(4, 'PRD004', 'クール宅急便', 'クール便', 1650, 5.0, 1, 0, 1);

-- 集配所データ
INSERT INTO Store (StoreId, StoreCode, StoreName, CarrierCode, CarrierName, ContactPhone, ServiceArea, CutoffTime, IsDefault, IsActive) VALUES
(1, 'ST001', '東京主管支店', 'YAMATO', 'ヤマト運輸', '03-0000-1111', '東京都心部', '17:00', 1, 1),
(2, 'ST002', '大阪主管支店', 'YAMATO', 'ヤマト運輸', '06-0000-2222', '大阪府全域', '17:00', 0, 1),
(3, 'ST003', '名古屋主管支店', 'YAMATO', 'ヤマト運輸', '052-000-3333', '愛知県全域', '16:30', 0, 1);

-- 注文データ
INSERT INTO "Order" (OrderId, OrderNumber, OrderDate, ShipperId, ConsigneeId, ProductId, StoreId, Quantity, UnitPrice, TotalAmount, OrderStatus) VALUES
(1, 'ORD-2024-001', '2024-01-15', 1, 1, 1, 1, 1, 930, 930, '完了'),
(2, 'ORD-2024-002', '2024-01-16', 2, 3, 4, 2, 2, 1650, 3300, '受付'),
(3, 'ORD-2024-003', '2024-01-17', 3, 1, 3, 3, 1, 1500, 1500, '完了');