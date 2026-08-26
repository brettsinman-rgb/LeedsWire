"use client";

import { useEffect, useState } from "react";
import { PUSH_PROMPT_ENGAGEMENT_DELAY_MS } from "@/config/pushPrompt";
import {
  PUSH_DIAGNOSTIC_EVENT,
  type PushFlowDiagnostics,
} from "@/lib/pushDiagnosticsClient";

const SNOOZE_KEY = "leedswire:push:snooze-until";

type Diagnostics = {
  permission: NotificationPermission;
  serviceWorker: boolean;
  serviceWorkerRegistered: boolean;
  pushManager: boolean;
  existingSubscription: boolean;
  databaseActiveSubscription: boolean | null;
  cooldownActive: boolean;
  ios: boolean;
  standalone: boolean;
  nextFixtureSuppression: boolean;
  pwaPromptSuppression: boolean;
  engagementComplete: boolean;
  vapidPublicKeyAvailable: boolean;
  eligible: boolean;
  reason: string;
};

function browserState() {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  let cooldownActive = false;
  try {
    cooldownActive = Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now();
  } catch {}
  return { ios, standalone, cooldownActive };
}

export function PushNotificationDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [flow, setFlow] = useState<PushFlowDiagnostics>({});

  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" ||
      new URLSearchParams(location.search).get("push-debug") !== "1"
    ) return;
    const handleDiagnostic = (event: Event) => {
      const update = (event as CustomEvent<PushFlowDiagnostics>).detail;
      setFlow((current) => ({ ...current, ...update }));
    };
    window.addEventListener(PUSH_DIAGNOSTIC_EVENT, handleDiagnostic);
    return () => window.removeEventListener(PUSH_DIAGNOSTIC_EVENT, handleDiagnostic);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || new URLSearchParams(location.search).get("push-debug") !== "1") return;
    const startedAt = Date.now();
    let cancelled = false;

    async function inspect() {
      const serviceWorker = "serviceWorker" in navigator;
      const pushManager = "PushManager" in window;
      const notification = "Notification" in window;
      const permission = notification ? Notification.permission : "denied";
      const { ios, standalone, cooldownActive } = browserState();
      const nextFixtureSuppression = Boolean(document.querySelector('[data-testid="next-fixture-popup"]'));
      const pwaPromptSuppression = Boolean(document.querySelector('[aria-labelledby="pwa-install-title"]'));
      const engagementComplete =
        Date.now() - startedAt >= PUSH_PROMPT_ENGAGEMENT_DELAY_MS;
      let existingSubscription = false;
      let subscriptionEndpoint: string | null = null;
      let serviceWorkerRegistered = false;
      if (serviceWorker && pushManager) {
        try {
          const registration = await navigator.serviceWorker.getRegistration("/");
          serviceWorkerRegistered = Boolean(registration);
          const subscription = await registration?.pushManager.getSubscription();
          existingSubscription = Boolean(subscription);
          subscriptionEndpoint = subscription?.endpoint ?? null;
        } catch {}
      }
      let vapidPublicKeyAvailable = false;
      let databaseActiveSubscription: boolean | null = null;
      try {
        const query = subscriptionEndpoint
          ? `?endpoint=${encodeURIComponent(subscriptionEndpoint)}`
          : "";
        const response = await fetch(`/api/push/status${query}`, { cache: "no-store" });
        const result = await response.json() as { configured?: boolean; subscribed?: boolean };
        vapidPublicKeyAvailable = response.ok && result.configured === true;
        databaseActiveSubscription = subscriptionEndpoint
          ? response.ok && result.subscribed === true
          : null;
      } catch {}

      const blockers = [
        !serviceWorker && "Service workers are unsupported",
        !pushManager && "PushManager is unsupported",
        !notification && "Notifications are unsupported",
        permission === "denied" && "Notification permission is denied",
        existingSubscription && "This browser already has a push subscription",
        cooldownActive && "The 14-day dismissal cooldown is active",
        ios && !standalone && "iOS requires the installed Home Screen app",
        nextFixtureSuppression && "The Next Fixture prompt has priority",
        pwaPromptSuppression && "The PWA install prompt has priority",
        !engagementComplete && "The 25-second engagement timer is running",
        !vapidPublicKeyAvailable && "The running server is not exposing a VAPID public key",
      ].filter((value): value is string => Boolean(value));

      if (!cancelled) {
        setDiagnostics({ permission, serviceWorker, serviceWorkerRegistered, pushManager, existingSubscription, databaseActiveSubscription, cooldownActive, ios, standalone, nextFixtureSuppression, pwaPromptSuppression, engagementComplete, vapidPublicKeyAvailable, eligible: blockers.length === 0, reason: blockers[0] ?? "Eligible" });
      }
    }

    void inspect();
    const interval = window.setInterval(() => void inspect(), 1_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  if (!diagnostics) return null;
  return (
    <aside className="fixed bottom-3 left-3 z-[120] max-h-[80vh] w-[min(28rem,calc(100vw-1.5rem))] overflow-auto rounded-xl bg-black/95 p-4 font-mono text-xs text-white shadow-2xl ring-1 ring-white/20" data-testid="push-diagnostics">
      <p className="font-bold text-[#ffdd00]">Push eligibility diagnostics</p>
      <p className="mt-2 text-sm font-bold">{diagnostics.eligible ? "ELIGIBLE" : `BLOCKED: ${diagnostics.reason}`}</p>
      <pre className="mt-3 whitespace-pre-wrap">{JSON.stringify(diagnostics, null, 2)}</pre>
      <p className="mt-4 font-bold text-[#ffdd00]">Latest opt-in flow</p>
      <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(flow, null, 2)}</pre>
    </aside>
  );
}
