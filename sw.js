/* Aves de Alem service worker.
   shell: network-first (updates arrive, works offline) · data/: cache-first, versioned
   BirdNET model, libraries, fonts: cache-first forever · iNaturalist + Wikipedia API: stale-while-revalidate
   photos and map tiles: cache-first with size limits */
const V = 'v8';
const SHELL = 'shell-' + V, MODEL = 'model-v24', DATA = 'data-w1', API = 'api-v2', IMG = 'img-v2', TILE = 'tile-v1';
const SHELL_FILES = ['./index.html', './i18n.js', './guide.js', './world.js', './app.js', './worker.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  const keep = [SHELL, MODEL, DATA, API, IMG, TILE];
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
async function staleWhileRevalidate(req, name, e) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
  if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
  return net;
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
  if (u.host === 'raw.githubusercontent.com' || u.host === 'cdn.jsdelivr.net' || u.host === 'cdnjs.cloudflare.com' || u.host.startsWith('fonts.g')) {
    e.respondWith(cacheFirst(req, MODEL));
    return;
  }
  if (u.host === 'api.inaturalist.org' && /\.png$/.test(u.pathname) || u.host === 'tile.openstreetmap.org') {
    e.respondWith(cacheFirst(req, TILE));
    e.waitUntil(trim(TILE, 800));
    return;
  }
  if (u.host === 'api.inaturalist.org' || u.host.endsWith('wikipedia.org')) {
    e.respondWith(staleWhileRevalidate(req, API, e));
    e.waitUntil(trim(API, 600));
    return;
  }
  if (req.destination === 'image' && /inaturalist|amazonaws/.test(u.host)) {
    e.respondWith(cacheFirst(req, IMG));
    e.waitUntil(trim(IMG, 2500));
    return;
  }
  const base = new URL('./', location.href).pathname;
  if (u.origin === location.origin && u.pathname.startsWith(base)) {
    if (u.pathname.startsWith(base + 'data/')) { e.respondWith(cacheFirst(req, DATA)); return; }
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match('./index.html')));
  }
});
