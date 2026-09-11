const CACHE_VERSION = "ams-static-v1";
const ALLOWED_STATIC_PATHS = ["/_next/static/", "/fonts/", "/pwa-icon-"];
const ALLOWED_STATIC_FILES = new Set(["/ams-favicon.svg"]);

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("ams-static-") && key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const cacheAllowed = ALLOWED_STATIC_FILES.has(url.pathname) || ALLOWED_STATIC_PATHS.some((prefix) => url.pathname.startsWith(prefix));
  if (!cacheAllowed) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request, { cache: "no-cache", credentials: "omit" });
      if (response.ok && response.type === "basic" && !response.headers.has("set-cookie")) await cache.put(request, response.clone());
      return response;
    }),
  );
});
