"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSessionCookie,
  isAdminPasswordConfigured,
  isValidAdminPassword,
  setAdminSessionCookie,
} from "@/lib/admin/auth";

export async function loginAction(formData: FormData) {
  if (!isAdminPasswordConfigured()) {
    redirect("/admin/login?error=missing");
  }

  if (!isValidAdminPassword(formData.get("password"))) {
    redirect("/admin/login?error=invalid");
  }

  await setAdminSessionCookie();
  redirect("/admin/ads");
}

export async function logoutAction() {
  await clearAdminSessionCookie();
  redirect("/admin/login?loggedOut=1");
}
