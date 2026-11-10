const BRAND="Kinomatch";
const SB_URL="https://ebswykhozbzobrypderu.supabase.co";
const SB_KEY="sb_publishable_gUTbeq9JD9WOfaVDL5oPIA_8tt__0Us";
let sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"implicit"}});
/* privacy-friendly analytics + error reports: an anonymous random id per browser, no names or emails */
const TSB=sb,SID=(()=>{try{let x=localStorage.getItem("km_sid");if(!x){x=(crypto.randomUUID?.()||String(Math.random()).slice(2)).slice(0,18);localStorage.setItem("km_sid",x)}return x}catch(e){return "nosid"}})();
const DEV=/iPhone|iPad/.test(navigator.userAgent)?"ios":/Android/.test(navigator.userAgent)?"android":"desktop";
function track(ev,n=1){try{let ref=null;try{if(document.referrer&&!document.referrer.includes(location.host))ref=new URL(document.referrer).hostname.slice(0,120)}catch(_){}
  TSB.from("km_events").insert({sid:SID,ev,n,lang:window.LANG||"ru",dev:DEV,guest:!!(typeof me!=="undefined"&&me?.guest),ref}).then(()=>{},()=>{})}catch(e){}}
let swCount=0;const flushSw=()=>{if(swCount){track("swipe",Math.min(500,swCount));swCount=0}};addEventListener("visibilitychange",()=>{if(document.hidden)flushSw()});addEventListener("pagehide",flushSw);
const errSeen=new Set();function reportErr(msg,src){msg=String(msg||"").slice(0,500);if(!msg||errSeen.has(msg)||errSeen.size>=5||/ResizeObserver|Script error\.?$/.test(msg))return;errSeen.add(msg);
  try{TSB.from("km_errors").insert({sid:SID,msg,src:String(src||"").slice(0,300),ua:navigator.userAgent.slice(0,200),lang:window.LANG||"ru",path:(location.pathname+location.search).slice(0,200)}).then(()=>{},()=>{})}catch(e){}}
addEventListener("error",e=>reportErr(e.message,(e.filename||"")+":"+(e.lineno||"")));addEventListener("unhandledrejection",e=>reportErr("Promise: "+(e.reason?.message||e.reason),e.reason?.stack?.split("\n")[1]||""));
track("visit");
const IMG="https://image.tmdb.org/t/p/";
const SITE="https://kinomatch-ua.netlify.app/";
let SND_ON=true,SNDC=null;try{SND_ON=JSON.parse(localStorage.getItem("snd")??"true")}catch(e){}
function snd(kind){if(!SND_ON)return;try{const c=SNDC||(SNDC=new (window.AudioContext||window.webkitAudioContext)());if(c.state==="suspended")c.resume();
  const N={like:[660,880],nope:[330,247],mega:[659,880,1319],match:[523,659,784,1047],seen:[494,494],tap:[880]}[kind]||[600];
  N.forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.085;o.type=kind==="nope"?"triangle":"sine";o.frequency.value=f;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(kind==="match"?.11:.07,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+(kind==="match"?.35:.2));o.connect(g).connect(c.destination);o.start(t);o.stop(t+.4)})}catch(e){}}
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TYPES={film:"Фильм",series:"Сериал",anime:"Аниме",kr:"Дорама"};
const ST=[{k:"want",t:"Хочу",c:"var(--want)"},{k:"watching",t:"Смотрю",c:"var(--watching)"},{k:"done",t:"Посмотрено",c:"var(--done)"},{k:"dropped",t:"Брошено",c:"var(--dropped)"}];
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2600)}
const cap1=s=>s?s[0].toUpperCase()+s.slice(1):s;
const RN=(n,a,b,c)=>{const m=n%10,h=n%100;return n+" "+(m===1&&h!==11?a:m>=2&&m<=4&&(h<10||h>=20)?b:c)};
let DN=null;try{DN=new Intl.DisplayNames([window.LANG||"ru"],{type:"region"})}catch(e){}
const country=cc=>(cc||[]).map(x=>{try{return DN?DN.of(x):x}catch(e){return x}}).join(", ");
const dur=m=>m>=60?`${Math.floor(m/60)} ч ${m%60?m%60+" мин":""}`.trim():m+" мин";
const ls={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ---------- TMDB through our server-side proxy (the key never reaches the browser) ---------- */
const TC=new Map();
async function tmdb(path,params={}){
  const q=new URLSearchParams({p:path,language:window.TMDB_LANG||"ru-RU",...params});const key=q.toString();
  if(TC.has(key))return TC.get(key);
  const pr=(async()=>{
    const r=await fetch(`${SB_URL}/functions/v1/kino-tmdb?${key}`,{headers:{apikey:SB_KEY}});
    if(!r.ok)throw new Error("tmdb "+r.status);return r.json()})();
  TC.set(key,pr);pr.catch(()=>TC.delete(key));return pr;
}
let GM={},GT={};
async function loadGenres(){const [m,t]=await Promise.all([tmdb("/genre/movie/list",{language:"ru-RU"}),tmdb("/genre/tv/list",{language:"ru-RU"})]);
  m.genres.forEach(g=>GM[g.id]=g.name.toLowerCase());t.genres.forEach(g=>GT[g.id]=g.name.toLowerCase())}
const TVSPLIT={"боевик и приключения":["боевик","приключения"],"нф и фэнтези":["фантастика","фэнтези"],"война и политика":["военный"],"мыльная опера":["мелодрама"],"детский":["семейный"]};
const FILTER_GENRES=["драма","комедия","боевик","триллер","криминал","фантастика","фэнтези","ужасы","детектив","приключения","мелодрама","семейный","мультфильм","военный","история","документальный","музыка","вестерн"];
function genreIds(name,kind){const M=kind==="movie"?GM:GT,ids=[];for(const [id,n] of Object.entries(M)){if(n===name||(TVSPLIT[n]||[]).includes(name))ids.push(+id)}return ids}
function genresOf(r,kind){const M=kind==="movie"?GM:GT,out=[];(r.genre_ids||r.genres?.map(g=>g.id)||[]).forEach(id=>{const n=M[id];if(!n)return;(TVSPLIT[n]||[n]).forEach(x=>out.push(x))});return [...new Set(out)].slice(0,3)}
function kindOf(r,kind){const g=r.genre_ids||r.genres?.map(x=>x.id)||[];if(g.includes(16)&&r.original_language==="ja")return"anime";if(kind==="tv"&&r.original_language==="ko")return"kr";return kind==="movie"?"film":"series"}
function itemFrom(r,kind){kind=kind||r.media_type;return{k:kind+"-"+r.id,kind,id:r.id,t:r.title||r.name,o:r.original_title||r.original_name||"",y:(r.release_date||r.first_air_date||"").slice(0,4),
  r:Math.round((r.vote_average||0)*10)/10,d:(r.overview||"").trim(),poster:r.poster_path,backdrop:r.backdrop_path,ty:kindOf(r,kind),g:genresOf(r,kind)}}
const DET=new Map();
function details(it){if(!it?.kind)return Promise.resolve(null);if(!DET.has(it.k))DET.set(it.k,tmdb(`/${it.kind}/${it.id}`,{append_to_response:it.kind==="movie"?"videos,credits,watch/providers,images,release_dates":"videos,credits,watch/providers,images,content_ratings,external_ids",include_image_language:"ru,null,en",include_video_language:"ru,uk,en"}).catch(()=>null));return DET.get(it.k)}
function trailerOf(d){const vs=(d?.videos?.results||[]).filter(v=>v.site==="YouTube");const order=["ru","uk","en"];
  const pick=t=>vs.filter(v=>v.type===t).sort((a,b)=>order.indexOf(a.iso_639_1)-order.indexOf(b.iso_639_1)||(b.official-a.official))[0];
  return pick("Trailer")||pick("Teaser")||vs[0]||null}
const PROV={"Netflix":"https://www.netflix.com/search?q=","HBO Max":"https://play.hbomax.com/search?q=","Crunchyroll":"https://www.crunchyroll.com/search?q=","Apple TV":"https://tv.apple.com/search?term=","Apple TV Store":"https://tv.apple.com/search?term=","Amazon Prime Video":"https://www.primevideo.com/search?phrase=","MEGOGO":"https://megogo.net/ua/search-extended?q=","Disney Plus":"https://www.disneyplus.com/search?q=","Google Play Movies":"https://play.google.com/store/search?c=movies&q="};
function whereOf(it,d){const ua=d?.["watch/providers"]?.results?.UA||{},q=encodeURIComponent(it.o||it.t),out=[];
  (ua.flatrate||[]).slice(0,4).forEach(p=>out.push({name:p.provider_name,sub:true,url:(PROV[p.provider_name]||"https://www.justwatch.com/ua/search?q=")+q}));
  [...(ua.rent||[]),...(ua.buy||[])].forEach(p=>{const n=p.provider_name.replace(" Store","");if(out.some(x=>x.name===n)||out.length>=6)return;out.push({name:n,sub:false,url:(PROV[p.provider_name]||"https://www.justwatch.com/ua/search?q=")+q})});
  return out}
function factsOf(it,d){if(!d)return[];const tv=it.kind==="tv",f=[];const ly=(d.last_air_date||"").slice(0,4);
  f.push(["Год",tv&&ly&&ly!==it.y?`${it.y}–${d.status==="Returning Series"?"…":ly}`:it.y]);
  if(tv&&d.number_of_seasons)f.push(["Сезоны",RN(d.number_of_seasons,"сезон","сезона","сезонов")+(d.number_of_episodes?" · "+RN(d.number_of_episodes,"серия","серии","серий"):"")]);
  const rt=tv?((d.episode_run_time||[])[0]||d.last_episode_to_air?.runtime):d.runtime;if(rt)f.push([tv?"Серия":"Длительность",(tv?"≈ ":"")+dur(rt)]);
  if(tv&&d.status)f.push(["Статус",{"Returning Series":"Выходит","Ended":"Завершён","Canceled":"Закрыт","In Production":"В производстве"}[d.status]||d.status]);
  if(it.r)f.push(["Рейтинг TMDB","★ "+it.r+" / 10"]);
  const cc=tv?d.origin_country:(d.production_countries||[]).map(c=>c.iso_3166_1);if(cc?.length)f.push(["Страна",country(cc.slice(0,3))]);
  const dir=tv?(d.created_by||[]).map(c=>c.name):(d.credits?.crew||[]).filter(c=>c.job==="Director").map(c=>c.name);if(dir.length)f.push([tv?"Создатели":"Режиссёр",dir.slice(0,2).join(", ")]);
  if(tv&&d.networks?.length)f.push(["Канал",d.networks.slice(0,2).map(n=>n.name).join(", ")]);
  const age=ageOf(it,d);if(age)f.push(["Возраст",age]);
  if(tv&&rt&&d.number_of_episodes){const h=Math.round(rt*d.number_of_episodes/60);f.push(["Весь сериал",h>=1?"≈ "+RN(h,"час","часа","часов"):"меньше часа"])}
  if(!tv&&rt){const e=new Date(Date.now()+rt*6e4);f.push(["Начнёте сейчас — закончите",e.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})])}
  return f.filter(x=>x[1])}
function framesOf(it,d){const out=[];if(it.poster)out.push({u:IMG+"w500"+it.poster,still:false});
  // the "main" backdrop is usually the same key art as the poster — skip it and show real stills from the film
  const main=d?.backdrop_path||it.backdrop,all=(d?.images?.backdrops||[]).filter(b=>b.file_path!==main),seen=new Set();
  const pick=all.filter(b=>!b.iso_639_1).sort((a,b)=>b.vote_average-a.vote_average||b.vote_count-a.vote_count)
    .filter(b=>{if(seen.has(b.file_path))return false;seen.add(b.file_path);return true}).slice(0,8);
  pick.forEach(b=>out.push({u:IMG+"w780"+b.file_path,still:true}));
  if(out.length<2&&main)out.push({u:IMG+"w780"+main,still:true});return out}
function videosOf(d){const order=["ru","uk","en"],nm={Trailer:"Трейлер",Teaser:"Тизер",Clip:"Отрывок",Featurette:"О съёмках"},ln={ru:"рус",uk:"укр",en:"англ"};
  return (d?.videos?.results||[]).filter(v=>v.site==="YouTube"&&nm[v.type]).sort((a,b)=>Object.keys(nm).indexOf(a.type)-Object.keys(nm).indexOf(b.type)||order.indexOf(a.iso_639_1)-order.indexOf(b.iso_639_1))
    .slice(0,6).map(v=>({key:v.key,label:nm[v.type]+(ln[v.iso_639_1]?" · "+ln[v.iso_639_1]:"")}))}
const US_AGE={G:"0+",PG:"6+","PG-13":"13+",R:"17+","NC-17":"18+","TV-Y":"0+","TV-Y7":"7+","TV-G":"0+","TV-PG":"10+","TV-14":"14+","TV-MA":"18+"};
function ageOf(it,d){if(!d)return"";const pick=list=>{for(const cc of["UA","RU","US","GB","DE"]){const r=list.find(x=>x.iso_3166_1===cc);if(r&&r.v)return cc==="US"?(US_AGE[r.v]||""):/^\d+\+?$/.test(r.v)?r.v.replace(/^(\d+)$/,"$1+"):""}return""};
  if(it.kind==="movie")return pick((d.release_dates?.results||[]).map(r=>({iso_3166_1:r.iso_3166_1,v:(r.release_dates||[]).map(x=>x.certification).find(Boolean)})));
  return pick((d.content_ratings?.results||[]).map(r=>({iso_3166_1:r.iso_3166_1,v:r.rating})))}
const fdate=s=>{try{return new Date(s).toLocaleDateString(window.LANG==="en"?"en-GB":window.LANG==="uk"?"uk-UA":"ru-RU",{day:"numeric",month:"long",year:new Date(s).getFullYear()===new Date().getFullYear()?undefined:"numeric"})}catch(e){return s}};
function qualOf(it,d){if(!d)return null;const now=Date.now();
  if(it.kind==="movie"){const all=(d.release_dates?.results||[]).flatMap(r=>r.release_dates||[]);
    const first=types=>all.filter(x=>types.includes(x.type)).map(x=>x.release_date).sort()[0];
    const dig=first([4,5]),th=first([1,2,3])||d.release_date;if(!th&&!dig)return null;
    if(dig&&Date.parse(dig)<=now){if(now-Date.parse(dig)>400*864e5)return null;return{c:"ok",t:`✅ Вышел в хорошем качестве — цифровой релиз ${fdate(dig)}`}}
    if(th&&Date.parse(th)<=now)return{c:"wait",t:`🎬 Пока только в кинотеатрах. Хорошее качество — ${dig?"ожидается "+fdate(dig):"дата цифрового релиза ещё не объявлена"}`};
    return{c:"wait",t:`⏳ Премьера ${fdate(th||dig)}`}}
  const n=d.next_episode_to_air,l=d.last_episode_to_air;
  if(n)return{c:"wait",t:`📺 Следующая серия: ${n.season_number} сезон, ${n.episode_number} серия — ${fdate(n.air_date)}`};
  if(l&&now-Date.parse(l.air_date)<60*864e5)return{c:"ok",t:`✅ Новая серия вышла ${fdate(l.air_date)} (${l.season_number} сезон, ${l.episode_number} серия)`};
  return null}
const slim=it=>({k:it.k,kind:it.kind,id:it.id,t:it.t,o:it.o,y:it.y,r:it.r,d:it.d,poster:it.poster,backdrop:it.backdrop,ty:it.ty,g:it.g});

/* ================= LANDING ================= */
async function initLanding(){document.documentElement.classList.remove("km-authed");{const q=new URLSearchParams(location.search);if(q.get("u"))setTimeout(()=>openPublic(q.get("u")),300);if(q.get("room"))setTimeout(()=>openLogin("up"),300)}
  const lsel=$("#langSel");if(lsel){lsel.value=window.LANG||"ru";lsel.onchange=()=>{ls.set("lang",lsel.value);location.reload()}}
  $("#land").hidden=false;document.body.classList.remove("inapp");setTimeout(()=>loadGenres().then(openFromLink).catch(()=>{}),300);
  document.querySelectorAll("[data-login]").forEach(b=>b.onclick=()=>openLogin());
  document.querySelectorAll("[data-guest]").forEach(b=>b.onclick=startGuest);
  demoFan();sb.rpc("km_stats").then(({data})=>{if(data?.swipes>=200){$("#stSw").textContent=data.swipes.toLocaleString("ru-RU");$("#stSwL").textContent="свайпов уже сделали"}}).catch(()=>{});
  document.querySelectorAll("[data-privacy]").forEach(b=>b.onclick=e=>{e.preventDefault();openPrivacy()});
  if(location.hash==="#privacy")openPrivacy();
  if(new URLSearchParams(location.search).get("pair"))openLogin();
  try{const [a,b]=await Promise.all([tmdb("/trending/all/week"),tmdb("/movie/top_rated")]);
    const ps=[...(a.results||[]),...(b.results||[])].filter(x=>x.poster_path).map(x=>x.poster_path);
    ["#hp1","#hp2","#hp3"].forEach((s,i)=>{if(!ps[i])return;const im=new Image();im.onload=()=>{const el=$(s);el.style.transition="opacity .5s";el.style.opacity=0;setTimeout(()=>{el.src=im.src;el.style.opacity=1},250)};im.src=IMG+"w342"+ps[i]});
    // each row must be at least twice the screen wide, or the loop shows an empty gap
    const row=arr=>{if(!arr.length)arr=ps;let a=[...arr];while(a.length<24)a=a.concat(arr);return a.concat(a).map(p=>`<img src="${IMG}w185${p}" alt="">`).join("")};
    const half=Math.max(8,Math.floor((ps.length-3)/2));
    $("#mq1").innerHTML=row(ps.slice(3,3+half));$("#mq2").innerHTML=row(ps.slice(3+half));
    const go3d=()=>loadScript("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js").then(()=>{if(!$("#land").hidden)world(ps)}).catch(()=>{});
    (window.requestIdleCallback||setTimeout)(go3d,{timeout:1500});
  }catch(e){}
}
function loadScript(src){return new Promise((ok,no)=>{if([...document.scripts].some(x=>x.src===src))return ok();const sc=document.createElement("script");sc.src=src;sc.async=true;sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)})}
/* Scroll-driven 3D world: the camera flies down a spiral tunnel of floating posters as you scroll. */
function world(posters){
  if(!window.THREE)return;const calm=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv=$("#world");let r;try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:"high-performance"})}catch(e){return}
  const mobile=innerWidth<760,low=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;r.setPixelRatio(Math.min(devicePixelRatio,low?1:mobile?1.5:2));
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0b0b0d,mobile?.018:.014);
  const cam=new THREE.PerspectiveCamera(mobile?72:60,1,.1,600);
  const N=low?26:mobile?42:70,DEPTH=520,loader=new THREE.TextureLoader();loader.setCrossOrigin("anonymous");
  const geo=new THREE.PlaneGeometry(2,3),cards=[];
  const glowTex=(()=>{const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
  for(let i=0;i<N;i++){
    const src=posters[i%posters.length];
    const mat=new THREE.MeshBasicMaterial({color:0x222228,side:THREE.DoubleSide,transparent:true});
    loader.load(IMG+"w342"+src,t=>{t.colorSpace=THREE.SRGBColorSpace;mat.map=t;mat.color.set(0xffffff);mat.needsUpdate=true});
    const m=new THREE.Mesh(geo,mat),a=i*2.399,rad=4.2+((i*37)%10)/4;
    m.position.set(Math.cos(a)*rad,Math.sin(a)*rad*.62,-8-i*(DEPTH/N));
    m.rotation.set((Math.random()-.5)*.25,-Math.cos(a)*.55,(Math.random()-.5)*.3);
    m.userData={a,rad,spin:(Math.random()-.5)*.004,bob:Math.random()*6};
    const s=1+((i*13)%5)/6;m.scale.set(s,s,s);scene.add(m);cards.push(m);
  }
  // glowing dust
  const P=mobile?500:1100,pos=new Float32Array(P*3),col=new Float32Array(P*3);
  for(let i=0;i<P;i++){pos[i*3]=(Math.random()-.5)*40;pos[i*3+1]=(Math.random()-.5)*26;pos[i*3+2]=-Math.random()*DEPTH;
    const red=Math.random()<.55;col[i*3]=red?1:.36;col[i*3+1]=red?.18:.66;col[i*3+2]=red?.25:1}
  const pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(pos,3));pg.setAttribute("color",new THREE.BufferAttribute(col,3));
  const dust=new THREE.Points(pg,new THREE.PointsMaterial({size:.22,map:glowTex,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(dust);
  // big heart-red sun at the end of the tunnel
  const sun=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff2d3f,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  sun.scale.set(60,60,1);sun.position.set(0,0,-DEPTH-30);scene.add(sun);
  let w=0,h=0,mx=0,my=0,tx=0,ty=0,prog=0,vis=true;
  const size=()=>{w=innerWidth;h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};size();addEventListener("resize",size);
  addEventListener("pointermove",e=>{tx=(e.clientX/w-.5);ty=(e.clientY/h-.5)},{passive:true});
  document.addEventListener("visibilitychange",()=>vis=!document.hidden);
  cv.classList.add("on");
  const clock=new THREE.Clock();
  (function loop(){
    if($("#land").hidden){r.dispose();return}
    requestAnimationFrame(loop);if(!vis)return;
    const t=clock.getElapsedTime(),max=Math.max(1,document.documentElement.scrollHeight-h),target=scrollY/max;
    prog+=(target-prog)*.06;mx+=(tx-mx)*.05;my+=(ty-my)*.05;
    const z=6-prog*(DEPTH-20);
    cam.position.set(Math.sin(prog*Math.PI*2)*1.6+mx*2.2,Math.cos(prog*Math.PI*3)*.8-my*1.4,z);
    cam.rotation.set(-my*.12,-mx*.18,prog*Math.PI*.6+(calm?0:Math.sin(t*.2)*.02));
    for(const m of cards){const u=m.userData;if(!calm){m.rotation.z+=u.spin;m.position.y+=Math.sin(t+u.bob)*.0025}
      const d=m.position.z-z;m.material.opacity=d>1?0:Math.min(.62,Math.max(0,(-d-.5)/5))}
    if(!calm)dust.rotation.z=t*.02;sun.material.opacity=.35+prog*.5;
    r.render(scene,cam);
  })();
}
function modal(html){$("#modalRoot").innerHTML=`<div class="modal" id="md"><div class="mbox" role="dialog" aria-modal="true"><button class="x" id="mx" aria-label="Закрыть">✕</button>${html}</div></div>`;
  $("#mx").onclick=closeModal;$("#md").onclick=e=>{if(e.target.id==="md")closeModal()}}
function closeModal(){$("#modalRoot").innerHTML=""}
document.addEventListener("click",async e=>{if(!e.target.closest("#gIn"))return;const pair=new URLSearchParams(location.search).get("pair");
  const {error}=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname+(pair?"?pair="+encodeURIComponent(pair):"")}});if(error)toast("Вход через Google пока недоступен")});
