/* Signy — Cloudflare Pages Worker (Advanced Mode)
 *
 * Dashboard Bindings:
 *   KV Namespace : SIGNY_KV
 *   R2 Bucket    : DOCUMENTS  (bucket: signy-documents)
 *   Env Vars     : JWT_SECRET, RESEND_API_KEY, APP_URL,
 *                  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *                  STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_BASIC_YEARLY,
 *                  STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const C = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: C });

    try { return await route(url.pathname, request, url, env, C); }
    catch (e) { console.error(e); return J({ error: e.message }, 500, C); }
  }
};

/* ── Router ── */
async function route(p, req, url, env, C) {
  const m = req.method;
  if (p === '/api/auth/magic-link' && m === 'POST') return authMagic(req, env, C);
  if (p === '/api/auth/verify'     && m === 'POST') return authVerify(req, env, C);
  if (p === '/api/documents'        && m === 'GET')  return docList(req, env, C);
  if (p === '/api/documents/upload' && m === 'POST') return docUpload(req, env, C);
  if (p === '/api/documents/send'   && m === 'POST') return docSend(req, env, C);
  // Stripe
  if (p === '/api/stripe/checkout'  && m === 'POST') return stripeCheckout(req, env, C);
  if (p === '/api/stripe/portal'    && m === 'POST') return stripePortal(req, env, C);
  if (p === '/api/stripe/webhook'   && m === 'POST') return stripeWebhook(req, env, C);
  let r;
  if ((r = p.match(/^\/api\/documents\/([^/]+)$/))          && m === 'GET')  return docGet(r[1], url, env, C, req);
  if ((r = p.match(/^\/api\/documents\/([^/]+)\/sign$/))     && m === 'POST') return docSign(r[1], req, env, C);
  if ((r = p.match(/^\/api\/documents\/([^/]+)\/status$/))   && m === 'GET')  return docStatus(r[1], env, C);
  if ((r = p.match(/^\/api\/documents\/([^/]+)\/pdf$/))      && m === 'GET')  return docPdf(r[1], url, env, C);
  if ((r = p.match(/^\/api\/documents\/([^/]+)\/download$/)) && m === 'GET')  return docDl(r[1], url, env, C);
  return J({ error: 'Not found' }, 404, C);
}

/* ── Util ── */
const J = (d, s = 200, c = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...c } });
const uid = () => crypto.randomUUID();
const SEC = e => e.JWT_SECRET || 'dev-secret-change-me';
const APP = e => e.APP_URL || 'https://signy.jp';
const LIMITS = { free: 3, basic: 30, pro: 1e6 };
const SIZES = { free: 5e6, basic: 20e6, pro: 50e6 };
const MK = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

async function hmac(op, data, secret) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [op]);
  if (op === 'sign') return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)))));
  return crypto.subtle.verify('HMAC', k, Uint8Array.from(atob(data.split('.')[2]), c => c.charCodeAt(0)), new TextEncoder().encode(data.split('.').slice(0, 2).join('.')));
}

async function mkTk(payload, secret) {
  const h = btoa(JSON.stringify({ alg: 'HS256' })), b = btoa(JSON.stringify(payload));
  return `${h}.${b}.${await hmac('sign', `${h}.${b}`, secret)}`;
}

async function rdTk(token, secret) {
  try {
    const [h, b, s] = token.split('.');
    if (!h || !b || !s) return null;
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('HMAC', k, Uint8Array.from(atob(s), c => c.charCodeAt(0)), new TextEncoder().encode(`${h}.${b}`)))) return null;
    const p = JSON.parse(atob(b));
    return (p.exp && Date.now() > p.exp) ? null : p;
  } catch { return null; }
}

async function getUser(req, env) {
  const a = req.headers.get('Authorization');
  return a?.startsWith('Bearer ') ? rdTk(a.slice(7), SEC(env)) : null;
}

function ci(req) { return { ip: req.headers.get('CF-Connecting-IP') || '?', ua: req.headers.get('User-Agent') || '?' }; }

async function log(env, docId, type, req) {
  const k = `log:${docId}`, d = await env.SIGNY_KV.get(k, 'json') || { events: [] };
  d.events.push({ type, at: new Date().toISOString(), ...ci(req) });
  await env.SIGNY_KV.put(k, JSON.stringify(d));
}

