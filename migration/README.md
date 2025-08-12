# HighLandirect データベース移行ツール

SQL Server Compact Edition から SQLite（CloudFlare D1対応）への移行ツールです。

## ファイル構成

- `schema.sql` - 新しいSQLiteデータベースのスキーマ
- `migrate.py` - Python版移行ツール  
- `MigrationTool.cs` - C#版移行ツール
- `requirements.txt` - Python依存関係

## 移行内容

### データ構造の変更
- **CustomerMaster** → **Address + Shipper + Consignee**
  - 住所情報を一元管理（Address）
  - 荷主（Shipper）と送付先（Consignee）を分離
  - **LatestSendがある顧客のみShipperに移行**
  - **LatestResceiveがある顧客のみConsigneeに移行**

- **Store** → 独立した集配所マスタ
  - Addressとの関連を削除
  - 配送業者情報を追加（CarrierCode, ServiceArea等）

- **Order** → 拡張された注文管理
  - 新しいリレーション（Shipper, Consignee, Store）
  - ステータス管理、追跡番号等を追加

## 使用方法

### Python版（推奨）

```bash
# 依存関係インストール
pip install pyodbc sqlite3

# 移行実行
python migrate.py --sqlce-path "C:/path/to/MyData.sdf" --sqlite-path "./new_database.sqlite"
```

### C#版

```bash
# コンパイル（Visual Studio または .NET CLI）
csc MigrationTool.cs /reference:System.Data.SqlServerCe.dll,System.Data.SQLite.dll

# 実行
MigrationTool.exe "C:/path/to/MyData.sdf" "C:/path/to/new_database.sqlite"
```

## 必要な環境

### Python版
- Python 3.6+
- pyodbc （SQL Server Compact Edition用）
- sqlite3 （標準ライブラリ）

### C#版  
- .NET Framework 4.0+
- System.Data.SqlServerCe.dll
- System.Data.SQLite.dll

## 移行処理の流れ

1. **接続確認**: SQL CE と SQLite への接続
2. **スキーマ作成**: 新しいテーブル構造を作成
3. **顧客データ移行**: 
   - 全顧客 → Address
   - LatestSendがある顧客 → Shipper  
   - LatestResceiveがある顧客 → Consignee
4. **商品データ移行**: ProductMaster の移行
5. **店舗データ移行**: Store の移行（集配所として）
6. **注文データ移行**: Order + OrderHistory の移行
7. **その他データ移行**: ReportMemo 等

## 移行時の注意点

### データマッピング
- 顧客番号（CustNo）→ ShipperCode（SHIP0001形式）, ConsigneeCode（CONS0001形式）
- 商品ID → ProductCode（PROD0001形式）
- 注文ID → OrderNumber（ORD00000001形式）

### 既存データの互換性
- 削除フラグ（Delete=1）のデータは除外
- NULL値の適切な処理
- 日付フォーマットの変換

### エラーハンドリング
- 接続エラー時の代替方法提示
- データ不整合時のスキップ処理
- 詳細なログ出力

## CloudFlare D1 デプロイ

移行完了後、SQLiteファイルをCloudFlare D1にインポート：

```bash
# D1データベース作成
wrangler d1 create highlandirect-db

# スキーマ適用
wrangler d1 execute highlandirect-db --file=./schema.sql

# データインポート
wrangler d1 execute highlandirect-db --file=./data_dump.sql
```

## トラブルシューティング

### ODBC接続エラー
- SQL Server Compact Edition ODBC ドライバーのインストール確認
- 32bit/64bit版の適切な選択

### 文字化け
- UTF-8エンコーディングの確認
- 日本語文字列の適切な処理

### パフォーマンス
- 大量データの場合はバッチ処理を検討
- インデックス作成タイミングの調整