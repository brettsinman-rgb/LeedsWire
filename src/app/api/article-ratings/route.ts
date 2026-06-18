import { NextResponse } from "next/server";
import {
  emptyArticleRatingCounts,
  isArticleRatingValue,
  type ArticleRatingResult,
  type ArticleRatingValue,
} from "@/lib/articleRatings";

type SupabaseConfig =
  | {
      url: string;
      serviceKey: string;
    }
  | {
      missingEnv: string[];
    };

type RatingAggregateRow = {
  article_id: string;
  worth_reading_count: number;
  must_read_count: number;
  skip_count: number;
  total_count: number;
  positive_count: number;
  positive_percentage: number | string;
};

type VisitorRatingRow = {
  rating: ArticleRatingValue;
};

type ArticleRatingError = {
  message: string;
  details?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ratingTables = [
  "article_ratings",
  "article_rating_articles",
  "article_rating_aggregates",
] as const;
let tableDiagnosticsPromise: Promise<void> | null = null;

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return {
      missingEnv: [
        !url ? "SUPABASE_URL" : null,
        !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
      ].filter(Boolean) as string[],
    };
  }

  return { url, serviceKey };
}

function hasSupabaseCredentials(
  config: SupabaseConfig,
): config is { url: string; serviceKey: string } {
  return "url" in config && "serviceKey" in config;
}

function supabaseHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
  };
}

function supabaseProjectRef(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function logArticleRatingsSupabaseDiagnostics(config: SupabaseConfig) {
  if (tableDiagnosticsPromise) {
    return tableDiagnosticsPromise;
  }

  tableDiagnosticsPromise = (async () => {
    console.log("Supabase URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Article ratings Supabase diagnostics", {
      nextPublicProjectRef: supabaseProjectRef(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      ),
      serverProjectRef: supabaseProjectRef(process.env.SUPABASE_URL),
      effectiveWriteProjectRef: hasSupabaseCredentials(config)
        ? supabaseProjectRef(config.url)
        : null,
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });

    if (!hasSupabaseCredentials(config)) {
      console.log("Article ratings table existence", {
        skipped: true,
        missingEnv: config.missingEnv,
      });
      return;
    }

    const results = await Promise.all(
      ratingTables.map(async (table) => {
        try {
          const response = await fetch(
            `${config.url}/rest/v1/${table}?select=*&limit=1`,
            {
              headers: supabaseHeaders(config.serviceKey),
              cache: "no-store",
            },
          );

          return {
            table,
            exists: response.ok,
            status: response.status,
            error: response.ok ? null : await response.text(),
          };
        } catch (error) {
          return {
            table,
            exists: false,
            status: null,
            error: errorMessage(error),
          };
        }
      }),
    );

    console.log("Article ratings table existence", results);
  })();

  return tableDiagnosticsPromise;
}

async function createSupabaseError(response: Response) {
  const details = await response.text().catch(() => "");

  return {
    message: `Supabase request failed with status ${response.status}.`,
    details,
  } satisfies ArticleRatingError;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unknown article rating error.";
}

function errorDetails(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "details" in error &&
    typeof error.details === "string"
  ) {
    return error.details;
  }

  return undefined;
}

function toResult({
  articleId,
  aggregate,
  visitorRating,
}: {
  articleId: string;
  aggregate?: RatingAggregateRow;
  visitorRating: ArticleRatingValue | null;
}): ArticleRatingResult {
  return {
    articleId,
    visitorRating,
    counts: aggregate
      ? {
          worthReading: aggregate.worth_reading_count,
          mustRead: aggregate.must_read_count,
          skip: aggregate.skip_count,
          total: aggregate.total_count,
          positive: aggregate.positive_count,
          positivePercentage: Math.round(Number(aggregate.positive_percentage)),
        }
      : emptyArticleRatingCounts(),
  };
}

