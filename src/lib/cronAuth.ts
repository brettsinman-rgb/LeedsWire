export function isCronBearerAuthorized(
  authorizationHeader: string | null,
  cronSecret: string | undefined,
) {
  return Boolean(
    cronSecret && authorizationHeader === `Bearer ${cronSecret}`,
  );
}
