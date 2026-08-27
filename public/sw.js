self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = typeof payload.title === "string" ? payload.title : "LeedsWire";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: typeof payload.icon === "string" ? payload.icon : "/images/favicon.png",
    ...(typeof payload.badge === "string" ? { badge: payload.badge } : {}),
    tag: typeof payload.tag === "string" ? payload.tag : "leedswire",
    data: {
      destinationUrl: typeof payload.destinationUrl === "string" && payload.destinationUrl.startsWith("/") ? payload.destinationUrl : "/",
      fixtureId: typeof payload.fixtureId === "string" ? payload.fixtureId : null,
      dailyBriefEventId: typeof payload.dailyBriefEventId === "string" ? payload.dailyBriefEventId : null,
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.destinationUrl || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const exact = windows.find((client) => client.url === destination);
    if (exact) return exact.focus();
    if (windows[0]) {
      await windows[0].navigate(destination);
      return windows[0].focus();
    }
    return self.clients.openWindow(destination);
  })());
});
