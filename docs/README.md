# HighLandirect Web版 データベース設計

## 概要

HighLandirect Web版は、既存WPFアプリケーションのデータベース構造を正規化・最適化したWebアプリケーションです。
2025年8月13日にOrder model refactoringが完了し、Order+OrderDetail の正規化構造に移行しました。

## 主な設計方針

### 1. 住所一元管理
- **Address**テーブルで荷主・送付先の住所情報を統一管理
- 重複データの排除とデータ整合性の向上
- 郵便番号検索API・ふりがな自動生成機能に対応

### 2. Order正規化構造（2025/8/13 リファクタリング完了）
- **Order**（注文ヘッダー）+ **OrderDetail**（注文明細）分離
- 1つの注文で複数の送付先・商品を管理可能
- `OrderTotal`, `ItemCount` は OrderDetail から自動集約計算

### 3. エンティティ分離
- **Shipper**：荷主マスタ（LatestSend条件）
- **Consignee**：送付先マスタ（LatestReceive条件）
- **Store**：集配所マスタ（ヤマト運輸支店情報）

## ER図

### PlantUML形式
```bash
# PlantUML でER図を生成
plantuml database-er-diagram.plantuml
```

### Mermaid形式（GitHub対応）
```bash
# Mermaidファイル
cat database-er-diagram.mermaid
```

## テーブル構成

### 主要テーブル
1. **Address** - 住所マスタ（一元管理）
2. **Shipper** - 荷主マスタ
3. **Consignee** - 送付先マスタ
4. **ProductMaster** - 商品マスタ
5. **Store** - 集配所マスタ
6. **Order** - 注文ヘッダー（正規化済み）
7. **OrderDetail** - 注文明細（正規化済み）
8. **ReportMemo** - レポートメモ

### 主要なリレーションシップ
- Address (1) → (多) Shipper
- Address (1) → (多) Consignee  
- Shipper (1) → (多) Order
- Store (1) → (多) Order
- Order (1) → (多) OrderDetail
- Consignee (1) → (多) OrderDetail
- ProductMaster (1) → (多) OrderDetail

## データベース技術仕様

### CloudFlare D1 (SQLite)
- **本番DB**: `highlandirect-db` (ID: 4c827b08-7b7c-484e-9d3b-6e6a153842bb)
- **ローカルDB**: `highlandirect-local` (開発用)
- **スキーマファイル**: `migration/schema.sql`
- **初期データ**: `migration/seed.sql`

### パフォーマンス最適化
- 適切なインデックス配置
- 外部キー制約による参照整合性
- 自動タイムスタンプ更新トリガー

## API対応状況

### 完全実装済みAPI
- `GET /api/orders` - Order+OrderDetail構造、shipperId フィルタリング対応
- `POST /api/orders` - 複数OrderDetail対応トランザクション処理
- `GET /api/orders/:id` - 個別Order取得（OrderDetail込み）
- `PUT /api/orders/:id` - Order基本情報更新
- 全マスタ管理API（Shipper, Consignee, Product, Store）

## 移行履歴

### Phase 16: Order モデルリファクタリング（2025/8/13完了）
1. **スキーマ変更**: Order単体 → Order+OrderDetail分離
2. **データ移行**: 既存3件のOrder → 5件Order+OrderDetail（無損失移行）
3. **API再構築**: 正規化構造対応、集約計算、JOIN クエリ
4. **フロントエンド対応**: OrderList集約表示、検索機能拡張
5. **本番環境移行**: 外部キー制約修正、データ整合性確保

### 移行前後の比較
```
【移行前】Order テーブル（非正規化）
OrderId | OrderDate | ShipperId | ConsigneeId | ProductId | Quantity | UnitPrice | TotalAmount

【移行後】正規化構造
Order: OrderId | OrderDate | ShipperId | StoreId | OrderTotal | ItemCount
OrderDetail: OrderDetailId | OrderId | ConsigneeId | ProductId | Quantity | UnitPrice | LineTotal
```

## 今後の拡張

### 予定している機能
- ユーザー認証・権限管理
- ヤマトB2 API連携（配送ラベル印刷）
- 請求書作成・PDF出力機能
- リアルタイム配送トラッキング

### スキーマ拡張予定
- User テーブル（認証）
- Permission テーブル（権限管理）
- Invoice テーブル（請求書）
- TrackingHistory テーブル（配送履歴）