// Service worker de "Hotel Dino Blu — Turno de Limpieza 3D".
// IMPORTANTE: al añadir/renombrar archivos del juego, sube la versión de CACHE
// — si no, los jugadores instalados verán la versión vieja.
// Estrategia: precachea solo el SHELL crítico para arrancar; las texturas, modelos
// 3D y loaders (muchos archivos) se cachean en runtime (stale-while-revalidate).
const CACHE = 'hotel-dino-blu-v1';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './i18n.js',
  './manifest.webmanifest',
  './lib/three.module.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll falla si UN archivo no responde 200; cacheamos uno a uno con tolerancia.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first con actualización en segundo plano (stale-while-revalidate):
// el juego abre al instante (incluso offline) y se refresca solo para la próxima visita.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fresh = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached); // offline: sirve lo cacheado
      return cached || fresh;
    })
  );
});
