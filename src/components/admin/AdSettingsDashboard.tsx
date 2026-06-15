"use client";

import { useMemo, useState, useTransition } from "react";
import {
  getAdSettingKey,
  type AdControlKey,
  type AdControlSettings,
  type AdSettingKey,
} from "@/config/adControls";
import type { AdCampaign } from "@/config/ads.config";
import {
  getCampaignStatusRows,
  type CampaignStatusGroup,
} from "@/config/adCampaignStatus";
import type { AdSettingsAuditEntry, AdSettingsSource } from "@/lib/adSettings";
import {
  managedAdPlacements,
  type AdCreative,
  type CreativeVariant,
  type ManagedAdPlacement,
  type UploadedCreativeType,
} from "@/lib/adCreatives";
import { appendHtml5ClickTags } from "@/lib/adHtml5";

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
  campaignGroups: CampaignStatusGroup[];
  auditEntries: AdSettingsAuditEntry[];
  initialCreatives: AdCreative[];
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

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20"
          : "inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs font-bold text-zinc-300 ring-1 ring-white/[0.12]"
      }
    >
      <span
        className={
          enabled
            ? "size-1.5 rounded-full bg-emerald-300"
            : "size-1.5 rounded-full bg-zinc-500"
        }
      />
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function getCampaignPreview(campaign?: AdCampaign | null) {
  if (!campaign) {
    return undefined;
  }

  if (campaign.creativeType === "html5" || campaign.creativeType === "iframe") {
    return campaign.desktopSrc ?? campaign.mobileSrc;
  }

  if (campaign.creativeType === "image" || campaign.creativeType === "gif") {
    return campaign.desktopSrc ?? campaign.mobileSrc;
  }

  return undefined;
}

function CampaignPreview({
  campaign,
  src: srcOverride,
}: {
  campaign?: AdCampaign | null;
  src?: string;
}) {
  const src = srcOverride ?? getCampaignPreview(campaign);

  if (!src) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] px-1 text-center text-[0.58rem] font-bold uppercase leading-tight tracking-[0.08em] text-zinc-500 ring-1 ring-white/[0.08]">
        No preview
      </div>
    );
  }

  if (campaign?.creativeType === "html5" || campaign?.creativeType === "iframe") {
    return (
      <iframe
        src={appendHtml5ClickTags(src, campaign.clickUrl)}
        title={campaign.label ?? "HTML5 creative preview"}
        className="size-12 shrink-0 rounded-lg border-0 bg-white/[0.06] ring-1 ring-white/[0.1]"
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    );
  }

  return (
    // Admin previews intentionally render the configured creative as supplied.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-white/[0.1]"
    />
  );
}

function creativeTypeLabel(value?: UploadedCreativeType | string | null) {
  return value === "html5" ? "HTML5" : "Image";
}

function CreativePreview({
  creative,
  className,
}: {
  creative: AdCreative;
  className: string;
}) {
  if (creative.creative_type === "html5") {
    return (
      <iframe
        src={appendHtml5ClickTags(
          creative.entry_url ?? creative.file_url,
          creative.click_url ?? undefined,
        )}
        title={creative.name}
        className={`${className} border-0 bg-white/[0.06]`}
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    );
  }

  return (
    // Admin previews intentionally render the configured creative as supplied.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={creative.file_url}
      alt=""
      className={`${className} object-cover`}
    />
  );
}

function textValue(value?: string | number | boolean) {
  return value === undefined || value === "" ? "No creative configured" : String(value);
}