function openLogin(mode){
  const pair=new URLSearchParams(location.search).get("pair");mode=mode||(pair?"up":"in");
  const tabs=`<div class="seg" style="margin-top:-4px"><button type="button" data-m="in" aria-pressed="${mode==="in"}">Вход</button><button type="button" data-m="up" aria-pressed="${mode==="up"}">Регистрация</button></div>`;
  const note=pair?`<p class="sub" style="margin:0;color:#ffb1b8">Вас пригласили в пару — после входа аккаунты свяжутся сами.</p>`:"";
  const gbtn=`<button class="btn big" type="button" id="gIn" style="background:#fff;color:#1f1f1f;display:flex;align-items:center;justify-content:center;gap:10px"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Продолжить с Google</button><div class="sub" style="text-align:center;margin:-2px 0">или</div>`;
  if(mode==="in")modal(`<h2>Вход в ${BRAND}</h2>${tabs}${note}${gbtn}
    <form id="af" style="display:grid;gap:10px" autocomplete="on">
      <input type="text" id="lg" required autocomplete="username" placeholder="Логин или почта" value="${esc(ls.get("lastLogin",""))}">
      <input type="password" id="pw" required autocomplete="current-password" placeholder="Пароль" minlength="6">
      <button class="btn red big" type="submit" id="ab">Войти</button></form>
    <p class="sub" id="am" style="margin:0"></p><button class="btn ghost sm" id="fg" type="button" style="justify-self:start">Забыли пароль?</button>`);
  else modal(`<h2>Регистрация</h2>${tabs}${note}${gbtn}
    <form id="af" style="display:grid;gap:10px" autocomplete="on">
      <input type="text" id="rn" required maxlength="30" autocomplete="given-name" placeholder="Имя">
      <input type="text" id="hpw" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
      <input type="text" id="ru" required maxlength="20" autocomplete="username" placeholder="Логин (латиница, цифры, _ .)" pattern="[A-Za-z0-9_.]{3,20}">
      <input type="email" id="re" required autocomplete="email" placeholder="Почта">
      <input type="tel" id="rp" autocomplete="tel" placeholder="Телефон (необязательно), +380…">
      <input type="password" id="r1" required minlength="6" autocomplete="new-password" placeholder="Пароль (от 6 символов)">
      <input type="password" id="r2" required minlength="6" autocomplete="new-password" placeholder="Повторите пароль">
      <button class="btn red big" type="submit" id="ab">Создать аккаунт</button></form>
    <p class="sub" id="am" style="margin:0"></p>
    <p class="sub" style="margin:0;font-size:.75rem">Регистрируясь, вы соглашаетесь с <a href="#privacy" data-privacy>политикой конфиденциальности</a>.</p>`);
  document.querySelectorAll("#modalRoot [data-m]").forEach(b=>b.onclick=()=>openLogin(b.dataset.m));
  document.querySelectorAll("#modalRoot [data-privacy]").forEach(b=>b.onclick=e=>{e.preventDefault();openPrivacy()});
  const say=t=>$("#am").innerHTML=t;
  if(mode==="in"){
    $("#fg").onclick=async()=>{const v=$("#lg").value.trim();if(!v.includes("@"))return say("Введите в поле выше <b>почту</b> — пришлём ссылку для смены пароля.");
      const {error}=await sb.auth.resetPasswordForEmail(v,{redirectTo:location.origin+location.pathname});say(error?"Ошибка: "+esc(error.message):"Письмо со ссылкой для смены пароля отправлено на "+esc(v))};
    $("#af").onsubmit=async e=>{e.preventDefault();const b=$("#ab");b.disabled=true;say("");const login=$("#lg").value.trim(),password=$("#pw").value;ls.set("lastLogin",login);
      try{let r;
        if(login.includes("@")){const {error}=await sb.auth.signInWithPassword({email:login,password});if(error)throw error}
        else{r=await fetch(`${SB_URL}/functions/v1/km-login`,{method:"POST",headers:{"content-type":"application/json",apikey:SB_KEY},body:JSON.stringify({login,password})});
          if(!r.ok)throw new Error("invalid");const t=await r.json();const {error}=await sb.auth.setSession(t);if(error)throw error}
      }catch(err){say(/invalid|credentials/i.test(err.message)?"Неверный логин или пароль":/confirm/i.test(err.message)?"Подтвердите почту — ссылка в письме":"Ошибка: "+esc(err.message))}
      b.disabled=false};
  }else{
    window._regOpen=Date.now();
    $("#af").onsubmit=async e=>{e.preventDefault();const b=$("#ab");say("");
      if($("#hpw")?.value||Date.now()-window._regOpen<2500){say("Проверьте данные и попробуйте ещё раз через пару секунд");return} // bots fill hidden fields and submit instantly
      const name=$("#rn").value.trim(),username=$("#ru").value.trim().toLowerCase(),email=$("#re").value.trim(),phone=$("#rp").value.replace(/[^\d+]/g,""),p1=$("#r1").value,p2=$("#r2").value;
      if(!/^[a-z0-9_.]{3,20}$/.test(username))return say("Логин: 3–20 символов, латиница, цифры, «_» и «.»");
      if(p1!==p2)return say("Пароли не совпадают");
      if(phone&&!/^\+?\d{9,15}$/.test(phone))return say("Телефон выглядит неправильно");
      b.disabled=true;
      const {data:free}=await sb.rpc("km_username_free",{u:username});if(free===false){b.disabled=false;return say("Логин <b>"+esc(username)+"</b> уже занят")}
      track("signup_try");const {data,error}=await sb.auth.signUp({email,password:p1,options:{data:{name,username,phone},emailRedirectTo:location.origin+location.pathname+(pair?"?pair="+encodeURIComponent(pair):"")}});
      b.disabled=false;
      if(error)return say(/registered|exists/i.test(error.message)?"Эта почта уже зарегистрирована — войдите":/password/i.test(error.message)?"Слишком простой пароль":"Ошибка: "+esc(error.message));
      ls.set("lastLogin",username);
      if(!data.session)say("Почти готово! Подтвердите почту — ссылка отправлена на "+esc(email)+".")};
  }
}
function openNewPassword(){
  modal(`<h2>Новый пароль</h2><form id="np" style="display:grid;gap:10px"><input type="password" id="n1" required minlength="6" autocomplete="new-password" placeholder="Новый пароль"><input type="password" id="n2" required minlength="6" autocomplete="new-password" placeholder="Повторите"><button class="btn red big" type="submit">Сохранить</button></form><p class="sub" id="nm2" style="margin:0"></p>`);
  $("#np").onsubmit=async e=>{e.preventDefault();if($("#n1").value!==$("#n2").value)return $("#nm2").textContent="Пароли не совпадают";
    const {error}=await sb.auth.updateUser({password:$("#n1").value});if(error)return $("#nm2").textContent="Ошибка: "+error.message;closeModal();toast("Пароль обновлён")};
}
function openPrivacy(){
  modal(`<div class="legal"><h2>Конфиденциальность</h2>
    <p>${BRAND} хранит только то, что нужно для работы:</p>
    <ul><li>логин, почту и пароль (в зашифрованном виде) — для входа и восстановления доступа;</li><li>имя и телефон, если вы их укажете;</li><li>ваши свайпы, полку, оценки и фильтры;</li><li>связь с партнёром, если вы её создали.</li></ul>
    <p>Мы не продаём и не передаём данные третьим лицам и не показываем рекламу. Данные хранятся в Supabase (ЕС, Франкфурт). Ваш партнёр видит ваши лайки и полку — больше никто.</p>
    <p>Удалить аккаунт и все данные можно в профиле: «Удалить аккаунт».</p>
    <p>Информация о фильмах предоставлена TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div>`);
}

/* ================= APP STATE ================= */
let me=null,partner=null,mine={shelf:new Map(),swipes:new Map(),rx:new Map()},theirs={shelf:new Map(),swipes:new Map(),rx:new Map()},prefs=null,view="swipe",recsIn=new Map(),recsOut=new Map(),lists=[],listItems=new Map(),watchSet=new Map(),night=null,room=null,myRooms=[];
const DEF_PREFS=()=>({kinds:[],yes:[],no:[],eras:[],minR:0,mood:"",len:"",cc:[],prov:[],person:null,fresh:false});
let PROVS=null;async function loadProvs(){if(PROVS)return PROVS;try{const r=await tmdb("/watch/providers/movie",{watch_region:"UA"});PROVS=(r.results||[]).sort((a,b)=>(a.display_priorities?.UA??a.display_priority??99)-(b.display_priorities?.UA??b.display_priority??99)).slice(0,14).map(x=>({id:x.provider_id,n:x.provider_name,l:x.logo_path}))}catch(e){PROVS=[]}return PROVS}
const myName=()=>me?.name||"Я",ptName=()=>partner?.name||"Партнёр";
async function loadAll(){
  const [s,w,p,pr,rc,rx,li,lit,wt]=await Promise.all([sb.from("km_shelf").select("*"),sb.from("km_swipes").select("user_id,tmdb,v,mega,data,at"),sb.from("km_prefs").select("prefs").eq("user_id",me.user_id).maybeSingle(),sb.from("km_profiles").select("*"),
    sb.from("km_recs").select("*"),sb.from("km_reactions").select("*"),sb.from("km_lists").select("*").order("created_at"),sb.from("km_list_items").select("*"),sb.from("km_watch").select("*")]);
  watchSet=new Map((wt.data||[]).map(r=>[r.tmdb,r]));
  recsIn=new Map();recsOut=new Map();(rc.data||[]).forEach(r=>(r.to_user===me.user_id?recsIn:recsOut).set(r.tmdb,r));
  lists=li.data||[];listItems=new Map();lists.forEach(l=>listItems.set(l.id,new Map()));(lit.data||[]).forEach(r=>listItems.get(r.list_id)?.set(r.tmdb,r));
  (pr.data||[]).forEach(r=>{if(r.user_id===me.user_id)me={...me,...r};else partner=r});
  if(!me.partner)partner=null;
  mine={shelf:new Map(),swipes:new Map(),rx:new Map()};theirs={shelf:new Map(),swipes:new Map(),rx:new Map()};
  (rx.data||[]).forEach(r=>(r.user_id===me.user_id?mine:theirs).rx.set(r.tmdb,r.emoji));
  (s.data||[]).forEach(r=>(r.user_id===me.user_id?mine:theirs).shelf.set(r.tmdb,r));
  (w.data||[]).forEach(r=>(r.user_id===me.user_id?mine:theirs).swipes.set(r.tmdb,r));
  prefs=p.data?.prefs||prefs||null;
}
const likes=side=>[...side.swipes.values()].filter(r=>r.v==="like").sort((a,b)=>(b.at||"").localeCompare(a.at||""));
const matchesList=()=>partner?likes(mine).filter(r=>theirs.swipes.get(r.tmdb)?.v==="like"):[];
function counts(){const l=likes(mine).length,m=matchesList().length;$("#nL").hidden=!l;$("#nL").textContent=l;$("#nM").hidden=!m;$("#nM").textContent=m;clearTimeout(counts.t);counts.t=setTimeout(checkAch,800)}
/* ---------- levels & achievements ---------- */
const LV=[[0,"Новичок"],[50,"Зритель"],[150,"Киноман"],[300,"Синефил"],[500,"Критик"],[800,"Знаток"],[1200,"Режиссёр"],[1700,"Продюсер"],[2300,"Легенда"],[3000,"Оскароносец"],[4000,"Бог кино"]];
function stats(){const sw=[...mine.swipes.values()],sh=[...mine.shelf.values()],done=sh.filter(r=>r.status==="done");
  return{sw:sw.length,likes:sw.filter(r=>r.v==="like").length,mega:sw.filter(r=>r.mega).length,match:matchesList().length,done:done.length,
    anime:done.filter(r=>r.data?.ty==="anime").length,kr:done.filter(r=>r.data?.ty==="kr").length,horror:done.filter(r=>(r.data?.g||[]).includes("ужасы")).length,
    rated:sh.filter(r=>r.rating).length,recs:recsOut.size,rx:mine.rx.size,lists:lists.length,nights:+(ls.get("nights",0)),
    sup:matchesList().filter(r=>r.mega&&theirs.swipes.get(r.tmdb)?.mega).length,pair:partner?1:0,watch:watchSet.size}}
const ACH=[["first","👆","Первый свайп",s=>s.sw>=1],["s100","🔥","100 свайпов",s=>s.sw>=100],["s1000","🚀","1000 свайпов",s=>s.sw>=1000],["pair","💞","Нашёл пару",s=>s.pair],
  ["m1","🎯","Первый мэтч",s=>s.match>=1],["m10","💘","10 мэтчей",s=>s.match>=10],["m50","👑","50 мэтчей",s=>s.match>=50],["sup","🌟","Супер-мэтч",s=>s.sup>=1],
  ["d1","🍿","Первый просмотр",s=>s.done>=1],["d10","🎬","10 просмотрено",s=>s.done>=10],["d50","📽","50 просмотрено",s=>s.done>=50],["d100","🏛","100 просмотрено",s=>s.done>=100],
  ["anime","🍣","Анимешник",s=>s.anime>=10],["kr","🇰🇷","Дорамщик",s=>s.kr>=10],["horror","😱","Не из пугливых",s=>s.horror>=5],["critic","⭐","Критик: 20 оценок",s=>s.rated>=20],
  ["rec","💌","Первый совет",s=>s.recs>=1],["rx","😂","10 реакций",s=>s.rx>=10],["lists","📁","3 своих списка",s=>s.lists>=3],["night","🌙","Вечер кино",s=>s.nights>=1],["watch","🔔","Ждун",s=>s.watch>=1]];
function xpOf(s){return s.sw+s.likes+s.done*10+s.match*15+s.recs*5+s.rx*2+s.rated*3+s.nights*20}
function levelOf(xp){let i=0;while(i<LV.length-1&&xp>=LV[i+1][0])i++;const nx=LV[i+1];return{i:i+1,name:LV[i][1],xp,from:LV[i][0],to:nx?nx[0]:null}}
function checkAch(){if(!me)return;const s=stats(),got=new Set(ls.get("ach",[])),first=!ls.get("achInit",false);const fresh=ACH.filter(a=>a[3](s)&&!got.has(a[0]));
  if(!fresh.length){if(first)ls.set("achInit",true);return}fresh.forEach(a=>got.add(a[0]));ls.set("ach",[...got]);
  const lv=levelOf(xpOf(s)),old=ls.get("lvl",0);ls.set("lvl",lv.i);if(first){ls.set("achInit",true);return}
  toast(`🏆 Ачивка: ${fresh[0][1]} ${fresh[0][2]}${fresh.length>1?` и ещё ${fresh.length-1}`:""}${lv.i>old&&old?` · Новый уровень: ${lv.name}!`:""}`);snd("match")}

/* ---------- endless deck straight from TMDB ---------- */
let deck=[],src=[],loading=false,hist=[],busy=false,deckErr=false;
const ERAS=[{k:"new",t:"2020 и новее",a:"2020-01-01"},{k:"10s",t:"2010-е",a:"2010-01-01",b:"2019-12-31"},{k:"00s",t:"2000-е",a:"2000-01-01",b:"2009-12-31"},{k:"old",t:"До 2000",b:"1999-12-31"}];
const KINDS=[{k:"film",t:"Фильмы"},{k:"series",t:"Сериалы"},{k:"anime",t:"Аниме"},{k:"kr",t:"Дорамы"}];
const MOODS=[{k:"fun",t:"😂 Посмеяться",g:["комедия"]},{k:"scary",t:"😱 Нервы",g:["ужасы","триллер"]},{k:"cry",t:"😭 Поплакать",g:["драма","мелодрама"]},{k:"brain",t:"🧠 Подумать",g:["детектив","фантастика"]},{k:"drive",t:"💥 Драйв",g:["боевик","приключения"]},{k:"cozy",t:"🛋 Уютно",g:["семейный","мультфильм"]}];
const LENS=[{k:"short",t:"Коротко",s:"фильм до 1 ч 40, серия до 30 мин"},{k:"long",t:"Надолго",s:"фильм от 2 ч 20"}];
const CCS=["US","GB","FR","DE","ES","IT","KR","JP","CN","IN","TR","UA","PL","SE","DK","AU","CA","MX"];
const dayAgo=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
function buildSources(){
  const p=prefs||DEF_PREFS(),kinds=p.kinds?.length?p.kinds:["film","series","anime","kr"];
  // no era chosen -> split by all eras anyway: TMDB gives max 500 pages per query, so this multiplies the catalogue
  const eras=p.eras?.length?ERAS.filter(e=>p.eras.includes(e.k)):ERAS;
  src=[];
  if(p.person?.id){src.push({person:p.person.id,done:false});return}
  if(p.fresh){const t=dayAgo(0);
    src.push({kind:"movie",q:{sort_by:"popularity.desc","vote_count.gte":"15",with_release_type:"4|5","release_date.gte":dayAgo(150),"release_date.lte":t},page:0,done:false});
    src.push({kind:"tv",q:{sort_by:"popularity.desc","vote_count.gte":"40","first_air_date.gte":dayAgo(1100),"air_date.gte":dayAgo(10),"air_date.lte":t,without_genres:"10764,10767,10763,10766"},page:0,done:false});return}
  const moodG=(MOODS.find(m=>m.k===p.mood)||{}).g||[];
  const VOTES={film:"50",series:"20",anime:"20",kr:"5"};
  const plan=kinds.flatMap(k=>k==="anime"?[["anime","tv"],["anime","movie"]]:[[k,k==="film"?"movie":"tv"]]);
  for(const [k,kind] of plan)for(const e of eras){
    const dk=kind==="movie"?"primary_release_date":"first_air_date",q={sort_by:"popularity.desc","vote_count.gte":k==="anime"&&kind==="movie"?"30":VOTES[k]};
    if(e.a)q[dk+".gte"]=e.a;if(e.b)q[dk+".lte"]=e.b;if(p.minR)q["vote_average.gte"]=String(p.minR);
    const yes=[...new Set([...(p.yes||[]),...moodG].flatMap(g=>genreIds(g,kind)))].filter(g=>g!==16||k!=="anime");let no=(p.no||[]).flatMap(g=>genreIds(g,kind));
    if(p.len==="short")q["with_runtime.lte"]=kind==="movie"?"100":"30";if(p.len==="long"&&kind==="movie")q["with_runtime.gte"]="140";
    if(p.cc?.length&&k!=="anime"&&k!=="kr")q.with_origin_country=p.cc.join("|");
    if(p.prov?.length){q.with_watch_providers=p.prov.join("|");q.watch_region="UA";q.with_watch_monetization_types="flatrate|free|ads"}
    if(k==="anime"){q.with_genres=[16,...yes.slice(0,1)].join(",");q.with_original_language="ja"}
    else{if(yes.length)q.with_genres=yes.join("|");no=[...no,16]}
    if(k==="kr")q.with_original_language="ko";
    if(k==="series")q.without_genres=[...no,10764,10767,10763,10766].join(",");else if(no.length)q.without_genres=no.join(",");
    src.push({kind,q,page:0,done:false});
  }
}
function seenK(k){return mine.swipes.has(k)||mine.shelf.has(k)||deck.some(x=>x.k===k)}
function taste(){const w={};for(const r of mine.swipes.values()){const s=r.v==="like"?(r.mega?3:1.5):r.v==="nope"?-1:.6;(r.data?.g||[]).forEach(g=>w[g]=(w[g]||0)+s)}return w}
function smartSort(items){if(mine.swipes.size<12)return items;const w=taste(),sc=it=>{const g=it.g||[];return g.reduce((a,x)=>a+(w[x]||0),0)/Math.max(1,g.length)/Math.max(1,mine.swipes.size/40)+(it.r||0)/4+Math.random()*1.6};
  return items.map(it=>[sc(it),it]).sort((a,b)=>b[0]-a[0]).map(x=>x[1])}
async function becauseYouLiked(){const p=prefs||{};if(p.person?.id||p.fresh||night)return;const l=likes(mine).filter(r=>r.data?.kind).slice(0,25);if(l.length<3)return;
  const base=(l.find(r=>r.mega&&Math.random()<.5)||l[Math.floor(Math.random()*l.length)]).data;
  try{const r=await tmdb(`/${base.kind}/${base.id}/recommendations`);const kinds=p.kinds?.length?p.kinds:null;
    const rec=(r.results||[]).filter(x=>x.poster_path&&x.overview).map(x=>itemFrom(x,x.media_type||base.kind)).filter(x=>!seenK(x.k)&&(!kinds||kinds.includes(x.ty))).slice(0,3);
    rec.forEach((x,i)=>{x.why=base.t;deck.splice(Math.min(deck.length,2+i*3),0,x)})}catch(e){}}
