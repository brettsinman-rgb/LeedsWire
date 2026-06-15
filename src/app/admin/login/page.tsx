import type { Metadata } from "next";
import { isAdminPasswordConfigured } from "@/lib/admin/auth";
import { loginAction } from "./actions";

export const metadata: Metadata = {
  title: "LeedsWire Admin Login",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    loggedOut?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const missingPassword =
    params?.error === "missing" ||
    (process.env.NODE_ENV === "production" && !isAdminPasswordConfigured());
  const invalidPassword = params?.error === "invalid";

  return (
    <main className="min-h-screen bg-[#06111f] px-4 py-10 text-white sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffdd00]">
          LeedsWire Admin
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Advertising Login
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          Enter the admin password to view Phase 1 advertising controls.
        </p>

        <form
          action={loginAction}
          className="mt-8 rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/[0.12]"
        >
          {missingPassword ? (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm font-semibold text-red-100 ring-1 ring-red-400/30">
              Admin access is unavailable because LEEDSWIRE_ADMIN_PASSWORD is not
              configured.
            </div>
          ) : null}
          {invalidPassword ? (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm font-semibold text-red-100 ring-1 ring-red-400/30">
              Invalid password.
            </div>
          ) : null}
          {params?.loggedOut ? (
            <div className="mb-4 rounded-lg bg-[#ffdd00]/10 p-3 text-sm font-semibold text-[#ffdd00] ring-1 ring-[#ffdd00]/30">
              You have been logged out.
            </div>
          ) : null}

          <label
            htmlFor="password"
            className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            disabled={missingPassword}
            className="mt-3 h-12 w-full rounded-lg border border-white/[0.14] bg-[#071827] px-4 text-white outline-none transition focus:border-[#ffdd00] focus:ring-2 focus:ring-[#ffdd00]/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={missingPassword}
            className="mt-5 h-12 w-full rounded-full bg-[#ffdd00] px-5 text-sm font-black uppercase tracking-[0.16em] text-[#07101d] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
