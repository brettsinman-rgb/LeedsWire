"use client";

import { useState } from "react";
import { getYouTubeSource } from "@/config/youtubeSources";
import type { VideoChannelRow } from "@/lib/youtube";
import { formatDuration, formatRelativeTime } from "@/lib/format";
import type { Video } from "@/types/content";
import { SafeImage } from "@/components/SafeImage";

type VideoModalProps = {
  videos: Video[];
};

type VideoChannelRowsProps = {
  rows: VideoChannelRow[];
};

function VideoCard({
  video,
  onSelect,
}: {
  video: Video;
  onSelect: (video: Video) => void;
}) {
  const source = getYouTubeSource(video.channelId);

  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      data-testid="video-card"
      className="shine-card group flex h-full flex-col overflow-hidden rounded-[1rem] bg-[#0b1726]/86 text-left shadow-[0_16px_48px_rgba(0,0,0,0.2)] ring-1 ring-white/[0.08] transition duration-300 hover:-translate-y-1 hover:bg-[#101f33] hover:shadow-[0_24px_64px_rgba(0,0,0,0.25)] hover:ring-[#ffdd00]/20"
    >
      <div className="image-wrap aspect-video bg-[#081b2f]">
        <SafeImage
          src={video.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover opacity-[0.92] contrast-[1.03] saturate-[0.98] transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06111f]/78 via-[#06111f]/5 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-[#071827]/72 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-white/90 ring-1 ring-white/12 backdrop-blur">
          {source?.typeLabel}
        </span>
        <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 pl-1 text-xl font-black text-[#07101d] shadow-[0_14px_36px_rgba(0,0,0,0.42)] transition group-hover:scale-105">
          ▶
        </span>
        <span className="absolute bottom-4 right-4 rounded-full bg-black/72 px-3 py-1.5 text-xs font-bold text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:min-h-[178px] sm:p-5">
        <p className="mb-3 inline-flex rounded-full bg-[#ffdd00]/8 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#ffdd00]/85 ring-1 ring-[#ffdd00]/16">
          {video.tags.includes("transfer") ? "Transfers" : "Highlights"}
        </p>
        <h3 className="line-clamp-2 min-h-[3rem] text-lg font-semibold leading-tight tracking-tight text-white sm:text-xl">
          {video.title}
        </h3>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
          {source?.name} <span className="px-2 text-zinc-600">•</span>{" "}
          {formatRelativeTime(video.publishedAt)}
        </p>
        <p className="mt-auto inline-flex items-center pt-4 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 transition group-hover:text-[#ffdd00]">
          Play <span className="ml-2 text-base">→</span>
        </p>
      </div>
    </button>
  );
}

function VideoModal({
  activeVideo,
  onClose,
}: {
  activeVideo: Video;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#080f1c] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
          <h2 className="line-clamp-2 text-base font-black text-white sm:text-xl">
            {activeVideo.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="size-11 shrink-0 rounded-full bg-white/[0.08] text-xl font-black text-white transition hover:bg-[#ffdd00] hover:text-[#07101d]"
            aria-label="Close video"
          >
            x
          </button>
        </div>
        <div className="aspect-video">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
            title={activeVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm font-semibold text-zinc-400">
            {getYouTubeSource(activeVideo.channelId)?.name} /{" "}
            {formatDuration(activeVideo.durationSeconds)}
          </p>
          <a
            href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex justify-center rounded-full bg-[#ffdd00] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#07101d] transition hover:bg-white"
          >
            Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}

export function VideoChannelRows({ rows }: VideoChannelRowsProps) {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  return (
    <>
      <div className="space-y-12">
        {rows.map(({ source, videos, unavailableReason }) => (
          <section key={source.id}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {source.name}
                </h2>
                <p className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[#ffdd00]/85">
                  {source.typeLabel}
                </p>
              </div>
              <a
                href={source.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 border-b border-white/15 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 transition hover:border-[#ffdd00] hover:text-[#ffdd00] sm:text-sm"
              >
                View channel
              </a>
            </div>
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onSelect={setActiveVideo}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-[#0b1726]/70 p-5 text-sm font-semibold text-zinc-400 ring-1 ring-white/[0.08]">
                {unavailableReason ??
                  "Channel unavailable in development. Check the channel handle, API key, quota and filtering logs."}
              </div>
            )}
          </section>
        ))}
      </div>

      {activeVideo ? (
        <VideoModal activeVideo={activeVideo} onClose={() => setActiveVideo(null)} />
      ) : null}
    </>
  );
}

export function VideoGrid({ videos }: VideoModalProps) {
  return (
    <VideoChannelRows
      rows={[
        {
          source: getYouTubeSource("leeds-united-official")!,
          videos,
        },
      ]}
    />
  );
}
