// Offline support: the app shell and the "Помогни" screen (with 112) must open with no signal.
// Bump VERSION when the list below changes.
// Pages and API data: network first, cached copy if offline. Static assets: cache first.
const VERSION = "v4";
const SHARED = "ogneshtit-shared";
const SHELL = ["/", "/karta", "/pozhari", "/pomogni", "/pomogni/kamion", "/pomogni/signal", "/nastroiki", "/manifest.webmanifest", "/app-icon/192"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== SHARED).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const path = new URL(req.url).pathname;

  // Share target: keep the shared photos for the report form, then open it.
  if (req.method === "POST" && path === "/share-target") {
    e.respondWith(
      (async () => {
        const form = await req.formData();
        const files = form.getAll("photos").filter((f) => f instanceof File).slice(0, 6);
        const cache = await caches.open(SHARED);
        for (const k of await cache.keys()) await cache.delete(k);
        await Promise.all(
          files.map((f, i) => cache.put(`/shared/${i}`, new Response(f, { headers: { "content-type": f.type, "x-name": encodeURIComponent(f.name) } }))),
        );
        const text = [form.get("title"), form.get("text")].filter(Boolean).join(" ");
        return Response.redirect(`/pomogni/signal?shared=${files.length}${text ? `&text=${encodeURIComponent(text)}` : ""}`, 303);
      })(),
    );
    return;
  }
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // other sites (geocoding, ticket photos) go straight to the network

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((hit) => hit || (req.mode === "navigate" ? caches.match("/pomogni") : undefined))
          .then((hit) => hit || new Response("Няма връзка / No connection", { status: 503 })),
      ),
  );
});

// Push alerts: show the notification, and open the right screen when it is tapped.
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title || "ОгнеЩит", {
      body: data.body || "",
      icon: "/app-icon/192",
      badge: "/app-icon/192",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.navigate(url).then((w) => (w || c).focus());
      return self.clients.openWindow(url);
    }),
  );
});