function clickUrlValue(value?: string) {
  return value ? value : "Not set";
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

function formatUploadDate(value?: string | null) {
  if (!value) {
    return "Not uploaded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function CreativeLibrary({
  creatives,
  onCreativesChange,
}: {
  creatives: AdCreative[];
  onCreativesChange: (creatives: AdCreative[]) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [creativeTypes, setCreativeTypes] = useState<Record<string, UploadedCreativeType>>(
    {},
  );

  function setCreative(nextCreative: AdCreative) {
    onCreativesChange(
      creatives
        .map((creative) =>
          creative.id === nextCreative.id
            ? nextCreative
            : nextCreative.is_active &&
                creative.placement === nextCreative.placement &&
                creative.creative_variant === nextCreative.creative_variant
              ? { ...creative, is_active: false }
              : creative,
        )
        .sort(
          (a, b) =>
            Date.parse(b.uploaded_at ?? "1970-01-01") -
            Date.parse(a.uploaded_at ?? "1970-01-01"),
        ),
    );
  }

  function uploadCreative({
    placement,
    variant,
    form,
  }: {
    placement: ManagedAdPlacement;
    variant: CreativeVariant;
    form: HTMLFormElement;
  }) {
    const formData = new FormData(form);
    formData.set("placement", placement);
    formData.set("creativeVariant", variant);
    const slotKey = `${placement}:${variant}`;
    setMessage(null);
    setUploadingSlot(slotKey);
    setUploadProgress(1);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/ads/creatives/upload");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      setUploadingSlot(null);
      setUploadProgress(0);

      try {
        const data = JSON.parse(request.responseText) as {
          ok?: boolean;
          error?: string;
          details?: string;
          creative?: AdCreative;
        };

        if (request.status >= 400 || !data.ok || !data.creative) {
          setMessage([data.error, data.details].filter(Boolean).join(" "));
          return;
        }

        onCreativesChange([data.creative, ...creatives]);
        form.reset();
        setMessage("Creative uploaded. Activate it to publish.");
      } catch {
        setMessage("Unable to upload creative.");
      }
    };
    request.onerror = () => {
      setUploadingSlot(null);
      setUploadProgress(0);
      setMessage("Unable to upload creative.");
    };
    request.send(formData);
  }

  async function updateCreative(creative: AdCreative, action: string) {
    setMessage(null);
    setPendingId(creative.id);

    try {
      const response = await fetch("/api/admin/ads/creatives/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creativeId: creative.id,
          action,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        details?: string;
        creative?: AdCreative;
        deleted?: { id: string };
      };

      if (!response.ok || !data.ok) {
        throw new Error([data.error, data.details].filter(Boolean).join(" "));
      }

      if (data.deleted) {
        onCreativesChange(
          creatives.filter((item) => item.id !== data.deleted?.id),
        );
        setMessage("Creative deleted.");
      } else if (data.creative) {
        setCreative(data.creative);
        setMessage(
          action === "activate" ? "Creative activated." : "Creative deactivated.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Unable to update creative.",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="mt-6 border-t border-white/[0.08] pt-6">
      <SectionHeading
        eyebrow="Creative Management"
        title="Creative Library"
        description="Upload, preview and publish advertising creatives without a deployment."
      />
      {message ? (
        <div className="mt-4 rounded-xl bg-white/[0.06] px-4 py-3 text-sm leading-6 text-zinc-200 ring-1 ring-white/[0.1]">
          {message}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {managedAdPlacements.map((placement) => {
          const slotKey = `${placement.placement}:${placement.variant}`;
          const placementCreatives = creatives.filter(
            (creative) =>
              creative.placement === placement.placement &&
              creative.creative_variant === placement.variant,
          );
          const activeCreative = placementCreatives.find(
            (creative) => creative.is_active,
          );
          const isUploading = uploadingSlot === slotKey;
          const selectedCreativeType = creativeTypes[slotKey] ?? "image";

          return (
            <article
              key={slotKey}
              className="flex min-h-[390px] flex-col rounded-xl bg-white/[0.045] p-3 ring-1 ring-white/[0.09]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {placement.groupLabel}
                  </h3>
                  <p className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                    {placement.label} - {placement.sizeLabel}
                  </p>
                </div>
                <StatusBadge enabled={Boolean(activeCreative)} />
              </div>

              <div className="mt-3 flex gap-3 rounded-lg bg-black/14 p-2.5 ring-1 ring-white/[0.06]">
                {activeCreative ? (
                  <>
                    <CreativePreview
                      creative={activeCreative}
                      className="h-16 w-24 shrink-0 rounded-lg ring-1 ring-white/[0.12]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {activeCreative.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-zinc-300 ring-1 ring-white/[0.1]">
                          {creativeTypeLabel(activeCreative.creative_type)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Active since {formatUploadDate(activeCreative.uploaded_at)}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {clickUrlValue(activeCreative.click_url ?? undefined)}
                      </p>
                      {activeCreative.creative_type === "html5" ? (
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          Entry: index.html
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-white/[0.055] px-2 text-center text-[0.58rem] font-bold uppercase leading-tight tracking-[0.08em] text-zinc-500 ring-1 ring-white/[0.08]">
                      No creative
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        No active creative
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        The site will render the configured fallback when available.
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {clickUrlValue(undefined)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-lg ring-1 ring-white/[0.08]">
                {placementCreatives.length > 0 ? (
                  <div className="max-h-36 divide-y divide-white/[0.07] overflow-y-auto">
                    {placementCreatives.map((creative) => (
                      <div
                        key={creative.id}
                        className="grid grid-cols-[auto_1fr] gap-2 bg-white/[0.025] p-2"
                      >
                        <CreativePreview
                          creative={creative}
                          className="h-10 w-14 rounded-md ring-1 ring-white/[0.1]"
                        />
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-semibold text-white">
                                  {creative.name}
                                </p>
                                <span className="shrink-0 rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-zinc-300">
                                  {creativeTypeLabel(creative.creative_type)}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-[0.68rem] text-zinc-500">
                                {formatUploadDate(creative.uploaded_at)} -{" "}
                                {clickUrlValue(creative.click_url ?? undefined)}
                              </p>
                              {creative.creative_type === "html5" ? (
                                <p className="mt-0.5 truncate text-[0.68rem] text-zinc-500">
                                  Entry: index.html
                                </p>
                              ) : null}
                            </div>
                            {creative.is_active ? (
                              <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-100 ring-1 ring-emerald-300/20">
                                Active
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {creative.is_active ? (
                              <button
                                type="button"
                                disabled={pendingId === creative.id}
                                onClick={() => updateCreative(creative, "deactivate")}
                                className="rounded-full bg-zinc-700 px-2.5 py-1 text-[0.65rem] font-bold text-white transition hover:bg-zinc-600 disabled:opacity-60"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={pendingId === creative.id}
                                onClick={() => updateCreative(creative, "activate")}
                                className="rounded-full bg-emerald-400 px-2.5 py-1 text-[0.65rem] font-bold text-[#06111f] transition hover:bg-emerald-300 disabled:opacity-60"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={pendingId === creative.id}
                              onClick={() => updateCreative(creative, "delete")}
                              className="rounded-full bg-red-500/15 px-2.5 py-1 text-[0.65rem] font-bold text-red-100 ring-1 ring-red-300/20 transition hover:bg-red-500/25 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-3 text-xs text-zinc-500">
                    No uploads yet.
                  </p>
                )}
              </div>

              <form
                className="mt-3 border-t border-white/[0.08] pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  uploadCreative({
                    placement: placement.placement,
                    variant: placement.variant,
                    form: event.currentTarget,
                  });
                }}
              >
                <div className="grid gap-2">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                      Creative Type
                    </p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-full bg-black/18 p-1 ring-1 ring-white/[0.08]">
                      {(["image", "html5"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setCreativeTypes((current) => ({
                              ...current,
                              [slotKey]: type,
                            }))
                          }
                          className={[
                            "rounded-full px-2.5 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.1em] transition",
                            selectedCreativeType === type
                              ? "bg-[#ffdd00] text-[#06111f]"
                              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white",
                          ].join(" ")}
                        >
                          {type === "image" ? "Static Image" : "HTML5 ZIP"}
                        </button>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      name="creativeType"
                      value={selectedCreativeType}
                    />
                    <p className="mt-1.5 text-[0.68rem] leading-4 text-zinc-500">
                      {selectedCreativeType === "html5"
                        ? "ZIP must include index.html at root or inside a first-level folder."
                        : `Required size: ${placement.sizeLabel}.`}
                    </p>
                  </div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                    File
                    <input
                      required
                      name="file"
                      type="file"
                      accept={
                        selectedCreativeType === "html5"
                          ? ".zip,application/zip,application/x-zip-compressed"
                          : "image/jpeg,image/png,image/webp,image/gif"
                      }
                      className="mt-1.5 block w-full text-xs text-zinc-300 file:mr-2 file:rounded-full file:border-0 file:bg-[#ffdd00] file:px-2.5 file:py-1.5 file:text-[0.65rem] file:font-bold file:text-[#06111f]"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                      Campaign
                      <input
                        name="name"
                        className="mt-1.5 h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 text-xs text-white outline-none focus:border-[#ffdd00]/60"
                        placeholder="Campaign name"
                      />
                    </label>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                      Click URL
                      <input
                        name="clickUrl"
                        className="mt-1.5 h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 text-xs text-white outline-none focus:border-[#ffdd00]/60"
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                  <details className="rounded-lg bg-black/12 px-2.5 py-2 text-xs text-zinc-400 ring-1 ring-white/[0.06]">
                    <summary className="cursor-pointer font-bold uppercase tracking-[0.12em] text-zinc-500">
                      Schedule
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                        Start
                        <input
                          name="startDate"
                          type="datetime-local"
                          className="mt-1.5 h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 text-xs text-white outline-none focus:border-[#ffdd00]/60"
                        />
                      </label>
                      <label className="block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                        End
                        <input
                          name="endDate"
                          type="datetime-local"
                          className="mt-1.5 h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.06] px-2.5 text-xs text-white outline-none focus:border-[#ffdd00]/60"
                        />
                      </label>
                    </div>
                  </details>
                </div>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="mt-3 h-9 w-full rounded-full bg-[#ffdd00] text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#06111f] transition hover:bg-[#ffe95c] disabled:cursor-wait disabled:bg-zinc-600 disabled:text-zinc-300"
                >
                  {isUploading ? `Uploading ${uploadProgress}%` : "Upload Creative"}
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AdSettingsDashboard({
  initialSettings,
  source,
  warning,
  updatedAt,
  placementControls,
  campaignGroups,
  auditEntries,
  initialCreatives,
}: AdSettingsDashboardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [lastUpdated, setLastUpdated] = useState(updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState(auditEntries);
  const [creatives, setCreatives] = useState(initialCreatives);
  const [pendingKey, setPendingKey] = useState<AdSettingKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const enabledPlacementCount = placementControls.filter(
    (placement) => settings[placement.key],
  ).length;
  const statusDetail = useMemo(
    () => (source === "supabase" ? "Supabase connected" : "Fallback mode"),
    [source],
  );
  const campaignRows = useMemo(
    () => getCampaignStatusRows(settings, campaignGroups, creatives),
    [campaignGroups, creatives, settings],
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

      <CreativeLibrary
        creatives={creatives}
        onCreativesChange={setCreatives}
      />

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

      <section className="mt-6 border-t border-white/[0.08] pt-6">
        <SectionHeading
          eyebrow="Campaigns"
          title="Campaign Status"
          description="Grouped view of placement toggles, active campaigns, and configured creative availability."
        />
        <div className="mt-4 hidden overflow-hidden rounded-xl bg-white/[0.045] ring-1 ring-white/[0.09] lg:block">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-white/[0.045] text-left">
              <tr>
                <th className="w-[24%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Placement
                </th>
                <th className="w-[15%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Status
                </th>
                <th className="w-[14%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Creative
                </th>
                <th className="w-[13%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Uploaded
                </th>
                <th className="w-[22%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Click URL
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Render Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {campaignRows.map((row) => (
                <tr key={row.label} className="align-middle">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <CampaignPreview
                        campaign={row.active ?? row.configuredPrimary}
                        src={row.previewSrc}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {row.label}
                        </p>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {row.sizeLabel
                            ? `${row.sizeLabel} | ${row.primaryPlacementId ?? `${row.configuredCount} configured`}`
                            : row.primaryPlacementId ?? `${row.configuredCount} configured`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge enabled={row.statusEnabled} />
                    <p className="mt-1 text-xs text-zinc-500">{row.statusDetail}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="truncate text-sm text-zinc-300">
                      {textValue(row.active?.creativeType ?? row.configuredPrimary?.creativeType)}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {textValue(row.active?.campaignType ?? row.configuredPrimary?.campaignType)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="truncate text-sm text-zinc-300">
                      {formatUploadDate(row.uploadedAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="truncate text-sm text-zinc-300">
                      {clickUrlValue(
                        row.active?.clickUrl ??
                          row.configuredPrimary?.clickUrl ??
                          row.configuredClickUrl,
                      )}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {textValue(row.active?.id ?? row.configuredPrimary?.id)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm leading-5 text-zinc-300">
                      {row.renderReason}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 lg:hidden">
          {campaignRows.map((row) => (
            <article
              key={row.label}
              className="rounded-xl bg-white/[0.045] p-4 ring-1 ring-white/[0.09]"
            >
              <div className="flex items-start gap-3">
                <CampaignPreview
                  campaign={row.active ?? row.configuredPrimary}
                  src={row.previewSrc}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">
                        {row.label}
                      </h3>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                        {row.sizeLabel
                          ? `${row.sizeLabel} | ${row.primaryPlacementId ?? `${row.configuredCount} configured`}`
                          : row.primaryPlacementId ?? `${row.configuredCount} configured`}
                      </p>
                    </div>
                    <StatusBadge enabled={row.statusEnabled} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{row.statusDetail}</p>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                        Creative
                      </dt>
                      <dd className="mt-1 truncate text-zinc-300">
                        {textValue(
                          row.active?.creativeType ?? row.configuredPrimary?.creativeType,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                        Uploaded
                      </dt>
                      <dd className="mt-1 truncate text-zinc-300">
                        {formatUploadDate(row.uploadedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                        Click URL
                      </dt>
                      <dd className="mt-1 truncate text-zinc-300">
                        {clickUrlValue(
                          row.active?.clickUrl ??
                            row.configuredPrimary?.clickUrl ??
                            row.configuredClickUrl,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                        Render Reason
                      </dt>
                      <dd className="mt-1 text-zinc-300">{row.renderReason}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
