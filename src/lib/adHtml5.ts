import { isSafeAdUrl } from "../config/ads.config";

export function appendHtml5ClickTags(entryUrl: string, clickUrl?: string) {
  if (!clickUrl || !isSafeAdUrl(clickUrl)) {
    return entryUrl;
  }

  try {
    const url = new URL(entryUrl);

    url.searchParams.set("clickTag", clickUrl);
    url.searchParams.set("clickTAG", clickUrl);
    url.searchParams.set("clicktag", clickUrl);

    return url.toString();
  } catch {
    return entryUrl;
  }
}
