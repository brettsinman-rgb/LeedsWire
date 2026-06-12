import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
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
