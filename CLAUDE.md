# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HighLandirect Web版 - React + CloudFlare D1 + MUIを使用した配送管理システムのWeb化プロジェクト

## Development Commands

### 基本コマンド
```bash
npm run dev          # フロントエンド開発サーバー起動 (port 3000)
npm run build        # プロダクションビルド
npm run preview      # ビルド結果のプレビュー
npm run deploy       # CloudFlare Pages デプロイ
```

### ローカル開発環境（フルスタック）
```bash
# 1. フロントエンド開発サーバー
npm run dev          # port 3000

# 2. ローカルAPI + D1データベース
npx wrangler dev worker-local.js --config=wrangler-dev.toml --port=8788

# 両方を同時起動することで、ローカルでフルスタック開発が可能
# フロントエンド → API → ローカルSQLite データベース
```

### 品質管理・セキュリティチェック
```bash
npm run lint         # ESLint実行（コード品質・セキュリティチェック）
npm run lint:fix     # ESLint自動修正
npm run type-check   # TypeScript型チェック
npm run security-check # セキュリティ問題のみ表示
```

### CloudFlare D1 Database

#### 本番環境（リモート）
```bash
# 本番データベース管理
npx wrangler d1 execute highlandirect-db --file=migration/schema.sql --remote  # スキーマ適用
npx wrangler d1 execute highlandirect-db --file=migration/seed.sql --remote    # 初期データ投入
npx wrangler d1 execute highlandirect-db --command="SELECT COUNT(*) FROM 'Order'" --remote  # データ確認
```

#### ローカル開発環境
```bash
# ローカルD1データベースの初期化
npx wrangler d1 create highlandirect-local  # ローカルDB作成
npx wrangler d1 execute highlandirect-local --file=migration/schema.sql --config=wrangler-dev.toml  # スキーマ適用
npx wrangler d1 execute highlandirect-local --file=migration/seed.sql --config=wrangler-dev.toml    # 初期データ投入

# データ確認
npx wrangler d1 execute highlandirect-local --command="SELECT COUNT(*) FROM Shipper" --config=wrangler-dev.toml
```

## Architecture Overview

### フロントエンド構成
- **React 18** + **TypeScript** + **Vite**
- **Material-UI (MUI)** - UIコンポーネント
- **React Router** - SPA ルーティング
- **React Query** - サーバー状態管理
- **React Hook Form + Yup** - フォーム管理・バリデーション
- **wanakana** - 日本語ふりがな自動生成
- **ESLint + Security Plugin** - コード品質・セキュリティチェック

### バックエンド構成
- **CloudFlare Pages Functions** - サーバーレス API（functions/ディレクトリ）
- **CloudFlare D1** - SQLite データベース（リモート運用中）
- **D1 Database**: `highlandirect-db` (ID: 4c827b08-7b7c-484e-9d3b-6e6a153842bb)

