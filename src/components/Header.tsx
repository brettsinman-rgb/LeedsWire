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
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[auto_1fr] lg:gap-x-8 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center justify-center lg:justify-start"
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
        <nav className="flex w-full items-center justify-center gap-5 overflow-x-auto border-t border-black/[0.08] pt-2 lg:border-t-0 lg:pt-0">
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
      </div>
    </header>
  );
}