async function fill(min=8){
  if(loading||night||room)return;loading=true;
  try{let guard=0;
    while(deck.length<min&&src.some(s=>!s.done)&&guard++<12){
      const live=src.filter(s=>!s.done),s=live[guard%live.length];s.page++;
      if(s.person){s.done=true;const r=await tmdb(`/person/${s.person}/combined_credits`);const seenId=new Set();
        const items=[...(r.cast||[]),...(r.crew||[]).filter(c=>c.job==="Director"||c.job==="Creator")].filter(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path&&!seenId.has(x.id)&&seenId.add(x.id))
          .sort((a,b)=>(b.vote_count||0)-(a.vote_count||0)).map(x=>itemFrom(x,x.media_type)).filter(x=>!seenK(x.k));deck.push(...items);continue}
      const r=await tmdb("/discover/"+s.kind,{...s.q,page:String(s.page)});
      if(!r.results?.length||s.page>=r.total_pages)s.done=true;
      const items=(r.results||[]).filter(x=>x.poster_path&&(x.overview||window.LANG!=="ru")).map(x=>itemFrom(x,s.kind)).filter(x=>!seenK(x.k));
      for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]]}
      deck.push(...smartSort(items));
    }
    // what the partner already liked goes near the top — quick matches
    const pl=likes(theirs).filter(r=>r.data?.kind&&!seenK(r.tmdb)).map(r=>r.data);if(pl.length)deck.splice(Math.min(1,deck.length),0,...pl.slice(0,3));
    // what the partner recommended goes first
    const rs=[...recsIn.values()].filter(r=>!r.seen&&r.data?.kind&&!mine.swipes.has(r.tmdb)&&!deck.some(x=>x.k===r.tmdb)).map(r=>r.data);if(rs.length)deck.unshift(...rs);
    deckErr=false;if(Math.random()<.6)await becauseYouLiked();
  }catch(e){deckErr=true}finally{loading=false}
}
function resetDeck(){deck=[];hist=[];buildSources();renderSwipe(true);fill().then(()=>renderSwipe())}

/* ---------- shell ---------- */
const backSvg='<svg width="16" height="16" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const avatar=(n,pt,url)=>`<span class="av ${pt?"pt":""}">${url?`<img src="${esc(url)}" alt="">`:esc((n||"?").trim()[0]?.toUpperCase()||"?")}</span>`;
const myAv=()=>avatar(myName(),0,me?.avatar_url),ptAv=()=>avatar(ptName(),1,partner?.avatar_url);
function topBar(title,sub){return `<div class="top"><div class="grow"><h1>${title}</h1>${sub?`<div class="sub">${sub}</div>`:""}</div>
  <button class="me" id="meBtn" type="button"><span class="duo">${myAv()}${partner?ptAv():""}</span><span>${esc(myName())}</span></button></div>`}
