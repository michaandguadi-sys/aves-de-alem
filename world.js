/* Aves de Alem: world module. All ~11,000 living bird species (eBird/Clements taxonomy),
   fast search and browsing, batched lightweight photo loading, and the ornithological
   species sheet (ecology, seasonality, distribution map, confusion species, links). */
const INAT2='https://api.inaturalist.org/v2';
const fold=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const WORLD={ready:false,p:null,f:[],s:[],bySci:new Map(),norm:[]};
function loadWorld(){return WORLD.p||(WORLD.p=fetch('./data/idx.json').then(r=>{if(!r.ok)throw new Error('index '+r.status);return r.json()}).then(d=>{
  WORLD.f=d.f;WORLD.s=d.s;for(const r of d.s)WORLD.bySci.set(r[0],r);WORLD.norm=d.s.map(r=>fold(r[0]+' '+r[1]+' '+r[2]));WORLD.ready=true;return WORLD}).catch(e=>{WORLD.p=null;throw e}))}
const wName=r=>I18N.lang==='es'?(r[2]||r[1]):r[1];
const wOther=r=>I18N.lang==='es'?r[1]:(r[2]||'');
const DETP={};
async function detailsFor(sci){try{await loadWorld()}catch(e){return null}const r=WORLD.bySci.get(sci);if(!r)return null;const fi=r[3];
  DETP[fi]=DETP[fi]||fetch(`./data/d/${fi}.json`).then(x=>x.ok?x.json():{}).catch(()=>({}));return (await DETP[fi])[sci]||{}}
function worldSearch(q,limit=150){const t=fold(q).split(/\s+/).filter(Boolean);if(!t.length)return[];const out=[];const fq=fold(q);
  for(let i=0;i<WORLD.s.length;i++){const n=WORLD.norm[i];if(!t.every(w=>n.includes(w)))continue;const r=WORLD.s[i];const nm=fold(wName(r)),sc=fold(r[0]);
    let score=Math.log10((r[6]||0)+1);if(nm===fq||sc===fq)score+=100;else if(nm.startsWith(fq)||sc.startsWith(fq))score+=50;else if(nm.split(/[\s-]/).some(w=>w.startsWith(t[0])))score+=20;out.push([score,r])}
  out.sort((a,b)=>b[0]-a[0]);return out.slice(0,limit).map(x=>x[1])}

/* ---------- photos: batch 30 species per tiny v2 request, only for tiles near the screen ---------- */
const inatWait=new Map();let inatTimer=null,inatActive=0;const inatPending=[];
const tileObs='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){tileObs.unobserve(e.target);queueInat(e.target)}}),{rootMargin:'400px'}):null;
function watchInat(root){root.querySelectorAll('img[data-inat]:not([src])').forEach(img=>{if(img.dataset.q)return;img.dataset.q=1;const k=KNOWN_IMG['#'+img.dataset.inat];if(k){img.src=k;return}tileObs?tileObs.observe(img):queueInat(img)})}
function queueInat(img){const id=img.dataset.inat;const k=KNOWN_IMG['#'+id];if(k){img.src=k;return}if(!inatWait.has(id))inatWait.set(id,[]);inatWait.get(id).push(img);clearTimeout(inatTimer);inatTimer=setTimeout(flushInat,60)}
function flushInat(){const ids=[...inatWait.keys()].filter(id=>!inatWait.get(id).sent);for(let i=0;i<ids.length;i+=30)inatPending.push(ids.slice(i,i+30));ids.forEach(id=>inatWait.get(id).sent=1);pumpInat()}
function pumpInat(){while(inatActive<3&&inatPending.length){const chunk=inatPending.shift();inatActive++;
  fetch(`${INAT2}/taxa/${chunk.join(',')}?fields=(id:!t,name:!t,default_photo:(square_url:!t))`).then(r=>r.json()).then(d=>{
    for(const t of d.results||[]){const u=t.default_photo?.square_url;const imgs=inatWait.get(String(t.id))||[];inatWait.delete(String(t.id));if(!u)continue;KNOWN_IMG['#'+t.id]=u;KNOWN_IMG[t.name]=u;imgs.forEach(img=>{img.src=u})}saveKnown()})
   .catch(()=>{chunk.forEach(id=>{const w=inatWait.get(id);if(w)w.sent=0})}).finally(()=>{inatActive--;pumpInat()})}}

