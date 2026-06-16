import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { absoluteUrl, siteUrl } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LeedsWire",
    template: "%s | LeedsWire",
  },
  description:
    "A premium Leeds United-only news, transfers and media hub.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    siteName: "LeedsWire",
    title: "LeedsWire",
    description:
      "A premium Leeds United-only news, transfers and media hub.",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "LeedsWire",
    description:
      "A premium Leeds United-only news, transfers and media hub.",
  },
  other: {
    "twitter:url": absoluteUrl("/"),
  },
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
};

const impactVerificationMeta = {
  name: "impact-site-verification",
  value: "bcdd09d0-7e2f-4e6b-b7c1-f2e2ee604f5e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <meta {...impactVerificationMeta} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
