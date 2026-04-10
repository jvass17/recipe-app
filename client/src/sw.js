/**
 * Manual service worker (no Workbox).
 * - Precaches shell URLs (versioned via CACHE_VERSION).
 * - /api/categories: stale-while-revalidate (lists change rarely).
 * - Other /api/*: network-first with cache fallback (search, meal, filter, random).
 * - MealDB images: stale-while-revalidate.
 * - Navigations: network-first; SPA fallback to cached index.html; last resort offline.html.
 */
const CACHE_VERSION = "recipes-v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
/** Must match `client/src/lib/cacheNames.ts` — pinned meal/category images when favoriting. */
const FAVORITE_IMAGE_CACHE = "recipes-favorite-images-v1";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {
      /* ignore missing optional assets during dev */
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                ![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE, FAVORITE_IMAGE_CACHE].includes(k)
            )
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * @param {Request} request
 * @param {string} cacheName
 */
async function networkFirstApi(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    const contentType = res.headers.get("Content-Type") || "";
    const isJson = contentType.includes("application/json");
    if (res.ok && isJson) {
      await cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ meals: null, error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Stale-while-revalidate: return cached immediately if present; always update cache in background.
 * @param {Request} request
 * @param {string} cacheName
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      const contentType = res.headers.get("Content-Type") || "";
      const isJson = contentType.includes("application/json");
      if (res.ok && isJson) {
        cache.put(request, res.clone());
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }
  const network = await networkPromise;
  if (network) return network;
  return new Response(JSON.stringify({ categories: [] }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Remote images: favorites bucket first (explicit saves), then general image SWR.
  if (
    url.hostname.includes("themealdb.com") ||
    (request.destination === "image" && url.origin !== self.location.origin)
  ) {
    event.respondWith(
      (async () => {
        const pinned = await caches.open(FAVORITE_IMAGE_CACHE);
        const pinnedHit = await pinned.match(request);
        if (pinnedHit) return pinnedHit;
        return staleWhileRevalidate(request, IMAGE_CACHE);
      })()
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // Category list: stale-while-revalidate (matches prompt spec).
  if (url.pathname.startsWith("/api/categories")) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Other API: network-first with cache fallback (meal details, search, filter, random).
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstApi(request, RUNTIME_CACHE));
    return;
  }

  // SPA navigations: try network; fall back to cached shell; then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => {
          const shell = await caches.match("/index.html");
          if (shell) return shell;
          const offline = await caches.match("/offline.html");
          if (offline) return offline;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  // Vite build assets: SWR so repeat visits are fast while staying fresh.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const fallback = await caches.match(request);
      if (fallback) return fallback;
      return new Response("Offline", { status: 503, statusText: "Offline" });
    })
  );
});
