import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LeedsWire",
    template: "%s | LeedsWire",
  },
  description:
    "A premium Leeds United-only news, transfers and media hub.",
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
      <body>{children}</body>
    </html>
  );
}
