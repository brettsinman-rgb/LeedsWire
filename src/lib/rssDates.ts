const RSS_TIMEZONES: Record<string, string> = {
  BST: "+0100",
  GMT: "+0000",
  UTC: "+0000",
  EST: "-0500",
  EDT: "-0400",
  CST: "-0600",
  CDT: "-0500",
  MST: "-0700",
  MDT: "-0600",
  PST: "-0800",
  PDT: "-0700",
};

function normalizeRssTimezone(value: string) {
  return value.trim().replace(
    /\b(BST|GMT|UTC|EST|EDT|CST|CDT|MST|MDT|PST|PDT)\s*$/i,
    (timezone) => RSS_TIMEZONES[timezone.toUpperCase()] ?? timezone,
  );
}

export function parseRssDate(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const timestamp = Date.parse(normalizeRssTimezone(value));

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function resolveArticleTimestamp(
  publishedAt?: string | null,
  fetchedAt?: string | null,
) {
  return parseRssDate(publishedAt) ?? parseRssDate(fetchedAt);
}

export function normalizeArticleDate(
  publishedAt?: string | null,
  fetchedAt?: string | null,
) {
  const timestamp = resolveArticleTimestamp(publishedAt, fetchedAt);

  return timestamp === null ? publishedAt ?? "" : new Date(timestamp).toISOString();
}

export function sortNewestFirst<T extends { publishedAt?: string; fetchedAt?: string }>(
  items: T[],
) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftTimestamp = resolveArticleTimestamp(
        left.item.publishedAt,
        left.item.fetchedAt,
      );
      const rightTimestamp = resolveArticleTimestamp(
        right.item.publishedAt,
        right.item.fetchedAt,
      );

      if (leftTimestamp === null && rightTimestamp === null) {
        return left.index - right.index;
      }

      if (leftTimestamp === null) {
        return 1;
      }

      if (rightTimestamp === null) {
        return -1;
      }

      return rightTimestamp - leftTimestamp || left.index - right.index;
    })
    .map(({ item }) => item);
}
