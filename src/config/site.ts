export const siteUrl = "https://www.leedswire.com";
export const socialSharingImageUrl = `${siteUrl}/images/OG-Img.jpg`;

export const publicRoutes = [
  {
    path: "/",
    priority: 1,
  },
  {
    path: "/news",
    priority: 0.9,
  },
  {
    path: "/transfers",
    priority: 0.8,
  },
  {
    path: "/media",
    priority: 0.8,
  },
  {
    path: "/premier-league-news",
    priority: 0.7,
  },
] as const;

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
