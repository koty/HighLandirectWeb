# HighLandirect Web版 - 改善されたデータベース設計

## 設計思想

荷主と送付先の役割を明確に分けつつ、住所情報の一元管理を実現する設計です。

## 新しいエンティティ設計

### 1. Address（住所マスタ）
**主キー**: AddressId (int)
- Furigana (nvarchar(255)) - ふりがな
- Name (nvarchar(255)) - 名前/会社名 (NOT NULL)
- Keisho (nvarchar(2)) - 敬称
- CityName (nvarchar(32)) - 市区町村名
- PostalCD (nvarchar(7)) - 郵便番号
- PrefectureCD (nvarchar(10)) - 都道府県コード
- PrefectureName (nvarchar(32)) - 都道府県名
- RegionCD (nvarchar(10)) - 地域コード
- RegionName (nvarchar(10)) - 地域名
- Address1-4 (nvarchar(255)) - 住所1-4
- Phone (nvarchar(36)) - 電話番号
- Fax (nvarchar(36)) - FAX番号
- Phone2 (nvarchar(36)) - 電話番号2
- MailAddress (nvarchar(64)) - メールアドレス
- Memo (nvarchar(255)) - メモ
- CreatedAt (datetime) - 作成日時
- UpdatedAt (datetime) - 更新日時
- IsActive (bit) - 有効フラグ

### 2. Shipper（荷主マスタ）
**主キー**: ShipperId (int)
- AddressId (int) - 住所ID (NOT NULL, FK)
- ShipperCode (nvarchar(20)) - 荷主コード
- ShipperType (nvarchar(20)) - 荷主種別（個人/法人等）
- ContractStartDate (datetime) - 契約開始日
- ContractEndDate (datetime) - 契約終了日
- CreditLimit (decimal) - 与信限度額
- PaymentTerms (nvarchar(50)) - 支払条件
- IsActive (bit) - 有効フラグ
- CreatedAt (datetime) - 作成日時
- UpdatedAt (datetime) - 更新日時

### 3. Consignee（送付先マスタ）
**主キー**: ConsigneeId (int)
- AddressId (int) - 住所ID (NOT NULL, FK)
- ConsigneeCode (nvarchar(20)) - 送付先コード
- DeliveryInstructions (nvarchar(500)) - 配送指示
- AccessInfo (nvarchar(500)) - アクセス情報
- PreferredDeliveryTime (nvarchar(50)) - 希望配送時間帯
- SpecialHandling (nvarchar(200)) - 特別取扱
- IsActive (bit) - 有効フラグ
- CreatedAt (datetime) - 作成日時
- UpdatedAt (datetime) - 更新日時

### 4. ProductMaster（商品マスタ） - 既存から変更
**主キー**: ProductId (int)
- ProductCode (nvarchar(20)) - 商品コード
- ProductName (nvarchar(100)) - 商品名 (NOT NULL)
- ProductCategory (nvarchar(50)) - 商品カテゴリ
- UnitPrice (decimal) - 単価 (NOT NULL)
- TaxRate (decimal) - 税率
- Weight (decimal) - 重量(kg)
- Dimensions (nvarchar(50)) - 寸法（縦x横x高さ）
- IsFragile (bit) - 破損注意
- IsDefault (bit) - デフォルトフラグ
- IsActive (bit) - 有効フラグ
- CreatedAt (datetime) - 作成日時
- UpdatedAt (datetime) - 更新日時

### 5. Order（注文） - 大幅変更
**主キー**: OrderId (bigint)
- OrderNumber (nvarchar(50)) - 注文番号 (ユニーク)
- OrderDate (datetime) - 注文日 (NOT NULL)
- ShipperId (int) - 荷主ID (NOT NULL, FK)
- ConsigneeId (int) - 送付先ID (NOT NULL, FK)
- ProductId (int) - 商品ID (NOT NULL, FK)
- StoreId (int) - 集配所ID (NOT NULL, FK)
- Quantity (int) - 数量 (NOT NULL, DEFAULT 1)
- UnitPrice (decimal) - 単価
- TotalAmount (decimal) - 合計金額
- OrderStatus (nvarchar(20)) - 注文状況（受付/処理中/完了/キャンセル）
- RequestedDeliveryDate (datetime) - 希望配送日
- ActualDeliveryDate (datetime) - 実際配送日
- TrackingNumber (nvarchar(50)) - 追跡番号
- SpecialInstructions (nvarchar(500)) - 特別指示
- CreatedAt (datetime) - 作成日時
- UpdatedAt (datetime) - 更新日時
- CreatedBy (nvarchar(50)) - 作成者
- UpdatedBy (nvarchar(50)) - 更新者

### 6. OrderHistory（注文履歴） - 変更
**主キー**: OrderHistoryId (bigint)
- OrderId (bigint) - 注文ID (FK)
- StatusChange (nvarchar(100)) - 状況変更内容
- PreviousStatus (nvarchar(20)) - 変更前状況
- NewStatus (nvarchar(20)) - 変更後状況
- Notes (nvarchar(500)) - 備考
- ChangedAt (datetime) - 変更日時
- ChangedBy (nvarchar(50)) - 変更者

