"use client";

import { useEffect, useState } from "react";
import { mediaChannelLinks } from "@/lib/mediaChannels";

type MediaChannelNavProps = {
  sticky?: boolean;
  title?: string;
  align?: "start" | "end";
};

const headerOffset = 236;

export function MediaChannelNav({
  sticky = false,
  title,
  align = "end",
}: MediaChannelNavProps) {
  const [activeId, setActiveId] = useState<string>(
    mediaChannelLinks[0].anchorId,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const sections = mediaChannelLinks
      .map((channel) => document.getElementById(channel.anchorId))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const updateActiveSection = () => {
      const currentSection =
        sections
          .map((section) => ({
            id: section.id,
            distance: Math.abs(section.getBoundingClientRect().top - headerOffset),
            isReached: section.getBoundingClientRect().top <= headerOffset,
          }))
          .filter((section) => section.isReached)
          .sort((a, b) => a.distance - b.distance)[0] ?? sections[0];

      setActiveId(currentSection.id);
    };

    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: `-${headerOffset}px 0px -45% 0px`,
      threshold: 0,
    });

    sections.forEach((section) => observer.observe(section));
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, []);

  const scrollToChannel = (anchorId: string) => {
    const section = document.getElementById(anchorId);

    if (!section) {
      return;
    }

    const targetY =
      section.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.history.replaceState(null, "", `#${anchorId}`);
    window.scrollTo({ top: Math.max(targetY, 0), behavior: "smooth" });
    setActiveId(anchorId);
  };

  return (
    <nav
      aria-label="Media channels"
      className={[
        sticky
          ? "sticky top-[154px] z-30 py-3 lg:top-[156px]"
          : "",
        "max-w-full",
      ].join(" ")}
    >
      {title ? (
        <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#ffdd00]/85">
          {title}
        </p>
      ) : null}
      <div
        className={[
          "-mx-5 flex max-w-none gap-0.5 overflow-visible whitespace-nowrap px-5 py-4 min-[390px]:gap-1 sm:mx-0 sm:max-w-full sm:gap-2 sm:p-4",
          align === "start"
            ? "sm:flex-wrap sm:justify-start sm:px-0 sm:whitespace-normal"
            : "sm:justify-end",
        ].join(" ")}
      >
        {mediaChannelLinks.map((channel) => {
          const isActive = channel.anchorId === activeId;
          const isHighlighted = channel.anchorId === (hoveredId ?? activeId);

          return (
            <a
              key={channel.anchorId}
              href={`#${channel.anchorId}`}
              onMouseEnter={() => setHoveredId(channel.anchorId)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(channel.anchorId)}
              onBlur={() => setHoveredId(null)}
              onClick={(event) => {
                event.preventDefault();
                scrollToChannel(channel.anchorId);
              }}
              aria-current={isActive ? "true" : undefined}
              className={
                isHighlighted
                  ? "inline-flex min-h-8 shrink-0 items-center justify-center rounded-full bg-[#ffdd00] px-1 text-[8px] font-black uppercase tracking-[0] text-[#07101d] shadow-[0_0_16px_rgba(255,215,0,0.35),0_0_28px_rgba(255,215,0,0.15)] transition min-[375px]:px-1.5 min-[375px]:text-[8.5px] min-[390px]:text-[9px] min-[390px]:tracking-[0.02em] sm:min-h-11 sm:px-4 sm:text-xs sm:tracking-[0.13em] sm:shadow-[0_0_25px_rgba(255,215,0,0.35),0_0_50px_rgba(255,215,0,0.15)]"
                  : "inline-flex min-h-8 shrink-0 items-center justify-center rounded-full bg-[#071827] px-1 text-[8px] font-bold uppercase tracking-[0] text-white ring-1 ring-white/[0.12] transition min-[375px]:px-1.5 min-[375px]:text-[8.5px] min-[390px]:text-[9px] min-[390px]:tracking-[0.02em] sm:min-h-11 sm:px-4 sm:text-xs sm:tracking-[0.13em]"
              }
            >
              {channel.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