function go(v){view=v;document.querySelectorAll("#nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===v));
  $("#main").onclick=null;({swipe:renderSwipeView,likes:renderLikes,matches:renderMatches,shelf:renderShelf,search:renderSearch})[v]();counts()}
$("#nav").onclick=e=>{const b=e.target.closest("button");if(b)go(b.dataset.v)};
document.addEventListener("click",e=>{if(e.target.closest("#meBtn"))openProfile();if(e.target.closest("#pairBanner"))openProfile()});
function sheet(html){const L=$("#det")?$("#sheetRoot"):$("#layer");$("#sheetRoot").innerHTML="";L.innerHTML=`<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;$("#scrim").onclick=e=>{if(e.target.id==="scrim")closeSheet()}}
function closeSheet(){if($("#sheetRoot").innerHTML)$("#sheetRoot").innerHTML="";else $("#layer").innerHTML=""}
const inviteLink=()=>location.origin+location.pathname+"?pair="+me.pair_code;
function openProfile(){if(needAccount("Профиль, пара, фото и уведомления"))return;
  sheet(`<h2>Профиль</h2>
    <div class="sect"><span class="label">Фото</span><div style="display:flex;align-items:center;gap:12px"><span style="transform:scale(1.8);margin:0 14px 0 18px">${myAv()}</span><label class="btn" style="cursor:pointer">Загрузить фото<input type="file" id="avF" accept="image/*" hidden></label></div></div>
    <div class="sect"><span class="label">Как вас зовут</span><div style="display:flex;gap:8px"><input type="text" id="nm" maxlength="30" value="${esc(me.name)}" placeholder="Имя"><button class="btn" id="nmB">Сохранить</button></div></div>
    ${partner?`<div class="sect"><span class="label">Ваша пара</span><div style="display:flex;align-items:center;gap:10px">${ptAv()}<b style="flex:1">${esc(ptName())}</b><button class="btn ghost sm" id="unp">Отвязать</button></div></div>`
    :`<div class="sect"><span class="label">Позовите пару</span><p class="sub" style="margin:0">Отправьте ссылку партнёру — после входа ваши аккаунты свяжутся, и появятся мэтчи.</p>
      <div class="code">${esc(me.pair_code)}</div><div class="qr" id="qr" aria-label="QR-код приглашения"></div><p class="sub" style="margin:0;text-align:center;font-size:.76rem">Партнёр может навести камеру телефона на QR</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn red" id="shr" style="flex:1">Отправить ссылку</button><button class="btn" id="cpy">Скопировать</button></div></div>
      <div class="sect"><span class="label">Есть код партнёра?</span><div style="display:flex;gap:8px"><input type="text" id="pc" maxlength="6" placeholder="Например, 7F3A9C" style="text-transform:uppercase"><button class="btn" id="pcB">Связать</button></div></div>`}
    ${(()=>{const st=stats(),lv=levelOf(xpOf(st)),got=new Set(ACH.filter(a=>a[3](st)).map(a=>a[0]));const pct=lv.to?Math.round((lv.xp-lv.from)/(lv.to-lv.from)*100):100;
      return `<div class="sect lvl"><span class="label">Уровень ${lv.i} · ${esc(lv.name)}</span><div class="bar"><i style="width:${pct}%"></i></div><span class="sub" style="font-size:.76rem">${lv.xp} XP${lv.to?` · до следующего уровня ${lv.to-lv.xp}`:" · максимум!"}</span></div>
        <div class="sect"><span class="label">Ачивки · ${got.size} из ${ACH.length}</span><div class="ach">${ACH.map(a=>`<div class="${got.has(a[0])?"":"off"}"><b>${a[1]}</b>${esc(a[2])}</div>`).join("")}</div></div>`})()}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="yrBtn">🎬 Мой кино-год</button><button class="btn" id="onbAgain">🎨 Выбрать жанры заново</button></div>
    <div class="sect"><span class="label">Публичная полка</span><p class="sub" style="margin:0">Друзья увидят, что вы посмотрели и как оценили — по ссылке.</p>
      ${me.username?`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" id="pubT">${me.is_public?"✅ Включена":"Включить"}</button>${me.is_public?`<button class="btn sm" id="pubL">🔗 Скопировать ссылку</button>`:""}</div>`:`<p class="sub" style="margin:0">Сначала задайте логин:</p><div class="shtools"><input id="unI" maxlength="20" placeholder="логин: латиница, цифры, _ ."><button class="btn sm" id="unS">Сохранить</button></div>`}</div>
    <button class="btn red" id="instBtn" ${installEvt?"":"hidden"}>📲 Установить приложение на телефон</button>
    <button class="btn" id="tourAgain">🎓 Пройти обучение заново</button>
    <div class="sect"><span class="label">Язык</span><div class="seg" id="lngT">${[["ru","Русский"],["uk","Українська"],["en","English"]].map(([k,t])=>`<button data-l="${k}" aria-pressed="${window.LANG===k}">${t}</button>`).join("")}</div></div>
    <div class="sect"><span class="label">Оформление</span><div class="seg" id="thm">${[["dark","🌙 Тёмная"],["light","☀️ Светлая"],["auto","Как в системе"]].map(([k,t])=>`<button data-t="${k}" aria-pressed="${ls.get("theme","dark")===k}">${t}</button>`).join("")}</div>
      <div class="seg" id="sndT"><button data-s="1" aria-pressed="${SND_ON}">🔊 Звуки вкл</button><button data-s="0" aria-pressed="${!SND_ON}">🔇 Без звука</button></div></div>
    <div class="sect"><span class="label">Уведомления в Telegram</span><p class="sub" style="margin:0">Бот напишет, когда у вас мэтч или ${partner?esc(ptName()):"пара"} советует фильм.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${me.tg_chat_id?`<span class="onsh" style="align-self:center">Подключено ✓</span><button class="btn ghost sm" id="tgOff">Отключить</button>`:`<button class="btn red" id="tgOn">✈️ Подключить Telegram</button>`}</div></div>
    <div class="sect"><span class="label">Аккаунт</span><span class="sub">${me.username?"@"+esc(me.username)+" · ":""}${esc(me.email)}${me.phone?" · "+esc(me.phone):""}</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="out">Выйти</button><button class="btn ghost" id="del">Удалить аккаунт</button></div></div>
    <p class="sub" style="margin:0;font-size:.72rem">Данные о фильмах — TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>`);
  $("#nmB").onclick=async()=>{const n=$("#nm").value.trim().slice(0,30);await sb.from("km_profiles").update({name:n}).eq("user_id",me.user_id);me.name=n;toast("Сохранено");closeSheet();go(view)};
  const tgOn=$("#tgOn");if(tgOn)tgOn.onclick=async()=>{const w=window.open("","_blank");const r=await tgCall({action:"link"});if(r?.url){if(w)w.location=r.url;else location.href=r.url;toast("Нажмите «Start» в Telegram — и готово")}else{w&&w.close();toast("Не получилось, попробуйте ещё раз")}};
  const tgOff=$("#tgOff");if(tgOff)tgOff.onclick=async()=>{await tgCall({action:"unlink"});me.tg_chat_id=null;closeSheet();toast("Уведомления отключены")};
  $("#instBtn").onclick=async()=>{if(!installEvt)return;installEvt.prompt();const r=await installEvt.userChoice.catch(()=>null);if(r?.outcome==="accepted")toast("Kinomatch на главном экране 🎉");installEvt=null;$("#instBtn").hidden=true};
  $("#yrBtn").onclick=()=>{closeSheet();openYear()};$("#onbAgain").onclick=()=>{closeSheet();openOnboarding(true)};
  const pubT=$("#pubT");if(pubT)pubT.onclick=async()=>{const v=!me.is_public;const {error}=await sb.from("km_profiles").update({is_public:v}).eq("user_id",me.user_id);if(error)return toast("Не получилось");me.is_public=v;closeSheet();openProfile();if(v)copy(SITE+"?u="+me.username)};
  const pubL=$("#pubL");if(pubL)pubL.onclick=()=>copy(SITE+"?u="+me.username);
  const unS=$("#unS");if(unS)unS.onclick=async()=>{const u=$("#unI").value.trim().toLowerCase();if(!/^[a-z0-9_.]{3,20}$/.test(u))return toast("Логин: 3–20 символов, латиница, цифры, _ .");
    const {error}=await sb.from("km_profiles").update({username:u}).eq("user_id",me.user_id);if(error)return toast(/duplicate|unique/.test(error.message)?"Такой логин уже занят":"Не получилось");me.username=u;closeSheet();openProfile()};
  $("#tourAgain").onclick=()=>{closeSheet();startTour(true)};
  $("#lngT").onclick=e=>{const b=e.target.closest("[data-l]");if(b&&b.dataset.l!==window.LANG){ls.set("lang",b.dataset.l);location.reload()}};
  $("#thm").onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;ls.set("theme",b.dataset.t);let t=b.dataset.t;if(t==="auto")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t;
    document.querySelector('meta[name=theme-color]').content=t==="light"?"#f5f3ef":"#0b0b0d";$("#thm").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b))};
  $("#sndT").onclick=e=>{const b=e.target.closest("[data-s]");if(!b)return;SND_ON=b.dataset.s==="1";ls.set("snd",SND_ON);snd("tap");$("#sndT").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b))};
  $("#avF").onchange=e=>uploadAvatar(e.target.files[0]);if($("#qr"))drawQR($("#qr"),inviteLink());
  const shr=$("#shr");if(shr)shr.onclick=async()=>{const url=inviteLink(),text=`Давай выбирать кино вместе в ${BRAND}! Свайпаем, и что понравится обоим — смотрим 🍿`;
    if(navigator.share){try{await navigator.share({title:BRAND,text,url})}catch(e){}}else copy(url)};
  const cpy=$("#cpy");if(cpy)cpy.onclick=()=>copy(inviteLink());
  const pcB=$("#pcB");if(pcB)pcB.onclick=()=>pairWith($("#pc").value);
  const unp=$("#unp");if(unp)unp.onclick=async()=>{if(!unp.dataset.c){unp.dataset.c=1;unp.textContent="Точно? Нажмите ещё раз";return}
    await sb.rpc("km_unpair");partner=null;me.partner=null;theirs={shelf:new Map(),swipes:new Map()};closeSheet();toast("Пара отвязана");go(view)};
  $("#out").onclick=async()=>{await sb.auth.signOut();location.href=location.pathname};
  $("#del").onclick=async()=>{const d=$("#del");if(!d.dataset.c){d.dataset.c=1;d.textContent="Удалить всё безвозвратно? Нажмите ещё раз";return}
    const {error}=await sb.rpc("km_delete_me");if(error)return toast("Не получилось: "+error.message);await sb.auth.signOut();location.href=location.pathname};
}
let qrLib=null;
function drawQR(el,text){qrLib=qrLib||new Promise((ok,no)=>{const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)});
  qrLib.then(()=>{const q=qrcode(0,"M");q.addData(text);q.make();el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true})}).catch(()=>el.remove())}
async function uploadAvatar(file){if(!file)return;toast("Загружаю фото…");
  try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=URL.createObjectURL(file)});
    const c=document.createElement("canvas"),S=320;c.width=c.height=S;const m=Math.min(img.width,img.height);c.getContext("2d").drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S);
    const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.86));const path=`${me.user_id}/a${Date.now()}.jpg`;
    const {error}=await sb.storage.from("avatars").upload(path,blob,{contentType:"image/jpeg"});if(error)throw error;
    const url=sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;await sb.from("km_profiles").update({avatar_url:url}).eq("user_id",me.user_id);
    me.avatar_url=url;toast("Фото обновлено");closeSheet();go(view)}catch(e){toast("Не получилось загрузить фото")}}
async function tgCall(body){try{const {data:{session}}=await sb.auth.getSession();
  const r=await fetch(SB_URL+"/functions/v1/km-tg",{method:"POST",headers:{"content-type":"application/json",apikey:SB_KEY,authorization:"Bearer "+session.access_token},body:JSON.stringify(body)});return r.ok?r.json():null}catch(e){return null}}
function copy(t){(navigator.clipboard?.writeText(t)||Promise.reject()).then(()=>toast("Ссылка скопирована")).catch(()=>prompt("Скопируйте ссылку:",t))}
async function pairWith(code){code=(code||"").trim().toUpperCase();if(code.length<4)return toast("Введите код");
  const {data,error}=await sb.rpc("km_pair",{code});
  const msg={ok:"Готово! Вы теперь пара 💞",not_found:"Код не найден",self:"Это ваш собственный код",taken:"У этого человека уже есть пара",auth:"Сначала войдите"}[data]||("Ошибка: "+(error?.message||data));
  toast(msg);if(data==="ok"){await loadAll();closeSheet();resetDeck();go(view)}}

/* ---------- movie night: both swipe the same deck live (Supabase realtime broadcast) ---------- */
let nightCh=null;
function nightInfo(){if(!night)return"";const t=night.deck.length,their=night.their.size,mineN=night.mine.size;
  return `${night.joined?`${esc(ptName())}: ${their}/${t}`:`ждём ${esc(ptName())}…`} · вы: ${mineN}/${t} · мэтчей: ${night.matches.length}`}
function nightUpd(){const el=$("#nightInfo");if(el)el.textContent=nightInfo().replace(/&[^;]+;/g,"")}
function nightListen(){if(!partner||nightCh)return;const key=[me.user_id,partner.user_id].sort().join("_");
  nightCh=sb.channel("night:"+key,{config:{broadcast:{self:false}}});
  nightCh.on("broadcast",{event:"invite"},({payload})=>{if(night)return;sheet(`<h2>🍿 ${esc(ptName())} зовёт на вечер кино</h2><p class="sub" style="margin:-6px 0 0">Свайпаете одни и те же ${payload.deck.length} фильмов одновременно. Что понравится обоим — сразу мэтч.</p>
      <div class="sticky"><button class="btn red" id="njY" style="flex:1">Присоединиться</button><button class="btn" id="njN">Позже</button></div>`);snd("tap");
      $("#njY").onclick=()=>{closeSheet();night={deck:payload.deck,their:new Map(),mine:new Map(),matches:[],joined:true};deck=payload.deck.filter(x=>!mine.swipes.has(x.k));nightSend("join",{});ls.set("nights",(+ls.get("nights",0))+1);go("swipe")};$("#njN").onclick=closeSheet})
    .on("broadcast",{event:"join"},()=>{if(!night)return;night.joined=true;toast(`🍿 ${ptName()} с вами!`);snd("tap");nightUpd()})
    .on("broadcast",{event:"swipe"},({payload})=>{if(!night)return;night.their.set(payload.k,payload.v);nightUpd()})
    .on("broadcast",{event:"end"},()=>{if(night){toast(`${ptName()} завершил(а) вечер кино`);nightSummary()}})
    .subscribe()}
function nightSend(event,payload){try{nightCh?.send({type:"broadcast",event,payload})}catch(e){}}
async function startNight(){if(needAccount("Вечер кино"))return;if(!partner)return;toast("Собираю колоду на вечер…");const keep=night;night=null;await fill(36);
  const d=deck.filter(x=>!mine.swipes.has(x.k)).slice(0,36).map(x=>({...slim(x),why:x.why}));if(d.length<5){toast("Мало фильмов по фильтру — ослабьте фильтры");night=keep;return}
  night={deck:d,their:new Map(),mine:new Map(),matches:[],joined:false};deck=d.slice();nightSend("invite",{deck:d});ls.set("nights",(+ls.get("nights",0))+1);
  tgCall({action:"notify",kind:"night"});go("swipe");toast(`Приглашение отправлено ${ptName()}`)}
function nightSummary(){if(!night)return;const n=night,ms=n.deck.filter(x=>(mine.swipes.get(x.k)?.v==="like")&&(theirs.swipes.get(x.k)?.v==="like"||n.their.get(x.k)==="like"));
  sheet(`<h2>🍿 Итоги вечера</h2><p class="sub" style="margin:-6px 0 0">${ms.length?`Вам обоим понравилось ${RN(ms.length,"фильм","фильма","фильмов")}:`:"Совпадений пока нет — досвайпайте колоду."}</p>
    ${ms.length?`<div class="pgrid">${ms.map(x=>`<button class="pcard gold" data-nk="${esc(x.k)}"><img src="${IMG}w342${x.poster}" alt=""><span class="pt">${esc(x.t)}</span></button>`).join("")}</div>`:""}
    <div class="sticky">${ms.length?`<button class="btn red" id="nRoll" style="flex:1">🎲 Выбрать за нас</button>`:""}<button class="btn" id="nCont">Свайпать дальше</button><button class="btn ghost" id="nStop">Завершить</button></div>`);
  document.querySelectorAll("[data-nk]").forEach(b=>b.onclick=()=>{closeSheet();openDetail(ms.find(x=>x.k===b.dataset.nk))});
  const rl=$("#nRoll");if(rl)rl.onclick=()=>{const w=ms[Math.floor(Math.random()*ms.length)];closeSheet();confetti();snd("match");toast("🎲 Сегодня смотрим: «"+w.t+"»");openDetail(w)};
  $("#nCont").onclick=closeSheet;$("#nStop").onclick=()=>{nightSend("end",{});night=null;closeSheet();resetDeck();go("swipe")}}

/* ---------- onboarding tour: spotlight a control, explain it, "Ясно" moves on ---------- */
const TOUR=[
  ["#stack .sc.front","Карточка фильма","Свайп вправо — нравится, влево — мимо, вверх по постеру — мега-лайк. Тап по постеру слева или справа листает кадры из фильма."],
  ["#bN","Мимо","Фильм больше не покажется."],
  ["#bY","Хочу","Фильм попадёт во вкладку «Лайки». Если партнёру он тоже понравится — будет мэтч 💞"],
  ["#bM","Мега-лайк","Точно хочу посмотреть — фильм сразу ложится на полку."],
  ["#bS","Уже смотрел","Фильм уйдёт в «Посмотрено» на полке, и его можно оценить. Больше в свайпе не появится."],
  ["#bU","Вернуть","Свайпнули случайно? Эта кнопка возвращает последнюю карточку."],
  ["#bI","Подробнее","Описание, актёры, все трейлеры, рейтинг IMDb, возраст и где смотреть в Украине. Ещё можно просто пролистать карточку вниз."],
  ["#kinds","Что показывать","Фильмы, сериалы, аниме или дорамы. «🆕 Новинки» — то, что недавно вышло в хорошем качестве."],
  ["#flt","Фильтры","Настроение, жанры, годы, страна, рейтинг и сколько у вас времени."],
  ["#nightGo,#pairBanner","Вдвоём веселее","Позовите пару по ссылке — и ловите общие мэтчи. А «Вечер кино» — свайпаете одни и те же фильмы одновременно."],
  ['#nav [data-v="likes"]',"Лайки","Всё, что вы свайпнули вправо. Отсюда удобно класть фильмы на полку."],
  ['#nav [data-v="matches"]',"Мэтчи","Фильмы, которые понравились вам обоим. Здесь выбираете, что смотреть сегодня."],
  ['#nav [data-v="shelf"]',"Полка","Хочу, смотрю, посмотрено. Оценки, свои списки, прогресс сериалов, 3D-вид, импорт и экспорт."],
  ['#nav [data-v="search"]',"Поиск и подборки","Найдите любой фильм по названию или откройте готовые подборки: «Для свидания», «Хоррор-вечер» и другие."],
  ["#meBtn","Профиль","Фото, код пары, ачивки и уровень, Telegram-уведомления, язык, тема и звуки. Обучение можно пройти здесь заново."]];
async function startTour(force){if(!force&&ls.get("tourDone",false))return;if(view!=="swipe")go("swipe");
  for(let i=0;i<50&&!$("#stack .sc.front");i++)await new Promise(r=>setTimeout(r,150));
  const steps=TOUR.filter(t=>document.querySelector(t[0]));let i=0;
  const el=document.createElement("div");el.className="tour";el.innerHTML=`<div class="hole"></div><div class="tip" role="dialog" aria-live="polite"><b></b><p></p><div class="r"><span></span><button class="btn ghost sm" data-skip>Пропустить</button><button class="btn red" data-ok>Ясно</button></div></div>`;document.body.appendChild(el);
  const end=()=>{el.remove();ls.set("tourDone",true);removeEventListener("resize",place)};
  function place(){const t=steps[i];const tgt=document.querySelector(t[0]);if(!tgt){return next()}const r=tgt.getBoundingClientRect(),pad=6,h=el.querySelector(".hole"),tip=el.querySelector(".tip");
    h.style.left=r.left-pad+"px";h.style.top=r.top-pad+"px";h.style.width=r.width+pad*2+"px";h.style.height=r.height+pad*2+"px";h.style.borderRadius=getComputedStyle(tgt).borderRadius==="50%"?"50%":"16px";
    tip.querySelector("b").textContent=t[1];tip.querySelector("p").textContent=t[2];tip.querySelector(".r span").textContent=`${i+1} из ${steps.length}`;tip.querySelector("[data-ok]").textContent=i===steps.length-1?"Ясно, начинаем!":"Ясно";
    const th=tip.offsetHeight||150,below=r.bottom+14+th<innerHeight,above=r.top-14-th>0;
    tip.style.top=(r.height>innerHeight*.5?Math.max(12,innerHeight-th-110):below?r.bottom+14:above?r.top-14-th:Math.max(12,innerHeight-th-12))+"px";snd("tap")}
  function next(){i++;if(i>=steps.length)return end();place()}
  el.querySelector("[data-ok]").onclick=next;el.querySelector("[data-skip]").onclick=end;addEventListener("resize",place);place()}

/* ---------- eye candy ---------- */
let ambI=0,ambSrc="";
function ambient(path){if(!path)return;const u=IMG+"w300"+path;if(u===ambSrc)return;ambSrc=u;const ims=document.querySelectorAll("#amb img"),nx=ims[ambI^1];
  const pre=new Image();pre.onload=()=>{nx.src=u;nx.classList.add("on");ims[ambI].classList.remove("on");ambI^=1};pre.src=u}
function burst(kind,fromEl){const r=(fromEl||document.body).getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const set=kind==="mega"?["⭐","✨","💫","⭐"]:kind==="nope"?["✕"]:["❤️","💖","💗","❤️"];const n=kind==="nope"?0:kind==="mega"?16:12;
  for(let i=0;i<n;i++){const e=document.createElement("span");e.className="burst";e.textContent=set[i%set.length];
    const a=Math.random()*Math.PI*2,d=80+Math.random()*140;e.style.left=cx-11+"px";e.style.top=cy-11+"px";
    e.style.setProperty("--dx",Math.cos(a)*d+"px");e.style.setProperty("--dy",Math.sin(a)*d-60+"px");e.style.setProperty("--r",(Math.random()*120-60)+"deg");
    document.body.appendChild(e);setTimeout(()=>e.remove(),950)}}
function confetti(){const cols=["#ff2d3f","#ffc93c","#5aa9ff","#2fd17f","#ff9a3c","#fff"];
  for(let i=0;i<90;i++){const e=document.createElement("span");e.className="conf";e.style.left=Math.random()*100+"vw";e.style.background=cols[i%cols.length];
    e.style.setProperty("--x",(Math.random()*200-100)+"px");e.style.setProperty("--r",(Math.random()*900)+"deg");e.style.setProperty("--t",(1.6+Math.random()*1.6)+"s");e.style.animationDelay=Math.random()*.5+"s";
    document.body.appendChild(e);setTimeout(()=>e.remove(),4000)}}
function tilt(el){if(!matchMedia("(hover:hover)").matches)return;const g=el.querySelector(".glare");
  el.addEventListener("mousemove",e=>{if(el._drag)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    el.style.transform=`rotateY(${(x-.5)*10}deg) rotateX(${(.5-y)*8}deg)`;if(g){g.style.setProperty("--gx",x*100+"%");g.style.setProperty("--gy",y*100+"%")}});
  el.addEventListener("mouseleave",()=>{if(!el._drag)el.style.transform=""})}

/* ---------- swipe view ---------- */
function renderSwipeView(){
  const p=prefs||DEF_PREFS(),nf=(p.yes?.length||0)+(p.no?.length||0)+(p.eras?.length||0)+(p.minR?1:0)+(p.mood?1:0)+(p.len?1:0)+(p.cc?.length||0)+(p.prov?.length||0),kk=p.fresh?"fresh":p.kinds?.length===1?p.kinds[0]:"";
  $("#main").innerHTML=`<div class="view swv" style="overflow:hidden"><div class="wrap pad" style="width:100%">${topBar("Свайп",partner?`Вы с ${esc(ptName())} в паре`:"")}
    ${partner?"":`<button class="banner" id="pairBanner"><span class="duo">${myAv()}<span class="av pt">+</span></span><span><b>Позовите пару</b><span>Чтобы ловить общие мэтчи</span></span></button>`}
    ${room?`<div class="nightbar"><span style="font-size:1.5rem">👥</span><span class="grow"><b>Комната «${esc(room.name)}»</b><span id="roomInfo">${roomInfo()}</span></span><button class="btn sm" id="roomEnd">Итоги</button></div>`:night?`<div class="nightbar"><span style="font-size:1.5rem">🍿</span><span class="grow"><b>Вечер кино с ${esc(ptName())}</b><span id="nightInfo">${nightInfo()}</span></span><button class="btn sm" id="nightEnd">Итоги</button></div>`
      :`<div class="row">${partner?`<button class="pill" id="nightGo">🍿 Вечер кино вдвоём</button>`:""}<button class="pill" id="roomGo">👥 С друзьями</button></div>`}
    ${night||room?"":p.person?`<div class="row"><button class="pill act" id="noPerson">🎭 ${esc(p.person.name)} <b>✕</b></button></div>`:""}
    <div class="row" id="kinds" ${night||room?"hidden":""}>${[{k:"",t:"Всё"},{k:"fresh",t:"🆕 Новинки"},...KINDS].map(x=>`<button class="pill ${x.k===kk&&!p.person?"act":""}" data-k="${x.k}">${x.t}</button>`).join("")}
      <button class="pill ${nf?"act":""}" id="flt"><svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Фильтры${nf?` <b>${nf}</b>`:""}</button></div></div>
    <div class="stage"><div class="stack" id="stack"></div></div>
    <div class="ctrl2 pad">
      <div class="big2"><button class="bigb no" id="bN" aria-label="Мимо"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>Мимо</button>
        <button class="bigb yes" id="bY" aria-label="Хочу"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.7 3 5 6.6 5c2.1 0 3.6 1.2 5.4 3.2C13.8 6.2 15.3 5 17.4 5 21 5 23 8.7 21.6 11.8 19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>Хочу</button></div>
      <div class="keys" aria-hidden="true"><span><kbd>←</kbd> мимо</span><span><kbd>→</kbd> хочу</span><span><kbd>↑</kbd> мега</span><span><kbd>↓</kbd> смотрел</span><span><kbd>Пробел</kbd> трейлер</span><span><kbd>I</kbd> инфо</span><span><kbd>Z</kbd> вернуть</span></div>
      <div class="mini2">
        <button class="mb undo" id="bU" aria-label="Вернуть"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>Вернуть</button>
        <button class="mb mega" id="bM" aria-label="Мега-лайк: сразу на полку"><svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor"/></svg>Мега</button>
        <button class="mb seen" id="bS" aria-label="Уже смотрел"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>Смотрел</button>
        <button class="mb info" id="bI" aria-label="Подробнее"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.5" fill="currentColor"/></svg>Инфо</button>
      </div>
    </div></div>`;
  $("#kinds").onclick=e=>{const b=e.target.closest("[data-k]");if(!b)return;const p={...DEF_PREFS(),...(prefs||{})};p.person=null;p.fresh=b.dataset.k==="fresh";p.kinds=b.dataset.k&&!p.fresh?[b.dataset.k]:[];savePrefs(p)};
  const ng=$("#nightGo");if(ng)ng.onclick=startNight;const rg=$("#roomGo");if(rg)rg.onclick=()=>{if(needAccount("Комнаты с друзьями"))return;go("matches")};const re=$("#roomEnd");if(re)re.onclick=roomSummary;const ne=$("#nightEnd");if(ne)ne.onclick=nightSummary;
  const np=$("#noPerson");if(np)np.onclick=()=>savePrefs({...DEF_PREFS(),...prefs,person:null});$("#bS").onclick=()=>decide("seen");
  $("#flt").onclick=openPrefs;$("#bN").onclick=()=>decide("nope");$("#bY").onclick=()=>decide("like");$("#bM").onclick=()=>decide("mega");$("#bU").onclick=undo;
  $("#bI").onclick=()=>{const t=$("#stack .sc.front");if(t)t.scrollTo({top:t.scrollTop>40?0:t.querySelector(".info").offsetTop-50,behavior:"smooth"})};
  $("#stack").addEventListener("click",e=>{if(e.target.closest(".more"))$("#bI").click()});
  renderSwipe(!deck.length);if(deck.length<6)fill().then(()=>{if(view==="swipe")renderSwipe()});
}
async function savePrefs(p){prefs=p;resetDeck();renderSwipeView();await sb.from("km_prefs").upsert({user_id:me.user_id,prefs:p})}
function cardHTML(it,front){const pl=partner&&theirs.swipes.get(it.k)?.v==="like",rc=recsIn.get(it.k);
  return `<div class="sc ${front?"front":"under"}" data-k="${esc(it.k)}">
    <div class="pic"><img class="bg" alt=""><img class="fg" alt="" ${it.poster?`src="${IMG}w500${it.poster}"`:""}>
      <div class="bars"></div><div class="glare"></div>
      <div class="gen">${it.why?`<span class="why">✨ Похоже на «${esc(it.why)}»</span>`:""}${rc?`<span class="rc">💌 ${esc(ptName())} советует</span>`:""}${pl?`<span class="liked">♥ ${esc(ptName())} уже лайкнул(а)</span>`:""}<span class="ty">${TYPES[it.ty]||""}</span>${(it.g||[]).map(x=>`<span class="gn">${esc(cap1(x))}</span>`).join("")}</div>
      <span class="stamp yes">Нравится</span><span class="stamp no">Мимо</span><span class="stamp mega">Мега-лайк</span>
      <button class="trb" data-tr type="button"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>Трейлер</button>
      <div class="cap"><b>${esc(it.t)}</b><div class="m">${it.y?`<span>${esc(it.y)}</span>`:""}${it.r?`<span class="rt">★ ${it.r}</span>`:""}</div><div class="kf"></div></div></div>
    <div class="info"><button class="more" type="button">↓ Подробнее · свайп вверх — мега-лайк</button>${rc?`<span class="recn">💌 <b>${esc(ptName())}</b> советует${rc.note?`: «${esc(rc.note)}»`:""}</span>`:""}<div class="sect"><span class="label">О чём</span><p class="desc">${esc(it.d)}</p></div><div class="dx"><div class="spin"></div></div></div></div>`}
function detailsHTML(it,d){const x=d||{},w=whereOf(it,d),q=qualOf(it,d),vids=videosOf(d);
  const dirs=it.kind==="tv"?(x.created_by||[]).map(c=>({id:c.id,name:c.name,profile_path:c.profile_path,character:"создатель"})):(x.credits?.crew||[]).filter(c=>c.job==="Director").map(c=>({...c,character:"режиссёр"}));
  const ppl=[...dirs.slice(0,2),...(x.credits?.cast||[]).slice(0,12)];
  const imdbId=x.imdb_id||x.external_ids?.imdb_id;
  return `${q?`<div class="qual ${q.c}">${esc(q.t)}</div>`:""}${imdbId?`<div class="chips" data-imdb="${esc(imdbId)}"></div>`:""}${x.tagline?`<p class="tagl">«${esc(x.tagline.replace(/^[«"“]|[»"”]$/g,""))}»</p>`:""}
    <dl class="facts">${factsOf(it,d).map(([a,b])=>`<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl>
    ${ppl.length?`<div class="sect"><span class="label">Актёры и создатели · тап — все их фильмы</span><div class="cast">${ppl.map(c=>`<button type="button" data-person="${c.id}" data-pname="${esc(c.name)}">${c.profile_path?`<img src="${IMG}w185${c.profile_path}" alt="" loading="lazy">`:"<i>👤</i>"}${esc(c.name)}<small>${esc(c.character||"")}</small></button>`).join("")}</div></div>`:""}
    ${vids.length>1?`<div class="sect"><span class="label">Видео</span><div class="chips">${vids.map(v=>`<button class="chip" type="button" data-yt="${esc(v.key)}">▶ ${esc(v.label)}</button>`).join("")}</div></div>`:""}
    ${x.belongs_to_collection?`<div class="sect" data-coll="${x.belongs_to_collection.id}"><span class="label">${esc(x.belongs_to_collection.name||"Франшиза")} — по порядку</span><div class="coll"><div class="spin"></div></div></div>`:""}
    <div class="sect"><span class="label">Где смотреть в Украине</span><div class="chips">${w.length?w.map(p=>`<a class="chip ${p.sub?"free":""}" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)} · ${p.sub?"подписка":"купить"} ›</a>`).join(""):`<a class="chip" href="https://www.justwatch.com/ua/search?q=${encodeURIComponent(it.t)}" target="_blank" rel="noopener">В Украине не найдено · искать ›</a>`}</div></div>`}
async function hydrateCard(el,it){
  const d=await details(it);if(!el.isConnected)return;
  if(d&&!d.overview&&window.LANG!=="ru"){try{const en=await tmdb(`/${it.kind}/${it.id}`,{language:"en-US"});if(en?.overview){d.overview=en.overview;it.d=en.overview;const dd=el.querySelector(".desc,.clamp");if(dd&&!dd.textContent.trim())dd.textContent=en.overview}}catch(e){}}
  el._frames=framesOf(it,d);el._i=0;
  el.querySelector(".bars").innerHTML=el._frames.length>1?el._frames.map((_,j)=>`<span class="${j?"":"on"}"></span>`).join(""):"";
  const dx=el.querySelector(".dx");if(dx){dx.outerHTML=detailsHTML(it,d);loadColl(el);loadImdb(el)}
  keyFacts(el,it,d);
  const tr=trailerOf(d),b=el.querySelector("[data-tr]");b.onclick=e=>{e.stopPropagation();playTrailer(it,tr)};
  el._frames.slice(1).forEach(f=>{const im=new Image();im.src=f.u});showFrame(el,0);
}
function keyFacts(el,it,d){const kf=el.querySelector(".kf");if(!kf||!d)return;const tv=it.kind==="tv",out=[];
  const rt=tv?((d.episode_run_time||[])[0]||d.last_episode_to_air?.runtime):d.runtime;
  if(tv&&d.number_of_seasons)out.push(RN(d.number_of_seasons,"сезон","сезона","сезонов"));else if(rt)out.push(rt>=60?`${Math.floor(rt/60)} ч ${rt%60?rt%60+" мин":""}`.trim():`${rt} мин`);
  const age=ageOf(it,d);if(age)out.push(age);
  const ua=d["watch/providers"]?.results?.UA,pv=(ua?.flatrate||ua?.free||ua?.ads||[])[0];if(pv)out.push("▶ "+pv.provider_name);
  kf.innerHTML=out.map(x=>`<span>${esc(x)}</span>`).join("");
  const imdb=d.imdb_id||d.external_ids?.imdb_id;if(imdb)tmdb("/omdb",{i:imdb}).then(j=>{if(j?.imdb&&kf.isConnected)kf.insertAdjacentHTML("afterbegin",`<span class="imdb">IMDb ${esc(j.imdb)}</span>`)}).catch(()=>{})}
const COLLI=new Map();
async function loadImdb(root){const s=root.querySelector("[data-imdb]");if(!s)return;
  try{const j=await tmdb("/omdb",{i:s.dataset.imdb});const nm={"Rotten Tomatoes":"🍅 Rotten Tomatoes","Metacritic":"Metacritic"};
    const out=[];if(j.imdb)out.push(`<a class="chip" style="background:#f5c518;color:#000;border-color:transparent;font-weight:800" href="https://www.imdb.com/title/${esc(s.dataset.imdb)}/" target="_blank" rel="noopener">IMDb ★ ${esc(j.imdb)}${j.votes?` <span style="opacity:.6">· ${esc(j.votes)}</span>`:""}</a>`);
    (j.ratings||[]).filter(r=>nm[r.s]).forEach(r=>out.push(`<span class="chip">${nm[r.s]} ${esc(r.v)}</span>`));
    if(j.awards){const o=j.awards.match(/Won (\d+) Oscar/),w=j.awards.match(/(\d+) wins?/);if(o)out.push(`<span class="chip">🏆 Оскар: ${o[1]}</span>`);else if(w)out.push(`<span class="chip">🏆 Наград: ${w[1]}</span>`)}
    if(out.length)s.innerHTML=out.join("");else s.remove()}catch(e){s.remove()}}
async function loadColl(root){const s=root.querySelector("[data-coll]");if(!s)return;
  try{const c=await tmdb("/collection/"+s.dataset.coll);const parts=(c.parts||[]).filter(p=>p.poster_path).sort((a,b)=>(a.release_date||"9").localeCompare(b.release_date||"9"));
    parts.forEach(p=>COLLI.set("movie-"+p.id,itemFrom(p,"movie")));
    s.querySelector(".coll").innerHTML=parts.map((p,i)=>`<button class="pcard" type="button" data-ck="movie-${p.id}"><img src="${IMG}w185${p.poster_path}" alt="" loading="lazy"><span class="ps">${i+1}</span><span class="pt">${esc(p.title)}${p.release_date?" · "+p.release_date.slice(0,4):""}</span></button>`).join("")}catch(e){s.remove()}}
document.addEventListener("click",async e=>{
  const ps=e.target.closest("[data-person]");if(ps){e.stopPropagation();$("#layer").innerHTML="";const p={...DEF_PREFS(),...(prefs||{}),person:{id:+ps.dataset.person,name:ps.dataset.pname}};prefs=p;go("swipe");savePrefs(p);toast("Показываю всё с «"+ps.dataset.pname+"»");return}
  const yt=e.target.closest("[data-yt]");if(yt){e.stopPropagation();playTrailer(null,{key:yt.dataset.yt});return}
  const ck=e.target.closest("[data-ck]");if(ck){e.stopPropagation();const it=COLLI.get(ck.dataset.ck);if(it)openDetail(it)}},true);
function showFrame(el,i){const a=el._frames||[];if(!a.length)return;i=(i+a.length)%a.length;el._i=i;const pic=el.querySelector(".pic");
  pic.querySelector(".fg").src=a[i].u;pic.querySelector(".bg").src=a[i].u;pic.classList.toggle("still",a[i].still);
  el.querySelectorAll(".bars span").forEach((b,j)=>b.classList.toggle("on",j===i))}
function renderSwipe(loadingNow){
  const S=$("#stack");if(!S)return;$("#bU").disabled=!hist.length;
  const off=!deck.length;["#bN","#bY","#bM"].forEach(s=>$(s).disabled=off);
  if(!deck.length&&room){S.innerHTML=`<div class="swempty"><strong>Колода комнаты закончилась 👥</strong>Смотрим, что выбрала компания.<button class="btn red" id="rt">Итоги</button></div>`;$("#rt").onclick=roomSummary;return}
  if(!deck.length&&night){S.innerHTML=`<div class="swempty"><strong>Колода вечера закончилась 🍿</strong>Посмотрим, что совпало.<button class="btn red" id="rt">Итоги</button></div>`;$("#rt").onclick=nightSummary;return}
  if(!deck.length){S.innerHTML=deckErr?`<div class="swempty"><strong>Не загрузилось</strong>Проверьте интернет.<button class="btn red" id="rt">Ещё раз</button></div>`
    :(loading||loadingNow)?`<div class="swempty"><div class="spin"></div>Подбираю фильмы…</div>`
    :`<div class="swempty"><strong>По этому фильтру всё</strong>Ослабьте «Жанры и годы».<button class="btn red" id="rt">Изменить</button></div>`;
    const rt=$("#rt");if(rt)rt.onclick=deckErr?resetDeck:openPrefs;return}
  S.innerHTML=(deck[1]?cardHTML(deck[1],false):"")+cardHTML(deck[0],true);
  const f=S.querySelector(".sc.front");f.classList.add("enter");ambient(deck[0].backdrop||deck[0].poster);tilt(f);hydrateCard(f,deck[0]);deck.slice(1,4).forEach(x=>{details(x);if(x.poster){const im=new Image();im.src=IMG+"w500"+x.poster}});
  attachDrag(f);
}
function attachDrag(el){
  let x0=0,y0=0,dx=0,dy=0,id=null,moved=false,locked=false,up=false,onPic=false;const st=s=>el.querySelector(".stamp."+s);
  let t0=0;el.addEventListener("pointerdown",e=>{if(busy||e.target.closest("a,button,.cast,.coll,.chips"))return;t0=performance.now();id=e.pointerId;x0=e.clientX;y0=e.clientY;dx=dy=0;moved=false;locked=false;up=false;onPic=!!e.target.closest(".pic");el._drag=true;el.style.transition="none"});
  el.addEventListener("pointermove",e=>{if(e.pointerId!==id)return;dx=e.clientX-x0;dy=e.clientY-y0;
    if(!locked){if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){
        if(onPic&&dy<0&&el.scrollTop<8){locked=true;up=true;try{el.setPointerCapture(e.pointerId)}catch(_){}}
        else if(onPic&&dy>0&&el.scrollTop>0){id=null;el._drag=false;return}
        else{id=null;el._drag=false;return}}
      else if(Math.abs(dx)>8){locked=true;try{el.setPointerCapture(e.pointerId)}catch(_){}}}
    if(!locked)return;moved=true;
    if(up){el.style.transform=`translate(${dx*.2}px,${Math.min(0,dy)}px) scale(${1+Math.max(0,-dy)/1500})`;st("mega").style.opacity=Math.max(0,Math.min(1,-dy/110));return}
    el.style.transform=`translate(${dx}px,${dy*.2}px) rotate(${dx/18}deg)`;st("yes").style.opacity=Math.max(0,Math.min(1,dx/90));st("no").style.opacity=Math.max(0,Math.min(1,-dx/90))});
  const end=e=>{if(e.pointerId!==id)return;id=null;el._drag=false;
    const fast=(performance.now()-t0)<420;
    if(moved&&up&&(dy<-220||(dy<-110&&fast))){decide("mega",true);if(!ls.get("megaHint",false)){ls.set("megaHint",true);setTimeout(()=>toast("Это был мега-лайк ⭐ — фильм на полке. Передумали? Кнопка «Вернуть»"),400)}}
    else if(moved&&!up&&Math.abs(dx)>100){decide(dx>0?"like":"nope",true)}
    else{el.style.transition="transform .25s";el.style.transform="";st("yes").style.opacity=st("no").style.opacity=st("mega").style.opacity=0;
      if(!moved&&e.target.closest(".pic")){const r=el.getBoundingClientRect();showFrame(el,(el._i||0)+(e.clientX-r.left<r.width/3?-1:1))}}};
  el.addEventListener("pointerup",end);el.addEventListener("pointercancel",end);
}
document.addEventListener("keydown",e=>{if(view!=="swipe"||$("#layer").innerHTML||$("#modalRoot").innerHTML||/INPUT|TEXTAREA/.test(document.activeElement?.tagName))return;
  if(e.key==="ArrowRight")decide("like");else if(e.key==="ArrowLeft")decide("nope");else if(e.key==="ArrowUp")decide("mega");else if(e.key==="ArrowDown"){e.preventDefault();decide("seen")}
  else if(e.key===" "){e.preventDefault();$("#stack .sc.front [data-tr]")?.click()}else if(e.key.toLowerCase()==="i"||e.key==="ш")$("#bI")?.click();else if(e.key==="Backspace"||e.key.toLowerCase()==="z"||e.key==="я")$("#bU")?.click()});
