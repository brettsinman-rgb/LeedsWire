export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID ?? "G-WHDN151MSL";

export const isGoogleAnalyticsEnabled =
  process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID);

type GtagCommand = "config" | "event" | "js" | "set";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: GtagCommand,
      targetIdOrAction: string | Date,
      params?: Record<string, unknown>,
    ) => void;
  }
}

export function pageview(url: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

export function event(action: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", action, params);
}
