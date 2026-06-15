import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "leedswire_admin";

const SESSION_VALUE = "ads-admin";

export function getAdminPassword() {
  return process.env.LEEDSWIRE_ADMIN_PASSWORD?.trim() ?? "";
}

export function isAdminPasswordConfigured() {
  return getAdminPassword().length > 0;
}

function signAdminSession(password = getAdminPassword()) {
  return createHmac("sha256", password).update(SESSION_VALUE).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isValidAdminPassword(value: FormDataEntryValue | null) {
  const password = getAdminPassword();

  return (
    Boolean(password) &&
    typeof value === "string" &&
    safeEqual(value, password)
  );
}

export function createAdminSessionCookieValue() {
  const password = getAdminPassword();

  if (!password) {
    return "";
  }

  return `v1.${signAdminSession(password)}`;
}

export function isValidAdminSessionValue(value?: string) {
  const password = getAdminPassword();

  if (!password || !value?.startsWith("v1.")) {
    return false;
  }

  return safeEqual(value, createAdminSessionCookieValue());
}

export async function hasAdminSession() {
  const cookieStore = await cookies();

  return isValidAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function setAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
