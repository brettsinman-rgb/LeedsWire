"use client";

import { event as trackEvent } from "@/lib/analytics";

export async function removeCurrentPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return { removed: false };

  const response = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (!response.ok) throw new Error("Unable to remove push subscription");
  await subscription.unsubscribe();
  trackEvent("push_subscription_removed");
  return { removed: true };
}