async function readAggregate({
  articleId,
  config,
}: {
  articleId: string;
  config: { url: string; serviceKey: string };
}) {
  const response = await fetch(
    `${config.url}/rest/v1/article_rating_aggregates?select=article_id,worth_reading_count,must_read_count,skip_count,total_count,positive_count,positive_percentage&article_id=eq.${encodeURIComponent(articleId)}&limit=1`,
    {
      headers: supabaseHeaders(config.serviceKey),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await createSupabaseError(response);
  }

  const rows = (await response.json()) as RatingAggregateRow[];
  return rows[0];
}

async function readVisitorRating({
  articleId,
  visitorId,
  config,
}: {
  articleId: string;
  visitorId: string | null;
  config: { url: string; serviceKey: string };
}) {
  if (!visitorId) {
    return null;
  }

  const response = await fetch(
    `${config.url}/rest/v1/article_ratings?select=rating&article_id=eq.${encodeURIComponent(articleId)}&visitor_id=eq.${encodeURIComponent(visitorId)}&limit=1`,
    {
      headers: supabaseHeaders(config.serviceKey),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await createSupabaseError(response);
  }

  const rows = (await response.json()) as VisitorRatingRow[];
  return rows[0]?.rating ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = normalizeText(searchParams.get("article_id"));
  const visitorId = normalizeText(searchParams.get("visitor_id"));

  if (!articleId) {
    return NextResponse.json(
      { error: "article_id is required." },
      { status: 400 },
    );
  }

  if (visitorId && !uuidPattern.test(visitorId)) {
    return NextResponse.json({ error: "Invalid visitor_id." }, { status: 400 });
  }

  const config = getSupabaseConfig();
  await logArticleRatingsSupabaseDiagnostics(config);

  if (!hasSupabaseCredentials(config)) {
    return NextResponse.json(toResult({ articleId, visitorRating: null }));
  }

  try {
    const [aggregate, visitorRating] = await Promise.all([
      readAggregate({ articleId, config }),
      readVisitorRating({ articleId, visitorId, config }),
    ]);

    return NextResponse.json(
      toResult({ articleId, aggregate, visitorRating }),
    );
  } catch (error) {
    console.error("Article rating read failed", error);

    return NextResponse.json(toResult({ articleId, visitorRating: null }));
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const articleId = normalizeText(body?.articleId);
  const visitorId = normalizeText(body?.visitorId);
  const rating = body?.rating;

  if (!articleId || !visitorId || !isArticleRatingValue(rating)) {
    return NextResponse.json(
      { error: "articleId, visitorId and rating are required." },
      { status: 400 },
    );
  }

  if (!uuidPattern.test(visitorId)) {
    return NextResponse.json({ error: "Invalid visitorId." }, { status: 400 });
  }

  const config = getSupabaseConfig();
  await logArticleRatingsSupabaseDiagnostics(config);

  if (!hasSupabaseCredentials(config)) {
    return NextResponse.json(
      { error: `Missing Supabase environment: ${config.missingEnv.join(", ")}` },
      { status: 503 },
    );
  }

  try {
    const requestBody = body ?? {};

    const articleMetadata = {
      article_id: articleId,
      source_id: normalizeText(requestBody.sourceId),
      category: normalizeText(requestBody.category),
      team: normalizeText(requestBody.team) ?? "Leeds United",
      updated_at: new Date().toISOString(),
    };
    const ratingPayload = {
      article_id: articleId,
      visitor_id: visitorId,
      rating,
      created_at: new Date().toISOString(),
    };

    const [metadataResponse, ratingResponse] = await Promise.all([
      fetch(
        `${config.url}/rest/v1/article_rating_articles?on_conflict=article_id`,
        {
          method: "POST",
          headers: {
            ...supabaseHeaders(config.serviceKey),
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(articleMetadata),
        },
      ),
      fetch(
        `${config.url}/rest/v1/article_ratings?on_conflict=article_id,visitor_id`,
        {
          method: "POST",
          headers: {
            ...supabaseHeaders(config.serviceKey),
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(ratingPayload),
        },
      ),
    ]);

    if (!metadataResponse.ok) {
      throw await createSupabaseError(metadataResponse);
    }

    if (!ratingResponse.ok) {
      throw await createSupabaseError(ratingResponse);
    }

    const [aggregate, visitorRating] = await Promise.all([
      readAggregate({ articleId, config }),
      readVisitorRating({ articleId, visitorId, config }),
    ]);

    return NextResponse.json(
      toResult({ articleId, aggregate, visitorRating }),
    );
  } catch (error) {
    console.error("Article rating save failed", error);

    return NextResponse.json(
      {
        error: "Unable to save article rating.",
        ...(process.env.NODE_ENV === "development"
          ? {
              message: errorMessage(error),
              details: errorDetails(error),
            }
          : {}),
      },
      { status: 500 },
    );
  }
}
