export type PushPreferences = {
  matchAlerts: boolean;
  fullTimeResults: boolean;
};

export type ValidPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  preferences: PushPreferences;
};

const MAX_ENDPOINT_LENGTH = 4096;
const MAX_KEY_LENGTH = 512;

export function envFlag(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function validatePushSubscription(body: unknown): ValidPushSubscription | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const keys = value.keys;
  if (!keys || typeof keys !== "object") return null;
  const keyValues = keys as Record<string, unknown>;
  const endpoint = value.endpoint;
  const p256dh = keyValues.p256dh;
  const auth = keyValues.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    endpoint.length > MAX_ENDPOINT_LENGTH ||
    typeof p256dh !== "string" ||
    !p256dh ||
    p256dh.length > MAX_KEY_LENGTH ||
    typeof auth !== "string" ||
    !auth ||
    auth.length > MAX_KEY_LENGTH
  ) return null;

  const preferences = value.preferences;
  const selected = preferences && typeof preferences === "object"
    ? preferences as Record<string, unknown>
    : {};
  return {
    endpoint,
    keys: { p256dh, auth },
    preferences: {
      matchAlerts: typeof selected.matchAlerts === "boolean" ? selected.matchAlerts : true,
      fullTimeResults: typeof selected.fullTimeResults === "boolean" ? selected.fullTimeResults : true,
    },
  };
}

export type SafePushPayload = {
  title: string;
  body: string;
  icon: string;
  badge?: string;
  destinationUrl: string;
  tag: string;
  fixtureId?: string;
};

export function shapePushPayload(input: Partial<SafePushPayload>): SafePushPayload {
  const destinationUrl = input.destinationUrl?.startsWith("/")
    ? input.destinationUrl
    : "/";
  return {
    title: String(input.title ?? "LeedsWire").slice(0, 100),
    body: String(input.body ?? "").slice(0, 240),
    icon: input.icon?.startsWith("/") ? input.icon : "/images/favicon.png",
    ...(input.badge?.startsWith("/") ? { badge: input.badge } : {}),
    destinationUrl,
    tag: String(input.tag ?? "leedswire").slice(0, 100),
    ...(input.fixtureId ? { fixtureId: String(input.fixtureId).slice(0, 100) } : {}),
  };
}

export function isPermanentPushFailure(statusCode: number) {
  return statusCode === 404 || statusCode === 410;
}
