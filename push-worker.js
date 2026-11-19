// روق: سيرفر الإشعارات (Cloudflare Worker مجاني)
// يستقبل طلب من اللعبة، يتأكد إن المرسل مسجل دخول وإن له علاقة بالمستقبل،
// وبعدين يرسل إشعار للمستقبل عن طريق Firebase Cloud Messaging.
// المفتاح السري يتحط في Cloudflare باسم SA_JSON (محتوى ملف service account كامل).

const PROJECT = "jalsa-c4e8f";
const SITE = "https://rawq-sa.github.io";
const ORIGINS = [SITE];

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : SITE,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin"
    };
    const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("rawq push server OK", { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
    if (!env.SA_JSON) return out({ ok: false, err: "no-secret" }, 500);
    try {
      const cl = await verifyIdToken((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""));
      const from = cl.sub;
      const body0 = await req.json();
      const { to, kind } = body0;
      if (kind === "all") return out(await broadcast(env, from, cl.email, body0));
      if (kind === "iap") return out(await iapGrant(env, from, body0));
      if (typeof to !== "string" || !/^[A-Za-z0-9]{10,40}$/.test(to) || to === from) throw 400;
      const at = await accessToken(env);
      const meDoc = await fsGet(at, `users/${from}`);
      const name = meDoc?.fields?.username?.stringValue || "واحد";
      let title, body, link = SITE + "/";
      if (kind === "invite") {
        const inv = await fsGet(at, `invites/${from}_${to}`); if (!inv) throw 403;
        const code = inv.fields?.code?.stringValue || "";
        title = name; body = `يبيك تلعب معه 🎮 غرفة ${code}`; link += "?r=" + encodeURIComponent(code);
      } else if (kind === "dm") {
        const pid = [from, to].sort().join("_");
        const f = await fsGet(at, `friendships/${pid}`); if (!f) throw 403;
        const ch = await fsGet(at, `chats/${pid}`).catch(() => null);
        const last = ch?.fields?.lastFrom?.stringValue === from ? (ch.fields.last?.stringValue || "").trim() : "";
        title = name; body = last ? (last.length > 120 ? last.slice(0, 117) + "…" : last) : "أرسل لك رسالة 💬"; link += "?dm=" + encodeURIComponent(from);
      } else if (kind === "friend") {
        const r = await fsGet(at, `friendRequests/${from}_${to}`); if (!r) throw 403;
        title = name; body = "أرسل لك طلب صداقة 👋"; link += "?go=friends";
      } else throw 400;

      const tk = await fsGet(at, `pushTokens/${to}`);
      const tokens = (tk?.fields?.tokens?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
      const alive = [];
      for (const t of tokens) {
        const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
          method: "POST",
          headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" },
          body: JSON.stringify({ message: { token: t, data: { title, body, link, tag: kind + "_" + from }, webpush: { headers: { Urgency: "high", TTL: "3600" } }, apns: { headers: { "apns-priority": "10" }, payload: { aps: { alert: { title, body }, sound: "default", "thread-id": kind + "_" + from } } } } })
        });
        if (r.status !== 404 && r.status !== 400) alive.push(t);
      }
      if (alive.length !== tokens.length) await fsSetTokens(at, to, alive);
      return out({ ok: true, sent: alive.length });
    } catch (e) {
      const s = typeof e === "number" ? e : 500;
      if (s === 500) console.error(e);
      return out({ ok: false }, s);
    }
  }
};