async function decide(v,dragged){
  if(busy||!deck.length)return;busy=true;const it=deck[0],el=$("#stack .sc.front"),like=v==="like"||v==="mega";
  if(el){const dir=like?1:-1;el.style.transition="transform .3s ease-out,opacity .3s";const sp=el.querySelector(".stamp."+(v==="mega"?"mega":like?"yes":"no"));if(v!=="seen")sp.style.opacity=1;
    el.style.transform=v==="mega"?`translateY(${-Math.max(innerHeight,700)}px)`:v==="seen"?`translateY(${Math.max(innerHeight,700)}px) scale(.9)`:`translate(${dir*Math.max(innerWidth,500)}px,${dragged?0:-30}px) rotate(${dir*24}deg)`;el.style.opacity=.6}
  if(v!=="seen")burst(v,$(v==="mega"?"#bM":like?"#bY":"#bN"));snd(v);if(night)nightSend("swipe",{k:it.k,v:v==="seen"?"seen":like?"like":"nope"});if(room&&v!=="seen")roomVote(it,like?"like":"nope");if(navigator.vibrate)try{navigator.vibrate(v==="mega"?[10,40,10]:8)}catch(e){}
  const row={user_id:me.user_id,tmdb:it.k,v:v==="seen"?"seen":like?"like":"nope",mega:v==="mega",data:slim(it),at:new Date().toISOString()};
  mine.swipes.set(it.k,row);deck.shift();if(++swCount>=25)flushSw();if(me.guest&&mine.swipes.size%15===0)setTimeout(()=>needAccount(`Вы уже оценили ${mine.swipes.size} фильмов — сохраните их`),500);if(night){night.mine.set(it.k,row.v);setTimeout(nightUpd,0)}hist.push({it,mega:v==="mega",seen:v==="seen"});
  const rc=recsIn.get(it.k);if(rc&&!rc.seen){rc.seen=true;sb.from("km_recs").update({seen:true}).eq("id",rc.id).then(()=>{})}if(hist.length>30)hist.shift();
  setTimeout(()=>{busy=false;renderSwipe();counts();if(deck.length<6)fill().then(()=>{if(view==="swipe")renderSwipe()})},230);
  const {error}=await sb.from("km_swipes").upsert(row);if(error)return toast("Не сохранилось: "+error.message);
  if(v==="mega"){await addToShelf(it);toast("Мега-лайк! «"+it.t+"» уже на полке")}
  if(v==="seen"){await addToShelf(it,"done");toast("«"+it.t+"» — в «Посмотрено». Оценить можно на полке")}
  const ps=theirs.swipes.get(it.k);if(like&&partner&&ps?.v==="like"){showMatch(it,v==="mega"&&ps.mega);tgCall({action:"notify",kind:"match",tmdb:it.k})}
}
async function undo(){const h=hist.pop();if(!h)return;mine.swipes.delete(h.it.k);await sb.from("km_swipes").delete().match({user_id:me.user_id,tmdb:h.it.k});
  if(h.mega||h.seen){mine.shelf.delete(h.it.k);await sb.from("km_shelf").delete().match({user_id:me.user_id,tmdb:h.it.k})}
  deck=deck.filter(x=>x.k!==h.it.k);deck.unshift(h.it);renderSwipe();counts()}
async function addToShelf(it,status){const row={user_id:me.user_id,tmdb:it.k,data:slim(it),status:status||"want",rating:0,note:"",updated_at:new Date().toISOString()};
  mine.shelf.set(it.k,{...row,added_at:row.updated_at});const {error}=await sb.from("km_shelf").upsert(row);if(error)toast("Не сохранилось: "+error.message)}
function showMatch(it,sup){confetti();snd("match");track(sup?"supermatch":"match");if(night&&!night.matches.some(x=>x.k===it.k))night.matches.push(it);if(sup)setTimeout(confetti,500);try{navigator.vibrate&&navigator.vibrate(sup?[30,50,30,50,30,50,80]:[20,60,20,60,40])}catch(e){}const L=$("#layer");L.innerHTML=`<div class="match ${sup?"super":""}" id="mt"><div class="mcard"><h3>${sup?"Супер-мэтч!":"Мэтч!"}</h3>${it.poster?`<img src="${IMG}w342${it.poster}" alt="">`:""}<p>${sup?`Вы с ${esc(ptName())} <b>оба поставили мега-лайк</b> — смотрите сегодня!<br>`:`Вы с ${esc(ptName())} оба хотите посмотреть<br>`}<b>${esc(it.t)}</b></p><div style="display:flex;gap:10px"><button class="btn red" id="mtS">На полку</button><button class="btn" id="mtOk">Дальше</button></div></div></div>`;
  $("#mtOk").onclick=()=>L.innerHTML="";$("#mtS").onclick=async()=>{await addToShelf(it);L.innerHTML="";toast("На полке")};$("#mt").onclick=e=>{if(e.target.id==="mt")L.innerHTML=""}}
function playTrailer(it,tr){
  if(!tr){if(it)window.open("https://www.youtube.com/results?search_query="+encodeURIComponent((it.o||it.t)+" трейлер"),"_blank");return}
  const L=$("#modalRoot");L.innerHTML=`<div class="vid" id="vd"><button class="x" id="vx" aria-label="Закрыть">✕</button><div class="frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(tr.key)}?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Трейлер"></iframe></div></div>`;
  $("#vx").onclick=()=>L.innerHTML="";$("#vd").onclick=e=>{if(e.target.id==="vd")L.innerHTML=""}}
async function openPrefs(){
  const p={...DEF_PREFS(),...JSON.parse(JSON.stringify(prefs||{}))};["kinds","yes","no","eras","cc","prov"].forEach(k=>p[k]=p[k]||[]);const provs=await loadProvs();
  const draw=()=>{const sc=$(".sheet")?.scrollTop||0,gs=g=>p.yes.includes(g)?"yes":p.no.includes(g)?"no":"";
    sheet(`<h2>Что вам нравится?</h2><p class="sub" style="margin:-6px 0 0">Тап по жанру — нравится, ещё тап — не показывать.</p>
      <div class="sect"><span class="label">Что смотрим</span><div class="seg" id="pK">${KINDS.map(x=>`<button data-v="${x.k}" aria-pressed="${p.kinds.includes(x.k)}">${x.t}</button>`).join("")}</div></div>
      <div class="sect"><span class="label">Настроение</span><div class="seg" id="pM">${MOODS.map(x=>`<button data-v="${x.k}" aria-pressed="${p.mood===x.k}">${x.t}</button>`).join("")}</div></div>
      <div class="sect"><span class="label">Сколько времени есть</span><div class="seg" id="pL">${[{k:"",t:"Неважно"},...LENS].map(x=>`<button data-v="${x.k}" aria-pressed="${p.len===x.k}">${x.t}${x.s?` <small style="opacity:.6;font-weight:600">${x.s}</small>`:""}</button>`).join("")}</div></div>
      <div class="sect"><span class="label">Жанры</span><div class="seg" id="pG">${FILTER_GENRES.map(g=>`<button data-v="${g}" class="${gs(g)}">${gs(g)==="no"?"✕ ":gs(g)==="yes"?"♥ ":""}${cap1(g)}</button>`).join("")}</div></div>
      <div class="sect"><span class="label">Годы</span><div class="seg" id="pE">${ERAS.map(x=>`<button data-v="${x.k}" aria-pressed="${p.eras.includes(x.k)}">${x.t}</button>`).join("")}</div></div>
      ${provs.length?`<div class="sect"><span class="label">Только то, что есть на моих сервисах</span><div class="seg" id="pP">${provs.map(x=>`<button data-v="${x.id}" aria-pressed="${p.prov.includes(x.id)}" style="display:inline-flex;align-items:center;gap:6px">${x.l?`<img src="${IMG}w45${x.l}" alt="" width="18" height="18" style="border-radius:5px">`:""}${esc(x.n)}</button>`).join("")}</div></div>`:""}
      <div class="sect"><span class="label">Страна</span><div class="seg" id="pC">${CCS.map(c=>`<button data-v="${c}" aria-pressed="${p.cc.includes(c)}">${esc(country([c]))}</button>`).join("")}</div></div>
      <div class="sect"><span class="label">Рейтинг</span><div class="seg" id="pR">${[0,6,7,8].map(r=>`<button data-v="${r}" aria-pressed="${(p.minR||0)===r}">${r?"от "+r+" ★":"Любой"}</button>`).join("")}</div></div>
      <div class="sticky"><button class="btn red" id="pGo" style="flex:1">Показать</button><button class="btn" id="pRs">Сбросить</button></div>`);
    $(".sheet").scrollTop=sc;const tog=(a,v)=>a.includes(v)?a.filter(x=>x!==v):[...a,v];
    $("#pK").onclick=e=>{const b=e.target.closest("button");if(b){p.kinds=tog(p.kinds,b.dataset.v);draw()}};
    $("#pE").onclick=e=>{const b=e.target.closest("button");if(b){p.eras=tog(p.eras,b.dataset.v);draw()}};
    $("#pM").onclick=e=>{const b=e.target.closest("button");if(b){p.mood=p.mood===b.dataset.v?"":b.dataset.v;draw()}};
    $("#pL").onclick=e=>{const b=e.target.closest("button");if(b){p.len=b.dataset.v;draw()}};
    const pP=$("#pP");if(pP)pP.onclick=e=>{const b=e.target.closest("button");if(b){p.prov=tog(p.prov,+b.dataset.v);draw()}};
    $("#pC").onclick=e=>{const b=e.target.closest("button");if(b){p.cc=tog(p.cc,b.dataset.v);draw()}};
    $("#pR").onclick=e=>{const b=e.target.closest("button");if(b){p.minR=+b.dataset.v;draw()}};
    $("#pG").onclick=e=>{const b=e.target.closest("button");if(!b)return;const g=b.dataset.v;if(p.yes.includes(g)){p.yes=p.yes.filter(x=>x!==g);p.no.push(g)}else if(p.no.includes(g))p.no=p.no.filter(x=>x!==g);else p.yes.push(g);draw()};
    $("#pRs").onclick=()=>{Object.assign(p,DEF_PREFS());draw()};$("#pGo").onclick=()=>{closeSheet();p.person=null;p.fresh=false;savePrefs(p)};
  };draw();
}
/* ---------- lists ---------- */
const PC=ls.get("pc",{});
const thumb=d=>{const p=d?.poster||PC[d?.k];return p?`<img src="${IMG}w185${p}" alt="" loading="lazy">`:`<img alt="">`};
const metaOf=d=>[TYPES[d?.ty]||"",d?.y,d?.r?"★ "+d.r:""].filter(Boolean).join(" · ");
function rowHTML(r,opt){const d=r.data||{},on=mine.shelf.has(r.tmdb),m=partner&&theirs.swipes.get(r.tmdb)?.v==="like";
  return `<div class="lrow" data-k="${esc(r.tmdb)}" ${d.poster?"":`data-fix="${esc(r.tmdb)}"`}>${thumb({...d,k:r.tmdb})}<div class="lt"><b>${esc(d.t||d.title||"Загружаю…")}</b><span>${esc(metaOf(d))}${m&&opt.mark?' · <em>мэтч</em>':""}</span>
    <span class="clamp">${esc((d.g||[]).map(cap1).join(", "))}</span>
    <div class="la">${on?`<span class="onsh">На полке ✓</span>`:`<button class="btn red sm" data-a="add">На полку</button>`}<button class="btn sm" data-a="tr">▶ Трейлер</button>${opt.rm?`<button class="btn ghost sm" data-a="rm">Убрать</button>`:""}</div></div></div>`}
function wireList(lookup){$("#main").onclick=async e=>{if(e.target.closest("#meBtn,#pairBanner"))return;const b=e.target.closest("[data-a]"),row=e.target.closest(".lrow");if(!row)return;const k=row.dataset.k,d=lookup(k)?.data;
  const it=d?.kind?d:(/^(movie|tv)-\d+$/.test(k)?{...(d||{}),k,kind:k.split("-")[0],id:+k.split("-")[1],t:d?.t||d?.title||"",poster:d?.poster||PC[k]}:null);
  if(!b){if(it)openDetail(it);return}e.stopPropagation();
  if(b.dataset.a==="tr"){playTrailer(it,trailerOf(await details(it)));return}b.disabled=true;
  if(b.dataset.a==="add"){await addToShelf(it);b.outerHTML='<span class="onsh">На полке ✓</span>';toast("На полке")}
  else if(b.dataset.a==="rm"){const nr={...mine.swipes.get(k),v:"nope",at:new Date().toISOString()};mine.swipes.set(k,nr);await sb.from("km_swipes").upsert(nr);row.remove();counts()}}}
function renderLikes(){const l=likes(mine);
  $("#main").innerHTML=`<div class="view"><div class="wrap pad">${topBar("Лайки","Всё, что вы свайпнули вправо")}
    ${l.length?`<div class="list">${l.map(r=>rowHTML(r,{rm:true,mark:true})).join("")}</div>`:`<div class="empty"><strong>Пока пусто</strong>Свайпайте вправо — фильмы появятся здесь, и отсюда можно положить их на полку.</div>`}</div></div>`;
  wireList(k=>mine.swipes.get(k));fixRows()}
function renderMatches(){const l=matchesList();
  $("#main").innerHTML=`<div class="view"><div class="wrap pad">${topBar("Мэтчи",partner?`Что понравилось вам с ${esc(ptName())}`:"")}<div id="roomsBox"></div>
    ${!partner?`<div class="empty"><strong>Нужна пара</strong>Мэтчи появятся, когда вы позовёте партнёра.<button class="btn red" id="inv">Позвать пару</button></div>`
      :l.length?`<div class="pgrid">${l.map(r=>{const d=r.data||{},pp=d.poster||PC[r.tmdb];return `<button class="pcard gold lrow" style="display:block;padding:0" data-k="${esc(r.tmdb)}" ${d.poster?"":`data-fix="${esc(r.tmdb)}"`}>${pp?`<img src="${IMG}w342${pp}" alt="" loading="lazy">`:`<img alt="">`}<span class="ps">💞 мэтч</span><span class="pt">${esc(d.t||"")}</span></button>`}).join("")}</div>`:`<div class="empty"><strong>Пока нет мэтчей</strong>Свайпайте оба — когда фильм понравится вам двоим, он появится тут.</div>`}</div></div>`;
  const inv=$("#inv");if(inv)inv.onclick=openProfile;wireList(k=>mine.swipes.get(k));fixRows();if(!me.guest)roomsSection()}
let sh3d=ls.get("sh3d",false);let shelfType="",shelfWho="me",shelfQ="",shelfSort=ls.get("shsort","upd");
const SORTS={upd:["Недавние",(a,b)=>(b.updated_at||"").localeCompare(a.updated_at||"")],my:["Моя оценка",(a,b)=>(b.rating||0)-(a.rating||0)],tmdb:["Рейтинг TMDB",(a,b)=>(b.data?.r||0)-(a.data?.r||0)],
  year:["Год",(a,b)=>String(b.data?.y||"").localeCompare(String(a.data?.y||""))],seen:["Дата просмотра",(a,b)=>String(b.watched_at||"").localeCompare(String(a.watched_at||""))],abc:["Название",(a,b)=>(a.data?.t||"").localeCompare(b.data?.t||"","ru")]};
const pcardHTML=(r,attr)=>{const d=r.data||{},pp=d.poster||PC[r.tmdb],pg=r.progress?.s?`S${r.progress.s} · E${r.progress.e||0}`:"";
  return `<button class="pcard" ${attr} ${d.poster?"":`data-fix="${esc(r.tmdb)}"`}>${pp?`<img src="${IMG}w342${pp}" alt="" loading="lazy">`:`<img alt="">`}
    ${pg?`<span class="pp">${pg}</span>`:""}${r.rating?`<span class="pr">★ ${r.rating}</span>`:""}<span class="pt">${esc(d.t||d.title||"")}</span></button>`};
function renderShelf(){
  const side=shelfWho==="me"?mine:theirs;
  const head=`<div class="view"><div class="wrap pad">${topBar("Полка","")}
    <div class="row"><button class="pill ${shelfWho==="me"?"act":""}" data-w="me">Моя</button>${partner?`<button class="pill ${shelfWho==="pt"?"act":""}" data-w="pt">${esc(ptName())}</button>`:""}<button class="pill ${shelfWho==="lists"?"act":""}" data-w="lists">📁 Мои списки${lists.length?` <b>${lists.length}</b>`:""}</button><button class="pill" id="roul">🎲 Что посмотреть</button><button class="pill ${sh3d?"act":""}" id="d3">🧊 3D</button><button class="pill" id="imp">⬆ Импорт</button><button class="pill" id="exp">⬇ Экспорт</button></div>`;
  if(shelfWho==="lists"){
    $("#main").innerHTML=head+`<div class="shtools"><input type="text" id="nl" maxlength="40" placeholder="Новый список, например «На Новый год»"><button class="btn red" id="nlB">Создать</button></div>
      ${lists.length?lists.map(l=>{const its=[...(listItems.get(l.id)||new Map()).values()];return `<div class="sh"><h2>${esc(l.name)}</h2><span class="sub">${its.length}</span><button class="btn ghost sm" data-dl="${l.id}" style="margin-left:auto">Удалить</button></div>
        ${its.length?`<div class="pgrid">${its.map(r=>pcardHTML({...r,tmdb:r.tmdb},`data-li="${esc(r.tmdb)}" data-l="${l.id}"`)).join("")}</div>`:`<p class="sub">Пусто. Откройте любой фильм → «В список».</p>`}`}).join("")
      :`<div class="empty"><strong>Своих списков пока нет</strong>Создайте, например, «Хоррор-марафон» или «Смотреть с родителями».</div>`}</div></div>`;
  }else{
    const all=[...side.shelf.values()].filter(r=>!shelfType||(r.data?.ty||({film:"film",series:"series",anime:"anime"})[r.data?.type])===shelfType);
    $("#main").innerHTML=head+`<div class="row" id="stt">${[{k:"",t:"Всё"},...KINDS].map(x=>`<button class="pill ${x.k===shelfType?"act":""}" data-k="${x.k}">${x.t}</button>`).join("")}</div>
      ${all.length?`<p class="sub" style="margin:0 0 6px">${all.filter(r=>r.status==="done").length} из ${all.length} посмотрено</p><div class="shtools"><input type="search" id="shq" placeholder="Найти на полке…" value="${esc(shelfQ)}" autocomplete="off"><select id="sso" aria-label="Сортировка">${Object.entries(SORTS).map(([k,v])=>`<option value="${k}" ${k===shelfSort?"selected":""}>${v[0]}</option>`).join("")}</select></div>`:""}
      <div id="shb"></div></div></div>`;
    const body=()=>{const q=shelfQ.toLowerCase(),l0=all.filter(r=>!q||((r.data?.t||r.data?.title||"")+" "+(r.data?.o||"")).toLowerCase().includes(q));
      $("#shb").innerHTML=all.length?(ST.map(s=>{const l=l0.filter(r=>(r.status||"want")===s.k).sort(SORTS[shelfSort][1]);if(!l.length)return"";
        return `<div class="sh"><span class="stdot" style="background:${s.c};box-shadow:0 0 10px ${s.c}"></span><h2>${s.t}</h2><span class="sub">${l.length}</span></div><div class="${sh3d?"rail3d":"pgrid"}">${l.map(r=>pcardHTML(r,`data-open="${esc(r.tmdb)}"`)).join("")}</div>`}).join("")||`<div class="empty">Ничего не нашлось</div>`)
        :`<div class="empty"><strong>${shelfWho==="me"?"Полка пустая":"У партнёра пока пусто"}</strong>${shelfWho==="me"?"Мега-лайк в свайпе или «На полку» в лайках — и фильм окажется тут.":""}</div>`;fixRows();if(sh3d)cover3d()};
    body();const q=$("#shq");if(q)q.oninput=()=>{shelfQ=q.value.trim();body()};const so=$("#sso");if(so)so.onchange=()=>{shelfSort=so.value;ls.set("shsort",shelfSort);body()};
  }
  const nlB=$("#nlB");if(nlB)nlB.onclick=async()=>{const n=$("#nl").value.trim();if(!n)return;const {data,error}=await sb.from("km_lists").insert({user_id:me.user_id,name:n}).select().single();if(error)return toast("Не получилось");lists.push(data);listItems.set(data.id,new Map());renderShelf()};
  $("#main").onclick=async e=>{const w=e.target.closest("[data-w]");if(w){shelfWho=w.dataset.w;return renderShelf()}
    if(e.target.closest("#exp"))return exportShelf();if(e.target.closest("#imp"))return openImport();if(e.target.closest("#roul"))return shelfRoulette();if(e.target.closest("#d3")){sh3d=!sh3d;ls.set("sh3d",sh3d);return renderShelf()}
    const dl=e.target.closest("[data-dl]");if(dl){if(!dl.dataset.c){dl.dataset.c=1;dl.textContent="Точно?";return}await sb.from("km_lists").delete().eq("id",dl.dataset.dl);lists=lists.filter(l=>l.id!==dl.dataset.dl);listItems.delete(dl.dataset.dl);return renderShelf()}
    const t=e.target.closest("#stt [data-k]");if(t){shelfType=t.dataset.k;return renderShelf()}
    const li=e.target.closest("[data-li]");if(li){const d=listItems.get(li.dataset.l)?.get(li.dataset.li)?.data;if(d?.kind)openDetail(d);return}
    const b=e.target.closest("[data-open]");if(b)openShelfItem(b.dataset.open,side)};
}
function cover3d(){document.querySelectorAll(".rail3d").forEach(rail=>{const upd=()=>{const c=rail.scrollLeft+rail.clientWidth/2;
    rail.querySelectorAll(".pcard").forEach(card=>{const d=(card.offsetLeft+card.offsetWidth/2-c)/(rail.clientWidth/2),a=Math.max(-1.4,Math.min(1.4,d));
      card.style.transform=`rotateY(${-a*48}deg) translateZ(${-Math.abs(a)*110}px) scale(${1-Math.min(.22,Math.abs(a)*.18)})`;card.style.zIndex=String(100-Math.round(Math.abs(a)*50));card.style.filter=`brightness(${1-Math.min(.45,Math.abs(a)*.35)})`})};
    rail.addEventListener("scroll",()=>requestAnimationFrame(upd),{passive:true});upd()})}
