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

### CloudFlare D1 Database
```bash
# D1データベース管理
npx wrangler d1 execute highlandirect-db --file=migration/schema.sql --remote  # スキーマ適用
npx wrangler d1 execute highlandirect-db --file=migration/seed.sql --remote    # 初期データ投入
npx wrangler d1 execute highlandirect-db --command="SELECT COUNT(*) FROM 'Order'" --remote  # データ確認

# ローカル開発用Workers（オプション）
npm run dev:workers  # Workers開発環境 (port 8787)
```

## Architecture Overview

### フロントエンド構成
- **React 18** + **TypeScript** + **Vite**
- **Material-UI (MUI)** - UIコンポーネント
- **React Router** - SPA ルーティング
- **React Query** - サーバー状態管理
- **React Hook Form + Yup** - フォーム管理・バリデーション

### バックエンド構成
- **CloudFlare Pages Functions** - サーバーレス API（functions/ディレクトリ）
- **CloudFlare D1** - SQLite データベース（リモート運用中）
- **D1 Database**: `highlandirect-db` (ID: 4c827b08-7b7c-484e-9d3b-6e6a153842bb)

### ディレクトリ構造
```
├── src/                    # フロントエンド
│   ├── api/client.ts       # API クライアント設定
│   ├── components/Layout/  # 共通レイアウト
│   ├── data/mockData.ts    # 開発用モックデータ
│   ├── pages/              # ページコンポーネント
│   │   ├── Dashboard.tsx   # ダッシュボード
│   │   ├── Orders/         # 注文管理（API連携済み）
│   │   ├── Shippers/       # 荷主管理
│   │   ├── Consignees/     # 送付先管理
│   │   ├── Products/       # 商品管理
│   │   └── Stores/         # 集配所管理
│   ├── types/index.ts      # TypeScript型定義
│   └── theme.ts            # MUIテーマ設定
├── functions/              # CloudFlare Pages Functions (バックエンドAPI)
│   └── api/
│       ├── health.js       # ヘルスチェック
│       └── orders.js       # 注文管理API（D1連携済み）
├── migration/              # データベース関連
│   ├── schema.sql          # D1データベーススキーマ
│   ├── seed.sql            # 初期データ
│   └── README.md           # 移行手順
├── backend/                # Workers開発用設定（オプション）
└── wrangler.toml           # CloudFlare D1設定
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
- **CloudFlare Pages Functions** で REST API実装
- CORS対応済み（全APIエンドポイント）
- エラーハンドリング統一
- ページネーション・フィルタリング対応
- API Base URL: `/api/` prefix for all endpoints

### React コンポーネント設計
- TypeScript strict mode with path aliases (`@/` points to `src/`)
- MUI コンポーネント統一 (Material-UI v5)
- React Hook Form + Yup バリデーション
- **注文管理**: API連携完了（リアルタイムCRUD）
- **その他ページ**: モックデータで動作中

### データベース連携
- **CloudFlare D1**: `highlandirect-db` リモート運用中
- **実装済みAPI**: `/api/orders` (GET/POST)、`/api/health`
- **JOINクエリ**: Address ← Shipper/Consignee ← Order
- **初期データ**: 3件の注文、関連する荷主・送付先・商品・集配所
- D1 binding設定: 変数名 `DB`

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

## 現在の状態（2025年8月12日時点）

### 🚀 本番稼働中
- **Live URL**: https://highlandirectweb.pages.dev/
- **GitHub Pages**: https://koty.github.io/HighLandirectWeb/
- **自動デプロイ**: GitHubプッシュで自動更新

### ✅ 完全実装済み機能
1. **CloudFlare D1データベース**: 本番運用中
   - データベース: `highlandirect-db` 
   - スキーマ: 8テーブル（Address, Shipper, Consignee, ProductMaster, Store, Order, OrderHistory, ReportMemo）
   - 初期データ: 3件の注文 + 関連データ

2. **フルスタックAPI**: CloudFlare Pages Functions
   - `/api/health` - ヘルスチェック
   - `/api/orders` - 注文管理（GET/POST、ページネーション、フィルタリング）
   - CORS対応、エラーハンドリング完備

3. **React フロントエンド**: 
   - **注文管理**: D1データベース連携完了（リアルタイムCRUD）
   - **ダッシュボード**: 統計表示
   - **マスタ管理**: 荷主・送付先・商品・集配所（モックデータ）
   - **レスポンシブUI**: 全デバイス対応

4. **開発・デプロイ環境**:
   - TypeScript strict mode
   - 自動型チェック・リント
   - GitHub Actions CI/CD
   - CloudFlare Pages自動デプロイ

### 📊 実際のデータベースデータ
- **ORD-2024-001**: 東京商事株式会社 → 山田太郎（宅急便60サイズ、完了）
- **ORD-2024-002**: 大阪工業株式会社 → 大阪工業株式会社（クール宅急便、受付）
- **ORD-2024-003**: 名古屋商会 → 山田太郎（宅急便100サイズ、完了）

### 🔄 API動作確認
```bash
# 注文一覧取得（実際のD1データ）
curl "https://highlandirectweb.pages.dev/api/orders?page=1&limit=10"

