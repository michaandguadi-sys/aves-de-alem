// Aves de Alem relay: lets everyone use Photo ID and ornithologist notes on the owner's
// Anthropic key, without the key ever reaching a phone. No dependencies (Node 20+).
// It only does two fixed jobs (bird photo ID, species notes), validates every input,
// limits requests per person and per day, and caches notes so each species is written once.
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const PORT = +process.env.PORT || 8080;
const PER_IP_DAILY = +process.env.PER_IP_DAILY || 25;
const GLOBAL_DAILY = +process.env.GLOBAL_DAILY || 400;
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const SITE = process.env.SITE_DIR || '/site';
const CACHE = process.env.CACHE_DIR || '/cache';
if (!KEY) { console.error('ANTHROPIC_API_KEY missing'); process.exit(1); }

// species index from the site's own data, used to validate names and add trait data
const idx = JSON.parse(await readFile(`${SITE}/data/idx.json`, 'utf8'));
const bySci = new Map(idx.s.map(r => [r[0], r]));
const detCache = new Map();
async function details(sci) {
  const r = bySci.get(sci); if (!r) return {};
  if (!detCache.has(r[3])) detCache.set(r[3], JSON.parse(await readFile(`${SITE}/data/d/${r[3]}.json`, 'utf8').catch(() => '{}')));
  return detCache.get(r[3])[sci] || {};
}

// rate limits (in memory, reset daily)
let day = new Date().toISOString().slice(0, 10), global = 0;
const perIp = new Map();
function allow(ip) {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== day) { day = d; global = 0; perIp.clear(); }
  if (global >= GLOBAL_DAILY) return 'The free daily limit of this app is used up. Try again tomorrow, or add your own API key in the Photo tab.';
  const n = perIp.get(ip) || 0;
  if (n >= PER_IP_DAILY) return `You reached today's limit of ${PER_IP_DAILY} requests. Try again tomorrow, or add your own API key in the Photo tab.`;
  perIp.set(ip, n + 1); global++; return null;
}

async function claude(content, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'upstream ' + r.status);
  return d.content.map(c => c.text || '').join('');
}

const SCI = /^[A-Z][a-z]+ [a-z]+(?:-[a-z]+)?$/;
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f<>`]/g, ' ').slice(0, max);

async function identify(b) {
  const img = String(b.image || '');
  if (!/^\/9j\//.test(img) || img.length > 2_400_000) throw Object.assign(new Error('Send one JPEG photo under 1.8 MB.'), { code: 400 });
  const lat = num(b.lat, -90, 90), lon = num(b.lon, -180, 180);
  const lang = b.lang === 'es' ? 'es' : 'en';
  const local = (Array.isArray(b.local) ? b.local : []).filter(s => typeof s === 'string' && SCI.test(s) && bySci.has(s)).slice(0, 250)
    .map(s => { const r = bySci.get(s); return `${s} (${lang === 'es' && r[2] ? r[2] : r[1]})`; }).join('; ');
  const prompt = `You are an expert field ornithologist. Location: lat ${lat ?? '?'}, lon ${lon ?? '?'}, date ${new Date().toISOString().slice(0, 10)}. User notes: ${clean(b.notes, 300) || 'none'}.