const ORD={Accipitriformes:['Hawks, eagles & kites','Águilas, gavilanes y milanos'],Aegotheliformes:['Owlet-nightjars','Egotélidos'],Anseriformes:['Ducks, geese & screamers','Patos, gansos y chajás'],Apodiformes:['Swifts & hummingbirds','Vencejos y picaflores'],Apterygiformes:['Kiwis','Kiwis'],Bucerotiformes:['Hornbills & hoopoes','Cálaos y abubillas'],Caprimulgiformes:['Nightjars','Atajacaminos'],Cariamiformes:['Seriemas','Chuñas'],Casuariiformes:['Cassowaries & emu','Casuarios y emú'],Cathartiformes:['New World vultures','Jotes y cóndores'],Charadriiformes:['Shorebirds, gulls & terns','Playeros, gaviotas y gaviotines'],Ciconiiformes:['Storks','Cigüeñas'],Coliiformes:['Mousebirds','Pájaros ratón'],Columbiformes:['Pigeons & doves','Palomas y torcazas'],Coraciiformes:['Kingfishers, motmots & rollers','Martines pescadores y yeruvás'],Cuculiformes:['Cuckoos','Cucos y pirinchos'],Eurypygiformes:['Sunbittern & kagu','Tigana y kagú'],Falconiformes:['Falcons & caracaras','Halcones y caranchos'],Galliformes:['Gamebirds','Pavas, perdices y faisanes'],Gaviiformes:['Loons','Colimbos'],Gruiformes:['Rails & cranes','Gallinetas y grullas'],Leptosomiformes:['Cuckoo-roller','Curol'],Mesitornithiformes:['Mesites','Mesitos'],Musophagiformes:['Turacos','Turacos'],Nyctibiiformes:['Potoos','Urutaúes'],Opisthocomiformes:['Hoatzin','Hoacín'],Otidiformes:['Bustards','Avutardas'],Passeriformes:['Perching birds (songbirds)','Paseriformes (pájaros cantores)'],Pelecaniformes:['Herons, ibises & pelicans','Garzas, cuervillos y pelícanos'],Phaethontiformes:['Tropicbirds','Rabijuncos'],Phoenicopteriformes:['Flamingos','Flamencos'],Piciformes:['Woodpeckers, toucans & barbets','Carpinteros y tucanes'],Podargiformes:['Frogmouths','Podargos'],Podicipediformes:['Grebes','Macáes'],Procellariiformes:['Albatrosses & petrels','Albatros y petreles'],Psittaciformes:['Parrots','Loros y cotorras'],Pterocliformes:['Sandgrouse','Gangas'],Rheiformes:['Rheas','Ñandúes'],Sphenisciformes:['Penguins','Pingüinos'],Steatornithiformes:['Oilbird','Guácharo'],Strigiformes:['Owls','Lechuzas y búhos'],Struthioniformes:['Ostriches','Avestruces'],Suliformes:['Cormorants, boobies & frigatebirds','Biguás, piqueros y fragatas'],Tinamiformes:['Tinamous','Perdices (tinamúes)'],Trogoniformes:['Trogons','Surucuáes']};
const ordName=o=>(ORD[o]||[])[I18N.lang==='es'?1:0]||'';
const pl=(n,a,b)=>`${n} ${n===1?a:b}`;
/* ---------- World browser in Explore ---------- */
let wv={mode:'orders',order:null,fam:null},wShown=0,wItems=[];
function worldTile(r){const seen=typeof life==='function'&&life()[r[0]];
  return `<button class="tile" data-sci="${esc(r[0])}"><img ${r[4]?`data-inat="${r[4]}"`:`data-photo="${esc(r[0])}"`} loading="lazy" alt=""><div class="t"><b>${esc(wName(r))}</b><small class="sci">${esc(r[0])}</small>${wOther(r)?`<br><small>${esc(wOther(r))}</small>`:''}${seen?'<br><small><span class="dot"></span>in your collection</small>':''}</div></button>`}