function parseCSV(t){const rows=[];let row=[],f="",q=false;for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===","||c===";"||c==="\t"){row.push(f);f=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";if(row.some(x=>x.trim()))rows.push(row);row=[]}else f+=c}
  row.push(f);if(row.some(x=>x.trim()))rows.push(row);return rows}
function openImport(){sheet(`<h2>Импорт с других сайтов</h2><p class="sub" style="margin:-6px 0 0">Загрузите файл CSV — фильмы попадут на полку в «Посмотрено» с вашими оценками.</p>
  <div class="sect"><span class="label">Откуда взять файл</span><p class="desc" style="margin:0"><b>IMDb</b>: Your Ratings → ⋯ → Export.<br><b>Letterboxd</b>: Settings → Data → Export your data (файл <i>ratings.csv</i> или <i>watched.csv</i>).<br><b>Кинопоиск</b>: подойдёт любая таблица с колонками «Название» и «Год» (например, из расширения для экспорта оценок).</p></div>
  <label class="btn red big" style="cursor:pointer">Выбрать файл CSV<input type="file" id="impF" accept=".csv,text/csv,.tsv,text/plain" hidden></label><p class="sub" id="impS" style="margin:0"></p>`);
  $("#impF").onchange=e=>runImport(e.target.files[0])}
async function runImport(file){if(!file)return;const st=$("#impS"),rows=parseCSV(await file.text());if(rows.length<2){st.textContent="Не нашёл строк в файле";return}
  const h=rows[0].map(x=>x.trim().toLowerCase().replace(/^\ufeff/,"")),col=(...n)=>h.findIndex(x=>n.some(k=>x===k||x.includes(k)));
  const ci=col("const","imdb id","imdbid"),ct=col("title","name","название","фильм"),cy=col("year","год","release year"),cr=col("your rating","rating","оценка","моя оценка");
  if(ct<0&&ci<0){st.textContent="Нужна колонка Title / Name / Название";return}
  const lb=/letterboxd/i.test(rows[0].join(","))||h.includes("letterboxd uri");const list=rows.slice(1,1001);let done=0,ok=0,miss=[];const out=[];
  st.textContent=`Ищу ${list.length} фильмов…`;
  const one=async r=>{const tt=ci>=0?(r[ci]||"").trim():"",title=ct>=0?(r[ct]||"").trim():"",year=cy>=0?(r[cy]||"").trim().slice(0,4):"";let raw=cr>=0?parseFloat((r[cr]||"").replace(",",".")):0;
    let it=null;try{if(/^tt\d+$/.test(tt)){const f=await tmdb("/find/"+tt,{external_source:"imdb_id"});const m=f.movie_results?.[0],v=f.tv_results?.[0];it=m?itemFrom(m,"movie"):v?itemFrom(v,"tv"):null}
      if(!it&&title){const s=await tmdb("/search/multi",{query:title});const c=(s.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv");
        const best=c.find(x=>year&&(x.release_date||x.first_air_date||"").startsWith(year))||c[0];if(best)it=itemFrom(best)}}catch(e){}
    done++;if(it&&!mine.shelf.has(it.k)){ok++;const rating=raw?Math.max(0,Math.min(10,Math.round(lb||raw<=5&&h.some(x=>x.includes("letterboxd"))?raw*2:raw))):0;
      out.push({user_id:me.user_id,tmdb:it.k,data:slim(it),status:"done",rating,note:"",updated_at:new Date().toISOString()});mine.shelf.set(it.k,{...out[out.length-1],added_at:out[out.length-1].updated_at})}else if(!it)miss.push(title||tt);
    if(done%5===0)st.textContent=`Обработано ${done} из ${list.length} · найдено ${ok}`};
  let i=0;await Promise.all([0,1,2,3].map(async()=>{while(i<list.length)await one(list[i++])}));
  for(let j=0;j<out.length;j+=100){const {error}=await sb.from("km_shelf").upsert(out.slice(j,j+100),{ignoreDuplicates:true});if(error){st.textContent="Сохранено не всё: "+error.message;break}}
  st.innerHTML=`Готово ✅ Добавлено ${ok}${miss.length?`. Не нашёл: ${esc(miss.slice(0,8).join(", "))}${miss.length>8?" и ещё "+(miss.length-8):""}`:""}`;toast(`Импортировано ${ok} фильмов`);if(view==="shelf")renderShelf()}
function exportShelf(){const rows=[["Название","Оригинал","Год","Тип","Статус","Моя оценка","Рейтинг TMDB","Заметка","Ссылка"]];
  const stn=Object.fromEntries(ST.map(s=>[s.k,s.t]));
  [...mine.shelf.values()].forEach(r=>{const d=r.data||{},[kind,id]=r.tmdb.split("-");rows.push([d.t||d.title||"",d.o||"",d.y||"",TYPES[d.ty]||"",stn[r.status]||"",r.rating||"",d.r||"",r.note||"",/^\d+$/.test(id||"")?`https://www.themoviedb.org/${kind}/${id}`:""])});
  const csv="\ufeff"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="kinomatch-polka.csv";document.body.appendChild(a);a.click();a.remove();toast("Файл полки скачан — открывается в Excel и Google Таблицах")}
/* rows saved by older versions have only a TMDB key: fetch poster/title once, show them and store them */
const FIXING=new Set();
async function fixRows(){
  const els=[...document.querySelectorAll("#main [data-fix]")];const keys=[...new Set(els.map(e=>e.dataset.fix))].filter(k=>/^(movie|tv)-\d+$/.test(k)&&!FIXING.has(k));
  let i=0;const work=async()=>{while(i<keys.length){const k=keys[i++];FIXING.add(k);const [kind,id]=k.split("-");
    try{const d=await tmdb(`/${kind}/${id}`);const it=itemFrom(d,kind);PC[k]=it.poster;
      document.querySelectorAll(`#main [data-fix="${k}"]`).forEach(el=>{const im=el.querySelector("img");if(im&&it.poster)im.src=IMG+"w185"+it.poster;
        const b=el.querySelector(".lt b");if(b&&/^(movie|tv)-\d+$|Загружаю/.test(b.textContent))b.textContent=it.t;const pt=el.querySelector(".pt");if(pt&&!pt.textContent.trim())pt.textContent=it.t;
        const sp=el.querySelector(".lt span");if(sp&&!sp.textContent.trim())sp.textContent=metaOf(it);el.removeAttribute("data-fix")});
      const sh=mine.shelf.get(k);if(sh&&!sh.data?.poster){sh.data={...it,...(sh.data||{}),poster:it.poster,kind:it.kind,id:it.id,k,t:sh.data?.title||sh.data?.t||it.t,ty:it.ty,g:it.g,y:it.y,r:it.r,d:sh.data?.description||sh.data?.d||it.d};
        sb.from("km_shelf").update({data:sh.data}).match({user_id:me.user_id,tmdb:k}).then(()=>{})}
      const sw=mine.swipes.get(k);if(sw&&!sw.data?.poster){sw.data=slim(it);sb.from("km_swipes").update({data:sw.data}).match({user_id:me.user_id,tmdb:k}).then(()=>{})}
    }catch(e){}finally{FIXING.delete(k)}}};
  await Promise.all([work(),work(),work(),work(),work()]);ls.set("pc",PC);
}
function openShelfItem(k,side){const r=side.shelf.get(k);if(!r)return;const d=r.data||{};
  const it=d.kind?d:(/^(movie|tv)-\d+$/.test(k)?{...d,k,kind:k.split("-")[0],id:+k.split("-")[1],t:d.title||d.t,y:d.year,d:d.description,poster:PC[k]}:null);
  if(it)openDetail(it)}
/* ---------- detail page ---------- */
async function openDetail(it){
  const L=$("#layer");
  L.innerHTML=`<div class="detail" id="det"><div class="dhero">${(it.backdrop||it.poster)?`<img src="${IMG}w780${it.backdrop||it.poster}" alt="">`:""}<button class="dback" id="dBack">${backSvg} Назад</button></div>
    <div class="dbody pad"><div><div class="sub">${esc(TYPES[it.ty]||"")}${it.y?" · "+esc(it.y):""}${it.g?.length?" · "+esc(it.g.join(", ")):""}</div><h2 class="dtitle">${esc(it.t)}</h2></div>
    <div id="dAct"></div><div id="dSoc"></div><div id="dChat"></div><div class="gal" id="dGal"></div>
    <div class="sect"><span class="label">О чём</span><p class="desc">${esc(it.d||"")}</p></div><div id="dX"><div class="spin"></div></div><div id="dRev"></div></div></div>`;
  renderReviews(it);renderChat(it);
  $("#dBack").onclick=()=>{L.innerHTML="";if(me)go(view);if(/[?&]m=/.test(location.search))history.replaceState(null,"",location.pathname)};
  const act=()=>{const r=me&&mine.shelf.get(it.k);if(!me){$("#dAct").innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn red" id="dTr">▶ Трейлер</button><button class="btn" id="dLog">Войти и сохранить на полку</button></div>`;
      $("#dTr").onclick=async()=>playTrailer(it,trailerOf(await details(it)));$("#dLog").onclick=()=>openLogin("up");return}$("#dAct").innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn red" id="dTr">▶ Трейлер</button>${r?"":`<button class="btn" id="dAdd">На мою полку</button>`}</div>
      ${r?`<div class="sect" style="margin-top:12px"><span class="label">Статус</span><div class="acts">${ST.map(s=>`<button class="act" data-st="${s.k}" style="--c:${s.c}" aria-pressed="${r.status===s.k}">${s.t}</button>`).join("")}</div></div>
      <div class="sect" style="margin-top:12px"><span class="label">Моя оценка</span><div class="stars">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-r="${n}" class="${r.rating>=n?"on":""}" aria-label="${n} из 10">★</button>`).join("")}</div></div>
      ${it.kind==="tv"?`<div class="sect" style="margin-top:12px"><span class="label">Где я остановился</span><div class="prog"><button data-pg="-" aria-label="Минус серия">−</button><b>${r.progress?.s?`${r.progress.s} сезон · ${r.progress.e||0} серия`:"не начат"}</b><button data-pg="+" aria-label="Плюс серия">+</button><button class="btn ghost sm" data-pg="s+" style="width:auto;border-radius:999px">След. сезон</button></div></div>`:""}
      ${r.status==="done"?`<div class="sect" style="margin-top:12px"><span class="label">Когда смотрел</span><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="date" id="dWd" value="${esc(r.watched_at||"")}" max="${new Date().toISOString().slice(0,10)}" style="max-width:180px"><button class="btn sm" id="dRw">🔁 Пересмотрел${r.rewatch?` · ${r.rewatch}`:""}</button></div></div>`:""}
      <button class="btn ghost sm" id="dDel" style="margin-top:8px">Убрать с полки</button>`:""}`;
    const wd=$("#dWd");if(wd)wd.onchange=async()=>{r.watched_at=wd.value||null;await sb.from("km_shelf").update({watched_at:r.watched_at}).match({user_id:me.user_id,tmdb:it.k});toast("Дата сохранена")};
    const rw=$("#dRw");if(rw)rw.onclick=async()=>{r.rewatch=(r.rewatch||0)+1;r.watched_at=new Date().toISOString().slice(0,10);await sb.from("km_shelf").update({rewatch:r.rewatch,watched_at:r.watched_at}).match({user_id:me.user_id,tmdb:it.k});toast("Ещё один просмотр засчитан 🔁");act()};
    const add=$("#dAdd");if(add)add.onclick=async()=>{await addToShelf(it);act()};
    $("#dAct").querySelectorAll("[data-st]").forEach(b=>b.onclick=async()=>{r.status=b.dataset.st;r.updated_at=new Date().toISOString();const patch={status:r.status,updated_at:r.updated_at};if(r.status==="done"&&!r.watched_at){r.watched_at=r.updated_at.slice(0,10);patch.watched_at=r.watched_at}await sb.from("km_shelf").update(patch).match({user_id:me.user_id,tmdb:it.k});act()});
    $("#dAct").querySelectorAll("[data-r]").forEach(b=>b.onclick=async()=>{const n=+b.dataset.r;r.rating=r.rating===n?0:n;await sb.from("km_shelf").update({rating:r.rating}).match({user_id:me.user_id,tmdb:it.k});act()});
    const del=$("#dDel");if(del)del.onclick=async()=>{if(!del.dataset.c){del.dataset.c=1;del.textContent="Точно убрать? Нажмите ещё раз";return}mine.shelf.delete(it.k);await sb.from("km_shelf").delete().match({user_id:me.user_id,tmdb:it.k});act()};
    $("#dTr").onclick=async()=>playTrailer(it,trailerOf(await details(it)));
    const pgb=$("#dAct").querySelector(".prog");if(pgb)pgb.onclick=async e=>{const b=e.target.closest("[data-pg]");if(!b)return;const ss=(DET_SEASONS.get(it.k)||[]);let {s=1,e:ep=0}=r.progress||{};
      if(b.dataset.pg==="+"){const max=(ss.find(x=>x.season_number===s)||{}).episode_count||999;ep++;if(ep>max&&ss.some(x=>x.season_number===s+1)){s++;ep=1}}
      else if(b.dataset.pg==="-"){ep--;if(ep<1&&s>1){s--;ep=(ss.find(x=>x.season_number===s)||{}).episode_count||1}if(ep<0)ep=0}
      else if(b.dataset.pg==="s+"){if(ss.some(x=>x.season_number===s+1)||!ss.length){s++;ep=0}}
      r.progress={s,e:ep};const patch={progress:r.progress,updated_at:new Date().toISOString()};if(r.status==="want"&&ep>0){r.status="watching";patch.status="watching"}
      await sb.from("km_shelf").update(patch).match({user_id:me.user_id,tmdb:it.k});act()};
  };act();
  const soc=()=>{if(!me)return;const my=mine.rx.get(it.k),their=partner&&theirs.rx.get(it.k),rcIn=recsIn.get(it.k),rcOut=recsOut.get(it.k),inL=lists.filter(l=>listItems.get(l.id)?.has(it.k)).map(l=>l.name);
    $("#dSoc").innerHTML=`<div class="sect" style="margin-top:12px">${rcIn?`<span class="recn">💌 <b>${esc(ptName())}</b> советует${rcIn.note?`: «${esc(rcIn.note)}»`:""}</span>`:""}
      <span class="label">Реакция</span><div class="rx">${RX.map(x=>`<button data-rx="${x}" aria-pressed="${my===x}">${x}</button>`).join("")}${their?`<span class="ptx">${esc(ptName())}: ${their}</span>`:""}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${partner?`<button class="btn sm" id="dRec">${rcOut?"💌 Уже посоветовано":"💌 Посоветовать "+esc(ptName())}</button>`:""}<button class="btn sm" id="dList">📁 В список${inL.length?" · "+esc(inL.join(", ")):""}</button><button class="btn sm" id="dShare">🔗 Поделиться</button><button class="btn sm" id="dWatch">${watchSet.has(it.k)?"🔔 Напомню, когда выйдет ✓":"🔔 Сказать, когда выйдет"}</button></div></div>`;
    $("#dWatch").onclick=async()=>{if(watchSet.has(it.k)){watchSet.delete(it.k);await sb.from("km_watch").delete().match({user_id:me.user_id,tmdb:it.k});toast("Напоминание убрано")}
      else{const row={user_id:me.user_id,tmdb:it.k,data:slim(it),notified:false};watchSet.set(it.k,row);const {error}=await sb.from("km_watch").upsert(row);if(error)return toast("Не получилось");
        toast(me.tg_chat_id?"🔔 Напишу в Telegram, когда появится в хорошем качестве или в Украине":"🔔 Скажу на сайте. Подключите Telegram в профиле — напишу и туда")}soc()};
    $("#dSoc").querySelectorAll("[data-rx]").forEach(b=>b.onclick=async()=>{const x=b.dataset.rx;if(mine.rx.get(it.k)===x){mine.rx.delete(it.k);await sb.from("km_reactions").delete().match({user_id:me.user_id,tmdb:it.k})}
      else{mine.rx.set(it.k,x);await sb.from("km_reactions").upsert({user_id:me.user_id,tmdb:it.k,emoji:x,at:new Date().toISOString()})}soc()});
    const rb=$("#dRec");if(rb)rb.onclick=()=>recommend(it,soc);
    $("#dList").onclick=()=>pickLists(it,soc);
    $("#dShare").onclick=async()=>{const url=SITE+"?m="+it.k,text=`Глянь «${it.t}»${it.y?" ("+it.y+")":""} — нашёл в ${BRAND}`;if(navigator.share){try{await navigator.share({title:it.t,text,url})}catch(e){}}else copy(text+" "+url)}};
  soc();
  if(!it.kind){$("#dX").innerHTML="";return}
  const d=await details(it);if(!$("#det"))return;if(d?.seasons)DET_SEASONS.set(it.k,d.seasons.filter(x=>x.season_number>0));
  $("#dGal").innerHTML=framesOf(it,d).slice(1).map(f=>`<img src="${f.u}" alt="" loading="lazy">`).join("");
  $("#dX").innerHTML=detailsHTML(it,d);loadColl($("#dX"));loadImdb($("#dX"));
}
const RX=["🔥","😂","😱","❤️","🤔","👎"],DET_SEASONS=new Map();
function recommend(it,done){if(needAccount("Советовать фильмы паре"))return;sheet(`<h2>Посоветовать ${esc(ptName())}</h2><p class="sub" style="margin:-6px 0 0">«${esc(it.t)}» появится у ${esc(ptName())} первым в свайпе с подписью «💌 ${esc(myName())} советует».</p>
    <textarea id="rcN" maxlength="300" rows="3" placeholder="Пара слов, почему стоит глянуть (необязательно)" style="width:100%;font:500 1rem var(--font);color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px"></textarea>
    <div class="sticky"><button class="btn red" id="rcGo" style="flex:1">Отправить</button></div>`);
  $("#rcGo").onclick=async()=>{const row={from_user:me.user_id,to_user:partner.user_id,tmdb:it.k,data:slim(it),note:$("#rcN").value.trim(),seen:false};
    const {data,error}=await sb.from("km_recs").upsert(row,{onConflict:"from_user,to_user,tmdb"}).select().single();if(error)return toast("Не отправилось: "+error.message);
    recsOut.set(it.k,data);tgCall({action:"notify",kind:"rec",tmdb:it.k});closeSheet();toast("💌 Отправлено "+ptName());done&&done()}}
function pickLists(it,done){const draw=()=>{sheet(`<h2>В список</h2><div class="lists">${lists.map(l=>`<label><input type="checkbox" data-l="${l.id}" ${listItems.get(l.id)?.has(it.k)?"checked":""}>${esc(l.name)}</label>`).join("")||`<p class="sub">Списков пока нет — создайте первый.</p>`}</div>
    <div class="shtools"><input type="text" id="nl2" maxlength="40" placeholder="Новый список"><button class="btn" id="nl2B">Создать</button></div><div class="sticky"><button class="btn red" id="lDone" style="flex:1">Готово</button></div>`);
  $(".lists").onchange=async e=>{const c=e.target.closest("[data-l]");if(!c)return;const m=listItems.get(c.dataset.l);
    if(c.checked){const row={list_id:c.dataset.l,tmdb:it.k,data:slim(it)};m.set(it.k,row);await sb.from("km_list_items").upsert(row)}else{m.delete(it.k);await sb.from("km_list_items").delete().match({list_id:c.dataset.l,tmdb:it.k})}};
  $("#nl2B").onclick=async()=>{const n=$("#nl2").value.trim();if(!n)return;const {data}=await sb.from("km_lists").insert({user_id:me.user_id,name:n}).select().single();if(data){lists.push(data);const row={list_id:data.id,tmdb:it.k,data:slim(it)};listItems.set(data.id,new Map([[it.k,row]]));await sb.from("km_list_items").insert(row)}draw()};
  $("#lDone").onclick=()=>{closeSheet();done&&done()}};draw()}
