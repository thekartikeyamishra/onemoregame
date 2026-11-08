/* ONE MORE service worker: notifications only (no offline caching, so pages are always fresh). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = { title: "ONE MORE", body: "Today's arena is live.", url: "/play?utm_source=push", tag: "om-daily" };
  try { if (event.data) msg = Object.assign(msg, event.data.json()); } catch (_) { /* plain text payload */ }
  event.waitUntil(self.registration.showNotification(msg.title, {
    body: msg.body, tag: msg.tag, icon: "/brand/icon-192.png", badge: "/brand/icon-192.png", data: { url: msg.url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/play", self.location.origin);
  if (url.origin !== self.location.origin) return; // only ever open our own pages
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) { if (new URL(w.url).origin === url.origin && "focus" in w) { await w.navigate(url.href).catch(() => {}); return w.focus(); } }
    return self.clients.openWindow(url.href);
  })());
});