function navTile(nav,title,sub,inat){return `<button class="tile" data-nav="${esc(nav)}"><img ${inat?`data-inat="${inat}"`:''} loading="lazy" alt=""><div class="t"><b>${esc(title)}</b><small>${esc(sub)}</small></div></button>`}
async function renderWorld(){const box=$('#exploreList'),hint=$('#exploreHint');
  try{if(!WORLD.ready){box.innerHTML='<div class="empty">Loading…</div>';await loadWorld()}}catch(e){box.innerHTML=`<div class="empty">Could not load (${esc(e.message)}). Offline? The Guide list works offline.</div>`;return}
  const q=$('#exploreQ').value.trim();let crumbs='';
  if(q){wItems=worldSearch(q).map(r=>({r}));hint.textContent=wItems.length?`${wItems.length} matches worldwide`:'No match.';$('#exChips').hidden=true;$$('#exSeg button').forEach(x=>x.setAttribute('aria-pressed','false'))}
  else if(wv.mode==='orders'){const ord=new Map();WORLD.s.forEach(r=>{const o=WORLD.f[r[3]][2];const e=ord.get(o)||{o,n:0,fams:new Set(),best:null};e.n++;e.fams.add(r[3]);if(r[4]&&(!e.best||r[6]>e.best[6]))e.best=r;ord.set(o,e)});
    wItems=[...ord.values()].map(e=>({nav:'o:'+e.o,title:ordName(e.o)||e.o,sub:`${e.o} · ${pl(e.fams.size,'family','families')} · ${pl(e.n,'species','species')}`,inat:e.best&&e.best[4]}));hint.textContent=`${WORLD.s.length.toLocaleString()} bird species in ${WORLD.f.length} families. Search any name, or browse by order.`}
  else if(wv.mode==='families'){const fm=new Map();WORLD.s.forEach(r=>{const f=WORLD.f[r[3]];if(f[2]!==wv.order)return;const e=fm.get(r[3])||{fi:r[3],n:0,best:null};e.n++;if(r[4]&&(!e.best||r[6]>e.best[6]))e.best=r;fm.set(r[3],e)});
    wItems=[...fm.values()].map(e=>({nav:'f:'+e.fi,title:WORLD.f[e.fi][0],sub:`${WORLD.f[e.fi][1]} · ${e.n} species`,inat:e.best&&e.best[4]}));
    crumbs=`› <button class="btn sm" data-nav="root">All birds</button> › <b>${esc(ordName(wv.order)||wv.order)}</b>`;hint.textContent=`${wv.order} · ${pl(wItems.length,'family','families')}`}
  else{const f=WORLD.f[wv.fam];wItems=WORLD.s.filter(r=>r[3]===wv.fam).map(r=>({r}));
    crumbs=`› <button class="btn sm" data-nav="root">All birds</button> › <button class="btn sm" data-nav="o:${esc(f[2])}">${esc(ordName(f[2])||f[2])}</button> › <b>${esc(f[0])}</b>`;hint.textContent=`${f[1]} · ${wItems.length} species`}
  wShown=0;const back=q?'':`<button class="btn sm" data-nav="back">‹ ${esc(LS.get('exBack','guide')==='near'?'Recent':'Guide')}</button>`;box.innerHTML=`<div class="row small" style="gap:6px">${back}${crumbs?' '+crumbs:''}</div><div class="grid2" id="wGrid"></div>`;moreWorld()}
function moreWorld(){const box=$('#wGrid');if(!box)return;box.querySelector('.sentinel')?.remove();const next=wItems.slice(wShown,wShown+48);wShown+=next.length;
  box.insertAdjacentHTML('beforeend',next.map(i=>i.r?worldTile(i.r):navTile(i.nav,i.title,i.sub,i.inat)).join(''));
  if(wShown<wItems.length){box.insertAdjacentHTML('beforeend','<div class="sentinel" style="grid-column:1/-1;height:1px"></div>');sentObs&&sentObs.observe(box.querySelector('.sentinel'))}
  watchInat(box);hydratePhotos(box);$('#exploreMore').hidden=true}
const sentObs='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){sentObs.unobserve(e.target);moreWorld()}}),{rootMargin:'600px'}):null;
function worldNav(nav){if(nav==='root')wv={mode:'orders'};else if(nav.startsWith('o:'))wv={mode:'families',order:nav.slice(2)};else if(nav.startsWith('f:'))wv={mode:'species',fam:+nav.slice(2)};$('#exploreQ').value='';$$('#exSeg button').forEach(x=>x.setAttribute('aria-pressed','false'));$('#exChips').hidden=true;renderWorld();window.scrollTo({top:0})}

