import { isSafeAdUrl } from "../config/ads.config";

export function html5CreativeRouteSrc(creativeId: string, path = "index.html") {
  return `/api/ads/html5/${creativeId}/${path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function appendHtml5ClickTags(entryUrl: string, clickUrl?: string) {
  if (!clickUrl || !isSafeAdUrl(clickUrl)) {
    return entryUrl;
  }

  try {
    const isRelative = entryUrl.startsWith("/");
    const url = new URL(entryUrl, "https://leedswire.local");

    url.searchParams.set("clickTag", clickUrl);
    url.searchParams.set("clickTAG", clickUrl);
    url.searchParams.set("clicktag", clickUrl);

    return isRelative ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch {
    return entryUrl;
  }
}