### ディレクトリ構造
```
├── src/                    # フロントエンド
│   ├── api/client.ts       # API クライアント設定
│   ├── components/
│   │   ├── Layout/         # 共通レイアウト
│   │   └── AddressForm.tsx # 住所入力フォーム（ふりがな自動生成機能付き）
│   ├── data/mockData.ts    # 開発用モックデータ
│   ├── pages/              # ページコンポーネント
│   │   ├── Dashboard.tsx   # ダッシュボード
│   │   ├── Orders/         # 注文管理（API連携済み）
│   │   ├── Shippers/       # 荷主管理
│   │   ├── Consignees/     # 送付先管理
│   │   ├── Products/       # 商品管理
│   │   └── Stores/         # 集配所管理
│   ├── types/index.ts      # TypeScript型定義
│   ├── utils/
│   │   ├── furigana.ts     # ふりがな自動生成ユーティリティ（wanakana + 辞書）
│   │   └── postalCodeApi.ts # 郵便番号検索ユーティリティ
│   └── theme.ts            # MUIテーマ設定
├── functions/              # CloudFlare Pages Functions (バックエンドAPI - 本番用)
│   ├── types.ts            # TypeScript型定義（CloudFlare D1, Pages Functions）
│   └── api/
│       ├── health.ts       # ヘルスチェック
│       ├── orders.ts       # 注文管理API（D1連携済み）
│       ├── shippers.ts     # 荷主管理API（D1連携済み）
│       ├── consignees.ts   # 送付先管理API（D1連携済み）
│       ├── products.ts     # 商品管理API（D1連携済み）
│       ├── stores.ts       # 集配所管理API（D1連携済み）
│       └── postal/
│           └── search/
│               └── [zipcode].ts  # 郵便番号検索API（日本郵便API連携）
├── worker-local.js         # ローカル開発用CloudFlare Worker
├── wrangler.toml           # CloudFlare D1設定（本番用）
├── wrangler-dev.toml       # ローカル開発用設定
├── migration/              # データベース関連
│   ├── schema.sql          # D1データベーススキーマ
│   ├── seed.sql            # 初期データ
│   └── README.md           # 移行手順
└── .wrangler/              # ローカルD1データベースファイル（SQLite）
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
- **実装済みAPI**: 全エンティティ対応（TypeScript完全移行済み）
  - `/api/health` - ヘルスチェック
  - `/api/orders` - 注文管理（GET/POST、ページネーション、フィルタリング）
  - `/api/shippers` - 荷主管理（GET/POST、Address JOIN、検索機能）
  - `/api/consignees` - 送付先管理（GET/POST、Address JOIN、検索機能）
  - `/api/products` - 商品管理（GET/POST、カテゴリフィルタ、アクティブフィルタ）
  - `/api/stores` - 集配所管理（GET/POST、運送業者フィルタ、サービスエリア検索）
  - `/api/postal/search/[zipcode]` - 郵便番号検索（日本郵便API連携、モックデータフォールバック）
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

### Phase 7: TypeScript完全移行・API拡充 ✅完了
- [x] CloudFlare Pages Functions JavaScript → TypeScript完全移行
- [x] `functions/types.ts` 型定義ファイル作成（D1, Pages Functions）
- [x] 全エンティティAPI実装（Shippers, Consignees, Products, Stores）
- [x] 型安全なAPI設計（strict TypeScript + エラーハンドリング）
- [x] Address JOINクエリ対応（荷主・送付先管理）
- [x] 検索・フィルタリング・ページネーション全API対応
- [x] パフォーマンス最適化（インデックス追加、クエリ改善）

### Phase 8: 日本郵便API統合・郵便番号検索機能 ✅完了
- [x] CloudFlare Pages Function による郵便番号検索API実装
- [x] 日本郵便公式API統合（OAuth 2.0認証、トークン管理）
- [x] 動的ルーティング `/api/postal/search/[zipcode]` 実装
- [x] 郵便番号バリデーション（7桁数字形式チェック）
- [x] モックデータフォールバック機能（API障害時の安全な動作）
- [x] 詳細住所情報取得（都道府県、市区町村、町名、読み仮名、ローマ字）
- [x] 環境変数による認証情報管理
- [x] 本番環境での動作確認（実際の住所データ取得成功）

### Phase 9: 新規作成フォーム（POST API連携）✅完了
- [x] ShipperForm POST API連携実装（荷主作成）
- [x] ConsigneeForm POST API連携実装（送付先作成）
- [x] OrderForm POST API連携実装（注文作成）
- [x] 包括的なエラーハンドリング・バリデーション
- [x] 成功・失敗時の適切なユーザーフィードバック
- [x] 作成後の画面遷移と状態更新

### Phase 10: ローカル開発環境構築（SQLite連携）✅完了
- [x] ローカルD1データベース構築（`highlandirect-local`）
- [x] ローカル開発用CloudFlare Worker実装（`worker-local.js`）
- [x] ローカル環境用設定ファイル（`wrangler-dev.toml`）
- [x] Vite開発サーバーとローカルAPIの連携設定
- [x] ローカルSQLite環境でのフルスタック開発環境
- [x] 初期データ投入とスキーマ適用の自動化
- [x] 本番同等のCRUD操作をローカルで実現

### Phase 11: ふりがな自動生成機能実装 ✅完了
- [x] wanakanaライブラリの導入（ブラウザ対応）
- [x] 人名・会社名特化の漢字→ひらがな辞書システム構築
- [x] `src/utils/furigana.ts` ふりがな生成ユーティリティ実装
- [x] AddressFormコンポーネントへの自動生成機能統合
- [x] 氏名・会社名入力時の即座ふりがな変換
- [x] ローディング表示・エラーハンドリング・手動修正対応
- [x] ShipperForm・ConsigneeFormでの利用開始

### Phase 12: セキュリティ・コード品質向上 ✅完了
- [x] ESLintセキュリティプラグイン導入（eslint-plugin-security）
- [x] セキュリティルール設定（オブジェクトインジェクション、危険な正規表現検出等）
- [x] セキュリティチェック専用スクリプト追加（`npm run security-check`）
- [x] Object injection脆弱性の修正（Map構造への変更）
- [x] 危険なオブジェクトアクセスパターンの安全化
- [x] 総合的なコード品質チェック体制の確立

### Phase 13: 注文作成フォーム改善・ローカル開発環境完成 ✅完了
- [x] OrderFormでのShipper/Consignee/Product選択機能実装（Autocomplete・Select）
- [x] React Queryを使用した全エンティティAPIからのデータ取得
- [x] 注文明細管理機能（複数送付先対応、動的追加・削除）
- [x] 荷主選択時の送付履歴表示・ワンクリック明細追加
- [x] 各明細レベルでの詳細バリデーション・エラーハンドリング
- [x] 複数注文の並行作成処理（Promise.all）
- [x] ローカルAPIサーバー（worker-local.js）全エンティティルート実装
- [x] MUI DataGridのユニークID問題修正（getRowId）
- [x] APIレスポンス構造の修正（Address.Name → Name）
- [x] 商品データを果物に変更（りんご・桃の5kg・10kg、初期データファイル更新）
- [x] フロントエンド-APIクライアント連携の完全実装

### Phase 14: 郵便番号検索統合・UI改善 ✅完了
- [x] AddressFormに郵便番号検索API統合済み確認
- [x] postalCodeApi.tsのAPIレスポンス構造修正（本番環境対応）
- [x] ローカル環境APIレスポンス構造を本番環境と統一
- [x] ShipperForm・ConsigneeFormでの郵便番号検索動作確認
- [x] モックデータ・非モック両対応の確認（フォールバック機能）
- [x] MUI DataGrid OrderID問題修正（ローカル・本番環境統一）
- [x] 7桁自動検索・手動検索ボタン・エラーハンドリング完備
- [x] 住所自動入力機能（都道府県・市区町村・住所1）完全動作

### Phase 15: 荷主・送付先編集機能実装 ✅完了
- [x] 個別取得API実装（GET /api/shippers/:id, GET /api/consignees/:id）
- [x] 更新API実装（PUT /api/shippers/:id, PUT /api/consignees/:id）
- [x] CloudFlare Pages Functions動的ルーティング対応（[id].ts）
- [x] ShipperForm編集モード対応（既存データ読み込み・PUT API連携）
- [x] ConsigneeForm編集モード対応（既存データ読み込み・PUT API連携）
- [x] React Query使用によるデータ取得・キャッシュ管理
- [x] ローディング状態・エラーハンドリング実装
- [x] ローカル開発サーバー（worker-local.js）動的ルート追加
- [x] データベースカラム名統一（DeliveryInstruction → DeliveryInstructions）
- [x] 編集後のキャッシュ無効化・リアルタイム更新
- [x] Address + Shipper/Consigneeテーブル両方の更新処理
- [x] 編集機能の包括的テスト実行・動作確認

### Phase 16: Order モデルリファクタリング・正規化実装 ✅完了（2025年8月13日）
- [x] データベーススキーマ設計変更（Order+OrderDetail分離）
- [x] 既存Order単体テーブル → Order（ヘッダー）+ OrderDetail（明細）正規化構造
- [x] TypeScript型定義完全更新（Order、OrderDetail、OrderDetailForm インターフェース）
- [x] CloudFlare Pages Functions API完全再構築
  - [x] GET /api/orders - Order+OrderDetail JOIN クエリ実装
  - [x] POST /api/orders - トランザクション処理（Order作成 + 複数OrderDetail並行挿入）
  - [x] PUT /api/orders/:id - 基本情報更新（OrderDate, TrackingNumber）
  - [x] 集約値自動計算（OrderTotal, ItemCount）
- [x] フロントエンド OrderList コンポーネント更新
  - [x] 集約情報表示（OrderTotal, ItemCount, 送付先数）
  - [x] 検索機能拡張（OrderDetail内のConsigneeName、ProductName対応）
  - [x] MUI DataGrid `getRowId={(row) => row.OrderId}` 設定済み
- [x] ローカル開発環境（worker-local.js）完全対応
  - [x] Order+OrderDetail構造の全API実装
  - [x] JOIN クエリ・トランザクション処理・集約計算
- [x] 包括的テスト・動作確認
  - [x] ローカル環境：新規Order作成・編集・表示の全機能テスト完了
  - [x] 本番環境：データベーススキーマ移行・データ復旧完了
  - [x] 既存3件のOrder → 新Order+OrderDetail構造へ無損失移行
- [x] 本番環境データベース移行作業（2025年8月13日実施）
  - [x] 既存Order テーブル → Order_backup へリネーム
  - [x] 新Order テーブル作成（正規化スキーマ）
  - [x] 既存データ → 新Order+OrderDetail構造へ移行
  - [x] OrderDetail外部キー制約修正（Order_backup → Order参照エラー解決）
  - [x] 5件のOrderDetail レコード作成・データ整合性確保
  - [x] パフォーマンスインデックス作成・トリガー設定
- [x] MUI DataGrid エラー解決
  - [x] OrderDetail データ欠損問題の特定・解決
  - [x] production API で全Order に OrderDetails が正常表示
  - [x] https://highlandirectweb.pages.dev/orders 正常動作確認

## 現在の状態（2025年8月13日時点）

### 🚀 本番稼働中
- **Live URL**: https://highlandirectweb.pages.dev/
- **自動デプロイ**: GitHubプッシュで自動更新

### ✅ 完全実装済み機能
1. **CloudFlare D1データベース**: 本番運用中
   - データベース: `highlandirect-db` 
   - スキーマ: 8テーブル（Address, Shipper, Consignee, ProductMaster, Store, Order, OrderDetail, ReportMemo）
   - 正規化構造: Order（ヘッダー）+ OrderDetail（明細）分離済み
   - 初期データ: 5件の注文（Order）+ 対応OrderDetail + 関連データ

2. **フルスタックAPI**: CloudFlare Pages Functions（TypeScript完全移行済み）
   - `/api/health` - ヘルスチェック
   - `/api/orders` - 注文管理（GET/POST、Order+OrderDetail構造、集約計算、ページネーション、フィルタリング）
   - `/api/orders/:id` - 個別注文操作（GET/PUT、OrderDetail込み取得・基本情報更新）
   - `/api/shippers` - 荷主管理（GET/POST、Address JOIN、検索機能）
   - `/api/shippers/:id` - 荷主個別操作（GET/PUT、編集機能対応）
   - `/api/consignees` - 送付先管理（GET/POST、Address JOIN、検索機能）
   - `/api/consignees/:id` - 送付先個別操作（GET/PUT、編集機能対応）
   - `/api/products` - 商品管理（GET/POST、カテゴリフィルタ、アクティブフィルタ）
   - `/api/stores` - 集配所管理（GET/POST、運送業者フィルタ、サービスエリア検索）
   - `/api/postal/search/[zipcode]` - 郵便番号検索（日本郵便API、フォールバック対応）
   - CORS対応、エラーハンドリング完備、型安全保証

3. **React フロントエンド**: 
   - **注文管理**: Order+OrderDetail 正規化構造対応完了（リアルタイムCRUD、高度な注文作成フォーム）
   - **注文一覧（OrderList）**: 集約情報表示（OrderTotal, ItemCount, 送付先数）、OrderDetail横断検索
   - **注文作成フォーム**: Shipper/Consignee/Product選択、複数明細対応、荷主履歴連携
   - **注文編集**: 個別Order取得・基本情報更新（OrderDate, TrackingNumber）
   - **荷主管理**: API連携完了（検索・ページネーション・リアルタイム更新・編集機能）
   - **送付先管理**: API連携完了（検索・ページネーション・リアルタイム更新・編集機能）
   - **商品管理**: API連携完了（果物商品対応、検索・ページネーション・リアルタイム更新）
   - **集配所管理**: API連携完了（検索・ページネーション・リアルタイム更新）
   - **ふりがな自動生成**: 氏名・会社名入力時の即座変換（wanakana + 辞書システム）
   - **郵便番号検索統合**: AddressFormに完全統合（7桁自動検索・手動検索ボタン・エラーハンドリング・住所自動入力）
   - **編集機能**: 荷主・送付先の既存データ編集（フォーム自動読み込み・更新・エラーハンドリング）
   - **ダッシュボード**: 統計表示
   - **レスポンシブUI**: 全デバイス対応

4. **開発・デプロイ環境**:
   - **本番環境**: CloudFlare Pages + D1 (自動デプロイ、GitHub Actions CI/CD)
   - **ローカル開発環境**: フルスタック対応（フロントエンド + API + SQLite）
   - **コード品質管理**: TypeScript strict mode、ESLint（セキュリティプラグイン含む）、自動型チェック

### 📊 実際のデータベースデータ（Order+OrderDetail構造）
- **Order #1**: 東京商事株式会社（2024-01-15、総額¥930、1点）
  - OrderDetail: 山田太郎 → 宅急便60サイズ × 1点（¥930）
- **Order #2**: 大阪工業株式会社（2024-01-16、総額¥3,300、2点）  
  - OrderDetail: 大阪工業株式会社 → クール宅急便 × 2点（¥3,300）
- **Order #3**: 名古屋商会（2024-01-17、総額¥1,500、1点）
  - OrderDetail: 山田太郎 → 宅急便100サイズ × 1点（¥1,500）
- **Order #4-5**: テスト注文（2024-01-20、各¥930、各1点）
  - OrderDetail: 山田太郎 → 宅急便60サイズ × 1点（各¥930）

### 🔄 API動作確認
```bash
# 注文一覧取得（実際のD1データ）
curl "https://highlandirectweb.pages.dev/api/orders?page=1&limit=10"

