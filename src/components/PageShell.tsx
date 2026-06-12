import type { ReactNode } from "react";
import { SideSkins } from "@/components/AdSlot";
import { Header } from "@/components/Header";
import { PromotionalPopup } from "@/components/PromotionalPopup";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,221,0,0.07),transparent_26%),radial-gradient(circle_at_88%_8%,rgba(63,119,178,0.16),transparent_31%),linear-gradient(180deg,#081b2f_0%,#071827_38%,#06111f_100%)] text-white">
      <Header />
      <SideSkins />
      <PromotionalPopup />
      <main className="pt-[154px] lg:pt-[156px]">{children}</main>
      <footer className="border-t border-white/[0.08] bg-[#071827]/72 px-4 py-10 text-center backdrop-blur sm:py-12">
        <p className="mx-auto max-w-[700px] text-[13px] leading-6 text-[#94A3B8] sm:text-sm">
          LeedsWire aggregates headlines and links to original publishers. All
          articles remain the property of their respective owners.
        </p>
      </footer>
    </div>
  );
}
