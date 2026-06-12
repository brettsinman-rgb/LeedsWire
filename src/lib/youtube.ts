import { youtubeSources, type YouTubeSource } from "@/config/youtubeSources";
import { getFallbackVideosByChannel } from "@/lib/content";
import { isLongFormYouTubeVideo } from "@/lib/filters";
import type { Video } from "@/types/content";

type YouTubeThumbnail = {
  url?: string;
};

type YouTubeChannelListResponse = {
  items?: {
    id?: string;
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }[];
};

type YouTubePlaylistItemsResponse = {
  items?: {
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: {
        videoId?: string;
      };
    };
    contentDetails?: {
      videoId?: string;
      videoPublishedAt?: string;
    };
  }[];
};

type YouTubeVideosResponse = {
  items?: {
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: Record<string, YouTubeThumbnail | undefined>;
    };
    contentDetails?: {
      duration?: string;
    };
    status?: {
      embeddable?: boolean;
      privacyStatus?: string;
    };
  }[];
};

export type VideoChannelRow = {
  source: YouTubeSource;
  videos: Video[];
  unavailableReason?: string;
};

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const CANDIDATE_VIDEO_COUNT = 24;
const VIDEO_LIMIT_PER_CHANNEL = 4;

function getApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (!apiKey || apiKey === "PASTE_KEY_HERE") {
    return null;
  }

  return apiKey;
}

