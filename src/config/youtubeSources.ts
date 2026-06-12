import type { YouTubeSourceId } from "@/types/content";

export type YouTubeSource = {
  id: YouTubeSourceId;
  name: string;
  channelUrl: string;
  channelHandle: string;
  channelId?: string;
  uploadsPlaylistId?: string;
  typeLabel: "Official Club Channel" | "Fan Media";
  includeShorts: false;
  minDurationSeconds: 180;
};

export const youtubeSources: YouTubeSource[] = [
  {
    id: "leeds-united-official",
    name: "Leeds United Official",
    channelUrl: "https://www.youtube.com/@leedsunited",
    channelHandle: "@leedsunited",
    typeLabel: "Official Club Channel",
    includeShorts: false,
    minDurationSeconds: 180,
  },
  {
    id: "the-square-ball",
    name: "The Square Ball",
    channelUrl: "https://www.youtube.com/@thesquareball_",
    channelHandle: "@thesquareball_",
    channelId: "UCOgpDEqq8slB7_y7SIKEUXw",
    uploadsPlaylistId: "UUOgpDEqq8slB7_y7SIKEUXw",
    typeLabel: "Fan Media",
    includeShorts: false,
    minDurationSeconds: 180,
  },
  {
    id: "one-leeds",
    name: "One Leeds",
    channelUrl: "https://www.youtube.com/@oneleeds1919",
    channelHandle: "@oneleeds1919",
    typeLabel: "Fan Media",
    includeShorts: false,
    minDurationSeconds: 180,
  },
  {
    id: "the-leeds-view",
    name: "The Leeds View",
    channelUrl: "https://www.youtube.com/@TheLeedsView",
    channelHandle: "@TheLeedsView",
    typeLabel: "Fan Media",
    includeShorts: false,
    minDurationSeconds: 180,
  },
];

export function getYouTubeSource(channelId: YouTubeSourceId) {
  return youtubeSources.find((source) => source.id === channelId);
}