# 新規注文作成（D1データベースに永続化）
curl -X POST https://highlandirectweb.pages.dev/api/orders \
  -H "Content-Type: application/json" \
  -d '{"ShipperName":"テスト荷主","ConsigneeName":"テスト送付先"}'
```

### 🔜 次期実装予定
1. **他エンティティのAPI連携**: Shippers, Consignees, Products, Stores
2. **日本郵便API**: 郵便番号検索の本格実装
3. **ヤマトB2 API**: 印刷機能
4. **ユーザー認証**: 権限管理システム

## 🏆 技術的達成
- **完全なフルスタックWebアプリケーション**
- **サーバーレス構成**: CloudFlare Pages + D1 + Functions
- **スケーラブル設計**: エッジコンピューティング + グローバルCDN
- **型安全**: TypeScript + 厳密なAPI型定義
- **高速開発**: リアルタイムホットリロード + 自動デプロイ

## コマンド実行方法

### フロントエンド開発
```bash
npm install
npm run dev          # ローカル開発サーバー → http://localhost:3000
npm run build        # 本番ビルド
npm run type-check   # TypeScript型チェック
npm run lint         # ESLint実行
```

### データベース管理
```bash
# D1データベース作成（初回のみ）
npx wrangler d1 create highlandirect-db

# スキーマ・データ投入（リモート）
npx wrangler d1 execute highlandirect-db --file=migration/schema.sql --remote
npx wrangler d1 execute highlandirect-db --file=migration/seed.sql --remote

# データ確認
npx wrangler d1 execute highlandirect-db --command="SELECT COUNT(*) FROM 'Order'" --remote
```

### デプロイ
```bash
git add .
git commit -m "Update message"
git push origin main  # 自動デプロイ → CloudFlare Pages
```

## Key Files for Development

### Configuration Files
- `wrangler.toml` - CloudFlare D1 database configuration
- `vite.config.ts` - Frontend build configuration with path aliases
- `tsconfig.json` - TypeScript configuration (strict mode)
- `package.json` - Dependencies and scripts
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD

### Core Architecture Files
- `functions/api/orders.js` - Orders API with D1 database integration
- `functions/api/health.js` - Health check endpoint
- `src/pages/Orders/OrderList.tsx` - Orders page with API integration
- `src/api/client.ts` - Frontend API client
- `src/types/index.ts` - Complete TypeScript definitions
- `migration/schema.sql` - D1 database schema
- `migration/seed.sql` - Initial data

### Production Environment
- **Live URL**: https://highlandirectweb.pages.dev/
- **Database**: CloudFlare D1 `highlandirect-db` (remote)
- **API Endpoints**: `/api/health`, `/api/orders`
- **Auto-deploy**: GitHub push → CloudFlare Pages
- Path alias `@/` configured to point to `src/`

## Development Roadmap

### 🚧 高優先度（Next Sprint）
- [ ] **ローカル開発環境の整備**: データベース連携した状態で動くようにする
- [ ] **他エンティティのAPI連携**: Shippers, Consignees, Products, Stores のPages Functions実装
- [ ] **荷主・送付先・商品・集配所管理**: モックデータからD1データベース連携に移行
- [ ] **注文作成フォーム**: 実際のShipper/Consignee/Product選択機能
- [ ] **データベース最適化**: インデックス調整、クエリパフォーマンス改善

### 🎯 中優先度（Future Features）
- [ ] **日本郵便API**: 郵便番号検索の本格実装（OAuth 2.0フロー完成済み）
- [ ] **請求書作成**: 

### 🌟 低優先度（Long-term Goals）
- [ ] **ユーザー認証システム**: JWT認証 + ロール管理
- [ ] **ヤマトB2 API**: 印刷機能連携
- [ ] **テスト環境**: Jest/Vitest + E2Eテスト

## テスト環境

現在はテストフレームワークが設定されていません。テストを追加する際は、ユーザーに希望するテスト設定（Jest、Vitest等）を確認してください。