/* ---------- التحقق من تسجيل دخول المرسل ---------- */
let jwks = null, jwksAt = 0;
async function verifyIdToken(tok) {
  const parts = tok.split(".");
  if (parts.length !== 3) throw 401;
  const head = JSON.parse(b64urlText(parts[0])), claims = JSON.parse(b64urlText(parts[1]));
  if (!jwks || Date.now() - jwksAt > 3600e3) {
    jwks = (await (await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")).json()).keys;
    jwksAt = Date.now();
  }
  const jwk = jwks.find(k => k.kid === head.kid); if (!jwk) throw 401;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  const now = Date.now() / 1000;
  if (!ok || claims.aud !== PROJECT || claims.iss !== "https://securetoken.google.com/" + PROJECT || !(claims.exp > now) || !claims.sub
    || claims.firebase?.sign_in_provider === "anonymous") throw 401;
  return { sub: claims.sub, email: String(claims.email || "").toLowerCase() };
}

/* ---------- إشعار لكل اللاعبين (المالك بس) ---------- */
// Cloudflare المجاني يسمح بـ ٥٠ طلب بس لكل مرة، فنرسل على دفعات واللعبة تكمل الباقي
async function broadcast(env, from, email, { title, body, cursor }) {
  title = String(title || "").trim().slice(0, 60); body = String(body || "").trim().slice(0, 160);
  if (!title || !body) throw 400;
  const at = await accessToken(env);
  const me = await fsGet(at, `users/${from}`);
  const name = String(me?.fields?.username?.stringValue || "").toLowerCase();
  let ok = name === "b_1";
  if (!ok && name === "jalsah" && email === "jalsahofficial4@gmail.com") {
    const u = await fsGet(at, "usernames/jalsah");
    ok = u?.fields?.uid?.stringValue === from;
  }
  if (!ok) throw 403;
  const page = await (await fetch(FS + "pushTokens?pageSize=8" + (cursor ? "&pageToken=" + encodeURIComponent(cursor) : ""), { headers: { Authorization: "Bearer " + at } })).json();
  let sent = 0;
  for (const d of page.documents || []) {
    const tokens = (d.fields?.tokens?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean).slice(0, 5);
    for (const t of tokens) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
        method: "POST",
        headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token: t, data: { title, body, link: SITE + "/", tag: "all" }, webpush: { headers: { Urgency: "normal", TTL: "86400" } }, apns: { headers: { "apns-priority": "5" }, payload: { aps: { alert: { title, body }, sound: "default" } } } } })
      });
      if (r.ok) sent++;
    }
  }
  return { ok: true, sent, next: page.nextPageToken || null };
}

/* ---------- مفتاح الدخول لـ Firebase من الحساب السري ---------- */
let gTok = null, gExp = 0;
async function accessToken(env) {
  if (gTok && Date.now() < gExp - 60e3) return gTok;
  const sa = JSON.parse(env.SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const enc = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: "RS256", typ: "JWT" }) + "." + enc({
    iss: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging"
  });
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + unsigned + "." + b64url(new Uint8Array(sig))
  });
  const j = await r.json(); if (!j.access_token) throw new Error("token: " + JSON.stringify(j));
  gTok = j.access_token; gExp = Date.now() + (j.expires_in || 3600) * 1000;
  return gTok;
}