async function mail(env, to, subject, html) {
  if (!env.RESEND_API_KEY) { console.log(`[MAIL] ${to}: ${subject}`); return; }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Signy <noreply@signy.jp>', to: [to], subject, html }),
  });
}

async function sha256(buf) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
}

const emailWrap = (body) => `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px">${body}<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#ccc;font-size:11px">Powered by Signy — mamonis.studio</p></div>`;
const greenBtn = (href, text) => `<a href="${href}" style="display:inline-block;background:#00e0a0;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">${text}</a>`;

/* ── Auth ── */
async function authMagic(req, env, C) {
  const { email } = await req.json();
  if (!email?.includes('@')) return J({ error: 'Invalid email' }, 400, C);

  let userId = await env.SIGNY_KV.get(`email:${email}`);
  if (!userId) {
    userId = `user_${uid()}`;
    await env.SIGNY_KV.put(`email:${email}`, userId);
    await env.SIGNY_KV.put(`user:${userId}`, JSON.stringify({ id: userId, email, plan: 'free', createdAt: new Date().toISOString() }));
  }

  const tk = await mkTk({ userId, email, type: 'magic', exp: Date.now() + 15 * 6e4 }, SEC(env));
  await env.SIGNY_KV.put(`magic:${tk}`, userId, { expirationTtl: 900 });

  await mail(env, email, '【Signy】ログインリンク', emailWrap(`
    <h2>Signy ログイン</h2>
    <p style="color:#666;margin:16px 0">以下のリンクをクリックしてログインしてください（15分間有効）。</p>
    ${greenBtn(`${APP(env)}/login.html?token=${encodeURIComponent(tk)}`, 'ログイン')}
    <p style="color:#999;font-size:12px;margin-top:16px">心当たりがない場合は無視してください。</p>
  `));

  return J({ ok: true }, 200, C);
}

async function authVerify(req, env, C) {
  const { token } = await req.json();
  if (!token) return J({ error: 'No token' }, 400, C);
  const userId = await env.SIGNY_KV.get(`magic:${token}`);
  if (!userId) return J({ error: 'Invalid or expired' }, 401, C);
  await env.SIGNY_KV.delete(`magic:${token}`);
  const user = await env.SIGNY_KV.get(`user:${userId}`, 'json');
  if (!user) return J({ error: 'User not found' }, 404, C);
  const st = await mkTk({ userId, email: user.email, plan: user.plan, exp: Date.now() + 30 * 864e5 }, SEC(env));
  return J({ sessionToken: st, user: { id: userId, email: user.email, plan: user.plan } }, 200, C);
}

/* ── Documents ── */
async function docList(req, env, C) {
  const u = await getUser(req, env);
  if (!u) return J({ error: 'Unauthorized' }, 401, C);
  const ids = await env.SIGNY_KV.get(`user-docs:${u.userId}`, 'json') || [];
  const docs = [];
  for (const id of ids.slice(-50).reverse()) {
    const d = await env.SIGNY_KV.get(`doc:${id}`, 'json');
    if (!d) continue;
    if (d.status === 'pending' && new Date(d.expiresAt) < new Date()) { d.status = 'expired'; await env.SIGNY_KV.put(`doc:${id}`, JSON.stringify(d)); }
    docs.push({ id: d.id, title: d.title, status: d.status, signerEmail: d.signerEmail, createdAt: d.createdAt, signedAt: d.signedAt });
  }
  const mk = MK(), usage = await env.SIGNY_KV.get(`usage:${u.userId}:${mk}`, 'json') || { count: 0 };
  return J({ documents: docs, usage: { count: usage.count, limit: LIMITS[u.plan] || 3 } }, 200, C);
}

