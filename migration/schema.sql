-- HighLandirect Web版 SQLiteスキーマ (CloudFlare D1対応)

-- 住所マスタ
CREATE TABLE Address (
    AddressId INTEGER PRIMARY KEY AUTOINCREMENT,
    Furigana TEXT,
    Name TEXT NOT NULL,
    Keisho TEXT,
    CityName TEXT,
    PostalCD TEXT,
    PrefectureCD TEXT,
    PrefectureName TEXT,
    RegionCD TEXT,
    RegionName TEXT,
    Address1 TEXT,
    Address2 TEXT,
    Address3 TEXT,
    Address4 TEXT,
    Phone TEXT,
    Fax TEXT,
    Phone2 TEXT,
    MailAddress TEXT,
    Memo TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsActive INTEGER DEFAULT 1
);

-- 荷主マスタ
CREATE TABLE Shipper (
    ShipperId INTEGER PRIMARY KEY AUTOINCREMENT,
    AddressId INTEGER NOT NULL,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AddressId) REFERENCES Address(AddressId)
);

-- 送付先マスタ  
CREATE TABLE Consignee (
    ConsigneeId INTEGER PRIMARY KEY AUTOINCREMENT,
    AddressId INTEGER NOT NULL,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AddressId) REFERENCES Address(AddressId)
);

-- 商品マスタ
CREATE TABLE ProductMaster (
    ProductId INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductName TEXT NOT NULL,
    UnitPrice REAL NOT NULL,
    IsDefault INTEGER DEFAULT 0,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ヤマト集配所マスタ
CREATE TABLE Store (
    StoreId INTEGER PRIMARY KEY AUTOINCREMENT,
    StoreName TEXT,
    IsDefault INTEGER DEFAULT 0,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 注文ヘッダー
CREATE TABLE "Order" (
    OrderId INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderDate DATETIME NOT NULL,
    ShipperId INTEGER NOT NULL,
    StoreId INTEGER NOT NULL,
    OrderTotal REAL DEFAULT 0,
    ItemCount INTEGER DEFAULT 0,
    TrackingNumber TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ShipperId) REFERENCES Shipper(ShipperId),
    FOREIGN KEY (StoreId) REFERENCES Store(StoreId)
);

-- 注文明細
CREATE TABLE OrderDetail (
    OrderDetailId INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderId INTEGER NOT NULL,
    ConsigneeId INTEGER NOT NULL,
    ProductId INTEGER NOT NULL,
    Quantity INTEGER NOT NULL DEFAULT 1,
    UnitPrice REAL NOT NULL,
    LineTotal REAL NOT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrderId) REFERENCES "Order"(OrderId) ON DELETE CASCADE,
    FOREIGN KEY (ConsigneeId) REFERENCES Consignee(ConsigneeId),
    FOREIGN KEY (ProductId) REFERENCES ProductMaster(ProductId)
);

-- レポートメモ
CREATE TABLE ReportMemo (
    ReportMemoId INTEGER PRIMARY KEY AUTOINCREMENT,
    MemoName TEXT,
    MemoContent TEXT,
    IsDefault INTEGER DEFAULT 0
);

-- インデックス作成
CREATE INDEX idx_address_name ON Address(Name);
CREATE INDEX idx_address_postal ON Address(PostalCD);
CREATE INDEX idx_order_date ON "Order"(OrderDate);
CREATE INDEX idx_order_tracking ON "Order"(TrackingNumber);
CREATE INDEX idx_order_detail_order ON OrderDetail(OrderId);
CREATE INDEX idx_order_detail_consignee ON OrderDetail(ConsigneeId);
CREATE INDEX idx_order_detail_product ON OrderDetail(ProductId);

-- トリガー：更新日時の自動更新
CREATE TRIGGER update_address_timestamp 
    AFTER UPDATE ON Address 
    BEGIN 
        UPDATE Address SET UpdatedAt = CURRENT_TIMESTAMP WHERE AddressId = NEW.AddressId;
    END;

CREATE TRIGGER update_shipper_timestamp 
    AFTER UPDATE ON Shipper 
    BEGIN 
        UPDATE Shipper SET UpdatedAt = CURRENT_TIMESTAMP WHERE ShipperId = NEW.ShipperId;
    END;

CREATE TRIGGER update_consignee_timestamp 
    AFTER UPDATE ON Consignee 
    BEGIN 
        UPDATE Consignee SET UpdatedAt = CURRENT_TIMESTAMP WHERE ConsigneeId = NEW.ConsigneeId;
    END;

CREATE TRIGGER update_product_timestamp 
    AFTER UPDATE ON ProductMaster 
    BEGIN 
        UPDATE ProductMaster SET UpdatedAt = CURRENT_TIMESTAMP WHERE ProductId = NEW.ProductId;
    END;

CREATE TRIGGER update_store_timestamp 
    AFTER UPDATE ON Store 
    BEGIN 
        UPDATE Store SET UpdatedAt = CURRENT_TIMESTAMP WHERE StoreId = NEW.StoreId;
    END;

CREATE TRIGGER update_order_timestamp 
    AFTER UPDATE ON "Order"
    BEGIN 
        UPDATE "Order" SET UpdatedAt = CURRENT_TIMESTAMP WHERE OrderId = NEW.OrderId;
    END;

CREATE TRIGGER update_order_detail_timestamp 
    AFTER UPDATE ON OrderDetail 
    BEGIN 
        UPDATE OrderDetail SET UpdatedAt = CURRENT_TIMESTAMP WHERE OrderDetailId = NEW.OrderDetailId;
    END;