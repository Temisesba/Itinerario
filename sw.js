// Service Worker del Itinerario — permite abrir y editar la app sin conexión.
// Estrategia: red primero, caché solo como respaldo. Mientras haya señal, todo se sirve
// siempre fresco desde la red (igual que antes de que existiera este archivo); la copia en
// caché solo se usa el momento puntual en que el fetch a la red falla de verdad.
const CACHE_NAME = 'itin-shell-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Solo nos metemos con navegaciones (abrir/recargar la página) y pedidos GET al propio
  // dominio — todo lo demás (Apps Script, CDNs, fuentes) pasa directo a la red sin tocar caché,
  // así no interferimos con el manejo de "sin conexión" que ya hace la app para guardar datos.
  const esMismoOrigen = new URL(req.url).origin === self.location.origin;
  if (req.method !== 'GET' || !esMismoOrigen) return;

  event.respondWith(
    fetch(req, { cache: 'reload' }) // "reload" = ir siempre a la red, ignorando la caché HTTP normal del navegador
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then((res) => res || caches.match('itinerario_v55.html')))
  );
});
