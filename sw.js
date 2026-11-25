// Service worker: dopo la prima apertura la app funziona senza internet.
const CACHE = 'kopfatlas-2026-11-25-a95e4fa';
const DATEIEN = ["./","index.html","app.js","app.css","daten.js","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","texturen/knochen.jpg","texturen/knochen_n.jpg","texturen/knochen_tiefe_a.webp","texturen/knochen_tiefe_b.webp","texturen/kompakta.jpg","texturen/muskel.jpg","texturen/spongiosa.jpg","texturen/spongiosa_grob.jpg","bilder/a3_dental_logo.webp","bilder/dentinkanaelchen.jpg","bilder/haut_schichten.jpg","bilder/schmelzprismen.jpg","bilder/totalprothese_foto.jpg","bilder/zahnloser_oberkiefer.jpg","bilder/zahnloser_unterkiefer.jpg"];
// cache: 'reload' = prende i file dal server e non dalla memoria del browser (GitHub Pages li tiene 10 minuti):
// senza, una versione nuova potrebbe salvare file vecchi.
let kannBanner = false, alteSeiten = false;
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(DATEIEN.map(u => new Request(u, { cache: 'reload' })));
    // Le pagine aperte sanno mostrare la scritta "Neue Version"? Quelle della prima versione no:
    // se nessuna risponde, la versione nuova parte da sola, come prima.
    const seiten = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    seiten.forEach(s => s.postMessage('neue_version'));
    await new Promise(r => setTimeout(r, 1500));
    if (!kannBanner) { alteSeiten = seiten.length > 0; self.skipWaiting(); }
  })());
});
// la versione nuova resta in attesa: parte quando lo studente tocca "Neue Version verfügbar - jetzt laden"
self.addEventListener('message', e => { if (e.data === 'kann_banner') kannBanner = true; if (e.data === 'weiter') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kopfatlas-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
    // PROMPT 3: una pagina aperta della versione vecchia (che non conosce la scritta) restava sullo schermo con il modello vecchio
    // fino alla riapertura. Ora viene ricaricata subito con la versione nuova.
  );
});
// La ricarica parte DOPO l'attivazione e senza farla aspettare: una ricarica attesa dentro l'attivazione si blocca,
// perche' la pagina nuova aspetta il service worker e il service worker aspetta la pagina.
self.addEventListener('activate', () => {
  if (!alteSeiten) return;
  setTimeout(async () => { for (const s of await self.clients.matchAll({ type: 'window' })) s.navigate(s.url).catch(() => {}); }, 300);
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true }) || (e.request.mode === 'navigate' ? await c.match('index.html') : null);
    if (hit) return hit;
    try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; }
    catch (err) { return (e.request.mode === 'navigate' && await c.match('index.html')) || Response.error(); }
  }));
});
