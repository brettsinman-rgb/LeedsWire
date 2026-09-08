function notificationDestination(value) {
  const home = new URL("/", self.location.origin).href;
  if (typeof value !== "string" || !value.trim() || /[\\\u0000-\u0020]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) return home;
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin &&
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username && !url.password ? url.href : home;
  } catch { return home; }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  if (!payload || typeof payload !== "object") payload = {};
  const title = typeof payload.title === "string" ? payload.title : "LeedsWire";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: typeof payload.icon === "string" ? payload.icon : "/images/favicon.png",
    ...(typeof payload.badge === "string" ? { badge: payload.badge } : {}),
    tag: typeof payload.tag === "string" ? payload.tag : "leedswire",
    data: {
      destinationUrl: notificationDestination(payload.destinationUrl ?? payload.url),
      fixtureId: typeof payload.fixtureId === "string" ? payload.fixtureId : null,
      dailyBriefEventId: typeof payload.dailyBriefEventId === "string" ? payload.dailyBriefEventId : null,
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = notificationDestination(
    event.notification.data?.destinationUrl ?? event.notification.data?.url,
  );
  event.waitUntil((async () => {
    let windows = [];
    try {
      windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    } catch { /* No accessible client; try opening the destination. */ }
    const candidates = windows.filter((client) => {
      try { return new URL(client.url).origin === self.location.origin; } catch { return false; }
    }).sort((a, b) => {
      const score = (client) => (client.url === destination ? 4 : 0) +
        (client.focused ? 2 : 0) + (client.visibilityState === "visible" ? 1 : 0);
      return score(b) - score(a);
    });
    for (const client of candidates) {
      // Focus while notification activation is available, then navigate even if focus fails.
      try { await client.focus(); } catch { /* Navigation may still succeed. */ }
      if (client.url === destination) return;
      try {
        const navigated = await client.navigate(destination);
        if (navigated) {
          try { await navigated.focus(); } catch { /* Do not duplicate a successful navigation. */ }
          return;
        }
      } catch { /* Client may have closed; try another existing window. */ }
    }
    try { await self.clients.openWindow(destination); } catch { /* Browser could deny opening. */ }
  })());
});
