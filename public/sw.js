self.addEventListener("push", (e) => {
  const d = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(d.title ?? "Games", { body: d.body, icon: "/icon-192.png", data: { url: d.url ?? "/" }, tag: d.url }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then((ws) => (ws[0] ? ws[0].focus().then((w) => w.navigate(e.notification.data.url)) : clients.openWindow(e.notification.data.url))));
});
