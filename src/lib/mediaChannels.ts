import type { YouTubeSourceId } from "@/types/content";

export const mediaChannelLinks = [
  {
    sourceId: "leeds-united-official",
    label: "Leeds Official",
    anchorId: "leeds-official",
  },
  {
    sourceId: "the-leeds-view",
    label: "Leeds View",
    anchorId: "leeds-view",
  },
  {
    sourceId: "the-square-ball",
    label: "The Square Ball",
    anchorId: "the-square-ball",
  },
  {
    sourceId: "one-leeds",
    label: "One Leeds",
    anchorId: "one-leeds",
  },
] as const satisfies readonly {
  sourceId: YouTubeSourceId;
  label: string;
  anchorId: string;
}[];

export function getMediaChannelAnchorId(sourceId: YouTubeSourceId) {
  return (
    mediaChannelLinks.find((channel) => channel.sourceId === sourceId)
      ?.anchorId ?? sourceId
  );
}