# 新規注文作成（Order+OrderDetail構造、D1データベースに永続化）
curl -X POST https://highlandirectweb.pages.dev/api/orders \
  -H "Content-Type: application/json" \
  -d '{"OrderDate":"2024-01-20","ShipperId":1,"StoreId":1,"OrderDetails":[{"ConsigneeId":1,"ProductId":1,"Quantity":1,"UnitPrice":930}]}'

# 荷主個別取得・更新（編集機能）
curl "https://highlandirectweb.pages.dev/api/shippers/1"  # 個別取得
curl -X PUT "https://highlandirectweb.pages.dev/api/shippers/1" \
  -H "Content-Type: application/json" \
  -d '{"Name":"更新された荷主名","CreditLimit":1500000}'  # 更新

# 送付先個別取得・更新（編集機能）
curl "https://highlandirectweb.pages.dev/api/consignees/1"  # 個別取得
curl -X PUT "https://highlandirectweb.pages.dev/api/consignees/1" \
  -H "Content-Type: application/json" \
  -d '{"Name":"更新された送付先名","DeliveryInstructions":"新しい配送指示"}'  # 更新

# 郵便番号検索（日本郵便API連携）
curl "https://highlandirectweb.pages.dev/api/postal/search/1000005"  # 東京都千代田区丸の内
curl "https://highlandirectweb.pages.dev/api/postal/search/3812204"  # 長野県長野市真島町真島
```

### 🔜 次期実装予定
1. **ヤマトB2 API**: 印刷機能（配送ラベル印刷）
2. **ユーザー認証**: 権限管理システム
3. **請求書作成・PDF出力機能**: 注文データから請求書を自動生成

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
- `functions/types.ts` - CloudFlare D1 and Pages Functions type definitions
- `functions/api/orders.ts` - Orders API with D1 database integration
- `functions/api/health.ts` - Health check endpoint
- `functions/api/shippers.ts` - Shippers API with Address JOIN
- `functions/api/shippers/[id].ts` - Individual shipper operations (GET/PUT for editing)
- `functions/api/consignees.ts` - Consignees API with Address JOIN
- `functions/api/consignees/[id].ts` - Individual consignee operations (GET/PUT for editing)
- `functions/api/products.ts` - Products API with filtering
- `functions/api/stores.ts` - Stores API with carrier filtering
- `functions/api/postal/search/[zipcode].ts` - Japan Post API integration for postal code lookup
- `src/pages/Orders/OrderList.tsx` - Orders page with API integration
- `src/pages/Shippers/ShipperForm.tsx` - Shipper creation/editing form with edit mode support
- `src/pages/Consignees/ConsigneeForm.tsx` - Consignee creation/editing form with edit mode support
- `src/components/AddressForm.tsx` - Address form with furigana auto-generation and postal code search integration
- `src/utils/furigana.ts` - Furigana generation utility (wanakana + dictionary)
- `src/utils/postalCodeApi.ts` - Postal code search utility with Japan Post API integration
- `src/api/client.ts` - Frontend API client
- `src/types/index.ts` - Complete TypeScript definitions
- `worker-local.js` - Local development server with all API routes including dynamic routing
- `migration/schema.sql` - D1 database schema
- `migration/seed.sql` - Initial data
- `migration/performance_indexes.sql` - Database performance optimization

### Production Environment
- **Live URL**: https://highlandirectweb.pages.dev/
- **Database**: CloudFlare D1 `highlandirect-db` (remote)
- **API Endpoints**: `/api/health`, `/api/orders`, `/api/shippers`, `/api/shippers/:id`, `/api/consignees`, `/api/consignees/:id`, `/api/products`, `/api/stores`, `/api/postal/search/[zipcode]`
- **Auto-deploy**: GitHub push → CloudFlare Pages
- Path alias `@/` configured to point to `src/`

## Development Roadmap

### 🚧 高優先度（Next Sprint）
- [x] **TypeScript完全移行**: CloudFlare Pages Functions JavaScript → TypeScript
- [x] **全エンティティAPI実装**: Shippers, Consignees, Products, Stores のPages Functions実装完了
- [x] **データベース最適化**: インデックス調整、クエリパフォーマンス改善完了
- [x] **日本郵便API統合**: 郵便番号検索機能の完全実装（OAuth認証、フォールバック機能）
- [x] **フロントエンド-API連携**: 全マスタ管理画面のAPI連携完了（React Query、検索、ページネーション）
- [x] **新規作成フォーム**: 全エンティティのPOST API連携完了（荷主・送付先・注文作成）
- [x] **ローカル開発環境構築**: フルスタック開発環境（SQLite連携）完了
- [x] **注文作成フォーム改善**: 実際のShipper/Consignee/Product選択機能（ドロップダウン連携）完了
- [x] **住所入力フォーム統合**: 郵便番号検索をフロントエンドに統合（7桁自動検索、手動検索ボタン、エラーハンドリング、住所自動入力完了）
- [x] **荷主・送付先編集機能実装**: 個別取得・更新API、編集フォーム対応、キャッシュ管理完了
- [x] **注文編集機能実装**: 個別注文取得・更新API、編集画面の空表示問題解決完了
- [x] **Orderモデルのリファクタリング**: OrderモデルをOrderとOrderDetailに分離完了（100%完了）
  - [x] データベーススキーマ再設計（Order+OrderDetailテーブル、OrderHistory削除）
  - [x] 正規化されたサンプルデータ作成・投入
  - [x] TypeScript型定義更新（Order、OrderDetail、OrderDetailForm）
  - [x] CloudFlare Pages Functions API再構築（ネスト構造、トランザクション処理）
  - [x] OrderForm.tsx基本修正（型定義、編集モード対応）
  - [x] ローカルワーカーAPI完全更新（worker-local.js Order部分）
  - [x] OrderList表示調整（集約情報表示、新API構造対応）
  - [x] 包括的動作テスト（新規作成・編集・表示の全機能）
  - [x] 本番環境デプロイ・動作確認（2025年8月13日完了）
  - [x] MUI DataGridエラー解決（OrderDetail外部キー制約修正、production データ復旧）
- [ ] 従前WPFシステムからの移行処理作成

### 🎯 中優先度（Future Features）
- [ ] **ユーザー認証システム**: JWT認証 + ロール管理
- [ ] **配送ラベル印刷**: ヤマトB2 API連携による配送ラベル出力

### 🌟 低優先度（Long-term Goals）
- [ ] **請求書作成・PDF出力機能**: 注文データから請求書を自動生成
- [ ] **リアルタイム通知**: WebSocket/Server-Sent Events
- [ ] **配送状況追跡**: リアルタイム配送トラッキング
- [ ] **テスト環境**: Jest/Vitest + E2Eテスト

## 環境変数設定

### CloudFlare Pages 環境変数
以下の環境変数をCloudFlare Pagesプロジェクト設定で設定する必要があります：

#### 日本郵便API（郵便番号検索）
```
JAPANPOST_API_HOST=api.da.pf.japanpost.jp
JAPANPOST_CLIENT_ID=[日本郵便から提供されたクライアントID]
JAPANPOST_CLIENT_SECRET=[日本郵便から提供されたクライアントシークレット]
JAPANPOST_CLIENT_IP=[許可されたIPアドレス]
```

**注意**: フロントエンド用の `VITE_` プレフィックスは不要です。CloudFlare Pages Functionsでは直接環境変数名を使用します。

### 環境変数更新後のデプロイ
環境変数を変更した場合、以下のコマンドで強制デプロイできます：
```bash
git commit --allow-empty -m "Trigger deployment for environment variable update"
git push origin main
```

## テスト環境

現在はテストフレームワークが設定されていません。テストを追加する際は、ユーザーに希望するテスト設定（Jest、Vitest等）を確認してください。