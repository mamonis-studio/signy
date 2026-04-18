/* Signy v2 — Cloudflare Pages Worker
 * 天下取りバージョン — 全部盛り
 *
 * Bindings: SIGNY_KV, SIGNY_DOCUMENTS (R2)
 * Env: JWT_SECRET, RESEND_API_KEY, APP_URL,
 *      STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO
 *
 * Features: Multi-field, Workflow, Reminders, Bulk Send, Audit Trail, Templates
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const origin=request.headers.get('Origin')||'';
    const allowed=origin===env.APP_URL||origin===`https://signy.mamonis.studio`;
    const C = {'Access-Control-Allow-Origin':allowed?origin:'https://signy.mamonis.studio','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'86400','Vary':'Origin'};
    if (request.method === 'OPTIONS') return new Response(null,{headers:C});
    try { return await route(url.pathname, request, url, env, C); }
    catch(e) { if(e instanceof Response)return e;console.error(e); return J({error:'Internal server error'},500,C); }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(processReminders(env)); }
};

async function route(p,req,url,env,C){
  const m=req.method;
  if(p==='/api/auth/magic-link'&&m==='POST') return authMagic(req,env,C);
  if(p==='/api/auth/verify'&&m==='POST') return authVerify(req,env,C);
  if(p==='/api/auth/refresh'&&m==='POST') return authRefresh(req,env,C);
  if(p==='/api/documents'&&m==='GET') return docList(req,env,C);
  if(p==='/api/documents/upload'&&m==='POST') return docUpload(req,env,C);
  if(p==='/api/documents/send'&&m==='POST') return docSend(req,env,C);
  if(p==='/api/documents/bulk-send'&&m==='POST') return docBulkSend(req,env,C);
  if(p==='/api/stripe/checkout'&&m==='POST') return stripeCheckout(req,env,C);
  if(p==='/api/stripe/portal'&&m==='POST') return stripePortal(req,env,C);
  if(p==='/api/stripe/webhook'&&m==='POST') return stripeWebhook(req,env,C);
  if(p==='/api/templates'&&m==='GET') return templateList(req,env,C);
  if(p==='/api/templates'&&m==='POST') return templateCreate(req,env,C);
  let r;
  if((r=p.match(/^\/api\/documents\/([^/]+)$/))&&m==='GET') return docGet(r[1],url,env,C,req);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/sign$/))&&m==='POST') return docSign(r[1],req,env,C);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/status$/))&&m==='GET') return docStatus(r[1],env,C);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/pdf$/))&&m==='GET') return docPdf(r[1],url,env,C);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/download$/))&&m==='GET') return docDl(r[1],url,env,C);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/remind$/))&&m==='POST') return docRemind(r[1],req,env,C);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/cancel$/))&&m==='POST') return docCancel(r[1],req,env,C);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/owner-download$/))&&m==='GET') return docOwnerDl(r[1],req,env,C);
  if((r=p.match(/^\/api\/documents\/([^/]+)\/duplicate$/))&&m==='POST') return docDuplicate(r[1],req,env,C);
  if((r=p.match(/^\/api\/templates\/([^/]+)$/))&&m==='GET') return templateGet(r[1],req,env,C);
  if((r=p.match(/^\/api\/templates\/([^/]+)$/))&&m==='DELETE') return templateDelete(r[1],req,env,C);
  return J({error:'Not found'},404,C);
}

/* == Util == */
const J=(d,s=200,c={})=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json','X-Content-Type-Options':'nosniff',...c}});
const uid=()=>crypto.randomUUID();
const SEC=e=>{if(!e.JWT_SECRET)throw new Error('JWT_SECRET not configured');return e.JWT_SECRET};
const APP=e=>e.APP_URL||'https://signy.mamonis.studio';
const LIMITS={free:5,pro:1e8};
const SIZES={free:10e6,pro:50e6};
const EXPIRY={free:30,pro:365}; // Signing link expiry (days)
const STORAGE_DAYS=2555; // 7 years — 電帳法 compliance, all plans
const MK=()=>{const d=new Date(Date.now()+9*3600000);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`};

/* == Base64 helpers (UTF-8 safe) == */
function b64e(str){return btoa(Array.from(new TextEncoder().encode(str),b=>String.fromCharCode(b)).join(''))}
function b64d(b64){return new TextDecoder().decode(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)))}

async function hmac(op,data,secret){
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,[op]);
  if(op==='sign') return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(data)))));
  return crypto.subtle.verify('HMAC',k,Uint8Array.from(atob(data.split('.')[2]),c=>c.charCodeAt(0)),new TextEncoder().encode(data.split('.').slice(0,2).join('.')));
}
async function mkTk(payload,secret){const h=b64e(JSON.stringify({alg:'HS256'})),b=b64e(JSON.stringify(payload));return `${h}.${b}.${await hmac('sign',`${h}.${b}`,secret)}`}
async function rdTk(token,secret){try{const[h,b,s]=token.split('.');if(!h||!b||!s)return null;const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!(await crypto.subtle.verify('HMAC',k,Uint8Array.from(atob(s),c=>c.charCodeAt(0)),new TextEncoder().encode(`${h}.${b}`))))return null;const p=JSON.parse(b64d(b));return(p.exp&&Date.now()>p.exp)?null:p}catch{return null}}
async function getUser(req,env){const a=req.headers.get('Authorization');if(!a?.startsWith('Bearer '))return null;const p=await rdTk(a.slice(7),SEC(env));if(!p||p.type==='magic')return null;return p}
// Auth guard: returns user or throws Response
async function auth(req,env,C){const u=await getUser(req,env);if(!u)throw J({error:'Unauthorized'},401,C);return u}
// Get doc owned by user or throw
async function ownDoc(docId,req,env,C){const u=await auth(req,env,C);const doc=await env.SIGNY_KV.get(`doc:${docId}`,'json');if(!doc||doc.ownerId!==u.userId)throw J({error:'Not found'},404,C);return{u,doc}}
function ci(req){return{ip:req.headers.get('CF-Connecting-IP')||'?',ua:req.headers.get('User-Agent')||'?'}}
async function auditLog(env,docId,type,details={}){const k=`log:${docId}`,d=await env.SIGNY_KV.get(k,'json')||{events:[]};d.events.push({type,at:new Date().toISOString(),...details});await env.SIGNY_KV.put(k,JSON.stringify(d))}
async function mail(env,to,subject,html){
  if(!env.RESEND_API_KEY){console.log(`[MAIL] ${to}: ${subject}`);return true}
  try{
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'Signy <noreply@mamonis.studio>',to:[to],subject,html})});
    if(!r.ok){console.error(`[MAIL FAIL] ${r.status} to ${to}`);return false}
    return true;
  }catch(e){console.error(`[MAIL ERROR] ${to}: ${e.message}`);return false}
}
async function sha256(buf){return[...new Uint8Array(await crypto.subtle.digest('SHA-256',buf))].map(b=>b.toString(16).padStart(2,'0')).join('')}

const emailWrap=body=>`<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px">${body}<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px"><p style="color:#bbb;font-size:11px">Powered by <a href="https://signy.mamonis.studio" style="color:#bbb">Signy</a> — mamonis.studio</p></div>`;
const acBtn=(href,text)=>`<a href="${href}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;font-size:15px">${text}</a>`;
// Bilingual email: JA block + EN block with divider (for signer-facing emails)
const biEmail=(ja,en)=>`${ja}<div style="margin:24px 0;border-top:1px solid #e8e8e8"></div><p style="color:#aaa;font-size:11px;margin-bottom:8px">English</p>${en}`;
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clamp=(s,max)=>typeof s==='string'?s.slice(0,max):s;

/* == signFields sanitizer — whitelist properties, limit count == */
function sanitizeFields(raw){
  if(!Array.isArray(raw))return[];
  return raw.slice(0,50).map(f=>{
    // for: 'self' | 'signer' (legacy, = all signers) | 'signer:N' (specific signer index)
    let forVal = 'signer';
    if(f.for==='self')forVal='self';
    else if(typeof f.for==='string'&&/^signer:\d+$/.test(f.for))forVal=f.for;
    return {
      type:['signature','stamp','text','date','checkbox'].includes(f.type)?f.type:'signature',
      page:Math.max(1,parseInt(f.page)||1),
      x:Math.max(0,parseFloat(f.x)||0),
      y:Math.max(0,parseFloat(f.y)||0),
      width:Math.max(10,parseFloat(f.width||f.w)||200),
      height:Math.max(10,parseFloat(f.height||f.h)||60),
      for:forVal,
      label:clamp(String(f.label||''),50),
      required:f.required!==false,
    };
  });
}

/* == Rate Limiter (KV-based, per IP) == */
async function rateLimit(env,req,action,maxReqs,windowSec){
  const ip=req.headers.get('CF-Connecting-IP')||'unknown';
  const key=`rl:${action}:${ip}`;
  const data=await env.SIGNY_KV.get(key,'json');
  const now=Date.now();
  if(data&&data.count>=maxReqs&&(now-data.start)<windowSec*1000){
    return false; // rate limited
  }
  if(!data||(now-data.start)>=windowSec*1000){
    await env.SIGNY_KV.put(key,JSON.stringify({count:1,start:now}),{expirationTtl:windowSec});
  } else {
    data.count++;
    await env.SIGNY_KV.put(key,JSON.stringify(data),{expirationTtl:windowSec});
  }
  return true; // allowed
}

/* == PDF magic bytes validator == */
async function validatePdf(file){
  const buf=await file.slice(0,5).arrayBuffer();
  const header=new Uint8Array(buf);
  // %PDF- = 0x25 0x50 0x44 0x46 0x2D
  return header[0]===0x25&&header[1]===0x50&&header[2]===0x44&&header[3]===0x46;
}

/* == Auth == */
async function authMagic(req,env,C){
  if(!(await rateLimit(env,req,'magic',5,900)))return J({error:'Too many requests. Please wait.'},429,C);
  const{email}=await req.json();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return J({error:'Invalid email'},400,C);
  let userId=await env.SIGNY_KV.get(`email:${email}`);
  if(!userId){userId=`user_${uid()}`;await env.SIGNY_KV.put(`email:${email}`,userId);await env.SIGNY_KV.put(`user:${userId}`,JSON.stringify({id:userId,email,plan:'free',createdAt:new Date().toISOString()}))}
  const tk=await mkTk({userId,email,type:'magic',exp:Date.now()+15*6e4},SEC(env));
  await env.SIGNY_KV.put(`magic:${tk}`,userId,{expirationTtl:900});
  const loginUrl=`${APP(env)}/login.html?token=${encodeURIComponent(tk)}`;
  const sent=await mail(env,email,'Signy Login',emailWrap(biEmail(
    `<h2 style="margin:0 0 8px">Signy</h2><p style="color:#666;margin:16px 0">以下のボタンをクリックしてログインしてください（15分間有効）。</p>${acBtn(loginUrl,'ログイン')}<p style="color:#999;font-size:12px;margin-top:16px">心当たりがない場合は無視してください。</p>`,
    `<h2 style="margin:0 0 8px">Signy</h2><p style="color:#666;margin:16px 0">Click the button below to log in (valid for 15 minutes).</p>${acBtn(loginUrl,'Log In')}<p style="color:#999;font-size:12px;margin-top:16px">If you did not request this, please ignore this email.</p>`
  )));
  if(!sent)return J({error:'Email sending failed. Please try again later.'},500,C);
  return J({ok:true},200,C);
}
async function authVerify(req,env,C){
  if(!(await rateLimit(env,req,'verify',10,900)))return J({error:'Too many attempts'},429,C);
  const{token}=await req.json();if(!token)return J({error:'No token'},400,C);
  const userId=await env.SIGNY_KV.get(`magic:${token}`);if(!userId)return J({error:'Invalid or expired'},401,C);
  await env.SIGNY_KV.delete(`magic:${token}`);
  const user=await env.SIGNY_KV.get(`user:${userId}`,'json');if(!user)return J({error:'User not found'},404,C);
  const st=await mkTk({userId,email:user.email,plan:user.plan,exp:Date.now()+30*864e5},SEC(env));
  return J({sessionToken:st,user:{id:userId,email:user.email,plan:user.plan}},200,C);
}
async function authRefresh(req,env,C){
  const u=await auth(req,env,C);
  const user=await env.SIGNY_KV.get(`user:${u.userId}`,'json');if(!user)return J({error:'User not found'},404,C);
  const st=await mkTk({userId:u.userId,email:user.email,plan:user.plan,exp:Date.now()+30*864e5},SEC(env));
  return J({sessionToken:st,user:{id:u.userId,email:user.email,plan:user.plan}},200,C);
}

/* == Documents == */
async function docList(req,env,C){
  const u=await auth(req,env,C);
  const ids=await env.SIGNY_KV.get(`user-docs:${u.userId}`,'json')||[];
  const docs=[];
  for(const id of ids.slice(-50).reverse()){
    const d=await env.SIGNY_KV.get(`doc:${id}`,'json');if(!d)continue;
    if(d.status==='pending'&&new Date(d.expiresAt)<new Date()){d.status='expired';await env.SIGNY_KV.put(`doc:${id}`,JSON.stringify(d))}
    docs.push({id:d.id,title:d.title,status:d.status,amount:d.amount||null,signers:d.signers?.map(s=>({email:s.email,status:s.status,order:s.order})),signerEmail:d.signerEmail,createdAt:d.createdAt,signedAt:d.signedAt,hasSignedPdf:!!(d.signedPdfKey||d.latestPdfKey)});
  }
  const mk=MK(),usage=await env.SIGNY_KV.get(`usage:${u.userId}:${mk}`,'json')||{count:0};
  // Read plan from KV (JWT may be stale after Stripe webhook updates plan)
  const currentPlan=(await env.SIGNY_KV.get(`user:${u.userId}`,'json'))?.plan||'free';
  return J({documents:docs,usage:{count:usage.count,limit:LIMITS[currentPlan]||5},plan:currentPlan},200,C);
}

async function docUpload(req,env,C){
  const u=await auth(req,env,C);
  const mk=MK(),usage=await env.SIGNY_KV.get(`usage:${u.userId}:${mk}`,'json')||{count:0};
  const plan=(await env.SIGNY_KV.get(`user:${u.userId}`,'json'))?.plan||'free';
  if(usage.count>=(LIMITS[plan]||5))return J({error:'Monthly limit reached'},403,C);
  const fd=await req.formData();
  const pdf=fd.get('pdf'),title=clamp(fd.get('title')||'Untitled',200),message=clamp(fd.get('message')||'',2000);
  const customSubject=clamp((fd.get('customSubject')||'').replace(/[\r\n]/g,''),100);
  const rawAmount=fd.get('amount');
  const amount=rawAmount?Math.max(0,parseInt(rawAmount))||null:null;
  if(!pdf||typeof pdf==='string')return J({error:'Missing PDF file'},400,C);
  if(!(await validatePdf(pdf)))return J({error:'Invalid file: PDF required'},400,C);
  let signFields=[];try{signFields=sanitizeFields(JSON.parse(fd.get('signFields')||'[]'))}catch{}
  let signerEmail=fd.get('signerEmail')||'';
  let signers=[];try{signers=JSON.parse(fd.get('signers')||'[]')}catch{}
  if(!signers.length&&signerEmail)signers=[{email:signerEmail,order:1}];
  if(!signers.length)return J({error:'Missing signer'},400,C);
  if(signers.length>10)return J({error:'Max 10 signers'},400,C);
  for(const s of signers){if(!validEmail(s.email))return J({error:`Invalid signer email: ${s.email}`},400,C)}
  const max=SIZES[plan]||SIZES.free;
  if(pdf.size>max)return J({error:`File too large (max ${max/1e6}MB)`},400,C);
  const docId=`doc_${uid()}`,pdfKey=`docs/${docId}/original.pdf`;
  await env.SIGNY_DOCUMENTS.put(pdfKey,pdf.stream(),{httpMetadata:{contentType:'application/pdf'}});
  const now=new Date(),expiryDays=EXPIRY[plan]||EXPIRY.free;
  const signersData=signers.map((s,i)=>({email:s.email,order:s.order||(i+1),signToken:uid(),status:'pending',signedAt:null,remindersSent:0,lastReminderAt:null}));
  const doc={id:docId,ownerId:u.userId,ownerEmail:u.email,title,status:'pending',signerEmail:signers[0]?.email,signers:signersData,message,customSubject:customSubject||null,amount,signFields,pdfKey,signedPdfKey:null,createdAt:now.toISOString(),signedAt:null,expiresAt:new Date(Date.now()+expiryDays*864e5).toISOString(),workflowEnabled:signers.length>1};
  await env.SIGNY_KV.put(`doc:${docId}`,JSON.stringify(doc));
  const uDocs=await env.SIGNY_KV.get(`user-docs:${u.userId}`,'json')||[];uDocs.push(docId);
  await env.SIGNY_KV.put(`user-docs:${u.userId}`,JSON.stringify(uDocs));
  // Track as pending with per-doc key (no shared list = no race condition)
  await env.SIGNY_KV.put(`pending:${docId}`,'1',{expirationTtl:expiryDays*86400+86400});
  usage.count++;await env.SIGNY_KV.put(`usage:${u.userId}:${mk}`,JSON.stringify(usage));
  await auditLog(env,docId,'created',{ownerEmail:u.email,signers:signers.map(s=>s.email)});
  return J({id:docId,status:'pending'},200,C);
}

async function docSend(req,env,C){
  const{documentId}=await req.json();
  const{u,doc}=await ownDoc(documentId,req,env,C);
  if(doc.status!=='pending')return J({error:'Document is not pending'},400,C);
  const toNotify=doc.workflowEnabled?doc.signers.filter(s=>s.status==='pending').sort((a,b)=>a.order-b.order).slice(0,1):doc.signers.filter(s=>s.status==='pending');
  for(const signer of toNotify){
    const signUrl=`${APP(env)}/sign.html?id=${doc.id}&token=${signer.signToken}`;
    const orderInfo=doc.workflowEnabled?`<p style="color:#999;font-size:13px">署名順序: ${signer.order}/${doc.signers.length}番目</p>`:'';
    const orderInfoEn=doc.workflowEnabled?`<p style="color:#999;font-size:13px">Signing order: ${signer.order} of ${doc.signers.length}</p>`:'';
    const msgBlock=doc.message?`<div style="color:#666;margin:12px 0;padding:12px 16px;background:#f5f5f5;border-radius:8px;font-size:14px">${esc(doc.message).replace(/\n/g,'<br>')}</div>`:'';
    const jaBody=`<h2 style="margin:0 0 8px">署名のお願い</h2><p style="color:#666;margin:12px 0"><strong>${esc(doc.ownerEmail)}</strong> さんから署名依頼が届いています。</p><p style="color:#666">ドキュメント: <strong>${esc(doc.title)}</strong></p>${orderInfo}${msgBlock}${acBtn(signUrl,'署名する')}`;
    const enBody=`<h2 style="margin:0 0 8px">Signature Request</h2><p style="color:#666;margin:12px 0"><strong>${esc(doc.ownerEmail)}</strong> has requested your signature.</p><p style="color:#666">Document: <strong>${esc(doc.title)}</strong></p>${orderInfoEn}${msgBlock}${acBtn(signUrl,'Sign Now')}`;
    await mail(env,signer.email,doc.customSubject || `【Signy】署名のお願い / Signature Request - ${doc.title}`,emailWrap(biEmail(jaBody,enBody)));
  }
  await auditLog(env,documentId,'sent',{to:toNotify.map(s=>s.email)});
  return J({ok:true,sentTo:toNotify.map(s=>s.email)},200,C);
}

/* == Bulk Send == */
async function docBulkSend(req,env,C){
  const u=await auth(req,env,C);
  const userData=await env.SIGNY_KV.get(`user:${u.userId}`,'json');
  if(userData?.plan!=='pro')return J({error:'Bulk send requires PRO plan'},403,C);
  const fd=await req.formData();
  const pdf=fd.get('pdf'),title=clamp(fd.get('title')||'Untitled',200),message=clamp(fd.get('message')||'',2000),csvText=fd.get('csv')||'';
  const customSubject=clamp((fd.get('customSubject')||'').replace(/[\r\n]/g,''),100);
  const rawAmountB=fd.get('amount');
  const amountB=rawAmountB?Math.max(0,parseInt(rawAmountB))||null:null;
  let signFields=[];try{signFields=sanitizeFields(JSON.parse(fd.get('signFields')||'[]'))}catch{}
  if(!pdf||!csvText)return J({error:'Missing PDF or CSV'},400,C);
  if(csvText.length>1e6)return J({error:'CSV too large (max 1MB)'},400,C);
  if(typeof pdf==='string'||!(await validatePdf(pdf)))return J({error:'Invalid file: PDF required'},400,C);
  const lines=csvText.split('\n').map(l=>l.trim()).filter(Boolean);
  if(lines.length<2)return J({error:'CSV needs header + rows'},400,C);
  const headers=lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/"/g,''));
  const emailIdx=headers.indexOf('email');
  if(emailIdx===-1)return J({error:'CSV must have "email" column'},400,C);
  const recipients=[];
  for(let i=1;i<lines.length;i++){const cols=lines[i].split(',').map(c=>c.trim().replace(/"/g,''));if(validEmail(cols[emailIdx]||''))recipients.push({email:cols[emailIdx]})}
  if(!recipients.length)return J({error:'No valid emails'},400,C);
  if(recipients.length>100)return J({error:'Max 100 per batch'},400,C);
  const batchId=`batch_${uid()}`,pdfBuf=await pdf.arrayBuffer();
  await env.SIGNY_DOCUMENTS.put(`batches/${batchId}/original.pdf`,pdfBuf,{httpMetadata:{contentType:'application/pdf'}});
  const mk=MK(),usage=await env.SIGNY_KV.get(`usage:${u.userId}:${mk}`,'json')||{count:0};
  const results=[];
  const uDocs=await env.SIGNY_KV.get(`user-docs:${u.userId}`,'json')||[];
  for(const r of recipients){
    const docId=`doc_${uid()}`,signToken=uid(),pdfKey=`docs/${docId}/original.pdf`;
    await env.SIGNY_DOCUMENTS.put(pdfKey,pdfBuf,{httpMetadata:{contentType:'application/pdf'}});
    const doc={id:docId,ownerId:u.userId,ownerEmail:u.email,title,status:'pending',signerEmail:r.email,signers:[{email:r.email,order:1,signToken,status:'pending',signedAt:null,remindersSent:0,lastReminderAt:null}],message,customSubject:customSubject||null,amount:amountB,signFields,pdfKey,signedPdfKey:null,createdAt:new Date().toISOString(),signedAt:null,expiresAt:new Date(Date.now()+EXPIRY.pro*864e5).toISOString(),workflowEnabled:false,batchId};
    await env.SIGNY_KV.put(`doc:${docId}`,JSON.stringify(doc));
    uDocs.push(docId);
    await env.SIGNY_KV.put(`pending:${docId}`,'1',{expirationTtl:EXPIRY.pro*86400+86400});
    const signUrl=`${APP(env)}/sign.html?id=${docId}&token=${signToken}`;
    await mail(env,r.email,customSubject||`【Signy】署名のお願い / Signature Request - ${title}`,emailWrap(biEmail(
      `<h2 style="margin:0 0 8px">署名のお願い</h2><p style="color:#666;margin:12px 0"><strong>${esc(u.email)}</strong> さんから署名依頼が届いています。</p><p style="color:#666">ドキュメント: <strong>${esc(title)}</strong></p>${acBtn(signUrl,'署名する')}`,
      `<h2 style="margin:0 0 8px">Signature Request</h2><p style="color:#666;margin:12px 0"><strong>${esc(u.email)}</strong> has requested your signature.</p><p style="color:#666">Document: <strong>${esc(title)}</strong></p>${acBtn(signUrl,'Sign Now')}`
    )));
    usage.count++;results.push({email:r.email,docId,status:'sent'});
    await auditLog(env,docId,'bulk_sent',{batchId,to:r.email});
  }
  await env.SIGNY_KV.put(`usage:${u.userId}:${mk}`,JSON.stringify(usage));
  await env.SIGNY_KV.put(`user-docs:${u.userId}`,JSON.stringify(uDocs));
  return J({ok:true,batchId,sent:results.length,results},200,C);
}

/* == Sign with workflow + audit == */
async function docGet(docId,url,env,C,req){
  const token=url.searchParams.get('token');
  const doc=await env.SIGNY_KV.get(`doc:${docId}`,'json');
  if(!doc)return J({error:'not_found'},404,C);
  if(doc.status==='cancelled')return J({error:'cancelled'},410,C);
  const signer=doc.signers?.find(s=>s.signToken===token);
  if(!signer)return J({error:'invalid_token'},403,C);
  if(new Date(doc.expiresAt)<new Date())return J({error:'expired'},410,C);
  if(signer.status==='signed')return J({error:'already_signed'},409,C);
  if(doc.workflowEnabled){
    const pendingBefore=doc.signers.filter(s=>s.order<signer.order&&s.status!=='signed');
    if(pendingBefore.length>0)return J({error:'waiting',message:'Waiting for previous signer to complete',queue:signer.order,total:doc.signers.length},200,C);
  }
  await auditLog(env,docId,'opened',ci(req));
  // Filter fields: signer sees only their own fields (signer:N where N = their index)
  // plus 'self' fields as read-only context (owner already filled them, so skip for input)
  const signerIdx = doc.signers.findIndex(s => s.signToken === token);
  const filteredFields = (doc.signFields || []).map((f, origIdx) => ({
    ...f,
    _origIdx: origIdx, // preserve original index for sign submission
    _assigned: f.for === `signer:${signerIdx}` || f.for === 'signer', // true = this signer fills it
    _readonly: f.for === 'self' || (f.for?.startsWith('signer:') && f.for !== `signer:${signerIdx}`),
  }));
  return J({id:doc.id,title:doc.title,ownerEmail:doc.ownerEmail,signFields:filteredFields,signerIndex:signerIdx,signerEmail:signer.email,pdfUrl:`${APP(env)}/api/documents/${docId}/pdf?token=${token}`,signerOrder:signer.order,totalSigners:doc.signers.length,workflowEnabled:doc.workflowEnabled,createdAt:doc.createdAt,expiresAt:doc.expiresAt},200,C);
}

async function docSign(docId,req,env,C){
  const fd=await req.formData();const token=fd.get('token'),signedPdfBlob=fd.get('signedPdf');
  const doc=await env.SIGNY_KV.get(`doc:${docId}`,'json');
  if(!doc)return J({error:'Not found'},404,C);
  if(doc.status==='cancelled')return J({error:'Cancelled'},410,C);
  if(new Date(doc.expiresAt)<new Date())return J({error:'Expired'},410,C);
  const signerIdx=doc.signers?.findIndex(s=>s.signToken===token);
  if(signerIdx===undefined||signerIdx===-1)return J({error:'Invalid token'},403,C);
  const signer=doc.signers[signerIdx];
  if(signer.status==='signed')return J({error:'Already signed'},409,C);
  if(signedPdfBlob&&signedPdfBlob.size>50e6)return J({error:'Signed PDF too large'},400,C);
  const signedAt=new Date().toISOString();
  const signedKey=`docs/${docId}/signed_${signerIdx}.pdf`;
  if(signedPdfBlob&&signedPdfBlob.size>0){
    await env.SIGNY_DOCUMENTS.put(signedKey,await signedPdfBlob.arrayBuffer(),{httpMetadata:{contentType:'application/pdf'}});
    doc.latestPdfKey=signedKey;
  } else {
    // No signed PDF provided - copy latest version so download still works
    const srcKey=doc.latestPdfKey||doc.pdfKey;
    const src=await env.SIGNY_DOCUMENTS.get(srcKey);
    if(src)await env.SIGNY_DOCUMENTS.put(signedKey,await src.arrayBuffer(),{httpMetadata:{contentType:'application/pdf'}});
    doc.latestPdfKey=signedKey;
  }
  signer.status='signed';signer.signedAt=signedAt;
  await auditLog(env,docId,'signed',{signerEmail:signer.email,...ci(req)});
  const allSigned=doc.signers.every(s=>s.status==='signed');
  if(allSigned){
    doc.status='signed';doc.signedAt=signedAt;doc.signedPdfKey=signedKey;
    // Store audit trail
    const logData=await env.SIGNY_KV.get(`log:${docId}`,'json')||{events:[]};
    const origObj=await env.SIGNY_DOCUMENTS.get(doc.pdfKey);
    const origBuf=origObj?await origObj.arrayBuffer():new ArrayBuffer(0);
    await env.SIGNY_KV.put(`audit:${docId}`,JSON.stringify({documentId:docId,title:doc.title,owner:doc.ownerEmail,signers:doc.signers.map(s=>({email:s.email,order:s.order,signedAt:s.signedAt})),events:logData.events,pdfHash:await sha256(origBuf),generatedAt:new Date().toISOString()}));
    // Remove from pending
    await env.SIGNY_KV.delete(`pending:${docId}`);
    // Notify everyone
    const dlUrl=`${APP(env)}/api/documents/${docId}/download?token=${doc.signers[0].signToken}`;
    const signerList=doc.signers.map(s=>`<p style="color:#333;font-size:13px;margin:4px 0">${esc(s.email)} — ${new Date(s.signedAt).toISOString().replace('T',' ').slice(0,19)} UTC</p>`).join('');
    const body=emailWrap(biEmail(
      `<h2 style="margin:0 0 8px">署名が完了しました</h2><p style="color:#666;margin:12px 0">ドキュメント: <strong>${esc(doc.title)}</strong></p><div style="margin:16px 0;padding:12px 16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">${signerList}</div><p style="color:#666;font-size:13px">証跡（監査ログ）付きPDFをダウンロードできます。</p>${acBtn(dlUrl,'署名済みPDFをダウンロード')}`,
      `<h2 style="margin:0 0 8px">Signing Complete</h2><p style="color:#666;margin:12px 0">Document: <strong>${esc(doc.title)}</strong></p><div style="margin:16px 0;padding:12px 16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">${signerList}</div><p style="color:#666;font-size:13px">A signed PDF with audit trail is available for download.</p>${acBtn(dlUrl,'Download Signed PDF')}`
    ));
    await mail(env,doc.ownerEmail,`【Signy】署名完了 / Signed - ${doc.title}`,body);
    for(const s of doc.signers)await mail(env,s.email,`【Signy】署名完了 / Signed - ${doc.title}`,body);
  } else if(doc.workflowEnabled){
    const next=doc.signers.filter(s=>s.status==='pending').sort((a,b)=>a.order-b.order)[0];
    if(next){
      const signUrl=`${APP(env)}/sign.html?id=${doc.id}&token=${next.signToken}`;
      await mail(env,next.email,`【Signy】署名のお願い / Signature Request - ${doc.title}`,emailWrap(biEmail(
        `<h2 style="margin:0 0 8px">署名の順番です</h2><p style="color:#666;margin:12px 0">前の署名者が完了しました。あなたの署名の番です。</p><p style="color:#666">ドキュメント: <strong>${esc(doc.title)}</strong></p><p style="color:#999;font-size:13px">署名順序: ${next.order}/${doc.signers.length}番目</p>${acBtn(signUrl,'署名する')}`,
        `<h2 style="margin:0 0 8px">Your Turn to Sign</h2><p style="color:#666;margin:12px 0">The previous signer has completed. It's your turn now.</p><p style="color:#666">Document: <strong>${esc(doc.title)}</strong></p><p style="color:#999;font-size:13px">Signing order: ${next.order} of ${doc.signers.length}</p>${acBtn(signUrl,'Sign Now')}`
      )));
      await auditLog(env,docId,'workflow_next',{nextSigner:next.email,order:next.order});
    }
  }
  await env.SIGNY_KV.put(`doc:${docId}`,JSON.stringify(doc));
  return J({ok:true,status:allSigned?'signed':'partial',allSigned},200,C);
}

