"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { event as trackEvent } from "@/lib/analytics";
import type { NextFixture, NextFixtureResponse } from "@/types/fixture";

const SEEN_KEY = "leedswire-next-fixture-seen";
const INITIAL_REVEAL_DELAY_MS = 600;
const DISPLAY_DURATION_MS = 15_000;
const EXIT_FALLBACK_MS = 700;

type PopupPhase = "hidden" | "entering" | "visible" | "exiting";
type DismissReason = "close" | "auto";

function analyticsFields(fixture: NextFixture) {
  return {
    opponent: fixture.opponent,
    competition: fixture.competition ?? "Unknown",
    home_or_away: fixture.isHome ? "home" : "away",
  };
}

function formatFixtureDate(kickoffAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(kickoffAt));
}

function formatFixtureTime(kickoffAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(kickoffAt));
}

function TeamCrest({ src, team }: { src: string; team: string }) {
  return (
    // Crest URLs are validated as absolute HTTPS URLs by the server parser.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${team} crest`}
      className="size-10 object-contain sm:size-11"
      loading="lazy"
      decoding="async"
    />
  );
}

export function NextFixturePopup() {
  const [fixture, setFixture] = useState<NextFixture | null>(null);
  const [phase, setPhase] = useState<PopupPhase>("hidden");
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const remainingMs = useRef(DISPLAY_DURATION_MS);
  const timerStartedAt = useRef(0);
  const removalTimer = useRef<number | null>(null);
  const hasRecordedView = useRef(false);

  const removePopup = useCallback(() => {
    if (removalTimer.current !== null) {
      window.clearTimeout(removalTimer.current);
      removalTimer.current = null;
    }

    setPhase("hidden");
    setFixture(null);
  }, []);

  const dismiss = useCallback(
    (reason: DismissReason) => {
      if (!fixture || phase === "exiting" || phase === "hidden") {
        return;
      }

      trackEvent(
        reason === "auto"
          ? "next_fixture_popup_auto_dismiss"
          : "next_fixture_popup_close",
        analyticsFields(fixture),
      );
      setPhase("exiting");

      removalTimer.current = window.setTimeout(
        removePopup,
        prefersReducedMotion ? 300 : EXIT_FALLBACK_MS,
      );
    },
    [fixture, phase, prefersReducedMotion, removePopup],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let revealTimer = 0;
    let handlePageLoad: (() => void) | null = null;
    const controller = new AbortController();

    try {
      if (window.sessionStorage.getItem(SEEN_KEY) === "true") {
        return () => controller.abort();
      }
    } catch {
      // Continue without session persistence when storage is unavailable.
    }

    async function loadFixture() {
      try {
        const response = await fetch("/api/fixtures/next", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as NextFixtureResponse;
        const nextFixture = result.fixture;

        if (
          !nextFixture ||
          !Number.isFinite(Date.parse(nextFixture.kickoffAt)) ||
          Date.parse(nextFixture.kickoffAt) <= Date.now()
        ) {
          return;
        }

        const revealFixture = () => {
          revealTimer = window.setTimeout(() => {
            if (controller.signal.aborted) {
              return;
            }

            setFixture(nextFixture);
            setPhase("entering");
            remainingMs.current = DISPLAY_DURATION_MS;
            animationFrame = window.requestAnimationFrame(() => {
              animationFrame = window.requestAnimationFrame(() =>
                setPhase("visible"),
              );
            });
          }, INITIAL_REVEAL_DELAY_MS);
        };

        if (document.readyState === "complete") {
          revealFixture();
        } else {
          handlePageLoad = revealFixture;
          window.addEventListener("load", handlePageLoad, { once: true });
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // Fixture failures intentionally remain invisible to visitors.
        }
      }
    }

    void loadFixture();

    return () => {
      controller.abort();
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(revealTimer);

      if (handlePageLoad) {
        window.removeEventListener("load", handlePageLoad);
      }

      if (removalTimer.current !== null) {
        window.clearTimeout(removalTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!fixture || phase !== "visible" || hasRecordedView.current) {
      return;
    }

    hasRecordedView.current = true;

    try {
      window.sessionStorage.setItem(SEEN_KEY, "true");
    } catch {
      // The popup can still function when session storage is unavailable.
    }

    trackEvent("next_fixture_popup_view", analyticsFields(fixture));
  }, [fixture, phase]);

  useEffect(() => {
    if (phase !== "visible" || isPaused) {
      return;
    }

    timerStartedAt.current = Date.now();
    const timeout = window.setTimeout(
      () => dismiss("auto"),
      remainingMs.current,
    );

    return () => {
      window.clearTimeout(timeout);
      remainingMs.current = Math.max(
        0,
        remainingMs.current - (Date.now() - timerStartedAt.current),
      );
    };
  }, [dismiss, isPaused, phase]);

  useEffect(() => {
    if (phase !== "visible") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss("close");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismiss, phase]);

  if (!fixture || phase === "hidden") {
    return null;
  }

  const hasBothCrests = Boolean(
    fixture.leedsCrestUrl && fixture.opponentCrestUrl,
  );
  const isShown = phase === "visible";
  const cardContent = (
    <>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <span className="text-sm font-semibold leading-tight text-white sm:text-base">
            {fixture.homeTeam}
          </span>
          {hasBothCrests && fixture.isHome ? (
            <TeamCrest
              src={fixture.leedsCrestUrl!}
              team={fixture.homeTeam}
            />
          ) : hasBothCrests ? (
            <TeamCrest
              src={fixture.opponentCrestUrl!}
              team={fixture.homeTeam}
            />
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-black uppercase tracking-[0.12em] text-[#ffdd00]">
          v
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {hasBothCrests && fixture.isHome ? (
            <TeamCrest
              src={fixture.opponentCrestUrl!}
              team={fixture.awayTeam}
            />
          ) : hasBothCrests ? (
            <TeamCrest
              src={fixture.leedsCrestUrl!}
              team={fixture.awayTeam}
            />
          ) : null}
          <span className="text-sm font-semibold leading-tight text-white sm:text-base">
            {fixture.awayTeam}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.08] pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-zinc-300">
            {fixture.competition ?? "Upcoming fixture"}
          </p>
          <span className="rounded-full bg-white/[0.055] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.14em] text-zinc-300 ring-1 ring-white/[0.1]">
            {fixture.isHome ? "Home" : "Away"}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">
          {formatFixtureDate(fixture.kickoffAt)}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          <span className="font-semibold text-[#ffdd00]">
            {formatFixtureTime(fixture.kickoffAt)}
          </span>{" "}
          <span aria-hidden="true">•</span> Local time
        </p>
        {fixture.venue ? (
          <p className="mt-2 line-clamp-1 text-[0.68rem] text-zinc-500">
            {fixture.venue}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <aside
      role="dialog"
      aria-label={`Next Leeds United fixture against ${fixture.opponent}`}
      className={[
        "next-fixture-popup fixed inset-x-4 bottom-auto top-[calc(env(safe-area-inset-top)+var(--lw-header-offset)+1.5rem)] z-[60] mx-auto w-auto max-w-[400px] transition-[translate,opacity] duration-[400ms] ease-out sm:inset-x-auto sm:right-6 sm:top-[calc(var(--lw-header-offset)+1.5rem)] sm:mx-0 sm:w-[400px]",
        isShown
          ? "translate-x-0 translate-y-0 opacity-100"
          : prefersReducedMotion
            ? "translate-x-0 translate-y-0 opacity-0"
            : "-translate-y-[calc(100%+env(safe-area-inset-top)+var(--lw-header-offset)+1.5rem+1px)] opacity-0 sm:translate-x-[calc(100%+1.5rem+1px)] sm:translate-y-0",
      ].join(" ")}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          setIsPaused(true);
        }
      }}
      onMouseLeave={() => setIsPaused(false)}
      onTransitionEnd={(event) => {
        if (
          phase !== "exiting" ||
          event.target !== event.currentTarget ||
          (event.propertyName !== "translate" &&
            event.propertyName !== "opacity")
        ) {
          return;
        }

        window.requestAnimationFrame(removePopup);
      }}
      data-testid="next-fixture-popup"
    >
      <div className="relative overflow-hidden rounded-[1.15rem] bg-[radial-gradient(circle_at_88%_0%,rgba(255,221,0,0.1),transparent_36%),linear-gradient(145deg,rgba(14,29,48,0.98),rgba(7,24,39,0.98))] p-4 shadow-[0_8px_28px_rgba(0,0,0,0.14)] ring-1 ring-white/[0.12] backdrop-blur-xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#ffdd00]">
            Up next
          </p>
          <button
            type="button"
            aria-label="Close next fixture"
            onClick={() => dismiss("close")}
            className="flex size-8 items-center justify-center rounded-full text-xl leading-none text-zinc-400 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffdd00]/70"
          >
            ×
          </button>
        </div>

        {fixture.matchCentreUrl ? (
          <a
            href={fixture.matchCentreUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent(
                "next_fixture_popup_click",
                analyticsFields(fixture),
              )
            }
            className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#ffdd00]/70"
            aria-label={`Open Match Centre for ${fixture.homeTeam} versus ${fixture.awayTeam}`}
          >
            {cardContent}
          </a>
        ) : (
          cardContent
        )}
      </div>
    </aside>
  );
}