### 7. Store（ヤマト集配所マスタ） - 修正
**主キー**: StoreId (int)
- StoreCode (nvarchar(20)) - 集配所コード
- StoreName (nvarchar(100)) - 集配所名
- CarrierCode (nvarchar(10)) - 配送業者コード（ヤマト等）
- CarrierName (nvarchar(50)) - 配送業者名
- RegionCode (nvarchar(10)) - 担当地域コード
- ContactPhone (nvarchar(36)) - 連絡先電話番号
- ServiceArea (nvarchar(200)) - サービスエリア
- CutoffTime (time) - 集荷締切時間
- IsDefault (bit) - デフォルトフラグ
- IsActive (bit) - 有効フラグ
- CreatedAt (datetime) - 作成日時
- UpdatedAt (datetime) - 更新日時

### 8. ReportMemo（レポートメモ） - 既存を維持
**主キー**: ReportMemoId (int)
- MemoName (nvarchar(100)) - メモ名
- MemoContent (nvarchar(500)) - メモ内容
- IsDefault (bit) - デフォルトフラグ

## リレーションシップ

### Address → Shipper/Consignee
- **1:N** Address.AddressId → Shipper.AddressId
- **1:N** Address.AddressId → Consignee.AddressId

### Shipper/Consignee/Product/Store → Order
- **1:N** Shipper.ShipperId → Order.ShipperId
- **1:N** Consignee.ConsigneeId → Order.ConsigneeId
- **1:N** Product.ProductId → Order.ProductId
- **1:N** Store.StoreId → Order.StoreId

### Order → OrderHistory
- **1:N** Order.OrderId → OrderHistory.OrderId

## 新しいER図

```
                    ┌─────────────────┐
                    │     Address     │
                    ├─────────────────┤
                    │ PK AddressId    │
                    │    Furigana     │
                    │    Name         │
                    │    PostalCD     │
                    │    Prefecture   │
                    │    Address1-4   │
                    │    Phone        │
                    │    ...          │
                    └─────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            v              v              │
    ┌─────────────┐ ┌─────────────┐       │
    │   Shipper   │ │  Consignee  │       │
    ├─────────────┤ ├─────────────┤       │
    │PK ShipperId │ │PK ConsigneeId│       │
    │FK AddressId │ │FK AddressId │       │
    │ ShipperCode │ │ConsigneeCode│       │
    │CreditLimit  │ │DeliveryInst │       │
    │PaymentTerms │ │PreferredTime│       │
    └─────────────┘ └─────────────┘       │
                                          │
                                          │
                    ┌─────────────────────┐│
                    │       Store         ││
                    │  (ヤマト集配所)      ││
                    ├─────────────────────┤│
                    │ PK StoreId          ││
                    │    StoreCode        ││
                    │    StoreName        ││
                    │    CarrierCode      ││  独立したマスタ
                    │    CarrierName      ││  （Addressと関連なし）
                    │    RegionCode       ││
                    │    ServiceArea      ││
                    │    CutoffTime       ││
                    └─────────────────────┘│
            │              │
            │              │        ┌─────────────────┐
            │              │        │ ProductMaster   │
            │              │        ├─────────────────┤
            │              │        │ PK ProductId    │
            │              │        │    ProductCode  │
            │              │        │    ProductName  │
            │              │        │    UnitPrice    │
            │              │        │    Weight       │
            │              │        │    IsFragile    │
            │              │        └─────────────────┘
            │              │                │
            │              │                │        │
            │              │                │        │
            │              │                │        │ ┌─────Store────────┐
            │              │                │        └→│ PK StoreId       │
            │              │                │          │    StoreCode     │
            │              │                │          │    StoreName     │
            │              │                │          │    CarrierCode   │
            │              │                │          │    ServiceArea   │
            │              │                │          └──────────────────┘
            │              │                │                       │
            v              v                v                       v
            ┌─────────────────────────────────────────────────────────┐
            │                    Order                               │
            ├─────────────────────────────────────────────────────────┤
            │ PK OrderId                                             │
            │    OrderNumber                                         │
            │    OrderDate                                           │
            │ FK ShipperId                                           │
            │ FK ConsigneeId                                         │
            │ FK ProductId                                           │
            │ FK StoreId                                             │
            │    Quantity                                            │
            │    TotalAmount                                         │
            │    OrderStatus                                         │
            │    TrackingNumber                                      │
            └─────────────────────────────────────────────────────────┘
                            │
                            │
                            v
            ┌─────────────────────────────────────────┐
            │            OrderHistory                 │
            ├─────────────────────────────────────────┤
            │ PK OrderHistoryId                       │
            │ FK OrderId                              │
            │    StatusChange                         │
            │    PreviousStatus                       │
            │    NewStatus                            │
            │    ChangedAt                            │
            │    ChangedBy                            │
            └─────────────────────────────────────────┘
```

## 設計の利点

1. **住所の一元管理**: Address テーブルで住所情報を統一管理
2. **役割の明確化**: Shipper（荷主）とConsignee（送付先）で役割を分離
3. **柔軟性**: 同一住所が複数の役割（荷主兼送付先）を持てる
4. **拡張性**: 新しい住所利用者（例：中継地点）の追加が容易
5. **履歴管理**: OrderHistoryで状況変更の詳細な履歴を記録
6. **トレーサビリティ**: 追跡番号、作成者・更新者の記録

この設計で要件は満たされますか？何か追加や変更が必要でしたらお聞かせください。