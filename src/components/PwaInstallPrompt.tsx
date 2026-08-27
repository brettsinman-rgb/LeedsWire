"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { event as trackEvent } from "@/lib/analytics";

const PAGE_VIEWS_KEY = "leedswire:pwa:page-views";
const SNOOZE_UNTIL_KEY = "leedswire:pwa:snooze-until";
const INSTALLED_KEY = "leedswire:pwa:installed";
const PAGE_VIEW_THRESHOLD = 3;
const TIME_THRESHOLD_MS = 60 * 1000;
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const PROMPT_RETRY_MS = 500;

type InstallOutcome = "accepted" | "dismissed";
type PromptMode = "native" | "ios";
type PromptSource = "automatic" | "manual";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

type PwaInstallContextValue = {
  ctaAvailable: boolean;
  openInstallExperience: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function readStorage(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch {}
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return navigatorWithStandalone.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
}

function isMobileOrTablet() {
  const isTouchMac = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent) || isTouchMac;
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  return isIos && /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
}

function automaticPromptSuppressed() {
  if (readStorage(INSTALLED_KEY) === "true") return true;
  const snoozeUntil = Number(readStorage(SNOOZE_UNTIL_KEY) ?? 0);
  return Number.isFinite(snoozeUntil) && snoozeUntil > Date.now();
}

function anotherAutomaticPromptIsVisible() {
  return Boolean(document.querySelector(
    '[data-testid="next-fixture-popup"], [data-testid="push-notification-prompt"]',
  ));
}

