# HighLandirect データベース ER図

## エンティティ一覧

### 1. CustomerMaster（顧客マスタ）
**主キー**: CustNo (int)
- Furigana (nvarchar(255)) - ふりがな
- CustName (nvarchar(255)) - 顧客名 (NOT NULL)
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
- Label (bit) - ラベル
- LatestSend (datetime) - 最新送付日
- LatestResceive (datetime) - 最新受取日
- Delete (bit) - 削除フラグ

### 2. ProductMaster（商品マスタ）
**主キー**: ProductID (int)
- ProductName (nvarchar(32)) - 商品名 (NOT NULL)
- Tanka (money) - 単価 (NOT NULL)
- IsDefault (bit) - デフォルトフラグ

### 3. Order（注文）
**主キー**: OrderID (bigint)
- OrderDate (datetime) - 注文日 (NOT NULL)
- ReceiveCustID (int) - 受取顧客ID (NOT NULL)
- SendCustID (int) - 送付顧客ID (NOT NULL)
- ProductID (int) - 商品ID (NOT NULL)

### 4. OrderHistory（注文履歴）
**主キー**: OrderID (bigint)
- OrderDate (datetime) - 注文日 (NOT NULL)
- ReceiveCustID (int) - 受取顧客ID (NOT NULL)
- SendCustID (int) - 送付顧客ID (NOT NULL)
- ProductID (int) - 商品ID (NOT NULL)

### 5. Store（店舗）
**主キー**: id (numeric)
- StoreId1 (nvarchar(100)) - 店舗ID1
- StoreId2 (nvarchar(100)) - 店舗ID2
- CustomerCD (nvarchar(100)) - 顧客コード
- StoreName (nvarchar(100)) - 店舗名
- IsDefault (bit) - デフォルトフラグ

### 6. ReportMemo（レポートメモ）
**主キー**: ReportMemoId (numeric)
- ReportMemo (nvarchar(100)) - レポートメモ内容
- MemoName (nvarchar(100)) - メモ名
- IsDefault (bit) - デフォルトフラグ

## リレーションシップ

### CustomerMaster → Order/OrderHistory
- **1:N** CustomerMaster.CustNo → Order.ReceiveCustID (受取顧客)
- **1:N** CustomerMaster.CustNo → Order.SendCustID (送付顧客)
- **1:N** CustomerMaster.CustNo → OrderHistory.ReceiveCustID (受取顧客)
- **1:N** CustomerMaster.CustNo → OrderHistory.SendCustID (送付顧客)

### ProductMaster → Order/OrderHistory
- **1:N** ProductMaster.ProductID → Order.ProductID
- **1:N** ProductMaster.ProductID → OrderHistory.ProductID

## ER図（視覚的表現）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CustomerMaster │     │      Order      │     │  ProductMaster  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ PK CustNo       │────┐│ PK OrderID      │┌────│ PK ProductID    │
│    Furigana     │    ││    OrderDate    ││    │    ProductName  │
│    CustName     │    ││ FK ReceiveCustID│┘    │    Tanka        │
│    Keisho       │    ││ FK SendCustID   │     │    IsDefault    │
│    CityName     │    ││ FK ProductID    │─────┘                 │
│    PostalCD     │    │└─────────────────┘                     │
│    ...          │    │                                         │
│    LatestSend   │    │                                         │
│    Delete       │    │┌─────────────────┐                     │
└─────────────────┘    ││  OrderHistory   │                     │
                       │├─────────────────┤                     │
                       ││ PK OrderID      │                     │
                       ││    OrderDate    │                     │
                       ││ FK ReceiveCustID│─────────────────────┘
                       ││ FK SendCustID   │
                       └│ FK ProductID    │──────────────────────┐
                        └─────────────────┘                      │
                                                                 │
┌─────────────────┐     ┌─────────────────┐                     │
│     Store       │     │   ReportMemo    │                     │
├─────────────────┤     ├─────────────────┤                     │
│ PK id           │     │ PK ReportMemoId │                     │
│    StoreId1     │     │    ReportMemo   │                     │
│    StoreId2     │     │    MemoName     │                     │
│    CustomerCD   │     │    IsDefault    │                     │
│    StoreName    │     └─────────────────┘                     │
│    IsDefault    │                                             │
└─────────────────┘                                             │
                                                                 │
                        ┌────────────────────────────────────────┘
                        │
                        v
```

## システムの特徴

1. **顧客管理**: 詳細な顧客情報（住所、連絡先、ふりがな等）
2. **注文管理**: 送付元と受取先の両方を管理する配送システム
3. **商品管理**: シンプルな商品マスタ（商品名と単価）
4. **履歴管理**: OrderとOrderHistoryで現在と過去の注文を分離
5. **店舗管理**: 複数店舗対応
6. **レポート機能**: レポート用のメモ管理

このシステムは配送業務（HighLandirect）に特化した顧客・注文管理システムのようです。