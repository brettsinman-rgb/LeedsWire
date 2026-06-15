"use client";

import { useMemo, useState, useTransition } from "react";
import {
  getAdSettingKey,
  type AdControlKey,
  type AdControlSettings,
  type AdSettingKey,
} from "@/config/adControls";
import type { AdSettingsAuditEntry, AdSettingsSource } from "@/lib/adSettings";

type PlacementControl = {
  label: string;
  key: AdControlKey;
};

type AdSettingsDashboardProps = {
  initialSettings: AdControlSettings;
  source: AdSettingsSource;
  warning?: string;
  updatedAt?: string;
  placementControls: PlacementControl[];
  auditEntries: AdSettingsAuditEntry[];
};

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#ffdd00]/80">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  active = true,
}: {
  label: string;
  value: string;
  detail?: string;
  active?: boolean;
}) {
  return (
    <div className="min-h-[112px] rounded-xl bg-white/[0.055] p-4 ring-1 ring-white/[0.09]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <span
          className={
            active
              ? "size-2 rounded-full bg-emerald-300"
              : "size-2 rounded-full bg-zinc-500"
          }
        />
        <p className="text-2xl font-semibold tracking-tight text-white">
          {value}
        </p>
      </div>
      {detail ? <p className="mt-2 text-sm text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function ToggleSwitch({
  enabled,
  disabled,
  onToggle,
}: {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onToggle}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition focus:outline-none focus:ring-2 focus:ring-[#ffdd00]/50 disabled:cursor-wait disabled:opacity-70",
        enabled ? "bg-emerald-400/85" : "bg-zinc-600",
      ].join(" ")}
    >
      <span
        className={[
          "size-5 rounded-full bg-white shadow transition",
          enabled ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

function formatUpdatedAt(value?: string) {
  if (!value) {
    return "No changes";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdSettingsDashboard({
  initialSettings,
  source,
  warning,
  updatedAt,
  placementControls,
  auditEntries,
}: AdSettingsDashboardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [lastUpdated, setLastUpdated] = useState(updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState(auditEntries);
  const [pendingKey, setPendingKey] = useState<AdSettingKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const enabledPlacementCount = placementControls.filter(
    (placement) => settings[placement.key],
  ).length;
  const statusDetail = useMemo(
    () => (source === "supabase" ? "Supabase connected" : "Fallback mode"),
    [source],
  );

  function updateSetting(controlKey: AdControlKey, nextValue: boolean) {
    const settingKey = getAdSettingKey(controlKey);
    const previous = settings[controlKey];

    setSettings((current) => ({ ...current, [controlKey]: nextValue }));
    setPendingKey(settingKey);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/ads/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            settingKey,
            settingValue: nextValue,
          }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          code?: string;
          details?: string;
          updated?: { updatedAt?: string };
        };

        if (!response.ok || !data.ok) {
          const diagnostic = [data.error, data.details]
            .filter(Boolean)
            .join(" ");
          throw new Error(diagnostic || "Unable to update setting");
        }

        const nextUpdatedAt = data.updated?.updatedAt ?? new Date().toISOString();
        setLastUpdated(nextUpdatedAt);
        setAudit((current) => [
          {
            setting_key: settingKey,
            old_value: previous,
            new_value: nextValue,
            updated_by: "LeedsWire Admin",
            updated_at: nextUpdatedAt,
          },
          ...current,
        ].slice(0, 10));
      } catch (updateError) {
        setSettings((current) => ({ ...current, [controlKey]: previous }));
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Unable to update setting",
        );
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <>
      <section className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Overview"
            title="Advertising Status"
            description="Live controls are stored in Supabase and apply without a redeploy."
          />
          <div
            className={[
              "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1",
              source === "supabase"
                ? "bg-emerald-400/10 text-emerald-100 ring-emerald-300/20"
                : "bg-amber-400/10 text-amber-100 ring-amber-300/25",
            ].join(" ")}
          >
            <span
              className={
                source === "supabase"
                  ? "size-2 rounded-full bg-emerald-300"
                  : "size-2 rounded-full bg-amber-300"
              }
            />
            {source === "supabase" ? "Live" : "Fallback"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Advertising Status"
            value={settings.adsEnabled ? "Enabled" : "Disabled"}
            detail={statusDetail}
            active={settings.adsEnabled}
          />
          <KpiCard
            label="Placements Active"
            value={`${enabledPlacementCount} / ${placementControls.length}`}
            detail="Billboards and formats"
            active={enabledPlacementCount > 0 && settings.adsEnabled}
          />
          <KpiCard
            label="Popup Status"
            value={settings.popupEnabled ? "Enabled" : "Disabled"}
            detail="Promotional popup"
            active={settings.popupEnabled}
          />
          <KpiCard
            label="House Ads"
            value={settings.houseAdsEnabled ? "Enabled" : "Disabled"}
            detail={formatUpdatedAt(lastUpdated)}
            active={settings.houseAdsEnabled}
          />
        </div>
        {warning ? (
          <div className="mt-4 rounded-xl bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100 ring-1 ring-amber-300/25">
            {warning}
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100 ring-1 ring-red-400/25"
          >
            <p className="font-semibold">Unable to update advertising setting</p>
            <p className="mt-1 text-red-100/90">{error}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-6 border-t border-white/[0.08] pt-6">
        <SectionHeading
          eyebrow="Placements"
          title="Advertising Placements"
          description="Toggle placements on or off instantly. Settings are persisted in Supabase."
        />
        <div className="mt-4 overflow-hidden rounded-xl bg-white/[0.045] ring-1 ring-white/[0.09]">
          <div className="divide-y divide-white/[0.07]">
            {[
              { label: "Master Advertising", key: "adsEnabled" as const },
              ...placementControls,
              { label: "House Ads", key: "houseAdsEnabled" as const },
            ].map((control) => {
              const settingKey = getAdSettingKey(control.key);

              return (
                <div
                  key={control.key}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {control.label}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      {settingKey}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-xs font-bold text-zinc-400 sm:inline">
                      {settings[control.key] ? "ON" : "OFF"}
                    </span>
                    <ToggleSwitch
                      enabled={settings[control.key]}
                      disabled={isPending && pendingKey === settingKey}
                      onToggle={() =>
                        updateSetting(control.key, !settings[control.key])
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6 border-t border-white/[0.08] pt-6">
        <SectionHeading
          eyebrow="Audit"
          title="Recent Changes"
          description="The last 10 setting updates recorded in Supabase."
        />
        <div className="mt-4 overflow-hidden rounded-xl bg-white/[0.045] ring-1 ring-white/[0.09]">
          {audit.length > 0 ? (
            <div className="divide-y divide-white/[0.07]">
              {audit.map((entry, index) => (
                <div
                  key={`${entry.id ?? entry.setting_key}-${entry.updated_at}-${index}`}
                  className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {entry.setting_key}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {entry.updated_by ?? "Unknown admin"}
                    </p>
                  </div>
                  <p className="text-zinc-300">
                    {String(entry.old_value)} {"->"} {String(entry.new_value)}
                  </p>
                  <p className="text-zinc-500">
                    {formatUpdatedAt(entry.updated_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-4 text-sm text-zinc-500">
              No audit entries available yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