async function docUpload(req, env, C) {
  const u = await getUser(req, env);
  if (!u) return J({ error: 'Unauthorized' }, 401, C);

  const mk = MK(), usage = await env.SIGNY_KV.get(`usage:${u.userId}:${mk}`, 'json') || { count: 0 };
  if (usage.count >= (LIMITS[u.plan] || 3)) return J({ error: 'Monthly limit reached' }, 403, C);

  const fd = await req.formData();
  const pdf = fd.get('pdf'), title = fd.get('title') || 'Untitled', signerEmail = fd.get('signerEmail'), message = fd.get('message') || '';
  let signFields = []; try { signFields = JSON.parse(fd.get('signFields') || '[]'); } catch {}
  if (!pdf || !signerEmail) return J({ error: 'Missing fields' }, 400, C);

  const max = SIZES[u.plan] || SIZES.free;
  if (pdf.size > max) return J({ error: `File too large (max ${max / 1e6}MB)` }, 400, C);

  const docId = `doc_${uid()}`, signToken = uid(), pdfKey = `docs/${docId}/original.pdf`;
  await env.SIGNY_DOCUMENTS.put(pdfKey, pdf.stream(), { httpMetadata: { contentType: 'application/pdf' } });

  const now = new Date();
  await env.SIGNY_KV.put(`doc:${docId}`, JSON.stringify({
    id: docId, ownerId: u.userId, ownerEmail: u.email, title, status: 'pending',
    signerEmail, message, signFields, signToken, pdfKey, signedPdfKey: null,
    createdAt: now.toISOString(), signedAt: null,
    expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(),
  }));

  const uDocs = await env.SIGNY_KV.get(`user-docs:${u.userId}`, 'json') || [];
  uDocs.push(docId);
  await env.SIGNY_KV.put(`user-docs:${u.userId}`, JSON.stringify(uDocs));

  usage.count++;
  await env.SIGNY_KV.put(`usage:${u.userId}:${mk}`, JSON.stringify(usage));
  await log(env, docId, 'created', req);

  return J({ id: docId, status: 'pending' }, 200, C);
}

async function docSend(req, env, C) {
  const u = await getUser(req, env);
  if (!u) return J({ error: 'Unauthorized' }, 401, C);
  const { documentId } = await req.json();
  const doc = await env.SIGNY_KV.get(`doc:${documentId}`, 'json');
  if (!doc || doc.ownerId !== u.userId) return J({ error: 'Not found' }, 404, C);

  const signUrl = `${APP(env)}/sign.html?id=${doc.id}&token=${doc.signToken}`;
  await mail(env, doc.signerEmail, `【Signy】署名のお願い - ${doc.title}`, emailWrap(`
    <h2>署名のお願い</h2>
    <p style="color:#666;margin:12px 0"><strong>${doc.ownerEmail}</strong> さんから署名依頼が届いています。</p>
    <p style="color:#666">ドキュメント: <strong>${doc.title}</strong></p>
    ${doc.message ? `<div style="color:#666;margin:12px 0;padding:12px;background:#f5f5f5;border-radius:8px">${doc.message}</div>` : ''}
    ${greenBtn(signUrl, '署名する / Sign Document')}
    <p style="color:#999;font-size:12px;margin-top:16px">このリンクは14日間有効です。</p>
  `));

  await log(env, documentId, 'sent', req);
  return J({ ok: true }, 200, C);
}

async function docGet(docId, url, env, C, req) {
  const token = url.searchParams.get('token');
  const doc = await env.SIGNY_KV.get(`doc:${docId}`, 'json');
  if (!doc) return J({ error: 'not_found' }, 404, C);
  if (token !== doc.signToken) return J({ error: 'invalid_token' }, 403, C);
  if (new Date(doc.expiresAt) < new Date()) return J({ error: 'expired' }, 410, C);
  if (doc.status === 'signed') return J({ error: 'already_signed' }, 409, C);
  await log(env, docId, 'opened', req);
  return J({ id: doc.id, title: doc.title, ownerEmail: doc.ownerEmail, signFields: doc.signFields, pdfUrl: `${APP(env)}/api/documents/${docId}/pdf?token=${token}`, createdAt: doc.createdAt, expiresAt: doc.expiresAt }, 200, C);
}

