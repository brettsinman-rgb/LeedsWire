"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { event as trackEvent } from "@/lib/analytics";

const PAGE_VIEWS_KEY = "leedswire:pwa:page-views";
const SNOOZE_UNTIL_KEY = "leedswire:pwa:snooze-until";
const INSTALLED_KEY = "leedswire:pwa:installed";
const PAGE_VIEW_THRESHOLD = 3;
const TIME_THRESHOLD_MS = 60 * 1000;
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

type PromptMode = "native" | "ios";
type DeviceName = "Android" | "iOS" | "Desktop";
type BrowserName = "Chrome" | "Safari" | "Other";

type DebugSnapshot = {
  pageViews: number;
  pageViewsRaw: string | null;
  snoozeUntilRaw: string | null;
  installedRaw: string | null;
  installed: boolean;
  standalone: boolean;
  snoozed: boolean;
  device: DeviceName;
  browser: BrowserName;
};

const emptyDebugSnapshot: DebugSnapshot = {
  pageViews: 0,
  pageViewsRaw: null,
  snoozeUntilRaw: null,
  installedRaw: null,
  installed: false,
  standalone: false,
  snoozed: false,
  device: "Desktop",
  browser: "Other",
};

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    navigatorWithStandalone.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function isMobileOrTablet() {
  const userAgent = window.navigator.userAgent;
  const isTouchMac =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;

  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || isTouchMac;
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIos =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);
  const isAlternativeIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

  return isIos && /Safari/i.test(userAgent) && !isAlternativeIosBrowser;
}

function getDevice(): DeviceName {
  const userAgent = window.navigator.userAgent;
  const isTouchMac =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;

  if (/iPhone|iPad|iPod/i.test(userAgent) || isTouchMac) {
    return "iOS";
  }

  if (/Android/i.test(userAgent)) {
    return "Android";
  }

  return "Desktop";
}

function getBrowser(): BrowserName {
  const userAgent = window.navigator.userAgent;

  if (/Chrome|CriOS/i.test(userAgent) && !/Edg|EdgiOS|OPR|OPiOS/i.test(userAgent)) {
    return "Chrome";
  }

  if (/Safari/i.test(userAgent) && !/Chrome|CriOS|Edg|EdgiOS|OPR|OPiOS/i.test(userAgent)) {
    return "Safari";
  }

  return "Other";
}

