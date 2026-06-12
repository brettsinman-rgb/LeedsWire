import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
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
      {
        source: "/transfers",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