async function fetchYouTube<T>(
  path: string,
  params: Record<string, string>,
  apiKey: string,
) {
  const url = new URL(`${YOUTUBE_API_URL}/${path}`);

  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`YouTube API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getUploadsPlaylistId(source: YouTubeSource, apiKey: string) {
  if (source.uploadsPlaylistId) {
    return {
      uploadsPlaylistId: source.uploadsPlaylistId,
      resolvedChannelId: source.channelId,
    };
  }

  const handles = [
    source.channelHandle,
    source.channelHandle.replace(/^@/, ""),
  ];

  for (const handle of handles) {
    const channel = await fetchYouTube<YouTubeChannelListResponse>(
      "channels",
      {
        part: "contentDetails",
        forHandle: handle,
        maxResults: "1",
      },
      apiKey,
    ).catch(() => null);
    const resolvedChannelId = channel?.items?.[0]?.id;
    const uploads = channel?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (uploads) {
      return {
        uploadsPlaylistId: uploads,
        resolvedChannelId,
      };
    }
  }

  return null;
}

async function getPlaylistVideoIds(playlistId: string, apiKey: string) {
  const playlist = await fetchYouTube<YouTubePlaylistItemsResponse>(
    "playlistItems",
    {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: String(CANDIDATE_VIDEO_COUNT),
    },
    apiKey,
  );

  return (
    playlist.items
      ?.map((item) => item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId)) ?? []
  );
}

function parseDurationSeconds(duration?: string) {
  if (!duration) {
    return 0;
  }

  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

  if (!match) {
    return 0;
  }

  const [, hours = "0", minutes = "0", seconds = "0"] = match;

  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function getBestThumbnail(thumbnails?: Record<string, YouTubeThumbnail | undefined>) {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url
  );
}

function isShortsVideo(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  return (
    text.includes("#shorts") ||
    text.includes("youtube shorts") ||
    text.includes("/shorts/")
  );
}

function logChannelResult({
  channelName,
  channelUrl,
  resolvedChannelId,
  fetchedCount,
  afterShortsFilter,
  afterDurationFilter,
  renderedCount,
}: {
  channelName: string;
  channelUrl: string;
  resolvedChannelId?: string;
  fetchedCount: number;
  afterShortsFilter: number;
  afterDurationFilter: number;
  renderedCount: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[LeedsWire media]", {
    channelName,
    channelUrl,
    resolvedChannelId,
    fetchedCount,
    afterShortsFilter,
    afterDurationFilter,
    renderedCount,
  });
}

function toVideo(source: YouTubeSource, item: NonNullable<YouTubeVideosResponse["items"]>[number]) {
  const title = item.snippet?.title ?? "";
  const thumbnailUrl = getBestThumbnail(item.snippet?.thumbnails);
  const durationSeconds = parseDurationSeconds(item.contentDetails?.duration);

  if (
    !item.id ||
    !title ||
    !thumbnailUrl ||
    item.status?.embeddable === false ||
    item.status?.privacyStatus === "private"
  ) {
    return null;
  }

  return {
    id: `${source.id}-${item.id}`,
    title,
    channelId: source.id,
    publishedAt: item.snippet?.publishedAt ?? new Date(0).toISOString(),
    youtubeId: item.id,
    durationSeconds,
    thumbnailUrl,
    tags: ["Leeds United", source.typeLabel],
  } satisfies Video;
}

async function getChannelVideos(source: YouTubeSource, apiKey: string) {
  const channel = await getUploadsPlaylistId(source, apiKey);

  if (!channel) {
    logChannelResult({
      channelName: source.name,
      channelUrl: source.channelUrl,
      resolvedChannelId: undefined,
      fetchedCount: 0,
      afterShortsFilter: 0,
      afterDurationFilter: 0,
      renderedCount: 0,
    });
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire media] channel could not be resolved", {
        channelName: source.name,
        channelUrl: source.channelUrl,
        channelHandle: source.channelHandle,
      });
    }
    return [];
  }

  const videoIds = await getPlaylistVideoIds(channel.uploadsPlaylistId, apiKey);

  if (videoIds.length === 0) {
    logChannelResult({
      channelName: source.name,
      channelUrl: source.channelUrl,
      resolvedChannelId: channel.resolvedChannelId,
      fetchedCount: 0,
      afterShortsFilter: 0,
      afterDurationFilter: 0,
      renderedCount: 0,
    });
    return [];
  }

  const videos = await fetchYouTube<YouTubeVideosResponse>(
    "videos",
    {
      part: "snippet,contentDetails,status",
      id: videoIds.join(","),
      maxResults: String(CANDIDATE_VIDEO_COUNT),
    },
    apiKey,
  );

  const fetchedItems = videos.items ?? [];
  const afterShortsItems = fetchedItems.filter((item) => {
    const title = item.snippet?.title ?? "";
    const description = item.snippet?.description ?? "";

    return !isShortsVideo(title, description);
  });
  const afterDurationItems = afterShortsItems.filter(
    (item) =>
      parseDurationSeconds(item.contentDetails?.duration) >=
      source.minDurationSeconds,
  );
  const renderedVideos = afterDurationItems
    .map((item) => toVideo(source, item))
    .filter((video): video is Video => Boolean(video))
    .filter(isLongFormYouTubeVideo)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, VIDEO_LIMIT_PER_CHANNEL);

  logChannelResult({
    channelName: source.name,
    channelUrl: source.channelUrl,
    resolvedChannelId: channel.resolvedChannelId,
    fetchedCount: fetchedItems.length,
    afterShortsFilter: afterShortsItems.length,
    afterDurationFilter: afterDurationItems.length,
    renderedCount: renderedVideos.length,
  });

  return renderedVideos;
}

export async function getVideoChannelRows(): Promise<VideoChannelRow[]> {
  const apiKey = getApiKey();

  if (!apiKey) {
    const videosByChannel = getFallbackVideosByChannel();

    return youtubeSources
      .map((source) => {
        const videos = videosByChannel[source.id].slice(0, VIDEO_LIMIT_PER_CHANNEL);

        logChannelResult({
          channelName: source.name,
          channelUrl: source.channelUrl,
          resolvedChannelId: undefined,
          fetchedCount: videosByChannel[source.id].length,
          afterShortsFilter: videos.length,
          afterDurationFilter: videos.length,
          renderedCount: videos.length,
        });

        return {
          source,
          videos,
        };
      })
      .filter((row) => row.videos.length > 0);
  }

  const rows = await Promise.all(
    youtubeSources.map(async (source) => {
      try {
        const videos = await getChannelVideos(source, apiKey);

        if (videos.length === 0 && process.env.NODE_ENV === "development") {
          return {
            source,
            videos,
            unavailableReason: "No qualifying videos returned after channel resolution and filtering.",
          };
        }

        return {
          source,
          videos,
        };
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[LeedsWire media] channel fetch failed", {
            channelName: source.name,
            channelUrl: source.channelUrl,
            error,
          });
        }

        return {
          source,
          videos: [],
          unavailableReason:
            process.env.NODE_ENV === "development"
              ? "Channel fetch failed. Check handle, API key, quota, and response shape."
              : undefined,
        };
      }
    }),
  );

  return rows.filter((row) => row.videos.length > 0 || row.unavailableReason);
}
