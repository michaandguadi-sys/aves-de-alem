/* Aves de Alem service worker: offline shell, offline BirdNET model, cached iNaturalist data. */
const V = 'v2';
const SHELL = 'shell-' + V, MODEL = 'model-v24', DATA = 'inat-' + V, IMG = 'img-' + V;
const SHELL_FILES = ['./', './index.html', './app.js', './guide.js', './worker.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![SHELL, MODEL, DATA, IMG].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone());
  return res;
}
async function networkFirst(req, name) {
  const c = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await c.match(req);
    if (hit) return hit;
    throw e;
  }
}
async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // BirdNET model, labels, tfjs, fonts: immutable, cache forever
  if (u.host === 'raw.githubusercontent.com' || u.host === 'cdn.jsdelivr.net' || u.host === 'fonts.gstatic.com' || u.host === 'fonts.googleapis.com') {
    e.respondWith(cacheFirst(req, MODEL));
    return;
  }
  if (u.host === 'api.inaturalist.org') {
    e.respondWith(networkFirst(req, DATA));
    e.waitUntil(trim(DATA, 400));
    return;
  }
  if (req.destination === 'image' && /inaturalist|amazonaws/.test(u.host)) {
    e.respondWith(cacheFirst(req, IMG));
    e.waitUntil(trim(IMG, 600));
    return;
  }
  if (u.origin === location.origin && u.pathname.startsWith(new URL('./', location.href).pathname)) {
    // app shell: network first so updates arrive, cache when offline
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match('./index.html')));
  }
});
