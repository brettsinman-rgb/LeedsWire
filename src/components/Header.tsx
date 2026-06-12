"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Premier League News", href: "/premier-league-news" },
  { label: "Media", href: "/media" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-black/[0.08] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden sm:h-24 sm:w-24">
            <Image
              src="/images/logoleedswire.png"
              alt="LeedsWire"
              width={144}
              height={144}
              className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
              priority
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[1.68rem] font-extrabold uppercase leading-none tracking-[0.12em] text-[#111111] sm:text-3xl">
              LeedsWire
            </span>
            <span className="mt-1 block truncate text-[0.78rem] font-bold uppercase tracking-[0.18em] text-[#111111]/68 sm:text-[0.84rem]">
              Leeds United Only
            </span>
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
