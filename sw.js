/* Kinomatch service worker: makes the site installable and fast on repeat visits.
   Pages: network first (always fresh), cached copy when offline.
   Libraries, fonts, posters: served from cache, refreshed in the background. */
const V="km-v2",STATIC=["./","index.html","i18n.js","manifest.webmanifest","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=="km-img").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function trimImages(){const c=await caches.open("km-img"),ks=await c.keys();for(let i=0;i<ks.length-400;i++)await c.delete(ks[i])}
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  if(u.hostname.endsWith("supabase.co"))return; // live data: never cache
  if(r.mode==="navigate"||(u.origin===location.origin&&/\.(html|js)$|\/$/.test(u.pathname))){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));return}
  const img=u.hostname==="image.tmdb.org",lib=u.hostname==="cdn.jsdelivr.net"||u.hostname.endsWith("gstatic.com")||u.hostname==="fonts.googleapis.com"||u.hostname==="cdnjs.cloudflare.com";
  if(img||lib||u.origin===location.origin){const name=img?"km-img":V;
    e.respondWith(caches.open(name).then(async c=>{const hit=await c.match(r);const net=fetch(r).then(res=>{if(res.ok||res.type==="opaque"){c.put(r,res.clone());if(img)trimImages()}return res}).catch(()=>hit);return hit||net}))}});