/* == Remind (manual) == */
async function docRemind(docId,req,env,C){
  const{u,doc}=await ownDoc(docId,req,env,C);
  if(doc.status!=='pending')return J({error:'Not pending'},400,C);
  // Throttle: max 1 manual reminder per hour per document
  const lastRemind=doc.signers.reduce((latest,s)=>Math.max(latest,s.lastReminderAt?new Date(s.lastReminderAt).getTime():0),0);
  if(lastRemind&&(Date.now()-lastRemind)<3600000)return J({error:'Reminders are limited to once per hour'},429,C);
  const pending=doc.signers.filter(s=>s.status==='pending');
  for(const s of pending){
    const signUrl=`${APP(env)}/sign.html?id=${doc.id}&token=${s.signToken}`;
    await mail(env,s.email,`【Signy】リマインダー / Reminder: ${doc.title}`,emailWrap(biEmail(
      `<h2 style="margin:0 0 8px">署名リマインダー</h2><p style="color:#666;margin:12px 0">まだ署名が完了していないドキュメントがあります。</p><p style="color:#666">ドキュメント: <strong>${esc(doc.title)}</strong></p>${acBtn(signUrl,'今すぐ署名する')}`,
      `<h2 style="margin:0 0 8px">Signature Reminder</h2><p style="color:#666;margin:12px 0">You have a document awaiting your signature.</p><p style="color:#666">Document: <strong>${esc(doc.title)}</strong></p>${acBtn(signUrl,'Sign Now')}`
    )));
    s.remindersSent=(s.remindersSent||0)+1;s.lastReminderAt=new Date().toISOString();
  }
  await env.SIGNY_KV.put(`doc:${docId}`,JSON.stringify(doc));
  await auditLog(env,docId,'manual_reminder',{to:pending.map(s=>s.email)});
  return J({ok:true,reminded:pending.length},200,C);
}

