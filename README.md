# Signy v2 — 月500円で電子署名し放題

GMOサインの完全上位互換を月550円（税込）で提供する電子署名サービス。

## GMOサイン vs Signy

| 機能 | Signy PRO (550円) | GMOサイン (9,680円) |
|------|-------------------|---------------------|
| 署名回数 | 無制限 | 無制限 |
| 送信料/件 | 0円 | 110円 |
| 署名欄の位置指定 | 5種類 | OK |
| 電子印鑑（ハンコ） | OK | OK |
| テンプレート | OK | OK |
| 署名ワークフロー | OK | OK |
| 自動リマインダー | OK | OK |
| CSV一括送信 | OK | OK |
| PDFズーム | OK | -- |
| ダッシュボード検索 | OK | OK |
| 署名依頼キャンセル | OK | OK |
| もう一度送る（複製） | OK | -- |
| プライバシー | **クライアント処理** | サーバー処理 |

## アーキテクチャ

```
Cloudflare Pages (Static) + Worker (API)
├── _worker.js        全APIエンドポイント (547行, 40関数)
├── index.html        LP + ダッシュボード (検索/フィルター/アクション)
├── send.html         署名依頼 (5種フィールド/テンプレート/一括送信/複製)
├── sign.html         署名者ビュー (印鑑生成/ズーム/モバイル対応)
├── pricing.html      Free + Pro 料金
├── login.html        Magic link ログイン
├── complete.html     署名完了
├── js/app.js         共通モジュール (i18n 100キー日英, auth, icons)
├── css/style.css     スタイルシート (JetBrains Mono + DM Sans)
└── scheduled()       自動リマインダー (Cron: 毎朝9時JST)
```

## APIエンドポイント

### 認証
| Method | Path | 説明 |
|--------|------|------|
| POST | /api/auth/magic-link | メール送信 (5回/15分) |
| POST | /api/auth/verify | トークン検証 (10回/15分) |
| POST | /api/auth/refresh | JWT更新（プラン変更即反映） |

### ドキュメント
| Method | Path | 説明 |
|--------|------|------|
| GET | /api/documents | 一覧取得 (検索/フィルター用データ含む) |
| POST | /api/documents/upload | 新規作成 |
| POST | /api/documents/send | 署名依頼メール送信 |
| POST | /api/documents/bulk-send | CSV一括送信 (PRO) |
| GET | /api/documents/:id | 署名者向け情報取得 |
| POST | /api/documents/:id/sign | 署名実行 |
| GET | /api/documents/:id/status | ステータス確認 |
| GET | /api/documents/:id/pdf | PDF取得（署名者用） |
| GET | /api/documents/:id/download | 署名済みPDF（署名トークン） |
| POST | /api/documents/:id/remind | 手動リマインダー (1回/時) |
| POST | /api/documents/:id/cancel | 署名依頼キャンセル + 通知 |
| GET | /api/documents/:id/owner-download | オーナーPDFダウンロード（JWT） |
| POST | /api/documents/:id/duplicate | 複製用データ取得 |

### テンプレート
| Method | Path | 説明 |
|--------|------|------|
| GET | /api/templates | 一覧 |
| POST | /api/templates | 作成 (PRO) |
| GET | /api/templates/:id | 取得 |
| DELETE | /api/templates/:id | 削除 |

### Stripe
| Method | Path | 説明 |
|--------|------|------|
| POST | /api/stripe/checkout | Checkout Session作成 |
| POST | /api/stripe/portal | Customer Portal |
| POST | /api/stripe/webhook | Webhook受信 |

## プラン

| | FREE | PRO |
|---|---|---|
| 月額 | 0円 | 550円（税込） |
| 署名回数 | 月5件 | 無制限 |
| PDF上限 | 10MB | 50MB |
| テンプレート | -- | OK |
| 一括送信 | -- | OK |
| 保管期間 | 14日 | 無期限 |

## セットアップ

### 1. Cloudflare Pages
```bash
git push origin main
# Cloudflare Dashboard → Pages → Create → Connect GitHub
# Build command: (empty)
# Build output: (empty, root deploy)
# Custom domain: signy.mamonis.studio
```

### 2. Bindings
| Type | Name | 作成コマンド |
|------|------|-------------|
| KV Namespace | SIGNY_KV | `wrangler kv:namespace create SIGNY_KV` |
| R2 Bucket | SIGNY_DOCUMENTS | `wrangler r2 bucket create signy-documents` |

### 3. 環境変数
| 変数 | 値 |
|------|-----|
| JWT_SECRET | ランダム文字列 (32文字以上) |
| RESEND_API_KEY | re_... |
| APP_URL | https://signy.mamonis.studio |
| STRIPE_SECRET_KEY | sk_... |
| STRIPE_WEBHOOK_SECRET | whsec_... |
| STRIPE_PRICE_PRO | price_... (月額550円) |

### 4. Stripe設定
1. Product作成 → Recurring Monthly ¥550
2. Price ID → 環境変数 STRIPE_PRICE_PRO
3. Webhook URL: `https://signy.mamonis.studio/api/stripe/webhook`
4. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 5. Cron Trigger
```
0 0 * * *  (UTC 0:00 = JST 9:00)
```
自動リマインダー: 3日後 + 7日後に未署名者へメール送信

## セキュリティ (14回監査 / 56件修正)

- JWT: magic tokenをBearer tokenとして使用不可
- CORS: 自ドメインのみ + Max-Age 86400
- Rate Limit: magic link 5回/15分, verify 10回/15分, remind 1回/時
- XSS: 全innerHTML/toast にesc()適用
- Input: signFieldsホワイトリスト(50上限), title 200文字, message 2000文字, CSV 1MB
- PDF: マジックバイト検証, 署名PDF 50MB上限
- Headers: X-Content-Type-Options: nosniff 全レスポンス
- Stripe: webhook署名検証, metadata optional chaining
- Error: 500で内部情報非漏洩
- Base64: UTF-8セーフ (b64e/b64d)
- 月次カウンター: JST (UTC+9)

## 技術スタック

- Cloudflare Pages / Workers / KV / R2
- pdf-lib (クライアントサイドPDF署名)
- pdf.js (PDFレンダリング)
- Stripe (決済)
- Resend (メール)
- JetBrains Mono + DM Sans (フォント)
- Noto Serif JP + Dancing Script (署名用)