Species expected near this location (prior, not exhaustive): ${local || 'unknown'}
Identify the bird in the photo. Weigh visible field marks first, the location prior second. If it is not a bird or too unclear, say so with low confidence.
${lang === 'es' ? 'Write the marks, separate and tip fields in Spanish (Argentina). ' : ''}Reply with ONLY JSON: {"candidates":[{"sci":"Genus species","common_es":"","common_en":"","confidence":0-100,"marks":"visible field marks supporting this, max 35 words"}],"separate":"how to tell the top two apart, max 30 words","tip":"what to photograph or listen for to confirm, max 25 words"} with 1-3 candidates, best first. Never invent marks you cannot see.`;
  return claude([{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } }, { type: 'text', text: prompt }], 900);
}

async function wiki(sci, lang) {
  const det = await details(sci); const t = (det.w || [])[lang === 'es' ? 1 : 0] || sci;
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(t)}`;
  try { const d = await (await fetch(u, { headers: { 'user-agent': 'AvesDeAlem/1.0 (personal bird app)' } })).json(); return (Object.values(d.query?.pages || {})[0]?.extract || '').slice(0, 9000); } catch { return ''; }
}
async function notes(b) {
  const sci = String(b.sci || ''); if (!SCI.test(sci) || !bySci.has(sci)) throw Object.assign(new Error('Unknown species.'), { code: 400 });
  const lang = b.lang === 'es' ? 'es' : 'en';
  const file = `${CACHE}/notes/${lang}/${sci.replace(' ', '_')}.txt`;
  if (existsSync(file)) return { text: await readFile(file, 'utf8'), cached: true };
  const r = bySci.get(sci), det = await details(sci);
  let text = await wiki(sci, lang); if (text.length < 400 && lang === 'es') text = await wiki(sci, 'en');
  let sim = '';
  if (r[4]) { try { const d = await (await fetch(`https://api.inaturalist.org/v2/identifications/similar_species?taxon_id=${r[4]}&fields=(taxon:(name:!t,rank:!t))`)).json(); sim = (d.results || []).filter(x => x.taxon?.rank === 'species').slice(0, 8).map(x => x.taxon.name).join(', '); } catch {} }
  const prompt = `You are a field ornithologist writing a concise species account for birders.
Species: ${sci} (${lang === 'es' && r[2] ? r[2] : r[1]}).
Data: body mass ${det.m || '?'} g; diet % ${JSON.stringify(det.di || [])} (order: invertebrates, endotherms, ectotherms, fish, other vertebrates, carrion, fruit, nectar, seeds, other plants); foraging strata % ${JSON.stringify(det.fs || [])}; species iNaturalist users confuse it with: ${sim || 'unknown'}.
Reference text (Wikipedia, may be incomplete):
${text || '(none)'}
Write in ${lang === 'es' ? 'Spanish (Argentina)' : 'English'}. Use these headings with short paragraphs or bullets: Identification (size, adult male, adult female, juvenile, key field marks), Voice, Similar species and how to separate them, Habitat and range, Behaviour and diet, Breeding, Movements, Conservation. Mark anything uncertain. Do not invent measurements not supported by the data. Use '## ' for headings and '- ' for bullets. Max 450 words.`;
  const out = await claude([{ type: 'text', text: prompt }], 1400);
  await mkdir(`${CACHE}/notes/${lang}`, { recursive: true }); await writeFile(file, out);
  return { text: out, cached: false };
}

// Client IP for rate limits. Never trust a client-sent X-Real-IP. The relay is only reachable
// through Traefik on the private Docker network; Traefik appends the real peer address as the
// LAST X-Forwarded-For entry, which a client cannot forge. Direct callers use the socket address.
const PRIVATE = /^(::ffff:)?(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)|^::1$/;
function clientIp(req) {
  const peer = req.socket.remoteAddress || '';
  if (!PRIVATE.test(peer)) return peer;
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : peer;
}

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(obj));
}
http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://x').pathname;
    if (req.method === 'GET' && path === '/api/health') return send(res, 200, { ok: true, photo: true, notes: true, perIpDaily: PER_IP_DAILY });
    if (req.method !== 'POST' || !['/api/identify', '/api/notes'].includes(path)) return send(res, 404, { error: 'Not found' });
    if (ORIGINS.length && !ORIGINS.includes(req.headers.origin || '')) return send(res, 403, { error: 'Not allowed' });
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'JSON only' });
    let size = 0; const chunks = [];
    for await (const c of req) { size += c.length; if (size > 2_600_000) return send(res, 413, { error: 'Photo too large' }); chunks.push(c); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (path === '/api/notes') {
      const sci = String(body.sci || ''); const lang = body.lang === 'es' ? 'es' : 'en';
      const cachedFile = `${CACHE}/notes/${lang}/${sci.replace(' ', '_')}.txt`;
      if (!(SCI.test(sci) && existsSync(cachedFile))) { const lim = allow(clientIp(req)); if (lim) return send(res, 429, { error: lim }); }
      return send(res, 200, await notes(body));
    }
    const lim = allow(clientIp(req)); if (lim) return send(res, 429, { error: lim });
    return send(res, 200, { text: await identify(body) });
  } catch (e) {
    console.error(new Date().toISOString(), e.message);
    return send(res, e.code || 502, { error: e.code ? e.message : 'The bird ID service failed. Please try again.' });
  }
}).listen(PORT, () => console.log(`relay on :${PORT}, model ${MODEL}, ${PER_IP_DAILY}/person/day, ${GLOBAL_DAILY}/day total`));
