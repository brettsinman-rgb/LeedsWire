import type { Metadata } from "next";
import { AudioPlayer } from "@/components/AudioPlayer";
import { PageShell } from "@/components/PageShell";
import { absoluteUrl, socialSharingImageUrl } from "@/config/site";

const description = "Listen to We Are Leeds on LeedsWire.";

export const metadata: Metadata = {
  title: "We Are Leeds",
  description,
  alternates: { canonical: absoluteUrl("/audio") },
  openGraph: {
    title: "We Are Leeds | LeedsWire",
    description,
    url: absoluteUrl("/audio"),
    images: [socialSharingImageUrl],
  },
  twitter: {
    card: "summary_large_image",
    title: "We Are Leeds | LeedsWire",
    description,
    images: [socialSharingImageUrl],
  },
  other: { "twitter:url": absoluteUrl("/audio") },
};

export const dynamic = "force-dynamic";

export default function AudioPage() {
  return (
    <PageShell pathname="/audio">
      <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <AudioPlayer />
      </div>
    </PageShell>
  );
}
