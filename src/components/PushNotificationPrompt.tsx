"use client";

import { useEffect, useRef, useState } from "react";
import { event as trackEvent } from "@/lib/analytics";
import { supportsPushPrompt } from "@/lib/pushClientSupport";
import { reportPushDiagnostic } from "@/lib/pushDiagnosticsClient";
import {
  PUSH_PROMPT_ENGAGEMENT_DELAY_MS,
  PUSH_PROMPT_SUCCESS_DISPLAY_MS,
  PUSH_PROMPT_SUPPRESSION_RETRY_MS,
  PUSH_PROMPT_TRANSITION_MS,
} from "@/config/pushPrompt";

const SNOOZE_KEY = "leedswire:push:snooze-until";
const PREFERENCES_REVIEWED_KEY = "leedswire:push:preferences-reviewed-v1";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function isIos() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob((value + padding).replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function snoozed() {
  try { return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now(); } catch { return false; }
}

function snooze() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch {}
}

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [state, setState] = useState<"idle" | "working" | "success" | "error">("idle");
  const [preferences, setPreferences] = useState({
    dailyBrief: false,
    matchAlerts: true,
    fullTimeResults: true,
  });
  const [existingSubscription, setExistingSubscription] = useState<PushSubscription | null>(null);
  const exitTimer = useRef<number | null>(null);
  const successTimer = useRef<number | null>(null);

  useEffect(() => {
    const supported = supportsPushPrompt({
      hasServiceWorker: "serviceWorker" in navigator,
      hasPushManager: "PushManager" in window,
      hasNotification: "Notification" in window,
      isIos: isIos(),
      isStandalone: isStandalone(),
    });
    if (!supported || Notification.permission === "denied" || snoozed()) return;

    let cancelled = false;
    let timer = 0;
    const attempt = async () => {
      if (document.querySelector('[data-testid="next-fixture-popup"], [aria-labelledby="pwa-install-title"]')) {
        timer = window.setTimeout(
          () => void attempt(),
          PUSH_PROMPT_SUPPRESSION_RETRY_MS,
        );
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const existing = await registration?.pushManager.getSubscription() ?? null;
        if (existing && localStorage.getItem(PREFERENCES_REVIEWED_KEY) === "true") return;
        const endpointQuery = existing
          ? `?endpoint=${encodeURIComponent(existing.endpoint)}`
          : "";
        const response = await fetch(`/api/push/status${endpointQuery}`, { cache: "no-store" });
        const result = await response.json() as {
          configured?: boolean;
          publicKey?: string | null;
          subscribed?: boolean;
          preferences?: {
            dailyBrief?: boolean;
            matchAlerts?: boolean;
            fullTimeResults?: boolean;
          } | null;
        };
        if (!cancelled && response.ok && result.configured && result.publicKey) {
          setPublicKey(result.publicKey);
          setExistingSubscription(existing);
          if (result.subscribed && result.preferences) {
            setPreferences({
              dailyBrief: result.preferences.dailyBrief === true,
              matchAlerts: result.preferences.matchAlerts !== false,
              fullTimeResults: result.preferences.fullTimeResults !== false,
            });
          }
          setVisible(true);
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() => setShown(true)),
          );
          trackEvent("push_prompt_view");
        }
      } catch {}
    };
    timer = window.setTimeout(
      () => void attempt(),
      PUSH_PROMPT_ENGAGEMENT_DELAY_MS,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
      if (successTimer.current !== null) window.clearTimeout(successTimer.current);
    };
  }, []);

  function hidePrompt() {
    setShown(false);
    exitTimer.current = window.setTimeout(() => {
      setVisible(false);
      exitTimer.current = null;
    }, PUSH_PROMPT_TRANSITION_MS);
  }

  function dismiss() {
    snooze();
    hidePrompt();
    trackEvent("push_prompt_dismiss");
  }

  async function enable() {
    if (!Object.values(preferences).some(Boolean)) {
      setState("error");
      return;
    }
    setState("working");
    reportPushDiagnostic({
      permissionGranted: false,
      serviceWorkerRegistered: false,
      serviceWorkerReady: false,
      pushSubscriptionCreated: false,
      subscribeRequestAttempted: false,
      subscribeRequestStatus: null,
      databasePersistenceConfirmed: false,
      lastSafeError: null,
    });
    try {
      const permission = existingSubscription
        ? Notification.permission
        : await Notification.requestPermission();
      if (permission === "denied") {
        snooze();
        trackEvent("push_permission_denied");
        hidePrompt();
        return;
      }
      if (permission !== "granted") {
        snooze();
        hidePrompt();
        return;
      }
      trackEvent("push_permission_granted");
      reportPushDiagnostic({ permissionGranted: true });
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      reportPushDiagnostic({ serviceWorkerRegistered: true });
      const registration = await navigator.serviceWorker.ready;
      reportPushDiagnostic({ serviceWorkerReady: true });
      if (!registration.pushManager) throw new Error("PushManager is unavailable on the active worker");
      const subscription = existingSubscription ??
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(publicKey),
        }));
      reportPushDiagnostic({ pushSubscriptionCreated: true });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
        throw new Error("Browser returned an incomplete push subscription");
      }
      reportPushDiagnostic({ subscribeRequestAttempted: true });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...serialized,
          preferences,
        }),
      });
      const result = await response.json() as {
        ok?: boolean;
        persisted?: boolean;
        code?: string;
      };
      reportPushDiagnostic({
        subscribeRequestStatus: response.status,
        databasePersistenceConfirmed:
          response.ok && result.ok === true && result.persisted === true,
      });
      if (!response.ok || result.ok !== true || result.persisted !== true) {
        throw new Error(result.code ?? `Subscribe request failed (${response.status})`);
      }
      trackEvent(existingSubscription ? "push_preferences_updated" : "push_subscription_created");
      try { localStorage.setItem(PREFERENCES_REVIEWED_KEY, "true"); } catch {}
      setState("success");
      successTimer.current = window.setTimeout(
        hidePrompt,
        PUSH_PROMPT_SUCCESS_DISPLAY_MS,
      );
    } catch (error) {
      reportPushDiagnostic({
        lastSafeError:
          error instanceof Error ? error.message.slice(0, 160) : "Unknown subscription error",
      });
      setState("error");
    }
  }

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+var(--lw-header-offset)+1rem)] z-[55] overflow-x-clip px-3 sm:top-[calc(var(--lw-header-offset)+1.5rem)] sm:px-5">
      <section role="dialog" aria-labelledby="push-title" data-testid="push-notification-prompt" className={[
        "pointer-events-auto mx-auto w-full max-w-sm rounded-[1.15rem] bg-[linear-gradient(145deg,rgba(14,29,48,0.98),rgba(6,17,31,0.99))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.48)] ring-1 ring-white/[0.14] transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        shown
          ? "translate-y-0 opacity-100"
          : "-translate-y-[calc(100%+env(safe-area-inset-top)+var(--lw-header-offset)+1.5rem)] opacity-0",
      ].join(" ")}>
        {state === "success" ? (
          <><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffdd00]">LeedsWire alerts</p><h2 className="mt-2 text-xl font-semibold">Your alerts are saved. MOT 💙💛</h2><button type="button" onClick={hidePrompt} className="mt-4 min-h-11 w-full rounded-xl bg-[#ffdd00] px-4 font-bold text-[#071827]">Done</button></>
        ) : (
          <><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffdd00]">Never miss Leeds.</p><h2 id="push-title" className="mt-2 text-lg font-semibold">Choose your LeedsWire alerts.</h2><fieldset className="mt-3 space-y-2"><legend className="sr-only">Notification preferences</legend>{[
            ["dailyBrief", "Daily Leeds Brief", "The biggest Leeds story each day."],
            ["matchAlerts", "Match Alerts", "Important Leeds matchday updates."],
            ["fullTimeResults", "Full-Time Results", "Get the score when it’s all over."],
          ].map(([key, label, description]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/[0.045] px-3 py-2 ring-1 ring-white/[0.08]"><input type="checkbox" checked={preferences[key as keyof typeof preferences]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} className="mt-1 size-4 accent-[#ffdd00]"/><span><span className="block text-sm font-semibold text-white">{label}</span><span className="block text-[0.7rem] leading-4 text-zinc-400">{description}</span></span></label>)}</fieldset><p className="mt-2 text-xs leading-5 text-zinc-400">Choose at least one. Turn alerts off anytime in your browser or device settings.</p>{state === "error" ? <p className="mt-2 text-xs text-red-300">{Object.values(preferences).some(Boolean) ? "Alerts could not be saved. Please try again later." : "Choose at least one alert type."}</p> : null}<div className="mt-4 flex gap-3"><button type="button" disabled={state === "working" || !Object.values(preferences).some(Boolean)} onClick={() => void enable()} className="min-h-11 flex-1 rounded-xl bg-[#ffdd00] px-4 text-sm font-bold text-[#071827] disabled:opacity-60">{state === "working" ? "Saving…" : existingSubscription ? "SAVE PREFERENCES" : "TURN ON ALERTS"}</button><button type="button" onClick={dismiss} className="min-h-11 rounded-xl bg-white/[0.06] px-4 text-sm font-semibold text-zinc-200 ring-1 ring-white/[0.1]">Not now</button></div></>
        )}
      </section>
    </div>
  );
}