/* ---------- قراءة وكتابة Firestore ---------- */
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/`;
const FSN = `projects/${PROJECT}/databases/(default)/documents/`;
async function fsGet(at, path) {
  const r = await fetch(FS + path, { headers: { Authorization: "Bearer " + at } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("fs " + r.status);
  return r.json();
}
async function fsSetTokens(at, uid, tokens) {
  await fetch(FS + `pushTokens/${uid}?updateMask.fieldPaths=tokens`, {
    method: "PATCH", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { tokens: { arrayValue: { values: tokens.map(t => ({ stringValue: t })) } } } })
  }).catch(() => {});
}

/* ---------- الشراء من داخل تطبيق الآيفون ---------- */
// آبل توقّع كل عملية شراء (JWS). نتأكد من التوقيع وسلسلة الشهادات لين شهادة آبل الأساسية،
// وبعدين نفتح المنتج للاعب. كل عملية تنحسب مرة وحدة بس (iapTx/{transactionId}).
const BUNDLE = "sa.rawq.app";
const APPLE_ROOT_G3_SHA256 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";
const ALL_VIP = ["t_royal", "b_royal", "f_gold", "f_fire", "f_sadu", "e_royal", "ns_rainbow"];
const IAP = {
  "sa.rawq.app.starter": { g: ["f_gold", "b_royal", "starter"], d: 7, n: "عرض البداية 🎁", p: "4.99" },
  "sa.rawq.app.back_royal": { g: ["b_royal"], n: "ظهر الورق الملكي", p: "9.99" },
  "sa.rawq.app.frame_gold": { g: ["f_gold"], n: "الإطار الذهبي", p: "14.99" },
  "sa.rawq.app.frame_fire": { g: ["f_fire"], n: "الإطار الناري 🔥", p: "14.99" },
  "sa.rawq.app.frame_sadu": { g: ["f_sadu"], n: "إطار السدو", p: "14.99" },
  "sa.rawq.app.frames3": { g: ["f_gold", "f_fire", "f_sadu"], n: "باقة الإطارات الثلاثة", p: "34.99" },
  "sa.rawq.app.table_royal": { g: ["t_royal"], n: "الطاولة الملكية", p: "19.99" },
  "sa.rawq.app.entry_royal": { g: ["e_royal"], n: "الدخلة الملكية", p: "24.99" },
  "sa.rawq.app.vip.month": { d: 30, n: "اشتراك VIP شهر", p: "29.99" },
  "sa.rawq.app.vip.quarter": { d: 90, n: "اشتراك VIP ٣ شهور", p: "69.99" },
  "sa.rawq.app.vip.year": { d: 365, n: "اشتراك VIP سنة", p: "199.99" },
  "sa.rawq.app.king": { g: [...ALL_VIP, "king"], d: 365, n: "باقة الملك 👑", p: "299.99" }
};
async function iapGrant(env, uid, { jws }) {
  if (typeof jws !== "string" || jws.length > 20000) throw 400;
  const tx = await verifyAppleJws(jws, env.IAP_ROOT_SHA256 || APPLE_ROOT_G3_SHA256);
  const item = IAP[tx.productId];
  if (tx.bundleId !== BUNDLE || !item || !tx.transactionId) throw 400;
  if (tx.revocationDate) return { ok: false, err: "revoked" };
  if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== await acctToken(uid)) return { ok: false, err: "other-account" };
  const at = await accessToken(env);
  const tid = String(tx.transactionId).replace(/[^0-9A-Za-z_-]/g, "");
  const prev = await fsGet(at, `iapTx/${tid}`);
  if (prev && prev.fields?.uid?.stringValue !== uid) return { ok: false, err: "other-account" };
  const fresh = !prev;
  for (let i = 0; i < 3; i++) {
    const u = await fsGet(at, `users/${uid}`); if (!u) throw 404;
    const f = u.fields || {};
    const owned = (f.owned?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
    const newOwned = [...new Set([...owned, ...(item.g || [])])].slice(0, 40);
    const curVip = Number(f.vipUntil?.integerValue || f.vipUntil?.doubleValue || 0);
    const addDays = fresh ? (item.d || 0) : 0;
    const vipUntil = addDays ? Math.max(curVip, Date.now()) + addDays * 864e5 : curVip;
    const writes = [{
      update: { name: FSN + `users/${uid}`, fields: { owned: { arrayValue: { values: newOwned.map(x => ({ stringValue: x })) } }, vipUntil: { integerValue: String(Math.round(vipUntil)) } } },
      updateMask: { fieldPaths: ["owned", "vipUntil"] },
      currentDocument: { updateTime: u.updateTime }
    }];
    if (fresh) writes.push({
      update: { name: FSN + `iapTx/${tid}`, fields: { uid: { stringValue: uid }, product: { stringValue: tx.productId }, env: { stringValue: String(tx.environment || "") }, at: { integerValue: String(Date.now()) } } },
      currentDocument: { exists: false }
    });
    const r = await fetch(FS.replace(/documents\/$/, "documents:commit"), {
      method: "POST", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" }, body: JSON.stringify({ writes })
    });
    if (r.ok) {
      if (fresh) await notifyOwner(at, f.username?.stringValue || "لاعب", item, tx.environment).catch(e => console.error("notify", e));
      return { ok: true, product: tx.productId, fresh, vipUntil: Math.round(vipUntil), owned: newOwned };
    }
    if (r.status !== 400 && r.status !== 409 && r.status !== 412) throw new Error("commit " + r.status + " " + await r.text());
    if (fresh && await fsGet(at, `iapTx/${tid}`)) return { ok: true, product: tx.productId, fresh: false };
  }
  throw 409;
}
// إشعار لصاحب روق (b_1) مع كل شراء جديد
async function notifyOwner(at, buyer, item, envName) {
  const o = await fsGet(at, "usernames/b_1"); const ownerUid = o?.fields?.uid?.stringValue; if (!ownerUid) return;
  const tk = await fsGet(at, `pushTokens/${ownerUid}`);
  const tokens = (tk?.fields?.tokens?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
  const test = String(envName || "").toLowerCase() === "sandbox";
  const title = test ? "🧪 شراء تجريبي" : "💰 شراء جديد!";
  const body = `\u200F@${buyer} اشترى ${item.n} \u200F(${item.p} ر.س)`;
  for (const t of tokens) await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
    method: "POST", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token: t, data: { title, body, link: SITE + "/", tag: "sale" }, webpush: { headers: { Urgency: "high", TTL: "86400" } },
      apns: { headers: { "apns-priority": "10" }, payload: { aps: { alert: { title, body }, sound: "default", "thread-id": "sales" } } } } })
  }).catch(() => {});
}
// نفس الحساب: UUID ثابت من رقم اللاعب (التطبيق يحسبه بنفس الطريقة)
async function acctToken(uid) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("rawq:" + uid))).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x40; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
async function verifyAppleJws(jws, rootSha) {
  const parts = jws.split("."); if (parts.length !== 3) throw 400;
  const head = JSON.parse(b64urlText(parts[0]));
  if (head.alg !== "ES256" || !Array.isArray(head.x5c) || head.x5c.length !== 3) throw 400;
  const certs = head.x5c.map(c => parseCert(Uint8Array.from(atob(c), ch => ch.charCodeAt(0))));
  const rootHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", certs[2].der))].map(b => b.toString(16).padStart(2, "0")).join("");
  if (rootHash !== rootSha) throw 400;
  if (!hasBytes(certs[0].tbs, OID_LEAF) || !hasBytes(certs[1].tbs, OID_INTER)) throw 400;
  const payload = JSON.parse(b64urlText(parts[1]));
  const when = Number(payload.signedDate) || Date.now();
  for (const c of certs) if (!(when >= c.notBefore && when <= c.notAfter)) throw 400;
  for (let i = 0; i < 2; i++) if (!await certSignedBy(certs[i], certs[i + 1])) throw 400;
  const key = await crypto.subtle.importKey("spki", certs[0].spki, { name: "ECDSA", namedCurve: certs[0].curve }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64urlBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) throw 400;
  return payload;
}
const OID_LEAF = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x06, 0x0b, 0x01];
const OID_INTER = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x06, 0x02, 0x01];
const OID_P256 = "2a8648ce3d030107", OID_P384 = "2b81040022", OID_ES256 = "2a8648ce3d040302", OID_ES384 = "2a8648ce3d040303";
function hasBytes(buf, pat) { outer: for (let i = 0; i + pat.length <= buf.length; i++) { for (let j = 0; j < pat.length; j++) if (buf[i + j] !== pat[j]) continue outer; return true; } return false; }
function der(buf, pos) {
  const tag = buf[pos]; let len = buf[pos + 1], hl = 2;
  if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = len * 256 + buf[pos + 2 + i]; hl = 2 + n; }
  return { tag, start: pos, body: pos + hl, end: pos + hl + len };
}
function kids(buf, node) { const out = []; let p = node.body; while (p < node.end) { const k = der(buf, p); out.push(k); p = k.end; } return out; }
const hex = (buf, n) => [...buf.slice(n.body, n.end)].map(b => b.toString(16).padStart(2, "0")).join("");
function derTime(buf, n) {
  const s = new TextDecoder().decode(buf.slice(n.body, n.end));
  const full = n.tag === 0x17 ? (Number(s.slice(0, 2)) < 50 ? "20" : "19") + s : s;
  return Date.UTC(+full.slice(0, 4), +full.slice(4, 6) - 1, +full.slice(6, 8), +full.slice(8, 10), +full.slice(10, 12), +full.slice(12, 14));
}
function parseCert(buf) {
  const cert = der(buf, 0), [tbs, alg, sig] = kids(buf, cert);
  const t = kids(buf, tbs), o = t[0].tag === 0xa0 ? 1 : 0;
  const validity = kids(buf, t[o + 3]), spki = t[o + 5];
  const spkiAlg = kids(buf, kids(buf, spki)[0]);
  const curveHex = hex(buf, spkiAlg[1]);
  const sigBits = buf.slice(sig.body + 1, sig.end);
  return {
    der: buf.slice(0, cert.end), tbs: buf.slice(tbs.start, tbs.end), spki: buf.slice(spki.start, spki.end),
    curve: curveHex === OID_P384 ? "P-384" : curveHex === OID_P256 ? "P-256" : "?",
    sigHash: hex(buf, kids(buf, alg)[0]) === OID_ES384 ? "SHA-384" : "SHA-256", sigDer: sigBits,
    notBefore: derTime(buf, validity[0]), notAfter: derTime(buf, validity[1])
  };
}
async function certSignedBy(child, parent) {
  if (parent.curve === "?") return false;
  const size = parent.curve === "P-384" ? 48 : 32;
  const s = der(child.sigDer, 0), [r, ss] = kids(child.sigDer, s);
  const fix = n => { let b = child.sigDer.slice(n.body, n.end); while (b.length > size && b[0] === 0) b = b.slice(1); const o = new Uint8Array(size); o.set(b, size - b.length); return o; };
  const raw = new Uint8Array(size * 2); raw.set(fix(r), 0); raw.set(fix(ss), size);
  const key = await crypto.subtle.importKey("spki", parent.spki, { name: "ECDSA", namedCurve: parent.curve }, false, ["verify"]);
  return crypto.subtle.verify({ name: "ECDSA", hash: child.sigHash }, key, raw, child.tbs);
}

/* ---------- أدوات ---------- */
function b64url(bytes) { let s = ""; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64urlBytes(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
function b64urlText(s) { return new TextDecoder().decode(b64urlBytes(s)); }
