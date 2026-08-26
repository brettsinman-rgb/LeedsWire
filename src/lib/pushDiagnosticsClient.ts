"use client";

export type PushFlowDiagnostics = {
  permissionGranted?: boolean;
  serviceWorkerRegistered?: boolean;
  serviceWorkerReady?: boolean;
  pushSubscriptionCreated?: boolean;
  subscribeRequestAttempted?: boolean;
  subscribeRequestStatus?: number | null;
  databasePersistenceConfirmed?: boolean;
  lastSafeError?: string | null;
};

export const PUSH_DIAGNOSTIC_EVENT = "leedswire:push-diagnostic";

export function reportPushDiagnostic(update: PushFlowDiagnostics) {
  if (process.env.NODE_ENV !== "development") return;
  window.dispatchEvent(new CustomEvent(PUSH_DIAGNOSTIC_EVENT, { detail: update }));
}
