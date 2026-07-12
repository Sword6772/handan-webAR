const CACHE_NAME = 'handan-ar-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/data.js',
  '/js/app.js',
  '/js/home.js',
  '/js/culture.js',
  '/js/ar.js',
  '/js/ar-controller.js',
  '/js/game-engine.js',
  '/js/profile.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // 网络优先，失败时回退缓存
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
