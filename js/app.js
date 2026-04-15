/* Signy — Common Module */

const Signy = (() => {
  const CONFIG = {
    API: '/api',
    FREE_DOCS: 5, PRO_DOCS: 1e8,
    FREE_SIZE: 10 * 1024 * 1024,
    PRO_SIZE: 50 * 1024 * 1024,
  };

  /* ─── i18n ─── */
  const T = {
    ja: {
      'meta.title.index':'Signy — 月500円で電子署名し放題',
      'meta.title.send':'Signy - 署名依頼を送信',
      'meta.title.sign':'Signy - 署名のお願い',
      'meta.title.pricing':'Signy - 料金プラン',
      'meta.title.login':'Signy — ログイン',
      'meta.title.complete':'Signy — 署名完了',
      'meta.desc.index':'月額500円で署名無制限。署名欄の位置指定、電子印鑑、テンプレート、ワークフロー、自動リマインダー。PDFはサーバーに渡しません。',
      'meta.desc.send':'Signy - 署名依頼を送信。PDF上に署名欄を配置して、メールで送信。',
      'meta.desc.sign':'Signy - 電子署名。ブラウザ内で完結する安全な署名。',
      'nav.dashboard':'ダッシュボード','nav.send':'新規送信','nav.pricing':'料金プラン',
      'nav.login':'ログイン','nav.logout':'ログアウト',
      'hero.title':'電子署名、<span>月500円で無制限</span>。',
      'hero.sub':'印鑑・署名順序・テンプレート・一括送信・自動リマインダー。大手サービスの1/20の価格で全機能。PDFはサーバーに渡しません。',
      'hero.cta':'無料ではじめる','hero.cta2':'料金プランを見る',
      'feat.title':'なぜSigny?',
      'feat.priv':'プライバシー重視','feat.priv.d':'署名処理は全てブラウザ内で完結。PDFがサーバーに渡らないから、あなたの契約書を僕らは見れません。',
      'feat.easy':'3ステップで完結','feat.easy.d':'PDF送信 → 5種類のフィールド配置 → メール送信。相手はリンクをクリックするだけ。アカウント登録不要。',
      'feat.legal':'法的に有効','feat.legal.d':'電子署名法第2条準拠。署名の証跡（IP・タイムスタンプ・UA）を自動記録。証跡PDF付き。',
      'feat.cheap':'業界最安・無制限','feat.cheap.d':'月額550円（税込）で署名無制限。大手サービスの1/20の価格。送信料0円。',
      'dash.title':'ドキュメント','dash.new':'新規送信',
      'dash.empty':'まだドキュメントがありません','dash.empty.d':'最初の署名依頼を送ってみましょう。','dash.empty.cta':'PDFをアップロード',
      'dash.usage':'今月の使用量',
      'st.pending':'署名待ち','st.signed':'署名済み','st.expired':'期限切れ','st.cancelled':'取り消し',
      'dash.search.ph':'タイトルで検索...','dash.filter.all':'すべて','dash.filter.pending':'署名待ち','dash.filter.signed':'署名済み',
      'dash.no.match':'条件に一致するドキュメントがありません','dash.no.docs':'ドキュメントがありません',
      'dash.dl':'ダウンロード','dash.cancel':'取り消し','dash.cancel.confirm':'この署名依頼を取り消しますか？署名者にメールで通知されます。','dash.dup':'もう一度送る',
      'sign.cancelled':'この署名依頼は取り消されました。',
      'sign.zoom.in':'拡大','sign.zoom.out':'縮小',
      'send.title':'署名依頼を送信',
      'send.s1':'アップロード','send.s2':'署名欄配置','send.s3':'送信',
      'send.up':'PDFファイルをドラッグ&ドロップ、またはクリックして選択',
      'send.up.h':'PDF形式 / FREEプラン: 10MBまで・月5件 / PROプラン: 50MBまで・無制限',
      'send.add':'署名欄を追加','send.page':'ページ','send.field':'署名欄',
      'send.det':'署名者情報','send.email':'署名者のメールアドレス','send.email.ph':'signer@example.com',
      'send.doc':'ドキュメント名','send.doc.ph':'業務委託契約書',
      'send.msg':'メッセージ（任意）','send.msg.ph':'署名をお願いいたします。',
      'send.submit':'署名依頼を送信','send.sending':'送信中...','send.loading':'読み込み中...',
      'send.back':'戻る','send.next':'次へ',
      'send.guide.fields':'下のボタンをクリックして署名欄を追加し、PDF上でドラッグして位置を調整してください。右下のハンドルでサイズ変更できます。',
      'send.guide.signer':'「署名者」= 相手が入力する欄 / 「自分」= 送信前に自分が入力する欄',
      'send.guide.order':'追加した順番に署名依頼が送られます。2人目以降は前の人の署名完了後に通知されます。',
      'send.guide.after':'送信すると署名者にメールが届きます。署名状況はダッシュボードで確認できます。',
      'sign.guide.fields':'入力項目',
      'sign.guide.how':'署名/印鑑: PDF上の枠をクリック → パッドで入力。テキスト/日付: 直接入力。',
      'sign.guide.done':'完了',
      'sign.wait.title':'前の署名者の完了を待っています',
      'sign.err.title':'読み込みに失敗しました',
      'sign.err.desc':'ネットワーク接続を確認して、ページを再読込してください。',
      'sign.title':'署名のお願い',
      'sign.info':'PDF上の色付き枠をクリックして、各項目を入力してください。全項目の入力と同意チェックで署名ボタンが有効になります。',
      'sign.from':'送信者','sign.document':'ドキュメント',
      'sign.draw':'手書き','sign.type':'テキスト入力','sign.clear':'クリア',
      'sign.type.ph':'氏名を入力',
      'sign.agree':'上記の内容を確認し、電子署名に同意します。',
      'sign.submit':'署名を完了する','sign.submitting':'処理中...',
      'sign.expired':'この署名リンクは期限切れです。',
      'sign.done':'このドキュメントは署名済みです。',
      'sign.stamp':'電子印鑑','sign.signature':'署名','sign.apply':'適用',
      'sign.stamp.name':'氏名を入力','sign.stamp.circle':'丸印','sign.stamp.square':'角印',
      'sign.click.sig':'署名をクリック','sign.click.stamp':'印鑑をクリック',
      'sign.date.auto':'署名日が自動入力されます','sign.input.ph':'入力',
      'complete.title':'署名が完了しました',
      'complete.desc':'署名済みPDFが送信者と署名者の両方にメールで送付されます。',
      'complete.dl':'署名済みPDFをダウンロード','complete.back':'ダッシュボードに戻る',
      'price.title':'料金プラン','price.sub':'送信料0円。文書保管料0円。縛り期間なし。',
      'price.free.name':'FREE','price.pro.name':'PRO','price.pro.badge':'おすすめ',
      'price.free.price':'0','price.pro.price':'500','price.mo':'/月','price.pro.tax':'（税込550円）',
      'price.free.desc':'まずは試してみたい方に','price.pro.desc':'フリーランス・中小企業に最適',
      'price.free.f1':'月5件まで','price.free.f2':'署名欄の位置指定','price.free.f3':'手書き/テキスト/印鑑','price.free.f4':'監査ログ',
      'price.free.f5':'PDF直接ダウンロード','price.free.f6':'14日間保管',
      'price.pro.f1':'署名回数 無制限','price.pro.f2':'ワークフロー/リマインダー','price.pro.f3':'テンプレート/一括送信','price.pro.f4':'無期限ダウンロード',
      'price.pro.f5':'手書き/テキスト/電子印鑑','price.pro.f6':'署名欄5種類','price.pro.f7':'監査ログ+証跡',
      'price.cta.free':'無料ではじめる','price.cta.pro':'月500円ではじめる','price.current':'現在のプラン',
      'price.manage':'プランを管理','price.note':'いつでもプラン変更・解約可能。縛り期間なし。',
      'auth.title':'ログイン','auth.email':'メールアドレス','auth.email.ph':'you@example.com',
      'auth.submit':'ログインリンクを送信','auth.sent':'メールを送信しました。メール内のリンクをクリックするとログインできます（15分間有効）。',
      'auth.checking':'認証中...','auth.failed':'認証に失敗しました',
      'err':'エラーが発生しました','ok':'成功',
      'toast.dup.loaded':'前回と同じ設定を読み込みました。PDFをアップロードしてください。',
      'toast.dup.fields':'前回のフィールド配置を復元しました',
      'toast.pdf.type':'PDFファイルを選択してください','toast.pdf.size':'以下のファイルを選択してください',
      'toast.pdf.err':'PDF読み込みエラー',
      'toast.pdf.rotated':'⚠️ このPDFは回転されています。署名位置がずれる可能性があります。元の向きで保存し直したPDFをアップロードしてください。',
      'toast.draft.restored':'前回の作業を復元しました',
      'toast.draft.cleared':'下書きをクリアしました',
      'toast.field.deleted':'フィールドを削除しました',
      'toast.field.duplicated':'フィールドを複製しました',
      'toast.undo.empty':'これ以上戻れません',
      'toast.undo.ok':'操作を取り消しました',
      'toast.tmpl.deleted':'テンプレートを削除しました',
      'toast.tmpl.delete.confirm':'このテンプレートを削除しますか？',
      'beforeunload.warn':'保存されていない変更があります。本当にページを離れますか？',
      'draft.restore.q':'前回の作業が残っています（{n}項目）。続きから再開しますか？',
      'draft.restore.yes':'続きから','draft.restore.no':'最初から','draft.ago.min':'{n}分前','draft.ago.hr':'{n}時間前','draft.ago.now':'たった今',
      'draft.signers':'署名者{n}名','draft.fields':'フィールド{n}個',
      'send.preview':'送信前プレビュー','send.preview.btn':'プレビュー','send.preview.close':'閉じる',
      'send.preview.signer':'からはこう見えます',
      'send.signer.move.up':'上へ','send.signer.move.down':'下へ',
      'send.field.duplicate':'複製 (Cmd+D)','send.field.delete':'削除 (Del)',
      'send.shortcut.title':'ショートカット','send.shortcut.del':'Delete: 選択中のフィールドを削除','send.shortcut.dup':'Cmd+D: 選択中のフィールドを複製','send.shortcut.undo':'Cmd+Z: 直前の操作を取り消し','send.shortcut.esc':'Esc: 選択解除',
      'mail.subject.custom':'メール件名（任意）','mail.subject.ph':'【署名のお願い】契約書のご確認をお願いします',
      'mail.subject.label':'件名',
      'toast.field.min':'フィールドを1つ以上配置してください',
      'toast.tmpl.applied':'テンプレートを適用しました','toast.tmpl.saved':'テンプレートを保存しました',
      'toast.tmpl.err':'テンプレート読み込みエラー','toast.save.err':'保存エラー',
      'toast.tmpl.need':'フィールドを配置してからテンプレートを保存してください',
      'toast.email.invalid':'有効なメールアドレスを入力してください','toast.email.dup':'既に追加されています',
      'toast.title.req':'ドキュメント名を入力してください','toast.signer.req':'署名者を1名以上追加してください','toast.signer.nofield':'全員にフィールドを割り当ててください。不足している署名者:',
      'toast.sent':'署名依頼を送信しました','toast.bulk.sent':'件の署名依頼を一括送信しました',
      'toast.remind':'リマインダー送信','toast.cancelled':'署名依頼を取り消しました',
      'toast.pro.done':'PROプランへのアップグレード完了!',
      'trust.law':'電子署名法準拠','trust.local':'端末内処理','trust.noacc':'アカウント登録不要(署名者)',
      'compare.title':'他社との比較','compare.sub':'同じ機能を、競合の1/20の価格で。',
      'send.signer.self':'自分（送信者）','send.signer.other':'署名者（相手）',
      'send.field.sig':'署名','send.field.stamp':'印鑑','send.field.text':'テキスト','send.field.date':'日付','send.field.check':'確認',
      'send.tmpl.saved':'保存済みテンプレート:','send.tmpl.select':'テンプレートを選択...','send.tmpl.save':'テンプレートとして保存',
      'send.tmpl.prompt':'テンプレート名を入力:','send.tmpl.default':'マイテンプレート',
      'send.signers':'署名者','send.signers.multi':'(複数可)','send.signers.add':'追加',
      'send.signers.hint':'署名を依頼する相手のメールアドレスを追加してください。追加した順番に署名依頼が送信されます。',
      'send.guide.fieldfor':'この欄を入力する人を選んでください（色と番号で署名者ごとに区別されます）:',
      'send.field.self.short':'自',
      'send.bulk.title':'一括送信 (CSV)','send.bulk.desc':'CSVファイルで複数の宛先に一括送信。ヘッダーに「email」列が必要です。','send.bulk.btn':'一括送信',
      'send.page.jump':'{total}ページ中、何ページ目に移動しますか？','send.signers.up':'上へ移動','send.signers.down':'下へ移動','send.tmpl.delete':'削除',
      'compare.date':'2026年4月時点の公開情報 / 税込表示',
      'empty.s1':'PDFを','empty.s1b':'アップロード','empty.s2':'署名欄を','empty.s2b':'配置','empty.s3':'メールで','empty.s3b':'署名依頼',
      'sign.pad.draw':'署名を描いてください','sign.pad.name':'名前を入力してください',
      'footer':'Signy — mamonis.studio','footer.priv':'プライバシーポリシー','footer.terms':'利用規約','footer.law':'特定商取引法に基づく表記',
      'sign.loading':'読み込み中...','sign.wait.queue':'あなたの署名順: {queue}/{total}番目',
      'sign.zoom.in.title':'拡大','sign.zoom.out.title':'縮小',
      'send.fields.count':'{count}個のフィールド','send.field.self':'(自分)',
      'compare.feature':'機能','compare.compA':'A社','compare.compB':'B社','compare.compC':'C社',
      'compare.r.price':'月額料金','compare.r.count':'署名回数','compare.r.send':'送信料/件',
      'compare.r.position':'署名欄の位置指定','compare.r.stamp':'電子印鑑','compare.r.template':'テンプレート',
      'compare.r.workflow':'署名ワークフロー','compare.r.reminder':'自動リマインダー','compare.r.bulk':'一括送信',
      'compare.r.audit':'監査ログ','compare.r.privacy':'プライバシー',
      'compare.unlimited':'無制限','compare.local':'端末内処理','compare.server':'サーバー処理',
      'compare.paid':'有料','compare.na':'--','compare.ok':'OK',
      'compare.signy':'Signy PRO',
      'send.tmpl.fields':'{count}個のフィールド',
      'sign.page.short':'p.{page}',
      'sign.stamp.default':'印',
      'sign.field.filled':'[画像/署名]',
      'dash.dl.suffix':'_署名済み.pdf',
      'audit.title':'SIGNY - 電子署名証明書',
      'audit.doc.title':'ドキュメント名:',
      'audit.doc.id':'ドキュメントID:',
      'audit.sender':'送信者:',
      'audit.record':'署名記録',
      'audit.signer':'署名者',
      'audit.signer.value':'このドキュメントの署名者',
      'audit.signed.at':'署名日時',
      'audit.method':'署名方法',
      'audit.method.value':'ブラウザベースの電子署名（クライアントサイド処理）',
      'audit.verify':'検証',
      'audit.verify.value':'pdf-libによりPDFに直接埋め込み',
      'audit.fields':'入力済みフィールド',
      'audit.footer1':'この証明書はSigny (mamonis.studio) により自動生成されました。',
      'audit.footer2':'署名は署名者のブラウザ内で完結し、PDFデータはサーバーに送信されていません。',
    },
    en: {
      'meta.title.index':'Signy — Unlimited E-Signatures at ¥500/mo',
      'meta.title.send':'Signy - Send Signature Request',
      'meta.title.sign':'Signy - Signature Request',
      'meta.title.pricing':'Signy - Pricing',
      'meta.title.login':'Signy — Login',
      'meta.title.complete':'Signy — Signature Complete',
      'meta.desc.index':'Unlimited signatures for ¥500/month. Field placement, e-stamps, templates, workflows, auto-reminders. PDFs never leave your browser.',
      'meta.desc.send':'Signy - Send signature request. Place signature fields on PDF and send via email.',
      'meta.desc.sign':'Signy - Electronic signature. Secure signing completed entirely in your browser.',
      'nav.dashboard':'Dashboard','nav.send':'New Request','nav.pricing':'Pricing',
      'nav.login':'Login','nav.logout':'Logout',
      'hero.title':'E-signatures, <span>unlimited at &yen;500/mo</span>.',
      'hero.sub':'Stamps, signing order, templates, bulk send, auto-reminders. 1/20 the price of major e-sign services. PDFs never leave your browser.',
      'hero.cta':'Get Started Free','hero.cta2':'View Pricing',
      'feat.title':'Why Signy?',
      'feat.priv':'Privacy First','feat.priv.d':'All signing happens in your browser. PDFs never touch our servers. We literally can\'t see your contracts.',
      'feat.easy':'3 Steps to Sign','feat.easy.d':'Upload PDF -> Place 5 field types -> Send. Recipients just click the link. No account needed.',
      'feat.legal':'Legally Valid','feat.legal.d':'Compliant with Japan\'s e-Signature Act. Full audit trail auto-generated.',
      'feat.cheap':'Cheapest. Unlimited.','feat.cheap.d':'&yen;550/mo (tax incl.) for unlimited signatures. 1/20 the price of major services. Zero per-send fees.',
      'dash.title':'Documents','dash.new':'New Request',
      'dash.empty':'No documents yet','dash.empty.d':'Send your first signature request.','dash.empty.cta':'Upload PDF',
      'dash.usage':'Monthly usage',
      'st.pending':'Pending','st.signed':'Signed','st.expired':'Expired','st.cancelled':'Cancelled',
      'dash.search.ph':'Search by title...','dash.filter.all':'All','dash.filter.pending':'Pending','dash.filter.signed':'Signed',
      'dash.no.match':'No documents match your criteria','dash.no.docs':'No documents',
      'dash.dl':'Download','dash.cancel':'Cancel','dash.cancel.confirm':'Cancel this signature request? Signers will be notified by email.','dash.dup':'Send Again',
      'sign.cancelled':'This signature request has been cancelled.',
      'sign.zoom.in':'Zoom In','sign.zoom.out':'Zoom Out',
      'send.title':'Send Signature Request',
      'send.s1':'Upload','send.s2':'Place Fields','send.s3':'Send',
      'send.up':'Drag & drop a PDF, or click to browse',
      'send.up.h':'PDF / Free: up to 10MB, 5 docs/mo / Pro: up to 50MB, unlimited',
      'send.add':'Add Signature Field','send.page':'Page','send.field':'Signature',
      'send.det':'Signer Details','send.email':'Signer\'s Email','send.email.ph':'signer@example.com',
      'send.doc':'Document Title','send.doc.ph':'Service Agreement',
      'send.msg':'Message (optional)','send.msg.ph':'Please sign this document.',
      'send.submit':'Send Signature Request','send.sending':'Sending...','send.loading':'Loading...',
      'send.back':'Back','send.next':'Next',
      'send.guide.fields':'Click a button below to add a field, then drag it on the PDF to position. Resize using the bottom-right handle.',
      'send.guide.signer':'"Signer" = fields the recipient fills / "Self" = fields you fill before sending',
      'send.guide.order':'Requests are sent in the order added. Each signer is notified after the previous one completes.',
      'send.guide.after':'The signer will receive an email. Track progress on your dashboard.',
      'sign.guide.fields':'Fields',
      'sign.guide.how':'Signature/Stamp: click the box on the PDF to open the pad. Text/Date: type directly.',
      'sign.guide.done':'done',
      'sign.wait.title':'Waiting for previous signer to complete',
      'sign.err.title':'Failed to load',
      'sign.err.desc':'Please check your connection and reload the page.',
      'sign.title':'Signature Request',
      'sign.info':'Click the colored boxes on the PDF to fill each field. The sign button activates when all required fields are completed and the agreement is checked.',
      'sign.from':'From','sign.document':'Document',
      'sign.draw':'Draw','sign.type':'Type','sign.clear':'Clear',
      'sign.type.ph':'Type your name',
      'sign.agree':'I have reviewed the document and agree to sign electronically.',
      'sign.submit':'Complete Signature','sign.submitting':'Processing...',
      'sign.expired':'This signature link has expired.',
      'sign.done':'This document has already been signed.',
      'sign.stamp':'Stamp','sign.signature':'Signature','sign.apply':'Apply',
      'sign.stamp.name':'Enter name','sign.stamp.circle':'Circle','sign.stamp.square':'Square',
      'sign.click.sig':'Click to sign','sign.click.stamp':'Click to stamp',
      'sign.date.auto':'Date will be auto-filled','sign.input.ph':'Enter',
      'complete.title':'Signature Complete',
      'complete.desc':'The signed PDF will be sent to both sender and signer via email.',
      'complete.dl':'Download Signed PDF','complete.back':'Back to Dashboard',
      'price.title':'Pricing','price.sub':'No sending fees. No storage fees. Cancel anytime.',
      'price.free.name':'FREE','price.pro.name':'PRO','price.pro.badge':'Recommended',
      'price.free.price':'0','price.pro.price':'500','price.mo':'/mo','price.pro.tax':'(550 incl. tax)',
      'price.free.desc':'Try it out','price.pro.desc':'Perfect for freelancers & SMBs',
      'price.free.f1':'Up to 5 docs/month','price.free.f2':'Field placement on PDF','price.free.f3':'Handwritten/Text/Stamp','price.free.f4':'Audit trail',
      'price.free.f5':'Direct PDF download','price.free.f6':'14-day storage',
      'price.pro.f1':'Unlimited signatures','price.pro.f2':'Workflow/Reminders','price.pro.f3':'Templates/Bulk send','price.pro.f4':'Unlimited downloads',
      'price.pro.f5':'Handwritten/Text/Stamp','price.pro.f6':'5 field types','price.pro.f7':'Audit trail + certificate',
      'price.cta.free':'Get Started Free','price.cta.pro':'Start for ¥500/mo','price.current':'Current Plan',
      'price.manage':'Manage Plan','price.note':'Change or cancel anytime. No lock-in.',
      'auth.title':'Login','auth.email':'Email','auth.email.ph':'you@example.com',
      'auth.submit':'Send Login Link','auth.sent':'Check your email and click the login link to continue (valid for 15 minutes).',
      'auth.checking':'Authenticating...','auth.failed':'Authentication failed',
      'err':'An error occurred','ok':'Success',
      'toast.dup.loaded':'Loaded previous settings. Please upload a PDF.',
      'toast.dup.fields':'Restored previous field layout',
      'toast.pdf.type':'Please select a PDF file','toast.pdf.size':'Please select a file under ',
      'toast.pdf.err':'PDF loading error',
      'toast.pdf.rotated':'⚠️ This PDF is rotated. Signatures may be misplaced. Please re-save the PDF in its original orientation.',
      'toast.draft.restored':'Previous work restored',
      'toast.draft.cleared':'Draft cleared',
      'toast.field.deleted':'Field deleted',
      'toast.field.duplicated':'Field duplicated',
      'toast.undo.empty':'Nothing more to undo',
      'toast.undo.ok':'Action undone',
      'toast.tmpl.deleted':'Template deleted',
      'toast.tmpl.delete.confirm':'Delete this template?',
      'beforeunload.warn':'You have unsaved changes. Leave anyway?',
      'draft.restore.q':'Previous work remains ({n} items). Continue from there?',
      'draft.restore.yes':'Continue','draft.restore.no':'Start fresh','draft.ago.min':'{n} min ago','draft.ago.hr':'{n} hr ago','draft.ago.now':'just now',
      'draft.signers':'{n} signers','draft.fields':'{n} fields',
      'send.preview':'Pre-send Preview','send.preview.btn':'Preview','send.preview.close':'Close',
      'send.preview.signer':'will see:',
      'send.signer.move.up':'Move up','send.signer.move.down':'Move down',
      'send.field.duplicate':'Duplicate (Cmd+D)','send.field.delete':'Delete (Del)',
      'send.shortcut.title':'Shortcuts','send.shortcut.del':'Delete: remove selected field','send.shortcut.dup':'Cmd+D: duplicate selected field','send.shortcut.undo':'Cmd+Z: undo last action','send.shortcut.esc':'Esc: deselect',
      'mail.subject.custom':'Email subject (optional)','mail.subject.ph':'[Signature Request] Please review and sign',
      'mail.subject.label':'Subject',
      'toast.field.min':'Please add at least one field',
      'toast.tmpl.applied':'Template applied','toast.tmpl.saved':'Template saved',
      'toast.tmpl.err':'Template loading error','toast.save.err':'Save error',
      'toast.tmpl.need':'Please add fields before saving a template',
      'toast.email.invalid':'Please enter a valid email address','toast.email.dup':'Already added',
      'toast.title.req':'Please enter a document title','toast.signer.req':'Please add at least one signer','toast.signer.nofield':'Assign at least one field to each signer. Missing:',
      'toast.sent':'Signature request sent','toast.bulk.sent':' signature requests sent',
      'toast.remind':'Reminder sent','toast.cancelled':'Signature request cancelled',
      'toast.pro.done':'Upgraded to PRO!',
      'trust.law':'e-Signature Act','trust.local':'Client-side','trust.noacc':'No account needed (signer)',
      'compare.title':'Compare','compare.sub':'Same features, 1/20 the price.',
      'send.signer.self':'Self (Sender)','send.signer.other':'Signer (Recipient)',
      'send.field.sig':'Signature','send.field.stamp':'Stamp','send.field.text':'Text','send.field.date':'Date','send.field.check':'Checkbox',
      'send.tmpl.saved':'Saved templates:','send.tmpl.select':'Select template...','send.tmpl.save':'Save as template',
      'send.tmpl.prompt':'Enter template name:','send.tmpl.default':'My Template',
      'send.signers':'Signers','send.signers.multi':'(multiple)','send.signers.add':'Add',
      'send.signers.hint':'Add the email addresses of people you want to sign. Requests will be sent in the order added.',
      'send.guide.fieldfor':'Select who fills this field (signers are distinguished by color and number):',
      'send.field.self.short':'Me',
      'send.bulk.title':'Bulk Send (CSV)','send.bulk.desc':'Send to multiple recipients via CSV. Requires "email" column header.','send.bulk.btn':'Bulk Send',
      'send.page.jump':'Jump to page (1-{total}):','send.signers.up':'Move up','send.signers.down':'Move down','send.tmpl.delete':'Delete',
      'compare.date':'Based on publicly available info as of April 2026, tax included',
      'empty.s1':'Upload','empty.s1b':'PDF','empty.s2':'Place','empty.s2b':'Fields','empty.s3':'Send','empty.s3b':'Request',
      'sign.pad.draw':'Please draw your signature','sign.pad.name':'Please enter your name',
      'footer':'Signy — mamonis.studio','footer.priv':'Privacy Policy','footer.terms':'Terms of Service','footer.law':'Specified Commercial Transactions',
      'sign.loading':'Loading...','sign.wait.queue':'Your turn: {queue}/{total}',
      'sign.zoom.in.title':'Zoom in','sign.zoom.out.title':'Zoom out',
      'send.fields.count':'{count} field(s)','send.field.self':'(Self)',
      'compare.feature':'Feature','compare.compA':'Company A','compare.compB':'Company B','compare.compC':'Company C',
      'compare.r.price':'Monthly fee','compare.r.count':'Signatures','compare.r.send':'Per-send fee',
      'compare.r.position':'Field placement','compare.r.stamp':'E-Stamp','compare.r.template':'Templates',
      'compare.r.workflow':'Workflow','compare.r.reminder':'Auto-reminders','compare.r.bulk':'Bulk send',
      'compare.r.audit':'Audit trail','compare.r.privacy':'Privacy',
      'compare.unlimited':'Unlimited','compare.local':'Client-side','compare.server':'Server-side',
      'compare.paid':'Paid','compare.na':'--','compare.ok':'OK',
      'compare.signy':'Signy PRO',
      'send.tmpl.fields':'{count} field(s)',
      'sign.page.short':'p.{page}',
      'sign.stamp.default':'Seal',
      'sign.field.filled':'[Image/Signature]',
      'dash.dl.suffix':'_signed.pdf',
      'audit.title':'SIGNY - Electronic Signature Certificate',
      'audit.doc.title':'Document Title:',
      'audit.doc.id':'Document ID:',
      'audit.sender':'Sender:',
      'audit.record':'Signature Record',
      'audit.signer':'Signer',
      'audit.signer.value':'This document signer',
      'audit.signed.at':'Signed At',
      'audit.method':'Method',
      'audit.method.value':'Browser-based electronic signature (client-side)',
      'audit.verify':'Verification',
      'audit.verify.value':'Signature embedded directly into PDF via pdf-lib',
      'audit.fields':'Fields Completed',
      'audit.footer1':'This certificate was automatically generated by Signy (mamonis.studio).',
      'audit.footer2':'The signature was processed entirely within the signer\'s browser. No PDF data was transmitted to the server.',
    }
  };

  let lang = localStorage.getItem('signy-lang') || 'ja';

  function t(k){ return T[lang]?.[k] || T.ja?.[k] || k; }

  function setLang(l){ lang = l; localStorage.setItem('signy-lang', l); applyI18n(); document.documentElement.lang = l; }
  function toggleLang(){ setLang(lang === 'ja' ? 'en' : 'ja'); }

  function applyI18n(){
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = t(k);
      else el.innerHTML = t(k);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.getAttribute('data-i18n-attr').split(',').forEach(p => {
        const [attr, k] = p.trim().split(':');
        if (attr && k) el.setAttribute(attr.trim(), t(k.trim()));
      });
    });
    document.querySelectorAll('.lang-toggle').forEach(b => b.textContent = lang === 'ja' ? 'EN' : 'JA');
    // Update page title based on current path
    const path = location.pathname;
    const titleKey = path.includes('send') ? 'meta.title.send' :
                     path.includes('sign') ? 'meta.title.sign' :
                     path.includes('pricing') ? 'meta.title.pricing' :
                     path.includes('login') ? 'meta.title.login' :
                     path.includes('complete') ? 'meta.title.complete' : 'meta.title.index';
    if (T[lang]?.[titleKey]) document.title = t(titleKey);
  }

  /* ─── API ─── */
  async function api(ep, opt = {}){
    const tk = getToken();
    const h = { ...opt.headers };
    if (tk) h['Authorization'] = `Bearer ${tk}`;
    if (!(opt.body instanceof FormData)) h['Content-Type'] = 'application/json';
    const r = await fetch(`${CONFIG.API}${ep}`, { ...opt, headers: h });
    if(r.status===401){clearToken();location.href='/login.html';throw new Error('Session expired')}
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }

  /* ─── Auth ─── */
  function getToken(){ return localStorage.getItem('signy-token'); }
  function setToken(t){ localStorage.setItem('signy-token', t); }
  function clearToken(){ localStorage.removeItem('signy-token'); }
  function isLoggedIn(){
    const t=getToken();if(!t)return false;
    try{const b=t.split('.')[1];const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0))));
      if(p.exp&&Date.now()>p.exp){clearToken();return false}
      return true;
    }catch{clearToken();return false}
  }
  function getUser(){ try { const t=getToken(); if(!t)return null; const b=t.split('.')[1]; return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0)))); } catch{ return null; } }

  /* ─── Toast ─── */
  function toast(msg, type = 'info'){
    let c = document.querySelector('.toast-container');
    if (!c){ c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${type === 'success' ? I.check : type === 'error' ? I.alertCircle : I.info}<span>${esc(msg)}</span>`;
    c.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; el.style.transition='.3s ease'; setTimeout(() => el.remove(), 300); }, 4000);
  }

  /* ─── SVG Icons ─── */
  const s = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    upload:    s('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'),
    send:      s('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
    fileText:  s('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>'),
    check:     s('<polyline points="20 6 9 17 4 12"/>'),
    checkCircle: s('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
    alertCircle: s('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'),
    info:      s('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    plus:      s('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
    x:         s('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    pen:       s('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
    shield:    s('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    zap:       s('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    dollar:    s('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
    lock:      s('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    mail:      s('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>'),
    download:  s('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
    chevL:     s('<polyline points="15 18 9 12 15 6"/>'),
    chevR:     s('<polyline points="9 18 15 12 9 6"/>'),
  };

  const Logo = `<svg class="header__logo-mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" stroke-width="2"/><path d="M10 20C10 20 12 22 16 22C20 22 22 20 22 20" stroke="#00e0a0" stroke-width="2" stroke-linecap="round"/><path d="M9 14L14 10" stroke="#00e0a0" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="12" r="2" fill="#00e0a0"/></svg>`;

  /* ─── Helpers ─── */
  const genId = (p='') => { const u = crypto.randomUUID?.() || 'xxxx-xxxx'.replace(/x/g,()=>Math.floor(Math.random()*16).toString(16)); return p ? `${p}_${u}` : u; };
  function fmtDate(d){ const o = new Date(d); return lang==='ja' ? `${o.getFullYear()}/${String(o.getMonth()+1).padStart(2,'0')}/${String(o.getDate()).padStart(2,'0')}` : o.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  function fmtSize(b){ return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'; }
  function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

  /* ─── Init ─── */
  function init(){
    applyI18n();
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-toggle').forEach(b => b.addEventListener('click', toggleLang));
    // Auth nav
    const show = (sel, v) => { const el = document.querySelector(sel); if(el) el.style.display = v ? '' : 'none'; };
    if (isLoggedIn()) { show('[data-auth="login"]',false); show('[data-auth="logout"]',true); show('[data-auth="dash"]',true); }
    else { show('[data-auth="login"]',true); show('[data-auth="logout"]',false); show('[data-auth="dash"]',false); }
    const m = document.querySelector('main'); if(m) m.classList.add('page-enter');
  }

  return { CONFIG, t, setLang, toggleLang, applyI18n, api, getToken, setToken, clearToken, isLoggedIn, getUser, toast, I, Logo, genId, fmtDate, fmtSize, esc, init, get lang(){ return lang; } };
})();

document.addEventListener('DOMContentLoaded', () => Signy.init());

// PWA: register service worker (silent if not supported)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
