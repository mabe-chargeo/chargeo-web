const CACHE_NAME = "chargeo-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // On ne gère que les requêtes web classiques (on ignore les extensions Chrome, etc.)
  if (event.request.method !== "GET" || (url.protocol !== "http:" && url.protocol !== "https:")) return;
  // Connexion (13/10/2026) : jamais en cache, ClickUp et le site doivent répondre en direct
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/connexion")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // SI ON A DU RÉSEAU : On télécharge la page et on la clone dans le cache "au cas où" on descende au sous-sol
        // Réponse redirigée (session expirée renvoyée vers /connexion) : pas en cache, sinon la page de connexion
        // remplacerait la vraie page hors-ligne.
        if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // SI ON EST AU SOUS-SOL (Plus de réseau, le fetch plante)
        // On intercepte le crash de Safari et on lui sert la page qu'on a gardée en mémoire !
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
      })
  );
});
