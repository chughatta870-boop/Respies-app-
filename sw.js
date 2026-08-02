/* ریسپیز — M Ijaz · GHS 124/NB — Service Worker
   NOTE: bump CACHE_VERSION (e.g. "recipes-v2") every time you update any
   cached file, otherwise phones will keep serving the old cached copy. */

const CACHE_VERSION = "recipes-v1";
const FONT_CACHE = "recipes-fonts-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./data.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-16.png",
  "./icons/favicon-32.png",
  "./screenshots/screenshot-narrow-1.png",
  "./screenshots/screenshot-wide-1.png"
];

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Cache each asset independently so one bad/missing file on a flaky
      // mobile connection doesn't fail the whole install.
      return Promise.allSettled(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[sw] cache skip:", url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isFontRequest(url) {
  return FONT_HOSTS.indexOf(url.hostname) !== -1;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle http/https — ignore chrome-extension:, data:, etc.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Urdu web fonts: cache-first, long-lived, separate cache (rarely change).
  if (isFontRequest(url)) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req)
            .then((response) => {
              if (response && response.ok) {
                cache.put(req, response.clone());
              }
              return response;
            })
            .catch(() => cached); // still nothing offline on first-ever load — acceptable, system font falls back
        })
      )
    );
    return;
  }

  // App shell / same-origin assets: cache-first, refresh in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => null);

      return cached || network.then((res) => {
        if (res) return res;
        // Nothing cached and network failed — for a page navigation, fall
        // back to the cached app shell so the user still sees the app
        // instead of a browser error page.
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
