# Signy — 電子サインサービス

## ファイル構成

```
signy/
├── _worker.js      ← Cloudflare Worker（API全部入り）
├── index.html      ← ランディング / ダッシュボード
├── send.html       ← 送信フロー（PDF → 署名欄配置 → 送信）
├── sign.html       ← 署名者フロー（手書き / テキスト）
├── complete.html   ← 署名完了
├── pricing.html    ← 料金プラン
├── login.html      ← Magic Link認証
├── css/style.css   ← 全ページ共通スタイル
└── js/app.js       ← 共通モジュール（i18n・認証・API・SVGアイコン）
```

## デプロイ手順

### 1. Cloudflare Pages プロジェクト作成

```bash
# 初回のみ
wrangler pages project create signy
```

### 2. KV + R2 作成

```bash
wrangler kv namespace create SIGNY_KV
wrangler r2 bucket create signy-documents
```

### 3. デプロイ

```bash
wrangler pages deploy ./signy --project-name=signy
```

### 4. Bindings 設定（Cloudflare Dashboard）

**Pages → signy → Settings → Bindings**

| 種類 | 変数名 | 紐付け先 |
|---|---|---|
| KV Namespace | `SIGNY_KV` | 手順2で作ったKV |
| R2 Bucket | `DOCUMENTS` | `signy-documents` |

### 5. 環境変数（Dashboard → Settings → Environment Variables）

| 変数名 | 値 |
|---|---|
| `JWT_SECRET` | ランダム文字列（32文字以上） |
| `RESEND_API_KEY` | Resend APIキー |
| `APP_URL` | 本番URL（例: `https://signy.jp`） |
| `STRIPE_SECRET_KEY` | Stripe Secret Key（`sk_live_...`） |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Signing Secret（`whsec_...`） |
| `STRIPE_PRICE_BASIC_MONTHLY` | BASICの月額Price ID（`price_...`） |
| `STRIPE_PRICE_BASIC_YEARLY` | BASICの年額Price ID |
| `STRIPE_PRICE_PRO_MONTHLY` | PROの月額Price ID |
| `STRIPE_PRICE_PRO_YEARLY` | PROの年額Price ID |

### 6. Stripe設定

1. **Stripe Dashboard → Products** で2商品作成（BASIC / PRO）
2. 各商品に月額・年額の2価格を設定
3. Price IDを環境変数にセット
4. **Stripe Dashboard → Developers → Webhooks** でエンドポイント追加:
   - URL: `https://signy.jp/api/stripe/webhook`
   - イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Webhook Signing Secretを環境変数にセット
6. **Stripe Dashboard → Settings → Customer Portal** でポータルを有効化

### 7. 再デプロイ（Bindings/ENV反映）

```bash
wrangler pages deploy ./signy --project-name=signy
```

以上。これで動く。

## 技術構成

- Vanilla JS / HTML / CSS（フレームワーク不使用）
- pdf.js（PDF表示・CDN）
- Canvas API（手書き署名）
- Cloudflare Pages Advanced Mode（`_worker.js`）
- Cloudflare KV（メタデータ・認証・使用量）
- Cloudflare R2（PDF保存・エグレス無料）
- Resend（メール送信）
- Magic Link認証（HMAC-SHA256署名JWT）

## KVキー構造

| パターン | 内容 |
|---|---|
| `email:{email}` | → userId |
| `user:{userId}` | ユーザー情報 |
| `doc:{docId}` | ドキュメントメタデータ |
| `user-docs:{userId}` | ドキュメントID一覧 |
| `usage:{userId}:{YYYY-MM}` | 月間使用量 |
| `log:{docId}` | アクセスログ |
| `sig:{docId}` | 署名データ |
| `audit:{docId}` | 監査証跡 |
| `magic:{token}` | Magic Link（TTL 15分） |

## 未実装（v2以降）

- 署名画像のPDF埋め込み（pdf-lib Worker版）
- 証跡PDF最終ページ自動付加
- リマインダーメール（Cron Trigger）
- 複数署名者
- テンプレート保存

## APIエンドポイント一覧

| Method | Path | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/auth/magic-link` | - | Magic Link送信 |
| POST | `/api/auth/verify` | - | トークン検証 → セッション発行 |
| GET | `/api/documents` | Bearer | ドキュメント一覧 |
| POST | `/api/documents/upload` | Bearer | PDF→R2, メタ→KV |
| POST | `/api/documents/send` | Bearer | 署名依頼メール送信 |
| GET | `/api/documents/:id` | token | ドキュメント情報（署名者用） |
| POST | `/api/documents/:id/sign` | token | 署名処理 |
| GET | `/api/documents/:id/pdf` | token | PDF配信 |
| GET | `/api/documents/:id/download` | token | 署名済みPDFダウンロード |
| GET | `/api/documents/:id/status` | - | ステータス確認 |
| POST | `/api/stripe/checkout` | Bearer | Checkoutセッション作成 |
| POST | `/api/stripe/portal` | Bearer | カスタマーポータルURL |
| POST | `/api/stripe/webhook` | Stripe署名 | Webhook受信 |