/* ---------- shared film links (?m=movie-603) and "it's out" news ---------- */
async function openFromLink(){const m=new URLSearchParams(location.search).get("m");if(!m||!/^(movie|tv)-\d+$/.test(m))return;
  try{const [kind,id]=m.split("-");const d=await tmdb(`/${kind}/${id}`);const it=itemFrom(d,kind);document.title=`${it.t}${it.y?" ("+it.y+")":""} — Kinomatch`;openDetail(it)}catch(e){}}
async function showWatchNews(){const seen=new Set(ls.get("watchSeen",[]));const fresh=[...watchSet.values()].filter(r=>r.notified&&!seen.has(r.tmdb));
  if(!fresh.length)return;fresh.forEach(r=>seen.add(r.tmdb));ls.set("watchSeen",[...seen]);setTimeout(()=>toast(`🔔 Уже можно смотреть: ${fresh.slice(0,3).map(r=>"«"+(r.data?.t||"")+"»").join(", ")}`),1600)}

/* ---------- search & collections ---------- */
const COLLS=[{t:"🔥 Тренды недели",p:"/trending/all/week"},{t:"🏆 Лучшие фильмы всех времён",p:"/movie/top_rated"},{t:"📺 Лучшие сериалы",p:"/tv/top_rated"},
  {t:"💘 Для свидания",p:"/discover/movie",q:{with_genres:"10749","vote_count.gte":"1500",sort_by:"vote_average.desc"}},{t:"😱 Хоррор-вечер",p:"/discover/movie",q:{with_genres:"27","vote_count.gte":"1500",sort_by:"vote_average.desc"}},
  {t:"🍣 Аниме для новичков",p:"/discover/tv",q:{with_genres:"16",with_original_language:"ja","vote_count.gte":"500",sort_by:"vote_average.desc"}},{t:"🇰🇷 Топ дорам",p:"/discover/tv",q:{with_original_language:"ko","vote_count.gte":"200",sort_by:"vote_average.desc",without_genres:"16,10764,10767"}},
  {t:"🧠 Взорвёт мозг",p:"/discover/movie",q:{with_genres:"878|9648","vote_count.gte":"3000",sort_by:"vote_average.desc"}},{t:"😂 Лёгкие комедии",p:"/discover/movie",q:{with_genres:"35",without_genres:"18,27,53","vote_count.gte":"1500",sort_by:"popularity.desc"}},
  {t:"👨‍👩‍👧 С семьёй",p:"/discover/movie",q:{with_genres:"10751","vote_count.gte":"1000",sort_by:"vote_average.desc"}},{t:"🇺🇦 Украинское кино",p:"/discover/movie",q:{with_origin_country:"UA","vote_count.gte":"10",sort_by:"popularity.desc"}},
  {t:"⏱ До полутора часов",p:"/discover/movie",q:{"with_runtime.lte":"95","vote_count.gte":"2000",sort_by:"vote_average.desc"}},{t:"🕵️ Детективы",p:"/discover/tv",q:{with_genres:"9648|80","vote_count.gte":"500",sort_by:"vote_average.desc",without_genres:"16"}},
  {t:"🎄 Уютное на вечер",p:"/discover/movie",q:{with_genres:"10751|35|10749",without_genres:"27,53,80","vote_count.gte":"800",sort_by:"popularity.desc"}}];
let collOpen=null;
async function openColl(i){const c=COLLS[i];collOpen=i;sq="";
  $("#sr").innerHTML=`<div class="swempty"><div class="spin"></div></div>`;const kind=c.p.includes("/tv")?"tv":c.p.includes("/movie")?"movie":null;
  try{const pages=await Promise.all([1,2].map(pg=>tmdb(c.p,{...(c.q||{}),page:String(pg)})));
    sres=pages.flatMap(r=>r.results||[]).filter(x=>x.poster_path&&(kind||x.media_type==="movie"||x.media_type==="tv")).map(x=>itemFrom(x,kind||x.media_type)).filter((x,j,a)=>a.findIndex(y=>y.k===x.k)===j)}catch(e){sres=[]}
  renderSearch()}
let sq="",sres=[],speople=[];
function renderSearch(){
  const c=collOpen!=null?COLLS[collOpen]:null;
  $("#main").innerHTML=`<div class="view"><div class="wrap pad">${topBar("Поиск","Любой фильм, сериал или аниме — или готовые подборки")}
    <input type="search" id="sq" placeholder="Название…" value="${esc(sq)}" autocomplete="off">
    ${c?`<div class="row" style="margin-top:12px"><button class="pill" id="cBack">← Подборки</button><button class="pill act" id="cSwipe">🃏 Свайпать эту подборку</button></div><h2 style="margin:6px 0 0;font:800 1.1rem var(--font)">${esc(c.t)}</h2>`:""}
    <div class="list" id="sr" style="margin-top:12px"></div></div></div>`;
  const draw=()=>{$("#sr").innerHTML=(speople.length&&sq?`<span class="label">Люди</span><div class="cast" style="margin-bottom:10px">${speople.map(c=>`<button type="button" data-person="${c.id}" data-pname="${esc(c.name)}"><img src="${IMG}w185${c.profile_path}" alt="" loading="lazy">${esc(c.name)}<small>${esc((c.known_for||[]).map(k=>k.title||k.name).slice(0,2).join(", "))}</small></button>`).join("")}</div>`:"")+(sres.length?sres.map(it=>`<div class="lrow" data-s="${esc(it.k)}">${thumb(it)}<div class="lt"><b>${esc(it.t)}</b><span>${esc(metaOf(it))}</span><span class="clamp">${esc(it.d)}</span>
      <div class="la">${mine.shelf.has(it.k)?`<span class="onsh">На полке ✓</span>`:`<button class="btn red sm" data-add="${esc(it.k)}">На полку</button>`}</div></div></div>`).join(""):sq?`<div class="empty">Ничего не нашлось</div>`
      :`<span class="label">Подборки</span><div class="colls">${COLLS.map((x,i)=>`<button data-coll-i="${i}">${esc(x.t)}</button>`).join("")}</div>`)};
  draw();let t;$("#sq").oninput=e=>{clearTimeout(t);t=setTimeout(async()=>{sq=e.target.value.trim();if(collOpen!=null&&sq){collOpen=null;$("#cBack")?.parentElement.nextElementSibling?.remove();$("#cBack")?.parentElement.remove()}if(!sq){sres=[];return draw()}
    try{const r=await tmdb("/search/multi",{query:sq,include_adult:"false"});speople=(r.results||[]).filter(x=>x.media_type==="person"&&x.profile_path).slice(0,8);
      sres=(r.results||[]).filter(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path).map(x=>itemFrom(x)).slice(0,20)}catch(err){sres=[];speople=[]}draw()},300)};
  const cb=$("#cBack");if(cb)cb.onclick=()=>{collOpen=null;sres=[];renderSearch()};
  const cs=$("#cSwipe");if(cs)cs.onclick=()=>{const l=sres.filter(x=>!mine.swipes.has(x.k)&&!mine.shelf.has(x.k));if(!l.length)return toast("Всё из подборки вы уже видели");deck=l;hist=[];go("swipe");toast("Свайпаете подборку «"+c.t.replace(/^\S+\s/,"")+"»")};
  $("#main").onclick=async e=>{const ci=e.target.closest("[data-coll-i]");if(ci)return openColl(+ci.dataset.collI);const a=e.target.closest("[data-add]");if(a){await addToShelf(sres.find(x=>x.k===a.dataset.add));a.outerHTML='<span class="onsh">На полке ✓</span>';toast("На полке");return}
    const row=e.target.closest("[data-s]");if(row)openDetail(sres.find(x=>x.k===row.dataset.s))};
}
/* ---------- reviews by our users ---------- */
async function renderReviews(it){const box=$("#dRev");if(!box)return;let j=null;try{const r=await REAL_SB.rpc("km_reviews_for",{t:it.k});j=r.data}catch(e){}if(!$("#dRev"))return;j=j||{avg:null,count:0,items:[]};
  const mineR=me&&!me.guest?(j.items||[]).find(x=>x.user_id===me.user_id):null;let rate=mineR?.rating||0;
  const draw=()=>{box.innerHTML=`<div class="sect"><span class="label">Отзывы Kinomatch</span>
    <div class="revhead"><b class="big">${j.avg?`★ ${j.avg}`:"—"}</b><span>${j.count?`оценка наших пользователей · ${RN(j.count,"отзыв","отзыва","отзывов")}`:"Пока нет отзывов — будьте первым"}</span></div>
    ${me&&!me.guest?`<div class="revform"><div class="stars" id="rvS">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-rv="${n}" class="${rate>=n?"on":""}" aria-label="${n} из 10">★</button>`).join("")}</div>
      <textarea id="rvT" maxlength="1000" rows="3" placeholder="Что думаете? Без спойлеров 🙂">${esc(mineR?.text||"")}</textarea><div style="display:flex;gap:8px"><button class="btn red sm" id="rvGo">${mineR?"Обновить отзыв":"Оставить отзыв"}</button>${mineR?`<button class="btn ghost sm" id="rvDel">Удалить</button>`:""}</div></div>`
      :`<button class="btn sm" id="rvLog">Войдите, чтобы оставить отзыв</button>`}
    <div class="revs">${(j.items||[]).map(x=>`<div class="rev"><span class="av">${x.avatar_url?`<img src="${esc(x.avatar_url)}" alt="">`:esc((x.name||"?")[0].toUpperCase())}</span><div><b>${esc(x.name||"Зритель")}</b> <span class="rt">★ ${x.rating}</span><span class="dt">${fdate(x.updated_at)}</span>${x.text?`<p>${esc(x.text)}</p>`:""}</div></div>`).join("")}</div></div>`;
    const S=$("#rvS");if(S)S.onclick=e=>{const b=e.target.closest("[data-rv]");if(!b)return;rate=+b.dataset.rv;S.querySelectorAll("[data-rv]").forEach(x=>x.classList.toggle("on",+x.dataset.rv<=rate))};
    const go=$("#rvGo");if(go)go.onclick=async()=>{if(!rate)return toast("Поставьте оценку звёздами");const row={user_id:me.user_id,tmdb:it.k,rating:rate,text:$("#rvT").value.trim(),updated_at:new Date().toISOString()};
      const {error}=await REAL_SB.from("km_reviews").upsert(row);if(error)return toast(/rate_limit/.test(error.message)?"Слишком много отзывов за час":"Не сохранилось");toast("Спасибо за отзыв!");renderReviews(it)};
    const del=$("#rvDel");if(del)del.onclick=async()=>{await REAL_SB.from("km_reviews").delete().match({user_id:me.user_id,tmdb:it.k});renderReviews(it)};
    const lg=$("#rvLog");if(lg)lg.onclick=()=>openLogin("up")};draw()}

/* ---------- chat under a match ---------- */
let chatFor=null;
async function renderChat(it){const box=$("#dChat");if(!box||!me||me.guest||!partner)return;const isM=mine.swipes.get(it.k)?.v==="like"&&theirs.swipes.get(it.k)?.v==="like";if(!isM){box.innerHTML="";return}
  chatFor=it.k;const {data}=await sb.from("km_msgs").select("*").eq("tmdb",it.k).order("at");if(!$("#dChat"))return;
  box.innerHTML=`<div class="sect chat"><span class="label">💬 Обсудить с ${esc(ptName())}</span><div class="msgs" id="msgs">${(data||[]).map(msgHTML).join("")||`<p class="sub" style="margin:0">Это мэтч! Договоритесь, когда смотрите 🍿</p>`}</div>
    <div class="quick">${["Го сегодня? 🍿","В выходные?","После 21:00","Уже скачал(а) 😎"].map(q=>`<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    <form id="msgF" class="msgf"><input id="msgI" maxlength="500" placeholder="Сообщение…" autocomplete="off"><button class="btn red sm">Отправить</button></form></div>`;
  const m=$("#msgs");m.scrollTop=m.scrollHeight;
  const send=async t=>{t=t.trim();if(!t)return;const {data:row,error}=await sb.from("km_msgs").insert({from_user:me.user_id,to_user:partner.user_id,tmdb:it.k,text:t}).select().single();if(error)return toast("Не отправилось");addMsg(row);tgCall({action:"notify",kind:"msg",tmdb:it.k})};
  $("#msgF").onsubmit=e=>{e.preventDefault();const i=$("#msgI");send(i.value);i.value=""};box.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>send(b.dataset.q))}
const msgHTML=x=>`<div class="msg ${x.from_user===me?.user_id?"me":""}" data-id="${x.id}">${esc(x.text)}<small>${new Date(x.at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</small></div>`;
function addMsg(x){const m=$("#msgs");if(!m||chatFor!==x.tmdb||m.querySelector(`[data-id="${x.id}"]`))return;const p=m.querySelector("p.sub");if(p)p.remove();m.insertAdjacentHTML("beforeend",msgHTML(x));m.scrollTop=m.scrollHeight}

/* ---------- rooms for 2–8 friends ---------- */
let roomCh=null;
async function loadRooms(){if(!me||me.guest)return[];const {data}=await sb.from("km_rooms").select("*").order("created_at",{ascending:false});myRooms=data||[];return myRooms}
async function createRoom(){if(needAccount("Комнаты с друзьями"))return;sheet(`<h2>👥 Новая комната</h2><p class="sub" style="margin:-6px 0 0">Все свайпают одну колоду из 36 фильмов по вашим фильтрам. В итогах — что понравилось всем или большинству.</p>
    <input id="rmN" maxlength="40" placeholder="Название, например «Пятница у Димы»"><div class="sticky"><button class="btn red" id="rmGo" style="flex:1">Создать и позвать друзей</button></div>`);
  $("#rmGo").onclick=async()=>{const b=$("#rmGo");b.disabled=true;toast("Собираю колоду…");const keep=night;night=null;await fill(36);night=keep;
    const d=deck.filter(x=>!mine.swipes.has(x.k)).slice(0,36).map(slim);const {data,error}=await sb.rpc("km_room_create",{n:$("#rmN").value,d});
    if(error||!data){b.disabled=false;return toast("Не получилось создать")}closeSheet();await enterRoom(data);shareRoom(data)}}
function roomLink(r){return SITE+"?room="+r.code}
async function shareRoom(r){const url=roomLink(r),text=`Залетай в комнату «${r.name}» в Kinomatch — выберем фильм вместе 🍿`;if(navigator.share){try{await navigator.share({title:"Kinomatch",text,url});return}catch(e){}}copy(text+" "+url)}
async function joinRoom(code){if(needAccount("Комнаты с друзьями"))return;const {data,error}=await sb.rpc("km_room_join",{c:code});if(error||!data||data.error)return toast(data?.error==="full"?"Комната заполнена (макс. 8)":data?.error==="not_found"?"Комната не найдена":"Не получилось войти");await enterRoom(data);toast("Вы в комнате «"+data.name+"»")}
async function enterRoom(r){room={...r,people:[],votes:new Map()};const [pp,vs]=await Promise.all([sb.rpc("km_room_people",{r:r.id}),sb.from("km_room_swipes").select("*").eq("room_id",r.id)]);
  room.people=pp.data||[];(vs.data||[]).forEach(v=>{if(!room.votes.has(v.tmdb))room.votes.set(v.tmdb,new Map());room.votes.get(v.tmdb).set(v.user_id,v.v)});
  const done=new Set([...room.votes.entries()].filter(([,m])=>m.has(me.user_id)).map(([k])=>k));deck=(r.deck||[]).filter(x=>!done.has(x.k));hist=[];
  try{roomCh&&REAL_SB.removeChannel(roomCh)}catch(e){}
  roomCh=REAL_SB.channel("room:"+r.id).on("postgres_changes",{event:"*",schema:"public",table:"km_room_swipes",filter:"room_id=eq."+r.id},pl=>{const v=pl.new;if(!v?.tmdb)return;if(!room.votes.has(v.tmdb))room.votes.set(v.tmdb,new Map());room.votes.get(v.tmdb).set(v.user_id,v.v);roomUpd()})
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"km_room_members",filter:"room_id=eq."+r.id},async()=>{const {data}=await sb.rpc("km_room_people",{r:r.id});room.people=data||room.people;roomUpd();toast("👋 В комнату зашёл новый человек")}).subscribe();
  go("swipe")}
function roomInfo(){if(!room)return"";const n=room.people.length,t=(room.deck||[]).length,mineN=[...room.votes.values()].filter(m=>m.has(me.user_id)).length;
  const all=[...room.votes.values()].filter(m=>[...m.values()].filter(v=>v==="like").length>=Math.max(2,Math.ceil(n*.6))).length;return `${RN(n,"человек","человека","человек")} · вы: ${mineN}/${t} · совпадений: ${all}`}
function roomUpd(){const el=$("#roomInfo");if(el)el.textContent=roomInfo()}
async function roomVote(it,v){if(!room)return;if(!room.votes.has(it.k))room.votes.set(it.k,new Map());room.votes.get(it.k).set(me.user_id,v);roomUpd();
  await sb.from("km_room_swipes").upsert({room_id:room.id,user_id:me.user_id,tmdb:it.k,v,at:new Date().toISOString()})}
function roomSummary(){if(!room)return;const n=room.people.length,list=(room.deck||[]).map(x=>{const m=room.votes.get(x.k)||new Map();const yes=[...m.entries()].filter(([,v])=>v==="like").map(([u])=>u);return{x,yes,seen:m.size}}).filter(o=>o.yes.length).sort((a,b)=>b.yes.length-a.yes.length);
  const nm=u=>room.people.find(p=>p.user_id===u)?.name||"?";
  sheet(`<h2>👥 «${esc(room.name)}» — итоги</h2><p class="sub" style="margin:-6px 0 0">${RN(n,"участник","участника","участников")} · код комнаты <b>${esc(room.code)}</b></p>
    <div class="list">${list.slice(0,20).map(o=>`<div class="lrow" data-rk="${esc(o.x.k)}">${thumb(o.x)}<div class="lt"><b>${esc(o.x.t)}</b><span>${o.yes.length===n?"🔥 Хотят все":`👍 ${o.yes.length} из ${n}`}</span><span class="clamp">${esc(o.yes.map(nm).join(", "))}</span></div></div>`).join("")||`<p class="sub">Пока никто ничего не лайкнул.</p>`}</div>
    <div class="sticky">${list.length?`<button class="btn red" id="rmRoll" style="flex:1">🎲 Выбрать за нас</button>`:""}<button class="btn" id="rmInv">Позвать ещё</button><button class="btn ghost" id="rmOut">Выйти</button></div>`);
  document.querySelectorAll("[data-rk]").forEach(b=>b.onclick=()=>{closeSheet();openDetail(list.find(o=>o.x.k===b.dataset.rk).x)});
  const rl=$("#rmRoll");if(rl)rl.onclick=()=>{const top=list.filter(o=>o.yes.length===list[0].yes.length),w=top[Math.floor(Math.random()*top.length)].x;closeSheet();confetti();snd("match");toast("🎲 Смотрим: «"+w.t+"»");openDetail(w)};
  $("#rmInv").onclick=()=>shareRoom(room);$("#rmOut").onclick=()=>{try{REAL_SB.removeChannel(roomCh)}catch(e){}room=null;closeSheet();resetDeck();go("swipe")}}
async function roomsSection(){const el=$("#roomsBox");if(!el)return;const rs=await loadRooms();if(!$("#roomsBox"))return;
  el.innerHTML=`<div class="sh"><h2>👥 Комнаты с друзьями</h2><span class="sub">2–8 человек</span></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button class="btn red sm" id="rmNew">Создать комнату</button><button class="btn sm" id="rmCode">Войти по коду</button></div>
    ${rs.map(r=>`<button class="lrow" style="width:100%;text-align:left" data-room="${r.id}"><div class="lt"><b>${esc(r.name)}</b><span>код ${esc(r.code)} · ${fdate(r.created_at)}</span></div></button>`).join("")}`;
  $("#rmNew").onclick=createRoom;$("#rmCode").onclick=()=>{sheet(`<h2>Войти в комнату</h2><input id="rmC" maxlength="6" placeholder="Код из 6 символов" style="text-transform:uppercase"><div class="sticky"><button class="btn red" id="rmJ" style="flex:1">Войти</button></div>`);$("#rmJ").onclick=()=>{const c=$("#rmC").value.trim();if(c){closeSheet();joinRoom(c)}}};
  el.querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>enterRoom(rs.find(r=>r.id===b.dataset.room)))}

/* ---------- public profile ---------- */
async function openPublic(u){let j=null;try{j=(await REAL_SB.rpc("km_public",{u})).data}catch(e){}const L=$("#layer");
  if(!j){L.innerHTML=`<div class="detail" id="det"><div class="dbody pad"><button class="dback" id="dBack" style="position:static">${backSvg} Назад</button><div class="empty"><strong>Профиль скрыт или не найден</strong></div></div></div>`;$("#dBack").onclick=()=>{L.innerHTML="";history.replaceState(null,"",location.pathname);if(me)go(view)};return}
  const sh=j.shelf||[],done=sh.filter(r=>r.status==="done"),g={};done.forEach(r=>(r.data?.g||[]).forEach(x=>g[x]=(g[x]||0)+1));const topG=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  document.title=`${j.name} — полка в Kinomatch`;
  L.innerHTML=`<div class="detail" id="det"><div class="dbody pad" style="padding-top:20px"><button class="dback" id="dBack" style="position:static;margin-bottom:12px">${backSvg} Назад</button>
    <div style="display:flex;gap:14px;align-items:center"><span class="av" style="width:64px;height:64px;font-size:1.6rem">${j.avatar_url?`<img src="${esc(j.avatar_url)}" alt="">`:esc((j.name||"?")[0])}</span><div><h2 class="dtitle" style="margin:0">${esc(j.name)}</h2><span class="sub">${RN(done.length,"фильм","фильма","фильмов")} посмотрено${topG.length?" · любит "+esc(topG.join(", ")):""}</span></div></div>
    ${!me?`<button class="btn red" style="margin-top:14px" data-guest2>Свайпать свои фильмы в Kinomatch</button>`:""}
    ${["watching","done"].map(st=>{const l=sh.filter(r=>r.status===st);return l.length?`<div class="sh"><h2>${st==="done"?"Посмотрено":"Смотрит сейчас"}</h2><span class="sub">${l.length}</span></div><div class="pgrid">${l.map(r=>pcardHTML(r,`data-pub="${esc(r.tmdb)}"`)).join("")}</div>`:""}).join("")}</div></div>`;
  $("#dBack").onclick=()=>{L.innerHTML="";history.replaceState(null,"",location.pathname);if(me)go(view)};const g2=L.querySelector("[data-guest2]");if(g2)g2.onclick=()=>{L.innerHTML="";startGuest()};
  L.querySelectorAll("[data-pub]").forEach(b=>b.onclick=()=>{const d=sh.find(r=>r.tmdb===b.dataset.pub)?.data;if(d?.kind)openDetail(d)})}

