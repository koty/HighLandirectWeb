# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HighLandirect Web版 - React + CloudFlare D1 + MUIを使用した配送管理システムのWeb化プロジェクト

## Development Commands

### 基本コマンド
```bash
npm run dev          # 開発サーバー起動 (port 3000)
npm run build        # プロダクションビルド
npm run preview      # ビルド結果のプレビュー
npm run deploy       # CloudFlare Pages デプロイ
```

### 品質管理
```bash
npm run lint         # ESLint実行
npm run lint:fix     # ESLint自動修正
npm run type-check   # TypeScript型チェック
```

### CloudFlare Workers
```bash
npm run dev:workers  # Workers開発環境 (port 8787)
# または
npx wrangler dev --port 8787
wrangler d1 execute highlander-db --file=migration/schema.sql  # D1スキーマ適用
```

## Architecture Overview

### フロントエンド構成
- **React 18** + **TypeScript** + **Vite**
- **Material-UI (MUI)** - UIコンポーネント
- **React Router** - SPA ルーティング
- **React Query** - サーバー状態管理
- **React Hook Form + Yup** - フォーム管理・バリデーション

### バックエンド構成
- **CloudFlare Workers** - サーバーレス API
- **CloudFlare D1** - SQLite データベース
- **itty-router** - API ルーティング

### ディレクトリ構造
```
src/
├── api/client.ts      # API クライアント設定
├── components/Layout/ # 共通レイアウト
├── data/mockData.ts  # 開発用モックデータ
├── pages/            # ページコンポーネント
│   ├── Dashboard.tsx # ダッシュボード
│   ├── Orders/       # 注文管理
│   ├── Shippers/     # 荷主管理
│   ├── Consignees/   # 送付先管理
│   ├── Products/     # 商品管理
│   └── Stores/       # 集配所管理
├── types/index.ts    # TypeScript型定義
├── theme.ts          # MUIテーマ設定
├── middleware/       # Workers ミドルウェア
├── routes/          # API エンドポイント
│   ├── orders.ts    # 注文管理API
│   ├── shippers.ts  # 荷主管理API
│   ├── consignees.ts # 送付先管理API
│   ├── products.ts  # 商品管理API
│   ├── stores.ts    # 集配所管理API
│   └── postal.ts    # 郵便番号検索API
├── utils/postalCodeApi.ts # 郵便番号API クライアント
├── components/AddressForm.tsx # 住所入力フォーム（郵便番号自動補完付き）
└── worker.ts        # Workers エントリーポイント
```

## Database Design

### 主要エンティティ関係
```
Address (住所一元管理)
├── Shipper (荷主: LatestSendありの顧客)
├── Consignee (送付先: LatestResceiveありの顧客)
└── Store (集配所: ヤマト運輸等)

Order (注文)
├── FK: ShipperId
├── FK: ConsigneeId  
├── FK: ProductId
└── FK: StoreId
```

### 移行ルール（SQL CE → SQLite）
- **全顧客** → Address テーブル
- **LatestSend有り** → Shipper テーブル
- **LatestResceive有り** → Consignee テーブル
- Store は集配所専用マスタ（Addressと分離）

## Important Implementation Notes

### API設計パターン
- REST API with CloudFlare Workers
- CORS対応済み (`src/middleware/cors.ts`)
- エラーハンドリング統一 (`src/middleware/errorHandler.ts`)
- ページネーション対応（orders, shippers, consignees）
- API Base URL: `/api/` prefix for all endpoints

### React コンポーネント設計
- TypeScript strict mode with path aliases (`@/` points to `src/`)
- MUI コンポーネント統一 (Material-UI v5)
- React Hook Form + Yup バリデーション
- カスタムフック活用
- 現在はモックデータで動作 (`src/data/mockData.ts`)

### データフェッチング
- React Query for server state management
- API client in `src/api/client.ts` 
- 型安全なAPI呼び出し (全エンティティの型定義済み)
- CloudFlare D1 binding: `DB` (環境: `Env` interface in `worker.ts`)

## Future Features

### 印刷機能
- ヤマトB2 API連携予定
- 現在は未実装（TODO コメント有り）

### 拡張予定機能  
- ユーザー認証・権限管理
- リアルタイム通知
- 配送状況追跡
- レポート機能強化

## Migration Tools

### データ移行
```bash
# Python版（推奨）
cd migration
python migrate.py --sqlce-path "MyData.sdf" --sqlite-path "new.sqlite"

# C#版
MigrationTool.exe "MyData.sdf" "new.sqlite"
```

移行ツールは `migration/` ディレクトリに配置済み

## 開発進捗履歴

### Phase 1: データベース設計・移行ツール作成 ✅完了
- [x] 既存WPFアプリのデータベース構造分析（SQL Server Compact Edition）
- [x] 新設計によるER図作成（住所一元管理・荷主/送付先分離）
- [x] SQLiteスキーマ設計（CloudFlare D1対応）
- [x] Python/C#データ移行ツール作成
- [x] 移行ロジック修正（LatestSend/LatestResceive条件フィルタリング）
- [x] Store設計修正（集配所専用マスタ、Addressとの関連切り離し）

### Phase 2: React Webアプリケーション作成 ✅完了
- [x] Vite + React + TypeScript + MUI プロジェクト初期化
- [x] レスポンシブレイアウト実装（サイドバーナビゲーション）
- [x] TypeScript型定義整備（全エンティティ対応）
- [x] React Router設定（全画面遷移）
- [x] MUIテーマ・日本語化設定

