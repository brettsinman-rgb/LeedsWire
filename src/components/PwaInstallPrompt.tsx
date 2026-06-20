"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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

function isSuppressed() {
  if (readStorage(INSTALLED_KEY) === "true") {
    return true;
  }

  const snoozeUntil = Number(readStorage(SNOOZE_UNTIL_KEY) ?? 0);

  return Number.isFinite(snoozeUntil) && snoozeUntil > Date.now();
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const lastCountedPath = useRef<string | null>(null);
  const acceptedTracked = useRef(false);
  const [mode, setMode] = useState<PromptMode | null>(null);
  const [engagementReached, setEngagementReached] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
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
  }, [mode]);

  useEffect(() => {
    const canPrompt = mode === "ios" || (mode === "native" && installAvailable);

    if (
      !engagementReached ||
      !canPrompt ||
      isVisible ||
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
  }, [engagementReached, installAvailable, isVisible, mode]);

  function snooze() {
    writeStorage(SNOOZE_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
    setIsVisible(false);
  }

  function confirmIosInstructions() {
    writeStorage(INSTALLED_KEY, "true");
    setIsVisible(false);
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
        return;
      }
    } catch {
      deferredPrompt.current = null;
      setInstallAvailable(false);
    }

    trackEvent("pwa_install_dismissed");
    snooze();
  }

  if (!isVisible || !mode) {
    return null;
  }

  const isIos = mode === "ios";

  return (
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
  );
}