function isSuppressed() {
  if (readStorage(INSTALLED_KEY) === "true") {
    return true;
  }

  const snoozeUntil = Number(readStorage(SNOOZE_UNTIL_KEY) ?? 0);

  return Number.isFinite(snoozeUntil) && snoozeUntil > Date.now();
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debugEnabled = searchParams.get("debug") === "pwa";
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const lastCountedPath = useRef<string | null>(null);
  const acceptedTracked = useRef(false);
  const siteStartedAt = useRef<number | null>(null);
  const [mode, setMode] = useState<PromptMode | null>(null);
  const [engagementReached, setEngagementReached] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [debugForceHidden, setDebugForceHidden] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerResetToken, setTimerResetToken] = useState(0);
  const [debugSnapshot, setDebugSnapshot] =
    useState<DebugSnapshot>(emptyDebugSnapshot);

  const refreshDebugSnapshot = useCallback(() => {
    const pageViewsRaw = readStorage(PAGE_VIEWS_KEY);
    const snoozeUntilRaw = readStorage(SNOOZE_UNTIL_KEY);
    const installedRaw = readStorage(INSTALLED_KEY);
    const parsedPageViews = Number(pageViewsRaw ?? 0);
    const snoozeUntil = Number(snoozeUntilRaw ?? 0);
    const standalone = isStandalone();

    setDebugSnapshot({
      pageViews: Number.isFinite(parsedPageViews) ? parsedPageViews : 0,
      pageViewsRaw,
      snoozeUntilRaw,
      installedRaw,
      installed: standalone || installedRaw === "true",
      standalone,
      snoozed: Number.isFinite(snoozeUntil) && snoozeUntil > Date.now(),
      device: getDevice(),
      browser: getBrowser(),
    });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      siteStartedAt.current = Date.now();

      if (!isMobileOrTablet() || isStandalone()) {
        if (isStandalone()) {
          writeStorage(INSTALLED_KEY, "true");
        }
        return;
      }

      setMode(isIosSafari() ? "ios" : "native");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(rawEvent: Event) {
      if (!isMobileOrTablet() || isStandalone()) {
        return;
      }

      const installEvent = rawEvent as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      deferredPrompt.current = installEvent;
      setInstallAvailable(true);
    }

    function handleInstalled() {
      writeStorage(INSTALLED_KEY, "true");
      setIsVisible(false);
      deferredPrompt.current = null;
      setInstallAvailable(false);

      if (!acceptedTracked.current) {
        acceptedTracked.current = true;
        trackEvent("pwa_install_accepted");
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!mode || lastCountedPath.current === pathname) {
      return;
    }

    lastCountedPath.current = pathname;
    const previousViews = Number(readStorage(PAGE_VIEWS_KEY) ?? 0);
    const nextViews = (Number.isFinite(previousViews) ? previousViews : 0) + 1;
    writeStorage(PAGE_VIEWS_KEY, String(nextViews));

    if (nextViews >= PAGE_VIEW_THRESHOLD) {
      const timeout = window.setTimeout(() => setEngagementReached(true), 0);

      return () => window.clearTimeout(timeout);
    }
  }, [mode, pathname]);

  useEffect(() => {
    if (!mode) {
      return;
    }

    const timeout = window.setTimeout(
      () => setEngagementReached(true),
      TIME_THRESHOLD_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [mode, timerResetToken]);

  useEffect(() => {
    if (!debugEnabled) {
      return;
    }

    const updateDebugPanel = () => {
      const startedAt = siteStartedAt.current ?? Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      refreshDebugSnapshot();
    };
    const initialUpdate = window.setTimeout(updateDebugPanel, 0);
    const interval = window.setInterval(updateDebugPanel, 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [debugEnabled, refreshDebugSnapshot]);

  useEffect(() => {
    const canPrompt = mode === "ios" || (mode === "native" && installAvailable);

    if (
      !engagementReached ||
      !canPrompt ||
      isVisible ||
      (debugEnabled && debugForceHidden) ||
      isStandalone() ||
      isSuppressed()
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (isStandalone() || isSuppressed()) {
        return;
      }

      setIsVisible(true);
      trackEvent("pwa_prompt_shown", { platform: mode });

      if (mode === "ios") {
        trackEvent("pwa_ios_instructions_shown");
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    debugEnabled,
    debugForceHidden,
    engagementReached,
    installAvailable,
    isVisible,
    mode,
  ]);

  function snooze() {
    writeStorage(SNOOZE_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
    setIsVisible(false);
    refreshDebugSnapshot();
  }

  function confirmIosInstructions() {
    writeStorage(INSTALLED_KEY, "true");
    setIsVisible(false);
    refreshDebugSnapshot();
  }

  async function install() {
    const installEvent = deferredPrompt.current;

    if (!installEvent) {
      return;
    }

    trackEvent("pwa_install_clicked");
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      deferredPrompt.current = null;
      setInstallAvailable(false);

      if (choice.outcome === "accepted") {
        writeStorage(INSTALLED_KEY, "true");
        if (!acceptedTracked.current) {
          acceptedTracked.current = true;
          trackEvent("pwa_install_accepted");
        }
        setIsVisible(false);
        refreshDebugSnapshot();
        return;
      }
    } catch {
      deferredPrompt.current = null;
      setInstallAvailable(false);
    }

    trackEvent("pwa_install_dismissed");
    snooze();
  }

  function resetDebugState() {
    try {
      window.localStorage.removeItem(PAGE_VIEWS_KEY);
      window.localStorage.removeItem(SNOOZE_UNTIL_KEY);
      window.localStorage.removeItem(INSTALLED_KEY);
    } catch {
      // Keep debug controls safe in restricted browser contexts.
    }

    siteStartedAt.current = Date.now();
    setElapsedSeconds(0);
    setEngagementReached(false);
    setIsVisible(false);
    setDebugForceHidden(true);
    setTimerResetToken((token) => token + 1);
    refreshDebugSnapshot();
  }

  function forceShowPrompt() {
    refreshDebugSnapshot();

    if (isStandalone() || readStorage(INSTALLED_KEY) === "true" || !mode) {
      return;
    }

    setDebugForceHidden(false);
    setIsVisible(true);
  }

  function forceHidePrompt() {
    setDebugForceHidden(true);
    setIsVisible(false);
  }

  const isIos = mode === "ios";
  const promptEligible =
    !debugSnapshot.installed &&
    !debugSnapshot.snoozed &&
    engagementReached;
  const promptStatus = debugSnapshot.installed
    ? "Installed"
    : debugSnapshot.snoozed
      ? "Snoozed"
      : isVisible
        ? "Displayed"
        : promptEligible
          ? "Eligible"
          : elapsedSeconds >= TIME_THRESHOLD_MS / 2000
            ? "Waiting for timer"
            : "Waiting for page views";

  return (
    <>
      {isVisible && mode ? (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
        className="pointer-events-auto relative mx-auto w-full max-w-md rounded-[1.15rem] bg-[radial-gradient(circle_at_85%_0%,rgba(255,221,0,0.12),transparent_35%),linear-gradient(145deg,rgba(14,29,48,0.98),rgba(6,17,31,0.99))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.48)] ring-1 ring-white/[0.14] backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={snooze}
          aria-label="Close home screen prompt"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-xl text-zinc-400 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd00]"
        >
          ×
        </button>

        <p className="pr-10 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#ffdd00]">
          LeedsWire
        </p>
        <h2
          id="pwa-install-title"
          className="mt-2 pr-8 text-xl font-semibold leading-tight tracking-tight"
        >
          Add LeedsWire to Your Home Screen
        </h2>
        <p
          id="pwa-install-description"
          className="mt-3 text-sm leading-6 text-zinc-300"
        >
          Get one-tap access to the latest Leeds news, transfers, media and fan
          ratings.
        </p>

        {isIos ? (
          <div className="mt-4 rounded-xl bg-white/[0.055] px-4 py-3 text-sm font-medium text-zinc-200 ring-1 ring-white/[0.08]">
            Tap Share, then Add to Home Screen.
          </div>
        ) : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={isIos ? confirmIosInstructions : install}
            className="min-h-11 flex-1 rounded-xl bg-[#ffdd00] px-4 py-2.5 text-sm font-bold text-[#071827] shadow-[0_8px_24px_rgba(255,221,0,0.14)] transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white"
          >
            {isIos ? "Got it" : "Install LeedsWire"}
          </button>
          <button
            type="button"
            onClick={snooze}
            className="min-h-11 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-zinc-200 ring-1 ring-white/[0.1] transition hover:bg-white/[0.1] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#ffdd00]"
          >
            Maybe Later
          </button>
        </div>
      </section>
      </div>
      ) : null}

      {debugEnabled ? (
        <aside className="fixed right-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[110] max-h-[calc(100dvh-1rem)] w-[min(22rem,calc(100vw-1rem))] overflow-auto rounded-xl bg-[#071827]/[0.98] p-4 text-xs text-zinc-200 shadow-[0_18px_60px_rgba(0,0,0,0.55)] ring-1 ring-[#ffdd00]/35 backdrop-blur-xl">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#ffdd00]">
            PWA Debug
          </h2>

          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
            <dt>Installed:</dt><dd>{String(debugSnapshot.installed)}</dd>
            <dt>Display Mode:</dt><dd>{debugSnapshot.standalone ? "standalone" : "browser"}</dd>
            <dt>Page Views:</dt><dd>{debugSnapshot.pageViews}</dd>
            <dt>Time On Site:</dt><dd>{elapsedSeconds}s</dd>
            <dt>Prompt Eligible:</dt><dd>{String(promptEligible)}</dd>
            <dt>Prompt Shown:</dt><dd>{String(isVisible)}</dd>
            <dt>beforeinstallprompt Captured:</dt><dd>{String(installAvailable)}</dd>
            <dt>Device:</dt><dd>{debugSnapshot.device}</dd>
            <dt>Browser:</dt><dd>{debugSnapshot.browser}</dd>
            <dt>Prompt Status:</dt><dd className="font-semibold text-white">{promptStatus}</dd>
          </dl>

          <div className="mt-4 border-t border-white/[0.1] pt-3">
            <p className="font-bold uppercase tracking-[0.12em] text-zinc-400">
              LocalStorage Values
            </p>
            <dl className="mt-2 space-y-2 text-[0.68rem] leading-4">
              <div>
                <dt className="text-zinc-500">{PAGE_VIEWS_KEY}</dt>
                <dd className="break-all text-zinc-200">{debugSnapshot.pageViewsRaw ?? "null"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{SNOOZE_UNTIL_KEY}</dt>
                <dd className="break-all text-zinc-200">{debugSnapshot.snoozeUntilRaw ?? "null"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{INSTALLED_KEY}</dt>
                <dd className="break-all text-zinc-200">{debugSnapshot.installedRaw ?? "null"}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.1] pt-3">
            <button type="button" onClick={resetDebugState} className="min-h-9 rounded-lg bg-white/[0.07] px-3 py-2 font-semibold ring-1 ring-white/[0.12]">
              Reset PWA State
            </button>
            <button type="button" onClick={forceShowPrompt} disabled={debugSnapshot.installed || !mode} className="min-h-9 rounded-lg bg-[#ffdd00] px-3 py-2 font-bold text-[#071827] disabled:cursor-not-allowed disabled:opacity-40">
              Force Show Prompt
            </button>
            <button type="button" onClick={forceHidePrompt} className="col-span-2 min-h-9 rounded-lg bg-white/[0.07] px-3 py-2 font-semibold ring-1 ring-white/[0.12]">
              Force Hide Prompt
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
