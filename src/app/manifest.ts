import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeedsWire",
    short_name: "LeedsWire",
    description: "Latest Leeds United news, transfers and fan ratings.",
    start_url: "/",
    display: "standalone",
    background_color: "#06111f",
    theme_color: "#071827",
    icons: [
      {
        src: "/images/favicon.png",
        sizes: "1200x1200",
        type: "image/png",
      },
    ],
  };
}
