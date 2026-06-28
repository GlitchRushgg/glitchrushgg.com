// Service worker de "Don't Drown, Noah!"
// IMPORTANTE: al añadir/renombrar archivos del juego, añádelos a ASSETS
// y sube la versión de CACHE — si no, los jugadores instalados verán la versión vieja.
const CACHE = 'noah-v10';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './src/main.js',
  './src/scenes/BootScene.js',
  './src/scenes/MenuScene.js',
  './src/scenes/GameScene.js',
  './src/scenes/UIScene.js',
  './src/scenes/WinScene.js',
  './src/scenes/GameOverScene.js',
  './src/utils/Graphics.js',
  './src/utils/SoundManager.js',
  './src/utils/Scores.js',
  './src/utils/Share.js',
  './src/utils/ResultCard.js',
  './assets/noah.png',
  './assets/ark.png',
  './assets/ark-open.png',
  './assets/platform.png',
  './assets/iceplatform.png',
  './assets/water.png',
  './assets/background.png',
  './assets/raindrop.png',
  './assets/images/elephant.png',
  './assets/images/giraffe.png',
  './assets/images/lion.png',
  './assets/images/zebra.png',
  './assets/images/monkey.png',
  './assets/images/rabbit.png',
  './assets/images/penguin.png',
  './assets/images/bear.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/phaser@3.88.0/dist/phaser.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
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
