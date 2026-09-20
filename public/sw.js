const CACHE = "ilanas-weihnachtszauber-v4";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/world/hero.webp",
  "/world/underwater.webp",
  "/world/characters.webp",
  "/world/catland.webp",
  "/world/dinoworld.webp",
  "/world/dreams.webp",
  "/characters/ilana.webp",
  "/characters/puschelplumps.webp",
  "/characters/mama.webp",
  "/characters/papa.webp",
  "/characters/mila-zlata.webp",
  "/characters/dino.webp",
  "/characters/bello.webp",
  "/characters/wolkenlaeufer.webp",
  "/characters/grantelbart.webp",
  "/characters/santa.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
