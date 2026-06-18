import type { NextConfig } from "next";

function getOrigin(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

const supabaseOrigin = getOrigin(process.env.SUPABASE_URL);
const supabaseCspSource = supabaseOrigin ? ` ${supabaseOrigin}` : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com https://www.googletagmanager.com${supabaseCspSource}`,
  `style-src 'self' 'unsafe-inline'${supabaseCspSource}`,
  `img-src 'self' data: blob: https: https://www.google-analytics.com${supabaseCspSource}`,
  `font-src 'self' data:${supabaseCspSource}`,
  `media-src 'self' https:${supabaseCspSource}`,
  `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com${supabaseCspSource}`,
  `child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com${supabaseCspSource}`,
  "connect-src 'self' https: wss: https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const html5CreativeContentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https:",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), fullscreen=(self \"https://www.youtube.com\" \"https://www.youtube-nocookie.com\"), picture-in-picture=(self \"https://www.youtube.com\" \"https://www.youtube-nocookie.com\")",
          },
        ],
      },
      {
        source: "/api/ads/html5/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: html5CreativeContentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/latest",
        destination: "/",
        permanent: true,
      },
      {
        source: "/official",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
