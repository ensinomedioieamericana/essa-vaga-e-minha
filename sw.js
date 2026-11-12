// Cache 15: evita misturar HTML novo com JavaScript antigo após publicar atualizações.
const CACHE='evm-app-publico-v15';
const FILES=['./','./index.html','./styles.css','./premium.css','./data.js','./novidades.js','./app.js','./usp-notas.js','./unicamp-notas.js','./unesp-notas.js','./assets/essa-vaga-logo.png','./assets/iea-vertical.png','./assets/iea-horizontal.png','./assets/logo-unicamp.svg','./assets/logo-usp.svg?v=11','./assets/logo-enem.svg','./assets/logo-unesp.svg','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 const shell=req.mode==='navigate'||/\.(?:js|css|html)$/.test(url.pathname);
 if(shell){
  // Rede primeiro para arquivos que controlam as abas; cache apenas como reserva offline.
  event.respondWith(fetch(req).then(res=>{
   if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)))}
   return res;
  }).catch(()=>caches.match(req).then(cached=>cached||Response.error())));
 }else{
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
   if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)))}
   return res;
  })));
 }
});
