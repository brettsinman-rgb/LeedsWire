import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { Suspense } from "react";
import { GoogleAnalyticsPageView } from "@/components/GoogleAnalyticsPageView";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import {
  absoluteUrl,
  siteUrl,
  socialSharingImageUrl,
} from "@/config/site";
import {
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsEnabled,
} from "@/lib/analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LeedsWire",
    template: "%s | LeedsWire",
  },
  description:
    "Latest Leeds United news, transfers and fan ratings.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    siteName: "LeedsWire",
    title: "LeedsWire",
    description:
      "Latest Leeds United news, transfers and fan ratings.",
    url: absoluteUrl("/"),
    images: [socialSharingImageUrl],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeedsWire",
    description:
      "Latest Leeds United news, transfers and fan ratings.",
    images: [socialSharingImageUrl],
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
        <Suspense fallback={null}>
          <PwaInstallPrompt />
        </Suspense>
        {isGoogleAnalyticsEnabled ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
              `}
            </Script>
            <Suspense fallback={null}>
              <GoogleAnalyticsPageView />
            </Suspense>
          </>
        ) : null}
        <Analytics />
      </body>
    </html>
  );
}