/* ---------- my movie year ---------- */
async function openYear(){const y=new Date().getFullYear(),done=[...mine.shelf.values()].filter(r=>r.status==="done"&&String(r.watched_at||r.updated_at||"").startsWith(String(y)));
  sheet(`<h2>🎬 Мой кино-${y}</h2><div class="swempty"><div class="spin"></div></div>`);let mins=0;
  await Promise.all(done.slice(0,80).map(async r=>{if(!r.data?.kind)return;try{const d=await details(r.data);const rt=r.data.kind==="tv"?((d.episode_run_time||[])[0]||40)*(d.number_of_episodes||8):d.runtime||110;mins+=rt*(1+(r.rewatch||0))}catch(e){}}));
  const g={};done.forEach(r=>(r.data?.g||[]).forEach(x=>g[x]=(g[x]||0)+1));const topG=Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const best=done.filter(r=>r.rating).sort((a,b)=>b.rating-a.rating)[0],hours=Math.round(mins/60),sw=[...mine.swipes.values()].filter(r=>String(r.at||"").startsWith(String(y))).length,mt=matchesList().length;
  const Y={y,n:done.length,hours,sw,mt,topG:topG.map(x=>x[0]),best:best?.data?.t,bestP:best?.data?.poster};
  const s=$(".sheet");if(!s)return;s.innerHTML=`<h2>🎬 Мой кино-${y}</h2><div class="year">
    <div><b>${done.length}</b>${RN(done.length,"фильм и сериал","фильма и сериала","фильмов и сериалов").replace(/^\d+ /,"")}</div><div><b>${hours}</b>${RN(hours,"час","часа","часов").replace(/^\d+ /,"")} перед экраном</div>
    <div><b>${sw}</b>свайпов</div><div><b>${mt}</b>мэтчей с парой</div></div>
    ${topG.length?`<p class="sub" style="margin:4px 0">Любимые жанры: <b style="color:var(--ink)">${esc(topG.map(x=>x[0]).join(", "))}</b></p>`:""}${best?`<p class="sub" style="margin:0">Лучший фильм года: <b style="color:var(--ink)">${esc(best.data?.t||"")}</b> — ★ ${best.rating}</p>`:""}
    ${done.length?"":`<p class="sub">Отмечайте просмотренное на полке — и тут появится ваша статистика.</p>`}
    <div class="sticky"><button class="btn red" id="yrImg" style="flex:1">📸 Картинка для сторис</button></div>`;
  $("#yrImg").onclick=()=>yearImage(Y)}
async function yearImage(Y){const c=document.createElement("canvas");c.width=1080;c.height=1920;const g=c.getContext("2d");
  const bg=g.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,"#1a0508");bg.addColorStop(.5,"#0b0b0d");bg.addColorStop(1,"#22060c");g.fillStyle=bg;g.fillRect(0,0,1080,1920);
  const load=src=>new Promise(ok=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src});
  if(Y.bestP){const im=await load(IMG+"w500"+Y.bestP);if(im){g.save();g.globalAlpha=.9;const w=520,h=780,x=(1080-w)/2,yy=980;g.beginPath();g.roundRect(x,yy,w,h,36);g.clip();g.drawImage(im,x,yy,w,h);g.restore()}}
  g.fillStyle="#ff2d3f";g.font="800 44px Unbounded, Manrope, sans-serif";g.fillText("KINOMATCH",80,140);g.fillStyle="#fff";g.font="900 120px Unbounded, Manrope, sans-serif";g.fillText("Мой кино-",80,330);g.fillText(String(Y.y),80,470);
  const st=[[Y.n,"просмотрено"],[Y.hours,"часов кино"],[Y.sw,"свайпов"],[Y.mt,"мэтчей"]];st.forEach(([v,l],i)=>{const x=80+(i%2)*480,y=620+Math.floor(i/2)*170;g.fillStyle="#ffc93c";g.font="900 96px Unbounded, Manrope, sans-serif";g.fillText(String(v),x,y);g.fillStyle="#c9c7cf";g.font="700 38px Manrope, sans-serif";g.fillText(l,x,y+52)});
  if(Y.topG.length){g.fillStyle="#fff";g.font="800 40px Manrope, sans-serif";g.fillText("Любимое: "+Y.topG.join(", "),80,930)}
  if(Y.best){g.fillStyle="#fff";g.font="800 42px Manrope, sans-serif";g.fillText("Фильм года: "+Y.best,80,1840)}
  c.toBlob(async b=>{const f=new File([b],`kinomatch-${Y.y}.png`,{type:"image/png"});if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:"Мой кино-год"});return}catch(e){}}
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();toast("Картинка сохранена")},"image/png")}

/* ---------- "you wanted to watch this" ---------- */
function remindWant(){if(!me||ls.get("remindAt",0)>Date.now()-6*864e5)return;const old=[...mine.shelf.values()].filter(r=>r.status==="want"&&r.data?.kind&&Date.now()-Date.parse(r.added_at||r.updated_at||0)>21*864e5);if(!old.length)return;
  ls.set("remindAt",Date.now());const pick=()=>old[Math.floor(Math.random()*old.length)];let r=pick();
  const show=()=>{const days=Math.round((Date.now()-Date.parse(r.added_at||r.updated_at))/864e5);sheet(`<h2>🍿 Может, сегодня?</h2><div class="lrow">${thumb(r.data)}<div class="lt"><b>${esc(r.data.t)}</b><span>Вы хотели посмотреть это ${RN(days,"день","дня","дней")} назад</span></div></div>
    <div class="sticky"><button class="btn red" id="rmY" style="flex:1">Смотрим сегодня</button>${old.length>1?`<button class="btn" id="rmR">🎲 Другой</button>`:""}<button class="btn ghost" id="rmL">Позже</button></div>`);
    $("#rmY").onclick=async()=>{r.status="watching";await sb.from("km_shelf").update({status:"watching",updated_at:new Date().toISOString()}).match({user_id:me.user_id,tmdb:r.tmdb});closeSheet();openDetail(r.data)};
    const rr=$("#rmR");if(rr)rr.onclick=()=>{r=pick();show()};$("#rmL").onclick=closeSheet};setTimeout(show,2500)}
function shelfRoulette(){const l=[...mine.shelf.values()].filter(r=>r.status==="want"&&r.data?.kind);if(!l.length)return toast("В «Хочу» пока пусто");const r=l[Math.floor(Math.random()*l.length)];confetti();toast("🎲 С полки: «"+r.data.t+"»");openDetail(r.data)}

/* ---------- wow onboarding: pick genres by picture ---------- */
const ONB=[["боевик","💥"],["комедия","😂"],["ужасы","😱"],["мелодрама","💘"],["фантастика","🚀"],["триллер","🔪"],["драма","🎭"],["детектив","🕵️"],["мультфильм","🧸"],["приключения","🗺️"],["фэнтези","🐉"],["криминал","🚔"]];
async function openOnboarding(force){if(!force&&(ls.get("onbDone",false)||mine.swipes.size>4))return false;const L=$("#sheetRoot")||$("#layer");
  L.innerHTML=`<div class="onb" id="onb"><div class="onbin"><h2>Что вы любите смотреть?</h2><p>Выберите хотя бы 3 жанра — первая колода сразу будет под вас</p><div class="onbg" id="onbg">${ONB.map(([g,e],i)=>`<button class="ot" data-g="${g}" style="animation-delay:${i*45}ms"><i></i><span>${e}</span><b>${cap1(g)}</b></button>`).join("")}</div>
    <div class="onbbar"><span id="onbN">Выбрано 0</span><button class="btn ghost" id="onbSkip">Пропустить</button><button class="btn red big" id="onbGo" disabled>Поехали!</button></div></div></div>`;
  const sel=new Set();
  ONB.forEach(async([g])=>{try{const ids=genreIds(g,"movie");if(!ids.length)return;const r=await tmdb("/discover/movie",{with_genres:String(ids[0]),sort_by:"popularity.desc","vote_count.gte":"3000"});const x=(r.results||[]).find(z=>z.backdrop_path)||{};
    const t=L.querySelector(`[data-g="${g}"] i`);if(t&&x.backdrop_path){t.style.backgroundImage=`url(${IMG}w500${x.backdrop_path})`;t.classList.add("on")}}catch(e){}});
  const upd=()=>{$("#onbN").textContent=`Выбрано ${sel.size}`;$("#onbGo").disabled=sel.size<3;$("#onbGo").textContent=sel.size<3?`Ещё ${3-sel.size}`:"Поехали!"};upd();
  $("#onbg").onclick=e=>{const b=e.target.closest("[data-g]");if(!b)return;const g=b.dataset.g;sel.has(g)?sel.delete(g):sel.add(g);b.classList.toggle("sel",sel.has(g));snd("tap");try{navigator.vibrate&&navigator.vibrate(6)}catch(_){}upd()};
  return new Promise(done=>{const fin=async ok=>{ls.set("onbDone",true);if(ok){const p={...DEF_PREFS(),...(prefs||{}),yes:[...sel],person:null,fresh:false};confetti();await savePrefs(p)}L.innerHTML="";done(true)};
    $("#onbGo").onclick=()=>fin(true);$("#onbSkip").onclick=()=>fin(false)})}

/* ---------- guest mode ---------- */
const GKEY={km_swipes:r=>r.tmdb,km_shelf:r=>r.tmdb,km_prefs:()=>"p",km_reactions:r=>r.tmdb,km_lists:r=>r.id,km_list_items:r=>r.list_id+"|"+r.tmdb,km_watch:r=>r.tmdb};
function gdb(){try{return JSON.parse(localStorage.getItem("km_guest")||"{}")}catch(e){return{}}}
function gsave(d){try{localStorage.setItem("km_guest",JSON.stringify(d))}catch(e){}}
function guestClient(real){
  const from=table=>{const st={op:"select",f:[],data:null,single:false};
    const run=async()=>{const d=gdb();const t=d[table]||{};const match=r=>st.f.every(([k,v])=>String(r[k])===String(v));
      if(table==="km_profiles")return{data:st.single?me:[me],error:null};
      if(!GKEY[table])return{data:st.single?null:[],error:null};
      if(st.op==="select"){const rows=Object.values(t).filter(match);return{data:st.single?rows[0]||null:rows,error:null}}
      if(st.op==="upsert"||st.op==="insert"){const rows=(Array.isArray(st.data)?st.data:[st.data]).map(r=>({...r,id:r.id||(table==="km_lists"?crypto.randomUUID():undefined),created_at:r.created_at||new Date().toISOString()}));
        if(table==="km_swipes"&&Object.keys(t).length>=400)return{data:null,error:{message:"guest_limit"}};
        rows.forEach(r=>t[GKEY[table](r)]=r);d[table]=t;gsave(d);return{data:st.single?rows[0]:rows,error:null}}
      if(st.op==="update"){Object.values(t).filter(match).forEach(r=>Object.assign(r,st.data));d[table]=t;gsave(d);return{data:null,error:null}}
      if(st.op==="delete"){for(const [k,r] of Object.entries(t))if(match(r))delete t[k];d[table]=t;gsave(d);return{data:null,error:null}}
      return{data:null,error:null}};
    const b={select(){return b},order(){return b},in(){return b},like(){return b},not(){return b},limit(){return b},
      eq(k,v){st.f.push([k,v]);return b},match(o){Object.entries(o).forEach(e=>st.f.push(e));return b},
      maybeSingle(){st.single=true;return b},single(){st.single=true;return b},
      upsert(d){st.op="upsert";st.data=d;return b},insert(d){st.op="insert";st.data=d;return b},update(d){st.op="update";st.data=d;return b},delete(){st.op="delete";return b},
      then(ok,no){return run().then(ok,no)}};return b};
  const ch={on(){return ch},subscribe(){return ch},send(){}};
  return{auth:real.auth,from,rpc:async()=>({data:null,error:null}),channel:()=>ch,storage:{from:()=>({upload:async()=>({error:{message:"guest"}}),getPublicUrl:()=>({data:{}})})}}}
const REAL_SB=sb;
async function startGuest(){if(started)return;sb=guestClient(REAL_SB);ls.set("guest",true);started=true;track("guest_start");
  $("#land").hidden=true;closeModal();$("#app").hidden=false;document.body.classList.add("inapp");$("#main").innerHTML=`<div class="swempty"><div class="spin"></div></div>`;
  me={user_id:"guest",name:"Гость",pair_code:"",guest:true};await Promise.all([loadAll(),loadGenres()]);buildSources();go("swipe");openFromLink();setTimeout(async()=>{await openOnboarding(false);startTour(false)},700)}
function needAccount(what){if(!me?.guest)return false;sheet(`<h2>Нужен аккаунт</h2><p class="sub" style="margin:-6px 0 0">${esc(what||"Эта функция работает после регистрации")}. Регистрация занимает 20 секунд — всё, что вы уже налайкали, переедет в аккаунт.</p>
  <div class="sticky"><button class="btn red" id="gReg" style="flex:1">Создать аккаунт</button><button class="btn" id="gLog">Войти</button></div>`);
  $("#gReg").onclick=()=>{closeSheet();openLogin("up")};$("#gLog").onclick=()=>{closeSheet();openLogin()};return true}
async function migrateGuest(){const d=gdb();if(!Object.keys(d).length)return;const uid=me.user_id,ids=new Map();
  try{for(const l of Object.values(d.km_lists||{})){const {data}=await REAL_SB.from("km_lists").insert({user_id:uid,name:l.name}).select().single();if(data)ids.set(l.id,data.id)}
    const put=async(t,rows)=>{if(rows.length)await REAL_SB.from(t).upsert(rows,{ignoreDuplicates:true})};
    await put("km_swipes",Object.values(d.km_swipes||{}).map(r=>({...r,user_id:uid})));
    await put("km_shelf",Object.values(d.km_shelf||{}).map(({id,created_at,...r})=>({...r,user_id:uid})));
    await put("km_reactions",Object.values(d.km_reactions||{}).map(({id,created_at,...r})=>({...r,user_id:uid})));
    await put("km_watch",Object.values(d.km_watch||{}).map(({id,created_at,...r})=>({...r,user_id:uid})));
    await put("km_list_items",Object.values(d.km_list_items||{}).filter(r=>ids.has(r.list_id)).map(({id,created_at,...r})=>({...r,list_id:ids.get(r.list_id)})));
    const pr=d.km_prefs?.p?.prefs;if(pr)await REAL_SB.from("km_prefs").upsert({user_id:uid,prefs:pr});
    localStorage.removeItem("km_guest");ls.set("guest",false);toast("Ваши лайки и полка перенесены в аккаунт ✓")}catch(e){}}
function demoFan(){const fan=document.querySelector(".fan");if(!fan||fan._demo)return;fan._demo=true;const cards=[...fan.querySelectorAll(".pc")];
  const top=()=>cards[cards.length-1];let x0=0,dx=0,dragging=false;
  fan.addEventListener("pointerdown",e=>{if(!e.target.closest(".pc"))return;dragging=true;x0=e.clientX;dx=0;top().style.transition="none";try{fan.setPointerCapture(e.pointerId)}catch(_){}});
  fan.addEventListener("pointermove",e=>{if(!dragging)return;dx=e.clientX-x0;top().style.transform=`translateX(${dx}px) rotate(${dx/14}deg)`;fan.dataset.dir=dx>30?"yes":dx<-30?"no":""});
  const end=()=>{if(!dragging)return;dragging=false;const t=top();t.style.transition="transform .35s ease, opacity .35s";
    if(Math.abs(dx)>70){t.style.transform=`translateX(${dx>0?420:-420}px) rotate(${dx>0?28:-28}deg)`;t.style.opacity=0;snd(dx>0?"like":"nope");
      setTimeout(()=>{t.style.transition="none";t.style.transform="";t.style.opacity=1;fan.prepend(t);cards.unshift(cards.pop());fan.dataset.dir=""},380)}
    else{t.style.transform="";fan.dataset.dir=""}};
  fan.addEventListener("pointerup",end);fan.addEventListener("pointercancel",end)}

/* ---------- boot ---------- */
if("serviceWorker" in navigator&&location.protocol==="https:")addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
let installEvt=null;addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;const b=$("#instBtn");if(b)b.hidden=false});
async function ensureProfile(user){
  for(let i=0;i<5;i++){const {data}=await sb.from("km_profiles").select("*").eq("user_id",user.id).maybeSingle();if(data)return data;await new Promise(r=>setTimeout(r,600))}
  return {user_id:user.id,name:"",pair_code:"——"};
}
async function importFirstVersion(){
  // the first private version lived elsewhere; bring its shelf over once for its owner
  if(mine.shelf.size||ls.get("imported1",false)||(me.email||"").toLowerCase()!=="legionerpropro@gmail.com")return;
  try{const m=await fetch("migrate.json").then(r=>r.ok?r.json():null);if(!m)return;
    if(m.shelf?.length)await sb.from("km_shelf").upsert(m.shelf.map(r=>({user_id:me.user_id,tmdb:r.tmdb,data:r.data,status:r.status,rating:r.rating,note:r.note||"",added_at:r.added_at||new Date().toISOString()})),{ignoreDuplicates:true});
    if(m.swipes?.length)await sb.from("km_swipes").upsert(m.swipes.map(r=>({user_id:me.user_id,tmdb:r.tmdb,v:r.v})),{ignoreDuplicates:true});
    ls.set("imported1",true);await loadAll();toast("Перенёс вашу полку из первой версии")}catch(e){}
}
let started=false;
async function start(session){
  if(started)return;started=true;track("login");
  $("#land").hidden=true;closeModal();$("#app").hidden=false;document.body.classList.add("inapp");
  $("#main").innerHTML=`<div class="swempty"><div class="spin"></div></div>`;
  sb=REAL_SB;const p=await ensureProfile(session.user);me={...p,email:session.user.email};await migrateGuest();
  await Promise.all([loadAll(),loadGenres()]);await importFirstVersion();
  const pair=new URLSearchParams(location.search).get("pair");
  if(pair){history.replaceState(null,"",location.pathname);if(!partner&&pair.toUpperCase()!==me.pair_code)await pairWith(pair)}
  buildSources();go("swipe");nightListen();openFromLink();showWatchNews();
  const qs=new URLSearchParams(location.search);if(qs.get("room")){history.replaceState(null,"",location.pathname);joinRoom(qs.get("room"))}if(qs.get("u"))openPublic(qs.get("u"));
  if(!qs.get("m")&&!qs.get("u"))setTimeout(async()=>{await openOnboarding(false);startTour(false)},700);remindWant();
  const nr=[...recsIn.values()].filter(r=>!r.seen&&!mine.swipes.has(r.tmdb)).length;if(nr)setTimeout(()=>toast(`💌 ${ptName()} посоветовал(а) ${RN(nr,"фильм","фильма","фильмов")} — они первые в свайпе`),900);
  sb.channel("km").on("postgres_changes",{event:"*",schema:"public",table:"km_swipes"},pl=>{const r=pl.new?.user_id?pl.new:pl.old;if(!r?.user_id||r.user_id===me.user_id)return;
      if(pl.eventType==="DELETE")theirs.swipes.delete(r.tmdb);else{theirs.swipes.set(r.tmdb,pl.new);const my=mine.swipes.get(pl.new.tmdb);if(pl.new.v==="like"&&my?.v==="like"&&pl.new.data)showMatch(pl.new.data,pl.new.mega&&my.mega)}counts()})
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"km_msgs"},pl=>{const x=pl.new;if(!x||x.to_user!==me.user_id)return;if(chatFor===x.tmdb&&$("#msgs"))addMsg(x);else{const t=mine.swipes.get(x.tmdb)?.data?.t;toast(`💬 ${ptName()}: ${x.text}${t?` · «${t}»`:""}`);snd("tap")}})
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"km_recs"},pl=>{const r=pl.new;if(r?.to_user!==me.user_id)return;recsIn.set(r.tmdb,r);
      if(r.data?.kind&&!mine.swipes.has(r.tmdb)){deck=deck.filter(x=>x.k!==r.tmdb);deck.splice(1,0,r.data)}toast(`💌 ${ptName()} советует «${r.data?.t||"фильм"}» — он следующий в свайпе`)})
    .on("postgres_changes",{event:"*",schema:"public",table:"km_reactions"},pl=>{const r=pl.new?.user_id?pl.new:pl.old;if(!r?.user_id||r.user_id===me.user_id)return;if(pl.eventType==="DELETE")theirs.rx.delete(r.tmdb);else theirs.rx.set(r.tmdb,r.emoji)})
    .on("postgres_changes",{event:"*",schema:"public",table:"km_shelf"},pl=>{const r=pl.new?.user_id?pl.new:pl.old;if(!r?.user_id||r.user_id===me.user_id)return;if(pl.eventType==="DELETE")theirs.shelf.delete(r.tmdb);else theirs.shelf.set(r.tmdb,pl.new)}).subscribe();
  document.addEventListener("visibilitychange",async()=>{if(!document.hidden){await loadAll();counts();if(view!=="swipe"&&!$("#layer").innerHTML)go(view)}});
}
(async()=>{
  const {data:{session}}=await sb.auth.getSession();
  if(session)start(session);else if(ls.get("guest",false))startGuest();else initLanding();
  sb.auth.onAuthStateChange((ev,s)=>{if(ev==="PASSWORD_RECOVERY"){openNewPassword();return}if(ev==="SIGNED_IN"&&s){if(me?.guest){location.reload();return}start(s)}});
})();