/* == Cancel Document == */
async function docCancel(docId,req,env,C){
  const{u,doc}=await ownDoc(docId,req,env,C);
  if(doc.status!=='pending')return J({error:'Only pending documents can be cancelled'},400,C);
  doc.status='cancelled';doc.cancelledAt=new Date().toISOString();
  await env.SIGNY_KV.put(`doc:${docId}`,JSON.stringify(doc));
  await env.SIGNY_KV.delete(`pending:${docId}`);
  await auditLog(env,docId,'cancelled',{by:u.email});
  // Notify signers
  for(const s of doc.signers.filter(s=>s.status==='pending')){
    await mail(env,s.email,`【Signy】取消 / Cancelled - ${doc.title}`,emailWrap(biEmail(
      `<h2 style="margin:0 0 8px">署名依頼の取り消し</h2><p style="color:#666;margin:12px 0">以下のドキュメントへの署名依頼が送信者により取り消されました。</p><p style="color:#666">ドキュメント: <strong>${esc(doc.title)}</strong></p><p style="color:#999;font-size:12px;margin-top:16px">このリンクは無効になりました。</p>`,
      `<h2 style="margin:0 0 8px">Signature Request Cancelled</h2><p style="color:#666;margin:12px 0">The signature request for the following document has been cancelled by the sender.</p><p style="color:#666">Document: <strong>${esc(doc.title)}</strong></p><p style="color:#999;font-size:12px;margin-top:16px">This link is no longer valid.</p>`
    )));
  }
  return J({ok:true},200,C);
}

