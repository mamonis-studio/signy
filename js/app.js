/* Signy — Common Module */

const Signy = (() => {
  const CONFIG = {
    API: '/api',
    FREE_DOCS: 3, BASIC_DOCS: 30,
    FREE_SIZE: 5 * 1024 * 1024,
    BASIC_SIZE: 20 * 1024 * 1024,
  };

  /* ─── i18n ─── */
  const T = {
    ja: {
      'nav.dashboard':'ダッシュボード','nav.send':'新規送信','nav.pricing':'料金プラン',
      'nav.login':'ログイン','nav.logout':'ログアウト',
      'hero.title':'電子サインを、<span>もっとシンプル</span>に。',
      'hero.sub':'フリーランス・中小企業のための電子契約サービス。無料プランで月3件まで、面倒なハンコ文化からの解放。',
      'hero.cta':'無料ではじめる','hero.cta2':'料金プランを見る',
      'feat.title':'なぜSigny?',
      'feat.priv':'プライバシー重視','feat.priv.d':'PDFはCloudflare R2で暗号化保存。署名処理はブラウザ内で完結。あなたのデータは、あなたのもの。',
      'feat.easy':'3ステップで完結','feat.easy.d':'PDF送信 → 署名欄配置 → メール送信。相手はリンクをクリックするだけ。アカウント登録不要。',
      'feat.legal':'法的に有効','feat.legal.d':'電子署名法第2条準拠。署名の証跡（IP・タイムスタンプ・UA）をPDFに自動付加。',
      'feat.cheap':'業界最安クラス','feat.cheap.d':'無料プランで月3件。BASICは月額980円で30件。大手サービスの半額以下。',
      'dash.title':'ドキュメント','dash.new':'新規送信',
      'dash.empty':'まだドキュメントがありません','dash.empty.d':'最初の署名依頼を送ってみましょう。','dash.empty.cta':'PDFをアップロード',
      'dash.usage':'今月の使用量',
      'st.pending':'署名待ち','st.signed':'署名済み','st.expired':'期限切れ',
      'send.title':'署名依頼を送信',
      'send.s1':'アップロード','send.s2':'署名欄配置','send.s3':'送信',
      'send.up':'PDFファイルをドラッグ&ドロップ、またはクリックして選択',
      'send.up.h':'PDF形式・5MBまで（FREEプラン）',
      'send.add':'署名欄を追加','send.page':'ページ','send.field':'署名欄',
      'send.det':'署名者情報','send.email':'署名者のメールアドレス','send.email.ph':'signer@example.com',
      'send.doc':'ドキュメント名','send.doc.ph':'業務委託契約書',
      'send.msg':'メッセージ（任意）','send.msg.ph':'署名をお願いいたします。',
      'send.submit':'署名依頼を送信','send.sending':'送信中...',
      'send.back':'戻る','send.next':'次へ',
      'sign.title':'署名のお願い',
      'sign.info':'以下のドキュメントに署名をお願いします。署名は法的拘束力を持ちます。',
      'sign.from':'送信者','sign.document':'ドキュメント',
      'sign.draw':'手書き','sign.type':'テキスト入力','sign.clear':'クリア',
      'sign.type.ph':'氏名を入力',
      'sign.agree':'上記の内容を確認し、電子署名に同意します。',
      'sign.submit':'署名を完了する','sign.submitting':'処理中...',
      'sign.expired':'この署名リンクは期限切れです。',
      'sign.done':'このドキュメントは署名済みです。',
      'comp.title':'署名が完了しました',
      'comp.desc':'署名済みPDFが送信者と署名者の両方にメールで送付されます。',
      'comp.dl':'署名済みPDFをダウンロード','comp.back':'ダッシュボードに戻る',
      'price.title':'料金プラン','price.sub':'すべてのプランで証跡PDF付き。いつでもプラン変更可能。',
      'price.mo':'/月',
      'price.free.yr':'永久無料',
      'price.basic.yr':'年額 ¥9,800（2ヶ月分お得）',
      'price.pro.yr':'年額 ¥29,800（2ヶ月分お得）',
      'price.free.f1':'月3件まで','price.free.f2':'署名者2名まで','price.free.f3':'PDF 5MBまで','price.free.f4':'証跡PDF付き',
      'price.basic.f1':'月30件まで','price.basic.f2':'署名者5名まで','price.basic.f3':'PDF 20MBまで','price.basic.f4':'リマインダーメール',
      'price.pro.f1':'無制限','price.pro.f2':'署名者無制限','price.pro.f3':'カスタムメール文面','price.pro.f4':'チームメンバー3名',
      'price.cta.free':'無料ではじめる','price.cta.basic':'月額で申し込む','price.cta.pro':'月額で申し込む',
      'price.cta.basic.yr':'年額で申し込む（2ヶ月分お得）','price.cta.pro.yr':'年額で申し込む（2ヶ月分お得）',
      'price.manage':'プランを管理',
      'auth.title':'ログイン','auth.email':'メールアドレス','auth.email.ph':'you@example.com',
      'auth.submit':'マジックリンクを送信','auth.sent':'メールを送信しました。リンクをクリックしてログインしてください。',
      'auth.checking':'認証中...',
      'err':'エラーが発生しました','ok':'成功',
      'footer':'Signy — mamonis.studio','footer.priv':'プライバシーポリシー','footer.terms':'利用規約',
    },
    en: {
      'nav.dashboard':'Dashboard','nav.send':'New Request','nav.pricing':'Pricing',
      'nav.login':'Login','nav.logout':'Logout',
      'hero.title':'E-signatures, <span>simplified</span>.',
      'hero.sub':'Electronic contract service for freelancers & small businesses. Free plan up to 3 docs/month.',
      'hero.cta':'Get Started Free','hero.cta2':'View Pricing',
      'feat.title':'Why Signy?',
      'feat.priv':'Privacy First','feat.priv.d':'PDFs encrypted on Cloudflare R2. Signature processing in your browser. Your data stays yours.',
      'feat.easy':'3 Steps to Sign','feat.easy.d':'Upload PDF → Place field → Send. Recipients just click the link. No account needed.',
      'feat.legal':'Legally Valid','feat.legal.d':'Compliant with Japan\'s e-Signature Act. Audit trail auto-appended to PDF.',
      'feat.cheap':'Affordable','feat.cheap.d':'Free plan: 3 docs/month. BASIC ¥980/mo for 30. Less than half the price of major services.',
      'dash.title':'Documents','dash.new':'New Request',
      'dash.empty':'No documents yet','dash.empty.d':'Send your first signature request.','dash.empty.cta':'Upload PDF',
      'dash.usage':'Monthly usage',
      'st.pending':'Pending','st.signed':'Signed','st.expired':'Expired',
      'send.title':'Send Signature Request',
      'send.s1':'Upload','send.s2':'Place Fields','send.s3':'Send',
      'send.up':'Drag & drop a PDF, or click to browse',
      'send.up.h':'PDF format, up to 5MB (Free plan)',
      'send.add':'Add Signature Field','send.page':'Page','send.field':'Signature',
      'send.det':'Signer Details','send.email':'Signer\'s Email','send.email.ph':'signer@example.com',
      'send.doc':'Document Title','send.doc.ph':'Service Agreement',
      'send.msg':'Message (optional)','send.msg.ph':'Please sign this document.',
      'send.submit':'Send Signature Request','send.sending':'Sending...',
      'send.back':'Back','send.next':'Next',
      'sign.title':'Signature Request',
      'sign.info':'Please sign the document below. Your signature is legally binding.',
      'sign.from':'From','sign.document':'Document',
      'sign.draw':'Draw','sign.type':'Type','sign.clear':'Clear',
      'sign.type.ph':'Type your name',
      'sign.agree':'I have reviewed the document and agree to sign electronically.',
      'sign.submit':'Complete Signature','sign.submitting':'Processing...',
      'sign.expired':'This signature link has expired.',
      'sign.done':'This document has already been signed.',
      'comp.title':'Signature Complete',
      'comp.desc':'The signed PDF will be sent to both sender and signer via email.',
      'comp.dl':'Download Signed PDF','comp.back':'Back to Dashboard',
      'price.title':'Pricing','price.sub':'All plans include audit trail PDF. Switch plans anytime.',
      'price.mo':'/mo',
      'price.free.yr':'Free forever',
      'price.basic.yr':'¥9,800/year (save 2 months)',
      'price.pro.yr':'¥29,800/year (save 2 months)',
      'price.free.f1':'Up to 3 docs/month','price.free.f2':'Up to 2 signers','price.free.f3':'PDF up to 5MB','price.free.f4':'Audit trail PDF',
      'price.basic.f1':'Up to 30 docs/month','price.basic.f2':'Up to 5 signers','price.basic.f3':'PDF up to 20MB','price.basic.f4':'Reminder emails',
      'price.pro.f1':'Unlimited documents','price.pro.f2':'Unlimited signers','price.pro.f3':'Custom email templates','price.pro.f4':'3 team members',
      'price.cta.free':'Get Started Free','price.cta.basic':'Subscribe Monthly','price.cta.pro':'Subscribe Monthly',
      'price.cta.basic.yr':'Subscribe Yearly (Save 2 months)','price.cta.pro.yr':'Subscribe Yearly (Save 2 months)',
      'price.manage':'Manage Plan',
      'auth.title':'Login','auth.email':'Email','auth.email.ph':'you@example.com',
      'auth.submit':'Send Magic Link','auth.sent':'Check your email for the login link.',
      'auth.checking':'Authenticating...',
      'err':'An error occurred','ok':'Success',
      'footer':'Signy — mamonis.studio','footer.priv':'Privacy Policy','footer.terms':'Terms of Service',
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
  }

  /* ─── API ─── */
  async function api(ep, opt = {}){
    const tk = getToken();
    const h = { ...opt.headers };
    if (tk) h['Authorization'] = `Bearer ${tk}`;
    if (!(opt.body instanceof FormData)) h['Content-Type'] = 'application/json';
    const r = await fetch(`${CONFIG.API}${ep}`, { ...opt, headers: h });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }

  /* ─── Auth ─── */
  function getToken(){ return localStorage.getItem('signy-token'); }
  function setToken(t){ localStorage.setItem('signy-token', t); }
  function clearToken(){ localStorage.removeItem('signy-token'); }
  function isLoggedIn(){ return !!getToken(); }
  function getUser(){ try { const t=getToken(); if(!t)return null; return JSON.parse(atob(t.split('.')[1])); } catch{ return null; } }

  /* ─── Toast ─── */
  function toast(msg, type = 'info'){
    let c = document.querySelector('.toast-container');
    if (!c){ c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `${type === 'success' ? I.check : type === 'error' ? I.alertCircle : I.info}<span>${msg}</span>`;
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
