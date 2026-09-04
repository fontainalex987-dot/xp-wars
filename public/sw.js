self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "XP Wars", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "XP Wars";
  const options = {
    body: data.body || "Une petite quête t'attend.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })(),
  );
});