/* == Owner Download (authenticated, no sign token) == */
async function docOwnerDl(docId,req,env,C){
  const{doc}=await ownDoc(docId,req,env,C);
  const key=doc.latestPdfKey||doc.signedPdfKey||doc.pdfKey;
  const obj=await env.SIGNY_DOCUMENTS.get(key);if(!obj)return J({error:'PDF not found'},404,C);
  return new Response(obj.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${encodeURIComponent(doc.title)}_${doc.status}.pdf"`,'X-Content-Type-Options':'nosniff'}});
}

/* == Duplicate Document (re-use PDF + fields for new signers) == */
async function docDuplicate(docId,req,env,C){
  const{doc}=await ownDoc(docId,req,env,C);
  return J({title:doc.title,signFields:doc.signFields,message:doc.message||''},200,C);
}

/* == Auto Reminders (Cron: 0 0 * * *) == */
async function processReminders(env){
  let cursor=null;
  do {
    const listResult=await env.SIGNY_KV.list({prefix:'pending:',limit:100,cursor});
    for(const key of listResult.keys){
      try{
      const docId=key.name.slice(8); // remove 'pending:'
      const doc=await env.SIGNY_KV.get(`doc:${docId}`,'json');
      if(!doc||doc.status!=='pending'){await env.SIGNY_KV.delete(key.name);continue}
      if(new Date(doc.expiresAt)<new Date()){
        doc.status='expired';await env.SIGNY_KV.put(`doc:${docId}`,JSON.stringify(doc));
        await env.SIGNY_KV.delete(key.name);continue;
      }
      const daysSince=(Date.now()-new Date(doc.createdAt).getTime())/864e5;
      let docChanged=false;
      for(const s of doc.signers){
        if(s.status!=='pending')continue;
        const r=s.remindersSent||0;
        let send=false;
        if(r===0&&daysSince>=3)send=true;
        if(r===1&&daysSince>=7)send=true;
        if(send){
          const signUrl=`${APP(env)}/sign.html?id=${doc.id}&token=${s.signToken}`;
          await mail(env,s.email,`【Signy】リマインダー / Reminder: ${doc.title}`,emailWrap(biEmail(
            `<h2 style="margin:0 0 8px">署名リマインダー</h2><p style="color:#666;margin:12px 0">まだ署名が完了していません。</p><p style="color:#666">ドキュメント: <strong>${esc(doc.title)}</strong></p><p style="color:#666">送信者: ${esc(doc.ownerEmail)}</p>${acBtn(signUrl,'今すぐ署名する')}<p style="color:#999;font-size:12px;margin-top:16px">有効期限: ${new Date(doc.expiresAt).toLocaleDateString('ja-JP')}</p>`,
            `<h2 style="margin:0 0 8px">Signature Reminder</h2><p style="color:#666;margin:12px 0">Your signature is still pending.</p><p style="color:#666">Document: <strong>${esc(doc.title)}</strong></p><p style="color:#666">From: ${esc(doc.ownerEmail)}</p>${acBtn(signUrl,'Sign Now')}<p style="color:#999;font-size:12px;margin-top:16px">Expires: ${new Date(doc.expiresAt).toLocaleDateString('en-US')}</p>`
          )));
          s.remindersSent=r+1;s.lastReminderAt=new Date().toISOString();
          await auditLog(env,doc.id,'auto_reminder',{to:s.email,num:s.remindersSent});
          docChanged=true;
        }
      }
      if(docChanged)await env.SIGNY_KV.put(`doc:${docId}`,JSON.stringify(doc));
      }catch(e){console.error(`[Reminder] Error processing ${key.name}: ${e.message}`)}
    }
    cursor=listResult.list_complete?null:listResult.cursor;
  } while(cursor);
}

/* == Doc helpers == */
async function docStatus(docId,env,C){
  const d=await env.SIGNY_KV.get(`doc:${docId}`,'json');if(!d)return J({error:'Not found'},404,C);
  return J({status:d.status,signedAt:d.signedAt},200,C);
}
async function docPdf(docId,url,env,C){
  const token=url.searchParams.get('token');
  const doc=await env.SIGNY_KV.get(`doc:${docId}`,'json');if(!doc)return J({error:'Not found'},404,C);
  if(doc.status==='cancelled')return J({error:'Cancelled'},410,C);
  if(!doc.signers?.some(s=>s.signToken===token))return J({error:'Unauthorized'},403,C);
  // For workflow: serve the latest signed version so next signer sees previous signatures
  const pdfKey=doc.latestPdfKey||doc.pdfKey;
  const obj=await env.SIGNY_DOCUMENTS.get(pdfKey);if(!obj)return J({error:'Not found'},404,C);
  return new Response(obj.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
async function docDl(docId,url,env,C){
  const token=url.searchParams.get('token');
  const doc=await env.SIGNY_KV.get(`doc:${docId}`,'json');if(!doc)return J({error:'Not found'},404,C);
  if(!doc.signers?.some(s=>s.signToken===token))return J({error:'Unauthorized'},403,C);
  const ownerData=await env.SIGNY_KV.get(`user:${doc.ownerId}`,'json');
  if((Date.now()-new Date(doc.createdAt).getTime())/864e5>STORAGE_DAYS)return J({error:'Storage period expired (7 years).'},410,C);
  const obj=await env.SIGNY_DOCUMENTS.get(doc.signedPdfKey||doc.pdfKey);if(!obj)return J({error:'Not found'},404,C);
  return new Response(obj.body,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${encodeURIComponent(doc.title)}_signed.pdf"`,'X-Content-Type-Options':'nosniff'}});
}

/* == Templates == */
async function templateList(req,env,C){
  const u=await auth(req,env,C);
  const ids=await env.SIGNY_KV.get(`user-templates:${u.userId}`,'json')||[];
  const templates=[];
  for(const id of ids.slice(-50).reverse()){const t=await env.SIGNY_KV.get(`tmpl:${id}`,'json');if(t)templates.push({id:t.id,name:t.name,fields:t.fields,createdAt:t.createdAt})}
  return J({templates},200,C);
}
async function templateCreate(req,env,C){
  const u=await auth(req,env,C);
  const userData=await env.SIGNY_KV.get(`user:${u.userId}`,'json');
  if(userData?.plan==='free')return J({error:'Templates require PRO plan'},403,C);
  const{name,fields}=await req.json();if(!name||!fields?.length)return J({error:'Missing fields'},400,C);
  const cleanName=clamp(name,100);
  const cleanFields=sanitizeFields(fields);
  if(!cleanFields.length)return J({error:'No valid fields'},400,C);
  const tmplId=`tmpl_${uid()}`;
  await env.SIGNY_KV.put(`tmpl:${tmplId}`,JSON.stringify({id:tmplId,ownerId:u.userId,name:cleanName,fields:cleanFields,createdAt:new Date().toISOString()}));
  const ut=await env.SIGNY_KV.get(`user-templates:${u.userId}`,'json')||[];ut.push(tmplId);
  await env.SIGNY_KV.put(`user-templates:${u.userId}`,JSON.stringify(ut));
  return J({id:tmplId,ok:true},200,C);
}
async function templateGet(tmplId,req,env,C){
  const u=await auth(req,env,C);
  const t=await env.SIGNY_KV.get(`tmpl:${tmplId}`,'json');
  if(!t||t.ownerId!==u.userId)return J({error:'Not found'},404,C);
  return J(t,200,C);
}
async function templateDelete(tmplId,req,env,C){
  const u=await auth(req,env,C);
  const t=await env.SIGNY_KV.get(`tmpl:${tmplId}`,'json');
  if(!t||t.ownerId!==u.userId)return J({error:'Not found'},404,C);
  await env.SIGNY_KV.delete(`tmpl:${tmplId}`);
  const ut=await env.SIGNY_KV.get(`user-templates:${u.userId}`,'json')||[];
  await env.SIGNY_KV.put(`user-templates:${u.userId}`,JSON.stringify(ut.filter(id=>id!==tmplId)));
  return J({ok:true},200,C);
}

/* == Stripe == */
const STRIPE_API='https://api.stripe.com/v1';
async function stripe(env,endpoint,params={}){
  const body=new URLSearchParams();
  function flatten(obj,prefix=''){for(const[k,v]of Object.entries(obj)){const key=prefix?`${prefix}[${k}]`:k;if(v!==null&&v!==undefined&&typeof v==='object'&&!Array.isArray(v))flatten(v,key);else if(Array.isArray(v))v.forEach((item,i)=>{if(typeof item==='object')flatten(item,`${key}[${i}]`);else body.append(`${key}[${i}]`,String(item))});else if(v!==null&&v!==undefined)body.append(key,String(v))}}
  flatten(params);
  const res=await fetch(`${STRIPE_API}${endpoint}`,{method:'POST',headers:{'Authorization':`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
  const data=await res.json();if(data.error)throw new Error(data.error.message);return data;
}
async function verifyStripeSignature(payload,sigHeader,secret){
  const parts={};for(const item of sigHeader.split(',')){const[k,v]=item.split('=');parts[k.trim()]=v.trim()}
  const timestamp=parts['t'],sig=parts['v1'];if(!timestamp||!sig)return false;
  if(Math.abs(Date.now()/1000-parseInt(timestamp))>300)return false;
  const signed=`${timestamp}.${payload}`;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const expected=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(signed)));
  return[...expected].map(b=>b.toString(16).padStart(2,'0')).join('')===sig;
}
async function stripeCheckout(req,env,C){
  const user=await auth(req,env,C);
  const userData=await env.SIGNY_KV.get(`user:${user.userId}`,'json');
  if(!userData)return J({error:'User not found'},404,C);
  let customerId=userData.stripeCustomerId;
  if(!customerId){const customer=await stripe(env,'/customers',{email:user.email,metadata:{userId:user.userId}});customerId=customer.id;userData.stripeCustomerId=customerId;await env.SIGNY_KV.put(`user:${user.userId}`,JSON.stringify(userData))}
  const session=await stripe(env,'/checkout/sessions',{customer:customerId,mode:'subscription','line_items[0][price]':env.STRIPE_PRICE_PRO,'line_items[0][quantity]':'1',success_url:`${APP(env)}/?checkout=success`,cancel_url:`${APP(env)}/pricing.html?checkout=cancel`,allow_promotion_codes:'true',metadata:{userId:user.userId,plan:'pro'},subscription_data:{metadata:{userId:user.userId,plan:'pro'}}});
  return J({url:session.url},200,C);
}
async function stripePortal(req,env,C){
  const user=await auth(req,env,C);
  const userData=await env.SIGNY_KV.get(`user:${user.userId}`,'json');
  if(!userData?.stripeCustomerId)return J({error:'No subscription'},404,C);
  const session=await stripe(env,'/billing_portal/sessions',{customer:userData.stripeCustomerId,return_url:`${APP(env)}/`});
  return J({url:session.url},200,C);
}
async function stripeWebhook(req,env,C){
  const body=await req.text(),sig=req.headers.get('stripe-signature');
  if(!sig||!env.STRIPE_WEBHOOK_SECRET)return J({error:'Missing signature'},400,C);
  if(!(await verifyStripeSignature(body,sig,env.STRIPE_WEBHOOK_SECRET)))return J({error:'Invalid signature'},401,C);
  const event=JSON.parse(body);console.log(`[Stripe] ${event.type}`);
  switch(event.type){
    case 'checkout.session.completed':{const s=event.data.object;if(s.mode==='subscription'&&s.metadata?.userId)await updateUserPlan(env,s.metadata.userId,'pro');break}
    case 'customer.subscription.updated':{const s=event.data.object;if(s.metadata?.userId&&s.status==='active')await updateUserPlan(env,s.metadata.userId,'pro');break}
    case 'customer.subscription.deleted':{const s=event.data.object;if(s.metadata?.userId)await updateUserPlan(env,s.metadata.userId,'free');break}
  }
  return J({received:true},200,C);
}
async function updateUserPlan(env,userId,plan){
  const userData=await env.SIGNY_KV.get(`user:${userId}`,'json');if(!userData)return;
  const old=userData.plan;userData.plan=plan;userData.planUpdatedAt=new Date().toISOString();
  await env.SIGNY_KV.put(`user:${userId}`,JSON.stringify(userData));
  console.log(`[Plan] ${userId}: ${old} -> ${plan}`);
  await mail(env,userData.email,'【Signy】プラン変更完了',emailWrap(`<h2 style="margin:0 0 8px">プランが変更されました</h2><p style="color:#666;margin:12px 0">新しいプラン: <strong>${plan.toUpperCase()}</strong></p>${plan==='pro'?'<p style="color:#666">署名無制限 / テンプレート / 一括送信 / ワークフロー / 自動リマインダー — 全機能が利用可能です。</p>':''}${acBtn(`${APP(env)}/`,'ダッシュボードを開く')}`));
}