async function docSign(docId, req, env, C) {
  const { token, signatureImage, signatureType } = await req.json();
  const doc = await env.SIGNY_KV.get(`doc:${docId}`, 'json');
  if (!doc) return J({ error: 'Not found' }, 404, C);
  if (token !== doc.signToken) return J({ error: 'Invalid token' }, 403, C);
  if (doc.status === 'signed') return J({ error: 'Already signed' }, 409, C);
  if (new Date(doc.expiresAt) < new Date()) return J({ error: 'Expired' }, 410, C);

  const signedAt = new Date().toISOString();
  await env.SIGNY_KV.put(`sig:${docId}`, JSON.stringify({ image: signatureImage, type: signatureType, signedAt, ...ci(req) }));

  const obj = await env.SIGNY_DOCUMENTS.get(doc.pdfKey);
  if (!obj) return J({ error: 'PDF not found' }, 404, C);
  const buf = await obj.arrayBuffer();
  const signedKey = `docs/${docId}/signed.pdf`;
  await env.SIGNY_DOCUMENTS.put(signedKey, buf, { httpMetadata: { contentType: 'application/pdf' } });

  doc.status = 'signed'; doc.signedAt = signedAt; doc.signedPdfKey = signedKey;
  await env.SIGNY_KV.put(`doc:${docId}`, JSON.stringify(doc));
  await log(env, docId, 'signed', req);

  const logD = await env.SIGNY_KV.get(`log:${docId}`, 'json');
  await env.SIGNY_KV.put(`audit:${docId}`, JSON.stringify({
    documentId: docId, title: doc.title, owner: doc.ownerEmail, signer: doc.signerEmail,
    events: logD?.events || [], pdfHash: await sha256(buf), generatedAt: new Date().toISOString(),
  }));

  const dlUrl = `${APP(env)}/api/documents/${docId}/download?token=${doc.signToken}`;
  const body = emailWrap(`
    <h2>署名が完了しました</h2>
    <p style="color:#666;margin:12px 0">ドキュメント: <strong>${doc.title}</strong></p>
    <p style="color:#666;margin-bottom:20px">署名日時: ${new Date(signedAt).toLocaleString('ja-JP')}</p>
    ${greenBtn(dlUrl, '署名済みPDFをダウンロード')}
  `);
  await mail(env, doc.signerEmail, `【Signy】署名完了 - ${doc.title}`, body);
  await mail(env, doc.ownerEmail, `【Signy】署名完了 - ${doc.title}`, body);

  return J({ ok: true, status: 'signed' }, 200, C);
}

async function docStatus(docId, env, C) {
  const d = await env.SIGNY_KV.get(`doc:${docId}`, 'json');
  return d ? J({ status: d.status, signedAt: d.signedAt }, 200, C) : J({ error: 'Not found' }, 404, C);
}

async function docPdf(docId, url, env, C) {
  const token = url.searchParams.get('token');
  const doc = await env.SIGNY_KV.get(`doc:${docId}`, 'json');
  if (!doc || token !== doc.signToken) return J({ error: 'Unauthorized' }, 403, C);
  const obj = await env.SIGNY_DOCUMENTS.get(doc.pdfKey);
  if (!obj) return J({ error: 'Not found' }, 404, C);
  return new Response(obj.body, { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store', ...C } });
}

async function docDl(docId, url, env, C) {
  const token = url.searchParams.get('token');
  const doc = await env.SIGNY_KV.get(`doc:${docId}`, 'json');
  if (!doc || token !== doc.signToken) return J({ error: 'Unauthorized' }, 403, C);
  const obj = await env.SIGNY_DOCUMENTS.get(doc.signedPdfKey || doc.pdfKey);
  if (!obj) return J({ error: 'Not found' }, 404, C);
  return new Response(obj.body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.title)}_signed.pdf"`, ...C } });
}

/* ══════════════════════════════════════
   Stripe — REST API直叩き（SDK不使用）
   ══════════════════════════════════════ */

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripe(env, endpoint, params = {}) {
  const body = new URLSearchParams();
  // ネストしたオブジェクトをStripeのform encoding形式に変換
  function flatten(obj, prefix = '') {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}[${k}]` : k;
      if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
        flatten(v, key);
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === 'object') flatten(item, `${key}[${i}]`);
          else body.append(`${key}[${i}]`, String(item));
        });
      } else if (v !== null && v !== undefined) {
        body.append(key, String(v));
      }
    }
  }
  flatten(params);

  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function stripeGet(env, endpoint) {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  return res.json();
}

/* ── Webhook署名検証 ── */
async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = {};
  for (const item of sigHeader.split(',')) {
    const [k, v] = item.split('=');
    parts[k.trim()] = v.trim();
  }
  const timestamp = parts['t'];
  const sig = parts['v1'];
  if (!timestamp || !sig) return false;

  // 5分以内のリクエストのみ許可
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const signed = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed)));
  const expectedHex = [...expected].map(b => b.toString(16).padStart(2, '0')).join('');
  return expectedHex === sig;
}

/* ── POST /api/stripe/checkout ── */
async function stripeCheckout(req, env, C) {
  const user = await getUser(req, env);
  if (!user) return J({ error: 'Unauthorized' }, 401, C);

  const { plan, interval } = await req.json(); // plan: 'basic'|'pro', interval: 'monthly'|'yearly'

  // Price IDマッピング
  const priceMap = {
    'basic:monthly': env.STRIPE_PRICE_BASIC_MONTHLY,
    'basic:yearly':  env.STRIPE_PRICE_BASIC_YEARLY,
    'pro:monthly':   env.STRIPE_PRICE_PRO_MONTHLY,
    'pro:yearly':    env.STRIPE_PRICE_PRO_YEARLY,
  };
  const priceId = priceMap[`${plan}:${interval}`];
  if (!priceId) return J({ error: 'Invalid plan' }, 400, C);

  // ユーザーのStripe Customer IDを取得 or 作成
  const userData = await env.SIGNY_KV.get(`user:${user.userId}`, 'json');
  let customerId = userData.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe(env, '/customers', {
      email: user.email,
      metadata: { userId: user.userId },
    });
    customerId = customer.id;
    userData.stripeCustomerId = customerId;
    await env.SIGNY_KV.put(`user:${user.userId}`, JSON.stringify(userData));
  }

  // Checkoutセッション作成
  const session = await stripe(env, '/checkout/sessions', {
    customer: customerId,
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${APP(env)}/?checkout=success`,
    cancel_url: `${APP(env)}/pricing.html?checkout=cancel`,
    metadata: { userId: user.userId, plan },
    subscription_data: {
      metadata: { userId: user.userId, plan },
    },
  });

  return J({ url: session.url }, 200, C);
}

