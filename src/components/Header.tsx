"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

const navItems = [
  { label: "Premier League News", href: "/premier-league-news" },
  { label: "Media", href: "/media" },
];

export function Header() {
  const pathname = usePathname();
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
      className={headerClassName}
      style={headerStyle}
      onFocusCapture={revealHeader}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center"
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
        </Link>
        <nav className="order-3 col-span-2 flex items-center gap-5 overflow-x-auto border-t border-black/[0.08] pt-2 lg:order-none lg:col-span-1 lg:justify-center lg:border-t-0 lg:pt-0">
          {navItems.map((item) => {
            const isActive = !item.href.includes("#") && pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "shrink-0 border-b-2 border-[#EFBF04] pb-1 text-[0.72rem] font-extrabold uppercase tracking-[0.13em] text-[#EFBF04] transition duration-300"
                    : "shrink-0 border-b-2 border-transparent pb-1 text-[0.72rem] font-bold uppercase tracking-[0.13em] text-[#111111] transition duration-300 hover:border-[#EFBF04]/50 hover:text-[#EFBF04]"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex justify-end gap-2">
          <button className="group flex h-9 items-center gap-2 rounded-full bg-white px-3 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-[#111111] ring-1 ring-black/[0.12] transition hover:bg-[#EFBF04]/10 hover:text-[#111111]">
            <span className="relative size-4 rounded-full border-2 border-[#EFBF04] before:absolute before:-bottom-1 before:-right-1 before:h-2 before:w-0.5 before:rotate-[-45deg] before:bg-[#EFBF04]" />
            <span className="hidden sm:inline">Search</span>
          </button>
          <button className="group hidden size-9 rounded-full bg-white ring-1 ring-black/[0.12] transition hover:bg-[#EFBF04]/10 sm:block" aria-label="Profile coming soon">
            <span className="mx-auto mt-2 block size-3 rounded-full bg-[#111111] transition group-hover:bg-[#EFBF04]" />
            <span className="mx-auto mt-1 block h-2 w-5 rounded-t-full bg-[#111111] transition group-hover:bg-[#EFBF04]" />
          </button>
        </div>
      </div>
    </header>
  );
}
