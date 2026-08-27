"use client";

import { usePwaInstall } from "@/components/PwaInstallPrompt";

export function PwaInstallCta() {
  const { ctaAvailable, openInstallExperience } = usePwaInstall();
  if (!ctaAvailable) return null;
  return (
    <button type="button" onClick={openInstallExperience} className="group flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#071827] px-3 py-2 text-left text-white ring-1 ring-[#164a89]/25 transition hover:bg-[#0b2138] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EFBF04]">
      <span aria-hidden="true" className="text-base font-light text-[#EFBF04]">＋</span>
      <span><span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.1em]">Add to Home Screen</span><span className="hidden text-[0.58rem] leading-4 text-zinc-400 xl:block">Keep LeedsWire one tap away for news, match alerts and updates.</span></span>
    </button>
  );
}
