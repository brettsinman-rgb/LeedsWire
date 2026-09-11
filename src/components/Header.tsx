"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { PwaInstallCta } from "@/components/PwaInstallCta";
import { event } from "@/lib/analytics";

const navItems = [
  { label: "Premier League News", href: "/premier-league-news" },
  { label: "Media", href: "/media" },
];

export function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const directionStartY = useRef(0);
  const lastDirection = useRef<"down" | "up" | null>(null);
  const ticking = useRef(false);
  const visibleRef = useRef(true);
  const scrolledRef = useRef(false);

  const revealHeader = useCallback(() => {
    if (!visibleRef.current) {
      visibleRef.current = true;
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    const topThreshold = 12;
    const activationThreshold = 150;
    const scrollDeltaThreshold = 20;

    const updateHeader = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const nextHasScrolled = currentScrollY > topThreshold;
      const scrollDelta = currentScrollY - lastScrollY.current;

      if (nextHasScrolled !== scrolledRef.current) {
        scrolledRef.current = nextHasScrolled;
        setHasScrolled(nextHasScrolled);
      }

      if (!nextHasScrolled) {
        lastDirection.current = null;
        directionStartY.current = currentScrollY;
        revealHeader();
      } else if (currentScrollY <= activationThreshold) {
        lastDirection.current = null;
        directionStartY.current = currentScrollY;
        revealHeader();
      } else if (scrollDelta !== 0) {
        const direction = scrollDelta > 0 ? "down" : "up";

        if (direction !== lastDirection.current) {
          lastDirection.current = direction;
          directionStartY.current = lastScrollY.current;
        }

        const directionDistance = Math.abs(
          currentScrollY - directionStartY.current,
        );

        if (
          direction === "down" &&
          visibleRef.current &&
          directionDistance >= scrollDeltaThreshold
        ) {
          visibleRef.current = false;
          setIsVisible(false);
        }

        if (
          direction === "up" &&
          !visibleRef.current &&
          directionDistance >= scrollDeltaThreshold
        ) {
          revealHeader();
        }
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(updateHeader);
      }
    };

    lastScrollY.current = Math.max(window.scrollY, 0);
    directionStartY.current = lastScrollY.current;
    scrolledRef.current = lastScrollY.current > topThreshold;
    setHasScrolled(scrolledRef.current);

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [revealHeader]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const previousOffset = root.style.getPropertyValue("--lw-header-offset");
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--lw-header-offset", `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => {
      observer.disconnect();
      if (previousOffset) root.style.setProperty("--lw-header-offset", previousOffset);
      else root.style.removeProperty("--lw-header-offset");
    };
  }, []);

  const headerClassName = [
    "fixed inset-x-0 top-0 z-40 border-b border-black/[0.08] bg-white backdrop-blur-2xl",
    "transform-gpu will-change-transform",
    hasScrolled && isVisible
      ? "shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
      : "shadow-none",
  ].join(" ");
  const headerStyle: CSSProperties = {
    transform: isVisible ? "translateY(0)" : "translateY(-100%)",
    transition: `transform ${
      isVisible ? "550ms" : "650ms"
    } cubic-bezier(0.22, 1, 0.36, 1), box-shadow 250ms ease`,
  };

  return (
    <header
      ref={headerRef}
      className={headerClassName}
      style={headerStyle}
      onFocusCapture={revealHeader}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-8 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 flex-col items-center justify-center gap-0.5 text-center sm:gap-1 lg:flex-row lg:justify-start lg:gap-4 lg:text-left"
          aria-label="LeedsWire home"
        >
          <span className="relative flex h-[94px] w-[94px] shrink-0 items-center justify-center overflow-hidden sm:h-[118px] sm:w-[118px] lg:h-[132px] lg:w-[132px]">
            <Image
              src="/images/logoleedswire.png?v=20260612"
              alt="LeedsWire"
              width={1200}
              height={1200}
              className="h-full w-full object-contain"
              priority
              unoptimized
            />
          </span>
          <span className="flex flex-col items-center leading-tight lg:items-start lg:justify-center">
            <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#164a89] sm:text-[0.74rem] lg:text-[0.9rem]">
              Everything Leeds
            </span>
            <span className="mt-0.5 text-[0.56rem] font-medium uppercase tracking-[0.12em] text-[#ffdc48] sm:text-[0.62rem] lg:text-[0.72rem] lg:font-bold lg:tracking-[0.14em]">
              News. Transfers. Media. All in One Place.
            </span>
          </span>
        </Link>
        <nav className="flex w-full flex-col items-center gap-2 whitespace-nowrap border-t border-black/[0.08] pt-1.5 sm:pt-2 lg:w-auto lg:border-t-0 lg:pt-0 xl:flex-row xl:gap-4">
          <div className="flex max-w-full items-center justify-center gap-2 min-[375px]:gap-5 sm:gap-6 lg:gap-4">
            {navItems.map((item) => {
              const isActive = !item.href.includes("#") && pathname === item.href;

              return (
                <span key={item.href} className="flex shrink-0 items-center gap-4">
                  <Link
                    href={item.href}
                    className={
                      isActive
                        ? "inline-flex h-11 shrink-0 items-center border-y-2 border-t-transparent border-b-[#EFBF04] lg:h-9 text-[0.72rem] font-extrabold uppercase tracking-[0.13em] text-[#EFBF04] transition duration-300"
                        : "inline-flex h-11 shrink-0 items-center border-y-2 border-transparent lg:h-9 text-[0.72rem] font-bold uppercase tracking-[0.13em] text-[#111111] transition duration-300 hover:border-b-[#EFBF04]/50 hover:text-[#EFBF04]"
                    }
                  >
                    {item.label}
                  </Link>
                </span>
              );
            })}
            <Link
              href="/audio"
              aria-label="LeedsWire Audio"
              aria-current={pathname === "/audio" ? "page" : undefined}
              title="LeedsWire Audio"
              onClick={() => event("audio_nav_click", { destination: "/audio" })}
              className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 border border-transparent text-[0.72rem] font-bold uppercase tracking-[0.13em] transition duration-300 hover:text-[#EFBF04] lg:h-9 lg:gap-1.5 lg:rounded-full lg:px-[15px] lg:hover:border-[#EFBF04] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#164a89] ${pathname === "/audio" ? "text-[#EFBF04] lg:border-[#EFBF04]" : "text-[#071827] lg:border-[#071827]"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
                className="shrink-0"
              >
                <path d="M12 17V3l8 2v4l-8-2" />
                <ellipse cx="8" cy="17" rx="4" ry="3" />
              </svg>
              <span>Audio</span>
            </Link>
          </div>
          <span className="shrink-0 empty:hidden"><PwaInstallCta /></span>
        </nav>
      </div>
    </header>
  );
}
