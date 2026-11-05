/* Pasillo Verde · service worker: la app abre aunque no haya señal en la bodega */
const CACHE = "pasillo-verde-v1";
const BASE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;                         // los envíos a Google Sheets nunca se cachean
  if (url.hostname.includes("script.google")) return;       // datos en vivo: siempre de la red
  if (req.mode === "navigate" || url.origin === location.origin) {
    // Red primero (para recibir actualizaciones); si no hay señal, la copia guardada
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html"))));
    return;
  }
  if (url.hostname.includes("fonts.g")) {                   // tipografías: copia guardada primero
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(req, c)); return res; })));
  }
});