/* ---------- species sheet: ornithological sections ---------- */
const DIET_L=['Invertebrates','Birds & mammals','Reptiles & amphibians','Fish','Other vertebrates','Carrion','Fruit','Nectar','Seeds','Other plant matter'];
const STRAT_L=['Below water surface','Water surface','Ground','Understory','Mid to high levels','Canopy','Aerial'];
function bars(rows){return rows.filter(r=>r[1]>0).sort((a,b)=>b[1]-a[1]).map(([l,v])=>`<div class="hb"><span>${esc(l)}</span><i style="--w:${v}%"></i><b>${v}%</b></div>`).join('')}
async function sheetWorld(sci,tx){const r=WORLD.ready?WORLD.bySci.get(sci):null;const det=await detailsFor(sci);const box=$('#ecol');if(!box)return;
  let h='';
  if(det&&(det.m||det.di)){h+=`<h3>Ecology</h3><div class="card stack" style="gap:14px">`;
    if(det.m)h+=`<div class="row" style="justify-content:space-between"><span class="muted">Body mass</span><b>${det.m>=1000?(det.m/1000).toFixed(det.m>=10000?0:1)+' kg':det.m+' g'}</b></div>`;
    if(det.n!=null)h+=`<div class="row" style="justify-content:space-between"><span class="muted">Activity</span><b>${det.n?'Mostly nocturnal':'Diurnal'}</b></div>`;
    if(det.di)h+=`<div><div class="small muted" style="margin-bottom:6px">Diet</div>${bars(DIET_L.map((l,i)=>[l,det.di[i]]))}</div>`;
    if(det.fs&&det.fs.some(Boolean))h+=`<div><div class="small muted" style="margin-bottom:6px">Where it forages</div>${bars(STRAT_L.map((l,i)=>[l,det.fs[i]]))}</div>`;
    h+=`<p class="small muted" style="margin:0">Source: EltonTraits 1.0 (Wilman et al. 2014, Ecology 95:2027). Mass mostly from Dunning (2008), CRC Handbook of Avian Body Masses.</p></div>`}
  box.innerHTML=h;
  const links=$('#spLinks');if(links&&r){const code=r[5],id=tx?.id||r[4];const wt=det?.w||[];
    const L=[[`https://ebird.org/species/${code}`,'eBird'],[`https://birdsoftheworld.org/bow/species/${code}/cur/introduction`,'Birds of the World'],[`https://search.macaulaylibrary.org/catalog?taxonCode=${code}&mediaType=audio`,'Macaulay Library'],
      [`https://xeno-canto.org/species/${sci.replace(' ','-')}`,'xeno-canto'],id&&[`https://www.inaturalist.org/taxa/${id}`,'iNaturalist'],det?.a&&[`https://avibase.bsc-eoc.org/species.jsp?avibaseid=${det.a}`,'Avibase'],
      [`https://${I18N.lang==='es'&&wt[1]?'es':'en'}.wikipedia.org/wiki/${encodeURIComponent((I18N.lang==='es'&&wt[1])||wt[0]||sci)}`,'Wikipedia']].filter(Boolean);
    links.innerHTML=L.map(([u,t])=>`<a class="btn sm" target="_blank" rel="noopener" href="${esc(u)}">${esc(t)}</a>`).join('')}
  return det}
const MON={en:['J','F','M','A','M','J','J','A','S','O','N','D'],es:['E','F','M','A','M','J','J','A','S','O','N','D']};
async function sheetSeason(id){const box=$('#season');if(!box||!id)return;
  try{const q=`&interval=month_of_year&verifiable=true&taxon_id=${id}`;
    const [near,all]=await Promise.all([inat(`/observations/histogram?lat=${loc.lat}&lng=${loc.lon}&radius=200${q}`,7*86400e3),inat(`/observations/histogram?${q.slice(1)}`,30*86400e3)]);
    const hn=near.results.month_of_year,ha=all.results.month_of_year;const tn=Object.values(hn).reduce((a,b)=>a+b,0);const use=tn>=12?hn:ha;
    const mx=Math.max(1,...Object.values(use));const cur=new Date().getMonth()+1;
    if(!$('#season'))return;
    $('#season').innerHTML=`<h3>When to see it</h3><div class="card"><div class="months">${Array.from({length:12},(_,i)=>{const v=use[i+1]||0;return `<div class="mo${i+1===cur?' now':''}" title="${v}"><i style="height:${Math.max(2,Math.round(v/mx*100))}%"></i><span>${MON[I18N.lang][i]}</span></div>`}).join('')}</div>
      <p class="small muted" style="margin:8px 0 0">${tn>=12?`${tn.toLocaleString()} iNaturalist records within 200 km of you, by month`:`${Object.values(ha).reduce((a,b)=>a+b,0).toLocaleString()} iNaturalist records worldwide, by month (few records near you)`}</p></div>`}catch(e){}}
