self.addEventListener("install", e => {
  console.log("Service Worker installed");
  e.waitUntil(
    caches.open("app-cache").then(cache => cache.addAll(["/"]))
  );
});
