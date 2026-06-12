export const WARM_NEWS_PATHS = [
  "/",
  "/news",
  "/transfers",
  "/premier-league-news",
] as const;

export type WarmNewsPath = (typeof WARM_NEWS_PATHS)[number];

export type WarmNewsResult = {
  path: WarmNewsPath;
  ok: boolean;
  status?: number;
  error?: string;
};

export type WarmNewsResponse = {
  ok: boolean;
  warmed: WarmNewsPath[];
  results: WarmNewsResult[];
  timestamp: string;
};

export type CronWarmNewsHandlerResult = {
  status: number;
  body:
    | WarmNewsResponse
    | {
        ok: false;
        error: string;
      };
};

export function isValidCronSecret(providedSecret: string | null) {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  return Boolean(expectedSecret) && providedSecret === expectedSecret;
}

export function getWarmNewsUrl(path: WarmNewsPath, requestUrl: string) {
  return new URL(path, requestUrl).toString();
}

export async function warmNewsRoutes(
  requestUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<WarmNewsResponse> {
  const results = await Promise.all(
    WARM_NEWS_PATHS.map(async (path) => {
      try {
        const response = await fetcher(getWarmNewsUrl(path, requestUrl), {
          cache: "no-store",
        });

        return {
          path,
          ok: response.ok,
          status: response.status,
          error: response.ok ? undefined : `HTTP ${response.status}`,
        };
      } catch (error) {
        return {
          path,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
  );

  return {
    ok: results.every((result) => result.ok),
    warmed: WARM_NEWS_PATHS.filter((path) =>
      results.some((result) => result.path === path && result.ok),
    ),
    results,
    timestamp: new Date().toISOString(),
  };
}

export async function handleWarmNewsRequest(
  requestUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<CronWarmNewsHandlerResult> {
  const url = new URL(requestUrl);

  if (!isValidCronSecret(url.searchParams.get("secret"))) {
    return {
      status: 401,
      body: { ok: false, error: "Unauthorized" },
    };
  }

  const body = await warmNewsRoutes(requestUrl, fetcher);

  return {
    status: body.ok ? 200 : 207,
    body,
  };
}
