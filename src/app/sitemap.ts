import type { MetadataRoute } from "next";
import { absoluteUrl, publicRoutes } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.path === "/" ? "hourly" : "daily",
    priority: route.priority,
  }));
}