export function usePwaInstall() {
  const value = useContext(PwaInstallContext);
  if (!value) throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  return value;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const lastCountedPath = useRef<string | null>(null);
  const acceptedTracked = useRef(false);
  const ctaViewTracked = useRef(false);
  const manuallyOpened = useRef(false);
  const [mode, setMode] = useState<PromptMode | null>(null);
  const [engagementReached, setEngagementReached] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [promptSource, setPromptSource] = useState<PromptSource>("automatic");
  const [manualRequested, setManualRequested] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const standalone = isStandalone();
      setInstalled(standalone);
      if (standalone) writeStorage(INSTALLED_KEY, "true");
      else if (isIosSafari()) setMode("ios");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(rawEvent: Event) {
      if (isStandalone()) return;
      const installEvent = rawEvent as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      deferredPrompt.current = installEvent;
      setMode("native");
      setInstallAvailable(true);
    }
    function handleInstalled() {
      writeStorage(INSTALLED_KEY, "true");
      setInstalled(true);
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
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!mode || lastCountedPath.current === pathname) return;
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
    if (!mode) return;
    const timeout = window.setTimeout(() => setEngagementReached(true), TIME_THRESHOLD_MS);
    return () => window.clearTimeout(timeout);
  }, [mode]);

  const ctaAvailable = !installed &&
    (mode === "ios" || (mode === "native" && installAvailable));

  useEffect(() => {
    if (ctaAvailable && !ctaViewTracked.current) {
      ctaViewTracked.current = true;
      trackEvent("install_cta_view", { platform: mode });
    }
  }, [ctaAvailable, mode]);

  useEffect(() => {
    const canPrompt = isMobileOrTablet() &&
      (mode === "ios" || (mode === "native" && installAvailable));
    if (!engagementReached || !canPrompt || isVisible || installed || manuallyOpened.current || automaticPromptSuppressed()) return;
    let retryTimer = 0;
    const attempt = () => {
      if (anotherAutomaticPromptIsVisible()) {
        retryTimer = window.setTimeout(attempt, PROMPT_RETRY_MS);
        return;
      }
      setPromptSource("automatic");
      setIsVisible(true);
      trackEvent("pwa_prompt_shown", { platform: mode });
      if (mode === "ios") trackEvent("pwa_ios_instructions_shown");
    };
    const timeout = window.setTimeout(attempt, 0);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(retryTimer);
    };
  }, [engagementReached, installAvailable, installed, isVisible, mode]);

  useEffect(() => {
    if (!manualRequested || installed || !ctaAvailable) return;
    let retryTimer = 0;
    const attempt = () => {
      if (anotherAutomaticPromptIsVisible()) {
        retryTimer = window.setTimeout(attempt, PROMPT_RETRY_MS);
        return;
      }
      setPromptSource("manual");
      setIsVisible(true);
      setManualRequested(false);
      if (mode === "ios") trackEvent("pwa_ios_instructions_shown");
    };
    const timeout = window.setTimeout(attempt, 0);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(retryTimer);
    };
  }, [ctaAvailable, installed, manualRequested, mode]);

  function openInstallExperience() {
    if (!ctaAvailable) return;
    manuallyOpened.current = true;
    trackEvent("install_cta_click", { platform: mode });
    if (mode === "native") void installNative();
    else setManualRequested(true);
  }

  function closePrompt() {
    if (promptSource === "automatic") {
      writeStorage(SNOOZE_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
    }
    setIsVisible(false);
  }

  async function installNative() {
    const installEvent = deferredPrompt.current;
    if (!installEvent) return;
    trackEvent("pwa_install_clicked");
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      deferredPrompt.current = null;
      setInstallAvailable(false);
      if (choice.outcome === "accepted") {
        writeStorage(INSTALLED_KEY, "true");
        setInstalled(true);
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
    writeStorage(SNOOZE_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
    setIsVisible(false);
  }

  return (
    <PwaInstallContext.Provider value={{ ctaAvailable, openInstallExperience }}>
      {children}
      {isVisible && mode ? <PwaInstallDialog mode={mode} onClose={closePrompt} onInstall={installNative} /> : null}
    </PwaInstallContext.Provider>
  );
}

function PwaInstallDialog({ mode, onClose, onInstall }: {
  mode: PromptMode;
  onClose: () => void;
  onInstall: () => Promise<void>;
}) {
  const isIos = mode === "ios";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
      <section role="dialog" aria-modal="false" aria-labelledby="pwa-install-title" aria-describedby="pwa-install-description" className="pointer-events-auto relative mx-auto w-full max-w-md rounded-[1.15rem] bg-[radial-gradient(circle_at_85%_0%,rgba(255,221,0,0.12),transparent_35%),linear-gradient(145deg,rgba(14,29,48,0.98),rgba(6,17,31,0.99))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.48)] ring-1 ring-white/[0.14] backdrop-blur-xl">
        <button type="button" onClick={onClose} aria-label="Close home screen instructions" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-xl text-zinc-400 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd00]">×</button>
        <p className="pr-10 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#ffdd00]">LeedsWire</p>
        <h2 id="pwa-install-title" className="mt-2 pr-8 text-xl font-semibold leading-tight tracking-tight">Add LeedsWire to Your Home Screen</h2>
        <p id="pwa-install-description" className="mt-3 text-sm leading-6 text-zinc-300">Keep LeedsWire one tap away for news, match alerts and updates.</p>
        {isIos ? <ol className="mt-4 space-y-2 rounded-xl bg-white/[0.055] px-4 py-3 text-sm font-medium text-zinc-200 ring-1 ring-white/[0.08]"><li>1. Tap the Share button in Safari.</li><li>2. Select “Add to Home Screen”.</li><li>3. Tap “Add”.</li></ol> : null}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={isIos ? onClose : () => void onInstall()} className="min-h-11 flex-1 rounded-xl bg-[#ffdd00] px-4 py-2.5 text-sm font-bold text-[#071827] shadow-[0_8px_24px_rgba(255,221,0,0.14)] transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white">{isIos ? "Got it" : "Install LeedsWire"}</button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-zinc-200 ring-1 ring-white/[0.1] transition hover:bg-white/[0.1] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#ffdd00]">Maybe Later</button>
        </div>
      </section>
    </div>
  );
}
