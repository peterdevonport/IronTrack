const CACHE = "irontrack-__DEPLOY_VER__";
const URLS = ["./", "./index.html", "./style.css", "./app.js", "./manifest.json",
  "./favicon.ico", "./icon-16x16.png", "./icon-32x32.png",
  "./icon-48x48.png", "./icon-64x64.png", "./icon-96x96.png",
  "./icon-128x128.png", "./icon-144x144.png", "./icon-152x152.png",
  "./icon-192x192.png", "./icon-256x256.png", "./icon-512x512.png",
  "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith("http")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
