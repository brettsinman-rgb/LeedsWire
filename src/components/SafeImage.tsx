"use client";

import { useState } from "react";
import { fallbackImage } from "@/lib/content";

type SafeImageProps = {
  src?: string;
  alt: string;
  className?: string;
};

export function SafeImage({ src, alt, className }: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState(src || fallbackImage);

  return (
    // Remote publisher images are intentionally rendered as standard images so
    // feeds can use arbitrary CDNs while still falling back on error.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setImageSrc(fallbackImage)}
    />
  );
}