### Phase 3: CloudFlare Workers API実装 ✅完了
- [x] itty-router使用のREST API設計
- [x] CORS対応・エラーハンドリング統一
- [x] D1データベース連携（Orders, Shippers, Consignees, Products, Stores）
- [x] ページネーション・検索・フィルタリング機能
- [x] Wrangler設定ファイル作成

### Phase 4: UIコンポーネント実装 ✅完了

#### ダッシュボード機能
- [x] 統計カード表示（注文数・売上・ステータス別件数）
- [x] 最近の注文リスト（最新5件表示）
- [x] クイックアクションメニュー
- [x] レスポンシブグリッドレイアウト

#### 注文管理機能
- [x] DataGrid使用の注文一覧
- [x] ステータス別フィルタリング（全て・受付・処理中・完了・キャンセル）
- [x] 検索機能（注文番号・荷主名・送付先名）
- [x] 新規注文作成フォーム（React Hook Form + Yup バリデーション）
- [x] 編集・印刷・削除アクション（印刷はヤマトB2 API待ち）

#### マスタ管理機能
- [x] 荷主管理（一覧表示・編集リンク）
- [x] 送付先管理（配送指示・希望時間表示）
- [x] 商品管理（価格・重量・破損注意・デフォルト表示）
- [x] 集配所管理（ヤマト運輸各支店・サービスエリア・締切時間）

### Phase 5: テストデータ・開発環境整備 ✅完了
- [x] 豊富なモックデータ作成（住所5件・荷主3件・送付先3件・商品4件・集配所3件・注文5件）
- [x] 全ページでのモックデータ適用
- [x] 開発用環境変数設定（.env.local）
- [x] TypeScript設定・パスエイリアス設定
- [x] ESLint・Git設定ファイル作成

### Phase 6: 住所入力フォーム・郵便番号API実装 ✅完了
- [x] 共通AddressFormコンポーネント作成（郵便番号自動補完機能付き）
- [x] 荷主・送付先作成フォーム実装（ShipperForm / ConsigneeForm）
- [x] 日本郵便APIのOAuth 2.0認証フロー実装
- [x] CloudFlare Workers経由での郵便番号検索API実装（CORS回避）
- [x] トークン管理・キャッシュ機能実装
- [x] Viteプロキシ設定でフロントエンド-Workers連携

## 現在の状態

### ✅ 完全動作する機能
1. **ローカル開発環境**: `npm run dev` で即座起動可能
2. **フル機能ダッシュボード**: リアルデータでの統計表示
3. **完全な注文管理**: 検索・フィルタ・作成フォーム
4. **マスタデータ管理**: 全エンティティの一覧表示
5. **レスポンシブUI**: デスクトップ・タブレット・モバイル対応
6. **型安全な開発**: TypeScript strict mode
7. **住所入力フォーム**: 郵便番号7桁入力で住所自動補完
8. **荷主・送付先作成**: バリデーション付きフォーム完備

### 📊 テストデータ詳細
- **東京商事株式会社** → **山田太郎**: 宅急便60サイズ（完了）
- **大阪工業株式会社** → **大阪工業株式会社**: クール宅急便（受付）
- **名古屋商会** → **山田太郎**: 宅急便100サイズ（完了）
- 各種ステータス・配送業者・料金体系をカバー

### 🔜 次期実装予定
1. **CloudFlare D1連携**: 実際のデータベース接続
2. **日本郵便API本番連携**: 正式な認証情報での実装
3. **ヤマトB2 API連携**: 印刷機能の実装
4. **ユーザー認証**: 権限管理システム
5. **リアルタイム機能**: 配送状況追跡

## 技術的成果
- **フロントエンド**: React 18 + TypeScript + MUI の完全活用
- **バックエンド**: CloudFlare Workers + D1 のサーバーレス設計
- **データ設計**: 既存システムからの適切な正規化・役割分離
- **開発効率**: TypeScript型安全性 + モックデータでの高速開発

## コマンド実行方法
```bash
# ローカル確認
npm install
npm run dev  # → http://localhost:3000

# 型チェック・リント
npm run type-check
npm run lint

# 将来のデプロイ
npm run build
npm run deploy
```

## Key Files for Development

### Configuration Files
- `wrangler.toml` - CloudFlare Workers/D1 configuration  
- `vite.config.ts` - Frontend build configuration with path aliases
- `tsconfig.json` - TypeScript configuration (strict mode)
- `package.json` - Dependencies and scripts

### Core Architecture Files
- `src/worker.ts` - CloudFlare Workers entry point with router setup
- `src/types/index.ts` - Complete TypeScript definitions for all entities
- `src/theme.ts` - MUI theme configuration
- `src/data/mockData.ts` - Rich mock data for development

### Environment Setup
- Development: React runs on port 3000, Workers on port 8787
- Path alias `@/` configured to point to `src/`
- Mock data includes 5 addresses, 3 shippers, 3 consignees, 4 products, 3 stores, 5 orders
- Frontend-Workers integration via Vite proxy (`/api` routes to `http://localhost:8787`)
- Copy `.env.local.example` to `.env.local` for environment variables (Japan Post API credentials)

## Testing

Currently no testing framework is configured. When adding tests, check with the user for their preferred testing setup (Jest, Vitest, etc.).