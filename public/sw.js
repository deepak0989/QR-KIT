const CACHE_NAME = "qrcraft-offline-v3";
const APP_URL = new URL("/", self.location.origin).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(APP_URL, { cache: "reload" });
    if (!response.ok) throw new Error("QRcraft's offline shell could not be cached.");
    await cache.put(APP_URL, response.clone());

    const html = await response.text();
    const assets = new Set(
      Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), (match) => new URL(match[1], APP_URL))
        .filter((url) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/"))
        .map((url) => url.href)
    );
    await Promise.all(Array.from(assets, async (url) => {
      const asset = await fetch(url);
      if (asset.ok) await cache.put(url, asset);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("qrcraft-offline-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_URL, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(APP_URL)) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
