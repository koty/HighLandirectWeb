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
    ShipperCode TEXT UNIQUE,
    ShipperType TEXT,
    ContractStartDate DATETIME,
    ContractEndDate DATETIME,
    CreditLimit REAL,
    PaymentTerms TEXT,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AddressId) REFERENCES Address(AddressId)
);

-- 送付先マスタ  
CREATE TABLE Consignee (
    ConsigneeId INTEGER PRIMARY KEY AUTOINCREMENT,
    AddressId INTEGER NOT NULL,
    ConsigneeCode TEXT UNIQUE,
    DeliveryInstructions TEXT,
    AccessInfo TEXT,
    PreferredDeliveryTime TEXT,
    SpecialHandling TEXT,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AddressId) REFERENCES Address(AddressId)
);

-- 商品マスタ
CREATE TABLE ProductMaster (
    ProductId INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductCode TEXT UNIQUE,
    ProductName TEXT NOT NULL,
    ProductCategory TEXT,
    UnitPrice REAL NOT NULL,
    TaxRate REAL DEFAULT 0.1,
    Weight REAL,
    Dimensions TEXT,
    IsFragile INTEGER DEFAULT 0,
    IsDefault INTEGER DEFAULT 0,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ヤマト集配所マスタ
CREATE TABLE Store (
    StoreId INTEGER PRIMARY KEY AUTOINCREMENT,
    StoreCode TEXT UNIQUE,
    StoreName TEXT,
    CarrierCode TEXT,
    CarrierName TEXT,
    RegionCode TEXT,
    ContactPhone TEXT,
    ServiceArea TEXT,
    CutoffTime TEXT,
    IsDefault INTEGER DEFAULT 0,
    IsActive INTEGER DEFAULT 1,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 注文
CREATE TABLE "Order" (
    OrderId INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderNumber TEXT UNIQUE,
    OrderDate DATETIME NOT NULL,
    ShipperId INTEGER NOT NULL,
    ConsigneeId INTEGER NOT NULL,
    ProductId INTEGER NOT NULL,
    StoreId INTEGER NOT NULL,
    Quantity INTEGER NOT NULL DEFAULT 1,
    UnitPrice REAL,
    TotalAmount REAL,
    OrderStatus TEXT DEFAULT 'pending',
    RequestedDeliveryDate DATETIME,
    ActualDeliveryDate DATETIME,
    TrackingNumber TEXT,
    SpecialInstructions TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CreatedBy TEXT,
    UpdatedBy TEXT,
    FOREIGN KEY (ShipperId) REFERENCES Shipper(ShipperId),
    FOREIGN KEY (ConsigneeId) REFERENCES Consignee(ConsigneeId),
    FOREIGN KEY (ProductId) REFERENCES ProductMaster(ProductId),
    FOREIGN KEY (StoreId) REFERENCES Store(StoreId)
);

-- 注文履歴
CREATE TABLE OrderHistory (
    OrderHistoryId INTEGER PRIMARY KEY AUTOINCREMENT,
    OrderId INTEGER NOT NULL,
    StatusChange TEXT,
    PreviousStatus TEXT,
    NewStatus TEXT,
    Notes TEXT,
    ChangedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    ChangedBy TEXT,
    FOREIGN KEY (OrderId) REFERENCES "Order"(OrderId)
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
CREATE INDEX idx_shipper_code ON Shipper(ShipperCode);
CREATE INDEX idx_consignee_code ON Consignee(ConsigneeCode);
CREATE INDEX idx_product_code ON ProductMaster(ProductCode);
CREATE INDEX idx_store_code ON Store(StoreCode);
CREATE INDEX idx_order_number ON "Order"(OrderNumber);
CREATE INDEX idx_order_date ON "Order"(OrderDate);
CREATE INDEX idx_order_status ON "Order"(OrderStatus);
CREATE INDEX idx_order_tracking ON "Order"(TrackingNumber);

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