let leafletP=null;
function loadLeaflet(){if(window.L)return Promise.resolve();return leafletP||(leafletP=new Promise((res,rej)=>{const c=document.createElement('link');c.rel='stylesheet';c.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';c.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';c.crossOrigin='anonymous';document.head.append(c);
  const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';s.crossOrigin='anonymous';s.onload=res;s.onerror=()=>{leafletP=null;rej(new Error('map library'))};document.head.append(s)}))}
function sheetMap(id){const box=$('#mapWrap');if(!box||!id)return;box.innerHTML=`<h3>Where it lives</h3><div class="card" style="padding:0;overflow:hidden"><div id="map" style="height:230px;background:var(--surface2)"></div><div class="row small muted" style="padding:8px 12px;justify-content:space-between"><span><span class="dot"></span>iNaturalist records · shaded: range map where available</span></div></div>`;
  const go=async()=>{try{await loadLeaflet();const el=$('#map');if(!el)return;const m=L.map(el,{zoomControl:false,attributionControl:true,worldCopyJump:true}).setView([loc.lat,loc.lon],2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,className:'basemap',attribution:'© OpenStreetMap contributors · iNaturalist'}).addTo(m);
    L.tileLayer(`https://api.inaturalist.org/v1/taxon_ranges/${id}/{z}/{x}/{y}.png`,{opacity:.45,maxZoom:12}).addTo(m);
    L.tileLayer(`https://api.inaturalist.org/v1/grid/{z}/{x}/{y}.png?taxon_id=${id}&verifiable=true&color=%23D9572B`,{maxZoom:12,opacity:.85}).addTo(m);
    L.circleMarker([loc.lat,loc.lon],{radius:6,color:'#fff',weight:2,fillColor:'#2F6FB5',fillOpacity:1}).addTo(m).bindTooltip(loc.name||'You');
    const b=await inat(`/observations?taxon_id=${id}&verifiable=true&return_bounds=true&per_page=0`,30*86400e3);const tb=b.total_bounds;
    if(tb&&tb.swlat!=null)m.fitBounds([[tb.swlat,tb.swlng],[tb.nelat,tb.nelng]],{padding:[12,12],maxZoom:6})}catch(e){const el=$('#map');if(el)el.innerHTML='<p class="small muted" style="padding:16px">Map not available offline.</p>'}};
  const el=$('#map');if('IntersectionObserver' in window){const o=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){o.disconnect();go()}},{rootMargin:'200px'});o.observe(el)}else go()}
async function sheetSimilar(id){const box=$('#similar');if(!box||!id)return;
  try{const d=await (await fetch(`${INAT2}/identifications/similar_species?taxon_id=${id}&locale=${I18N.lang}&fields=(count:!t,taxon:(id:!t,name:!t,rank:!t,preferred_common_name:!t,default_photo:(square_url:!t)))`)).json();
    const res=(d.results||[]).filter(x=>x.taxon&&x.taxon.rank==='species').slice(0,10);if(!res.length||!$('#similar'))return;
    $('#similar').innerHTML=`<h3>Often confused with</h3><div class="hscroll">${res.map(x=>`<button class="tile mini" data-sci="${esc(x.taxon.name)}"><img src="${esc(x.taxon.default_photo?.square_url||'')}" alt="" loading="lazy"><div class="t"><b>${esc(x.taxon.preferred_common_name||x.taxon.name)}</b><small class="sci">${esc(x.taxon.name)}</small><br><small>${x.count}× mixed up</small></div></button>`).join('')}</div>
      <p class="foot">How often iNaturalist identifiers confused these species with this one.</p>`;watchUp($('#similar'))}catch(e){}}
function statusRows(tx){const IUCN={LC:'Least Concern',NT:'Near Threatened',VU:'Vulnerable',EN:'Endangered',CR:'Critically Endangered',EW:'Extinct in the Wild',EX:'Extinct',DD:'Data Deficient',NE:'Not Evaluated',NA:'Not threatened (national)'};
  const all=(tx.conservation_statuses||[]);const g=all.find(s=>/IUCN/i.test(s.authority||'')&&!s.place)||tx.conservation_status;
  const out=[];if(g)out.push(['IUCN Red List',`${IUCN[(g.status||'').toUpperCase()]||g.status_name||g.status} (${(g.status||'').toUpperCase()})`]);
  all.filter(s=>s.place&&s.place.name).slice(0,5).forEach(s=>out.push([s.place.name,`${IUCN[(s.status||'').toUpperCase()]||s.status_name||s.status}`]));return out}

