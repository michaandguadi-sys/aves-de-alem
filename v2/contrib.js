/* Aves de Alem v2 (test): Science mode.
   Turns casual birding into data researchers use:
   - Bird count: timed, GPS-tracked counts with a "did you report everything?" answer
     (eBird's complete-checklist standard, which tells scientists what was NOT there too)
   - eBird export (eBird Record Format CSV, 19 columns, no header)
   - Your impact: effort totals, the data gap where you stand, possible local firsts,
     migrant arrival dates, iNaturalist evidence helper
   - Science missions that pay XP and badges for the things that make data valuable.
   Loads on top of the v1 app (same journal and game); keeps its own store 'aves-science'. */
(()=>{
'use strict';
const CL=[];                       // finished checklists
let watchId=null, tickTimer=null;
const SDB={p:null,
  open(){return this.p||(this.p=new Promise((res,rej)=>{const r=indexedDB.open('aves-science',1);r.onupgradeneeded=()=>{r.result.createObjectStore('checklists',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
  async tx(mode,fn){const d=await this.open();return new Promise((res,rej)=>{const t=d.transaction('checklists',mode),q=fn(t.objectStore('checklists'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)})},
  all(){return this.tx('readonly',s=>s.getAll())}, put(v){return this.tx('readwrite',s=>s.put(v))}, del(id){return this.tx('readwrite',s=>s.delete(id))}};

/* ---------- helpers ---------- */
const active=()=>LS.get('activeCount',null);
const saveActive=c=>LS.set('activeCount',c);
const hav=(a,b,c,d)=>{const R=6371e3,r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const mmss=ms=>{const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:`${m}:${String(s%60).padStart(2,'0')}`};
const km=m=>(m/1000).toFixed(m<10000?2:1);
const ES_=()=>I18N.lang==='es';
const fmtDate=ts=>new Date(ts).toLocaleDateString(ES_()?'es-AR':'en-GB',{weekday:'short',day:'numeric',month:'short'});
const fmtTime=ts=>new Date(ts).toLocaleTimeString(ES_()?'es-AR':'en-GB',{hour:'2-digit',minute:'2-digit'});
async function cachedJSON(url,ttlH=24){const k='sc:'+url;const c=LS.get(k,null);if(c&&Date.now()-c.t<ttlH*36e5)return c.d;
  const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();LS.set(k,{t:Date.now(),d});return d}
function nameOf(sci){const r=WORLD.ready&&WORLD.bySci.get(sci);if(r)return wName(r);const g=GUIDE[sci];return g?NM(g):sci}
function enName(sci){const r=WORLD.ready&&WORLD.bySci.get(sci);const g=GUIDE[sci];let n=(r&&r[1])||(g&&g.en)||'';if(n==='Rock Pigeon')n='Rock Pigeon (Feral Pigeon)';return n}
const clean=s=>String(s??'').replace(/["\r\n]+/g,' ').replace(/,/g,';').trim();

/* ---------- styles ---------- */
document.head.insertAdjacentHTML('beforeend',`<style>
#countPill{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(66px + env(safe-area-inset-bottom,0px));z-index:21;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:8px 14px 8px 12px;background:var(--ink);color:var(--bg);font:600 14px var(--font);box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;white-space:nowrap}
#countPill i{width:9px;height:9px;border-radius:50%;background:#FF453A;animation:cpulse 1.6s infinite}
@keyframes cpulse{50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){#countPill i{animation:none}}
body.counting .app{padding-bottom:calc(150px + env(safe-area-inset-bottom,0px))}
.cstart{display:flex;align-items:center;gap:12px;padding:10px 12px 10px 14px}
.cstart .grow{flex:1;min-width:0}
.cstart b{display:block;font:600 16px/1.25 var(--font)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center}
.kpis b{display:block;font:700 22px/1.1 var(--font-d)}
.kpis span{font-size:12px;color:var(--ink2)}
.citem{display:flex;align-items:center;gap:10px;padding:8px 12px;min-height:52px}
.citem+.citem{box-shadow:inset 0 .5px 0 var(--sep)}
.citem .grow{flex:1;min-width:0}
.citem b{display:block;font:600 16px/1.2 var(--font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.citem small{font-size:12px;color:var(--ink2)}
.stepper{display:flex;align-items:center;gap:2px}
.stepper button{width:34px;height:34px;border:0;border-radius:50%;background:var(--fill);font:600 20px/1 var(--font);cursor:pointer;color:var(--ink)}
.stepper output{min-width:34px;text-align:center;font:700 17px var(--font)}
.sugg button{display:flex;width:100%;gap:8px;align-items:baseline;border:0;background:none;padding:10px 12px;text-align:left;cursor:pointer;color:var(--ink);font:inherit}
.sugg button+button{box-shadow:inset 0 .5px 0 var(--sep)}
.sugg small{color:var(--ink2);font-style:italic;font-size:13px}
.yesno{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.yesno button{border:2px solid transparent;background:var(--surface);border-radius:var(--r);padding:12px;font:600 15px var(--font);cursor:pointer;color:var(--ink);box-shadow:var(--shadow)}
.yesno button[aria-pressed=true]{border-color:var(--tint);background:var(--tint-soft)}
.gap{display:flex;gap:12px;align-items:center}
.gap .dial{flex:none;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font:700 13px var(--font);color:#fff}
.mis{display:flex;gap:12px;align-items:center;padding:10px 14px}
.mis+.mis{box-shadow:inset 0 .5px 0 var(--sep)}
.mis .grow{flex:1;min-width:0}
.mis b{font:600 15px/1.25 var(--font)}
.mis .ok{color:var(--green);font-weight:700}
.top .eyebrow{white-space:nowrap;flex:none}
#locBtn{flex:0 1 auto!important;min-width:0!important;max-width:min(44vw,128px)!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v2tag{font:700 10px var(--font);letter-spacing:.06em;background:var(--tint);color:var(--tint-ink);border-radius:5px;padding:2px 5px;margin-left:6px;vertical-align:2px}
</style>`);

/* ---------- Spanish ---------- */
Object.assign(ES,{
'Bird count':'Conteo de aves','Start a bird count':'Empezar un conteo','Start':'Empezar','Continue count':'Seguir conteo','Counting':'Contando',
'Count every bird you see or hear. Your list becomes science.':'Contá cada ave que ves u oís. Tu lista se vuelve ciencia.',
'Minimize':'Minimizar','Finish':'Terminar','time':'tiempo','km':'km','species':'especies','birds':'aves',
'Add a bird: name in any language':'Agregar ave: nombre en cualquier idioma',
'Count every bird you identify, including the common ones. Common birds are the backbone of population trends.':'Contá cada ave que identifiques, también las comunes. Las aves comunes son la base de las tendencias poblacionales.',
'Birds you log from Sound ID or Photo ID while counting are added automatically.':'Las aves que registres con ID por sonido o por foto mientras contás se suman solas.',
'No birds yet.':'Todavía no hay aves.','Discard count':'Descartar conteo','Discard this count?':'¿Descartar este conteo?',
'Did you report every bird you could identify?':'¿Anotaste todas las aves que pudiste identificar?',
'Yes, all of them':'Sí, todas','No, only some':'No, solo algunas',
'This is the most important question. A complete list also tells scientists which birds were not there, and that is what makes population trends possible.':'Es la pregunta más importante. Una lista completa también les dice a los científicos qué aves no estaban, y eso es lo que permite medir tendencias poblacionales.',
'Observers':'Observadores','Duration (minutes)':'Duración (minutos)','Distance walked (km)':'Distancia recorrida (km)','Comments':'Comentarios',
'Habitat, weather, anything unusual':'Hábitat, clima, algo fuera de lo común','Save checklist':'Guardar lista',
'Please answer the question above.':'Respondé la pregunta de arriba.','Add at least one bird.':'Agregá al menos un ave.',
'Checklist saved':'Lista guardada','Complete checklist':'Lista completa','Incomplete checklist':'Lista incompleta',
'This is real data.':'Esto es un dato real.','What happens next':'Qué pasa después',
'Send it to eBird (button below). It takes 30 seconds.':'Mandala a eBird (botón de abajo). Tarda 30 segundos.',
'Regional volunteer reviewers check unusual records.':'Revisores voluntarios regionales controlan los registros inusuales.',
'It joins the eBird dataset researchers download to study bird populations, and it is shared with GBIF.':'Se suma al conjunto de datos de eBird que los investigadores descargan para estudiar poblaciones de aves, y se comparte con GBIF.',
'Export for eBird':'Exportar para eBird','Open eBird import':'Abrir importación de eBird','Done':'Listo',
'How to send it':'Cómo mandarla','Export the file.':'Exportá el archivo.','On ebird.org/import sign in and choose "eBird Record Format".':'En ebird.org/import iniciá sesión y elegí "eBird Record Format".','Upload the file and confirm the location.':'Subí el archivo y confirmá la ubicación.',
'Science':'Ciencia','Your contribution to science':'Tu aporte a la ciencia','checklists':'listas','records':'registros','hours':'horas',
'waiting to be sent to eBird':'esperando ser enviadas a eBird','All your checklists are exported. Thank you!':'Todas tus listas están exportadas. ¡Gracias!',
'Where you stand':'Donde estás','Data gap':'Vacío de datos','Thinly covered':'Poco cubierto','Well covered':'Bien cubierto',
'Your counts here are rare data. Every complete checklist fills a real gap on the map.':'Tus conteos acá son datos escasos. Cada lista completa llena un vacío real en el mapa.',
'Few people record birds here. Regular counts make this place visible to science.':'Poca gente registra aves acá. Conteos regulares hacen visible este lugar para la ciencia.',
'Many records already. Repeat counts at the same spot still build long-term trends.':'Ya hay muchos registros. Repetir conteos en el mismo lugar igual construye tendencias a largo plazo.',
'Possible local firsts':'Posibles primeros registros locales',
'You logged these, but iNaturalist has no verified record within 10 km. A photo or recording would put them on the map.':'Registraste estas especies, pero iNaturalist no tiene registros verificados a menos de 10 km. Una foto o grabación las pondría en el mapa.',
'Names can differ between taxonomies. Double-check before claiming a first.':'Los nombres pueden variar entre taxonomías. Verificá antes de decir que es un primer registro.',
'Migration watch':'Vigilancia de migración',
'Arrival dates are a climate signal: researchers compare them across years. Log the first one you see each season.':'Las fechas de llegada son una señal del clima: los investigadores las comparan entre años. Registrá la primera que veas cada temporada.',
'not yet this season':'todavía no esta temporada',
'Ready for iNaturalist':'Listos para iNaturalist',
'Sightings with your own photo. On iNaturalist, once others confirm the ID, they become Research Grade and go to GBIF.':'Avistajes con tu propia foto. En iNaturalist, cuando otros confirman la ID, pasan a Grado de Investigación y van a GBIF.',
'Science missions':'Misiones científicas','Your checklists':'Tus listas','exported':'exportada','not exported':'sin exportar',
'Delete checklist':'Borrar lista','Delete this checklist? The sightings stay in your journal.':'¿Borrar esta lista? Los avistajes quedan en tu diario.',
'Add to iNaturalist':'Agregar a iNaturalist','Share photo':'Compartir foto','Save photo':'Guardar foto','Copy species name':'Copiar nombre de la especie',
'Open iNaturalist':'Abrir iNaturalist','Mark as uploaded':'Marcar como subido','Uploaded to iNaturalist':'Subido a iNaturalist',
'Copied':'Copiado','Export failed':'Falló la exportación','Location for this count':'Ubicación del conteo',
'GPS track on. Keep this page open for the distance to count.':'GPS activado. Dejá esta página abierta para que cuente la distancia.',
'No GPS: enter the distance when you finish.':'Sin GPS: ingresá la distancia al terminar.',
'First complete count':'Primera lista completa','Finish a count and answer "yes, all of them".':'Terminá un conteo y respondé "sí, todas".',
'Weekly monitor':'Monitoreo semanal','Complete counts at the same spot in 4 different weeks. Repeat counts are how trends are measured.':'Listas completas en el mismo lugar en 4 semanas distintas. Así se miden las tendencias.',
'Dawn survey':'Censo al amanecer','A complete count started between 5 and 9 am, when birds are most active.':'Una lista completa empezada entre las 5 y las 9, cuando las aves están más activas.',
'Night survey':'Censo nocturno','A complete count after dark: owls, nightjars and potoos are badly under-recorded.':'Una lista completa de noche: lechuzas, atajacaminos y urutaúes están muy poco registrados.',
'Fifteen-minute habit':'Hábito de quince minutos','5 complete counts of at least 15 minutes.':'5 listas completas de al menos 15 minutos.',
'Gap filler':'Llena vacíos','A complete count where fewer than 50 verified bird records exist within 2 km.':'Una lista completa donde hay menos de 50 registros verificados de aves a menos de 2 km.',
'Evidence collector':'Recolector de evidencia','5 sightings with your own photo.':'5 avistajes con tu propia foto.',
'Export pending':'Exportación pendiente','Version 2 test':'Versión 2 de prueba',
'eBird file':'Archivo de eBird'});
PAT.push(
 [/^(\d+) waiting to be sent to eBird$/,'$1 esperando ser enviadas a eBird'],
 [/^Only ([\d.,]+) verified bird records within 2 km on iNaturalist\.$/,'Solo $1 registros verificados de aves a menos de 2 km en iNaturalist.'],
 [/^([\d.,]+) verified bird records within 2 km on iNaturalist\.$/,'$1 registros verificados de aves a menos de 2 km en iNaturalist.'],
 [/^Checklist #(\d+)$/,'Lista n.º $1'],
 [/^Started (.+)$/,'Empezó $1'],
 [/^\+(\d+) XP for science$/,'+$1 XP por ciencia']);

/* ---------- active count ---------- */
function startGPS(){if(!navigator.geolocation||watchId!=null)return;
  watchId=navigator.geolocation.watchPosition(p=>{const c=active();if(!c)return;const {latitude:la,longitude:lo,accuracy:acc}=p.coords;if(acc>60)return;
    const last=c.track[c.track.length-1];if(!c.gps){c.gps=true;if(!c.track.length){c.lat=la;c.lon=lo}}
    if(!last){c.track.push([+la.toFixed(6),+lo.toFixed(6)])}else{const d=hav(last[0],last[1],la,lo);if(d>=Math.max(15,acc/2)){c.distM+=d;c.track.push([+la.toFixed(6),+lo.toFixed(6)])}}
    if(c.track.length>2000)c.track.splice(1,1);saveActive(c);paint()},()=>{},{enableHighAccuracy:true,maximumAge:10000,timeout:30000})}
function stopGPS(){if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}}
function startCount(){if(active())return openCount();
  saveActive({id:'c'+uid(),start:new Date().toISOString(),lat:loc.lat,lon:loc.lon,place:loc.name||'',track:[],distM:0,items:[],gps:false});
  startGPS();paint();openCount();try{navigator.storage?.persist?.()}catch(e){}}
function addItem(sci,es,n=1,sid=null,via='count'){const c=active();if(!c)return;const it=c.items.find(i=>i.sci===sci);
  if(it){it.n+=n;if(sid)(it.sids=it.sids||[]).push(sid)}else c.items.push({sci,es:es||nameOf(sci),n,via,sids:sid?[sid]:[]});saveActive(c);paint()}
function paint(){const c=active();document.body.classList.toggle('counting',!!c);let pill=document.getElementById('countPill');
  if(!c){pill&&pill.remove();clearInterval(tickTimer);tickTimer=null;$$('.cstartWrap').forEach(e=>e.hidden=false);return}
  $$('.cstartWrap').forEach(e=>e.hidden=true);
  if(!pill){pill=document.createElement('button');pill.id='countPill';pill.onclick=openCount;document.body.append(pill)}
  pill.innerHTML=`<i></i><span>Counting</span><span translate="no">· <span data-ct>${mmss(Date.now()-new Date(c.start))}</span> · ${c.items.length}</span><span>species</span>`;
  const k=$('#cKpis');if(k)k.innerHTML=kpis(c);
  if(!tickTimer)tickTimer=setInterval(()=>{const a=active();if(!a)return;const t=mmss(Date.now()-new Date(a.start));$$('[data-ct]').forEach(e=>e.textContent=t)},1000)}
const kpis=c=>`<div><b data-ct translate="no">${mmss(Date.now()-new Date(c.start))}</b><span>time</span></div><div><b translate="no">${km(c.distM)}</b><span>km</span></div><div><b>${c.items.length}</b><span>species</span></div><div><b>${c.items.reduce((a,i)=>a+i.n,0)}</b><span>birds</span></div>`;

let pool=null;
async function suggestPool(){if(pool)return pool;const m=new Map();
  try{(await getInatLocal()).forEach(b=>m.set(b.sci,b.es||nameOf(b.sci)))}catch(e){}
  try{const g=await getGeoList();if(g)g.forEach(b=>{if(!m.has(b.sci))m.set(b.sci,b.es||nameOf(b.sci))})}catch(e){}
  Object.values(GUIDE).forEach(g=>{if(!m.has(g.sci))m.set(g.sci,NM(g))});
  return pool=[...m].map(([sci,es])=>({sci,es,f:fold(sci+' '+es+' '+(GUIDE[sci]?GUIDE[sci].en+' '+GUIDE[sci].es:''))}))}
async function suggestions(q){const f=fold(q).trim();if(!f)return[];const p=await suggestPool();const t=f.split(/\s+/);
  const local=p.filter(x=>t.every(w=>x.f.includes(w))).slice(0,6);const seen=new Set(local.map(x=>x.sci));
  let world=[];try{await loadWorld();world=worldSearch(q,12).filter(r=>!seen.has(r[0])).slice(0,8-local.length).map(r=>({sci:r[0],es:wName(r),far:true}))}catch(e){}
  return [...local,...world]}

function openCount(){const c=active();if(!c)return;
  openSheet(`<div class="bar"><button class="btn sm" data-close>Minimize</button><button class="btn sm primary" id="cFinish">Finish</button></div>
  <div class="title">Bird count</div><div class="small muted"><span>${esc(c.place||(c.lat.toFixed(3)+', '+c.lon.toFixed(3)))}</span> · <span>Started ${esc(fmtTime(c.start))}</span></div>
  <div class="card kpis" id="cKpis" style="margin-top:12px">${kpis(c)}</div>
  <p class="foot" style="margin:6px 4px 0">${c.gps||c.track.length?'GPS track on. Keep this page open for the distance to count.':'No GPS: enter the distance when you finish.'}</p>
  <div style="margin-top:14px"><input type="search" id="cQ" class="slim" placeholder="Add a bird: name in any language" aria-label="Add a bird" autocomplete="off"></div>
  <div class="group sugg" id="cSugg" hidden style="margin-top:6px"></div>
  <h3>Your list</h3><div class="group" id="cList"></div>
  <p class="foot">Count every bird you identify, including the common ones. Common birds are the backbone of population trends.</p>
  <p class="foot">Birds you log from Sound ID or Photo ID while counting are added automatically.</p>
  <button class="btn block" id="cDiscard" style="margin-top:18px;color:var(--red)">Discard count</button>`);
  renderList();
  let tmr;$('#cQ').oninput=e=>{clearTimeout(tmr);tmr=setTimeout(async()=>{const q=e.target.value;const s=await suggestions(q);if($('#cQ').value!==q)return;const box=$('#cSugg');
    box.hidden=!s.length;box.innerHTML=s.map(x=>`<button data-add="${esc(x.sci)}" data-es="${esc(x.es)}"><b>${esc(x.es)}</b> <small>${esc(x.sci)}</small></button>`).join('')},120)};
  $('#cSugg').onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;addItem(b.dataset.add,b.dataset.es,1);$('#cQ').value='';$('#cSugg').hidden=true;renderList();if(navigator.vibrate)navigator.vibrate(10)};
  $('#cList').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;const c=active(),it=c.items.find(i=>i.sci===b.dataset.sci);if(!it)return;
    it.n+=+b.dataset.d;if(it.n<=0)c.items=c.items.filter(i=>i!==it);saveActive(c);renderList();paint()};
  $('#cFinish').onclick=openFinish;
  $('#cDiscard').onclick=()=>{if(!confirm(trS('Discard this count?')))return;LS.set('activeCount',null);stopGPS();paint();history.back()}}
function renderList(){const c=active(),box=$('#cList');if(!box||!c)return;
  box.innerHTML=c.items.length?[...c.items].reverse().map(i=>`<div class="citem"><div class="grow"><b>${esc(nameOf(i.sci)||i.es)}</b><small class="sci">${esc(i.sci)}</small></div><div class="stepper"><button data-d="-1" data-sci="${esc(i.sci)}" aria-label="Fewer">−</button><output>${i.n}</output><button data-d="1" data-sci="${esc(i.sci)}" aria-label="More">+</button></div></div>`).join(''):'<div class="empty" style="box-shadow:none">No birds yet.</div>'}

/* ---------- finish ---------- */
function openFinish(){const c=active();if(!c)return;if(!c.items.length)return toast(trS('Add at least one bird.'));
  const dur=Math.max(1,Math.round((Date.now()-new Date(c.start))/6e4));let complete=null;
  openSheet(`<div class="bar"><button class="btn sm" id="fBack">‹ Bird count</button><button class="btn sm primary" id="fSave">Save checklist</button></div>
  <div class="title">Finish</div>
  <h3>Did you report every bird you could identify?</h3>
  <div class="yesno" id="fYes"><button data-v="1" aria-pressed="false">Yes, all of them</button><button data-v="0" aria-pressed="false">No, only some</button></div>
  <p class="foot">This is the most important question. A complete list also tells scientists which birds were not there, and that is what makes population trends possible.</p>
  <div class="group" style="margin-top:14px">
   <label class="cell" style="cursor:default"><span class="grow">Duration (minutes)</span><input type="number" id="fDur" value="${dur}" min="1" inputmode="numeric" style="max-width:90px;text-align:right"></label>
   <label class="cell" style="cursor:default"><span class="grow">Distance walked (km)</span><input type="number" id="fDist" value="${km(c.distM)}" min="0" step="0.01" inputmode="decimal" style="max-width:90px;text-align:right"></label>
   <div class="cell" style="cursor:default"><span class="grow">Observers</span><div class="stepper"><button id="oM" aria-label="Fewer">−</button><output id="fObs">1</output><button id="oP" aria-label="More">+</button></div></div></div>
  <h3>Comments</h3><textarea id="fCom" rows="2" placeholder="Habitat, weather, anything unusual" style="width:100%;font:17px var(--font);padding:12px 14px;border:0;border-radius:12px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow)"></textarea>`);
  $('#fBack').onclick=openCount;
  $('#fYes').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;complete=b.dataset.v==='1';$$('#fYes button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  const o=$('#fObs');$('#oM').onclick=()=>o.textContent=Math.max(1,+o.textContent-1);$('#oP').onclick=()=>o.textContent=+o.textContent+1;
  $('#fSave').onclick=async()=>{if(complete==null){toast(trS('Please answer the question above.'));$('#fYes').scrollIntoView({block:'center'});return}
    $('#fSave').disabled=true;const before=stats();
    const distM=Math.max(0,(+$('#fDist').value||0)*1000),durMin=Math.max(1,Math.round(+$('#fDur').value||dur));
    const cl={id:c.id,start:c.start,end:new Date().toISOString(),lat:c.lat,lon:c.lon,place:c.place,track:c.track,distM,durMin,observers:+o.textContent||1,complete,
      protocol:distM>=100?'Traveling':'Stationary',comments:$('#fCom').value.trim(),items:c.items.map(i=>({sci:i.sci,n:i.n,sids:i.sids||[]})),exported:false,state:'',country:'',gapN:null};
    // birds added inside the count become journal sightings too (so they count in the game)
    for(const i of c.items){if(i.sids&&i.sids.length)continue;const s={id:uid(),sci:i.sci,es:nameOf(i.sci),ts:c.start,count:i.n,note:'',via:'count',cl:c.id,lat:c.lat,lon:c.lon,place:c.place||''};
      try{await putSighting(s);G.sightings.push(s)}catch(e){}}
    await Promise.all([regionOf(cl),gapAt(cl.lat,cl.lon).then(n=>cl.gapN=n).catch(()=>{})]);
    try{await SDB.put(cl);CL.push(cl)}catch(e){toast('Could not save: '+e.message);$('#fSave').disabled=false;return}
    LS.set('activeCount',null);stopGPS();paint();renderGameBits();
    const after=stats();history.back();setTimeout(()=>doneSheet(cl,after.xp-before.xp),280)}}
async function regionOf(cl){try{const ctl=new AbortController();setTimeout(()=>ctl.abort(),5000);
  const d=await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=5&lat=${cl.lat}&lon=${cl.lon}`,{signal:ctl.signal})).json();
  const iso=(d.address&&(d.address['ISO3166-2-lvl4']||d.address['ISO3166-2-lvl3'])||'');cl.country=(d.address?.country_code||'').toUpperCase();if(iso.includes('-'))cl.state=iso.split('-')[1].slice(0,3)}catch(e){}}

function doneSheet(cl,xp){const n=CL.length;
  openSheet(`<div class="bar"><span></span><button class="btn sm" data-close>Done</button></div>
  <div style="text-align:center;padding:4px 0"><canvas id="confetti" width="600" height="200" style="width:100%;height:90px"></canvas>
  <div class="eyebrow">${esc('Checklist #'+n)}</div><div class="title">This is real data.</div>
  <p style="margin:6px 0 0"><span class="pill${cl.complete?' hot':''}">${cl.complete?'Complete checklist':'Incomplete checklist'}</span></p>
  <p class="muted small" translate="no">${cl.items.length} · ${cl.durMin} min · ${km(cl.distM)} km</p>
  ${xp>0?`<p class="small" translate="no"><b>+${xp} XP</b></p>`:''}</div>
  <h3>What happens next</h3><div class="card stack" style="gap:8px">
   <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="pill">1</span><span class="small">Send it to eBird (button below). It takes 30 seconds.</span></div>
   <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="pill">2</span><span class="small">Regional volunteer reviewers check unusual records.</span></div>
   <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="pill">3</span><span class="small">It joins the eBird dataset researchers download to study bird populations, and it is shared with GBIF.</span></div></div>
  <button class="btn primary block" id="dExport" style="margin-top:14px">Export for eBird</button>
  ${howTo()}`);
  confetti($('#confetti'));$('#dExport').onclick=()=>exportCSV([cl])}
const howTo=()=>`<h3>How to send it</h3><ol class="small muted" style="margin:0;padding-left:20px;line-height:1.6"><li>Export the file.</li><li>On ebird.org/import sign in and choose "eBird Record Format".</li><li>Upload the file and confirm the location.</li></ol>
  <a class="btn block" style="margin-top:10px" href="https://ebird.org/import/upload.form?theme=ebird" target="_blank" rel="noopener">Open eBird import</a>`;

/* ---------- eBird Record Format (19 columns, no header) ---------- */
function csvFor(list){const rows=[];for(const cl of list){const d=new Date(cl.start);
  const date=`${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`,time=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const placeName=clean(cl.place||`Aves ${cl.lat.toFixed(4)} ${cl.lon.toFixed(4)}`).slice(0,80);
  for(const it of cl.items){const [genus,...sp]=it.sci.split(' ');
    rows.push([clean(enName(it.sci)),genus,sp.join(' '),it.n,'',placeName,cl.lat.toFixed(5),cl.lon.toFixed(5),date,time,clean(cl.state),clean(cl.country),
      cl.protocol,cl.observers,cl.durMin,cl.complete?'Y':'N',cl.protocol==='Traveling'?(cl.distM/1609.344).toFixed(3):'','',clean((cl.comments?cl.comments+' / ':'')+'Aves de Alem app').slice(0,500)].join(','))}}
  return rows.join('\r\n')+'\r\n'}
async function exportCSV(list){try{if(!WORLD.ready)await loadWorld().catch(()=>{});
  const name=`ebird-aves-${new Date().toISOString().slice(0,10)}.csv`,blob=new Blob([csvFor(list)],{type:'text/csv'});
  const file=new File([blob],name,{type:'text/csv'});
  if(navigator.canShare&&navigator.canShare({files:[file]})&&/iPhone|iPad|Android/i.test(navigator.userAgent)){try{await navigator.share({files:[file],title:trS('eBird file')})}catch(e){if(e.name==='AbortError')return}}
  else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
  for(const cl of list){cl.exported=true;await SDB.put(cl).catch(()=>{})}renderGameBits()}catch(e){toast(trS('Export failed')+': '+e.message)}}

/* ---------- data gap, firsts ---------- */
async function gapAt(lat,lon){const d=await cachedJSON(`https://api.inaturalist.org/v1/observations?taxon_id=3&quality_grade=research&lat=${lat.toFixed(3)}&lng=${lon.toFixed(3)}&radius=2&per_page=0`,72);return d.total_results}
async function localSpecies(lat,lon){const d=await cachedJSON(`https://api.inaturalist.org/v1/observations/species_counts?taxon_id=3&quality_grade=research&lat=${lat.toFixed(2)}&lng=${lon.toFixed(2)}&radius=10&per_page=500`,72);return new Set(d.results.map(r=>r.taxon.name))}
const gapLevel=n=>n<50?['Data gap','#E5383B','Your counts here are rare data. Every complete checklist fills a real gap on the map.']:n<500?['Thinly covered','#E08A1E','Few people record birds here. Regular counts make this place visible to science.']:['Well covered','#2E9D49','Many records already. Repeat counts at the same spot still build long-term trends.'];

/* ---------- missions (also badges, also XP) ---------- */
const wk=ts=>Math.floor((new Date(ts).getTime()/864e5+3)/7);
function missions(){const comp=CL.filter(c=>c.complete);
  let monitor=0;for(const c of comp){const weeks=new Set(comp.filter(o=>hav(c.lat,c.lon,o.lat,o.lon)<=300).map(o=>wk(o.start)));monitor=Math.max(monitor,weeks.size)}
  const hr=c=>new Date(c.start).getHours();
  return [
   {id:'sc_first',n:'First complete count',d:'Finish a count and answer "yes, all of them".',v:comp.length,g:1,xp:150},
   {id:'sc_week',n:'Weekly monitor',d:'Complete counts at the same spot in 4 different weeks. Repeat counts are how trends are measured.',v:monitor,g:4,xp:400},
   {id:'sc_dawn',n:'Dawn survey',d:'A complete count started between 5 and 9 am, when birds are most active.',v:comp.filter(c=>hr(c)>=5&&hr(c)<9).length,g:1,xp:150},
   {id:'sc_night',n:'Night survey',d:'A complete count after dark: owls, nightjars and potoos are badly under-recorded.',v:comp.filter(c=>hr(c)>=20||hr(c)<5).length,g:1,xp:200},
   {id:'sc_15',n:'Fifteen-minute habit',d:'5 complete counts of at least 15 minutes.',v:comp.filter(c=>c.durMin>=15).length,g:5,xp:300},
   {id:'sc_gap',n:'Gap filler',d:'A complete count where fewer than 50 verified bird records exist within 2 km.',v:comp.filter(c=>c.gapN!=null&&c.gapN<50).length,g:1,xp:250},
   {id:'sc_evid',n:'Evidence collector',d:'5 sightings with your own photo.',v:G.sightings.filter(s=>s.photo).length,g:5,xp:100}]}
// science badges join the existing badge wall
for(const m of missions())BADGES.push({id:m.id,n:m.n,d:m.d,t:()=>{const x=missions().find(y=>y.id===m.id);return x&&x.v>=x.g}});
// XP: +200 per complete checklist, +60 per incomplete, + mission rewards (recomputes level)
const _stats=window.stats;
window.stats=function(){const st=_stats();let bonus=0;for(const c of CL)bonus+=c.complete?200:60;for(const m of missions())if(m.v>=m.g)bonus+=m.xp;
  st.xp+=bonus;let li=0;for(let i=0;i<LEVELS.length;i++)if(st.xp>=LEVELS[i][0])li=i;st.level=li;st.next=LEVELS[li+1]?.[0]??null;st.cl=CL.length;return st};

/* ---------- sightings logged during a count join the count ---------- */
const _put=DB.put.bind(DB);
const putSighting=s=>_put('sightings',s);
DB.put=(store,v)=>{const c=active();if(store==='sightings'&&c&&v&&!v.cl&&v.ts>=c.start&&!G.sightings.some(s=>s.id===v.id)){v.cl=c.id;addItem(v.sci,v.es,v.count||1,v.id,v.via)}return _put(store,v)};

/* ---------- Science view in Collection ---------- */
const seg=$('#colSeg');seg.insertAdjacentHTML('afterbegin','<button data-v="science" aria-pressed="false">Science</button>');
if(!LS.get('v2seen',false)){colView='science';LS.set('v2seen',true)}
const _renderLife=window.renderLife;
window.renderLife=async function(){await _renderLife();if(colView!=='science')return;$$('#colSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v==='science'));await renderScience()};

async function renderScience(){const box=$('#lifeList');const comp=CL.filter(c=>c.complete),pend=CL.filter(c=>!c.exported);
  const recs=CL.reduce((a,c)=>a+c.items.length,0),hrs=CL.reduce((a,c)=>a+c.durMin,0)/60,dist=CL.reduce((a,c)=>a+c.distM,0);
  const ms=missions();
  box.innerHTML=`<div class="stack">
   ${startCard()}
   <div class="card stack" style="gap:12px"><div class="eyebrow">Your contribution to science</div>
    <div class="kpis"><div><b>${comp.length}</b><span>checklists</span></div><div><b>${recs}</b><span>records</span></div><div><b>${hrs.toFixed(hrs<10?1:0)}</b><span>hours</span></div><div><b>${km(dist)}</b><span>km</span></div></div>
    ${CL.length?(pend.length?`<button class="btn primary block" id="sExport">Export for eBird</button><p class="small muted" style="margin:0;text-align:center">${esc(pend.length+' waiting to be sent to eBird')}</p>`:'<p class="small muted" style="margin:0;text-align:center">All your checklists are exported. Thank you!</p>'):''}</div>
   <h3>Where you stand</h3><div class="card" id="sGap"><div class="small muted">…</div></div>
   <h3>Science missions</h3><div class="group">${ms.map(m=>`<div class="mis"><div class="grow"><b>${esc(m.n)}</b><div class="small muted">${esc(m.d)}</div><div class="progress" style="margin-top:6px"><i style="width:${Math.min(100,Math.round(m.v/m.g*100))}%"></i></div></div><span class="small${m.v>=m.g?' ok':' muted'}" translate="no">${m.v>=m.g?'✓':Math.min(m.v,m.g)+'/'+m.g}</span></div>`).join('')}</div>
   <div id="sFirsts"></div><div id="sMig"></div><div id="sInat"></div>
   ${CL.length?`<h3>Your checklists</h3><div class="group">${[...CL].sort((a,b)=>b.start.localeCompare(a.start)).map(c=>`<button class="cell" data-cl="${esc(c.id)}"><span class="grow"><b style="display:block">${esc(c.place||'—')}</b><span class="small muted" translate="no">${esc(fmtDate(c.start))} · ${c.items.length} sp · ${c.durMin} min</span></span><span class="pill${c.complete?' hot':''}">${c.complete?'Complete checklist':'Incomplete checklist'}</span><span class="small muted">${c.exported?'exported':'not exported'}</span></button>`).join('')}</div>`:''}
   ${CL.length?howTo():''}</div>`;
  wireStart(box);
  if($('#sExport'))$('#sExport').onclick=()=>exportCSV(pend);
  box.querySelectorAll('[data-cl]').forEach(b=>b.onclick=()=>openChecklist(b.dataset.cl));
  // data gap where you stand
  gapAt(loc.lat,loc.lon).then(n=>{const [lv,col,tx]=gapLevel(n);const el=$('#sGap');if(!el)return;
    el.innerHTML=`<div class="gap"><div class="dial" style="background:${col}" translate="no">${n>9999?Math.round(n/1000)+'k':n}</div><div><b>${esc(lv)}</b><div class="small muted">${esc((n<50?'Only ':'')+n.toLocaleString('en')+' verified bird records within 2 km on iNaturalist.')}</div><div class="small" style="margin-top:4px">${esc(tx)}</div></div></div>`}).catch(()=>{const el=$('#sGap');if(el)el.innerHTML='<div class="small muted">Offline</div>'});
  // possible local firsts (your sightings within 15 km of here, missing from iNat within 10 km)
  const near=[...new Map(G.sightings.filter(s=>s.lat!=null&&hav(s.lat,s.lon,loc.lat,loc.lon)<15000).map(s=>[s.sci,s])).values()];
  if(near.length)localSpecies(loc.lat,loc.lon).then(set=>{const miss=near.filter(s=>!set.has(s.sci)&&/ /.test(s.sci));const el=$('#sFirsts');if(!el||!miss.length)return;
    el.innerHTML=`<h3>Possible local firsts</h3><div class="card stack" style="gap:8px"><p class="small" style="margin:0">You logged these, but iNaturalist has no verified record within 10 km. A photo or recording would put them on the map.</p>
     <div class="row">${miss.slice(0,12).map(s=>`<button class="chip" data-sci="${esc(s.sci)}">${esc(nameOf(s.sci))}</button>`).join('')}</div><p class="foot" style="padding:0;margin:0">Names can differ between taxonomies. Double-check before claiming a first.</p></div>`;
    el.querySelectorAll('[data-sci]').forEach(b=>b.onclick=()=>openSpecies(b.dataset.sci))}).catch(()=>{});
  // migration watch: first date this season for the guide's spring migrants
  const now=new Date(),south=loc.lat<0,sy=south?(now.getMonth()>=6?now.getFullYear():now.getFullYear()-1):now.getFullYear(),seasonStart=new Date(sy,south?6:1,1).toISOString();
  const migr=Object.values(GUIDE).filter(g=>g.sea==='M');
  if(migr.length){const firsts=migr.map(g=>{const f=G.sightings.filter(s=>s.sci===g.sci&&s.ts>=seasonStart).sort((a,b)=>a.ts.localeCompare(b.ts))[0];return {g,f}});
    $('#sMig').innerHTML=`<h3>Migration watch</h3><div class="group">${firsts.map(({g,f})=>`<button class="cell" data-sci="${esc(g.sci)}"><span class="grow">${esc(NM(g))}</span><span class="small ${f?'':'muted'}">${f?esc(fmtDate(f.ts)):'not yet this season'}</span></button>`).join('')}</div><p class="foot">Arrival dates are a climate signal: researchers compare them across years. Log the first one you see each season.</p>`;
    $('#sMig').querySelectorAll('[data-sci]').forEach(b=>b.onclick=()=>openSpecies(b.dataset.sci))}
  // iNaturalist evidence helper
  const ph=G.sightings.filter(s=>s.photo&&!s.inat).sort((a,b)=>b.ts.localeCompare(a.ts));
  if(ph.length){$('#sInat').innerHTML=`<h3>Ready for iNaturalist</h3><p class="foot" style="margin:0 0 8px">Sightings with your own photo. On iNaturalist, once others confirm the ID, they become Research Grade and go to GBIF.</p><div class="group">${ph.slice(0,20).map(s=>`<button class="cell" data-inat="${esc(s.id)}"><img data-own="${esc(s.photo)}" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:cover;background:var(--surface2)"><span class="grow"><b style="display:block">${esc(nameOf(s.sci))}</b><span class="small muted">${esc(fmtDate(s.ts))}</span></span><span class="small" style="color:var(--tint)">Add to iNaturalist</span></button>`).join('')}</div>`;
    $('#sInat').querySelectorAll('img[data-own]').forEach(async img=>{const p=await DB.get('photos',img.dataset.own).catch(()=>null);if(p)img.src=URL.createObjectURL(p.blob)});
    $('#sInat').querySelectorAll('[data-inat]').forEach(b=>b.onclick=()=>openInat(b.dataset.inat))}}

function openChecklist(id){const cl=CL.find(c=>c.id===id);if(!cl)return;
  openSheet(`<div class="bar"><button class="btn sm" data-close>Done</button><button class="btn sm primary" id="oExp">Export for eBird</button></div>
  <div class="title">${esc(cl.place||'Bird count')}</div><div class="small muted" translate="no">${esc(fmtDate(cl.start))} ${esc(fmtTime(cl.start))} · ${cl.durMin} min · ${km(cl.distM)} km · ${cl.protocol} · ${cl.observers}</div>
  <p><span class="pill${cl.complete?' hot':''}">${cl.complete?'Complete checklist':'Incomplete checklist'}</span> <span class="small muted">${cl.exported?'exported':'not exported'}</span></p>
  <div class="group">${cl.items.map(i=>`<button class="citem cell" data-sci="${esc(i.sci)}"><span class="grow"><b>${esc(nameOf(i.sci))}</b><small class="sci">${esc(i.sci)}</small></span><b translate="no">${i.n}</b></button>`).join('')}</div>
  ${cl.comments?`<p class="small">${esc(cl.comments)}</p>`:''}
  <button class="btn block" id="oDel" style="margin-top:18px;color:var(--red)">Delete checklist</button>`);
  $('#oExp').onclick=()=>exportCSV([cl]);
  $('#sheetIn').querySelectorAll('[data-sci]').forEach(b=>b.onclick=()=>openSpecies(b.dataset.sci));
  $('#oDel').onclick=async()=>{if(!confirm(trS('Delete this checklist? The sightings stay in your journal.')))return;await SDB.del(cl.id).catch(()=>{});CL.splice(CL.indexOf(cl),1);history.back();renderGameBits()}}

async function openInat(sid){const s=G.sightings.find(x=>x.id===sid);if(!s)return;const p=await DB.get('photos',s.photo).catch(()=>null);if(!p)return;
  const url=URL.createObjectURL(p.blob),file=new File([p.blob],`${s.sci.replace(' ','_')}_${s.ts.slice(0,10)}.jpg`,{type:'image/jpeg'});
  openSheet(`<div class="bar"><button class="btn sm" data-close>Done</button><span></span></div>
  <div class="title">${esc(nameOf(s.sci))}</div><div class="sci muted">${esc(s.sci)}</div>
  <img src="${url}" alt="" class="photo-prev" style="margin-top:10px">
  <p class="small muted" translate="no">${esc(fmtDate(s.ts))} ${esc(fmtTime(s.ts))} · ${s.lat!=null?s.lat.toFixed(5)+', '+s.lon.toFixed(5):''}</p>
  <div class="stack" style="gap:8px">
   ${navigator.canShare&&navigator.canShare({files:[file]})?'<button class="btn block" id="iShare">Share photo</button>':'<button class="btn block" id="iSave">Save photo</button>'}
   <button class="btn block" id="iCopy">Copy species name</button>
   <a class="btn block" href="https://www.inaturalist.org/observations/upload" target="_blank" rel="noopener">Open iNaturalist</a>
   <button class="btn primary block" id="iDone">Mark as uploaded</button></div>
  <p class="foot">Sightings with your own photo. On iNaturalist, once others confirm the ID, they become Research Grade and go to GBIF.</p>`);
  if($('#iShare'))$('#iShare').onclick=()=>navigator.share({files:[file]}).catch(()=>{});
  if($('#iSave'))$('#iSave').onclick=()=>{const a=document.createElement('a');a.href=url;a.download=file.name;a.click()};
  $('#iCopy').onclick=()=>{navigator.clipboard?.writeText(s.sci).then(()=>toast(trS('Copied'))).catch(()=>{})};
  $('#iDone').onclick=async()=>{s.inat=true;await putSighting(s).catch(()=>{});toast(trS('Uploaded to iNaturalist'));history.back();renderGameBits()}}

/* ---------- entry points: Sound tab, Collection, header tag ---------- */
const startCard=()=>active()?'':`<div class="card cstart cstartWrap"><div class="grow"><b>Bird count</b><span class="small muted">Count every bird you see or hear. Your list becomes science.</span></div><button class="btn sm primary" data-cstart>Start</button></div>`;
function wireStart(root){root.querySelectorAll('[data-cstart]').forEach(b=>b.onclick=startCount)}
$('#t-sound').insertAdjacentHTML('afterbegin',startCard());wireStart($('#t-sound'));
$('.top .eyebrow').insertAdjacentHTML('beforeend','<span class="v2tag" title="Version 2 test">v2</span>');

/* ---------- backups include checklists (and a restore brings them back) ---------- */
BACKUP_EXT.push({key:'checklists',get:()=>SDB.all(),put:async list=>{for(const cl of list||[]){if(!CL.some(c=>c.id===cl.id)){await SDB.put(cl);CL.push(cl)}}}});

/* ---------- boot ---------- */
SDB.all().then(a=>{CL.push(...a);renderGameBits()}).catch(()=>{});
if(active()){startGPS();paint()}
loadWorld().catch(()=>{});
// test hook
window.__science={CL,active,csvFor,missions,exportCSV,startCount,addItem};
})();