/* ── POST /api/stripe/portal ── */
async function stripePortal(req, env, C) {
  const user = await getUser(req, env);
  if (!user) return J({ error: 'Unauthorized' }, 401, C);

  const userData = await env.SIGNY_KV.get(`user:${user.userId}`, 'json');
  if (!userData?.stripeCustomerId) return J({ error: 'No subscription found' }, 404, C);

  const session = await stripe(env, '/billing_portal/sessions', {
    customer: userData.stripeCustomerId,
    return_url: `${APP(env)}/`,
  });

  return J({ url: session.url }, 200, C);
}

/* ── POST /api/stripe/webhook ── */
async function stripeWebhook(req, env, C) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    return J({ error: 'Missing signature' }, 400, C);
  }

  // 署名検証
  const valid = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return J({ error: 'Invalid signature' }, 401, C);

  const event = JSON.parse(body);
  console.log(`[Stripe] ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription') {
        await updateUserPlan(env, session.metadata.userId, session.metadata.plan);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const userId = sub.metadata.userId;
      const plan = sub.metadata.plan;
      if (userId && plan) {
        if (sub.status === 'active') {
          await updateUserPlan(env, userId, plan);
        } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
          // 支払い失敗 → freeに戻す（猶予期間後）
          console.log(`[Stripe] Subscription ${sub.status} for ${userId}`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata.userId;
      if (userId) {
        await updateUserPlan(env, userId, 'free');
        console.log(`[Stripe] Subscription cancelled for ${userId}`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`[Stripe] Payment failed for customer ${invoice.customer}`);
      // ここでリマインドメール送信も可能
      break;
    }
  }

  return J({ received: true }, 200, C);
}

/* ── プラン更新 ── */
async function updateUserPlan(env, userId, plan) {
  const userData = await env.SIGNY_KV.get(`user:${userId}`, 'json');
  if (!userData) { console.error(`User not found: ${userId}`); return; }

  const oldPlan = userData.plan;
  userData.plan = plan;
  userData.planUpdatedAt = new Date().toISOString();
  await env.SIGNY_KV.put(`user:${userId}`, JSON.stringify(userData));
  console.log(`[Plan] ${userId}: ${oldPlan} → ${plan}`);

  // プラン変更通知メール
  await mail(env, userData.email, `【Signy】プラン変更完了`, emailWrap(`
    <h2>プランが変更されました</h2>
    <p style="color:#666;margin:12px 0">新しいプラン: <strong>${plan.toUpperCase()}</strong></p>
    <p style="color:#666">ご利用ありがとうございます。</p>
    ${greenBtn(`${APP(env)}/`, 'ダッシュボードを開く')}
  `));
}
