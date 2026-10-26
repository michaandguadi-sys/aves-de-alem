/* Aves de Alem: English / Español. The app is written in English; this layer swaps every
   visible string (static, dynamic, attributes) to Spanish and back without a reload. */
const I18N={lang:(()=>{try{const v=JSON.parse(localStorage.getItem('lang'));if(v==='es'||v==='en')return v}catch(e){}return (navigator.language||'').toLowerCase().startsWith('es')?'es':'en'})()};
const ES={
// tabs, titles, header
'Aves de Alem':'Aves de Alem','Sound':'Sonido','Photo':'Foto','Explore':'Explorar','Collection':'Colección','Learn':'Aprender',
'Sound ID':'ID por sonido','Photo ID':'ID por foto','Main':'Principal','Change location':'Cambiar ubicación','My position':'Mi ubicación',
// sound tab
'not installed':'sin instalar','loading':'cargando','warming up':'preparando','ready · offline':'listo · sin conexión','error':'error',
'BirdNET by Cornell Lab and TU Chemnitz recognises about 6,500 species by sound. It runs on your phone and audio never leaves the device. One-time download, about 64 MB, then it works offline.':'BirdNET (Cornell Lab y TU Chemnitz) reconoce unas 6.500 especies por su canto. Funciona en tu teléfono y el audio nunca sale del dispositivo. Descarga única de unos 64 MB; después funciona sin conexión.',
'Install Sound ID':'Instalar ID por sonido','Start listening':'Empezar a escuchar','Stop listening':'Dejar de escuchar',
'Tap to listen. Point the phone at the bird.':'Tocá para escuchar. Apuntá el teléfono hacia el ave.','Listening…':'Escuchando…',
'Live spectrogram':'Espectrograma en vivo','Analyse a recording':'Analizar una grabación','Settings':'Ajustes',
'Only birds expected here':'Solo aves esperables acá','BirdNET location model, this week':'Modelo de ubicación de BirdNET, esta semana',
'Minimum confidence ·':'Confianza mínima ·',
'Treat single detections under about 50% as “possible” and confirm by sight or a second detection.':'Tomá las detecciones aisladas por debajo de ~50 % como “posibles” y confirmalas viendo el ave o con una segunda detección.',
'Loading the model first (one-time)…':'Cargando el modelo (solo la primera vez)…','Loading the model first…':'Cargando el modelo…',
'Microphone blocked: allow it in the browser settings for this site.':'Micrófono bloqueado: permitilo en los ajustes del navegador para este sitio.',
'Stopped. Nothing confident enough. Try closer, or lower the minimum confidence.':'Detenido. Nada con suficiente confianza. Acercate o bajá la confianza mínima.',
'No species above the confidence threshold.':'Ninguna especie supera el umbral de confianza.',
'unusual here':'inusual acá','now':'ahora',
// photo tab
'Take or choose a photo':'Sacá o elegí una foto','Choose another photo':'Elegir otra foto','Optional: size, behaviour, where it was':'Opcional: tamaño, comportamiento, dónde estaba',
'Identify':'Identificar','Identifying…':'Identificando…','Claude API key':'Clave API de Claude','API key':'Clave API','Model':'Modelo',
'Photo ID uses Claude vision with your own Anthropic API key (console.anthropic.com). The key stays on this device and is sent only to api.anthropic.com. About 1–2 US cents per photo.':'La ID por foto usa la visión de Claude con tu propia clave API de Anthropic (console.anthropic.com). La clave queda en este dispositivo y solo se envía a api.anthropic.com. Cuesta 1–2 centavos de dólar por foto.',
'Claude Sonnet 5.5 (best)':'Claude Sonnet 5.5 (mejor)','Claude Haiku 5.5 (cheaper)':'Claude Haiku 5.5 (más barato)','Save key':'Guardar clave','Remove':'Quitar',
'· saved':'· guardada','· not set':'· sin configurar','Free alternatives':'Alternativas gratis','Upload the same photo there':'Subí la misma foto ahí',
'Aves de Alem guide in Claude':'Guía Aves de Alem en Claude','Photo ID with your Claude plan':'ID por foto con tu plan de Claude',
'Add your API key below, or use a free alternative.':'Agregá tu clave API abajo o usá una alternativa gratis.',
'Telling them apart:':'Cómo distinguirlas:','To confirm:':'Para confirmar:','Key saved on this device':'Clave guardada en este dispositivo','Key removed':'Clave quitada',
'That does not look like an Anthropic key':'Eso no parece una clave de Anthropic',
// explore
'Recorded here':'Registradas acá','This week':'Esta semana','Guide':'Guía','Search':'Buscar','Search birds':'Buscar aves','Source':'Fuente','Show more':'Mostrar más',
'Research-grade iNaturalist observations within 40 km, most-recorded first.':'Observaciones de iNaturalist con grado de investigación en 40 km, las más registradas primero.',
'The 55 species of the Aves de Alem guide, with field marks and science notes.':'Las 55 especies de la guía Aves de Alem, con rasgos de campo y notas científicas.',
'Download the Sound ID model first (Sound tab). The location model comes with it.':'Primero descargá el modelo de ID por sonido (pestaña Sonido). El modelo de ubicación viene incluido.',
'Loading…':'Cargando…','No match.':'Sin resultados.','guide notes':'notas de la guía',
// species sheet
'Done':'Listo','Log sighting':'Registrar avistaje','Field guide':'Guía de campo','Field marks':'Rasgos de campo','Voice':'Voz','Behaviour':'Comportamiento','Name':'Nombre',
'Why it matters.':'Por qué importa.','Facts':'Datos','Order':'Orden','Family':'Familia','Status':'Estado','Observations':'Observaciones','English name':'Nombre en inglés',
'Sounds':'Sonidos','About':'Acerca de','More':'Más','Loading recordings…':'Cargando grabaciones…',
'No research-grade recordings on iNaturalist. Try xeno-canto below.':'No hay grabaciones con grado de investigación en iNaturalist. Probá xeno-canto abajo.',
'No photos on iNaturalist.':'No hay fotos en iNaturalist.','No summary available.':'No hay resumen disponible.','Wikipedia (CC BY-SA) via iNaturalist.':'Wikipedia (CC BY-SA) vía iNaturalist.',
'Text:':'Texto:','English Wikipedia':'Wikipedia en inglés','Spanish Wikipedia':'Wikipedia en español','…continued on Wikipedia':'…sigue en Wikipedia',
'Least Concern':'Preocupación menor','Near Threatened':'Casi amenazada','Vulnerable':'Vulnerable','Endangered':'En peligro','Critically Endangered':'En peligro crítico','Extinct in the Wild':'Extinta en estado silvestre','Extinct':'Extinta','Data Deficient':'Datos insuficientes',
'Town & gardens':'Pueblo y jardines','Fields & pasture':'Campos y pasturas','Forest & edges':'Monte y bordes','Water':'Agua','Night':'Noche',
'Resident':'Residente','Spring–summer migrant':'Migrante de primavera–verano','Resident + migrants':'Residente + migrantes',
// log sheet
'Cancel':'Cancelar','Save':'Guardar','How many?':'¿Cuántas?','When':'Cuándo','Field notes':'Notas de campo','Fewer':'Menos','Count':'Cantidad','Date and time':'Fecha y hora',
'Behaviour, habitat, song, who you were with…':'Comportamiento, hábitat, canto, con quién estabas…','Add your photo (+20 XP)':'Agregá tu foto (+20 XP)',
'Identified from photo':'Identificada por foto','Level up':'Subiste de nivel','New badge':'Insignia nueva','New badges':'Insignias nuevas',
// collection
'Your profile':'Tu perfil','Edit':'Editar','species':'especies','birds counted':'aves contadas','day streak':'días seguidos','badges':'insignias',
'This week’s challenge':'Desafío de la semana','Done · +150 XP':'Listo · +150 XP','Journal':'Diario','Badges':'Insignias','View':'Vista','Your data':'Tus datos',
'Back up everything':'Respaldar todo','Journal, photos, counts and level in one file':'Diario, fotos, conteos y nivel en un archivo',
'Restore from a backup':'Restaurar un respaldo','On a new phone, or after clearing the browser':'En un teléfono nuevo o después de borrar el navegador',
'Export journal as CSV':'Exportar diario como CSV','Open in Excel or Google Sheets':'Abrir en Excel o Google Sheets',
'No sign-up: your journal, photos and counts are stored on this phone. Back up regularly, and after installing the app to your home screen.':'Sin registro: tu diario, fotos y conteos se guardan en este teléfono. Respaldá seguido, y también después de instalar la app en la pantalla de inicio.',
'Your journal is empty. Identify a bird by sound or photo, or open any species and tap “Log sighting”.':'Tu diario está vacío. Identificá un ave por sonido o foto, o abrí cualquier especie y tocá “Registrar avistaje”.',
'Not found yet':'Todavía no encontrada','Details':'Detalles','How':'Cómo','Where':'Dónde','Open species':'Abrir especie','Delete':'Borrar','Tap again to delete':'Tocá otra vez para borrar',
'sound':'sonido','photo':'foto','manual':'manual','Profile':'Perfil','Your name':'Tu nombre','Name shown on your profile':'Nombre que se muestra en tu perfil',
'Your profile, journal, photos and counts live on this device. Use Backup to keep them safe or move them to a new phone.':'Tu perfil, diario, fotos y conteos viven en este dispositivo. Usá Respaldar para cuidarlos o pasarlos a un teléfono nuevo.',
'Journal is empty':'El diario está vacío','Preparing backup…':'Preparando respaldo…','Sighting deleted':'Avistaje borrado','Saved to life list':'Guardado',
// challenges
'Log 5 different species this week':'Registrá 5 especies distintas esta semana','Photograph 2 birds this week':'Fotografiá 2 aves esta semana','Log a bird before 8 am':'Registrá un ave antes de las 8',
'Identify 2 birds by sound':'Identificá 2 aves por sonido','Count a flock: one sighting of 10+ birds':'Contá una bandada: un avistaje de 10+ aves','Add a new species to your collection':'Sumá una especie nueva a tu colección',
'Write field notes for 3 sightings':'Escribí notas de campo para 3 avistajes','Find 3 birds from the guide’s forest list':'Encontrá 3 aves del monte de la guía',
// badges
'First bird':'Primera ave','Log your first sighting':'Registrá tu primer avistaje','Ten species':'Diez especies','10 species in your collection':'10 especies en tu colección',
'Quarter century':'Veinticinco','25 species':'25 especies','Fifty':'Cincuenta','50 species':'50 especies','Century':'Cien','100 species':'100 especies','Misiones expert':'Experto misionero','200 species':'200 especies',
'Counter':'Contador','500 individual birds counted':'500 aves contadas','Photographer':'Fotógrafo','10 sightings with your own photo':'10 avistajes con foto propia',
'Field notebook':'Libreta de campo','10 sightings with notes':'10 avistajes con notas','Good ears':'Buen oído','10 sightings identified by sound':'10 avistajes identificados por sonido',
'Dawn chorus':'Coro del amanecer','5 sightings before 7 am':'5 avistajes antes de las 7','Night watch':'Guardia nocturna','A sighting after dark (20:00–05:00)':'Un avistaje de noche (20:00–05:00)',
'Big Day':'Gran Día','20 species in one day':'20 especies en un día','Week streak':'Racha de una semana','Log birds 7 days in a row':'Registrá aves 7 días seguidos','Month streak':'Racha de un mes','30 days in a row':'30 días seguidos',
'Toucan trio':'Trío de tucanes','Toco Toucan, Green-billed Toucan and Chestnut-eared Aracari':'Tucán grande, Tucán pico verde y Arasarí fajado','Hummingbird hunter':'Cazador de picaflores','3 hummingbird species':'3 especies de picaflor',
'Raptor eye':'Ojo de rapaz','5 raptors (hawks, kites, falcons, vultures)':'5 rapaces (gavilanes, milanos, halcones, jotes)','Knock knock':'Toc toc','3 woodpecker species':'3 especies de carpintero',
'Welcome back':'Bienvenidas','3 spring migrants (Tijereta, Suirirí, Golondrina…)':'3 migrantes de primavera (Tijereta, Suirirí, Golondrina…)','Atlantic Forest':'Selva Atlántica','2 Atlantic Forest endemics from the guide':'2 endémicas de la Selva Atlántica de la guía',
'Guide complete':'Guía completa','All 55 guide species':'Las 55 especies de la guía','Rarity':'Rareza','A species the location model rates under 5% here':'Una especie que el modelo de ubicación da por debajo de 5 % acá',
'Quiz master':'Maestro del quiz','25 correct quiz answers':'25 respuestas correctas',
// learn
'Sound quiz':'Quiz de sonidos','Photo quiz':'Quiz de fotos','How to ID':'Cómo identificar','Learn mode':'Modo','Who is singing?':'¿Quién canta?','Who is this?':'¿Quién es?',
'Correct!':'¡Correcto!','It was':'Era','Next bird':'Siguiente ave','Try again':'Reintentar','Picking a local bird…':'Eligiendo un ave local…',
'GISS first, colour last':'Primero GISS, el color al final','Experts start with the General Impression of Size and Shape, then behaviour and habitat, then field marks, then voice.':'Los expertos empiezan por la impresión general de tamaño y forma (GISS), después comportamiento y hábitat, después rasgos de campo y por último la voz.',
'Reference bird':'Ave de referencia','Length':'Largo','Bill = diet':'Pico = dieta',
'Conical: seeds (Chingolo, Jilguero). Thin: insects (Pitiayumí). Hooked: meat (Taguató). Huge: fruit (Tucán). Dagger: fish (Martín pescador).':'Cónico: semillas (Chingolo, Jilguero). Fino: insectos (Pitiayumí). Ganchudo: carne (Taguató). Enorme: frutas (Tucán). Daga: peces (Martín pescador).',
'Bird topography':'Topografía del ave','Supercilium':'Ceja (supercilio)','eyebrow stripe (Calandria)':'franja sobre el ojo (Calandria)','Eye-ring':'Anillo ocular','ring round the eye (Zorzal colorado)':'anillo alrededor del ojo (Zorzal colorado)',
'Lores':'Loral','between eye and bill':'entre el ojo y el pico','Malar':'Malar','moustache stripe (Carpintero real ♂)':'bigote (Carpintero real ♂)','Nape':'Nuca','back of the neck (Picazuró)':'parte trasera del cuello (Picazuró)',
'Wing bars':'Barras alares','pale bands on the closed wing (Pitiayumí)':'bandas claras en el ala cerrada (Pitiayumí)','Vent / undertail':'Cloaca / subcaudales','under the tail base (red in Loro maitaca)':'bajo la base de la cola (roja en el Loro maitaca)',
'Ears beat eyes in the forest':'En el monte, el oído le gana al ojo',
"In forest you hear ten birds for each one you see. Use Sound ID, then go find the bird and confirm it by sight: that is how you actually learn, and how BirdNET's occasional false positives get caught.":'En el monte escuchás diez aves por cada una que ves. Usá la ID por sonido y después buscá el ave para confirmarla con la vista: así aprendés de verdad y así se detectan los falsos positivos de BirdNET.',
'Ethics':'Ética','Spring is nesting season: keep back from nests, no repeated playback near breeding birds. Never buy wild-caught birds. Log sightings on eBird or iNaturalist so they count for science.':'La primavera es época de nidos: mantenete lejos de los nidos y no reproduzcas cantos una y otra vez cerca de aves que crían. Nunca compres aves silvestres capturadas. Cargá tus avistajes en eBird o iNaturalist para que sirvan a la ciencia.',
'Credits & privacy':'Créditos y privacidad','Sound ID:':'ID por sonido:','Photos, sounds, local records:':'Fotos, sonidos, registros locales:','Photo ID:':'ID por foto:','Guide notes':'Notas de la guía','Privacy:':'Privacidad:',
'BirdNET V2.4 and its location model by the K. Lisa Yang Center for Conservation Bioacoustics (Cornell Lab of Ornithology) and Chemnitz University of Technology. Kahl, S., Wood, C. M., Eibl, M., & Klinck, H. (2021). BirdNET: A deep learning solution for avian diversity monitoring.':'BirdNET V2.4 y su modelo de ubicación, del K. Lisa Yang Center for Conservation Bioacoustics (Cornell Lab of Ornithology) y la Universidad Técnica de Chemnitz. Kahl, S., Wood, C. M., Eibl, M., & Klinck, H. (2021). BirdNET: A deep learning solution for avian diversity monitoring.',
', 61, 101236. Model files served from the BirdNET-Team website repository (models CC BY-SA 4.0; worker code adapted from it, MIT). Personal, non-commercial use.':', 61, 101236. Archivos del modelo servidos desde el repositorio web de BirdNET-Team (modelos CC BY-SA 4.0; código del worker adaptado de ahí, MIT). Uso personal, no comercial.',
'iNaturalist community; each item shows its author and licence. Species summaries from Wikipedia (CC BY-SA) via iNaturalist.':'comunidad de iNaturalist; cada elemento muestra su autor y licencia. Resúmenes de especies de Wikipedia (CC BY-SA) vía iNaturalist.',
'Claude by Anthropic, with your own key.':'Claude de Anthropic, con tu propia clave.','for 55 species compiled from standard references (Narosky & Yzurieta; Birds of the World); studies cited in place.':'para 55 especies, compiladas de referencias estándar (Narosky & Yzurieta; Birds of the World); los estudios se citan en cada caso.',
'no accounts, no analytics. Audio is analysed on the device. Location stays on the device and is only used for the location model and the iNaturalist query. Photos go to Anthropic only when you press Identify with your key.':'sin cuentas ni analítica. El audio se analiza en el dispositivo. La ubicación queda en el dispositivo y solo se usa para el modelo de ubicación y la consulta a iNaturalist. Las fotos van a Anthropic solo cuando tocás Identificar con tu clave.',
// location sheet
'Location':'Ubicación','Used for the BirdNET location filter and iNaturalist records nearby. Stays on this device.':'Se usa para el filtro de ubicación de BirdNET y los registros cercanos de iNaturalist. Queda en este dispositivo.',
'Use my current location':'Usar mi ubicación actual','Leandro N. Alem (default)':'Leandro N. Alem (predeterminada)','Coordinates':'Coordenadas','Latitude':'Latitud','Longitude':'Longitud','Set coordinates':'Fijar coordenadas','Locating…':'Buscando ubicación…','Location updated':'Ubicación actualizada',
'Spanish':'Español','English':'Inglés'
};
const LV={Egg:'Huevo',Chick:'Pichón',Fledgling:'Volantón',Wanderer:'Caminante',Spotter:'Avistador',Birder:'Pajarero','Field naturalist':'Naturalista','Forest listener':'Oído del monte','Guardian of the selva':'Guardián de la selva','Master birder':'Maestro pajarero',Ornithologist:'Ornitólogo','Legend of Misiones':'Leyenda misionera'};
const PAT=[
[/^([\d.,]+) species · location filter week (\d+) · works offline$/,'$1 especies · filtro de ubicación semana $2 · funciona sin conexión'],
[/^(\d+)%$/,'$1 %'],
[/^Stopped\. (\d+) species detected\. Tap one to log it to your journal\.$/,'Detenido. $1 especies detectadas. Tocá una para registrarla en tu diario.'],
[/^(\d+) species in (.+)\. Tap to see details\.$/,'$1 especies en $2. Tocá para ver detalles.'],
[/^Decoding (.+)…$/,'Decodificando $1…'],[/^Analysing (\d+) s of audio…$/,'Analizando $1 s de audio…'],
[/^Could not read that file \((.+)\)\. Try mp3, wav, m4a\.$/,'No se pudo leer ese archivo ($1). Probá mp3, wav o m4a.'],
[/^Could not load the model: (.+)\. Check the connection and try again\. Sound ID needs WebGL \(any modern phone browser\)\.$/,'No se pudo cargar el modelo: $1. Revisá la conexión y reintentá. La ID por sonido necesita WebGL (cualquier navegador móvil moderno).'],
[/^(\d+)× heard$/,'$1× oída'],[/^Heard · (\d+)% BirdNET confidence$/,'Oída · $1 % de confianza BirdNET'],[/^Photo match · (\d+)%$/,'Coincidencia por foto · $1 %'],
[/^Identified by sound · (\d+)%$/,'Identificada por sonido · $1 %'],[/^Identified by sound$/,'Identificada por sonido'],[/^Log again · (\d+)$/,'Registrar otra vez · $1'],
[/^BirdNET location model: (\d+)% likelihood here in week (\d+) \(unusual here: double-check\)\.$/,'Modelo de ubicación de BirdNET: $1 % de probabilidad acá en la semana $2 (inusual acá: verificalo).'],
[/^BirdNET location model: (\d+)% likelihood here in week (\d+)\.$/,'Modelo de ubicación de BirdNET: $1 % de probabilidad acá en la semana $2.'],
[/^BirdNET location model: species expected at your location in week (\d+) \(eBird-trained\)\.$/,'Modelo de ubicación de BirdNET: especies esperables en tu ubicación en la semana $1 (entrenado con eBird).'],
[/^([\d.,]+) records within 40 km$/,'$1 registros en 40 km'],[/^(\d+)% likely this week$/,'$1 % probable esta semana'],
[/^([\d.,]+) on iNaturalist worldwide$/,'$1 en iNaturalist en todo el mundo'],
[/^(\d+) found · (\d+) of (\d+) species recorded around you$/,'$1 encontradas · $2 de $3 especies registradas cerca tuyo'],
[/^×(\d+) counted · (\d+) logs?$/,'×$1 contadas · $2 registro(s)'],[/^×(\d+) heard$/,'×$1 oída'],
[/^([\d.,]+) XP · ([\d.,]+) to (.+)$/,(m,a,b,c)=>`${a} XP · faltan ${b} para ${LV[c]||c}`],[/^([\d.,]+) XP · top level$/,'$1 XP · nivel máximo'],
[/^\+(\d+) XP · New species!$/,'+$1 XP · ¡Especie nueva!'],[/^\+(\d+) XP · new species: (.+)$/,'+$1 XP · especie nueva: $2'],
[/^Location: (.+)\. Saved on this device; back it up in Collection\.$/,'Ubicación: $1. Se guarda en este dispositivo; respaldalo en Colección.'],
[/^Restored (\d+) sightings$/,'$1 avistajes restaurados'],[/^Restore failed: (.+)$/,'Falló la restauración: $1'],[/^Could not save: (.+)$/,'No se pudo guardar: $1'],
[/^Photo ID failed: (.+)$/,'Falló la ID por foto: $1'],[/^Location not available: (.+)$/,'Ubicación no disponible: $1'],
[/^Quiz needs a connection to iNaturalist \((.+)\)\.$/,'El quiz necesita conexión con iNaturalist ($1).'],
[/^Could not load \((.+)\)\. Offline\? The Guide list works offline\.$/,'No se pudo cargar ($1). ¿Sin conexión? La lista de la guía funciona sin conexión.'],
[/^Offline or not found \((.+)\)\. Links below open the species online\.$/,'Sin conexión o no encontrada ($1). Los enlaces de abajo abren la especie en línea.'],
[/^First (.+) · (\d+)× · (.+)$/,'Primera vez $1 · $2× · $3'],[/^Week (\d+)$/,'Semana $1']
];
function trS(en){if(I18N.lang!=='es')return en;const k=en.trim();if(!k||!/[A-Za-z]/.test(k))return en;let out=ES[k];
  if(out===undefined){for(const [re,rep] of PAT){if(re.test(k)){out=k.replace(re,rep);break}}}
  return out===undefined?en:en.replace(k,()=>out)}
