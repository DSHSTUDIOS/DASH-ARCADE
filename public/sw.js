const cacheName = "dash-arcade-shell-v2";
const routes = new Set(["/", "/play", "/play/", "/host", "/host/"]);
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("dash-arcade-shell-") && key !== cacheName,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range")
  )
    return;
  const page = request.mode === "navigate" && routes.has(url.pathname);
  const immutable = url.pathname.startsWith("/_next/static/");
  if (!page && !immutable) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      if (immutable) {
        const saved = await cache.match(request);
        if (saved) return saved;
      }
      try {
        const response = await fetch(request);
        if (response.ok) {
          const key = page ? new URL(url.pathname, url.origin).href : request;
          await cache.put(key, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        const key = page ? new URL(url.pathname, url.origin).href : request;
        return (
          (await cache.match(key)) ??
          new Response("Dash Arcade needs a connection for this screen.", {
            status: 503,
          })
        );
      }
    })(),
  );
});