/* ---------- AI ornithologist notes (own Claude key) ---------- */
async function sheetExpert(sci,nameShown){const box=$('#expert');if(!box)return;const key=LS.get('apiKey','');const ck=`exp:${I18N.lang}:${sci}`;const cached=LS.get(ck,null);
  const show=t=>{box.innerHTML=`<h3>Ornithologist notes</h3><div class="card expert">${mdLite(t)}<p class="small muted" style="margin:10px 0 0">Written by Claude from Wikipedia, EltonTraits and iNaturalist data. Check important details against Birds of the World.</p></div>`};
  if(cached)return show(cached);
  if(!key&&typeof RELAY!=='undefined'&&RELAY){box.innerHTML=`<h3>Ornithologist notes</h3><div class="card stack"><p class="small muted" style="margin:0">A structured field account: identification by age and sex, voice, confusion species, habitat, behaviour, breeding, movements, conservation.</p><button class="btn primary" id="expBtn">Write notes</button></div>`;
    $('#expBtn').onclick=async()=>{const b=$('#expBtn');b.disabled=true;b.textContent='Writing…';try{const d=await relayPost('notes',{sci,lang:I18N.lang});LS.set(ck,d.text);show(d.text)}catch(e){b.disabled=false;b.textContent='Write notes';toast('Notes failed: '+e.message)}};return}
  box.innerHTML=`<h3>Ornithologist notes</h3><div class="card stack"><p class="small muted" style="margin:0">${key?'A structured field account: identification by age and sex, voice, confusion species, habitat, behaviour, breeding, movements, conservation.':'Add a Claude API key in the Photo tab to generate a structured field account for any species.'}</p>${key?'<button class="btn primary" id="expBtn">Write notes</button>':''}</div>`;
  const b=$('#expBtn');if(!b)return;b.onclick=async()=>{b.disabled=true;b.textContent='Writing…';
    try{const det=await detailsFor(sci)||{};const wikiTxt=Object.entries(mem).filter(([k])=>k.startsWith('wiki:')&&k.endsWith(':'+sci)).map(([,v])=>Object.values(v.query?.pages||{})[0]?.extract||'').join('\n').slice(0,9000);
      const sim=[...document.querySelectorAll('#similar .tile .sci')].map(e=>e.textContent).slice(0,8).join(', ');
      const prompt=`You are a field ornithologist writing a concise species account for birders.
Species: ${sci} (${nameShown}). User location: lat ${loc.lat}, lon ${loc.lon}. Month: ${new Date().toLocaleString('en',{month:'long'})}.
Data: body mass ${det.m||'?'} g; diet % ${JSON.stringify(det.di||[])} (order: invertebrates, endotherms, ectotherms, fish, other vertebrates, carrion, fruit, nectar, seeds, other plants); foraging strata % ${JSON.stringify(det.fs||[])}; species iNaturalist users confuse it with: ${sim||'unknown'}.
Reference text (Wikipedia, may be incomplete):\n${wikiTxt||'(none)'}
Write in ${I18N.lang==='es'?'Spanish (Argentina)':'English'}. Use these headings with short paragraphs or bullets: Identification (size, adult male, adult female, juvenile, key field marks), Voice, Similar species and how to separate them, Habitat and range, Behaviour and diet, Breeding, Movements, Conservation, Finding it near the user this month. Mark anything uncertain. Do not invent measurements not supported by the data. Use '## ' for headings and '- ' for bullets. Max 450 words.`;
      const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:LS.get('apiModel','claude-sonnet-5-5'),max_tokens:1400,messages:[{role:'user',content:prompt}]})});
      const d=await r.json();if(!r.ok)throw new Error(d.error?.message||('HTTP '+r.status));const t=d.content.map(c=>c.text||'').join('');LS.set(ck,t);show(t)}
    catch(e){b.disabled=false;b.textContent='Write notes';toast('Notes failed: '+e.message)}}}
function mdLite(t){return esc(t).split(/\n/).map(l=>l.startsWith('## ')?`<h4>${l.slice(3)}</h4>`:l.startsWith('- ')?`<li>${l.slice(2)}</li>`:l.trim()?`<p>${l}</p>`:'').join('').replace(/(<li>.*?<\/li>)+/g,m=>`<ul>${m}</ul>`).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}