const T_ORIG=new WeakMap(),T_OUT=new WeakMap(),A_ORIG=new WeakMap();const T_ATTRS=['placeholder','aria-label','title'];
function trText(n){const p=n.parentNode;if(!p||/^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(p.nodeName)||p.closest&&p.closest('[translate=no]'))return;
  const cur=n.nodeValue;let en=T_ORIG.get(n);if(en===undefined||cur!==T_OUT.get(n)){en=cur;T_ORIG.set(n,en)}const v=trS(en);T_OUT.set(n,v);if(v!==cur)n.nodeValue=v}
function trAttrs(el){let m=A_ORIG.get(el);for(const a of T_ATTRS){if(!el.hasAttribute(a))continue;const cur=el.getAttribute(a);m=m||{};const r=m[a];let en=r&&cur===r.out?r.en:cur;const v=trS(en);m[a]={en,out:v};if(v!==cur)el.setAttribute(a,v)}if(m)A_ORIG.set(el,m)}
function trTree(root){if(root.nodeType===3)return trText(root);if(root.nodeType!==1)return;trAttrs(root);
  root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(trAttrs);const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))trText(n)}
new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')trText(m.target);else if(m.type==='attributes')trAttrs(m.target);else m.addedNodes.forEach(trTree)}})
  .observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:T_ATTRS});
function renderLangBtn(){const b=document.getElementById('langBtn');if(b)b.innerHTML=I18N.lang==='es'?'<span style="opacity:.5">EN</span>&nbsp;·&nbsp;<b>ES</b>':'<b>EN</b>&nbsp;·&nbsp;<span style="opacity:.5">ES</span>'}
function setLang(l){I18N.lang=l;try{localStorage.setItem('lang',JSON.stringify(l))}catch(e){}document.documentElement.lang=l;renderLangBtn();trTree(document.body);
  if(typeof onLangChange==='function')onLangChange()}
document.documentElement.lang=I18N.lang;
document.addEventListener('DOMContentLoaded',()=>{renderLangBtn();trTree(document.body);document.getElementById('langBtn')?.addEventListener('click',()=>setLang(I18N.lang==='es'?'en':'es'))});
