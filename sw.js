const CACHE = "irontrack-v1";
const URLS = ["/", "/index.html", "/style.css", "/app.js", "/manifest.json", "/irontrack.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS))
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
