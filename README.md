# HighLandirect Web版

React + CloudFlare D1 + MUIを使用したHighLandirectのWeb版アプリケーションです。

## 概要

既存のWPF版HighLandirectアプリケーションをWeb化し、以下の機能を提供します：

- **注文管理**: 配送注文の作成・編集・一覧表示
- **荷主管理**: 配送依頼者の情報管理
- **送付先管理**: 配送先の情報管理
- **商品管理**: 配送商品の管理
- **集配所管理**: ヤマト運輸等の集配所情報管理

## 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全な開発
- **Material-UI (MUI)** - UIコンポーネント
- **React Router** - ルーティング
- **React Query** - データフェッチング
- **React Hook Form** - フォーム管理
- **Vite** - ビルドツール

### バックエンド
- **CloudFlare Workers** - サーバーレス関数
- **CloudFlare D1** - SQLiteベースのデータベース
- **itty-router** - ルーティング

## データベース設計

既存のSQL Server Compact Editionから以下の構造に変更：

### 主要エンティティ
- **Address**: 住所情報の一元管理
- **Shipper**: 荷主情報（LatestSendがある顧客のみ）
- **Consignee**: 送付先情報（LatestResceiveがある顧客のみ）
- **ProductMaster**: 商品マスタ
- **Store**: 集配所マスタ（ヤマト運輸等）
- **Order**: 注文情報
- **OrderHistory**: 注文履歴

## セットアップ

### 前提条件
- Node.js 18+
- npm または yarn
- Wrangler CLI

### インストール

```bash
# 依存関係をインストール
npm install

# 開発サーバー起動
npm run dev

# CloudFlare Workers開発環境
wrangler dev
```

### データベース移行

既存のSQL Server Compact EditionからSQLiteへの移行：

```bash
# Python版移行ツール（推奨）
cd migration
pip install -r requirements.txt
python migrate.py --sqlce-path "path/to/MyData.sdf" --sqlite-path "./highlander.sqlite"

# C#版移行ツール
MigrationTool.exe "path/to/MyData.sdf" "path/to/highlander.sqlite"
```

### CloudFlare D1セットアップ

```bash
# D1データベース作成
wrangler d1 create highlander-db

# スキーマ適用
wrangler d1 execute highlander-db --file=./migration/schema.sql

# データインポート（移行後）
wrangler d1 execute highlander-db --file=./data_dump.sql
```

## 開発

### ディレクトリ構造

```
src/
├── api/           # API クライアント
├── components/    # 共通コンポーネント
├── pages/         # ページコンポーネント
├── types/         # TypeScript型定義
├── middleware/    # CloudFlare Workers ミドルウェア
├── routes/        # API ルート
└── worker.ts      # CloudFlare Workers エントリーポイント
```

### 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 型チェック
npm run type-check

# リント
npm run lint
npm run lint:fix

# ビルド
npm run build

# プレビュー
npm run preview

# CloudFlare Pages デプロイ
npm run deploy
```

## API エンドポイント

### 注文管理
- `GET /api/orders` - 注文一覧取得
- `GET /api/orders/:id` - 注文詳細取得
- `POST /api/orders` - 注文作成
- `PUT /api/orders/:id` - 注文更新
- `PATCH /api/orders/:id/status` - ステータス更新

### 荷主管理
- `GET /api/shippers` - 荷主一覧取得
- `GET /api/shippers/:id` - 荷主詳細取得
- `POST /api/shippers` - 荷主作成
- `PUT /api/shippers/:id` - 荷主更新

### 送付先管理
- `GET /api/consignees` - 送付先一覧取得
- `GET /api/consignees/:id` - 送付先詳細取得
- `POST /api/consignees` - 送付先作成
- `PUT /api/consignees/:id` - 送付先更新

### マスタデータ
- `GET /api/products` - 商品一覧取得
- `GET /api/stores` - 集配所一覧取得

## 印刷機能

ヤマト運輸B2 APIを使用した印刷機能は今後実装予定です。

## デプロイ

### CloudFlare Pages

1. GitHubリポジトリをCloudFlare Pagesに接続
2. ビルド設定:
   - Build command: `npm run build`
   - Build output directory: `dist`
3. 環境変数設定:
   - `VITE_API_BASE_URL`: API エンドポイント URL

### 環境変数

```bash
# .env.local
VITE_API_BASE_URL=https://your-workers.your-subdomain.workers.dev/api
```

## ライセンス

Private Project

## 開発チーム

- Backend: CloudFlare Workers + D1
- Frontend: React + MUI
- Database Migration: Python/C# tools