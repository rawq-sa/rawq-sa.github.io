// روق: عامل خدمة بسيط يخلي اللعبة تنثبّت كتطبيق، ويستقبل الإشعارات.
// يحفظ الملفات اللي عليها رقم نسخة (?v=) ومكتبات فايربيس عشان روق يفتح أسرع،
// وصفحة index.html دايم تجي من النت عشان أي تحديث يوصل على طول.
self.addEventListener("install", () => self.skipWaiting());
const CACHE = "rawq-static-1";
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  const fixed = (u.origin === self.location.origin && u.searchParams.has("v") && /\.(js|css)$/.test(u.pathname))
    || (u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/10.12.2/"))
    || u.hostname === "fonts.gstatic.com";
  if (!fixed) return; // كل شي ثاني (الصفحة، فايربيس) يمشي عادي من النت
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(r);
    // نعرض المحفوظ فورًا، ونجدده من النت بالخلفية (لو انحفظ شي غلط يتصلّح بالفتحة الجاية)
    const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") c.put(r, res.clone()).catch(() => {}); return res; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })());
});

// إشعار جاي من سيرفر روق
self.addEventListener("push", e => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j.notification || j; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "روق";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    lang: "ar",
    dir: "rtl",
    data: { link: d.link || "./" }
  }));
});

// الضغط على الإشعار يفتح روق (أو يرجع لها لو كانت مفتوحة)
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const link = new URL((e.notification.data && e.notification.data.link) || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus();
        if (link.includes("?r=") && "navigate" in c) { try { await c.navigate(link); } catch (err) {} }
        return;
      }
    }
    await self.clients.openWindow(link);
  })());
});
