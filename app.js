/* ---------- basics ---------- */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const DEFAULT_LOC={lat:-27.6,lon:-55.333,name:'Leandro N. Alem'};
let loc=LS.get('loc',DEFAULT_LOC);
const settings=Object.assign({minConf:0.3,geoFilter:true},LS.get('settings',{}));
function bnWeek(d=new Date()){return d.getMonth()*4+Math.min(4,Math.max(1,Math.ceil(d.getDate()/7.75)))}
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2200)}
const GUIDE={};CURATED.forEach(r=>{GUIDE[r[3]]={id:r[0],es:r[1],en:r[2],sci:r[3],fam:r[4],ord:r[5],cm:r[6],hab:r[7],sea:r[8],col:r[9],marks:r[10],voice:r[11],beh:r[12],note:r[13],etym:r[14]}});
const HAB={town:'Town & gardens',farm:'Fields & pasture',forest:'Forest & edges',water:'Water',night:'Night'};
const SEA={R:'Resident',M:'Spring–summer migrant',P:'Resident + migrants'};

/* ---------- tabs ---------- */
const TITLES={sound:'Sound ID',photo:'Photo ID',explore:'Explore',life:'Collection',learn:'Learn'};
const tick=()=>{try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}};
function showTab(t){$('#pageTitle').textContent=TITLES[t]||'';$$('nav.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));$$('section[id^=t-]').forEach(s=>s.hidden=s.id!=='t-'+t);LS.set('tab',t);window.scrollTo(0,0);if(t==='explore')loadExplore();if(t==='life')renderLife();if(t==='learn')initLearn()}
$$('nav.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.t));

/* ---------- location ---------- */
function renderLoc(){$('#locBtn').innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>${esc(loc.name||(loc.lat.toFixed(2)+', '+loc.lon.toFixed(2)))}`;$('#locBtn').title='Week '+bnWeek()}
$('#locBtn').onclick=()=>{
  openSheet(`<div class="bar"><span></span><button class="btn sm" data-close>Done</button></div><div class="title">Location</div>
  <p class="muted" style="margin:4px 0 16px">Used for the BirdNET location filter and iNaturalist records nearby. Stays on this device.</p>
  <div class="stack"><button class="btn primary block" id="gpsBtn">Use my current location</button><button class="btn block" id="alemBtn">Leandro N. Alem (default)</button>
  <h3 style="margin:10px 4px 0">Coordinates</h3><div class="group"><div class="cell" style="cursor:default"><label class="grow" for="latI">Latitude</label><input type="number" id="latI" step="0.001" value="${loc.lat}" style="max-width:150px;text-align:right"></div><div class="cell" style="cursor:default"><label class="grow" for="lonI">Longitude</label><input type="number" id="lonI" step="0.001" value="${loc.lon}" style="max-width:150px;text-align:right"></div></div>
  <button class="btn block" id="manBtn">Set coordinates</button><p class="status" id="gpsMsg"></p></div>`);
  $('#gpsBtn').onclick=()=>{$('#gpsMsg').textContent='Locating…';navigator.geolocation.getCurrentPosition(p=>{setLoc({lat:+p.coords.latitude.toFixed(4),lon:+p.coords.longitude.toFixed(4),name:'My position'})},e=>{$('#gpsMsg').textContent='Location not available: '+e.message},{enableHighAccuracy:false,timeout:15000})};
  $('#alemBtn').onclick=()=>setLoc(DEFAULT_LOC);
  $('#manBtn').onclick=()=>{const la=+$('#latI').value,lo=+$('#lonI').value;if(Math.abs(la)<=90&&Math.abs(lo)<=180)setLoc({lat:la,lon:lo,name:''})};
};
function setLoc(l){loc=l;LS.set('loc',l);renderLoc();closeSheet();exploreCache={};if(bird.ready)bird.call({type:'location',lat:l.lat,lon:l.lon,week:bnWeek()},'located').then(()=>{geoListCache=null;toast('Location updated')});else toast('Location updated')}
renderLoc();

/* ---------- BirdNET worker ---------- */
const bird={w:null,ready:false,loading:false,busy:false,seq:0,pending:{},
  start(){if(this.w||this.loading)return this.readyP;this.loading=true;LS.set('modelWanted',true);
    $('#modelState').textContent='loading';$('#modelProg').hidden=false;$('#loadModel').disabled=true;
    this.w=new Worker('./worker.js');
    this.readyP=new Promise((res,rej)=>{this.w.onmessage=({data})=>{
      if(data.type==='progress'){$('#modelProg i').style.width=Math.round((data.stage==='model'?data.value*95:98))+'%';$('#modelState').textContent=data.stage==='model'?Math.round(data.value*100)+'%':'warming up'}
      else if(data.type==='ready'){this.ready=true;this.loading=false;$('#modelState').textContent='ready · offline';$('#modelState').className='pill hot';$('#modelProg').hidden=true;$('#loadModel').hidden=true;$('#modelHint').textContent=`${data.species.toLocaleString()} species · location filter week ${bnWeek()} · works offline`;LS.set('modelOk',true);res()}
      else if(data.id!=null&&this.pending[data.id]){const p=this.pending[data.id];delete this.pending[data.id];data.type==='error'?p.rej(new Error(data.message)):p.res(data)}
      else if(data.type==='located'&&this.pending.loc){this.pending.loc.res(data);delete this.pending.loc}
      else if(data.type==='error'){this.loading=false;$('#modelState').textContent='error';$('#modelHint').textContent='Could not load the model: '+data.message+'. Check the connection and try again. Sound ID needs WebGL (any modern phone browser).';$('#loadModel').disabled=false;this.w.terminate();this.w=null;rej(new Error(data.message))}
    }});
    this.w.postMessage({type:'init',lat:loc.lat,lon:loc.lon,week:bnWeek()});return this.readyP},
  call(msg,kind){if(kind==='located')return new Promise(res=>{this.pending.loc={res};this.w.postMessage(msg)});
    const id=++this.seq;return new Promise((res,rej)=>{this.pending[id]={res,rej};this.w.postMessage({...msg,id},msg.pcm?[]:undefined)})}
};
$('#loadModel').onclick=()=>bird.start().catch(()=>{});
if(LS.get('modelWanted',false))bird.start().catch(()=>{});

/* ---------- live listening ---------- */
const MIC_ICON=$('#listenBtn').innerHTML, STOP_ICON='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>';
const live={on:false,ctx:null,stream:null,node:null,an:null,buf:null,pos:0,sr:48000,timer:null,raf:null,dets:{},rec:[]};
$('#minConf').value=settings.minConf;$('#minConfV').textContent=Math.round(settings.minConf*100)+'%';$('#geoFilter').checked=settings.geoFilter;
$('#minConf').oninput=e=>{settings.minConf=+e.target.value;$('#minConfV').textContent=Math.round(settings.minConf*100)+'%';LS.set('settings',settings)};
$('#geoFilter').onchange=e=>{settings.geoFilter=e.target.checked;LS.set('settings',settings)};
function resampleTo48k(x,sr){if(sr===48000)return x;const r=48000/sr,n=Math.floor(x.length*r),y=new Float32Array(n);for(let i=0;i<n;i++){const t=i/r,j=Math.floor(t),f=t-j;y[i]=(x[j]||0)*(1-f)+(x[j+1]||0)*f}return y}
$('#listenBtn').onclick=async()=>{if(live.on)return stopLive();
  try{if(!bird.ready){$('#liveStatus').textContent='Loading the model first (one-time)…';await bird.start()}}catch(e){return}
  try{
    live.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  }catch(e){$('#liveStatus').textContent='Microphone blocked: allow it in the browser settings for this site.';return}
  let ctx;try{ctx=new AudioContext({sampleRate:48000})}catch(e){ctx=new AudioContext()}
  live.ctx=ctx;live.sr=ctx.sampleRate;await ctx.resume();
  const src=ctx.createMediaStreamSource(live.stream);
  live.an=ctx.createAnalyser();live.an.fftSize=2048;live.an.smoothingTimeConstant=0;src.connect(live.an);
  live.node=ctx.createScriptProcessor(4096,1,1);src.connect(live.node);live.node.connect(ctx.destination);
  const W=live.sr*3;live.buf=new Float32Array(W);live.pos=0;live.rec=[];live.dets={};live.total=0;
  live.node.onaudioprocess=e=>{const d=e.inputBuffer.getChannelData(0);live.rec.push(new Float32Array(d));live.total+=d.length;
    if(live.rec.length*4096>live.sr*120)live.rec.shift(); // keep last ~2 min for saving
    for(let i=0;i<d.length;i++){live.buf[live.pos]=d[i];live.pos=(live.pos+1)%W}};
  live.on=true;$('#listenBtn').classList.add('on');$('#listenBtn').innerHTML=STOP_ICON;$('#listenBtn').setAttribute('aria-label','Stop listening');$('#listenBtn').setAttribute('aria-pressed','true');tick();
  $('#liveStatus').textContent='Listening…';$('#detections').innerHTML='';
  live.timer=setInterval(analyseLive,1500);drawSpec();
};
async function analyseLive(){if(!live.on||bird.busy||live.total<live.sr*3)return;bird.busy=true;
  const W=live.buf.length,win=new Float32Array(W);win.set(live.buf.subarray(live.pos));win.set(live.buf.subarray(0,live.pos),W-live.pos);
  try{const r=await bird.call({type:'predict',pcm:resampleTo48k(win,live.sr),min:settings.minConf,geoFilter:settings.geoFilter});
    const now=Date.now();(r.segments[0]?.top||[]).forEach(b=>{if(!live.dets[b.sci])tick();const d=live.dets[b.sci]||(live.dets[b.sci]={...b,best:0,n:0,first:now});d.best=Math.max(d.best,b.conf);d.n++;d.last=now;d.geo=b.geo});
    renderDetections(Object.values(live.dets),true)}catch(e){}
  bird.busy=false}
function stopLive(){live.on=false;clearInterval(live.timer);cancelAnimationFrame(live.raf);try{live.node.disconnect();live.stream.getTracks().forEach(t=>t.stop());live.ctx.close()}catch(e){}
  $('#listenBtn').classList.remove('on');$('#listenBtn').innerHTML=MIC_ICON;$('#listenBtn').setAttribute('aria-label','Start listening');$('#listenBtn').setAttribute('aria-pressed','false');tick();
  const n=Object.keys(live.dets).length;$('#liveStatus').textContent=n?`Stopped. ${n} species detected. Tap one to log it to your journal.`:'Stopped. Nothing confident enough. Try closer, or lower the minimum confidence.';
  renderDetections(Object.values(live.dets),false)}
function drawSpec(){const c=$('#spec'),g=c.getContext('2d'),an=live.an,bins=an.frequencyBinCount,data=new Uint8Array(bins);
  const maxBin=Math.floor(bins*Math.min(1,12000/(live.sr/2)));
  const step=()=>{if(!live.on)return;an.getByteFrequencyData(data);g.drawImage(c,-2,0);
    for(let y=0;y<c.height;y++){const b=Math.floor((1-y/c.height)*maxBin),v=data[b]/255;g.fillStyle=`rgb(${Math.round(15+225*Math.min(1,v*1.4))},${Math.round(23+150*Math.pow(v,1.6))},${Math.round(18+60*Math.pow(v,3))})`;g.fillRect(c.width-2,y,2,1)}
    live.raf=requestAnimationFrame(step)};step()}
function renderDetections(list,isLive){const now=Date.now();list.sort((a,b)=>b.best-a.best);
  $('#detections').innerHTML=list.map(d=>{const hot=isLive&&now-d.last<3200,gd=GUIDE[d.sci];
    return `<button class="det${hot?' now':''}" data-sci="${esc(d.sci)}"><img data-photo="${esc(d.sci)}" alt=""><div style="min-width:0"><div class="nm">${esc(gd?gd.es:d.es)}</div><div class="sc">${esc(d.sci)} · ${esc(d.en)}</div><div class="bar"><i style="width:${Math.round(d.best*100)}%"></i></div></div><div class="right">${Math.round(d.best*100)}%<small>${d.n}× heard</small>${hot?'<span class="pill hot">now</span>':''}${d.geo<0.05?'<span class="pill warn">unusual here</span>':''}</div></button>`}).join('');
  hydratePhotos($('#detections'))}
$('#detections').addEventListener('click',e=>{const b=e.target.closest('[data-sci]');if(b)openSpecies(b.dataset.sci,{via:'sound',conf:live.dets[b.dataset.sci]?.best,geo:live.dets[b.dataset.sci]?.geo})});

/* analyse a file */
$('#audioFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{if(!bird.ready){$('#liveStatus').textContent='Loading the model first…';await bird.start()}}catch(err){return}
  $('#liveStatus').textContent='Decoding '+f.name+'…';
  try{const ab=await f.arrayBuffer();const tmp=new (window.AudioContext||window.webkitAudioContext)();const a=await tmp.decodeAudioData(ab);tmp.close();
    const off=new OfflineAudioContext(1,Math.ceil(a.duration*48000),48000),s=off.createBufferSource();s.buffer=a;s.connect(off.destination);s.start();
    const pcm=(await off.startRendering()).getChannelData(0).slice(0,48000*600);
    $('#liveStatus').textContent=`Analysing ${Math.round(pcm.length/48000)} s of audio…`;
    const r=await bird.call({type:'predict',pcm,overlap:1.5,min:settings.minConf,geoFilter:settings.geoFilter});
    const agg={};r.segments.forEach(sg=>sg.top.forEach(b=>{const d=agg[b.sci]||(agg[b.sci]={...b,best:0,n:0,times:[]});d.best=Math.max(d.best,b.conf);d.n++;d.times.push(sg.start)}));
    live.dets=agg;renderDetections(Object.values(agg),false);
    $('#liveStatus').textContent=Object.keys(agg).length?`${Object.keys(agg).length} species in ${f.name}. Tap to see details.`:'No species above the confidence threshold.';
  }catch(err){$('#liveStatus').textContent='Could not read that file ('+err.message+'). Try mp3, wav, m4a.'}};

/* ---------- iNaturalist ---------- */
const INAT='https://api.inaturalist.org/v1';
const mem={};
async function inat(path,ttl=86400e3){const key='inat:'+path;if(mem[key])return mem[key];
  const c=LS.get(key,null);if(c&&Date.now()-c.t<ttl)return mem[key]=c.d;
  const r=await fetch(INAT+path);if(!r.ok)throw new Error('iNaturalist '+r.status);const d=await r.json();mem[key]=d;
  if(JSON.stringify(d).length<60000)LS.set(key,{t:Date.now(),d});return d}
async function taxonBySci(sci){const k='tx:'+sci;if(mem[k])return mem[k];const c=LS.get(k,null);if(c)return mem[k]=c;
  const d=await inat(`/taxa?q=${encodeURIComponent(sci)}&rank=species,subspecies&is_active=true&per_page=10&locale=es`);
  const t=d.results.find(x=>x.name.toLowerCase()===sci.toLowerCase())||d.results.find(x=>x.rank==='species')||d.results[0]||null;
  const slim=t?{id:t.id,name:t.name,es:t.preferred_common_name||'',photo:t.default_photo?.medium_url||t.default_photo?.square_url||'',sq:t.default_photo?.square_url||''}:null;
  mem[k]=slim;if(slim)LS.set(k,slim);return slim}
/* lazy photo thumbnails, one request at a time */
const photoQ=[];let photoBusy=false;
function hydratePhotos(root){root.querySelectorAll('img[data-photo]:not([src])').forEach(img=>{if(img.dataset.queued)return;img.dataset.queued=1;photoQ.push(img)});pumpPhotos()}
async function pumpPhotos(){if(photoBusy)return;photoBusy=true;while(photoQ.length){const img=photoQ.shift();if(!img.isConnected)continue;try{const t=await taxonBySci(img.dataset.photo);if(t&&t.sq)img.src=t.sq;else img.alt='no photo'}catch(e){break}}photoBusy=false}

/* ---------- species sheet ---------- */
function openSheet(html){const wasOpen=$('#sheet').classList.contains('open');$('#sheetIn').innerHTML=html;$('#sheet').scrollTop=0;$('#sheet').classList.add('open');$('#backdrop').classList.add('open');document.body.style.overflow='hidden';if(!wasOpen)history.pushState({sheet:1},'')}
function closeSheet(){if(!$('#sheet').classList.contains('open'))return;$('#sheet').classList.remove('open');$('#backdrop').classList.remove('open');document.body.style.overflow='';$$('#sheet audio').forEach(a=>a.pause())}
$('#backdrop').onclick=()=>history.back();
$('#sheet').addEventListener('click',e=>{if(e.target.closest('[data-close]'))history.back()});
window.addEventListener('popstate',()=>closeSheet());
async function openSpecies(sci,ctx={}){const g=GUIDE[sci];
  openSheet(`<div class="bar"><button class="btn sm" data-close>Done</button><button class="btn sm primary" id="seenBtn"></button></div>
  <div class="title" id="spName">${esc(g?g.es:sci)}</div><div class="sci muted" style="font-size:17px">${esc(sci)}</div><div class="muted small" id="spSub" style="margin-top:2px">${g?esc(g.en+' · '+g.ord+' · '+g.fam):''}</div>
  ${ctx.via==='sound'&&ctx.conf?`<p class="small" style="margin:8px 0 0"><span class="pill hot">Heard · ${Math.round(ctx.conf*100)}% BirdNET confidence</span></p>`:''}
  ${ctx.via==='photo'&&ctx.conf?`<p class="small" style="margin:8px 0 0"><span class="pill hot">Photo match · ${Math.round(ctx.conf)}%</span></p>`:''}
  <div class="gallery" id="gal"><figure><img alt=""></figure></div>
  <div id="geoLine" class="small muted"></div>
  ${g?guideBlock(g):''}
  <h3>Sounds</h3><div id="snds" class="group"><p class="small muted" style="padding:12px 16px;margin:0">Loading recordings…</p></div>
  <h3>About</h3><div id="wiki" class="card">Loading…</div>
  <h3>More</h3><div class="row">
   <a class="btn sm" target="_blank" rel="noopener" href="https://xeno-canto.org/species/${esc(sci.replace(' ','-'))}">xeno-canto</a>
   <a class="btn sm" target="_blank" rel="noopener" href="https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(sci)}">iNaturalist</a>
   <a class="btn sm" target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/${encodeURIComponent(sci.replace(' ','_'))}">Wikipedia</a>
   <a class="btn sm" target="_blank" rel="noopener" href="https://ebird.org/explore?q=${encodeURIComponent(sci)}">eBird</a></div>`);
  const updSeen=()=>{const s=life()[sci];$('#seenBtn').textContent=s?`Log again · ${s.n}`:'Log sighting'};updSeen();
  $('#seenBtn').onclick=()=>{tick();openLog(sci,$('#spName').textContent,ctx)};
  if(bird.ready){bird.call({type:'geoOf',sci}).then(r=>{if(r.geo!=null)$('#geoLine').textContent=`BirdNET location model: ${Math.round(r.geo*100)}% likelihood here in week ${bnWeek()}${r.geo<0.05?' (unusual here: double-check)':''}.`}).catch(()=>{})}
  try{const t=await taxonBySci(sci);if(!t)throw new Error('not on iNaturalist');
    const [full,obs]=await Promise.all([inat(`/taxa/${t.id}?locale=es`),inat(`/observations?taxon_id=${t.id}&sounds=true&quality_grade=research&per_page=8&order_by=votes&locale=es`,6*3600e3)]);
    const tx=full.results[0];
    if(!g&&tx.preferred_common_name){$('#spName').textContent=tx.preferred_common_name;$('#spSub').textContent=[tx.english_common_name,tx.iconic_taxon_name].filter(Boolean).join(' · ')}
    const ph=(tx.taxon_photos||[]).slice(0,8).map(p=>p.photo);
    $('#gal').innerHTML=ph.length?ph.map(p=>`<figure><img loading="lazy" src="${esc(p.medium_url||p.url)}" alt="${esc(sci)}"><figcaption>${esc(p.attribution||'')}</figcaption></figure>`).join(''):'<p class="muted small">No photos on iNaturalist.</p>';
    let wk=tx.wikipedia_summary;if(!wk){try{wk=(await inat(`/taxa/${t.id}?locale=en`)).results[0].wikipedia_summary}catch(e){}}
    $('#wiki').innerHTML=wk?`<p style="margin:0">${wk.replace(/<(?!\/?(i|b|em|strong)\b)[^>]*>/g,'')}</p><p class="small muted">Wikipedia (CC BY-SA) via iNaturalist.</p>`:'<p class="small">No summary available.</p>';
    const sounds=[];(obs.results||[]).forEach(o=>(o.sounds||[]).forEach(s=>{if(s.file_url)sounds.push({url:s.file_url,att:s.attribution||o.user?.login||'',lic:s.license_code||'',place:o.place_guess||''})}));
    $('#snds').innerHTML=sounds.length?sounds.slice(0,6).map(s=>`<div class="sound"><audio controls preload="none" src="${esc(s.url)}"></audio><div class="small muted">${esc(s.att)}${s.lic?' · '+esc(s.lic.toUpperCase()):''}${s.place?' · '+esc(s.place):''}</div></div>`).join(''):`<p class="small muted" style="padding:12px 16px;margin:0">No research-grade recordings on iNaturalist. Try xeno-canto below.</p>`;
  }catch(e){$('#gal').innerHTML='';$('#snds').innerHTML=`<p class="small muted" style="padding:12px 16px;margin:0">Offline or not found (${esc(e.message)}). Links below open the species online.</p>`;$('#wiki').textContent=''}}
function guideBlock(g){return `<h3>Field guide</h3><div class="card stack"><div class="row"><span class="pill">${g.cm[0]}–${g.cm[1]} cm</span>${g.hab.map(h=>`<span class="pill">${HAB[h]}</span>`).join('')}<span class="pill${g.sea==='M'?' hot':''}">${SEA[g.sea]}</span></div>
  <div><b>Field marks</b><ul style="margin:6px 0 0;padding-left:20px">${g.marks.map(m=>`<li>${esc(m)}</li>`).join('')}</ul></div>
  <dl class="kv"><dt>Voice</dt><dd>${esc(g.voice)}</dd><dt>Behaviour</dt><dd>${esc(g.beh)}</dd><dt>Name</dt><dd>${esc(g.etym)}</dd></dl>
  <div class="note"><b>Why it matters.</b> ${esc(g.note)}</div></div>`}

/* ---------- explore ---------- */
let exploreSrc='inat',exploreCache={},geoListCache=null,exploreShown=60;
$$('#t-explore .seg button').forEach(b=>b.onclick=()=>{exploreSrc=b.dataset.src;$$('#t-explore .seg button').forEach(x=>x.setAttribute('aria-pressed',x===b));exploreShown=60;loadExplore()});
$('#exploreQ').oninput=()=>{exploreShown=60;renderExplore()};
$('#exploreMore').onclick=()=>{exploreShown+=60;renderExplore()};
async function getInatLocal(){const k=`${loc.lat},${loc.lon}`;if(exploreCache[k])return exploreCache[k];
  let all=[];for(let page=1;page<=3;page++){const d=await inat(`/observations/species_counts?taxon_id=3&lat=${loc.lat}&lng=${loc.lon}&radius=40&quality_grade=research&locale=es&per_page=200&page=${page}`,3*86400e3);all=all.concat(d.results);if(all.length>=d.total_results)break}
  return exploreCache[k]=all.filter(r=>r.taxon.rank==='species').map(r=>({sci:r.taxon.name,es:r.taxon.preferred_common_name||r.taxon.name,img:r.taxon.default_photo?.square_url||'',sub:`${r.count} records within 40 km`}))}
async function getGeoList(){if(geoListCache)return geoListCache;if(!bird.ready)return null;const r=await bird.call({type:'localList',thresh:0.05});
  return geoListCache=r.list.map(b=>({sci:b.sci,es:GUIDE[b.sci]?.es||b.es,img:'',sub:`${Math.round(b.geo*100)}% likely this week`}))}
let exploreItems=[];
async function loadExplore(){const hint=$('#exploreHint');$('#exploreList').innerHTML='<div class="empty">Loading…</div>';
  try{if(exploreSrc==='inat'){hint.textContent='Research-grade iNaturalist observations within 40 km, most-recorded first.';exploreItems=await getInatLocal()}
    else if(exploreSrc==='geo'){hint.textContent=`BirdNET location model: species expected at your location in week ${bnWeek()} (eBird-trained).`;const g=await getGeoList();if(!g){$('#exploreList').innerHTML='<div class="empty">Download the Sound ID model first (Sound tab). The location model comes with it.</div>';return}exploreItems=g}
    else{hint.textContent='The 55 species of the Aves de Alem guide, with field marks and science notes.';exploreItems=Object.values(GUIDE).map(g=>({sci:g.sci,es:g.es,img:'',sub:`${g.en} · ${g.cm[0]}–${g.cm[1]} cm`}))}
    renderExplore()}catch(e){$('#exploreList').innerHTML=`<div class="empty">Could not load (${esc(e.message)}). Offline? The Guide list works offline.</div>`}}
function renderExplore(){const q=$('#exploreQ').value.trim().toLowerCase();const items=exploreItems.filter(i=>!q||(i.es+' '+i.sci+' '+(GUIDE[i.sci]?.en||'')).toLowerCase().includes(q));
  $('#exploreList').innerHTML=items.length?items.slice(0,exploreShown).map(i=>`<button class="tile" data-sci="${esc(i.sci)}"><img ${i.img?`src="${esc(i.img)}"`:`data-photo="${esc(i.sci)}"`} loading="lazy" alt=""><div class="t"><b>${esc(i.es)}</b><small class="sci">${esc(i.sci)}</small><br><small>${esc(i.sub)}</small>${GUIDE[i.sci]?'<br><small><span class="dot"></span>guide notes</small>':''}</div></button>`).join(''):'<div class="empty">No match.</div>';
  $('#exploreMore').hidden=items.length<=exploreShown;hydratePhotos($('#exploreList'))}
$('#exploreList').addEventListener('click',e=>{const b=e.target.closest('[data-sci]');if(b)openSpecies(b.dataset.sci)});

/* ---------- photo ID (Claude) ---------- */
let photoFile=null;
function keyState(){const k=LS.get('apiKey','');$('#keyState').textContent=k?'· saved':'· not set';$('#apiModel').value=LS.get('apiModel','claude-sonnet-5-5');$('#photoGo').disabled=!photoFile;}
$('#saveKey').onclick=()=>{const v=$('#apiKey').value.trim();if(!v.startsWith('sk-'))return toast('That does not look like an Anthropic key');LS.set('apiKey',v);LS.set('apiModel',$('#apiModel').value);$('#apiKey').value='';keyState();toast('Key saved on this device')};
$('#clearKey').onclick=()=>{LS.set('apiKey','');keyState();toast('Key removed')};
$('#apiModel').onchange=e=>LS.set('apiModel',e.target.value);
$('#photoFile').onchange=e=>{photoFile=e.target.files[0]||null;if(photoFile){$('#photoPrev').src=URL.createObjectURL(photoFile);$('#photoPrev').hidden=false;$('#photoRes').innerHTML='';$('#photoDrop').lastChild.textContent='Choose another photo';$('#photoDrop').style.minHeight='64px'}keyState()};
async function toJpegB64(file){const bmp=await createImageBitmap(file);const s=Math.min(1,1400/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.86).split(',')[1]}
$('#photoGo').onclick=async()=>{const key=LS.get('apiKey','');if(!key){$('#photoMsg').textContent='Add your API key below, or use a free alternative.';$('#apiKey').focus();return}
  $('#photoGo').disabled=true;$('#photoMsg').textContent='Identifying…';$('#photoRes').innerHTML='';
  try{let local='';try{const g=await getGeoList();if(g)local=g.slice(0,220).map(b=>`${b.sci} (${b.es})`).join('; ')}catch(e){}
    if(!local)local=Object.values(GUIDE).map(g=>`${g.sci} (${g.es})`).join('; ');
    const prompt=`You are an expert field ornithologist. Location: lat ${loc.lat}, lon ${loc.lon} (${loc.name||'custom'}), date ${new Date().toISOString().slice(0,10)}. User notes: ${$('#photoNote').value||'none'}.
Species expected near this location (prior, not exhaustive): ${local}
Identify the bird in the photo. Weigh visible field marks first, the location prior second. If it is not a bird or too unclear, say so with low confidence.
Reply with ONLY JSON: {"candidates":[{"sci":"Genus species","common_es":"","common_en":"","confidence":0-100,"marks":"visible field marks supporting this, max 35 words"}],"separate":"how to tell the top two apart, max 30 words","tip":"what to photograph or listen for to confirm, max 25 words"} with 1-3 candidates, best first. Never invent marks you cannot see.`;
    const body={model:LS.get('apiModel','claude-sonnet-5-5'),max_tokens:900,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:await toJpegB64(photoFile)}},{type:'text',text:prompt}]}]};
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)});
    const d=await r.json();if(!r.ok)throw new Error(d.error?.message||('HTTP '+r.status));
    const txt=d.content.map(c=>c.text||'').join('');const j=JSON.parse(txt.slice(txt.indexOf('{'),txt.lastIndexOf('}')+1));
    $('#photoMsg').textContent='';
    $('#photoRes').innerHTML=(j.candidates||[]).map(c=>{const conf=Math.max(0,Math.min(100,+c.confidence||0)),g=GUIDE[c.sci];return `<button class="det" data-sci="${esc(c.sci)}" data-conf="${conf}"><img data-photo="${esc(c.sci)}" alt=""><div style="min-width:0"><div class="nm">${esc(g?g.es:(c.common_es||c.common_en||c.sci))}</div><div class="sc">${esc(c.sci)}${c.common_en?' · '+esc(c.common_en):''}</div><div class="bar"><i style="width:${conf}%"></i></div><div class="small" style="margin-top:6px">${esc(c.marks||'')}</div></div><div class="right">${conf}%</div></button>`}).join('')
      +(j.separate?`<p class="small muted" style="margin:0"><b>Telling them apart:</b> ${esc(j.separate)}</p>`:'')+(j.tip?`<p class="small muted" style="margin:0"><b>To confirm:</b> ${esc(j.tip)}</p>`:'');
    hydratePhotos($('#photoRes'))
  }catch(e){$('#photoMsg').textContent='Photo ID failed: '+e.message}
  $('#photoGo').disabled=false};
$('#photoRes').addEventListener('click',e=>{const b=e.target.closest('[data-sci]');if(b)openSpecies(b.dataset.sci,{via:'photo',conf:+b.dataset.conf,photoFile})});
keyState();

/* ---------- learn: quizzes ---------- */
let quizType='sound',quizScore=LS.get('quizScore',{ok:0,n:0}),quizPool=null;
$$('#t-learn .seg button').forEach(b=>b.onclick=()=>{quizType=b.dataset.q;$$('#t-learn .seg button').forEach(x=>x.setAttribute('aria-pressed',x===b));initLearn(true)});
async function getQuizPool(){if(quizPool)return quizPool;let p=[];try{p=(await getInatLocal()).slice(0,60)}catch(e){}if(p.length<8)p=Object.values(GUIDE).map(g=>({sci:g.sci,es:g.es}));return quizPool=p}
async function initLearn(force){if(quizType==='method'){$('#quizBox').hidden=true;$('#methodBox').hidden=false;$('#methodBox').innerHTML=METHOD;return}
  $('#quizBox').hidden=false;$('#methodBox').hidden=true;if(!force&&$('#quizBox').dataset.on)return;$('#quizBox').dataset.on=1;nextQuiz()}
async function nextQuiz(){const box=$('#quizBox');box.innerHTML='<p class="muted">Picking a local bird…</p>';
  try{const pool=await getQuizPool();let ans,media=null;
    for(let tries=0;tries<12&&!media;tries++){ans=pool[Math.floor(Math.random()*Math.min(pool.length,40))];const t=await taxonBySci(ans.sci);if(!t)continue;
      if(quizType==='photo'){const d=await inat(`/taxa/${t.id}`);const ph=(d.results[0].taxon_photos||[]).map(p=>p.photo);if(ph.length){const p=ph[Math.floor(Math.random()*Math.min(ph.length,6))];media={kind:'img',url:p.medium_url||p.url,att:p.attribution}}}
      else{const d=await inat(`/observations?taxon_id=${t.id}&sounds=true&quality_grade=research&per_page=10&order_by=votes`,6*3600e3);const s=(d.results||[]).flatMap(o=>o.sounds||[]).filter(s=>s.file_url);if(s.length){const x=s[Math.floor(Math.random()*s.length)];media={kind:'audio',url:x.file_url,att:x.attribution}}}}
    if(!media)throw new Error('no media found');
    const opts=[ans];while(opts.length<4&&opts.length<pool.length){const o=pool[Math.floor(Math.random()*pool.length)];if(!opts.some(x=>x.sci===o.sci))opts.push(o)}opts.sort(()=>Math.random()-.5);
    box.innerHTML=`<div class="row" style="justify-content:space-between"><b>${quizType==='sound'?'Who is singing?':'Who is this?'}</b><span class="pill">${quizScore.ok}/${quizScore.n}</span></div>
    ${media.kind==='img'?`<img class="photo-prev" src="${esc(media.url)}" alt="Quiz bird">`:`<audio controls autoplay src="${esc(media.url)}"></audio>`}<div class="small muted">${esc(media.att||'')} · iNaturalist</div>
    <div class="quizopts">${opts.map(o=>`<button data-s="${esc(o.sci)}">${esc(GUIDE[o.sci]?.es||o.es)} <span class="sci small muted">${esc(o.sci)}</span></button>`).join('')}</div><div id="qfb"></div>`;
    box.querySelectorAll('.quizopts button').forEach(b=>b.onclick=()=>{if(box.dataset.done==='1')return;box.dataset.done='1';const ok=b.dataset.s===ans.sci;quizScore.n++;if(ok){quizScore.ok++;toast('+5 XP')}LS.set('quizScore',quizScore);
      box.querySelectorAll('.quizopts button').forEach(x=>x.classList.add(x.dataset.s===ans.sci?'ok':(x===b?'no':'x')));
      const g=GUIDE[ans.sci];$('#qfb').innerHTML=`<p style="margin:8px 0">${ok?'Correct!':'It was <b>'+esc(g?.es||ans.es)+'</b>.'} ${g?esc(quizType==='sound'?g.voice:g.marks.join('; ')):''}</p><div class="row"><button class="btn primary" id="qNext">Next bird</button><button class="btn" id="qOpen">Open species</button></div>`;
      $('#qNext').onclick=()=>{box.dataset.done='0';nextQuiz()};$('#qOpen').onclick=()=>openSpecies(ans.sci)});
    box.dataset.done='0';
  }catch(e){box.innerHTML=`<p class="muted">Quiz needs a connection to iNaturalist (${esc(e.message)}).</p><button class="btn" id="qRetry">Try again</button>`;$('#qRetry').onclick=nextQuiz}}
const METHOD=`<div class="card prose"><h2 style="margin-top:0">GISS first, colour last</h2><p>Experts start with the General Impression of Size and Shape, then behaviour and habitat, then field marks, then voice.</p>
<div class="tw"><table><thead><tr><th>Reference bird</th><th>Length</th></tr></thead><tbody><tr><td>Chingolo</td><td class="mono">≈14 cm</td></tr><tr><td>Benteveo / Zorzal</td><td class="mono">≈22–24 cm</td></tr><tr><td>Paloma picazuró</td><td class="mono">≈35 cm</td></tr><tr><td>Carancho</td><td class="mono">≈55 cm</td></tr></tbody></table></div>
<h2>Bill = diet</h2><p>Conical: seeds (Chingolo, Jilguero). Thin: insects (Pitiayumí). Hooked: meat (Taguató). Huge: fruit (Tucán). Dagger: fish (Martín pescador).</p>
<h2>Bird topography</h2><div class="tw"><table><tbody><tr><td>Supercilium</td><td>eyebrow stripe (Calandria)</td></tr><tr><td>Eye-ring</td><td>ring round the eye (Zorzal colorado)</td></tr><tr><td>Lores</td><td>between eye and bill</td></tr><tr><td>Malar</td><td>moustache stripe (Carpintero real ♂)</td></tr><tr><td>Nape</td><td>back of the neck (Picazuró)</td></tr><tr><td>Wing bars</td><td>pale bands on the closed wing (Pitiayumí)</td></tr><tr><td>Vent / undertail</td><td>under the tail base (red in Loro maitaca)</td></tr></tbody></table></div>
<h2>Ears beat eyes in the forest</h2><p>In forest you hear ten birds for each one you see. Use Sound ID, then go find the bird and confirm it by sight: that is how you actually learn, and how BirdNET's occasional false positives get caught.</p>
<h2>Ethics</h2><p>Spring is nesting season: keep back from nests, no repeated playback near breeding birds. Never buy wild-caught birds. Log sightings on eBird or iNaturalist so they count for science.</p></div>`;

/* ---------- collection, journal & game (local-first, IndexedDB) ---------- */
const DB={p:null,
  open(){return this.p||(this.p=new Promise((res,rej)=>{const r=indexedDB.open('aves',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('sightings'))d.createObjectStore('sightings',{keyPath:'id'});if(!d.objectStoreNames.contains('photos'))d.createObjectStore('photos',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
  async tx(store,mode,fn){const d=await this.open();return new Promise((res,rej)=>{const t=d.transaction(store,mode),s=t.objectStore(store),q=fn(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)})},
  all(s){return this.tx(s,'readonly',st=>st.getAll())}, get(s,id){return this.tx(s,'readonly',st=>st.get(id))},
  put(s,v){return this.tx(s,'readwrite',st=>st.put(v))}, del(s,id){return this.tx(s,'readwrite',st=>st.delete(id))}};
const G={sightings:[],ready:false};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
async function loadGame(){try{G.sightings=await DB.all('sightings')}catch(e){G.sightings=[]}
  // migrate the old simple life list once
  const old=LS.get('life',null);if(old&&!LS.get('migrated',false)){for(const e of Object.values(old)){const s={id:uid(),sci:e.sci,es:e.es||e.sci,ts:e.first||new Date().toISOString(),count:1,note:'',via:(e.via||[])[0]||'manual',lat:e.loc?.lat,lon:e.loc?.lon};G.sightings.push(s);await DB.put('sightings',s).catch(()=>{})}LS.set('migrated',true)}
  G.ready=true;renderGameBits()}
/* life(): aggregate per species, used by the species sheet */
function life(){const L={};for(const s of G.sightings){const e=L[s.sci]||(L[s.sci]={sci:s.sci,es:s.es,n:0,birds:0,first:s.ts,last:s.ts,via:[]});e.n++;e.birds+=s.count||1;if(s.ts<e.first)e.first=s.ts;if(s.ts>e.last)e.last=s.ts;if(s.via&&!e.via.includes(s.via))e.via.push(s.via)}return L}

/* ----- scoring: everything derived from your data, so a restored backup restores your level ----- */
const LEVELS=[[0,'Egg','Huevo'],[100,'Chick','Pichón'],[300,'Fledgling','Volantón'],[600,'Wanderer','Caminante'],[1000,'Spotter','Avistador'],[1600,'Birder','Pajarero'],[2500,'Field naturalist','Naturalista'],[3800,'Forest listener','Oído del monte'],[5500,'Guardian of the selva','Guardián de la selva'],[8000,'Master birder','Maestro pajarero'],[11500,'Ornithologist','Ornitólogo'],[16000,'Legend of Misiones','Leyenda misionera']];
const dayKey=ts=>{const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const weekIdx=ts=>Math.floor((new Date(ts).getTime()/864e5+3)/7); // weeks start Monday
const CHALLENGES=[
 {t:'Log 5 different species this week',f:w=>new Set(w.map(s=>s.sci)).size,goal:5},
 {t:'Photograph 2 birds this week',f:w=>w.filter(s=>s.photo).length,goal:2},
 {t:'Log a bird before 8 am',f:w=>w.filter(s=>new Date(s.ts).getHours()<8).length,goal:1},
 {t:'Identify 2 birds by sound',f:w=>w.filter(s=>s.via==='sound').length,goal:2},
 {t:'Count a flock: one sighting of 10+ birds',f:w=>w.some(s=>(s.count||1)>=10)?1:0,goal:1},
 {t:'Add a new species to your collection',f:(w,all)=>w.filter(s=>firstOf(all,s.sci)===s.id).length,goal:1},
 {t:'Write field notes for 3 sightings',f:w=>w.filter(s=>(s.note||'').trim().length>=10).length,goal:3},
 {t:'Find 3 birds from the guide’s forest list',f:w=>new Set(w.filter(s=>GUIDE[s.sci]?.hab.includes('forest')).map(s=>s.sci)).size,goal:3}];
function firstOf(all,sci){let b=null;for(const s of all)if(s.sci===sci&&(!b||s.ts<b.ts))b=s;return b&&b.id}
const has=(st,list)=>list.filter(x=>st.species.has(x)).length;
const BADGES=[
 {id:'first',n:'First bird',d:'Log your first sighting',t:st=>st.species.size>=1},
 {id:'s10',n:'Ten species',d:'10 species in your collection',t:st=>st.species.size>=10},
 {id:'s25',n:'Quarter century',d:'25 species',t:st=>st.species.size>=25},
 {id:'s50',n:'Fifty',d:'50 species',t:st=>st.species.size>=50},
 {id:'s100',n:'Century',d:'100 species',t:st=>st.species.size>=100},
 {id:'s200',n:'Misiones expert',d:'200 species',t:st=>st.species.size>=200},
 {id:'count500',n:'Counter',d:'500 individual birds counted',t:st=>st.birds>=500},
 {id:'photo10',n:'Photographer',d:'10 sightings with your own photo',t:st=>st.photos>=10},
 {id:'notes10',n:'Field notebook',d:'10 sightings with notes',t:st=>st.notes>=10},
 {id:'ears',n:'Good ears',d:'10 sightings identified by sound',t:st=>st.sound>=10},
 {id:'dawn',n:'Dawn chorus',d:'5 sightings before 7 am',t:st=>st.dawn>=5},
 {id:'night',n:'Night watch',d:'A sighting after dark (20:00–05:00)',t:st=>st.night>=1},
 {id:'bigday',n:'Big Day',d:'20 species in one day',t:st=>st.maxDay>=20},
 {id:'streak7',n:'Week streak',d:'Log birds 7 days in a row',t:st=>st.bestStreak>=7},
 {id:'streak30',n:'Month streak',d:'30 days in a row',t:st=>st.bestStreak>=30},
 {id:'toucans',n:'Toucan trio',d:'Toco Toucan, Green-billed Toucan and Chestnut-eared Aracari',t:st=>has(st,['Ramphastos toco','Ramphastos dicolorus','Pteroglossus castanotis'])===3},
 {id:'hummers',n:'Hummingbird hunter',d:'3 hummingbird species',t:st=>st.fam['Trochilidae']>=3},
 {id:'raptors',n:'Raptor eye',d:'5 raptors (hawks, kites, falcons, vultures)',t:st=>(st.fam['Accipitridae']||0)+(st.fam['Falconidae']||0)+(st.fam['Cathartidae']||0)>=5},
 {id:'woodpeck',n:'Knock knock',d:'3 woodpecker species',t:st=>st.fam['Picidae']>=3},
 {id:'migrants',n:'Welcome back',d:'3 spring migrants (Tijereta, Suirirí, Golondrina…)',t:st=>has(st,CURATED.filter(r=>r[8]==='M').map(r=>r[3]))>=3},
 {id:'endemic',n:'Atlantic Forest',d:'2 Atlantic Forest endemics from the guide',t:st=>has(st,['Ramphastos dicolorus','Tangara seledon','Chiroxiphia caudata','Penelope obscura'])>=2},
 {id:'guide55',n:'Guide complete',d:'All 55 guide species',t:st=>has(st,CURATED.map(r=>r[3]))>=55},
 {id:'rare',n:'Rarity',d:'A species the location model rates under 5% here',t:st=>st.rare>=1},
 {id:'quiz25',n:'Quiz master',d:'25 correct quiz answers',t:st=>st.quiz>=25}];
function stats(){const all=G.sightings,st={species:new Set(),birds:0,photos:0,notes:0,sound:0,dawn:0,night:0,maxDay:0,fam:{},rare:0,quiz:(LS.get('quizScore',{ok:0}).ok||0)};
  const perDay={};for(const s of all){st.species.add(s.sci);st.birds+=s.count||1;if(s.photo)st.photos++;if((s.note||'').trim().length>=10)st.notes++;if(s.via==='sound')st.sound++;const h=new Date(s.ts).getHours();if(h<7&&h>=4)st.dawn++;if(h>=20||h<5)st.night++;(perDay[dayKey(s.ts)]||(perDay[dayKey(s.ts)]=new Set())).add(s.sci)}
  for(const sci of st.species){const f=(GUIDE[sci]?.fam||'').split(' ')[0];if(f)st.fam[f]=(st.fam[f]||0)+1;const first=all.filter(s=>s.sci===sci).sort((a,b)=>a.ts.localeCompare(b.ts))[0];if(first&&first.geo!=null&&first.geo<0.05)st.rare++}
  st.maxDay=Math.max(0,...Object.values(perDay).map(x=>x.size));
  const days=Object.keys(perDay).sort();let best=0,run=0,prev=null;for(const d of days){const t=new Date(d+'T12:00').getTime();run=prev&&Math.round((t-prev)/864e5)===1?run+1:1;best=Math.max(best,run);prev=t}st.bestStreak=best;
  let cur=0;{let t=new Date();t.setHours(12,0,0,0);if(!perDay[dayKey(t)])t=new Date(t-864e5);while(perDay[dayKey(t)]){cur++;t=new Date(t-864e5)}}st.streak=cur;
  // challenge completions over all weeks
  const byWeek={};for(const s of all)(byWeek[weekIdx(s.ts)]||(byWeek[weekIdx(s.ts)]=[])).push(s);
  st.challenges=Object.entries(byWeek).filter(([w,list])=>{const c=CHALLENGES[w%CHALLENGES.length];return c.f(list,all)>=c.goal}).length;
  // XP
  let xp=0;const firsts=new Set();for(const sci of st.species)firsts.add(firstOf(all,sci));
  for(const s of all){xp+=10+(s.photo?20:0)+((s.note||'').trim().length>=10?10:0)+(s.via==='sound'||s.via==='photo'?15:0);if(firsts.has(s.id)){xp+=100;if(s.geo!=null)xp+=s.geo<0.05?250:s.geo<0.2?100:0}}
  xp+=st.quiz*5+st.challenges*150;st.badges=BADGES.filter(b=>b.t(st));xp+=st.badges.length*50;st.xp=xp;
  let li=0;for(let i=0;i<LEVELS.length;i++)if(xp>=LEVELS[i][0])li=i;st.level=li;st.next=LEVELS[li+1]?.[0]??null;return st}
function levelName(i){return `${LEVELS[i][1]} · ${LEVELS[i][2]}`}

/* ----- log a sighting ----- */
async function openLog(sci,es,ctx={}){let photoBlob=null;const now=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
  openSheet(`<div class="bar"><button class="btn sm" data-close>Cancel</button><button class="btn sm primary" id="logSave">Save</button></div>
  <div class="title">${esc(es)}</div><div class="sci muted">${esc(sci)}</div>
  ${ctx.via==='sound'?`<p style="margin:8px 0 0"><span class="pill hot">Identified by sound${ctx.conf?' · '+Math.round(ctx.conf*100)+'%':''}</span></p>`:ctx.via==='photo'?`<p style="margin:8px 0 0"><span class="pill hot">Identified from photo</span></p>`:''}
  <h3>How many?</h3><div class="group"><div class="cell" style="cursor:default;justify-content:space-between"><button class="btn" id="cMinus" aria-label="Fewer">−</button><input type="number" id="cVal" value="1" min="1" inputmode="numeric" style="max-width:110px;text-align:center;font-size:24px;font-weight:700" aria-label="Count"><button class="btn" id="cPlus" aria-label="More">+</button></div></div>
  <h3>When</h3><div class="group"><div class="cell" style="cursor:default"><input type="datetime-local" id="lWhen" value="${now}" style="width:100%;border:0;background:none;font:17px var(--font);color:var(--ink)" aria-label="Date and time"></div></div>
  <h3>Field notes</h3><textarea id="lNote" rows="3" placeholder="Behaviour, habitat, song, who you were with…" style="width:100%;font:17px var(--font);padding:12px 14px;border:0;border-radius:12px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow)"></textarea>
  <h3>Photo</h3><label class="drop" for="lPhoto" id="lDrop" style="min-height:96px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg><span>Add your photo (+20 XP)</span></label><input type="file" id="lPhoto" accept="image/*" hidden><img id="lPrev" class="photo-prev" hidden alt="Your photo">
  <p class="foot" style="margin-top:12px">Location: ${esc(loc.name||(loc.lat.toFixed(3)+', '+loc.lon.toFixed(3)))}. Saved on this device; back it up in Collection.</p>`);
  const cv=$('#cVal');$('#cMinus').onclick=()=>{cv.value=Math.max(1,(+cv.value||1)-1);tick()};$('#cPlus').onclick=()=>{cv.value=(+cv.value||0)+1;tick()};
  if(ctx.photoFile){photoBlob=ctx.photoFile;$('#lPrev').src=URL.createObjectURL(photoBlob);$('#lPrev').hidden=false}
  $('#lPhoto').onchange=e=>{photoBlob=e.target.files[0]||null;if(photoBlob){$('#lPrev').src=URL.createObjectURL(photoBlob);$('#lPrev').hidden=false}};
  let geo=ctx.geo??null;if(geo==null&&bird.ready){try{geo=(await bird.call({type:'geoOf',sci})).geo}catch(e){}}
  $('#logSave').onclick=async()=>{$('#logSave').disabled=true;const before=stats();
    const s={id:uid(),sci,es,ts:new Date($('#lWhen').value||Date.now()).toISOString(),count:Math.max(1,Math.round(+cv.value||1)),note:$('#lNote').value.trim(),via:ctx.via||'manual',conf:ctx.conf??null,geo,lat:loc.lat,lon:loc.lon,place:loc.name||''};
    try{if(photoBlob){const pid='p'+s.id;await DB.put('photos',{id:pid,blob:await shrink(photoBlob,1600)});s.photo=pid}
      await DB.put('sightings',s);G.sightings.push(s);try{navigator.storage?.persist?.()}catch(e){}
    }catch(e){toast('Could not save: '+e.message);$('#logSave').disabled=false;return}
    const after=stats();history.back();renderGameBits();celebrate(before,after,s)}}
async function shrink(file,max){try{const bmp=await createImageBitmap(file);const k=Math.min(1,max/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);return await new Promise(r=>c.toBlob(r,'image/jpeg',0.85))}catch(e){return file}}
function celebrate(b,a,s){const gained=a.xp-b.xp,isNew=!b.species.has(s.sci),newBadges=a.badges.filter(x=>!b.badges.some(y=>y.id===x.id)),lvUp=a.level>b.level;tick();
  if(!lvUp&&!newBadges.length){toast(`+${gained} XP${isNew?' · New species!':''}`);return}
  setTimeout(()=>{openSheet(`<div class="bar"><span></span><button class="btn sm" data-close>Done</button></div>
   <div style="text-align:center;padding:10px 0 4px"><canvas id="confetti" width="600" height="220" style="width:100%;height:110px"></canvas>
   ${lvUp?`<div class="eyebrow">Level up</div><div class="title" style="font-size:32px">${esc(levelName(a.level))}</div>`:''}
   <p class="muted">+${gained} XP${isNew?' · new species: '+esc(s.es):''}</p></div>
   ${newBadges.length?`<h3>New badge${newBadges.length>1?'s':''}</h3><div class="stack">${newBadges.map(b=>badgeHTML(b,false)).join('')}</div>`:''}`);confetti($('#confetti'))},250)}
function confetti(c){if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const g=c.getContext('2d'),cols=['#D9572B','#2E9D49','#E8C22E','#2F6FB5','#FF7A45'],P=Array.from({length:70},()=>({x:300,y:200,vx:(Math.random()-.5)*9,vy:-Math.random()*9-4,c:cols[Math.random()*5|0],r:Math.random()*5+3}));let t=0;(function f(){g.clearRect(0,0,600,220);for(const p of P){p.x+=p.vx;p.y+=p.vy;p.vy+=.28;g.fillStyle=p.c;g.fillRect(p.x,p.y,p.r,p.r*.6)}if(++t<90)requestAnimationFrame(f)})()}
function badgeHTML(b,locked){return `<div class="det" style="cursor:default${locked?';opacity:.45':''}"><svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="${locked?'var(--fill)':'var(--tint)'}"/><circle cx="24" cy="24" r="16" fill="none" stroke="${locked?'var(--ink3)':'#fff'}" stroke-width="2" stroke-dasharray="3 3"/><text x="24" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="${locked?'var(--ink2)':'#fff'}" font-family="system-ui">${esc(b.n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())}</text></svg><div style="min-width:0"><div class="nm">${esc(b.n)}</div><div class="small muted">${esc(b.d)}</div></div></div>`}

/* ----- collection tab ----- */
let colView='journal';
function renderGameBits(){if(!$('#t-life').hidden)renderLife()}
async function renderLife(){if(!G.ready)return;const st=stats(),prof=LS.get('profile',{name:''});
  const lv=st.level,base=LEVELS[lv][0],pct=st.next?Math.round((st.xp-base)/(st.next-base)*100):100;
  const wk=weekIdx(Date.now()),ch=CHALLENGES[wk%CHALLENGES.length],weekS=G.sightings.filter(s=>weekIdx(s.ts)===wk),chv=Math.min(ch.goal,ch.f(weekS,G.sightings));
  $('#lifeHead').innerHTML=`<div class="card stack" style="gap:10px">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="eyebrow">${esc(prof.name||'Your profile')}</div><div style="font:700 24px/1.15 var(--font-d)">${esc(levelName(lv))}</div></div><button class="btn sm" id="profBtn">Edit</button></div>
    <div><div class="progress" style="height:8px"><i style="width:${pct}%"></i></div><div class="small muted" style="margin-top:6px">${st.xp.toLocaleString()} XP${st.next?` · ${(st.next-st.xp).toLocaleString()} to ${esc(LEVELS[lv+1][1])}`:' · top level'}</div></div>
    <div class="row" style="justify-content:space-between;text-align:center">${[[st.species.size,'species'],[st.birds.toLocaleString(),'birds counted'],[st.streak,'day streak'],[st.badges.length+'/'+BADGES.length,'badges']].map(([v,l])=>`<div style="flex:1;min-width:64px"><div style="font:700 22px var(--font-d)">${v}</div><div class="small muted">${l}</div></div>`).join('')}</div></div>
   <h3>This week’s challenge</h3><div class="card"><div class="row" style="justify-content:space-between"><b>${esc(ch.t)}</b><span class="pill${chv>=ch.goal?' hot':''}">${chv>=ch.goal?'Done · +150 XP':chv+' / '+ch.goal}</span></div><div class="progress" style="margin-top:10px"><i style="width:${Math.round(chv/ch.goal*100)}%"></i></div></div>`;
  $('#profBtn').onclick=editProfile;
  $$('#colSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===colView));
  const box=$('#lifeList');
  if(colView==='journal'){const L=[...G.sightings].sort((a,b)=>b.ts.localeCompare(a.ts));let last='';
    box.innerHTML=L.length?L.slice(0,300).map(s=>{const d=new Date(s.ts).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'}),hdr=d!==last?`<h3 style="margin-top:14px">${esc(d)}</h3>`:'';last=d;
      return hdr+`<button class="det" data-sid="${s.id}"><img ${s.photo?`data-own="${s.photo}"`:`data-photo="${esc(s.sci)}"`} alt=""><div style="min-width:0"><div class="nm">${esc(s.es)}</div><div class="sc">${esc(s.sci)}</div><div class="small muted">${new Date(s.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}${s.note?' · '+esc(s.note.slice(0,60)):''}</div></div><div class="right">×${s.count||1}<small>${esc(s.via)}</small></div></button>`}).join(''):'<div class="empty">Your journal is empty. Identify a bird by sound or photo, or open any species and tap “Log sighting”.</div>'}
  else if(colView==='collection'){let pool=[];try{pool=await getInatLocal()}catch(e){}if(pool.length<20)pool=Object.values(GUIDE).map(g=>({sci:g.sci,es:g.es,img:''}));const L=life();
    const seen=Object.values(L).sort((a,b)=>a.first.localeCompare(b.first));const missing=pool.filter(p=>!L[p.sci]);
    box.innerHTML=`<p class="small muted" style="margin:0 4px">${seen.length} found · ${pool.filter(p=>L[p.sci]).length} of ${pool.length} species recorded around you</p><div class="grid2">`+
      seen.map(e=>`<button class="tile" data-sci="${esc(e.sci)}"><img data-photo="${esc(e.sci)}" alt=""><div class="t"><b>${esc(e.es)}</b><small>×${e.birds} counted · ${e.n} log${e.n>1?'s':''}</small></div></button>`).join('')+
      missing.slice(0,120).map(p=>`<button class="tile" data-sci="${esc(p.sci)}" style="opacity:.55"><img ${p.img?`src="${esc(p.img)}"`:`data-photo="${esc(p.sci)}"`} alt="" style="filter:grayscale(1) blur(1px)"><div class="t"><b>${esc(p.es)}</b><small>Not found yet</small></div></button>`).join('')+'</div>'}
  else{box.innerHTML=`<div class="stack">${BADGES.map(b=>badgeHTML(b,!st.badges.some(x=>x.id===b.id))).join('')}</div>`}
  hydratePhotos(box);box.querySelectorAll('img[data-own]').forEach(async img=>{const p=await DB.get('photos',img.dataset.own).catch(()=>null);if(p)img.src=URL.createObjectURL(p.blob)})}
$('#colSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(b){colView=b.dataset.v;renderLife()}});
$('#lifeList').addEventListener('click',e=>{const s=e.target.closest('[data-sid]');if(s)return openSighting(s.dataset.sid);const b=e.target.closest('[data-sci]');if(b)openSpecies(b.dataset.sci)});
async function openSighting(id){const s=G.sightings.find(x=>x.id===id);if(!s)return;
  openSheet(`<div class="bar"><button class="btn sm" data-close>Done</button><button class="btn sm" id="sDel" style="color:var(--red)">Delete</button></div>
   <div class="title">${esc(s.es)}</div><div class="sci muted">${esc(s.sci)}</div>
   <img id="sImg" class="photo-prev" hidden alt="Your photo" style="margin-top:12px">
   <h3>Details</h3><div class="group"><div class="cell" style="cursor:default"><span class="grow">Count</span><b>×${s.count||1}</b></div><div class="cell" style="cursor:default"><span class="grow">When</span><span class="muted">${new Date(s.ts).toLocaleString()}</span></div><div class="cell" style="cursor:default"><span class="grow">How</span><span class="muted">${esc(s.via)}${s.conf?' · '+Math.round(s.conf*100)+'%':''}</span></div><div class="cell" style="cursor:default"><span class="grow">Where</span><span class="muted">${esc(s.place||'')} ${s.lat!=null?s.lat.toFixed(3)+', '+s.lon.toFixed(3):''}</span></div></div>
   ${s.note?`<h3>Field notes</h3><div class="card">${esc(s.note)}</div>`:''}
   <div style="margin-top:16px"><button class="btn block" id="sSp">Open species</button></div>`);
  if(s.photo){const p=await DB.get('photos',s.photo).catch(()=>null);if(p){$('#sImg').src=URL.createObjectURL(p.blob);$('#sImg').hidden=false}}
  $('#sSp').onclick=()=>openSpecies(s.sci);
  $('#sDel').onclick=async()=>{if($('#sDel').dataset.armed!=='1'){$('#sDel').dataset.armed='1';$('#sDel').textContent='Tap again to delete';return}
    await DB.del('sightings',s.id);if(s.photo)await DB.del('photos',s.photo).catch(()=>{});G.sightings=G.sightings.filter(x=>x.id!==s.id);history.back();renderLife();toast('Sighting deleted')}}
function editProfile(){const p=LS.get('profile',{name:''});openSheet(`<div class="bar"><button class="btn sm" data-close>Cancel</button><button class="btn sm primary" id="pSave">Save</button></div><div class="title">Profile</div>
  <h3>Your name</h3><input type="text" id="pName" value="${esc(p.name||'')}" placeholder="Name shown on your profile" maxlength="40">
  <p class="foot" style="margin-top:10px">Your profile, journal, photos and counts live on this device. Use Backup to keep them safe or move them to a new phone.</p>`);
  $('#pSave').onclick=()=>{LS.set('profile',{...p,name:$('#pName').value.trim()});history.back();renderLife()}}

/* ----- backup & restore (journal + photos + counts + quiz) ----- */
const b64=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)});
$('#backupBtn').onclick=async()=>{toast('Preparing backup…');const photos=await DB.all('photos');
  const data={app:'aves-de-alem',version:1,exported:new Date().toISOString(),profile:LS.get('profile',{}),quizScore:LS.get('quizScore',{ok:0,n:0}),settings,loc,sightings:G.sightings,photos:await Promise.all(photos.map(async p=>({id:p.id,data:await b64(p.blob)})))};
  const file=new File([JSON.stringify(data)],`aves-backup-${dayKey(Date.now())}.json`,{type:'application/json'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Aves de Alem backup'});return}}catch(e){if(e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();LS.set('lastBackup',Date.now())};
$('#restoreFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const d=JSON.parse(await f.text());if(d.app!=='aves-de-alem')throw new Error('not an Aves de Alem backup');
    let n=0;for(const p of d.photos||[]){const blob=await (await fetch(p.data)).blob();await DB.put('photos',{id:p.id,blob})}
    for(const s of d.sightings||[]){if(!G.sightings.some(x=>x.id===s.id)){await DB.put('sightings',s);G.sightings.push(s);n++}}
    if(d.profile&&!LS.get('profile',{}).name)LS.set('profile',d.profile);
    const q=LS.get('quizScore',{ok:0,n:0});if((d.quizScore?.ok||0)>q.ok)LS.set('quizScore',d.quizScore);
    renderLife();toast(`Restored ${n} sightings`)}catch(err){toast('Restore failed: '+err.message)}};
$('#exportCsv').onclick=()=>{if(!G.sightings.length)return toast('Journal is empty');
  const csv='date_time,scientific_name,common_name,count,method,confidence,notes,lat,lon,place\n'+G.sightings.map(s=>[s.ts,s.sci,s.es,s.count||1,s.via,s.conf??'',s.note||'',s.lat??'',s.lon??'',s.place||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`aves-journal-${dayKey(Date.now())}.csv`;a.click()};
loadGame();

/* ---------- start ---------- */
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
const startTab=LS.get('tab','sound');showTab(['sound','photo','explore','life','learn'].includes(startTab)?startTab:'sound');
